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

Status: ready-for-dev

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
authorised the route — ⚠ the permission checks return only a boolean (`packages/domain/src/rbac/check.ts`), so a NEW pure helper
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

- [ ] **Task 0 — Preflight** (all ACs) — confirm `-266` … `-271` are on `main`; run `git diff --name-only f06ee41f..HEAD -- packages apps scripts`
  and re-read any cited file it lists; read the DLT request sheet and the four DLT keys' and each Pariwar's helpline-number key's status (T13, D33, `-269` §5); read the catalog
  version **live** (forecast 48).
- [ ] **Task 1 — Migrations, from `0126`** (AC2, AC3, AC4, AC5, AC16) — in one ordered set, each with its RLS policy file (tenant, FORCE; modelled on
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
- [ ] **Task 2 — The mark and the runs** (AC16, AC2) — the exported mark writer + run opener (ends any open run of the claim; refuses `direction` unless `family`) + the end-run function + the
  ONE resolver (latest mark; latest family/direction and staff runs, open or ended — `-267` §2; ⭐ `familyPartDoneAt` — `-268` §1, from ONE
  exported reader over the accounts leg of `isReturnedClaimResubmitted` + the latest check, which 6.19c's closure guard also calls);
  the `must_act` field: **optional** in `CycleFreezeDecisionRequest`'s object and **required for `return_to_district_admin` only** inside
  its `superRefine` (the `escalation_outcome` pattern); written in `postDecision`'s scope tx right after `claim.returnToDistrictAdmin(...)`
  (⛔ not a new required field on `ReturnToDistrictAdminInput` — 37 test calls would break); the second-return path ends the old run;
  `PendingCaseCard.tsx`'s return form gains the required choice. Update the tests this turns red (see *CI gates and red tests*).
- [ ] **Task 3 — The schedule and the sweep** (AC2) — the pure `correctionReminderSchedule(kind, day0)` + its data table (the `staff`
  kind also carries its **day-12 escalation** slot — ⚠ ⛔ not one of the Panel's reminder days); the child's pre-send re-check under the lock,
  the lease, the exhausted-row finaliser, the send timeout (AC2); the 10:00 IST
  sweep + child queue (`QUEUE_NAMES`, registration in `boot.ts` beside `registerContributionNotifyWorkers`); the stop predicate; the record
  writer (`attempting` → final, the stuck-row retry); injectable clock everywhere.
- [ ] **Task 4 — The family SMS** (AC3) — relocate `claim_contact` and `member_nominee` into `packages/domain/src/encryption/field-classes.ts`
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
- [ ] **Task 5 — Keys** (AC5, AC16) — mint **keys (1) and (7) in ONE catalog bump** from the live value (forecast 48 → 49, keys 56 → 58):
  the doc-block reuse-checks (`-265` §2), `roles.ts` (`district_admin`), `permissions.test.ts`, `roles.test.ts` (holder pins).
- [ ] **Task 6 — Staff reach** (AC4) — the admin directory accessor (`role_grants ⋈ users`, by role and scope; precedent
  `resolveShepherdCandidates`; the District Admin = the live shepherd via `getLiveShepherd`); D34's once-per-day scheduled reminder and the ONE daily staff-push job per `(claim, user, IST date)`; each person's ONE
  `letter_second_due` (D21 as AC4 reads it); the letter chase (7 → 12 → escalate on day 13); the staff run's day-12 escalation; admin push through `dispatch()` with
  `resolveDelivery: () => ({ push: target })` (⛔ not `fanOutAlert`, ⛔ no Telegram), `resolvePushTargets(db, enc, ADMIN_GLOBAL_NAMESPACE,
  'admin', userId)` (admin tokens live under the nil namespace, ⛔ not the claim's Pariwar — read them in a scope set to that namespace), `resolveProviders` passed explicitly.
- [ ] **Task 7 — Letters and the mark route** (AC5, AC16) — one NEW route file under `apps/api/src/modules/claims/` for: record a letter,
  record delivery + screenshot (port, key prefix `…/correction-letter/{letterId}`, MIME/size before `put`), the letter form's address read
  (step-up, audit per reveal), the screenshot's signed read, and the District Admin's mark change (key (7), required note); district
  preHandlers by **importing** `resolveNomineeNameCheckDistrict` (⛔ not copying it); the letter targets the resolver's latest `family`/`direction` run, open or ended (its delivery is recorded by `letterId`);
  D31's precondition; ≤ 2 letters per person per run;
  recordable after the run ends; audit lines with the snapshotted display name; register the module in `claims/index.ts`.
- [ ] **Task 8 — Surfaces** (AC8b, AC16) — the queue columns + the contract's `.strict()` item + `ClaimUnderCorrectionRow`
  (`returnDecisionId`, the run, the mark, the flags, the short reference); the letter form; the mark change form; the `?claim=` search
  parameter; the nav link in `RootLayout.tsx`'s `<nav aria-label="Primary">`; the Pariwar Admin's escalated filter; the **member status**
  (a staff-case value on `NomineeBankStatusResponse`, served by `claims.nominee-bank.handlers.ts`, rendered by
  `(claim)/nominee-review.tsx`; the helpline's `BankDetailsCard` shares the schema); the D28 copy (en ratified; hi agent-authored,
  ⚠ marked *not yet human-reviewed* in its `$comment` and recorded in Completion Notes + `deferred-work.md` — the 6.19a precedent — and its human review added to
  `docs/launch-gate-inventory/inventory-roster.md` as a go-live gate beside M and S, `-267` §6); a
  `friction-budget.md` row for the mobile change; family-13 assertions.
- [ ] **Task 9 — Gates, tests and discharges** (AC9b, AC10, AC11b) — the human-actor gate entry (`COVERAGE_SET`, raise `COVERAGE_FLOOR`
  from its live value, forecast 11 → 12); re-emit `openapi/v1.yaml`; **execute** on `twt-test-pg :5433`; confirm AC10 by a diff of
  `packages/channels/src` (it must be empty); record the virus-scan gap in `deferred-work.md`; mark the 6.18 chunk-3 *"Nothing in the admin app links
  to the correction queue"* item **built** at **both** its sites (`deferred-work.md` and 6.18's `[Review][Defer]`); amend
  `docs/degradation-policy/surface-inventory.md` for the three new surfaces (the letter form, the mark change, the queue's additions) and set
  AR-61 rows 9, 15, 16's `surface_inventory_xref` (*"the implementing Story's territory"*) — ⚠ the rows have ⛔ no xref column: amend the
  blockquote note above rows 9–19 and add a §7 revision row.

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

### Debug Log References

### Completion Notes List

### File List

## Change Log

| Version | Date | Change |
|---|---|---|
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
