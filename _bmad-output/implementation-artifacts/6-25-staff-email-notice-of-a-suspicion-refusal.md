---
baseline_commit: 3a7d3a1f
---

<!--
⭐ PINNED 2026-10-09 (`bmad-create-story 6.25`) to `main` at `3a7d3a1f` — the tree that carries Story 6.24b (PR #265, REBASE-merge; branch
head `4a9b92c0`). Every `file:NNN` below is AS OF `3a7d3a1f`, derived by three read-only research passes (governance trail; code
substrate; 6.24a/6.24b learnings) and spot-checked by hand.
⚠ 6.24b's story file cites BRANCH SHAs that are ⛔ not on `main` (⛔ no 6.24b SHA map exists yet — the 6.24a PR #264 precedent). This file
cites the MAIN twins only: `-295` = `d8b062be` · `-296` = `e1c43587` · `-297` = `9f5f388d` · `-298` = `26090529` · 6.24b build = `28f21611`.

STATUS: `ready-for-dev`. ⛔ NO CODE until Task 0.3's author-commit is committed: ONE author-commit (RE1–RE17 below, answered by BigDev at Task 0.2) committed ALONE
([[feedback_governance_commits_precede_implementation]]), then the governance docs (ADR-0040 draft, the `epics.md` entry, two roster rows).
⭐ §0 gate (template `trustee-panel-routing-note-TEMPLATE.md`): the Panel has ALREADY ruled WHO (*"every Pariwar Admin of that Pariwar"*), WHAT
(the gist, ⛔ no names, ⛔ no note — those stay in the console, which `-239` (a)'s *"presenting … note and reason"* is met by) and the CHANNEL
(email). *"Until the email exists, the list is the only notice"* is the INTERIM state FQ3 described, ⛔ not a ruled fallback. Most REs are
"the code should do X" ⇒ the author's. ⚠ TWO parts are ⛔ not the author's alone:
  (1) RE3 DEFINES "every Pariwar Admin of that Pariwar" for the email, and its freeze (b) leaves out an admin appointed after the refusal —
      a narrowing of a ratified obligation ⇒ per `-295`'s §0 rule (*"An author-commit cannot narrow a ratified obligation on its own ⇒ … put
      to the Panel as a confirm"*) it is carried as a NON-BLOCKING confirm in the next routing note, answered before roster Row 24 closes (RE3, RE16).
  (2) RE8 moves a RATIFIED ADR control (ADR-0009's *"sole query path"* for identity data) ⇒ ADR-0040, which the Panel ratifies (the ADR
      lifecycle, `docs/adr/README.md`), go-live gated.
⛔ Neither blocks code (RE8 per its option A); both gate go-live (Row 24).

GLYPH REGISTER, ADDRESSING RULE: as 6.24a/6.24b — `⛔` negates the word it precedes · `⭐` = emphasis / action · `⚠` = hazard.
⛔ No `file:NNN` into `.decision-log.md`, `deferred-work.md` or `sprint-status.yaml` (newest-first files — cite the entry id / item / row key).
LETTERS: `RE` = this story's build decisions (the author's); `F` = FOUND facts; `RF`/`RB` = 6.24a's / 6.24b's (committed by `-292` / `-295`).
-->

# Story 6.25: Every Pariwar Admin Is Emailed When a Claim Is Refused on Suspicion of a Nominee Change — "Open the List", With No Names and No Note `[SURFACE]`

Status: done

> ⭐⭐ **WHAT THIS STORY IS, IN ONE PARAGRAPH.** When a District Admin refuses a claim on suspicion of a nominee change made after the
> death (`-239` — the verifier denial with reason `post_death_nominee_change`), the Panel ruled that **every Pariwar Admin of that
> Pariwar is sent an email** saying *"a claim was refused on suspicion of a nominee change — open the list"* — ⛔ **no names and no note**
> in it; those stay in the console (`-261` D2 B, `-262` FQ3 A). Today ⛔ nothing tells them: the list `/p/$pariwarId/nominee-refusals`
> (Story 6.20) is the only notice. This story builds the stack's **first email** — a small send port in `apps/jobs` with ONE real HTTP
> adapter — and a sweep that emails each Pariwar Admin **once per refused claim**, by the 6.24b notice-table pattern. ⚠ The email is
> **go-live gated** (an email-provider ADR to ratify, the sender domain, a Hindi review, one Panel confirm); unset config or a provider
> account fault ⇒ ⛔ no row is created while the sweep sees it, and a row already `attempting` stays `attempting` (⛔ never a final
> `rejected`) until the fault clears — or, after three IST days, is given up as `error` WITH an alarm (RE6, RE7, RE11).
> ⭐ **The system still refuses nothing, and the email is a notification — ⛔ never an approval step** (`-239` consequence 3).

> ⭐ **What already ships and this story READS — rebuild ⛔ none of it.**
> - RF1's one definition of "a `-239` refusal stands": `standingSuspicionRefusalSql(alias)` (`packages/domain/src/claim/suspicion-refusal.ts:61`),
>   `isSuspicionRefusalStanding` (`:224`), `POST_DEATH_NOMINEE_CHANGE_REASON_CODE` (`:43`). ⛔ Never a second derivation.
>   ⚠ `standingSuspicionRefusalSql` is a BOOLEAN — it carries ⛔ no instant.
> - RF14's chain start `suspicionChainStartedAtSql(pariwarId, claimCaseId)` (`suspicion-refusal.ts:92`) — the instant the CURRENT unbroken
>   `-239` chain began: a note-only revision that KEEPS `-239` does ⛔ not move it; a revision ONTO `-239`, or AWAY and BACK, starts a new
>   chain. ⭐ RE3's freeze anchor (⛔ the live row's `decided_at`, which every revision re-stamps).
> - The refusal writers: `adjudicateClaim` (`verifier-decision-persist.ts:344`) and `reviseDecision` (`:580`, can move a denial ONTO or
>   off `-239`; RF13's reason lock `:643`). ⛔ Not touched.
> - 6.24b's sweep skeleton to MIRROR (⛔ not to extend): `packages/domain/src/claim/suspicion-notice.ts` (`selectDueSuspicionNotices`
>   `:140`, `expireExhaustedSuspicionNotices` `:233`, `beginSuspicionNotice` `:497`, `finaliseSuspicionNotice` `:634`,
>   `noteSuspicionNoticeTransient` `:669`) and `apps/jobs/src/scheduler/claim-suspicion-notices.ts` (`runSuspicionNoticeSweep` `:155`,
>   `runSuspicionNoticeChild` `:281`, `registerClaimSuspicionNoticeWorkers` `:419`); its send core `claim-dlt-sms-send.ts` (the RESULT
>   SHAPE to copy); the constants `CORRECTION_SEND_LEASE_MS` (`correction-reminder-record.ts:59`), `CHILD_RETRY_LIMIT`
>   (`claim-correction-reminders.ts:117`), `CLAIM_CORRECTION_TZ`.
> - The role-holder precedent `listAdminsByRole` (`packages/domain/src/claim/admin-directory.ts:43`) — ⚠ read it, ⛔ do not reuse it (F4).
> - The admin email crypto: `apps/api/src/modules/auth/shared/email-index.ts` (`decryptEmail` `:53`, `ENC_CONTEXT` `:21-24` =
>   `ADMIN_GLOBAL_NAMESPACE` + `ADMIN_EMAIL_FIELD_CLASS`). `ADMIN_GLOBAL_NAMESPACE` ALREADY lives in domain (`encryption/field-classes.ts:21`,
>   re-exported by `apps/api/src/context.ts:48`); `ADMIN_EMAIL_FIELD_CLASS` is declared at `context.ts:51` and ALSO consumed by value at
>   `apps/api/src/middleware/request-context/index.ts:23,65`. ⚠ `decryptEmail` has ⛔ no production caller (only
>   `apps/api/tests/unit/auth-primitives.test.ts:103`) ⇒ 6.25's child is the FIRST production decrypt of an admin email (F16).
>   ⚠ `apps/jobs` cannot import `apps/api` ⇒ RE8.
> - The jobs KMS deps hold the admin KEK: `buildJobsEncryptionDeps` (`apps/jobs/src/deps.ts:37-69`).
> - The list: domain `listNomineeRefusals` (`nominee-refusal-read.ts:55`), API `GET /api/v1/p/:pariwarId/admin/nominee-refusals`
>   (`claims.nominee-declaration.routes.ts:73-84`, key `NOMINEE_REFUSAL_VIEW_KEY` = `'claim.approve_nominee_correction_pariwar'` at
>   dimension `pariwar`, `claims.nominee-declaration.handlers.ts:73-74`), admin route `/p/$pariwarId/nominee-refusals`
>   (`apps/admin/src/router.tsx:307-311`, `routes/NomineeRefusalsRoute.tsx`).

## Story

As a **Pariwar Admin**,
I want **an email whenever a claim in my Pariwar is refused on suspicion of a nominee change, telling me to open the list**,
so that **I learn of every such refusal the same day without having to remember to check the console — and ⛔ no name or note ever
leaves the system by email.**

## The rulings this story builds

