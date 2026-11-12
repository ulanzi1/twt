---
baseline_commit: cae6ac65
---

<!--
PINNED: `cae6ac65` = `origin/main` (ledger 2026-11-10c - Story 13.1d LANDED, PR #327, `43deb5d2..6cc47ba8`). The story lives on branch
`story/13-1g-field-worker-move-notices-by-email` in its OWN worktree (`.claude/worktrees/13-1g-field-worker-move-notices-by-email`), created from
`origin/main` with NO upstream (`git branch --unset-upstream`) on 2026-11-11. Every `apps/` / `packages/` / `docs/` claim was traced at the pin on
2026-11-11 by the create-story pass, and re-traced 2026-11-12 by four fresh read-only checkers (the staff-email substrate; 13.1d's notices; the
sign-in return and the copy; governance and records), their load-bearing claims re-read by the author (`origin/main` still `cae6ac65`).
Perishable - re-check at Task 0.1. Re-locate by FUNCTION, not by line.

STATUS: done (v1.14, 2026-11-12). LANDED on `main` by fast-forward (BigDev: "yes land it"): PR #328, `cae6ac65..54ff8a67`, fast-forward; GitHub marked it merged at 14:21Z and the merge commit is the tip (SHAs unchanged); GitHub CI 39/39 on the PR at `54ff8a67`; the push-to-main CI run (`ci.yml`, run 43236334523) 39/39 green at `54ff8a67`, completed 14:49Z; the push skipped `ci:local` (every commit sent was already on origin; it PASSED 39/39 on a fresh container beforehand - Dev Agent Record, "Full ci:local"). BUILT (Tasks 0-8) and code-reviewed three times (Codex CR1-CR3; Claude Sonnet 5.5 round 2 in three chunks, round 3 the patches alone); Task 6's browser check RAN 2026-11-12 (Dev Agent Record, "Browser pass"). **Merge is not go-live:** roster Row 51 (c) stays OPEN until the emails are DEPLOYED and SENDING (Rows 24 (b) and 26 gate sending); (e) ADR-0045's ratification and (f) the Hindi review are open. `done` was set at LANDING (13.1a, 13.1d; 6.36e even stayed `review` after it landed). Q-1..Q-5 were ANSWERED by BigDev (Q-2 B with the two follow-ons; Q-1, Q-3, Q-4, Q-5 A).

NUMBERS (re-grep each at Task 0.1; every one is contended by siblings):
- Next free decision: `-463` (`-462` is the newest on every ref and every worktree, 2026-11-12). Its id carries the date it is WRITTEN:
  `2026-11-<DD>-463`. "The number belongs to the first COMMIT" (`-449`).
- Next free ADR: `ADR-0045` (the highest is `ADR-0044-module-manifest-schema-versioning.md`, `drafted`; no ref or worktree holds 0045+).
- Migration: ONE, `0206` (the journal's last entry is idx 205, `0205_field-worker-move-requests`, `when` 1797305400049; no ref holds 0206+).
  Read the journal's last idx and `when` live ([[project_sibling_migration_when_order_shared_db]]).
- RBAC: NO new key (the sweep is a job; the link opens 13.1d's page under its existing key). `PERMISSION_CATALOG_VERSION` stays 62.
- ADR index: 155 Section rows (`grep -cE '^\| ADR-'`), `drafted` 2 -> 3, Total 155 -> 156 - RE-COUNTED at the edit, never added.
- Ledger: the newest letter on any ref is `2026-11-11a` (this worktree, uncommitted); this pass writes `2026-11-12a` (read it live: letters
  collide across branches).
- Roster: NO new row; dated lines and two new legs on Row 51, the legs authored by `-463` (Task 0.5). The highest row is 51; Row 46 is RESERVED by
  6.39 / 14.3.
-->

# Story 13.1g: The District Admins Are Told of Each Field Worker Move Request, Answer, Escalation and Move by Email - Naming No One `[CONSUMER]`

Status: done

## WHAT THIS STORY IS, IN ONE PARAGRAPH

The Panel ruled (`-443` Q1 A): *"Both District Admins are told by email and in the admin console, including when the Pariwar Admin moves a
worker."* Story 13.1d built the console half: one `field_worker_notices` row per notice and recipient, written in the deciding transaction,
channel-neutral, shown on the Move requests page. This story builds the EMAIL half over those rows, and nothing else: decision `-463`, then a new
ADR (`ADR-0045`) admitting a FOURTH admin-email path (ADR-0040 and ADR-0043 each say a further path is a new ADR); a send table
`field_worker_notice_emails` keyed on `notice_id` (once per notice, ever - the 0187 / 0152-0154 shape); a 15-minute jobs sweep and child on the
existing staff-email client (held / parked / `aging_since` / `may_have_sent`, as 6.25 and 11b.4a); one bilingual plain-text template per notice
kind whose ONLY variable is a link to the Move requests page - no name, no district, no reason, no time, no code; **every eligible notice is
emailed, seen in the console or not, except notices that expire under the held-backlog cutoff** (Q-2 B; the Q-2 rule, AD6); the fence's allowlists widened by exactly this path's entries; and the Move requests page made a legal
sign-in return target so the emailed link survives a sign-in. Go-live is roster Row 51 (c), plus the two legs this story adds there.

## Story

As a **District Admin or a Pariwar Admin**,
I want **an email when a field worker move request is opened for me, is answered, is refused, goes to the Pariwar Admin, is no longer needed, or
when a Pariwar Admin moves a worker into or out of my district**,
so that **I do not have to keep opening the admin console to know - and so that the email itself tells nobody's name to my inbox or my mail
provider.**

## Policy meaning (AI-10-1)

**This story introduces NO predicate on a member's access to a benefit, and changes none.** It reads 13.1d's notice rows and sends an email to the
officer each row already names; no member state, `account-frozen` source, attribution, payout field or field-worker state is read or written (I8).
It adds one predicate about OFFICERS, not members - who is still eligible to receive an email at send time (Q4, AD5) - stated so it is not found
later: *in the officer's terms*, **"You are emailed about a move request only while you still hold the district or Pariwar role that made you one of
its recipients - and an email that the system could not send within three days is not sent later; the console still has it."** *In the member's terms:* **"Whether an officer is emailed about a field worker's move changes nothing about your membership."**
**Checked against the Niyamavali** (the git-ignored private copies in the main checkout, grepped by ABSOLUTE path 2026-11-11 and again
2026-11-12; sha256 prefixes `niyamavali.md` `f91746355a81e85a`, `niyamavali.hi.md` `dfe8179678016dce` - unchanged since 11b.4's 2026-10-24 check):
`field.?worker|kshetra` - 0 hits in either; `e-?mail` - 0 hits; in the Hindi file, the Devanagari words for "worker" (karyakarta), "email" and
"e-mail" - 0 hits each. **The rulebook is SILENT** on field workers and on email to officers. The private Privacy Policy mentions email 3 times
(a member's contact channel and two placeholders) and is silent on email to officers. No text is pasted (the repo is public,
[[project_legal_corpus_private_repo_split]]); the Niyamavali is a rulebook, not a ratified spec ([[feedback_niyamavali_rulebook_not_spec]]).

## The rulings and sources this story builds on (quoted, never paraphrased)

Quotes are word-for-word; typographic dashes are written as ASCII hyphens; bold and italics are dropped; "..." marks a cut.

| Source | Verbatim | Status - and what it governs here |
|---|---|---|
| Panel `2026-11-03-443` Q1 A | "... Both District Admins are told by email and in the admin console, including when the Pariwar Admin moves a worker." | **Trustee-ratified** - WHY this story exists (Row 51 (c)); every eligible District Admin recipient is emailed, except under the held-backlog cutoff (the Q-2 rule, AD6) |
| `-443` "does NOT cover" | "The refusal-reason list, the escalation sweep, and the channel and wording of each notice (Story 13.1d) ... each that story's create-story decision." | Trustee-ratified - the wording is the author's (Q-1) |
| `-458` AD1 (author-commit, BigDev "Q1-Q3 A") | "**The email is NOT here (Q-1 A):** row `13-1g-field-worker-move-notices-by-email` builds it, its new ADR first (a fourth admin-email path, ADR-0040 / ADR-0043: *"a fourth is a new ADR"*), over this story's channel-neutral notice rows; go-live waits for it (roster Row 51 (c))." | author-commit - AC1 ("first" = before any code) |
| `-458` AD9 | "one row per notice and recipient, written in the deciding transaction, naming no one ... The actor is never told of their own act." | author-commit - the recipient set is 13.1d's, never re-derived here (I6) |
| `-458` "What this does NOT decide" | "The email's ADR, wording, send table and sweep - row `13-1g`." | author-commit - this story's |
| `epics.md` Story 13.1g (stub, minted under `-458`) | "As a District Admin or a Pariwar Admin, I want an email ..." · "the Pariwar Admins as 6.25 reads them" · "adding a field is a disclosure question for the Panel" | the stub - WHY the Pariwar Admins are emailed too; section 0 row 3 |
| `-459` Q3 A (Trustee-ratified, DR + KB) | "The system tells that officer the answer and reminds them: "Tell the worker."" | **Trustee-ratified** - the accepted and refused emails carry "Tell the worker." |
| `-461` item 2 (author-commit) | the opener's refusal: *"Your request was refused: {from} to {to}. Reason: {reason}. Tell the worker."* · the Pariwar Admins get *"a NEW kind `move_request_refused_admin`"* "with no reminder - it is wrong to them" | author-commit - the `refused_admin` email has NO "Tell the worker." |
| `-461` item 1 (c) (author-commit) | `move_request_superseded` reads *"A request is no longer needed: {from} to {to}."* - for either cause | author-commit - the email names no cause (and, narrower, no districts) |
| `-461` "NOT covered" | "Email: row `13-1g` must carry the new kind `move_request_refused_admin` and the reworded `move_request_superseded` when it builds the email notices (Q-1 A)." | author-commit - AC6 - all SEVEN kinds; AD12's map |
| `-462` "NOT covered" (author-commit) | "the email notices (row `13-1g`) carry no time of an ending either - the row must not stamp a `move_request_superseded` email with the act's time" | author-commit - I5; Q-5 |
| `-462` item 2, residual (c) | "(c) the moment the notice first appears to the officer, and its `seen_at` (the officer's own act, not the ending's)." | author-commit - RECORDED, not closed; the email's arrival is the same class (Q-5, AD9) |
| `-460` item 1 (author-commit, carrying out `-459` Q2 A) | "⛔ **Not shown:** any suspension or ending REASON ...; the date or fact of an ending beyond the state's name; ANY officer's name or role ...; the phone number (`-459`). ... Showing any reason or officer's name is a further disclosure and returns to the Panel." | author-commit - it governs the request DETAIL's work history, NOT notices; cited for its "returns to the Panel" rule. The email adopts its exclusions (a reason, an ending, the phone, an officer's NAME); it names a ROLE only where 13.1d's console notice already does (`escalated`, `moved_by_pariwar_admin`) |
| `-262` FQ3 A (6.25's email, Trustee-ratified) | "THE PARIWAR ADMIN IS SENT AN EMAIL saying "a claim was refused on suspicion of a nominee change - open the list" - ⛔ no names and no note in it; those stay in the console." | **Trustee-ratified** - the SHAPE: the fact + a link; nothing else (AD4) |
| ADR-0040 (ratified `-358`) | "⛔ No other new path is admitted; a third is a new ADR." · Q2: "called only by the staff-email child AFTER its claiming transaction commits" | ratified - ADR-0045 (AC1) |
| ADR-0043 (`drafted`; Row 41 (l)) | "⛔ No other new path is admitted; a fourth is a new ADR." · "The fence widens in the same commit as each new site, every new allow-list entry citing ADR-0043" · its amendment is "effective when this ADR is ratified" | drafted - ADR-0045's form; the fence pattern (AC8) |
| `apps/jobs/tests/staff-email-identity-read-fence.test.ts` header | "A new reader or caller is a NEW ADR, ⛔ an allowlist edit." | the fence entries ride ADR-0045 |
| `suspicion-staff-email-templates.ts` | "Adding a field here is a disclosure question for the Panel (RE9), ⛔ a code change." | I1 - the param type is `{ link }` |

### 0 - whose decision is this (`trustee-panel-routing-note-TEMPLATE.md` section 0, per edge)

| # | Edge - stripped of citations | Verdict |
|---|---|---|
| 1 | Whether the officers are told by email at all | **The Panel's - RULED** (`-443` Q1 A, the District Admins). Gate MET |
| 2 | Who is emailed | **Already decided** - exactly the in-app recipients (`-458` AD9 / Q-2 A, `-461` items 2-3), the District Admins by `-443` Q1 A and the Pariwar Admins by the epics stub. This story emails a notice row's recipient and NO ONE ELSE (I6); it may only drop one who no longer holds the role (AD5), never add one |
| 3 | What the email says about a person, a district or a cause | **The author's while it is NARROWER than the console** - the email names no one and nothing (`-262` FQ3 A's shape); no email names a role the console notice does not. Adding any field would be the Panel's (the epics stub: "adding a field is a disclosure question for the Panel"; the template's own comment) - ⛔ done here |
| 4 | Whether an officer may turn the email off | **The Panel's if built** - an opt-out narrows a ruled channel. ⛔ Built (Q-3 A recommended): nothing to ask |
| 5 | Whether a notice already seen in the console, or whose request has moved on, is still emailed | **Not a narrowing - neither is skipped** (Q-2 B, BigDev 2026-11-12; the Q-2 rule, AD6). Skipping either would narrow `-443` Q1 A as an opt-out would (row 4); it is ⛔ done, so nothing is asked |
| 6 | A notice that expires under the held-backlog cutoff - (i) no email row by the cutoff (the email system held, or the sweep not running), (ii) a send still `attempting` 3 IST days on | **The author's - an outage, not a policy** (the Q-2 rule's EXCEPTION, AD6; BigDev 2026-11-12): the cutoff bounds the backlog sent when a hold ends (and on the day the provider is first configured) and gives up a send that cannot finish. Stated as the rule's exception in `-463`, ADR-0045, the ACs and Row 51's dated line; the console still has the notice |
| 7 | A fourth admin-email identity path | **An ADR** (ADR-0040 / ADR-0043). Ratification is the Panel's, as ADR-0040's was (`-358`); a roster leg, not a build gate (Q-4; the ADR-0043 precedent, Row 41 (l)) |
| 8 | The wording, the bilingual layout, the sweep, the table, the link | **Yours** - ANSWERED (Q-1 A, Q-5 A, 2026-11-12) |

**Result: NO Panel note.** Nothing asked of the Panel now; ADR-0045's ratification is a roster leg (Q-4 A, answered 2026-11-12).

## Names at a glance

| Thing | Name |
|---|---|
| Decision | `2026-11-<DD>-463` (author-commit; AD1-AD13 and the Q answers; the date it is written) |
| ADR | `docs/adr/ADR-0045-field-worker-move-notice-email.md` (`drafted`); a NEW Section A row in `docs/knowledge-transfer/adr-index.md` + an italic reconciliation paragraph in the same file (`docs/knowledge-transfer/README.md` section 7) |
| Migration | `packages/domain/migrations/0206_field-worker-notice-emails.sql` (journal idx 206) |
| Table | `field_worker_notice_emails` (schema `packages/domain/src/schema/field_worker_notice_emails.ts`; RLS `packages/domain/src/policies/field-worker-notice-emails-rls.ts`) |
| On the notices | `UNIQUE` constraint `field_worker_notices_pariwar_notice_uq (pariwar_id, notice_id)`; index `field_worker_notices_email_due_idx (created_at)` |
| Q4 (the new identity read) | `packages/domain/src/field-worker/notice-email-eligibility-read.ts` - `fieldWorkerNoticeEmailEligibleSql(...)` |
| Domain | `packages/domain/src/field-worker/notice-email.ts` - select / begin / finalise / note-transient / park / expire / detail; barrel `field-worker/index.ts` |
| Jobs | `apps/jobs/src/scheduler/field-worker-notice-emails.ts` (sweep + child; `registerFieldWorkerNoticeEmailWorkers`), `apps/jobs/src/scheduler/field-worker-notice-email-templates.ts` (`renderFieldWorkerNoticeEmail`, `fieldWorkerNoticeEmailLink`) |
| Queues | `packages/queue/src/index.ts`: `FIELD_WORKER_NOTICE_EMAIL_SWEEP: 'field_worker.notice_email_sweep'`, `FIELD_WORKER_NOTICE_EMAIL_SEND: 'field_worker.notice_email_send'` (mirror the 6.25 pair's naming at :518-539) |
| Copy | `packages/i18n/locales/{en,hi}/field_worker.json`: FLAT dotted keys `notice_email.<kind>.subject`, `notice_email.<kind>.body`, `notice_email.footer`, `$comment.notice_email` |
| Link | `${ADMIN_APP_ORIGIN}/p/${pariwarId.toLowerCase()}/field-workers/requests` (13.1d's route, `router.tsx:250-254`) |
| Sign-in return | `apps/admin/src/routes/login-next.ts`: `FIELD_WORKER_REQUESTS_PATH`, `fieldWorkerRequestsPath()`, a third branch of `allowedNextReturn`, `LoginReturn['to']` widened; `useSignInRedirect(signIn, next?)` in `apps/admin/src/modules/field-workers/sign-in.ts` |
| Fences | the staff-email fence (three entries + Q4's rules); NEW `apps/jobs/tests/field-worker-notice-email-no-decision.test.ts` (I3) |
| Roster | Row 51 - dated lines; new legs (e) ADR-0045 ratified, (f) the Hindi of the seven emails reviewed, both authored by `-463` |

## FOUND FACTS (G) - traced at `cae6ac65`, 2026-11-11 / 2026-11-12

- **G1 - the rows to send are 13.1d's, one per notice AND recipient.** `field_worker_notices` (0205 L214-271): `notice_id` uuid PK (DEFAULT
  `gen_random_uuid()`), `pariwar_id`, `recipient_user_id` (a `users` id, NO FK - "a notice outlives a revoked grant"), `kind`, `field_worker_id`,
  `move_request_id` (null only for a `moved_by_pariwar_admin` with no request - the `request_pair` CHECK), `from_district`, `to_district`,
  `refusal_reason`, `created_at` (`clock_timestamp()`), `seen_at`. Kinds (CHECK, L230; `FIELD_WORKER_NOTICE_KINDS` in
  `schema/field_worker_notices.ts:20-28`, exported as `fieldWorker.FIELD_WORKER_NOTICE_KINDS` from `@twt/domain`; re-declared
  `packages/contracts/src/field-workers/enums.ts:96`): `move_request_opened`, `move_request_accepted`, `move_request_refused`,
  `move_request_refused_admin`, `move_request_escalated`, `move_request_superseded`, `moved_by_pariwar_admin`. No DELETE / TRUNCATE trigger (L37).
- **G2 - the notice row CANNOT carry an "emailed" mark.** Its guard trigger (`field_worker_notices_guard_update`, 0205 L252-271) refuses any change
  but a first `seen_at` (for EVERY role - `created_at` cannot be moved, L255), and `twt_app` holds `UPDATE ("seen_at")` only (L236-240). Hence a
  SEPARATE send table keyed on `notice_id` (13.1d C1). The sweep never writes `field_worker_notices` (I3).
- **G3 - 0205 grants `twt_app` ONLY; the jobs login cannot read it in production.** BYPASSRLS does not waive a GRANT. 13.1d's escalation sweep
  carries the same limit (its header L20-21; Row 51's 2026-11-09 CR37 dated line; Row 26 `jobs-db-role`). 0187 / 0152 grant `twt_app` only too.
  This story follows them: 0206 grants `twt_app` only (AD2), the sweep is built for the posture Row 26 will decide and guarded against the wrong
  one, and its production privileges are listed for Rows 26 / 24 (AD13) - ⛔ a grant to an undecided login.
- **G4 - 0205's RLS separates Pariwars, not officers.** Its header (L32-36): every read must filter `recipient_user_id` in SQL - "Re-examine when a
  SECOND notice reader appears". **This sweep is that second reader.** It reads ONE notice by id and emails THAT row's recipient only - the
  officer filter holds by construction (AD3 (c); recorded in ADR-0045). ⚠ The Pariwar filter does NOT come from RLS on the jobs pool (G18).
- **G5 - the recipient helpers of 13.1d are LOOSER than every staff-email recipient read.** `districtAdminsOf` / `pariwarAdminsOf`
  (`field-worker/notices.ts:24-45`) check `users.status = 'active'` but no `admin_credentials` row, and `pariwarAdminsOf` has no
  `scope_value = pariwar_id::text`; the opener (`row.openedBy`) is used raw in accept / refuse / escalate / ending
  (`move-request-commands.ts:251,287,382`; `move-request-supersede.ts:134`). 6.25's Q1 (`claim/staff-email-identity-read.ts:35-48`) has all
  three. ⇒ the email RE-CHECKS at send (Q4, AD5) and never trusts the notice row's recipient alone. 13.1d's in-app helpers are ⛔ edited (they
  never name `admin_credentials`, so they are outside the fence; an inactive officer cannot sign in to read a notice - harmless in-app).
- **G6 - the existing staff-email substrate.** One port, `apps/jobs/src/scheduler/staff-email-client.ts` (`ses | zeptomail | fake | none`;
  `StaffEmailMessage{to,subject,text,reference}`; final `accepted` / `rejected`, or `transient{detail,held,mayHaveSent}`;
  `isSendableEmailAddress`; its `detail` strings are built by 6.25's `claimDomain.suspicionStaffEmailDetail`, L72); built ONCE in
  `boot.ts:859-872` by `buildStaffEmailClient()` (never throws; an unresolvable secret HOLDS) and shared by 6.25 and 11b.4a. Config
  `apps/jobs/src/scheduler/staff-email-config.ts:7-21` (`STAFF_EMAIL_PROVIDER` unset ⇒ every email held; `ADMIN_APP_ORIGIN` https-only,
  `resolveHttpsOrigin` L112-127, aliased `resolveAdminAppOrigin` L146). Production keeps the provider unset until Row 24 closes.
- **G7 - the two sender precedents.** 6.25 `apps/jobs/src/scheduler/claim-suspicion-staff-emails.ts` (430 lines; cron `*/15 * * * *` IST, budget 10
  min, expiry 14 min, exported L51-56; sweep L118-235: config gap, then pre-flight, any failure = HELD - a held run PARKS in-flight rows, an
  un-held run gives up rows past 3 IST days and alarms, then keyset-pages due work and enqueues one child per target; child L251-368: claiming tx,
  then AFTER COMMIT Q2 read, decrypt, address check, render (a `render_failed` transient, L322-354), send, compare-and-set finalise; a transient
  throws so pg-boss retries) and its domain `packages/domain/src/claim/suspicion-staff-email.ts` (581 lines; lease `STAFF_EMAIL_SEND_LEASE_MS` 30
  min, `RECLAIM_DAYS` 3, `PARKED_BY` `'sweep:held'`, page cap 1000, L32-38; `suspicionStaffEmailReclaimCutoff(now)` = 00:00 IST of today - 2,
  L257). 11b.4a `memorial-takedown-approver-emails.ts` (377 lines) + `packages/domain/src/memorial/takedown-approver-email.ts` (548 lines) is a
  DECLARED MIRROR of 6.25 that re-exports its constants - **the newest and cleanest template to copy** (its select / begin / finalise /
  note-transient / park / expire / detail functions, `:46-522`). Its text is English-only with no link and no render step; 6.25 is the bilingual +
  link + render model (AD4). Neither sender has a non-DB unit test of the sweep: both test it in `*-live.test.ts`.
- **G8 - the newest send table, 0187 `memorial_takedown_approver_emails` (L70-180).** Columns `notice_id` PK (DEFAULT `gen_random_uuid()`),
  `pariwar_id`, `request_id`, `recipient_user_id` (nullable), `outcome` (`attempting|accepted|rejected|no_target|error`), `provider_message_id`,
  `detail`, `first_detail`, `attempt_count`, `may_have_sent`, `claimed_at`, `claimed_by_job`, `created_at`, `aging_since`, `parked_at`,
  `updated_at`; CHECKs incl. a detail VOCABULARY regex in lockstep with a schema constant (a spec pins the two equal), `parked_check`;
  `UNIQUE NULLS NOT DISTINCT`; grants (L121-125): SELECT + column-narrowed INSERT (`"pariwar_id", "request_id", "recipient_user_id", "outcome",
  "detail", "claimed_at", "claimed_by_job"` - ⚠ NO `notice_id`: it has a default) / UPDATE to `twt_app`, no DELETE; ENABLE + FORCE RLS, three
  tenant policies; the guard trigger (BEFORE UPDATE only: finished row frozen, `may_have_sent` one-way, `aging_since` forward only on a parked
  re-claim - it names only `attempting` and `'sweep:held'`, never `no_target`); a partial index on `attempting`. The give-up's
  `RETURNING request_id, recipient_user_id` (L272) feeds the alarm's sample ids - the only use of the send row's recipient outside begin.
- **G9 - the fence** (`apps/jobs/tests/staff-email-identity-read-fence.test.ts`): scans `apps/*/src`, `packages/*/src`, `scripts/` with comments
  stripped; four EXACT allowlists - `IDENTITY_ALLOWLIST` (L50-58, names `admin_credentials`), `DECRYPT_ALLOWLIST` (L61-68, `decryptAdminEmail`),
  `Q2_CALLER_ALLOWLIST` (L71-76, `readAdminEmailCiphertext`), `CONTEXT_ALLOWLIST` (L79-85, the envelope context); projection rules for Q1/Q2's
  module (L144-154) and Q3's (L128-143, its OWN: one `SELECT 1 FROM admin_credentials`, the table named once, ⛔ joined, every alias column
  `user_id`; ⚠ the qualifier set at L141 HARD-CODES Q3's alias `mt_ac`); a positive control planting one violation per rule (L174-238).
  ADR-0043's widening is the precedent (header L18-26): the new child joins DECRYPT and Q2_CALLER; a new eligibility module joins IDENTITY with its
  own `*_MODULE` constant, projection rules and plants. No other fence lists Q2 callers, decrypt callers, queue names or boot registrations.
- **G10 - Q3 is the shape for Q4.** `memorialApproverEligibleSql(userId)` (`memorial/takedown-approver-email-read.ts:21-28`): `EXISTS (SELECT 1
  FROM users mt_u WHERE mt_u.id = ${userId} AND mt_u.status = 'active' AND EXISTS (SELECT 1 FROM admin_credentials mt_ac WHERE mt_ac.user_id =
  mt_u.id))`. Q2: `readAdminEmailCiphertext(db, userId)` (`claim/staff-email-identity-read.ts:54-59`) - only `email_ciphertext`, ONE user; its SQL
  text is ALSO pinned by `packages/domain/tests/claim/nominee-name-no-comparison-fence.test.ts:541` (⛔ edit it). Decrypt:
  `decryptAdminEmail(serialized, {kms, kekRef})` (`encryption/admin-email.ts:30-34`). `role_grants` columns: `role`, `scope_dimension` (a pgEnum
  `global|pariwar|state|...`, `schema/role_grants.ts:66`), `scope_value`, `pariwar_id`, `user_id`; no revoked / expiry column (a revoke deletes the
  row). `users.status` is one of `active` / `suspended` / `disabled`.
- **G11 - the template precedent** (`apps/jobs/src/scheduler/suspicion-staff-email-templates.ts`): `SuspicionStaffEmailParams { readonly link }`
  is the ONLY parameter; only `link` is forwarded at runtime; subject `"<hi> / <en>"`; body Hindi, blank line, English; its footer lives INSIDE the
  body key (`claim.json:184`); rendered through the REAL `t()` (`t()` THROWS on a missing `{token}`, `resolver.ts:39`); strings
  `packages/i18n/locales/{en,hi}/claim.json:182-184` with a `$comment` "NOT YET HUMAN-REVIEWED" marker (the Hindi is roster Row 25's). Its tests
  (`apps/jobs/tests/staff-email-client.test.ts:350-400`): the link path is the admin router's REAL route AND the sign-in allowlist's path - read
  as SOURCE TEXT (`readFileSync(new URL('../../admin/src/${rel}', import.meta.url))`, then `/const NOMINEE_REFUSALS_PATH = \/(.+)\/;/` and
  `/path:\s*'([^']*nominee-refusals)'/g`), not imported; Hindi before English, the link in both, no unresolved token; a widened object leaks no
  name, digit or date; a TYPE-LEVEL `@ts-expect-error` on a second field. Catalogs are FLAT maps (`resolver.ts:62` looks up `catalog[key]`).
  `field_worker` is a registered namespace (`catalog.ts:84-85`) already used from jobs; both `{en,hi}/field_worker.json` exist and hold
  `$comment.sms` (the same English text in both) and `sms.code`. The parity gate (`packages/i18n/scripts/lib.ts` `checkParity`) requires a
  non-empty Hindi entry for every English key, `$comment.*` included; DLT-sheet tests treat `sms.*` keys as SMS templates.
- **G12 - the admin console is English-only** (`apps/admin/src/modules/field-workers/i18n-en.ts` L1-3). The in-app copy of each kind is
  `fw.notices.kind.<kind>` (L326-332) - it carries `{from}`, `{to}` and `{reason}`; `opened` reads "You are asked to take on or release a worker:
  {from} to {to}." (it names no asker); `escalated` and `moved_by_pariwar_admin` name the Pariwar Admin's ROLE. Staff emails are bilingual by
  convention (`docs/degradation-policy/comms-templates/email-channel.md`; 6.25; its departures recorded at :27, :28, :50).
- **G13 - ⚠ the emailed link would be LOST at sign-in today.** `login-next.ts` allowlists exactly TWO return routes (`/p/<id>/nominee-refusals` -
  6.25; `/p/<id>/fraud-investigations` - 6.22 RC10), each with its OWN UUID regex literal (L11, L35; the union `LoginReturn['to']` L38-41), so a
  signed-out District Admin who follows the email lands on `/audit/integrity` after signing in. Two separate redirects drop it:
  (a) `FieldWorkerMoveRequestsRoute.tsx:19` - `navigate({ to: '/login' })` on a session error, with NO `next`;
  (b) a 401 MID-PAGE goes through the shared hook `useSignInRedirect(signIn)` (`apps/admin/src/modules/field-workers/sign-in.ts:9-13`,
  `navigate({ to: '/login' })`), called on this page by FIVE components - `MoveRequestsPage.tsx:56`, `NoticeList.tsx:34`,
  `MoveRequestDetail.tsx:24`, `MoveRequestActions.tsx:49`, `DistrictPicker.tsx:51` (the last also mounted on the Approvals, Find and Register
  pages). A lapsed session 401s the list, notices and districts reads together and each fires its own navigate - the last wins, so ONE caller
  without `next` loses the link. `NomineeRefusalsRoute.tsx:30,43` is the shape (`navigate({ to: '/login', search: { next:
  nomineeRefusalsPath(pariwarId) } })` on a session error AND on a mid-page 401); `FraudInvestigationsRoute.tsx:23,35` is the same. No other guard
  redirects (`RootLayout.tsx:58` only on logout; no `beforeLoad`). `LoginPage` does not switch on `to` (`LoginPage.tsx:142-144` passes `back.to`);
  its comment at L140-141 and `router.tsx:87-88` ("only the nominee-refusal list's own path is ever followed") are stale. AC7.
- **G14 - the jobs pool.** `boot.ts`'s shared domain pool is `max: 2`; 13.1d's escalation sweep took its own (`boot.ts:374`). 6.25 and 11b.4a run
  on the shared `pool`; neither's domain nor child writes an audit line. [[project_jobs_pool_two_connection_starvation]]: a path holding a tx
  connection while writing on another needs its own pool.
- **G15 - no collision with 13.1d's write gate.** `scripts/field-worker-move-request-invariant/lib.ts:54` matches `field_worker_move_requests` with a
  trailing `(?![a-z0-9_$])` boundary; `field_worker_notice_emails` is outside it. The notices table has no write gate.
- **G16 - deferred RP-D1** (`deferred-work.md` L14458-14461): a server-side unseen count, owner *"the next story that changes the notices contract
  (row `13-1g`'s email notices), OR a reported missed notice"*. **This story does NOT change the notices contract** (no API, no DTO) ⇒ RP-D1 stays
  OPEN with its other trigger; annotated IN PLACE at landing (Task 8), so it is never inferred closed ([[feedback_closure_language_precision]]).
- **G17 - test cleanups that delete notices.** Exactly TWO: `apps/api/tests/integration/field-worker/_registration-harness.ts:178-183` and
  `apps/jobs/tests/field-worker-move-request-escalation-live.test.ts:46-50`, both under `SET LOCAL session_replication_role = 'replica'` - which
  DISABLES the FK, so deleting notices neither fails nor deadlocks: it silently leaves ORPHAN email rows (13.1b's harness warns of the same, L187).
  ⛔ "Fix" the others that name the table: `move-requests.spec.ts:507` deletes one planted notice that never gets an email row;
  `field-worker-move-requests-policy-regression.spec.ts:638` is an EXPECTED-42501 assertion; `scripts/field-worker-move-request-invariant/lib.test.ts`
  names it only in fixture strings. No global truncate list or RLS-coverage registry exists for the new table to join.
- **G18 - `withPariwarScope` does NOT drop to `twt_app`.** `packages/domain/src/db.ts:164-183`: BEGIN + `SET LOCAL app.pariwar_id` (L120), no
  `SET ROLE`. On the jobs pool the child runs as the jobs login - BYPASSRLS (the superuser in tests) - so 0205's / 0206's RLS does NOT separate
  Pariwars there. 13.1d's escalation sweep says so (header, CR39: *"withPariwarScope sets app.pariwar_id WITHOUT dropping to twt_app"*); Row 24's
  notes ("⛔ RLS - `withPariwarScope` only sets the GUC"); 11b.4a filters `pariwar_id` explicitly in every statement
  (`takedown-approver-email.ts:398,404`).
- **G19 - 13.1d's regression spec pins the notices' EXACT constraint and index lists.**
  `packages/domain/tests/integration/rls/field-worker-move-requests-policy-regression.spec.ts:562-571` (`pg_constraint`, `toEqual`) and L587
  (indexes: `['field_worker_notices_once_per_act_uq','field_worker_notices_pkey','field_worker_notices_recipient_idx']`). 0206's UNIQUE and due
  index turn it RED unless it is updated (Task 1.4). Precedent for a composite UNIQUE added to an existing table to back an FK: 0157, 0160;
  declared in drizzle as `unique('<name>').on(t.pariwarId, t.<id>)` (`claim_peer_mesh_selections.ts:189`).
- **G20 - the mirror's selector and claim** (`memorial/takedown-approver-email.ts`). Selector `:158-224`: due work UNION ALL **(3) every
  `attempting` row, the predicate BYPASSED, so its locked re-check finishes it** (`:162,219-222`; 6.25 `:182,231-233`) - without it a row parked
  by a held run is never selected again (the give-up skips parked rows, `claimed_by_job <> $5`, `:270`). Pages keyed on uuids only. Test-only
  `pariwarAllowlist` (`memorial-takedown-approver-emails.ts:62-63,106-115`: refused when empty or when `NODE_ENV=production`), threaded as `allow`
  into select, park and expire. Begin `:396-488`: `SET LOCAL lock_timeout`, `pg_advisory_xact_lock(hashtext('memorial-takedown-email:' ||
  request_id))` (`:22,396-397`), read the existing row (non-`attempting` ⇒ `already_final`; `attempting`, not ours, not parked, inside the lease
  ⇒ `held_by_other`), re-check, then INSERT `ON CONFLICT DO NOTHING` or the compare-and-set re-claim (parked-time credit; `may_have_sent OR
  detail IS NULL`); a re-check failing on an existing `attempting` row ⇒ `error` / `exhausted:recheck_<reason>`, and the caller ALWAYS alarms
  "may have sent" (`:325`). Its live test seeds `attempting` rows by raw INSERT (L409-454).
- **G21 - 11b.4a's imports** (`memorial-takedown-approver-emails.ts:21-31`): `CHILD_RETRY_DELAY_SECONDS`, `CHILD_RETRY_LIMIT`, `CLAIM_CORRECTION_TZ`,
  `CORRECTION_SWEEP_RETRY`, `DEFAULT_CORRECTION_SWEEP_MAX_RUNS`, `DEFAULT_CORRECTION_SWEEP_RUN_LIMIT`, `ClaimCorrectionTransientError` from
  `./claim-correction-reminders.js`; `STAFF_EMAIL_SWEEP_BUDGET_MS`, `STAFF_EMAIL_SWEEP_CRON`, `STAFF_EMAIL_SWEEP_EXPIRE_SECONDS` from
  `./claim-suspicion-staff-emails.js`; `STAFF_EMAIL_SEND_TIMEOUT_MS`, `isSendableEmailAddress` and the client types from `./staff-email-client.js`.
  The lease, `RECLAIM_DAYS`, `PARKED_BY` and the cutoff come from the DOMAIN (`claim/suspicion-staff-email.ts`, via `claimDomain`). 11b.4a's
  register takes NO `adminAppOrigin`; 6.25's raises the boot alarms for both the client and the origin.
- **G22 - 6.25 has a no-write source fence for its sender.** `apps/jobs/tests/claim-suspicion-staff-email-no-decision.test.ts` (raw, Drizzle and
  interpolated write forms; plants; a check that its table list names real tables) - the model for I3's fence.
- **G23 - the production jobs login and its guard.** `apps/jobs` has ONE pool, from `SERVICE_DATABASE_URL`; in production a BYPASSRLS login
  inheriting ONLY `twt_service` (0007's provisioning; 0195 L34-36: it does ⛔ `SET LOCAL ROLE twt_app`). `twt_service` holds privileges on 12 of
  133 tables - ⛔ any identity table (`users`, `role_grants`, `admin_credentials`; Row 26 notes, 2026-10-09) - and 0152, 0187, 0200 and 0205
  grant it nothing. Row 26
  (`jobs-db-role`) closes on the posture, its provisioning, a CI leg AS that login, and the texts corrected; Row 24 (b) already requires "the
  production jobs login able to make Q1's and Q2's reads". Every cross-Pariwar sweep checks `smsDelivery.canReadAcrossPariwars(pool)`
  (`sms-delivery/reports.ts:247-252`, `rolsuper OR rolbypassrls` of `current_user`) FIRST - 13.1d's escalation sweep (`:82`), 13.1b's code-SMS
  sweep (`field-worker-code-sms.ts:9,360`), the module activation sweep, the claim ladders; 6.25's and 11b.4a's senders do NOT call it.

## Build decisions AD1-AD13 - the author's; recorded at Task 0.3 as decision `-463`

- **AD1 - Governance first: the decision, then the ADR.** Decision `-463` is written and committed ALONE before any code (Task 0.3) - the order of
  both precedents (ADR-0040 under `-299`, ADR-0043 under `-412`); then ADR-0045 (`drafted`) ALONE, citing `-463` (Task 0.4); then the roster
  (Task 0.5). (`-458` AD1's "its new ADR first" means before any code.) ADR-0045 **amends ADR-0040's ADR-0009 section 5 amendment** (in-body
  amendment form, as ADR-0043: `Supersedes: - (⛔ not a whole-ADR supersession: this ADR AMENDS ...)`), **effective when ADR-0045 is ratified**
  (ADR-0043's clause), to admit exactly: (i) **Q4**, a new eligibility read for ONE user already named by a notice row (AD5); (ii) a **third
  caller of Q2**, this story's child; (iii) the child's call to `decryptAdminEmail`. It names the send table, the sweep, the link, the template's
  single variable, the fence entries, and a CLOSED set: "beyond Q1-Q4 as named in ADR-0040, ADR-0043 and this ADR, and Q2's three named callers
  (6.25's child, 11b.4a's child, this child), a further path is a new ADR" (⛔ an ordinal like "a fifth"). It states that its admission does NOT
  depend on ADR-0043's ratification (it amends ADR-0040 directly and names 11b.4a's path as present in code). It records G4's re-examination
  (AD3 (c)), G18 (RLS does not isolate the child on the jobs pool - the explicit `pariwar_id` predicate does, as CR39 records), G3's grant gap,
  the narrowings of AD5 (a `super_admin` opener is never emailed), the Q-2 rule WORD FOR WORD with its exception (AD6; TR5), and AD13 (the
  privilege table; no production grant; go-live waits for Rows 26 and 24 (b), Q4 joining Q1 / Q2 there).
- **AD2 - The send table `field_worker_notice_emails` (migration 0206) - 0187's shape, keyed on the notice.**
  - Columns: `notice_id uuid PRIMARY KEY` (⛔ a default - it IS the notice's id), `pariwar_id uuid NOT NULL`, `outcome text NOT NULL`,
    `provider_message_id`, `detail`, `first_detail`, `attempt_count int DEFAULT 1 NOT NULL`, `may_have_sent bool DEFAULT false NOT NULL`,
    `claimed_at`, `claimed_by_job`, `created_at` / `aging_since` / `updated_at` (`clock_timestamp()`), `parked_at`. ⛔ `recipient_user_id`: the
    recipient is the notice's (one source of truth, I6) - so the give-up returns `notice_id` for its alarm samples and begin returns the recipient
    read from the notice.
  - FK `(pariwar_id, notice_id)` → `field_worker_notices (pariwar_id, notice_id)` - 0206 adds `CONSTRAINT field_worker_notices_pariwar_notice_uq
    UNIQUE (pariwar_id, notice_id)` on `field_worker_notices` (its trigger and grants are ⛔ touched).
  - `outcome IN ('attempting', 'accepted', 'rejected', 'skipped', 'error')`, in lockstep with `FIELD_WORKER_NOTICE_EMAIL_OUTCOMES` in the schema
    file. `detail` / `first_detail` vocabulary CHECK (lockstep with `FIELD_WORKER_NOTICE_EMAIL_DETAIL_PATTERN` in the schema file, a spec pins them
    equal): `skipped:not_eligible`, `(transient|held):[A-Za-z0-9_.]{1,64}`, `rejected:[0-9]{1,3}:[A-Za-z0-9_.]{1,64}`,
    `error:(no_address|invalid_address)`, `exhausted:(attempting_three_days|recheck_not_eligible)`. The grammar accepts the shared client's detail
    strings unchanged (G6). A `skipped` row carries a `skipped:` detail and vice versa (CHECK). `skipped` is written only at a FIRST claim
    (nothing was tried); a RE-claim of an `attempting` row whose re-check fails becomes `error` / `exhausted:recheck_not_eligible` - a prior
    attempt may have sent (11b.4a's rule, `memorial/takedown-approver-email.ts:24`).
  - 0187's other CHECKs (attempt count, attempting ⇒ claimed, detail length, `parked_check`), its guard trigger verbatim but for the name, its
    partial `attempting` index; grants SELECT + column-narrowed **INSERT (`"notice_id", "pariwar_id", "outcome", "detail", "claimed_at",
    "claimed_by_job"`)** (⚠ NOT 0187's list - 0187's `notice_id` has a default and is never granted; copied as-is every `twt_app` claim is
    refused 42501, and the live tests, run as superuser, would not see it) + UPDATE as 0187 L125, to `twt_app` ONLY, no DELETE; ENABLE + FORCE
    RLS, three tenant policies (G3: no jobs-login grant - the production privileges are AD13's, owned by Rows 26 / 24).
  - One more index on the notices: `field_worker_notices_email_due_idx (created_at)` - the selector's floor (AD3 (b)).
  - The drizzle side: `schema/field_worker_notice_emails.ts` (new) AND `schema/field_worker_notices.ts` gains `unique('field_worker_notices_pariwar_notice_uq').on(t.pariwarId, t.noticeId)`
    and `index('field_worker_notices_email_due_idx').on(t.createdAt)` - its only change (AD11's carve-out).
- **AD3 - The sweep and the child - 6.25's / 11b.4a's, re-exported constants.**
  - (a) **Cadence and budget** imported as 11b.4a does (G21): `*/15 * * * *` IST, budget 10 min, expiry 14 min, child retry, from the jobs files;
    lease 30 min, give-up 3 IST days, `PARKED_BY = 'sweep:held'`, page cap 1000 and the cutoff from the domain; `resolveAdminAppOrigin` for the
    origin.
  - (b) **Due** = two branches, UNION ALL, each filtered by the test-only `allow` (below):
    (i) a notice with NO email row and `created_at >= suspicionStaffEmailReclaimCutoff(now)` (00:00 IST of today - 2: the SAME cutoff the give-up
    uses, so one clock rules both; `now` read from the DB in tests, [[project_ist_vs_utc_test_date_window]]) - ⛔ any `seen_at` filter (Q-2 B);
    (ii) every `field_worker_notice_emails` row with `outcome = 'attempting'` - ⛔ any age or `seen_at` filter (its re-check finishes it; served
    by the copied partial `attempting` index).
    Cross-Pariwar on the jobs pool, projecting ONLY `notice_id`, `pariwar_id`, `has_attempting`. ORDER BY `notice_id`, keyset on `notice_id` alone
    (both mirrors' form; ⛔ a timestamp in the cursor - a JS `Date` drops microseconds). One child per notice; `singletonKey` = the notice id, a
    label only (the PK is the guarantee). Deps carry 11b.4a's test-only **`pariwarAllowlist`** (refused when empty or when
    `NODE_ENV=production`), threaded as `allow` into the selector, the park and the give-up - without it a live run claims other suites' notices.
  - (c) **The child reads ONE notice** by `notice_id` AND `pariwar_id` inside `withPariwarScope(pariwar_id)` on the jobs pool's login (in dev / CI the
    superuser; in production whatever Row 26 decides - AD13; today BYPASSRLS, ⛔ `twt_app` - G18). **Every child statement carries an explicit `pariwar_id = $pariwarId`**: the notice read, Q4's `role_grants` match, the
    email-row reads and writes. RLS is not the guard there; the policies are proved only in the regression spec under `twt_app`. It sends to
    THAT row's `recipient_user_id` only (G4: the officer filter holds by construction; the email carries none of the row's other columns - I1).
  - (d) **Held** exactly as 6.25: a config gap (the client's, or `ADMIN_APP_ORIGIN`), or a failing pre-flight ⇒ NO new row, in-flight rows parked,
    no give-up, one end-of-run alarm. ⛔ A new env var.
  - (e) **The shared pool**, as 11b.4a (G14). If the build adds any write on a second connection while a claiming tx is held, it takes its OWN
    pool and a held-connection leg proves it.
- **AD4 - The template: one per kind, bilingual, the link its ONLY variable.** `FieldWorkerNoticeEmailParams { readonly link: string }`;
  `renderFieldWorkerNoticeEmail(kind, params)` selects the kind's keys from the CLOSED list `FIELD_WORKER_NOTICE_KINDS` and forwards only `link`.
  Subject `"<hi> / <en>"`. Body, exactly: `${hiBody}\n${hiFooter}\n\n${enBody}\n${enFooter}\n` (each body key ends with `{link}`; the footer is its
  own key, once per language). **⛔ in any email:** a name (worker, officer), a mobile, a code, a district, a refusal reason, a cause of a
  supersede, a date or time, a count, an id other than the Pariwar id inside the link, and any ROLE the console notice for that kind does not
  name (G12). Every text stays TRUE after the request moves on (moved-on notices are emailed too - the Q-2 rule, AD6). The English, approved by BigDev 2026-11-12 (Q-1 A;
  `opened` and `escalated` as reworded, "as recommended"):

  | Kind | Subject (en) | Body (en) |
  |---|---|---|
  | `move_request_opened` | A field worker move request was opened for you | A field worker move request was opened for you. Open Move requests: {link} |
  | `move_request_accepted` | Your field worker move request was accepted | Your move request was accepted. Tell the worker. Open Move requests: {link} |
  | `move_request_refused` | Your field worker move request was refused | Your move request was refused. Tell the worker. The reason is in Move requests: {link} |
  | `move_request_refused_admin` | A field worker move request was refused | A move request in your Pariwar was refused. Open Move requests: {link} |
  | `move_request_escalated` | A field worker move request went to the Pariwar Admin | A field worker move request went to the Pariwar Admin. Open Move requests: {link} |
  | `move_request_superseded` | A field worker move request is no longer needed | A move request is no longer needed. Open Move requests: {link} |
  | `moved_by_pariwar_admin` | A Pariwar Admin moved a field worker | A Pariwar Admin moved a field worker into or out of your district. Open Move requests: {link} |
  | footer (every kind) | - | This email names no one. The details are in the admin console. |

  "Tell the worker." on `accepted` and `refused` only (`-459` Q3 A; `-461` item 2); ⛔ on `refused_admin`. Keys are FLAT dotted strings
  (`"notice_email.move_request_opened.subject"`, ⛔ a nested object; ⛔ an `sms.` prefix). The Hindi is the dev's draft, marked agent-authored
  and NOT YET HUMAN-REVIEWED in `$comment.notice_email` (the same English text in both files, as `$comment.sms`; the parity gate needs the Hindi
  entry) - Row 51 leg (f). Recorded departures from `email-channel.md`, as 6.25's: a subject over 60 characters; the Pariwar UUID in the link;
  plain text only.
- **AD5 - Q4: the recipient is re-checked at claim, never widened.** `fieldWorkerNoticeEmailEligibleSql(userId, pariwarId, fromDistrict,
  toDistrict)`, in full:
  `EXISTS (SELECT 1 FROM users fn_u WHERE fn_u.id = $user AND fn_u.status = 'active' AND EXISTS (SELECT 1 FROM admin_credentials fn_ac WHERE
  fn_ac.user_id = fn_u.id) AND EXISTS (SELECT 1 FROM role_grants fn_g WHERE fn_g.user_id = fn_u.id AND fn_g.pariwar_id = $pariwar AND
  ((fn_g.role = 'district_admin' AND fn_g.scope_dimension = 'district' AND fn_g.scope_value IN ($from, $to)) OR (fn_g.role = 'pariwar_admin' AND
  fn_g.scope_dimension = 'pariwar' AND fn_g.scope_value = fn_g.pariwar_id::text))))` - case-sensitive TEXT compare, as RBAC binds. It projects
  ⛔ identity column (Q3's rules). One rule for every kind: each District Admin recipient 13.1d writes stands at the row's `from` or `to` (the B2
  notice carries the superseded REQUEST's own `from -> to`, `-461` item 3), each Pariwar Admin recipient is Pariwar-wide. **Narrowings, stated
  so they are not found later** (each drops a recipient, never adds one - section 0 row 2): a `super_admin` opener (`field_worker.request_move`
  is derived for `super_admin`, `permissions.ts:884-893`) is NEVER emailed - Q4 has no `global` branch; the console still shows the notice; and a
  Pariwar Admin whose `pariwar` grant names another Pariwar (`scope_value <> pariwar_id::text`, which 13.1d's helper admits, G5) is not emailed.
  Not eligible ⇒ `skipped` / `skipped:not_eligible`, no send.
- **AD6 - THE Q-2 RULE (Q-2 B, BigDev 2026-11-12: *"what if office had a glanca only? I think option (b) is better"*; follow-ons *"as
  recommended"*; the exception's wording made precise at BigDev's word, v1.3).** Stated ONCE here; `-463`, ADR-0045 and Row 51's dated line
  carry it WORD FOR WORD, exception included; AC3 tests both halves of the exception:

  > **Every eligible notice (Q4, AD5) is emailed, whether or not it was seen in the console and whether or not its request has moved on - EXCEPT a
  > notice that expires under the held-backlog cutoff (3 IST days: `suspicionStaffEmailReclaimCutoff`, 00:00 IST of today - 2): (i) a notice with
  > NO email row by the cutoff - the email system was held (the provider unconfigured or failing pre-flight) or the sweep did not run - is
  > intentionally NEVER emailed; (ii) a send still `attempting` 3 IST days on (parked time not counted) is given up as `error` /
  > `exhausted:attempting_three_days` (it may have gone). Either way the console still has the notice.**

  So: ⛔ skip a notice seen in the console (an officer may only have glanced); ⛔ skip an `opened` / `escalated` notice whose request has moved
  on (its text stays true - AD4). The email path NEVER reads `seen_at` or the request's state. Not sent, and nothing else: Q4 false (AD5) and the
  two expiries (TR5). The cutoff is a backlog guard, not a policy: it bounds what is sent when a hold ends, and on the day the provider is first
  configured in production (Row 24), to the last ~3 days instead of every notice ever written. Recorded in `-463` and ADR-0045 as a residual of
  the rule (an outage of 3+ IST days loses those emails by design; the held run's end-of-run alarm is the operator's signal). Worst case, an email arrives ~5-6 days after
  its notice (claimed near the cutoff, then parked); its text is still true.
- **AD7 - No opt-out (Q-3 A, answered 2026-11-12).** Every eligible recipient is emailed; ⛔ a preference. An opt-out narrows the ruled channel (`-443` Q1 A) - the
  Panel's, and not asked.
- **AD8 - One email per notice, no digest.** ⛔ batching: a Pariwar Admin with several escalations gets several emails. A digest is a later row if
  the noise is reported (carried C1).
- **AD9 - The send time is not withheld (Q-5 A, answered 2026-11-12).** A `move_request_superseded` email is sent like any other kind: its TEXT has no time (I5,
  `-462`). Its arrival is the provider's send time, at most a sweep (~15 minutes) after the act, so it bounds the act's time to the officer and to
  the mail provider - the same class as `-462`'s residual (c) (the moment the notice first appears to the officer), RECORDED in `-463`, not
  closed. ⛔ A delay for one kind.
- **AD10 - The sign-in return (G13).**
  - `login-next.ts` gains `const FIELD_WORKER_REQUESTS_PATH = /^\/p\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\/field-workers\/requests$/;`
    as a ONE-LINE literal (⛔ fold the two existing constants into a shared fragment: 6.25's jobs leg reads `NOMINEE_REFUSALS_PATH`'s literal and
    would go red), `fieldWorkerRequestsPath(pariwarId)` returning exactly `` `/p/${pariwarId.toLowerCase()}/field-workers/requests` ``, a third
    branch of `allowedNextReturn` (`to: '/p/$pariwarId/field-workers/requests'`), and the widened `LoginReturn['to']` union. `LoginPage` needs no
    code change; update the stale comments at `LoginPage.tsx:140-141` and `router.tsx:87-88`.
  - `FieldWorkerMoveRequestsRoute.tsx` passes `search: { next: fieldWorkerRequestsPath(pariwarId) }` on its session error.
  - `useSignInRedirect(signIn, next?)` gains an optional `next` (`navigate({ to: '/login', search: { next } })` when given). On the Move requests
    page EVERY caller passes `fieldWorkerRequestsPath(pariwarId)`: `MoveRequestsPage`, `NoticeList`, `MoveRequestDetail`, `MoveRequestActions`,
    and `DistrictPicker` through a new optional prop. Every other field-worker page keeps `{ to: '/login' }` (⛔ any other return route).
- **AD11 - What this story does NOT touch.** 13.1d's notice writers, recipient helpers, notices API / DTO (RP-D1 stays open, G16), the escalation
  sweep; RBAC keys; any member surface. **Touched in 13.1d's code, and only so:** `schema/field_worker_notices.ts` (the UNIQUE and the index,
  AD2), its regression spec's two exact lists (G19), and the sign-in redirect of the Move requests route and its five components (AD10).
- **AD12 - Records.** `deferred-work.md` 13.1d C1 is closed only when this story's code LANDS ("Closed by", Task 8), item by item:

  | C1 owes (`deferred-work.md:26`) | Met by | Note |
  |---|---|---|
  | the ADR (a district-admin recipient read by EXACT district grant; the Q2 address read for a third caller) | AC1, AD1, AD5 | Q4 also admits the Pariwar Admins (the stub) |
  | a send table keyed on `notice_id` (6.25's shape) | AC2, AD2 | |
  | a jobs sender on `staff-email-client.ts` | AC3-AC5, AC9 | |
  | one template per notice kind naming NO ONE, with a link | AC6, AD4 | |
  | "the four allowlists" of the fence | AC8 | **three** widened; `CONTEXT_ALLOWLIST` is not, because neither child names the envelope context - a recorded variance |
  | (i) a template for `move_request_refused_admin` (`-461`) | AC6 | |
  | (ii) the opener's refusal email says "Tell the worker." (`-461` item 2) | AC6 | |
  | (iii) `move_request_superseded` reworded ("A request is no longer needed: {from} to {to}.") and sent to B2's new recipients | AC6, AD5 | met in a NARROWER form: the email drops `{from}` / `{to}` (no district in any email); B2's recipients are 13.1d's rows, emailed like any other |
  | (iv) NO time of the act in a `move_request_superseded` email (`-462`) | AC6, I5, AD9 | the arrival-time residual recorded (AD9) |

  Row 51 (c) stays OPEN until the emails are DEPLOYED (built ≠ deployed, [[project_not_in_production_merge_is_not_golive]]).
- **AD13 - The database role: built for Row 26's decision, not ahead of it (G3, G18, G23).** The sweep and the child need the privileges below on
  whatever login runs them. **In dev / CI** that is the superuser, so every live leg proves BEHAVIOUR, never production privilege (TR7, TR9).
  **In production NO login holds them today**, and this story does ⛔ grant them:

  | Step | Runs in | Table | Privilege needed | Scope |
  |---|---|---|---|---|
  | role guard | sweep | `pg_roles` | SELECT (public) | - |
  | selector (i) / (ii) | sweep | `field_worker_notices`, `field_worker_notice_emails` | SELECT | cross-Pariwar |
  | park, give-up | sweep | `field_worker_notice_emails` | SELECT, UPDATE (0187's L125 columns) | cross-Pariwar |
  | begin: the notice | child | `field_worker_notices` | SELECT | one Pariwar |
  | begin / finalise / note-transient | child | `field_worker_notice_emails` | SELECT, INSERT (AD2's columns), UPDATE (L125's columns) | one Pariwar |
  | Q4 | child | `users`, `admin_credentials`, `role_grants` | SELECT | identity - Row 24 |
  | Q2 | child | `admin_credentials` (`email_ciphertext`) | SELECT | identity - Row 24 |

  - **Why no grant here.** (i) Q2 and Q4 read identity tables, and any grant on those stays inside ADR-0040's ratification (Row 24 (a) / (b)) -
    a grant on the two field-worker tables alone would still fail at Q4, so it would not make the sweep run; (ii) Row 26 owns the posture and has
    not chosen it (a `twt_app` member doing `SET LOCAL ROLE twt_app` plus `twt_service` grants for the cross-tenant steps, OR broad `twt_service`
    grants). The 0195 precedent (`twt_service` granted on `marketplace_modules`) is different: that sweep's whole read set was non-identity. This
    story follows 13.1d's escalation sweep (CR37), 13.1b's code-SMS sweep (Row 49 (f)), 6.25 and 11b.4a.
  - **What 0206's `twt_app` grants are for.** The regression spec (AC2), and Row 26's RLS-bound posture: under `SET LOCAL ROLE twt_app` the child's
    writes are exactly AD2's column grants, so that posture adds only the cross-tenant steps' grants.
  - **The code is right under BOTH postures.** Every child statement carries its explicit `pariwar_id` (correct on a BYPASSRLS login, AD3 (c)),
    and stays inside `twt_app`'s column grants and 0206's policies (correct under `SET LOCAL ROLE twt_app`).
  - **The role guard (step 0 of every tick).** `smsDelivery.canReadAcrossPariwars(pool)` FIRST - false ⇒ ONE
    `field_worker_notice_email.rls_bound_role` alarm and the tick ends (⛔ "nothing due"), 13.1b's form (`field-worker-code-sms.ts:9,360`). A
    `42501` from any step ⇒ the run's one alarm carries `code:42501` (13.1d CR37's form) and the tick ends; a child's `42501` is a transient that
    alarms and retries, writing nothing it cannot. Under the Q-2 rule a notice that ages past the cutoff meanwhile is not emailed (exception (i):
    the sweep did not run).
  - **Go-live, therefore.** Row 51 (c) "deployed" means SENDING in production, which needs Row 26 closed with this sweep's steps in its list AND
    Row 24 (b)'s "the production jobs login able to make Q1's and Q2's reads" extended to Q4 for this sender - dated lines at Rows 51, 26 and 24
    (Task 0.5). ⛔ a new leg: both rows already block go-live; the lines say Row 51 depends on them.

## Errors and their HTTP mapping

**None.** No API route is added or changed. The sweep's failures are rows (`outcome` / `detail`) and alarms, as 6.25's.

## ASKs - ALL ANSWERED by BigDev 2026-11-12 (verbatim: Q-2 below; then "Q1 - A", "Q3 - A", "Q4 - A", "Q5 - A"). Each A is the AD as written.

The options are kept as they were put, so `-463` can record what was chosen and what was not.

- **Q-1 - The wording of the seven emails. ANSWERED: A.** (A) as drafted in AD4: the fact, "Tell the worker." on accepted / refused, the link, the footer;
  bilingual, Hindi first, the Hindi agent-drafted and reviewed before go-live (new Row 51 leg (f)) - **recommended**; cost: the English is mine,
  not yours (`opened` and `escalated` already yours, 2026-11-12). (B) your words - give them per kind; same constraints: no name, district,
  reason, cause or time; no role the console notice does not name; "Tell the worker." on `accepted` and `refused` (`-459` Q3 A, ratified; `-461`
  item 2) and ⛔ on `refused_admin`; each text true after the request moves on.
- **Q-2 - ANSWERED 2026-11-12: B, with the two follow-ons.** BigDev, verbatim: *"what if office had a glanca only? I think option (b) is better"*,
  then *"as recommended, all"*. The Q-2 rule (AD6): every eligible notice is emailed, seen or not, and whether or not its request has moved on,
  EXCEPT notices that expire under the held-backlog cutoff; `opened` / `escalated` reworded to stay true; the exception a recorded residual. The options as put: (A) skip a seen /
  stale / moved-on notice; (B) email every notice regardless (cost: duplicate emails for what the officer saw).
- **Q-3 - Opting out. ANSWERED: A.** (A) no opt-out (AD7) - **recommended**; the Panel ruled "by email", so an opt-out would be the Panel's question. (B) build
  a per-officer opt-out - becomes a Panel note first (it narrows a ruled channel); cost: a preference store and screen, and the note.
- **Q-4 - ADR-0045's ratification. ANSWERED: A.** (A) a new Row 51 leg (e) "ADR-0045 ratified", like ADR-0043's Row 41 (l): the build and merge go ahead on the
  drafted ADR, go-live waits for the Panel - **recommended**. (B) the build waits for the Panel to ratify the ADR first; cost: a note now and the
  wait.
- **Q-5 - The arrival time of a "no longer needed" email. ANSWERED: A.** `-462` says the email must not be stamped with the act's time. (A) the TEXT carries no
  time; the email is sent as soon as due like every other kind; its arrival bounds the act's time to within ~15 minutes, for the officer and the
  mail provider - the same class as `-462`'s residual (c) ("the moment the notice first appears to the officer"), recorded in `-463`, not closed
  - **recommended** (AD9). (B) hold `move_request_superseded` emails to a fixed daily send; cost: up to a day's latency and a second schedule;
  the arrival then bounds only the day. (C) send no email for that kind; ⛔ against `-443` Q1 A (ratified: both District Admins are told by
  email), and `-461`'s "must carry ... the reworded `move_request_superseded`" - not offered as a real option.

## Invariants (I)

- **I1** The template's ONLY variable is `link` - by type (a `@ts-expect-error` leg) and at runtime (a widened object forwards nothing else).
- **I2** Once per notice, ever: PK `notice_id`; a finished row is frozen (trigger); `may_have_sent` only ever goes true.
- **I3** The sweep and the child NEVER write `field_worker_notices` (never `seen_at`), `field_worker_move_requests`, `events_log`, `role_grants`,
  `users` or `admin_credentials`; a failed, held or skipped send changes nothing but its own row - enforced by a no-write source fence (Task 5.2).
- **I4** The address is read (Q2) and decrypted only in the child AFTER its claiming commit; it lives in the child's memory until the provider
  call; it is ⛔ logged, ⛔ stored, ⛔ in a `detail`, ⛔ in an alarm.
- **I5** No email text holds a time, a date or a digit outside the link; none names a person, a district, a reason or a cause.
- **I6** The recipient is the notice row's `recipient_user_id`, re-checked by Q4; the email is ⛔ sent to anyone else.
- **I7** The child reads ONE notice row, by `notice_id` AND `pariwar_id`; every child statement carries the explicit `pariwar_id` predicate (RLS
  does not apply on the jobs pool, G18); the selector projects no content column.
- **I8** No member predicate is read or written.

## Acceptance Criteria

1. **AC1 - Governance first.** Decision `2026-11-<DD>-463` (AD1-AD13, the Q answers verbatim, the Q-2 rule word for word WITH its exception
   (AD6), the residuals of AD6 / AD9, Row 51's new legs (e)
   and (f)) committed ALONE; then ADR-0045 (`drafted`; cites `-463`; amends ADR-0040's ADR-0009 section 5 amendment, effective when ratified;
   admits Q4, a third Q2 caller and its decrypt; the closed set; the G3 / G4 / G18 notes; AD5's narrowings; the Q-2 rule word for word with its exception) with its `adr-index.md`
   row and reconciliation paragraph, committed ALONE; then the roster's dated lines (Task 0.5) and the `epics.md` annotation (Task 0.6) - all
   before any code.
2. **AC2 - The table.** Migration 0206 creates `field_worker_notice_emails` per AD2 (FK to the notice; the outcome / detail / skipped CHECKs; the
   guard trigger; `twt_app`-only narrowed grants with `notice_id` in the INSERT list; FORCE RLS with three tenant policies) and the notices'
   `field_worker_notices_pariwar_notice_uq` and due index; the drizzle schemas (both files), `schema/index.ts`, the RLS declaration and
   `policies/index.ts` match; a regression spec proves the policies, the grants (`has_column_privilege` per column, `memorial-takedown-policy-regression.spec.ts:188-195`'s
   form), the trigger (a finished row refuses an UPDATE; `may_have_sent` true → false refused; `aging_since` backwards refused), the outcome
   and detail lockstep, and the FK; 13.1d's regression spec lists the new constraint and index.
3. **AC3 - Selection.** A notice with no email row created at or after the cutoff is enqueued once per sweep - **whether or not it is seen** (a
   leg with `seen_at` set); a notice with a FINAL email row is not; a notice created before the cutoff is not; an `attempting` row IS selected
   whatever its notice's age or `seen_at`, so a parked row is re-claimed after a hold; the `allow` list confines every branch; a held run writes
   NO new row and parks in-flight ones; an un-held run gives up rows past 3 IST days as `error` / `exhausted:attempting_three_days`, its alarm
   sampling `notice_id`s. **The Q-2 rule's exception, legged both ways:** (i) hold the sweep, age a notice past the cutoff, release - no row, no
   send, ever; (ii) an `attempting` row past 3 IST days (un-parked) is given up and never sent again; while a notice ONE day old after the same
   hold IS sent.
4. **AC4 - The claim and its re-check.** Under `SET LOCAL lock_timeout` and `pg_advisory_xact_lock(hashtext('field-worker-notice-email:' ||
   notice_id))` (⛔ `FOR UPDATE` on the notice): read the notice (`notice_id` AND `pariwar_id`); read any email row - a final one ⇒
   `already_final`; an `attempting` one not ours, not parked and inside the lease ⇒ `held_by_other`; **CR1 correction (2026-11-12):** if no
   email row exists and the notice is before the current cutoff, return `past_cutoff` with no write or send (AD6 exception (i)); read the
   child's clock after the advisory lock and preserve recovery of existing attempting rows regardless of notice age. Re-check Q4; then a fresh notice inserts
   `skipped` / `skipped:not_eligible` or `attempting` with `ON CONFLICT (notice_id) DO NOTHING` (no row ⇒ `held_by_other`), and an existing
   `attempting` row is re-claimed by compare-and-set (parked-time credit to `aging_since`) or, if Q4 now fails, finished `error` /
   `exhausted:recheck_not_eligible` (result `expired`; the caller alarms "may have sent") [AMENDED by review R2-1: when the row is still held by a LIVE holder at that moment (its lease unexpired, another job) the result is `held_by_other` and the row is untouched; a same-job retry, a parked row or an expired lease is `expired` as written]. Results `begun | already_final | held_by_other |
   past_cutoff | skipped | expired`; `begun` carries `recipientUserId` and `kind` from the notice. Q4 legs (`skipped:not_eligible`): user `suspended`, user
   `disabled`; no `admin_credentials` row; the district grant revoked; a District Admin of a THIRD district; a Pariwar Admin whose `pariwar` grant's
   `scope_value` names another Pariwar; a Pariwar Admin grant REPLACED by a state-scoped one after the notice; a `super_admin` opener's
   accepted / refused notice. A positive leg per kind's recipient set (written by 13.1d's real commands). A skipped row sends nothing. The
   re-check failing on a re-claim ⇒ `error` / `exhausted:recheck_not_eligible`. A notice SEEN before the claim is still `begun` (Q-2 B).
5. **AC5 - The send.** After the claiming commit: Q2, `decryptAdminEmail` (no row in `admin_credentials`, or an empty decrypt ⇒
   `error:no_address`), `isSendableEmailAddress` (⛔ ⇒ `error:invalid_address`), render (a failure ⇒ the `render_failed` transient, counted as
   held and alarmed once per distinct fault, 6.25's L322-354), `send({to, subject, text, reference: notice_id})`, compare-and-set finalise:
   `accepted` with `provider_message_id`; `rejected` with its code; a transient notes `transient:` / `held:` + `may_have_sent` and throws for
   pg-boss to retry. Each outcome has a leg on the fake client.
6. **AC6 - The text (I1, I5).** For EACH of the seven kinds: the subject is `"<hi> / <en>"`; the body is exactly AD4's layout (Hindi body, Hindi
   footer, a blank line, English body, English footer); the link appears twice and the footer once per language; Hindi before English; no
   unresolved `{token}`; the English equals AD4 (or Q-1 B's words); "Tell the worker." appears in `accepted` and `refused` ONLY; no digit outside
   the link; a smuggled name, district, reason, date, worker id and request id never appear; a TYPE-LEVEL leg refuses a second param. A sync leg:
   the template keys = `FIELD_WORKER_NOTICE_KINDS`, no more, no fewer, in `en` AND `hi`. Rendered through the REAL `t()`
   ([[feedback_stub_must_call_not_transcribe]]).
7. **AC7 - The link survives sign-in (G13).** The link is `${ADMIN_APP_ORIGIN}/p/<pariwarId lower-case>/field-workers/requests`; a jobs test reads
   the admin SOURCE as text (6.25's form) and proves its path is the router's ONE `path:` ending in `field-workers/requests`, matches
   `FIELD_WORKER_REQUESTS_PATH`, and equals `fieldWorkerRequestsPath`'s return line. In `apps/admin/tests/login-return-path.test.tsx`:
   `'field-workers/requests'` joins the existing hostile loop (L107-131: absolute URL, `//evil`, `/../../audit`, a backslash, `javascript:`, a
   query, a trailing segment, an upper-case id, a suffixed id); refusals for `/p/P/field-workers`, `/p/P/field-workers/approvals` and
   `/p/P/field-workers/requests/x`; `allowedNextPariwarId(fieldWorkerRequestsPath(P))` is `null` (as L104); a sign-in round trip (as L133-136);
   the route's session error goes to `/login?next=<path>`; the two existing return routes still work. In
   `apps/admin/tests/field-worker-move-requests.test.tsx`: L651, L668 and L1155 expect `{ to: '/login', search: { next: '/p/<P>/field-workers/requests' } }`;
   a `DistrictPicker` 401 leg on this page; the Find / Register / Approvals pages still navigate `{ to: '/login' }` (the control).
8. **AC8 - The fences.** `staff-email-identity-read-fence.test.ts` gains EXACTLY: Q4's module in `IDENTITY_ALLOWLIST` with its own `Q4_MODULE`
   constant, projection rules that are Q3's with `fn_ac` in place of `mt_ac` (G9), a `missing:${Q4_MODULE}` check, and a planted violation per
   new rule; the child in `DECRYPT_ALLOWLIST` and `Q2_CALLER_ALLOWLIST`; each entry citing ADR-0045; the header widened in ADR-0043's style.
   `CONTEXT_ALLOWLIST` is ⛔ widened. A NEW `field-worker-notice-email-no-decision.test.ts` (6.25's form, G22) refuses I3's writes in the four new
   modules. Both green; each plant caught.
9. **AC9 - Wiring.** `registerFieldWorkerNoticeEmailWorkers(boss, { pool, encryption, staffEmail, adminAppOrigin })` in `boot.ts` beside 11b.4a's,
   on the SAME client (its boot alarms already raised by 6.25's register); the two queue names in `packages/queue`; a LIVE test of the sweep's
   tick outcomes (held / config gap / un-held give-up / enqueue; modelled on `claim-suspicion-staff-emails-live.test.ts`) and of one notice per
   kind end to end on the fake client. **The role (AD13):** the tick's FIRST step is `canReadAcrossPariwars` - a leg on a real RLS-bound login
   (`SET ROLE twt_app` on the test connection) ⇒ one `rls_bound_role` alarm, nothing selected, parked, given up or sent; a `42501` from the
   selector (an injected pg error) ⇒ one alarm with `code:42501`, nothing written. Every live leg states it runs as the superuser (behaviour,
   not production privilege).
10. **AC10 - Records.** `-463`'s Row 51 legs and dated lines (Task 0.5); `epics.md` annotations; `deferred-work.md` 13.1d C1 closed at landing per
    AD12's map, RP-D1 annotated in place as NOT closed; the ledger. A record states only what has run ([[feedback_record_unattested_no_backfill]]).

## Tasks / Subtasks

Order matters: governance first ([[feedback_governance_commits_precede_implementation]]), then the table, the domain, the job, the link. Commit on
the story branch only ([[feedback_commit_on_story_branch]]); check the branch before EVERY commit ([[feedback_concurrent_review_agents_mutate_tree]]);
work only in this worktree with ABSOLUTE paths and grep `docs/legal` by absolute path ([[feedback_worktree_session_never_cd_to_main_checkout]]);
prefix every `ci:local` and `git push` with the story's `DATABASE_URL` port and `?sslmode=disable` on a FRESH container
([[project_prepush_hook_inherits_5432]], [[project_known_livedb_test_failures]]); hand-format ([[project_prettier_not_enforced]]); first push with an
explicit refspec ([[project_story_branch_upstream_is_main]]).

- [x] **Task 0 - Preflight and governance (AC: 1, 10)** - writes no code.
  - [x] 0.0 DONE 2026-11-12 (BigDev: "commit the records (Task 0.0)"): the `records(13.1g)` commit on the story branch, parent `cae6ac65`. Commit this story file and the create-story / validate record edits (`epics.md` note under Story 13.1g, `deferred-work.md` section,
    `sprint-status.yaml` row + ledger `2026-11-11a` / `2026-11-12a`) as ONE `records(13.1g)` commit on the story branch, when BigDev asks.
  - [x] 0.1 DONE 2026-11-12: `origin/main` still `cae6ac65`; no code moved; `-463`, ADR-0045, 0206 free on every ref and worktree (journal idx 205, `when` 1797305400049); 155 index rows; no sibling branch or worktree touches the named files. `git fetch origin`; `git merge-base --is-ancestor cae6ac65 HEAD`; `git diff --name-only cae6ac65..origin/main -- packages apps scripts docs`.
    Re-grep the NUMBERS block (`-463`, ADR-0045, 0206, the journal's last `when`, the ADR index count); `git worktree list` / `git branch -a` for
    another branch touching `field-worker/`, `staff-email*`, `login-next.ts`, `sign-in.ts`, the fence, or migrations 0206+.
  - [x] 0.2 **HALT on Q-1..Q-5** - DONE 2026-11-12: all answered (Q-2 B; Q-1, Q-3, Q-4, Q-5 A), propagated through this file, `deferred-work.md`,
    `epics.md` and the ledger (`2026-11-12b`); no B answer adds a field or an opt-out, so no Panel note. (As written:) Propagate the answers through this file (AD4, AD7, AD9, ACs, Tasks),
    `deferred-work.md`, `epics.md` and the ledger in the same edit, before any code ([[feedback_spec_edits_must_propagate_to_tasks]]). A B answer
    that adds a field to an email or an opt-out STOPS for a Panel note (section 0, rows 3-4).
  - [x] 0.3 DONE 2026-11-12: `2026-11-12-463` committed ALONE `ad0244f8`. Write decision `2026-11-<DD>-463` (the date it is written) above the newest entry (re-grep every ref and worktree; heading and field
    order as `-462`); commit it ALONE (`governance:`): an author-commit recording AD1-AD13 and the answers verbatim; "supersedes no RATIFIED text;
    adds no member predicate"; the Q-2 rule word for word WITH its exception (AD6); AD13 (no production grant; why; the privilege table); the residuals (the rule's exception; AD9's arrival time, `-462` residual (c)'s class); the narrowings of AD5; its
    Consequences AUTHOR Row 51's new legs (e) ADR-0045 RATIFIED (Q-4 A) and (f) the Hindi of the seven `notice_email.*` texts reviewed by a
    non-author (as `-452` amended Row 49 by decision). Cite `-443` Q1 A, `-458` AD1 / AD9, `-459` Q3, `-460` item 1, `-461` items 1-3 and "NOT
    covered", `-462` "NOT covered" and residual (c), `-262` FQ3 A, `-299`, `-358`, `-412`, ADR-0040 / ADR-0043, and ADR-0045 "(committed next)".
  - [x] 0.4 DONE 2026-11-12: ADR-0045 + index row + reconciliation (156 rows re-counted; 110 / 3 / 0 / 42 / 1) committed ALONE `cae6a377`. Write `docs/adr/ADR-0045-field-worker-move-notice-email.md` from `docs/adr/_adr-template.md` (AD1; cites `-463`); in
    `docs/knowledge-transfer/adr-index.md` a NEW Section A row (check first that no `slot-reserved-pre-write` row fits) and an italic reconciliation
    paragraph per `docs/knowledge-transfer/README.md` section 7; the ADR's Decision states the Q-2 rule word for word with its exception (AD6)
    (the ADR-0043 paragraph at L56 is the model: `drafted` 2 -> 3, Total 155 -> 156,
    RE-COUNTED with `grep -cE '^\| ADR-'`; status `drafted`, ⛔ `under-trustee-review`; ratification = Row 51 (e)); commit ALONE
    (`governance(13.1g): ADR-0045 ...`).
  - [x] 0.5 DONE 2026-11-12: Rows 51 (two dated lines: legs (e), (f); (c) + the Q-2 rule), 26, 24 committed ALONE `b71915e7`. Roster, its OWN `governance:` commit - dated lines at **Row 51** (criteria never edited): it adds legs **(e)** and **(f)** per `-463`,
    and the row now closes on ALL SIX ("ALL FOUR" above is as of `-458`); (c) its build is this row, still OPEN until deployed; the sweep, like the
    escalation sweep, cannot read 0205 / 0206 on the production jobs login until Row 26 closes (G3); sending at all waits for Row 24 (the
    transport); a dated line at **Row 26** adding AD13's steps to its list (6.36d's 2026-10-23 note is the form) and one at **Row 24** noting
    Q4 joins Q1 / Q2 in (b)'s "production jobs login able to make ... reads" for this sender, each saying Row 51 (c) depends on it - ⛔ a new
    leg; the Q-2 rule word for word (AD6), and for operators: an email outage (or a stopped sweep) of 3+ IST days loses those notices' emails by
    design, the held run's alarm is the signal, and the console still has every notice. ⛔ a new row.
  - [x] 0.6 DONE 2026-11-12: a DECIDED note under Story 13.1g. Annotate `epics.md` Story 13.1g (what was decided, where) - annotate, never rewrite.

- [x] **Task 1 - The table (AC: 2; I2)**
  - [x] 1.1 Migration `0206_field-worker-notice-emails.sql` (AD2; copy 0187's statements, renamed - ⚠ the INSERT grant is AD2's, NOT 0187's;
    idempotent guards as 0187) + `meta/_journal.json` (idx 206, `when` greater than 1797305400049 -
    [[project_sibling_migration_when_order_shared_db]]). Run on a FRESH container; never regenerate an applied migration
    ([[project_live_db_test_gotchas]]).
  - [x] 1.2 `schema/field_worker_notice_emails.ts` (+ the outcome and detail-pattern constants), `schema/field_worker_notices.ts` (the `unique` and
    the `index` only), `schema/index.ts`, `policies/field-worker-notice-emails-rls.ts`, `policies/index.ts`; reuse `FieldWorkerNoticeId`
    (`ids/index.ts:906`) - ⛔ a new brand ([[project_branded_ids_lowercase]]).
  - [x] 1.3 Regression spec `packages/domain/tests/integration/rls/field-worker-notice-emails-policy-regression.spec.ts`: tenant policies, the
    column grants, the trigger's three refusals, the outcome / pattern lockstep, the FK. Each guard RED-proved (mutate, see the assertion fail,
    restore).
  - [x] 1.4 13.1d's `field-worker-move-requests-policy-regression.spec.ts` (G19): add `['field_worker_notices_pariwar_notice_uq', 'u']` and
    `field_worker_notices_email_due_idx` to its two exact lists, and pin the UNIQUE's def and the index's columns.
  - [x] 1.5 The two replica-mode cleanups (G17) delete `field_worker_notice_emails` for the same Pariwars BEFORE the notices (TR4). ⛔ touch the other
    three files.

- [x] **Task 2 - The domain (AC: 3-5; I2-I7)**
  - [x] 2.1 `field-worker/notice-email-eligibility-read.ts`: Q4 (AD5, the SQL in full), Q3's projection discipline, unique aliases (`fn_u`,
    `fn_ac`, `fn_g`).
  - [x] 2.2 `field-worker/notice-email.ts`, mirroring `memorial/takedown-approver-email.ts` function by function (G20); constants re-exported from
    6.25's; every statement filtered by `pariwar_id` (AD3 (c)): `selectDueFieldWorkerNoticeEmails` (AD3 (b)'s two branches, `allow`, keyset on
    `notice_id`, `clampLimit` cap - `pagination.ts:34`), `beginFieldWorkerNoticeEmail` (AC4's order and results, including CR1's first-claim
    cutoff / `past_cutoff` and the clock read after the lock), `finaliseFieldWorkerNoticeEmail`
    (CAS), `noteFieldWorkerNoticeEmailTransient`, `parkHeldFieldWorkerNoticeEmails` (`allow`), `expireExhaustedFieldWorkerNoticeEmails` (`allow`;
    `RETURNING notice_id`), `fieldWorkerNoticeEmailDetail` + `isFieldWorkerNoticeEmailDetail`. Export through the barrel.
  - [x] 2.3 Live spec `packages/domain/tests/integration/field-worker/notice-emails.spec.ts`: AC3's selection legs (incl. a seen notice selected and
    a parked `attempting` row re-selected), every AC4 leg incl. each Q4 negative, the race (two begins, one `begun`), park / re-claim credits only
    parked time, give-up. Notices are written by 13.1d's REAL commands (open / accept / refuse / escalate / a direct move / an ending), ⛔ raw
    inserts, so the recipient set under test is the shipped one. To AGE a notice (the cutoff leg) or a send row (the give-up), backdate in a
    superuser transaction under `SET LOCAL session_replication_role = 'replica'` (precedent
    `field-worker-move-requests-policy-regression.spec.ts:275,446-447`), committed before the sweep runs - ⛔ an ALTER of the shared table
    ([[project_test_only_ddl_use_pg_temp_clone]]); seed `attempting` send rows by raw INSERT, as 11b.4a's live test (L409-454). Mind
    [[project_db_clock_ordering_tests_tie]] and [[project_fk_truncate_cascade_deadlock]].

- [x] **Task 3 - The text (AC: 6; I1, I5)**
  - [x] 3.1 `packages/i18n/locales/{en,hi}/field_worker.json`: the 15 FLAT keys + `$comment.notice_email` (agent-authored, Hindi NOT YET
    HUMAN-REVIEWED, Row 51 (f); the same English text in both files) - 16 entries per locale. Type the Hindi; scan the added lines for invisible
    characters ([[project_unicode_escapes_written_raw]]).
  - [x] 3.2 `apps/jobs/src/scheduler/field-worker-notice-email-templates.ts` (AD4) and `apps/jobs/tests/field-worker-notice-email-templates.test.ts`
    (AC6 and AC7's jobs leg, modelled on `staff-email-client.test.ts:350-400`).

- [x] **Task 4 - The job (AC: 3-5, 9; I3, I4)**
  - [x] 4.1 `apps/jobs/src/scheduler/field-worker-notice-emails.ts`, mirroring `memorial-takedown-approver-emails.ts` (its imports, G21) + 6.25's
    link / origin / render handling; `pariwarAllowlist` in its deps; queue names in `packages/queue/src/index.ts`; registration in `boot.ts`
    beside 11b.4a's (AD3 (e): the pool); the role guard as step 0 and the `42501` alarm (AD13); its header records AD13's table and that the
    production login cannot run it until Rows 26 / 24 (13.1d's escalation header, CR37, is the model).
  - [x] 4.2 Live test `apps/jobs/tests/field-worker-notice-emails-live.test.ts` (AC9: the tick outcomes; one notice per kind through the fake
    client - the recipient, the subject, the outcome row; a held run then a recovered one re-claiming the parked row; a transient then success;
    `may_have_sent`), with its own `pariwarAllowlist`.

- [x] **Task 5 - The fences (AC: 8)** - in the SAME commit as Task 2.1 / Task 4.1's new sites (ADR-0043's rule). RED-prove each new plant.
  - [x] 5.1 The staff-email fence's three entries and Q4's rules.
  - [x] 5.2 `apps/jobs/tests/field-worker-notice-email-no-decision.test.ts` (G22's form) over the four new modules.

- [x] **Task 6 - The sign-in return (AC: 7)** - AD10: `login-next.ts`, `FieldWorkerMoveRequestsRoute.tsx`, `sign-in.ts` and its five callers on the
  page, the two stale comments; tests per AC7. A browser check of one emailed link signed-out → sign-in → the Move requests page, in the dev Mac's
  Chrome ([[project_agent_chrome_cannot_reach_localhost]], [[project_admin_browser_pass_launcher]]); record whether it ran [RAN 2026-11-12 - Dev Agent Record, "Browser pass": four legs, no defect]. Expected, not a defect:
  a District Admin lands on "All districts", whose first read is a 403 shown as "choose a district you manage" (`MoveRequestsPage.tsx:157-160`).

- [x] **Task 7 - Records + gate (AC: 10)** - Dev Agent Record and File List; `deferred-work.md`; `epics.md` BUILT note; ledger. `ci:local` on a FRESH
  container through the push.

- [x] **Task 8 - At landing (AC: 10)** - ledger; `epics.md` LANDED note; `deferred-work.md` 13.1d C1 "Closed by <sha>" per AD12's map (incl. the
  three-of-four allowlist variance and (iii)'s narrower form); a dated line ON RP-D1's own entry (L14458): 13.1g landed, changed no notices
  contract - its trigger did not fire, NOT addressed; Row 51 (c) dated line "BUILT, not deployed".
  **DONE 2026-11-12 (v1.14), written AFTER the landing and the CI result it cites:** ledger `2026-11-12l` and the row `review` -> `done`; the `epics.md` LANDED note; `deferred-work.md` 13.1d C1 "Closed by `54ff8a67`" item by item (two items qualified, as AD12 foresaw: three of the four fence allowlists, and (iii) in its narrower form); the dated line on RP-D1 (NOT addressed); Row 51 (c) "BUILT, not deployed".

### Review Findings

Code review 2026-11-12 (Codex), full review of `cae6ac65..31f1938e` in this worktree: 45 files, 3,987 additions / 48 deletions.
All three independent layers completed (Blind Hunter, Edge Case Hunter, Acceptance Auditor). Deduplicated result: **0 decision-needed,
3 patch, 0 defer, 0 dismissed**. These are engineering corrections; no Panel question is needed. BigDev selected option 1 (apply every
patch). All three findings are resolved below; the application edits are limited to the claim and the jobs child, with their regression tests.

- [x] [Review][Patch] **CR1 / P2 - Re-check the cutoff before a queued child's FIRST claim**
  [packages/domain/src/field-worker/notice-email.ts:289]. The sweep alone checks the notice's age. `beginFieldWorkerNoticeEmail` does not
  read `created_at`, so a job queued before midnight IST can first execute (or retry a failed claiming transaction) after the cutoff
  advances, insert its first email row and send an expired notice. This violates AD6 exception (i) / TR5: no email row by the cutoff means
  intentionally never emailed. **Live reproduction:** enqueue at 23:59 IST, advance the injected clock to 00:01, prove a fresh selector
  excludes the notice and no email row exists, then deliver the saved envelope: one fake-provider call and an `accepted` row result.
  Check the current cutoff under the notice lock only when no email row exists; leave recovery of existing attempting / parked rows
  intact. Add a delayed-child regression across midnight, including a first-claim retry after a rolled-back claim.
  **Resolved 2026-11-12:** the notice read computes `within_backlog` in SQL; a first claim outside it returns `past_cutoff` without a row
  or a send. The child passes a clock read after the advisory lock, so a lock wait cannot preserve yesterday's cutoff. The exact-cutoff
  positive, a notice one microsecond before it, existing parked-row recovery, queued / rolled-back-claim / lock-wait midnight cases pass.
- [x] [Review][Patch] **CR2 / P2 - Preserve and alarm a Q2 permission failure**
  [apps/jobs/src/scheduler/field-worker-notice-emails.ts:340]. The address-read catch discards the error and calls `preCall('read_failed')`;
  that path sets `held: false`, so the successful transient note produces no operator alarm. A login able to claim and run Q4 but denied
  SELECT on `email_ciphertext` silently retries a persistent grant fault until eventual exhaustion. This violates AD13's promise that a
  child's SQLSTATE 42501 alarms and retries. **Reproduction:** inject 42501 only at the real Q2 query, allow the claim and transient note,
  and observe `ClaimCorrectionTransientError`, an `attempting` row with `transient:read_failed`, zero provider calls and `alarms: []`.
  Retain the fault class (including a wrapped database cause if applicable), emit the required `code:42501` alarm and preserve the retry;
  test this post-claim failure explicitly.
  **Resolved 2026-11-12:** `faultClass` follows a cycle-guarded cause chain; Q2 permission denial emits a `code:42501` alarm and retains the
  existing `transient:read_failed` retry. A fault injected at the actual Q2 driver query (wrapped by real Drizzle) proves the alarm and
  persisted attempt; an ordinary `08006` read failure still retries without a permission alarm, and recovery sends once on the same job.
- [x] [Review][Patch] **CR3 / P2 - Add AC5's child-level held-fault and render/decrypt failure tests**
  [apps/jobs/tests/field-worker-notice-emails-live.test.ts:373]. The existing transient test injects only `held: false` / `transient:timeout`.
  No child test injects `render_failed`, `decrypt_failed` or a provider result with `held: true`; the renderer-only throw test does not
  exercise persistence, retry or alarms. AC5 explicitly requires the render-failure transient and an alarm once per distinct held fault.
  Add child-level legs that prove the row remains `attempting`, the expected detail is recorded, pg-boss receives a transient error,
  decrypt/render failures do not reach the provider, repeated identical held faults do not repeat the alarm, and a changed fault alarms.
  **Resolved 2026-11-12:** child-level tests cover real decrypt failure, an injected renderer crash, repeated identical and changed faults,
  provider `held: true`, persisted details / attempt counts / `may_have_sent`, transient throws, suppressed duplicate alarms, and recovery
  on the same job. Decrypt / render failures make zero provider calls; provider-held attempts do reach the fake provider.

Verification: **137 existing focused tests passed**: jobs templates / no-write fence / identity-read fence 23; admin sign-in-return /
Move requests 77; domain notice-email / policy regression 24; jobs live sweep / child 13. Live tests used only the story's existing
`twt-131g-pg` on port 5452 (the test superuser, behaviour rather than production privilege). Initial sandbox connection failures were
rerun with authorized local access. Two additional expected-behaviour assertions in a temporary scratch suite are RED for CR1 and CR2;
temporary reproductions are in `/private/tmp/twt-13-1g-review/`, outside the repository. The Q2 reproduction injects a database fault;
it does not attest a production login's privileges. The existing disclosed browser check remains unrun.

Fix verification (after BigDev's option 1): **66 affected tests passed** — jobs live suite 19 (six new cases; the two queued / rolled-back
cutoff cases and the Q2 permission case were RED before the fixes), domain notice-email / RLS suites 24, jobs templates / source fences 23.
Both affected packages typecheck; ESLint passes on the four changed code/test files; `git diff --check` passes. The final jobs suite also
proves midnight during the lock-query wait. Used the existing isolated story database on port 5452; no production-privilege claim, browser
run, fresh-container full `ci:local`, commit, push, landing or deployment is attested by this fix pass. The prior full-gate record below
describes the earlier implementation run. Review status is `done` [corrected 2026-11-12: `review` - R4-7]; landing Task 8 and the disclosed browser check remain outstanding.

Load-bearing-invariant lens (untouched families omitted):

| Family | Verdict / evidence |
|---|---|
| 1 - state guards | **covered-by-test**: CR1 boundary / midnight tests and domain first-claim cutoff assertions; final-row guards in `notice-emails.spec.ts` and policy regression case (j). |
| 2 - concurrency / redelivery | **covered-by-test**: CR1 queued / rolled-back / lock-wait tests, parked-row recovery and jobs live `the race: two children for ONE notice at once`. |
| 3 - tenant / actor boundaries | **covered-by-test**: domain `I7 / G18`, jobs `I7`, and Q4 negatives for status, credentials and scope. |
| 5 - DB backstops | **covered-by-test**: policy regression cases (a)-(j), including FORCE RLS, grants, FK, uniqueness, CHECKs and trigger guards. |
| 6 - projection / PII | **covered-by-construction / test**: explicit ID-only selector, boolean Q4, link-only template; template smuggling and all-kinds jobs tests. |
| 9 - deliberate bypasses | **covered-by-construction**: cross-tenant selector / park / expiry document rationale and re-examination triggers; child predicates by Pariwar. |
| 10 - closure honesty | **covered-by-construction**: records disclose the browser gap, production blockers and landing work, and distinguish built from deployed. |
| 13 - accessibility | **covered-by-construction**: component edits carry only the sign-in return path; existing announced redirect state remains. |

#### Code review 2026-11-12 (Claude Sonnet 5.5, `bmad-code-review 13.1g on worktree`), round 2 - CHUNK 1 of 3: `packages/domain` (13 files, +1,495 / -2; HEAD `4862fda6`)

Scope: the whole branch diff `cae6ac65...4862fda6` is 45 files / +4,223 -48, over the skill's 3,000-line limit, so BigDev ("go") took the three chunks in order:
**1** `packages/domain` (this block), **2** `apps/jobs` + `packages/queue` (the CR1-CR3 child fixes live here), **3** admin sign-in return, i18n, ADR-0045, roster, records.
Round 1 (Codex, above) read `31f1938e`; `4862fda6` (its CR1-CR3 fixes) had not been read by a second reviewer. Three layers in parallel, strictly read-only
(Blind Hunter on the diff file alone; Edge Case Hunter and Acceptance Auditor with read access). No layer failed. Result: **0 decision-needed, 3 patch,
2 defer, 13 dismissed.** CR1's fix (first-claim cutoff under the lock) was re-checked against AC3 / AD6 and delivers it. No Panel question: nothing here touches
what the Trust discloses, owes, or a legal basis (section 0 gate applied).

- [x] [Review][Patch] **R2-1 - The Q4-fail RE-claim UPDATE does not re-test the holder / lease the claim UPDATE does** [packages/domain/src/field-worker/notice-email.ts:337-345].
  `begin` decides "this row may be taken over" from a SELECT (:300-314); the successful re-claim re-tests it in its WHERE (`claimed_by_job = $4 OR claimed_by_job = $5 OR claimed_at < $6`, :362)
  and falls back to a re-SELECT (`held_by_other` / `already_final`, :367-371). The `recheck_not_eligible` UPDATE (`... AND outcome = 'attempting'` only) does not. `finalise` and
  `noteTransient` take no advisory lock, so a holder that refreshes `claimed_at` (a transient note) between the SELECT and this UPDATE has its live row forced to `error` /
  `exhausted:recheck_not_eligible`; its own later `finalise` returns `null` and an accepted send is recorded as `error` (`may_have_sent` is already true, so no duplicate and no
  disclosure - a mis-record plus an alarm). Reachable only when a lease-expired holder is still alive (a stall past the 30-minute lease) AND the recipient has just stopped being
  eligible - narrow, but the claim UPDATE two screens below is guarded for exactly this and the fix is its own predicate. Fix: the same WHERE; on 0 rows the same re-SELECT (`held_by_other`
  if still `attempting`, else `already_final`); a test that a row whose holder refreshed after the SELECT is not forced to `error` (two connections, or a hook between the SELECT and the
  UPDATE) and a RED proof (drop the predicate, see it fail). *Found by: edge. Not a Panel question (engineering: the same compare-and-set).*
  **Resolved 2026-11-12:** the `recheck_not_eligible` UPDATE carries the re-claim's predicate (`claimed_by_job = $4 OR claimed_by_job = $6 OR claimed_at < $7`) and, on 0 rows, the same re-SELECT -
  `rowMovedOn`, now shared with the re-claim path: `held_by_other` while the row is still `attempting`, else `already_final`. Test (`notice-emails.spec.ts`, "R2-1 - ..."): a hook on the Q4 statement runs job-1's
  REAL `noteFieldWorkerNoticeEmailTransient` between job-2's read and its UPDATE (one connection, so the note's plain UPDATE is what a committed write on a second connection would show); job-2 gets
  `held_by_other`, the row stays `attempting` under job-1 with the note's detail, and job-1's own `finalise` still lands. Control: the existing RE-claim test (same set-up, no hook) is `expired`.
  RED: the predicate made `... OR true` -> only the new test fails (`expired` instead of `held_by_other`).
- [x] [Review][Patch] **R2-2 - Policy-regression (c)'s "no grant to the jobs role" pin cannot see a column-level grant (checklist family 5 - REAL GAP)** [packages/domain/tests/integration/rls/field-worker-notice-emails-policy-regression.spec.ts:144,170].
  `priv()` is `has_table_privilege`, which is true only for a TABLE-level privilege. 0206 grants `twt_app` COLUMN-narrowed INSERT / UPDATE - the form a later edit would copy - so
  `GRANT INSERT (notice_id, pariwar_id, ...) TO twt_service` leaves `for (p of ['SELECT','INSERT','UPDATE']) expect(priv('twt_service', p)).toBe(false)` green while AD13's "no production
  grant" is broken. The same test already enumerates `twt_app` per column with `has_column_privilege`; the `twt_service` leg does not. Fix: `has_any_column_privilege('twt_service', table, p)`
  (true for either form); RED-prove it with a COLUMN-level grant, not only a table-level one ([[feedback_gate_scope_semantic_coverage]]). *Found by: auditor (blind noted the same test's weak role pin).*
  **Resolved 2026-11-12:** the `twt_service` leg (SELECT / INSERT / UPDATE) uses `has_any_column_privilege`, and its failure message names the privilege. RED both ways on the story DB: with
  `GRANT INSERT (detail) ON field_worker_notice_emails TO twt_service` the OLD pin stayed 11/11 green (`has_table_privilege` f, `has_any_column_privilege` t - the blind spot, shown), the NEW pin fails
  (`twt_service INSERT: expected true to be false`); the grant was REVOKED afterwards (`has_any_column_privilege` f) and the spec is 11/11.
- [x] [Review][Patch] **R2-3 - AC4's `super_admin` leg is half driven: only the ACCEPTED notice** [packages/domain/tests/integration/field-worker/notice-emails.spec.ts:329].
  AC4 lists "a `super_admin` opener's accepted / refused notice" among the Q4 negatives (`skipped:not_eligible`). The spec drives the accepted notice only. The refused notice takes the same
  Q4 path (no `global` branch), so this is a test gap against the AC's own list, not a code defect. Fix: the refused leg beside it. *Found by: auditor (nit).*
  **Resolved 2026-11-12:** the same test now opens a second request by the `super_admin` opener (a fresh Patna worker) and refuses it at Gaya; the only `move_request_refused` notice is the opener's, and its
  `begin` is `skipped` with a `skipped` / `skipped:not_eligible` row. RED: Q4 admitting a `super_admin` / `global` grant (with the accepted-leg assertion removed in a scratch copy, so the refused leg is
  the first to run) -> `begun` instead of `skipped`.
- [x] [Review][Defer] **R2-W1 - Three shapes inherited from 6.25 / 11b.4a's outbox are carried into this table unchanged** [packages/domain/src/field-worker/notice-email.ts:300-346, 0206 header] - deferred, pre-existing.
  (a) a failed re-check on a RE-claim sets `may_have_sent = true` whatever the row's `detail` (a row that only ever held / failed pre-call is alarmed "may have sent" - conservative, and the
  type comment says so); (b) the lease and credit arithmetic use the JS `now` while `aging_since` / `created_at` use the DB clock (the tests read `dbNow`); (c) the 0206 header's "emailed at most ONCE,
  EVER (I2)" is the spec's I2 wording for one FINISHED row per notice - a crashed send re-claimed after the 30-minute lease can send again, which is exactly what `may_have_sent` records.
  All three are identical in `takedown-approver-email.ts` / 0187 and ratified by the 6.25 family (decision `-301`); changing them here and not there would fork the pattern. Owner: the next story that
  changes the 6.25 / 11b.4a outbox. Trigger: a false "may have sent" alarm reported, or a clock-skew incident.
- [x] [Review][Defer] **R2-W2 - 11b.4a's re-check UPDATE, and the 6.25 original it mirrors, have the same missing holder / lease re-test as R2-1** [packages/domain/src/memorial/takedown-approver-email.ts:417-427; packages/domain/src/claim/suspicion-staff-email.ts (the same `WHERE notice_id = $1 AND outcome = 'attempting'`, whose own comment says the give-up can finish the row between the SELECT and the UPDATE)] - deferred, pre-existing (not in this diff;
  landed with 11b.4a / 6.25). Fix R2-1 here; each sibling is the same one-line predicate. Owner: the next story that touches either file. Trigger: that story, or R2-1's race observed.

Patch verification (after BigDev's option 1; all three RED-proved, each mutation restored byte-identical from a scratchpad backup): domain `notice-emails.spec.ts` + the 0206 policy regression 25/25 (24 + the R2-1 test); the
wider `tests/integration/field-worker` specs and 13.1d's move-requests policy regression green; jobs live sweep/child, templates, no-decision fence and the identity-read fence 42/42; domain `tsc --noEmit` and ESLint on the
three changed files clean; `git diff --check` clean. Live legs ran on the story's `twt-131g-pg` (:5452) as the test superuser - behaviour, not production privilege. NOT run: a full `ci:local`, a browser pass, a commit, a push.

Dismissed (13, all the Blind Hunter's, each checked against the code or the spec before dropping): "no production-identity test" and "ages-out notice has no durable record" (AD13 / AD6 exception (i) are BigDev's
rulings, disclosed; Rows 26 / 24); "give-up can be starved by transient notes" (`retryLimit` is finite - `CHILD_RETRY_LIMIT`, `singletonKey` per notice - and the give-up fires on the first tick where the lease has
lapsed); the outcome / detail pairing and the `'sweep:held'` sentinel (0187's own CHECK / trigger, statement for statement; `jobId` is a pg-boss uuid); "decorative" `FIELD_WORKER_NOTICE_EMAIL_RECLAIM_DAYS`
(alias of 6.25's constant, used in the sweep's alarm text); coverage gaps for `finalise` / `note` under a second Pariwar (unreachable with a mismatched pair - `begin` throws first, `notice_id` is a global PK) and
an empty provider name (`sanitizeProviderErrorName` returns `unknown`); Q4's "unmodelled grant states" (`role_grants` has no revoked / expiry column; `users.status` is checked); `when` +1 day and no
`0206_snapshot.json` (the repo's convention - snapshots stop at 0020); the unbounded-selector, `begin`-outside-a-transaction and `rows?.[0]` points (clamped keyset, documented contract, the mirrored shape);
the "⛔ reads as the opposite of the code" comment point (⛔ is the repo's own notation for "not"); the (i2) CHECK-order fragility (test (d) pins the constraint names).

Load-bearing-invariant lens, chunk 1 (untouched families 4, 7, 8, 11, 13 omitted): 1 state guards - covered-by-test (policy case (j); `already_final` / `held_by_other` / `skipped` legs); 2 concurrency - covered-by-test
(own-job retry; parked-time credit; the true two-connection race is the jobs live test `:580`) - **but R2-1 is a hole beside it**; 3 tenant / actor - covered-by-test (domain I7 / G18, RLS legs (e)(f)(g)); 5 DB backstops -
covered-by-test except **R2-2 (REAL GAP, patch)**; 6 projection / PII - covered-by-construction (ids and a flag; Q4 a boolean); 9 deliberate bypasses - covered-by-construction (DELIBERATE blocks with RE-EXAMINE triggers);
10 closure honesty - covered; 12 cross-member ownership - covered-by-test. Not run in this pass: any test, the live DB, or a typecheck (read-only layers).

#### Code review 2026-11-12 (Claude Sonnet 5.5), round 2 - CHUNK 2 of 3: `apps/jobs` + `packages/queue` (9 files, +1,491 / -16; HEAD `4862fda6` plus chunk 1's uncommitted domain patches)

Three layers in parallel, strictly read-only; none failed. Result: **0 decision-needed, 4 patch, 4 defer, 11 dismissed.** CR1 / CR2 / CR3's jobs-side fixes were re-checked against AC3 / AC5 / AD13 and all three deliver
(the child's clock function after the lock; the cycle-guarded `faultClass` and the `code:42501` Q2 alarm; the child-level held / decrypt / render legs). The templates were checked word by word: `link` is the only variable and no text holds a
digit, name, district, reason, cause or time (I1 / I5); "Tell the worker." sits on accepted and refused only; every text is narrower than the console's. No Panel question (section 0 gate applied: nothing here changes what the Trust
discloses or owes).

- [x] [Review][Patch] **R3-1 - No live leg for a failing, sandboxed or throwing pre-flight (AC9; AD3 (d))** [apps/jobs/tests/field-worker-notice-emails-live.test.ts].
  The sweep's pre-flight branch (`field-worker-notice-emails.ts:168-177`: `gap = pre.ok ? null : pre.detail`; a throw => `'preflight:failed'`) has no test - `grep -ci preflight` on the new live test is 0; its only holds are `config:provider_unset` and a
  non-https origin. AC9 asks for the tick outcomes "held / config gap / ..." and AD3 (d) for "a failing pre-flight => NO new row, in-flight rows parked"; 6.25's live test legs sandbox, sending_disabled and a thrown pre-flight
  (`claim-suspicion-staff-emails-live.test.ts:432-468`). Deleting L171-176 leaves every new test green, and a failing pre-flight (SES sandbox, sending disabled) is the realistic way Row 24's go-live goes wrong: without the hold the sweep would create
  `attempting` rows and send into a provider that refuses. Fix: legs for `preflight:sandbox`, `preflight:sending_disabled` and a thrown pre-flight - no enqueue, no row, ONE "HELD" alarm naming the gap, an in-flight row parked, and the recovered run sends;
  RED-prove by deleting the branch. *Found by: auditor.*
  **Resolved 2026-11-12:** a new live test legs `preflight:sandbox`, `preflight:sending_disabled` and a THROWING pre-flight against a world holding one crashed in-flight row (past the lease) and one fresh notice: each leg enqueues nothing, writes NO row for the fresh notice (TR5),
  PARKS the in-flight row (`claimed_by_job = 'sweep:held'`), and raises ONE "HELD" alarm naming the gap (`preflight:failed` for the throw); fixed, the next tick re-claims the parked row (attempt 2) and sends both. RED: the pre-flight call deleted from the sweep -> only this test fails; a throwing
  pre-flight no longer holding (`gap = null` in the catch) -> only this test fails.
- [x] [Review][Patch] **R3-2 - The I3 no-write fence's writer-name list has a vacuous entry and omits real writers (AC8; I3; gate scope = semantics)** [apps/jobs/tests/field-worker-notice-email-no-decision.test.ts:29-44].
  The header says "Every writer of a move request, a notice, a field worker or the event log". `projectMoveRequest` is matched as a whole identifier but no such export exists (the real ones are `projectMoveRequestOpened` and `projectMoveRequestTransition`,
  `move-request-project.ts:70,148`), so the entry can never match, and the positive control never plants it. Missing real writers: `projectMoveRequestOpened`, `projectMoveRequestTransition`, `projectFieldWorkerGenesis`, `projectFieldWorkerTransition`,
  `activateFieldWorker`, `recordFieldWorkerKycCompleted`, `afterDirectMove`, `afterEnding`, `enqueueFieldWorkerCodeSms`. The table-write regexes still catch a direct SQL / Drizzle write to a forbidden table, so this is the second layer, not the only one - but a child that
  CALLED one of those helpers would pass. Fix: the real names, a plant per name in the positive control, and a guard that every `FORBIDDEN` name is an export of the domain source (a renamed or invented entry turns red); RED-prove each plant.
  *Found by: auditor + edge + blind (the fence's weakness).*
  **Resolved 2026-11-12:** `FORBIDDEN` now names the real writers (`projectMoveRequestOpened`, `projectMoveRequestTransition`, `projectFieldWorkerGenesis`, `projectFieldWorkerTransition`, `activateFieldWorker`, `recordFieldWorkerKycCompleted`, `afterDirectMove`, `afterEnding`; the invented `projectMoveRequest` is gone);
  the positive control plants EVERY name (derived from the list, so a name added later is planted too); and a new test reads `packages/domain/src/field-worker` and `packages/events/src` and requires every forbidden name to be a real export. `enqueueFieldWorkerCodeSms` (the auditor's list) is NOT added: the SMS outbox is not among I3's tables.
  RED: `projectMoveRequest` put back -> the real-list guard fails (`projectMoveRequest: expected [...] to include 'projectMoveRequest'`); the child given `void fieldWorker.activateFieldWorker;` (a writer the OLD list omitted) -> the child's module test names it.
- [x] [Review][Patch] **R3-3 - Legs dropped from the mirrors: the Nalanda recipient, the production allow-list refusal, and the skipped row of the Q4 leg** [apps/jobs/tests/field-worker-notice-emails-live.test.ts:325-330,569-578,640].
  (a) The first test asserts `msg.to` for every recipient EXCEPT the Nalanda District Admin (`if (n.recipient_user_id !== nalanda)`), the `to`-district recipient of `moved_by_pariwar_admin` - so one kind's recipient is never verified to receive it at their own address, nor
  checked for the address leaking elsewhere. Fix: `world()` returns that officer and `addressOf` holds it. (b) `ANY allowlist under NODE_ENV=production is refused` (`field-worker-notice-emails.ts:141`) is untested; only the EMPTY case is (6.25 tests both,
  `claim-suspicion-staff-emails-live.test.ts:937-961`). (c) The Q4-at-the-child leg asserts the result list and the one send, but not that the suspended recipient's notice has a `skipped` / `skipped:not_eligible` ROW or that a second tick enqueues nothing - the
  domain spec proves the row, and this is the end-to-end check that the selector does not re-enqueue a skipped notice every 15 minutes for 3 days. RED-prove each. *Found by: auditor + blind.*
  **Resolved 2026-11-12:** (a) `world()` returns the Nalanda officer, `addressOf` and the leak check hold it, the `if (... !== nalanda)` skip is gone, and a guard asserts the Nalanda recipient IS among the notices - every kind's `to` is its recipient's own address; (b) a new leg for "ANY allow-list under `NODE_ENV=production` is refused"
  with a pool that fails if touched (restored in `finally`); (c) the Q4 leg now asserts the suspended recipient's notice has a `skipped` / `skipped:not_eligible` row, that a second tick enqueues nothing, and that still only one message went out. RED, one mutation each, each failing only its test: the Nalanda mail sent to a wrong mailbox; the production branch deleted;
  the `skipped` branch returning `skipped` while writing no row.
- [x] [Review][Patch] **R3-4 - Comments that claim more than the code does, and a missing family-9 trigger (checklist families 9 and 10)** [apps/jobs/src/scheduler/field-worker-notice-emails.ts:9,27,29-31; packages/domain/src/field-worker/notice-email.ts:16-18; packages/queue/src/index.ts:584-594].
  (1) The child's DELIBERATE block (G18: RLS is not relied on, every statement carries `pariwar_id`) has no "RE-EXAMINE when" - the domain's cross-tenant selector / park / give-up blocks do (`notice-email.ts:144,198,230`); the family requires one. Fix: "RE-EXAMINE when
  roster Row 26 chooses the jobs login's posture (an RLS-bound login makes RLS a second wall), or any child statement loses its explicit `pariwar_id` predicate" in both headers. (2) The jobs header (:27) says "a `42501` from any step is ONE alarm"; it holds for the sweep's steps, the claiming
  transaction and the Q2 read - a failure of the post-claim `finalise` / transient note reaches the worker wrapper's "FAILED unexpectedly" alarm with no SQLSTATE. State the real scope. (3) The sweep header (:9) labels its restatement of the Q-2 rule "word for word"; it is a paraphrase (the verbatim text is in
  `-463`, ADR-0045 and Row 51 - chunk 3 checks those). (4) The queue JSDoc says the SEND child "throws ONLY on a transient failure" (a `finalise` fault throws a non-transient error that the wrapper alarms) and that a gap "writes nothing" (it parks in-flight rows). Comment-only; no behaviour changes.
  ADR-0045 (~L79-86) carries no trigger on the same block either - carried to chunk 3. *Found by: auditor + blind.*
  **Resolved 2026-11-12 (code comments only; no behaviour changes):** the jobs header and the domain header carry "RE-EXAMINE when roster Row 26 chooses the jobs login's posture ..., or any child / per-notice statement loses its explicit `pariwar_id` predicate"; the jobs header's 42501 sentence now names the sweep's steps, the claiming
  transaction and the Q2 read and says a failed post-claim `finalise` / note reaches the wrapper's alarm, which names the error class only; "word for word" became "restated here; the verbatim text is in `-463`, ADR-0045 and roster Row 51"; the queue JSDoc says a gap "enqueues nothing and writes no new row - it only parks in-flight rows" and that
  the SEND child throws a transient error for a recoverable failure while any other error escapes to the wrapper. ADR-0045's block is left for chunk 3.
- [x] [Review][Defer] **R3-W1 - Post-claim and alarm shapes inherited from 6.25 / 11b.4a** [apps/jobs/src/scheduler/field-worker-notice-emails.ts:313-333,398-410] - deferred, pre-existing (identical in `memorial-takedown-approver-emails.ts` / `claim-suspicion-staff-emails.ts`).
  A `finalise` that throws AFTER the provider accepted escapes as "FAILED unexpectedly (non-transient)" with no SQLSTATE and no "the provider accepted" wording; pg-boss retries the same job, which re-claims its own row and sends again - recorded, not hidden, because the claim UPDATE sets
  `may_have_sent` when the row's `detail` is NULL (verified in `beginFieldWorkerNoticeEmail`), so the retry's finalise alarms "a prior attempt may have sent". The claim-failure and Q2-42501 alarms repeat per attempt per notice per tick (no once-per-distinct-fault suppression, unlike held / decrypt / render);
  `enqueued` counts a `singletonKey` dedup; the SEND queue has no `expireInSeconds`; the give-up alarm always says "a prior attempt may have sent". Changing it here and not in the siblings forks the pattern. Owner: the next story that changes the 6.25 / 11b.4a send children. Trigger: an incident, or Row 24's go-live review of the alarm channel.
- [x] [Review][Defer] **R3-W2 - The Hindi copy is guarded for structure only** [apps/jobs/tests/field-worker-notice-email-templates.test.ts:37,74] - deferred, owned by roster Row 51 (f).
  "Tell the worker." is asserted on the English text only, and the Hindi leg reads the same catalog `t()` renders from, so it can check structure but not content. The catalog is correct today (only accepted and refused carry the sentence). The Hindi is agent-drafted and awaits a human review (Row 51 (f)); that review will change the wording, so pinning
  it now would be rewritten at once. Owner: Row 51 (f)'s closing. Trigger: that review - pin the reviewed Hindi (the "worker" sentence on accepted and refused only; no digit, name, district, reason or time) in the same change.
- [x] [Review][Defer] **R3-W3 - Test-scope limits of this story's new gates** [apps/jobs/tests/field-worker-notice-email-no-decision.test.ts; apps/jobs/src/scheduler/field-worker-notice-emails.ts] - deferred.
  The no-write fence is a denylist over four hard-coded modules (its header concedes the LIMIT): comment stripping is not string-aware, a table held in a variable or an aliased `db.update(alias)` is not seen. `registerFieldWorkerNoticeEmailWorkers` (queue creation, the worker wrapper, the schedule's cron / tz / expiry on BOTH `createQueue` and `schedule`) has no test - 6.25 has one, 11b.4a lacks it too.
  Owner: the story that adds a second consumer of the fence, or the next change to the registration. Trigger: either.
- [x] [Review][Defer] **R3-W4 - AD4's order decrypts before it renders** [apps/jobs/src/scheduler/field-worker-notice-emails.ts:344-368] - deferred, ordered by the spec.
  Q2 read -> decrypt -> address check -> render is AD4's own sequence (and 6.25's). A DETERMINISTIC render fault therefore costs one KMS decrypt (and its audit entry, [[project_kms_audit_per_hmac_global_lock]]) per attempt per tick for every affected notice, and the address sits in memory slightly longer (I4). Rendering first would need no address, but it reorders a spec'd sequence and changes which final outcome
  a notice with no address AND a broken renderer gets. Owner: the story that revisits AD4, or a render-fault incident. Trigger: either.

Patch verification (after BigDev's option 1; each RED-proved with a mutation restored byte-identical from a scratchpad backup): jobs live sweep / child 21/21 (19 + the pre-flight leg + the production-allow-list leg), no-write fence 7/7, templates 15/15, identity-read fence 2/2 and 13.1d's escalation live 4/4 (49/49 together); domain
notice-emails + 0206 regression 25/25; `tsc --noEmit` clean in jobs, domain and queue; ESLint clean on the changed files; the queue package's tests 4/4; `git diff --check` clean; no zero-width or bidi character in any added line. Live legs on `twt-131g-pg` (:5452) as the test superuser - behaviour, not production
privilege. NOT run: a full `ci:local`, a browser pass, a commit, a push.

Dismissed (11, all the Blind Hunter's, each checked): "the sweep loop is unbounded on a page with no due rows" (not reachable - `due` and `scanned` are the same rows, so an empty `due` is `scanned` 0 and ends the loop, and the keyset cursor strictly advances); "nothing but privilege stops production sends" and
"the Hindi ships unreviewed" (AD13 and Rows 26 / 24 / 51 (f) own go-live; merge is not go-live); the "⛔ reads as the opposite" alarm-text point (the repo's own notation); coupling to 6.25's cron / retry constants, three sweeps on one cron, a pre-flight every tick, alarms defaulting to `console.warn` with boot passing no `onAlarm`
(all the sibling shape, AD3 reuses them by design); the templates test reading the admin source (AC7's jobs leg is specified that way); "the identity-read fence constrains only `admin_credentials`" (Q4's `users` / `role_grants` reads sit inside `EXISTS`, which cannot project; the fence's Q4 plants cover join, column, count and reference); `status: 'sent'` for a
rejection and `'skipped'` for `recheck_failed` (the sibling's result vocabulary); fragile cleanup (11b.4a's harness); a trailing-slash origin and a `!` guarded by `configGap`.

Load-bearing-invariant lens, chunk 2 (untouched families 4, 7, 11, 13 omitted): 1 state guards - covered-by-test (every `begin` result kind; idempotent re-run, the race, `past_cutoff`, Q4 `skipped`, a given-up row never reselected); 2 concurrency - covered-by-test (two real connections give one send; own-job retries; the lock-wait midnight leg); 3 tenant / actor -
covered-by-test (jobs I7: A's notice under B's envelope is an alarmed transient, no row, no send); 5 DB backstops - the grants and policies are chunk 1's spec; **unmechanized by ruling (AD13 / TR9)**: no test runs the child's real statements under `twt_app` - checked by reading that every column they touch is inside 0206's INSERT / UPDATE grants; 6 projection / PII -
covered-by-construction and by test (ids and a flag; Q4 a boolean; link-only template; the address never in a payload, alarm or log - happy path only, **R3-3**); 8 audit-after-mutation - not constructible (a system job writing only its own outbox row, I3 forbids `events_log`; the 6.25 / 11b.4a precedent); 9 deliberate bypasses - partial: **R3-4 (1)**;
10 closure honesty - **R3-4 (2)-(4)**; 12 cross-member ownership - covered-by-test. Not run in this pass: any test, the live DB, or a typecheck (read-only layers).

#### Code review 2026-11-12 (Claude Sonnet 5.5), round 2 - CHUNK 3 of 3: admin sign-in return, i18n, ADR-0045 and the records (23 files, +1,237 / -30; HEAD `4862fda6`)

Three layers in parallel, strictly read-only. The Blind Hunter finished in the first run; the Edge Case Hunter and the Acceptance Auditor were cut off by a session limit and RESUMED from their saved context (nothing re-run). Result: **0 decision-needed, 8 patch, 4 defer, 12 dismissed.**
The records were verified BY COMMAND (an empty result is a finding): the Q-2 rule's 645-character AD6 text is verbatim, whitespace-normalised, in `-463`, ADR-0045 and Row 51; exactly one `### Decision ... -463` (dated 2026-11-12) and no other ref or worktree claims `-463`, ADR-0045 or migration 0206; the ADR index recounts to 156 =
110 / 3 / 0 / 42 / 1 (drafted 2 -> 3, Total 155 -> 156) with the new row in Section A; Row 51 has legs (e) and (f), the highest row is still 51 and Row 46 is untouched; ADR-0045 is `drafted` and nothing claims it ratified; en / hi `field_worker.json` have the same 18 keys, `{link}` is the only token and it is in the bodies only, "Tell the worker." is on accepted and refused only
in both languages, and the seven English texts equal AD4's. AC7 / AD10 is fully covered (the literal, the helper, the third branch, all five callers and the route; every other sign-in caller keeps a bare `/login` with a control). The governance commits are in the right order and alone (`ad0244f8`, `cae6a377`, `b71915e7`, then code). No Panel question: `-463` supersedes no ratified text, the AD5 narrowings are author-commit recipient drops, and the
held-backlog exception is an outage bound that touches no disclosure about a person and no debt to a member (section 0 gate applied).

- [x] [Review][Patch] **R4-1 - The ACTIONS component's sign-in return had no test** [apps/admin/tests/field-worker-move-requests.test.tsx]. `MoveRequestActions` passes `fieldWorkerRequestsPath(pariwarId)` to `useSignInRedirect`, but no leg met a 401 on Accept / Refuse; dropping the argument left every test green and the emailed-link officer landing on a bare `/login`.
  **Resolved:** "a 401 on Accept signs the officer back in - to THIS page, not a bare `/login`" (with a control that nothing navigated before the click). RED: the argument dropped -> only this test fails. *Found by: edge + blind (suspicion).*
- [x] [Review][Patch] **R4-2 - The lapsed-session leg could pass before every redirect had fired** [apps/admin/tests/field-worker-move-requests.test.tsx]. It looped over "the navigate calls so far" after waiting for one; a late caller that dropped `next` had not fired yet.
  **Resolved:** it waits until all THREE readers (the page's list, the notices, the DistrictPicker) have signed the officer in (`>= 3` calls), then checks every call. RED, one mutation per caller (NoticeList, the page's list / session redirect, the DistrictPicker's `signInNext`): each turns this leg red (and the leg that owns that caller). *Found by: edge.*
- [x] [Review][Patch] **R4-3 - Row 51's new dated line RE-OPENS leg (a), which the Panel already met (checklist family 10)** [docs/launch-gate-inventory/inventory-roster.md, the 2026-11-12 "two new legs" line]. It ended "Open legs now: (a), (c), (d), (e), (f)", against the `-459` line ("Leg (a) MET") and the `-460` line ("Open legs now: (c), (d)"); `-463` does not re-open (a) and `-461` item 4 adds no leg.
  **Resolved:** "Open legs now: (c), (d), (e), (f) - (a) stays MET (`-459` Q1 A); this line first listed it open, corrected in the 2026-11-12 code review." *Found by: auditor + blind.*
- [x] [Review][Patch] **R4-4 - ADR-0045's bypass block carries no RE-EXAMINE trigger (checklist family 9 - REAL GAP)** [docs/adr/ADR-0045-field-worker-move-notice-email.md, "The DB role" bullet]. It deliberately relies on an explicit `pariwar_id` predicate because RLS does not separate Pariwars on the BYPASSRLS jobs login; the code headers got their trigger in R3-4, the durable record did not (ADR-0040 and ADR-0043 have none either, so precedent does not excuse it).
  **Resolved:** "RE-EXAMINE this bypass when roster Row 26 chooses the jobs login's posture (an RLS-bound login makes RLS a second wall), any child statement loses its explicit `pariwar_id` predicate, or a further notice reader appears (0205's own trigger - this sweep is its second)." `-463` AD3 / AD13 (an author-commit) is NOT edited. *Found by: auditor.*
- [x] [Review][Patch] **R4-5 - ADR-0045 breaks AD1's own rule against ordinals and understates what the provider learns** [docs/adr/ADR-0045-field-worker-move-notice-email.md, "Migration / pivot" and "Security"]. AD1 forbids "an ordinal like 'a fifth'" in the closed-set statement; the Migration bullet wrote "A fifth identity read path, a fourth Q2 caller". The Security bullet said the provider "learns that a move-request event happened", but the subject names the kind.
  **Resolved:** "A further identity read path, a further Q2 caller, or a move to `twt_auth`, is a new ADR"; the provider "learns which KIND of move-request event happened (the subject: opened, accepted, refused, escalated, superseded, or a Pariwar Admin's move) and in which Pariwar (the id is in the link)". *Found by: blind.*
- [x] [Review][Patch] **R4-6 - The catalog and the template header say the English is "BigDev's"; BigDev APPROVED it** [packages/i18n/locales/{en,hi}/field_worker.json `$comment.notice_email`; apps/jobs/src/scheduler/field-worker-notice-email-templates.ts:13]. The story (AD4, Q-1 A) records the English as drafted in the session and approved by BigDev on 2026-11-12 (`opened` / `escalated` as reworded); only the SMS text is "BigDev's words".
  **Resolved:** "The English was approved by BigDev (Q-1 A)" in all three. No test pins the sentence (parity 7/7, templates 15/15). *Found by: blind.*
- [x] [Review][Patch] **R4-7 - The story and the row say `done` before anything has landed; the ledger is unlettered and its row comments stop at 12d (AC10 "a record states only what has run"; family 10)** [story `Status`, its pinned header comment; sprint-status head and the 13-1g row]. Round 1 set `done` with Task 8 not started, Task 6's browser check NOT run and nothing pushed; the project's precedent sets `done` at LANDING (13.1a ledger 2026-11-05a / 11-06d; 13.1d 2026-11-10a stays `review`, 2026-11-10c LANDED -> done; 6.36e 2026-10-24v even stayed `review` after it landed). The pinned comment still read "ready-for-dev (v1.4) ... No code before Task 0.6"; the newest ledger line had no letter.
  **Resolved:** `Status: review` and the row `review`; the pinned comment states the real status; the unlettered line is `2026-11-12f` and this pass is `2026-11-12g` (no other ref or worktree carries a 2026-11-12 letter); the row's comment block gains 12e / 12f / 12g; the YAML parses (313 rows). *Found by: auditor + blind.* **BigDev: this is the one call where the skill's step 6 ("all resolved => done") and the project's precedent differ - I followed the precedent; say the word to set `done`.**
- [x] [Review][Patch] **R4-8 - The owed browser check has no tracker** [_bmad-output/implementation-artifacts/deferred-work.md]. Task 6's browser check (an emailed link, signed out -> sign-in -> the Move requests page, in the Mac's Chrome) is recorded as "NOT run ... say the word" in the story only. **Resolved:** a deferred-work entry with its owner and trigger (below). *Found by: blind.*
- [x] [Review][Defer] **R4-W1 - Two wording imprecisions in `-463`'s Q-2 text and its derivatives** - deferred, an author-commit's own text. (a) The loss window is not "3+ IST days": the cutoff is 00:00 IST of (today - 2), so a notice created at 23:59 stops being emailed about 2 days later and one created at 00:00 about 3 days later - operators (ADR "Operational", Row 51's operators line, `-463` residual (a)) are told "3+". (b) The Policy sentence "an email the system could not send within three days is not sent later" is true of a notice with no row; a row already claimed and then PARKED by a hold is credited the parked time (clause (ii)) and can be sent later. Both are `-463`'s words (BigDev's author-commit), so they are annotated, not rewritten ([[feedback_supersede_never_reinterpret]]). Owner: BigDev, at the next decision-log touch. Trigger: Row 51 (c)'s go-live review / the operator runbook.
- [x] [Review][Defer] **R4-W2 - `-463`'s "Supersedes" paragraph does not name the narrowing of `-461`'s email wording** - deferred. `-461` (author-commit, not ratified) words the superseded and refused emails with `{from}`, `{to}` and `{reason}`; the emails carry none (item 12 / AD12 say "a NARROWER form"). "Supersedes no RATIFIED text" is true; the departure from `-461`'s wording should be stated as a supersession of it. Owner: BigDev, the same annotation as R4-W1.
- [x] [Review][Defer] **R4-W3 - Row 51's legs (e) and (f) have no owner or discharge path in the row's fields** - deferred. The row's owner / support / current_status / cross_story_discharge_path still read "(a)-(d)"; the dated line does not name who ratifies ADR-0045 (e) or who is the non-author Hindi reviewer (f) (Row 49 names an owner per leg). The criteria must not be edited, but the dated line can; I cannot name people. Owner: BigDev. Trigger: before Row 51 (c)'s go-live.
- [x] [Review][Defer] **R4-W4 - The Move requests route treats ANY session-read error (a 5xx, a network failure) as a sign-out** [apps/admin/src/routes/FieldWorkerMoveRequestsRoute.tsx:20-22] - deferred, pre-existing. `if (session.isError) navigate('/login...')` is the shape of `FieldWorkerApprovalsRoute` and `FieldWorkerRegisterRoute` too; a transient failure bounces a signed-in officer to sign-in. The fix (redirect only on a 401, offer Retry otherwise) belongs to all four routes together. Owner: the next story that touches the field-worker routes.

Dismissed (12, all the Blind Hunter's, each checked): "the go-live gates have no mechanism" and "production alarm noise, no switch" (`-463` AD13: Rows 24 / 26 / 51 own go-live, merge is not go-live, and the noise is the disclosed expected state until Row 26); "loss paths without an alarm" (the loss is `-463`'s stated residual and the console keeps every notice; a sweep-stopped watchdog is a deployment matter);
"`supersedes no ratified text` understates the narrowing" (`-443` Q1 A is honoured - the exception is an outage bound - and a `super_admin` opener is not a District Admin; the Auditor's Panel gate agrees); "the admin design smells" (the hard-coded path is the component's stated scope, the module -> routes import is disclosed deviation (d), and the "SECOND" in a test title is the fraud list, which IS the second return route - the new one is the "THIRD" two describes down);
"the notice's NULL district" (`from_district` / `to_district` are NOT NULL); the retry-loop-on-a-missing-notice, the unreconciled test counts, the cutoff constant owned by 6.25, the perishable "12 of 133 tables" figure, the decision's thin evidence and the self-congratulatory review record (disclosed, dated or the sibling shape).

Load-bearing-invariant lens, chunk 3 (untouched families omitted): 3 tenant / actor - covered-by-test (the allow-list is anchored and lower-case-hex only; the hostile loop includes an upper-case id, a suffix and a trailing segment); 6 projection / PII - covered-by-test (key parity, link-only `{link}`, no digit or invisible character in either locale); 9 deliberate bypasses - **REAL GAP closed by R4-4**; 10 closure honesty - **REAL GAP closed by R4-3 / R4-7** (supporting R4-W3); 13 accessibility - covered-by-construction (the admin diff changes which path an existing redirect is given; no element, role, handler or announced state is added).

Patch verification (after BigDev's option 1; the admin legs RED-proved with one mutation per caller, restored byte-identical): admin `field-worker-move-requests` 61/61 and `login-return-path` 17/17 (78); i18n 130/130 (parity 7/7); jobs templates 15/15 and the no-write fence 7/7; `tsc --noEmit` clean in admin; ESLint clean on the changed admin test and the templates source; `sprint-status.yaml` parses (313 rows, 13-1g `review`); `git diff --check` clean; no zero-width or bidi character in any added line; the ADR index is unchanged (156). NOT run: a full `ci:local`, the browser pass, a commit, a push.

#### Code review 2026-11-12 (Claude Sonnet 5.5), round 3 - the round-2 PATCHES alone (13 code / docs / test files, +207 / -38, uncommitted at `4862fda6`; the records edits to the Auditor only)

BigDev chose "re-run code review" (the 13.1d form: rounds 4 and 5 reviewed the previous round's patches). Three layers in parallel, read-only; none failed. Result: **0 decision-needed, 7 patch, 0 defer, 21 dismissed.** The Acceptance Auditor found all 15 round-2 patches delivered as their "Resolved"
paragraphs say, no regression of any AC / invariant / AD, and the records honest about commit, push, landing and the unrun browser check; it agrees with `review` over `done`. No code defect was found - the seven patches are two missing test legs, a pin that did not look at DELETE / TRUNCATE, and record / comment precision.

- [x] [Review][Patch] **R5-1 - Nothing covers the Q4-fail UPDATE's `claimed_by_job = $4` disjunct (a same-job retry inside the lease)** [packages/domain/tests/integration/field-worker/notice-emails.spec.ts]. The existing RE-claim test uses `job-2` after the lease, which only exercises `claimed_at < $7`; the R2-1 test exercises the live-holder refusal. Dropping the `$4` disjunct would turn a pg-boss retry of the SAME job (its recipient lapsed in between) into a silent `held_by_other` with no "may have sent" alarm, and CI stays green.
  Fix: `begin` as `job-1`, suspend the recipient, `begin` as `job-1` again inside the lease => `expired` / `exhausted:recheck_not_eligible`, `may_have_sent`; RED-prove by dropping the disjunct. (The `$6` parked-marker disjunct is subsumed by `$7` for any reachable parked row - a park requires an expired lease - so it has no isolating leg; it mirrors the claim UPDATE.) *Found by: edge.*
  **Resolved 2026-11-12:** a new domain leg: `job-1` claims, the recipient is suspended, then - inside the lease - `job-2` is `held_by_other` and writes nothing (the control), while `job-1`'s own retry is `expired` / `exhausted:recheck_not_eligible` with `may_have_sent`. RED: the `claimed_by_job = $4` disjunct dropped from the Q4-fail UPDATE -> only this leg fails.
- [x] [Review][Patch] **R5-2 - The `twt_service` pin does not look at DELETE or TRUNCATE (checklist family 5)** [packages/domain/tests/integration/rls/field-worker-notice-emails-policy-regression.spec.ts:~174]. AD13 says no production grant at all; R2-2 made SELECT / INSERT / UPDATE see column-level grants, but a table-level `GRANT DELETE` / `TRUNCATE` to the jobs role passes. Fix: `DELETE` and `TRUNCATE` through the existing `priv` (table-level only exists for them) and `REFERENCES` through `anyPriv`; RED-prove with a real `GRANT DELETE` (revoked afterwards). *Found by: edge.*
  **Resolved 2026-11-12:** the pin now also asserts `REFERENCES` through `anyPriv`, and `DELETE` / `TRUNCATE` through the table-level `priv`. RED: a real `GRANT DELETE`, then a real `GRANT TRUNCATE`, to `twt_service` -> the pin fails naming the privilege (`twt_service DELETE: expected true to be false`); both grants REVOKED afterwards (checked).
- [x] [Review][Patch] **R5-3 - `rowMovedOn`'s `already_final` branch, reached from the Q4-fail UPDATE, has no leg** [packages/domain/tests/integration/field-worker/notice-emails.spec.ts]. The R2-1 test covers the holder REFRESHING (`held_by_other`); the other half - the holder FINALISING between the read and the UPDATE - used to be the only result of this branch and now has no regression leg. Fix: the same hook runs the holder's real `finaliseFieldWorkerNoticeEmail` (`accepted`) => `already_final`, the row `accepted` and untouched; RED-prove by making `rowMovedOn` always return `held_by_other`. *Found by: blind (the branch) + auditor (family 1).*
  **Resolved 2026-11-12:** the hook is now one helper (`hookAtQ4`, run once before Q4) used by R2-1 and by a new leg in which the holder's REAL `finaliseFieldWorkerNoticeEmail` (`accepted`) lands between the read and the UPDATE: `already_final`, the row `accepted` and untouched. RED: `rowMovedOn` always answering `held_by_other` -> only this leg fails.
- [x] [Review][Patch] **R5-4 - R2-1 changed the Q4-fail result but not the prose that states it, and its SQL comment names the wrong mechanism** [packages/domain/src/field-worker/notice-email.ts:8-10 and the R2-1 comment; story AC4]. The domain header and AC4 say a re-check failing on a RE-claim is `error` / `expired`; since R2-1 a row still held by a live holder returns `held_by_other` (inside AC4's result list, mapped to `skipped` by the child, nothing stranded - the selector's `attempting` branch finishes it after the lease). The R2-1 comment says `finalise` and the note "can refresh `claimed_at`"; only the transient note does (a `finalise` is already refused by `outcome = 'attempting'`).
  Fix: the header sentence, a bracketed amendment on AC4, and the comment's wording. Comment / record only. *Found by: auditor + blind.*
  **Resolved 2026-11-12 (comment / record only):** the domain header says a live holder at that moment is `held_by_other` and leaves the row alone; AC4 carries a bracketed `[AMENDED by review R2-1: ...]` naming which cases stay `expired`; the R2-1 SQL comment says the TRANSIENT NOTE takes no advisory lock and that a `finalise` is already refused by `outcome = 'attempting'`.
- [x] [Review][Patch] **R5-5 - R2-W2 names one copy of a shape that has two (and an origin)** [story R2-W2; deferred-work.md chunk 1 section]. 6.25's own re-check UPDATE has the same unguarded predicate (`packages/domain/src/claim/suspicion-staff-email.ts`, `WHERE notice_id = $1 AND outcome = 'attempting'`, with its comment that the give-up can finish the row between the SELECT and the UPDATE); 11b.4a mirrors it. Fix: both entries name both files, with the one owner. *Found by: auditor.*
  **Resolved 2026-11-12:** R2-W2 (the story line and `deferred-work.md`) now names both `memorial/takedown-approver-email.ts` and 6.25's `claim/suspicion-staff-email.ts`, with one owner: the next story that touches either.
- [x] [Review][Patch] **R5-6 - Two record slips in R4-7's own territory** [story pinned comment, R4-7, ledger 2026-11-12g; the round-1 block's "Review status is `done`"]. (a) R4-7 and its echoes cite "13.1a, 6.36e, 13.1d" for "`done` is set at landing", but 6.36e's ledger (2026-10-24v) records it LANDED and the row STAYING `review` (a go-live gate open) - the precedent is 13.1a (2026-11-05a / 11-06d) and 13.1d (2026-11-10a stays `review`, 2026-11-10c LANDED -> done). (b) The round-1 verification paragraph still says "Review status is `done`", unannotated.
  Fix: cite 13.1a and 13.1d (and note 6.36e as the landed-yet-`review` case); a bracketed correction on the round-1 sentence. *Found by: auditor.*
  **Resolved 2026-11-12:** the pinned comment, R4-7 and the ledger cite 13.1a (2026-11-05a / 11-06d) and 13.1d (2026-11-10a stays `review`, 2026-11-10c LANDED -> done), and say 6.36e even stayed `review` after it landed; the round-1 sentence carries `[corrected 2026-11-12: `review` - R4-7]`.
- [x] [Review][Patch] **R5-7 - Comment and count precision left by R3-4 and the v1.9 record** [packages/domain/src/field-worker/notice-email.ts:10; apps/jobs/src/scheduler/field-worker-notice-emails.ts header; story Change Log v1.9]. The domain header still says "(AD6, word for word in `-463`)" before a paraphrase (R3-4 fixed only the jobs header); the jobs header says a 42501 from the claim or Q2 read "is ONE alarm" while R3-W1 records that the child's alarms repeat per attempt; v1.9 says "across the branch" for round 2's 15 patches (the branch total with round 1's three is 18) and `deferred-work.md` holds 11 entries for 10 defers (R4-8 is the tracker for the owed browser check). Fix: the three wordings. *Found by: auditor.*
  **Resolved 2026-11-12 (comment / record only):** the domain header says the verbatim Q-2 text is in `-463`, ADR-0045 and Row 51; the jobs header says the 42501 alarm "ends the tick" for the sweep and "repeats each attempt" for the child (R3-W1); v1.9 says 15 patches in round 2 (18 on the branch with round 1's CR1-CR3), 10 defers and that `deferred-work.md` also holds R4-8.

Dismissed (21, all the Blind Hunter's, each checked): "the interleave hook may match an earlier statement and pass without the fix" (`fn_u` is Q4's alias and appears only in that statement; the leg was RED-proved - dropping the predicate fails exactly it); "the test endorses emailing an ineligible recipient" (Q4 is checked at claim time by design, AD5); "a duplicate-send path" (the `claimed_by_job = $4` disjunct pre-existed in the re-claim UPDATE; a failed `finalise` retrying is R3-W1);
"the ADR lists six of seven kinds" (the two refusal subjects are both "refused"); "a ratified ADR edited in place" (ADR-0045 is `drafted`, Row 51 (e) is open); "`>= 3` is a bare count" (each caller's drop was RED-proved); the fence's limits and the name-plant forms (R3-W3; identifiers are word-boundary matched, so `activateFieldWorker` is not `reactivateFieldWorker`); the production-refusal test's title and its DB skip (the sibling's pattern); the pre-flight leg's counters (the sweep counts its own `boss.send`, and the row assertions are DB-side);
role-versus-login for the privilege pin (the test DB has only the group role); provenance of "approved by BigDev" (story AD4 / Q-1); the 42501 comment against the ADR (the ADR sentence is about the tick); the RE-EXAMINE copies differing (each document names its own scope); the roster line corrected in place (annotated inline, the criteria untouched); `rowMovedOn` on a missing row (no DELETE grant and a finished-row trigger); the Accept-only leg (one shared `useSignInRedirect` call); the R2-3 asymmetry; round tags in names; the Q-2 verbatim pointer (verified verbatim in all three records);
missing imports (the suites ran green).

Load-bearing-invariant lens, round 3 (families the patches touch): 1 state guards - covered-by-test, **R5-3** closes the `already_final` half; 2 concurrency - covered-by-test, simulated (one connection, a hook; the real two-connection race is the jobs test), **R5-1** adds the own-retry disjunct; 3 tenant - covered-by-construction and test (an explicit `pariwar_id` on every new statement); 5 DB backstops - **R5-2**; 6 projection / PII - covered-by-test; 9 deliberate bypasses - covered (the triggers are in the jobs, domain and ADR blocks); 10 closure honesty - **R5-6 / R5-7**; 13 - not touched.

## Dev Notes

### Current state (what exists, what this story changes, what it must preserve)

- **Exists:** 13.1d's notices (G1) and their in-app list; the staff-email client, config and two senders (G6-G8, G20); the fence (G9); the sign-in
  allowlist with two routes and the field-worker sign-in hook (G13).
- **Changes:** adds a table, a domain module pair, a sweep + child, a template + 15 copy keys, three fence entries + a no-write fence, one sign-in
  return route; edits `schema/field_worker_notices.ts` (UNIQUE + index), 13.1d's regression spec (two lists), two test cleanups, `sign-in.ts` and
  the five Move requests components that call it (`next` only).
- **Preserves:** 13.1d's writers, recipients, notices API and screen beyond the sign-in `next` (AD11); 6.25's and 11b.4a's senders, their tables
  and queue names (only their constants are imported); the Q2 SQL text (pinned twice, G10); the two existing UUID literals in `login-next.ts`;
  every other page's `{ to: '/login' }`; the shared staff-email client and its single boot alarm; `CONTEXT_ALLOWLIST`.

### Traps (TR)

- **TR1 - Copy the MIRROR, not the original.** 11b.4a re-exports 6.25's constants and already absorbed five review rounds (park -> credit,
  `aging_since`, the give-up judged before re-claim, the `attempting` branch). Re-deriving any of it re-opens what 6.25's rounds 3-5 closed
  ([[project_staff_email_substrate]]).
- **TR2 - The recipient is the row's; never resolve recipients again.** Calling `districtAdminsOf` / `pariwarAdminsOf` here would email officers
  appointed AFTER the act (and duplicate B2's dedup). Q4 only removes.
- **TR3 - Never lock the notice row.** The email path never reads `seen_at` (Q-2 B); `FOR UPDATE` on the notice would block the officer's
  mark-seen POST (`markFieldWorkerNoticesSeen`). The child's lock is the advisory lock (AC4); the FK insert's `FOR KEY SHARE` does not block it
  (`seen_at` is not a key column).
- **TR4 - The FK does NOT protect the cleanups.** G17's two cleanups run in replica mode - the FK is off - so deleting notices leaves orphan email
  rows that a later cross-Pariwar sweep can find. Delete the emails for the same Pariwars first, explicitly ([[project_fk_truncate_cascade_deadlock]]).
- **TR5 - A `held` sweep writes NO row.** A due notice simply stays due; past the cutoff it ages out unsent - the Q-2 rule's exception (i), AD6. That is the intended loss - the
  console still has it; it is also what keeps the first production run from emailing every notice ever written. Say so in the ADR and `-463`;
  ⛔ a backfill.
- **TR6 - The text must never be transcribed into the test.** Render through the real `t()` and compare to AD4's English table; the Hindi is
  checked structurally (order, link, footer present), not word for word.
- **TR7 - The jobs login.** Every live test passes on the superuser test DB; production would answer 42501 (G3, G23). ⛔ "fix" it with a grant
  here - AD13 says why, and lists what Rows 26 / 24 must grant.
- **TR8 - Prettier is not enforced; a JSDoc that contains `**/` closes the comment** ([[project_markdown_emphasis_closes_jsdoc]]).
- **TR9 - The superuser hides grant gaps and tenant leaks.** The live tests connect as the superuser: a missing column in the INSERT grant, or a
  child statement without its `pariwar_id` predicate, still passes. The grant is pinned by `has_column_privilege` (AC2); the predicate is read
  in review and pinned by a two-Pariwar leg (a notice id of Pariwar A claimed with Pariwar B's id finds nothing).

### Carried to sibling stories (C) - WRITTEN to `deferred-work.md` ("Deferred from: story 13-1g-... (create-story, 2026-11-11)"). Build NONE.

- **C1 - a digest of move-notice emails** (AD8). Trigger: an officer reports too many emails.
- **C2 - the in-app recipient helpers are looser than Q4** (G5): an officer without credentials or a stale-scoped Pariwar Admin still gets an
  in-app row (unreadable without a login - harmless today). Observed, not planned ([[feedback_gap_analysis_observational]]). Trigger: a notice
  reader that does not require a login.

### Testing standards

- Vitest; live DB legs on the story's OWN fresh Postgres container (never :5432); fake staff-email client for every send; RED proof for each
  guard and plant; type-level legs with `@ts-expect-error`. Known flakes: [[project_known_livedb_test_failures]];
  oversubscription: [[project_ci_local_concurrency_oversubscription]].
- An assertion after a rollback to a savepoint proves nothing ([[feedback_assertion_after_savepoint_rollback_is_vacuous]]).

### Project Structure Notes

- Domain beside 13.1d's in `packages/domain/src/field-worker/`; the identity read in its OWN module (the fence scans by file).
- Jobs beside 6.25 / 11b.4a in `apps/jobs/src/scheduler/`; copy beside `sms.code` in `field_worker.json`.
- No `packages/contracts`, `apps/api` or RBAC change. The only `apps/admin` change is the sign-in return (AD10).

### References

- `_bmad-output/planning-artifacts/epics.md` - Story 13.1g (stub and `-461` / `-462` amendment note); Story 13.1d annotations.
- `.decision-log.md` - `-443`, `-458`, `-459`, `-460`, `-461`, `-462`, `-262` FQ3 A, `-299`, `-358`, `-412`, `-452` (a roster row amended by decision).
- `docs/adr/ADR-0040-staff-email-transport.md`, `docs/adr/ADR-0043-memorial-takedown-approver-email.md`, `docs/adr/ADR-0009-admin-authentication.md`
  section 5, `docs/adr/_adr-template.md`; `docs/knowledge-transfer/adr-index.md`; `docs/knowledge-transfer/README.md` section 7.
- `docs/launch-gate-inventory/inventory-roster.md` - Rows 24, 25, 26, 41 (l), 51.
- `docs/degradation-policy/comms-templates/email-channel.md`; `_bmad-output/planning-artifacts/trustee-panel-routing-note-TEMPLATE.md`.
- `_bmad-output/implementation-artifacts/13-1d-field-worker-move-requests-and-notices.md` - AD1, AD9, G11, C1, Review Findings CR22 / CR41 / RP-20..22 / R4-D1 / RP-D1.
- `_bmad-output/implementation-artifacts/deferred-work.md` - 13.1d C1 (L26), RP-D1 (L14458).
- Code: G1-G23 above.

## Dev Agent Record

### Agent Model Used

Claude Opus 5.5 (`claude-opus-5-5`), `bmad-dev-story 13.1g on worktree`, 2026-11-12.

### Debug Log References

- Story container `twt-131g-pg` (postgres:16, :5452, DB `twt_dev`), created fresh for Tasks 1-4, RECREATED fresh before `ci:local`. Every live leg
  ran with `DATABASE_URL=postgresql://twt_dev_app:devpass@127.0.0.1:5452/twt_dev?sslmode=disable` prefixed (the env does not persist between
  shell calls - one run without it hit a different DB and failed for no reason of this story's; re-run with it, green).
- 0206 applied by `pnpm db:migrate` (journal idx 206, `when` 1797391800049) and re-applied by `psql -f` with ⛔ error (idempotent).
- RED proofs (mutate, see it fail, restore byte-identical): 0206 spec - 5 DB mutations (the `notice_id` INSERT grant, the trigger, the
  skipped CHECK, a `twt_service` grant, the UPDATE policy); 13.1d's spec RED before its lists were updated; domain spec - 10 source mutations
  (a `seen_at` filter, no attempting branch, `>` for `>=` at the cutoff, Q4 without the login / the PA scope / with a global branch / any
  district, no parked-time credit, the give-up taking parked rows, the notice read without `pariwar_id`); the fence - each of the three new
  allowlist entries removed; the no-write fence - one plant per form per module; admin - the allowlist branch, the route's `next`, the
  DistrictPicker's `next`. The jobs template test's AC7 sign-in leg was RED until Task 6, then green.
- Fixture slips found and fixed in the TESTS (⛔ the code): the jobs live world had one Gaya District Admin (an open writes ONE notice); a
  backdate of `opened_at` as `twt_app` aborted the transaction (now as the owner, replica mode); the no-write fence's name match was a substring
  (`registerFieldWorkerNoticeEmailWorkers` contains `registerFieldWorker`) - now a whole identifier.

### Completion Notes List

- 2026-11-11 - created by `bmad-create-story 13.1g` (Opus 5.5): ultimate context engine analysis completed - comprehensive developer guide created.
  Q-1..Q-5 open.
- 2026-11-12 - validated (`bmad-create-story validate 13.1g`, four fresh read-only checkers; BigDev: Q-2 B, *"as recommended, all"*): v1.1.
- 2026-11-12 - BigDev answered Q-1, Q-3, Q-4, Q-5: A each; Task 0.2 done: v1.2.
- 2026-11-12 - BigDev: qualify "every notice" - the Q-2 rule stated once (AD6) with its held-backlog exception, carried word for word: v1.3.
- 2026-11-12 - BigDev: the grants contradicted the jobs login - AD13 (the privilege table, no production grant and why, the role guard, go-live on Rows 26 / 24): v1.4.
- 2026-11-12 - dev-story (Opus 5.5), PAUSED at the usage limit after Task 4. Done: Task 0 (commits `ad0244f8` -463, `cae6a377` ADR-0045, `b71915e7` roster, `22dc5123` records); Tasks 1-4 built and green on a fresh container `twt-131g-pg` (:5452): 0206 spec 11/11 (5 mutations RED-proved), 13.1d spec 27/27, domain notice-emails spec 13/13 (10 mutations RED-proved), templates test 14/15 (the ONE red is AC7's sign-in leg - waits for Task 6), jobs live test 13/13. ⛔ COMMITTED: ADR-0043's rule puts the fence entries (Task 5) in the SAME commit as Q4 and the child. Left: Task 5 (fence + no-write fence), Task 6 (sign-in return), Task 7 (records, ci:local), Task 8 (landing).
- 2026-11-12 - dev-story resumed (Opus 5.5): Task 5 (`c59f88d1`, with Tasks 1-4 - ADR-0043's rule: the fence entries ride the same commit as Q4
  and the child) and Task 6 (`6c5cc2ac`). What was built: AD2's table; Q4 in its own module (aliases `fn_*`); the domain mirror of 11b.4a with
  an explicit `pariwar_id` on every child statement; seven templates (link only); the sweep (step 0 the role guard, a `42501` one alarm) and
  child; the fence widened by THREE entries (Q4's rules factored with Q3's into one checker - Q3's plants still caught), `CONTEXT_ALLOWLIST`
  untouched (AD12's variance); a no-write fence over the four modules; the sign-in return route. Results: domain 0206 spec 11/11, notice-emails
  spec 13/13, 13.1d's spec 27/27; jobs templates 15/15, live 13/13, fences 16/16; admin 2168/2168; typecheck and lint clean on the changed
  packages; i18n parity passed.
  ⚠ Deviations, stated: (a) `begin` THROWS on a notice missing under the given Pariwar (11b.4a's form) - the child turns it into an alarmed
  transient, nothing written; AC4's result list is otherwise as written. (b) `parked_at` is cleared when a re-claim's re-check expires the row
  (0187's mirror leaves it; harmless - the row is final). (c) The race leg (two claims at once) is in the jobs live test, ⛔ the domain spec
  (it needs committed rows on two connections). (d) The page's components import `fieldWorkerRequestsPath` from `routes/login-next.ts` (one
  path literal, the jobs test reads it there) - the first module -> routes import in the admin.
  ⚠ NOT RUN: Task 6's browser check of an emailed link signed-out -> sign-in -> the Move requests page in the dev Mac's Chrome. The unit legs
  drive the real `LoginPage`, the real `/login` validateSearch and TanStack's real search round trip; a browser pass was still owed (say the word) [RAN later on 2026-11-12 - the "Browser pass" note below].
  Every live leg ran as the superuser: behaviour, ⛔ production privilege (AD13) - production sends only after Rows 26 and 24 (b).
- 2026-11-12 - Task 7: `ci:local` on a FRESH `twt-131g-pg` (DATABASE_URL :5452): 36/37 - every job green incl. `integration-tests`, EXCEPT
  `test (unit)`: 9 tests in 4 admin files this story never touched (`workplaces-page`, `helpline-claim-page`, `questionnaire-versions-page`,
  `ground-inspection-discrepancy`) timing out at 5 s under the gate's load ([[project_ci_local_concurrency_oversubscription]]); the 4 alone
  135/135; the unit job re-run as the script runs it (`env -u DATABASE_URL pnpm turbo run test --concurrency=4`) 37/37 (admin re-ran, 105/105
  files; 33 tasks replayed from the first run's green results). ⛔ pushed. Task 8 (landing) not started. Status -> review.

- 2026-11-12 - **Browser pass (Task 6's check), BigDev: "do the browser pass", then "I have started the browser"**, after review round 3, at `4862fda6` plus the uncommitted patches, in the Mac's Chrome (`list_connected_browsers`: "Browser 1", macOS, `isLocal`, in use; a second, Windows browser was listed and NOT used). A throwaway stack: a fresh `postgres:16` container (:5462, migrated from scratch, REMOVED afterwards), an UNCOMMITTED env-guarded launcher spec (DELETED afterwards) that registered and approved two workers through the real routes and had Ravi (Patna) open two Patna -> Gaya requests, the API on 127.0.0.1:3000, the admin Vite on :3001. Sita, a Gaya District Admin, was a real account (password + recovery codes through the real enrollment routes): the pass signed in through the REAL `/login` page - password, then a recovery code - not a cookie helper. The "emailed" link is the one the REAL template builds for this Pariwar (`fieldWorkerNoticeEmailLink` + `renderFieldWorkerNoticeEmail('move_request_opened')`, the dev origin): the email itself was NOT sent (no provider), only its link was used.
  RAN, all four legs as expected, no defect: **(A)** signed out, the link opened -> `/login?next=%2Fp%2F<Pariwar>%2Ffield-workers%2Frequests`. **(B)** the password step kept `next`; the recovery code landed on the Move requests page (Notices: two "New: You are asked to take on or release a worker: Patna to Gaya."), not on `/audit/integrity`; the District picker read "All districts" with "Choose a district you manage" (the expected, not-a-defect line). **(D)** a mid-page lapse: Gaya chosen (two waiting requests), Sita's three server sessions DELETED in the database, Accept pressed -> `POST .../accept` answered 401 and the page went to `/login?next=<the page>` (the ACTIONS component carries it - R4-1 in a real browser); signing in again returned to the page, and both requests were still `pending` (checked in the database before and after: the 401 changed nothing). **(C)** a hostile `next` - `https://evil.example/` followed by the allow-listed path - was ignored: after sign-in the browser was on `http://localhost:3001/audit/integrity`, the origin unchanged.
  NOT covered: the passkey second factor (the same `completeLogin`, not driven); the DistrictPicker's and the notices' 401 in a real browser (unit-covered and mutation-proven; the Accept 401 and the route's session error were driven); a delivered email; the production origin. Observed, not a defect: this Chrome AUTOFILLS a saved credential into the localhost login form on every visit - it was never used or submitted; each submit was preceded by replacing both fields with the throwaway values (the password length checked). The API log has no 5xx or error line. A 30-frame GIF of the flow was recorded and NOT exported (a download needs BigDev's word). Torn down: both servers stopped, the container removed, the launcher and the render script deleted; `git status` shows only the patch files.

- 2026-11-12 - **Full `ci:local`, BigDev: "complete ci:local"**, on the working tree at `4862fda6` plus the round 2 / 3 patches and the records (16 files, uncommitted - nothing committed or pushed), against a FRESH dedicated container (`twt-131g-ci-pg`, :5462, `postgres:16`, database NAMED `twt_dev`, migrated from scratch, 0 `events_log` rows; REMOVED afterwards; the story container `twt-131g-pg` :5452 untouched). Checked first: the machine idle (load 1.6, no peer session, no dangling symlink, `Etc/UTC`). **`ci:local` PASSED - 39 jobs green** (the 38 headed jobs and the AI-10-5 coverage guard), exit 0, 20 min 35 s (15:21:45-15:42:20), no failed marker, turbo 20/20 on lint / typecheck / build and 37/37 on the unit phase. Unit phase (`DATABASE_URL` unset, so DB specs skip): admin 2169/2169, mobile 2279/2279, contracts 1720/1720, domain 4083 passed (4223 skipped), api 1170 (2031 skipped), jobs 1430 (775 skipped). `integration-tests` (every DB spec, live): domain 525 files / 8305 passed (1 skipped), api 238 files / 3200 passed (1 skipped), jobs 95 files / 2205 passed, validity-service 284, channels 468, public 826, events 47, niyamavali-engine 144, queue 4 - all green on the first attempt, no re-run. This SUPERSEDES the dev run's 36/37 (Task 7: nine timeouts in four untouched admin files under load). It is the LOCAL mirror: the GitHub CI has not run, and nothing is landed (Task 8).

### File List

Governance (Task 0): `.decision-log.md` (`-463`), `docs/adr/ADR-0045-field-worker-move-notice-email.md` (new),
`docs/knowledge-transfer/adr-index.md`, `docs/launch-gate-inventory/inventory-roster.md`, `_bmad-output/planning-artifacts/epics.md`,
`_bmad-output/implementation-artifacts/sprint-status.yaml`, `_bmad-output/implementation-artifacts/deferred-work.md`, this story file.

Code and tests (Tasks 1-6):
- `packages/domain/migrations/0206_field-worker-notice-emails.sql` (new), `packages/domain/migrations/meta/_journal.json`
- `packages/domain/src/schema/field_worker_notice_emails.ts` (new), `packages/domain/src/schema/field_worker_notices.ts`, `packages/domain/src/schema/index.ts`
- `packages/domain/src/policies/field-worker-notice-emails-rls.ts` (new), `packages/domain/src/policies/index.ts`
- `packages/domain/src/field-worker/notice-email-eligibility-read.ts` (new), `packages/domain/src/field-worker/notice-email.ts` (new), `packages/domain/src/field-worker/index.ts`
- `packages/domain/tests/integration/rls/field-worker-notice-emails-policy-regression.spec.ts` (new), `packages/domain/tests/integration/rls/field-worker-move-requests-policy-regression.spec.ts`
- `packages/domain/tests/integration/field-worker/notice-emails.spec.ts` (new)
- `packages/i18n/locales/en/field_worker.json`, `packages/i18n/locales/hi/field_worker.json`
- `packages/queue/src/index.ts`
- `apps/jobs/src/scheduler/field-worker-notice-email-templates.ts` (new), `apps/jobs/src/scheduler/field-worker-notice-emails.ts` (new), `apps/jobs/src/boot.ts`
- `apps/jobs/tests/field-worker-notice-email-templates.test.ts` (new), `apps/jobs/tests/field-worker-notice-emails-live.test.ts` (new),
  `apps/jobs/tests/field-worker-notice-email-no-decision.test.ts` (new), `apps/jobs/tests/staff-email-identity-read-fence.test.ts`,
  `apps/jobs/tests/field-worker-move-request-escalation-live.test.ts`
- `apps/api/tests/integration/field-worker/_registration-harness.ts`
- `apps/admin/src/routes/login-next.ts`, `apps/admin/src/routes/FieldWorkerMoveRequestsRoute.tsx`, `apps/admin/src/routes/LoginPage.tsx`, `apps/admin/src/router.tsx`
- `apps/admin/src/modules/field-workers/sign-in.ts`, `DistrictPicker.tsx`, `MoveRequestsPage.tsx`, `NoticeList.tsx`, `MoveRequestDetail.tsx`, `MoveRequestActions.tsx`
- `apps/admin/tests/login-return-path.test.tsx`, `apps/admin/tests/field-worker-move-requests.test.tsx`

## Change Log

| Date | Version | Change |
|---|---|---|
| 2026-11-11 | 1.0 | Created (`bmad-create-story 13.1g`) on its own worktree at `cae6ac65`; ready-for-dev; Q-1..Q-5 open; no code before Task 0.4. |
| 2026-11-12 | 1.1 | Validated: Q-2 ANSWERED B (every notice emailed; `opened` / `escalated` reworded; the 3-IST-day floor a backlog guard, its loss a residual) - section 0 rows 5-6; the selector's `attempting` branch and `pariwarAllowlist`; the claim's lock / order / `already_final`; the child on the jobs login with explicit `pariwar_id` (G18); the INSERT grant with `notice_id`; 13.1d's regression lists, the replica-mode cleanups, test backdating; Q4 in full and its narrowings (`super_admin`); the sign-in hook's five callers; the copy's flat keys and layout; a no-write fence; decision before ADR, `2026-11-<DD>-463`, Row 51's six legs by decision, AD12's map, a landing task; the `-460` row re-scoped; no code before Task 0.6. Q-1, Q-3, Q-4, Q-5 open. |
| 2026-11-12 | 1.2 | Q-1, Q-3, Q-4, Q-5 ANSWERED A by BigDev (Q-2 B at v1.1); Task 0.2 done; ASKs, section 0, AD4 / AD7 / AD9 and STATUS updated; no AC or Task changes (each A is the AD as written). Next: Task 0.0 (records commit, on BigDev's word), then 0.1. |
| 2026-11-12 | 1.3 | At BigDev's word, "every notice" QUALIFIED: AD6 is now THE Q-2 RULE - every eligible notice is emailed, seen or not, moved on or not, EXCEPT notices that expire under the held-backlog cutoff ((i) no email row by the cutoff - never emailed; (ii) a send still `attempting` 3 IST days on - given up). The rule and its exception carried word for word into the one-paragraph summary, Policy meaning, the sources table, section 0 rows 5-6, AD1, AD4, Q-2, AC1, AC3 (both exceptions legged), Tasks 0.3-0.5 and TR5. |
| 2026-11-12 | 1.4 | At BigDev's word, the DATABASE-PERMISSION contradiction fixed: G3 / AD2 / AD3 (c) said the jobs child does what only `twt_app` is granted. NEW AD13 (the steps' privilege table; ⛔ a production grant here - Q2 / Q4 are identity reads inside Row 24, Row 26 owns the posture; the `twt_app` grants serve the regression spec and Row 26's RLS-bound posture; the code right under both postures; `canReadAcrossPariwars` as step 0 and the `42501` alarm; go-live on Rows 26 and 24 (b), dated lines there) and G23; AD1 / AC9 / Tasks 0.3, 0.5, 4.1 / TR7 updated. |
| 2026-11-12 | 1.5 | dev-story: Tasks 0-7 done, Status review (governance `ad0244f8`, `cae6a377`, `b71915e7`, `22dc5123`; code `c59f88d1`, `6c5cc2ac`); Dev Agent Record, File List. |
| 2026-11-12 | 1.6 | Codex three-layer code review at `31f1938e`; BigDev option 1: CR1-CR3 fixed and checked off. First-claim cutoff under the lock (clock read after waiting), Q2 wrapped-42501 alarm, six new child failure/boundary cases and stronger domain boundary/recovery assertions. Affected tests 66/66; domain/jobs typechecks and changed-file lint pass. Status done; browser check and landing remain disclosed. Uncommitted; no push or deployment. |
| 2026-11-12 | 1.7 | Code review round 2 (Claude Sonnet 5.5, `bmad-code-review 13.1g on worktree`), CHUNK 1 of 3 (`packages/domain`) at `4862fda6`: R2-1..R2-3 applied and RED-proved (the Q4-fail re-claim UPDATE re-tests the holder / lease; the `twt_service` pin sees column grants; AC4's refused `super_admin` leg), R2-W1 / R2-W2 deferred; uncommitted. Chunks 2 (`apps/jobs` + `packages/queue`) and 3 (admin, i18n, ADR, records) still to review; Status unchanged until then. |
| 2026-11-12 | 1.8 | Code review round 2 (Claude Sonnet 5.5), CHUNK 2 of 3 (`apps/jobs` + `packages/queue`): R3-1..R3-4 applied and RED-proved (the pre-flight hold legs; the no-write fence's real writer list, a plant per name and a real-export guard; the Nalanda recipient, the production allow-list refusal and the Q4 skipped row end to end; family-9 triggers and comments that claimed more than the code does), R3-W1..R3-W4 deferred; uncommitted. Chunk 3 (admin, i18n, ADR-0045, roster, records) still to review; Status unchanged until then. |
| 2026-11-12 | 1.9 | Code review round 2 (Claude Sonnet 5.5), CHUNK 3 of 3 (admin sign-in return, i18n, ADR-0045, the records): R4-1..R4-8 applied (the Accept-401 return and the lapsed-session wait RED-proved; Row 51 no longer re-opens leg (a); ADR-0045's RE-EXAMINE trigger, no ordinals, the kind the provider learns; the catalog's authorship; Status `done` -> `review` with the pinned comment and the ledger; the owed browser check tracked), R4-W1..W4 deferred. The three chunks are complete: 0 decision-needed, 15 patch applied in round 2 (round 1's CR1-CR3 make the branch's 18), 10 defer (`deferred-work.md` also holds R4-8, the tracker for the owed browser check), 36 dismissed. Uncommitted; Task 8 (landing) and the browser check still owed. |
| 2026-11-12 | 1.10 | Code review round 3 (Claude Sonnet 5.5; the round-2 PATCHES alone, BigDev option 2 then option 1): R5-1..R5-7 applied - the own-retry and the holder-finalised legs of the Q4-fail UPDATE and the `twt_service` DELETE / TRUNCATE / REFERENCES pin RED-proved; the domain header / AC4 / SQL-comment prose, R2-W2's two files, the 6.36e citation and the stale `done` sentence, the 'word for word' and 'ONE alarm' wordings and the v1.9 counts corrected. 0 decision-needed, 7 patch, 0 defer, 21 dismissed; the Auditor found all 15 round-2 patches delivered and agrees with `review`. Uncommitted; Task 8 (landing) and the browser check still owed. |
| 2026-11-12 | 1.11 | Task 6's browser check RAN (BigDev: "do the browser pass"), in the Mac's Chrome on a throwaway stack signing in through the REAL `/login` (password + recovery code): the emailed link signed out -> `/login?next=<page>` -> the Move requests page; a mid-page 401 on Accept -> `/login?next=<page>` -> back, nothing accepted; a hostile `next` ignored. Four legs, no defect. Not covered: the passkey factor, a delivered email, the production origin. Torn down; nothing committed. Remaining: Task 8 (landing), a full `ci:local`. |
| 2026-11-12 | 1.12 | Full `ci:local` (BigDev: "complete ci:local") on the tree at `4862fda6` + the round 2 / 3 patches + the records, against a FRESH container (:5462, database `twt_dev`, removed afterwards): **PASSED - 39 jobs green**, exit 0, 20 min 35 s; `integration-tests` domain 525 files / 8305 passed, api 238 files / 3200 passed, jobs 95 files / 2205 passed; no re-run. Supersedes the dev run's 36/37. The GitHub CI has not run; nothing committed or pushed. Remaining: Task 8 (landing). |
| 2026-11-12 | 1.13 | COMMITTED on `story/13-1g-field-worker-move-notices-by-email` (BigDev: "commit it, code and records separately"): the review code and tests of rounds 2-3 as `8ac5510a` (11 files, +244 / -36; on `4862fda6`), then these records (the story, `sprint-status.yaml`, `deferred-work.md`, ADR-0045's RE-EXAMINE / wording edits, roster Row 51's corrected line) as the next commit. The "uncommitted" in v1.6-v1.12 and the 2026-11-12f..j ledger lines was true when each was written. NOT pushed (the pre-push hook needs `DATABASE_URL` on the story port); Task 8 (landing) still owed. |
| 2026-11-12 | 1.14 | BigDev: "yes land it". LANDED on `main` by fast-forward (PR #328, `cae6ac65..54ff8a67`, fast-forward; GitHub marked it merged at 14:21Z, merge commit = the tip); GitHub CI 39/39 on the PR at `54ff8a67`; the push-to-main CI run (`ci.yml`, run 43236334523) 39/39 green at `54ff8a67`, completed 14:49Z; the pre-push hook skipped `ci:local` (every commit sent was already on origin). Task 8's records written AFTER the landing (ledger `2026-11-12l`, `epics.md`, `deferred-work.md`, roster Row 51 (c)); Status `review` -> `done`. Merge is not go-live: Row 51 (c), (d), (e), (f) open. The v1.13 "NOT pushed" and the ledger's 2026-11-12k "NOT pushed" were true when written; the branch was pushed and PR #328 opened at 11:08Z the same day. |
