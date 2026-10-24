---
baseline_commit: d87d047a
---

<!--
⭐ BASELINE: `d87d047a` — `story(6.35): ledger 2026-10-23v — LANDED on main by fast-forward`. `origin/main` was
fetched and equals it (2026-10-23). Two facts, stated separately:
  - the pin is an ancestor of HEAD (durable);
  - every code claim below was read at `d87d047a` (perishable). Re-diff `packages apps scripts` (Task 0.1).
⚠ No `file:NNN` pointer in this file points into `.decision-log.md`, `deferred-work.md` or `sprint-status.yaml`
(all newest-first). Cite those by decision id / clause / item title / row key only.
⭐ NUMBERS at the pin (re-check ALL of them at Task 0.1 across every branch AND every worktree — a 5.11 worktree
appeared while this file was being written): next decision id `-389` (HEAD `-388`) · next migration **`0181`** —
⚠ `0180_peer-mesh-request-peer-is-nominee.sql` is committed on `story/6-36d-exclude-nominees-from-the-five` and is
already APPLIED on the shared :5433 DB (ledger `2026-10-23v`) · `PERMISSION_CATALOG_VERSION` `52` (68 keys) · ledger: this
story's creation entry is `2026-10-23x` (`w` is 5.11's). Live peer worktrees at creation: `5-11-…`, `6-36d-…`, `6-35-…`, `3-3c-…`.
⭐ WORKTREE: `.claude/worktrees/11b-4-memorial-authorship-surface-family-writes-the-story`, branch
`story/11b-4-memorial-authorship-surface-family-writes-the-story`. ⚠ The branch was created with upstream
`origin/main`; push with `-u origin story/11b-4-…` the first time, ⛔ never a bare `git push`.
⭐ LETTERS: `Q1–Q5` = the Panel questions (routing note); `MA1–MA19` = build decisions (this file); `D-…` are
never used bare.
⭐ RE-VERIFIED (v0.3, 2026-10-23): `origin/main` still `d87d047a` ⇒ every code claim re-read at the pin by four
fresh-context verifiers; numbers above re-checked on every branch + worktree (ledger: `x` this story's creation,
`y` 6-36d's, `z` 5.11's, `aa` this validation — take the next free letter at every commit).
⭐ PANEL RULED (v0.4, 2026-10-23): `-391` (Trustee-ratified, Dhiraj Rahul + Kalpana Bharti) — Q1 A · Q2 A · Q3 B with a
rider (the family is told a published memorial cannot be taken down; the Trust keeps helpline removal for exceptional
cases) · Q4 A · Q5 A · Confirms 1–3 A. Numbers then: `-389`/`-390` are 5.11's (unlanded), `-391` is this ruling ⇒ this
story's author-commit takes the next free id (`-392` or later); ledger `ak` (5.11 holds `ag`–`aj`); `origin/main` had moved
to `1268d47e` (6.36d landed, `-386`) — Task 0.1's rebase picks it up.
⭐ CLARIFIED (v0.5, 2026-10-23): `-392` (Trustee-ratified, clarifies `-391` item 3) — a published memorial is taken down only for
a genuine reason; the **helpline operator** decides on merit and removes it within 7 days; an email goes to the approver
(MA18 — built with 11b.4a). ⇒ this story's author-commit takes `-393` or later; ledger `al`.
⭐ RIDER WITHDRAWN (v0.6, 2026-10-23): `-393` — the Panel withdrew `-391`'s Q3 rider; a family may ask the helpline to take a
published memorial down (Q3 B as put), discouraged by **soft measures only**: M1 a removal leaves no trace; M2 an honest
notice at Send; M3′ a preview line (BigDev's words); M4 the helpline offers a smaller fix first. `-392` items 2–3 (genuine
reason, on merit) superseded; items 4–5 (7 days, email to the approver) standing pending BigDev's confirmation. ⇒ this
story's author-commit takes `-394` or later; ledger `an` (`am` is taken).
⭐ NOMINEE ONLY (v0.7, 2026-10-23): `-395` (author-commit, BigDev) — a published memorial is taken down **only on the
nominee's request**; `-392` items 4–5 (within 7 days; an email to the approver) KEPT; the Panel was informed of `-393`.
`-394` is held by 5.11's worktree (uncommitted) ⇒ this story's author-commit takes `-396` or later; ledger `ao`.
⭐ RE-CHECKED (v0.8, 2026-10-23, `origin/main` `1268d47e`): launch-gate **Row 40 is 5.11's** (`member-alert-sms-fallback-live`,
committed on its branch `0684fcb1`) ⇒ this story's row is **Row 41** (free on every branch + worktree). Migration `0181` is
also PLANNED by 6.36e (worktree `6-36e-…`) — whichever commits first takes it. Ledger: 6.36e committed `al` + `am` ⇒ this
story's `al` collides — re-letter this story's entries at the Task 0.1 rebase (the 6.36d precedent). Catalog still 52. Ledger `ap`.
⭐ VALIDATED (v0.9, 2026-10-24, `origin/main` `1268d47e`; four fresh-context verifiers; BigDev "all"): `d87d047a..1268d47e` moved ⛔ no
cited file but `0180` + `_journal.json` (6.36d landed — `0180` is ON MAIN; the 6-36d branch no longer exists). Keep the pin for Task 0.1's
diff. New **MA19** (BigDev 2026-10-24: (a) — close the generic step-up route for `claim_handover`). Ledger `2026-10-24b`.
⚠ The v0.4–v0.6 lines above are **HISTORY** — "cannot be taken down" (withdrawn by `-393`), "genuine reason … on merit" (superseded by
`-393`), "items 4–5 pending" (kept by `-395`). The current state is the PREFLIGHT below.
-->

# Story 11b.4: MemorialAuthorshipSurface — Family Writes the Story + Family-Authorship-Preserved Invariant `[SURFACE]`

Status: review

## ⭐ GLYPH REGISTER — read this before any clause below

⭐ = an action to take · ⚠ = a hazard · **⛔ marks a negation and must be followed by an explicit
negator** (`not` / `no` / `never` / `nothing` / `neither`, or a prohibition verb). A ⛔ placed before a
positive clause is an **inversion**, not emphasis. Doubling (`⭐⭐`, `⛔⛔`) adds volume only.

## ✅ PREFLIGHT — **STARTABLE for the build. ⛔ NOT launchable** until the public render lands and Row 41 closes (the Panel ruled Q1–Q5 and the confirms — `-391`).

⭐ **Authority.** `#decision-2026-08-28-162` **cl.3** (Trustee-ratified) binds this story by name:
*"FAMILY-OWNED MATERIAL IS AUTHORISED AT THE POINT OF SUBMISSION … 11b.4 owes the authorisation **in its own
surface**, at the moment of submission … ⛔ It is ⛔ not discharged by adding a box back to the claim screen
under a new name."* Its open follow-up: *"Story 11b.4 carries clause 3 into its own ACs and Tasks list — the
AC-only route has already failed on this epic."* ⇒ **AC4 + Task 4** carry it. ⛔ Nothing supersedes `-162`
(traced 2026-10-24: only `-163` (a routing note — "NOTHING IS RULED HERE"), `-166`, `-168` (References only), `-177`,
`-183`, and this story's own `-391` / `-393` cite it; ⛔ none narrows it).

⭐ **The routing template's §0 gate, applied.** Most questions in this story are the **author's** and are ruled
below as build decisions **MA1–MA19** (⭐ = recommended; BigDev answers the open ones at Task 0.2). **Five pass the gate**
and are routed in **one drafted note**:
`_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-10-23-11b4-family-memorial-five-questions.md`
— ⭐ **SENT and RULED: `#decision-2026-10-23-391`** (Trustee-ratified, 2026-10-23). The note also carried **three
confirms**, all answered **A** (as built): the reviewer is the Trustee Panel role (MA7); the four grounds on which words
may be left out, and ⛔ no others (MA6); the permission is kept with the words, ⛔ not in the consent register (MA5).
⚠ **Q3 binds AC4 — soft measures only (`-393`, the rider withdrawn):** the Panel discourages take-downs, since a removal
may raise questions among members and the public (`-392` item 1), but by **soft** measures: the permission text at Send
says honestly that the family may later ask the helpline to change it or take it down (M2); the preview screen says now is
the time to change it (M3′); a removal leaves no trace on the page (M1 — row `11b-4a`); the helpline offers a smaller fix
first and takes it down if the **nominee** still wants it — **only on the nominee's request** (`-395`) — within 7 days, with
an email to the approver (M4 + `-392` items 4–5, KEPT by `-395`) — built with the public render, row `11b-4a` (MA18).

| Q | Plain question | Ruled (`-391`; Q3 amended by `-393`, and by the author-commit `-395`) | Built here as |
|---|---|---|---|
| **Q1** | Who may write the memorial and give permission, for the family? | ⭐ **A** — the nominee | Signed in on the deceased's account, sent with the **nominee's handover code** (the only principal that exists) — and **only** that code: MA19 closes the generic step-up route that today mints the same elevation with a code to the deceased's own phone |
| **Q2** | What of the memorial is shown publicly, and what never is? | ⭐ **A** — as approved, any child left out | The permission wording (AC4) is written on A; publication is ⛔ not in this story (MA1 → 11b.4a) |
| **Q3** | Can the family take it down after the Trust has decided on it? | ⭐ **B** — the family asks the helpline (Q3 B as put), the Trust removes it (the rider withdrawn — `-393`); **only on the nominee's request** (author-commit `-395` — ⚠ to be shown to the Panel; it answers `-393`'s Not-covered *"who may ask"*); discouraged by soft measures only: no trace (M1), an honest notice (M2), a preview line (M3′), a smaller fix first (M4); within 7 days, email to the approver (`-392` items 4–5, kept — `-395`) | AC4 carries M2 and M3′; withdrawal **before review** only (MA9); the Trust may withdraw its own approval (MA16); the operator's take-down is 11b.4a's (MA18) |
| **Q4** | Is the family told why words were left out, and can they ask again? | ⭐ **A** — told in the app, ⛔ no appeal | Told in the app, may send a new version |
| **Q5** | How long does the Trust keep what the family sent, and can it be erased? | ⭐ **A** — with the member's record | Kept with the member's record, erased with it (MA15); a family's own erasure request is a helpline follow-up (AC16 (7)) |