| Ruling | Key (verbatim) | Status |
|---|---|---|
| `2026-09-21-239` (a) | *"…district admin will act upon suspicion and refuse, also notify Pariwar admin that claim has been refused, presenting District admin note and reason"* | ⭐ Trustee-ratified — stands as worded (`-261`; ⛔ superseded by nothing). ⭐ Met in TWO halves: the email NOTIFIES (`-262` FQ3 A), the console list PRESENTS the note and reason (FQ3 A *"those stay in the console"*; `listNomineeRefusals` returns the rationale) ⇒ the list's note + reason display is load-bearing for `-239` (a) and AC9 freezes it |
| `-239` consequence 3 | *"this is a notification, ⛔ not an approval step, and ⛔ must not be built as one"* | Author consequence inside a ratified entry; `-261` records it as standing |
| `2026-09-28-261` D2 B | *"THE PARIWAR ADMIN IS SENT A MESSAGE when a claim is refused on suspicion (form: -262 FQ3 — an email with ⛔ no names)"* — supersedes 6.20's list-only reading | ⭐ Trustee-ratified |
| `2026-09-28-262` FQ3 A | *"THE PARIWAR ADMIN IS SENT AN EMAIL saying 'a claim was refused on suspicion of a nominee change — open the list' — ⛔ no names and no note in it; those stay in the console. It goes to every Pariwar Admin of that Pariwar. Until the email exists, the list is the only notice."* | ⭐ Trustee-ratified |
| `-262` "does NOT cover" | *"The exact wording of the email (FQ3) … en + hi"* | ⚠ OPEN ⇒ RE9 (the author's, inside the ratified gist) |
| `-262` Consequence 3 | row `6-25`: *"this row builds the first [staff-messaging primitive] (email to a staff address held in `admin_credentials`), [[feedback_no_premature_package]] applies"* | Author — ⚠ premise OVERTAKEN by F2 (true on 2026-09-28; a staff PUSH was built 2026-09-30, inert) |
| `2026-10-08-295` §0 gate | *"An author-commit cannot narrow a ratified obligation on its own ⇒ both are put to the Panel as a confirm (§8) that must be answered before Row 22 closes"* | Author — ⭐ the PRECEDENT RE3 (b) follows (a non-blocking confirm gating Row 24) |
| Routing note `6-20-follow-ups` round 2, scenario row 8 | *"Same day — every Pariwar Admin of that Pariwar gets an email pointing to the list"* | ⚠ the scenario AS SHOWN, ⛔ not a ruled clause ⇒ RE10 meets it |
| `-292` Consequence 4 | *"rows 6-25 and 6-27 touch the same gate, writers and refusal path — whichever lands second rebases; ⛔ none drops another's check"* | Author — 6-27 is `backlog` ⇒ ⛔ no rebase owed (re-check at Task 0.1) |
| ADR-0009 §5 (Trustee-ratified, `-059`) | *"The confidentiality of identity data rests on three other controls: the narrow apps/api auth repo as the sole query path, crypto-at-rest (…), and table-level GRANTs."* — the subject is the WHOLE identity family (`users`, `admin_credentials`, `webauthn_credentials`, `recovery_codes`, `admin_sessions`, `step_up_otps`), ⛔ not `admin_credentials` alone | ⭐ Ratified control ⇒ ⚠ RE3 + RE8 add new read paths ⇒ ADR-0040 amends it (and records the existing `users` drift — F3) |

## ⭐ THE INVARIANTS

1. **The email carries ⛔ no name, ⛔ no note, ⛔ no reason text beyond the ratified gist, ⛔ no claim id, ⛔ no count, ⛔ no date, ⛔ no
   district** — the only variable is the list link (whose path holds the Pariwar id — an id, ⛔ not a name; a recorded departure from
   `email-channel.md:50`, RE9). Enforced by the template's param type (`{ link }` only) and a rendered-text test. ⭐ The note and the
   reason `-239` (a) says are PRESENTED stay on the console list — the email points there.
2. **⛔ No plaintext email address** in a log, alarm, job payload, event, audit or table. The address exists only in the child's memory
   between decrypt and the provider call. Recipients are carried as `user_id`. ⭐ `detail` / `first_detail` hold ONLY a fixed vocabulary
   (RE5) — ⛔ never provider message text, which can echo the address.
3. **⛔ Decrypt / KMS / network under the claim-row lock** — the claiming transaction commits first (6.24b Trap 19).
4. **The sweep writes ⛔ no claim event, ⛔ no decision, ⛔ no claim state** — a source fence proves it (the 6.24b no-decision fence pattern).
5. **The system refuses nothing new** — ⛔ no gate, writer, appeal, convergence, list predicate or permission key changes (AC9).
6. **Once ever per (claim, recipient)** for FINISHED rows; at-least-once is RECORDED, ⛔ never hidden (`-297` §2 / `-298` principle).

## 📜 Policy meaning (AI-10-1)

- ⭐ **This story introduces ⛔ no predicate that gates a member's access to a benefit, and changes none.** It emails staff; the refusal,
  the appeal, the approval gate and the refile path are untouched (AC9).
- It does introduce a RECIPIENT predicate (who is emailed). In staff terms: *"When a claim in your Pariwar is refused on suspicion of a
  nominee change, every Pariwar Admin whose Pariwar-wide appointment predates that refusal, and who — when the email goes — is active and
  has a login (where their email address is held), is emailed once — if the refusal still stands when the email goes; the email names
  no one."* ⭐ Consistent with `-262` FQ3 A (*"every
  Pariwar Admin of that Pariwar"*) for everyone appointed before the refusal: the people who can open the list ARE the people the ruling
  names (F5). ⚠ The freeze (RE3 (b)) leaves out an admin appointed AFTER the refusal (they find it on the list) — OUR reading, a narrowing
  of a ratified obligation ⇒ carried to the Panel as a non-blocking confirm before Row 24 closes (§0 gate (1)).
- **Niyamavali** (agent-drafted, ⛔ NOT ratified — [[feedback_niyamavali_rulebook_not_spec]]): checked 2026-10-09 against
  `docs/legal/niyamavali.md` (the private legal corpus — gitignored, present only on BigDev's machine ⇒ ⛔ reproducible at the pin) —
  greps `notif`, `email`, `Pariwar Admin`, `staff` hit ONLY unrelated clauses (a moderation ground; DPO breach notification) ⇒ ⛔ no clause
  on refusal notices, staff notification or staff email ⇒ ⛔ no conflict. The privacy policy (same corpus) covers MEMBER data (`:31` contact
  = phone, email for "official communications") — staff email is staff data ⇒ ⛔ no conflict; the processor question is RE14 (c).

## ⭐ FOUND FACTS (each ⇒ the RE it feeds)

- **F1 — ⛔ No email transport exists anywhere.** A grep of every workspace for nodemailer / sendgrid / postmark / SES / mailgun / resend /
  smtp / `sendEmail` / `sendMail` is empty; ⛔ no package.json carries a mail SDK. `@twt/channels` is push / whatsapp / sms / telegram only
  (`packages/channels/src/provider.ts:19-22`). The admin password-reset "email" is a stub log (`admin-auth.handlers.ts:201-205`,
  *"Delivery is seamed (email channel → Story 5.x). Dev: log the link token."*). ⇒ RE6.
- **F2 — A staff PUSH exists, inert.** 6.19b's `runCorrectionStaffPush` (`apps/jobs/src/scheduler/claim-correction-reminders.ts:520`)
  `dispatch()`es to admin device tokens — ⚠ *"INERT ON DAY ONE — ⛔ no admin client registers a device token"* (built 2026-09-30, AFTER
  `-262`). ⇒ `-262` Consequence 3's *"no staff-messaging primitive"* was true when written and is now OVERTAKEN: 6.25 builds the FIRST staff
  **email**, and the first staff message that **reaches anyone**. Recorded as found (RE16), ⛔ not a reinterpretation.
- **F3 — The admin email is Tier-1 ciphertext only, and the identity family already has unrecorded readers.**
  `admin_credentials.email_ciphertext` (`piiColumn(1,'admin_email')`, NOT NULL) + `email_blind_index` (Tier-2, UNIQUE) — *"NEVER a plaintext
  email column"* (`packages/domain/src/schema/admin_credentials.ts:1-51`). A GLOBAL carve-out (`USING(true)`, policy `identity-auth-rls.ts:51`).
  The ONLY code that queries `admin_credentials` is `apps/api/src/modules/auth/admin/admin-auth.repo.ts` (+ one test,
  `packages/domain/tests/integration/multi-tenant/cross-pariwar-leak.spec.ts:488`); `scripts/provision-admin.ts` reaches it THROUGH the repo
  (`findAdminByEmailIndex`, `createAdminAccount`, `:49-54`) — ⛔ a separate path. ⚠ But ADR-0009's clause covers all identity data, and
  `users` is ALREADY queried directly by three domain modules — `claim/admin-directory.ts:50-61`, `claim/shepherd-assign-persist.ts:40,211`,
  `pool/fixed-amount-panel.ts` — drift ⛔ no ADR records. ⇒ RE8 (ADR-0040 records it as found, ⛔ regularises nothing silently).
- **F4 — `listAdminsByRole` silently drops a Pariwar Admin with a blank display name** (`admin-directory.ts:60-61`: `isNotNull(displayName)`
  + `btrim <> ''`) and caps at 50. A name is ⛔ not needed to email someone ⇒ reusing it would narrow "every Pariwar Admin" silently. ⇒ RE3
  (a new reader; ⛔ the old one is unchanged).
- **F5 — Who can open the list.** The key `claim.approve_nominee_correction_pariwar` is held by `pariwar_admin` (`rbac/roles.ts:118,370`)
  and checked at dimension `pariwar`; RBAC containment is asymmetric (a narrower grant never satisfies a broader check —
  [[project_rbac_geo_scope_containment]]) ⇒ only a PARIWAR-WIDE `pariwar_admin` grant opens it; the binding test is the case-sensitive TEXT
  compare `grant.scopeValue === grant.pariwarId` (`rbac/check.ts:139`). `provision-admin.ts:108` (`grantShapeFor`) writes that grant as
  `scope_dimension='pariwar'`, `scope_value=<pariwarId>` (trimmed, ⛔ never lower-cased); it is the ONLY production `INSERT INTO role_grants`
  (`:227`) ⇒ a state/district-scoped `pariwar_admin` grant is ⛔ reachable in production today (RE3's exclusion of it is a guard, ⛔ a live
  case). ⚠ Existing jobs fixtures seed `pariwar_admin` with `scope_value NULL` (`claim-correction-reminders-live.test.ts:203`,
  `claim-correction-closure-live.test.ts:136`) ⇒ copied, they yield ZERO recipients. `super_admin` also holds the key but is ⛔ not "a
  Pariwar Admin". ⇒ RE3.
- **F6 — `role_grants` has ⛔ no revocation or expiry column** (revocation = row DELETE), ⛔ no unique key (duplicates possible), a
  `created_at`. `users.status` ∈ `active | suspended | disabled` (`users.ts:39`). ⛔ No production code DELETEs a `users` row (grep, tests
  excluded). ⇒ RE3, RE5.
- **F7 — `claim.verifier_denied` is ⛔ not a reliable trigger.** `reviseDecision` can move a denial ONTO `-239` and emits only
  `claim.verifier_decision_revised`; a refusal can be revised off `-239` or reversed on appeal before any send. ⇒ RE1 (derive "stands"
  at the sweep, re-check under the lock — 6.24b's approach).
- **F8 — The list shows refusals that no longer stand.** `listNomineeRefusals` returns every LIVE `-239` denial — ⛔ not filtered by RF1;
  an appeal-reversed refusal still lists (deferred-work item *"`-239` inheritance source…"*, 6.24a's partial discharge — the LIST half
  ⚠ still OPEN). ⇒ RE17 (⛔ not fixed here).
- **F9 — The stale "the list IS the notice / ⛔ no staff-notification primitive" sentences** sit in `nominee-refusal-read.ts:12-13`
  (*"⛔ No staff-notification primitive exists and ⛔ none is invented here."*), `apps/admin/src/routes/NomineeRefusalsRoute.tsx:4-5`
  (*"This page IS that notification (⛔ no staff push…"*) and `:91` (*"This page IS the notification"*), and `apps/admin/src/routes/RootLayout.tsx:135`
  (*"refusal list IS the `-239` notification"*). ⚠ ⛔ NOT stale: `claims.nominee-declaration.handlers.ts:11` (a route-index line),
  `router.tsx:305` and `api/client.ts:1909` (*"a notification, ⛔ never an approval step"* — still true of the list). `-261` Consequence 2's
  pattern: *"corrected by the next row that touches those files"*; 6.23's story (`:465`) assigns the D2 sentence to row 6-25. ⇒ RE15.
- **F10 — The FQ3 note's premise "for staff, the system holds only an email address" is imprecise.** `users.contact_phone` /
  `contact_whatsapp` (E.164, nullable — Story 6.12, the shepherd contact; `users.ts:80-81`) exist. ⇒ RE16 (a disclosure line, ⛔ not a
  re-put: the email was chosen against B "note by email" and C "console only", ⛔ against a phone option).
- **F11 — ⛔ No admin-app origin exists in `apps/jobs` config.** The only admin origin is `WEBAUTHN_EXPECTED_ORIGIN`
  (`apps/api/src/config.ts:297`). ⇒ RE7.
- **F12 — Architecture, Project Context (`architecture.md` line 49 *"Data residency: PII in India…"*; line 100 *"PII residency in India
  per DPDPA posture; final scope per counsel."*).** The infra is GCP `asia-south1`. A staff address is Tier-1 PII handed to the email
  provider (a processor). Provider-ADR precedent: ADR-0027 (push), ADR-0028 (WhatsApp) — Trustee-ratified (`-065`) and ⚠ SILENT on
  residency (a grep of both for India / residency / cross-border is empty). ⇒ "an India-region provider" is OUR READING of a posture line,
  ⛔ a ratified constraint; and delivery necessarily hands the address to each admin's OWN mailbox provider, wherever it is hosted ⇒
  no ESP can satisfy "India end to end". ⇒ RE6, RE14 (c).
- **F13 — `onAlarm` is unwired for every job** (`alarmOf = deps.onAlarm ?? console.warn`, `claim-suspicion-notices.ts:96-97`; `boot.ts`
  passes none — deferred-work's 8.14 item, *"Deferred from: code review of 8-14-close-of-cycle-emitter"*, first bullet). ⇒ RE12.
- **F14 — PostgreSQL 16 everywhere it runs:** production Cloud SQL `database_version` defaults to `"POSTGRES_16"`
  (`infra/gcp/variables.tf:41`, `infra/gcp/modules/cloud-sql/variables.tf:39`; ⛔ no committed tfvars override); CI `postgres:16-alpine`
  (`.github/workflows/ci.yml:957`, `nightly-integrity.yml:41`) ⇒ `UNIQUE NULLS NOT DISTINCT (cols)` is available. Precedent:
  `0087_feature-flags.sql:88` (and its note: drizzle 0.45 states it only on the `unique()` builder, `.nullsNotDistinct()` —
  `feature_flag_versions.ts:170`). ⇒ RE5.
- **F15 — Latest migration 0151** (`claim-suspicion-notices`, journal idx 151; snapshots stop at 0020 ⇒ hand-authored). Latest decision
  `2026-10-09-298`. Latest ADR `ADR-0039`. Roster rows run 1–23. ⇒ 0152, `-299` (or next free on the day), ADR-0040, Rows 24–25.
- **F16 — 6.25 is the FIRST production decrypt of an admin email, and jobs decrypts are ⛔ audited.** `decryptEmail` (`email-index.ts:53`)
  has ⛔ no production caller (the API selects `email_ciphertext` at login, `admin-auth.repo.ts:37`, and never decrypts it); its only proof
  is the fake-KMS unit test `auth-primitives.test.ts:103`. The API wires `kms.auditHook = createKmsAuditHook(servicePool)`
  (`apps/api/src/deps.ts:285`; `envelope.ts:93` fires `auditHook('decryptDek')` per decrypt); `apps/jobs` sets ⛔ no `auditHook` ⇒ the
  child's decrypt leaves ⛔ no KMS audit line (as every jobs decrypt today). The jobs KMS deps hold the same admin KEK by value
  (`apps/jobs/src/deps.ts:37-69` ≡ `apps/api/src/deps.ts:78,101`). ⇒ RE8, RE13.
- **F17 — The identity tables are GRANTed to `twt_app` ONLY** (`0005_admin-identity-auth.sql:151-156`; 0151 likewise `:43,:46`), while
  `apps/jobs` connects via `SERVICE_DATABASE_URL` (`boot.ts:269`) — in production a BYPASSRLS login that is a member of `twt_service`
  (0007's DD-3 comment). ADR-0009 names *"table-level GRANTs"* as a control and records a graduation trigger to a dedicated `twt_auth`
  role (`ADR-0009:52`). ⚠ ⛔ No committed file says which role the production jobs login holds. ⇒ RE8 (ADR-0040 must say).
- **F18 — The list link loses its target at sign-in.** `NomineeRefusalsRoute.tsx` sends a signed-out admin to `{ to: '/login' }` with
  ⛔ no return path at TWO sites — `:25` (a session error) and `:38` (a 401 on the list); `loginRoute` (`router.tsx:72-76`) declares ⛔ no
  `validateSearch`; `LoginPage.tsx:138` then navigates to `'/audit/integrity'` ⇒ "open the list" lands a signed-out admin (the
  common case for an emailed link) on the audit page. ⇒ RE9.
- **F19 — SES v2 puts temporary and account faults under HTTP 400** (AWS `API_SendEmail` + `CommonErrors`, read 2026-10-09):
  `MessageRejected` (incl. a SANDBOX send to an unverified recipient), `SendingPausedException` (*"currently paused"* — lifted after
  review), `AccountSuspendedException`, `MailFromDomainNotVerifiedException`, `LimitExceededException`, `BadRequestException`,
  `ThrottlingException` (AWS: retry) are all 400; `TooManyRequestsException` 429 (incl. daily quota / max rate); `NotFoundException` 404
  (e.g. a missing configuration set); `AccessDenied` / `ExpiredToken` / `UnrecognizedClient` / `IncompleteSignature` / `OptInRequired`
  403, `NotAuthorized` 401; `RequestTimeout` 408; `InternalFailure` 500; `ServiceUnavailable` 503. `accepted` (a `MessageId`) ⛔ means
  delivered — bounces arrive later. SES defaults to 7-bit ASCII: non-ASCII text needs `Charset: 'UTF-8'` (`API_Content`). Tracking
  exists only via a configuration set's OPEN/CLICK event destination or VDM engagement metrics (set- OR account-level). ⇒ RE6, RE14.
- **F20 — The child's retry chain outlasts the 10-minute lease.** 6.24b children: `retryLimit: CHILD_RETRY_LIMIT` (4),
  `retryDelay: CHILD_RETRY_DELAY_SECONDS` (60), `retryBackoff: true` (`claim-suspicion-notices.ts:234-238`; constants
  `claim-correction-reminders.ts:117-118` — ⚠ a same-named TWIN pair exists in `contribution-notify-triggers.ts:111-112`; import the
  claim-correction ones); pg-boss 12.19.1 backoff gaps ≈ 60–120 s, 120–240 s, 240–480 s,
  480–960 s (≈ 15–30 min in all); `CORRECTION_SEND_LEASE_MS` = 10 min; `noteSuspicionNoticeTransient` (`suspicion-notice.ts:669-683`)
  does ⛔ not refresh `claimed_at`. Harmless under a DAILY sweep; under a 15-minute sweep, the next tick takes over a row whose job is
  still retrying. 6.24b's `DEFAULT_CORRECTION_SWEEP_BUDGET_MS` (45 min, `claim-correction-reminders.ts:95`) and
  `CORRECTION_SWEEP_EXPIRE_SECONDS` (90 min, `:102`) both exceed a 15-minute cadence. ⇒ RE10, RE11.

## ⚖️ Build decisions RE1–RE17 — ⚠ the author's; PROPOSED, ⛔ not committed until Task 0.3

> ✅ **COMMITTED by [`2026-10-09-299`](../../.decision-log.md#decision-2026-10-09-299) (`8fbf718b`, 2026-10-09)** — BigDev's answers are quoted
> in the Dev Agent Record (Task 0.2). Every RE as recommended, EXCEPT: **RE6 — BOTH adapters** (A: SES v2 via `aws4fetch` 1.0.20,
> B: ZeptoMail), selected by `STAFF_EMAIL_PROVIDER`; and ONE rule ADDED: **RE5-bis** — an SES 5xx / 408 or a ZeptoMail 5xx also sets
> `may_have_sent`. The RE text below is kept as written ([[feedback_supersede_never_reinterpret]]) — `-299` governs where they differ.

> ⭐ Each RE carries a recommendation. BigDev answers each at Task 0.2 (quote the answer as given). §0 gate: every RE is the author's
> EXCEPT the two marked ⚠ — RE3 (b) (a reading that narrows *"every Pariwar Admin"* ⇒ a non-blocking Panel confirm) and RE8 (a ratified
> ADR control ⇒ ADR-0040). ⛔ No RE changes WHAT anyone is told.

**RE1 — Trigger: a `-239` refusal that STANDS (RF1) when the sweep runs, re-checked under the claim-row lock.** ⛔ Never on the
decision event (F7). A refusal revised off `-239`, reversed on appeal, or whose claim is `closed` before the email is begun ⇒ ⛔ no
email (it no longer stands; the list still shows a reversed one — F8). An appeal `open` or `upheld_final` ⇒ the refusal STANDS
(6.24b F32) ⇒ emailed. ⭐ Recommended. *(Alternative: email every `-239` refusal ever made, standing or not — rejected: it would email
about a refusal already undone.)*

**RE2 — Once ever per (claim, recipient).** `UNIQUE NULLS NOT DISTINCT (pariwar_id, claim_case_id, recipient_user_id)`. A revision off
`-239` and back ⇒ ⛔ no second email to anyone already emailed (the `-293` "once per refused claim, ever" reading precedent) — ⚠ but an
admin eligible ONLY for the new chain (RE3 (b)) has ⛔ no row and IS emailed. ⭐ Recommended.

**RE3 — Recipients: the Pariwar Admins appointed before the refusal, still eligible at the send.** A user is a recipient of claim C
(Pariwar P) iff, judged under C's lock (and identically in the selector — ONE fragment, Task 3.1):
(a) a `role_grants` row `pariwar_id = P`, `role = 'pariwar_admin'`, `scope_dimension = 'pariwar'`, `scope_value = pariwar_id::text` — the
    case-sensitive TEXT compare RBAC binds on (`rbac/check.ts:139`, F5); ⛔ a `scope_value::uuid` cast (looser than the guard, and 22P02 on
    any non-uuid grant — Postgres does ⛔ not guarantee `AND` order);
(b) ⚠ **the FREEZE:** that grant's `created_at <=` the start of C's CURRENT `-239` chain — `suspicionChainStartedAtSql(P, C)`
    (`suspicion-refusal.ts:92`), ⛔ the live row's `decided_at`: `reviseDecision` re-stamps `decided_at` on EVERY revision, a note-only one
    included (`verifier-decision-persist.ts:641,687-710`), so a live-row anchor would email every admin appointed before a note edit weeks
    later. Compared entirely in SQL (both µs `timestamptz`; ⛔ a JS `Date` round-trip). Both default to `now()` at TRANSACTION start ⇒ a
    sub-second edge (a grant tx begun before the refusal's, committed after) is included — recorded, benign;
(c) `users.status = 'active'` — judged at the SEND;
(d) an `admin_credentials` row exists — judged at the SEND (it is the ONLY place the address is held, F3; ⛔ credentials ⇒ ⛔ address and
    ⛔ login ⇒ ⛔ not a recipient, ⛔ row).
⛔ NO display-name conjunct (F4). ⛔ `super_admin`, ⛔ a state/district-scoped `pariwar_admin` (unreachable today — F5 — guarded anyway),
⛔ `district_admin` — never. A NEW domain reader (RE11) — `listAdminsByRole` is ⛔ unchanged. Duplicate grants (F6) collapse by
`DISTINCT user_id`.
⚠ **Two recorded edges (the author's — answer at Task 0.2):** (i) an admin suspended at the refusal and reactivated MONTHS later (or one
whose credentials are created late) becomes eligible with ⛔ no row ⇒ is emailed about a months-old refusal that still stands
(`upheld_final` stands indefinitely); (ii) a revoke + re-grant (revocation = row DELETE, F6) gives a NEW `created_at` ⇒ an admin who
in fact held the role throughout loses eligibility for refusals between the two. Options: **A — accept both, recorded** (the email still
names no one; the list is unchanged) · **B — bound (i) by the chain start's age** (cost: a long config hold, RE7, would then lose emails
by age). ⭐ Recommended: **A**.
⚠ **§0 — the freeze is a narrowing of *"every Pariwar Admin of that Pariwar"*** (`-262` FQ3 A, ratified): an admin appointed after the
refusal is ⛔ emailed (they find it on the list). Options: **A — build the freeze; carry it as a NON-BLOCKING confirm in the next Trustee
Panel routing note** (one line: *"for this email, a Pariwar Admin = a Pariwar-wide appointment made before the refusal, active, with a
login"*), answered before roster Row 24 closes (Row 24 (f)) — the `-295` §0 precedent (RB13/RB18 ⇒ Row 22 (c)). Cost: Row 24 waits on a
Panel session. **B — no freeze** (anyone eligible at the send). Cost: with once-ever rows, a newly appointed admin is emailed once for
EVERY refusal still standing — and no Panel question is avoided, since "eligible at the send" is also a reading. ⭐ Recommended: **A**.

**RE4 — Zero recipients ⇒ ONE claim-level row `no_target` (`recipient_user_id` NULL, `detail = 'no_pariwar_admin'`) + ONE alarm (ids
only).** Written by `begin` as a FRESH final INSERT (⛔ never via `attempting` — the RE5 CHECK forbids a NULL-recipient `attempting` row)
under C's lock, only when C stands, has ⛔ no row at all, and RE3 yields ⛔ nobody. Finished, once ever PER CLAIM (NULLS NOT DISTINCT) —
⚠ across chains: a LATER chain with zero recipients raises ⛔ no second alarm (recorded). A `no_target` row can coexist with later
`accepted` rows (an admin eligible for a later chain, or reactivated — RE3 edge (i)) — consistent with Invariant 6. ⚠ The alarm reaches
no person today (F13) ⇒ the residual is recorded: the list stays the only notice — exactly FQ3's *"until the email exists"* state,
⛔ worse than today. ⭐ Recommended.

> ⚠ **AMENDED 2026-10-09 by `-300` §2 (ii)–(iii)** (code review rounds 3–4; the text below is kept as committed): migration **0153**
> adds `detail` / `first_detail` vocabulary CHECKs (exactly `suspicionStaffEmailDetail`'s grammar), a BEFORE UPDATE trigger freezing a
> FINISHED row and `may_have_sent` true → false, and the give-up anchor `aging_since` (see RE11's amendment).

**RE5 — A NEW table `claim_suspicion_staff_emails` (migration 0152)** — ⛔ not a 4th purpose on 0151 (its UNIQUE is per claim/purpose
and its recipient columns are nominee/SMS-shaped). Columns: `notice_id uuid PK default gen_random_uuid()`; `pariwar_id`,
`claim_case_id` NOT NULL; `recipient_user_id uuid NULL REFERENCES users(id)` (⛔ no cascade — F6: users are never deleted);
`outcome text NOT NULL`; `provider_message_id`, `detail`, `first_detail` text NULL; `attempt_count int NOT NULL DEFAULT 1 CHECK >= 1`;
`claimed_at timestamptz`, `claimed_by_job text`; `created_at`, `updated_at` `DEFAULT clock_timestamp()`.
- Composite FK `(pariwar_id, claim_case_id)` → `claims` ON DELETE CASCADE (the 0143/0151 form).
- CHECK outcome IN **`('attempting','accepted','rejected','no_target','error')`** — a NEW, email-shaped set (⛔ 0138's
  `rejected_invalid_number` / `rejected_unreachable` / `skipped_superseded` / `recorded` mean nothing here; `-297` §2 removed the only
  path to `skipped_superseded`). TS `as const` tuple in LOCKSTEP + an exact-set CHECK spec.
- CHECK `(recipient_user_id IS NULL) = (outcome = 'no_target')` ⇒ a RECIPIENT row can ⛔ never finish `no_target` (a missing address
  after `begun` is an `error` — RE11).
- CHECK `outcome <> 'attempting' OR (claimed_at IS NOT NULL AND claimed_by_job IS NOT NULL)`.
- CHECK `detail IS NULL OR char_length(detail) <= 200`, the same on `first_detail`. ⭐ `detail` holds ONLY a fixed vocabulary —
  `no_pariwar_admin`; `transient:<ErrorName>` / `transient:network` / `transient:timeout` (the provider call); `held:<ErrorName>` (RE6's
  held class, incl. an unrecognised name); `transient:read_failed` / `transient:decrypt_failed` / `transient:render_failed` (before the
  provider call — ⛔ a send happened); `rejected:<http>:<ErrorName>`; `error:no_address`; `error:invalid_address`;
  `exhausted:attempting_three_days`; `exhausted:recheck_<reason>` — `ErrorName` matched `^[A-Za-z0-9_.]{1,64}$`, else `unknown`;
  ⛔ never provider message text (SES error messages echo identities — Invariant 2). (⛔ provider-driven final `error` exists — RE6.)
- `may_have_sent boolean NOT NULL DEFAULT false` — set TRUE, and never back, by (a) `noteTransient` with `transient:network` /
  `transient:timeout` (a request that may have been written), and (b) a take-over or own re-claim that finds `detail IS NULL` on an
  `attempting` row (the previous attempt ended with ⛔ note — a crash after its claiming commit). The *"a prior attempt may have sent"*
  alarm on a FINISH keys on it (RE11) — ⛔ on `attempt_count`, which every own retry increments (`suspicion-notice.ts:597-602`).
- `UNIQUE NULLS NOT DISTINCT (pariwar_id, claim_case_id, recipient_user_id)` named `claim_suspicion_staff_emails_claim_recipient_uq`
  (the keyword PRECEDES the column list — `0087_feature-flags.sql:88`).
- Partial index `(created_at, claimed_at) WHERE outcome = 'attempting'` — the give-up keys on BOTH.
- `GRANT SELECT` + column-level `INSERT (pariwar_id, claim_case_id, recipient_user_id, outcome, detail, attempt_count, claimed_at,
  claimed_by_job)` + column-level `UPDATE (outcome, provider_message_id, detail, first_detail, attempt_count, claimed_at, claimed_by_job,
  updated_at, may_have_sent)` to `twt_app` (the dev adjusts both lists to EXACTLY the columns the writers set, and the Debug Log records them); ⛔ no DELETE.
  ENABLE + FORCE RLS, per-command policies on `app.pariwar_id` (the 0151 file `claim-suspicion-notice-rls.ts` is the model).
- Anonymizer: a comment only — ⛔ member PII (a staff `user_id`); precedent `member/anonymize.ts:297`.
- ⭐ 6.24b ROUND 3's `[Review][Defer]` items on 0151 (the 6.24b story file's "Review Findings — ROUND 3", ⛔ `deferred-work.md`), each
  stated: the `attempting` CHECK without `claimed_by_job`, `GRANT INSERT` not column-narrowed, the partial index on `claimed_at` only —
  each ⛔ repeated in 0152; the 0151 (and 0138) items stay OPEN, as deferred — 0151 itself is ⛔ touched (AC9 (a)).
⭐ Recommended.

**RE6 — Transport: a provider-agnostic port in `apps/jobs` with ONE real `fetch` adapter + a fake; ⛔ no new package, ⛔ not a
`@twt/channels` provider, ⛔ no `dispatch()`.** `StaffEmailClient { isConfigured(): boolean; send(msg: { to, subject, text },
opts: { timeoutMs }): Promise<StaffEmailSendResult> }`; result shape copied from `sendClaimDltSms`:
`{kind:'final', outcome:'accepted', providerMessageId} | {kind:'final', outcome:'rejected'|'error', detail, alarm} | {kind:'transient', detail, alarm?}`.
**Plain text only** (⛔ HTML ⇒ ⛔ tracking pixel, ⛔ link rewriting; a recorded departure from `email-channel.md:28`'s "HTML + plaintext
multipart" — that file is `drafted`, ⛔ binding). `Charset: 'UTF-8'` on the subject AND the body (F19 — else the Hindi is mangled).
**Classification is by the provider's error NAME, ⛔ never by HTTP status alone** (F19: SES returns pauses, sandbox rejections, an
unverified sender domain and throttling as 400). Three classes, the table recorded at Task 0.2 for the chosen provider:
The table uses the provider's EXACT error names (for SES the full `…Exception` forms of F19 — `TooManyRequestsException`,
`ThrottlingException`, `AccessDeniedException`, …; a shortened name in a literal-match classifier matches nothing):
- **transient** (retry; ⛔ alarm): throttling / rate / quota (`TooManyRequestsException`, `ThrottlingException`), `InternalFailure`,
  `ServiceUnavailable`, `RequestTimeout(Exception)`, network errors, our own timeout.
- **held — account / config class** (transient, `detail` `held:<ErrorName>`; ⛔ NEVER a final row): auth (`AccessDeniedException`,
  `ExpiredToken`, `UnrecognizedClient`, `IncompleteSignature`, `NotAuthorized`, `OptInRequired`), `SendingPausedException`,
  `AccountSuspendedException`, `MailFromDomainNotVerifiedException`, `NotFoundException` (configuration set), `MessageRejected` (in the
  sandbox it means "recipient not verified"), ⭐ and **ANY error name ⛔ in the recorded table** (e.g. SES's `ValidationError`,
  `MalformedHttpRequestException`, `RequestEntityTooLargeException`, `UnknownOperationException`, `BadRequestException`) — ⛔ never a
  default-to-final. The alarm fires ONCE PER ROW PER DISTINCT FAULT: when the `detail` being noted differs from the row's current `detail`
  (⛔ per pg-boss attempt). The row stays `attempting`; the three-IST-day give-up (RE11) is the backstop, and IT alarms. ⭐ The sweep's
  provider pre-flight (RE7) stops a known-broken account from creating rows at all. ⚠ Recorded volume for a held fault the pre-flight
  does ⛔ catch (an unverified MAIL FROM, a missing configuration set, expired credentials): per (claim, recipient), the owner's ≤ 5 calls
  over ~15–30 min, then a take-over by the first sweep tick after the 30-min lease (≈ every 45–60 min), each with ≤ 5 calls — for up to
  three IST days — while the alarm fires once per distinct fault per row.
- **`rejected` + alarm (final)**: ONLY an error NAME that Task 0.2's table records as recipient-specific — ⛔ never by parsing the
  message text (which is ⛔ stored either — RE5). ⚠ For SES this is rare (possibly empty): `accepted` ⛔ means delivered; a bounce arrives
  later and is ⛔ captured (RE14 (b), (d) — recorded residual).
- An AMBIGUOUS failure (a timeout or connection drop AFTER the request was written) is transient, and may have sent: its `detail` is
  `transient:timeout` / `transient:network` and it sets `may_have_sent` (RE5). ⭐ ANY finish — `accepted` included — on a row with
  `may_have_sent` alarms *"a prior attempt may have sent"* (ids + outcome; RE11); a cleanly classified 429, a held fault or a
  failure BEFORE the provider call (`read_failed` / `decrypt_failed` / `render_failed`) does ⛔ set it. Where the provider supports an
  idempotency key, pass `notice_id`.
**Tracking off, concretely:** SES — ⛔ OPEN/CLICK event destination on the configuration set, VDM engagement metrics OFF at the set AND the
account (optionally the per-message `ConfigurationOverrides.Tracking` DISABLED, which needs IAM `ses:ApplyTrackingConfigurationOverrides`
or SES refuses the send); ZeptoMail — the Mail Agent's "Email Tracking" toggle off and `track_opens`/`track_clicks` false (its tracking
needs an HTML body anyway). ⇒ Row 24 (b).
**The provider is BigDev's pick at Task 0.2** — an India-region ESP is OUR reading of the residency posture (F12), ⛔ a ratified constraint;
⛔ no ESP keeps a delivered email in India (the admin's own mailbox provider receives it) ⇒ counsel clears delivery either way (Row 24 (c)):
- **A — AWS SES v2, region `ap-south-1` (Mumbai)** (`ap-south-2` Hyderabad also exists). AWS: content is ⛔ moved outside the chosen
  Region *"except as necessary to provide the services you initiated"*. ⚠ Cost: SigV4 signing — `aws4fetch` (1.0.20, ⚠ last published
  2024-08, zero deps, ~65 KB) or `@aws-sdk/client-sesv2` (3.1148.x, current, ~2 MB + `@smithy/*`); an AWS credential — a static IAM key in
  GCP Secret Manager OR GCP→AWS web-identity federation (ADR-0040 chooses); the sandbox (verified recipients only, 200/24 h, 1/s) until a
  production-access request (which requires a bounce/complaint process) + domain verification.
- **B — Zoho ZeptoMail** (transactional-only API, `Authorization: Zoho-enczapikey <token>`, `POST /v1.1/email`). ⚠ Cost: a new vendor; the
  India host is ⚠ UNVERIFIED (docs variously show `api.zeptomail.com`, `zeptomail.zoho.com`, `cpaas.zoho.{com,in}`; the account's region
  is fixed by the sign-up domain); a DPDP-specific DPA unverified (a GDPR DPA exists).
- **C — SendGrid / Postmark / Mailgun.** ⚠ Cost: ⛔ India region ⇒ conflicts with the residency READING unless counsel clears it.
⭐ Recommended: **A** (a documented India region). ⚠ Whatever is chosen, the dev re-verifies the provider's CURRENT API (Context7 / provider
docs) before writing the adapter — ⛔ never from memory — and records the error-name table (Task 0.2).
⭐ [[feedback_no_premature_package]]: the password-reset link, the WebAuthn enrollment link and the degraded-posture email (F1) are
UNBUILT consumers — ⛔ none exists yet ⇒ the port lives in `apps/jobs/src/scheduler/` until a second consumer is built.

**RE7 — Config, fail-closed.** Env contract (the SMS pattern, `contribution-providers.ts:222-235`): `STAFF_EMAIL_API_KEY_SECRET_NAME`
(+ `_ENV_FALLBACK`, default `STAFF_EMAIL_API_KEY`), `STAFF_EMAIL_FROM` (the sender address), `ADMIN_APP_ORIGIN` (`https://…`, the list
link base — F11). (For SES: the key pair or federation + region — adjust names at Task 0.2.) Unset name ⇒ `isConfigured()` false, boot
proceeds. ⚠ A SET but unresolvable secret name: the SMS rule FAILS boot (`contribution-providers.ts:220-221`) — but `apps/jobs` is ONE
process that also runs the money jobs, and this channel is go-live gated and non-critical. Options: **A — hold** (`isConfigured()` false
+ one boot alarm; RB12's own "any Secret Manager fault holds") · **B — fail boot** (the SMS rule; cost: a typo or IAM gap in a gated
channel crash-loops every job). ⭐ Recommended: **A** (a recorded divergence from the SMS rule).
⭐ RB12's lesson: the **SWEEP** pre-checks config — a gap ⇒ ⛔ no row, ⛔ no enqueue, ONE end-of-run alarm (count + claim ids); the child
repeats the check as a race guard (`held_config`, ⛔ no row, ⛔ no decrypt; the job completes and the pair stays due). ⭐ The pre-check
includes a cheap **provider pre-flight** (for SES: `GetAccount` — `SendingEnabled` and `ProductionAccessEnabled` both true; for the others,
the equivalent or none, recorded) ⇒ a paused / sandboxed / suspended account holds every pair with ⛔ no rows; ⭐ a pre-flight that
itself FAILS (a network error, a 403 on `GetAccount`) also holds (RB12's "any fault holds") — ⛔ never "proceed". ⚠ While unconfigured (every
environment until Row 24 closes) and any refusal stands, that is ~96 `console.warn` lines a day per environment — recorded (⛔ a
persisted throttle is invented). `ADMIN_APP_ORIGIN` ⛔ https, or with a path ⇒ treated as unset (alarm) — ⛔ never a link to an
attacker-shaped origin. ⭐ Recommended.

**RE8 — The identity-data read paths. ⚠ A RATIFIED ADR CONTROL MOVES ⇒ ADR-0040.**
(i) Relocate `ADMIN_EMAIL_FIELD_CLASS`, the email envelope context and a `decryptAdminEmail` into a new
`packages/domain/src/encryption/admin-email.ts` (exported by the encryption barrel; `ADMIN_GLOBAL_NAMESPACE` is already there —
`field-classes.ts:21`) — the 8.8 / 6.19b relocation precedent. `apps/api/src/context.ts`, `email-index.ts` and
`middleware/request-context/index.ts:23,65` (which builds the context BY VALUE) RE-EXPORT / import it — byte-identical behaviour.
⚠ F16: ⛔ no production code decrypts an admin email today, so "byte-identical" rests on ONE fake-KMS unit test
(`apps/api/tests/unit/auth-primitives.test.ts`, which passes UNEDITED) ⇒ ⭐ ADD a cross-check test: the API's `encryptEmail` output
decrypts through the relocated `decryptAdminEmail` (same KMS fake, same pepper). Row 24 (d) is the first live-KMS proof.
(⛔ a by-value copy of a Tier-1 encryption context — a silent-drift hazard.)
(ii) THE NEW QUERY SITES — exactly two, both named in ADR-0040: **(Q1)** the RE3 eligibility fragment (Task 3.1), a CROSS-TENANT read on
the BYPASSRLS pool (selector) and the scoped tx (re-check) that reads `role_grants` and `users.status` and tests `EXISTS (SELECT 1 FROM
admin_credentials …)` — it PROJECTS ⛔ no identity column (only `user_id`, which it already holds from `role_grants`); **(Q2)**
`readAdminEmailCiphertext(db, userId)` selecting ONLY `email_ciphertext` for ONE `user_id` — called only by the email child, AFTER the
claiming commit; the decrypt happens in `apps/jobs`.
(iii) ADR-0009 §5 (ratified) rests the confidentiality of ALL identity data partly on *"the narrow apps/api auth repo as the sole query
path"* and *"table-level GRANTs"* ⇒ Q1 and Q2 are new paths ⇒ ⚠ `-262` FQ3 A (ratified later) cannot be built without them — a FOUND
conflict between two ratified texts, resolved by a NEW ADR, ⛔ never by re-reading ADR-0009 ([[feedback_supersede_never_reinterpret]]).
ADR-0040 ALSO: records the three existing direct `users` readers as FOUND drift (F3 — ⛔ regularised silently); names the DB ROLE that
makes the jobs-side reads and whether GRANTs can tell api and jobs apart (F17 — `twt_app`-only GRANTs; jobs on `SERVICE_DATABASE_URL`;
ADR-0009:52's `twt_auth` graduation trigger addressed); records F16 (first production decrypt; ⛔ KMS audit line from jobs — ⛔ wiring
the API's hook into jobs, which cannot import it and would start auditing EVERY jobs decrypt through the global chain lock); and
cross-links `email-channel.md`'s "operations-policy ADR for the email provider" placeholder.
ADR shape (`docs/adr/README.md`): status **`drafted`** at the governance commit — `under-trustee-review` means *"presented to Trustee
Panel"* and is set (and recorded) only when it IS presented (the 2026-07-08 consent-sheet precedent: ADR-0027/0028 stayed `drafted`
until put). The README's supersession is WHOLE-ADR (step 4 flips the old ADR to `superseded`) and `_adr-template.md` has ⛔ no `Amends`
field ⇒ ADR-0040 carries `Supersedes: —` and states the clause-level amendment of ADR-0009 §5 in its Context/Decision (the ADR-0004
`> **Amendment — …**` in-body precedent); ADR-0009 gets an in-body pointer ONLY when ADR-0040 is ratified, authorised by the ratifying
decision (recorded in `-299`). Options:
- **A — build now; ADR-0040 `drafted` in the governance commit; its ratification is a go-live condition (Row 24 (a)).** Cost: code exists
  that a ratified control does not yet admit — fenced by "not in production" ([[project_not_in_production_merge_is_not_golive]]).
- **B — put ADR-0040 to the Panel and wait before any code.** Cost: 6.25 blocks on the next Panel session.
⭐ Recommended: **A**. The new paths are fenced in code (AC7): a source test over `apps/*/src`, `packages/*/src` and `scripts/` (⛔ `dist`,
comments stripped) matching `admin_credentials` / `adminCredentials` with an EXACT allowlist — `admin-auth.repo.ts`, the schema file,
`schema/index.ts`, `policies/identity-auth-rls.ts`, the 6.25 domain module(s) — plus: Q2 projects ONLY `email_ciphertext`, Q1 projects
⛔ `admin_credentials` column; callers of `decryptAdminEmail` allowlisted (`email-index.ts`, the 6.25 jobs child) — the barrel export
makes it importable anywhere; one planted violation per rule as a positive control. (`migrations/**`, `meta/**`, `tests/**`, `README.md`
are outside the scan roots or excluded by name.)

**RE9 — The email's words (en + hi) — ⚠ agent-drafted, ⛔ NOT YET HUMAN-REVIEWED.** Inside the ratified gist; ⛔ any added content
(a claim id, a count, a district, a name) would be a disclosure question for the Panel ⇒ ⛔ none is added. One email, Hindi first then
English (the `email-channel.md` bilingual convention), plain text:
- Subject (`suspicion_staff_email.subject`): en *"A claim was refused on suspicion — open the list"* · hi *"संदेह पर एक दावा अस्वीकार हुआ — सूची खोलें"*;
  the sent subject = `"<hi> / <en>"`.
- Body (`suspicion_staff_email.body`, param `{link}` ONLY): en *"A claim in your Pariwar was refused on suspicion of a nominee change.
  Open the list: {link}\n\nThis email contains no names or notes. They are in the console."* · hi *"आपके परिवार (Pariwar) में एक दावा
  नॉमिनी बदले जाने के संदेह पर अस्वीकार किया गया है। सूची खोलें: {link}\n\nइस ईमेल में कोई नाम या टिप्पणी नहीं है। वे कंसोल में हैं।"*
- Keys in `packages/i18n/locales/{en,hi}/claim.json` + `$comment.suspicion_staff_email` in BOTH locales (parity treats `$comment.*` as
  keys) (*"agent-authored, NOT YET HUMAN-REVIEWED — roster Row 25"*), rendered through the REAL `t(key, { link }, { locale, namespace:
  'claim' })` ([[feedback_stub_must_call_not_transcribe]]; `t()` THROWS on a missing `{token}` — `i18n/src/resolver.ts:35-43`; precedent
  `suspicion-notice-sms-templates.ts:100`). `claim.json` is ALREADY in microcopy's `copy_globs` (`microcopy.yaml:386-387`) and is scanned
  as raw text, `$comment` values included, against the MEMBER vocabulary (`\buser\b`, `donor`, `customer`, `report`, `receipt`, …) — the
  wording above is clean; ⚠ keep the `$comment` free of "user" / "report". ⚠ These staff strings also ship in the member mobile bundle
  (`apps/mobile/lib/claim-i18n.ts` imports `claim.json`) — as `suspicion_sms.*` already do; recorded, ⛔ a new namespace.
- ⚠ Recorded departures from `email-channel.md` (`drafted`, ⛔ binding): the combined subject is ~93 characters against `:27`'s ≤ 60
  (the Hindi-first prefix carries the gist in the preview); the link carries the Pariwar UUID against `:50`'s "no internal-system
  identifiers" (an id, ⛔ a name — the list route needs it); plain text only against `:28` (RE6). BigDev may shorten the subject at 0.2.
- `{link}` = `${ADMIN_APP_ORIGIN}/p/${pariwarId}/nominee-refusals`. ⚠ F18: a signed-out admin who follows it lands on `/audit/integrity`
  after signing in. Options: **A — a return path**: `NomineeRefusalsRoute` (and only it) redirects to `/login?next=<its own path>`, and
  `LoginPage` navigates to `next` after sign-in IFF it is a same-origin RELATIVE path matching `^/p/[0-9a-f-]{36}/nominee-refusals$`
  (⛔ an open redirect), else `/audit/integrity` as today · **B — record the residual** (the admin navigates to the list themselves).
  ⭐ Recommended: **A** (small, admin-app only; the email exists to put the admin on the list).
⭐ Recommended (wording is BigDev's to edit at Task 0.2).

**RE10 — Timing: the sweep runs every 15 minutes** (`'*/15 * * * *'`, `tz: 'Asia/Kolkata'`), run budget **10 min**, `expireInSeconds`
**14 min** on BOTH `createQueue` and `schedule` (expiry > budget AND < cadence; the 6.24b double-expiry pattern,
`claim-suspicion-notices.ts:433-451`). ⭐ NEW constants (`STAFF_EMAIL_SWEEP_BUDGET_MS`, `STAFF_EMAIL_SWEEP_EXPIRE_SECONDS`) — ⛔ 6.24b's
(45 min / 90 min, F20), and ⛔ its "NOT swept today" budget-alarm text (`claim-suspicion-notices.ts:261`). The sweep's own retry
(`CORRECTION_SWEEP_RETRY`, 2 × 60 s backoff) can overlap the next tick — harmless (the table dedups), may double an end-of-run alarm;
recorded. ⛔ No quiet hours (staff email, ⛔ an SMS to a family). Meets "same day" (scenario row 8) except a refusal in the last ≤ 15 min
before IST midnight ⇒ recorded residual, ⛔ a Panel confirm (the scenario row is ⛔ a ruled clause). ⭐ Recommended. *(Alternative: a
post-commit enqueue from the API — rejected: a second trigger path, and RE1's derivation would still be needed as the backstop.)*

> ⚠ **AMENDED 2026-10-09 by `-300` §2 (i)–(ii)** (code review rounds 3–4; the text below is kept as committed): the sweep checks config
> + pre-flight FIRST; a HELD run PARKS every `attempting` row past the lease (`claimed_by_job` = `'sweep:held'`) and runs ⛔ give-up;
> the give-up (un-held runs only) SKIPS a parked row and counts its three IST days from `aging_since` (⛔ `created_at`), which
> re-claiming a parked row resets to now.

**RE11 — The sweep/child = 6.24b's skeleton AS AMENDED (`-297` §2, `-298`), in NEW modules.**
Domain `packages/domain/src/claim/suspicion-staff-email.ts` (add to `FENCED_FILES`, with reason; a dedicated no-decrypt test):
- `selectDueSuspicionStaffEmails(db, { afterKey, limit, allow })` — BYPASSRLS cross-tenant read (a DELIBERATE family-9 comment block with
  its RE-EXAMINE trigger, mirroring `suspicion-notice.ts:131,219` — ⛔ a gate checks it, the block is the record), raw SQL with unique
  aliases (⛔ Drizzle correlated subquery — [[project_epic6_drizzle_correlated_subquery_bug]]), keyset on `(claim_case_id,
  recipient_user_id NULLS FIRST)`, `LIMIT ${sql.raw(String(clampLimit(…)))}` (the 6.24b form, `suspicion-notice.ts:149,189`). Due pairs
  = for each claim where `standingSuspicionRefusalSql` holds: every RE3-eligible recipient with ⛔ no FINISHED row (`outcome <>
  'attempting'`), plus the `(claim, NULL)` pair when RE3 yields nobody and the claim has ⛔ no row at all, ⭐ plus every pair that has an
  `attempting` row (bypassing the predicate, so its locked re-check finishes it — RB10).
- ⭐ **THE LEASE** (F20): a NEW `STAFF_EMAIL_SEND_LEASE_MS` = **30 min** — longer than the child's longest single backoff gap (≤ 960 s)
  plus the send timeout — ⛔ `CORRECTION_SEND_LEASE_MS` (10 min, tuned for a DAILY sweep). Both the own-retry re-claim (which refreshes
  `claimed_at`, as 6.24b's does — `suspicion-notice.ts:597-602`) and `noteSuspicionStaffEmailTransient` (which ALSO sets `claimed_at =
  now`, unlike 6.24b's) keep a live, retrying child's row inside the lease ⇒ the 15-minute sweep's child for that pair gets
  `held_by_other`, ⛔ a takeover. A CRASHED child's row goes stale 30 min after its last touch and is taken over by the next tick.
- `expireExhaustedSuspicionStaffEmails(db, { now, allow })` — `attempting AND created_at < istMidnightAt(addCalendarDays(todayIst,-2))
  AND claimed_at < now − STAFF_EMAIL_SEND_LEASE_MS` ⇒ `error` / `exhausted:attempting_three_days`, returns ids for ONE sweep alarm, whose
  text ALSO says *"a prior attempt may have sent"* (every given-up row had a claiming commit — `-298`'s principle).
- `beginSuspicionStaffEmail(client, { pariwarId, claimCaseId, recipientUserId|null, jobId, now })` — `SET LOCAL lock_timeout`, claim
  row `FOR UPDATE`, read the existing row. A MISSING claim row THROWS (6.24b round 3, `suspicion-notice.ts:517-518` — ⛔ a `not_due`).
  Kinds and what the CHILD does with each (the 6.24b `claim-suspicion-notices.ts:318-330` map):
  · `begun` ⇒ proceed to the send;
  · `already_final` / `held_by_other` / `not_due{reason}` ⇒ complete, skipped (⛔ alarm);
  · `expired{detail}` ⇒ ONE alarm with the detail that ALWAYS says *"a prior attempt may have sent"* (`-297` §2: an `attempting` row
    means a claiming commit happened — 6.24b's `expired` branch, `claim-suspicion-notices.ts:321-325`);
  · `no_target` ⇒ the row was written now ⇒ ONE alarm.
  ONE re-check rule: a fresh pair failing the re-check ⇒ `not_due`, ⛔ no row — reasons `refusal_not_standing` |
  `recipient_not_eligible` | `recipients_exist` (a NULL pair when RE3 now yields someone) | `claim_has_rows` (a NULL pair when the claim
  already has ANY row); an EXISTING `attempting` row failing it ⇒ `error` / `exhausted:recheck_<reason>` + alarm (`-297` §2); within the
  lease, another job's row ⇒ `held_by_other`; past it ⇒ take over (`attempt_count + 1`, `first_detail` kept). INSERT `… ON CONFLICT DO
  NOTHING` ⇒ a losing insert reads back `already_final` (never a second alarm). ⛔ Never catch a DB error inside this transaction (no
  SAVEPOINT ⇒ a silent rollback, then a send on an unheld row).
- `finaliseSuspicionStaffEmail` — CAS `WHERE outcome='attempting' AND claimed_by_job = $job`; `rowCount` 0 ⇒ `already_final` (never
  ignored). `noteSuspicionStaffEmailTransient` returns `rowCount`.
- ⭐ **⛔ address after `begun`** — `readAdminEmailCiphertext` returns ⛔ row (credentials deleted after the commit), or the decrypted value is
  blank / not a syntactically valid address ⇒ finalise `error` / `error:no_address` | `error:invalid_address` + alarm (⛔ `no_target` — the
  RE5 CHECK forbids it on a recipient row; ⛔ copy 6.24b's child `noTarget()`, `claim-suspicion-notices.ts:347`).
- `readAdminEmailCiphertext` (RE8 Q2) lives here or in a sibling ref-only module (dev's pick, recorded; both are on AC7's allowlist).
- `-298`'s principle: `no_target` is only ever written on a FRESH `(claim, NULL)` row (⛔ never on a re-claimed one), so `-298`'s exact
  branch cannot arise; ⭐ its principle applies to EVERY finish on a row with `may_have_sent` (RE5) — `accepted` included (RE6's
  ambiguous timeout) — which alarms *"a prior attempt may have sent"* (ids + outcome); the give-up and `expired` ALWAYS say it.
Jobs `apps/jobs/src/scheduler/claim-suspicion-staff-emails.ts` (+ `staff-email-client.ts`, `suspicion-staff-email-templates.ts`):
queues `claim.suspicion.staff_email.sweep` / `claim.suspicion.staff_email.send` (`packages/queue/src/index.ts`), one child per
(claim, recipient) with ids only in the payload, `singletonKey` a label only (the UNIQUE + lease are the dedup), `retryLimit:
CHILD_RETRY_LIMIT`, `retryDelay: CHILD_RETRY_DELAY_SECONDS` (both from `claim-correction-reminders.ts:117-118`). Child order: config race
guard → `withPariwarScope` → `begin…` → COMMIT → read ciphertext → decrypt → render → send → `finalise…`; transient (incl. the held
account/config class, RE6) ⇒ `noteTransient` + throw `ClaimCorrectionTransientError` (same job id re-claims its own row). The send
worker states `batchSize: 1` EXPLICITLY — pg-boss 12.19.1's `work()` already defaults to it (`node_modules/pg-boss/dist/manager.js:304`,
`batchSize = 1`), so a throw fails only its own job; the explicit option keeps that true if a default ever changes. (This answers the
6.24b round-3 `deferred-work.md` batch-loop item's own trigger question — "confirming pg-boss's actual per-job batch-failure semantics"
— for the default; ⭐ recorded as an OBSERVATION on that item at Task 0.4, ⛔ as a closure: its two files are ⛔ touched here.) The pariwar
allowlist is passed to every selector and the finaliser; an EMPTY allowlist and an allowlist in production are refused.
⭐ Recommended.

**RE12 — Alarms: ids only, prefix `[jobs] claim-suspicion-staff-email`; `onAlarm` stays unwired** (F13 — `console.warn`). 6.25 does
⛔ not wire `onAlarm` and does ⛔ not become roster Row 22 (d)'s transport: Row 22 (d) needs a NAMED owner, which `-296` left un-ruled.
⇒ an OBSERVATION appended to deferred-work's 8.14 item: *"6.25's staff-email port is a candidate `onAlarm` transport once an owner is
named"* — ⛔ not a closure. The NEW sweep's tick catch routes through `alarm()` (⛔ `console.error`) — the 6.24b round-3 `deferred-work.md` item
is ⛔ repeated here; that item stays OPEN for `claim-suspicion-notices.ts` and `claim-correction-reminders.ts` (frozen by AC9 (a)). ⚠ Every loss in this story (`rejected`, `error`, `no_target`, a give-up, *"may have sent"*) is made visible ONLY
by an alarm that reaches no one (F13) — the `-297` §1 shape that gave Row 22 its (d). Options: **A — Row 24 (e) = Row 22 (d)'s
condition** (an alarm reaches a NAMED person before go-live) · **B — record in `-299` why the email may go live while its failure alarms
reach no one** (the email is ADDITIVE: the list still shows every refusal). ⭐ Recommended: **A** (the same go-live bar as the SMS).

**RE13 — The notice row IS the record. ⛔ No `events_log` write, ⛔ no audit-table write, ⛔ no claim state change.** (An email sent
changes ⛔ nothing a member or family sees.) ⚠ F16: the child's KMS decrypt also writes ⛔ no KMS audit line (jobs wires ⛔ `auditHook`,
as for every jobs decrypt today) — recorded here and in ADR-0040, ⛔ fixed here. ⭐ Recommended.

**RE14 — Go-live records (roster rows — records; never runtime flags; never merge blockers):**
- **Row 24 `staff-email-transport`** — closes when ALL hold: (a) ADR-0040 ratified (the provider + the ADR-0009 §5 amendment for Q1/Q2,
  RE8); (b) the sender domain's SPF / DKIM / DMARC set, the secrets (or federation) provisioned, the provider OUT of its sandbox
  (SES production access granted — F19), the IAM grants the adapter needs (`ses:SendEmail`; `ses:GetAccount` for the pre-flight;
  `ses:ApplyTrackingConfigurationOverrides` if the override is used), tracking verifiably off (RE6's concrete conditions), and `STAFF_EMAIL_FROM` / Return-Path a
  MONITORED mailbox or a bounce/complaint destination with ⛔ OPEN/CLICK types (`accepted` ⛔ means delivered); (c) the ESP's region is
  India (or counsel clears otherwise) AND counsel clears delivery to each staff member's own mailbox provider (architecture *"final scope
  per counsel"* — F12); (d) a real send to a test staff inbox: the `accepted` row seen AND the message observed IN the inbox; (e) per
  RE12's answer; (f) the RE3 (b) Panel confirm answered (RE16).
- **Row 25 `suspicion-staff-email-hindi-review`** — the Hindi of `suspicion_staff_email.*` human-reviewed; the `$comment` marker removed
  by that review only (the Row 20/21/23 pattern).
⭐ Recommended.

**RE15 — Stale comments corrected (F9)** — `nominee-refusal-read.ts:12-13`, `NomineeRefusalsRoute.tsx:4-5` and `:91`,
`RootLayout.tsx:135` (and any sibling found at Task 0.1): *"the list is the console surface (it presents the note and reason); the
NOTICE is Story 6.25's email (`-261` D2 B, `-262` FQ3 A) — a notification, ⛔ not an approval step"*. Comment-only diffs (plus RE9 A's
route change in `NomineeRefusalsRoute.tsx`, if taken). These three are ⛔ stale — leave their comments alone:
`claims.nominee-declaration.handlers.ts:11`, `router.tsx:305`, `api/client.ts:1909`. ⭐ Recommended.

**RE16 — Two FOUND corrections recorded, ⛔ neither reinterprets FQ3; ONE confirm carried.** (i) F2 — `-262` Consequence 3 was OVERTAKEN
(true when written): 6.25 builds the first staff EMAIL, ⛔ the first staff-messaging code. (ii) F10 — the FQ3 note's *"for staff, the
system holds only an email address"* was imprecise (`users.contact_phone` existed). ⭐ The NEXT Trustee Panel routing note (any story)
carries, as NON-BLOCKING confirms (the `-295` Consequence 2 shape — *"The next Trustee Panel routing note … carries §8's two confirms"*,
answered by `-296` Confirm 1): RE3 (b)'s freeze (*"for this email, a Pariwar Admin = a Pariwar-wide appointment made before the refusal,
active, with a login"*) and F10's correction (a disclosure: the email was chosen against B "note by email" and C "console only", ⛔ against
a phone option). Recorded in `deferred-work.md` until carried; RE3's must be answered before Row 24 closes. ⭐ Recommended.

**RE17 — Out of scope, recorded:** the list's own predicate (F8 — still shows reversed refusals; the deferred item stays OPEN, ⛔ not
touched); an email on appeal outcomes / reversal / closure (⛔ not ruled — would widen *who is told what* ⇒ the Panel's); Row 22 (d)
(RE12); a per-Pariwar sender or From-name (one global sender; `email-channel.md:29`'s per-Pariwar sender belongs to a different TEMPLATE
on the email channel, and the file is `drafted`); a digest (one email per refused claim per admin); bounce / complaint ingestion (RE14 (b)
names a monitored address instead); other built staff notices that reach no one — 6.19b's inert admin push and 6.19d's found-dead
escalation (`deferred-work.md`) — candidate SECOND consumers of the email port, ⛔ wired here ([[feedback_no_premature_package]] — the port
stays in `apps/jobs` until one is built). ⭐ Recommended.

## Acceptance Criteria

### AC0 — Governance before code (Task 0)
Given the pin `3a7d3a1f`, when Task 0 completes, then: `git fetch origin` shows ⛔ no later decision touching `-239` / `-261` D2 /
`-262` FQ3 / row 6-27; BigDev's answer to EACH of RE1–RE17 is quoted in the story; ONE author-commit (`2026-10-09-299` or next free) holds
RE1–RE17 as answered and is committed ALONE (`governance(6.25): …`) before any code; a second governance commit adds ADR-0040
(status `drafted`, `Supersedes: —`, an in-body amendment of ADR-0009 §5's identity-data controls for Q1/Q2 only, + the provider), the
`epics.md` `### Story 6.25` entry (the `-292` Consequence 1 precedent), roster Rows 24–25, the `docs/knowledge-transfer/adr-index.md` row
AND its ledger breakdown + Total (the README §7 reconciliation), and the `deferred-work.md` lines (RE12's observation; RE16's two confirms
owed to the next routing note; RE11's `batchSize = 1` observation).

### AC1 — Who is emailed (RE3)
Given a standing `-239` refusal of claim C in Pariwar P, when the sweep and its children run, then exactly one `accepted` row exists per
user who: holds a `pariwar_admin` grant in P at `scope_dimension='pariwar'`, `scope_value = P::text`, created at or before C's
CURRENT `-239` chain start (`suspicionChainStartedAtSql`); is `active`; has `admin_credentials` — ⭐ INCLUDING one with a blank or NULL
`display_name`. ⛔ No row for: a `super_admin`; a state- or district-scoped `pariwar_admin`; a `pariwar_admin` with `scope_value` NULL; a
`district_admin`; a suspended or disabled user; a grant created after the chain start; a grant-holder without credentials; a
`pariwar_admin` of ANOTHER Pariwar (positive control in the same run). Two duplicate grants ⇒ ONE row. ⭐ The freeze legs: (i) admin L
granted AFTER the refusal, then a NOTE-ONLY revision that keeps `-239` ⇒ ⛔ row for L (the chain start did ⛔ not move); (ii) revised AWAY
and BACK after L's grant ⇒ L IS emailed (a new chain), and ⛔ an admin already emailed is emailed again (RE2). Every grant and decision
instant is set EXPLICITLY in separate committed transactions — a raw `INSERT INTO role_grants (…, created_at)` (`seedRoleGrant` has
⛔ `createdAt` option, `_helpers.ts:178-184`) and 6.24b's `refuse({ decidedAt })` (⛔ rely on the `now()` defaults — in one tx it ties with `decided_at`
and `<=` passes vacuously; [[project_db_clock_ordering_tests_tie]]). RE3's two recorded edges are tested per BigDev's Task 0.2 answer.

### AC2 — When (RE1, RE2, RE10)
Given claim C: (i) refused with `-239` ⇒ emailed by the next sweep; (ii) refused for another reason ⇒ ⛔ no row; (iii) `-239` revised to
another reason before the sweep ⇒ ⛔ no row; (iv) revised away and back after the email ⇒ ⛔ no second email to the same admin; (v) a
`reviseDecision` ONTO `-239` (from another denial reason) ⇒ emailed; (vi) appeal `open` / `upheld_final` ⇒ emailed; (vii) appeal
reversed (`claim_appeals.status='reversed'`) or claim `closed` before the begin ⇒ ⛔ no row; (viii) a second sweep after all are finished
⇒ ⛔ new rows, ⛔ new sends; (ix) the schedule is `*/15 * * * *` IST with budget < expiry < cadence on BOTH `createQueue` and `schedule`,
from the NEW constants (model: `apps/jobs/tests/claim-correction-control-paths.test.ts:535-550`, a fake `createQueue`/`schedule`
asserting exact options).

### AC3 — What it says (RE9; Invariant 1)
The provider receives ONE plain-text message per (claim, recipient): subject `"<hi> / <en>"`, body Hindi then English, rendered through
the real `t()`; the only variable is `{link}` = `${ADMIN_APP_ORIGIN}/p/<P>/nominee-refusals`. A test renders both locales and asserts
⛔ no claim id, ⛔ member name, ⛔ nominee name, ⛔ District Admin name, ⛔ rationale, ⛔ reason code, ⛔ date, ⛔ unresolved `{…}`; the
template's param type admits `link` only (a type-level test). The adapter unit test asserts `Charset: 'UTF-8'` on subject and body and
⛔ HTML part. `i18n-parity` (incl. `$comment.suspicion_staff_email` in both locales) and `microcopy` (`claim.json` already in
`copy_globs`) green. Per RE9's answer: (A) a signed-out admin opening the link reaches the list after signing in, and a `next` that is
⛔ the allowlisted relative list path (an absolute URL, `//evil`, another route) falls back to `/audit/integrity`; (B) the residual is
recorded.

### AC4 — Once ever, at-least-once recorded (RE2, RE11)
(i) N concurrent children for one pair, ⛔ child stalling past the lease ⇒ ONE send, ONE `accepted` row (a true two-connection COMMITTED
race, waiting on `pg_stat_activity` lock waits — ⛔ sleeps); (ii) a crash-left `attempting` row past `STAFF_EMAIL_SEND_LEASE_MS` is
reclaimed by the next sweep (`attempt_count 2`, `first_detail` kept); within the lease ⇒ `held_by_other`; (iii) an `attempting` row whose
re-check fails ⇒ `error` / `exhausted:recheck_<reason>` + an alarm that says *"a prior attempt may have sent"* (also at `attempt_count 1`); (iv) give-up after 3 IST days AND past the lease ⇒ `error` /
`exhausted:attempting_three_days` + one alarm that says *"a prior attempt may have sent"*; a live child's row inside the lease is ⛔ never
given up; (v) every losing CAS returns `already_final` (`rowCount` asserted); (vi) ANY finish (`accepted` included) on a `may_have_sent` row
alarms *"a prior attempt may have sent"*, and a finish after only a 429 / a held fault / a pre-call failure (`decrypt_failed`) does ⛔ alarm
it; (vii) transient ⇒ same job id retries and re-claims its own row; ⭐ (viii) OUTAGE-SHAPED: a child
whose provider returns transient on every try, with the injected clock stepped through its backoff gaps and a sweep tick between each ⇒
the tick's child gets `held_by_other`, ⛔ a takeover, `attempt_count` grows only by the owner's own retries; ⭐ (ix) the HELD class: for each
account/config error name in RE6's recorded table (incl. a 400 `MessageRejected` / `SendingPaused` and a 403), the row stays `attempting`
with ONE alarm per distinct fault — ⛔ never a final row — an UNRECOGNISED error name is held too, and a recorded recipient-specific
name is the ONLY path to `rejected`; (x) ⛔ address after `begun` (credentials
deleted after the commit; a blank decrypt) ⇒ `error` / `error:no_address` | `error:invalid_address` + alarm, ⛔ a 23514.

### AC5 — Nobody to email (RE4)
A standing refusal in a Pariwar with ⛔ no eligible admin ⇒ ONE `no_target` row (recipient NULL, `detail='no_pariwar_admin'`) + ONE alarm
(ids only); a second sweep ⇒ ⛔ second row, ⛔ second alarm; a duplicate child ⇒ `already_final`, ⛔ second alarm. A Pariwar with an admin
who already has a row ⇒ ⛔ `no_target` row even if that admin is later disabled.

### AC6 — Config gaps hold, never lose (RE7)
With the API key / sender / `ADMIN_APP_ORIGIN` unset (each leg separately, and a non-https origin, and an origin with a path), AND
with the provider pre-flight reporting sending disabled or sandboxed: the sweep enqueues ⛔ nothing, writes ⛔ no row, raises ONE
end-of-run alarm (count + ids); then fixed ⇒ the next sweep sends. A child racing a config removal ⇒ `held_config`, ⛔ row, ⛔ decrypt, and
the pair stays due. A set-but-unresolvable secret name ⇒ per RE7's answer (A: `isConfigured()` false + one alarm, boot proceeds; B: boot
fails).

### AC7 — No plaintext address anywhere (Invariant 2, 3; RE8)
A `JSON.stringify` sweep over every captured artifact of a full run — job payloads, alarms, console output, table rows — finds ⛔ the
recipient's address; the address appears ONLY in the fake provider's received `to`. ⭐ Including a leg where the fake provider returns an
error BODY that echoes the address (as SES's do): the stored `detail` is the fixed vocabulary only (RE5). The decrypt happens after the
claiming COMMIT — constructible form: the KMS fake's `decrypt` opens a SEPARATE connection and runs `BEGIN; SELECT 1 FROM claims WHERE
pariwar_id=$1 AND claim_case_id=$2 FOR UPDATE NOWAIT; ROLLBACK` — a 55P03 means the lock is still held ⇒ the fake throws; red-checked by
planting the decrypt inside `begin`'s transaction. `apps/api/tests/unit/auth-primitives.test.ts` passes UNEDITED after the RE8
relocation, and the cross-check (the API's `encryptEmail` ⇒ the relocated `decryptAdminEmail`) passes. RE8's source fence (exact
allowlist; Q2 projects only `email_ciphertext`; Q1 projects ⛔ `admin_credentials` column; `decryptAdminEmail` callers allowlisted) with
one planted violation per rule.

### AC8 — The table (RE5)
Migration 0152 applied to BOTH :5432 and :5433; every CHECK (incl. the `detail` length), the UNIQUE (`NULLS NOT DISTINCT` — a two-NULL
insert fails), the FKs and the partial index verified BY NAME (`pg_constraint` / `pg_indexes`); an exact-set spec pins the outcome CHECK
to the TS tuple; the column-level INSERT and UPDATE grants verified (`information_schema.column_privileges`); RLS policy regression spec
(cross-tenant read/insert/update refused; ⛔ DELETE grant — model `claim-suspicion-notice-policy-regression.spec.ts`). (⛔ `schema-diff`
— it is the FR-100 payout-destination scanner, ⛔ a table gate.)

### AC9 — Nothing else moves
(a) `git diff --exit-code origin/main --` over: `verifier-decision-persist.ts`, `suspicion-refusal.ts`, `suspicion-refusal-persist.ts`,
`appeal-persist.ts`, `appeal-panel-persist.ts`, `admin-directory.ts`, `suspicion-notice.ts`, `claim-suspicion-notices.ts`, migration
`0151*`, `packages/channels/**`, `packages/domain/src/rbac/**` ⇒ exit 0. (b) The RE15 files (`nominee-refusal-read.ts`,
`RootLayout.tsx`, and `NomineeRefusalsRoute.tsx` beyond RE9 A's route change) ⇒ a diff of COMMENT lines only (checked by stripping
comments from both sides and diffing — ⛔ a code line moves). (c) RE8's relocation files: `context.ts` and
`request-context/index.ts` ⇒ import/re-export lines only; `email-index.ts` ⇒ import lines, the removal of its local `ENC_CONTEXT`
(`:21-24`), and `decryptEmail`'s body becoming a one-line delegation to `decryptAdminEmail` — nothing else. ⛔ No new permission key. A no-decision source fence over the new domain + jobs
modules, modelled on `apps/jobs/tests/claim-suspicion-notice-no-decision.test.ts` (`FORBIDDEN` names, `DECISION_TABLE_NAMES`,
`FORBIDDEN_WRITES` regexes — insert / update [ONLY] / delete / merge / truncate / drizzle / interpolated `${…}`, schema-qualified,
aliases — one shared `violationsOf`, one plant per form into a mutated copy, a commented-plant negative, a positive control), its table
list EXTENDED with `role_grants`, `users`, `admin_credentials` (Invariant 4: the sweep writes ⛔ identity data).

### AC10 — The proof
Every test passes; each load-bearing one red-checked (Debug Log: the plant, the red, the revert) — at least: the freeze anchor (plant the
live row's `decided_at` ⇒ AC1 freeze leg (i) goes red), the display-name non-conjunct, the NULLS NOT DISTINCT, the config pre-check and
provider pre-flight, the HELD error class (plant status-based classification ⇒ AC4 (ix) red), the lease (plant 10 min ⇒ AC4 (viii) red),
the `-297` §2 branch, the after-commit decrypt, the `detail` vocabulary, the param-type guard. `pnpm ci:local` green with `DATABASE_URL`
at :5433; `pnpm domain-invariants:check` green.

## Tasks / Subtasks

- [x] **Task 0 — Governance (AC0). ⛔ NO CODE BEFORE 0.3 IS COMMITTED.**
  - [x] 0.1 `git fetch origin`; confirm `origin/main` still `3a7d3a1f` (else re-derive every `file:NNN` used); grep `.decision-log.md`
        for any entry after `-298` touching `-239`, D2, FQ3, rows 6-25 / 6-27 (none ⇒ record "none"); re-locate F9's stale lines.
  - [x] 0.2 Put RE1–RE17 to BigDev with each recommendation (RE3: the freeze confirm A/B + the two edges A/B; RE6: the provider; RE7:
        hold vs boot-fail; RE8: A or B; RE9: the words + the return path A/B; RE12: Row 24 (e) A/B); quote each answer AS GIVEN.
        Re-verify the chosen provider's current API + region endpoint (Context7 / docs) and RECORD in the story: the request shape, the
        error-NAME classification table (transient / held / `rejected`), the pre-flight call, and the tracking-off settings.
  - [x] 0.3 Draft the author-commit `2026-10-09-299` (or next free) in the scratchpad (header shape: `-295`'s); run ≥1 fresh-context check
        on the draft until it finds ⛔ no BLOCKER/HIGH; insert into `.decision-log.md` (newest first) — if the write is refused, ask once
        ([[project_decision_log_writes_user_inserted]]); commit ALONE: `governance(6.25): 2026-10-09-299 — …`.
  - [x] 0.4 Second governance commit: `docs/adr/ADR-0040-staff-email-transport.md` (from `_adr-template.md`; status `drafted`;
        `Supersedes: —`; Context = F3 (incl. the existing `users` drift) + F16 + F17 + FQ3 A; Decision = the provider + the residency
        reading + tracking-off + the jobs DB role + Q1/Q2 as an in-body AMENDMENT of ADR-0009 §5's identity-data controls, ADR-0004's
        `> **Amendment — …**` form; a cross-link to `email-channel.md`'s provider-ADR placeholder) + the `adr-index.md` row AND its ledger
        breakdown + Total; `epics.md` `### Story 6.25` (after 6.24b; a dated source line citing `-261` D2 B / `-262` FQ3 A / `-299`);
        `docs/launch-gate-inventory/inventory-roster.md` Rows 24–25 (RE14); `deferred-work.md`: RE16's two confirms owed to the next
        routing note + RE12's observation on the 8.14 item + RE11's `batchSize = 1` observation on the 6.24b round-3 batch-loop item
        (⭐ this task is the ONLY place these lines are written). ADR-0009 itself is
        ⛔ not edited now — its in-body pointer is added only when ADR-0040 is ratified, by the ratifying decision.
  - [x] 0.5 Record the answers in this file's RE block (`✅ committed by -299`); never edit RE text after commit — a later change is a NEW
        entry + a dated `⚠ AMENDED` line.
- [x] **Task 1 — Migration 0152 + schema + RLS (AC8; RE5).**
  - [x] 1.1 Hand-author `packages/domain/migrations/0152_claim-suspicion-staff-emails.sql` (`--> statement-breakpoint` separators) + journal
        idx 152. Never `db:generate` (42P07). Apply via `pnpm db:migrate` to :5432 AND :5433.
  - [x] 1.2 `src/schema/claim_suspicion_staff_emails.ts` (+ `SUSPICION_STAFF_EMAIL_OUTCOMES` `as const`; the UNIQUE via drizzle's
        `unique(…).on(…).nullsNotDistinct()` — `feature_flag_versions.ts:170`), `src/policies/claim-suspicion-staff-email-rls.ts`;
        barrels `schema/index.ts`, `policies/index.ts`; `member/anonymize.ts` comment (precedent `:297`).
  - [x] 1.3 `tests/integration/rls/claim-suspicion-staff-email-policy-regression.spec.ts`; constraint-by-name + exact-set + column-grant spec.
- [x] **Task 2 — Admin email relocation + reader (AC7; RE8).**
  - [x] 2.1 New `packages/domain/src/encryption/admin-email.ts` (`ADMIN_EMAIL_FIELD_CLASS`, the envelope context, `decryptAdminEmail`;
        exported by the encryption barrel); `apps/api/src/context.ts`, `email-index.ts` and `middleware/request-context/index.ts` import /
        re-export it. `auth-primitives.test.ts` passes UNEDITED; ADD the encrypt⇒decrypt cross-check test.
  - [x] 2.2 `readAdminEmailCiphertext(db, userId)` (Q2: ONE column, ONE user). The RE8 source fence (exact allowlist, Q1/Q2 projection
        rules, `decryptAdminEmail` caller allowlist, comments stripped, one plant per rule).
- [x] **Task 3 — Domain module `claim/suspicion-staff-email.ts` (AC1, AC2, AC4, AC5, AC7; RE1–RE5, RE11).**
  - [x] 3.1 The RE3 eligibility (Q1) as ONE raw-SQL fragment — (a) text compare, (b) `suspicionChainStartedAtSql`, (c), (d) `EXISTS` —
        used by BOTH the selector and the locked re-check (⛔ two derivations).
  - [x] 3.2 Selector, give-up, begin, finalise, noteTransient — exactly RE11's kinds, reasons, lease and rules; `STAFF_EMAIL_SEND_LEASE_MS`;
        the `detail` vocabulary as ONE exported builder (⛔ free text); `clampLimit`; `sql.param([...allow])` for arrays (⛔ a JS array in a
        `sql` template — 6.24b's "malformed array literal").
  - [x] 3.3 `claim/index.ts` barrel; `FENCED_FILES` (`packages/domain/tests/claim/nominee-name-no-comparison-fence.test.ts:38`) += the
        module (+ the sibling reader if separate) — its EXACT pin `toBe(39)` (`:168`) becomes 40 (41), reason in the comment; ⛔ a
        `toLowerCase() ===` anywhere in the module (the fence's `:145` pattern — address handling stays in jobs); a dedicated ref-only /
        no-decrypt test (precedent `:370-381`).
  - [x] 3.4 `tests/integration/claim/suspicion-staff-email.spec.ts` (every AC1/AC2/AC5 leg, each in its OWN Pariwar where alarms are
        sampled; explicit instants per AC1) + `suspicion-staff-email-concurrency.spec.ts` (AC4 i, iv races; rollback in `afterEach`;
        `lock_timeout`; leftover check). Fixtures: `_helpers.ts` (`seedUser` with status, `seedRoleGrant` — ⚠ its defaults are
        `district_admin` @ `Patna` and `now()`; pass `pariwar_admin`, `'pariwar'`, `P::text` — and it can ⛔ set `created_at`: a freeze-leg grant is a raw `INSERT INTO role_grants
        (…, created_at)` with an explicit instant in its own committed tx), `_suspicion-refusal-fixtures.ts`
        (`refusedClaim`, `openAppeal`, `reverseAtStage1`, …); `admin_credentials` has ⛔ shared seed — a raw INSERT (NOT NULL
        `email_ciphertext`, `email_blind_index`, `password_hash`; precedent `cross-pariwar-leak.spec.ts:488`) with a test-unique blind index.
- [x] **Task 4 — Transport + templates (AC3, AC6; RE6, RE7, RE9).**
  - [x] 4.1 `apps/jobs/src/scheduler/staff-email-client.ts` — the port, the chosen provider's `fetch` adapter (injectable `fetch` — the
        `packages/channels/src/providers/sms-app.ts:187` shape; `AbortSignal.timeout(ms)` — the `packages/edge/src/turnstile.ts:183`
        precedent; Node ≥ 22.12 has both), the fake; classification by error NAME per Task 0.2's recorded table; `Charset: 'UTF-8'`;
        the `detail` builder; deps declared LOCALLY (⛔ a type-only→value import cycle — [[project_type_only_import_cycle_trap]]).
  - [x] 4.2 Config resolution in `contribution-providers.ts:218-237`'s pattern (or a sibling), the RE7 answer on an unresolvable name,
        the provider pre-flight; boot wiring; document the variables in `apps/jobs/README.md` (⛔ `apps/jobs/.env.example` exists — and
        the SMS precedent's variables are in ⛔ `.env.example` either).
  - [x] 4.3 `suspicion-staff-email-templates.ts` + `claim.json` en/hi keys + `$comment.suspicion_staff_email` in BOTH locales; tests
        through the real `t()`. (⛔ `microcopy.yaml` change — `claim.json` is already scoped.)
  - [x] 4.4 Per RE9's answer: (A) `router.tsx`'s `loginRoute` (`:72-76`) gains `validateSearch` ⇒ `{ next?: string }` (or `LoginPage`
        reads it via `useSearch({ strict: false })` — the dev's pick, recorded); BOTH redirects in `NomineeRefusalsRoute.tsx` (`:25`, `:38`)
        pass `search: { next: <its own path> }`; `LoginPage.tsx:138` honours an allowlisted relative `next`; admin-app tests for the round
        trip and the open-redirect refusals. (B) nothing.
- [x] **Task 5 — The sweep + child (AC2, AC4–AC7; RE10–RE12).**
  - [x] 5.1 `apps/jobs/src/scheduler/claim-suspicion-staff-emails.ts` (new budget/expiry/lease constants; the send worker's explicit
        `batchSize: 1`; the tick catch through `alarm()`); `QUEUE_NAMES` pair in `packages/queue/src/index.ts` (its test asserts uniqueness only);
        register in `boot.ts` after `registerClaimSuspicionNoticeWorkers` (`:619`) with its own deps. Do ⛔ not wire `onAlarm`.
  - [x] 5.2 `apps/jobs/tests/claim-suspicion-staff-emails-live.test.ts` (own-committing, `describe.skipIf(!DATABASE_URL)`, random Pariwar +
        allowlist, injected clock, fake client capturing `to`; every AC leg; the AC7 stringify sweep). ⚠ 6.24b's world helpers in
        `claim-suspicion-notices-live.test.ts` (`seedDeath`, `claimOf`, `determine`, `refuse` — accepts `decidedAt`, `reviseOff`,
        `openAppeal`, `allowAppeal`, `harness`, `isolated`, `tick`, `:82-320`) are CLOSURES inside that file's `describe` block (capturing
        `pool` and its trackers) — ⭐ copy them (recommended), or extract them with explicit `pool` / tracker parameters (a signature and
        call-site refactor of that file — record it). EXTEND `cleanupClaims`
        (`_claim-correction-seed.ts:333-420`): it deletes `users` under `session_replication_role='replica'`, which DISABLES the FK
        cascade ⇒ delete `admin_credentials` (and the new table) explicitly, and add both to its leftover count (`:402-409`).
  - [x] 5.3 `claim-suspicion-staff-email-no-decision.test.ts` (AC9 fence, per AC9's model and table list).
- [x] **Task 6 — RE15 comments + sprint ledger (AC9 (b)).** The RE15 comment hunks (four sites); `sprint-status.yaml` row + a prepended
      `last_updated` comment block ([[project_sprint_status_safe_prepend]] — guard size, verify YAML). (`deferred-work.md` is Task 0.4's.)
- [x] **Task 7 — Proof (AC9, AC10).** Red-checks logged; AC9 (a) `git diff --exit-code`, (b) comment-only, (c) import-only;
      `pnpm domain-invariants:check`; `pnpm ci:local` at :5433; grep `\*\*/` over every edited JSDoc block; File List complete.

### Review Findings

> Code review 2026-10-09 (`bmad-code-review 6.25`, full diff `3a7d3a1f..391a670c`, code + docs; three layers (Blind Hunter, Edge
> Case Hunter, Acceptance Auditor) in PARALLEL, read-only). Triage: **3 decision-needed, 6 patch, 1 defer, 8 dismissed**; all three
> decisions resolved 2026-10-09 (user's call: options 1, 1, 2) ⇒ **8 patch, 1 defer, 9 dismissed.** §0 gate:
> ⛔ none of the three decisions are the Panel's — all three are engineering/implementation calls (an address-validation policy, a
> package-boundary call, a retry-classification call), ⛔ a roster row, ⛔ a ratified clause. Dismissed (each re-traced, ⛔ taken on
> a layer's word): SES's empty `rejected` set / unrecognized-name-⇒-HELD default (RE6, re-verified against the providers' docs — a
> 400 `MessageRejected` is EXPLICITLY the sandbox/account case the table records, ⛔ a missed per-recipient signal — `:206, :330, :609`
> of this file); `staffEmailRecipientsSql`'s hardcoded `se_` aliases (the doc comment at `staff-email-identity-read.ts:33` already
> states + mitigates the exact nesting risk raised); the ZeptoMail `data.error_code` fallback never producing a `<code>.<sub-code>`
> name (`staff-email-client.test.ts:218` pins the bare-code / `held:` outcome as INTENDED, ⛔ a gap); the provider pre-flight running
> once per 15-minute tick, ⛔ mid-run (RE7's explicit "ONCE per run" design; this channel is go-live-gated and non-critical — a
> transient blip costs one bounded 15-minute tick); the migration's `UNIQUE NULLS NOT DISTINCT` needing PG 15+ (CI runs
> `postgres:16-alpine`; the identical syntax is already used elsewhere in `packages/domain/migrations`); `login-next.ts`'s allowlist
> regex being "only" a shape check (the destination route's own 401/403 handling — `NomineeRefusalsRoute.tsx`, Story 6.20 — is the
> real authorization boundary, pre-existing and untouched by this diff); `createFakeStaffEmailClient`'s default responder having no
> once-per-row tracking (speculative — no current test exercises a double-send through it; the DB's own UNIQUE constraint is the
> real guard, by design); ZeptoMail's rejected-by-NAME classification outranking its 5xx/429 `mayHaveSent` status check (RE6's
> explicit, repeatedly-stated design: NAME always wins over status, and the `rejected` type deliberately carries no `mayHaveSent`
> field at all — an untested combination, ⛔ a behavioral bug).

- [x] [Review][Decision] ✅ RESOLVED 2026-10-09 (option 1) ⇒ a patch below. **`isSendableEmailAddress`'s ASCII-only gate
  (`apps/jobs/src/scheduler/staff-email-client.ts:380-382`) applies to the DECRYPTED STORED admin address, not just
  `STAFF_EMAIL_FROM`** — a historically-registered non-ASCII admin email (nothing in `scripts/provision-admin.ts` enforces ASCII
  at provisioning) hits `noAddress('invalid_address')`: a FINAL `error` row, no retry, that admin silently and permanently
  excluded from every future suspicion-refusal notice for their Pariwar — against the Panel's "every Pariwar Admin" ruling.
  Options were: reject non-ASCII by design + validate at provisioning (A); admit SMTPUTF8 / percent-encoded addresses through to
  the provider (B); accept as residual risk (C). Chosen: **A** — validate at `scripts/provision-admin.ts` so the invariant holds
  by construction; the runtime check stays as a backstop. ⚠ Scoped to FUTURE provisioning only — no production data audited from
  a code review.
- [x] [Review][Decision] ✅ RESOLVED 2026-10-09 (option 1) ⇒ a patch below. **`apps/api/tests/unit/admin-email-relocation-crosscheck.test.ts:9`
  deep-imports `@twt/jobs/src/deps.js`** instead of the `@twt/jobs` public barrel — every other `apps/api → @twt/jobs` import in
  the codebase (`context.ts`, `deps.ts`, the shepherd / cycle-freeze handlers, `tests/integration/_setup.ts`) goes through the
  barrel (`apps/jobs/src/index.ts`); `buildJobsEncryptionDeps` just isn't exported from it. Options were: export it from the jobs
  barrel (A); rework the test to build an equivalent `JobsEncryptionDeps` without reaching into jobs' internals (B); accept as
  residual risk (C). Chosen: **A** — the test's point is proving byte-identical behavior against the EXACT function the jobs
  child calls; a hand-rolled equivalent (B) would weaken that guarantee.
- [x] [Review][Decision] ✅ RESOLVED 2026-10-09 (option 2) ⇒ dismissed, no action. **`render_failed` (a static template / `t()`
  defect) is routed through the exact same transient-retry path as a network hiccup** (`apps/jobs/src/scheduler/claim-suspicion-staff-emails.ts:332-337`
  → `transient({ held: false, … })`) — unlike `read_failed` / `decrypt_failed` (plausibly transient DB/KMS hiccups), a rendering
  defect reproduces identically on every pg-boss retry and gives up after 3 IST days with no distinct alarm. Options were: a
  distinct, more urgent classification — a 0152 CHECK / detail-vocabulary change (A); accept as a code-bug class tests should
  catch before it ships, no change (B); accept as residual risk (C). Chosen: **B** — Task 4.3's real-`t()` tests should catch
  this in CI; the channel is already non-critical and go-live-gated, and the retry window is bounded (3 IST days, no data loss).

- [x] [Review][Patch] ✅ APPLIED 2026-10-09. **`expireExhaustedSuspicionStaffEmails`'s give-up UPDATE never sets
  `may_have_sent = true`**, though the function's own doc and the sweep's alarm both say a given-up row ALWAYS may have sent.
  [packages/domain/src/claim/suspicion-staff-email.ts:250-257] — added `may_have_sent = true` to the SET clause; strengthened
  both the existing live (`apps/jobs/tests/claim-suspicion-staff-emails-live.test.ts`) and domain
  (`packages/domain/tests/integration/claim/suspicion-staff-email.spec.ts`) give-up assertions to check it.
- [x] [Review][Patch] ✅ APPLIED 2026-10-09. **`beginSuspicionStaffEmail`'s locked-recheck-failure UPDATE has the identical
  gap** — an existing `attempting` row finished to `error` by a failed re-check never sets `may_have_sent = true` either, though
  the `'expired'` contract and the child's own alarm both say "a prior attempt may have sent."
  [packages/domain/src/claim/suspicion-staff-email.ts:372-378] — same fix + the same two test files' recheck-failure assertions
  strengthened.
- [x] [Review][Patch] ✅ APPLIED 2026-10-09. **`LoginPage.completeLogin()` re-parses `next` from `window.location.search`
  instead of the `/login` route's own `validateSearch`-typed state** — both added by this diff; the route's own comment says
  the typed value should be consumed. [apps/admin/src/routes/LoginPage.tsx:141] — now reads `useSearch({ from: '/login' })`;
  removed the now-dead `nextFromLocation` from `login-next.ts`; updated both `login-return-path.test.tsx`'s and
  `login-turnstile.test.tsx`'s `@tanstack/react-router` mocks to supply `useSearch` (the latter rendered `LoginPage` too and
  would otherwise crash).
- [x] [Review][Patch] ✅ APPLIED 2026-10-09. **`resolveAdminAppOrigin` rejects semantically-valid origins differing only in
  case or an explicit default port** (`https://Example.com`, `https://admin.example.com:443`) — a verbatim string compare
  against the URL-normalized `.origin` silently HOLDS every email behind `config:admin_app_origin_invalid`.
  [apps/jobs/src/scheduler/staff-email-config.ts:112] — compares a lowercased, slash-stripped raw against EITHER `url.origin`
  or `` `${url.origin}:443` `` (https's own default), preserving the existing path-smuggling guard; added coverage for the
  case, default-port, and default-port-plus-smuggled-path cases.
- [x] [Review][Patch] ✅ APPLIED 2026-10-09. **`buildStaffEmailClient`'s `bootAlarm` omits the sender-address gap** — a
  broken/missing `STAFF_EMAIL_FROM` with otherwise-resolving secrets raised no boot alarm, and the sweep alarms on a config gap
  only when a pair is actually due, so it stayed silent until the first real suspicion refusal.
  [apps/jobs/src/scheduler/staff-email-config.ts:82] — `bootAlarm` now mirrors the client's own `gap:` line
  (`unresolvable ? 'config:secret_unresolvable' : fromGap`) for both providers; added a `bootAlarm` assertion to the existing
  bad-sender test.
- [x] [Review][Patch] ✅ APPLIED 2026-10-09. **No catch/alarm around the per-job handler in the `CLAIM_SUSPICION_STAFF_EMAIL_SEND`
  worker** — unlike the sweep tick's own try/catch + alarm, an unexpected non-`ClaimCorrectionTransientError` throw (e.g.
  `beginSuspicionStaffEmail`'s documented "should never happen" Error on a missing claim row) propagated to pg-boss with zero
  alarm from this code. [apps/jobs/src/scheduler/claim-suspicion-staff-emails.ts:369-375] — wrapped the per-job call in
  try/catch; alarms (ids + error name only) on anything that ISN'T `ClaimCorrectionTransientError` (⛔ double-alarming the
  designed transient/HELD path, which already alarms internally), then rethrows so pg-boss's retry/failure bookkeeping is
  unaffected.

- [x] [Review][Patch] ✅ APPLIED 2026-10-09 (from Decision 1, option A). **`scripts/provision-admin.ts` didn't validate
  `ADMIN_EMAIL` is ASCII-sendable before provisioning** [scripts/provision-admin.ts:120] — added an ASCII-shape check
  (mirroring `isSendableEmailAddress`'s gate) that throws before any write, so the staff-email invariant holds by construction;
  scoped to future provisioning only, per the decision.
- [x] [Review][Patch] ✅ APPLIED 2026-10-09 (from Decision 2, option A). **`buildJobsEncryptionDeps` wasn't exported from the
  `@twt/jobs` barrel** [apps/jobs/src/index.ts] — exported it (+ `JobsEncryptionDeps`) from `apps/jobs/src/index.ts`; changed
  the cross-check test's import from the deep `@twt/jobs/src/deps.js` path to the public `@twt/jobs` barrel.

- [x] [Review][Defer] **The keyset selector's `LIMIT` is spliced via `sql.raw(String(size))`, trusted on `clampLimit` alone for
  integer-safety** [packages/domain/src/claim/suspicion-staff-email.ts:206] — deferred, pre-existing: the identical pattern
  already exists at `packages/domain/src/claim/suspicion-notice.ts:189`; not introduced by 6.25.

#### Review Findings — ROUND 2 (narrow, round 1's fixes `391a670c..HEAD` — 16 files, 495 lines, uncommitted; three layers
SEQUENTIAL, read-only — 2026-10-09)

> Triage: **0 decision-needed, 3 patch, 1 defer, 7 dismissed** (B2 folded into the B1/E1 patch below — one code change
> closed both). All 3 patches applied. §0 gate: N/A (no decisions this round). Dismissed (each re-traced, ⛔ taken on a
> layer's word): the outer catch's alarm text omitting `err.message`/stack/claim-recipient ids (`job.id` is enough to look
> the job up in pg-boss; `err.message` is ⛔ sanitised like `detail` is — Invariant 2 forbids it); the catch trusting every
> `ClaimCorrectionTransientError` site to already self-alarm (traced `runSuspicionStaffEmailChild` — every HELD/transient
> path already throws it via `transient()`, which already alarms; a FUTURE un-alarmed throw site would be a defect of
> THAT site, not this wrapper); the try/catch only making sense under `batchSize: 1` (true, but IDENTICAL before this
> round — a throw of ANY kind already aborted the loop under a higher `batchSize`; not introduced or worsened here);
> `login-return-path.test.tsx`'s `useSearch` mock re-deriving `window.location.search` internally (standard, correct
> practice for mocking a framework hook in a component unit test — it mirrors `loginRoute`'s OWN `validateSearch`, by
> design and by comment); both mocks ignoring the `{ from }` argument (TypeScript's OWN route-id typing is the real
> safety net for a misspelled route, not a runtime mock — confirmed by a clean `tsc --noEmit`); the jobs-barrel export
> "pulling in the whole `@twt/jobs` module graph" (true of ANY barrel import, but `apps/api` already imports the SAME
> barrel in PRODUCTION code — `deps.ts`, `context.ts` — so this is ⛔ a new exposure); `resolveAdminAppOrigin` lowercasing
> the whole raw string rather than just the scheme/host (correct only because an earlier check in the SAME short,
> adjacent, well-commented function already emptied path/query/hash — a real but low-severity, speculative
> future-refactor risk, not a current defect).

- [x] [Review][Patch] ✅ APPLIED 2026-10-09. **`scripts/provision-admin.ts`'s new ASCII-only gate was narrower than the
  runtime check it exists to backstop** (Blind Hunter + Edge Case Hunter, independently converged) — `ASCII_EMAIL_SHAPE`
  caught non-ASCII but NOT a pure-ASCII, still-invalid shape (`a@b`, no dotted domain; 250+ chars), which
  `isSendableEmailAddress` would still reject later, reproducing the exact silent permanent exclusion this patch exists
  to prevent — via a different cause. [scripts/provision-admin.ts:126] — now imports and calls
  `isSendableEmailAddress` directly from `apps/jobs/src/scheduler/staff-email-client.ts` instead of a hand-rolled
  regex, closing the gap AND the duplication/drift risk (B2) in one change — the two can ⛔ diverge again, by
  construction.
- [x] [Review][Patch] ✅ APPLIED 2026-10-09. **No test exercised the new try/catch's alarm-and-rethrow behavior for an
  unexpected throw** — the one behavioral change most likely to regress silently had nothing pinning it.
  [apps/jobs/tests/claim-suspicion-staff-emails-live.test.ts] — added a NO-DATABASE test: a malformed `claimCaseId`
  throws `InvalidBrandedIdError` out of `ids.claimId(...)` before any DB/network call: asserts the handler rejects,
  exactly one alarm fires (job id + the error NAME only — ⛔ the bad value, Invariant 2), and the designed transient
  path's own internal alarming is untouched (traced, not re-tested — a live-DB transient scenario is already covered
  extensively elsewhere in this file).
- [x] [Review][Patch] ✅ APPLIED 2026-10-09. **`buildStaffEmailClient`'s `bootAlarm` fix (round 1) re-derived the SAME
  `unresolvable ? 'config:secret_unresolvable' : fromGap` ternary already computed for `gap`, duplicated across both
  provider branches** — the identical "two places, one invariant" shape that let `bootAlarm` silently diverge from
  `gap` in the first place. [apps/jobs/src/scheduler/staff-email-config.ts:70-92] — each branch now computes `gap`
  ONCE and passes the SAME value to both the client's `gap` option and the returned `bootAlarm`.

- [x] [Review][Defer] **`scripts/provision-admin.ts` has ZERO test coverage of any kind (pre-existing — no test file
  for this script exists at all), including the new/round-2-fixed ASCII/shape validation** — deferred: the validation
  now delegates entirely to `isSendableEmailAddress`, which already has extensive dedicated coverage
  (`apps/jobs/tests/staff-email-client.test.ts`); bootstrapping first-ever test infrastructure for this never-tested
  ops script (DB mocking, `PROVISION_DRY_RUN` simulation, etc.) is disproportionate to this one wiring line. ⭐ Trigger:
  any future change to `provision-admin.ts`'s validation or write logic, or a decision to stand up test infra for it
  generally.

#### Review Findings — ROUND 3 (full diff `3a7d3a1f..1f557e06`, code only — 43 files; three chunks (domain / jobs / admin+api+scripts) ×
three layers = nine reviewers in PARALLEL, read-only — 2026-10-09)

> Triage: **2 decision-needed, 12 patch, 3 defer, 27 dismissed** (duplicates merged across the nine reports); both decisions
> resolved 2026-10-09 (the user's call: A, A) ⇒ **14 patch, 3 defer, 27 dismissed**, all 14 patches applied. §0 gate: ⛔ neither
> decision is the Panel's — stripped of citations, D1 is *"should the code's give-up clock run while the whole channel is held by a
> config fault?"* and D2 is *"should 0152 carry a CHECK / trigger the writers already honour?"* — both "the code should do X" (the
> Panel's *"every Pariwar Admin"* is ⛔ re-opened; D1 is how the code FAILS it). Dismissed (each re-traced, ⛔ taken on a layer's
> word): ⚠ the one HIGH raised (chunk B Blind Hunter — "a DB failure after an `accepted` send re-sends with `may_have_sent` never
> set") is FALSE: the re-claim UPDATE sets `may_have_sent = may_have_sent OR detail IS NULL` (`suspicion-staff-email.ts`, the
> `begin` re-claim), and a throwing finalise / note or a killed process leaves the claim's NULL `detail` ⇒ flagged; AC4 (ii)'s
> `false` is right (its row was noted with a 429) — the layer was blind to the domain half. Also dismissed: no cap on re-sends
> after an ambiguous failure (Invariant 6 — at-least-once RECORDED, by design); the give-up stamping `may_have_sent` on a row that
> only saw pre-call failures (`-297` §2 / `-298`, round 1); ZeptoMail reading `details[0]` only (fails SAFE — HELD + alarmed); the
> ZeptoMail `cpaas.zoho.in` host (ADR-0040 + Latest tech notes record it ⚠ UNVERIFIED, Row 24); `singletonKey` re-enqueue per tick
> (documented ×3; a duplicate child is `held_by_other`); per-pair enqueue-failure alarm volume (speculative); the `@ts-expect-error`
> template test (`apps/jobs/tsconfig.json` includes `tests/**` — tsc enforces it); SES `BadRequestException` / `MessageRejected`
> HELD (round 1); a bare 408 HELD (conforms to the RE6 table); a mid-run sweep throw losing its end-of-run alarms (the tick-FAILED
> alarm + pg-boss's retry cover it); keyset / give-up lacking `pariwar_id` (`claims.claim_case_id` is a GLOBAL primary key); worker
> clock skew on the lease (one jobs process, the injected clock); a stale `previousDetail` (alarm dedup only); `pre_call` words
> sharing the `transient:` namespace (speculative); the Drizzle `.references()` FK name ≠ 0152's (0151 has the same shape; ⛔
> snapshot diffing); a `no_target` row beside a later chain's recipient rows, and once-ever spanning chains (RE2 rules both); live
> (⛔ frozen) active / credential checks (RE3 edge (i) ACCEPTED); a permanent-401 sign-in loop (speculative — a broken session
> breaks every page); provision's raw-vs-normalised gate (`requireEnv` trims; a raw pass ⇒ a lower-cased pass), the gate running
> before the existing-admin branch (surfacing a bad stored address is the point), the import of the jobs client module (⛔ top-level
> side effects), its hand-written error text (cosmetic); the "⛔ `next` at all" test title (the glyph register reads it right);
> `request-context`'s by-value context + `email-index`'s `ENC_CONTEXT` alias (recorded residuals; both values single-sourced);
> the Policy-meaning sentence's "predates" vs the code's `<=` (a same-instant appointment only); shared `PARIWAR_A` state in the
> domain spec (the known residual — [[project_ci_local_double_run_pollution]]).

- [x] [Review][Decision] ✅ RESOLVED 2026-10-09 (option A — the user's call) ⇒ patch P-D1 below. **The give-up runs while a channel-wide hold blocks every retry — rows burn without one attempt, and the
  hold alarm then says something false** — `runSuspicionStaffEmailSweep` runs step (1) `expireExhaustedSuspicionStaffEmails` BEFORE
  step (2)'s config / pre-flight check and ignores it; a held run enqueues ⛔ nothing, so an existing `attempting` row (selector
  branch 3) is never re-claimed, its `claimed_at` ages past the lease, and once `created_at` < 00:00 IST of today − 2 it becomes
  `error` / `exhausted:attempting_three_days` with `may_have_sent = true` — while the end-of-run alarm says *"⛔ nothing was enqueued
  or written for them, and they will be sent once it is fixed"*. Trigger: sends start failing `SendingPausedException` (rows stay
  `attempting`), then `GetAccount` shows `SendingEnabled: false` ⇒ `preflight:sending_disabled` for 2+ IST days (or an IAM key
  lacking `ses:GetAccount` ⇒ `preflight:AccessDeniedException` from day one). Pairs with ⛔ row are sent after the fix; pairs that
  had begun are lost — an admin never emailed, recorded "may have sent". Options: (A) skip the give-up on a held run AND age only
  non-held time — e.g. the give-up also requires `claimed_at` ≥ the last held run's end, or the sweep refreshes `claimed_at` on the
  rows it holds (one bounded UPDATE, ⛔ a send) so the lease-predicate keeps them alive; (B) skip the give-up on a held run only
  (simpler; but on the first un-held tick the give-up runs BEFORE any retry and burns them anyway — insufficient alone); (C) accept
  as residual and correct the alarm text to say in-flight rows may still be given up. [apps/jobs/src/scheduler/claim-suspicion-staff-emails.ts:133-213;
  packages/domain/src/claim/suspicion-staff-email.ts:249-266] (Edge Case Hunter, chunk B)
- [x] [Review][Decision] ✅ RESOLVED 2026-10-09 (option A — the user's call) ⇒ patch P-D2 below. **0152 has no DB backstop for the `detail` vocabulary or for terminal immutability** (checklist family 5 —
  REAL GAP; family 1 partial) — the only `detail` CHECK is `char_length <= 200`; `finaliseSuspicionStaffEmail` / `noteSuspicionStaffEmailTransient`
  take a bare `string`, so "a fixed vocabulary, ⛔ provider text that could echo an address" (Invariant 2) rests on every caller
  routing through `suspicionStaffEmailDetail`. And the `twt_app` UPDATE grant covers `outcome` / `may_have_sent` with ⛔ trigger:
  `accepted → attempting` or `may_have_sent true → false` is accepted by the DB (the policy-regression spec's "one positive UPDATE
  of every granted column" even exercises it), so "once ever for FINISHED rows" and "set TRUE, never back" rest on every writer's
  `outcome = 'attempting'` / `may_have_sent OR …` form (all of today's do). 0151 has the same shape. Options: (A) a new migration
  0153 — a `detail` / `first_detail` shape CHECK (`^[a-z_]+:[A-Za-z0-9_.:-]*$`, ⛔ `@`) + a BEFORE UPDATE trigger refusing a move
  OUT of a final outcome and `may_have_sent` true → false, applied to :5432 AND :5433, with policy-regression legs; also type the
  two writers' `detail` as the builder's output; (B) type the writers only (app-level, no migration); (C) defer to a joint 0151 +
  0152 hardening row. [packages/domain/migrations/0152_claim-suspicion-staff-emails.sql:46-47,59;
  packages/domain/src/claim/suspicion-staff-email.ts:448,479] (Acceptance Auditor + Edge Case Hunter + Blind Hunter, chunk A)

- [x] [Review][Patch] ✅ APPLIED 2026-10-09 — ⚠ BY A DIFFERENT MECHANISM than the one recorded here, kept as written: refreshing
  `claimed_at` does ⛔ work — once the hold lifts, every un-held run's give-up runs BEFORE any retry and fires at the SAME instant the
  refreshed lease lapses (both key on `claimed_at < now − lease`), so the row still burns without a retry. ⭐ Built instead (Decision
  1 A's intent — ⛔ count held time): a held run PARKS every `attempting` row past the lease (`claimed_by_job` =
  `SUSPICION_STAFF_EMAIL_PARKED_BY` = `'sweep:held'`; ⛔ `claimed_at` / `detail` / `may_have_sent` touched) via
  `parkHeldSuspicionStaffEmails` (DELIBERATE cross-tenant block); the give-up SKIPS parked rows and runs ONLY on an un-held run (the
  sweep now checks config + pre-flight FIRST); `beginSuspicionStaffEmail` re-claims a parked row at once (⛔ lease wait); the held
  alarm reports "N in-flight row(s) newly parked — ⛔ given up while held". Domain legs (park scope; give-up skips a parked row past
  both bounds; re-claim at once; ordinary after) + a live leg (held 24 h past the horizon ⇒ parked, ⛔ given up; fixed ⇒ sent on the
  next tick), red-checked at both layers. README updated. **P-D1 (from Decision 1, option A) — a held run keeps its in-flight rows alive** — on a run where the config
  check / pre-flight holds, refresh `claimed_at` (one bounded UPDATE, ⛔ a send, ⛔ an `attempt_count` change) on the `attempting`
  rows it holds, so the give-up's lease predicate cannot reach them; correct the end-of-run alarm's wording to match; a live leg:
  an `attempting` row held across > 3 IST days survives the hold and is sent on the first un-held tick.
  [apps/jobs/src/scheduler/claim-suspicion-staff-emails.ts:133-213; packages/domain/src/claim/suspicion-staff-email.ts]
- [x] [Review][Patch] ✅ APPLIED 2026-10-09 — `0153_claim-suspicion-staff-email-backstops.sql` (hand-authored, journal idx 153) applied
  to :5433 AND :5432 (both clean — ⛔ existing row violated it): two `*_vocabulary_check` CHECKs (named AFTER the length CHECKs, so an
  over-long value still reports length) + `claim_suspicion_staff_emails_guard_update` BEFORE UPDATE trigger (a finished row is frozen
  — ANY column, even for the superuser; `may_have_sent` true → false refused; ⛔ DELETE arm, so the claim cascade still deletes).
  `SUSPICION_STAFF_EMAIL_DETAIL_PATTERN` in the schema file is the ONE grammar (the Drizzle `check()`s use it; a policy-regression
  leg pins the catalog's pattern to it). ⚠ The writers' `detail` is guarded by a RUNTIME assertion (`isSuspicionStaffEmailDetail`,
  thrown before the UPDATE, ⛔ value echoed) rather than a branded TYPE — a brand would have re-typed every scripted fake result in
  the jobs tests for the same protection. Policy spec: `seedEmail` now seeds an IN-FLIGHT row (the trigger freezes a finished one);
  the "every granted column" UPDATE goes `attempting → error`; vocabulary + trigger + lockstep legs added. **P-D2 (from Decision 2, option A) — migration 0153: 0152's DB backstops** — a `detail` / `first_detail` shape
  CHECK (the fixed vocabulary's grammar, ⛔ `@`); a BEFORE UPDATE trigger refusing a move OUT of a final outcome and `may_have_sent`
  true → false; applied to :5432 AND :5433; policy-regression legs (each refused, red-checked); the two writers' `detail` typed as the
  builder's output. [packages/domain/migrations/0153_*; packages/domain/src/claim/suspicion-staff-email.ts:448,479;
  packages/domain/tests/integration/rls/claim-suspicion-staff-email-policy-regression.spec.ts]
- [x] [Review][Patch] ✅ APPLIED 2026-10-09 — `bootAlarm` IS `client.configGap()` in both provider branches; an unknown provider ⇒ `config:provider_unknown` boot alarm; `provider_unset` stays silent; unit legs for sender_missing / credentials_missing / ses_region_invalid / zeptomail_host_invalid + `bootAlarm === configGap()` for each. **`bootAlarm` still diverges from the client's own gap** — round 1 / 2 fixed only the sender; `config:credentials_missing`
  (SES secret-NAME vars unset), `config:ses_region_invalid`, `config:zeptomail_host_invalid` and `config:provider_unknown` (a typo)
  all boot SILENT and surface only when a first real refusal makes a pair due; the comment *"computed once so the two can ⛔
  diverge"* is untrue. Fix: `bootAlarm: client.configGap()` in both provider branches; `provider_unknown` ⇒ its own word;
  `provider_unset` stays `null` (deliberately off). [apps/jobs/src/scheduler/staff-email-config.ts:70-97] (all three layers, chunk B)
- [x] [Review][Patch] ✅ APPLIED 2026-10-09 — domain: `upheld_final` (⚠ that is the APPEAL's status — the claim stays `denied`), the no-admin NULL pair through open → reversed; jobs live: RE3 (a) with a lettered Pariwar id and an UPPER-cased `scope_value`, AC6 `sender_missing` / `credentials_missing` legs + the pre-flight-throws leg's ⛔ row / ONE `preflight:failed` alarm, AC7 on the error paths (5xx retry, HELD, `rejected`, `error:invalid_address` — rows, alarms, logs, thrown messages); RE11's empty / production allowlist refusals and AC2 (ix)'s schedule pin moved OUT of `skipIf(!hasDatabase)` (a no-DB describe). **Missing AC legs** — AC2 (vi)'s `upheld_final` appeal is tested NOWHERE (⛔ `upheld` in any 6.25 spec; the
  `stage3(…, 'upheld')` fixture exists) though Tasks 3.4 / 5.2 are ticked "every AC2 leg" (family 10); RE3 (a)'s case-sensitive
  compare never sees a letter (the trailing-space substitute is honest, but `lower(scope_value)` would pass — use an `isolated()`
  hex Pariwar with an upper-cased `scope_value`); AC6's `config:sender_missing` leg is untested and the "pre-flight throws" leg
  asserts only `enqueued === []` (⛔ "⛔ row", ⛔ "ONE end-of-run alarm"); RE11's empty / production allowlist refusals are untested;
  AC7's address-echo leg is unit-only — ⛔ stringify sweep over a transient / held / rejected / error run's rows, alarms and thrown
  messages; AC2 (ix)'s schedule pin needs ⛔ DB yet sits inside `describe.skipIf(!hasDatabase)`.
  [packages/domain/tests/integration/claim/suspicion-staff-email.spec.ts:196,285; apps/jobs/tests/claim-suspicion-staff-emails-live.test.ts:367,419,445,701]
  (Acceptance Auditors, chunks A + B)
- [x] [Review][Patch] ✅ APPLIED 2026-10-09 — `name === 'http_429'`; named-429 legs (a HELD code, an unknown code ⇒ held; `TM_3601.SMI_115` stays transient). **ZeptoMail classifies a NAMED 429 by status** — `status === 429` makes a 429 carrying a recorded HELD code
  (e.g. `TM_3601.SM_133`) or an unknown code `transient:` with ⛔ held alarm, against RE6 (by NAME, ⛔ status alone) and the table's
  `http_429` (the NAMELESS 429); the SES twin does it right (`name === http_<status>`). Fix: `name === 'http_429'`; "any 5xx" stays
  status-keyed (the table says so); a named-429 test. [apps/jobs/src/scheduler/staff-email-client.ts:269] (Acceptance Auditor, chunk B)
- [x] [Review][Patch] ✅ APPLIED 2026-10-09 — the SES client trims both secrets; `sign()` runs OUTSIDE the fetch's `try` — a throw ⇒ `held:sign_failed` (⛔ may-have-sent) / `preflight:sign_failed`; unit legs (a trimmed key signs; a mocked `AwsClient.sign` rejection). **SES signing shares the send's `try`, and the SES secrets are untrimmed** — `aws.sign()` throwing (e.g. a
  trailing newline from Secret Manager in the key) is recorded `transient:network` + `may_have_sent` though ⛔ request existed (RE6:
  ambiguous = AFTER the request was written), and the pre-flight reports it as `preflight:unreachable`; ZeptoMail trims its token,
  SES does not. Fix: trim both secrets in `buildStaffEmailClient`; sign OUTSIDE the `try` and classify a sign throw HELD
  (`held:sign_failed`, `mayHaveSent: false`). [apps/jobs/src/scheduler/staff-email-client.ts:171-217; staff-email-config.ts:76-83]
  (Blind Hunter + Acceptance Auditor + Edge Case Hunter, chunk B)
- [x] [Review][Patch] ✅ APPLIED 2026-10-09 — `decrypt_failed` / `render_failed` alarm like a HELD fault (once per row per distinct fault); `read_failed` unchanged; the live (vi) (c) leg asserts ONE alarm across two attempts. **A deterministic pre-call fault never alarms until the give-up** — `preCall` passes `held: false`, so a wrong
  KEK / corrupt envelope (`decrypt_failed`) or a missing i18n key in the deployed bundle (`render_failed`) retries for up to three IST
  days with ZERO alarms. Fix: alarm ONCE per row per distinct pre-call fault (the HELD dedup against `previousDetail`) for
  `decrypt_failed` and `render_failed` — the stored `detail` and round 1's classification decision are unchanged.
  [apps/jobs/src/scheduler/claim-suspicion-staff-emails.ts:305-307] (Blind Hunter, chunk B)
- [x] [Review][Patch] ✅ APPLIED 2026-10-09 — the re-claim UPDATE predicates `claimed_by_job = $job OR = parked OR claimed_at < leaseCutoff`; 0 rows ⇒ re-read ⇒ `held_by_other` / `already_final`; a two-connection race leg (a holder's note commits while a taker waits in its UPDATE ⇒ `held_by_other`), red-checked. **The take-over UPDATE does not re-check the lease it read** — `begin` reads `claimed_at` / `claimed_by_job`
  with ⛔ row lock (notes and finalises ⛔ take the claim lock), and the re-claim UPDATE predicates only `outcome = 'attempting'`: a
  live job's transient note committing between the SELECT and the UPDATE is overwritten (`claimed_by_job` taken over despite the
  refreshed lease). Fix: add `AND (claimed_by_job = $job OR claimed_at < $leaseCutoff)` to the re-claim UPDATE; 0 rows ⇒ re-read:
  still `attempting` ⇒ `held_by_other`, else `already_final`. [packages/domain/src/claim/suspicion-staff-email.ts:353-365,400-409]
  (Blind Hunter, chunk A)
- [x] [Review][Patch] ✅ APPLIED 2026-10-09 — a dot-atom `local@domain` (local ≤ 64, labels ⛔ hyphen-edged); `provision-admin` also requires the contracts `Email` schema (probed: `a!b@x.org` and `"x"<o@h.com>` refused before any write); unit legs. **`isSendableEmailAddress` admits RFC 5322 specials, and provisioning admits addresses the login form
  rejects** — `[\x21-\x7e]` lets `"x"<other@host.com>` (display-name syntax — a provider may route to the OTHER mailbox) and
  `a,b@x.com` (⇒ `BadRequestException` ⇒ HELD for three days) through; and `a..b@x.org` / `.a@x.org` / `a!b@x.org` pass provisioning
  but fail `LoginRequest`'s `z.string().email()` — an admin emailed a link they can never sign in to open. Fix: a dot-atom local
  part (⛔ `"(),:;<>[\]\\`, ⛔ leading / trailing / doubled dots) in `isSendableEmailAddress`; provision ALSO requires the contracts
  `Email` schema. [apps/jobs/src/scheduler/staff-email-client.ts:380-382; scripts/provision-admin.ts:126] (Blind + Edge, chunks B + C)
- [x] [Review][Patch] ✅ APPLIED 2026-10-09 — `nomineeRefusalsPath` lower-cases; a re-cased URL leg. **A mixed-case Pariwar id in the URL loses the return path** — the route builds `next` from the raw `pariwarId`;
  the allowlist accepts lower-case hex only ⇒ `/p/2B7C…/nominee-refusals` → sign-in → `/audit/integrity` (F18's symptom). Fix:
  lower-case the id in `nomineeRefusalsPath` (the allowlist stays strict). [apps/admin/src/routes/NomineeRefusalsRoute.tsx:89-104;
  apps/admin/src/routes/login-next.ts] (Blind Hunter, chunk C)
- [x] [Review][Patch] ✅ APPLIED 2026-10-09 — `validateLoginSearch` (login-next.ts) IS the `/login` route's `validateSearch`; the test's `useSearch` mock runs it over TanStack's REAL `defaultParseSearch`; legs for number / object / absent `next` and the redirect's serialise → parse → validate → allowlist round trip. **The real `loginRoute.validateSearch` is never run by a test** — every test mocks `@tanstack/react-router`
  and re-parses `window.location.search`, so RE9 A's `validateSearch` (and the router's JSON-first search parsing — `?next=123`
  arrives a number) is unproven; narrower than round 2's dismissed mock-shape point. Fix: unit-test the route's `validateSearch`
  directly (string / number / array / absent). [apps/admin/src/router.tsx:77-78; apps/admin/tests/login-return-path.test.tsx]
  (all three layers, chunk C)
- [x] [Review][Patch] ✅ APPLIED 2026-10-09 — a jobs test reads the admin `router.tsx` (exactly ONE `…nominee-refusals` route) and `login-next.ts` (the list's own `next` + the allowlist regex) and pins the email link to both. **The emailed link's path exists in three uncoupled copies** — the jobs template, the admin route and the
  `login-next` allowlist each write `/p/<P>/nominee-refusals`; a renamed route leaves every email 404-ing with all tests green
  ([[feedback_stub_must_call_not_transcribe]]). Fix: a source-text fence test pinning the three to one literal.
  [apps/jobs/src/scheduler/suspicion-staff-email-templates.ts:31; apps/admin/src/router.tsx:313; apps/admin/src/routes/login-next.ts:9,13]
  (Edge Case Hunter + Acceptance Auditor, chunk C)
- [x] [Review][Patch] ✅ APPLIED 2026-10-09 — literal pins (`admin_email`, the nil UUID); a ciphertext FROZEN at 6.25 must decrypt through the domain AND the API; the wrong-context leg runs through `decryptAdminEmail` (a member field class, a real tenant); fence rule (4) — every file naming `ADMIN_EMAIL_ENCRYPTION_CONTEXT` or a by-value `fieldClass: ADMIN_EMAIL_FIELD_CLASS | 'admin_email'` is on an exact allowlist (4 files), with two positive-control plants. **The relocation cross-check's constant assertions are tautological, and the decrypt fence covers a name, ⛔
  the capability** — `ADMIN_EMAIL_FIELD_CLASS` / `ADMIN_GLOBAL_NAMESPACE` are now DEFINED as the domain's values, so `toBe(domain…)`
  compares a value with itself; the "different envelope context" leg calls `decryptTier1` directly (⛔ the relocated helper); and
  `staff-email-identity-read-fence` matches only `decryptAdminEmail`, so a new `decryptTier1(…, ADMIN_EMAIL_ENCRYPTION_CONTEXT, …)`
  site passes. Fix: pin the literals; run the wrong-context leg through the relocated helper; extend the fence to
  `ADMIN_EMAIL_ENCRYPTION_CONTEXT` outside its allowlist. [apps/api/tests/unit/admin-email-relocation-crosscheck.test.ts;
  apps/jobs/tests/staff-email-identity-read-fence.test.ts:25] (Blind Hunter chunk C + Acceptance Auditor chunk B)
- [x] [Review][Patch] ✅ APPLIED 2026-10-09 — the real `claim_has_rows` reason; the NULL-pair leg built; the clamp proven with TWO due pairs (`limit: 0` ⇒ exactly 1); the over-cap call asserted equal to the full due set (the cap's range is `pagination.test.ts`'s). **Domain-spec assertions that cannot fail** — `'claims_has_rows' as never` pins a reason that does not exist
  (the real `exhausted:recheck_claim_has_rows` is never pinned; the cast hides it); the title "…and a no-admin claim's NULL pair goes
  too" asserts ⛔ NULL pair (⛔ no-admin claim is built); `first.scanned <= 1` / `capped.scanned <= CAP` hold whatever the clamp does.
  Fix: the real reason; build the no-admin claim and assert its NULL pair; seed past the bound so the clamp is observable.
  [packages/domain/tests/integration/claim/suspicion-staff-email.spec.ts:285,492-494,516] (Blind + Edge, chunk A)

- [x] [Review][Defer] **0152 (like 0151) grants only `twt_app`; the jobs service login is a BYPASSRLS `twt_service` member with ⛔
  privilege on either table, and RLS / the column-narrowed grants do ⛔ bind it** [packages/domain/migrations/0152_claim-suspicion-staff-emails.sql:53-59;
  packages/domain/src/claim/suspicion-staff-email.ts:157] — deferred, pre-existing (0151's identical shape; other jobs-written tables
  — 0093/0094 — grant `twt_service` explicitly). Every test runs the selector / give-up as superuser, so a 42501 is invisible; the
  "under RLS" doc wording overstates production. ⭐ Trigger: Row 24 (b) — it must state the jobs login's SELECT / INSERT / UPDATE on
  0151 + 0152, ⛔ only Q1 / Q2's reads.
- [x] [Review][Defer] **Two handlers can run the SAME job after pg-boss's handler timeout** [apps/jobs/src/scheduler/claim-suspicion-staff-emails.ts:366;
  packages/domain/src/claim/suspicion-staff-email.ts:362] — deferred, pre-existing (6.24b's job-id compare-and-set): the SEND queue
  keeps pg-boss's 15-min default expiry, a stalled child is failed + retried under the same id while still running, and `ownRetry`
  re-claims at once; the double IS recorded (`detail IS NULL` ⇒ `may_have_sent`). ⭐ Trigger: any child step without its own bound
  (pool connect, KMS) or a joint 6.24b / 6.25 CAS rework (add `attempt_count` to the CAS).
- [x] [Review][Defer] **Boot awaits Secret Manager with ⛔ timeout** [apps/jobs/src/boot.ts:627] — deferred, pre-existing (the pepper
  at `:286` and `buildContributionProviderResolver` at `:572` await the same way); a hung resolve stalls every later scheduler's
  registration. ⭐ Trigger: a boot-wide secret-resolution timeout.

#### Review Findings — ROUND 4 (narrow, round 3's uncommitted fixes `git diff HEAD` excl. `_bmad-output` — 19 files, ~1,600 lines;
three layers in PARALLEL, read-only — 2026-10-09)

> Triage: **1 decision-needed, 8 patch, 0 defer, 6 dismissed** (duplicates merged); D3 resolved 2026-10-09 (A) ⇒ **9 patch**, all 9 applied. §0 gate: ⛔ the Panel's — D3 is *"how should the
> code age a row that sat out a hold?"* (engineering), and P1 is an AUTHOR-commit owed to BigDev's own `-299` (RE11 / RE5), ⛔ a ratified
> clause. Dismissed (each re-traced): a NULL `claimed_by_job` skipping the park / give-up (0152's `attempting_claimed_check` makes an
> `attempting` row with a NULL holder impossible); `assertDetail` throwing after an `accepted` send (the accepted finalise writes ⛔
> detail; `sanitizeProviderErrorName`'s class IS the pattern's); the trigger blocking referential / maintenance UPDATEs (both FKs are
> `NO ACTION` on update, the recipient FK `NO ACTION` on delete, the anonymizer ⛔ touches the table — the only referential action is
> the claim's DELETE cascade, tested); the `-297` §2 UPDATE lacking the take-over's lease re-check (Blind + Edge — a holder whose note
> lands in that window THROWS after the note and ⛔ sends; its retry waits on the claim lock the taker holds, then reads the row
> final; the refusal no longer stands, so `error` + `may_have_sent` is the right record either way — a holder mid-SEND past a 30-min
> stale claim is the deferred stall class); a NAMED ZeptoMail 429 outside the table being HELD (the RE6 table: "+ ANY other name" ⇒
> held — round 3's P3 is that rule); the AC7 leg spying `console.*` only (the jobs code logs through `console` / `alarm()` only).

- [x] [Review][Decision] ✅ RESOLVED 2026-10-09 (option A — the user's call) ⇒ patch P-D3 below. **D3 — a parked row loses its hold protection after ONE post-hold child** (Edge Case Hunter + Acceptance
  Auditor) — the first child after the hold re-claims the row (`claimed_by_job` = its job — the marker is gone) while the give-up
  still keys on the unchanged `created_at`: once that ONE child's pg-boss retries (≤ 5 tries over ~15 min) fail — plausible in the
  burst of every held pair firing at once — the next un-held tick past the lease gives it up `error` / "may have sent". Held time is
  still counted; round 3's APPLIED note ("⛔ count held time") and Change Log 1.6 overclaim, and the held alarm's "they will be sent
  once it is fixed" is ⛔ guaranteed for parked rows. Options: (A) a give-up ANCHOR — a new `aging_since` column (DEFAULT
  `clock_timestamp()`; the give-up keys on it, ⛔ `created_at`; the index moves to it); re-claiming a PARKED row resets it to now, so
  a row that sat out a hold gets a fresh three IST days of ordinary retries — in 0153 (⛔ yet committed: edited in place, the delta
  applied by hand to :5432 AND :5433, catalog verified); (B) subtract held time exactly (accumulate a `held_ms`) — exact, more
  moving parts; (C) accept one post-hold child lifecycle as residual and correct the notes, README and alarm text.
  [packages/domain/src/claim/suspicion-staff-email.ts:280,456-463; apps/jobs/src/scheduler/claim-suspicion-staff-emails.ts:219-224]

- [x] [Review][Patch] ✅ APPLIED 2026-10-09 — 0153 edited in place (⛔ yet committed — `aging_since` ADDED before the trigger, backfilled from `created_at`, DEFAULT `clock_timestamp()`, NOT NULL, UPDATE grant, the partial index moved to `(aging_since, claimed_at)`); the delta run by hand on :5433 AND :5432 in one transaction (the freeze trigger disabled for the backfill, re-enabled; column / default / index / trigger verified on both); a SCRATCH database migrated from zero (153 migrations) proved the edited file applies clean, then was dropped. The give-up keys on `aging_since`; the re-claim sets `aging_since = now` ONLY for a parked row (`CASE WHEN claimed_by_job = parked`); test seeds that set `created_at` now also set `aging_since`; legs (a parked row's ONE failed post-hold child ⇒ ⛔ given up; three IST days after the re-claim ⇒ given up; ONLY a parked re-claim restarts it); red-check #15. **P-D3 (from D3, option A) — a give-up ANCHOR (`aging_since`)** — 0153 (⛔ yet committed) gains `aging_since
  timestamptz NOT NULL DEFAULT clock_timestamp()` + its UPDATE grant; the give-up keys on `aging_since` (⛔ `created_at`) and the
  attempting index moves to `(aging_since, claimed_at)`; re-claiming a PARKED row sets `aging_since = now` (a fresh three IST days
  of ordinary retries after a hold); the delta applied by hand to :5432 AND :5433 and the catalog verified; legs (a parked row's
  first post-hold child fails ⇒ ⛔ given up; three IST days later ⇒ given up) + a red-check; the alarm / README / notes corrected.
  [packages/domain/migrations/0153_*; packages/domain/src/claim/suspicion-staff-email.ts; the schema]
- [x] [Review][Patch] ✅ APPLIED 2026-10-09 — `2026-10-09-300` inserted at the top of `.decision-log.md` (author-commit; amends RE11's give-up, extends RE5 / RE6 / RE7 A; DISCLOSES the process slip — round 3's code was written before the entry); dated `⚠ AMENDED by -300` lines added above RE5 and RE11 (their committed text kept). ⭐ Commit ORDER owed: the `-300` entry (+ this file's AMENDED lines) is committed BEFORE any round-3 / round-4 code. **P1 [HIGH] — round 3 changed BigDev's COMMITTED `-299` RE11 (and extended RE5) with ⛔ new decision entry and ⛔
  `⚠ AMENDED` line** (Acceptance Auditor) — the give-up now skips a parked row and runs only on an un-held run; the sweep checks
  config / pre-flight FIRST; 0153 adds the `detail` CHECKs + the finished-row trigger. Task 0.5's rule (*"never edit RE text after
  commit — a later change is a NEW entry + a dated `⚠ AMENDED` line"*) and the `-297` / `-298` precedent (each "RECORDED BEFORE ANY
  REVIEW FIX") require an author-commit `2026-10-09-300` amending RE11 (+ RE5, + AC4 (iv) / AC6's "⛔ written") — carrying D3's
  outcome — committed BEFORE round 3's code, and dated `⚠ AMENDED` lines on RE11 / RE5 here. [.decision-log.md; this file RE5 / RE11]
- [x] [Review][Patch] ✅ APPLIED 2026-10-09 — the parked marker's and the park's doc blocks restate the premise (past the lease ⇒ ⛔ live child; a PRE-FLIGHT hold does ⛔ stop queued / retrying children — safe, their rows stay inside the lease) and a new RE-EXAMINE trigger (the lease stops bounding a live child's silence); the alarm now says "this run enqueued ⛔ child for them … will be retried once it is fixed"; "⛔ NEW row written" in the sweep header, `heldForConfig`, the README and ADR-0040 (`drafted`). **P2 — the park's premise and the held-run wording are false** (all three layers) — children never run the
  pre-flight (their race guard checks `configGap` only), so on a `preflight:*` hold queued children and pg-boss retries still run
  and can send: the park's DELIBERATE rationale ("⛔ child can run while held") and its RE-EXAMINE trigger are wrong at birth (the
  park stays SAFE — a live child keeps its row inside the lease); the held alarm's "⛔ nothing was enqueued or sent" can be untrue
  for a pair with a live child; and "⛔ written" / "writes ⛔ row" survives in the sweep header, `heldForConfig`'s doc, the README and
  ADR-0040 though a held run now UPDATEs (parks) existing rows. Fix: restate the premise (the park touches only rows past the lease
  ⇒ ⛔ live child), the alarm ("⛔ enqueued by this run"), and "⛔ NEW row" everywhere. [packages/domain/src/claim/suspicion-staff-email.ts:58,296-306;
  apps/jobs/src/scheduler/claim-suspicion-staff-emails.ts:11-15,107,146,219-224; apps/jobs/README.md:118; docs/adr/ADR-0040-staff-email-transport.md:91]
- [x] [Review][Patch] ✅ APPLIED 2026-10-09 — registration alarms `config:admin_app_origin_invalid` once when the client has ⛔ config gap and the origin does ⛔ resolve (an unset provider stays silent); a no-DB leg (http, unset, valid, provider off); README. **P3 — an invalid `ADMIN_APP_ORIGIN` is silent at boot**, against the README's new "EVERY config gap raises
  ONE boot alarm" (Edge Case Hunter) — the origin is checked per run only, and the HELD alarm needs a due pair. Fix: registration
  alarms `config:admin_app_origin_invalid` once when a provider is configured and the origin does ⛔ resolve; a no-DB leg.
  [apps/jobs/src/scheduler/claim-suspicion-staff-emails.ts (registration); apps/jobs/README.md]
- [x] [Review][Patch] ✅ APPLIED 2026-10-09 — `SUSPICION_STAFF_EMAIL_RECHECK_REASONS` / `_ERROR_REASONS` / `_PRE_CALL_STEPS` exported `as const`, the types derive from them, and the grammar leg iterates them. **P4 — the 0153 grammar is hand-listed, ⛔ tied to the reason unions** (Edge Case Hunter) — a new recheck /
  error reason compiles, is emitted, and is refused by `assertDetail` / the CHECK at runtime (a non-transient throw; on `noAddress` a
  row left `attempting` with a NULL detail ⇒ a false `may_have_sent`); the round-3 leg lists the four reasons by hand. Fix: the
  reasons become exported `as const` arrays the types derive from, and the grammar leg iterates THEM.
  [packages/domain/src/claim/suspicion-staff-email.ts:71-89; packages/domain/tests/integration/claim/suspicion-staff-email.spec.ts]
- [x] [Review][Patch] ✅ APPLIED 2026-10-09 — the domain is `LABEL(\.LABEL)+` (every label ⛔ hyphen-edged) and the last ≥ 2 characters; legs `a@x.-org`, `a@x.org-`, `a@x.--`, `a@x.o`, `a@x.org.`. **P5 — the dot-atom check still admits a hyphen-edged final label** (`a@x.-org`, `a@x.org-`, `a@x.--`) — round
  3's note says "labels ⛔ hyphen-edged" but only the first label was tested (Blind Hunter + Acceptance Auditor). Fix: the final
  label is a `LABEL` of ≥ 2 characters; legs. [apps/jobs/src/scheduler/staff-email-client.ts:398]
- [x] [Review][Patch] ✅ APPLIED 2026-10-09 — the rule matches `fieldClass: <ns>.ADMIN_EMAIL_FIELD_CLASS` and a template literal; two more positive-control plants; the shorthand limit recorded in the fence's comment. **P6 — fence rule (4) misses a namespaced / template-literal field class** (`fieldClass:
  encryption.ADMIN_EMAIL_FIELD_CLASS`, `` `admin_email` ``) (Blind Hunter). Fix: match the namespaced constant and a template literal;
  plants for both. (A shorthand `{ fieldClass }` stays out of reach of a source fence — recorded.)
  [apps/jobs/tests/staff-email-identity-read-fence.test.ts]
- [x] [Review][Patch] ✅ APPLIED 2026-10-09 — a source pin that the `/login` route's `validateSearch` IS `validateLoginSearch` (red-check #16); a live leg where the REAL renderer throws (a switch) ⇒ ONE `render_failed` alarm over two tries, and a Q2 read that fails ⇒ `transient:read_failed`, ⛔ alarm; a domain leg with a parked row INSIDE the lease (only the `parked` bypass admits it); the thrown messages asserted EXACTLY (two `ClaimCorrectionTransientError`s); `NODE_ENV` deleted when it was unset. **P7 — tests narrower than round 3's notes** (Blind Hunter + Acceptance Auditor) — the `/login` route's wiring to
  `validateLoginSearch` is unpinned (an inline parser in `router.tsx` stays green); `render_failed`'s new alarm and `read_failed`'s
  per-attempt behaviour have ⛔ leg; the parked-row "re-claimed AT ONCE" legs seed `claimed_at` far past the lease, so the `parked`
  bypass is never what admits them (⇒ a leg with a parked row INSIDE the lease); `thrown.length >= 2` is weaker than the exact count;
  the `NODE_ENV` restore writes the string `"undefined"` when it was unset. [apps/admin/tests/login-return-path.test.tsx;
  apps/jobs/tests/claim-suspicion-staff-emails-live.test.ts; packages/domain/tests/integration/claim/suspicion-staff-email.spec.ts]
- [x] [Review][Patch] ✅ APPLIED 2026-10-09 — the Debug Log gains red-checks #11–#16 (rounds 3–4), incl. #14 — 0153's trigger + vocabulary CHECK dropped on :5433 ⇒ 4 policy legs RED ⇒ restored from 0153's own statements. **P8 — round 3's red-checks are ⛔ in the Debug Log (AC10)** and P-D2's policy legs were ⛔ red-checked (Acceptance
  Auditor). Fix: run a P-D2 red-check (drop the trigger / CHECK on :5433, see the legs fail, restore) and record every round 3–4
  red-check (plant, red, revert) in the Debug Log.

## Dev Notes

### Traps
1. **Do not trigger on the decision event** — F7. Derive "stands" with RF1's fragment; re-check under the lock.
2. **Do not reuse `listAdminsByRole`** — F4 (the display-name drop). Write the RE3 fragment once; use it twice.
3. **The freeze anchor is the CHAIN START, never the live row's `decided_at`** — every `reviseDecision` (a note-only one that keeps `-239`
   included) inserts a new live row with a fresh `decided_at`; `suspicionChainStartedAtSql` walks `supersedes_decision_id` back while
   the reason stays `-239` ⇒ a note edit does ⛔ not move it; a revision ONTO `-239`, or AWAY and BACK, starts a new chain, and an admin
   granted before THAT start is eligible for it (RE2 still stops repeats for anyone already emailed).
4. **NULL recipient** — `NULLS NOT DISTINCT` is what makes the `no_target` row once-ever; a plain UNIQUE admits unlimited NULL rows. The
   keyword goes BEFORE the column list.
5. **Decrypt after COMMIT** — ⛔ KMS / network under the claim-row lock; ⛔ catching a DB error inside the claiming tx.
6. **`-297` §2, ⛔ 6.19b's K4**: ANY existing `attempting` row whose re-check fails ⇒ `error` + alarm (a NULL `detail` does ⛔ not prove
   nothing was sent).
7. **The give-up must also require `claimed_at < now − lease`** (6.24b round 1 — a live child raced it).
8. **Config pre-check lives in the SWEEP** (RB12) — a child-side hold would park rows; ⛔ row while unconfigured.
9. **⛔ `apps/jobs` → `apps/api` imports** (turbo cycle). Relocate; ⛔ copy the encryption context by value.
10. **Contracts never import pg-touching domain** ([[project_contracts_domain_bundle_boundary]]) — no contract change is planned at all.
11. **Domain `.limit()` gate** — every dynamic limit through `clampLimit`, or an integer literal ([[project_domain_limit_clamp_and_savepoint_retry]]);
    raw SQL `LIMIT` is invisible to the gate ⇒ a page-cap spec.
12. **Time** — IST calendar via the shared helpers; one instant per test across midnight; ordering only across separate COMMITTED txns
    ([[project_db_clock_ordering_tests_tie]]); a `Date` round-trip loses microseconds (pass instants as `to_char(…,'US')` text where compared).
13. **Fixtures** — `events_log.actor_id` is a uuid; determinations/decisions via the REAL writers where the writer is the subject.
14. **`role_grants` is RLS-scoped; `users` / `admin_credentials` are global carve-outs** — the selector runs on the BYPASSRLS pool; the
    child's scoped tx can read P's grants.
15. **Never log or store the address** — `detail` is built ONLY from the fixed vocabulary (RE5); a provider error message is ⛔ never
    copied, and a thrown adapter error carries the error NAME, ⛔ the request or response body (SES messages echo identities).
16. **Classify by error NAME, not status** (F19) — SES's 400s include a paused account, the sandbox and an unverified domain. A
    status-only `4xx ⇒ rejected` permanently burns once-ever rows during a fault that is fixed next day.
17. **Fixtures that look right and email no one** — the existing jobs `pariwar_admin` fixtures use `scope_value NULL` (F5) and
    `seedRoleGrant` defaults to `district_admin` @ `Patna`; both yield ZERO recipients. A `scope_value::uuid` compare 22P02s on a district
    grant (RE3 (a)).
18. **The lease is NOT `CORRECTION_SEND_LEASE_MS`** (F20) — at a 15-minute cadence a 10-minute lease hands a still-retrying row to the next
    tick. `STAFF_EMAIL_SEND_LEASE_MS` (30 min) + `noteTransient` refreshing `claimed_at`.
19. **`cleanupClaims` under the replica role does ⛔ not cascade** — `admin_credentials` rows (UNIQUE `email_blind_index`) survive a
    `users` delete and poison the next run. Delete them explicitly.
20. **The Hindi needs `Charset: 'UTF-8'`** — SES defaults to 7-bit ASCII.

### Locks
The child takes ONLY the claim row (`FOR UPDATE`, `SET LOCAL lock_timeout`) — ⛔ advisory keys, ⛔ two claim rows, ⛔ the death's intake
key. (The house order ends at the claim row: `-294` §1 orders intake → `suspicion-reversal:`; the `appeal:` / `r9:` / trustee keys and the
row follow per 6.24's D1 lock order — the child only ever holds the last.)

### The existing code each change touches (UPDATE files)
- `packages/domain/src/encryption/index.ts` (+ the new `admin-email.ts`) — today: the Tier-1/Tier-2 helpers, member field classes and
  `ADMIN_GLOBAL_NAMESPACE` (`field-classes.ts:21`). Change: export the admin email class/context/decrypt. Preserve: every existing export
  and the member contexts.
- `apps/api/src/context.ts:48-51`, `apps/api/src/modules/auth/shared/email-index.ts`, `apps/api/src/middleware/request-context/index.ts:23,65`
  — today: own / consume the constant + context by value. Change: import the domain one; `decryptEmail` delegates to
  `decryptAdminEmail` (AC9 (c)). Preserve: `normalizeEmail`, `emailBlindIndex`, `encryptEmail` byte-for-byte and `decryptEmail`'s
  behaviour (the unedited `auth-primitives.test.ts` + the cross-check) — login, provisioning (`scripts/provision-admin.ts:54` imports
  `emailBlindIndex`).
- `packages/queue/src/index.ts` — add two names. `apps/jobs/src/boot.ts` — one registration + config. Preserve: every other worker.
- `packages/i18n/locales/{en,hi}/claim.json` — add keys + `$comment`. Preserve: `suspicion_sms.*` and parity.
- `nominee-refusal-read.ts`, `RootLayout.tsx` — comment hunks only. `NomineeRefusalsRoute.tsx` — comment hunks (+ RE9 A's two
  redirects). `apps/admin/src/router.tsx` (RE9 A only) — `loginRoute` gains `validateSearch`. Preserve: every other route.
  `apps/admin/src/routes/LoginPage.tsx` (RE9 A only) — today: always navigates to `/audit/integrity` (`:138`). Preserve: that default.
- `apps/jobs/tests/_claim-correction-seed.ts` (`cleanupClaims`) — extend the delete set and the leftover count. Preserve: every existing
  caller's behaviour.
- `packages/domain/src/{schema,policies,claim}/index.ts`, `member/anonymize.ts`, `migrations/meta/_journal.json`,
  `packages/domain/tests/claim/nominee-name-no-comparison-fence.test.ts` (`FENCED_FILES` + pin).

### Config and environment
New: `STAFF_EMAIL_API_KEY_SECRET_NAME` (+ `_ENV_FALLBACK`), `STAFF_EMAIL_FROM`, `ADMIN_APP_ORIGIN` (names final at Task 0.2), documented
in `apps/jobs/README.md`. Unset in every environment until Row 24 closes ⇒ every claim held + one alarm per sweep (~96/day while any
refusal stands — recorded). ⛔ Nothing in `infra/` is provisioned by this story.

### Testing standards
:5433 for live suites; suite-level `{timeout: 20000}`; assert MEMBERSHIP, ⛔ counts across shared tables; ⛔ regenerate an applied
migration, ⛔ DROP SCHEMA ([[project_live_db_test_gotchas]]); FK → `TRUNCATE CASCADE` lock order ([[project_fk_truncate_cascade_deadlock]]);
`vitest run` per package (domain, api, jobs, i18n); ⛔ `prettier --write` ([[project_prettier_not_enforced]]); ⛔ `toBeDefined` filler;
positive control on every negative leg; every AC leg present before its Task is ticked.

### Latest tech notes (checked 2026-10-09)
- ⛔ No new library unless RE6 A is taken: then `aws4fetch` 1.0.20 (zero deps, ~65 KB, ⚠ unpublished since 2024-08) or
  `@aws-sdk/client-sesv2` 3.1148.x (current, ~2 MB + `@smithy/*`) — the dev picks with the current SES v2 docs open and records the version
  and the reason. ⛔ Neither is a direct dependency today.
- Node ≥ 22.12 (`package.json` engines, `.nvmrc`, `apps/jobs/Dockerfile`, CI): global `fetch`, `AbortSignal.timeout(ms)`, `crypto.subtle`.
  Transport precedents: injectable `fetch` (`packages/channels/src/providers/sms-app.ts:187`), `AbortSignal.timeout`
  (`packages/edge/src/turnstile.ts:183`). A timeout AFTER the request was written is ambiguous (RE6).
- pg-boss `^12.19.1`: `QueueOptions.expireInSeconds` (default 900), `retryLimit`, `retryDelay`, `retryBackoff`; `JobOptions.singletonKey`;
  `ScheduleOptions = SendOptions & { tz, key }`; cron sends carry `singletonSeconds: 60`.
- SES v2 (if chosen): F19's error names and charset; sandbox per Region; `GetAccount` for the pre-flight. The provider's request shape
  and endpoint are re-verified live at Task 0.2 (Context7 / official docs) — this file deliberately states ⛔ no endpoint for SES.

### Project Structure Notes
- Domain logic in `packages/domain/src/claim/`; transport + sweep in `apps/jobs/src/scheduler/`; ⛔ a `packages/email` (no second consumer).
- Naming mirrors 6.24b (`claim-suspicion-*`). Tests beside their package's existing `tests/integration/claim/`, `tests/integration/rls/`,
  `apps/jobs/tests/`.
- ⚠ Variances, each deliberate and recorded in `-299`: a new outcome vocabulary (RE5) instead of 0138's; error classification by NAME
  with a held account/config class (RE6) instead of 6.24b's SMS `401/403 ⇒ final error`; hold on an unresolvable secret (RE7 A) instead
  of the SMS boot failure; a 30-minute lease (RE11) instead of `CORRECTION_SEND_LEASE_MS`; the `email-channel.md` departures (RE6, RE9).

### References
- `.decision-log.md`: `2026-09-21-239` (a), consequence 3 · `2026-09-28-261` D2 B, Consequence 2–3 · `2026-09-28-262` FQ3 A, "does NOT
  cover", Consequence 3 · `2026-10-07-292` Consequence 4 · `2026-10-08-294` §1 · `2026-10-08-295` RB2/RB3/RB4/RB10/RB12 · `2026-10-09-296`
  "does NOT cover" · `2026-10-09-297` §1–§2 · `2026-10-09-298`.
- `_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-09-28-6-20-follow-ups.md` (FQ3, round-2 scenario row 8) ·
  `…-2026-09-27-6-20-confirm-what-we-recorded.md` (D2).
- `_bmad-output/implementation-artifacts/6-24b-filing-code-and-texts-to-the-nominee-in-place-at-the-death.md` (RB1–RB18, Review
  Findings rounds 1–3, Traps) · `6-24-true-nominee-refile-after-a-suspicion-refusal.md` (RF1, RF13, D1 lock order) ·
  `6-20-nominee-declaration-history-and-as-at-death-rule.md` (D14, AC4).
- `docs/adr/ADR-0009-admin-authentication.md` §5 (the identity-data controls sentence; `:52` the `twt_auth` trigger) · ADR-0004 (the
  in-body amendment form) · ADR-0027 / ADR-0028 (provider-ADR shape; silent on residency) · `docs/adr/README.md` (lifecycle; §7 index
  reconciliation) · `docs/degradation-policy/comms-templates/email-channel.md` (`drafted`; bilingual Hindi-first `:54-56`, ⛔ tracking
  `:32`, ⛔ claim ids `:49`; the departures RE6/RE9 record: `:27`, `:28`, `:50`) · architecture Project Context lines 49 / 100 (residency).
- `docs/launch-gate-inventory/inventory-roster.md` (Rows 18–23 — the row shape; Row 22 (c)/(d)).
- 6.24b's ROUND 3 `[Review][Defer]` items (its story file) and `deferred-work.md`'s 6.24b round-3 items (`console.error`; the SMS-child
  batch loop).
- AWS SES v2 `API_SendEmail`, `CommonErrors`, `API_Content`, configuration-set tracking overrides, request-production-access (read
  2026-10-09); ZeptoMail send API + email-tracking help (read 2026-10-09).

## Dev Agent Record

### Agent Model Used

Claude Opus 5.5 (1M context) — `bmad-dev-story 6.25`, 2026-10-09.

### Debug Log References

**Task 0.1 (2026-10-09).** `git fetch origin` ⇒ `origin/main` = `3a7d3a1f` (= the pin; ⛔ re-derivation owed). `.decision-log.md` newest
entry = `-298` ⇒ ⛔ later decision touching `-239` / D2 / FQ3 / rows 6-25 / 6-27 — **none**. 6-27 = `backlog` (⛔ rebase owed, `-292`
Consequence 4). F9's stale lines re-located unchanged: `nominee-refusal-read.ts:13`, `NomineeRefusalsRoute.tsx:4,91`, `RootLayout.tsx:135`.

**Task 0.2 — BigDev's answers (2026-10-09, verbatim):** RE6 *"build both A and B."* · RE3 (b) *"A — freeze + Panel confirm
(Recommended)"* · RE3 edges *"A — accept both, recorded (Recommended)"* · RE7 *"A — hold (Recommended)"* · RE8 *"A — build now, ADR-0040
drafted (Recommended)"* · RE9 (return path) *"A — return path (Recommended)"* · RE12 *"A — Row 24 (e) = Row 22 (d) (Recommended)"* · the
SES signing dependency (with `STAFF_EMAIL_PROVIDER` = `ses` | `zeptomail` stated in the question) *"aws4fetch 1.0.20 (Recommended)"* ·
RE1, RE2, RE4, RE5, RE10, RE11, RE13–RE17 *"Accept all as recommended (Recommended)"* · and, after the `-299` draft's fresh-context
check (1 HIGH), RE5-bis *"Yes — SES 5xx/408 + ZeptoMail 5xx (Recommended)"*.

**Task 0.2 — the providers, re-verified against CURRENT official docs 2026-10-09** (a read-only research pass: AWS SES v2
`API_SendEmail`, `CommonErrors`, `API_GetAccount`, `API_TrackingConfigurationOverrides`, `configuration-overrides`,
`troubleshoot-error-messages`, `gr/ses.html`, botocore's sesv2 model, aws4fetch 1.0.20's dist; Zoho CPaaS `email-sending`,
`error-codes`, `multiple-data-centers`, the 2026-09-23 rename blog, the Feb/Mar-2026 web-archive copies; plus unauthenticated live
probes with bogus credentials — nothing sent):
- **SES v2** — `POST https://email.ap-south-1.amazonaws.com/v2/email/outbound-emails`, SigV4 service `ses` (aws4fetch maps the `email`
  prefix itself; passed explicitly). Body `{ FromEmailAddress, Destination: { ToAddresses: [to] }, Content: { Simple: { Subject: { Data,
  Charset: 'UTF-8' }, Body: { Text: { Data, Charset: 'UTF-8' } } } }, ConfigurationSetName? }`; 200 ⇒ `{ MessageId }`. ⛔ Idempotency
  token; AWS: a timed-out / 5xx send may already be accepted ⇒ **`AwsClient({ retries: 0 })`** (its default retries 5xx/429 ×10).
  Error NAME: `x-amzn-ErrorType` header, else body `__type`, else body `code`; keep before the first `:`, after the first `#`; ⛔ name ⇒
  `http_<status>`. Live probe: 403 `MissingAuthenticationTokenException` / `UnrecognizedClientException` (header only, body `message`).
  ⚠ Error messages LIST identities (addresses) ⇒ ⛔ read. **Transient:** `TooManyRequestsException` 429, `ThrottlingException` (400!),
  `InternalFailure` 500, `ServiceUnavailable` 503, `RequestTimeoutException` 408, `http_5xx`, `http_429`, network, own timeout —
  `may_have_sent` on a 5xx / 408 / network / timeout (RE5-bis). **Held:** `AccountSuspendedException`, `SendingPausedException`,
  `MailFromDomainNotVerifiedException`, `MessageRejected`, `NotFoundException`, `LimitExceededException`, `BadRequestException`,
  `AccessDeniedException`, `ExpiredTokenException`, `IncompleteSignature`, `MissingAuthenticationTokenException`, `NotAuthorized`,
  `OptInRequired`, `UnrecognizedClientException`, `ValidationError`, `MalformedHttpRequestException`, `RequestAbortedException`,
  `RequestEntityTooLargeException`, `UnknownOperationException`, + ANY other name. **`rejected`: ⛔ none.** **Pre-flight:** `GET
  /v2/email/account` — `SendingEnabled` && `ProductionAccessEnabled`. **Tracking:** ⛔ the per-message override (needs IAM
  `ses:ApplyTrackingConfigurationOverrides`); ⛔ configuration set unless configured; Row 24 (b) verifies ⛔ OPEN/CLICK destination
  (incl. any sender-identity default set) and VDM engagement OFF. ⚠ Unverified by the docs: the v2 name for a daily-quota / max-rate
  throttle (falls into transient by `TooManyRequestsException` / `http_429`, else held — alarmed, ⛔ lost).
- **ZeptoMail (= Zoho CPaaS since 2026-09-23)** — `POST {host}/v1.1/email`, `Authorization: Zoho-enczapikey <token>`, host default
  `https://cpaas.zoho.in` (India DC; legacy `api.zeptomail.in` answers identically — ⛔ relied on). Body `{ from: { address }, to: [{
  email_address: { address } }], subject, textbody, track_opens: false, track_clicks: false, client_reference: <notice_id> }`
  (`client_reference` = correlation only). 200 ⇒ `{ data: [{ code: 'EM_104', … }], message: 'OK', request_id }` ⇒ store `request_id`.
  Error `{ error: { code, details: [{ code, message, target }], message } }` (live: 401 `TM_4001` / `SERR_157`; the new docs' 400 sample
  `data.error_code` tolerated) ⇒ NAME `<code>.<sub-code>`. **Transient:** any 5xx (+ `may_have_sent`, RE5-bis), `http_429`,
  `TM_3601.SMI_115` (per-day limit), network, own timeout. **Held:** `TM_3501.LE_101`, `TM_5001.LE_102`, `TM_3601.SERR_156`,
  `TM_3601.SM_133`, `TM_3601.AE_101`, `TM_4001.SM_111`, `TM_4001.SM_128`, `TM_4001.SERR_157`, the caller-bug codes (`TM_3201.*`,
  `TM_3301.*`, `TM_3501.UE_106|MTR_101`, `TM_8001.*`), + ANY other name. **`rejected`:** ONLY `TM_4001.SM_113` with `target` `to`.
  **Pre-flight: ⛔ none** (log APIs need OAuth) ⇒ a recorded no-op. UTF-8 = the JSON body's encoding.

**Task 0.3 / 0.4 (2026-10-09).** `-299` drafted in the scratchpad; fresh-context check 1 ⇒ 0 BLOCKER / **1 HIGH** (the 5xx-as-maybe-sent
rule had been added without asking — put to BigDev ⇒ RE5-bis) + 10 MEDIUM/LOW, all applied; check 2 (narrow) ⇒ 0 BLOCKER / 0 HIGH, 3
MEDIUM + 3 LOW, all applied. Committed ALONE `8fbf718b`; second governance commit `d04748b8` (ADR-0040 `drafted`, adr-index row + ledger
`drafted` 0→1 / Total 150→151, `epics.md` 6.25, roster Rows 24–25, `deferred-work.md` top section + two OBSERVATIONS).

**Dev picks, recorded.**
- `aws4fetch@1.0.20` added EXACT to `@twt/jobs` (BigDev-approved). ⚠ pnpm hoists it to the root `node_modules`, and astro's optional
  peer now resolves it ⇒ astro's lockfile snapshot keys gained `(aws4fetch@1.0.20)` — key churn only, ⛔ version change.
- The SES adapter uses `AwsClient.sign()` (⛔ `.fetch()`) and sends through the injectable `fetch` ⇒ ⛔ library retry at all;
  `retries: 0` is set as well.
- Q1 + Q2 live in a SIBLING module `claim/staff-email-identity-read.ts` (both on the fences' allowlists); the sweep's domain half is
  `claim/suspicion-staff-email.ts`.
- `previousDetail` (begin's result) carries the row's `detail` from BEFORE the re-claim, because a re-claim now CLEARS `detail` (its
  value moves to `first_detail` once) — so the NEXT re-claim can tell whether THIS attempt ended with a note (RE5's NULL-detail ⇒
  `may_have_sent`), and the held-fault alarm can still fire once per DISTINCT fault per row.
- 0152's grants, EXACTLY the writers' columns: INSERT `(pariwar_id, claim_case_id, recipient_user_id, outcome, detail, claimed_at,
  claimed_by_job)` — ⛔ `attempt_count` (RE5's list named it; the writers never set it — it takes its DEFAULT); UPDATE `(outcome,
  provider_message_id, detail, first_detail, attempt_count, may_have_sent, claimed_at, claimed_by_job, updated_at)`.
- RE9 A: `loginRoute` gains `validateSearch` ⇒ `{ next?: string }` (typed redirects); `LoginPage` reads `next` from
  `window.location.search` at sign-in completion (⛔ a router hook — the existing `login-turnstile` test's router mock stays valid);
  the allowlist (`login-next.ts`) is a strict lower-case UUID (a subset of the story's `[0-9a-f-]{36}`).
- AC9 (c): `email-index.ts`'s local `ENC_CONTEXT` literal is replaced by a ONE-LINE alias to `encryption.ADMIN_EMAIL_ENCRYPTION_CONTEXT`
  (⛔ deleting the name would have edited `encryptEmail`'s body); `request-context/index.ts` needed ⛔ change (it imports the
  constant from `context.ts`, which now re-exports the domain one).
- The live suite's world helpers are COPIED (cut down) from 6.24b's (Task 5.2's recommended option).
- A fixture finding: `PARIWAR_A` (`11111111-…`) is all digits — an upper-cased copy is identical, so the "case-sensitive scope value"
  leg uses a trailing space instead.

**Red-checks (AC10) — plant ⇒ red ⇒ revert ⇒ green:**
1. NULLS NOT DISTINCT — the UNIQUE swapped for a plain one on :5433 ⇒ the policy spec's two-NULL leg + by-name leg RED (2/19); restored.
2. The freeze anchor — Q1 compared to the LIVE row's `decided_at` ⇒ domain spec "FREEZE (i)" RED; reverted.
3. The display-name non-conjunct — `listAdminsByRole`'s filter planted into Q1 ⇒ "every eligible Pariwar Admin" RED; reverted.
4. The no-decrypt fence — a `decryptAdminEmail(` call planted into the domain module ⇒ the fence RED; reverted.
5. The HELD class — status-based classification (`4xx ⇒ rejected`) planted into `classifySesFailure` ⇒ AC4 (ix) RED (+2 dependent
   legs); reverted.
6. The after-commit decrypt — Q2 + decrypt planted INSIDE the claiming transaction ⇒ the KMS probe saw 55P03 ⇒ the AC1/AC7 leg RED;
   reverted.
7. The config pre-check — the sweep's hold removed ⇒ AC6 RED; reverted.
8. The lease — `STAFF_EMAIL_SEND_LEASE_MS` = 10 min ⇒ ⚠ FIRST stayed GREEN (the outage test's ticks ran 30 s after each attempt —
   too weak); the test was strengthened to tick 30 s BEFORE each retry (the end of the gap) ⇒ AC4 (viii) RED at 10 min, GREEN at 30.
9. `-297` §2 — a failed re-check on an existing row returned `not_due` ⇒ AC4 (iii) + (x) RED; reverted.
10. The `detail` vocabulary — SES / ZeptoMail bodies (and an `x-amzn-errortype` header) that ECHO the address ⇒ the result carries
    `held:unknown` only (unit test); the param-type guard is a `@ts-expect-error` pair (typecheck-enforced).

**Red-checks — code review rounds 3–4 (2026-10-09; plant ⇒ red ⇒ revert ⇒ green):**
11. (round 3, P6) The take-over's lease re-check — the re-claim UPDATE's `(claimed_by_job = … OR … OR claimed_at < cutoff)` neutralised
    ⇒ the concurrency spec's "a holder's note commits WHILE another job takes…" RED (`begun`, ⛔ `held_by_other`); reverted.
12. (round 3, P-D1) The give-up's parked skip — `claimed_by_job <> parked` neutralised ⇒ the domain "give-up SKIPS a parked row" RED;
    reverted.
13. (round 3, P-D1) The held-run park — the sweep made to give up instead of park on a held run ⇒ the live "a HOLD past the give-up
    horizon ⇒ PARKED" RED; reverted.
14. (round 4, P8 / round 3 P-D2) 0153 on :5433 — the freeze trigger and `detail_vocabulary_check` DROPPED ⇒ the policy spec RED (4/21:
    by-name, the vocabulary legs, the LOCKSTEP pin, the trigger leg); both restored from 0153's own statements (1 trigger, 2 CHECKs).
15. (round 4, P-D3) The `aging_since` reset — the re-claim's `CASE WHEN claimed_by_job = parked` replaced by `aging_since = aging_since`
    ⇒ the domain "give-up SKIPS a parked row … restarted" + "ONLY a PARKED row's re-claim restarts `aging_since`" RED (2); reverted.
16. (round 4, P7) The `/login` wiring — `router.tsx`'s `validateSearch` replaced by an inline arrow ⇒ "the `/login` route IS wired to
    `validateLoginSearch`" RED; restored.

### Completion Notes List

- Ultimate context engine analysis completed — comprehensive developer guide created (2026-10-09, `bmad-create-story 6.25`).
- ✅ **Governance before code (AC0):** RE1–RE17 answered by BigDev (quoted in the Debug Log); `2026-10-09-299` committed ALONE
  (`8fbf718b`) after two fresh-context checks; ADR-0040 `drafted` + index/ledger, `epics.md` 6.25, roster Rows 24–25, deferred-work
  lines (`d04748b8`). ⚠ RE6 departs from the story's recommendation (BOTH adapters), and RE5-bis was ADDED after Task 0.2 — both in `-299`.
- ✅ **AC8 — 0152** `claim_suspicion_staff_emails`, applied to :5432 AND :5433; policy-regression spec (19) incl. the EXACT column grants
  and the two-NULL UNIQUE leg (red-checked).
- ✅ **AC1 / AC2 / AC4 / AC5 — domain:** Q1 (`staffEmailRecipientsSql`) used by BOTH the selector and the locked re-check; the claiming
  transaction with `-297` §2's rule, a 30-min lease refreshed by the transient note, the give-up (both bounds), the NULL pair's
  `no_target`; domain spec (25) + two-connection races (3).
- ✅ **AC3 / AC6 / AC4 (ix) — transport:** SES v2 + ZeptoMail adapters classified by error NAME (held class; ⛔ provider-driven final
  error; SES `rejected` table EMPTY), status-keyed `may_have_sent` (RE5-bis), pre-flight, fail-closed config; the en+hi template
  (link only, real `t()`, type-level guard); the sign-in return path (allowlisted `next`); unit tests (21) + admin tests (6).
- ✅ **AC7 — ⛔ plaintext address:** the stringify sweep over payloads / alarms / console / rows; the KMS probe proves the decrypt is
  AFTER the claiming commit (red-checked); `auth-primitives.test.ts` passes UNEDITED + the api-encrypt ⇒ jobs-decrypt cross-check;
  the ADR-0040 identity-read fence (exact allowlists + one plant per rule).
- ✅ **AC9:** `git diff --exit-code origin/main` over the frozen files ⇒ 0; RE15 files comment-only (+ RE9 A's two redirects); RE8
  relocation files import / re-export / delegation only; the no-decision fence (identity tables added) — 8 green.
- ✅ **AC10:** ten red-checks logged; `pnpm domain-invariants:check` green; `\*\*/` scan clean; full `apps/jobs` suite 692 / 692.
  `pnpm ci:local` (:5433): run 1 — lint + an admin test-typing error of this story's (fixed `19d09477`) and one load-timed-out admin
  test that passes alone; run 2 — every job green but `integration-tests`: ONE api spec (`cycle-freeze.spec.ts`, Story 6.19b — a
  test-only DDL on `claim_correction_marks` with a 5-s `lock_timeout`, built to fail FAST under contention; ⛔ touched by 6.25)
  timed out under the concurrent suites and passes 27 / 27 alone; **run 3 — `ci:local PASSED — 34 job(s) green`** (exit 0).
- ⚠ **Go-live:** ⛔ nothing sends until roster Row 24 closes (ADR-0040 ratified, provisioning, counsel, a real send, a named alarm
  owner, the Panel's Confirm 1) and Row 25 (the Hindi review). The two non-blocking Panel confirms are owed to the next routing note.

### File List

Governance: `.decision-log.md` (`2026-10-09-299`; round 4 — `2026-10-09-300`) · `docs/adr/ADR-0040-staff-email-transport.md` (new; round 4 — the held-run wording) · `docs/knowledge-transfer/adr-index.md` ·
`docs/launch-gate-inventory/inventory-roster.md` · `_bmad-output/planning-artifacts/epics.md` · `_bmad-output/implementation-artifacts/deferred-work.md` ·
`_bmad-output/implementation-artifacts/sprint-status.yaml` · `_bmad-output/implementation-artifacts/6-25-staff-email-notice-of-a-suspicion-refusal.md`

Domain: `packages/domain/migrations/0152_claim-suspicion-staff-emails.sql` (new) · `packages/domain/migrations/meta/_journal.json` ·
`packages/domain/src/schema/claim_suspicion_staff_emails.ts` (new) · `packages/domain/src/schema/index.ts` ·
`packages/domain/src/policies/claim-suspicion-staff-email-rls.ts` (new) · `packages/domain/src/policies/index.ts` ·
`packages/domain/src/encryption/admin-email.ts` (new) · `packages/domain/src/encryption/index.ts` ·
`packages/domain/src/claim/suspicion-staff-email.ts` (new) · `packages/domain/src/claim/staff-email-identity-read.ts` (new) ·
`packages/domain/src/claim/index.ts` · `packages/domain/src/claim/nominee-refusal-read.ts` (comments) · `packages/domain/src/member/anonymize.ts` (comment) ·
`packages/domain/tests/claim/nominee-name-no-comparison-fence.test.ts` · `packages/domain/tests/integration/rls/claim-suspicion-staff-email-policy-regression.spec.ts` (new) ·
`packages/domain/tests/integration/claim/suspicion-staff-email.spec.ts` (new; review fix — `may_have_sent` assertions) ·
`packages/domain/tests/integration/claim/suspicion-staff-email-concurrency.spec.ts` (new) ·
round 3: `packages/domain/migrations/0153_claim-suspicion-staff-email-backstops.sql` (new) + journal; the schema (the `detail` grammar
+ two checks), `suspicion-staff-email.ts` (park, give-up skip, lease re-check, writer guard) and the three specs above

Jobs: `apps/jobs/package.json` + `pnpm-lock.yaml` (`aws4fetch` 1.0.20) · `apps/jobs/src/boot.ts` · `apps/jobs/README.md` ·
`apps/jobs/src/index.ts` (review fix — exports `buildJobsEncryptionDeps`) ·
`apps/jobs/src/scheduler/claim-suspicion-staff-emails.ts` (new) · `apps/jobs/src/scheduler/staff-email-client.ts` (new) ·
`apps/jobs/src/scheduler/staff-email-config.ts` (new) · `apps/jobs/src/scheduler/suspicion-staff-email-templates.ts` (new) ·
`apps/jobs/tests/_claim-correction-seed.ts` · `apps/jobs/tests/claim-suspicion-staff-emails-live.test.ts` (new) ·
`apps/jobs/tests/staff-email-client.test.ts` (new) · `apps/jobs/tests/claim-suspicion-staff-email-no-decision.test.ts` (new) ·
`apps/jobs/tests/staff-email-identity-read-fence.test.ts` (new) · `packages/queue/src/index.ts` ·
round 3: the sweep (config check first, park-or-give-up, alarms), the client (named 429, sign / trim, dot-atom address), the config
(`bootAlarm` = `configGap()`), the README, and the four jobs test files above

API: `apps/api/src/context.ts` · `apps/api/src/modules/auth/shared/email-index.ts` · `apps/api/tests/unit/admin-email-relocation-crosscheck.test.ts` (new; review fix — barrel import; round 3 — literal pins, frozen fixture, helper-level wrong context)

Admin: `apps/admin/src/router.tsx` · `apps/admin/src/routes/LoginPage.tsx` (review fix — `useSearch`) ·
`apps/admin/src/routes/NomineeRefusalsRoute.tsx` · `apps/admin/src/routes/RootLayout.tsx` (comment) ·
`apps/admin/src/routes/login-next.ts` (new; review fix — dropped `nextFromLocation`) ·
`apps/admin/tests/login-return-path.test.tsx` (new; review fix — mock) ·
`apps/admin/tests/login-turnstile.test.tsx` (review fix — mock, pre-existing file) ·
round 3: `login-next.ts` (`validateLoginSearch`, lower-cased `next`), `router.tsx` (uses it), `login-return-path.test.tsx`

i18n: `packages/i18n/locales/en/claim.json` · `packages/i18n/locales/hi/claim.json`

Ops: `scripts/provision-admin.ts` (review fix — ASCII gate on `ADMIN_EMAIL`; round 3 — also the contracts `Email` schema)

## Change Log

| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-10-09 | Created (`bmad-create-story 6.25`) from `-261` D2 B + `-262` FQ3 A (⛔ no `epics.md` entry existed — owed at Task 0.4). Pinned `3a7d3a1f`. F1–F15 found; RE1–RE17 PROPOSED (author-commit owed at Task 0.3). ⚠ RE8: ADR-0009's ratified "sole query path" ⇒ ADR-0040. ⚠ *"⛔ No routing note owed (§0)"* — SUPERSEDED by 1.1 (kept as written). |
| 1.1 | 2026-10-09 | Validated (`bmad-create-story validate 6.25`; four fresh-context read-only verifiers — governance trail, code claims, design reachability, provider + test gates; BigDev: "all"). Pin unchanged (`3a7d3a1f` = `origin/main`, ⛔ code moved). 5 critical: RE3 (b)'s freeze re-anchored on RF14's chain start (the live `decided_at` moves on a note-only revision); RE6 classifies by error NAME with a HELD account/config class (SES 400s include pauses / sandbox / unverified domain — status-based would burn once-ever rows); §0 corrected — RE3 (b) narrows a ratified obligation ⇒ a non-blocking Panel confirm before Row 24 closes (`-295` precedent), so 1.0's "no routing note owed" is superseded; ADR-0009 §5 quoted in full (identity DATA) ⇒ ADR-0040 names Q1 + Q2, the jobs DB role and the existing `users` drift, and AC7's fence was rebuilt (it failed on RE3 (d)); a 30-min lease (the 10-min lease vs a 15-min cadence handed retrying rows to the next tick). Also: F16–F20 added; F2/F3/F5/F9/F12/F14 corrected; RE4/RE5/RE7/RE9–RE17 extended (no-address `error`, fixed `detail` vocabulary + length CHECK, column-narrowed INSERT + `(created_at, claimed_at)` index, hold-vs-boot-fail option, provider pre-flight, UTF-8, tracking-off conditions, the sign-in return path option, Row 24 (b)–(f), ADR-0040 `drafted` + `Supersedes: —`); AC1/AC3/AC4/AC6–AC10 and Tasks re-mapped (Task 4.4, 5.3 added; deferred-work lines single-homed in Task 0.4); Traps 16–20. |
| 1.2 | 2026-10-09 | Re-validated (one fresh-context read-only verifier against 1.1's rewrite): 0 BLOCKER / 0 HIGH; 8 MEDIUM + 12 LOW — all defects OF 1.1 — applied: `expired` and a failed re-check ALWAYS alarm *"may have sent"* (`-297` §2; 1.1 had weakened it to `attempt_count > 1`); unrecognised error names are HELD, exact SES names, ⛔ provider-driven final `error`; a `may_have_sent` column replaces the `attempt_count > 1` trigger (every own retry increments it ⇒ near-universal false alarms); held-fault alarm once per distinct fault per row + its volume stated; a failing pre-flight holds; `ses:GetAccount` in Row 24 (b); AC9 (c) admits `decryptEmail`'s delegation (1.1 contradicted itself); RE9 A names `router.tsx` `validateSearch` and BOTH redirects (`:25`, `:38`); four "FIXED here" claims withdrawn — the 0151 / sweep-tick items are ⛔ repeated, ⛔ fixed, and stay OPEN; glyph inversions (Task 0.5 and six others); `detail` vocabulary completed (pre-call transients, `held:`); `seedRoleGrant` cannot set `created_at`; 6.24b's helpers are closures; AC1's admin renamed L. |
| 1.3 | 2026-10-09 | Developed (`bmad-dev-story 6.25`) ⇒ `review`. Task 0: BigDev's answers (RE6 = BOTH adapters; RE5-bis added), `-299` (`8fbf718b`) + ADR-0040 `drafted` / index / epics / roster Rows 24–25 / deferred-work (`d04748b8`). Tasks 1–7: 0152 + schema/RLS (`ebc78c65`); admin-email relocation + Q1/Q2 + domain sweep half (`b01340a1`); SES/ZeptoMail port, config, template, sign-in return path, RE15 comments (`6b48c9a2`); 15-min sweep + child + boot + fences + live suite (`5234f2af`); CI fixes (`19d09477`). Ten red-checks; `ci:local` green on run 3 (34 jobs). Only permitted story sections edited (+ Task 0.5's committed-marker the story's own task requires). |
| 1.4 | 2026-10-09 | Code-reviewed (`bmad-code-review 6.25`; full diff `3a7d3a1f..391a670c`; Blind Hunter / Edge Case Hunter / Acceptance Auditor in parallel) ⇒ `done`. 3 decision-needed, 6 patch, 1 defer, 8 dismissed; all 3 decisions resolved by the user (options A/A/B) ⇒ 2 more patches ⇒ **8 patch, 1 defer, 9 dismissed**, all 8 patches applied: both `may_have_sent` gaps on an `error` finish (the give-up and the locked-recheck-failure UPDATEs); `LoginPage` now reads the `/login` route's typed `useSearch` instead of re-parsing `window.location.search` (`nextFromLocation` dropped as dead code; `login-turnstile.test.tsx`'s router mock, which also renders `LoginPage`, needed the same `useSearch` stub); `resolveAdminAppOrigin` accepts a mixed-case scheme/host and an explicit default port (`:443`) without weakening its path-smuggling guard; `buildStaffEmailClient`'s `bootAlarm` now also fires on a bad/missing `STAFF_EMAIL_FROM`; the `CLAIM_SUSPICION_STAFF_EMAIL_SEND` worker now alarms on an unexpected (non-transient) throw instead of silently exhausting pg-boss's retries; `scripts/provision-admin.ts` now rejects a non-ASCII `ADMIN_EMAIL` at provisioning; `buildJobsEncryptionDeps` exported from the `@twt/jobs` barrel (the cross-check test no longer deep-imports `@twt/jobs/src/deps.js`). Existing `may_have_sent` / `bootAlarm` / origin assertions strengthened in place; full `ci:local`-equivalent (admin 982, jobs 693, api 1594, domain 4798 tests; domain-accessor-invariants gate) green after. |
| 1.5 | 2026-10-09 | Code review ROUND 2 (narrow re-review of round 1's own fixes, `391a670c..HEAD`, 16 files/495 lines; three layers sequential) ⇒ stays `done`. 0 decision-needed, 3 patch, 1 defer, 7 dismissed (B2 folded into the B1/E1 patch): `scripts/provision-admin.ts` now imports and calls `isSendableEmailAddress` directly (Blind Hunter + Edge Case Hunter independently found round 1's hand-rolled ASCII-only regex was narrower than the runtime gate it backstops — e.g. `a@b` passed provisioning but would still be permanently rejected later); a new no-DB test pins the SEND worker's catch-and-alarm behavior for an unexpected throw (a malformed `claimCaseId` via `ids.claimId`); `buildStaffEmailClient`'s `gap`/`bootAlarm` ternary de-duplicated per provider branch (the exact pattern that caused round 1's bug). Deferred: `provision-admin.ts`'s total pre-existing lack of test infrastructure (disproportionate to bootstrap for one wiring line now that it delegates to an already-tested function). Full suite re-green after (jobs 694 tests incl. the new one; `domain-accessor-invariants` gate). |
| 1.6 | 2026-10-09 | Code review ROUND 3 (full code diff `3a7d3a1f..1f557e06`, 43 files; three chunks × three layers = nine reviewers in PARALLEL, read-only) ⇒ stays `done`. 2 decision-needed (both A — the user's call), 12 patch ⇒ **14 patch, 3 defer, 27 dismissed**; the one HIGH raised was FALSE (the re-claim's `may_have_sent OR detail IS NULL`). Applied: a HELD run PARKS stale in-flight rows and skips the give-up (⚠ by a parked marker, ⛔ the `claimed_at` refresh first recorded — that would still burn the row; the reason is in the finding); migration **0153** (the `detail` vocabulary CHECKs + a trigger freezing a finished row and `may_have_sent`; applied :5432 + :5433); `bootAlarm` = `configGap()`; ZeptoMail's named 429 by NAME; SES sign outside the fetch `try` + trimmed secrets; deterministic pre-call faults alarm; the take-over UPDATE re-checks the lease; a dot-atom address check + provisioning also checks the login form's `Email`; a lower-cased `next`; the real `validateSearch` over TanStack's real parser; the email link pinned to the admin route + allowlist; literal / frozen-fixture / helper-level cross-check + a context-capability fence rule; the domain spec's un-failable assertions fixed; missing AC legs added (`upheld_final`, RE3 (a) case, AC6, AC7 error paths, RE11, AC2 (ix) outside the DB gate). Red-checked: the lease re-check, the give-up's parked skip, the held-run park. `ci:local` green (34 jobs). Deferred (pre-existing): 0151/0152 grants for the jobs service login (Row 24 (b)); a same-job-id concurrent run after pg-boss's handler timeout; boot's un-timed Secret Manager awaits. |
| 1.7 | 2026-10-09 | Code review ROUND 4 (narrow — round 3's uncommitted fixes, `git diff HEAD` excl. `_bmad-output`, 19 files / ~1,600 lines; three layers in PARALLEL, read-only) ⇒ stays `done`. 1 decision-needed (D3 → A, the user's call) + 8 patch ⇒ **9 patch, 0 defer, 6 dismissed**, all applied. ⭐ P1 [HIGH]: round 3 had changed `-299` RE11 (and extended RE5) with ⛔ entry — `2026-10-09-300` (author-commit, the slip disclosed) inserted, `⚠ AMENDED` lines on RE5 / RE11; it must be COMMITTED before any round-3 / round-4 code. P-D3: 0153 gains `aging_since` (the give-up's anchor, reset when a PARKED row is re-claimed — round 3's park had still counted held time after ONE post-hold child), applied by hand to :5432 + :5433 and proven on a scratch database migrated from zero. Also: the park's premise / held-run wording corrected (code, README, ADR-0040), an invalid `ADMIN_APP_ORIGIN` boot alarm, reason arrays tied to the grammar, every domain label ⛔ hyphen-edged, the fence's namespaced / template-literal match, the `/login` wiring pin, render / read legs, exact thrown count, the `NODE_ENV` restore. Red-checks #11–#16 logged (incl. 0153's trigger + CHECK dropped on :5433). `ci:local` green (34 jobs). |
