---
baseline_commit: f06ee41f
---

<!--
SPLIT FROM Story 6.19 v0.9 on 2026-09-27 (BigDev: "split it three ways") — D13. The set: 6.19a (`done`) → 6.19b (this file) → 6.19c;
6.19d (CC1) `backlog`. AC numbers KEPT from 6.19 v0.9 (decisions and notes cite them); AC8/AC9/AC11 restated per slice.
⭐ THE SHARED SPEC IS PART OF THIS STORY: `6-19-correction-return-reminders-and-closure.md` — rulings, invariants, traps T1–T14, author
decisions D1–D34. ⚠ Its *What already EXISTS* is pinned to `c136b03c` (before 6.19a shipped): for everything this slice touches, the
section **§ What 6.19a shipped, and what moved** below is the current record and wins where they differ.
BASELINE `f06ee41f` (6.19a's review fixes, on `main`). Two separate facts: ⭐ the pin is an ancestor of `main` (durable); ⚠ the code
claims in this file were re-derived at `f06ee41f` on 2026-09-29 (perishable). Before Task 1 run
`git diff --name-only f06ee41f..HEAD -- packages apps scripts` and re-read anything it lists that this file cites.
GLYPH REGISTER: `⛔` sits ONLY on a negation word (not / no / never / nothing / neither); `⭐` key fact or action; `⚠` hazard.
ADDRESSING RULE: ⛔ no `file:NNN` into `.decision-log.md`, `deferred-work.md` or `sprint-status.yaml` — cite decision ids + clauses,
item headings and row keys. `file:NNN` is used ONLY for code, as of `f06ee41f`; the function names are the stable handle.
-->

# Story 6.19b: The Correction-Return Reminders — the Panel's Schedule, the Text Message to Each Person, the Staff Chase and the Posted Letter `[SURFACE]`

Status: done

> ⭐ **DISCHARGED BY THE BUILD 2026-10-01 — Story 6.19c (`-265` Consequence 4, cited ⛔ not edited).** 6.18's go-live fence (*"not without 6.19"*) discharges here: a sent-back claim no longer waits forever — the closure for no response is built (the District Admin's request, the Pariwar Admin's decision, the Super Admin's review and decision, the staff case's day-90 escalation, "no correction needed" and the guarded re-file). ⚠ What still gates GO-LIVE is the 6.19 set's own: counsel's M and S (launch-gate rows 18, 19), the DLT registration, the Hindi review (`-267` §6) and Story 6.19d — ⛔ not this fence. Annotation only, ⛔ not a rewrite.
>
> ⭐ **6.19a is `done` and merged** (its governance `68be1778` = `-265`; its code `a779bfaf`, review `f06ee41f`). ⭐ **`2026-09-29-266`**
> (author-commit, this story's validate pass) **supersedes** `-265`'s D2 and `-265` §5's letter check, and adds **D30–D34**; ⭐ **`2026-09-29-267`** is its erratum
> (one open run per claim, the resolver reads ended runs, `resubmitted` pauses, a per-person key, the claimant's letter address, D28's Hindi
> review a go-live gate); ⭐ **`2026-09-29-268`** makes *"the family's part is done"* its own fact (the accounts rewritten after the return,
> with ⛔ no later `does_not_match`); ⭐ **`2026-09-29-269`** is its erratum and closes three seams (the LATEST check decides; the pause has
> two tiers; ⛔ no family run during a Super Admin hold; a number the network refuses is letter-eligible; the helpline number is per Pariwar)
> ⭐ **`-270`** (the mark also records a Super Admin) and ⭐ **`-271`** ("reached" counts only the person's CURRENT number; ⛔ no staff run on a
> switch during a Super Admin hold) — read all six before Task 1; every AC below is written to them.
> ⭐ **The family SMS is go-live gated on counsel** (M, S — launch-gate inventory rows 18, 19) and cannot send for real until the DLT
> templates are registered (T13; the request sheet reads ⛔ *not started*). A missing template id or helpline number fails **closed**.
> Neither blocks the build ([[project_not_in_production_merge_is_not_golive]]).
> ⭐ **6.18 must still not go live without 6.19c** — this slice chases; only 6.19c lets a chased claim end.

## Read first

- **Rulings:** ⭐ **`-258`** (who must act — AC16), ⭐ **`-260` G2** (the Pariwar Admin's keep also sets the mark — a writer 6.19c builds
  on this slice's table) and ⭐ **G4** (⛔ no same-day message — the first slot is the next morning), `-229`, `-230` 1–4, `-231` C/D/E/F,
  `-232` J, `-250` #1–#5, `-252` cl.1–2, `-253` cl.3, `-255` F5/F6/F7.
- **Author decisions:** `-265` (D1–D29, the eight keys) **as amended by `-266` … `-271`** — D2 (superseded: the runs table), D3 (keyed by run
  kind), D4, D6, D7, D8 (keys **(1) and (7)** are minted here), D10, D11, D20, D21, D25, D26, D28, ⭐ **D30–D34** (`-266`).
- **Invariants (shared spec):** 1 (the system never decides), 3 (never `delivered` for an accepted send), 4 (no name in a family
  message), 11 (a family is never chased for a silence that was never theirs).
- **Traps (shared spec):** T1, T5, T6, T7, T12, T13 — plus the slice traps in *Dev Notes* below.
- **Shared spec *What already EXISTS*** (pinned `c136b03c`; the parts still true at `f06ee41f` — see § below for what moved): *The
  dispatch substrate*, *The scheduler analogues*, *Staff recipients*, *Documents* (the `claimDocumentStorage` port — `put` /
  `signedReadUrl`, the MIME list, 10 MiB), *Audit*, *District keys*.
- **6.19a:** AC1's **W1–W10 / W4a** (how contact rows bind to declaration versions), AC8a (the contact record is presence-only under
  `claim.view_nominee_name_check`).

## Story

As the **District Admin** (with the **Pariwar Admin** above me), I want a claim sent back for a bank-name correction to be **chased on the
Panel's fixed schedule** — and, **only when the family must act** (`-258`), a text message to each person the family agreed may be
contacted, a flag when someone's phone is dead or unreachable, and a short form to **record the letter I post** to that person; when
**staff** must act, a chase of staff and ⛔ never of the family — so that every attempt to reach the family is **on the record** before
anyone can ask for the claim to be closed.

## 📜 Policy meaning (AI-10-1)

⭐ **This slice introduces ⛔ no predicate that approves, refuses or closes a claim.** It **writes the inputs** 6.19c's closure predicate
reads — the latest "who must act" mark, the family run's day 0, and the reminder and letter records its *"each person reached"* (D22)
reads — and **exports the ONE resolver** for the mark and the runs, which 6.19c must call and
⛔ never re-derive (a wrong day 0 here is a wrong closure gate there). The closure predicate and its note are 6.19c's.
⭐ **It does change what a family receives**, in three ways, each the Panel's: (a) an SMS to people outside the app (`-255` F7); (b) in a
**staff** case the family gets ⛔ no reminder and the app says *"Your claim is still open — we are checking the bank details"* (`-258`
detail 3); (c) a switch to "the family must act" starts the family's 90 days **that day** (`-258` detail 1). ⭐ And one author reading
(`-266` D30): when the system cannot say who the family is, it sends ⛔ nothing and tells staff. ⭐ And (`-268`, `-269`): once the bank
details are rewritten after the return — and the latest check since is ⛔ not a mismatch — the family is ⛔ not texted or chased and the app
shows the same *"we are checking"* line; 6.19c's closure guard reads the same fact (`familyPartDoneAt`, from this slice's resolver).
**In the family's terms:** *"If the bank details need correcting and it is yours to do, we will text each person you agreed we may contact,
on fixed days for up to 90 days, and write by post to anyone we cannot reach by phone; if the mistake is ours, we will not chase you — the
app will tell you we are checking."*
**Checked against the Niyamavali? ⛔ No** — `docs/legal/` is absent from the public repo by design and the Niyamavali is ⛔ not ratified
([[feedback_niyamavali_rulebook_not_spec]]); the sentence was checked against `-229` → `-232`, `-250` → `-260` instead, and every clause
traces to one of them.

## Acceptance Criteria

### AC2 — Runs, the clock and the schedule (`-229`, `-230` 2/4, `-250` #5, ⚠ narrowed by `-258` detail 1; `-260` G4; D2/D3 as amended by `-266` §1)
**Given** a live `correction_return` row **Then** reminders belong to a **run** (a row in the NEW runs table): `kind` ∈ {`family`, `staff`,
`direction`}, `anchor_id`, `day0`, ⭐ **at most one open run per CLAIM** (`-267` §1 — ⚠ SUPERSEDES `-266`'s "per return": a vote can supersede a return and a second return
land before the sweep ends the first run)
**And** the return's handler opens the first run **in the return's transaction**: `family` with `day0 = istDateOf(decidedAt)` when the mark
is `family`, else `staff`; a mark change (AC16) ends the open run, if any (`end_reason 'mark_changed'`; D26's *"the running slot is written `skipped_superseded`"*
is done by the **next sweep**, ⛔ not the API — a separate bounded query for runs ended `mark_changed` in the last 36 hours on one of their
slot days; the sweep writes `skipped_superseded` for each recipient with ⛔ no row for that slot — an existing row is left as it is; the child's re-check already stops the send), and opens the other kind with `day0` = the change's IST date — also when ⛔ no run is open (after day 90, or
on an unmarked return: a switch to `family` gives the family a full 90 days from that day, `-258` detail 1); the opener first ends any open run of the claim (`superseded`) — so a **second return**, by either path, leaves one run; a `direction` run is
opened ONLY through the exported opener (6.19c calls it), which refuses it unless the latest mark is `family` (`-267` §5a — ⛔ no family chase
by direction in a staff case); an exported **end-run** function records `decided` (6.19c's decisions call it; on an already-ended run it is a no-op); ⭐ the opener carries
a **hold hook** that 6.19c fills (`-269` §3): while a claim is escalated or under Super Admin review, a mark switch opens ⛔ no `family` run —
only a `restart_family_reminders` direction does — and a switch to `staff` ends any open `direction` run and opens ⛔ no `staff` run (`-271` §2 — the
claim is already with the Super Admin; the review's reminders are 6.19c's); the opener and the mark writer run under the trustee advisory lock
(`stateTrusteeDecisionAdvisoryLockKey`, the lock every return and vote takes)
**And** a **pure** `correctionReminderSchedule(kind, day0)` returns the slots from a DATA table keyed by run kind — `family`, `staff` and
`direction` all use the Panel's days (1–7; 10, 14, 17, 21, 24, 28, 31, 35; 42, 49, 56, 63, 70, 77, 84) — the `staff` kind also carries its
**day-12 escalation** slot (`-258` detail 2; ⛔ not a reminder day) — ⛔ nothing on day 0 (G4 — the
first slot is the next morning at 10:00, for a return **and** for a switch), ⛔ nothing on or after day 90; injectable clock
**And** a run ends through the stop predicate (D4): its return is no longer the live one (compare `run.return_decision_id` with
`getLiveCorrectionReturn(…).decisionId` — `resolveClaimCorrectionState` returns ⛔ no id), or day ≥ 90 — computed through those helpers,
⛔ never re-derived; ⭐ **`resolveClaimCorrectionState(…).resubmitted` PAUSES the run, it never ends it** (`-267` §3 — ⚠ SUPERSEDES `-266`'s
`end_reason 'resubmitted'`: a 6.20 correction after resubmission makes it false again on the SAME return) — ⛔ no send and ⛔ no record for
those slots; D3's catch-up if it flips back — ⭐ **the pause has TWO TIERS** (`-269` §2, superseding `-268` §2's single pause), evaluated
as `resubmitted || familyPartDone`, ⛔ never `familyPartDone` alone: (a) **`resubmitted`** pauses the **whole** run — family **and** the
District Admin (the claim has left the correction queue and waits on the vote); (b) **the family's part is done but ⛔ not resubmitted** —
every account rewritten after the return, and the **latest** name check since the latest rewrite is ⛔ not `does_not_match` (⛔ no check yet
counts; `-269` §1) — pauses the **family only**: ⛔ no family SMS, ⛔ no letter chase, the District Admin's reminders **continue**
**And** the sweep (daily 10:00 IST) enumerates **open runs** — a raw cross-tenant read on the BYPASSRLS pool, bounded, alarming at its
cap — and enqueues a child job per `(run, slot, recipient, purpose, subject_key)` (its `singletonKey` is a **label only** — ⚠ every queue here uses pg-boss's
`standard` policy, which enforces ⛔ no `singletonKey` uniqueness (`apps/jobs/src/claim-peer-mesh.ts`'s policy note); ⭐ the dedup is the
table's UNIQUE + the insert under the lock); the retry policy is stated at the enqueue site — `retryLimit: CHILD_RETRY_LIMIT` (4),
`retryDelay: CHILD_RETRY_DELAY_SECONDS` (60), `retryBackoff: true` (`contribution-notify-triggers.ts`) — ⚠ ⛔ never inherit the default: pg-boss 12.19.1's is **2 immediate retries**
(`QUEUE_DEFAULTS`, `retry_limit: 2, retry_delay: 0`; the repo comment calling it "no retry" is stale), so the **sweep** and the **staff-push**
queues state theirs too (each `retryLimit: 2`, `retryDelay: 60`, `retryBackoff: true` — both are idempotent); a per-claim try/catch (⚠ `resolveClaimCorrectionState`
re-throws any error that is not one of its three "not yet" errors); the child throws **only on a transient failure** (AC3) so pg-boss retries
**And** ⭐ **the child re-checks before it sends**, in ONE transaction under the trustee advisory lock: the run is still open (a mark change
ends it; a same-value restatement does ⛔ not) and — **by purpose** — tier (a) (`resubmitted`) does ⛔ not hold for ANY row, while tier (b)
(the family's part done) and D30 stop only `family_sms` and `letter_chase` rows (⛔ never the District Admin's `staff_reminder`,
`escalation` or `letter_second_due` — tier (b) is exactly when staff must act) — and only then inserts its row `attempting`
(with `claimed_at` and `claimed_by_job` = the pg-boss job id, which a retry keeps) and commits — ⚠ all on the ONE client of that scope tx
(the jobs domain pool is `max: 2`, `boot.ts`): decrypts and config reads happen **after** the commit, ⛔ never a second checkout inside
the lock; the
send happens **after** that commit, and the row moves to its final state **after** the send (compare-and-set: `attempting` → final only from
`attempting`). ⇒ a switch to `staff` at 10:01 stops a job queued at 10:00. ⭐ A child whose re-check **fails** (a switch, a pause, D30) writes — or
compare-and-sets its own `attempting` row to — `skipped_superseded` with the reason in `detail`, and completes ⛔ without throwing. A
**retry of the same job** (same `claimed_by_job`) re-claims **only from `attempting`** (a retry arriving after the finaliser's `error` is a
no-op): it re-runs the re-check and re-claims its row **at once** (`attempt_count + 1`, the first transient `detail` kept in `first_detail`) — ⛔ never a second
row; a row claimed by a **different** job is re-claimed only when its `claimed_at` is older than **`CORRECTION_SEND_LEASE` (10 minutes —
longer than any single attempt: a 10-second send)**, else left alone. ⭐ The **exhausted-row finaliser** is a time bound, ⛔ not a retry
count: the sweep compare-and-sets to `error` (+ alarm) every row still `attempting` whose `claimed_at` is before today's IST date (the
retry horizon — 60 s with backoff over 4 tries — is minutes, ⛔ never a day); that `error` is final, ⛔ no catch-up for that slot. ⚠ **The send is at-least-once:** `api_unavailable` includes "no response" and 5xx, which can
follow a gateway accept, so a retried slot can text a person twice — accepted and recorded in `attempt_count` / `first_detail`, ⛔ never hidden; the send runs under a
**10-second timeout** (the OTP path's `sms-step-up-delivery.ts` precedent), a timeout counting as `api_unavailable`. D3's catch-up holds (the
latest missed slot once, flagged `late`; older ones `skipped_superseded` — ⛔ no burst).

### AC3 — The reminder record and the family message (`-230` 1/3, `-252`, `-253` cl.3, `-255` F6/F7; D7, D30, D32, D33)
**Given** a slot is due in an open **`family` or `direction`** run **Then** each person who must be reached — **each effective nominee**
(resolved per `versionId` through the correction chain, T12) **and** the claimant when the contact record's claimant side is the claimant
**block** — gets one reminder row (`purpose 'family_sms'`) and one SMS
**And** the row's `recipient_key` is stable across a 6.20 correction: `nominee:<the correction-chain ROOT of the version>` or `claimant`;
⚠ when a correction changes the **number** behind a key mid-run (each `family_sms` row stores the `recipient_version_id` it used and a
keyed hash of the decrypted, normalised E.164 number — `recipient_number_hash`, via `blindIndex` under a NEW field class
`claim_contact_mobile` in `field-classes.ts`, bound to the claim's **real** `pariwarId` — ⚠ ⛔ never `mobileBlindIndex` (its
`MEMBER_IDENTITY_NAMESPACE` hash equals `member_identities.mobile_blind_index`, the login key, and would make every row joinable to a
member) — computed after the decrypt and written at the final compare-and-set; since ciphertext is ⛔ not comparable; the sweep evaluates
the reset by comparing `recipient_version_id` first and hashing only when it differs (a stopped person writes ⛔ no rows, so the sweep, ⛔ not
the child, must detect their change); a correction that keeps the same number changes ⛔ nothing), that person's per-run state (the found-dead marker, the "delivered letter
stops reminders" stop) resets — a new number is reached afresh, ⛔ never silenced by the old number's history
**And** ⭐ **D30 — nobody nameable:** when the effective declaration is ⛔ not `effective`, there is ⛔ no contact record, or the agreement is
⛔ not `live`, the sweep sends ⛔ nothing to the family, writes ⛔ no family row for the slot, and the queue shows *"cannot remind"* with the
reason (`undetermined` / `no_contact_record` / `agreement_not_live`); ⭐ `claimant_unresolved` (`-267` §5c — a claimant linked to a nominee
version that resolves to ⛔ no effective nominee) flags **the claimant alone**: the nominees are still sent; once fixed, D3's catch-up applies; the staff reminders still run
**And** the row records what is known — `accepted`, `rejected_invalid_number`, `rejected_unreachable` (`-269` §4), `no_target` or `error`
(`late` is a separate boolean, ⛔ not a state); `delivered_at` ⭐ **only** from a real
signal (T1); `provider_message_id` and the classified error (`detail`, `'<class>:<code>'`) kept; ⛔ never reconstructed ([[feedback_record_unattested_no_backfill]])
**And** the provider's result maps as follows (`createSmsDltProvider.send` ⛔ never throws — it resolves `rejected` with
`detail = '<class>:<code>'`): class `invalid_number` → `rejected_invalid_number`; ⭐ `carrier_reject` (DND / operator block) → `rejected_unreachable`, final and
letter-eligible (`-269` §4); `dlt_template_not_approved`, `auth`, `unknown` → `error` + alarm, **final** (⛔ no retry); `rate_limited`, `api_unavailable` → the child throws (retry); ⛔ no sendable number (a
vacated version's null `mobile_ciphertext`, an erasure sentinel, a number that is ⛔ not a valid Indian mobile) → `no_target` without a send
**And** the SMS is **name-free**: the claim's **short reference** (D33 — the first 8 hex characters of the lower-case claim id, upper-cased;
the same string the queue shows) + **the helpline number** (D33 as `-269` §5 scopes it — config key `sms.claim_correction.helpline_number.<pariwarId>`, one per Pariwar; unset
⇒ **that Pariwar's** sends fail closed), ⛔ no name, ⛔ no bank
detail, ⛔ no reason; **en or hi** per `contact_locale`, from `claim.json` through the real `t()`, matching the registered DLT content; tone
per the microcopy rules (S4; ⛔ no deadline threat, ⛔ no "closed in N days"), name-free per T6
**And** ⭐ **what each message says** (this slice writes all four, D32): the **reminder** — the bank details on the family's claim need
correcting; please **call the helpline — or the District Admin will contact you** (matching the app's `…_staff` line; ⛔ never "update in
the app" — a returned claim is ⛔ never member-editable); the reference and the
number. The **closure notice** (6.19c sends it) — the claim was closed because no correction was received; it **cannot be appealed**; a new
claim may be filed **through the helpline or the District Admin** (`-254`); the reference and the number. ⚠ The **Hindi** of all four ships
agent-authored and marked *not yet human-reviewed*, and its review joins D28's go-live row (`-267` §6's gate)
**And** a missing DLT template id, an unset helpline number **or** an unconfigured gateway (`SmsAppClient.isConfigured()` false —
`messaging()` throws, and the repo's convention elsewhere is `fixture-sms.ts`, which reports **`accepted`**) fails **closed**: the row is
`error`, an alarm fires, ⛔ never a fixture `accepted` (it would fabricate D22's "reached"), ⛔ never a placeholder number (T13); ⚠
`resolveSmsDltConfig` returns `null` for "not provisioned" (→ `error`) but **throws** on a Secret Manager outage (→ transient: the child
throws and retries); `messaging()` is called **inside** the send's try
**And** ⭐ **D32:** this slice builds the template registry, copy and lockstep test for **both** family messages — `reminder` **and**
`closure_notice`, × `hi`, `en` (four config keys) — and exports the send; 6.19c only calls it for the closure notice
**And** a person becomes **letter-eligible** in a run on their first `rejected_invalid_number`, `rejected_unreachable` (`-269` §4) or `no_target` (D20) — the
IST date that outcome was recorded is their **found-dead day** (for a `late` send, the send's date) — and is shown to the District Admin as **dead** (`rejected_invalid_number`) or **unreachable** (`rejected_unreachable`, `no_target`) with the
letter route offered (`-252` cl.2); ⚠ the sweep alarms when one day's sends carry ≥ 3 `rejected_unreachable` (`carrier_reject` also covers
spam filters — a content-level block would make everyone letter-eligible; evaluated at the next sweep, and letter-eligibility is ⛔ not
undone — a letter is only added reach); their
reminders stop only when a letter to them has a recorded delivery (`-250` #1); the marker is **per run**.

### AC4 — Staff reminders and escalation (`-230` 1, `-231` C/F, `-232` J, `-250` #2/#3, `-258`; D11, D20, D21, D26, D34)
**Then** the District Admin (the live shepherd) gets ⭐ **one** scheduled reminder per claim on each of the **open run's** D3 days (D34 —
the family run's until D21 stops them — when **every** family recipient is letter-eligible **and** delivered; the staff run's in a staff case — ⛔ never both); each is a
reminder row (`purpose 'staff_reminder'`, `recipient_key 'staff:<user_id>'`); ⚠ ⛔ no live shepherd ⇒ the row (`recipient_key 'staff:unassigned'`) is
`no_target`, the item stays on the queue and an alarm fires; ⭐ a staff row sends nothing itself (the queue is the channel), so its outcome
is `recorded`
**And** ⭐ **D21's "ONE reminder 30 days after delivery" and `-231` D's second letter are the SAME reminder** (`-231` F's own reading: the
reminder to post the second letter) ⇒ per person, ONE `letter_second_due` row at that person's recorded delivery + 30 days; ⛔ no separate
`replacement_reminder` is written in v1 (the CHECK keeps the value for later kinds)
**And** for each letter-eligible person without a complete letter record, the District Admin is reminded from the **found-dead day**: day 7,
daily through day 12 (found-dead day + 7 … + 12), then **escalated to the Pariwar Admin on day 13** (*"thereafter"*, `-231` C — one `escalation` row per Pariwar Admin of the claim's
Pariwar, from the admin directory, `recipient_key 'staff:<user_id>'`, each on their own daily push) (`purpose 'letter_chase'` / `'escalation'`, `subject_key` = the chased person — `-267` §4: per-person items for one District Admin on one day
⛔ never collide) — a record and a reminder, ⛔ never
an automatic act (AR-63); the **overdue** flag at 14 days after posting is shown, nothing else
**And** delivery is D11's: ⭐ **the queues are the channel** — the correction queue is **linked from the admin nav** and every due item is on
it; admin push is best-effort, English, `time_critical:false`, ⛔ no Telegram mirror, at most one push per District Admin per claim per day
(D34) — ⭐ combined by ONE daily staff-push job per `(claim, user, IST date)` — ⭐ staff rows send nothing, so the **sweep writes them itself** (⛔ no child
job), then enqueues the push, which reads that day's staff rows; its idempotency is its own row (`purpose 'staff_push'`) under a partial
UNIQUE on `(claim_case_id, recipient_key, sent_on) WHERE purpose = 'staff_push'` — so a sweep retry after a same-day mark switch cannot
key a second push on the new run; it follows the same claim / same-job-retry / finaliser rules as a family row; with ⛔ no admin device
token its outcome is `no_target` with ⛔ no alarm (the day-one state; an alarm would fire daily for every claim); a child job ⛔ never
pushes itself — ⚠ **inert on day one**: ⛔ no admin client registers a device token today, so it reaches ⛔ no device; build and test it against a
fake provider and say so in Completion Notes
**And** each queue item links to the claim **in the queue** (a new `?claim=<id>` search parameter that scrolls to and highlights the row);
⚠ the push itself cannot deep-link (the `alert_published` render builds a member-app link, and `render.ts` is on the never-edit list) — its
text names the correction queue.

### AC5 — The posted letter (`-230` 3, `-231` D, `-255` F5, `-250` #3/#4; D6, D20, ⭐ D31)
**Given** a person letter-eligible in a `family` or `direction` run **Then** the District Admin (key (1)) records a letter **to that person,
at their own address** (a nominee's: the contact row resolved through the correction chain — 6.19a's `resolveContactRow`, ⛔ never
`member_nominee_versions.address_ciphertext`; ⭐ the claimant's: the block's own `claim_contacts.claimant_address_ciphertext` — `-267` §5b): posting date, **tracking number**, and — within 14 days of posting — the **delivery date**
and a **screenshot** (D6); at most two per person per run — a third is 409 `correction_letter.limit_reached`; the second due 30 days after the first's recorded
delivery (D20)
**And** ⭐ **D31 — the letter's own precondition** (supersedes `-265` §5's letter check): the person is letter-eligible in that run, **that
person's** address resolves (a nominee's row, or the claimant block's own column), and the agreement is `live` — else **409 `correction_letter.not_letter_eligible` / `.address_missing` /
`.agreement_not_live`**; `assertClaimContactRecorded` is ⛔ not called here (it stays approval-only)
**And** the address is shown only in the letter form: a gated read under **key (1)** (⛔ never `claim.view_nominee_name_check`), behind
**step-up** (as 6.19a's plaintext read-back, `f06ee41f`), with one audit line per reveal
**And** the record is staff-entered evidence: an un-recorded field is shown as un-recorded, ⛔ never inferred; a delivery recorded **later**
than 14 days is accepted and flagged overdue — ⛔ never refused (`-250` #3: *"nothing else"*); every write carries its audit line with the
actor's snapshotted display name ([[project_admin_display_name_attribution]]); a letter stays recordable against its run after the run
ends (day 90, a mark change) — ⛔ no reminders then (`-250` #4)
**And** the screenshot is read only through a TTL-limited signed URL under key (1).

### AC10 — Nothing else moves
**Then** ⛔ no new lifecycle state, ⛔ no new claim event type, ⛔ no new `AlertCategory`, ⛔ no `SMS_DLT_TEMPLATE_REGISTRY` entry, ⛔ no edit
to `packages/channels/src/{dispatch,render,sms-dlt-registry}.ts`; `voteOnFrozenClaim`, `assertClaimApprovable` and
`assertClaimContactRecorded` behave exactly as today for their existing callers; 6.16's one-journey rule is unchanged; this slice adds ⛔ no
approval or clearing path (`-258`'s "no correction needed" and `-260` G1 are 6.19c's) ⇒ `-226` cl.1/cl.6 and `-227` cl.2 are unchanged by it;
⛔ nothing is automatic.

### AC16 — Who must act (`-258`, `-260` G2; D25, D26, D28; APPENDED 2026-09-27 — ⭐ it CONDITIONS AC2, AC3 and AC4)
**Given** the Pariwar Admin sends a claim back **Then** the return carries a **required** mark — **the family must act** or **staff must put
it right** — written in the **same transaction** as the return row (D25) and opening the first run (AC2)
**And** the District Admin may change it with a **required note** (key (7), district dimension); every change is recorded (who, when, the
note); ⭐ the District Admin's **route** refuses a change to the value it already has (409 `must_act.unchanged`); the writer refuses when
there is ⛔ no live return (409 `must_act.no_live_return`) and writes against the live return read **under the trustee advisory lock**, so a
change cannot race a second return onto a superseded `decision_id`
**And** ⭐ one exported domain **mark writer** serves every writer — the return, the District Admin's change, and 6.19c's two
(`-260` G2's keep re-stating the mark; D27's "no correction needed", which sets `staff`) — with ⛔ no database constraint that shuts
6.19c's writers out (`set_by_role ∈ {pariwar_admin, district_admin, super_admin}` — a Super Admin holds every key, so can return a claim or change the mark;
⚠ `super_admin` extends D25's committed role set and is recorded by author-commit `2026-09-29-270`; `set_by_role` is the role whose grant
authorised the route — ⚠ the permission checks return a boolean, `void` or `{ ok }` — ⛔ never the matching grant (`packages/domain/src/rbac/check.ts`), so a NEW pure helper
`matchingGrantRole(grants, key, resource)` in `packages/domain/src/rbac/` returns it, preferring a scoped grant over a `global` one (a
Pariwar Admin who also holds `super_admin` records `pariwar_admin` for a Pariwar-scoped act); unit-tested with a dual grant;
a note on every row after the return's); ⚠ the **writer** accepts a same-value row (G2's keep RE-STATES the mark, possibly unchanged; D27 sets `staff` on a claim that may
already be `staff`) — a same-value row is recorded and leaves the open run untouched; only a changed value ends and opens a run
**And** the family's reminders (AC3) and the letter track (AC5) run **only in a `family` or `direction` run**: day 0 = the return's date if
marked `family` at the return, else the date of the latest change **to** `family` (`-258` detail 1 — a full 90 days); a change to `staff`
ends the family run at once
**And** while the mark is `staff`, **staff** are chased (D26): the District Admin on D3's days, **escalated to the Pariwar Admin at day 12**
(a record + a reminder, ⛔ no automatic act); the day-90 Super Admin escalation is 6.19c's (AC17)
**And** in a staff case the family gets ⛔ no reminder, and the member app shows *"Your claim is still open — we are checking the bank
details"* (en, ratified; hi — D28, its human review a **go-live** gate per `-267` §6) ⭐ **in place of** `nominee.bank.correction_needed_staff` — ⚠ a returned claim is ⛔ never in the member's
editable window, so it **always** renders `…_staff` today, ⛔ never `nominee.bank.correction_needed`; in a family case `…_staff` stays — ⭐ **except while the family's part is done** (`-268` §2), when the D28 line shows (*"we are checking"* is
exactly that situation); a
`does_not_match` claim with ⛔ no return (⛔ no mark), and an **unmarked** return (a dev/staging row), keep today's behaviour (`…_staff`); the member status carries ⛔ no note and ⛔ no actor
**And** the queue (AC8b) shows the mark, who set it and when (staff only), and carries the District Admin's change form; the Pariwar Admin's
return form requires the choice before submit
**And** ⭐ this slice **exports** ONE resolver: the latest mark and, for the live return, the latest `family`/`direction` run and the latest
`staff` run — **open or ended** — each with `run_id`, `day0`, `ended_at`, `end_reason` (`-267` §2 — ⚠ SUPERSEDES *"the open run"*: every run
ends at day 90, where 6.19c's gates begin) — ⭐ **and each person's CURRENT number hash** (`-271` §1: 6.19c's D22 counts an accept as
"reached" only when its `recipient_number_hash` equals it — an accept to a corrected-away number ⛔ never reaches the person); 6.19c's
closure gate calls it.

### AC8b — The surfaces (this slice)
**Then** the District Admin's **correction queue** (6.18's — ⛔ no second list) gains per claim: the **short reference** (D33), the day
count and next reminder of the open run, the mark (who, when) + its change form (AC16), a reminder summary **per person** (roles only —
"nominee 1", "claimant" — ⛔ no names), the dead / unreachable flags, the *"cannot remind"* flag and reason (D30), a *"family has corrected — awaiting your check"* flag while the family's part is done
and the claim is ⛔ not resubmitted (`-269` §2(b)), a *"who must act: not set"* flag on an unmarked return, each letter's state
(+ the day-14 **overdue** flag), and the **letter form** (short — NFR-8: usable at ≤ 720p; the address only inside it); ⭐ the admin nav
**links** to the queue (closes the 6.18 deferred item); the Pariwar Admin sees the chases escalated to them (the same queue, filtered — they
hold its read key); staff copy **English-only**
**And** semantic accessibility (family 13): every reachable state (`recorded`, `overdue`, `dead number`, `unreachable`, `cannot remind`,
`escalated`, `awaiting your check`, the mark) is **announced** (`role="status"`/`aria-live`), ⛔ not merely reflected in a prop; every interactive role has a real
handler; WCAG AA.

### AC9b — PII and audit posture (this slice)
**Then** an `AuthAuditEventType` entry for each letter write (posting; delivery + screenshot), each address reveal, each screenshot read
and each mark change, with `resourceLocator: 'claim:<lower-case uuid>'` (anything else is silently replaced)
**And** a live-DB test plants a **tracking number**, a **screenshot**, a recipient's **mobile** (decrypted for the send) and an **address**
(decrypted for the form) as sentinels and finds them in ⛔ no log, event, audit line, error body or job payload (the child job carries ids,
⛔ never a number)
**And** the **virus-scan gap** on the screenshot is recorded in Dev Notes and `deferred-work.md`, ⛔ not fixed.

### AC11b — The proof (this slice)
**Then** live-DB specs on `twt-test-pg :5433`, **executed** (a self-skip without `DATABASE_URL` is ⛔ not proof):
- **schedule:** every slot of the table and its boundaries (day 1, 84, 89, 90; a return at 23:59 and 00:01 IST); ⛔ no send on day 0 of a
  return **or** of a switch (G4);
- **runs:** a second return ends the old run and opens a new one; ⭐ **family → staff → family opens a second family run whose day-1 slot
  sends**; one open run per claim — a racing opener loses, and a second return after a **vote** supersession leaves one run; the stop
  predicate (superseded, day 90, a mark change — each alone); ⭐ **`-268`:** a family that rewrites on day 10 is ⛔ never texted again while
  ⛔ no check is recorded, the District Admin still is, and the member line switches to D28's; a later 6.20 correction does ⛔ not resume the
  family chase; a later `does_not_match` does (a `late` catch-up, ⛔ no burst), and the family's next rewrite pauses it again; a `direction` run refused while the mark is `staff`; the resolver returns an ENDED day-90 run;
- **races and crashes:** **two sweeps racing one slot → exactly one send and one row** (two connections); a crash between the insert and the
  send (⛔ neither a phantom "sent" nor a blocked slot); a catch-up after an outage (one `late`, older `skipped_superseded`, ⛔ no burst);
- **the record:** `delivered_at` ⛔ never set for an accepted send; each provider class maps as AC3 says (a transient one retries, a permanent
  one does ⛔ not); a missing DLT template id and an unset helpline number → `error` + alarm, ⛔ never `accepted`;
- **pause tiers (`-269`):** rewrite day 10 → mismatch day 11 → match day 12 with ⛔ no new rewrite ⇒ resubmitted, **everything** paused;
  rewrite with ⛔ no check yet ⇒ the family paused, the District Admin still reminded, the queue's "awaiting your check" flag;
- **send safety:** a switch to `staff` between enqueue and send ⇒ ⛔ no SMS; a row held by a **different** job re-claimed only once its lease
  expires, a younger one left alone; a re-check that fails on a retry ⇒ `skipped_superseded`, ⛔ no throw, ⛔ no false `error`; a row stuck after retries are exhausted finalised `error` by the next sweep; a send timeout ⇒ `api_unavailable` + retry;
  `isConfigured() === false` ⇒ `error` + alarm; a Secret Manager outage ⇒ retry; `carrier_reject` ⇒ `rejected_unreachable` and
  letter-eligible; an unset helpline number for Pariwar A fails A's sends only;
- **retries (the H1 of the v2.4 re-check):** a transient failure then a retry of the SAME job ⇒ re-claimed at once and sent (`attempt_count` 2,
  `first_detail` kept); a row held by a different, live job left alone; an `attempting` row from a previous IST day finalised `error` by the
  sweep, ⛔ no catch-up for it; a 6.20 correction that keeps the same number resets ⛔ nothing, one that changes it resets that person;
- **staff push:** two due items for one District Admin on one claim on one day ⇒ ONE push, and a re-run of the push job ⇒ ⛔ no second push
  (`staff_push` row); staff rows record `recorded`; ⛔ no live shepherd ⇒ `no_target` + alarm;
  the letter-chase escalation on found-dead day + 13;
- **the mark:** a Super Admin's return records `set_by_role 'super_admin'`; a change with ⛔ no live return → 409; a change racing a second
  return lands on the live return;
- **D30:** undetermined / no contact record / agreement ⛔ not live → ⛔ no family send, the queue flag, then a catch-up once fixed; a 6.20
  correction mid-run keeps the person's `recipient_key`;
- **the message:** the SMS body is name-free, carries the short reference and the helpline number, and matches the registered DLT content in
  **both** locales for **both** messages through the real `t()`;
- **letters:** eligibility from `rejected_invalid_number` and from `no_target`; D31's three refusals; a letter to the **claimant** reads
  `claimant_address_ciphertext`; two people's letter chases on one day both recorded (`subject_key`); `claimant_unresolved` flags the
  claimant while the nominees are still sent; the chase anchored on the found-dead
  day (7 → 12 → escalate); the overdue flag 14 days after posting and a late delivery accepted; the second letter due 30 days after the
  first's delivery; the regular reminders stop only when every person is letter-eligible and delivered, and each person's ONE `letter_second_due` lands at
  their delivery + 30 days; a person's reminders stop on
  their letter's recorded delivery (and ⛔ not before); a letter recorded after its run ended;
- **staff:** one District Admin reminder per claim per day across a mark switch (D34); the staff run's day-12 escalation; staff push runs ⛔ no
  Telegram mirror;
- **AC16:** a staff-marked return sends the family ⛔ nothing; a switch to `family` opens a run with day 0 = the switch date; a switch to
  `staff` stops it mid-run; the member copy branches (staff case → the D28 line and ⛔ neither correction key; family case → `…_staff`);
  `must_act` missing on a return → 400;
- **`-271`:** a nominee reached on number A, then corrected to number B that is dead ⇒ ⛔ not "reached" (the resolver's current hash is B's);
  a switch to `staff` during a hold opens ⛔ no staff run; `matchingGrantRole` with a dual Pariwar-Admin + Super-Admin grant ⇒ `pariwar_admin`;
- **keys:** keys (1) and (7) — **cross-Pariwar** and **non-human/system-actor** denial each; the human-actor gate classifies the new route
  file and lists its methods;
- a `*-shape.spec.ts` for the extended queue read model; `{ timeout: 20000 }` on each new domain live spec.

## Tasks / Subtasks

- [x] **Task 0 — Preflight** (all ACs) — confirm `-266` … `-271` are on `main`; run `git diff --name-only f06ee41f..HEAD -- packages apps scripts`
  and re-read any cited file it lists; read the DLT request sheet and the four DLT keys' and each Pariwar's helpline-number key's status (T13, D33, `-269` §5); read the catalog
  version **live** (forecast 48).
- [x] **Task 1 — Migrations, from `0126`** (AC2, AC3, AC4, AC5, AC16) — in one ordered set, each with its RLS policy file (tenant, FORCE; modelled on
  `policies/claim-contact-rls.ts`), journal entry and migration-level policy spec: (a) the **mark** table (D25); (b) the **runs** table
  (`-266` §1 as amended by `-267` §1: the partial-unique on `claim_case_id WHERE ended_at IS NULL`; `end_reason` CHECK ∈ {`superseded`,
  `day_90`, `mark_changed`, `decided`} — ⛔ no `resubmitted`, `-267` §3); (c) the **reminder record** (+ `claim_case_id`, `pariwar_id` (RLS), `sent_on` (IST date), `late boolean NOT NULL DEFAULT false`, `claimed_at`, `recipient_version_id` on `family_sms` rows, the
  `claimed_by_job`, `attempt_count int NOT NULL DEFAULT 1`, `first_detail`, `recipient_number_hash`, the `detail` text; outcome CHECK ∈
  {`attempting`, `accepted`, `rejected_invalid_number`, `rejected_unreachable`, `no_target`, `error`, `skipped_superseded`, `recorded`} —
  `delivered` is ⛔ not a state, only `delivered_at`; the `staff_push` partial UNIQUE on `(claim_case_id, recipient_key, sent_on)`) keyed UNIQUE
  `(run_id, slot_day, recipient_key, purpose, subject_key)` (`-267` §4; `slot_day` = the run's day; `purpose` CHECK ∈ {`family_sms`,
  `staff_reminder`, `staff_push`, `letter_chase`, `letter_second_due`, `replacement_reminder`, `escalation`}, which 6.19c extends by its own migration;
  ⚠ `subject_key text NOT NULL DEFAULT ''` — Postgres treats NULLs as distinct, so a nullable column would silently void the UNIQUE; it holds
  the chased person's key ONLY for `letter_chase`, `letter_second_due` and the letter-chase `escalation`, and `''` for every other row incl.
  `family_sms`, whose person is its `recipient_key`); (d) the **letters** table keyed on `run_id` + the person's key (D6); the **tracking number** and the mark's **note** are encrypted as the
  return's `rationale_ciphertext` is (`piiColumn(1, …)` — read `schema/claim_state_trustee_decisions.ts` and its write helper first). Hand-authored (snapshots stop at 0020); ⛔ never regenerate an applied
  migration. A dev/staging return with ⛔ no mark opens ⛔ no run — the queue shows "not set" and key (7) sets it (⛔ no backfill).
- [x] **Task 2 — The mark and the runs** (AC16, AC2) — the exported mark writer + run opener (ends any open run of the claim; refuses `direction` unless `family`) + the end-run function + the
  ONE resolver (latest mark; latest family/direction and staff runs, open or ended — `-267` §2; ⭐ `familyPartDoneAt` — `-268` §1, from ONE
  exported reader over the accounts leg of `isReturnedClaimResubmitted` + the latest check, which 6.19c's closure guard also calls);
  the `must_act` field: **optional** in `CycleFreezeDecisionRequest`'s object and **required for `return_to_district_admin` only** inside
  its `superRefine` (the `escalation_outcome` pattern); written in `postDecision`'s scope tx right after `claim.returnToDistrictAdmin(...)`
  (⛔ not a new required field on `ReturnToDistrictAdminInput` — 37 test calls would break); the second-return path ends the old run;
  `PendingCaseCard.tsx`'s return form gains the required choice. Update the tests this turns red (see *CI gates and red tests*).
- [x] **Task 3 — The schedule and the sweep** (AC2) — the pure `correctionReminderSchedule(kind, day0)` + its data table (the `staff`
  kind also carries its **day-12 escalation** slot — ⚠ ⛔ not one of the Panel's reminder days); the child's pre-send re-check under the lock,
  the lease, the exhausted-row finaliser, the send timeout (AC2); the 10:00 IST
  sweep + child queue (`QUEUE_NAMES`, registration in `boot.ts` beside `registerContributionNotifyWorkers`); the stop predicate; the record
  writer (`attempting` → final, the stuck-row retry); injectable clock everywhere.
- [x] **Task 4 — The family SMS** (AC3) — relocate `claim_contact` and `member_nominee` into `packages/domain/src/encryption/field-classes.ts`
  and add the NEW `claim_contact_mobile` field class for `recipient_number_hash` (`-271` §1 reads it)
  (apps/api re-exports; the 8.8 precedent — ⛔ no by-value duplicate in apps/jobs); decrypt the claimant's mobile from the contact block
  and each nominee's from `member_nominee_versions.mobile_ciphertext` (via `getNomineeVersionsByIds`); expose the SMS gateway client from
  `buildContributionProviderResolver` (⛔ not a second client); the recipient set via 6.19a's `readClaimContact`, `readVersionChainIndex`,
  `resolveContactRow`, `readClaimContactAgreementState` (⚠ ⛔ not `readClaimContactPresence` — it reads projected versions); D30; the
  result mapping; the claim-correction template registry in **apps/jobs** (`@twt/channels` has ⛔ no `@twt/i18n` dependency) for
  `reminder` + `closure_notice` × `hi`/`en` with config keys `sms.dlt.template_id.claim_correction.<message>.<locale>`; the short
  reference + `sms.claim_correction.helpline_number.<pariwarId>` (`-269` §5); the en/hi copy in `claim.json` (microcopy-clean); the copy ↔ registered-text lockstep
  test; the exported send; the wording (AC3's *what each message says*) and `{#var#}` slots of templates 1–4, and the per-message **cost line** (`-255`
  consequence 2), written into
  `docs/launch-gate-inventory/dlt-template-requests-6-19.md` — templates 3–4's owner becomes 6.19b (build; 6.19c sends, D32), a row for the
  per-Pariwar helpline-number keys (D33, `-269` §5), and its Record gains a row. ⛔ No `AlertCategory`, ⛔ no
  `SMS_DLT_TEMPLATE_REGISTRY` entry, ⛔ no `dispatch()` for the family.
- [x] **Task 5 — Keys** (AC5, AC16) — mint **keys (1) and (7) in ONE catalog bump** from the live value (forecast 48 → 49, keys 56 → 58):
  the doc-block reuse-checks (`-265` §2), `roles.ts` (`district_admin`), `permissions.test.ts`, `roles.test.ts` (holder pins).
- [x] **Task 6 — Staff reach** (AC4) — the admin directory accessor (`role_grants ⋈ users`, by role and scope; precedent
  `resolveShepherdCandidates`; the District Admin = the live shepherd via `getLiveShepherd`); D34's once-per-day scheduled reminder and the ONE daily staff-push job per `(claim, user, IST date)`; each person's ONE
  `letter_second_due` (D21 as AC4 reads it); the letter chase (7 → 12 → escalate on day 13); the staff run's day-12 escalation; admin push through `dispatch()` with
  `resolveDelivery: () => ({ push: target })` (⛔ not `fanOutAlert`, ⛔ no Telegram), `resolvePushTargets(db, enc, ADMIN_GLOBAL_NAMESPACE,
  'admin', userId)` (admin tokens live under the nil namespace, ⛔ not the claim's Pariwar — read them in a scope set to that namespace), `resolveProviders` passed explicitly.
- [x] **Task 7 — Letters and the mark route** (AC5, AC16) — one NEW route file under `apps/api/src/modules/claims/` for: record a letter,
  record delivery + screenshot (port, key prefix `…/correction-letter/{letterId}`, MIME/size before `put`), the letter form's address read
  (step-up, audit per reveal), the screenshot's signed read, and the District Admin's mark change (key (7), required note); district
  preHandlers by **importing** `resolveNomineeNameCheckDistrict` (⛔ not copying it); the letter targets the resolver's latest `family`/`direction` run, open or ended (its delivery is recorded by `letterId`);
  D31's precondition; ≤ 2 letters per person per run;
  recordable after the run ends; audit lines with the snapshotted display name; register the module in `claims/index.ts`.
- [x] **Task 8 — Surfaces** (AC8b, AC16) — the queue columns + the contract's `.strict()` item + `ClaimUnderCorrectionRow`
  (`returnDecisionId`, the run, the mark, the flags, the short reference); the letter form; the mark change form; the `?claim=` search
  parameter; the nav link in `RootLayout.tsx`'s `<nav aria-label="Primary">`; the Pariwar Admin's escalated filter; the **member status**
  (a staff-case value on `NomineeBankStatusResponse`, served by `claims.nominee-bank.handlers.ts`, rendered by
  `(claim)/nominee-review.tsx`; the helpline's `BankDetailsCard` shares the schema); the D28 copy (en ratified; hi agent-authored,
  ⚠ marked *not yet human-reviewed* in its `$comment` and recorded in Completion Notes + `deferred-work.md` — the 6.19a precedent — and its human review added to
  `docs/launch-gate-inventory/inventory-roster.md` as a go-live gate beside M and S, `-267` §6); a
  `friction-budget.md` row for the mobile change; family-13 assertions.
- [x] **Task 9 — Gates, tests and discharges** (AC9b, AC10, AC11b) — the human-actor gate entry (`COVERAGE_SET`, raise `COVERAGE_FLOOR`
  from its live value, forecast 11 → 12); re-emit `openapi/v1.yaml`; **execute** on `twt-test-pg :5433`; confirm AC10 by a diff of
  `packages/channels/src` (it must be empty); record the virus-scan gap in `deferred-work.md`; mark the 6.18 chunk-3 *"Nothing in the admin app links
  to the correction queue"* item **built** at **both** its sites (`deferred-work.md` and 6.18's `[Review][Defer]`); amend
  `docs/degradation-policy/surface-inventory.md` for the three new surfaces (the letter form, the mark change, the queue's additions) and set
  AR-61 rows 9, 15, 16's `surface_inventory_xref` (*"the implementing Story's territory"*) — ⚠ the rows have ⛔ no xref column: amend the
  blockquote note above rows 9–19 and add a §7 revision row.

### Review Findings

Code review (2026-09-30), chunked by area across the full uncommitted diff (domain core, domain tests, API+contracts, jobs/scheduler+i18n, admin UI+integration surface); three adversarial layers per chunk (Blind Hunter, Edge Case Hunter, Acceptance Auditor vs this spec), findings verified against source before triage. 121 raw findings → 1 decision (resolved below), ~35 patch, ~6 defer, ~15 dismissed as false positives (documented cadence, accepted tradeoffs, or pre-existing project-wide patterns the hunters lacked context for).

**Decision (resolved 2026-09-30):** `matchingGrantRole` tie-break — specificity wins (district > pariwar > global) among non-global grants, and callers must thread the request's real `AuthzContext`/resolver so the re-check is actually the same predicate as the route's gate. Reclassified to patch below.

- [x] [Review][Patch] `matchingGrantRole` has no specificity tie-break and doesn't receive the real AuthzContext — FIXED: specificity ordering via `SCOPE_DIMENSIONS`; both call sites (correction-chase and the cycle-freeze return sibling) now pass `{ resolver: geoTreeResolverForRequest(request) }` and validate a non-null match [packages/domain/src/rbac/matching-grant.ts; apps/api/src/modules/claims/claims.correction-chase.handlers.ts; apps/api/src/modules/claims/claims.cycle-freeze.handlers.ts]
- [x] [Review][Patch] Letter eligibility & queue status never detect a number correction — FIXED: `{ crypto }` threaded through both call sites [packages/domain/src/claim/correction-letter.ts:117; packages/domain/src/claim/correction-chase-read.ts:146]
- [x] [Review][Patch] Claimant's reset never fires even after fixing the above — FIXED: claimant rows now always re-hash on a prior attempt, since `versionMoved` can never observe them [packages/domain/src/claim/correction-reminder-record.ts:509]
- [x] [Review][Patch] `setByRole` misattributes a Pariwar Admin (or a null match) as `district_admin` — FIXED (both instances, see matchingGrantRole item above) [apps/api/src/modules/claims/claims.correction-chase.handlers.ts:153; apps/api/src/modules/claims/claims.cycle-freeze.handlers.ts]
- [x] [Review][Patch] Escalated-only filter applied after pagination — FIXED: scans the full bounded page (200) when filtering, slices to the requested page size after [apps/api/src/modules/claims/claims.nominee-name-check.handlers.ts:446-489]
- [x] [Review][Patch] `readCorrectionChaseSummary` headline run / day-count can go stale — FIXED the recency fallback (prefers the more recently-opened of family/staff when nothing's open) and wired `crypto` through; left `people`/`letters` sourced from `familyRun` unconditionally as a deliberate, more conservative choice — letter/reminder history is meaningful evidence even once a staff run is current, and changing that scope risked a UI regression not confirmed by the Group 5 audit [packages/domain/src/claim/correction-chase-read.ts:109,143-171]
- [x] [Review][Patch] `writeCorrectionMark`'s `held` branch can leave a stale cross-return run open — FIXED [packages/domain/src/claim/correction-chase.ts:429-437]
- [x] [Review][Patch] `claim_correction_reminders`/`claim_correction_letters` grant unrestricted table-wide UPDATE — FIXED: column-narrowed to mirror `claim_correction_runs` [packages/domain/migrations/0128_claim-correction-reminder.sql; packages/domain/migrations/0129_claim-correction-letter.sql]
- [x] [Review][Patch] Screenshot upload MIME/buffering — WITHDRAWN on verification: the multipart plugin already caps `fileSize` globally (`apps/api/src/plugins/multipart/index.ts`), and MIME-header-only trust matches the established, deliberate codebase-wide pattern (same posture as the already-disclosed no-virus-scan gap; `claims.documents.handlers.ts` does the same). Not a defect introduced by this diff.
- [x] [Review][Patch] No catch-up/backfill for the letter-chase day-7..12 window — FIXED: now uses `correctionCatchUp` per person (writes `skipped_superseded` markers for missed days, one real `recorded` row for the latest due day) — same cadence as before when the sweep never misses a day [apps/jobs/src/scheduler/claim-correction-reminders.ts]
- [x] [Review][Patch] `openCorrectionRun` trusts caller's `returnDecisionId` — FIXED: re-derives and checks the live return under lock, mirroring `writeCorrectionMark` [packages/domain/src/claim/correction-chase.ts:295-303]
- [x] [Review][Patch] No app-level guard for the mark's note-required constraint — FIXED: `CorrectionMarkNoteRequiredError` → 409 `must_act.note_required` [packages/domain/src/claim/correction-chase.ts:405-416]
- [x] [Review][Patch] `writeCorrectionMark`'s `endedRun` misreports a cross-return supersession as null — FIXED [packages/domain/src/claim/correction-chase.ts:440-443]
- [x] [Review][Patch] D34 cross-run same-day dedup covers only 2 of 5 staff-side purposes — FIXED: extended to `letter_chase`/`letter_second_due`/`escalation` via a 4-column partial unique index [packages/domain/migrations/0128_claim-correction-reminder.sql]
- [ ] [Review][Patch] KMS encryption runs before cheap conflict checks in changeMustAct/recordLetter — not fixed this pass (perf/cost polish, not correctness) [apps/api/src/modules/claims/claims.correction-chase.handlers.ts]
- [x] [Review][Patch] `IsoDate` contract regex accepts calendar-invalid dates — FIXED (contract + the multipart `delivered_on` field, same check) [packages/contracts/src/claims/correction-chase.ts; apps/api/src/modules/claims/claims.correction-chase.handlers.ts]
- [x] [Review][Patch] `translateLetterError` forwards internal refusal codes unvalidated — FIXED: exhaustive `switch` with a `never`-checked default [apps/api/src/modules/claims/claims.correction-chase.handlers.ts]
- [ ] [Review][Patch] Unbounded exhausted-row UPDATE in the sweep (no LIMIT/alarm) — not fixed this pass [apps/jobs/src/scheduler/claim-correction-reminders.ts:637-646]
- [ ] [Review][Patch] Locale value other than hi/en misclassified as a transient Secret-Manager outage — not fixed this pass [apps/jobs/src/scheduler/claim-correction-sms-templates.ts]
- [x] [Review][Patch] Scroll/focus-stealing effect re-fires on every queue refetch — FIXED: scrolls/focuses once per distinct `?claim=` arrival [apps/admin/src/routes/CorrectionQueueRoute.tsx]
- [x] [Review][Patch] Toggling "escalated only" drops the `?claim=` deep-link param — FIXED: merges instead of replacing [apps/admin/src/routes/CorrectionQueueRoute.tsx]
- [x] [Review][Patch] Delivery-screenshot upload "bypasses" apiFetch — WITHDRAWN on verification: `apiFetch` hardcodes a JSON content-type header, which is wrong for a multipart body; this is the same established raw-fetch-with-FormData pattern used at 2 other upload sites in the same file, not an inconsistency.
- [x] [Review][Patch] `MustActChangeForm` doesn't reconcile stale local selection against a changing `current` prop — FIXED [apps/admin/src/modules/correction-chase/MustActChangeForm.tsx]
- [x] [Review][Patch] `request.scopeTx!` non-null assertion risks a raw crash — FIXED: matches `requirePermissionHook`'s own "fail loud with a message" convention [apps/api/src/modules/claims/claims.cycle-freeze.handlers.ts]
- [x] [Review][Patch] Confusing double-negative in `assertCorrectionLetterAllowed`'s eligibility check — FIXED [packages/domain/src/claim/correction-letter.ts:118]
- [ ] [Review][Patch] `RunPersonState.state: PersonRunState` naming collision — not fixed this pass (a rename ripples across several call sites; left as a follow-up rather than risk an incomplete mechanical rename) [packages/domain/src/claim/correction-chase.ts:597]
- [x] [Review][Patch] `listAdminsByRole` truncates at 50 with no `hasMore` signal — FIXED: returns `{ entries, truncated }`, caller alarms on truncation [packages/domain/src/claim/admin-directory.ts]
- [x] [Review][Patch] Untested, currently-dead tie-break in the staff schedule sort — FIXED: flagged with a comment (data change, not code — nothing to mechanically fix today) [packages/domain/src/claim/correction-schedule.ts:63]
- [x] [Review][Patch] Stale comment says `step_up.required` — FIXED (comment only; the code was already correct) [apps/admin/src/api/client.ts:1407]
- [x] [Review][Patch] Screenshot-open errors silently swallowed — FIXED: catch + a visible status message [apps/admin/src/modules/correction-chase/CorrectionChasePanel.tsx]
- [x] [Review][Patch] `?claim=` search validator regex too loose — FIXED: real UUID shape [apps/admin/src/router.tsx]
- [x] [Review][Patch] `PendingCaseCard`'s `mustAct` state never reset post-submit — FIXED [apps/admin/src/modules/cycle-freeze/PendingCaseCard.tsx]
- [x] [Review][Patch] Test-hygiene: module-level mutable `search` mock not reset in afterEach — FIXED: added a top-level `afterEach` floor [apps/admin/tests/correction-queue.test.tsx]
- [x] [Review][Patch] `CorrectionLetterForm`/`MustActChangeForm` have no dedicated tests — ADDRESSED by the third pass (2026-10-01): `apps/admin/tests/correction-chase-forms.test.tsx` [apps/admin/src/modules/correction-chase/]
- [ ] [Review][Patch] Hand-rolled UUIDv5 with zero direct test coverage — not fixed this pass [apps/jobs/src/scheduler/claim-correction-reminders.ts]
- [ ] [Review][Patch] Multi-device push fan-out loses per-device outcome detail — not fixed this pass [apps/jobs/src/scheduler/claim-correction-reminders.ts]
- [x] [Review][Patch] Retry timing constants borrowed from an unrelated feature — FIXED: declared as this feature's own [apps/jobs/src/scheduler/claim-correction-reminders.ts]
- [ ] [Review][Patch] Test-suite coverage gaps (pause-tier by-purpose, D30 `undetermined`, `letter_second_due`, `awaitingCheck:true`, `currentNumberHashes` non-null path, keys (1)/(7) denial on 3 of 5 routes, `matchingGrantRole` competing-grants case, weaker-than-claimed assertions, concurrency-test interleaving, contracts lockstep test) — not fixed this pass; a substantial net-new test-writing effort, left for a dedicated follow-up [packages/domain/tests/; apps/jobs/tests/; apps/api/tests/; packages/contracts/tests/]
- [x] [Review][Defer] `CalendarDateString` has no format validation — deferred, pre-existing (holiday-resolver.ts, untouched by this diff)
- [x] [Review][Defer] D26 mark-changed markers only written for family/direction runs, not staff runs — deferred, already disclosed in this story's Completion Notes and deferred-work.md
- [x] [Review][Defer] No real alerting sink (`onAlarm`) wired for this feature — deferred, pre-existing project-wide (no scheduler in boot.ts gets a real onAlarm; all default to console.warn)
- [x] [Review][Defer] Burst-detection / D26-marker retroactive catch-up after an extended sweep outage — deferred, pre-existing scheduler-downtime limitation pattern
- [x] [Review][Defer] `role="status"` regions may re-announce noisily on unrelated queue refetches — deferred, accessibility polish
- [x] [Review][Defer] No client-side size/progress feedback on screenshot upload beyond the accept attribute — deferred, UX polish

### Second-pass review: the patches themselves (2026-09-30)

Adversarial review of the 25 patches applied above (reconstructed before/after dossier, Blind Hunter + Edge Case Hunter, findings verified against source). Found that the letter-chase patch had introduced a real regression by combining two of its own sibling patches incorrectly; fixed. Everything else verified either already-correct or genuinely lower-priority.

- [x] [Review][Patch] **Regression, fixed:** the letter-chase catch-up rewrite wrote `skipped_superseded` markers for every gap day PLUS the real send, all stamped `sent_on: today` — colliding with the new `claim_correction_reminders_letter_chase_day_uq` index (added by a sibling patch in the same pass), which has no `slot_day` column. `ON CONFLICT DO NOTHING` would have silently dropped all but one row per sweep, up to and including the real send. Fixed by dropping the skip-marker writes entirely and keeping only the real "latest due day" send — matching the `staff_reminder` block's own pre-existing precedent and comment ("no `skipped_superseded` markers for staff slots: the D34 day key would collide"), which I should have followed the first time. [apps/jobs/src/scheduler/claim-correction-reminders.ts]
- [x] [Review][Patch] `isRealCalendarDate` was hand-duplicated identically in two packages — FIXED: exported from `packages/contracts/src/claims/correction-chase.ts`, the API handler now imports it instead of re-declaring it [apps/api/src/modules/claims/claims.correction-chase.handlers.ts]
- [x] [Review][Patch] The escalated-filter fix (200-row bounded scan) still has a residual gap for a Pariwar with >200 under-correction claims, with no signal — FIXED: `request.log.warn` when the scan is fully consumed while filtering [apps/api/src/modules/claims/claims.nominee-name-check.handlers.ts]
- [x] [Review][Defer] i18n key `screenshotError` added to `i18n-en.ts` with no Hindi companion — VERIFIED false alarm: the admin app has zero Hindi locale files across all 15 of its modules (English-only by design for staff UI); not a deviation.
- [x] [Review][Defer] `cycle-freeze.handlers.ts`'s new scope-guard throws after `returnToDistrictAdmin` has already run in the same transaction — VERIFIED false alarm: `closeScopeTx(scopeTx, ok=false)` in the `finally` block issues a real `ROLLBACK` (confirmed in `scope-tx.ts`), so the throw correctly reverts the whole transaction, matching how every other throw in that switch already relies on the same mechanism.
- [x] [Review][Defer] `writeCorrectionMark`'s note-required guard checks `noteCiphertext === null` — VERIFIED false alarm: the field is a required (non-optional) `string | null` on `WriteCorrectionMarkInput`; TypeScript already rejects any caller passing `undefined`.
- [ ] [Review][Patch] `CorrectionQueueRoute.tsx`'s escalated-checkbox handler explicitly preserves only the `claim` param rather than a generic merge of the current search — not fixed; low risk given the route's `validateSearch` is a closed 2-key shape, but would need revisiting if a third search param is ever added.
- [ ] [Review][Patch] No dedicated test exercises the letter-chase catch-up path across a genuine multi-day sweep gap (only single-day and no-gap cases are covered) — not fixed this pass, part of the already-deferred test-coverage bundle.

Re-verified after this pass: all 5 packages typecheck clean; full `apps/jobs` suite (42 files, 433 tests, live DB) and the domain DB-integration suite (previously 159 files/1685 tests) pass.

### Third-pass review: the committed branch (2026-09-30)

Code review of `1dbc9248..06e73db2` (the merged-base diff, ~10k lines of code/tests/docs), chunked into five groups (domain core; domain tests; API + contracts + scripts gate; jobs + i18n + mobile; admin UI + docs), three layers per group run in parallel and strictly read-only (Blind Hunter, Edge Case Hunter, Acceptance Auditor with the AI-6-5 checklist lens). 167 raw findings → 2 decision-needed (both resolved ⇒ patch), 52 patch (54 after the decisions — ⭐ ALL APPLIED 2026-10-01, BigDev: *"1"* = apply every patch), 4 defer, 23 dismissed (+ duplicates merged); the highest-severity items were re-traced against HEAD by the reviewer before triage. ⚠ Three of the patches are defects in, or gaps left by, the earlier passes' own fixes (the escalated-filter scan, the `{ crypto }` threading, the `PendingCaseCard` reset). ⛔ None routes to the Panel (every item fails §0: none changes what the Trust discloses or owes).

- [x] [Review][Decision] RESOLVED 2026-10-01 (BigDev: *"D1: 1"* — enforce `-231` D; reclassified to patch below) — A second letter can be recorded before the first is delivered — `-231` D reads "at most two letters; the second after the first's delivery", but `recordCorrectionLetter` only caps at two. Enforcing it literally blocks a second letter when the first is lost in the post (never delivered); leaving it permissive deviates from a ratified clause (a change would be a supersession, ⛔ never a re-reading). Reviewer's reading: enforce (409 `correction_letter.first_not_delivered`); a lost-letter case, if it arises, goes to the Panel as a supersession. [packages/domain/src/claim/correction-letter.ts:202]
- [x] [Review][Decision] RESOLVED 2026-10-01 (BigDev: *"D2: 1"* — `-268` §2 governs the letter chase's +13 escalation; the staff run's day-12 escalation is untouched; reclassified to patch below) — Tier (b) ("the family's part is done") stops the District Admin's letter chase but ⛔ not its day-13 escalation to every Pariwar Admin — `-268` §2 says "⛔ no letter chase" while AC2's by-purpose list exempts `escalation` without distinguishing the staff run's day-12 escalation from the letter chase's +13 step. Pick the reading; if `-268` governs, add `!familyPaused` to the letter-chase escalation only. Staff-facing only. [apps/jobs/src/scheduler/claim-correction-reminders.ts:866]
- [x] [Review][Patch] (from D1) Enforce `-231` D: refuse a second letter while the person's first letter has no recorded delivery — 409 `correction_letter.first_not_delivered` (contract + API mapping + admin copy + a test) [packages/domain/src/claim/correction-letter.ts:202] — FIXED: also the admin form shows why the second-letter form is withheld
- [x] [Review][Patch] (from D2) Gate the letter chase's +13 Pariwar Admin escalation on `!familyPaused` (tier (b)), leaving the staff run's day-12 escalation as is; add a test [apps/jobs/src/scheduler/claim-correction-reminders.ts:866]
- [x] [Review][Patch] **HIGH** — The child's pre-send re-check never passes the current number hash, so once a letter to an OLD number is delivered, a 6.20-corrected number is ⛔ never texted (every slot `skipped_superseded / letter_delivered` until day 90); the prior `{ crypto }` fix missed this call site (AC3 reset, `-271` §1) [packages/domain/src/claim/correction-reminder-record.ts:358] — FIXED: `beginCorrectionFamilySend` takes `crypto` and reads the person through `readRunPersonStates` (the sweep's own logic); ⚠ deviation: when the hash FAILS and a delivered letter is the only stop, it throws `CorrectionNumberHashUnavailableError` (the job retries) rather than permanently skip a slot on a KMS blip
- [x] [Review][Patch] **HIGH** — Hash-less `error` rows (the sweep's exhausted-row finaliser; a `decrypt_failed` that never clears) split the number epoch and trigger `reset`, wiping `foundDeadOn` and `letterDelivered` — a dead-and-lettered person is re-texted and the District Admin re-chased; exclude rows with no known number from the epoch split and from `lastAttempt` [packages/domain/src/claim/correction-chase.ts:669; packages/domain/src/claim/correction-reminder-record.ts:505; apps/jobs/src/scheduler/claim-correction-reminders.ts:517] — FIXED: `isEvidentialReminderRow` (an `error` with a null hash defines no number epoch; `no_target` still does)
- [x] [Review][Patch] **HIGH** — A past-dated letter (wrong-year typo) makes `letter_second_due`'s slot negative ⇒ `claim_correction_reminders_slot_day_check` 23514 (⛔ not absorbed by `ON CONFLICT`) ⇒ `planRun` rolls back every day to day 90: that claim gets no SMS, no DA reminder, no chase; guard `slot >= 1` and alarm [apps/jobs/src/scheduler/claim-correction-reminders.ts:877] — FIXED: `slot < 1` skipped + alarmed; and the route/domain bound the dates (next item)
- [x] [Review][Patch] Letter `posted_on` / `delivered_on` are unbounded — a future delivery date stops the person's reminders today and pushes D21 out of the run; bound both to ≤ today (IST) and ≥ the found-dead day / `day0` [packages/contracts/src/claims/correction-chase.ts:84; apps/api/src/modules/claims/claims.correction-chase.handlers.ts:287; packages/domain/src/claim/correction-letter.ts:204] — FIXED: 400 `correction_letter.date_in_future` (route, IST today) + 409 `correction_letter.posted_before_run` (domain, `< run.day0`); ⚠ the lower bound is the run's day 0, ⛔ not the found-dead day (sufficient to keep every derived slot ≥ 30)
- [x] [Review][Patch] One unreadable mobile envelope or a KMS blip throws out of `readRunPersonStates` — it stops that claim's whole run in the sweep (other nominees + staff track) and 500s the entire correction queue (`Promise.all`, up to 200 rows); catch per person / per row, alarm, degrade [packages/domain/src/claim/correction-reminder-record.ts:516; apps/api/src/modules/claims/claims.nominee-name-check.handlers.ts:490] — FIXED: per-person catch ⇒ `hashFailed` (the sweep alarms); the queue retries a failed row without crypto (⚠ a DB error still 500s — the shared scope tx is aborted)
- [x] [Review][Patch] `?escalated=true` decrypts the return note (and the chased mobiles) and writes an `admin_nominee_name_check.queue_note_read` audit line for EVERY row of the 200-row scan, including the rows it then filters out — a false audit trail and needless Tier-1 decrypts; a side effect of the prior escalated-filter fix [apps/api/src/modules/claims/claims.nominee-name-check.handlers.ts:460-535]
- [x] [Review][Patch] The queue's per-person `status` lets `reached` mask `dead`/`unreachable` (accepted day 1, carrier-rejected day 3) — no dead flag, no letter form, while the sweep chases the DA (+7..+12) and escalates (+13) for that letter; expose the dead kind separately and gate the form on `found_dead_on` [packages/domain/src/claim/correction-chase-read.ts:162; apps/admin/src/modules/correction-chase/CorrectionChasePanel.tsx:121]
- [x] [Review][Patch] The letter AND delivery forms vanish once the mark switches to staff (gated on the headline run's kind), though AC5 and the server allow a letter/delivery after a mark change; contradicts the new surface-inventory row "Letters stay recordable at any time" [apps/admin/src/modules/correction-chase/CorrectionChasePanel.tsx:79,139]
- [x] [Review][Patch] D31's `agreement_not_live` refusal is unreachable (and a missing contact record reads `not_letter_eligible`, ⛔ not `address_missing`) — `readCorrectionRecipients` empties `people` first; the test asserts only `toBeInstanceOf` (family 10) [packages/domain/src/claim/correction-letter.ts:118-131; packages/domain/tests/integration/claim/correction-chase.spec.ts:614]
- [x] [Review][Patch] After a `-271` number reset, the +13 escalation, `letter_second_due` and `hasSecond` dedupe across the WHOLE run — the second found-dead period is chased but never escalated [apps/jobs/src/scheduler/claim-correction-reminders.ts:870,882] — FIXED for the escalation and `letter_second_due` (dedupe on the current epoch); ⚠ `hasSecond` deliberately stays run-wide — the domain caps two letters per person per RUN, so a per-epoch count would remind staff to post a third letter the route refuses
- [x] [Review][Patch] D30 ("cannot remind") also suppresses the +13 escalation and `letter_second_due` (the whole letter track is inside `familyCanBeReminded`), contrary to AC2's by-purpose rule ("D30 stop only `family_sms` and `letter_chase`") [apps/jobs/src/scheduler/claim-correction-reminders.ts:775,831]
- [x] [Review][Patch] The must-act form, letter form, address reveal and screenshot button render for every queue reader (Pariwar Admin, verifier, helpline) though only district_admin/super_admin hold keys (1)/(7); the 403 — and the upload refusals `too_large` / `unsupported_media_type` / `empty` — all read "could not be saved. Try again." [apps/admin/src/modules/correction-chase/CorrectionChasePanel.tsx:59,112; CorrectionLetterForm.tsx:31; MustActChangeForm.tsx:49] — PARTIAL BY NECESSITY: the admin session carries only global grants, so the client ⛔ cannot see district keys (1)/(7); the controls stay visible and a 403 now reads "Your role cannot … — a District Admin can."; every upload/date refusal has its own copy
- [x] [Review][Patch] The delivery form silently targets the FIRST undelivered letter (unlabelled — #2's proof lands on #1), and its uncontrolled file input keeps the old file after a success so the next submit no-ops silently [apps/admin/src/modules/correction-chase/CorrectionLetterForm.tsx:50,109,115,185]
- [x] [Review][Patch] Regression of the prior `PendingCaseCard` fix: code, note and who-must-act are wiped BEFORE the server answers, so a failed Return/Deny loses the typed note; reset on success only [apps/admin/src/modules/cycle-freeze/PendingCaseCard.tsx:149]
- [x] [Review][Patch] The step-up prompt, "code sent" and the address reveal are ⛔ not announced and focus is dropped at each transition; step-up failures say "could not be saved" (family 13(d)) [apps/admin/src/modules/correction-chase/CorrectionLetterForm.tsx:68-157]
- [x] [Review][Patch] `onSettled: () => void qc.invalidateQueries(...)` ends `isPending` before the refetch lands — stale `letters` let staff double-submit into `limit_reached` / `already_delivered` [apps/admin/src/api/hooks.ts:848-863]
- [x] [Review][Patch] The staff push's `dispatch()` leg has never run in a test, yet `deferred-work.md` and the Completion Notes say "tested against a fake provider"; the sweep's staff happy path (a live shepherd's `recorded` rows, one escalation per Pariwar Admin, the push enqueue) is never driven; verify `member_id: deceased` + `alert_published` resolve the admin app's provider (family 10) [apps/jobs/src/scheduler/claim-correction-reminders.ts:445-486; apps/jobs/tests/claim-correction-reminders-live.test.ts] — FIXED: a live accepted-path test (real admin token, fake registry: one push, no other channel, row `accepted`, audit line, re-run no-op) and the sweep's staff happy path; ⚠ found: `alert_published` deep-links to a member-app route the admin app cannot open — deferred (inert until an admin client registers a token)
- [x] [Review][Patch] Policy-regression spec gaps (family 5): no FK 23503 block and no cross-tenant INSERT/UPDATE WITH CHECK (the `claim-contact-policy-regression` exemplar has both); `return_mark_uq`, `note_required_check` (a test title claims it) and the other CHECKs unasserted; the prior FIXED narrowed grants on reminders/letters and `letter_chase_day_uq` are unlocked; "ONE staff push across runs" uses the same run; constraint tests negative-only, SQLSTATE without constraint name [packages/domain/tests/integration/rls/claim-correction-chase-policy-regression.spec.ts] — FIXED (74 tests); ⚠ a cross-tenant UPDATE is unreachable through `twt_app` (the column grants refuse a `pariwar_id` write first) ⇒ pinned as the privilege refusal + the policy's `with_check` in the catalog
- [x] [Review][Patch] Four AC11b proofs are missing: the second family run's day-1 slot SENDS; a second return after a VOTE supersession; `-268`'s "a 6.20 correction does ⛔ not resume, a later `does_not_match` does (late, no burst)"; `-269`'s rewrite d10 → mismatch d11 → match d12 [packages/domain/tests/integration/claim/correction-chase.spec.ts:143,278,326,373] — FIXED; ⚠ the vote leg runs deny → appeal → reversed → return (an approving vote reaches `state_trustee_approved`, which cannot be returned)
- [x] [Review][Patch] `-268` §2's member-line leg (family mark + the family's part done ⇒ `beingChecked`) has no test, and the only test's title states the opposite rule ("⛔ never for a family case") [apps/api/tests/integration/claims/correction-chase.spec.ts:291; apps/api/src/modules/claims/claims.nominee-bank.handlers.ts:367]
- [x] [Review][Patch] The concurrency "races" are separate connections but never forced to overlap (no barrier / third-client lock hold); the DA-change-vs-second-return race asserts nothing about the run kind per ordering; "two openers" asserts only a count; cleanup errors swallowed [packages/domain/tests/integration/claim/correction-chase-concurrency.spec.ts:137,173,193,240]
- [x] [Review][Patch] Fixtures that do ⛔ not build the state their titles name: tier (a)'s passing check lands BEFORE the rewrite; the "(no check yet)" leg has a check; the shape spec stamps the rewrite after the second return, its "staff-marked" sibling is `family`, and `people.every(...)` is vacuous on `[]`; the finalise compare-and-set is never tried by a stale job after a lease takeover [packages/domain/tests/integration/claim/correction-chase.spec.ts:336,377,442; correction-chase-shape.spec.ts:63-106]
- [x] [Review][Patch] The live jobs test's day+90 sweep reads EVERY open run in the shared DB — it ends other suites' runs `day_90` and finalises their `attempting` rows; the seed cleanup runs inside a tx with `.catch(() => undefined)`, so one failure (25P02) silently rolls back all cleanup [apps/jobs/tests/claim-correction-reminders-live.test.ts:385; apps/jobs/tests/_claim-correction-seed.ts:330]
- [x] [Review][Patch] Day 0 is taken from the mark's `clock_timestamp()`, ⛔ not the return's `decided_at` (AC2); the return path passes no `now` while the change route passes `deps.clock()` — a return straddling IST midnight starts a day late [packages/domain/src/claim/correction-chase.ts:454; apps/api/src/modules/claims/claims.cycle-freeze.handlers.ts:405]
- [x] [Review][Patch] `endCorrectionRun` locks `input.claimCaseId` but updates by `runId` alone (family 12) [packages/domain/src/claim/correction-chase.ts:348]
- [x] [Review][Patch] The address GET calls `assertCorrectionLetterAllowed` without `{ crypto }` — a third call site the prior fix missed [apps/api/src/modules/claims/claims.correction-chase.handlers.ts:341]
- [x] [Review][Patch] Held (6.19c) seam: a held switch to `staff` leaves an open `family` run of the live return open, and the child never checks the latest mark is `family`; the hold hook is an optional per-call parameter defaulting fail-open — unreachable until 6.19c [packages/domain/src/claim/correction-chase.ts:393,452-468; packages/domain/src/claim/correction-reminder-record.ts:332]
- [x] [Review][Patch] `claim_correction_reminders_letter_chase_day_uq` has no `purpose` — on a catch-up day a DA who is also a Pariwar Admin (or two `staff:unassigned`) silently loses the escalation row [packages/domain/migrations/0128_claim-correction-reminder.sql:79]
- [x] [Review][Patch] `listAdminsByRole` with no scope returns any-scope `pariwar_admin` grants; its doc says "the role's Pariwar-wide grant" [packages/domain/src/claim/admin-directory.ts:49]
- [x] [Review][Patch] `matchingGrantRole`'s comment gives district > pariwar > state; the code (correctly) sorts district > state > pariwar; no test pins the order [packages/domain/src/rbac/matching-grant.ts:8]
- [x] [Review][Patch] The open-run cap re-selects the same oldest 1000 runs daily (newer runs starve) while the alarm says "the next tick picks them up"; the D26 marker scan's cap is silent [apps/jobs/src/scheduler/claim-correction-reminders.ts:554-627]
- [x] [Review][Patch] The exhausted-row finaliser is a cross-tenant WRITE on the BYPASSRLS pool with ⛔ no DELIBERATE doc block (the header calls the bypass a "read") — family 9 [apps/jobs/src/scheduler/claim-correction-reminders.ts:517]
- [x] [Review][Patch] The number hash is computed outside the transient `try` — a KMS/HMAC throw escapes unclassified and the eventual `error` carries no cause [apps/jobs/src/scheduler/claim-correction-reminders.ts:330]
- [x] [Review][Patch] Non-`NOT_FOUND` Secret Manager faults (PERMISSION_DENIED, INVALID_ARGUMENT) are classified transient ⇒ no alarm until the next day's finaliser [apps/jobs/src/scheduler/claim-correction-reminders.ts:190]
- [x] [Review][Patch] A redelivered child sends YESTERDAY's slot on a later day (no stale `sentOn` check) ⇒ two texts that day [apps/jobs/src/scheduler/claim-correction-reminders.ts:274]
- [x] [Review][Patch] The queue headline can show an earlier return's still-open run's day count; `nextReminderOn` ignores the `resubmitted` pause [packages/domain/src/claim/correction-chase-read.ts:114-129]
- [x] [Review][Patch] Admin display polish: an ended run's day count keeps growing ("day 140 of 90"); `must_act_set_at` renders raw UTC with a dangling separator; "escalated to me" is offered to District Admins [apps/admin/src/modules/correction-chase/CorrectionChasePanel.tsx:94,108; CorrectionQueueRoute.tsx:83] — FIXED: an ended run reads "started on <day0> · ended on <date>" (new `ended_on` on the run summary: domain → contract → API → admin)
- [x] [Review][Patch] "View the screenshot" calls `window.open` after an `await` (popup-blocked, undetectable with `noopener`); the precedent `DeathCertificateReviewControl.tsx` renders the signed URL as a link (family 13(c)) [apps/admin/src/modules/correction-chase/CorrectionChasePanel.tsx:45]
- [x] [Review][Patch] A revealed Tier-1 address stays on screen indefinitely; the header's "dropped when the form closes" is false (the form never closes) [apps/admin/src/modules/correction-chase/CorrectionLetterForm.tsx:4-7,44]
- [x] [Review][Patch] "Show the address" / "Send the code" have no in-flight guard — a double-click is two decrypts + two audit lines, or two OTP SMSes [apps/admin/src/modules/correction-chase/CorrectionLetterForm.tsx:128,141]
- [x] [Review][Patch] A `?claim=` that is not in the rendered list (filtered, beyond the first 50, resubmitted) fails silently — no hint [apps/admin/src/routes/CorrectionQueueRoute.tsx:59-66]
- [x] [Review][Patch] Closure wording: the 6.18 nav item is recorded "✅ BUILT", but the link only appears inside a `/p/<pariwarId>/` URL (`/` lands on `/audit/integrity`); record it as "linked inside a Pariwar context"; the label is hard-coded beside an unused `queue.nav` key (family 10) [apps/admin/src/routes/RootLayout.tsx:72; _bmad-output/implementation-artifacts/deferred-work.md § 6.20 CHUNKS 1+2]
- [x] [Review][Patch] Accessibility lows (family 13(d)): the chase region is named "Who must act — <ref>"; a letter's own state is ⛔ not in a status region; the mobile D28 line is announced on Android only (the same file announces "saved" on iOS) [apps/admin/src/modules/correction-chase/CorrectionChasePanel.tsx:55,81; apps/mobile/app/(claim)/nominee-review.tsx:470]
- [x] [Review][Patch] The contracts header says every vocabulary is "pinned in lockstep by its test" — no such test exists (already deferred); correct the comment (family 10) [packages/contracts/src/claims/correction-chase.ts:10]
- [x] [Review][Patch] AC9b's "no log" leg is never asserted — the API test app captures no request-logger output [apps/api/tests/integration/claims/correction-chase.spec.ts]
- [x] [Review][Patch] `letterId` from the path goes un-lower-cased into the storage key and the delivery/screenshot audit lines [apps/api/src/modules/claims/claims.correction-chase.handlers.ts:292,324,359]
- [x] [Review][Patch] The delivery screenshot is orphaned when `openScopeTx` fails — it runs outside the `try` whose `catch` deletes it [apps/api/src/modules/claims/claims.correction-chase.handlers.ts:293]
- [x] [Review][Patch] The step-up-gated address GET (and the screenshot-URL GET) set no `Cache-Control: no-store` — verify no global plugin already does [apps/api/src/modules/claims/claims.correction-chase.handlers.ts:347] — FIXED: no global hook set it; added on both responses
- [x] [Review][Patch] The DLT lockstep renders both variables with the same token (a swapped `{reference}`/`{helpline}` passes); the "no deadline threat" check is English-only (`\b` fails on Devanagari; the Hindi is the unreviewed half) [apps/jobs/tests/claim-correction-sms-templates.test.ts:31,51]
- [x] [Review][Patch] Test-quality bundle (beyond the prior deferred bundle): API IDOR on delivery/screenshot/address with a foreign `letterId` or claim, one exact status instead of `[403, 404]`; the escalated filter and its 200-row warning; the upload edge cases; "the RETURN writes its mark … IN THE SAME TRANSACTION" never tests atomicity; the schedule 0/89/90 test cannot exercise its filter; the D30 "staff rows unaffected" test calls a raw insert; catch-up boundaries (today is a slot with older misses; day 89/90); the lease-boundary ±1 s flake; the address test's unordered `row[0]`; §5c's `people.length > 0` [apps/api/tests/integration/claims/*.spec.ts; packages/domain/tests/**]
- [x] [Review][Patch] The handler comment says `delivered_on` is "captured in either multipart position"; a trailing field after the file is timing-dependent — state "field before file" or read via `request.parts()` [apps/api/src/modules/claims/claims.correction-chase.handlers.ts:284] — FIXED (comment: field before file; ⛔ not switched to `request.parts()`)
- [x] [Review][Patch] The Drizzle schema lacks migration 0129's `claim_correction_letters_delivery_all_or_nothing_check` (a later `drizzle-kit generate` would drop it) [packages/domain/src/schema/claim_correction_chase.ts:290]
- [x] [Review][Defer] Write handlers hold two pool connections (the pre-handler's scope tx + their own `openScopeTx`), and the delivery route keeps the first open across the whole upload [apps/api/src/modules/claims/claims.correction-chase.handlers.ts:253-294] — deferred, pre-existing (the established own-`openScopeTx` route pattern)
- [x] [Review][Defer] The DLT template-id and per-Pariwar helpline keys contain dots, which GCP Secret Manager ids do not allow — UNVERIFIED whether deployment maps the names [apps/jobs/src/scheduler/claim-correction-sms-templates.ts:43-73] — deferred, pre-existing (`sms-dlt-registry.ts` convention); a go-live check
- [x] [Review][Defer] No composite FK ties `claim_case_id` / `pariwar_id` / `return_decision_id` together, and nothing at the DB stops a delivery being overwritten or an ended run re-opened through `twt_app` [packages/domain/migrations/0126-0129] — deferred, pre-existing (writers + RLS are the project-wide enforcement layer)
- [x] [Review][Defer] The staff push dispatches as `alert_published`, whose deep link is a member-app announcements route the admin app cannot open (found while applying the patches) [apps/jobs/src/scheduler/claim-correction-reminders.ts] — deferred: inert until an admin client registers a token; needs a staff alert category (channels + contracts)
- [x] [Review][Defer] The `rejected_unreachable` burst alarm counts across all tenants and checks only yesterday [apps/jobs/src/scheduler/claim-correction-reminders.ts:538] — deferred, alarm tuning with no production volume to tune against

**Applied and verified (2026-10-01).** All 54 patches applied by five parallel owners on disjoint files (domain src; API + contracts; jobs; admin + mobile + docs; domain integration tests), then integrated by the lead (+ `ended_on` on the run summary). Verification: `turbo run typecheck` 20/20; `DATABASE_URL=…:5433 pnpm ci:local` — every job green except two: ⚠ `domain-invariants` (the forced-pagination-clamp gate) flagged `listAdminsByRole`'s `.limit(ADMIN_DIRECTORY_LIMIT)` — ⚠ **already failing at `06e73db2`** (the earlier patch pass verified with typecheck + suites, ⛔ not `ci:local`); fixed to the literal bound, the gate re-run green; and one `integration-tests` failure — a `deadlock detected` in 6.20's `nominee-determination.spec.ts` D17 (a `readDeathCertificateSnapshot` SELECT), which passed on an isolated re-run and in a full domain re-run (303 files / 4037 tests green) ⇒ recorded as a shared-DB flake, ⛔ not attributed. ⚠ *Corrected in the fourth pass:* a lock-order deadlock this story's FK introduced — see *Fourth pass applied and verified*. Turbo stopped at that failure, so the remaining integration packages were re-run separately: events, queue, niyamavali-engine, validity-service, channels, jobs (42 files), api (142 files) — all green. Migration 0130 applied to twt-test-pg. ⚠ Found while applying: the old jobs seed cleanup ran `DELETE FROM claims` under `session_replication_role = 'replica'`, which also disables FK cascades — earlier runs left orphan open `claim_correction_runs` in the shared DB; the new `pariwarAllowlist` keeps the jobs suite off them (⛔ not purged).

**Closed `done` 2026-10-01 (BigDev: *"done"*).** ⚠ Nine earlier-pass `[Review][Patch]` items remain ⛔ NOT ADDRESSED (unchecked above, by design — ⛔ not relabelled as fixed): the KMS-before-conflict-check ordering, the unbounded exhausted-row UPDATE (now allowlist-scoped in tests + a DELIBERATE block, still un-LIMITed), the locale-vs-Secret-Manager classification, the `RunPersonState.state` naming collision, the UUIDv5 direct test, per-device push outcome, the residual test-coverage bundle (keys (1)/(7) denial on three routes, D30 `undetermined`, `awaitingCheck: true`, the contracts lockstep test), the escalated-checkbox param merge, and a multi-day letter-chase gap test. Accepted as recorded follow-ups; carried in `deferred-work.md` § *code review of 6-19b … third pass*.

### Fourth pass: adversarial review of the applied patches (2026-10-01)

Review of `06e73db2..8e116291` (the 54 patches, ~7.2k diff lines) in the same five groups, Blind Hunter + Edge Case Hunter per group, run in parallel and read-only. 121 raw findings → 0 decision-needed, 25 patch (⭐ ALL APPLIED 2026-10-01, BigDev: *"1"*), 2 defer, ~30 dismissed (+ duplicates merged; the lead re-traced the disputed items). ⭐ No HIGH survived verification: the two "high" claims about an `ON CONFLICT` target and the escalated filter disagreeing were false (every insert is untargeted; `escalated` counts escalation rows and needs ⛔ no crypto). ⚠ The pattern this pass found is **I6's per-person catch made a hash failure SILENT where it used to fail closed**, plus a cluster of admin step-up / delivery UX seams and test fixtures that do not build what their titles say.

- [x] [Review][Patch] I6 fails OPEN outside the jobs: `assertCorrectionLetterAllowed` (record + address reveal) ignores `hashFailed` and decides on the OLD number's epoch; the read model drops it; the API queue's retry-without-crypto can no longer fire for a hash fault and its catch now swallows DB errors (logs only `err.name`, then masks the SQLSTATE with 25P02) — throw a retryable refusal in the letter precondition, surface/log `hashFailed` in the summary, rethrow pg errors in the queue catch [packages/domain/src/claim/correction-letter.ts; packages/domain/src/claim/correction-chase-read.ts; apps/api/src/modules/claims/claims.nominee-name-check.handlers.ts] — FIXED: `CorrectionNumberUnverifiedError` ⇒ 503 `correction_letter.number_unverified` on record + address; summary `numberUnverified` (logged, ⛔ not in the DTO); the queue rethrows database errors (`isDatabaseError` walks `.cause`)
- [x] [Review][Patch] `-231` D is enforced as "#1 has a delivery" but ⛔ not "#2 is posted after it" — a second letter back-dated before the first's `delivered_on` is accepted and silences D21 [packages/domain/src/claim/correction-letter.ts:217] — FIXED: 409 `correction_letter.posted_before_first_delivery`
- [x] [Review][Patch] `posted_before_run` compares against the LATEST family run's `day0` — a real letter posted during an earlier family run of the same return (family → staff → family) is refused; compare against the live return's IST date; and check `limit_reached` before the date [packages/domain/src/claim/correction-letter.ts:206] — FIXED: keys on the return's IST date; order limit → first_not_delivered → posted_before_first_delivery → posted_before_run
- [x] [Review][Patch] The delivery's "Saved." never renders and its file reset never runs: `onSettled` now awaits the refetch, which removes the delivered letter and unmounts its `LetterDeliveryForm` before `isSuccess`/`onSuccess` (TanStack drops per-call callbacks for an unmounted observer); the reset test passes only because its harness never refetches — lift the delivery mutation/confirmation to the parent and test through a refetching panel [apps/admin/src/modules/correction-chase/CorrectionLetterForm.tsx; apps/admin/tests/correction-chase-forms.test.tsx] — FIXED: the delivery mutation + "Delivery recorded for letter #n." live in `CorrectionLetterForm` (`mutateAsync`), tested through a refetching panel (verified to fail against the old gating)
- [x] [Review][Patch] The address visibility window compares the server's `elevatedUntil` with the browser clock (a fast clock ⇒ a 0 ms timer, the address vanishes on render, every retry another decrypt + audit line) and the TTL ref is never recomputed per reveal — use a client-measured window with a floor [apps/admin/src/modules/correction-chase/CorrectionLetterForm.tsx:236] — FIXED: the rest of 5 min since this form's verify (client-measured), floor 30 s, recomputed per reveal
- [x] [Review][Patch] Step-up seams: "Send a new code" is advised but no send control renders in the `sent` state; a refusal after a successful verify leaves the form asking for the used code; the address is both `role="status"` and focused (PII read twice); the first step-up prompt mounts with its text (⛔ announced); focus drops to `<body>` when the focused control is swapped (link, Hide, the timer) [apps/admin/src/modules/correction-chase/CorrectionLetterForm.tsx; CorrectionChasePanel.tsx]
- [x] [Review][Patch] The screenshot fetch maps a 403 to "Try again" (the header claims every form maps 403); a 413/415 without a JSON body also falls to "Try again"; the link's TTL timer trusts `expires_in_seconds` unvalidated [apps/admin/src/modules/correction-chase/CorrectionChasePanel.tsx:74]
- [x] [Review][Patch] Under D30 (`cannot_remind`) the read model builds ⛔ no people, so the letters and their delivery forms vanish while the server still accepts a delivery ("letters stay recordable at any time") [packages/domain/src/claim/correction-chase-read.ts; apps/admin/src/modules/correction-chase/CorrectionChasePanel.tsx:155]
- [x] [Review][Patch] The sweep can now run up to 20,000 runs per tick but keeps pg-boss's default 15-minute expiry — a long tick is failed and retried while still running (overlapping sweeps); set `expireInSeconds` / a wall-clock budget with an alarm [apps/jobs/src/scheduler/claim-correction-reminders.ts] — FIXED: `expireInSeconds` 90 min on the queue + schedule, a 45-min wall-clock budget that stops paging and alarms
- [x] [Review][Patch] The stale-slot path overwrites its own `attempting` row as `skipped_superseded` — it loses the transient detail (an `api_unavailable` that may have been sent), hides the slot from the catch-up, and alarms nothing; finalise it like the exhausted-row finaliser (`error`, `first_detail` kept, alarm) [apps/jobs/src/scheduler/claim-correction-reminders.ts:312] — FIXED: `expireOwnCorrectionReminder` (`error`, `first_detail` kept, `exhausted:crossed_midnight`) + alarm
- [x] [Review][Patch] `classifySecretManagerFault` treats only DEADLINE_EXCEEDED/UNAVAILABLE + five socket codes as transient — RESOURCE_EXHAUSTED, ABORTED, INTERNAL, CANCELLED, `ENOTFOUND`/`ENETUNREACH`, and a wrapped `err.cause` become a FINAL `error` that loses the day's slot; keep only known config codes final [apps/jobs/src/scheduler/contribution-providers.ts] — FIXED: final only for codes 3/7/9/12/16; ⚠ trade-off recorded in code: a code-less config fault now retries and is alarmed by the next morning's finaliser
- [x] [Review][Patch] The new sweep/child control paths have no test: keyset paging past page 1, the `maxRuns` bound + probe, the `hashFailed` alarm, `CorrectionNumberHashUnavailableError` (domain throw + jobs transient), the post-commit `hash_failed:tier1` [apps/jobs/tests/**; packages/domain/tests/**]
- [x] [Review][Patch] Jobs lows: epoch dedup `slotDay >= foundDeadSlot` lets an old epoch's +13 escalation on the same slot suppress the new one (use `>`); the `slot < 1` guard re-alarms daily; the D26 full-batch alarm fires at exactly `limit` (use a `limit + 1` probe); the keyset cursor round-trips `opened_at::text` (compare server-side); D30's `tracked` includes people no longer recipients; an empty `pariwarAllowlist` silently disables the sweep [apps/jobs/src/scheduler/claim-correction-reminders.ts] — FIXED; ⚠ the `slot < 1` guard writes a `skipped_superseded` marker (detail `delivery_before_run`) so it alarms once; D30's `tracked` excludes `not_a_recipient` skips, the rest recorded as a limitation in a comment
- [x] [Review][Patch] Domain lows: `nextReminderOn` still advertised under tier (b) / D30 for family runs; `.limit(50)` vs `ADMIN_DIRECTORY_LIMIT` pinned only by a comment (type-pin the literal) [packages/domain/src/claim/correction-chase-read.ts:161; packages/domain/src/claim/admin-directory.ts:61] — FIXED: `correctionNextReminderOn`; the bound pinned by a typed literal + a source-scan unit test (the gate admits only a bare literal)
- [x] [Review][Patch] Concurrency spec: on a failed overlap `overlapped()` rethrows without awaiting the released racers (they commit after cleanup) and a racer that fails before the lock surfaces only as a 10 s "never queued"; the "fails loudly" cleanup ⛔ counts members / nominee versions / consents the fixtures commit [packages/domain/tests/integration/claim/correction-chase-concurrency.spec.ts]
- [x] [Review][Patch] Domain fixtures that do ⛔ not build their title's state: the shape spec's first return keeps its check at T (after the return); `backdateTimeline` moves `decided_at` after the run opened (day 0 ≠ the return's IST date 00:00–03:00 IST); the two "after resubmission / after a vote" fixtures stamp the check before the rewrite (verify resubmitted); `-268`'s "once, `late`" echoes its own `late: true` and its 6.20 leg is short-circuited by tier (b); the D30 test dropped the staff-row leg; shift helpers assert no `rowCount`; `replica` restored without try/finally; `beginFamily` uses the wall clock [packages/domain/tests/integration/claim/correction-chase.spec.ts; correction-chase-shape.spec.ts]
- [x] [Review][Patch] Policy / unit test lows: the column-grant loops skip the PK columns and the runs loop matches a bare 42501; the cascade test has no pre-count; the `pg_policies` lookup is unqualified; the "open run" CHECK's positive leg is an ended run; `lastEvidentialAttempt`'s reversed test has one evidential row (cannot fail) [packages/domain/tests/integration/rls/claim-correction-chase-policy-regression.spec.ts; packages/domain/tests/claim/correction-person-state.test.ts]
- [x] [Review][Patch] API tests: the escalated test claims "decrypts only the returned rows" but counts audit lines (spy the decrypt); future-date tests compute today before `inject` (use +2 days); AC9b's log leg has no invalid-payload / forced-500 sentinel and slices logs before the completion line flushes; the back-dated `day0` leaves `decided_at` at today (impossible state — back-date the return, needed once `posted_before_run` keys on the return date) [apps/api/tests/integration/claims/correction-chase.spec.ts]
- [x] [Review][Patch] The atomicity test's `CREATE/DROP TRIGGER` on the shared `claim_correction_marks` has no `lock_timeout` and no sweep of a leaked trigger [apps/api/tests/integration/claims/cycle-freeze.spec.ts]
- [x] [Review][Patch] `buildServer`'s test-only `logStream` switches to trace level with no guard — refuse it outside `nodeEnv === 'test'` [apps/api/src/server.ts] — FIXED (throws outside `nodeEnv === 'test'`)
- [x] [Review][Patch] Jobs test hygiene: `afterAll` skips `pool.end()` when the (now throwing) cleanup throws; the leftover check covers only claims/runs; the Hindi deny-list "liveness" test is tautological [apps/jobs/tests/claim-correction-reminders-live.test.ts; apps/jobs/tests/_claim-correction-seed.ts; apps/jobs/tests/claim-correction-sms-templates.test.ts]
- [x] [Review][Patch] Admin lows: the in-flight guards read render-time state (use a ref); `?claim=` lower-cases only one side; an OPEN run past day 90 still reads "day 95 of 90"; `istToday` relies on `en-CA` formatting and its test checks only the format (pin the 18:30 UTC boundary); the "no trailing ·" test cannot fail against the old code; ⛔ no `CycleFreezePage`-level test of the `opts` forwarding; native `required` makes the custom messages unreachable (`noValidate`); test state (`search`, the `window.open` spy) not reset in `afterEach` [apps/admin/src/**; apps/admin/tests/**]
- [x] [Review][Patch] Mobile: `tRef.current = t` is written during render — move it to a layout effect [apps/mobile/app/(claim)/nominee-review.tsx]
- [x] [Review][Patch] The delivery route's header claims the orphan screenshot is deleted on "ANY failure before the commit" — `closeScopeTx` swallows a failed COMMIT (201 + audit + orphan); correct the comment (the swallow itself is deferred, below) [apps/api/src/modules/claims/claims.correction-chase.handlers.ts]
- [x] [Review][Patch] The return path's `now: deps.clock()` comment says it does not drive day 0 — state what it does drive (`set_at`) [apps/api/src/modules/claims/claims.cycle-freeze.handlers.ts] — FIXED, ⚠ differently: on the return path `now` drives NOTHING (`set_at` is the column default; day 0 comes from the return) — the comment now says so
- [x] [Review][Defer] I4 hashes the claimant's number (KMS decrypt + HMAC) inside the trustee advisory lock on every child send, with ⛔ no timeout found in `packages/domain/src/encryption` or `apps/jobs/src` — a KMS stall holds the claim's lock (UNVERIFIED: the KMS client's own default timeout) [packages/domain/src/claim/correction-reminder-record.ts:390] — deferred, needs the KMS client's timeout confirmed first
- [x] [Review][Defer] `closeScopeTx` swallows a failed COMMIT, so a write route returns 201 and audits a change that was never stored [apps/api/src/modules/multi-tenant/scope-tx.ts:58] — deferred, pre-existing project-wide pattern (every route)


**Fourth pass applied and verified (2026-10-01).** Five parallel owners again (J1–J8 interfaces); `turbo run typecheck` 20/20; the correction-chase live specs green on first run (domain 542, jobs 117). `ci:local` (live DB): every job green except `integration-tests` — a **`deadlock detected`** that now reproduced on EVERY full domain run (3/3). ⭐ Root cause (from the Postgres log): 0128's FK `claim_correction_reminders.recipient_version_id → member_nominee_versions` means 6.20's `TRUNCATE member_nominee_versions CASCADE` test (parent lock first, then the child) now cascades into our table, while this story's policy spec INSERTs a reminder in a parallel fork (child lock first, then the parent's FK check) ⇒ lock-order deadlock. ⚠ The round-1 "flake" (v3.1) was very likely the same class — it was ⛔ not a flake. Fixed in the 6.20 spec: lock the FK children first (the INSERT's order), then TRUNCATE. Domain suite then green 3/3 (304 files / 4056 tests), every other integration package green (api 143 files, jobs 43, …).

### Fifth pass: re-review of the four review commits (2026-10-01)

Review of `06e73db2..f0896934` (the third- and fourth-pass patches together, ~10k diff lines), Blind Hunter + Edge Case Hunter per group, parallel and read-only (the five Edge layers hit a usage limit and were re-run; all ten completed). 137 raw findings → 0 decision-needed, 24 patch (⭐ ALL APPLIED 2026-10-01, BigDev: *"1"*), 3 defer, ~35 dismissed (+ duplicates merged). ⭐ The lead re-traced the two headline items. ⚠ The pattern: **round 4's J5 (`posted_before_run` keyed on the return date) made a second-letter guard and the queue's letter scope wrong for a family → staff → family claim** — the sequence J5 was written to support — and **the TRUNCATE lock-order fix moved the deadlock rather than removing it**.

- [x] [Review][Patch] **J5 side effect — the second-letter reminder is lost:** a letter posted during an earlier family run is now accepted and attached to the latest run; its delivery + 30 falls before that run's day 1, so the sweep writes the `delivery_before_run` marker, alarms "check the recorded delivery date" about a correct date, and ⛔ never reminds the District Admin; the guard also rejects slot 0, which the table allows. Bound at `slot < 0`; a delivery on/after the return date ⇒ a `late` reminder at today's slot; the marker + alarm only for a delivery before the return [apps/jobs/src/scheduler/claim-correction-reminders.ts:1171] — FIXED (K2): `slot >= 0` written as is; a delivery on/after the return date with a negative slot ⇒ a `late` `recorded` reminder at today's slot; the marker + one alarm only for a delivery before the return
- [x] [Review][Patch] **J5 side effect — earlier runs' letters vanish from the queue:** the read model reads only the latest family/direction run's letters, so after family → staff → family an undelivered run-1 letter (and its delivery form) disappears while the server still accepts its delivery (and the per-run cap restarts, inviting a duplicate record); also a person who left the recipient set (W6 (b)) loses their letters outside D30 — read every family/direction run of the live return and union the record-derived people for any letter's person key [packages/domain/src/claim/correction-chase-read.ts:285-297] — FIXED (K1): `readReturnFamilyLetters` lists every family/direction run's letters of the return; people ∪ record-derived for any letter's key; ⭐ plus a per-letter `in_current_run` (domain → contract (optional) → API → admin) so the admin's per-run letter rules count the latest run's letters exactly (the owner's posting-order guess is now only a fallback)
- [x] [Review][Patch] **The TRUNCATE lock-order fix moves the deadlock:** pre-locking the FK children one statement at a time (alphabetical, held to rollback) deadlocks with any parallel test that has touched the parent and then a child (e.g. `seedNomineeNameCheck`, ~113 call sites) and with `claim_contacts` → `claim_contact_nominees` inserts — take the parent + children together `NOWAIT` in a savepoint and retry on 55P03; apply the same to `claim-death-certificate-policy-regression.spec.ts`'s TRUNCATE (the likelier source of the round-1 D17 deadlock); correct the fourth-pass closure wording [packages/domain/tests/integration/rls/nominee-declaration-history-policy-regression.spec.ts:513; claim-death-certificate-policy-regression.spec.ts:401] — FIXED: `lockTruncateSetNowait` (`_helpers.ts`) — one `LOCK TABLE <parent + recursive FK set> … NOWAIT` in a savepoint, retried on 55P03; both TRUNCATE specs use it
- [x] [Review][Patch] A failed queue refetch replaces the whole list with "could not be loaded" (`isError` stays true with data) — the save confirmation never shows (staff retry into `already_delivered` / `limit_reached`) and a window-focus refetch wipes a revealed address and typed fields; render the list whenever data exists and show a refetch error as a banner; drop the dead per-form reset [apps/admin/src/routes/CorrectionQueueRoute.tsx:121; apps/admin/src/modules/correction-chase/CorrectionLetterForm.tsx:111] — FIXED; ⚠ the per-form file reset is KEPT (with the list surviving a failed refetch it does real work)
- [x] [Review][Patch] The J1 503 path leaves ⛔ no server trace — a persistent envelope fault blocks one person's letter and address reveal indefinitely with only a 503 in the access log; warn (ids only) before the 503 [apps/api/src/modules/claims/claims.correction-chase.handlers.ts:55]
- [x] [Review][Patch] Alarm volume: the sweep's `hashFailed` alarm fires per person per run per tick and the child's hash-unavailable alarm on every retry — aggregate per tick (counts + a few ids); alarm the child on its first or final attempt only [apps/jobs/src/scheduler/claim-correction-reminders.ts:378,1004]
- [x] [Review][Patch] `UNAUTHENTICATED` (16) is classified FINAL, but a metadata-server / token-refresh blip at 10:00 would end every in-flight family SMS for the day — make it transient [apps/jobs/src/scheduler/contribution-providers.ts]
- [x] [Review][Patch] The sweep budget is checked only between runs; `planRun` waits on the trustee lock (and hashes) with ⛔ no `lock_timeout` / `statement_timeout`, so the header's "⛔ never expired and retried while still running" overclaims — set `SET LOCAL lock_timeout`/`statement_timeout` in the plan's scope tx (skip + alarm the run on timeout) or qualify the claim [apps/jobs/src/scheduler/claim-correction-reminders.ts] — FIXED: `lock_timeout 30s` / `statement_timeout 120s` in the plan's scope tx; a timed-out run is skipped (aggregated alarm); the header now says KMS work is still unbounded
- [x] [Review][Patch] `skipCorrectionReminder`'s own-`attempting` branch still overwrites a transient attempt's detail as `skipped_superseded` (a retry whose re-check now fails — mark switched, letter delivered, tier (b)) — the J8 defect on another path; expire + alarm when `detail` is non-null [packages/domain/src/claim/correction-reminder-record.ts:190] — FIXED (K4): expires with `exhausted:recheck_<reason>` + `expiredAttempt: true` ⇒ jobs alarm
- [x] [Review][Patch] `pariwarAllowlist` (test-only) silently narrows every cross-tenant statement if ever set non-empty in production — refuse it when `NODE_ENV === 'production'` [apps/jobs/src/scheduler/claim-correction-reminders.ts]
- [x] [Review][Patch] Admin step-up / address lifecycle: the address and step-up state outlive a hidden record form (refetch flips `canRecord`/`atLimit`/`waitingForFirstDelivery`; a reveal resolving after a save); the address window is per form while the elevation is per session; `setTimeout` does not count a sleeping laptop (clear on `visibilitychange` past a deadline); a failed reveal says "could not be saved"; `sendCode` maps 403/429 to "Try again"; 401/404 read "Try again" [apps/admin/src/modules/correction-chase/CorrectionLetterForm.tsx; CorrectionChasePanel.tsx]
- [x] [Review][Patch] Admin focus + validation: focus drops to `<body>` after every successful letter save and delivery; `noValidate` cancelled the `max`/`min` date bounds — add explicit client checks (future posted/delivered date, delivery before posting) before the 10 MB upload [apps/admin/src/modules/correction-chase/CorrectionLetterForm.tsx]
- [x] [Review][Patch] Admin copy/labels: under D30 every nominee is "Nominee" (rank derivable when the declaration is effective — carry it from the domain); `not_letter_eligible` copy is wrong for D30 `undetermined`; "a District Admin can" is wrong for an out-of-district District Admin; `canRecord` defaults to `true` (fail-open — make it required); the shared `deliveringRef` guard returns silently; a few `role="status"` regions mount with their text; the screenshot link expires silently; the cycle-freeze test pins a raw code as copy [apps/admin/src/modules/correction-chase/**; packages/domain/src/claim/correction-chase-read.ts:143; apps/admin/tests/cycle-freeze-page.test.tsx]
- [x] [Review][Patch] Make `crypto` required on `assertCorrectionLetterAllowed` / `recordCorrectionLetter` (every production caller passes it; omission silently disables the AC3 reset and J1's fail-closed) [packages/domain/src/claim/correction-letter.ts:163,247]
- [x] [Review][Patch] `correctionNextReminderOn` still advertises a date for a `family` run whose latest mark is no longer `family` (the child skips it `not_a_family_mark`) [packages/domain/src/claim/correction-chase-read.ts]
- [x] [Review][Patch] `isDatabaseError` treats `E2BIG` as a SQLSTATE (comment says errnos are excluded) — exclude `E[0-9A-Z]{4}`; the escalated scan has ⛔ no per-row catch and the "never a 500 for the whole queue" comment overclaims [apps/api/src/modules/claims/claims.nominee-name-check.handlers.ts:217-337]
- [x] [Review][Patch] Concurrency spec: racers and holder set ⛔ no `lock_timeout`/`statement_timeout` and `allSettled` is unbounded; the "fails loudly" count skips marks/reminders/letters/bank accounts/determinations/decisions/contact-nominees; it commits returned claims into the shared `PARIWAR_A`, which can take the `limit: 1` slot in the return-loop queue tests — use a dedicated Pariwar; the opener test uses a fixed `2026-11-01` [packages/domain/tests/integration/claim/correction-chase-concurrency.spec.ts]
- [x] [Review][Patch] Domain fixture/test lows: an I4 composition control (a 6.20 correction that KEEPS the number ⇒ still `letter_delivered`); letters delivered at day 0 + 5 while the child runs at slot 2/3; `beginFamily` uses the first run's day 0 for another run; the shape spec swallows a replica-restore failure on the success path; `-268`'s catch-up leg hand-builds the recorded set (retitle); the J7 staff leg asserts no concrete date; an unbranded member id; `ended_on` untested in domain/API; the admin-directory source-regex test [packages/domain/tests/**]
- [x] [Review][Patch] API test lows: AC9b invalid-payload legs put the sentinel in a field that PASSES validation (the zod issue IS echoed in the 400 body — make the PII field fail); the J1 queue-log check `toContain(claimCaseId)` matches the request URL (cannot fail); the atomicity test cannot tell its trigger fired (assert the RAISE text); the back-dated fixture leaves the checks' `accountUpdatedAt` stamps (every check reads stale); the escalation fixture's `sentOn` is today instead of day 0 + 14 [apps/api/tests/integration/claims/*.spec.ts]
- [x] [Review][Patch] Jobs test lows: the expiry is asserted only as call arguments (read `pgboss.job.expire_seconds` back live); the live paging test can split day 0 across IST midnight; the "server-side cursor" test matches SQL text; the I4 jobs test plants the number change raw (note it or go through the 6.20 writer); the seed cleanup's `DELETE FROM claims` runs outside the collect-then-throw and `members` are never counted [apps/jobs/tests/**]
- [x] [Review][Patch] Jobs lows: `maxRuns` below `runLimit` is silently raised (clamp the page down instead); a deleted cursor run ends the scan as "exhausted" silently (alarm when the cursor row is missing) [apps/jobs/src/scheduler/claim-correction-reminders.ts]
- [x] [Review][Patch] The return path's `now: deps.clock()` is documented as unused — remove it (or type it out of the return-mark input) so a later writer change cannot silently split day 0 from `decided_at` [apps/api/src/modules/claims/claims.cycle-freeze.handlers.ts] — FIXED (K5): a compile-time union (`isReturnMark: true ⇒ now?: never`), ⛔ no runtime throw
- [x] [Review][Patch] The admin-directory `truncated` flag is true at exactly 50 — fetch 51 (a literal), return 50, `truncated = rows.length > 50` [packages/domain/src/claim/admin-directory.ts]
- [x] [Review][Patch] The DLT/IST admin `max` test still checks only the date format — assert `max === istToday()` under a mocked clock either side of 18:30 UTC [apps/admin/tests/correction-chase-forms.test.tsx]
- [x] [Review][Defer] When the time budget or run bound stops a tick, the next tick restarts from the OLDEST run, so the newest runs can starve until older runs end (a resume cursor or "least recently swept" order) [apps/jobs/src/scheduler/claim-correction-reminders.ts] — deferred: alarmed, and only reachable at ~20k open runs / a 45-minute tick
- [x] [Review][Defer] The D26 marker scan pages oldest-first with no cursor, so a backlog larger than its batch can let the newest mark changes leave the 36-hour window unmarked (now alarmed) [apps/jobs/src/scheduler/claim-correction-reminders.ts] — deferred: needs > 1000 mark changes in 36 hours
- [x] [Review][Defer] `readRunPersonStates`' per-person catch also absorbs non-crypto errors (a TypeError reads as "number unverified") [packages/domain/src/claim/correction-reminder-record.ts] — deferred: the crypto layer's error types are not distinguishable today


**Fifth pass applied — two per-run observations for BigDev (⛔ not changed: the spec says "per run", `-266` §1 makes a run its own record).** (1) The letter cap (≤ 2) and `-231` D's "second after the first's delivery" are enforced PER RUN — after family → staff → family the server accepts a new first letter while a run-1 letter is undelivered (the admin now counts `in_current_run` letters, so it shows the same). (2) The sweep's per-person state reads the CURRENT run's letters only — a person whose run-1 letter was DELIVERED is chased again in run 3, and a letter recorded during run 1 drives ⛔ no second-letter reminder in run 3. Both are consistent with the ratified per-run model; whether a delivered letter should carry across a family → staff → family switch is a question about what the Trust does to a family.

⚠ **CORRECTED 2026-10-01 (the routing-note §0 gate, run before drafting):** the paragraph above is WRONG on its premise. `-266` is an **author-commit**, ⛔ not ratified; and the "per run" model is an AUTHOR reading (D26 *"a full 90 days"*, slice trap S1) that goes FURTHER than the ratified text: `-258` detail 1 restarts only the family's **90-day clock** on a switch to `family` (*"the family's run restarts"* is under `-258`'s own **"Our reading — ⛔ NOT RATIFIED"**), and `-258` states it does ⛔ **not** move `-250` #1–#4 **or the letter track**. `-250` #1 (*"reminders to a dead number stop when a letter's delivery is recorded"*) and `-230` cl.3 (*a letter … then "one more letter"*) carry ⛔ no run concept. ⇒ Observations (1) and (2) describe code that MOVES a ratified rule through an author reading — ⛔ not a Panel question ([[feedback_supersede_never_reinterpret]]); the fix is an author-commit + code that keeps the delivered-letter stop and the two-letter limit per RETURN (same number). ⭐ **BigDev 2026-10-01 (*"2"*): the author-commit `2026-10-01-272` is in `.decision-log.md` (BigDev inserted it 2026-10-01) and is BUILT IN STORY 6.19c; 6.19b stays `done`.** ⚠ The 6.19b code that encodes the per-run model — the letter limits, `in_current_run` / `currentRunLetters`, the sweep's letter track (incl. the fifth pass's K2), the person-state readers — is listed in `-272` consequence 1a for 6.19c to rework. ⚠ **Cause, recorded honestly:** the per-run reading was carried from the story's own text (D26, S1, `-266`) into four review rounds without tracing it to the ratified clauses; every Acceptance Auditor audited against the story, which already held the reading — so the method could ⛔ not catch it; only the §0 trace did.

**Fifth pass verified (2026-10-01).** `turbo run typecheck` 20/20; jobs correction suites live 136/136; `ci:local` (live DB): the domain integration suite green (305 files / 4071 tests — the TRUNCATE deadlock class did ⛔ not recur, and two further full domain runs were green, 3/3); every other integration package green except one api spec; two admin unit failures. ⚠ The two admin failures were this pass's own new deadline tests firing `visibilitychange` / `focus` before the passive effect attached its listeners (the address arrives from a mocked promise outside `act`) — fixed by flushing effects first; the full unit stage then green under CI concurrency (37/37). ⚠ The api failure is ⛔ not 6.19b's: `medical-disclose.spec.ts:270` asserts a base64 ciphertext does ⛔ not CONTAIN the plaintext `ckd` — a three-letter substring a random envelope occasionally holds (this run's did); green on re-run. Recorded, ⛔ not fixed here.

## Dev Notes

### Dependency and sequencing
6.19a is `done`. **Task 0 → 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9.** ⭐ The mark and the runs (Tasks 1–2) come **before** the sweep: AC16
conditions every family reminder, and the sweep enumerates runs, ⛔ not returns. ⭐ 6.19c starts only when this slice is `done` — it reads the
reminder and letter records (D22), calls the exported mark writer, run opener, resolver and SMS send.

### § What 6.19a shipped, and what moved (re-derived at `f06ee41f` — wins over the shared spec's `c136b03c` section)
- **The contact record.** `claim_contacts` (`packages/domain/src/schema/claim_contacts.ts:50-106`, migration `0125`): one per claim;
  exactly one claimant side — `claimant_nominee_version_id` **or** the block `claimant_{name,mobile,address}_ciphertext`
  (`piiColumn(1,'claim_contact')`); `agreement_consent_id` NOT NULL; `contact_locale` `'hi'|'en'`, default `'hi'`.
  `claim_contact_nominees` (`:111-147`): per `nominee_version_id`, `address_ciphertext` NOT NULL, `relationship` plain text. ⚠ ⛔ No nominee
  **mobile** here — it is `member_nominee_versions.mobile_ciphertext` (`schema/member_nominee_versions.ts:100`, `piiColumn(1,'member_nominee')`,
  **nullable** on a vacated tombstone); ⚠ that table's own `address_ciphertext` is ⛔ not the letter's address.
- **Readers** (`packages/domain/src/claim/claim-contact-check.ts`, via `claim/index.ts`): `readClaimContact` (`:49`),
  `readVersionChainIndex` (`:71`), `correctionChainOf` (`:85`), `resolveContactRow(versionId, rows, index)` (`:96`, `{row, source} | null`),
  `readClaimContactAgreementState` (`:120`, `live|revoked|missing`), `assertClaimContactRecorded` (`:175` — approval-only; ⛔ not the
  letter's). ⚠ `readClaimContactPresence` (`claim-contact-persist.ts:519`) reads **projected** versions while undetermined — ⛔ not for
  recipients. `getEffectiveNomineeDeclaration` (`claim/nominee-effective.ts:324`) returns `entries: []` unless `effective`;
  `nominee.getNomineeVersionsByIds` (`nominee/declaration-history.ts:128`) gives the versions' ciphertext.
- **The agreement** is ONE consent per claim covering the whole record (its migration says SMS **and** post); ⛔ nothing revokes it in v1
  (only a direct DB change), which is why D30 still names `agreement_not_live`.
- **Decrypt.** `decryptClaimContactField` (`apps/api/src/modules/claims/claim-contact-crypto.ts:29`), `CLAIM_CONTACT_FIELD_CLASS`
  (`apps/api/src/context.ts:204`) and `MEMBER_NOMINEE_FIELD_CLASS` (`:83`) live in apps/api, which apps/jobs is ⛔ not allowed to import (`apps/api` depends on `@twt/jobs`) ⇒ Task 4's relocation into
  `packages/domain/src/encryption/field-classes.ts` (its header explains why). Jobs decrypt with `encryption.decryptTier1(…)` and
  `buildJobsEncryptionDeps` (defined `apps/jobs/src/deps.ts:37`, built at `boot.ts:284`; `claim-ocr-parity.ts:568` shows the
  `decryptTier1` call). ⭐ Task 4 relocates the two constants **and** gives jobs a decrypt (a domain helper over `decryptTier1`, ⛔ not a copy
  of the apps/api one). An erasure-scrubbed field decrypts to a sentinel
  (`member/anonymize.ts`) ⇒ `no_target`.
- **The return path.** `returnToDistrictAdmin` now at `state-trustee-decision-persist.ts:719` (checks only the state, R9 and the live-return
  conflict — ⛔ no determination); `getLiveCorrectionReturn` `:824`; `isReturnedClaimResubmitted` `:861`; `resolveClaimCorrectionState`
  `:959` → `{underCorrection, hasLiveReturn, resubmitted, checkSendsBack, snapshot}` (`:924-935`). Handler `postDecision`
  (`claims.cycle-freeze.handlers.ts:326`) opens `openScopeTx` and calls `claim.returnToDistrictAdmin(scopeTx.client, base)` at `:379`;
  audit `admin_cycle_freeze.returned` after commit. Contract `CycleFreezeDecisionRequest` (`packages/contracts/src/claims/cycle-freeze.ts:240`,
  `.strict().superRefine`). ⚠ The Pariwar Admin's form is **`apps/admin/src/modules/cycle-freeze/PendingCaseCard.tsx`** (`submit` `:88`,
  the button `:315`, its `onClick` `:320`) — `CycleFreezeRoute.tsx` only renders `CycleFreezePage`, which renders the card.
- **SMS in apps/jobs.** `createSmsDltProvider` (`packages/channels/src/providers/sms-dlt.ts:53`) resolves `{status:'accepted',
  providerMessageId}` or `{status:'rejected', providerMessageId:null, detail}`; classes in `providers/sms-errors.ts` (`SmsErrorClass`:
  `invalid_number | dlt_template_not_approved | carrier_reject | rate_limited | api_unavailable | auth | unknown`; the codes are *"INDICATIVE,
  VERIFY"*). The only gateway client is built inside `buildContributionProviderResolver` (`apps/jobs/src/scheduler/contribution-providers.ts:142`)
  and ⛔ not returned; `resolveSmsDltConfig` (`:100`) returns `null` for "not provisioned" ⇒ map to `error` + alarm.
- **Staff push.** `dispatch()` has ⛔ no channel parameter — narrow by `resolveDelivery: () => ({ push: target })` (as `fanOutAlert` does per
  rung); without `providers` it uses the stub registry. ⛔ No test fences the number of `dispatch()` callers. Admin tokens are registered under
  `ADMIN_GLOBAL_NAMESPACE` (`device-token.handlers.ts:122-129`), and ⛔ no admin client registers one ⇒ AC4's "inert on day one".
- **The helpline number.** ⛔ No server-side source exists (`deferred-work.md`, the 8.11 helpline-number item; `note-template.ts` prints a
  `[PENDING …]` token) ⇒ D33's config key, failing closed.
- **Keys.** `PERMISSION_CATALOG_VERSION = 48` (`packages/domain/src/rbac/permissions.ts:726`), 56 keys (`permissions.test.ts:54`, `:56`),
  13 bundles (`roles.test.ts:63`); 6.19a minted ⛔ nothing (it only amended `claim.view_nominee_name_check`'s doc-block, `:932-938`, which
  already says *"6.19b's letter form reads an address under its OWN key"*).
- **Migrations.** The last is `0125_claim-contact.sql` ⇒ this slice starts at **0126** (the shared spec's T14 "0124" is 6.19a's).
- **The queue.** Unchanged since 6.18: `listClaimsUnderCorrection` (`correction-queue-read.ts:188`), `ClaimUnderCorrectionRow` (`:60`, ⛔ no
  `returnDecisionId`), contract `ClaimUnderCorrectionItem` (`nominee-name-check.ts:371`, `.strict()`), route `router.tsx:238` (⛔ no search
  params), hook `hooks.ts:831`, client `client.ts:1387`. The admin nav is `apps/admin/src/routes/RootLayout.tsx` (`:48`; precedents
  `nav-nominee-corrections`, `nav-nominee-refusals`).
- **The member line.** `(claim)/nominee-review.tsx:463-474` renders `memberEditable ? correction_needed : correction_needed_staff`;
  `memberEditable` = `NOMINEE_BANK_COLLECTABLE_STATES` (`claims.nominee-bank.handlers.ts:356-370`), which holds ⛔ no returnable state.
  Contract `NomineeBankStatusResponse` (`packages/contracts/src/claims/nominee-bank.ts:181`, `.strict()`).

### ⚠ Slice traps
- **S1 — the run is the unit, ⛔ not the return** (`-266` §1). Everything per-run (the dead marker, "≤ 2 letters", "reached" in 6.19c) keys
  on `run_id`.
- **S2 — ⛔ never write a record for a slot you did not attempt** (D30, a `resubmitted` pause): the catch-up rule reads "a due slot with no
  record" — the TWO exceptions are `skipped_superseded` markers: the catch-up's for the older missed slots, and the sweep's for a run
  ended by a mark change on a slot day (both mean *"not sent, superseded"*, ⛔ never *"attempted"*).
- **S3 — the provider never throws.** A `rejected` is a resolved value; only a transient class makes the child throw.
- **S4 — microcopy.** `microcopy.yaml`'s `code_globs` scan **all** of `apps/admin/src/**`, comments included, for `\breceipt\b` and
  `\breport\b` (among others) — "postal receipt", "delivery report" in the letter form, its copy or its comments fail CI. `claim.json` (en,
  hi) is in `copy_globs` (tone rules: `\bURGENT\b`, "only N days left"; the member-register terms `user` / `donor` / `customer`; UX-DR73 —
  ⛔ no Devanagari digits in the Hindi copy, the reference and the number stay Latin). `apps/jobs` is ⛔ not scanned.
- **S5 — test seeds use placeholder ciphertext** (`'enc:v1:…'`, in both `packages/domain/tests/integration/_helpers.ts` `seedClaimContact`
  `:1208` and `apps/api/tests/integration/_nominee-name-check-fixture.ts` `ensureClaimContact` `:294`) — the AC9b sentinels and the letter
  form need **real** envelopes; ⛔ no shared helper seeds a return (specs call `returnToDistrictAdmin`), and apps/jobs has ⛔ no shared helpers.

### Files
**UPDATE:** `packages/domain/src/encryption/field-classes.ts`, `apps/api/src/context.ts` (re-export), `apps/jobs/src/scheduler/contribution-providers.ts`,
`packages/queue/src/index.ts`, `apps/jobs/src/boot.ts`, `packages/contracts/src/claims/cycle-freeze.ts`,
`apps/api/src/modules/claims/claims.cycle-freeze.handlers.ts`, `apps/admin/src/modules/cycle-freeze/PendingCaseCard.tsx`,
`packages/domain/src/claim/correction-queue-read.ts`, `apps/api/src/modules/claims/claims.nominee-name-check.handlers.ts`,
`packages/contracts/src/claims/nominee-name-check.ts`, `apps/admin/src/routes/CorrectionQueueRoute.tsx`, `apps/admin/src/router.tsx`,
`apps/admin/src/api/{client,hooks}.ts`, `apps/admin/src/routes/RootLayout.tsx`, `packages/contracts/src/claims/nominee-bank.ts`,
`apps/api/src/modules/claims/claims.nominee-bank.handlers.ts`, `apps/mobile/app/(claim)/nominee-review.tsx`,
`apps/admin/src/modules/helpline-claims/{BankDetailsCard,HelplineClaimPage}.tsx` (the shared schema; `HelplineClaimPage` reads
`correctionNeeded`), `apps/api/src/modules/claims/index.ts`,
`packages/domain/src/rbac/{permissions,roles}.ts`, `apps/api/src/audit/audit-sink.ts`, `packages/i18n/locales/{en,hi}/claim.json`,
`scripts/claim-adjudication-human-actor-invariant/check.ts`, `openapi/v1.yaml`, `friction-budget.md`,
`docs/launch-gate-inventory/dlt-template-requests-6-19.md`, `docs/launch-gate-inventory/inventory-roster.md` (D28's Hindi review, `-267` §6),
`docs/degradation-policy/surface-inventory.md`,
`docs/fallback-handler-ledger/ledger.md` (rows 9, 15, 16's xref), `_bmad-output/implementation-artifacts/deferred-work.md`.
**NEW:** `matchingGrantRole` (`packages/domain/src/rbac/`, + its unit test); the four tables + RLS files (`schema/index.ts`, `policies/index.ts`); a contracts module for the letter and mark requests /
responses under `packages/contracts/src/claims/` (+ its `index.ts` export and tests); the admin letter-form and mark-change components; the domain module for the mark writer, run opener, resolver,
schedule and the letter precondition; the reminder sweep beside `contribution-notify-triggers.ts`; the claim-correction SMS template
registry (apps/jobs); the admin directory accessor; the letter + mark route file and handlers.
**⛔ NEVER edit:** `packages/channels/src/{dispatch,render,sms-dlt-registry}.ts`, `AlertCategory`, `claim_documents` / `uploadClaimDocument`,
`assertClaimApprovable`, `assertClaimContactRecorded`, `-265`.

### CI gates and red tests (grep the test tree for every symbol you edit)
- **The return field:** `packages/contracts/tests/claims-cycle-freeze.test.ts` (the return cases), `apps/api/tests/integration/claims/cycle-freeze.spec.ts`
  (eight return payloads), `apps/admin/tests/pending-case-card-return.test.tsx` (singular `getByRole('combobox')`/`('textbox')` — a second
  control throws "multiple elements").
- **The queue item:** `apps/admin/tests/correction-queue.test.tsx` (a fully typed `ITEM` fixture); the contract is `.strict()`.
- **The member status:** `apps/mobile/tests/unit/nominee-name-copy-resolves.test.ts` (real-`t()` list), `nominee-review-announcements.test.ts`
  (source pins), `packages/contracts/tests/claims-nominee-bank.test.ts`, `apps/api/tests/integration/claims/nominee-bank{,-helpline}.spec.ts`,
  `apps/admin/tests/{helpline-bank-details,helpline-claim-page}.test.tsx`.
- **The catalog:** `permissions.test.ts` (`toBe(48)`, `toHaveLength(56)`), `roles.test.ts` (holder pins).
- **The human-actor gate:** a new `claims.*.routes.ts` fails `unclassifiedRouteFiles()` until classified; `expectedMethods` per entry;
  `COVERAGE_FLOOR` (live 11).
- **Others:** `i18n:check-parity` (en/hi keys equal); forced-pagination (`apps/api/tests/integration/forced-pagination.spec.ts` — any new GET
  returning `{items}` declares a bounded `limit`); domain-invariants (`clampLimit` on any dynamic `.limit()` in `packages/domain/src`);
  access-wrapper (⛔ no direct `audit.writeAuditEntry` in claims modules — use `withCompensatingAudit`); OpenAPI determinism; friction-budget.

### Testing standards
As the shared spec's ([[project_live_db_test_gotchas]], [[project_known_livedb_test_failures]]): assert membership, not counts; ⛔ never
regenerate an applied migration; own-committing specs for the sweep and the races. Exemplars: `apps/jobs/tests/contribution-notify-triggers.test.ts`
(mocked deps, `now: () => NOW`), `apps/jobs/tests/pending-match-idempotency-live.test.ts` (live, own-committing, injected clock),
`packages/domain/tests/integration/alert/alert-stream-concurrency.spec.ts` (two connections), `apps/api/tests/unit/dpdpa-consent-copy.test.ts`
and 6.19a's `apps/api/tests/unit/claim-contact-copy.test.ts` (copy lockstep).

## Dev Agent Record

### Agent Model Used

Claude Opus 5.5 (`claude-opus-5-5`), `/bmad-dev-story 6.19b`, 2026-09-29 → 2026-09-30.

### Debug Log References

- Task 0: `-266` … `-271` on `main` at `1dbc9248`; `git diff --name-only f06ee41f..HEAD -- packages apps scripts` EMPTY. Catalog read LIVE: 48 / 56 keys / 13 bundles. DLT request sheet ⛔ not started; ⛔ no template id and ⛔ no helpline key provisioned (the sends fail closed — T13).
- Live specs on `twt-test-pg :5433` (`pnpm --filter @twt/domain db:migrate` applied 0126–0129).
- ⚠ The transaction-clock simulation (the return-loop spec's): one BEGIN shares one `now()`, so the domain specs move `decided_at` / `updated_at` explicitly where ORDER matters; the races and the sweep run own-committing.
- ⚠ **A runtime import cycle caught by `ci:local`, ⛔ not by `tsc`**: `contracts/claims/nominee-name-check.ts` → `correction-chase.ts` → `cycle-freeze.ts` → `nominee-name-check.ts` left a schema `undefined` at module init (`nominee-name-check-vocabulary-lockstep.test.ts`, 3 failures: *"Cannot read properties of undefined (reading '_parseSync')"*). Fixed by moving `CorrectionMustAct` INTO `correction-chase.ts`, which now imports ⛔ nothing from its siblings ([[project_type_only_import_cycle_trap]]).
- Test-authoring slips caught and fixed, ⛔ none a code defect: a back-dated return left the seeded accounts "after" it; a fixture reused a display name; the RLS spec needed savepoints around each expected Postgres error (25P02); the API spec's posting needed its `members` row; the jobs detail is `http_503` (lower-case).

### Completion Notes List

- ⭐ **Migrations 0126–0129** (hand-authored, ⛔ none regenerated; one RLS file each, per command, FORCE, ⛔ no DELETE): `claim_correction_marks` (append-only — ⛔ no UPDATE grant; `set_by_role` ∈ {pariwar_admin, district_admin, super_admin} per `-270`; the note required on every row after the return's own), `claim_correction_runs` (ONE open run per CLAIM — partial UNIQUE, `-267` §1; `end_reason` ⛔ without `resubmitted`, `-267` §3; UPDATE narrowed by a column grant to `ended_at`/`end_reason`), `claim_correction_reminders` (UNIQUE `(run_id, slot_day, recipient_key, purpose, subject_key)` with `subject_key NOT NULL DEFAULT ''`; the D34 day keys for `staff_push` AND `staff_reminder`; `delivered_at` only on `accepted`; `attempting` needs `claimed_at`), `claim_correction_letters` (≤ 2 per person per run; the delivery quartet all-or-nothing; ⛔ delivered before posted). Tier-1: the mark's note (`claim_correction_mark`), the tracking number (`claim_correction_letter`).
- ⭐ **The domain** (`claim/correction-*.ts`): ONE mark writer (under the trustee lock, against the LIVE return; same-value rows recorded and leave the run alone; `refuseUnchanged` is the District Admin route's; the hold hook `noCorrectionHold` for 6.19c to fill — `-269` §3 / `-271` §2 proved with an injected hold); the run opener (ends any open run `superseded`; refuses `direction` unless `family`); end-run (`decided`; a no-op on an ended run); ⭐ the ONE resolver `resolveCorrectionChase` (latest mark; latest family/direction and staff runs OPEN OR ENDED; `familyPartDoneAt`; with `crypto`, each person's CURRENT number hash — `-271` §1); `readFamilyPartDoneAt` over `readReturnAccountsRewrite` — a pure extraction of `isReturnedClaimResubmitted`'s accounts leg (behaviour byte-identical; 6.18's return-loop specs green); the recipients (D30, `claimant_unresolved`); the per-NUMBER person state (the reset); the child's one-transaction re-check + claim (by purpose; the same-job retry at once; the 10-minute lease for another job; a failed re-check ⇒ `skipped_superseded`, ⛔ no throw); the compare-and-set finaliser; letters (D31's own precondition, the claimant's address from the block); the admin directory accessor; the queue's chase summary; `matchingGrantRole` (rbac, scoped before global).
- ⭐ **The jobs** (`scheduler/claim-correction-reminders.ts`): the daily 10:00 IST sweep (the exhausted-row finaliser by IST day, the `rejected_unreachable` burst alarm, D26's family markers, the bounded open-run scan alarmed at its cap, the stop predicate through end-run, the two pause tiers, D3's catch-up, the staff rows written by the sweep, the letter chase 7 → 12 → escalated on 13, the ONE `letter_second_due` per person, D21's stop, one push per staff member per day); the family-SMS child (decrypt / config / send AFTER the commit, a 10-second timeout, `-269` §4's `carrier_reject` → `rejected_unreachable`, fail-closed on a missing template id, an unset PER-PARIWAR helpline number or an unconfigured gateway); ⭐ the exported `sendClaimCorrectionSms` (6.19c sends the closure notice through it — D32); the staff push through `dispatch()` narrowed to push (⛔ not `fanOutAlert`, ⛔ no Telegram); retry policies stated (child 4 / 60 s / backoff; sweep and push 2 / 60 s / backoff). Registered in `boot.ts` beside the contribution-notify workers; THE one SMS client is now exposed by `buildContributionProviderResolver`.
- ⭐ **The family copy** (D32): `correction_sms.reminder` / `.closure_notice` × en / hi in `claim.json` through the real `t()`; the registry `claim-correction-sms-templates.ts`; the lockstep test (the real `t()` renders EXACTLY the registered text; the DLT sheet carries it). The DLT sheet now holds templates 1–4's wording and slots, 3–4 owned by 6.19b (6.19c sends), the per-Pariwar helpline keys and a computed cost line (en 181 chars = 2 GSM segments; hi 171 = 3 Unicode segments).
- ⚠ **The Hindi** of D28's line and of the four SMS messages is agent-authored and ⛔ NOT YET HUMAN-REVIEWED — marked in `claim.json` (`$comment.correction_chase`), in `deferred-work.md`, and as a go-live gate: `inventory-roster.md` **Row 20** (`-267` §6).
- ⭐ **Keys** — ONE catalog bump 48 → 49, keys 56 → 58: `claim.record_correction_letter` (key (1)) and `claim.change_correction_must_act` (key (7)), district-dimension, `district_admin` only (+ derived `super_admin`), each with its doc-block reuse-check. ⛔ No new role.
- ⭐ **The API**: `must_act` on the return (required for `return_to_district_admin` inside the `superRefine`; the mark + first run written in the return's own transaction; `set_by_role` via `matchingGrantRole`; `must_act` on the `admin_cycle_freeze.returned` line); ONE new route file `claims.correction-chase.routes.ts` (the mark change, the letter, its delivery + screenshot — MIME/size before `put`, the orphan deleted on a failed write — the address under a fresh step-up with one audit line per reveal, the screenshot's 300-second signed read); five new `AuthAuditEventType` entries; the queue gains `short_reference` + `correction_chase` and `?escalated=true`; the member bank status gains `beingChecked` (a staff case, or the family's part done ⇒ D28's line). Human-actor gate: the route file classified, `COVERAGE_FLOOR` 11 → 12.
- ⭐ **Admin**: the correction queue shows the chase per row (every state announced, `role="status"`), the mark-change form, the letter form (the address only on demand, behind the step-up), `?claim=` highlights a row, `?escalated=true` / a checkbox is the Pariwar Admin's filter; ⭐ **the admin nav links the queue** (the 6.18 deferred item marked BUILT at both its sites); the Pariwar Admin's return form requires the "who must act" choice (⛔ no default). **Mobile**: D28's line (polite) in place of the correction line for a staff case / a family whose part is done; an unmarked return and a no-return `does_not_match` keep `…_staff`.
- ⚠ **The admin push is INERT on day one** — ⛔ no admin client registers a device token; built and tested against the capture/fake path (`no_target`, ⛔ no alarm). Recorded in `deferred-work.md`. ⚠ *Corrected 2026-10-01 (third-pass review):* at v3.0 only the `no_target` path ran in a test; the `dispatch()` accepted path is now covered by a live test (a real admin token, a fake registry).
- ⚠ **AC10**: `git diff f06ee41f -- packages/channels/src` is EMPTY; ⛔ no lifecycle state, claim event, `AlertCategory` or `SMS_DLT_TEMPLATE_REGISTRY` entry; `voteOnFrozenClaim`, `assertClaimApprovable`, `assertClaimContactRecorded` untouched. **OpenAPI**: re-emitted — byte-identical (the emitter publishes a curated component set; this story registers none) and deterministic.
- ⚠ Recorded, ⛔ not fixed (`deferred-work.md` § *Story 6.19b dev*): the screenshot virus-scan gap; the at-least-once double send; ⛔ no RTBF path to the new Tier-1 columns; the API letter precondition reads the number's reset only through the sweep; the queue summary is per row (bounded by the page); D26's markers cover family rows only.
- ⭐ **Verification**: `DATABASE_URL=…:5433 pnpm ci:local` — every job green except `test (unit)`, whose one failure was the contracts import cycle above; after the fix the unit stage re-ran green (`turbo run test` 37/37 tasks; contracts 1224, admin 670) and `typecheck` + `lint` 40/40. Integration (executed, ⛔ not self-skipped): domain 3961, api 1466, jobs 433, channels 204, validity-service 284 — incl. the new specs (domain chase 35 + concurrency 3 + shape 2 + RLS 27; jobs live 17 + send 14 + lockstep 19; api chase 8; cycle-freeze 26). Every repo gate passed (human-actor with `COVERAGE_FLOOR` 12, microcopy, i18n parity, friction-budget, pii-scrape, domain-invariants, access-wrapper, schema-diff, OpenAPI determinism).
- ⚠ Docs: `surface-inventory.md` gains three Tier-2 rows; the fallback ledger's rows 9–19 note carries rows 9, 15, 16's xref + a §7 revision row; `friction-budget.md` a row (the gate passes).

### File List

**New:**
- `packages/domain/migrations/0126_claim-correction-mark.sql`, `0127_claim-correction-run.sql`, `0128_claim-correction-reminder.sql`, `0129_claim-correction-letter.sql`, `0130_claim-correction-letter-chase-day-purpose.sql` (third-pass review)
- `apps/admin/src/modules/correction-chase/ist.ts`, `apps/admin/tests/correction-chase-forms.test.tsx` (third-pass review)
- `apps/admin/src/modules/correction-chase/errors.ts`, `apps/admin/tests/cycle-freeze-page.test.tsx`, `apps/jobs/tests/claim-correction-control-paths.test.ts`, `apps/api/tests/unit/correction-chase-error-mapping.test.ts`, `packages/domain/tests/claim/admin-directory-limit.test.ts` (fourth-pass review)
- `packages/domain/tests/integration/claim/admin-directory.spec.ts` (fifth-pass review)
- `packages/domain/src/schema/claim_correction_chase.ts`
- `packages/domain/src/policies/claim-correction-{mark,run,reminder,letter}-rls.ts`
- `packages/domain/src/claim/{correction-schedule,correction-crypto,correction-chase,correction-reminder-record,correction-letter,correction-chase-read,admin-directory}.ts`
- `packages/domain/src/rbac/matching-grant.ts`
- `packages/domain/tests/claim/{correction-schedule,correction-person-state}.test.ts`, `packages/domain/tests/rbac/matching-grant.test.ts`
- `packages/domain/tests/integration/claim/{correction-chase,correction-chase-concurrency,correction-chase-shape}.spec.ts`, `packages/domain/tests/integration/rls/claim-correction-chase-policy-regression.spec.ts`
- `packages/contracts/src/claims/correction-chase.ts`
- `apps/jobs/src/scheduler/{claim-correction-reminders,claim-correction-sms-templates}.ts`
- `apps/jobs/tests/{_claim-correction-seed.ts,claim-correction-reminders-live.test.ts,claim-correction-send.test.ts,claim-correction-sms-templates.test.ts}`
- `apps/api/src/modules/claims/{claims.correction-chase.handlers,claims.correction-chase.routes,correction-chase-crypto}.ts`
- `apps/api/tests/integration/claims/correction-chase.spec.ts`
- `apps/admin/src/modules/correction-chase/{index.ts,i18n-en.ts,CorrectionChasePanel.tsx,MustActChangeForm.tsx,CorrectionLetterForm.tsx}`

**Modified:**
- `packages/domain/migrations/meta/_journal.json`, `packages/domain/src/schema/index.ts`, `packages/domain/src/policies/index.ts`, `packages/domain/src/claim/index.ts`, `packages/domain/src/claim/state-trustee-decision-persist.ts` (`readReturnAccountsRewrite` — a pure extraction), `packages/domain/src/encryption/{field-classes,index}.ts`, `packages/domain/src/rbac/{index,permissions,roles}.ts`, `packages/domain/tests/rbac/{permissions,roles}.test.ts`
- `packages/contracts/src/claims/{cycle-freeze,index,nominee-bank,nominee-name-check}.ts`, `packages/contracts/tests/{claims-cycle-freeze,claims-nominee-bank}.test.ts`
- `packages/queue/src/index.ts`, `packages/i18n/locales/{en,hi}/claim.json`
- `apps/jobs/src/boot.ts`, `apps/jobs/src/scheduler/contribution-providers.ts`
- `apps/api/src/context.ts`, `apps/api/src/audit/audit-sink.ts`, `apps/api/src/modules/claims/{index,claims.cycle-freeze.handlers,claims.nominee-bank.handlers,claims.nominee-name-check.handlers,claims.nominee-name-check.routes}.ts`, `apps/api/tests/integration/claims/cycle-freeze.spec.ts`
- `apps/admin/src/api/{client,hooks}.ts`, `apps/admin/src/router.tsx`, `apps/admin/src/routes/{CorrectionQueueRoute,RootLayout}.tsx`, `apps/admin/src/modules/cycle-freeze/PendingCaseCard.tsx`, `apps/admin/tests/{correction-queue,pending-case-card-return}.test.tsx`
- `apps/mobile/app/(claim)/nominee-review.tsx`, `apps/mobile/tests/unit/{nominee-name-copy-resolves,nominee-review-announcements}.test.ts`
- `scripts/claim-adjudication-human-actor-invariant/check.ts`
- `docs/launch-gate-inventory/{dlt-template-requests-6-19,inventory-roster}.md`, `docs/degradation-policy/surface-inventory.md`, `docs/fallback-handler-ledger/ledger.md`, `friction-budget.md`
- `_bmad-output/implementation-artifacts/{deferred-work.md,sprint-status.yaml,6-18-nominee-holder-name-on-the-verification-console.md,6-19b-correction-reminders-and-posted-letters.md}`

**⛔ Not changed** (listed in *Files* but ⛔ needed): `apps/admin/src/modules/helpline-claims/{BankDetailsCard,HelplineClaimPage}.tsx` (they parse the shared status schema, which gained a field they need not render), `apps/api-client`, `openapi/v1.yaml` (re-emitted, byte-identical).

## Change Log

| Version | Date | Change |
|---|---|---|
| — | 2026-10-01 | ⭐ **The Hindi review (`-267` §6) — DONE, recorded after `done`.** BigDev reviewed the Hindi of `nominee.bank.being_checked`, `correction_sms.reminder` and `correction_sms.closure_notice` and accepted it as written (⛔ no change ⇒ ⛔ no DLT re-registration). The `$comment.correction_chase` marker replaced; launch-gate inventory Row 20 `correction-chase-hindi-human-review` → `closed`. ⛔ No status flip. |
| v3.3 | 2026-10-01 | **Fifth pass — re-review of the four review commits, applied** (BigDev: *"1"*): 24 patches — round 4's J5 side effects (the second-letter reminder after family → staff → family; earlier runs' letters on the queue + `in_current_run`); the TRUNCATE deadlock fixed properly (all-or-nothing NOWAIT); the queue survives a failed refetch; the 503 path logged; alarms aggregated; sweep timeouts; K4/K5; admin step-up lifecycle, copy, focus, date checks; test hardening. See *Fifth pass*. |
| v3.2 | 2026-10-01 | **Fourth pass — adversarial review of the third-pass patches applied** (BigDev: *"1"*): 25 patches — I6's hash failure now fails CLOSED on the letter routes (503 `number_unverified`); `-231` D's chronology (`posted_before_first_delivery`); `posted_before_run` keys on the return date; delivery confirmation survives the refetch; the address window is client-measured; step-up seams; people under D30; the sweep's expiry + budget; the stale-slot finaliser; Secret Manager classification; and the test fixtures (real resubmission, forced-overlap settlement, day 0 at any hour). See *Fourth pass*. |
| v3.1 | 2026-10-01 | **Third-pass code review applied** (`/bmad-code-review` of the committed branch; BigDev: *"D1: 1, D2: 1"*, then *"1"*): 54 patches — three HIGH (the child's number reset; hash-less `error` rows splitting the epoch; a past-dated letter crashing the claim's sweep), the D1 `first_not_delivered` and D2 tier-(b) escalation rulings, migration 0130 (`letter_chase_day_uq` gains `purpose`), `ended_on` on the run summary, the admin surfaces' gating / per-letter delivery / step-up announcements, and the test gaps (policy-regression 74 tests, the AC11b proofs, forced-overlap races, the staff-push accepted path). See *Third-pass review*. |
| v3.0 | 2026-09-30 | ⭐ **Implemented** (`/bmad-dev-story`): Tasks 0–9 — migrations 0126–0129, the mark / runs / ONE resolver, the schedule + sweep + child + staff push, the family SMS (both messages × both locales, fail-closed), keys (1) + (7) (catalog 48 → 49), the letter + mark routes, the queue / letter form / mark form / nav link / member line, gates and docs. Status → `review`. |
| v2.6 | 2026-09-29 | Re-check of v2.5 (⛔ no critical/high) ⇒ **`-271`** (BigDev): "reached" counts only the person's CURRENT number (the resolver exposes it); ⛔ no staff run on a switch during a hold. **Story fixes:** the child's re-check is scoped **by purpose** (tier (b) and D30 stop only `family_sms` / `letter_chase` — the District Admin is still reminded when staff must act); a failed re-check → `skipped_superseded`, ⛔ no throw; a same-job retry re-claims only from `attempting`; `matchingGrantRole` gives `set_by_role` a mechanism; the number hash's own field class `claim_contact_mobile` on the real `pariwarId` (⛔ never the login-key namespace), the reset evaluated in the sweep; pg-boss's real default is 2 immediate retries (the "no retry" sentence was false) — the sweep and push queues state theirs; the sweep writes staff rows itself, the push dedups on `(claim, user, IST date)`, ⛔ no daily alarm on day one; escalation recipients named; the D26-marker query bounded; the burst alarm's lag accepted; the send-safety test reworded. |
| v2.5 | 2026-09-29 | Fresh-context re-check of v2.4 (one HIGH, story-level): ⚠ **the 10-minute lease had disabled the transient retry** — a 60-second pg-boss retry found its own younger row and left it alone ⇒ `claimed_by_job` (a retry of the same job re-claims at once; the lease is for a different job only) and the retry policy stated (`CHILD_RETRY_LIMIT` 4, 60 s, backoff — pg-boss's default is ⛔ no retry). **Also:** the `singletonKey` rationale was false (`standard` queues enforce ⛔ no singleton uniqueness — the table is the dedup); the daily staff push gets its own `staff_push` row and a `startAfter` trigger; the exhausted-row finaliser is a time bound (a previous IST day); `attempt_count` / `first_detail` record the at-least-once double; the reset keys on the NUMBER (`recipient_number_hash`), ⛔ not the version; the full outcome CHECK incl. staff rows' `recorded`; D26's markers written by the sweep, S2's two exceptions; the staff day-12 slot in AC2; T6 → S4 for tone; the reminder copy matches `…_staff`; dead / unreachable mapping; an alarm on a burst of `rejected_unreachable`; the hold hook's switch-to-`staff` rule; `set_by_role`'s rule, and `super_admin` recorded by `-270`; the one-client-per-scope-tx rule (pool `max: 2`); a duplicate Files entry removed. |
| v2.4 | 2026-09-29 | ⭐ **One fresh-context validate of v2.3 (BigDev: *"do one"*, then *"all"*) ⇒ author-commit `2026-09-29-269`**: the LATEST check decides "the family's part is done"; the pause has two tiers (`resubmitted` pauses everything, the family's part alone pauses the family); ⛔ no family run during a Super Admin hold (a hook 6.19c fills); `carrier_reject` → `rejected_unreachable`, letter-eligible; the helpline number per Pariwar. **Story fixes:** the job `singletonKey` gains `subject_key` (pg-boss would have dropped a second person's chase); the child re-checks run/mark/pause/D30 under the trustee lock before its insert, a 10-minute lease, an exhausted-row finaliser, a 10-second send timeout, at-least-once stated; one daily staff-push job; `super_admin` in `set_by_role`; the mark writer's live-return check and lock; D21 and the second letter are ONE reminder per person; what each SMS says, and its Hindi on D28's go-live row; the queue's "awaiting your check" flag; `late`, `claimed_at`, `recipient_version_id` and the encrypted tracking number / note; the chase escalates on day 13 and the staff run's day-12 slot is in the table; no-shepherd, unmarked-return and end-run no-op rules; the cost line; Hindi microcopy rules; files; the Change Log reordered. |
| v2.3 | 2026-09-29 | ⭐ **Author-commit `2026-09-29-268`** (BigDev: *"A"*) — *"the family's part is done"* is its own fact (every account rewritten after the return, ⛔ no later `does_not_match`); the family chase pauses on it (⛔ not only on `resubmitted`, which also needs a staff check and which a 6.20 correction un-sets), the District Admin's reminders continue, the member line shows D28's *"we are checking"*, and 6.19c's closure guard reads it. `isReturnedClaimResubmitted` and the approval gate are ⛔ not changed. |
| v2.2 | 2026-09-29 | Final fresh-context re-validate (⛔ no critical): 6.19c's Tasks 1/3/4/8 and the shared spec's D2/D4/D30/D31/D34 now carry `-267` inline (its Consequence 1 had claimed 6.19c's resolver use was swept — it now is); `subject_key` NOT NULL DEFAULT `''` and the full `purpose` / `end_reason` CHECKs; `claimant_unresolved` flags the claimant alone; which run a letter targets; S2's catch-up-marker exception; three AC11b tests; `-267` in Read first + Task 0; `inventory-roster.md` in Files. ⚠ One HIGH is ⛔ NOT applied — it needs BigDev: *"the family's part is done"* (see the validate hand-back, 2026-09-29). |
| v2.1 | 2026-09-29 | ⭐ **Re-validated against v2.0 (fresh context) ⇒ erratum author-commit `2026-09-29-267`**, the validate pass's own output having carried six design defects: one open run per **claim** (a vote-path second return left two); the resolver returns runs **open or ended** (every run ends at day 90, where 6.19c's gates start); `resubmitted` **pauses** a run (a 6.20 correction can un-resubmit it on the same return); `subject_key` on per-person items (two letter chases on one day collided); the claimant's letter reads the block's address (`resolveContactRow` holds only nominees'); `direction` refused unless `family`; D30's `claimant_unresolved`; D28's Hindi review a go-live gate. The mark writer accepts a same-value restatement (G2's keep); `must_act.unchanged` is the District Admin route's only. |
| **v2.0** | **2026-09-29** | ⭐ **VALIDATED (create-story validate; one in-session pass + three fresh-context read-only verifiers) and REWRITTEN on author-commit `2026-09-29-266`** (BigDev: *"all"*). Re-pinned `c136b03c` → `f06ee41f` (78 code files moved under 6.19a). ⚠ **Critical:** AC16 named `nominee.bank.correction_needed`, but a returned claim always renders `…_staff` — a staff-case family would still have been told to correct; the run key (D2) collided on a family → staff → family switch (the family silently got nothing) — **superseded by `-266` §1** (a runs table); the recipient set can be EMPTY (a return needs ⛔ no determination) — **D30**. **High:** Task order (the mark before the sweep; Task 8 was outside "0 → 7"); the `must_act` contract/handler/form design and the tests it turns red; apps/jobs could reach neither the SMS client nor the decrypt field classes; the provider result mapping; the letter check was only in the header and was the wrong predicate — **superseded by `-266` §2 (D31)**; 6.19a's readers named; the closure notice was owned by nobody — **D32**; one exported mark writer and resolver for 6.19c. **Medium/low:** one catalog bump for keys (1) + (7); `-260` G2/G4 cited; escalation and staff rows get a home (`purpose`); AC2–AC4 carry `-258`'s narrowing; `-232` I (6.19c's) dropped from AC4; AC10 restated and given a Task; admin push declared inert on day one, the queue's `?claim=` link; microcopy traps; the policy note now names what the family receives; D28's Hindi marked pending review; ~15 files added; the SMS reference and helpline number (D33); one District Admin reminder a day (D34); migrations from `0126`; `resolveNomineeNameCheckDistrict` imported; two glyph inversions removed; a Task to mark the 6.18 nav item built at both its sites; surface-inventory + AR-61 xrefs. *(Re-validated the same day by a fresh-context pass against this rewrite: the story-level findings applied in place — the gateway/outage fail-closed rules, the row claim, the classified error, the per-person reset on a new mobile, the letter cap's 409, the "not set" flag, six citations, the policy note's inputs, AC10's `-226`/`-227` line, the DLT sheet's owner; ~20 files in all, ⛔ not ~15; three glyph inversions in v1.2, ⛔ not two.)* |
| v1.2 | 2026-09-28 | ⚠ **SWEPT by `-265`** (6.19a Task 0, which owns the set's governance): *"D1–D24, the six keys"* → D1–D29 and eight keys; the letter writer runs D14's check (⚠ superseded by `-266` §2); the letter form reads the address under key (1). ⛔ No AC or Task re-derived. |
| v1.1 | 2026-09-27 | ⭐ **`-258` (V, option B) appended:** AC16 (the mark, family vs staff runs, the staff-case copy) and Task 8; key (7) minted here. |
| v1.0 | 2026-09-27 | Split from Story 6.19 v0.9 (D13, BigDev: *"split it three ways"*). ACs AC2–AC5 and AC10 carried verbatim; AC8b/AC9b/AC11b restated for this slice; Tasks re-cut. Status `ready-for-dev`, fenced on 6.19a `done`. |