⚠ **What is already ruled (Panel, or author-commit where marked), and this story must satisfy** (⛔ none is reopened):
`-162` **cl.2** (boxes (b) `sahyog_vivran_publication` and (c) `in_memoriam_listing` RETIRED — ⛔ never reused,
⛔ never re-worded); `-162` **cl.5** (**author-committed**, extending `-160` cl.5's preserve-don't-delete discipline: the two enum values
and every existing `consent_records` row PRESERVED); `-160` **cl.3** (Trustee-ratified; its table: *"Family-owned information | the family's
own consent | ⛔ No [per-subject gate]"*); `-160` **cl.6** (Trustee-ratified) + `-223` (author-commit) (⛔ **no family veto over the member's own name**
— nothing in this surface may gate, withhold or ask about the deceased member's name); `-196` **Consequence 2** (author-commit; as recorded in
`packages/domain/src/pool/member-drive-detail.ts`: each surface declares its **own** visible-state tuple, ⛔ never imports another's — MA14).
⚠ The epic's own limit binds the review: *"content moderation by trustees occurs for harmful or policy-violating content **only**
(e.g., personal attacks on third parties, false accusations, illegal content)"* (`epics.md` `### Story 11b.4`) — three of MA6's reason codes are those grounds; the fourth (a child) follows `-391` Q2 A, and Confirm 2 A ratified all four as the only grounds.

⭐ **One governance entry is written by THIS story** — Task 1 records **MA1–MA19** (as answered) plus the three
enum mints and the permission key as ONE author-commit entry (**the next free id** — `-396` or later; `-389`/`-390`/`-394` are 5.11's, `-391`–`-393` and `-395` are this story's rulings) **before
any code**, committed alone ([[feedback_governance_commits_precede_implementation]]). ⚠ The enum mints and the
permission key are ⛔ **not** covered by the `-210` cl.2 delegation (it covers only tracking vocabularies with ⛔ no
member-facing or authority effect) — they need that entry, ⛔ not the delegation.

⚠ **STOP conditions for Task 0.1** — halt and tell BigDev if any of these is true at the fresh `origin/main`:
1. a decision newer than `-395` cites `-162`, `-196`, `11b.4`, `memorial`, or `family-authored` ([[feedback_story_validate_footguns]] #6, #15);
2. a story file other than this one, or a new row, owns a family memorial / tribute / parichay (#10);
3. any file under `packages/domain/src/memorial/`, `apps/api/src/modules/memorial*`, or `apps/mobile/app/(memorial)/` already exists;
4. the Panel has ruled on this story again after `-395` (then transcribe it FIRST and re-read every AC against it);
5. a sibling has added a guard to `apps/api/src/modules/withdrawal/handlers.ts` `assertWithdrawable` for a member with a filed claim (then re-read AC16 (9));
6. a sibling has changed `stepUpRequest` (`apps/api/src/modules/auth/member/member-auth.handlers.ts`) or `MemberStepUpRequestRequest` (`packages/contracts/src/members/auth.ts`) (then re-read MA19);
7. 6.36e has committed a migration, a `_journal.json` entry or a change to the `rtbf-anonymize.test.ts` pins, or has landed (then re-take the migration number, the `when`, and the three counts — Task 2.5).

---

## Story

As **the nominee of a member who has died, writing for the family**,
I want **to write a few words about them in my own way — at my own pace, over days if I need, with a photo if I
choose — see exactly how it will read, and send it to the Trust knowing what will happen to it**,
so that **my words for my loved one stay mine: the Trust may leave a sentence out, or say no and tell me why,
but ⛔ never rewrites, summarises, embellishes, or generates what I said.**

## 📜 Policy meaning (AI-10-1, CONFIRMED BigDev 2026-08-18)

⭐ **No predicate that gates a MEMBER's access to a benefit** is introduced, and the one changed (MA19, the fourth below) only
removes a bypass — every nominee path keeps working. ⛔ No `is_valid`,
`is_assignable`, `members.state`, moderation overlay, eligibility, contribution or claim predicate is read or
written. ⛔ Nothing here touches who is paid, who is covered, or who may contribute.

⭐ **One new predicate gates a FAMILY's ability to send a memorial** — "the drive for this member's death is
`closed` or `settled` (MA14), the server switch is on (MA17), and the person is in the member session the family uses
after a death (the Ravi-mode session-as-deceased: signed in on the **deceased's own account** with a code sent to the
**deceased's own number**); sending additionally needs the nominee's handover code" (`resolveMemorialDrive`, Task 3).
**In the family's terms:** *"once the Trust's collection for the person who died has closed, the nominee can write about
them — at any time after, with no deadline, for as long as the family can still sign in on the member's account."*
⚠ That last clause is real, ⛔ not a hedge: the sign-in lasts 90 days from the last use (`apps/mobile/lib/session.ts`
header) and 180 days at most from the sign-in (`memberRefreshAbsoluteMs`, `apps/api/src/config.ts`), after which signing in
needs a code on the deceased's own number; and withdrawing the deceased's membership is
unguarded today (`apps/api/src/modules/withdrawal/handlers.ts` `assertWithdrawable` checks only the member state) and
ends every Ravi-mode surface — recorded at AC16 (9), ⛔ not fixed here.
**Checked against the Niyamavali — no clause governs who may write a memorial or when.** Grepped
`docs/legal/niyamavali.md` and `docs/legal/niyamavali.hi.md` for `memorial` / `In Memoriam` / `photo` / `portrait` /
`narrative` / `श्रद्धांजलि`: two hits in each, both **pre-`-162` consent prose** (the claim-time consent list *"(c) In
Memoriam inclusion"*, and *"publicly visible on the memorial / Sahyog Vivran (consent-gated)"*). ⛔ Neither governs
authorship, and both are overtaken by `-160`/`-162`. ⚠ `docs/legal/` is the private corpus — **gitignored**, present only
in the main checkout (⛔ not in this worktree); the Niyamavali is a rulebook ⛔ not a ratified spec
([[feedback_niyamavali_rulebook_not_spec]]), so the check is reproducible only where the corpus is present.

⭐ **The same predicate has a second face — `memorialCanSend` (MA13) stops the family sending once the Trust has approved.**
**In the family's terms:** *"Once the Trust has approved your memorial exactly as you sent it, you cannot send another version
in the app; the helpline is how you ask for a change."* (Every other state — with the Trust, withdrawn, not approved, approved
with a part left out, approval withdrawn — lets the family send again.) **Niyamavali check: NOT RUN in this worktree (legal
corpus not present) — owed before Row 41 closes.** ⚠ The grep recorded above covers *who may write and when*, not this
sentence, so it does not stand in for the check; `docs/legal/` is absent here by design (the private corpus).
⭐ **RUN — 2026-10-24, third code-review pass (T13 (e)).** The corpus is present (untracked) in the MAIN checkout, where MA19's
check was also run: `docs/legal/niyamavali.md` sha256 `f91746355a81e85a…`, `niyamavali.hi.md` `dfe8179678016dce…`. The only
memorial passages are §6.5 *Post-decision visibility* (claim outcomes and reversals publicly visible on the memorial, consent-gated)
and Part 10's claim-time consent list ((c) *In Memoriam* inclusion), in both languages. Neither speaks to a family sending another
version after the Trust approved one ⇒ **no conflict; the Niyamavali is silent and the rule rests on MA13 (`-398`) alone.** The
"NOT RUN" sentence above is kept as written; Row 41 (j) records the same result.

⭐ **A second new predicate decides what a REVIEWER may do** (MA6: approve · approve with parts left out · not
approved — each part left out carries its own reason). **In the family's terms:** *"the Trust can leave out a
sentence or my photo, or say no, and must tell me the reason for each — but it can never change my words."*
Same Niyamavali result (no clause).

⭐ **A third decides when the Trust may take back its own approval** (MA16). **In the family's terms:** *"if the Trust
approved something by mistake, it can withdraw that approval and tell me why, and I can send a new version."* Same result.

⭐ **A fourth CHANGES an existing predicate — who can unlock the nominee's steps** (MA19: the generic member step-up route
refuses `claim_handover`, so that elevation comes **only** from the code sent to the nominee). It gates the nominee's claim
filing, claim documents, nominee-bank details and bank-statement upload as well as Send. **In the family's terms:** *"only the nominee's phone can unlock the steps
taken for the family — the claim, the bank statement, the memorial — never just whoever has the member's phone."* ⛔ No
nominee loses a path: every client already uses the nominee route (`apps/mobile/lib/use-handover-otp.ts` →
`/member/claims/handover-otp{,/verify}`); ⛔ no client or test asks the member generic route for `claim_handover` (grepped at
`1268d47e` — MA19). **Checked against the Niyamavali** (main checkout, `docs/legal/niyamavali{,.hi}.md`, grep `OTP` / `one-time` /
`step-up` / `handover`): ⛔ no clause governs how a nominee is verified — the only hits are R7(A)'s *"one-time-only"* and the
DPDPA row's *"one-time identity-verified grant"*, neither on point.

---

## 🎯 What already EXISTS — read at `d87d047a`

| Need | What exists | Reuse? |
|---|---|---|
| A post-death author principal | **Ravi-mode** — the family signs in to the **deceased member's** account with a login code sent to the **deceased's own number** (`apps/api/src/modules/auth/member/member-auth.handlers.ts` `otpRequest` — the code goes to the mobile typed in); login refuses only withdrawn / anonymized / terminated members, and death is the `account-frozen` overlay that ⛔ never blocks a session. Writes elevate via `requireMemberStepUp(deps, 'claim_handover')` (`member-step-up.gate.ts`) — a **5-minute** step-up code sent to the **nominee's** declared mobile (`CLAIM_HANDOVER_ACTION_CONTEXT` in `apps/api/src/modules/claims/claims.service.ts`; the latest nominee, or the at-death nominee while a `-239` refusal stands). ⚠ The elevation row (`schema/member_step_up_elevations.ts`) records only member, context and expiry — ⛔ not who received the code — and one elevation serves every `claim_handover` route for its 5 minutes. ⚠⛔ **And the same elevation can be minted WITHOUT the nominee today:** the generic `POST /api/v1/member/auth/step-up/request` accepts any `actionContext` (`MemberStepUpRequestRequest`, `z.string().min(1).max(128)`), texts the code to the **session member's own** mobile — under Ravi-mode the deceased's phone — and `stepUpVerify` inserts an elevation for that context; ⛔ nothing refuses `claim_handover` (Trap 13, MA19) | ⭐ Yes — the only principal (Q1 option A), once MA19 closes the generic route; MA5 records the nominee version |
| "Which drive is this?" | `nomineeConsole.resolveActiveNomineePool` (`packages/domain/src/nominee-console/read.ts`) — ⚠ matches **only `live`** pools; tie-break `createdAt` desc then `poolIndex` asc; it returns `liveCount` and the `> 1` log is in the handler (`apps/api/src/modules/nominee-console/handlers.ts`) | ⛔ **No** — Trap 2 |
| Visible-drive states | Four surfaces each declare their own identical `['live','closed','settled']` tuple; `member-drive-detail.ts`'s doc-block: *"⛔ NEVER IMPORTED FROM … `SAHYOG_VIVRAN_VISIBLE_POOL_STATES` … any may move alone"* (`-196` Consequence 2). Pool states are `spawned · live · closed · settled` (`schema/pools.ts`) | ⛔ **No import** — declare `MEMORIAL_DRIVE_POOL_STATES` (MA14) |
| Point-of-submission wording registry | `CLAIM_CONTACT_AGREEMENT_VERSIONS` (`packages/domain/src/claim/claim-contact-agreement-copy.ts`) — versioned, the words never edited (a change is a new version; `hiReviewed` is flipped in place on acceptance), a go-live marker in the id (current: `'2026-10-20.v2-pending-story-0.13'`); the client sends only `locale` (+ `agreed`) and the server picks the current version | ⭐ The **pattern** (MA5). ⚠ 11b.4 ALSO echoes the version and **refuses** a stale one — ⛔ no precedent: `contracts/src/terms/member-terms.ts` treats an echoed version as *"a staleness signal only"* |
| The handover step-up on the phone | `apps/mobile/lib/use-handover-otp.ts` (Story 6.21b shared hook) returns `{ masked, noNominee, error, busy, send, verify }` — the caller owns navigation, retry **and copy**; its header: *"⛔ never `useStepUpGate` — that sends to the SESSION member's phone"*. Precedent `app/(claim)/certificate-replacement.tsx` retries **once** with the file still picked, then the helpline (⛔ never a second SMS round trip). Elevation lasts **5 minutes** (`stepUpElevatedMs`, `apps/api/src/config.ts`) | ⭐ Yes — AC7a, with `memorial` copy (the claim keys say *"…help you file"*) |
| The deceased's name in the family's own app | 11b.21's chain in `apps/api/src/modules/member-pool/handlers.ts`: decrypt the stored KYC name (`getMemberKycProfile` + `decryptKycField`, as `notifications/pool-identity.ts` does) → `kycDomain.publicNameTokens` → `notifications.resolveMemberFacingDeceasedName(presentationMode, …)` → `normalisePublicName` (`apps/api/src/modules/kyc/name-render.ts` — that file exports only `normalisePublicName` + the KMS-outage helpers). ⚠ The console shows only a curated **pool** name | ⭐ Yes (AC2 intro) — the Pariwar's presentation mode (MA14) |
| Photo storage | Per-purpose ports in `@twt/contracts` (`ClaimDocumentStorage`, `HelpdeskAttachmentStorage` — `put`, `signedReadUrl`, optional `delete`) + adapters `packages/platform-adapters/src/<name>/{gcs,in-memory,local-fs}.ts` (exported from `src/index.ts`), wired in `apps/api/src/context.ts` + `deps.ts` (bucket from an env var, else local-fs — ⛔ no app bucket is in Terraform; `infra/gcp` holds only the audit mirror); object key ⛔ never on the wire | ⭐ A **new** port on the helpdesk-attachment precedent (MA8) |
| Multipart reading | `apps/api/src/modules/helpdesk/member-handlers.ts` `readCreateMultipart` — `request.parts()`, per-request limits, fields in any order, files optional, an `Idempotency-Key` gate. ⚠ Its `fieldSize: 8192` would refuse a long Hindi body. ⚠ `claims.documents.handlers.ts` uses `request.file()` (a file is required; fields after it are missed) and its metadata row is written by a **job** — ⛔ not this shape | ⭐ The pattern (AC7, Trap 11) |
| Append-only decision record | `member_moderation_actions` (`packages/domain/src/schema/member_moderation_actions.ts`): `actor_display` snapshot; shipped `GRANT SELECT, INSERT` (0091), **then** `0092_member-moderation-rtbf.sql` granted UPDATE on the Tier-1 note column **only**, because append-only had made it *"STRUCTURALLY UN-ERASABLE"*; the column is now `decision_note_ciphertext` (0099) | ⭐ The **shape incl. the 0092 erasure grant** (MA15) — ⛔ not the table |
| Erasure | `anonymizeMember` (`packages/domain/src/member/anonymize.ts`) scrubs Tier-1 data, incl. data keyed on the deceased's claims; `packages/domain/tests/member/rtbf-anonymize.test.ts` pins the table set (*"Whoever adds the next Tier-1 column raises this number in the same commit"*) | ⭐ Yes (MA15) |
| Draft persistence | MMKV via `mmkvStorage` (`apps/mobile/lib/mmkv.ts`, synchronous); `apps/mobile/lib/helpdesk-draft.ts` (saves on **every** change; *"Attachments are NOT persisted (file URIs are transient)"*), `components/nominee-console/console-resume.ts` (versioned `.v1` key). Sign-out purges only the keys listed in `components/life-events/draft-store.ts` `MEMBER_DRAFT_SCREEN_KEYS` | ⭐ Yes (MA3) |
| Mobile photo pick | `app/(helpdesk)/new.tsx` — `requestMediaLibraryPermissionsAsync` + `launchImageLibraryAsync({ quality: 0.8 })`, `mimeType ?? 'image/jpeg'`; `expo-file-system` `^55` with the **new** API — `import { File, Paths } from 'expo-file-system'` (`lib/save-export.ts`, `lib/save-note.ts`); ⛔ nothing uses the legacy `documentDirectory` / `copyAsync`. ⚠ No mobile test mocks `expo-file-system` or `expo-image-picker` yet. (`lib/use-death-certificate-upload.ts` is camera + PDF — ⛔ not the gallery case) | ⭐ The pattern |
| Persisted query cache | `apps/mobile/components/Provider.tsx` — `PersistQueryClientProvider` writes **every** successful query to unencrypted MMKV (`twt-p0-5-cache`, 7-day `maxAge`) **except** a query whose hook sets `gcTime: 0`, which `shouldDehydrateQuery` reads as *"⛔ NEVER PERSIST THIS"*; `lib/query-client.ts` defaults `staleTime` 1 h, `refetchOnWindowFocus: false`; sign-out clears ⛔ no query cache. Precedent: `components/drive-detail/useMemberDriveDetailQuery.ts`, `components/contributor-list/usePoolContributorsQuery.ts`. `deferred-work.md` **CR-11b.2a-COMBINED-W3** trigger (iii): *"any story adding a second member-scoped persisted query"* | ⭐ `gcTime: 0` on every memorial query (AC1) |
| Source pins on the home tab | `apps/mobile/tests/unit/language-source-pins.test.ts` (6.35) pins `app/(tabs)/index.tsx` and `app/_layout.tsx` (no `t` in any deps array; `<LanguageSettingsEntry />` immediately followed by `<NotificationSettingsEntry />`) — its header: *"only this test catches a wrong route"*; `peer-request.test.ts` and `sahyog-vivran-entry.test.ts` pin the order of home entries | ⭐ Keep them green (Task 6.1) |
| Mobile precedents | namespace hook `lib/workplace-i18n.ts` (`useXT()` binding one namespace — note its fresh-closure warning); API client `lib/claim-api.ts` (a `createMember…Client` factory in `@twt/api-client`); Idempotency key `lib/idempotency-key.ts` `newIdempotencyKey()` (*"A retry of the SAME save reuses its key"*); input-props capture `apps/mobile/tests/unit/kyc-manual-render.test.ts` (its `Input` mock records every prop — the `language-screen-render` mock drops unknown props). Every production input is tamagui `Input` (only the P0-5 prototype `components/shradhanjali/MemoryInput.tsx` uses RN `TextInput`) | ⭐ Yes (Task 6) |
| Mobile render tests | jsdom harness with RN primitives mocked, `vi.mock('../../lib/mmkv')`, RTL `cleanup`: `apps/mobile/tests/unit/language-screen-render.test.ts` (`// @vitest-environment jsdom`) | ⭐ Yes (Task 6.4) |
| Audit | `writeAuditEntry` / `withCompensatingAudit(pool, { auditIntent, mutate })` (`packages/domain/src/audit/` — intent line first; `mutate` opens ⛔ no tx; `_rolled_back` on a throw) — hash only, ⛔ never content. ⚠ Every `encryptTier1` / `decryptTier1` also fires an audit line (`encryption/envelope.ts`, ⛔ no DEK cache), each under one deployment-wide lock (`audit/write.ts`); read lines follow `admin_claim.contact_details_read` (*"one line per read, naming how many fields were decrypted"*); new **read** actions join the `AuthAuditEventType` union (`apps/api/src/audit/audit-sink.ts`); write lines go through `withCompensatingAudit` | ⭐ Yes (MA11) |
| RBAC | `packages/domain/src/rbac/permissions.ts` (`PERMISSION_CATALOG_VERSION = 52`, 68 keys), `roles.ts` (`trustee_panel` — *"the Trustee Panel constituted by Niyamavali §8.7"*, `scopeCeiling: 'pariwar'`), `requirePermissionHook(deps, key, opts)` (defaults to the `pariwar` dimension) | ⭐ New key (MA7) |
| Admin precedent for a review queue | `apps/admin/src/modules/news-blog/` (`NewsPage.tsx`, `derive.ts`, `i18n-en.ts`) + route `apps/admin/src/routes/NewsRoute.tsx`, `apps/admin/src/router.tsx` (`createRoute` + the route tree), calls in `apps/admin/src/api/client.ts` + `hooks.ts` (admin's calls go through `src/api/client.ts`, ⛔ not `@twt/api-client`'s factories); nav is a `<Link>` in `RootLayout.tsx`. ⚠ News-blog is an **editor** — layout only. ⭐ The closer precedent for a **`trustee_panel` decision page with reasons** is `apps/admin/src/modules/moderation-appeals/ModerationAppealsPage.tsx` (its header: *"a decide endpoint reachable only by direct link would be a technically complete appeal that nobody can find"*) | ⭐ Layout + wiring (news-blog); queue + decision (moderation-appeals) |
| Shradhanjali prototype | `apps/mobile/components/shradhanjali/*` (`MemoryInput`, `MemorialPortrait`, `KinshipLattice`, `ContributorRow`, `ShradhanjaliSahyogVivran`, `sample-data.ts`); the live tab `(tabs)/shradhanjali.tsx` renders `<ShradhanjaliSahyogVivran />`, which reads `SAMPLE_MEMORIAL` — **P0-5 measurement surfaces on sample data** | ⛔ **Not** production; ⛔ not extended (11b.5 — `backlog` — owns `MemorialRecord` / `PortraitFrame` / `KinshipLattice` in `packages/ui`) |

⛔ **What does NOT exist** (each verified at the pin): a content-moderation queue, action vocabulary, or appeal
(`MODERATION_ACTIONS = ['suspend','terminate','restore']` is member-only); any field for a family story,
portrait or kinship on the `sahyog-vivran` matrix surface; any navigation **into** `(nominee)` (the console
route exists but ⛔ nothing links to it — `grep -rn "(nominee)" apps/mobile` hits only `app/_layout.tsx` and two
comments: `(polls)/_layout.tsx`, `lib/nominee-bank-vpa.ts`); a server-side member draft table; any rich-text editor or
renderer on mobile; any EXIF/GPS stripping (`git grep -i exif` over `apps packages` is empty) or image library in `apps/api`;
the `disabled-T+90` account state (`packages/domain/src/state-machine.ts` header: a "focused follow-up" — ⛔ not built).

---

## ⚠ THE THIRTEEN TRAPS

### Trap 1 — ⚠ "Moderation queue per Story 10.10" points at the wrong thing
Story 10.10 is **member** suspend/terminate/restore; 10.20/10.22 are member-sanction records and appeals. ⛔ None
moderates content, and the family author is ⛔ not the sanctioned member. ⇒ This story builds its **own**
append-only review record (MA6). ⛔ Never add `remove`/`redact` to `MODERATION_ACTIONS` (defined TWICE: `packages/domain/src/member/moderation/status.ts`
and `packages/contracts/src/member-moderation/enums.ts`), ⛔ never write to
`member_moderation_*`, ⛔ never reuse `member.moderate`.

### Trap 2 — ⚠ The console resolver goes dark exactly when authorship begins
`resolveActiveNomineePool` matches **only `live`** pools; the UX places authorship **post-close**. ⛔ Do ⛔ not
widen that resolver — it would change Story 9.1's console (reconciliation, contributor list) for closed drives.
⇒ A **new** resolver `resolveMemorialDrive` over its **own** `MEMORIAL_DRIVE_POOL_STATES = ['closed','settled']`
(MA14 — ⛔ never imported from another surface), with the same deterministic tie-break; it returns the match count and
the **handler** logs `> 1`, as the console does.

### Trap 3 — ⚠ "Pre-populated parichay" would break the invariant
The UX spec's `<MemorialAuthorshipSurface>` has *"Draft (HQ pre-populated)"*. That is **system-written text in
the family's field** — it collides with invariant (e) (*"AI-generate or AI-fill any narrative content"*) and with
reconstruction (*"what the family originally wrote"*). ⇒ ⭐ **The text box always starts EMPTY** — ⛔ never pre-filled. Factual content
(name, dates, district) belongs to the page, ⛔ never to the family's text.

### Trap 4 — ⚠ "Notification + appeal" has no substrate, and SMS cannot carry it
Member appeals are for members; DLT delivers only pre-approved SMS text ([[project_dlt_only_approved_text_is_delivered]]);
`helpdesk_reply` notifier is log-only in production. ⇒ The outcome is shown **in the app** (Q4 option A), the
family may send a new version; ⛔ no SMS, ⛔ no push, ⛔ no appeal record (Q4 option B is the Panel's).

### Trap 5 — ⚠ The financial-truth gate fires on file NAMES
`scripts/sahyog-vivran-financial-truth/check.ts` fails if a file whose name matches `/sahyog-vivran/i` in its
candidate dirs is ⛔ not in `SCAN_FILES`, and allowlists event-type literals. ⇒ ⛔ No new file in this story is
named `*sahyog-vivran*`; ⛔ no edit to, and ⛔ no import from, `sahyog-vivran-read.ts` (MA1 keeps the public read
untouched; MA14 declares its own tuple). (Verified: ⛔ no rule fires on `memorial/*` files or on `memorialState` /
`body` / `omissions`.)

### Trap 6 — ⚠ Verbatim means VERBATIM — ⛔ no normalisation on the way in
⛔ No `.trim()`, ⛔ no NFC/NFKC, ⛔ no whitespace collapse, ⛔ no line-ending rewrite of the stored body. Validation
(non-blank, length) runs on a **derived** view; the stored ciphertext decrypts to the exact string the family
sent. ⚠ The omission spans (MA6) are offsets into **that** string, so any normalisation silently shifts every
span. Pin it with a test that round-trips `"  पहली पंक्ति\r\n\r\n*दूसरी*  "` byte-for-byte.

### Trap 7 — ⚠ The mobile keyboard corrects by default — and the "off" switch does more than that
Invariant (d) forbids correction *"beyond family explicit opt-in"* and UX Pattern 6: *"auto-correction never silently
changes characters"*. With the prop unset the **keyboard** decides (iOS autocorrects; Gboard autocorrects).
⇒ `autoCorrect={false}` on the narrative and alt-text inputs — but: **iOS** inherits `spellCheck` from `autoCorrect`
(`TextInput.d.ts`), so set `spellCheck` **explicitly** to keep the underlines; **Android** maps `autoCorrect={false}` to
`TYPE_TEXT_FLAG_NO_SUGGESTIONS` (RN `ReactTextInputManager.kt`), removing the suggestion strip — which may break Hindi
transliteration keyboards. ⇒ ⭐ a **device check** (Gboard Hindi + a transliteration keyboard, both platforms) is
recorded in the Debug Log (Task 6.6); if Hindi typing breaks, **STOP and put the trade-off to BigDev** — ⛔ never ship
either side silently. Repo precedent: `apps/mobile/components/workplace/WorkplacePicker.tsx`.

### Trap 8 — ⚠ Review-time refusals can become an oracle
A reviewer request for a submission in another Pariwar, an already-decided submission, or a superseded one must
each refuse with **one neutral code** in a fixed check order (scope first) — the refusal set is **per route** (AC9: a
superseded approval may still be withdrawn; the history view reads every version) — [[feedback_story_validate_footguns]]
#46. ⛔ Never a distinct "exists but not yours". ⚠ The decision POST checks in this order: `.strict()` shape (400) →
scope / existence / pending **under the lock** (404) → offsets against the body (400) — so a range 400 is reachable only
for a submission the reviewer may see. ⚠ A staff user with ⛔ no grant in `:pariwarId` gets the scope middleware's
`404 pariwar.not_found` before the handler runs (`middleware/scope-resolution/index.ts`); `memorial_review.not_found`
is the neutral code **inside** a Pariwar the reviewer holds.

### Trap 9 — ⚠ `@twt/domain` (pg-touching) cannot be imported by Metro
[[project_contracts_domain_bundle_boundary]] — the paragraph/omission presenter that the mobile **preview** and the
later public render share must live in a **pure** package (`@twt/ui` headless presenter, per epic header C-1), ⛔
never in `@twt/domain`. ⚠ `@twt/ui`'s dependencies must be exactly `{ "@twt/contracts" }`
(`packages/ui/tests/package-boundary.test.ts`) ⇒ the presenter cannot resolve copy: it returns **segments with copy
keys** (the `status-pill/i18n-keys.ts` precedent), and the pure omission validator lives in `@twt/contracts` so the API,
admin, mobile and `@twt/ui` share **one** copy.

### Trap 10 — ⚠ "Append-only" made Tier-1 text UN-ERASABLE once already
`0092_member-moderation-rtbf.sql` exists because 0091's append-only grants left a Tier-1 note *"STRUCTURALLY
UN-ERASABLE"* — an RTBF is a soft delete (`anonymizeMember` keeps the `members` row, so ⛔ no cascade fires). Every
memorial ciphertext column is Tier-1 and keyed on the deceased (the session member). ⇒ MA15: column-level UPDATE on the
ciphertext columns **only**, `anonymizeMember` scrubs them, `rtbf-anonymize.test.ts`'s count rises in the same commit.

### Trap 11 — ⚠ Multipart is ⛔ not JSON: ⛔ no `.strict()`, fields can hide behind a file, and text is truncated by bytes
`request.file()` needs a file and misses fields after it (`claims.correction-chase.handlers.ts`); a Send with ⛔ no
photo has ⛔ no file part. With `request.parts()` a
duplicate field arrives as a **second part** (helpdesk silently keeps the last one) and a second file trips
`FST_FILES_LIMIT` — both must map to the duplicate-field 400. The global plugin sets `files: 1, fields: 8`; helpdesk's `fieldSize: 8192` bytes is **less** than 6,000 Devanagari
code points (up to 18,000 bytes in UTF-8, 24,000 with astral characters).
⚠⛔ **An over-long text field raises NO error.** `@fastify/multipart` (`index.js` `onField`) passes it through **cut**, with
`valueTruncated: true` (only a JSON field errors); there is ⛔ no `FST_FIELD_SIZE_LIMIT` code at all, so helpdesk's catch arm
for it never runs and helpdesk truncates silently today (recorded, AC16 (15)). ⇒ `request.parts()` with per-request limits
(`fieldSize` ≥ 32 KiB), an explicit allow-list of field names, duplicates refused, and **`part.valueTruncated` or
`part.fieldnameTruncated` on any field part → `400 memorial.field_too_long`** (⛔ never rely on a plugin error code;
⛔ never silently truncated) — AC7.

### Trap 12 — ⚠ The advisory lock makes a "race" SERIAL — ⛔ no race 409 exists to test
Under READ COMMITTED, a second Send waits on `pg_advisory_xact_lock`, then its re-read sees the first's committed row
and supersedes it: **both return 201**. The unique indexes (MA9) are a **backstop** that only an unlocked insert can
reach. ⇒ ⭐ read the chain head **only after** taking the lock; test the race as "both 201, the chain stays linear"; test
the 23505 → `409 memorial.try_again` backstop with a **direct unlocked insert** ([[feedback_story_validate_footguns]] #30(b)).

### Trap 13 — ⚠ The nominee's code is ⛔ not the only way to a `claim_handover` elevation
`requireMemberStepUp(deps, 'claim_handover')` checks only that an elevation for `(member, 'claim_handover')` exists
(`member-auth.repo.ts`). The **generic** member step-up (`POST /api/v1/member/auth/step-up/request`, then
`/step-up/verify`) accepts **any** `actionContext`, sends the code to the **session member's own** mobile, and inserts an
elevation for that context — and the 403 even names it (`http-errors.ts`: `{ action: actionContext }`). Under Ravi-mode the
session member is the deceased ⇒ whoever holds the deceased's phone can unlock Send — and today's claim intake and
bank-statement upload — with ⛔ no nominee. ⇒ MA19 closes it **in this story**: `stepUpRequest` refuses `claim_handover`.
⚠⛔ **Never touch `stepUpVerify` or the nominee routes** — the nominee's code is sent and verified through
`/api/v1/member/claims/handover-otp{,/verify}` (`claims.handlers.ts` `verifyHandoverOtp`), a separate path.

---

## ⚖️ Build decisions MA1–MA19 (the author's; ⭐ = recommended. **Answered:** MA1 (a) and MA18 (a) — BigDev 2026-10-23 *"I am fine with 11b-4a"*; MA19 (a) — BigDev 2026-10-24. **Ratified cores:** MA5 / MA6 / MA7 — `-391` Confirms 3 / 2 / 1. The rest are PROPOSED — BigDev answers them at Task 0.2)

Each passed the routing template's §0 gate: ⛔ none changes what the Trust discloses, owes, or bases legally. ⚠ Three
sat close to the line and were **also put to the Panel as confirms** — ⭐ **all three answered A, as built (`-391`)**:
MA5 (where the permission is kept), MA6 (the grounds), MA7 (who reviews). MA15 builds erasure the house way; **how long**
the words are kept was Q5's — ruled A (`-391`).

### MA1 — Scope: build the writing, sending and reviewing; ⛔ NOT the public render
⭐ **(a) Split.** This row builds authorship → submission → Trust review → outcome to the family. The **public
render** (matrix fields, `RULED_TIER1_PUBLIC_EXCEPTIONS` entries, the Astro slot, the photo pipeline, take-down)
moves to a **new row** `11b-4a-family-memorial-public-render`, gated on 11b.5's components (Q2 and Q3 — ruled by `-391`; it builds
the helpline operator's take-down, `-393` — MA18).
**Why:** the render needs Panel rulings this row does ⛔ not (narrative, portrait and kinship are Tier-1 by fact;
a public Tier-1 field is a ruling, never a code change — `matrix.ts`). The 11b.3 three-way split is the precedent.
⚠ Cost: an approved memorial appears nowhere until 11b.4a lands — hence the go-live fence (MA12).
Rejected — (b) one row, render blocked inside it: the story would sit half-done for an unknown time.

### MA2 — Kinship rows: ⛔ not collected in this row
⭐ **(a) Defer to 11b.4a/11b.5.** Kinship names living relatives (incl. children) for a purpose the Trust has ⛔
not yet ruled (`-391` ruled Q2 for the family's words and photo, ⛔ not for kinship rows). ⚠ Collecting names before the purpose exists is purpose-creep; the Trust should hold ⛔ no
names it does ⛔ not yet know what to do with. ⇒ Epic step (d) is **deferred, recorded** (Task 9), ⛔ not dropped.
⚠ This does ⛔ not keep names out of the Trust's hands: the family's free text will often name a spouse or children,
and it is stored. That storage is why MA15 makes the text erasable; `-391` Q5 A keeps it with the member's record.
Rejected — (b) collect now, hold privately: data with ⛔ no settled use, and its disclosure wording would itself be
a Q2 dependency.

### MA3 — Drafts live ONLY on the phone until the family sends
⭐ **(a) MMKV, key `memorial-draft:v1:<memberId>:<poolId>`.** `-162` cl.3 makes **sending** the act of authorisation. A
server-side draft would put the family's unsent words in the Trust's hands **before** they authorised it. ⇒ ⛔
nothing reaches the server until Send. Saved on **every** change (MMKV is synchronous — the helpdesk-draft precedent; a
debounce would open a loss window on process death) + a visible *"Saved on this phone"* line (UX-DR50); restore on return
with *resume / start again* (arch §4.13). The picked photo is **copied into the app's document directory**
(`expo-file-system`) and the draft holds that copy's path — picker URIs are transient (helpdesk-draft's own header).
**Named TTL: none — kept until the family sends, or chooses *start again*** — a recorded departure from arch §4.13's
*"Drafts have a named TTL"* (fursat: ⛔ no deadlines). **Kept on sign-out:** the key is deliberately ⛔ not in
`MEMBER_DRAFT_SCREEN_KEYS` (`draft-store.ts`) — days of writing must ⛔ not vanish when the phone signs out, and the
draft is reachable only inside this deceased member's own session (the key carries `<memberId>`). ⚠ The MMKV instance is
⛔ not encrypted: the draft is the family's own unsent words on their own phone (arch permits drafts in MMKV), recorded.
⚠ Cost: a draft does ⛔ not follow the family to another phone — said plainly on the screen. Rejected — (b) server
drafts: pre-authorisation processing, and a new table.

### MA4 — Formatting: paragraphs only in v1; emphasis deferred
⭐ **(a)** A blank line separates paragraphs; ⛔ no markup, ⛔ no `*`/`_` interpretation, ⛔ no HTML. Epic (b)'s
*"emphasis"* is **deferred, recorded** (Task 9, trigger: a Story 0.9 conversation or a family request) — on a
phone keyboard, emphasis means teaching markup syntax to a grieving family. Text renders as text everywhere
(React Native `<Text>`; later Astro `{}` interpolation, ⛔ never `set:html`). Rejected — (b) the T&C
remark/rehype chain: a markdown dialect the family never asked for.

### MA5 — The authorisation is recorded ON the submission row, ⛔ NOT as a `consent_type`
⭐ **(a)** Columns `authorisation_copy_version` + `authorisation_locale` + `handover_recipient` + `handover_nominee_ref` on
`memorial_submissions`, resolved against a domain registry `MEMORIAL_SUBMISSION_AUTHORISATION_VERSIONS`
(claim-contact-agreement pattern: versioned, ⛔ never edited — a change is a new version; each version carries
`hiReviewed` and a go-live marker in its id, e.g. `'2026-10-23.v1-pending-hi-review'`). The row **is** the act.
**Why ⛔ not `consent_records`:** ⛔ not indivisibility — 0124's `claim_contact_agreement` row is written in the same
transaction and linked by FK, so a consent row can be just as indivisible. The reason is that the permission covers
**one specific version of the family's words**: each Send authorises exactly that text and photo, so the record belongs
with that version, and a register row per version would be a second record of the same act. The two retired values may
⛔ never be reused (`-162` cl.2). ⚠ `-177`'s References gloss (*"⛔ no `consent_type` may be minted"*) sits on the
nominee-bank D5 ruling and is ⛔ not a general ban (0124 was minted after it) — ⛔ not a ground here either.
⚠ **Departure from PRD FR-97, recorded:** FR-97 asks for *"Granular consent records … photo. Revocable."* in the consent
registry. This permission is outside the registry; it is revocable **before review** by withdrawal (MA9); after
publication it is revocable **through the helpline** (`-391` Q3 B; the rider withdrawn — `-393`): the operator offers a
smaller fix first and takes it down if the **nominee** still wants it (M4, `-395`, MA18); the nominee is told so at Send (AC4, M2). ⇒ put to the Panel as Confirm 3 — ⭐ **ratified A (`-391`)**. ⚠ `-391` item 8's *"⇒ after publication it is ⛔ not withdrawable by the family (item 3)"* is, on its own words, derived from item 3's answer, and item 3's rider was withdrawn (`-393`); Task 1.1 records that **pointer** (item 8's ⇒ clause now reads against Q3 B as put) — ⛔ never a re-reading of item 8 and ⛔ not a supersession.
**Who authorised:** the elevation row does ⛔ not record who received the code, so Send resolves the nominee the handover
code is addressed to **at Send time** (the same branch `sendHandoverOtp` in `claims.service.ts` takes) and stores the
recipient kind (`'latest' | 'at_death'`) plus the nominee **version** it resolves — the at-death `refusal.versionId`, or
on the latest path the rank-1 head's `version_id` (PK of `member_nominee_versions`), read by a memorial-local query
(`DISTINCT ON (rank) … WHERE rank = 1 ORDER BY version_no DESC`, selecting `version_id`) — ⛔ never via
`getNomineeVersionHeads`, which returns only `{ rank, versionNo, kind }` and is ⛔ not edited (AC17).
⚠ ⛔ Never a `member_nominees` key: that table has ⛔ no id column (PK `(member_id, rank)`) and its rows are deleted and
re-inserted on every re-declaration. ⚠ What the record proves, stated for Q1: *"sent from the member's account within
5 minutes of that nominee's code being typed in there"* (the code itself is valid for 3 minutes — `stepUpOtpTtlMs`; the
elevation lasts 5 — `stepUpElevatedMs`) — and one elevation serves every `claim_handover` route. ⚠ That sentence is true
**only once MA19 lands** (Trap 13) — they ship in the same story.
⭐ **When ⛔ no nominee resolves at Send** — `sendHandoverOtp`'s no-op branches (`claims.service.ts`: refusal `kind: 'none'`,
⛔ no primary nominee, an undeliverable number), or ⛔ no rank-1 `member_nominee_versions` row (a pre-`0119` projection row
with ⛔ no backfill) — Send refuses with `409 memorial.nominee_unresolved` (the app routes to the helpline); it ⛔ never writes
a null `handover_recipient` / `handover_nominee_ref`.
⭐ v1 wording is written on the rulings — `-391` Q2 A (where it appears; children left out) and `-393` M2 (the family may
later ask the helpline to change it or take it down); any later change is a new version (v1 is ⛔ never edited).
Rejected — (b) a new `consent_type` linked by FK: two records of one act; (c) reuse `sahyog_vivran_publication`: forbidden;
(d) a separate `memorial_send` step-up context: `sendHandoverOtp` hard-codes `claim_handover` — a new OTP path for a
5-minute narrowing.

### MA6 — The reviewer's three acts, and ⛔ no fourth
⭐ `memorial_review_action` pgEnum = **`approved` · `approved_with_omissions` · `not_approved`**.
**What may be left out** (decision input, `.strict()`): `omissions: [{ field: 'body' | 'altText', start, end, reason }]`
— `[start, end)` **UTF-16 offsets into the verbatim field**, each with its own reason — and `photoLeftOut?: { reason }`
(leaves out the photo **and** its alt text). The pure validator (`@twt/contracts`, Trap 9) refuses: an empty span; a span out of range, overlapping or
**touching** another (merge them first), or unsorted; a boundary that is ⛔ not a **grapheme-cluster** boundary
(`Intl.Segmenter(…, { granularity: 'grapheme' })` — a Devanagari conjunct or a ZWJ sequence, ⛔ not only a surrogate
pair); a span holding ⛔ no visible character; a span crossing a paragraph separator (a blank line); and, under
`approved_with_omissions`, a decision that leaves ⛔ no visible character of the body (that is `not_approved`).
`approved_with_omissions` needs ≥ 1 omission or `photoLeftOut`, and ⛔ no `reasonCode`; `not_approved` needs a `reasonCode`
and ⛔ no omissions or `photoLeftOut`; `approved` takes ⛔ none of the three. Also refused: `photoLeftOut` on a submission with
⛔ no photo; an `altText` span together with `photoLeftOut` (the photo and its alt text go together); an `altText` span on a
submission with ⛔ no alt text. An `approved` / `not_approved` decision stores `omissions` as `'[]'` (⛔ never NULL).
`memorial_withdrawals.reason_code` uses the same `memorial_review_reason` type. The validator constructs `Intl.Segmenter` **lazily inside the function** (⛔ never at module scope — the
`packages/domain/src/kyc/name.ts` precedent, which falls back where `Segmenter` is absent; Hermes support is unverified) and mobile ⛔ never calls it
(`@twt/ui`'s presenter only renders decided spans).
**Why each part is left out — the epic's grounds only** (`### Story 11b.4`: *"harmful or policy-violating content
**only** (e.g., personal attacks on third parties, false accusations, illegal content)"*): `memorial_review_reason`
pgEnum = **`attacks_someone_named`** (a personal attack on a third party) · **`accuses_someone_of_wrongdoing`** (the
epic says *false* accusations; a reviewer cannot test truth, so any accusation of wrongdoing counts — a widening put to
the Panel in Confirm 2 — ratified A, `-391`) · **`against_the_law`** (illegal content) · **`identifies_a_child`** (names or
shows a child — `-391` Q2 A leaves children out) · ⚠ **⛔ no `family_asked` in this row**: a family's request goes to the helpline operator (`-393`), whose take-down and its
reason value are 11b.4a's (MA18). **One reason per part** (each omission, the photo) and one for `not_approved`; ⛔ no catch-all value (the epic says
*"only"*). ⇒ ⭐ the reasons were listed inside Q4 option A and in **Confirm 2** — ⭐ **both ratified A (`-391`)**: these
four, and ⛔ no others, are the grounds.
An optional **internal note** (Tier-1, ⛔ never shown to the family) is read back in the reviewer's **history view**
(AC9 — so it is ⛔ never a write-only field). The family sees **reason-code copy only** (tone-reviewable; ⛔ no reviewer free text
reaches a grieving family unreviewed); every outcome other than `approved` carries the helpline — that is the epic AC's
*"request specific changes via empathetic helpdesk conversation"* (⛔ no staff-initiated ticket exists; Task 9 records
it). ⭐ **⛔ There is no "edit" act, ⛔ no field in the review input that carries the family's text, and the input schema
is `.strict()`** — the invariant is enforced by **absence**, ⛔ not by policy.
One decision per submission (unique index); a wrong decision is cured by the family's next version or, after an
approval, by the Trust withdrawing it (MA16) — ⛔ never by overwriting. Rejected — a separate `return_for_changes`: with
Q4 option A every outcome already allows a new version; a `please_talk_to_us` catch-all: outside the epic's "only".

### MA7 — Who reviews: a new key `memorial.review`, held by `trustee_panel` (+ `super_admin`, which derives every key)
⭐ Epic: *"moderation by trustees"*; PRD FR-77: *"reviewed by trust before publish"*. Catalog `52 → 53` with a
header-log line (`permissions.test.ts` pins 52 / 68 → 53 / 69 keys). `trustee_panel` (*"the Trustee Panel constituted
by Niyamavali §8.7"*, `roles.ts`) has `scopeCeiling: 'pariwar'`, so the key is live for it (verified at the pin).
⚠ This makes **the Panel itself** the standing reviewer of every memorial — the routing note said so and put it as
Confirm 1 (the `-178` D8(ii) precedent: who holds an authority was the Panel's to say) — ⭐ **ratified A (`-391`)**. ⚠ The
launch-gate row (MA12) also checks that ≥ 1 person holds `trustee_panel` in the Pariwar — otherwise the queue is
unreachable. ⚠ Task 2 must prove the key is **live** for its holder on the `pariwar` dimension (a pariwar-dimension
key is inert for district/state-ceiling roles; `roles.ts` already records one inert grant, `member.moderate` on
`verifier`) — [[feedback_story_validate_footguns]] #18.
Rejected — `pariwar_admin` as **Trustee-Lite** (the house reading of "trustees" elsewhere — `roles.ts`: *"trustees"
resolves to pariwar_admin here*; the cycle-freeze / R9 vote): ⭐ for a family's words about a death the story chooses
the Panel role, and **Confirm 1** put exactly this choice to the Panel (answered A — `-391`). ⚠ `state_trustee` also carries the word but
has a `state` ceiling and cannot hold a Pariwar-level key; `trustee_panel` is seeded **PROVISIONAL** (`roles.ts`, OQ-3).

### MA8 — The photo: one, optional, private, ⛔ never served publicly in this row
⭐ New port `MemorialPhotoStorage` in `packages/contracts/src/memorial/photo-storage.ts` (helpdesk-attachment
precedent — each purpose its own port) + adapters `packages/platform-adapters/src/memorial-photo-storage/
{gcs,in-memory,local-fs}.ts` + a private bucket. JPEG/PNG, ≤ 10 MiB (reuse the claim-document constants **by
value**, ⛔ not by import — the purposes differ). **Alt text required when a photo is present** (UX; family-authored,
Tier-1, verbatim). Bucket from an env var `MEMORIAL_PHOTO_BUCKET`, else local-fs — the helpdesk env-only precedent
(⛔ no Terraform bucket — ⛔ no app bucket is in `infra/gcp` today). ⭐ **Metadata is stripped AT INGEST, in this row** —
⛔ not deferred: the reviewer's signed URL would otherwise hand staff the GPS of the family's home. A pure byte-level
stripper `apps/api/src/modules/memorial/photo-metadata.ts` (JPEG APP1–APP15 + COM segments; PNG `eXIf` / `tEXt` / `iTXt` /
`zTXt` / `tIME` chunks), ⛔ no new image dependency, runs before `put`. It (i) checks the **magic bytes** (JPEG `FF D8 FF`,
the 8-byte PNG signature) — the part's `mimetype` is chosen by the client — and refuses anything else with `400
memorial.photo_type`; (ii) **drops everything after the primary image's EOI** — the `FF D9` reached by **walking the segments
past the scan data**, ⛔ never a raw byte search (an EXIF APP1 thumbnail carries its own `FF D8 … FF D9`, so a search would cut
most phone photos) — iPhone MPF JPEGs append secondary images, each with its own APP1/GPS; (iii) refuses a truncated or malformed file with `400 memorial.photo_unreadable` (⛔ never a 500).
Unit tests (Task 5.1a) plant a GPS EXIF block, an MPF trailer with its own GPS, and each PNG chunk, and prove them gone. ⭐ **AMENDED — 2026-10-24, code review T9 + V1 (BigDev decided (A), "1"):** "APP1–APP15" is no longer the whole JPEG list. Colour data is KEPT so photos keep their colours (a Display-P3 iPhone photo was washed out): JPEG APP2 segments whose payload starts `ICC_PROFILE\0` and APP14 starting `Adobe`; PNG `iCCP`, `gAMA`, `cHRM`, `cICP` (`sRGB` already). Everything else listed here is still stripped. **Residual, recorded:** a kept profile is copied AS RECEIVED — only its identifier is checked, so it can carry a creation date and free-text description tags (device maker / model names); an ordinary phone profile is the generic one, and a crafted profile carries only what the family itself put into its own photo. The earlier sentence is kept as written above. ⚠ Orientation is an EXIF tag: the
phone picker re-encodes at `quality: 0.8` (helpdesk precedent), which is expected to bake rotation in — ⚠ UNVERIFIED
until a
**device check** (rotated portrait, and an iPhone HEIC original arriving as JPEG) is recorded at Task 6.6.
**The family sees their own photo again:** the member GET returns a 5-minute signed URL for the latest submission's
photo (their own data; audited), and *Write again* may keep it — Send accepts `keepPreviousPhoto` (the server reuses the
previous submission's object; ⛔ no re-upload). ⚠ The reused key is read from the **chain head under the lock** (⛔ never from
the client); a head with ⛔ no photo → `400 memorial.no_previous_photo`. ⚠⛔ **Failure cleanup deletes only an object `put` by
THIS request** — ⛔ never a reused one, which still belongs to the earlier submission. Reviewer views through a 5-minute signed URL (audited). ⚠ **The public
image pipeline belongs to 11b.4a** — ⛔ nothing here serves the bytes publicly. Upload happens **with Send** (MA3), ⛔
never before.

### MA9 — Versions, replacement, withdrawal
⭐ `memorial_submissions` is **append-only** (save MA15's erasure grant): a new Send creates a new row with
`supersedes_submission_id` → the previous latest (whatever its state — pending, decided or withdrawn);
**`UNIQUE (supersedes_submission_id)`** + a partial unique index on `(pool_id) WHERE supersedes_submission_id IS NULL`
+ a composite FK `(pool_id, supersedes_submission_id) → (pool_id, submission_id)` keep the chain linear and inside one
pool. ⭐ **Every write (send / family withdraw / decide / Trust withdraw) takes `pg_advisory_xact_lock(hashtext('memorial:'
|| pool_id))`** (the 7.3 precedent, `packages/domain/src/pool/spawn.ts`) inside the scope tx **first**, and only then
reads the chain head and re-checks the state — unique indexes alone would let "decided AND superseded" or "decided AND
withdrawn" both commit across tables. ⇒ concurrent Sends **serialize** (Trap 12): both 201, the second supersedes the
first; the unique indexes are a backstop (23505 → one neutral `409 memorial.try_again`), reachable only by an unlocked
insert. ⛔ No `FOR UPDATE`: the first Send has ⛔ no chain-head row to lock and the invariant spans three tables — only
the pool-keyed advisory lock covers both (MA15's column grants would technically permit row locks on all three tables;
they are ⛔ not used).
⚠ **Keyed on `pool_id`** because the Sahyog Vivran page is per drive and v1 is one death → one claim → one pool (the
handler logs `> 1`); if that ever changes, the key question re-opens with it. A pending submission may be
**withdrawn by the family** **only while it is with the Trust**; an approval may be **withdrawn by the Trust** (MA16).
Both are rows in `memorial_withdrawals` (unique per submission) with `withdrawn_by` (`memorial_withdrawal_actor` pgEnum:
`family` · `trust`); a Trust row carries one of MA6's four reasons. ⛔ Nothing is published in this row, so post-publication take-down is **11b.4a's**, under `-391` Q3 (⛔ no take-down in the app; the **nominee** asks the helpline (`-395`) and the operator takes it down after offering a smaller fix — `-393` M4, MA18). Every member
write re-checks that the submission's pool **is the session's resolved drive** — RLS separates Pariwars, ⛔ not
families. The reviewer may ⛔ not decide a superseded or withdrawn submission (Trap 8).

### MA10 — Status is DERIVED, ⛔ never stored
⭐ Pure `deriveMemorialStatus(latest: { submission, decision?, withdrawal? } | null)` (`null` ⇒ `none`) → `none` · `with_the_trust` · `approved` ·
`approved_with_omissions` · `not_approved` · `withdrawn` (by the family) · `approval_withdrawn` (by the Trust, MA16).
⛔ No mutable status column (the 10.20 posture). ⚠ ⛔ Never name a wire key `status` — `SAHYOG_VIVRAN_PROHIBITED_KEYS`
bans it on the public surface and 11b.4a will consume this shape; use `memorialState`.

### MA11 — ⛔ No events; audit lines only
⭐ The append-only tables **are** the record; ⛔ no consumer of a `memorial.*` event exists
([[feedback_no_premature_package]]). Audit actions:
`memorial.submission.create` · `memorial.submission.withdraw` · `memorial.member.read` (the family's own GET —
one line per read, `fields_decrypted: n`) · `memorial.review.read` (one line per reviewer read, `fields_decrypted: n` —
the `admin_claim.contact_details_read` shape) · `memorial.photo.url` (each signed URL issued) ·
`memorial.review.decide` · `memorial.review.withdraw_approval`. ⚠ Two sinks: the **write** lines go through
`withCompensatingAudit` (the hash-chain sink); only the **read** lines (`memorial.member.read`, `memorial.review.read`,
`memorial.photo.url`) join the `AuthAuditEventType` union — and the review **list** writes one `memorial.review.read`
line per page for its name decrypts. ⛔ No PII in audit (hash only).
⚠ **Cost, stated:** every `encryptTier1` / `decryptTier1` also writes a hook line under the deployment-wide audit lock
(⛔ no DEK cache). A family read = body + alt text + the deceased's name ≈ 3 hook lines; a reviewer read = 2 + the note;
a list row = 1 name decrypt; a Send = 2–3 encrypts. ⇒ the **home screen** decides the entry from a **non-decrypting**
probe (AC1), ⛔ never from the full read; encrypt **before** the locked transaction ([[feedback_story_validate_footguns]]
#56(b) — ⛔ no KMS call while holding the pool lock). Rejected — events: an unconsumed registry entry and a
financial-truth-gate hazard (Trap 5).

### MA12 — The go-live fence: a launch-gate row **plus** a server switch, ⛔ not a feature flag
⭐ **(a)** Add a row to `docs/launch-gate-inventory/inventory-roster.md`: **Row 41** in the Row 39 precedent's **full**
shape — a `## Row 41 — Story 11b.4: … (decision-authored, -<this story's author-commit id>)` heading, an `> **Appended …
under [Decision …]**` quote (noting the highest row was 40, 5.11's), the `### Row 41 — \`slug\`` block (gate_name, owner,
closure_criteria, current_status, …) and `architecture_source_line: N/A — decision-authored` (5.11's Row 40 copies it):
*"Family memorial authorship ⛔ not enabled in production until AC4's wording version — written on `-391`/`-393`/`-395`,
carrying M2 (addressed to the nominee) and M3′ — is in force (its `hiReviewed` true), 11b.4a has landed (with the
operator take-down and the no-trace rule — `-393`, MA18), the AC14 tone review is recorded, the Story 0.9 risk (AC16 (8)) is
disposed — a conversation held, or BigDev records launching without it — `-395` item 3 (nominee only — it answers
`-393`'s Not-covered *"who may ask"*) has been shown to the Panel, or BigDev records launching without it — a production
producer of `pool.closed` exists (MA14), and ≥ 1 person holds `trustee_panel` in the Pariwar."* (The Panel items — Q1, Q2, Q4, Q5 and the three confirms —
were ruled by `-391` before the row was written; ⛔ none is a criterion.)
The row's closure is enacted by turning MA17's switch on ([[project_not_in_production_merge_is_not_golive]] — a go-live
fence does ⛔ not block a merge). Rejected — (b) a `feature_flag_versions` flag: needs a `governance_boundary.yaml`
`allow` entry with an ADR ([[feedback_story_validate_footguns]] #50); (c) a document row alone: once deployed, every
family with a closed drive would see the entry.

### MA13 — May a family send again after `approved`?
⭐ **(a) No, in this row** — `canSend` = `memorialState ∈ {none, with_the_trust, approved_with_omissions,
not_approved, withdrawn, approval_withdrawn}`, enforced **on the server** under the lock (AC7: `409
memorial.already_reviewed`), ⛔ not only in the app. Changing a memorial the Trust has approved belongs with what is
published (11b.4a, under `-391` Q3); the family is pointed to the helpline, and a mistaken approval is cured by MA16.
**Why `approved_with_omissions` differs:** there the Trust itself left out part of what the family authorised, and Q4
option A owes them a new version; after a clean `approved` nothing of theirs was cut. The render question both raise —
which version the page shows while a newer one is with the Trust — is recorded in 11b.4a's trigger (AC16 (1)): the
latest **approved** version shows until a newer one is approved. Rejected — (b) allow after `approved` too: a family
could replace a clean approval at will, before 11b.4a has said what the page does meanwhile.

### MA14 — The writing window: ⭐ after the collection closes; the intro uses the Pariwar's name form
⭐ **(a)** `MEMORIAL_DRIVE_POOL_STATES = ['closed', 'settled']`, declared in `packages/domain/src/memorial/resolve.ts`
with its own doc-comment (why `spawned` and `live` are excluded) — ⛔ never imported (`-196` Consequence 2). The UX
places authorship post-close three times (`ux-design-specification.md`: *"CloseCycle --> MemorialAuthor"*, *"link
(post-close)"*, *"post-close authorship"*): during a live collection the family is asked for nothing else. Rejected —
(b) `live` too: earlier, but it asks a grieving family to write while the Trust is still collecting, against the UX's
grief pacing.
⚠ **INERT IN PRODUCTION TODAY — and ⛔ not because of this choice alone.** The only production writer of
`pools.current_state` is `projectPoolState`, whose only non-test caller is `spawn.ts` (`pool.spawned`); ⛔ nothing in
`apps/*/src` or `packages/*/src` appends `pool.opened_for_contributions`, `pool.closed` or `pool.settled` (the Epic 7
window scheduler is unbuilt; `schema/pools.ts`: settled rows are *"FIXTURES"*). ⇒ every production pool stays `spawned`,
so this surface — like every drive surface — opens nowhere until a close producer ships. Row 41 carries it (MA12);
AC16 (13) records it. ⚠ The UX's "post-close" is the **cycle** close (`CloseCycle`); keying the window on the pool's
own `closed` is this row's reading — asked at Questions (8).
⭐ **The intro's name** uses the Pariwar's presentation mode, as every other member surface does (11b.21's chain — the
What-EXISTS row); a KMS outage, a null name, or `memberDomain.ANONYMIZED_SENTINEL` (the chain checks it —
`member-pool/handlers.ts`) → the **no-name** key with a 200 (fail-soft), ⛔ never a 500. ⚠ **A deliberate difference:** the
11b.21 chain re-throws `KmsOutageError`; this handler catches it for the intro name only (the family's own words fail soft
separately — AC1).

### MA15 — The family's words can be ERASED (Trap 10)
⭐ **(a)** Column-level `GRANT UPDATE (body_ciphertext, alt_text_ciphertext)` on `memorial_submissions` and
`(internal_note_ciphertext)` on `memorial_review_decisions` **and** on `memorial_withdrawals` — the four Tier-1 columns —
each with an RLS `FOR UPDATE` policy, used **only** by
`anonymizeMember`, which scrubs them to the house sentinel and deletes the photo objects best-effort (logged, anonymous
convention); `rtbf-anonymize.test.ts`'s count rises in the same commit. Every other column stays immutable, and ⛔ no
CHECK constrains a scrubbed column (a CHECK re-runs on UPDATE — [[feedback_story_validate_footguns]] #37(a)).
⚠ **This erases only when the member's record is erased — and a deceased member's record is ⛔ not erased today:**
`resolveRtbfLegality` (`packages/domain/src/member/rtbf-legality.ts`) admits erasure only for a `withdrawn` membership or
a `terminated` overlay, and death is neither. ⇒ in practice the words are kept **indefinitely**. **How long** they are
kept was **Q5** — ⭐ **ruled A (`-391`)**: kept with the member's record, erased with it; a family's own request to erase
their words goes through the helpline — a follow-up, ⛔ not built here (AC16 (7)). Rejected —
(b) append-only with the risk recorded: the exact defect 0092 had to fix after shipping.

### MA16 — The Trust may withdraw its own approval
⭐ **(a)** `POST …/memorial-reviews/:submissionId/withdraw-approval` (`memorial.review`), allowed for **the chain's
latest approved submission** — the newest one whose decision is `approved` or `approved_with_omissions` and that carries
⛔ no withdrawal — **whatever newer versions follow it** (the one the page would show — MA13), with a required reason code (MA6's four reasons — ⛔ never a
family's request: that is the helpline operator's, on the nominee's request — `-393`/`-395`, MA18); it writes a
`memorial_withdrawals` row with `withdrawn_by = 'trust'` under the lock. The family sees `approval_withdrawn` with the
reason copy and the helpline, and may send a new version (MA13); when a newer version is already with the Trust, the
member GET carries `earlierApprovalWithdrawn: { reasonCode } | null` beside the newer version's state, so the family is
told. **The rule:** non-null **iff** a submission older than the latest carries a `trust` withdrawal **and** ⛔ no submission
newer than that withdrawn one has been approved; it carries the newest such withdrawal's reason; it is `null` when the latest
itself is `approval_withdrawn` (its own state already says so). **Why:** without it, a mistaken approval (a child's
name the reviewer missed) has ⛔ no cure — one decision per submission, ⛔ no overwrite, ⛔ no new version after approval.
⚠ It is ⛔ not the route for a family's request (`-393`: the helpline operator handles it, smaller fix first — MA18). A family who calls
about a child's name may still prompt the reviewer's own withdrawal on `identifies_a_child` — the Trust acting on Confirm 2's
grounds (`-391` Not covered: the Trust's own removal is unaffected).
Rejected — (b) a superseding second decision: breaks "one decision per submission" and the reconstruction story.

### MA17 — A server switch keeps the surface dark until Row 41 closes
⭐ **(a)** `MEMORIAL_AUTHORSHIP_ENABLED` in `apps/api/src/config.ts` (`env['MEMORIAL_AUTHORSHIP_ENABLED'] === '1'`, the
`TURNSTILE_FAIL_OPEN` shape — **off by default**; on in `apps/api/tests/integration/_setup.ts`). Off ⇒ `GET
/member/memorial/entry` answers `{ memorialEntry: false }`, the member GET answers `{ memorial: null }`, and member writes
refuse with one neutral `404`. ⚠ The check is a **preHandler registered BEFORE `requireMemberStepUp`** on every member
memorial route — else a dark surface answers `403 auth.step_up_required` and the app texts the nominee a code first. The
review routes stay on (they show nothing when nothing can be sent). Rejected — a `feature_flag_versions` flag (MA12 (b)).

### MA18 — The helpline operator's take-down (`-393`, `-395`, `-392` items 4–5): ⭐ built with the public render, row `11b-4a`
⭐ **(a) In 11b.4a, ⛔ not here.** The **nominee** asks the helpline to take a published memorial down (`-391` Q3 B; **only the
nominee's request counts** — `-395` item 3: the nominee whose code sent it, recorded on the submission as MA5's
`handover_nominee_ref`). ⭐ **How the operator knows the caller is the nominee is ⛔ NOT ruled** (`-395` Not covered) — MA18
**proposes**, as the author's choice and ⛔ not `-395`'s, a call back to that nominee version's declared number; anyone else is
listened to (M4) and asked to have the nominee call. ⚠ **Open, ⛔ not settled by the call-back** (`-395` Not covered): whose
request counts when that nominee has **died, cannot be reached, or has since been replaced**. The **helpline
operator** first offers a smaller fix — leave out a sentence or a name, remove only the photo, or a new version (`-393` M4) —
and, if the nominee still wants it, takes it down: ⛔ no merit test (`-392` items 2–3 superseded), within 7 days, with an email
to the approver (`-392` items 4–5, KEPT — `-395`); and the page then shows ⛔ nothing — ⛔ no marker,
⛔ no gap, ⛔ no date (`-393` M1). What it acts on is the public page, and ⛔ nothing is public until 11b.4a. Its parts, recorded
for 11b.4a's trigger (AC16 (1)): a key (e.g. `memorial.takedown`) for `helpline_operator` (`roles.ts`; pariwar dimension —
prove it live, as Task 2 does for MA7); a `memorial_withdrawals` row with a new `memorial_withdrawal_actor` value
(`helpline`), a reason value (`family_asked`, minted then) and an optional Tier-1 note; for a smaller fix, the operator
withdraws the approval and the family sends a new version without the part (MA13) — ⚠ the memorial is down while the new
version is reviewed, which the operator says; the 7-day clock started by the nominee's request (⚠ its exact start is open
— `-392` Not covered), with a watch for a request still open after it; and the email to the approver — the decision row's `actor_id` (recorded here — Task 2). ⚠ That email needs a **third identity-data read** (the
approver's address): ADR-0040 admits exactly two, fenced by `apps/jobs/tests/staff-email-identity-read-fence.test.ts` ⇒ a new
ADR or an ADR-0040 amendment **first**. ⇒ **In this row:** MA16 takes ⛔ no family request; `family_asked` is ⛔ not minted;
`memorial_withdrawal_actor` stays `family · trust`.
⚠ Cost: before 11b.4a lands, a family who wants an **approved** memorial taken back for a reason outside the four grounds (an
outsider named) has ⛔ no path — but ⛔ nothing is shown meanwhile, and Row 41 holds go-live until 11b.4a. Rejected — (b) build
the operator path here: a new key, a new actor value, an ADR for the email and a 7-day watch, all for a memorial ⛔ nobody can
yet see.

### MA19 — Only the nominee's code unlocks a `claim_handover` step (Trap 13) — ⭐ answered (a), BigDev 2026-10-24
⭐ **(a) Close the generic route in this story.** In `apps/api/src/modules/auth/member/member-auth.handlers.ts`
`stepUpRequest`, **before** any OTP is minted or sent, refuse an `actionContext` in a declared set
`DEDICATED_STEP_UP_CONTEXTS = ['claim_handover']` (declared in the auth module with a doc-comment: *"contexts whose code goes
to someone other than the session member — minted ONLY by their own sender"*; a test pins it equal to
`CLAIM_HANDOVER_ACTION_CONTEXT` — the set is exactly `['claim_handover']` today) with `400 auth.step_up_context_not_allowed` (the standard error shape; ⛔ no OTP row, ⛔ no
SMS; one `member_step_up.failure` audit line — the existing `AuthAuditEventType` member — with `context: {
action_context, reason: 'context_not_allowed' }`, the `otp_delivery_failed` shape beside it). ⛔ No change to `stepUpVerify`, the contract,
`sendHandoverOtp`, `verifyHandoverOtp`, `requireMemberStepUp` or any client. **Why here:** Q1 A (`-391`) is the reason this
story exists, and MA5's proof sentence is false without it; every other `claim_handover` route carries the same hole today
and is closed by the same line — claim intake (`(claim)/handover-otp.tsx`), the claim documents and nominee-bank routes
(`/api/v1/member/claims/:claimCaseId/documents`, `…/:claimCaseId/nominee-bank` — `claims.routes.ts`) and the reconciliation
bank-statement upload (`reconciliation/routes.ts`) ⇒ a note to the claims / reconciliation owner in the Completion Notes (⛔ not
a deferred item: it is fixed). Grepped at `1268d47e`: ⛔ no client (`useStepUpGate` contexts, `@twt/api-client`) and ⛔ no test
asks the member generic route for `claim_handover` — tests reach that elevation through the nominee route
(`nominee-bank.spec.ts` `establishHandoverTrust`) or raw SQL (`death-certificate.spec.ts`); admin tests use the separate staff
route `/api/v1/auth/step-up/request`. ⛔ No other context is sent to someone other than the session member.
**BigDev's answer, verbatim (2026-10-24):** *"(a) Fix in 11b.4 (Recommended)"* — the option chosen when asked: *"Refuse
`claim_handover` (and any context owned by a dedicated sender) in the generic `stepUpRequest`; add auth files to AC17's
allow-list, a test, a note to the claims owner. Closes the hole for claims too."*
Rejected — (b) record as a risk: Q1 A stays unenforced until someone else fixes it; (c) a separate auth story gating Row 41:
the fix is one guard, smaller than the story that would carry it.

---

## Acceptance Criteria

### AC0 — Governance before code
**Given** MA1–MA19 as answered at Task 0.2
**Then** ONE author-commit decision entry (the next free id — `-396` or later) records them, the three pgEnum mints
(`memorial_review_action`, `memorial_review_reason`, `memorial_withdrawal_actor`), the permission key `memorial.review`
(catalog 52 → 53), MA19's closing of the generic step-up route for `claim_handover`, the `-391` item 8 pointer (MA5), and
states the §0 line ("changes no disclosure, no obligation, no basis; supersedes no clause; Q1–Q5 and the three confirms
were ruled by `-391` (Q3 as amended by `-393`, and by the author-commit `-395`)") — committed **alone**, before any
`packages/` or `apps/` change; **and** a
records commit adds the `epics.md` **SECTIONED** header block on `### Story 11b.4`, annotates the `-162` open follow-up
*"carries clause 3 into its own ACs and Tasks"* as **HOMED at 11b.4 AC4/Task 4, ⛔ not closed** — an
`ANNOTATED <date> by [-<that id>]` line beneath the original wording, which stays verbatim (the `-219` follow-up (2) / `-224`
precedent; a Trustee-ratified entry is ⛔ never edited in place) — mints the row `11b-4a-family-memorial-public-render:
backlog` if MA1(a) is chosen, and moves the row `ready-for-dev → in-progress` via a safe ledger prepend.

### AC1 — The family reaches the surface only when there is a drive to write about
**Given** a member session (the Ravi-mode session-as-deceased; GETs are ⛔ not step-up-gated, mirroring
`apps/api/src/modules/nominee-console/routes.ts`) and MA17's switch on
**When** `GET /api/v1/member/memorial/entry` runs
**Then** it answers `{ memorialEntry: boolean }` from `resolveMemorialDrive` alone — ⛔ no decrypt, ⛔ no audit line —
and the home entry in `apps/mobile/app/(tabs)/index.tsx` (next to `<ClaimProxyFlowEntry />`, the screen a Ravi-mode
session sees) links to `/(memorial)` **only** when it is `true` — ⛔ no badge, ⛔ no count, ⛔ no reminder. ⚠
`(tabs)/shradhanjali.tsx` is a **live tab on P0-5 sample data** and is ⛔ not the entry
**When** `GET /api/v1/member/memorial` runs
**Then** `resolveMemorialDrive` returns the pool whose originating claim's `deceased_member_id` is the session member and
whose `current_state ∈ MEMORIAL_DRIVE_POOL_STATES` (MA14; deterministic tie-break; the handler logs `> 1`); `null` ⇒
`200 { memorial: null }` and the screen renders **nothing** (⛔ no placeholder)
⭐ **SUPERSEDED IN PART — 2026-10-24, code review R20 (BigDev: apply every patch):** "renders nothing" is replaced for a screen
reached by a deep link or a restore with no view (a fetch error, `{ memorial: null }`, or still loading): it shows the memorial
header, one calm line, a retry and the helpline (`MemorialViewMissing`) — ⛔ never a blank screen with no way out. The HOME ENTRY
is unchanged: it is still gated by the probe, so a family without a drive is never shown a link. The earlier sentence is kept as
written above.
**And** the response carries `deceasedName: string | null` for the intro (MA14; `null` ⇒ the no-name key);
`memorialState` (MA10); the latest submission's verbatim `body` + `altText`; its `omissions` and `photoLeftOut` with
**each part's reason**, and the `not_approved` / Trust-withdrawal reason (⛔ never the internal note); a 5-minute signed
URL for its photo (MA8); `earlierApprovalWithdrawn` (MA16); `canSend` (MA13) and `canWithdraw` (= `with_the_trust`);
one `memorial.member.read` line (MA11)
**And** it carries `authorisation: { copyVersion, text: { hi, en } }` — **both** locales, resolved by the server (the
app language can change between the GET and Send — Story 6.35); the phone ⛔ never holds the registry (`@twt/domain`
is ⛔ not importable by Metro — Trap 9), and Send records the locale actually shown
**And** a decrypt failure of the body or alt text answers a fail-soft `200` — `{ memorial: { …, body: null, altText: null,
unavailable: 'memorial.unavailable_now' } }`, `canSend` and `canWithdraw` both `false` (⛔ never a 500 — responses are PARSED,
`plugins/zod-openapi` `serializerCompiler`); ⛔ no `.max()` on any OUTPUT schema field ([[feedback_story_validate_footguns]] #29)
**And** ⚠⛔ **on the phone, every memorial query (`entry`, the member GET) sets `gcTime: 0`** — `components/Provider.tsx` reads
it as *"never persist this"*; without it the family's words, the deceased's name and a signed photo URL are written to
unencrypted MMKV for 7 days and survive sign-out and MA15's erasure — plus `staleTime: 0`, a refetch on mount of the outcome
screen, and invalidation after Send and Withdraw (the `useMemberDriveDetailQuery.ts` precedent; the default 1 h `staleTime`
would show `with_the_trust` long after the Trust decided).

### AC2 — A grief-paced, one-decision-per-screen flow
**Given** the `(memorial)` route group, registered in `apps/mobile/app/_layout.tsx`'s Stack with `headerShown: false`
(as `(nominee)` and `(helpdesk)` are — the screens own the sticky header)
**Then** the screens are: **intro** (*"Would you like to share a few words about {name}?"* — with *"Not now"* as
an equal choice and a no-name variant when the name is null — MA14) → **write** → **photo (optional)** →
**preview and send** (ONE screen: M3′ at its top, the permission text immediately above Send — AC4) → **sent / outcome**
**And** ⛔ no progress bar, ⛔ no step counter, ⛔ no percentage, ⛔ no "incomplete" language, ⛔ no deadline anywhere
(the namespace joins `scope.copy_globs` and the mobile files join `scope.code_globs`, so every tone rule,
`fursat-pressure` included, scans them — AC14)
**And** every screen has an always-visible *"Save and come back"* in the sticky header (UX-DR50/56, `epics.md`); 44pt
targets; the narrative and alt-text inputs (tamagui `Input`, as every production input) set `autoCorrect={false}` **and** an
explicit `spellCheck` (Trap 7), and `accessibilityLanguage` on iOS (React Native has ⛔ no `lang` prop and Android ⛔ no
equivalent — recorded N/A); ⛔ **no `maxLength`** on either (it silently cuts a paste and counts UTF-16 units, ⛔ not code
points — the helpdesk body does this) — a gentle remaining-length line instead, and the server refuses (AC7); the
family may write in Hindi **or** English
**And** skipping is complete: a family that never writes sees ⛔ nothing further and the Sahyog Vivran page is ⛔
not changed.

### AC3 — The draft stays on the phone (MA3)
**Then** text, alt text and the **file name** of the photo's document-directory copy save to MMKV
`memorial-draft:v1:<memberId>:<poolId>` on every change — the copy made with `new File(asset.uri).copy(new File(Paths.document,
<name>))`, and the path rebuilt from `Paths.document` on restore (⛔ never an absolute URI: the iOS app-container path changes on
app updates, which would quietly turn every saved photo into "no photo"); the Send's Idempotency-Key (`newIdempotencyKey()`,
`lib/idempotency-key.ts`) is minted once per Send attempt and kept in the draft **with the latest submission id the GET showed
when Send was pressed**, until **any 2xx** (`201`, or the `200` replay), so a step-up retry or an app kill after the server
committed replays the first result instead of creating a second version. ⚠ The key is useful only within the claim's 300 s
TTL: past it a completed claim reads as in-flight (`keyed-store.ts` `getResult` filters `expires_at >= now`) and every retry
would answer `409 memorial.idempotency_in_progress`. ⇒ On resume with a kept key, **and** on that 409, the app refetches the
member GET first: a latest submission newer than the one recorded ⇒ the Send landed (clear the draft, show the outcome);
otherwise mint a new key and send. Reopening offers *resume / start again*; a missing photo file
degrades to "no photo" with a gentle line (⛔ never an error); the draft (and its photo copy) is cleared **only** after a
2xx from Send (or the refetch above shows it landed) or on the family's explicit *start again*; sign-out keeps it (the key is ⛔ not in
`MEMBER_DRAFT_SCREEN_KEYS`); the screen says the draft is kept on this phone.
⭐ **AMENDED — 2026-10-24, code review T3 (BigDev: apply every patch):** "otherwise mint a new key and send" assumed the 409 came
only from a claim past its TTL. A `409 idempotency_in_progress` can also mean the FIRST request is still running (a network drop
after the upload), and a fresh key then duplicates the version. So the kept key carries its mint time: on a 409 that has not
landed, a key YOUNGER than the 300 s TTL is KEPT and the family is told it is still being sent (`send.still_sending`); only an older
key is dropped. And before ANY kept key older than the TTL is reused (a Preview left open past the hourly vacuum), the app refetches
the member GET and runs the landed check first — as it does on resume. The earlier sentence is kept as written above.
⭐ **AMENDED AGAIN — 2026-10-24, fix-diff reviews V3 + W1:** "carries its mint time" is replaced by TWO times on the kept key. The time of the FIRST post under it decides whether it may be reused WITHOUT the landed check (older than the TTL since that first post ⇒ refetch + landed check first); the time of the LAST post decides whether a key that has not landed may be DROPPED — on a 409, and also on the pre-send check (a key that has not landed but was posted within the TTL is KEPT and reused, so a POST still running answers 409 instead of being duplicated under a new key). Both are stamped right before a POST (after the request body is built). A key the phone keeps still outlives the server's 300 s claim; closing that is server-side (R31 (a) / W14, deferred). The T3 note is kept as written above.
⭐ **SUPERSEDED IN PART — 2026-10-24, the row-held Send key (BigDev: "1" + "Key on the row"; migration `0182`):** the 300 s TTL, "on that 409", "otherwise mint a new key", and BOTH notes above (T3's mint time; V3 + W1's two times) no longer apply. The Send's Idempotency-Key is now stored ON the submission row (unique per pool), so a retry with the same key REPLAYS (`200`) at any age, a duplicate in flight waits on the pool lock and replays, and nothing is ever left pending. The phone keeps its key until ANY 2xx and drops it ONLY when the draft's content changes (R6) — ⛔ no clock, ⛔ no pre-send refetch, ⛔ no 409 branch (a `409` from an older server is answered with "try again", the key kept). What remains of the refetch is the intro's RESUME check: a kept key and a newer latest submission ⇒ the Send landed ⇒ clear the draft and show the outcome (resending would replay too, but only after a handover code). ⭐ *(Final review Z2: "a newer latest submission" is replaced by an EXACT signal — the member view carries the latest submission's `idempotencyKey`, and the Send landed ⇔ it equals the kept key; a key whose save failed is kept in memory for the screen (Z3).)* `send.still_sending` is removed. Every sentence above is kept as written.

### AC4 — ⭐ The permission is given AT SEND, in this surface (`-162` cl.3)
**Given** the preview-and-send screen (AC2)
**Then**, before Send is pressed, the screen shows, **immediately above the Send button and in the language the app is showing**, the
authorisation text the server returned in AC1 (from the current `MEMORIAL_SUBMISSION_AUTHORISATION_VERSIONS` entry) —
what the Trust will do with the words and photo; that the Trust reads it first, may leave out a sentence or the photo
but never changes the words; that the family is asked ⛔ not to name children, and any child's name the Trust finds is
left out (`-391` Q2 A — the reviewer has ⛔ no ages, so the copy promises what a reviewer can do); where it will appear
(the member's Sahyog Vivran page, which anyone with its link can read, as the Trust approved it — `-391` Q2 A); and ⭐
**that if they ever want it changed or taken down they can call the helpline, and that often a small change is enough**
(`-393` M2 — ⛔ never "cannot be taken down" (the rider is withdrawn); ⛔ no take-down button; until it is reviewed the family
may still withdraw it in the app — AC8) — ⭐ the M2 sentence is **addressed to the nominee** (the reader at Send) and says
plainly that a take-down is asked for **by the nominee** (`-395` Consequence 1 and item 3 — else a relative who reads it and
later calls is turned away, and the notice is no longer honest); final words at the AC14 review
**And** the **preview** screen shows, at its top (⛔ not stacked with the permission text above Send), `-393` M3′ — BigDev's
words: *"Once published public will see the memorial. If want to make any futher change, this is the right time."* — with
its final English and Hindi set at the AC14 review (the author's suggested polish: *"Once it is published, anyone may see this
memorial. If you would like to change anything, now is the best time."* — ⚠ ⛔ never a line implying a later change is
impossible, which would contradict M2); the key is `memorial.preview.before_publish` in the `memorial` namespace (⛔ not the
registry: it is ⛔ not part of the permission). ⚠ The Hindi must avoid the imperative *अभी कर…* (*"अभी करें"*, *"अभी कर लें"*):
`microcopy.yaml`'s `fursat-pressure` pattern `अभी\s*कर` fires on it — e.g. *"…बदलाव का सही समय यही है"*; ⛔ no `allow`
entry for it
**And** the client sends **only** `{ authorisationCopyVersion, authorisationLocale }` — the server resolves the
text and refuses a non-current version with one dignified `409 memorial.authorisation_outdated` (the app reloads the
text); ⚠ refusing a stale version is **new** behaviour (the member-terms echo is advisory only)
**And** the authorisation columns (incl. `handover_recipient` + `handover_nominee_ref` — MA5) are written **in the same
transaction** as the submission row (indivisible)
**And** each registry version carries `hiReviewed` and a go-live marker in its id (`'2026-10-23.v1-pending-hi-review'`); a test
proves every version has non-empty `hi` and `en` text; the registry file `packages/domain/src/memorial/authorisation-copy.ts`
joins `microcopy.yaml` `scope.code_globs` (AC14)
**And** ⛔ no checkbox, ⛔ no box on the claim screen, ⛔ no `consent_records` row, ⛔ no reuse of
`sahyog_vivran_publication` / `in_memoriam_listing`, ⛔ no question about the member's name or the nominee's data
(`-160` cl.3/cl.6, epic scope fence)
**And** the v1 wording's doc-comment cites **`-391` Q2 A, `-393` M2 and `-395` item 3** as its basis (MA5), and the AC14 tone review
checks, in both locales, that the helpline sentence (M2) and the preview line (M3′) are present and gentle — ⛔ no guilt
(⛔ no "your loved one deserves…"), ⛔ no count of readers, ⛔ no take-down button anywhere in the namespace.

### AC5 — The family's words are stored verbatim, are reconstructible, and are erasable (the load-bearing invariant)
**Then** `memorial_submissions.body_ciphertext` and `alt_text_ciphertext` (Tier-1, `piiColumn(1, MEMORIAL_FIELD_CLASS)`)
decrypt to the **exact** string received — the Trap 6 round-trip runs **through the HTTP multipart route**, ⛔ not only
the domain
**And** `memorial_review_decisions` stores omissions (field + offsets + reason) and `photo_left_out_reason` **separately** — the verbatim
body is ⛔ never rewritten, ⛔ never copied into a "published" column
**And** a pure `reconstructMemorial({ body, altText }, decision)` in `@twt/ui` yields `{ original, asApproved }` as
**segments** — per paragraph, `{ kind: 'text', text } | { kind: 'omitted', key }` (⛔ never a string, so the notation can
⛔ never be confused with a family-typed "[…]") — a future reviewer can always see what the family wrote and what the
Trust left out (AC9's history view)
**And** all three tables (`memorial_submissions`, `memorial_review_decisions`, `memorial_withdrawals`) grant SELECT +
INSERT, with **column-level UPDATE on the ciphertext columns only** (MA15) and ⛔ no DELETE; RLS by `pariwar_id`,
`ENABLE` + `FORCE`; `anonymizeMember` scrubs the ciphertexts and deletes the photos best-effort.

### AC6 — ⛔ No AI, ⛔ no rewriting, anywhere in the flow
**Then** the review input schema is `.strict()` with ⛔ no field that carries the family's text (a test posts `body`,
`text`, `narrative` → 400)
**And** ⛔ no module in this story imports an LLM/AI SDK — a test asserts the `apps/api`, `apps/admin`, `apps/mobile`,
`packages/domain`, `packages/ui`, `packages/contracts`, `packages/api-client`, `packages/platform-adapters` and
`packages/i18n` `package.json` dependency maps contain ⛔ no `@anthropic-ai/*`, `openai`, `@google/generative-ai`,
`@google/genai`, `langchain*`, `@ai-sdk/*`, `ai` (Vercel) — green on write today; planted-violation teeth recorded
**And** ⛔ no translation, ⛔ no summarisation, ⛔ no transliteration, ⛔ no grammar or tone transform exists on
any path (a v2 AI feature would be an explicit family opt-in — recorded in Dev Notes, ⛔ not built).

### AC7 — Send: validation that never punishes
**Given** `POST /api/v1/member/memorial/submissions` (multipart, read with `request.parts()` — Trap 11) behind
the MA17 preHandler, `requireMemberSession` + `requireMemberStepUp(deps, 'claim_handover')`, and a required
`Idempotency-Key` (the helpdesk create precedent — a retry **within the claim's TTL** (300 s) after a committed Send returns the
stored first result with `200` (the helpdesk replay status), ⛔ never a second version; missing → `400
memorial.idempotency_key_required`; one in flight → `409 memorial.idempotency_in_progress`)
**Then** the fields are an allow-list (`body`, `altText`, `authorisationCopyVersion`, `authorisationLocale`,
`keepPreviousPhoto`, one optional `photo` file — `keepPreviousPhoto` **with** a `photo` part is refused, `400
memorial.photo_conflict`; with it, alt text is still required); an unknown field (`400 memorial.field_not_allowed`), a duplicate field or a second file (`400
memorial.duplicate_field`), or a field part with `valueTruncated` / `fieldnameTruncated` (`400 memorial.field_too_long` —
Trap 11) is refused (⛔ never truncated); a non-blank body — after removing an **invisible-character class** declared by value in
`packages/contracts/src/memorial/` (a copy of `kyc/name-render.ts`'s module-private `INVISIBLE_CHARS`, cited — it
includes the `Lo` fillers U+115F/U+1160/U+3164 and U+2800 — **plus U+FFA0** (HALFWIDTH HANGUL FILLER, `Lo`), which the source
lacks), ≥ 1 letter, number, punctuation or symbol
(`[\p{L}\p{N}\p{P}\p{S}]`) remains (a U+3164-only and a U+FFA0-only body are blank — tests; ⚠ the source regexes carry `/gu`:
a copied global regex is stateful under `.test()` (`lastIndex`) — use `.replace`, or drop `g`) — of
≤ 6,000 Unicode code points counted on the **raw** string (MA-default; BigDev may change at Task 0.2) (`400
memorial.body_blank` / `memorial.body_too_long`); a photo ⇒ alt text non-blank by the same rule, ≤ 300 code points (`400
memorial.alt_text_required` / `memorial.alt_text_too_long`); JPEG/PNG by magic bytes (`400 memorial.photo_type`, MA8),
≤ 10 MiB (`400 memorial.photo_too_large`)
**And** every refusal is a Pattern-4 message (what happened · what to do · helpline), ⛔ never "Error/Invalid/
Failed", `caution` token, `aria`-linked, works at 360 px; a refusal ⛔ never clears the draft
**And** order: MA17 preHandler → session → step-up → **Idempotency claim** (the handler's first DB touch, before parsing;
replay ⇒ the stored first result, `200`; in flight ⇒ 409) → parse → resolve the drive → validate fields → resolve the
handover recipient + nominee version (MA5; none ⇒ `409 memorial.nominee_unresolved` — before any `put`, so ⛔ no orphaned
object) → strip the photo's metadata (MA8) and `put` it → encrypt (⛔ never inside the lock) → `withCompensatingAudit` (intent line first; then `openScopeTx`
committed in `finally` around one txn: advisory lock → read the chain head → the drive is still the session's →
`canSend` (else `409 memorial.already_reviewed`) → current version (else `409 memorial.authorisation_outdated`) →
with `keepPreviousPhoto`, the head's photo key (none ⇒ `400 memorial.no_previous_photo`, MA8) →
submission row + authorisation columns + supersede link; a compensating line on failure) → COMMIT → `recordResult` (the
claim released on failure) → `201 { memorialState: 'with_the_trust' }`; a photo `put` **by this request** is deleted
best-effort and logged (anonymous-log convention) on **any** failure after the `put` (encrypt, audit, txn) — ⛔ never a reused
`keepPreviousPhoto` object
**And** a second Send while one is with the Trust **supersedes** it (MA9); two concurrent Sends both return `201` and
the chain stays linear (Trap 12); the 23505 backstop → `409 memorial.try_again` is tested by an unlocked insert.
⭐ **SUPERSEDED IN PART — 2026-10-24, the row-held Send key (BigDev: "1" + "Key on the row"; migration `0182`):** "a retry within the claim's TTL (300 s) … returns the stored first result", "one in flight → `409 memorial.idempotency_in_progress`", the order's "Idempotency claim (the handler's first DB touch …)" and "→ COMMIT → `recordResult` (the claim released on failure)" are replaced. The key is validated (1–128 of `[A-Za-z0-9_-]`, else `400 memorial.idempotency_key_required`) and looked up by `(pool_id, idempotency_key)` three times: right after the parse (no upload, no encryption, no audit line); under the pool lock, BEFORE the audit intent (a duplicate that queued on the lock — writes no audit line, deletes the photo it uploaded); and after a 23505 inside a SAVEPOINT (an unlocked writer — replay if the row with this key exists, else `409 memorial.try_again`). A replay answers `200 { submissionId, memorialState: 'with_the_trust' }` — the first result, whatever has happened to that version since. The scope transaction, lock, drive re-check and key lookup now come BEFORE `withCompensatingAudit`; the insert and COMMIT stay inside `mutate`. `409 memorial.idempotency_in_progress` is RETIRED. ⚠ Two residues: a lost COMMIT acknowledgement still deletes the photo of a row that may exist (deferred T14 / R31 (b) — a read-back by key is now cheap) — ⭐ *CLOSED by the final review's Z1: when the COMMIT throws, the handler reads back by `(pariwar_id, pool_id, idempotency_key)` under the pool lock (5 s lock timeout); its own row ⇒ committed (photo kept, `201`, no compensating line); none ⇒ the rollback path; another row with this key ⇒ a replay; the read-back failed ⇒ `500`, the photo KEPT and ⛔ no `_rolled_back` line (the reviewer's call: a line saying "rolled back" for a row that may exist would be false; the cost is an uncompensated intent line if nothing landed)*; a same-key retry with a malformed body gets the parse `400`, not the replay. ⚠ Recorded by the final review (Z6), ⛔ not changed: replay point 3 (the unique backstop, an unlocked writer) happens inside `mutate`, so it writes the intent line and a `_rolled_back` line while answering `200` (points 1 and 2 write nothing); and the pool advisory lock is now held across the audit intent / compensating writes, which take the global audit-chain lock — no deadlock cycle was traced; the cost is a longer hold under audit contention. The earlier text is kept as written.

### AC7a — The handover code is asked for at Send, ⛔ never at the start
**Given** the elevation lasts 5 minutes and a family may write over days
**When** Send (or Withdraw) returns `403 auth.step_up_required`
**Then** the app runs the handover OTP through `apps/mobile/lib/use-handover-otp.ts` (⛔ never `useStepUpGate` — that
sends to the session member's phone) and **retries once** with the draft and photo intact; a second refusal after a
verified code goes to the helpline (⛔ never another SMS round trip — the `certificate-replacement.tsx` rule); the
no-nominee result routes to the helpline with Pattern-4 copy; all of it in **`memorial`** keys — the memorial screen
⛔ never renders `hook.error` (the hook fills it from `useClaimT()` claim keys); it maps the outcomes the hook exposes to
`memorial` keys, **decided at render time** (`send()` returns `Promise<void>` and sets `error` as state, so reading `error`
inside the handler right after `await send()` sees a stale closure, and a failed `verify()` sets the same `error`): send
failed ⇔ `masked === null && error !== null`; no nominee ⇔ `noNominee` (`masked === ''`); code not verified ⇔ `await
verify(code) === false`. ⚠⛔ `send` / `verify` are rebuilt on every render (deps `[t]` on `useClaimT()`'s fresh closure) —
**never put `otp.send` in an effect's deps** (it would text the nominee in a loop); key the send effect on the 403 outcome
only, as `(claim)/certificate-replacement.tsx` does (*"keyed on `outcome`/`otpMode` only, never on `otp.send` itself"*);
the retry reuses the draft's Idempotency-Key (AC3 — the 403 comes before the claim, so the key is unspent). The hook is ⛔ not edited (AC17), so a rate limit is ⛔ not told apart from a failed send (a known gap,
recorded in AC16 (12)); the code is ⛔ never asked for before the family has written anything.
⭐ **AMENDED — 2026-10-24, the row-held key + the handover state machine (X2, BigDev "1"):** "the 403 comes before the claim, so the key is unspent" now reads "the 403 comes before any row, so the key is unspent" (there is no claim). The Send and Withdraw handover is ONE explicit state machine (`apps/mobile/lib/handover-gate.ts`, every phase × event in a test table, ⛔ no clock): a 403 on an ordinary attempt asks a code (ONE SMS per entry); a wrong code asks again with ⛔ no new SMS; the retry after a verified code — a 2xx ⇒ sent; a 403 ⇒ REFUSED, which is STICKY until a 2xx (the helpline, ⛔ never another SMS — even for a later lapse); any other answer from the server ⇒ the step-up is proved, and a LATER 403 is a lapse ⇒ a new code (R7); NO answer (network, gateway) ⇒ the next press is still the retry. The earlier text is kept as written.
⭐ **AMENDED — 2026-10-24, final review Z0 / Z4 / Z5 (Z0 DECIDED (A) by BigDev, "1"):** (i) an answer from BEFORE the server's step-up check — the route runs rate limit → switch → session → step-up, so a `429`, any `5xx`, `auth.*` or `memorial.not_found` — counts as NO answer, ⛔ not as proof the step-up passed; (ii) a content change while a retry is pending returns the machine to idle (the key was dropped, so the next press is a new Send, not the retry); (iii) the code panel offers **"Send a new code"** (`handover.resend` / `handover.resend_note`, en + hi, UN-ATTESTED) when the SMS failed or 60 s after it was sent — ⛔ never when there is no nominee — capped at 3 per screen; the refusal and the per-screen scope (V17) stay as built; (iv) each code request shows only ITS OWN result — never the previous round's masked number.

### AC8 — Withdraw before review
**Given** `POST /api/v1/member/memorial/submissions/:id/withdraw` (same guards; ⛔ no body — the route declares none and the
api-client sends `'{}'`, since a bodyless JSON POST is a Fastify 400 — [[project_fastify_empty_json_body_400]])
**Then** allowed only for the latest submission of **the session's own drive** while `with_the_trust`; the family's own
latest submission in any other state, or an earlier (superseded) one of theirs → `409 memorial.not_withdrawable` (the app
refetches the outcome); an id that is ⛔ not theirs → the one neutral `404 memorial.not_found` (the same code MA17's switch
answers)
**And** the outcome screen afterwards offers *"Write again"* with ⛔ no judgement.

### AC9 — The Trust's review queue, history and decision (admin)
**Given** a staff session holding `memorial.review` in the Pariwar (a Pariwar with ⛔ no grant answers the scope
middleware's `404 pariwar.not_found` first)
**Then** `GET /api/v1/p/:pariwarId/memorial-reviews` lists submissions `with_the_trust` (oldest first, `clampLimit`,
⛔ no body in the list — the deceased's name + sent date only); `?view=decided` lists the latest submission of each chain in a
decided or withdrawn state, the same way (superseded ones are reached through the chain)
⭐ **AMENDED — 2026-10-24, code review R14:** "the same way" does ⛔ not mean the same ORDER. `?view=decided` is **newest first**
(`created_at DESC, submission_id DESC`); `pending` stays oldest first; the query takes `offset` (0..10000) and the response
carries `hasMore` (the admin Decided tab has a "Load more"). Without it, past `limit` the newest decisions were unreachable.
Note: offset paging can repeat or skip a row if a decision lands between two "Load more" clicks (the admin dedupes by id).
⭐ **SUPERSEDED IN PART — 2026-10-24, code review T7:** "`created_at DESC`" ordered the Decided view by when a version was SENT,
so a version sent long ago and decided today sank (the pending view is oldest-first, so the oldest are decided first). `decided` is
now ordered by the head's DECISION time — `GREATEST(decided_at, withdrawn_at) DESC, submission_id DESC` (a family withdrawal has
only `withdrawn_at`). `pending` is unchanged; the skip / repeat note above stands (deferred T15). The R14 sentence is kept as written.
⭐ **AMENDED — 2026-10-24, fix-diff reviews V12 + W9:** the list item also carries `decidedAt` (`null` when pending) — the time the head was decided or withdrawn, the same value the order uses — and the Decided tab shows it labelled by state ("Decided" for approved / approved with parts left out / not approved; "Withdrawn" for a family withdrawal; "Approval withdrawn" when the Trust withdrew its approval). It is not family text, so "⛔ no body in the list" holds; "the deceased's name + sent date only" now reads "name, sent date and decision date". The earlier sentences are kept as written.
**And** `GET …/memorial-reviews/:submissionId` returns that submission **and its whole chain** (earlier versions, their
decisions, omissions, `photo_left_out_reason`, internal notes, withdrawals) — decrypting body, alt text and notes with **one**
`memorial.review.read` line per read (`fields_decrypted: n`) — and 5-minute signed photo URLs (each a `memorial.photo.url`
line); this is the history view MA6 and AC5 rely on
⭐ **AMENDED — 2026-10-24, code review R9:** the detail response also names the chain's withdrawable approval —
`withdrawApprovalTargetId` (the newest approved, un-withdrawn version, or `null`) — and `canWithdrawApproval` means "that is not
null" for ANY version of the chain the reviewer opens; the admin posts to that id. Before, the flag was computed for the opened id
only, so with v1 approved and v2 pending the MA16 cure was reachable only by typing v1's address.
**And** `POST …/memorial-reviews/:submissionId/decision` accepts `{ action, omissions?: [{ field, start, end, reason }],
photoLeftOut?: { reason }, reasonCode?, internalNote? }` (`.strict()`), validates MA6's rules in Trap 8's order, writes ONE decision row (unique per submission)
+ `actor_display` snapshot through `withCompensatingAudit` (intent line, then `openScopeTx` committed inside `mutate` —
⛔ not `request.scopeTx`, which commits in `onSend` after the audit has returned — under the MA9 lock)
**And** `POST …/memorial-reviews/:submissionId/withdraw-approval` (MA16) accepts `{ reasonCode, internalNote? }`
(any of MA6's four reasons; a submission that is ⛔ not the chain's latest approved one, MA16 → the same neutral 404)
(`.strict()`), the same way
**And** refusals follow Trap 8, **per route**, checked scope-first, each the **one** neutral `404 memorial_review.not_found`
with a byte-identical body: **decision** — unknown / out-of-scope / superseded / withdrawn / already-decided;
**withdraw-approval** — unknown / out-of-scope, or ⛔ not the chain's latest approved, un-withdrawn submission (a
**superseded** approved one is allowed — MA16); **detail GET** — unknown / out-of-scope only (decided, superseded and
withdrawn versions are readable — it is the history view). Offsets that fail MA6 → `400 memorial_review.invalid_omissions`.
Missing key → 403 via the standard hook
**And** the admin screen (`apps/admin/src/modules/memorial-review/`) shows the verbatim text with **sentence-level**
selection for omissions — split with `Intl.Segmenter(locale, { granularity: 'sentence' })` plus `।` / `॥` (a test with
Hindi text) — a UI aid only; the server validates offsets, ⛔ not sentences; bidi controls in the family's text are shown
visibly — the class declared **by value** in `packages/contracts/src/memorial/` (`MEMORIAL_BIDI_CONTROLS`, citing the
module-private `BIDI_CONTROLS` in `apps/api/src/modules/kyc/name-render.ts`, which admin cannot import; a by-value copy already
exists at `apps/public/src/lib/sahyog-vivran-message-block.ts`)
**And** the admin routes are `/p/$pariwarId/memorial-reviews` and `/p/$pariwarId/memorial-reviews/$submissionId`, with a
**required** `RootLayout.tsx` `<Link>` shown inside a Pariwar context and ⛔ **not** gated on the key (a Pariwar grant is ⛔ not
in `nationalGrants`, so a key-gated link would show only to `super_admin` — the trustee link's precedent); the page renders its
own *no access* on a 403 (MA7: otherwise the queue is unreachable)
**And** ⛔ no control on the page is bound to, or pre-filled with, the family's body or alt text; the internal-note
`<textarea>` starts **empty** and is labelled as internal and ⛔ never shown to the family (a test: ⛔ no textbox's value
equals or contains the body — the `queryByRole('textbox')` precedent, `apps/admin/tests/ground-inspection-discrepancy.test.tsx`).

### AC10 — The family learns the outcome, gently, in the app (Q4 option A)
**Then** the outcome screen shows: `approved` → the text as approved; `approved_with_omissions` → the text with the
explicit notation where words were left out (and "the photo was left out" when it was) + the reason copy;
`not_approved` → the reason copy; `withdrawn` → a calm line; `approval_withdrawn` → the reason copy (MA16); `with_the_trust`
→ a calm line and *Withdraw* iff `canWithdraw` (AC8)
**And** **every** outcome screen shows the helpline (for `approved`: to change it or take it down, the nominee calls the
helpline — ⛔ no button; MA13, `-393` M2, `-395`); *"Write again"* shows **iff `canSend`** (so ⛔ never on `approved`); on
`with_the_trust` it sits beside *Withdraw*, with a line that a new version replaces the one with the Trust (MA9, MA13);
`earlierApprovalWithdrawn` (MA16) adds its reason copy above the newer version's state
**And** *"Write again"* opens an **empty** box (Trap 3) with an explicit choice *"Start from what I sent"*, which fills it
with **the family's own original text** — ⛔ never the as-approved text, which the Trust shaped — and may keep the previous
photo (`keepPreviousPhoto`, MA8)
**And** ⛔ no SMS, ⛔ no push, ⛔ no email (Trap 4); the internal note ⛔ never reaches the wire (a contract test)
**And** the approved copy ⛔ must not claim the memorial is already visible anywhere — it says it **will** appear on
the Sahyog Vivran page (true only once 11b.4a lands — MA12) — with ⛔ no take-down button (a take-down goes through the helpline — `-393`).

### AC11 — Presenter shared by preview and (later) the public page
**Then** `@twt/ui` exports pure `memorialParagraphs(body)` (blank-line split, CRLF-aware, ⛔ no trimming of the family's
text inside a paragraph) and `reconstructMemorial` (AC5), composed **split first, then intersect** — a span may ⛔ not
cross a paragraph separator (MA6 refuses it); the mobile **preview** renders through them
**And** a test proves preview output == outcome output for the same input (UX: *"preview matches public output
exactly"* — 11b.4a must reuse the same presenter and render it with `white-space: pre-wrap`, since HTML collapses the
spaces React Native `<Text>` keeps; recorded in its deferred-work trigger).

### AC12 — Copy: Hindi-first, real `t()`, both locales
**Then** a new `memorial` namespace in `packages/i18n/locales/{hi,en}/memorial.json`, registered in
`KNOWN_NAMESPACES` **and** the `catalogs` map + imports (`packages/i18n/src/catalog.ts` — both enforced by
`packages/i18n/tests/catalog-registration.test.ts`), parity green (`pnpm i18n:check`); it includes the handover-code
keys (AC7a); ⛔ no key under `stage.*` and ⛔ no value equal to "A contributor" / "एक सहकर्मी" (fences in
`apps/public/tests/sahyog-stage-vocabulary.test.ts`, `packages/i18n/tests/contributor-placeholder-one-key.test.ts`)
**And** every interpolated key has a **real-`t()`** test in hi and en ([[feedback_stub_must_call_not_transcribe]]);
the no-name intro is a **separate key** (`memorial.intro.prompt` / `memorial.intro.prompt_no_name`), ⛔ never `{name}` with an
empty string (`t()` throws only on an `undefined` param — an empty string renders silently as a broken sentence); the namespace
holds ⛔ no take-down / remove / delete button key (a test, AC4)
**And** Hindi numerals ⛔ never appear in dates/counts (Latin digits); the family's own text is ⛔ never touched
**And** admin copy follows the admin module's `i18n-en.ts` pattern.

### AC13 — Accessibility
**Then** WCAG 2.1 AA on the mobile flow: labels on every input, error text linked to its field, alt-text field
labelled as describing the photo for people who cannot see it, focus order follows reading order, 44pt targets,
TalkBack-Hindi pass recorded **or** recorded as outstanding ([[feedback_record_unattested_no_backfill]]).

### AC14 — Copy review is RECORDED, ⛔ not assumed
**Then** `microcopy.yaml` `scope.copy_globs` gains the `memorial` locale files and `scope.code_globs` gains **each new mobile
file by name** (the existing mobile entries list files one by one — only `components/peer-request/*` uses a glob) and
`packages/domain/src/memorial/authorisation-copy.ts`; a test file `scripts/microcopy/memorial.test.ts` (the
`sahyog-vivran.test.ts` / `fursat.test.ts` precedent — `expect(config.scope.copyGlobs).toContain(FILE)`, literal entries;
`resolveGlobs` is private to `check.ts`) asserts every one is in scope, plants one violation per rule family
(a fursat frame — "hurry up" / "जल्दी कीजिए" / "50% complete" — turning it red, recorded) and checks the real copy is clean;
⚠ `code_globs` **skip `member_only` terms** (`check.ts`; `Late Teacher` / `user` / `donor` / `customer` are `member_only`) and
Task 6.4's no-deadline scan reads only the namespace ⇒ `memorial.test.ts` **also** runs `checkVocabulary` with the full
register, `checkTone` and the no-deadline scan directly over every `MEMORIAL_SUBMISSION_AUTHORISATION_VERSIONS` hi/en string;
`pnpm microcopy:check && pnpm microcopy:test` green. ⚠ The rule has ⛔ no `deadline` arm and rules have ⛔ no per-rule
scope; widening it would fire on shipped `claim.json`/`contribution.json` copy. ⇒ "no deadline" is pinned by the Task 6.4
scan, which forbids deadline **frames** (a date, *"by"* + a date or time, *"within N days"*, *"expires"*) and **allows** negated
reassurance (*"there is no hurry"* — `claim.json` `appeal.no_deadline` precedent), skipping `$comment.*` keys; its negative
cases include *"approved by the Trust"* and *"जब तक"* (else the scan fires on this story's own copy)
**And** a row in `docs/tone-review-checklist.md` *"Ad-hoc copy-review record"* (Date | Reviewer (non-author) | Artifact reviewed |
Authored by | Outcome) names the namespace and the authorisation text, recorded **⚠ UN-ATTESTED** until a **non-author**
human signs it; the agent ⛔ never self-attests; the review checks, in hi **and** en, that M2 (addressed to the nominee) and
M3′ are present and gentle (AC4)
**And** tone review is ⛔ **never** applied to the family's own words (invariant (f)).

### AC15 — The friction budget is DISPOSED, ⛔ not skipped
**Then** `friction-budget.md` gains a **row** (`| payer | protects | event_type |`): payer = the family (nominee),
protects = *the family's words reach the page as they wrote them, and only with their permission*, `optional`;
committed **before** `pnpm friction:check` is run (it diffs `merge-base(HEAD, origin/main)...HEAD` — a pre-commit run
passes vacuously).

### AC16 — Recorded risks, ⛔ not faked
**Then** `deferred-work.md` gains, under a *"Deferred from: story 11b-4 …"* heading, each with a trigger:
(1) **public render** → row `11b-4a` (`-391` Q2 A, Q3 B — the rider withdrawn by `-393`; the helpline
operator's take-down **on the nominee's request only** (`-395`; verification by call back is MA18's **proposal**, ⛔ not
ruled) after a smaller fix is offered (M4), within 7 days, with an email to the approver (`-392` items 4–5, kept — `-395`) —
MA18's parts incl. the new ADR for the approver's address; `-395` item 3 shown to the Panel (Row 41); `-395`'s Not-covered
lines (how the operator knows the caller is the nominee; the nominee has died, cannot be reached, or was replaced; the email's
text and recipient); **M1: a removed memorial leaves ⛔ no trace on the page**; `-393`'s Not-covered lines (counsel on M4,
the call script, what the family is told when they decide to keep it) and `-392`'s (the clock's start; what happens if the
7 days pass; whether a declined request is answered to the family, and how — live again now that `-395` item 3 turns a
non-nominee's request away; whether the operator's decision is reviewed or appealed; whether "removed" ends the memorial or lets the family
send a new version; the recipient when the approver no longer holds the role or has ⛔ no email); matrix fields + Tier-1 exceptions; same presenter with `pre-wrap`; the
latest **approved** version shows while a newer one is with the Trust (MA13);
`s-maxage=300` take-down latency; the two `apps/public` doc-blocks that read *"the family story (Story 11b.4) — `backlog`"*
— `apps/public/src/lib/sahyog-vivran-render.ts` and `apps/public/src/pages/sahyog-vivran/[driveToken].astro` — which
AC17 forbids touching here); (2) **kinship capture** (MA2) → 11b.4a/11b.5; (3) **emphasis** (MA4); (4) **staff-initiated
helpdesk conversation** after a refusal; (5) **non-nominee authors** (Q1 B/C — ⛔ not chosen, `-391`); (6) **formal family appeal** (Q4 B — ⛔ not chosen, `-391`);
(7) **a family's own request to erase their words** through the helpline (`-391` Q5 A's follow-up) — MA15 erases with the member's record; ⛔ no family-initiated
path exists, and the author is ⛔ not a data subject of any export route; (8) **Story 0.9 un-attested** — every Pattern-4 /
grief-pacing claim here is **⛔ not validated against a family conversation** (`_bmad-output/research/
p0-2b-bereaved-spouse.md` holds only `_AWAITING_CONVERSATION_CONDUCT_` placeholders) — Row 41 carries it; (9) **the
family can lose the account** — `disabled-T+90` (unbuilt) must ⛔ not cut the family off, **and** a withdrawal of the
deceased's membership is **unguarded today** (`withdrawal/handlers.ts` `assertWithdrawable` checks only the member
state; after it, `termination-block-seam.ts` denies every session) — routed to the withdrawal / claims owner, ⛔ not fixed
here; plus the 90-day sign-in lapse (Policy meaning); (10) **staff-assisted authoring** on the family's instruction
(`-391` Q1 A's follow-up); (11) **`@twt/ui` in `apps/public`** — `apps/public` does ⛔ not depend on `@twt/ui`
today (epic header C-1), so 11b.4a's reuse of the AC11 presenter needs that dependency first; (12) **UX departures** —
the entry on home rather than in `<NomineeConsole>`, reason copy instead of a reviewer's *"note"*, ⛔ no SMS/email resume
link (UX-DR50/56), the handover hook's rate-limit case shown as a failed send (AC7a), Pattern 5's relative-time *"Saved"* hint
and screen-reader announcement of save state (a static *"Saved on this phone"* line instead), and `<PortraitFrame>` in upload
mode (11b.5 is `backlog`) — each with its reason (MA12/Trap 4/MA6/AC17/MA3/Trap 9); (13) **⛔ no production pool reaches `closed`** — the
surface is inert until the Epic 7 window scheduler appends `pool.closed` (MA14; trigger: the first non-test producer of
`pool.closed`; Row 41 carries it); (14) **counsel risks, ⛔ not blockers** — `-391`: counsel ⛔ not asked how long words naming
living people may be kept (Q5); `-391` / `-393`: the draft T&C *"revocable consent"* sentence flagged for its owner;
`-393`: whether M4's conversation keeps withdrawal as easy as giving permission; (15) **the helpdesk create route truncates an
over-long field silently** (`helpdesk/member-handlers.ts` — its `FST_FIELD_SIZE_LIMIT` arm is dead, Trap 11) → the helpdesk
owner; trigger: the next helpdesk story
**And** the existing item **CR-11b.2a-COMBINED-W3** (*"the RTBF erasure guarantee ends AT THE WIRE…"*) is **annotated**: its
trigger (iii) (*"any story adding a second member-scoped persisted query"*) is ⛔ **not met** by 11b.4 — the member GET is
member-scoped but excluded from the persisted cache by `gcTime: 0` (AC1); the item stays **open**, ⛔ not closed
**And** the existing open item (title verbatim) *"⛔ FOUR PRODUCERS THE EPIC AC NAMES THAT DO ⛔ NOT EXIST — the ruled posture is
RENDER NOTHING"* is **annotated** (family story: the **write side** built at 11b.4, ⛔ no public read model until 11b.4a;
render still nothing) — ⛔ not closed, ⛔ not deleted.

### AC17 — Nothing else moves
**Then** ⛔ no change to: the claim consent screen or `dpdpa-consent*` files; `consent_records` or its enum;
`sahyog-vivran-read.ts` (⛔ not even an import — MA14); the public matrix YAML / `matrix.ts` / `apps/public`;
`member_moderation_*` or either `MODERATION_ACTIONS`; `resolveActiveNomineePool`; the Shradhanjali prototype components;
`withdrawal/handlers.ts`; `apps/mobile/lib/use-handover-otp.ts`; `stepUpVerify`, `sendHandoverOtp`, `verifyHandoverOtp`,
`requireMemberStepUp`, `MemberStepUpRequestRequest`. The only edits to existing files are `anonymizeMember`
(+ its three test counts — MA15) **and its two callers** `apps/api/src/modules/rtbf/handlers.ts` +
`apps/api/src/modules/member-data-rights/handlers.ts` (photo deletion after COMMIT — Task 2.5), `member-auth.handlers.ts`
`stepUpRequest` (+ its test — MA19), the config switch (MA17), `permissions.ts` / `roles.ts` (+ their tests — MA7),
`field-classes.ts`, `(tabs)/index.tsx` (one `<MemorialEntry />` line) and `app/_layout.tsx` (the group), and the registrations
Tasks 2, 3, 5, 7 and 8 list (schema / policies / domain / contracts indexes, `_journal.json`, the admin router + client + hooks +
`RootLayout.tsx`, `catalog.ts`, `microcopy.yaml`)
**And** `git diff --name-only $(git merge-base HEAD origin/main)..HEAD -- apps/public packages/contracts/public-pages` is
**empty** at review (the merge-base, ⛔ not the pin — the branch is rebased past it).

### AC18 — Closes only on green, and says so precisely
**Then** `pnpm ci:local` passes after the **last** commit — on :5433 unless a sibling (6.36e plans `0181`) has applied a
migration this branch's journal lacks, otherwise on a fresh DB on **:5434** (the 6.35 precedent, ledger `2026-10-23s`) (the job
count recorded, e.g. "N/N"), integration included; `0180` is on main, so the Task 0.1 rebase reconciles it; the migration applies on the test DB; the Completion Notes say which gates ran
and which were vacuous; the row moves `in-progress → review` only then.

### AC19 — Dark until Row 41 closes (MA12, MA17)
**Then** `docs/launch-gate-inventory/inventory-roster.md` gains **Row 41** in the Row 39 block shape with MA12's
closure criteria; `MEMORIAL_AUTHORSHIP_ENABLED` is **off by default** and a test proves, with it off, `entry` →
`{ memorialEntry: false }`, the member GET → `{ memorial: null }` and each member write → the neutral `404 memorial.not_found` —
the write legs run **without** an elevation (proving the switch answers before the step-up gate).

### AC20 — Only the nominee's code unlocks a `claim_handover` step (MA19, Trap 13)
**Given** a member session
**When** `POST /api/v1/member/auth/step-up/request` is called with `{ actionContext: 'claim_handover' }`
**Then** it answers `400 auth.step_up_context_not_allowed`, mints ⛔ no OTP row, sends ⛔ no SMS, writes one
`member_step_up.failure` line with `reason: 'context_not_allowed'` — and a later Send still answers `403
auth.step_up_required` (an integration test, explicit values)
**And** any other context still works on that route (one existing context, a regression leg), and the nominee route
`/api/v1/member/claims/handover-otp` → `/verify` still yields an elevation that Send accepts
**And** a unit test pins `DEDICATED_STEP_UP_CONTEXTS` **equal to** `[CLAIM_HANDOVER_ACTION_CONTEXT]`; the Completion Notes tell
the claims / reconciliation owner that the same hole is closed for every `claim_handover` route — claim intake, claim documents,
nominee-bank and the bank-statement upload.

---

## Tasks / Subtasks

- [x] **Task 0 — Re-verify, then get the build decisions answered** (AC0)
  - [x] 0.1 `git fetch origin`; `git merge-base --is-ancestor d87d047a origin/main`; rebase the branch onto
        `origin/main`; `git diff --name-only d87d047a..origin/main -- packages apps scripts` — if any file named in
        this story moved, re-derive its cite. Re-check every NUMBER in the header comment across **all branches and
        worktrees** (`git for-each-ref` + each worktree's working copy). Confirm the
        `member_nominee_versions.version_id` is still the PK and `getNomineeVersionHeads` still omits it (MA5
        `handover_nominee_ref` — the memorial-local query). Run the seven PREFLIGHT STOP checks. ⚠ Contested numbers: Row 40
        (5.11's — this story uses **Row 41**), migration `0181` (6.36e plans it too — take the next free at commit time), and
        ledger `al` (6.36e's). **Re-letter only the colliding entries**, each to a letter free on **every** branch and worktree
        (next free at v0.9: `2026-10-23aq`; `2026-10-24a` is 6.36e's; this story's v0.9 entry is `2026-10-24b`), keeping their order.
  - [x] 0.2 Record **MA1 (a)** and **MA18 (a)** as answered (BigDev 2026-10-23, verbatim: *"I am fine with 11b-4a"*) and
        **MA19 (a)** (BigDev 2026-10-24). MA5 (permission kept on the row), MA6 (the four grounds only) and MA7
        (`trustee_panel` reviews) were **ratified** by `-391` Confirms 3 / 2 / 1 — ask BigDev **only their build details**,
        ⛔ never the ratified core. Put the rest (MA2–MA4, MA8–MA17, the AC7 limits) to BigDev (⭐ = recommended) and record
        each answer verbatim in the Dev Agent Record. ⛔ Do not start Task 1 without them.
  - [x] 0.3 The routing note was **sent and ruled** (`-391`, 2026-10-23 — transcribed at v0.4). `-391` item 3's rider
        was clarified (`-392`) then withdrawn (`-393`, soft measures M1–M4). Check ⛔ no later ruling on it (STOP 4). `-395`
        (BigDev) kept `-392` items 4–5 and limited a take-down to the nominee's request.
- [x] **Task 1 — Governance commit, alone** (AC0)
  - [x] 1.1 `### Decision <date>-<next free id>` (`-396` or later): **Author-commit (BigDev)** — MA1–MA19 as answered; the three enum
        mints + permission key (with "⛔ not covered by `-210` cl.2"); MA19's closing of the generic step-up route; the `-391`
        item 8 pointer (*"item 8's ⇒ clause derives from item 3's answer; with item 3's rider withdrawn (`-393`), after
        publication the permission is revocable through the helpline on the nominee's request (`-395`)"* — a pointer, ⛔ not a
        re-reading and ⛔ not a supersession, so the §0 *"supersedes no clause"* holds); §0 line; **Not covered:**
        Q1–Q5 and the three confirms (ruled by `-391`, Q3 as amended by `-393` and `-395`). Insert under the `Newest first` separator. If the decision-log write
        is refused, ask BigDev once ([[project_decision_log_writes_user_inserted]]).
  - [x] 1.2 Commit **only** `.decision-log.md`: `governance: Decision <id> — AUTHOR-COMMIT (BigDev): 11b.4 build decisions …`.
        Check `git branch --show-current` first.
  - [x] 1.3 Records commit: `epics.md` SECTIONED block on `### Story 11b.4` (MA1 split, MA2 kinship deferral, MA4
        emphasis deferral, MA8's new port in place of the epic's *"Story 6.5 `<ClaimDocumentUpload>` pattern"*, MA14's
        post-close window, Trap 3, and the 10.10 correction); the `-162` follow-up `ANNOTATED … by [<that id>]` line (HOMED,
        original wording verbatim — AC0); if MA1(a), add the row `11b-4a-family-memorial-public-render: backlog` after the
        11b-4 row; ledger prepend (safe pattern — [[project_sprint_status_safe_prepend]]) + row → `in-progress`; verify
        YAML with a duplicate-key loader and `^last_updated:` count == 1.
- [x] **Task 2 — Schema, migration, RBAC, erasure** (AC5, AC9, MA5–MA9, MA15, MA16)
  - [x] 2.1 `packages/domain/src/schema/memorial_submissions.ts`, `memorial_review_decisions.ts`,
        `memorial_withdrawals.ts` (+ `schema/index.ts`); pgEnums generated from domain tuples in
        `packages/domain/src/memorial/vocab.ts`. Every table carries `pariwar_id` (RLS). Columns: submissions — `submission_id`
(PK), `pool_id`, `claim_case_id`, `deceased_member_id`,
        `supersedes_submission_id`, `body_ciphertext`, `alt_text_ciphertext`, `photo_object_key`, `photo_mime`,
        `authorisation_copy_version`, `authorisation_locale`, `handover_recipient`, `handover_nominee_ref`, `created_at`;
        decisions — `submission_id` (unique), `action`, `omissions` (JSONB NOT NULL — field, start, end, reason per entry;
`'[]'` when none — MA6), `photo_left_out_reason` (null = kept), `reason_code` (`not_approved` only),
        `internal_note_ciphertext`, `actor_id`, `actor_display`, `decided_at`; withdrawals — `submission_id` (unique),
        `withdrawn_by`, `reason_code` (`memorial_review_reason`; required when `trust`), `internal_note_ciphertext`, `actor_id`, `actor_display`,
        `withdrawn_at`. Tier-1 via `piiColumn(1, MEMORIAL_FIELD_CLASS)` — declare `MEMORIAL_FIELD_CLASS` once in
        `packages/domain/src/encryption/field-classes.ts` (*"single authority … do not re-declare"*); the column is
        identity at the driver, so encrypt/decrypt in the API layer in `apps/api/src/modules/memorial/memorial-crypto.ts`
        (the `claims/claim-contact-crypto.ts` precedent: the crypto port is passed to the domain writer).
  - [x] 2.2 Hand-authored `packages/domain/migrations/0181_memorial-authorship.sql` (⚠ `0180` is on main; 6.36e plans `0181`
        too — if it is committed or applied on :5433 first, take `0182`)
        (idempotent; enums; tables; FKs to `pools`, `claims`, `members`; MA9's two unique indexes + `UNIQUE (pool_id, submission_id)` + the
        composite supersede FK; unique `(submission_id)` on decisions and withdrawals; CHECKs: omissions JSONB array shape (each entry
        with a reason), `reason_code` required iff `not_approved`, a withdrawal's `reason_code` required iff
        `withdrawn_by = 'trust'` — ⛔ no CHECK on a ciphertext column (MA15); `ENABLE` + `FORCE ROW LEVEL SECURITY` in the
        `0161_*.sql` statement order; `GRANT SELECT, INSERT` + the column-level `GRANT UPDATE` of MA15); `_journal.json`
        entry with a `when` later than every journal entry on `origin/main` **and** on every sibling branch and worktree
        (max `1795059600024` at v0.9, on main, 5.11 and 6.36e alike; 6.36e's planned entry will exceed it —
        [[project_sibling_migration_when_order_shared_db]]); ⛔ never `db:generate`.
  - [x] 2.3 RLS policies `packages/domain/src/policies/memorial-*-rls.ts` (SELECT, INSERT, and the MA15 UPDATE leg),
        exported from `packages/domain/src/policies/index.ts`.
  - [x] 2.4 `memorial.review` in `permissions.ts` (52 → 53, header log), granted to `trustee_panel` in `roles.ts`;
        update the pinned tests (`packages/domain/tests/rbac/permissions.test.ts` 52→53, 68→69 keys; `roles.test.ts`);
        **prove it is live** for `trustee_panel` on the `pariwar` dimension (MA7).
  - [x] 2.5 `anonymizeMember` (`packages/domain/src/member/anonymize.ts`, today `Promise<void>`) scrubs the four ciphertext
        columns for the member's submissions — **unconditionally**, keyed on `deceased_member_id` = the member (⛔ not inside
        the has-claims branch) — and returns `{ memorialPhotoKeys: string[] }`; its two callers
        (`apps/api/src/modules/rtbf/handlers.ts`, `apps/api/src/modules/member-data-rights/handlers.ts`) delete those objects
        best-effort **after COMMIT** (logged, anonymous convention). In the same commit raise **all three** pins in
        `packages/domain/tests/member/rtbf-anonymize.test.ts` (the statement count `toHaveLength(26)`, the table set
        `new Set(tables).size).toBe(23)`, and the no-claims `toHaveLength(23)` — the numbers at `1268d47e`) (MA15). ⚠ 6.36e
        raises the same pins: whichever lands second re-takes the counts.
- [x] **Task 3 — Domain + the shared validator** (AC1, AC5, AC7–AC9, MA6, MA14)
  - [x] 3.1 `packages/domain/src/memorial/{vocab,status,resolve,submission,withdrawal,review,authorisation-copy,errors,index}.ts`;
        `export * as memorial` from `packages/domain/src/index.ts` (cf. `nomineeConsole`). `resolveMemorialDrive` over
        its own `MEMORIAL_DRIVE_POOL_STATES` (MA14 — ⛔ no import from `sahyog-vivran-read.ts`), returning the match count.
  - [x] 3.2 `deriveMemorialStatus` (pure, exhaustive `never` arm, seven states); the omission validator in
        `packages/contracts/src/memorial/omissions.ts` (pure; MA6's rules; grapheme boundaries via `Intl.Segmenter`).
  - [x] 3.3 `MEMORIAL_SUBMISSION_AUTHORISATION_VERSIONS` v1, hi + en, `hiReviewed: false`, id
        `'2026-10-23.v1-pending-hi-review'`, doc-comment citing `-391` Q2 A + `-393` M2; the text carries M2's helpline
        sentence (AC4). The M3′ preview line is a `memorial` namespace key (AC4).
  - [x] 3.4 Unit tests: status table (incl. `null` ⇒ `none`); `earlierApprovalWithdrawn` rule (MA16); omission edge cases
        (empty, overlap, touching, unsorted, out of range, a boundary inside a surrogate pair **and** inside a Devanagari
        conjunct / ZWJ sequence, whitespace-only span, a span across a blank line, a whole-body omission under
        `approved_with_omissions`) and MA6's action rules (`photoLeftOut` with ⛔ no photo; an `altText` span with
        `photoLeftOut`; omissions / `photoLeftOut` / `reasonCode` on `approved`; omissions on `not_approved`); blank check
        (ZWSP-only, U+3164-only and U+FFA0-only bodies are blank; the class used twice in a row gives the same answer — the
        `/g` trap); verbatim round-trip (Trap 6); registry hi/en non-empty.
- [x] **Task 4 — ⭐ The point-of-submission authorisation** (AC4 — `-162` cl.3)
  - [x] 4.1 Server resolves the version; refuses non-current with `409 memorial.authorisation_outdated`; writes the
        four columns in the submission txn.
  - [x] 4.2 Mobile renders the resolved text above Send in the app's current language; sends only version + the
        locale shown.
  - [x] 4.3 Tests: no `consent_records` row is written by Send (integration count-delta on the subject, explicit);
        a grep test that ⛔ neither retired enum value appears in any new file; the authorisation and the row commit or
        roll back together.
- [x] **Task 5 — API** (AC1, AC6–AC10, AC19, AC20, MA5, MA8, MA11, MA16, MA17, MA19)
  - [x] 5.1 `packages/contracts/src/memorial/{dto,omissions,text-classes,photo-storage,index}.ts` (`.strict()` INPUT DTOs; ⛔ no
        `.max()` on output fields; `memorialState`, ⛔ never `status`; DTO names: `MemorialEntryResponse`,
        `MemorialMemberViewResponse`, `MemorialSendResponse`, `MemorialReviewListItem`, `MemorialReviewDetailResponse`,
        `MemorialReviewDecisionInput`, `MemorialWithdrawApprovalInput`; `text-classes.ts` holds the invisible-character class
        (+ U+FFA0) and `MEMORIAL_BIDI_CONTROLS` by value, each citing its source — AC7, AC9), exported from the contracts root;
        the photo metadata stripper `apps/api/src/modules/memorial/photo-metadata.ts` (MA8); adapters `packages/platform-adapters/src/memorial-photo-storage/
        {gcs,in-memory,local-fs}.ts` exported from `src/index.ts`; wire in `context.ts` + `deps.ts`
        (`MEMORIAL_PHOTO_BUCKET`, env-only, local-fs fallback — ⛔ no Terraform); `MEMORIAL_AUTHORSHIP_ENABLED` in
        `config.ts` (MA17); add the storage and the switch to `apps/api/tests/integration/_setup.ts`; the three read
        actions (MA11) to `AuthAuditEventType` (the four write actions go through `withCompensatingAudit` only) (`apps/api/src/audit/audit-sink.ts`); SDK methods in
        `packages/api-client/src/index.ts` (mobile calls go through it; Send via `callMultipart` with the
        `idempotency-key` extra header, as helpdesk `createTicket`); routes in `packages/contracts/scripts/emit-openapi.ts`
        (`ci:local` runs `contracts-determinism`).
  - [x] 5.1a Unit tests for `photo-metadata.ts` (MA8): a planted JPEG APP1 EXIF/GPS block gone; an MPF trailer after the
        primary image's EOI (with its own APP1/GPS) dropped; a JPEG whose EXIF carries a thumbnail (`FF D8 … FF D9` inside
        APP1) keeps its full scan data; each PNG chunk MA8 lists gone; a non-image with a `image/jpeg` mimetype →
        `memorial.photo_type`; a truncated / garbage file → `memorial.photo_unreadable` (⛔ never a throw that 500s); the image
        bytes otherwise unchanged.
  - [x] 5.2 `apps/api/src/modules/memorial/{index,routes,handlers,memorial-crypto,photo-metadata}.ts` (member: `entry`, GET, Send,
        withdraw) + `register…Module` **called** in `apps/api/src/server.ts` — the nominee-console route's read guard for
        the GETs; for writes, the MA17 preHandler registered **before** `requireMemberStepUp`, then the
        `Idempotency-Key` claim; multipart per Trap 11 (`readCreateMultipart`'s shape, `fieldSize` ≥ 32 KiB, and
        `valueTruncated` / `fieldnameTruncated` checked on every field part); `keepPreviousPhoto` reads the head's key under
        the lock, and failure cleanup deletes only this request's own `put` (MA8); the nominee-resolution 409 (MA5); the
        withdraw route declares ⛔ no body (AC8).
  - [x] 5.3 `apps/api/src/modules/memorial-review/{index,routes,handlers}.ts` (admin: list, detail + history, decision,
        withdraw-approval) + registration — `requirePermissionHook(deps, 'memorial.review', { dimension: 'pariwar' })`;
        Trap 8 ordering; `openScopeTx` inside `mutate`.
  - [x] 5.4 Integration specs (`apps/api/tests/integration/memorial/`, the AC18 database, rollback isolation, explicit
        values): happy path; the verbatim round-trip **through multipart**; two concurrent Sends → both 201, linear chain;
        the 23505 backstop by an unlocked insert; a replayed `Idempotency-Key` → the first result; Send after `approved`
        → 409; withdraw rules (own decided → 409, foreign → 404, another family's drive in the same Pariwar → 404);
        decision rules incl. `photoLeftOut` and alt-text spans; withdraw-approval; cross-Pariwar 404; no-key 403;
        no-step-up 403; internal note absent from the member GET; review input with `body`, `text` or `narrative` → 400;
        switch off → AC19; the stripped photo carries ⛔ no EXIF/GPS; `anonymizeMember` scrubs the ciphertexts; each audit
        line of MA11 is written (explicit actions, ⛔ never counts over shared fixtures). **Also:** the member GET's
        `earlierApprovalWithdrawn`, `canSend` and `canWithdraw` per state; a body decrypt failure → the fail-soft 200 (AC1);
        a KMS outage on the name → the no-name intro, 200; `entry` writes ⛔ no audit line and decrypts nothing; multipart
        refusals — unknown field, duplicate field, second file, a field over `fieldSize` (`valueTruncated`),
        `keepPreviousPhoto` **with** a `photo`, `keepPreviousPhoto` when the head has ⛔ no photo; a failed Send with
        `keepPreviousPhoto` leaves the earlier object in storage; a Send after `withdrawn` → 201; ⛔ no resolvable nominee →
        `409 memorial.nominee_unresolved`; `?view=decided`; the decision / withdraw-approval / detail refusal sets of AC9,
        with superseded, withdrawn and decided refusals giving **byte-identical** 404 bodies; withdraw-approval legs — a
        superseded approved submission → 201, a non-approved one → 404, an already-withdrawn one → 404, a missing reason →
        400, and the family's state becomes `approval_withdrawn`.
  - [x] 5.5 AC6 dependency-map test with planted-violation teeth (Debug Log).
  - [x] 5.6 MA19 / AC20: `DEDICATED_STEP_UP_CONTEXTS` + the guard in `stepUpRequest`
        (`apps/api/src/modules/auth/member/member-auth.handlers.ts`), before any OTP is minted; the AC20 integration test
        (refused, ⛔ no OTP row, ⛔ no SMS, one `member_step_up.failure` line; another context still works; the nominee route
        still unlocks Send) and the pin test; a Completion Notes line for the claims / reconciliation owner.
- [x] **Task 6 — Mobile** (AC1–AC4, AC7, AC7a, AC8, AC10–AC13)
  - [x] 6.1 Put the entry in its own component `apps/mobile/components/memorial-authorship/MemorialEntry.tsx`, driven by
        the `entry` probe (AC1), so `apps/mobile/app/(tabs)/index.tsx` gains only `<MemorialEntry />` beside
        `<ClaimProxyFlowEntry />`. Keep 6.35's `apps/mobile/tests/unit/language-source-pins.test.ts` (no `t` in any deps array;
        `<LanguageSettingsEntry />` immediately followed by `<NotificationSettingsEntry />`) and the home-order pins in
        `peer-request.test.ts` / `sahyog-vivran-entry.test.ts` green. ⚠ This worktree has ⛔ no `apps/mobile/.expo/types`, so
        `tsc` does ⛔ not check the `/(memorial)` Href ([[project_mobile_typed_routes_worktree]]) ⇒ a **source-pin test** of
        the entry's `router.push('/(memorial)')` (the `sahyog-vivran-entry.test.ts` shape), ⛔ not a check by hand.
  - [x] 6.2 `apps/mobile/app/(memorial)/{_layout,index,write,photo,preview,outcome}.tsx` (`preview.tsx` is the
        preview-and-send screen — ⛔ no `send.tsx`, AC2), registered in `apps/mobile/app/_layout.tsx` (`headerShown: false`);
        `apps/mobile/components/memorial-authorship/`; `apps/mobile/lib/{memorial-api,memorial-draft,memorial-i18n}.ts`
        (`memorial-i18n.ts` on `lib/workplace-i18n.ts`'s `useXT()` shape; `memorial-api.ts` on `lib/claim-api.ts`, with a
        `createMemberMemorialClient` factory in `@twt/api-client`). The query hooks set `gcTime: 0` + `staleTime: 0`,
        refetch on mount of the outcome screen, and are invalidated after Send / Withdraw (AC1). Photo pick on the
        `app/(helpdesk)/new.tsx` precedent (`launchImageLibraryAsync({ quality: 0.8 })`), copied with
        `File` / `Paths.document` and stored as a file name (AC3). The Send's Idempotency-Key is kept in the draft (AC3).
        Every screen has *"Save and come back"* in its sticky header; the intro offers *"Not now"* as an equal choice; the
        preview shows M3′ at its top and the permission text immediately above Send (AC4); *"Write again"* opens an
        **empty** box, and *"Start from what I sent"* fills it with the **original** text (⛔ never the as-approved text) and
        may keep the photo (`keepPreviousPhoto`, AC10); the draft is cleared on any 2xx (or a refetch showing the Send landed)
        and kept on every refusal (AC3, AC7); `409 memorial.nominee_unresolved` routes to the helpline with its own
        Pattern-4 key `memorial.send.nominee_unresolved` (MA5).
  - [x] 6.3 `@twt/ui` `memorialParagraphs` + `reconstructMemorial` (AC5, AC11) with tests in `packages/ui/tests/`;
        preview == outcome test.
  - [x] 6.4 Tests on the jsdom harness (`apps/mobile/tests/unit/language-screen-render.test.ts` precedent: RN mocked,
        `lib/mmkv` mocked, RTL `cleanup`; **add** mocks for `expo-file-system` and `expo-image-picker` — none exists yet):
        draft lib (every-change save, start-again clear, sign-out kept, missing photo, a relative file name restored through
        `Paths.document`, the Idempotency-Key kept until any 2xx, and on resume / `idempotency_in_progress` a refetch that
        clears the draft when a newer submission exists, else a fresh key — ⚠ *2026-10-24: the `idempotency_in_progress` half is obsolete (the row-held key; see AC3's last note); the resume refetch stays*); the input props on the
        `apps/mobile/tests/unit/kyc-manual-render.test.ts` harness (its `Input` mock records every prop):
        `autoCorrect={false}` + explicit `spellCheck` + `accessibilityLanguage` on both inputs, ⛔ no `maxLength`; a source-pin
        test that every memorial query hook carries `gcTime: 0`; render tests for *"Save and come back"* on every screen,
        *"Not now"*, M3′ at the top of the preview, *"Write again"* empty vs *"Start from what I sent"* = the original, the
        outcome per state (AC10, incl. the helpline on `approved`, ⛔ no *"Write again"* on `approved`, and *"Write
        again"* beside *Withdraw* on `with_the_trust`); i18n real-`t()` hi/en; the AC14 "no deadline" scan of the `memorial` namespace (frames forbidden,
        reassurance allowed, `$comment` skipped, `"approved by the Trust"` / `"जब तक"` not flagged).
  - [x] 6.5 The handover step-up leg (AC7a) via `use-handover-otp.ts`, outcomes decided at render time, the send effect
        keyed on the 403 outcome only (⛔ never on `otp.send`); render tests: the retry keeps the draft + photo + key, a
        second refusal goes to the helpline, the no-nominee case, the send effect fires **once** across re-renders.
  - [x] 6.6 Device checks, recorded in the Debug Log **or** recorded ⚠ UN-ATTESTED: Hindi typing with
        `autoCorrect={false}` (Gboard Hindi + a transliteration keyboard, iOS + Android — Trap 7; a break STOPS for
        BigDev); a rotated portrait and an iPhone HEIC pick arriving upright as JPEG (MA8); TalkBack-Hindi (AC13).
  - [x] 6.7 Accessibility (AC13): render tests that every input has a label, refusal text is linked to its field, the
        alt-text field's label says it describes the photo for people who cannot see it, focus order follows reading order,
        and touch targets are ≥ 44pt.
- [x] **Task 7 — Admin review screen** (AC9, MA16)
  - [x] 7.1 `apps/admin/src/modules/memorial-review/` (list + detail with history + decision + withdraw-approval;
        `i18n-en.ts`) on the `moderation-appeals/ModerationAppealsPage.tsx` queue-and-decision precedent (news-blog for
        wiring); route `apps/admin/src/routes/MemorialReviewRoute.tsx` at `/p/$pariwarId/memorial-reviews` (+
        `/$submissionId`); `apps/admin/src/router.tsx` `createRoute` + route tree; calls in `apps/admin/src/api/client.ts` +
        `hooks.ts`; a **required** `RootLayout.tsx` `<Link>`, shown inside a Pariwar context and ⛔ not key-gated, with the
        page's own *no access* on a 403 (AC9). Sentence-selection aid (`Intl.Segmenter` + `।` / `॥`, a Hindi test); bidi
        controls shown via `MEMORIAL_BIDI_CONTROLS` from `@twt/contracts`; the AC9 textbox test.
- [x] **Task 8 — Copy, tone, friction, launch gate** (AC12, AC14, AC15, AC19)
  - [x] 8.1 `memorial` namespace hi/en (incl. the handover-code keys, `memorial.preview.before_publish`,
        `memorial.intro.prompt` / `_no_name`; the Hindi M3′ avoids *अभी कर…*); `KNOWN_NAMESPACES` **and** the `catalogs` map +
        imports; `microcopy.yaml` copy_globs + code_globs, each new mobile file by name (AC14);
        `scripts/microcopy/memorial.test.ts` with planted teeth **and** the direct scan of the authorisation registry's
        hi/en strings; a test that the namespace holds ⛔ no take-down / remove / delete button key (AC4, AC12).
  - [x] 8.2 Tone-review checklist row (column `Artifact reviewed`), ⚠ UN-ATTESTED; it lists checking M2 (addressed to the
        nominee) and M3′ in hi and en (AC4, AC14).
  - [x] 8.3 Friction-budget row; commit; then `pnpm friction:check`.
  - [x] 8.4 Launch-gate inventory **Row 41** in Row 39's full shape (the `##` heading, the appended quote, the `###` block,
        `architecture_source_line`) with MA12's criteria (MA12) + the switch-off test (AC19).
- [x] **Task 9 — Records** (AC16)
  - [x] 9.1 `deferred-work.md` items (1)–(15) + the FOUR-PRODUCERS annotation + the CR-11b.2a-COMBINED-W3 annotation.
- [x] **Task 10 — Verify and close** (AC17, AC18)
  - [x] 10.1 AC17 diff check (from `git merge-base HEAD origin/main`); eslint per package (per-package cwd); `tsc --noEmit`;
        `pnpm --filter @twt/i18n test`; microcopy; friction; `pnpm ci:local` on the AC18 database — `DATABASE_URL` for :5433
        unless a sibling has applied a migration this branch lacks (6.36e's `0181`), else a fresh database on :5434 — after
        the **last** commit; record the job count.
  - [x] 10.2 Story file: File List, Completion Notes (which gates were vacuous), Change Log; row → `review` with a
        ledger entry.

### Review Findings

Code review 2026-10-24 (`bmad-code-review 11b.4`) — HEAD `21284bff`, diff `1268d47e...21284bff` code groups only (107 files, +9,005 / −20;
generated `openapi/v1.yaml`, ledgers and records were Auditor context, not review text). Three parallel read-only layers (Blind Hunter,
Edge Case Hunter, Acceptance Auditor); no layer failed. A peer session's untracked `apps/api/tests/integration/memorial/review-repro.spec.ts`
(4 repros) was re-run on :5434 with `DATABASE_URL` overridden and each claim read against the code before use: #1 -> R3 (reproduced), #2 -> R18
(reproduced live in SQL), #3 -> folded into R3 / deferred R24, #4 -> deferred R23 (reproduced, but not reachable on a product path). The repro
file is NOT part of the story's diff and was left untouched. Panel-routing gate applied: nothing here goes to the Panel (R1 and R2 are
story-level wording/disclosure of already-ratified policy). Severity tags are the reviewer's; family numbers are `_bmad/custom/load-bearing-invariant-checklist.md`.

- [x] [Review][Patch] R1 [LOW] AC4 M2 wording — DECIDED B (BigDev, 2026-10-24): add one sentence to the permission text saying plainly that ONLY the nominee's request takes a published memorial down [`packages/domain/src/memorial/authorisation-copy.ts:42` en + hi twin, `packages/domain/tests/memorial/memorial-status.test.ts`]; per Row 41 (a) it is a NEW permission-text version id (en + hi, `hiReviewed: false` until the non-author Hindi review), and the version pin in the test moves with it. The analysis that led to the decision: AC4: the M2 sentence "says plainly that a take-down is asked for by the nominee". Shipped (`packages/domain/src/memorial/authorisation-copy.ts:42` en + hi twin): "If you, the nominee, ever want it changed or taken down, you can call the helpline." It addresses the nominee but never says a request from anyone else (a relative on the deceased's shared phone) is not acted on; `-395` Consequence 1 requires only that M2 address the nominee. (A) keep — satisfies `-395`, already queued for the non-author Hindi review (Row 41 (a)); cost: the "plainly" in AC4 is read as "addressed to". (B) add one sentence that only the nominee's request is acted on — cost: a NEW permission-text version id, en + hi, a new Hindi review, `memorial-status.test.ts` pin updated. Not a Panel question (policy ratified by `-395`; this is the wording of an AC). Source: auditor F15.
- [x] [Review][Patch] R2 [MED] Older approval still live — DECIDED A (BigDev, 2026-10-24): tell the family now, on the outcome screen, that an earlier approved version still stands when the NEWEST version is withdrawn or declined [`packages/domain/src/memorial/status.ts:121-150`, `packages/contracts/src/memorial/dto.ts` (one boolean on the member GET, derived from `latestApprovedIndex`), `apps/mobile/app/(memorial)/outcome.tsx`, `packages/i18n/locales/{en,hi}/memorial.json`, render tests with the real `t()`; new copy needs the Hindi review, `microcopy.yaml` + `scripts/microcopy/memorial.test.ts`; regenerate `openapi/v1.yaml`]. The analysis that led to the decision: State is derived from the latest version only (`packages/domain/src/memorial/status.ts:121-150`; `apps/mobile/app/(memorial)/outcome.tsx`). `earlierApprovalWithdrawn` (MA16) covers only an older version the Trust withdrew. Case: v1 `approved_with_omissions` (the one state that lets the family send again, MA13), the family sends v2 to restore the omitted parts, then withdraws v2 (or the Trust declines it) — the app says "withdrawn" / "not approved" while `latestApprovedIndex` says v1 is still the approved version, and MA13 records that the latest approved version is the one the page shows. (A, recommended) tell them: one boolean on the member GET (the data is `latestApprovedIndex`) + one sentence en + hi + a Hindi review + render tests; cost: a copy version and review now, for a surface that is switched off. (B) defer to row `11b-4a`, naming this case in AC16 (1)'s trigger; cost: the family is told "not approved" about a memorial that remains in force, from the day 11b.4a lands unless 11b.4a also edits this screen. Not a Panel question (no new disclosure to a third party; the family is told about its own memorial). Source: edge #9.

- [x] [Review][Patch] R3 [HIGH] Send's catch deletes the photo of a row that has ALREADY committed and releases the idempotency key [`apps/api/src/modules/memorial/handlers.ts:587-605`, `:505`] — `recordResult` (`:589`) sits inside the same `try` as the commit, `settled` is set only after it, so a post-commit failure deletes `putKey` (which the committed row references) and releases the key; a retry then inserts a second version. Reproduced by the peer repro (500, 1 committed row, photo gone, retry -> 201, 2 rows). Fix: a `committed` flag set when `withCompensatingAudit` returns — no photo delete and no `release` after it (AC3's 409 -> refetch recovery already covers the retry); retry `recordResult` once with a short back-off; move the `put` (`:505`) inside the cleanup `try` so a thrown `put` best-effort deletes its key (the lost-acknowledgement orphan). The duplicate-on-release half is the same shape as `contributions/personal-event-handlers.ts` (precedent), only the photo loss is new here. Add the two missing tests (put then failed mutate; recordResult failing after commit). Sources: blind #2 + edge #3 + peer repro #1.
- [x] [Review][Patch] R4 [HIGH] No migration-level policy-regression spec for `memorial_submissions` / `memorial_review_decisions` / `memorial_withdrawals` (checklist family 5 REAL GAP; AC5) [`packages/domain/tests/integration/rls/` — new `memorial-policy-regression.spec.ts`] — 52 sibling `*-policy-regression.spec.ts` exist, none for memorial; the tables appear only in three API specs and a mocked RTBF test. Assert directly: ENABLE + FORCE, RLS positive / negative / fail-closed, the composite supersede FK, `supersedes_uq`, all seven CHECKs (incl. the null-element case of R18), the column-level UPDATE grants, and a LIVE scrub of the reviewer notes under FORCE (the `-279` A12 silent 0-row failure). Source: auditor F1.
- [x] [Review][Patch] R5 [HIGH] Mobile semantic accessibility — family 13 (a) and (d) REAL GAP on the Send-refusal and code-request states [`apps/mobile/app/(memorial)/preview.tsx:95`, `apps/mobile/components/memorial-authorship/HandoverCodePanel.tsx`, `outcome.tsx`] — the refusal container carries `accessibilityLabel` and no `accessible`; there is no `accessible=` and no `AccessibilityInfo` anywhere in the memorial mobile code (I grepped); `accessibilityLiveRegion` is Android-only; the code panel appearing after the 403 and a successful Withdraw announce nothing. Do NOT just add `accessible={true}` to the refusal container — it holds the helpline CTA button, and a grouped container hides the button from focus: drop the container label and announce the refusal text itself (`AccessibilityInfo.announceForAccessibility`, precedent `(claim)/certificate-replacement.tsx:113`). Add a real-component assertion (the mocked `tamagui` maps the label to `aria-label` and never sees `accessible`). Source: auditor F2 / F11.
- [x] [Review][Patch] R6 [MED] The Idempotency-Key survives draft edits, so edited words are silently discarded and the draft cleared [`apps/mobile/lib/memorial-draft.ts:107-114`, `apps/mobile/lib/use-memorial-send.ts:81,107-117`, `apps/mobile/app/(memorial)/index.tsx:39`] — `pending` is kept until a 2xx and nothing clears it when `saveMemorialDraft` changes body / alt text / photo; the server replay is payload-agnostic (`handlers.ts:412-419`). Send times out but commits; the family edits and sends again: the replay returns the OLD result (or a 409 past the TTL), `memorialSendLanded` is true, `landed()` clears the edited draft. Fix: drop `pending` (`dropMemorialSendKey`) whenever the saved content changes, so edited words mint a new key and send as a new version. Sources: blind #5 + edge #4.
- [x] [Review][Patch] R7 [MED] "Retried once" flags never reset [`apps/mobile/lib/use-memorial-send.ts:66,148` (`retriedAfterCode`), `:164,207` (`retried`/`exhausted`)] — after one verified code, any later 403 (the 5-minute elevation lapsed during an edit) goes straight to "call the helpline" for the life of the screen. AC7a: "retries once ... a second refusal after a verified code goes to the helpline" — per Send attempt. Reset on each user-initiated Send/Withdraw; add the second-attempt test. Sources: blind #3 + auditor F8 + edge #11 (three layers).
- [x] [Review][Patch] R8 [MED] "Use the photo I sent before" leaves the picked photo showing, then sends the old one [`apps/mobile/app/(memorial)/photo.tsx:94`, `preview.tsx:59-77`, `use-memorial-send.ts:87-91`] — the button patches only `keepPreviousPhoto: true`; `photoFileName` stays, so photo and preview render the picked photo X while `attempt()` sends `keepPreviousPhoto=true` and no file. The family approves one image and sends another. Fix: clear (and delete the copy of) the picked photo like `without()` does, and preview the kept photo. Source: edge #5.
- [x] [Review][Patch] R9 [MED] The Trust's cure for a mistaken approval (MA16) is unreachable from the admin UI once a newer version exists [`apps/api/src/modules/memorial-review/handlers.ts:246`, `apps/admin/src/modules/memorial-review/MemorialReviewPage.tsx:196`, `packages/domain/src/memorial/review.ts:35`] — the queue lists chain heads only and `canWithdrawApproval` is evaluated for the OPENED id (`latestApprovedIndex(chain) === index`), so with v1 approved and v2 pending / declined, opening the head gives false; v1's id is not shown or linked. MA16 says "whatever newer versions follow it". Fix: the detail response names the withdraw target (id) of the chain and `VersionCard` offers the action there; the API test passes only because it posts the id directly. Source: blind #6.
- [x] [Review][Patch] R10 [MED] `-391` Q4 A not delivered per part: the family cannot see which reason belongs to which part [`apps/mobile/app/(memorial)/outcome.tsx:108`, `packages/ui/src/memorial/presenter.ts`] — all reasons collapse into one `new Set(...)` of "The reason: ..." lines; the marker segment is the single constant `MEMORIAL_OMITTED_KEY`. Ratified: "told in the app what was left out and, for each part, which of these reasons applies" (AC10 / AC1). Carry the reason on each omitted marker (and the photo line); test with TWO omissions of different reasons (the current test uses one). Source: auditor F3.
- [x] [Review][Patch] R11 [MED] Photo stripper: memory amplification, no structural check, residual metadata [`apps/api/src/modules/memorial/photo-metadata.ts:24,61-72,110`] — MEASURED here: a 10 MiB JPEG of `FF 01` pairs between SOI and EOI is accepted (`ok: true`, 10 MiB out) in ~735 ms and raises max RSS ~606 MB (113 -> 719 MB), because every 2-byte segment pushes its own `subarray` view; `SOI + EOI` or `PNG signature + IEND` alone is accepted (no SOF/SOS, no IHDR/IDAT); PNG keeps `iCCP` and every private ancillary chunk (`caBX` C2PA, `iDOT`, `prVW`), JPEG keeps APP0 including a JFXX thumbnail. Fix: coalesce contiguous kept ranges into one copy; require SOF + SOS / IHDR + IDAT; make the PNG list an allow-list; drop JFXX. Orientation / ICC loss stays gated by the device check (R21). Sources: edge #12 + #13, blind #10 + #16.
- [x] [Review][Patch] R12 [MED] A decision can leave out ALL of the alt text while keeping the photo [`packages/contracts/src/memorial/omissions.ts:140-143`] — `nothing_left` is checked for body spans only, so `approved_with_omissions` with alt-text spans covering the whole description and no `photoLeftOut` is accepted (server and admin UI share the validator); it contradicts "alt text required with a photo" and "the photo and its alt text go together". Add an `alt_text_nothing_left` problem (the cure is `photoLeftOut`) + unit test. Source: edge #6.
- [x] [Review][Patch] R13 [MED] AC9 "every hidden bidi control made visible" holds for one block only [`apps/admin/src/modules/memorial-review/MemorialReviewPage.tsx:73-85,250,356`, `packages/contracts/src/memorial/text-classes.ts:14-23`, `apps/mobile/components/memorial-authorship/MemorialText.tsx`] — only `StoredText` goes through `bidiVisible`; the SentencePicker labels (where the reviewer chooses what to cut), `AsApproved` and the omission quote render the text raw, so an unterminated RLO reorders what the reviewer reads at the moment of decision; the class also omits U+200E / U+200F / U+061C. Route every reviewer-read rendering through one helper; extend the class; test with an RLO inside a picker sentence. Sources: blind #11 + edge #7.
- [x] [Review][Patch] R14 [MED] The "Decided" tab shows only the OLDEST 50 and cannot page [`packages/domain/src/memorial/review.ts:124-125`, `packages/contracts/src/memorial/dto.ts`, `apps/admin/src/api/client.ts`] — `ORDER BY s.created_at ASC ... LIMIT` is shared by both views, the query has `view` + `limit` (max 200) and no cursor; past 50 decided heads the newest decisions cannot be listed. Newest-first for `decided` + a cursor (or offset); test with > limit rows. Sources: blind #7 + edge #8.
- [x] [Review][Patch] R15 [MED] Checklist families 2, 3, 5, 12 — REAL GAPS in the tests (never downgraded to a note) [`apps/api/tests/integration/memorial/*.spec.ts`] — (family 3) no non-human / wrong-principal denial on ANY of the four mutation routes (staff token to a member route, member token to a review route, unauthenticated -> 401; Withdraw with no elevation; `decision` / `withdraw-approval` no-key 403 only asserted on GET); (family 12 (a)) the "another family's id -> 404" test uses a second Pariwar (`_fixture.ts:1-3`), so RLS makes it 404 and dropping the chain-membership check would stay green — Task 5.4's same-Pariwar leg is ticked and not done; (family 2) only Send x Send is proven live — decide x Send, decide x family-withdraw, withdraw-approval x Send, and the `23505 -> 409 memorial.try_again` mapping are not; (family 5) the MA15 test (`memorial-gates.spec.ts:83`) is titled "scrubs ... the reviewer's notes" and never creates a decision or withdrawal. Sources: auditor F4, F5, F10, F13.
- [x] [Review][Patch] R16 [MED] Ticked Tasks whose legs are absent or cannot fail [`apps/api/tests/integration/memorial/`, `apps/mobile/tests/unit/memorial-screens-render.test.ts`, `apps/admin/tests/memorial-review-nav.test.tsx`, `scripts/microcopy/memorial.test.ts`] — Task 4.3 "grep test that neither retired consent value appears" does not exist (the two values appear in no new test; also none for "the authorisation and the row commit or roll back together"); Task 5.4 oracle sets (detail / withdraw-approval unknown id, byte-identical 404 bodies, superseded excluded from the queue, `altText` span integration leg, `idempotency_in_progress`, `alt_text_too_long` / `photo_too_large`); Task 6.7 legs (handover-code input label, 44 pt beyond the intro buttons, refusal linked to its field, focus order); AC3 orchestration (`use-memorial-send.ts:107-117`, `index.tsx:29-34`) untested; the "keepPreviousPhoto failed Send leaves the earlier object" test fails before any `put`, so it passes by construction; the nav "absent outside a Pariwar" test swallows its own wait (`findByText(...).catch(() => undefined)`); the microcopy take-down-key test matches key NAMES only. Either add each leg or untick it and say so in the Completion Notes. Sources: auditor F9, F11, F12, F14, F17; blind #9.
- [x] [Review][Patch] R17 [MED-LOW] The audit chain carries an unsalted SHA-256 of the family's Tier-1 words [`apps/api/src/modules/memorial/handlers.ts:521-525` (`body_sha256`)] — the audit chain is append-only and never scrubbed by erasure, and a digest of short or formulaic text is guessable; the house rule in `contributions/personal-event-handlers.ts` is that no Tier-1 text reaches the digest, and no other handler hashes free text (grep: none outside memorial). Drop it or HMAC it with a server key; keep `has_photo` / lengths. Source: edge (smaller items).
- [x] [Review][Patch] R18 [MED-LOW] `memorial_omissions_valid` passes JSON-null `field` / `reason`, and its cast is not order-safe [`packages/domain/migrations/0181_memorial-authorship.sql:41-56`] — VERIFIED live on :5434: `memorial_omissions_valid('[{"field":null,"start":0,"end":1,"reason":null}]')` returns `t` (`NULL NOT IN (...)` is NULL, the `EXISTS` never matches); a non-null bad value returns `f`. Not reachable through the API (Zod + validator), so a backstop gap only (family 5). Also `(e->>'start')::bigint` shares an OR chain with the regex guard, which SQL does not order. Fix with `COALESCE(..., true)` / a `CASE`. `0181` is on this branch only, so edit it before merge, and re-create the function on the shared DBs by hand (drizzle keys on `when`, not content) — otherwise a new migration. Sources: edge #15, blind #12, peer repro #2.
- [x] [Review][Patch] R19 [LOW-MED] Admin form feedback [`apps/admin/src/modules/memorial-review/MemorialReviewPage.tsx:443,513-515,541`, `packages/i18n/locales/{en,hi}/memorial.json`] — a server `memorial_review.invalid_omissions` renders `memorial.decide.invalid` = "These choices cannot be recorded: " with a dangling colon and no reason (the 400's `details.problem` is ignored); `decide.isSuccess` / withdraw success render inside forms that unmount when `canDecide` / `canWithdrawApproval` flip after the refetch, so the reviewer never sees the confirmation. Map `details.problem` to a sentence (en + hi); keep the confirmation outside the form. Sources: blind #13 + edge #16.
- [x] [Review][Patch] R20 [LOW-MED] Mobile screens render nothing when the view is missing, and capture the draft before it exists [`apps/mobile/app/(memorial)/index.tsx:39`, `write.tsx:29-34`, `photo.tsx:36-38`, `preview.tsx:33`, `outcome.tsx:36`] — on a fetch error (`retry: false`) or `{ memorial: null }` each screen returns `null` inside a `headerShown: false` stack: no message, no retry, no exit. Separately `write.tsx` / `photo.tsx` read the saved draft in a `useState` initializer, so a cold mount (deep link / restore — normal navigation keeps the intro's observer alive, per the edge layer) shows an empty box and the first keystroke overwrites the saved draft. Render the header + a retry / helpline line when `view` is null (new copy keys: real-`t()` leg, Hindi review); load the draft in an effect when `view` and `memberId` arrive. Sources: edge #10, blind #4.
- [x] [Review][Patch] R21 [LOW-MED] Row 41 can close without the un-attested device checks, and without the photo bucket [`docs/launch-gate-inventory/inventory-roster.md:737`] — `deferred-work.md` item (16) says Hindi typing with `autoCorrect={false}`, rotated portrait / HEIC (Task 6.6) and TalkBack-Hindi are UN-ATTESTED with "Trigger: before Row 41 closes", but Row 41's `closure_criteria` lists only (a)-(g). Add them, and `MEMORIAL_PHOTO_BUCKET` set in the production environment (the local-disk fallback is deferred R25). Source: auditor F6.
- [ ] [Review][Patch] R22 [LOW] PARTLY ADDRESSED (second review pass, 2026-10-24) — done: the File List entry, the contradictory comment, the `memorialCanSend` sentence; STILL OWED: AC18 — `pnpm ci:local` clean on the COMMITTED tree (run 1 of the working tree was 35/36 jobs — first written as 36/37, a miscount — and only the unit job at `--concurrency=2` was clean; run 2 on the final tree PASSED, 36 jobs green; the committed-tree run is what is owed) and the Niyamavali check (now Row 41 (j)). Records hygiene [story file, `apps/mobile/components/memorial-authorship/useMemorialQueries.ts:5`] — File List omits `packages/domain/tests/integration/member/workplace.spec.ts:375` (disclosed in Completion Notes (vii)); the comment "CR-11b.2a-COMBINED-W3 trigger (iii) — met here" contradicts the AC16 annotation (and the glyph register makes the ambiguous glyph an inversion); checklist family 11 asks for a one-sentence member-terms meaning of `memorialCanSend` ("once the Trust has approved your memorial exactly as you sent it, you cannot send another version here; the helpline is the way to change it") checked against the Niyamavali — add it to the Policy-meaning section; AC18 is not met as written (ledger `2026-10-24f`: `ci:local` 41/42, `wa-signup-step-render.test.ts` unit failure, then a clean re-run of the unit command) — after this review's fixes run `pnpm ci:local` to 42/42 on :5434 and restate it. Sources: auditor F7, F16, F17. ⭐ **CORRECTED — 2026-10-24, third pass (T13 (b)):** "42/42" cannot be reached — `scripts/ci-local.sh` (unchanged on this branch) has **36** `run "…"` jobs and prints the PASSED count of those; the earlier "40/42" / "41/42" figures (Completion Notes, Gates) do not match the script and are ⛔ not relied on. The owed run is **`ci:local` green, 36/36, on the committed tree**. The Niyamavali half is now RUN (Row 41 (j)); only the committed-tree run keeps this item open.

- [x] [Review][Defer] R23 Erasure completeness for a memorial about an erased member — erased-subject guards on Send / `decide` / `withdrawApproval` and the pending queue, `lockMemorialPool` inside `anonymizeMember` (a Send racing the scrub), photo-delete retry, `photo_object_key` never nulled, reviewer `detail` still signing URLs for a deleted object [`packages/domain/src/member/anonymize.ts:179-216`, `apps/api/src/modules/memorial-review/handlers.ts:251-322`, `apps/api/src/modules/memorial/erasure.ts:17-24`] — deferred, latent: NOT reachable on a product path today. Both erasure callers gate on `resolveRtbfLegality` (verified: `rtbf/handlers.ts:103`, `member-data-rights/handlers.ts:1175`) — legal only for a `withdrawn` lifecycle state or a moderation-overlay `terminated`; death is neither (MA15's own warning: the words are kept indefinitely). The edge layer's "legal from any live label" is refuted. The peer repro #4 (a reviewer adds a fresh note after erasure) reproduces but calls `anonymizeMember` directly. Trigger: the family-erasure follow-up (AC16 (7)) or any change that admits erasure of a deceased member. I did NOT prove unreachability for a deceased member who is also overlay-terminated. Sources: edge #1 + #2, blind #14, peer repro #4. ⭐ **CORRECTED — 2026-10-24, third pass (T13 (d)):** "NOT reachable on a product path today" is proven ONLY for a death with no moderation-overlay `terminated`; for a deceased member who is also overlay-terminated, erasure is legal and unreachability is **NOT PROVEN**. That case needs no family session: a reviewer deciding with an internal note after `anonymizeMember` leaves a fresh Tier-1 note the scrub never sees (the peer repro #4 shape). Read the item as "latent, reachability not proven for the terminated-and-deceased case"; the trigger is unchanged.
- [x] [Review][Defer] R24 Orphaned photo after a process crash between `put` and COMMIT (no sweeper; erasure cannot find it, no row holds the key) [`apps/api/src/modules/memorial/handlers.ts:505`] — deferred: needs a bucket lifecycle rule or a reconcile job; the thrown-`put` arm is fixed in R3. Sources: peer repro #3, edge, blind #2.
- [x] [Review][Defer] R25 `MEMORIAL_PHOTO_BUCKET` unset falls back to a container-local disk store (`signedReadUrl` returns `file://...`) [`apps/api/src/deps.ts:612-620`] — deferred, pre-existing pattern: the same env-else-local-fake wiring serves the claim-document, bank-statement, self-verify and helpdesk stores. Mitigated for this surface by R21. Sources: blind #8, edge #14.
- [x] [Review][Defer] R26 Review list / detail cost: one KMS decrypt per row (N+1, up to 200) and per version, serial; a decrypt + audit line on every mobile screen mount (`staleTime: 0` is required by the no-persistence rule); no cap on versions per pool [`apps/api/src/modules/memorial-review/handlers.ts:134-231`] — deferred: low volume until the surface is live; revisit with measured latency. Sources: blind #15, edge (smaller items).
- [x] [Review][Defer] R27 `Intl.Segmenter` grapheme boundaries can differ between the browser and Node (ICU / Unicode version; Devanagari conjuncts, GB9c) so the admin pre-check and the server can disagree [`packages/contracts/src/memorial/omissions.ts:51-60`] — deferred: needs `process.versions.icu` / `unicode` of the production Node build; R19 makes the disagreement legible. Sources: edge #16, blind #13.
- [x] [Review][Defer] R28 A second closed / settled pool for the same deceased makes `resolveMemorialDrive` pivot to the newer pool and hide the first memorial and its draft [`packages/domain/src/memorial/resolve.ts:45-69`] — deferred: needs a live check that a second pool for one deceased can exist. Source: edge #17.
- [x] [Review][Defer] R29 Cross-table state rules (a `trust` withdrawal needs a prior approving decision, a decision and a withdrawal exclude each other) and the single-column `pool_id` / `deceased_member_id` FKs are enforced by handlers under the advisory lock, not by the schema; the Withdraw route writes an audit intent for any id before ownership is checked [`packages/domain/migrations/0181_memorial-authorship.sql:80-92`] — deferred: every writer locks and passes scoped ids; revisit if a second writer appears. Source: blind #12, edge (smaller items).
- [x] [Review][Defer] R30 The counter copy says "letters" but the limit counts code points (a Devanagari word differs by ~1.5-2x) [`packages/i18n/locales/en/memorial.json:22`] — deferred into the non-author Hindi / tone review (AC14, UN-ATTESTED, Row 41 (a) / (c)). Source: blind #18.
- [x] [Review][Defer] R31 R3 residuals the fix does not close [`apps/api/src/modules/memorial/handlers.ts` `MEMORIAL_SEND_IDEMPOTENCY_TTL_SECONDS = 300`] — deferred: (a) past the 300 s claim TTL a still-pending claim reads as expired, so a retry with the same key is ACQUIRED and inserts a second version, and the mobile `memorialSendLanded` check never runs — the 409 recovery works only inside the TTL; the house shape for a client that persists its key across retries is 24 h (`contributions/personal-event-handlers.ts` family), but AC3 and AC7 were written around 300 s, so changing it is a design choice, not a patch; (b) a COMMIT whose acknowledgement is lost makes `closeScopeTx` throw, `committed` stays false, and the photo is deleted for a row that may exist (the same class as R3, ambiguous commit; needs a read-back); (c) if the first `recordResult` landed but the client saw an error, the retry's `UPDATE ... WHERE status='pending'` matches 0 rows and the request answers 500 although the result is recorded (a later retry replays 200 — harmless). **Trigger:** the family-facing retry telemetry once the surface has traffic, or the first reported duplicate version. Source: fix-diff review (backend).

Dismissed as noise (8): MA19 "verify leg" bypass (blind #1 — REFUTED: `MemberStepUpVerifyRequest` is `{ otp }` `.strict()` and `stepUpVerify` takes its context from the stored OTP row, `member-otp.service.ts:93`; the edge and auditor layers reached the same result); the column-level UPDATE grants letting `twt_app` overwrite the words (ratified: MA15 / Trap 10, the 0092 precedent); `{ err }` in the photo-URL and entry-probe log lines (ids only; the probe fails closed by design); a missing `authorisationCopyVersion` answering 409 rather than 400 ("read it again" is AC4's intent); uppercase UUID params (neutral 404, ids are lower-case by convention); `MEMORIAL_AUTHORSHIP_ENABLED` accepting only `1` (fail-closed default); `outcome.approved` naming the Sahyog Vivran page before 11b.4a (gated by Row 41 (b)); the recipient being resolved at Send and one code covering Send / Withdraw for 5 minutes (by design: `-391` Q1 A / MA5).

**Fix round — 2026-10-24 (BigDev: "apply every patch").** (⭐ Third pass, T13 (c): read "R1-R22" as R1–R21 applied and R22 PARTLY addressed — R22 stays open on the committed-tree `ci:local` run.) R1-R22 are applied in the working tree on this branch (uncommitted; R1 DECIDED B, R2 DECIDED A). Four agents with disjoint file ownership did the work (backend source; DB specs + API tests; mobile; admin + permission text + records), then two read-only fix-diff reviews (backend 26 files, UI 35 files) re-read the patches. Beyond R1-R22, the round found and fixed: (1) the `23505 -> 409 memorial.try_again` mapping in Send tested `err.code` only, but drizzle wraps the pg error (`err.cause.code`), so a Send that lost the unlocked-insert race answered a 500 — a defect in the story's own Trap 12 handling that no earlier layer saw because no test drove the race; fixed with the house `isUniqueViolation` (`apps/api/src/modules/memorial/handlers.ts`); (2) the `(j)` no-scope leg of the new policy-regression spec was vacuous on 2 of 3 tables (and a WHERE-bound UPDATE must also pass the SELECT policy) — rebuilt with a bare UPDATE per table, with teeth proven by making each policy fail open; (3) `memorial_omissions_valid` accepted unbounded offsets after the R18 rewrite — capped at 2147483647; (4) the kept-photo fallback was sticky after a signed URL expired; (5) after the first of two approvals was withdrawn the admin form stayed locked on the second; (6) `isolateMemorialBidi` wrapped every plain segment (now only text holding a direction control); (7) error live regions were hard-coded `polite` (now the repo's `announcementPlan` — assertive for errors); (8) the outcome screen's missing-view line claimed a draft was safe on the phone after a Send (own `body_outcome` variant); (9) Hindi `earlier_approval_stands` said "still the same" instead of "still approved"; (10) edit buttons stay enabled while a Send is in flight (now disabled); plus dead key `send.error_a11y` removed, glyph-register fixes, test titles/duplication. **Peer repro** (`review-repro.spec.ts`, a peer session's untracked file): re-run on :5434 before the fixes #1-#4 all reproduced; after them #1, #2 and #3 fail by design (the defects are fixed) and #4 still reproduces (deferred R23, not reachable on a product path). The file asserted the old behaviour, so it was MOVED out of the test glob to the session scratchpad (`.../scratchpad/peer-repro-moved/review-repro.spec.ts`), not deleted; its regression value lives in `send-commit.spec.ts` and `memorial-policy-regression.spec.ts`. **Hand-applied database change:** `memorial_omissions_valid` was edited in place in `0181` (the migration is on this branch only; `_journal.json` untouched) and re-created by hand with `CREATE OR REPLACE FUNCTION` on :5434 only — every other database that already applied `0181` (:5432, :5433, any shared or CI database, any other worktree's) must have the function block re-created by hand before the R18 / cap legs of `memorial-policy-regression.spec.ts` can pass there.

**Second pass — 2026-10-24, same day (`bmad-code-review 11b.4` re-run on the round-2 delta: 28 files, 1,360 lines; Blind Hunter on the delta alone, Edge Case Hunter with project read access and read-only SELECT probes on `:5434`, Acceptance Auditor against the spec and checklist; BigDev chose "re-run code review").** No blocker and no high-severity issue. 0 decisions. 11 patches, all applied (S1–S11); 2 deferred (R32, R33); 10 dismissed. The Acceptance Auditor was RIGHT that Status `done` outran AC18 — see S11.

- [x] [Review][Patch] S1 [MED] A Send in flight was not tied to its screen [`apps/mobile/lib/use-memorial-send.ts`, `lib/memorial-draft.ts`, `app/(memorial)/preview.tsx`] — `landed()` cleared the WHOLE draft unconditionally and navigated globally, and hardware back / iOS swipe-back reached Write and Photo during the POST (an edit there dropped the kept key, and Photo's `releasePicked` can delete the file the upload reads); a stale Preview could also show words other than the ones `attempt()` sends. Now: the draft's content signature is snapshotted before the request and the draft is cleared only if the saved content still equals it (a newer draft and its photo copy are never touched); the outcome navigation happens only if the starting screen is still mounted AND in front and nothing newer was written; hardware back is consumed and the iOS gesture is off ONLY while sending ("Save and come back" stays); Preview re-reads the draft on every focus. Sources: edge #1 + #2, blind #2.
- [x] [Review][Patch] S2 [MED] A failed Withdraw told the family "We could not send it … Your writing is safe on this phone" [`apps/mobile/app/(memorial)/outcome.tsx`, `packages/i18n/locales/{en,hi}/memorial.json`] — the words are with the Trust and nothing is being sent. New `outcome.withdraw_failed` (en + hi, agent-drafted, UN-ATTESTED): it could not be taken back just now, it is still with the Trust, try again or call the helpline. Source: blind #1.
- [x] [Review][Patch] S3 [LOW-MED] The intro still carried the draft-safety line after a Send had landed [`apps/mobile/app/(memorial)/index.tsx`, `MemorialViewMissing.tsx`] — the intro cannot know (the draft key needs `view.driveId`), so it now uses the no-draft-claim variant. Sources: edge #3, auditor #8.
- [x] [Review][Patch] S4 [LOW-MED] Tests that could not fail [`apps/mobile/tests/unit/memorial-screens-render.test.ts`, `memorial-a11y-scan.test.ts`] — "the value comes from the announcement plan" passed on a hard-coded literal (the real plan is platform-independent) and "the outcome line makes NO claim about the phone" only compared lengths. Now the plan is mocked to distinguishable values the screens must follow, an AST rule forbids a string literal inside any `accessibilityLiveRegion` value (with planted violations), and the phone-safety wording is matched negatively in en and hi. Sources: blind #5 + #15, edge #6, auditor #3.
- [x] [Review][Patch] S5 [LOW-MED] The "earlier version still stands" sentence (R2) was never ANNOUNCED — checklist family 13 (d) [`apps/mobile/app/(memorial)/outcome.tsx`] — now spoken with the state line as ONE announcement when it appears after mount. Source: auditor #5.
- [x] [Review][Patch] S6 [LOW] The photo screen's live regions had no tests [`apps/mobile/app/(memorial)/photo.tsx` testIDs + tests] — permission-denied and unreadable-file notices (assertive) and the alt counter (polite). Source: auditor #7.
- [x] [Review][Patch] S7 [LOW] Glyph-register slips [`photo.tsx:4,67`, Row 41 (f) in `docs/launch-gate-inventory/inventory-roster.md`, `apps/admin/tests/memorial-review-nav.test.tsx:2`] — each `⛔` now followed by a negator (Row 41 (f) had inverted "⛔ production code moves a pool to `closed`" into its opposite). Sources: auditor #4 + #6.
- [x] [Review][Patch] S8 [LOW] Over-limit counters were polite and the alt counter clamped to "Room for about 0 more letters" [`apps/mobile/app/(memorial)/write.tsx`, `photo.tsx`] — over the limit the line is an error (assertive via the plan); new `photo.alt_over_limit` (en + hi, UN-ATTESTED). Source: blind #12.
- [x] [Review][Patch] S9 [LOW] A failed kept-photo URL never asked for a fresh one [`apps/mobile/components/memorial-authorship/MemorialKeptPhoto.tsx`, `preview.tsx`, `photo.tsx`] — the view is refetched ONCE per failed URL (never a loop), the fallback line stands in meanwhile. Source: edge #5.
- [x] [Review][Patch] S10 [LOW-MED] Admin withdraw banner did not name its version, and a failed v2 withdrawal's alert sat beside the new form for v1 [`apps/admin/src/modules/memorial-review/MemorialReviewPage.tsx`, `i18n-en.ts`] — the success and error lines now read "Approval of Version N withdrawn." / "Could not withdraw the approval of Version N. …". Plus two test-fixture leaks: `resultStore` could stay armed after an early failure in `send-commit.spec.ts` (proved: with the hooks off the next test failed), and `createReviewHarness().close()` skipped `pool.end()` when cleanup threw. Sources: blind #9, edge #4 + #6.
- [x] [Review][Patch] S11 [MED, records] Status `done` outran AC18 — the Acceptance Auditor was right [story `Status`, `sprint-status.yaml`, R22, Row 41] — AC18 closes only on a green `ci:local` after the LAST COMMIT and nothing is committed; the 5.11 precedent set `done` only after the committed-tree run. Status is back to `review` (ledger `2026-10-24h` supersedes `-24g`'s `done`), R22 is reopened as partly addressed, Row 41 gains (j) the Niyamavali check (it was "owed" with no criterion), the "never serialise `reason` publicly" constraint is on 11b-4a's trigger, and a job-count miscount in my own records ("36/37", really 35/36 jobs) is corrected in place. Source: auditor #1 + #2 + #9 + #10.

- [x] [Review][Defer] R32 Plain family text is no longer isolated from the omitted-part marker next to it [`packages/ui/src/memorial/bidi.ts`] — deferred: UAX#9 neutral / weak-type resolution can still cross a segment boundary for a RIGHT-TO-LEFT-script quote; the shipped locales are en and hi. **Trigger:** a right-to-left locale or a report. Source: blind #6.
- [x] [Review][Defer] R33 The Photo screen's `releasePicked` can delete a photo file that a Send started from a Preview since left through "Save and come back" is still uploading [`apps/mobile/app/(memorial)/photo.tsx`] — deferred: needs a quick re-entry to Photo during the POST; the upload would fail and the family is told to try again. **Trigger:** the first report, or tracking in-flight uploads app-wide. Source: agent B's report.

Dismissed as noise (10): two assertive lines firing together on a final wrong code (UNREACHABLE — `notVerified` comes from a wrong code where nothing is retried, `still_refused` only after a verified code, and the hook clears `notVerified` before each attempt; the edge layer confirmed no two assertive regions coexist); `0181` edited in place (disclosed; nothing is in production, the hand-applied function is recorded); the admin nav test losing a sibling assertion (the "Sign out" wait renders only when authenticated and the link gating is synchronous); the cross-family case "moved" out of `actor-denial` (it exists in `member-memorial.spec.ts`); a stale OpenAPI description (regenerated, `contracts-determinism` green); the deleted `send.error_a11y` key (no references remain; parity 98/98); the photo screen "ignoring" a new pick when `keepPreviousPhoto` is set (`pick()` clears it); the DB offset cap versus the API schema (`validateMemorialDecision` refuses out-of-range spans before the DB); undefined helpers in the new specs (all exist; tsc and lint green); the Hindi register of `earlier_approval_stands` (left to the Hindi review, UN-ATTESTED).

**Third pass — 2026-10-24, same day (`bmad-code-review 11b.4` on the WHOLE uncommitted fix-round delta: `git diff HEAD` code only + the 14 untracked files, 58 files, 9,473 lines; HEAD `21284bff`; BigDev chose this scope and confirmed the tree was settled).** Blind Hunter (diff only), Edge Case Hunter (project read access; one `BEGIN … ROLLBACK` SELECT probe on `:5434`), Acceptance Auditor (spec + checklist + records delta); all read-only, no layer failed, `git status --porcelain` unchanged after they finished (65 entries). The reviewer re-read each kept finding at its cited code before classifying. Panel-routing gate applied: nothing goes to the Panel (T1 is the wording of a ratified policy, BigDev's call as R1 was). Checklist verdicts (auditor): 1, 2, 3, 5, 12, 13 (a)/(c) covered by test; 13 (b) not applicable; 13 (d) covered in jsdom, device proof gated by Row 41 (h); **10 and 11 REAL GAP** (T13).

- [x] [Review][Patch] T1 [LOW] The v2 permission sentence may promise more than MA16 allows — DECIDED (B) (BigDev, 2026-10-24, "2"): add a clause that the Trust may still withdraw its own approval, in v2 ITSELF — v2 (`2026-10-24.v2-pending-hi-review`) is uncommitted, has never been shown (the surface is off) and its Hindi review has not happened (`hiReviewed: false`), so ⛔ no v3 and ⛔ no extra Hindi review; the clause names MA16's own grounds (read the reason codes, ⛔ not paraphrased from memory), en + hi; move the test pin only if the text is hash-pinned; also reword `outcome.earlier_approval_stands` so it no longer contradicts the "Write again" offered beside it (UN-ATTESTED copy, Hindi review). The reviewer's first statement of (B)'s cost ("a v3 id, another Hindi review") was wrong and was corrected before the decision. The analysis that led to the decision: `packages/domain/src/memorial/authorisation-copy.ts` v2 reads "the helpline will not remove it at anyone else's request", but MA16 records that a family's call about a child's name may still prompt the reviewer's OWN withdrawal on `identifies_a_child`, and `-391`'s not-covered note keeps the Trust's own removal. Related: `outcome.earlier_approval_stands` on `withdrawn` says "To change it, the nominee can call the helpline" while "Write again" is offered on the same screen. (A) keep — the Trust's own withdrawal is not "removal at someone's request"; the tone review checks it; cost: a relative's call that leads to a withdrawal reads as the promise broken. (B) add a clause that the Trust may still withdraw its own approval (e.g. a child named) — cost: a v3 permission-text id (en + hi), another Hindi review, the version pin moves. (C) keep the sentence, and add an accuracy-against-MA16 check to the tone-review row — cost: the question stays open until that review. Not a Panel question: the policy is ratified (`-395`, `-391`); this is whether a sentence states it accurately. Source: auditor.

- [x] [Review][Patch] T2 [MED-HIGH] The kept-photo "refetch once per URL" guard never stops: every refetch brings a NEW V4 signed URL [`apps/mobile/components/memorial-authorship/MemorialKeptPhoto.tsx:33-39`; `packages/platform-adapters/src/memorial-photo-storage/gcs.ts:52-56`] — for any failure that is not a lapsed URL (object gone, bytes that will not decode, a slow-link timeout) `onError` → refetch → new URL → `onError` loops without end, each turn a member GET with up to three KMS decrypts and two audit lines. Bound it per mount (at most one refetch per mounted component, or one per N seconds), not per URL string; add the "every URL fails" test. Source: edge #1 (verified: the V4 URL embeds its signing time).
- [x] [Review][Patch] T3 [MED] The kept Idempotency-Key is not age-aware, so three paths create a duplicate version [`apps/mobile/lib/use-memorial-send.ts:152-170`, `apps/mobile/lib/memorial-draft.ts:135-153`] — (a) a GENUINE `409 idempotency_in_progress` (the first request still running after a network drop; `races.spec.ts` proves the server answers it) is followed by `dropMemorialSendKey`, so the next press sends under a fresh key and duplicates the version when the first commits; (b) a Preview left mounted for more than an hour sends with the kept key after the hourly vacuum deleted the completed claim (`apps/jobs/src/boot.ts` `VACUUM_CRON`), so the claim is acquired again — only the intro checks `memorialSendLanded`; (c) past 300 s a claim left `pending` after a post-commit failure is re-acquired (R31 (a)). Fix: store the key's mint time in `pending`; on a 409 that has not landed, KEEP the key while it is younger than the TTL and say it is still being sent; before reusing any kept key older than the TTL, refetch and run the landed check first (as the intro does). AC3's "otherwise mint a new key" needs a dated AMENDED note. Narrows R31 (a). Sources: edge #2, #3, #4; blind #1 (b).
- [x] [Review][Patch] T4 [MED] A Send that HAS committed answers 500 and tells the family "We could not send it" [`apps/api/src/modules/memorial/handlers.ts:612-627,644`] — when both `recordResult` attempts fail (or the first's acknowledgement is lost and the retry's `WHERE status = 'pending'` matches 0 rows → `IdempotencyKeyNotClaimedError`) the 500 propagates after COMMIT. Once `committed` is true, answer 201 and log the failure (the claim left `pending` still answers a same-key replay with 409, which the app resolves by refetch — T3); update `send-commit.spec.ts`, which pins 500. Sources: blind #1 (a), edge #8.
- [x] [Review][Patch] T5 [MED] R7's reset reopens the SMS round trip AC7a forbids [`apps/mobile/lib/use-memorial-send.ts:194-199`, `:246-251`] — `send()` / `run()` clear `retriedAfterCode` / `retried` / `exhausted` unconditionally, and `still_refused` returns the phase to `idle` with Send enabled, so the next press after a refusal-after-a-verified-code texts the nominee again. AC7a: "a second refusal after a verified code goes to the helpline (⛔ never another SMS round trip)". Fix: `still_refused` / `exhausted` is sticky for the screen's life; the "retried" memory is cleared only after a SUCCESSFUL attempt (R7's case: an elevation that lapsed after a send that worked). Test: verified code → 403 → press Send again ⇒ no second `otp.send`. Source: auditor.
- [x] [Review][Patch] T6 [MED] Write and Photo read the draft once, so a stale screen in the stack overwrites a newer draft [`apps/mobile/app/(memorial)/write.tsx:37-40`, `photo.tsx:48-49`, `preview.tsx:54-56`] — Preview → "Change the words" PUSHES a second Write; going back to the first and typing saves the pre-edit body over the edit. After a 2xx, `router.replace` swaps only the Preview, so back reaches Write / Photo showing sent words, and a keystroke re-creates a draft from them (the intro then offers resume). Also: a Send that lands while the Preview is behind another screen clears the draft and leaves the Preview on empty words when it comes back to the front. Fix: re-read the draft on focus in Write and Photo (as Preview does, P1 (d)); after a landed Send reset the memorial stack to the outcome; on focus with phase `sent`, go to the outcome. Sources: edge #5, blind #11.
- [x] [Review][Patch] T7 [MED] The Decided tab is ordered by SENT date, not decision date [`packages/domain/src/memorial/review.ts:105,129`; `apps/admin/src/api/hooks.ts` comment] — `s.created_at DESC` puts a version sent months ago and decided today deep in the list; the pending view is oldest-first, so reviewers decide the oldest first and those sink. R14's purpose ("the newest decisions were unreachable") is half met. Order `decided` by the head's decision / withdrawal time DESC (tie-break `submission_id`); fix the R14 test that sorts by `sentAt`; supersede the AC9 R14 amendment's "`created_at DESC`" with a dated note. Sources: blind #3, edge #6, auditor.
- [x] [Review][Patch] T8 [MED] Over-limit errors are not linked to their field, and they are assertive on every keystroke [`apps/mobile/app/(memorial)/write.tsx` `counterLive`, `photo.tsx` `altCounterLive`; `memorial-screens-render.test.ts` R16 "nothing to link"] — AC13 / AC7 ("error text linked to its field"; Task 6.7 ticked): S8 made the counters errors, but neither `memorial-body` nor `memorial-alt-text` carries that text, and the test "never render a Send refusal (nothing to link)" ignores the over-limit error on the same screen. And as an assertive live region the counter interrupts TalkBack on every character typed past the limit. Fix: the counter stays polite; crossing INTO over-limit is announced once (assertive); the over-limit text is linked to its input; fix the vacuous test. Source: auditor (checklist family 13 (d)).
- [x] [Review][Patch] T9 [LOW-MED] The R11 allow-list drops colour data [`apps/api/src/modules/memorial/photo-metadata.ts:33,154,202`] — JPEG APP2 `ICC_PROFILE` and APP14 Adobe, PNG `iCCP` / `gAMA` / `cHRM` are dropped, so a Display-P3 iPhone photo renders washed out and an Adobe-transform JPEG can decode with wrong colours. Keep them (colour data, not metadata about a person); and R11's "ICC loss stays gated by the device check" was never in Row 41 (h) — annotate R11. Sources: blind, edge #11, auditor.
- [x] [Review][Patch] T10 [LOW-MED] Tests that cannot fail [`apps/mobile/tests/unit/memorial-screens-render.test.ts:86-91,735`; `apps/api/tests/unit/memorial-photo-metadata.test.ts:130-144`; `apps/api/tests/integration/memorial/memorial-gates.spec.ts` (Task 4.3 "together"); `apps/api/tests/integration/memorial/_fixture.ts` (`pg_stat_activity` wait); admin `details.problem`] — (a) "with the real plan" runs against the mocked `announcementPlan` (use `vi.importActual` for that test); (b) the amplification bound is 1,500 ms where the old walk took ~735 ms, and the input is refused by the no-scan rule before any range copy — assert the kept-range count (or memory), and add the 10 MiB run WITH a frame and scan; (c) the "commit or roll back together" test refuses before any INSERT — make a write fail after the authorisation is recorded, or retitle and untick; (d) the "parked on the insert" wait counts any backend on the database — filter to the test pool's own backends; (e) no integration test pins `details.problem` on `memorial_review.invalid_omissions`, which R19's admin sentence reads. Sources: blind #6, #9, #14, #16; edge #10.
- [x] [Review][Patch] T11 [LOW] The a11y scan treats a labelled NESTED `Text` as an accessibility element [`apps/mobile/tests/unit/memorial-a11y-scan.test.ts` `ACCESSIBLE_BY_DEFAULT`; `apps/mobile/components/memorial-authorship/MemorialText.tsx`] — RN flattens nested Text into its parent, so `render.omitted_a11y` on the inner `<Text>` is never announced (the visible marker is read, so the harm is small). Drop the dead label and make the scan flag a labelled Text nested in Text / Paragraph (planted case). Source: auditor (family 13 (a)).
- [x] [Review][Patch] T12 [LOW] Small UI seams [`apps/mobile/components/memorial-authorship/MemorialViewMissing.tsx` + call sites; `apps/mobile/app/(memorial)/outcome.tsx:~85,139-141`; `apps/admin/src/modules/memorial-review/MemorialReviewPage.tsx` `ActionFeedback`] — (a) Retry after a failed GET shows no progress (`isPending` stays false on a refetch; use `isFetching`); (b) `photoLeftOutReason` is passed into the presenter but the screen renders `view.photoLeftOut.reason` — one source; (c) a failed decision's alert stays beside a later successful withdrawal (reset the other mutation on each action). Sources: edge #16, blind #18, #20.
- [x] [Review][Patch] T13 [LOW-MED, records] Closure honesty — checklist families 10 and 11 REAL GAP [story Completion Notes / R22 / R23, `deferred-work.md` R24, `docs/launch-gate-inventory/inventory-roster.md` Row 41] — (a) R24's trigger names Row 41, but Row 41 has no criterion for the orphan sweeper / lifecycle rule (the class R21 fixed); (b) the Completion Notes still say "40/42" / "41/42" and R22 asks for "42/42" while `scripts/ci-local.sh` reports ~36 jobs — one count, from the script; (c) R22 is unticked while the fix-round paragraph and Completion Notes say "R1–R22 applied" — say R1–R21 + R22 in part; (d) R23 says "NOT reachable" and "unreachability not proven" for the same case — the reviewer path (a decision with an internal note after `anonymizeMember`) needs no family session; trace it or say "not proven"; (e) the `memorialCanSend` Niyamavali check is recorded "NOT RUN (corpus not present)", but `docs/legal/niyamavali{,.hi}.md` is in the MAIN checkout and the story ran MA19's check there — run it and record the result (the auditor's grep found only pre-`-162` prose, `niyamavali.md:157,331`). Source: auditor.

- [x] [Review][Defer] T14 A COMMIT whose acknowledgement is lost reads as "not committed" [`apps/api/src/modules/memorial/handlers.ts:605-612,631-644`] — deferred, latent: the photo the row references is deleted and the claim released; needs connection loss exactly at COMMIT; the same shape as every `withCompensatingAudit` caller. T3's landed check narrows the duplicate half. Sources: blind #2, edge #7.
- [x] [Review][Defer] T15 Offset paging can SKIP a row (not only repeat one), and "Load more" fails past offset 10,000 [`MemorialReviewPage.tsx` `distinctItems`, `hooks.ts` `getNextPageParam`, `packages/contracts/src/memorial/dto.ts`] — deferred: disclosed in the AC9 R14 amendment; needs a second reviewer acting between two "Load more" clicks. Trigger: concurrent reviewers, or > 10,000 rows — then a keyset cursor. Sources: blind #4, edge #9, #15.
- [x] [Review][Defer] T16 The idempotency replay ignores the payload; R6 protects only a client that drops its key on an edit [`apps/mobile/lib/memorial-draft.ts`] — deferred, house shape (every keyed store); trigger: a second client (web), or a request-hash column in `idempotency_keys`. Source: blind #10.
- [x] [Review][Defer] T17 `memorialSendLanded` checks "different", not "newer" — a submission from a SECOND phone in the same session makes the intro clear this phone's unsent draft [`apps/mobile/lib/memorial-draft.ts:151-153`, `app/(memorial)/index.tsx:31-37`] — deferred: needs the nominee signed in on two phones. Trigger: a report, or multi-device sessions. Source: edge #13.
- [x] [Review][Defer] T18 Two "earlier version" sentences can show together with no version named (v1 approved-with-omissions stands, v2's approval withdrawn by the Trust, v3 withdrawn by the family) [`apps/mobile/app/(memorial)/outcome.tsx:93,114-117`] — deferred into the non-author Hindi / tone review (both lines are UN-ATTESTED copy; Row 41 (a) / (c)). Source: edge #14.

Dismissed as noise (8): the ESM spy in `send-commit.spec.ts` possibly not reaching the store (the `always` leg uses the same spy and would fail); new required fields breaking older clients (no build with the memorial surface has shipped; the surface is off); the omitted-part `reason` reaching a public render (already on row 11b-4a's trigger, S11); the Withdraw audit intent before ownership (R29, deferred); Retry with no session (the root layout's sign-in guard leaves the stack); an orphan from a `put` that only looked failed (R24, deferred); a crafted PNG with a second IHDR (crafted client only, its own memorial, the reviewer sees it broken; T2 removes the loop it fed); `0181` edited in place (disclosed in the ledger; no database outside this branch applied it, the second pass dismissed it the same way).

**Third-pass fix round — 2026-10-24 (BigDev: "1", apply every patch; T1 DECIDED (B)).** T1–T13 applied in the working tree (uncommitted) by three agents with disjoint file ownership (backend: api / domain / contracts / platform-adapters / openapi; mobile: apps/mobile, the `memorial` copy, microcopy, packages/ui; admin: apps/admin + the permission text) and the reviewer (records, T13). Each agent proved its fixes bite by reverting each one and seeing tests fail, then restoring (byte-identical, `cmp` / grep); `git status --porcelain` unchanged at 65 entries afterwards. Their runs: api — memorial integration on `:5434` 7 files 94/94, api unit 709 passed, contracts 1533/1533, domain memorial 51/51, `contracts:check-openapi-determinism` green (`openapi/v1.yaml` regenerated: one description line, T7); mobile — whole suite 90 files 1673 passed, typecheck clean (⚠ no `.expo/types` in the worktree, so typed routes are not checked); `scripts/microcopy` 435 passed + `check.ts` gate; i18n 116 passed + parity; ui 279; admin — memorial tests 46/46, typecheck clean. ⚠ `ci:local` NOT yet re-run on this tree. **What these supersede, in part (each kept as written above):** R7's unconditional per-press reset (→ T5: a refusal after a verified code is sticky; the "retried" memory clears only after a success — AC7a holds again) ⚠ *(CORRECTED by the fix-diff review, V2: as built, T5 also kept the memory after a NON-403 outcome, which brought back R7's lapse dead end — "AC7a holds again" overstated it; V2 clears the memory on any non-403 answer to the code-verified retry)*; R11's PNG / JPEG allow-lists (→ T9: ICC `APP2`, Adobe `APP14`, `iCCP` / `gAMA` / `cHRM` kept; R11's "ICC loss stays gated by the device check" is moot, and Row 41 (h) now checks a Display-P3 photo instead); S8's assertive counters (→ T8: the counter is polite; the crossing is announced once and linked to its field); R14's order (→ T7, the AC9 note); S9's "refetch ONCE per failed URL" (→ T2: once per mounted component — every refetch brings a new signed URL); R3's "the 500 propagates" after a failed `recordResult` (→ T4: a committed Send answers 201); R31 (a) is NARROWED by T3 (the app checks a kept key past the TTL before reuse), ⛔ not closed on the server. New copy (UN-ATTESTED, the 2026-10-24 tone-review row): `send.still_sending`; `outcome.earlier_approval_stands` reworded + `outcome.earlier_approval_stands_helpline_only`; `render.omitted_a11y` removed; the permission text v2 gains its T1 sentence (still `2026-10-24.v2-pending-hi-review`, `hiReviewed: false`; v1 byte-unchanged).

**Fix-diff review of the third pass — 2026-10-24 (the T1–T13 patch diff alone: 37 files, 3,027 lines, built against the pre-fix tree; Blind / Edge Case / Acceptance Auditor, read-only; no layer failed).** 1 decision, 14 patches, 2 deferred, 6 dismissed. Checklist (auditor): family 2 REAL GAP (V3), family 10 REAL GAP (V2's record, V1's MA8, V15); 8, 11, 13 (a)/(d) covered; 3, 5, 7, 12 untouched.

- [x] [Review][Patch] V1 [MED] T9 keeps colour data AS RECEIVED, and MA8 is not amended — DECIDED (A) (BigDev, 2026-10-24, "1"): keep T9; a dated MA8 AMENDED note (colour segments kept: APP2 `ICC_PROFILE`, APP14 `Adobe`, PNG `iCCP` / `gAMA` / `cHRM` / `cICP`); record the residual (a crafted profile carries only what the family itself put in its own photo); add `cICP`. The analysis that led to the decision: [`apps/api/src/modules/memorial/photo-metadata.ts` (APP2 `ICC_PROFILE`, APP14 `Adobe`, PNG `iCCP` / `gAMA` / `cHRM`)] — MA8 still says the stripper removes "JPEG APP1–APP15 + COM". A kept ICC profile carries a creation date-time and free-text tags (`desc`, `cprt`, `dmnd` / `dmdd` — device maker / model descriptions; PNG `iCCP` a free-text name), only the identifier is matched, and the tests use placeholder bytes. An iPhone's Display-P3 profile is Apple's generic one, but a crafted file can carry anything behind the prefix. Also missed: PNG `cICP` (HDR / wide gamut). (A) keep T9 + an MA8 AMENDED note + record the residual (a crafted profile is the family's own photo) + add `cICP`; (B) keep colour but NORMALISE — validate the ICC header and replace the profile with a canonical one for its colour space (or drop the text tags) — more code, a real-profile fixture; (C) revert T9 — strip colour again, accept washed-out P3 photos, record the colour shift as a Row 41 (h) device check. Not a Panel question: no third party's data, MA8 is an author-commit (`-398`). Sources: blind, edge, auditor.

- [x] [Review][Patch] V2 [MED] T5 overshoots: the "retried after a code" flag survives a NON-403 outcome, so R7's lapse dead end is back [`apps/mobile/lib/use-memorial-send.ts` `confirmCode` / `landed`, `useHandoverGatedAction`] — a verified code followed by `try_again`, `still_sending`, `authorisation_outdated`, a failed pre-send refetch (or Withdraw's `onRefused`), then a lapse ⇒ the next 403 goes straight to `still_refused` with no new code; the diff deleted R7's own test and pinned the opposite. Any non-403 answer to the code-verified retry proves the step-up passed: clear the flag there; only a 403 to THAT retry is sticky. Restore R7's test. Correct T5's record ("AC7a holds again with R7's case kept" overstated). Sources: blind, edge, auditor (all three).
- [x] [Review][Patch] V3 [MED] T3 measures freshness from MINT time, but the server claims at the first POST that reaches it [`apps/mobile/lib/memorial-draft.ts` `mintedAt` / `memorialSendKeyIsFresh`, `use-memorial-send.ts` pre-send + 409 branches] — a 403 → OTP wait (up to ~5 min) or an offline first press, then a retry that claims late: a 409 the phone reads as "past the TTL" drops a key whose claim is by construction still live (the server re-acquires claims older than 300 s rather than answering 409), so the next press duplicates the version. Re-stamp the time immediately before EVERY POST under the kept key (`lastPostedAt`), judge freshness from it; test the OTP-delay leg. Sources: blind, edge, auditor (family 2 REAL GAP).
- [x] [Review][Patch] V4 [MED] T3's pre-send check mints a key from a view with NO memorial [`apps/mobile/lib/use-memorial-send.ts:171-178`] — `{ memorial: null }` (MA17 switch off, or a drive no longer resolved) ⇒ a key with `latestSubmissionIdAtSend: null` is saved; later the intro's `memorialSendLanded({…null}, v1)` is true and `clearMemorialDraft` deletes the family's unsent words; the null view also unmounts the Preview mid-attempt. If the refetched view has no memorial or a different `driveId`, send nothing, keep the old key, show `send.try_again`. Source: edge.
- [x] [Review][Patch] V5 [MED-LOW] T3's pre-send GET has no time bound and can join a hung in-flight view fetch [`use-memorial-send.ts` `refetchView`] — the screen stays on "Sending…" with Back consumed. Race it against a bound (house rule: refetch joins a hung fetch — race a bound). Source: edge.
- [x] [Review][Patch] V6 [MED-LOW] T12 (c) resets the OTHER admin mutation even while it is still PENDING [`apps/admin/src/modules/memorial-review/MemorialReviewPage.tsx` `onStart`] — its answer is lost and its form unlocks (double submit). Disable both actions while either is pending, and reset the other only when it has settled; test. Sources: blind, edge.
- [x] [Review][Patch] V7 [LOW] T1 wording seams [`packages/domain/src/memorial/authorisation-copy.ts` v2 en + hi, `memorial-status.test.ts`] — the new sentence sits between the take-down sentences and "Often a small change is enough.", so the close reads as a remedy for the Trust's grounds (AC4 M2 pairs it with the helpline): move the Trust sentence AFTER the close; pin the four grounds against `MEMORIAL_REVIEW_REASONS` (one phrase per code), not four free literals; make the file's own "a changed review mints v3, never an edit here" comment state the one dated exception (v2 amended before its first commit, never served). Sources: auditor, blind.
- [x] [Review][Patch] V8 [LOW] The over-limit line is announced at MOUNT when a saved draft is already over the limit (and again for each pushed Write) [`apps/mobile/components/memorial-authorship/useMemorialAnnounce.ts` `useMemorialOverLimitAnnounce`] — skip the initial state; announce only a crossing after mount. Sources: edge, blind.
- [x] [Review][Patch] V9 [LOW] T6 focus re-read edges [`apps/mobile/app/(memorial)/write.tsx`, `photo.tsx`, `use-memorial-send.ts` `outcomeOwed`] — (a) when the MMKV write failed (full storage), the focus re-read replaces the screen's newer in-state text with the older stored one: skip the re-read while this screen's last save failed; (b) the owed outcome fires on focus without re-checking that the draft is still the sent content — re-check before navigating (P1 (a)). Sources: edge, blind.
- [x] [Review][Patch] V10 [LOW] T2's once-per-mount refetch never re-arms after the refreshed URL loads, so a second lapse on a long-open screen leaves the plain line for good [`MemorialKeptPhoto.tsx`] — re-arm on a successful `onLoad`. Source: blind.
- [x] [Review][Patch] V11 [LOW] T12 (a)'s `isFetching` also shows "loading" on every background refetch of a `{ memorial: null }` view [the five `MemorialViewMissing` call sites] — loading = `isPending || (isError && isFetching)`. Source: blind.
- [x] [Review][Patch] V12 [LOW] T7 orders the Decided tab by a time the table never shows [`MemorialReviewPage.tsx` (only `sentAt`), `MemorialReviewListItem`] — the list looks unsorted to a reviewer. Add `decidedAt` to the decided list item (contract + OpenAPI regenerate) and show it. Source: auditor.
- [x] [Review][Patch] V13 [LOW] `send.still_sending` says "wait a moment", but a pending claim from a request that died before COMMIT answers 409 for up to 5 minutes [`packages/i18n/locales/{en,hi}/memorial.json`] — say "a few minutes" (en + hi, UN-ATTESTED). Source: blind.
- [x] [Review][Patch] V14 [LOW] Code hygiene [`apps/api/src/modules/memorial/handlers.ts` T4 log, `photo-metadata.ts` JSDoc, `apps/mobile/tests/unit/memorial-a11y-scan.test.ts` `enclosingTag`] — the "lost acknowledgement" log also covers a request that outlived its claim's TTL (R31 (a) — a possible duplicate): word it as "result not recorded (claim not held)"; the `isBareJfifHeader` doc block is orphaned above `hasIdentifier`; the scan checks only the nearest JSX ancestor (walk all ancestors, incl. a Tamagui `Button`). Sources: blind, edge.
- [x] [Review][Patch] V15 [LOW, records] [`deferred-work.md` R31, story T5 / fix-round paragraph] — R31 (c) ("500 although the result is recorded") is CLOSED by T4's lost-ack 201 and the record does not say so; R31 (b) and T14 record the same lost-COMMIT-acknowledgement defect twice (point one at the other); T5's "R7's case preserved" is corrected by V2. Source: auditor.

- [x] [Review][Defer] V16 The reworded `outcome.earlier_approval_stands` says "you can write a new version … or the nominee can call the helpline" — mixed address (other lines use "If you, the nominee") [`packages/i18n/locales/{en,hi}/memorial.json`] — deferred into the non-author Hindi / tone review (UN-ATTESTED; the 2026-10-24 row). Sources: blind, auditor.
- [x] [Review][Defer] V17 The sticky refusal is per mounted Preview: Change the words → Photo → a NEW Preview starts clean, so a 403 there sends one more SMS [`apps/mobile/app/(memorial)/preview.tsx`] — deferred: the per-screen scope is the `certificate-replacement.tsx` precedent, the helpline is shown with the refusal, and each new SMS needs the family to walk the flow again. Trigger: a report of repeated codes, or a server-side cap on handover codes per pool. Source: edge.

Dismissed as noise (6): `openapi/v1.yaml` "missing" and the copy registry / tone rows "missing" (both artifacts of the fix diff's construction — the yaml was regenerated and the records were written; neither was in the code diff); `dismissAll()` popping the root stack (the edge layer traced it working inside the `(memorial)` Stack; a device check is on Row 41 (h)); the bracketed marker now read aloud (the removed label sat on a nested `Text` and was never announced — nothing spoken changed); the photo screen's over-limit condition "not matching" the box (`keepPreviousPhoto || photoUri` is the same condition as `withPhoto`; read at `photo.tsx:72-95`); a newer head from another device read as "landed" (already deferred as T17).

**Fix-diff review of the V round — 2026-10-24 (the V1–V15 patch diff alone: 30 files, 2,019 lines; Blind / Edge Case / Acceptance Auditor, read-only; no layer failed).** 0 decisions, 12 patches, 2 deferred, 7 dismissed. No finding reopens a ruling; four are MEDIUM, all in the phone's Send / handover code. Checklist (auditor): family 2 REAL GAP (W1), family 10 REAL GAP (W11); 6, 13 (a)/(c) covered; 13 (d) covered (crossing) / by construction (restored over-limit hint).

- [x] [Review][Patch] W1 [MED] V3 reopened the duplicate path T3 closed: freshness from the LAST post lets a key that keeps failing offline never read as stale [`apps/mobile/lib/memorial-draft.ts` `memorialSendKeyIsFresh`, `stampMemorialSendPost`; `use-memorial-send.ts` pre-send + 409 legs] — the first POST commits but its 201 is lost (or both `recordResult`s fail, R31 (a)); later presses fail offline, each re-stamping `lastPostedAt`; once the server claim expired / was vacuumed, the key is reused with NO landed check and a second version is inserted. And the 409 "drop past the TTL" leg became unreachable (the key was stamped milliseconds earlier). Use TWO times: `firstPostedAt` (stamped once, at the first POST under the key) decides whether a kept key may be reused WITHOUT the landed check; `lastPostedAt` decides whether a not-landed key may be DROPPED on a 409. Stamp after the request body is built, immediately before the POST. Tests: repeated offline presses outlasting the TTL ⇒ the landed check runs; the 409 drop leg reachable. Dated AC3 note (V3 + W1). ⚠ The server-side fix (R31 (a): a claim TTL that outlives a client keeping its key — the house's 24 h shape) stays deferred; these client measures only narrow it. Sources: blind #1 + #14, auditor #1 + #3.
- [x] [Review][Patch] W2 [MED] V2 clears the "refused after a code" memory on outcomes that never reached the server, so a second SMS can follow seconds after a verified code [`use-memorial-send.ts` `attempt(afterCode)`, `useHandoverGatedAction`] — a network error, a failed / bounded refetch, a `{ memorial: null }` or other-drive view, or an unmount set nothing, and two tests pin a second `otpSend` inside the 5-minute elevation. Judge a 403 by the VERIFY time instead: remember when a code was last verified; a 403 within the elevation window (`stepUpElevatedMs`, 5 min — share the constant or pin it to the server's) ⇒ `still_refused` / `exhausted` (the helpline, ⛔ no SMS); a 403 after the window ⇒ a lapse ⇒ a new code (R7). Cleared by a 2xx. Replace the two tests; keep R7's lapse test (clock past the window). Sources: auditor #2, blind #6, edge #6.
- [x] [Review][Patch] W3 [MED] Withdraw's new `setNeedCode(false)` on a non-403 hides an open code panel, so the next press texts the nominee again [`use-memorial-send.ts` `useHandoverGatedAction` onRefused branch; `app/(memorial)/outcome.tsx:161`] — the panel is open (code sent), the family presses Withdraw again, that press fails non-403 (network, 5xx, 429) ⇒ panel gone ⇒ next 403 ⇒ a second SMS, the first code lost. Keep the panel open while a sent code is unverified; disable Withdraw while a request is in flight and while the code is asked for (as Send is, `preview.tsx:159`). Test. Source: edge #1.
- [x] [Review][Patch] W4 [MED-LOW] V5's bound leaves the hung GET running, and every later `fetchQuery` joins it [`use-memorial-send.ts` `refetchView`] — on a black-holed link each press spends 10 s on "Sending…" then `try_again`, until the OS drops the socket; a legitimately slow GET (KMS, 2G) also never completes. When the bound wins, `cancelQueries({ queryKey: MEMORIAL_VIEW_QUERY_KEY })` (and pass an abort signal to `memorialApi.view()` if the client takes one), so the next press starts a fresh request; consider a longer bound (e.g. 20 s). Test: bound wins ⇒ next press issues a NEW fetch. Sources: blind #3, edge #2.
- [x] [Review][Patch] W5 [LOW] V9 (a) on Photo rebuilds state from the OLDER stored draft after a failed save [`app/(memorial)/photo.tsx` `patch`, `lib/memorial-draft.ts` `saveMemorialDraft`] — patch 1 fails (state holds it), patch 2's result merges onto storage and drops patch 1 (and orphans a copied photo). When a save fails, merge the patch into the SCREEN's state, not into the stored draft; test with two changes. Sources: blind #2, edge #3.
- [x] [Review][Patch] W6 [LOW] V4 seams [`use-memorial-send.ts` pre-send + 409 legs, `lib/memorial-draft.ts` `dropMemorialSendKey`] — (a) the mounted check returns BEFORE the landed check, so a refetch showing the Send landed leaves the sent words as a draft — check landed first (clear the draft even when unmounted), then mounted; (b) the 409 leg has no mounted check — mirror the pre-send leg; (c) `dropMemorialSendKey` drops whatever key the draft holds now — drop only if it is the key this attempt used; (d) a view for ANOTHER drive keeps answering `try_again` for ever — invalidate the memorial queries so the screen re-renders on the drive the server now shows; (e) the V4 comment overstates what the mounted check sees (TanStack notifies observers after the promise resumes) — say `sameDrive()` is what stops the POST. Sources: blind #8 + #9, edge #9.
- [x] [Review][Patch] W7 [LOW] V11 made Retry on a `{ memorial: null }` view show no progress, and repeated taps cancel and restart the GET [the five `MemorialViewMissing` call sites] — show loading while a fetch the family ASKED for (a Retry tap) is in flight, whatever the last result; disable Retry meanwhile; a background refetch still does not flicker. Sources: blind #7, edge #5.
- [x] [Review][Patch] W8 [LOW] V6 seams [`apps/admin/src/modules/memorial-review/MemorialReviewPage.tsx`, `apps/admin/tests/memorial-review.test.tsx`] — Withdraw's `onStart` resets a decision that already SUCCEEDED, unlocking the decision form before the refetch lands (a second decision on a decided version): never reset a succeeded mutation from the other form — keep a `decidedFor` target as `doneForThisTarget` does; and the V6 tests click a disabled button (React drops it, so they pass either way) — assert the `disabled` attribute instead. Sources: edge #7, blind #12.
- [x] [Review][Patch] W9 [LOW] V12 labels every Decided-tab row "Decided <date>", including a family withdrawal (no decision) and an approval the Trust withdrew [`MemorialReviewPage.tsx:179-180`, `i18n-en.ts`] — label by the row's state ("Withdrawn <date>" for `withdrawn` / `approval_withdrawn`); admin test per state. Dated AC9 note: the list now carries the decision / withdrawal date beside the name and sent date (not family text). Sources: auditor #4 + #5, blind #13.
- [x] [Review][Patch] W10 [LOW] The a11y scan now climbs through JSX attribute values and render-prop callbacks [`apps/mobile/tests/unit/memorial-a11y-scan.test.ts` `enclosingTags`] — `<Button icon={<Text aria-label …/>}>` or a labelled element inside `renderItem={() => …}` is flagged as nested text. Stop the walk at a `JsxAttribute` / function boundary; planted cases. Source: blind #11.
- [x] [Review][Patch] W11 [LOW, records] [`docs/tone-review-checklist.md` 2026-10-24 row, Row 41 (h), AC3, AC9, `authorisation-copy.ts` v2 comment] — the tone row does not name V13 (`send.still_sending` → "a few minutes" / "कुछ मिनट") or V16 (the mixed address it was deferred into); Row 41 (h) describes T8's crossing, not V8's (a draft restored over the limit is silent by design — the device check must confirm the input's hint is read on focus); the dated AC3 (V3 / W1) and AC9 (V12 / W9) notes; and the v2 exception comment says "never served" — true for people and for git, but the `:5434` dev DB holds 1,101 test-generated rows citing v2 under the pre-V7 wording: say "never shown to a person; test rows on dev databases cite it". Sources: auditor #6 + #7, edge (records note).
- [x] [Review][Patch] W12 [LOW] Restored-over-limit hint has no jsdom assertion [`apps/mobile/tests/unit/memorial-screens-render.test.ts`] — V8 keeps a draft restored over the limit silent and relies on the input's hint; assert the hint carries the over-limit line in that state (Write and Photo). Source: auditor #7.

- [x] [Review][Defer] W13 Storage-full residue of V9 [`write.tsx`, `photo.tsx`, `preview.tsx`, `lib/memorial-draft.ts`] — while a screen's saves keep failing, the Preview reads and SENDS the older stored words (the R6 key drop also failed), and `lastSaveFailed` stays set after space frees, skipping the focus re-read; and a key whose mint write failed is not kept, so a lost answer can lead to a second version. Deferred: needs storage full on the phone; the honest fix is a visible "could not save on this phone" state, which is new copy. Trigger: a report, or the first device check on a full phone (Row 41 (h)). Sources: edge #4 + #8, blind #2 (second half).
- [x] [Review][Defer] W14 The client's key-age measures (T3, V3, W1) can only narrow the duplicate window; the server is where it closes [`apps/api/src/modules/memorial/handlers.ts` `MEMORIAL_SEND_IDEMPOTENCY_TTL_SECONDS = 300`] — a key the phone keeps across retries outlives a 300 s claim; the house shape for that is a long TTL (24 h, the `contributions/personal-event-handlers.ts` family), or the 409 carrying the claim's age. Deferred into R31 (a), which already holds it as a design choice; three rounds of phone-side fixes are the evidence that it is the real fix. Trigger: as R31 (a). Source: the reviewer, from blind #1 + auditor #1 across rounds.

Dismissed as noise (7): `openapi/v1.yaml` "not re-emitted" (it was — `decidedAt` is in it; the yaml is outside the code diff); v2 "already committed" (`git log --all -S v2-pending-hi-review` finds no commit — the diff's base was the reconstructed pre-fix tree); the V3 test mocking its 409 (a unit test of the phone's rule, the server leg is `races.spec.ts`); `decidedAt` text-without-offset / Invalid Date (pg returns a `Date` here, no type-parser override — edge verified; `toISOString()` always ends in `Z`); the owed outcome passing on an emptied draft (nothing newer exists, so the outcome is right); the V14 (a) log wording untested (a log message); the over-limit announcement on a focus re-read or on picking a photo with alt text already over (each is a state the family can now hear for the first time — announcing it is the point).

**W-round fix round — 2026-10-24 (BigDev: "1").** W1–W12 applied in the working tree (uncommitted) by two agents (mobile: W1–W7, W10, W12; admin: W8, W9 + the v2 comment) and the reviewer (records, W11). Agent-reported runs: mobile 90 files / 1,767 tests, typecheck clean (⚠ `tests/` is outside the mobile tsconfig); admin 78 files / 1,319; domain memorial-status 40/40; each fix reverted alone ⇒ tests failed, restored byte-identical (`cmp`); `git status --porcelain` 65 entries. Beyond the brief (recorded in AC3's note): a not-landed key posted within the TTL is KEPT on the pre-send check. W8 deliberately changed T12 (c): a SUCCESS's confirmation now stays beside the next action's answer (only a failure's alert is cleared). ⚠ `ci:local` not re-run.

**Fix-diff review of the W round — 2026-10-24 (16 files, 2,045 lines; three layers, read-only; no layer failed).** ⚠ **Not converging:** four rounds of phone-side patches to the same Send / key / handover-code logic have each opened new edges here (two flags became two timestamps, a window, a bound, a cancel, a keep rule). Recorded unchecked pending BigDev's choice of approach:

- [x] [Review][Patch] X1 — FIXED (Y-mobile) — [MED] W5 handles fail-then-fail only: a failed save followed by a SUCCESSFUL one replaces the screen with "old stored draft + this patch", losing the earlier unsaved change (a photo pick — its copy orphaned, `lastSaveFailed` now false) [`apps/mobile/app/(memorial)/photo.tsx:91-103`] — after a failure, save the screen's merged state, not the patch alone; fail-then-succeed test. Sources: blind, edge, auditor (all three).
- [x] [Review][Patch] X2 — RESOLVED by removal — the handover state machine has no window (Y-mobile) — [MED] W2's window is measured at the 403's ARRIVAL, not at the POST's start, and it is not sticky [`apps/mobile/lib/use-memorial-send.ts:98, 297-307, 415-421`] — (a) the server checks step-up in a preHandler before the body, so a retry begun inside the window whose 403 arrives after a slow 10 MB upload reads as a lapse ⇒ a second SMS right after a verified code; (b) after `still_refused` / `exhausted`, once 5 minutes pass a 403 sends a new SMS — every 5 minutes, without limit; a 403 INSIDE the window proves the verified code does not grant the elevation (not R7's lapse). Rule: measure at the POST's start; a 403 within the window sets a sticky refusal cleared only by a 2xx; R7's lapse (a 403 past the window with no sticky refusal) asks a new code. Correct the T5 test title, the v1.3 Change Log line, V17's wording; dated AC7a note. Sources: edge #1, auditor #1.
- [x] [Review][Patch] X3 — FIXED (Y-mobile) — [MED] Withdraw's code panel keeps Confirm enabled while the code-verified retry runs [`use-memorial-send.ts:450`] — a second tap re-verifies a used code ("did not match" beside a Withdraw that worked) or starts a second POST; `busy: otp.busy || inFlight`. Sources: edge #2, auditor #4.
- [x] [Review][Patch] X4 — FIXED (Y-mobile) — [MED] A first load that never settles shows "loading" forever with no Retry [`apps/mobile/components/memorial-authorship/MemorialViewMissing.tsx:90`, callers `loading={query.isPending}`] — bound the first load too (offer Retry after the bound); and after a cached error a mount refetch now shows "could not load" with an active Retry. Sources: edge #4, blind #9.
- [x] [Review][Patch] X5 — RESOLVED by removal — `viewTellsNothing` deleted, the other refreshes no longer awaited (Y-mobile) — [MED-LOW] `viewTellsNothing` AWAITS `invalidateMemorialQueries` (resolves only after the refetch it triggers) ⇒ "Sending…" with Back consumed on a hung link [`use-memorial-send.ts` diff 802-805] — don't await, or race the bound. Source: blind #4.
- [x] [Review][Patch] X6 — RESOLVED by removal — no clock in the key or the handover logic, pinned by a source test (Y-mobile) — [LOW] Clock edges [`lib/memorial-draft.ts:70-73`, `use-memorial-send.ts:98-99`] — a future `lastPostedAt` reads OLD (⇒ drop, the unsafe side for the drop question: read it FRESH there); a future `verifiedAt` reads "within" for ever; a V3-era draft gets `firstPostedAt = now` on its next stamp (fallback `firstPostedAt ?? lastPostedAt ?? mintedAt`). Sources: blind #3, #5, #8; edge #5, #6.
- [x] [Review][Patch] X7 — FIXED — mobile items (Y-mobile), `decidedDateLabel` fallback (Y-server); the records half below — [LOW] Smaller seams — Withdraw `busy` is state with no ref guard (two taps in one frame ⇒ two POSTs); `decidedDateLabel` has no fallback for a future state; the a11y scan's attribute stop also skips an explicit `children={…}`; after a Retry tap the "loading" line is silent on iOS (family 13 (d)); disabled Retry / Withdraw "dimmed" announcement not on Row 41 (h); records: dated AC7a note (X2), W8's T12 (c) change. Sources: blind #10, #11, #12; auditor #3, #5, #7.
- [x] [Review][Defer] X8 `cancelQueries` on the shared view key may cancel a healthy fetch another screen started at the bound; `lastPostedAt` is stamped before a multipart upload that can take minutes; the photo screen deletes a stored copy before a patch that may fail (storage full) — deferred: the first two are the client-side measures W14 / R31 (a) says only the server closes (the edge layer traced that `cancelQueries` reverts to the prior state, so the Preview keeps its data); the third joins W13 (storage full). Sources: blind #6, #7; edge #8.

Dismissed (3): the admin `decidedFor` lock never cleared (a new version is a new `submissionId` and the detail page is keyed on it, so it remounts; a decided version can never be decided again — edge traced); the Withdraw code panel as a total dead end (the panel and the outcome footer always draw the helpline CTA — AC10 holds by construction; a transient SMS failure is retried by re-entering, recorded in X7's family-13 note); the W3 hook test calling `run()` while `needCode` is true (a hook-level test of the guard; the screen-level disabling is tested separately).

**BigDev's choice on the X round — 2026-10-24: "1" (simplify, then one final pass), and on the mechanism: "Key on the row".** Rather than patch X1–X7 piecemeal: (Y-server) the Send's idempotency moves OFF the shared 300 s keyed store and ONTO the submission row — the phone's Idempotency-Key stored on `memorial_submissions` with a unique index per pool (migration `0182`), written in the insert's own transaction, so a retry with the same key replays at ANY age, a concurrent duplicate waits on the pool lock and replays, a crash leaves nothing pending, and `409 memorial.idempotency_in_progress` no longer occurs; (Y-mobile) the phone keeps its key until any 2xx and drops it only when the content changes — ⛔ no clocks — and the Send / Withdraw handover logic becomes ONE explicit state machine with an exhaustive transition table; X1, X4 and X7 are fixed in the same pass; X2, X3, X5, X6 are expected to disappear with the removed code (each to be confirmed). Considered and NOT chosen: a 24 h keyed-store claim with a stale-pending reclaim (the store has ONE expiry for pending and completed claims, so a crashed request would block its key for 24 h and the phone would be guessing again). ⚠ **Correction (reviewer):** R31, W14, X8 and the reviewer's messages cited `contributions/personal-event-handlers.ts` as "the house's 24 h shape" — it uses **300 s**; the 24 h claims are in `life-events`, `member-data-rights`, `drive-target`, `claims.peer-request` and `claims.contact-call` handlers. The citations are corrected by this note, not rewritten. AC3 / AC7 / AC7a get dated notes once the code lands. ⚠ Migration number: `0182` (free on every branch and worktree at 2026-10-24); `0181` stays contested with the 6-36e worktree (`0181_member-nominee-links.sql`) — settled at the rebase.

**Y round — 2026-10-24 (applied, uncommitted).** Y-server: migration `0182_memorial-send-idempotency-key.sql` (`idempotency_key text NULL` on `memorial_submissions`, CHECK `^[A-Za-z0-9_-]{1,128}$`, UNIQUE `(pool_id, idempotency_key) WHERE idempotency_key IS NOT NULL`; journal `when` after 0181's; applied to `:5434` only; no grant change — 0181's table-level `SELECT, INSERT` covers it, no UPDATE), the keyed store removed from the Send, the three replay points (see AC7's note), `409 memorial.idempotency_in_progress` retired, OpenAPI regenerated; `decidedDateLabel` fallback (X7). Y-mobile: `apps/mobile/lib/handover-gate.ts` (a pure reducer — phases idle · sending · need_code · verifying · retrying · retry_pending · refused · refused_sending · sent; events press · confirm · verified ok / wrong · answer ok / step_up / refused / no_answer — every phase × event in `tests/unit/handover-gate.test.ts`), the hooks rewritten thin with a ref guard, every clock / TTL / bound / pre-send refetch / 409 branch deleted (with their tests and pins), X1 / X4 / X7 fixed; the reviewer removed the now-unused `send.still_sending` (en + hi, the microcopy test, the AC12 key list, the tone row). Agent-reported runs: api memorial integration 7 files / 98; domain integration (rls + memorial + rtbf) 59 files / 1,159; contracts 1,534; api unit 710; admin memorial-review 55; mobile 91 files / 1,862; typechecks + eslint clean; revert proofs: server 8, mobile 20 — each failed, each file restored byte-identical. Reviewer re-ran after the copy removal: microcopy 435 + gate, i18n 116 + parity (uncached), mobile render 276. ⚠ The server agent's own limit, recorded: in a race through the handler `supersedes_uq` always fires before the new unique index, so the new index's own 23505 is proven at the DB level (policy spec (l2) + a unit test), not through the handler. ⚠ `ci:local` NOT re-run.

**Final review of the Y round — 2026-10-24 (35 files, 5,075 lines; three layers, read-only; no layer failed).** No HIGH. The auditor found the code matching AC3 / AC7 / AC7a's notes on every point (three replay points, body, key shape, retired 409, reordering, replay photo delete, the reducer cell for cell); erasure needs no change (the key is a random client id, never on the wire). 1 decision, 6 patches, 7 deferred, 4 dismissed. Checklist: 1, 2, 5 covered by test; 6, 12, MA15 by construction; 8 covered for replay points 1–2 (point 3 recorded, Z6); 10 REAL GAP (Z6, records); 13 (d) covered, disabled-state announcement a records gap (Z6).

- [x] [Review][Patch] Z0 [MED] How long a handover refusal and "one SMS" last, and whether the code panel can ask for a new code — DECIDED (A) (BigDev, 2026-10-24, "1"): keep the per-screen scope; add a "Send a new code" control on the code panel when the SMS failed or after a wait, so `need_code` is never a dead end (new copy, en + hi, UN-ATTESTED — the AC14 Hindi review); `refused` and the per-screen re-texting (V17) stay as built. The analysis that led to the decision: [`apps/mobile/lib/use-memorial-send.ts` (state in `useState`), `lib/handover-gate.ts`, `app/(memorial)/preview.tsx`, `outcome.tsx`, `components/memorial-authorship/HandoverCodePanel.tsx`] — the machine lives per mounted screen: (a) Change the words → Write → Photo → a NEW Preview (or leaving and resuming) starts at `idle`, so after `refused` the next Send texts the nominee again — AC7a's "sticky … never another SMS" holds per screen only (deferred V17 accepted that scope); (b) `need_code` has no way out but leaving when the SMS failed, there is no nominee, or the code expired — the panel has no "send a new code" (the helpline is drawn); (c) `refused` also absorbs a GENUINE later lapse (after a no-answer retry and a 5-minute wait) — the helpline, never a new code, until the family leaves. Options: (A) keep per-screen scope; add a "Send a new code" control on the panel when the SMS failed or after a wait (new copy, en + hi, UN-ATTESTED), so (b) is not a dead end; (c) stays — cost: new copy + a Hindi review; the per-screen re-texting of (a) stays as V17. (B) one handover state per (member, pool) for the app session, shared by every screen — a refusal holds across screens until a 2xx or sign-out; plus "Send a new code", capped (e.g. 3 per session) — cost: more code and copy; a refused family must call the helpline for the session. (C) accept as built and record (b) / (c) on Row 41 (h) — cost: the dead end and the per-screen re-texting remain until launch review. Not a Panel question: no disclosure, no ratified clause in conflict — it is how the app asks for a code. Sources: edge #1, blind #1 + #2, auditor (V17).

- [x] [Review][Patch] Z1 [MED] A lost COMMIT acknowledgement deletes the photo of a row that EXISTS — and with the row-held key the same-key retry now replays that broken row at any age [`apps/api/src/modules/memorial/handlers.ts:~642-659`] — set `committed = true` inside `mutate` immediately after the COMMIT; when `closeScopeTx(tx, true)` throws, read back by `(pool_id, idempotency_key)` on a fresh connection: a row ⇒ committed (keep the photo, answer 201, no `_rolled_back` line); none ⇒ the rollback path. Closes T14 / R31 (b). Test with an injected COMMIT-ack failure. Sources: blind #4, edge #3, auditor #4.
- [x] [Review][Patch] Z2 [MED] The intro's landed check compares version ids, and the id is recorded from a possibly STALE cached view, so unsent edited words can be cleared [`apps/mobile/lib/memorial-draft.ts` `memorialSendLanded`, `use-memorial-send.ts:~226`, `app/(memorial)/index.tsx:~36-41`] — with the key on the row the exact signal exists: the member GET carries the latest submission's `idempotencyKey` (the family's own random client id; `null` for rows before 0182); "landed" ⇔ it equals the kept key. Contract + OpenAPI + mobile; drop `latestSubmissionIdAtSend` (tolerant read). Tests: a stale view + a lost answer + an edit ⇒ the edited draft survives. Sources: blind #3, edge #2, auditor #5.
- [x] [Review][Patch] Z3 [MED] A key whose save failed (storage full) is used once and forgotten — each press mints a new key, so a committed Send whose answer was lost is duplicated [`apps/mobile/lib/memorial-draft.ts:~159-161`] — keep the minted key in the hook's memory for the screen's life when the save fails, and use it before minting. Test. Source: edge #4.
- [x] [Review][Patch] Z4 [MED-LOW] Reducer seams [`apps/mobile/lib/use-memorial-send.ts:~86-90` `handoverGateAnswerOf`, `lib/handover-gate.ts:~23,151`] — (a) answers from BEFORE the step-up check (routes run rate limit → `memorialSwitch` → `memberSession` → `handoverStepUp`: a 429, an `auth.*` 401, `memorial.not_found`, a 5xx from a preHandler) are taken as proof the step-up passed — classify them as `no_answer`; fix the comment; (b) `retry_pending` survives a content edit (the key was dropped) — a content change resets it to `idle`. Tests; AC7a note. Sources: auditor #1, edge (LOW), edge (retry_pending).
- [x] [Review][Patch] Z5 [MED] A second code request shows the OLD masked number when the new SMS fails, so "code sent to ****" stands over no SMS [`use-memorial-send.ts:~107-122` `sendFailed: otp.masked === null && otp.error !== null`] — reset the OTP hook's `masked` / `error` at each new code request (or key `sendFailed` to the current request). Test with two requests, the second failing. Sources: edge, blind #10.
- [x] [Review][Patch] Z6 [LOW, records] [Row 41 (h); `deferred-work.md`; the story's named-identifiers table; `packages/domain/src/schema/memorial_submissions.ts:65`; AC7's note] — Row 41 (h): a disabled Send / Withdraw / Retry announced as dimmed on both screen readers (Y disables Send in four more phases); `deferred-work.md`: W14 listed as "DEFERRED — not closed" → "Closed by 0182"; X8 has no entry (two parts moot — deleted code; the third joins W13 — say so on W13); the named-identifiers table still lists `409 memorial.idempotency_in_progress` — a dated note; the schema comment cites `insertMemorialSubmissionOnce` (it is `insertMemorialSubmission`); AC7's note: replay point 3 (the unique backstop) writes an intent + `_rolled_back` pair while answering 200, and the pool lock is now held across the audit write — both recorded, ⛔ not changed. Sources: auditor #2, #3, #6, #7, #8; edge (LOW).

- [x] [Review][Defer] Z7 The replay body always says `memorialState: 'with_the_trust'`, even when the replayed version has since been withdrawn, decided or superseded [`handlers.ts:~93`] — latent: the phone ignores the body. Trigger: a second client that reads it. Sources: blind #6, edge.
- [x] [Review][Defer] Z8 Keys from before 0182 do not replay (no backfill) — a phone of an older build keeping a key whose Send committed would insert a second version after deploy. Latent: nothing is in production. Trigger: a deploy over live memorial data. Sources: blind #7, edge.
- [x] [Review][Defer] Z9 SAVEPOINT error handling — a failing `ROLLBACK TO SAVEPOINT` masks the original error; a failing `RELEASE` after a successful insert becomes a 500 [`packages/domain/src/memorial/submission.ts:~203-208`]. Latent (a broken connection). Trigger: a report. Sources: blind #8, edge.
- [x] [Review][Defer] Z10 The replay ignores the payload (T16, unchanged) — a same-key Send with different content is a silent 200; correctness rests on R6 (an edit drops the key). Trigger: as T16. Source: blind #5.
- [x] [Review][Defer] Z11 After a successful Withdraw the button is enabled at once (the refresh is not awaited) — a second press answers `not_withdrawable` [`outcome.tsx:~1231`]. Trigger: a report. Source: blind #9.
- [x] [Review][Defer] Z12 Brittle / weak tests — the "any fetchQuery sets gcTime: 0" pin is vacuous while there are none; the SMS-effect pin is an exact source regex; a race test expects `[201, 200]` in a fixed order. Trigger: the next edit of those files. Source: blind #11.
- [x] [Review][Defer] Z13 The intro's landed branch passes `loading` as a constant `true`, so after X4's bound it flips to "missing" with an active Retry while it is navigating [`app/(memorial)/index.tsx:~1192`]. Trigger: a report. Source: blind #12.

Dismissed (4): cross-family / cross-pool replay (every lookup is `pariwar_id` + `pool_id`, inside the RLS scope tx; the index is per pool — edge + blind traced); a skipped drive / ownership check after the reorder (the re-check under the lock runs before the lookup); the replay photo delete hitting a kept object (`putKey` is a fresh UUID and `null` with `keepPreviousPhoto`); the double `closeScopeTx` (no-op on the second call — the `closed` flag, edge verified).

**Z fix round + its short check — 2026-10-24 (BigDev: "1").** Z0–Z6 applied (uncommitted): server — the read-back after a throwing COMMIT (`readBackSendAfterAmbiguousCommit`, a fresh RLS scope, the pool lock with a 5 s lock timeout; own row ⇒ committed, none ⇒ rollback, another row with the key ⇒ replay, failed ⇒ 500 with the photo kept and ⛔ no `_rolled_back` line — the reviewer's call), the member view's `idempotencyKey`; phone — `resend` / `content_changed` events (cap 3, the 60 s wait in the panel), the landed check by key, the in-memory unsaved key, pre-step-up answers as no answer, per-request SMS results; copy `handover.resend` / `handover.resend_note` (en + hi, UN-ATTESTED). Agent runs: api memorial integration 7 files / 103 on `:5434`, contracts 1,536, api unit 710; mobile 1,928 (12 runs; one unnamed failure in one run, a known flaky `known-people-find-render` test seen under parallel runs — ⚠ the first failure unconfirmed); microcopy 439 + gate; i18n 116 + parity; revert proofs server 1 + mobile 10, all bite. The reviewer re-ran the whole mobile suite once: **91 files / 1,928 passed**. **Short check (one combined Edge + Auditor layer on the Z diff, 21 files, 1,982 lines): no MEDIUM or worse** — the read-back cannot deadlock (the original client is released when COMMIT throws; lock_timeout covers advisory locks), it runs RLS-scoped, the key is on the member view only, the resend cap and the no-nominee rule hold, the landed check needs strict key equality, a step-up 403 is classified before the no-answer rule. Its LOW items are deferred (the review was declared final):

- [x] [Review][Defer] Z14 Two `resend` presses before a re-render can spend 2 of the 3 resends (and send 2 SMS) — no identity guard on `resend` [`apps/mobile/lib/handover-gate.ts`]. Within the cap. Trigger: a report.
- [x] [Review][Defer] Z15 The Send's "unknown" outcome (the read-back failed) keeps a photo that, if the row did not land, nothing references — a new path in R24's orphan class; and its intent line stands beside a 500, so a later same-key insert writes a second create intent for one row [`apps/api/src/modules/memorial/handlers.ts`]. Trigger: as R24 / Row 41 (k).
- [x] [Review][Defer] Z16 The read-back can time out (5 s) behind other same-pool Sends holding the pool lock across their audit write (Z6), giving a spurious 500 [`handlers.ts`]. Trigger: Send latency / contention telemetry.
- [x] [Review][Defer] Z17 `send-commit.spec.ts` gaps: no leg where the original tx still holds the lock while the read-back waits, none for the lock-timeout outcome, none for the `after_failed_commit` replay. Trigger: the next edit of the read-back.
- [x] [Review][Defer] Z18 A hung OTP request (no transport timeout) leaves the panel on a spinner with no resend — only the helpline [`apps/mobile/lib/use-memorial-send.ts` `useCodeRequestSms`]. Trigger: a report, or a transport timeout on the OTP client.
- [x] [Review][Defer] Z19 The resend control appears straight after an OTP 429 (indistinguishable from a failed send — AC16 (12)), so the family can spend all 3 resends against the rate limit. Trigger: as AC16 (12).
- [x] [Review][Defer] Z20 An edit A → B → A restores the content signature, so `retry_pending` survives although R6 dropped the key — the "retry" goes out under a new key (a possible identical second version; its 403 ⇒ `refused`). Trigger: a report.

**Device run — 2026-10-24 (BigDev: "run it on device", then "yes, fix it").** Android emulator Pixel_9, a fresh debug build from this worktree (the main checkout's APK predates `expo-image-picker`), Metro + the API from this worktree against `:5434` with `MEMORIAL_AUTHORSHIP_ENABLED=1` (worktree-local gitignored `.env` files); a member made through the real signup, a nominee via the API, an approved claim + a `closed` pool by SQL. Walked home entry → intro → write → photo (system picker) → preview → Send ⇒ 403 ⇒ the code panel (one SMS, masked +91·····1105) ⇒ code ⇒ `201` ⇒ outcome; back from the outcome went home (T6's stack reset holds); the row carries the key and the photo, permission text `2026-10-24.v2-pending-hi-review`. **Found on the device and FIXED (uncommitted):**
- [x] [Review][Patch] D1 [MED] The memorial header sat UNDER the status bar on every memorial screen (the `(memorial)` stack hides the native header) [`apps/mobile/components/memorial-authorship/MemorialHeader.tsx`] — it now pads by the top safe-area inset (`useSafeAreaInsets`, the `(signup)/whatsapp.tsx` precedent); render test on all five screens; reverting fails it. Re-checked on the device.
- [x] [Review][Patch] D2 [LOW] The outcome heading read "What you sent" while — rightly, per AC10 (`with_the_trust` → "a calm line") — no words are shown [`packages/i18n/locales/{en,hi}/memorial.json` `outcome.title`] — now "About your words" / "आपके शब्दों के बारे में" (UN-ATTESTED, the tone-review row); the intro's sent-state button reuses the key; microcopy pin. Re-checked on the device.
- [x] [Review][Patch] D3 [LOW] Android centred the Write box's text vertically [`apps/mobile/app/(memorial)/write.tsx`] — `textAlignVertical="top"`; render test; reverting fails it. Re-checked on the device.
Retracted: a "stray dash under the photo" was the emulator's own home-indicator bar inside the test image (a screenshot). Noted, not changed: with a version already sent and no draft, the intro is a single button to the outcome and nothing else (pre-existing design). Not exercised on the device: Withdraw, "Send a new code", Hindi, TalkBack, a HEIC / rotated camera photo — Row 41 (h) stays open. Runs: mobile typecheck + eslint clean; `memorial-screens-render` 322 / 322; microcopy 440 + gate; i18n parity.

---

## Dev Notes

### The code path, at `d87d047a`
- **Principal:** member session (deceased's account, signed in with a code to the deceased's own number) +
  `requireMemberStepUp(deps, 'claim_handover')` (`apps/api/src/modules/auth/member/member-step-up.gate.ts`; precedent
  use `apps/api/src/modules/reconciliation/routes.ts`, which declares its own `'claim_handover'` literal).
- **Drive:** `pools` ⨝ `claims` on `(pariwar_id, claim_case_id)` with `claims.deceased_member_id` = the session member;
  states from the memorial's own `MEMORIAL_DRIVE_POOL_STATES` (MA14).
- **Name for the intro prompt:** the session member IS the deceased — decrypt their own name and render it through
  11b.21's chain (`member-pool/handlers.ts`: decrypt → `publicNameTokens` → `resolveMemberFacingDeceasedName(presentationMode, …)`
  → `normalisePublicName`); the public `namePublicationAuthorised` gate does ⛔ not apply to the family's own screen.
  ⛔ Never mangle a name ([[feedback_never_mangle_member_names]]); `null` or a KMS outage → the no-name key (MA14).
- **Upload pattern:** phone — `app/(helpdesk)/new.tsx` (gallery) + `lib/use-death-certificate-upload.ts` (upload
  states); server — `helpdesk/member-handlers.ts` `readCreateMultipart` (`request.parts()`, Idempotency-Key) and, for
  put-then-persist with a Tier-1 caption, `claims.ground-inspection.handlers.ts`. ⚠ `claims.documents.handlers.ts` is
  `request.file()` + a job-written row — ⛔ not this shape (Trap 11).
- **Point-of-submission precedent:** `packages/domain/src/claim/claim-contact-agreement-copy.ts`,
  `claim/claim-contact-persist.ts`, `apps/api/src/modules/claims/claims.contact.handlers.ts`.
- **Write-path obligations** (header of `claims.dpdpa-consent.handlers.ts`): LOCKED re-read, audit-or-throw, server
  resolves copy, ⛔ no PII on audit.
- **Append-only record shape:** `packages/domain/src/schema/member_moderation_actions.ts` (`actor_display`) **with**
  `0092_member-moderation-rtbf.sql`'s column-level erasure grant (Trap 10, MA15).
- **Scope tx:** reads that need RLS stay inside `openScopeTx` — ⚠ moving one to the service pool is green in CI and
  dead in production ([[feedback_story_validate_footguns]] #56).
- **A v2 AI feature** (help writing, translation) would be an **explicit family opt-in** with its own Panel question —
  recorded here (AC6), ⛔ not built and ⛔ not designed for.
- **Sibling seam:** 5.11 (committed on `story/5-11-…`, ⛔ not landed) adds `inspect()` to the `KeyedStore` interface (`packages/domain/src/idempotency/keyed-store.ts`) —
  any hand-written `KeyedStore` fake in this story's tests must implement it once 5.11 lands.

### Named identifiers (use these; ⛔ never invent a synonym)
| Kind | Names |
|---|---|
| Member routes | `GET /api/v1/member/memorial/entry` · `GET /api/v1/member/memorial` · `POST /api/v1/member/memorial/submissions` · `POST /api/v1/member/memorial/submissions/:id/withdraw` |
| Review routes | `GET /api/v1/p/:pariwarId/memorial-reviews[?view=decided]` · `GET …/memorial-reviews/:submissionId` · `POST …/memorial-reviews/:submissionId/decision` · `POST …/memorial-reviews/:submissionId/withdraw-approval` |
| Admin SPA | `/p/$pariwarId/memorial-reviews` · `/p/$pariwarId/memorial-reviews/$submissionId` |
| Member codes | `404 memorial.not_found` (switch off · not theirs) · `400 memorial.idempotency_key_required` · `409 memorial.idempotency_in_progress` · `400 memorial.field_not_allowed` / `duplicate_field` / `field_too_long` / `body_blank` / `body_too_long` / `alt_text_required` / `alt_text_too_long` / `photo_type` / `photo_unreadable` / `photo_too_large` / `photo_conflict` / `no_previous_photo` · `409 memorial.already_reviewed` / `authorisation_outdated` / `nominee_unresolved` / `not_withdrawable` / `try_again` · fail-soft `unavailable: 'memorial.unavailable_now'` |
| ⭐ *2026-10-24 (Z6)* | `409 memorial.idempotency_in_progress` above is RETIRED — the row-held Send key (migration `0182`) never leaves a claim pending; a same-key retry replays `200`. The row above is kept as written. |
| Review codes | `404 memorial_review.not_found` · `400 memorial_review.invalid_omissions` |
| Auth (MA19) | `DEDICATED_STEP_UP_CONTEXTS` · `400 auth.step_up_context_not_allowed` · `member_step_up.failure` `reason: 'context_not_allowed'` |
| DTOs | `MemorialEntryResponse` · `MemorialMemberViewResponse` · `MemorialSendResponse` · `MemorialReviewListItem` · `MemorialReviewDetailResponse` · `MemorialReviewDecisionInput` · `MemorialWithdrawApprovalInput` |
| Copy keys | `memorial.intro.prompt` · `memorial.intro.prompt_no_name` · `memorial.preview.before_publish` (M3′) · `memorial.send.nominee_unresolved` |
| Domain / contracts | `MEMORIAL_DRIVE_POOL_STATES` · `resolveMemorialDrive` · `deriveMemorialStatus` · `MEMORIAL_SUBMISSION_AUTHORISATION_VERSIONS` · `MEMORIAL_FIELD_CLASS` · `MEMORIAL_BIDI_CONTROLS` · `MemorialPhotoStorage` · `memorialParagraphs` · `reconstructMemorial` |
| Config | `MEMORIAL_AUTHORSHIP_ENABLED` · `MEMORIAL_PHOTO_BUCKET` |

### Rulings checked and found to leave this story unchanged
`-159` (D4(b) — the de-authorised drive tick-box; ⛔ not this data class) · `-165` / `-176` (nominee-bank Tier-1;
11b.3 D-rulings) · `-190`/`-191` (bank coordinates withdrawn) · `-210` (enum delegation — ⛔ does not reach MA6/MA7) ·
`-223` (⛔ no withheld-name case; ⚠ but it records that ⛔ no drive names the deceased publicly today — the routing note's
Q2 said so) · `-391` / `-392` / `-393` / `-395` (the Panel's answers to this story's note, the Q3 clarification, the rider's withdrawal with soft measures, and BigDev's nominee-only take-down — transcribed throughout, v0.4–v0.7) · `-178` D8(ii) / `-183` (precedent: the Panel said who holds an authority, the key was then an author act —
hence MA7's confirm).

### Load-bearing invariant families to self-check
Verbatim storage (Trap 6) · no-edit-by-absence (AC6) · `-162` cl.3 at Send (AC4) · financial-truth gate file names
(Trap 5) · Metro bundle boundary (Trap 9) · oracle-free refusals (Trap 8) · erasable Tier-1 (Trap 10) · multipart
(Trap 11) · serial writes (Trap 12) · fursat copy (AC14) · Latin numerals ·
`.strict()` responses parsed by the client — tighten INPUT schemas only ([[feedback_story_validate_footguns]] #29).

### Testing standards
Vitest everywhere; `pnpm --filter <pkg> test <name>` (⛔ no `--`); live-DB on the AC18 database, ⛔ never :5432
([[project_prepush_hook_inherits_5432]]);
separate transactions where ordering by `now()` matters ([[project_db_clock_ordering_tests_tie]]); mobile tests on
the per-file jsdom harness with `lib/mmkv` mocked and RTL `cleanup` ([[project_mobile_vitest_and_expo_install_traps]]); every new
regex/gate gets a planted violation recorded in the Debug Log; integration assertions use explicit values, ⛔ never
counts over shared fixtures.

### Previous-story intelligence
- **11b.22 / 11b.20:** friction-budget disposition was missed once and fixed late — AC15 makes it explicit; stubs
  transcribe — real `t()` legs only; stale prose — grep every phrasing.
- **11b.3** (Trap 5): the family-story slot is deliberately **empty** (*"render nothing, no placeholder, no 'coming
  soon'"*) — this row must ⛔ not touch it (AC17); field counts on the matrix surface are pinned
  (`scrape-test.spec.ts`), another reason the render is its own row.
- **6.35:** decision ids are taken on other branches — re-check at Task 0.1 and immediately before Task 1.
- **9.1:** the console's "Open research risk (do not silently resolve…)" precedent for Story 0.9 — AC16 (8) follows it.

### References
- `_bmad-output/planning-artifacts/epics.md` — `### Story 11b.4` (binding block + ACs); Epic 11b header rows **C-1**,
  **C-4**; `### Story 11b.3` (family story in the public shell), `### Story 11b.5`, `### Story 11b.6`.
- `.decision-log.md` — `-162` cl.2/3/5 + open follow-up; `-160` cl.3/5/6; `-177` (References gloss); `-178` D8(ii);
  `-196` Consequence 2 (as recorded in `member-drive-detail.ts`); `-210` cl.2; `-223` (cite by bare number — ⛔ never a
  guessed date).
- `_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-10-23-11b4-family-memorial-five-questions.md` (Q1–Q5 + three confirms).
- `_bmad-output/planning-artifacts/ux-design-specification.md` — `<MemorialAuthorshipSurface>` (§Nominee Surfaces),
  `<MemorialRecord>`, `<PortraitFrame>`, Journey 4, Patterns 4/5/6, Shradhanjali grammar, accessibility, the
  post-close placement (MA14). **UX-DR50/55/56** are in `epics.md` (the UX-DR list), ⛔ not in the UX spec.
- `_bmad-output/planning-artifacts/prds/prd-TWT-2026-05-22/prd.md` — **FR-77** (⚠ the UX spec's "FR-20" is a UX-local
  number; PRD FR-20 is the _daan engine), FR-68, FR-69, FR-74, FR-97.
- `_bmad-output/planning-artifacts/architecture.md` — public page composition; §2.7 PII tiers; minor-data handling;
  §4.11.2 media budget; §4.13 form drafts; §4.15 actor adaptation.
- `docs/tone-guide.md`, `docs/tone-review-checklist.md`, `friction-budget.md`, `microcopy.yaml`,
  `docs/launch-gate-inventory/inventory-roster.md`.

### ❓ Questions for BigDev (the open MAs are written as defaults; Task 0.2 records the answers — ⛔ Task 1 does not start without them)
1. ~~**Send the routing note?**~~ **Answered** — sent and ruled (`-391`), Q3's residue clarified (`-392`), then `-393`, `-395`.
2. ~~**MA1 split**~~ **Answered** — BigDev, 2026-10-23: *"I am fine with 11b-4a"*; mint `11b-4a-family-memorial-public-render`
   at Task 1.3.
3. **MA2 / MA4** — defer kinship (epic step (d)) and emphasis (epic step (b))?
4. **AC7 limits** — 6,000 code points for the story, 300 for alt text?
5. **MA13 / MA16** — no new version after `approved`, with the Trust able to withdraw a mistaken approval?
6. **MA14** — writing opens when the collection **closes** (as the UX places it), ⛔ not while it is live?
7. **Trap 7** — if the device check shows `autoCorrect={false}` breaks Hindi typing, which matters more: ⛔ no silent
   correction, or a working Hindi keyboard? (Asked only if Task 6.6 finds the break.)
8. **MA14** — ⛔ no production code moves a pool to `closed` today, so the surface stays dark until the Epic 7 window
   scheduler ships (true of every drive surface). Keep the window on the pool's `closed` (⭐), or key it on the
   **cycle** close the UX names (`CloseCycle`)?
9. ~~**MA18**~~ **Answered** — (a), with the public render in 11b.4a (BigDev, 2026-10-23: *"I am fine with 11b-4a"*).
10. ~~**`-392` items 4–5**~~ **Answered** — kept; and only the nominee may ask (`-395`).
11. ~~**MA19**~~ **Answered** — (a), close the generic step-up route for `claim_handover` in this story (BigDev, 2026-10-24).

---

## Dev Agent Record

### Agent Model Used

Claude Opus 5.5 (`claude-opus-5-5`), `bmad-dev-story 11b.4`, 2026-10-24.

### Debug Log References

- **Task 0.1 (2026-10-24).** `git fetch origin`: `origin/main` = `1268d47e` (unchanged since v0.9); `d87d047a` is an ancestor. Backup
  `backup/11b-4-pre-rebase-2026-10-24` at the old tip `41ec0862`; rebased 12 docs-only commits — ONE conflict (the `sprint-status.yaml`
  ledger head), resolved branch-on-top. Verified: for each of the four branch files the sorted `-U0` changed-line set vs `origin/main` equals
  the set vs the old base (all SAME); YAML strict-parses (291 rows). `d87d047a..origin/main` moved ⛔ no cited file but `0180` + `_journal.json`
  (as v0.9 recorded). `member_nominee_versions.version_id` is still the PK; `getNomineeVersionHeads` still selects only `{ rank, versionNo, kind }`.
  **Numbers on every branch + worktree:** decisions — main `-388`; 5.11 working copy `-394` (uncommitted); 6.36e branch `-396` / `-397`
  (committed) ⇒ this story's author-commit is **`-398`**. Migrations — `0180` on main, ⛔ no `0181` anywhere (6.36e plans it). Journal max
  `when` `1795059600024`. Catalog `52`. Roster — Row 40 in 5.11's working copy; **Row 41** free. Ledger — `al` also 6.36e's ⇒ this story's
  `2026-10-23al` re-lettered **`2026-10-23aq`** in place; `2026-10-24c` is 6.36e's ⇒ the dev-start entry is `2026-10-24d`.
  **STOP checks:** (1) ⛔ no decision newer than `-395` at `origin/main`; ⚠ on the unlanded 6.36e branch, `-397` item 3 cites 11b.4 as sequencing
  only (*"both plan migration `0181`, and both extend `anonymizeMember` (its table-count pin) and the `AuthAuditEventType` union — whichever
  lands second renumbers"*) — the same sequencing Task 2.2 / 2.5 already carry; ⛔ not a ruling on this story ⇒ ⛔ not a halt, reported to
  BigDev. (2) ⛔ no other story owns a family memorial (`-w` grep for `family memorial|tribute|parichay` hits only token names and the P0-5
  prototype). (3) ⛔ none of the three paths exists. (4) ⛔ no ruling after `-395`. (5)/(6) ⛔ no commit since the pin, and ⛔ no sibling change,
  to `withdrawal/handlers.ts`, `member-auth.handlers.ts` or `members/auth.ts`. (7) 6.36e has ⛔ no committed or uncommitted `packages`/`apps`
  change and has ⛔ not landed.

- **Database (2026-10-24, BigDev mid-Task 2: *"use :5434 for db instead of :5433"*).** `0181` had already been applied to
  `:5433` (Task 2.2, before the message); BigDev chose *"Roll it back"* — the three tables (all empty), the three enums,
  `memorial_omissions_valid` and the journal row `id 181` dropped in ONE transaction ⇒ `:5433` is back at `0180` (so 6.36e's
  planned `0181` is ⛔ not skipped there). `:5434` (`twt-test-pg-b`, 0 open connections) was stale at `0162` and failed `0165`
  (`workplaces_staff_actor_check`, 23514 — leftover rows); BigDev chose *"Recreate it"* — `DROP DATABASE twt_dev` / `CREATE
  DATABASE twt_dev OWNER twt_dev_app` (roles are cluster-level), migrated to `0181`. Idempotency of `0181` was proven on `:5433`
  before the rollback (`psql -f` twice). ⇒ every live-DB leg and `ci:local` in this story run on **`:5434`**.

- **Planted-violation teeth (2026-10-24).** Each new gate/regex has a leg that FAILS on a planted violation, run green on the real
  tree: the AC6 no-AI-dependency checker (`apps/api/tests/unit/memorial-no-ai-dependency.test.ts` — seven planted SDK names caught,
  `aide` not); the photo stripper (`memorial-photo-metadata.test.ts` — planted GPS EXIF, an EXIF thumbnail with its own EOI, an MPF
  trailer with its own GPS, each PNG chunk, a PDF claiming `image/jpeg`, truncation); `scripts/microcopy/memorial.test.ts` — fursat
  frames in both locales (*"hurry up"*, *"जल्दी कीजिए"*, *"50% complete"*, *"अभी करें"*, *"act now"*), the member_only register, ten
  deadline frames that FIRE and seven reassurances that do ⛔ not (incl. *"approved by the Trust"*, *"जब तक"*); the take-down-key leg
  caught the author's own key `outcome.change_or_take_down` on its first run ⇒ renamed `outcome.helpline_for_changes`.
- **Raw-character finding (2026-10-24).** `\uXXXX` escapes written into three files (the contracts text classes, the contracts test,
  one API spec) landed as RAW invisible characters; all tests passed, only ESLint caught it; rewritten as escapes and a scan run over
  every memorial file (memory `project_unicode_escapes_written_raw`).
- **Task 6.6 device checks — ⚠ UN-ATTESTED** ([[feedback_record_unattested_no_backfill]]): ⛔ device in this session. Owed before
  Row 41 closes, recorded as deferred-work item (16): Hindi typing with `autoCorrect={false}` (Gboard Hindi + a transliteration
  keyboard, iOS + Android — Trap 7; a break STOPS for BigDev), a rotated portrait and an iPhone HEIC pick arriving upright as JPEG
  (MA8), TalkBack-Hindi (AC13).

### Completion Notes List

- **Task 0.2 answers (BigDev, verbatim, 2026-10-24):** MA2–MA4, MA8–MA17 and the build details of MA5 / MA6 / MA7 — *"Accept all
  (Recommended)"*; the AC7 limits — *"6,000 / 300 (Recommended)"*; MA14 / Question 8 — *"Pool closed/settled (Recommended)"*. Already
  answered: MA1 (a) and MA18 (a) — *"I am fine with 11b-4a"* (2026-10-23); MA19 (a) — *"(a) Fix in 11b.4 (Recommended)"* (2026-10-24).
- **What was built.** The family memorial's WRITE side, behind the MA17 switch (off by default): migration `0181` (three
  append-only tables, column-level erasure grants on the four Tier-1 columns, RLS ENABLE + FORCE); `memorial.review` (catalog
  53, `trustee_panel`); the domain (`resolveMemorialDrive` over its own `MEMORIAL_DRIVE_POOL_STATES`, the derived state, the
  pool-keyed lock and chain, the v1 permission registry); `@twt/contracts` (vocab by value, text classes + AC7 limits, the
  pure decision validator, the photo port, DTOs); the `@twt/ui` presenter; the API (member: entry / view / Send / withdraw;
  review: queue / history / decision / withdraw-approval) with the dependency-free photo-metadata stripper; the mobile
  `(memorial)` flow and `<MemorialEntry />`; the admin review screen (built by a forked agent in `apps/admin` only, reviewed and
  re-verified here); the `memorial` copy (hi/en); and the records (tone row ⚠ UN-ATTESTED, friction row, launch-gate Row 41,
  deferred-work items (1)–(16) + two in-place annotations).
- ⭐ **To the claims / reconciliation owner (MA19, AC20):** the generic member `POST /api/v1/member/auth/step-up/request` now
  refuses `claim_handover` (`400 auth.step_up_context_not_allowed`, ⛔ OTP, ⛔ SMS, one `member_step_up.failure` line). Before this,
  whoever held the deceased's phone could mint the elevation with ⛔ nominee — and it unlocked **every** `claim_handover` route:
  claim intake, claim documents (`/api/v1/member/claims/:claimCaseId/documents`), nominee-bank (`…/:claimCaseId/nominee-bank`) and
  the reconciliation bank-statement upload, as well as the memorial Send. The same hole is closed for all of them; the nominee
  route (`/member/claims/handover-otp{,/verify}`) is untouched and still yields the elevation (proven, AC20).
- **Deviations / additions, recorded:** (i) the member view carries `driveId` (the pool id) — the phone keys its draft on it
  (MA3's `<poolId>`; the GET had ⛔ drive id); (ii) `memorial_handover_recipient` / `photo_mime` are `text` + CHECK, ⛔ pgEnums —
  `-398` mints exactly three; (iii) a photo description sent WITHOUT a photo is refused (`memorial.field_not_allowed`), ⛔ silently
  dropped; (iv) the copy key `outcome.change_or_take_down` was renamed `outcome.helpline_for_changes` (the no-take-down-key leg);
  (v) Withdraw also asks the nominee's code on a 403 (AC7a's *"Send (or Withdraw)"*) through `useHandoverGatedAction`; (vi) the
  admin agent keeps two touching parts with DIFFERENT reasons separate, so the validator refuses them and the form asks for one
  reason; (vii) 6.36a's `workplace.spec.ts` pin now reads `{ memorialPhotoKeys: [] }` (the new return — its intent unchanged).
- **Gates (AC18), on the fresh `:5434` database (BigDev):** run 1 at `8b61cc95` — 40/42 jobs; `contracts-determinism` (the
  yaml predated `driveId`) and `integration-tests` (the 6.36a pin) failed ⇒ fixed in `39a0c4f2`. Run 2 at `39a0c4f2`: **41/42** —
  integration-tests green (api 2154 / domain 6203 / jobs 1437 passed); `test (unit)` failed on ONE test this story does ⛔ touch
  (`apps/mobile/tests/unit/wa-signup-step-render.test.ts` *"…each spoken once"* — a spy called 0 times), which passed in run 1,
  passed 3/3 alone, and passed in a re-run of the unit job's exact command (`env -u DATABASE_URL pnpm turbo run test
  --concurrency=4`, 37/37 tasks: mobile 1433, admin 1278, contracts 1487, ui 262) ⇒ a concurrency flake, ⚠ ⛔ a clean single
  42/42 run. **Vacuous or partly vacuous:** `pii-scrape` (⛔ public page touched), `schema-diff` (⛔ payout surface),
  `sahyog-vivran-financial-truth` (⛔ file named `*sahyog-vivran*` — Trap 5); `friction-budget` was NON-vacuous (a row added,
  member surface touched); `microcopy` bites the new files (scope pinned by `memorial.test.ts`).
  ⭐ **CORRECTED — 2026-10-24, third review pass (T13 (b)):** the "/42" denominators above do not match `scripts/ci-local.sh`, which
  is unchanged on this branch and runs **36** jobs (it prints the passed count of those) — they are kept as written and ⛔ not relied
  on. The one count used from here on is the script's: `N/36`.
- **⚠ Open, ⛔ done here:** the Task 6.6 device checks and the AC13 TalkBack-Hindi pass (UN-ATTESTED — deferred-work (16)); the
  AC14 non-author tone review (Row 41 (c)); everything Row 41 lists. `:5433` holds ⛔ `0181` (rolled back).
- **Task 1:** `#decision-2026-10-24-398` (author-commit) committed alone (`5b648621`); the records commit adds the `epics.md` SECTIONED
  block, the `-162` follow-up's HOMED annotation (⛔ not closed), the row `11b-4a-family-memorial-public-render: backlog`, the ledger
  re-letter and `2026-10-24d`, and moves the row `ready-for-dev → in-progress`.
- **Code review 2026-10-24 (`bmad-code-review 11b.4`) — findings R1–R33 (+ the "Second pass" S1–S11); the fix round is applied in the working tree (uncommitted).** 2 decisions (R1 = B, R2 = A) became patches; 22 patches applied; 11 deferred (R23–R33, each with its trigger in `deferred-work.md`); 8 dismissed. **Gates (AC18), `:5434`, on the working tree:** `pnpm ci:local`, run 1 (after fix round 1) = **35/36 jobs** (first written down here as "36/37" — a miscount: it was 36 jobs with one red; turbo's "37" is the unit job's TASK count) — every other job green, including `integration-tests` (api 2238 passed / 1 skipped), except `test (unit)`, which failed on a LOAD flake: 12 admin tests in 3 files (`ground-inspection-discrepancy` x10, `correction-queue`, `fixed-amount-page` — none touched by this story), each a 5,000 ms timeout or the lookup that follows one (the 37-test ground-inspection file took 38 s loaded against 7.3 s alone). Re-runs: the unit job's exact command (`--concurrency=4`) failed ONE admin test (a different one in the same file); the admin suite alone passed 78 files / 1306 tests; the unit job at `--concurrency=2` passed **37/37 tasks** (admin 1306, mobile 1572, contracts 1533, ui 279, domain 2966 passed + 3312 DB-gated skipped, api 698 passed + 1541 DB-gated skipped). So run 1 was NOT a clean pass at the script's concurrency 4. **Run 2, on the FINAL tree after the second review pass (same command, `:5434`): `ci:local` PASSED — 36 jobs green, exit 0, `test (unit)` included at the script's own `--concurrency=4`** (admin 1307, mobile 1627; `integration-tests`: api 2239 passed / 1 skipped, domain 6277 passed / 1 skipped, jobs 1437). AC18 says "after the last commit": the tree is still uncommitted, so AC18 is re-run on the committed tree (the pre-push hook does) — these notes record the working-tree results only. **Hand-applied database change:** `memorial_omissions_valid` was edited in place in `0181` (a migration only on this branch) and re-created by hand on `:5434`; every other database that already applied `0181` needs the function block re-created before the R18 / cap legs of `memorial-policy-regression.spec.ts` pass there. **Still UN-ATTESTED:** everything Row 41 lists, now including (h)'s new items — VoiceOver / TalkBack announcing the R5 lines, the kept previous photo's signed URL loading, and the R13 isolate on a hostile paste — and the Niyamavali check for `memorialCanSend` (the legal corpus is not in this worktree). **Process:** a peer's untracked `review-repro.spec.ts` was re-run (3 of 4 repros now fail by design) and MOVED out of the test glob into the session scratchpad, not deleted.
- **Third review pass 2026-10-24 (`bmad-code-review 11b.4`, the whole uncommitted fix-round delta) — findings T1–T18.** 1 decision (T1 = (B): the permission text v2 gains a sentence on the Trust's own withdrawal, in v2 itself); 13 patches applied (T1–T13, uncommitted); 5 deferred (T14–T18, each with its trigger in `deferred-work.md`); 8 dismissed. The Niyamavali check for `memorialCanSend` is RUN (no conflict — Row 41 (j)); Row 41 gains (k) and three device checks under (h). ⚠ `ci:local` not yet re-run on this tree; AC18 still owes the committed-tree run (36/36). Status stays `review`.
- Ultimate context engine analysis completed — comprehensive developer guide created (`bmad-create-story`, 2026-10-23, at `d87d047a`).

### File List

**Added**
- `_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-10-23-11b4-family-memorial-five-questions.md`
- `apps/admin/src/modules/memorial-review/MemorialReviewPage.tsx`
- `apps/admin/src/modules/memorial-review/derive.ts`
- `apps/admin/src/modules/memorial-review/i18n-en.ts`
- `apps/admin/src/routes/MemorialReviewRoute.tsx`
- `apps/admin/tests/memorial-review-nav.test.tsx`
- `apps/admin/tests/memorial-review.test.tsx`
- `apps/api/src/modules/auth/member/dedicated-step-up-contexts.ts`
- `apps/api/src/modules/memorial-review/handlers.ts`
- `apps/api/src/modules/memorial-review/index.ts`
- `apps/api/src/modules/memorial-review/routes.ts`
- `apps/api/src/modules/memorial/erasure.ts`
- `apps/api/src/modules/memorial/handlers.ts`
- `apps/api/src/modules/memorial/index.ts`
- `apps/api/src/modules/memorial/memorial-crypto.ts`
- `apps/api/src/modules/memorial/photo-metadata.ts`
- `apps/api/src/modules/memorial/routes.ts`
- `apps/api/tests/integration/memorial/_fixture.ts`
- `apps/api/tests/integration/memorial/member-memorial.spec.ts`
- `apps/api/tests/integration/memorial/memorial-gates.spec.ts`
- `apps/api/tests/integration/memorial/review-memorial.spec.ts`
- `apps/api/tests/unit/dedicated-step-up-contexts.test.ts`
- `apps/api/tests/unit/memorial-no-ai-dependency.test.ts`
- `apps/api/tests/unit/memorial-photo-metadata.test.ts`
- `apps/mobile/app/(memorial)/_layout.tsx`
- `apps/mobile/app/(memorial)/index.tsx`
- `apps/mobile/app/(memorial)/outcome.tsx`
- `apps/mobile/app/(memorial)/photo.tsx`
- `apps/mobile/app/(memorial)/preview.tsx`
- `apps/mobile/app/(memorial)/write.tsx`
- `apps/mobile/components/memorial-authorship/HandoverCodePanel.tsx`
- `apps/mobile/components/memorial-authorship/MemorialEntry.tsx`
- `apps/mobile/components/memorial-authorship/MemorialHeader.tsx`
- `apps/mobile/components/memorial-authorship/MemorialText.tsx`
- `apps/mobile/components/memorial-authorship/memorial-copy.ts`
- `apps/mobile/components/memorial-authorship/useMemorialQueries.ts`
- `apps/mobile/lib/memorial-api.ts`
- `apps/mobile/lib/memorial-draft.ts`
- `apps/mobile/lib/memorial-i18n.ts`
- `apps/mobile/lib/use-memorial-send.ts`
- `apps/mobile/tests/unit/memorial-draft.test.ts`
- `apps/mobile/tests/unit/memorial-screens-render.test.ts`
- `apps/mobile/tests/unit/memorial-source-pins.test.ts`
- `packages/contracts/src/memorial/dto.ts`
- `packages/contracts/src/memorial/index.ts`
- `packages/contracts/src/memorial/omissions.ts`
- `packages/contracts/src/memorial/photo-storage.ts`
- `packages/contracts/src/memorial/text-classes.ts`
- `packages/contracts/src/memorial/vocab.ts`
- `packages/contracts/tests/memorial.test.ts`
- `packages/domain/migrations/0181_memorial-authorship.sql`
- `packages/domain/src/memorial/authorisation-copy.ts`
- `packages/domain/src/memorial/errors.ts`
- `packages/domain/src/memorial/index.ts`
- `packages/domain/src/memorial/resolve.ts`
- `packages/domain/src/memorial/review.ts`
- `packages/domain/src/memorial/status.ts`
- `packages/domain/src/memorial/submission.ts`
- `packages/domain/src/memorial/vocab.ts`
- `packages/domain/src/memorial/withdrawal.ts`
- `packages/domain/src/policies/memorial-rls.ts`
- `packages/domain/src/schema/memorial_review_decisions.ts`
- `packages/domain/src/schema/memorial_submissions.ts`
- `packages/domain/src/schema/memorial_withdrawals.ts`
- `packages/domain/tests/memorial/memorial-status.test.ts`
- `packages/i18n/locales/en/memorial.json`
- `packages/i18n/locales/hi/memorial.json`
- `packages/platform-adapters/src/memorial-photo-storage/gcs.ts`
- `packages/platform-adapters/src/memorial-photo-storage/in-memory.ts`
- `packages/platform-adapters/src/memorial-photo-storage/local-fs.ts`
- `packages/ui/src/memorial/index.ts`
- `packages/ui/src/memorial/presenter.ts`
- `packages/ui/tests/memorial/presenter.test.ts`
- `scripts/microcopy/memorial.test.ts`
- `apps/api/tests/integration/memorial/actor-denial.spec.ts`
- `apps/api/tests/integration/memorial/races.spec.ts`
- `apps/api/tests/integration/memorial/review-detail-and-list.spec.ts`
- `apps/api/tests/integration/memorial/send-commit.spec.ts`
- `apps/api/tests/unit/memorial-retired-consent-values.test.ts`
- `apps/mobile/components/memorial-authorship/MemorialKeptPhoto.tsx`
- `apps/mobile/components/memorial-authorship/MemorialViewMissing.tsx`
- `apps/mobile/components/memorial-authorship/useMemorialAnnounce.ts`
- `apps/mobile/tests/unit/memorial-a11y-scan.test.ts`
- `packages/contracts/tests/memorial-text-classes.test.ts`
- `packages/domain/tests/integration/rls/memorial-policy-regression.spec.ts`
- `packages/domain/tests/memorial/memorial-earlier-approval.test.ts`
- `packages/ui/src/memorial/bidi.ts`
- `packages/ui/tests/memorial/bidi.test.ts`

**Modified**
- `.decision-log.md`
- `_bmad-output/implementation-artifacts/deferred-work.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `_bmad-output/planning-artifacts/epics.md`
- `apps/admin/src/api/client.ts`
- `apps/admin/src/api/hooks.ts`
- `apps/admin/src/router.tsx`
- `apps/admin/src/routes/RootLayout.tsx`
- `apps/api/src/audit/audit-sink.ts`
- `apps/api/src/config.ts`
- `apps/api/src/context.ts`
- `apps/api/src/deps.ts`
- `apps/api/src/modules/auth/member/member-auth.handlers.ts`
- `apps/api/src/modules/member-data-rights/handlers.ts`
- `apps/api/src/modules/rtbf/handlers.ts`
- `apps/api/src/server.ts`
- `apps/api/tests/integration/_setup.ts`
- `apps/mobile/app/(tabs)/index.tsx`
- `apps/mobile/app/_layout.tsx`
- `docs/launch-gate-inventory/inventory-roster.md`
- `docs/tone-review-checklist.md`
- `friction-budget.md`
- `microcopy.yaml`
- `openapi/v1.yaml`
- `packages/api-client/src/index.ts`
- `packages/contracts/scripts/emit-openapi.ts`
- `packages/contracts/src/index.ts`
- `packages/domain/migrations/meta/_journal.json`
- `packages/domain/src/encryption/field-classes.ts`
- `packages/domain/src/encryption/index.ts`
- `packages/domain/src/index.ts`
- `packages/domain/src/member/anonymize.ts`
- `packages/domain/src/policies/index.ts`
- `packages/domain/src/rbac/permissions.ts`
- `packages/domain/src/rbac/roles.ts`
- `packages/domain/src/schema/index.ts`
- `packages/domain/tests/integration/member/workplace.spec.ts` — 6.36a's pin now reads `{ memorialPhotoKeys: [] }` (the new return of `anonymizeMember`; the pin's intent is unchanged — Completion Notes (vii))
- `packages/domain/tests/member/rtbf-anonymize.test.ts`
- `packages/domain/tests/rbac/permissions.test.ts`
- `packages/domain/tests/rbac/roles.test.ts`
- `packages/i18n/src/catalog.ts`
- `packages/platform-adapters/src/index.ts`
- `packages/ui/src/index.ts`
- `_bmad-output/implementation-artifacts/11b-4-memorial-authorship-surface-family-writes-the-story.md` (this file)

## Change Log

| Date | Version | Change |
|---|---|---|
| 2026-10-23 | v0.1 | Created via `bmad-create-story` at `d87d047a` in worktree `.claude/worktrees/11b-4-…`: `backlog → ready-for-dev`. Panel routing note drafted (Q1–Q4, ⛔ not sent). Build decisions MA1–MA13 proposed. |
| 2026-10-23 | v0.2 | Fresh-context validation applied before commit: handover step-up leg (AC7a), server-supplied authorisation text, fursat test that can fail, advisory-lock concurrency, migration `0181` (0180 is 6-36d's), Q4 in the go-live fence, audit order per `withCompensatingAudit`, missing wiring (api-client, server registration, openapi, infra, test setup, catalog map), name source, governance re-characterised (`-162` cl.5 / `-223` author-commit; `-177` ⛔ not a general ban). |
| 2026-10-23 | v0.3 | Validated (`bmad-create-story validate 11b.4`, four fresh-context verifiers at `d87d047a`; BigDev "all"). Principal stated exactly (sign-in code to the deceased's own number; the nominee's code is the 5-minute write step-up) and "no deadline" bounded by the family still being able to sign in; own `MEMORIAL_DRIVE_POOL_STATES` (`-196` Consequence 2) and the post-close window (MA14); erasable Tier-1 (MA15, the 0092 lesson) + Q5; the Trust may withdraw an approval (MA16); a server switch (MA17, AC19); photo / alt text may be left out, reasons limited to the epic's grounds (MA6); MA5 re-grounded (one record per version of the words; FR-97 departure; nominee recorded); serial writes under the lock (Trap 12); multipart, Idempotency-Key, blank / length rules (Trap 11, AC7); history view for reviewers (AC9); metadata stripped at ingest (MA8); segment-shaped presenter; Trap 7 corrected with a device check; copy gates reach the authorisation registry and mobile files; wiring completed; routing note corrected (Q1's deciding fact, Q2, Q4 option B) and renamed for Q5 + three non-blocking confirms. Then a fresh-context re-validate of these edits (two verifiers) applied before commit: ⛔ no production pool reaches `closed` (surface inert until the Epic 7 window scheduler — MA14, Row 40, AC16 (13), Question 8); erasure reaches a deceased member's record only after a withdrawal or termination, so retention is indefinite in practice (MA15, Q5); the fourth Tier-1 column (withdrawal note) erasable; the nominee recorded by version head; one reason per part left out, `identifies_a_child`, `family_asked`; the switch answers before the step-up gate; the Idempotency claim ordered first; the invisible-character class copied into contracts. A third round fixed: the nominee version read by a memorial-local query (version heads carry ⛔ no id); "trustees" has a Trustee-Lite reading (MA7 / Confirm 1); the Trust may withdraw the chain's latest approval even after a newer version; AC17's edit list; AC7a's hook outcomes; the audit-union split. |
| 2026-10-23 | v0.4 | The Panel ruled (`-391`, Trustee-ratified — Dhiraj Rahul + Kalpana Bharti): Q1 A, Q2 A, Q3 B with a rider, Q4 A, Q5 A, Confirms 1–3 A. Transcribed: Q table → rulings; AC4's permission text says **a published memorial cannot be taken down** (Q3 rider) and where it appears (Q2 A); registry marker `…v1-pending-hi-review`; MA5/MA6/MA7 confirms ratified; MA16 is the exceptional-case route before publication; Row 40 drops the Panel criteria; AC16 items cite the rulings; this story's author-commit moves to the next free id (`-392`+; `-389`/`-390` are 5.11's). Row stays `ready-for-dev`. |
| 2026-10-23 | v0.5 | The Panel clarified Q3 (`-392`, Trustee-ratified, relayed by BigDev): take-downs are discouraged; a published memorial is taken down only for a genuine reason, the **helpline operator** decides on merit, removes it within 7 days, and an email goes to the approver. New **MA18** (PROPOSED, ⭐ in 11b.4a): the operator's take-down — key for `helpline_operator`, a `helpline` withdrawal actor, `family_asked` + merit note, the 7-day clock, the approver email (needs a new ADR — ADR-0040's identity-read fence). Here: MA16 takes ⛔ no family request; `family_asked` ⛔ not minted. Author-commit → `-393`+. Row stays `ready-for-dev`. |
| 2026-10-23 | v0.6 | The Panel withdrew `-391`'s Q3 rider (`-393`, Trustee-ratified, relayed by BigDev) and asked for soft measures; BigDev chose M1 (a removal leaves no trace), M2 (an honest helpline notice at Send), M3′ (a preview line, BigDev's words) and M4 (a smaller fix first). AC4 carries M2 + M3′ (⛔ no "cannot be taken down"); MA5 — revocable after publication through the helpline; MA18 rewritten (⛔ no merit test; `-392` items 4–5 pending confirmation); AC16 (1) carries M1; author-commit → `-394`+. Row stays `ready-for-dev`. |
| 2026-10-23 | v0.7 | `-395` (author-commit, BigDev): a published memorial is taken down only on the **nominee's** request (verified by a call back to the nominee recorded on the submission — MA18); `-392` items 4–5 (within 7 days; email to the approver) KEPT; the Panel informed of `-393`. `-394` is 5.11's ⇒ this story's author-commit → `-396`+. Row stays `ready-for-dev`. |
| 2026-10-23 | v0.8 | Readiness re-check at `origin/main` `1268d47e`: launch-gate Row 40 is 5.11's (committed) ⇒ this story's row is **Row 41**; migration `0181` also planned by 6.36e (first to commit takes it); ledger `al` collides with 6.36e's (re-letter at the Task 0.1 rebase). BigDev *"I am fine with 11b-4a"* noted against Questions 2 (MA1) and 9 (MA18). Row stays `ready-for-dev`. |
| 2026-10-24 | v0.9 | Validated (`bmad-create-story validate 11b.4`, four fresh-context verifiers at `origin/main` `1268d47e`; BigDev "all"). **New MA19 / AC20 / Trap 13** (BigDev (a)): the generic member step-up route minted a `claim_handover` elevation with a code to the deceased's own phone — Q1 A was unenforced (also for claim intake and the bank-statement upload); `stepUpRequest` now refuses it. **Phone cache:** every memorial query sets `gcTime: 0` (the persisted MMKV cache would otherwise keep the family's words past sign-out and erasure; CR-11b.2a-COMBINED-W3 (iii) annotated). AC9's refusals are per route (withdraw-approval acts on a superseded approval; the history view reads every version); AC10 shows the helpline on every outcome and *Write again* iff `canSend`; MA5/MA9/MA16 say the **nominee** asks for a take-down; MA18's call-back marked as the author's proposal (`-395` Not covered), the replaced-nominee case open; AC4's M2 addressed to the nominee (`-395` Consequence 1); `-395` item 3 shown to the Panel joins Row 41; AC16 carries the dropped Not-covered lines + counsel risks; `-391` item 8 pointer at Task 1.1. Multipart truncation is silent (`valueTruncated` check); `keepPreviousPhoto` cleanup never deletes a reused object; the nominee-unresolved 409; the stripper checks magic bytes and drops MPF trailers; `anonymizeMember`'s callers + its three pins (6.36e sequencing); `BIDI_CONTROLS` / invisible class (+ U+FFA0) by value in contracts; expo-file-system `File`/`Paths` with a relative name; the Idempotency-Key kept in the draft; AC7a's hook read at render time; admin link required and ungated (moderation-appeals precedent); microcopy files listed by name + the registry scanned directly; the Hindi M3′ clear of `अभी कर`; 6.35's source pins; tamagui inputs, ⛔ no `maxLength`; preview and send one screen; every AC obligation now in a Task (5.1a, 5.6, 6.7 new); named identifiers table; Task 0.2 asks only the open MAs; `0180`/6-36d text updated; stale header history marked. Then a fresh-context re-review of this pass's own diff fixed: the ledger letter (`2026-10-24a` is 6.36e's ⇒ `-24b`); *Write again* also on `with_the_trust` (MA13's `canSend`); the draft's Idempotency-Key cleared on any 2xx, with a refetch on resume and past the 300 s TTL; the nominee resolved **before** the photo `put`, cleanup on any later failure; the MPF cut by walking segments (an EXIF thumbnail holds its own EOI); MA19 lists all four `claim_handover` routes and BigDev's words verbatim; the `-391` item 8 pointer re-grounded (⛔ not a supersession); `-395` "answers `-393`'s *who may ask*" (⛔ "reverses"); W3 trigger (iii) ⛔ not met; `photo_conflict`; `-392`'s declined-request line; five citation fixes. Row stays `ready-for-dev`. |
| 2026-10-24 | v1.0 | Implemented via `bmad-dev-story 11b.4` (worktree, `origin/main` `1268d47e`): rebased; `-398` author-commit (MA1–MA19, all as recommended) alone; records; migration `0181`, catalog 53, erasure, domain + contracts + presenter, the member + review API with the MA19 step-up guard and the photo stripper, the mobile `(memorial)` flow, the admin review screen, the `memorial` copy, Row 41, deferred-work. Live-DB legs on the fresh `:5434` (BigDev; `:5433` rolled back). `ci:local` 41/42 on `39a0c4f2` + the unit job re-run green (one untouched flake). Status `in-progress → review`. |
| 2026-10-24 | v1.1 | Code review (`bmad-code-review 11b.4`, BigDev): three parallel layers (Blind / Edge Case / Acceptance Auditor) + a peer's four repros verified on `:5434`; R1 (DECIDED B: the permission text gains the "only the nominee can ask" sentence — a NEW version id `2026-10-24.v2-pending-hi-review`, v1 byte-unchanged) and R2 (DECIDED A: the family is told an earlier approved version still stands) became patches; R1–R22 applied ("apply every patch"), then a two-part fix-diff review found and fixed 14 more things, incl. a dead `23505 -> 409` mapping in Send; AC1 amended in part by R20, AC9 amended by R9 / R14 (dated annotations, original text kept); 9 deferred (R23–R31); Row 41 gains (h) device checks and (i) the photo bucket; Status `review` -> `done`. Uncommitted. |
| 2026-10-24 | v1.2 | Second review pass over the fix round (Blind / Edge Case / Acceptance Auditor on the round-2 delta): v1.1's Status `done` WITHDRAWN — AC18 closes only on a green `ci:local` after the last commit, so Status returns to `review` until the committed-tree pre-push run (the 5.11 precedent); R22 reopened as partly addressed; Row 41 gains (j) the Niyamavali check and (f)'s glyph inversion is corrected; deferred R32 (RTL-script neutrals at a segment boundary) and the "never serialise `reason` publicly" note on 11b-4a's trigger; the pass's own code findings are recorded under "Second pass" in Review Findings. Uncommitted. |
| 2026-10-24 | v1.3 | Third review pass (Blind / Edge Case / Acceptance Auditor on the whole uncommitted fix-round delta, 58 files): T1 DECIDED (B) by BigDev; T1–T13 applied ("apply every patch") — the kept photo no longer refetches forever (T2), the Send key knows its age (T3, AC3 AMENDED), a committed Send answers 201 (T4), AC7a's single SMS restored (T5), stale Write / Photo screens re-read the draft (T6), Decided ordered by decision time (T7, AC9 SUPERSEDED IN PART), over-limit errors linked and announced once (T8), colour profiles kept (T9), five tests made able to fail (T10), records corrected (T13 — job counts, R22, R23, Row 41 (j) run, (k) added); T14–T18 deferred. Status stays `review`. |
| 2026-10-24 | v1.4 | Fix-diff reviews V / W, the X-round redesign (BigDev "1" + "Key on the row": the Send's key on the submission row, migration `0182`; one handover state machine), the final review Z (Z0 DECIDED (A): "Send a new code"), and a device run (D1–D3 fixed). Decision `2026-10-24-400` committed alone (`5ebb65d6`), then the code (`19068923`) and these records. Status stays `review` until `ci:local` (36 jobs) is green on the committed tree. |
