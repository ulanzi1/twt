---
baseline_commit: 4e57fa42
---

<!--
⭐ BASELINE: `4e57fa42` — `records: ledger landing entry relabelled 2026-10-27i -> 2026-10-27j`. Authored at `bab88287`
(v0.1–v0.3); the branch was rebased onto `4e57fa42` and the story RE-VALIDATED there (v0.4). Two facts, stated separately:
  - the pin is an ancestor of HEAD (durable);
  - every code claim below was re-read at `4e57fa42` (perishable). Re-diff `packages apps scripts` at Task 0.1.
⚠ `bab88287..4e57fa42` landed `fix/talkback-session-2026-10-27` (PR #306): Decisions `-409` (claim screens name the member — it
MOVED 11b.4's `resolveIntroName` out of `memorial/handlers.ts` into `apps/api/src/modules/kyc/member-facing-name.ts`
`resolveMemberFacingName`, landed at `a6f25dd5`) and `-410` (the no-name wording); a11y fixes to
`apps/mobile/app/(memorial)/{index,write,photo,preview}.tsx` + `useMemorialAnnounce.ts` (`outcome.tsx` unchanged); one
unrelated `audit-sink.ts` line. ⇒ STOP 1 and STOP 2 FIRED at v0.4 and are DISPOSED: none of it touches this story's surface.
This story renders ⛔ no deceased name (Trap 14), so it never calls the name chain; should a later need arise, read it in
`kyc/member-facing-name.ts`, ⛔ never re-create it in `memorial/`.
⚠ No `file:NNN` pointer in this file points into `.decision-log.md`, `deferred-work.md` or `sprint-status.yaml` (all
newest-first). Cite those by decision id / clause / item / row key only.
⭐ NUMBERS at the pin (re-check ALL of them at Task 0.1 across every branch AND every worktree):
  next decision id `-412` (HEAD `-411` on this branch — `-411` is the PANEL'S RULING on this story's routing note; `-410` on main) · next migration `0186` (HEAD `0185_contribution-suppression-batch-indexes`) ·
  `PERMISSION_CATALOG_VERSION` `53` (69 keys) · next ADR `ADR-0043` (HEAD `ADR-0042`, none higher on any ref; ADR index
  Total 154) · launch-gate: this story CLOSES Row 41 (b) and ADDS criteria (l)–(q) to Row 41 (no new row; (a)–(k) are taken) ·
  ledger: this story's creation entry is `2026-10-27i`; main's `-27j` cites the creation commit by its PRE-rebase SHA
  `dacbf424` (reachable from no ref, only the reflog; the rebased commit is `598a321d`); the next free letter is `-27k`. Live peer worktrees at
  v0.4: none besides this one; the MAIN checkout is on `main`.
⭐ WORKTREE: `.claude/worktrees/11b-4a-family-memorial-public-render`, branch `story/11b-4a-family-memorial-public-render`
(created from `bab88287`, rebased onto `4e57fa42`). Push with `-u origin story/11b-4a-…` the first time, ⛔ never a bare `git push`.
⭐ LETTERS: `MP1–MP14` = this story's build decisions (⛔ never `MA` — those are 11b.4's, cited by `-398`).
`T1` (told), `PQ1`, `PQ2`, `PC1–PC5` = the items in this story's routing note. 11b.4's letters are cited qualified
(`11b.4 MA13`, `-393 M1`) per `-168` cl.9.
⚠ GLYPH INVERSIONS UPSTREAM: the 11b.4 section of `deferred-work.md` (items (1), (2), (7), (11)), the `0183` header **and the
`0152` header** (≥ 5: "A claim with ⛔ eligible admin", "⛔ A fourth purpose on 0151", "⛔ ever provider message text", "each ⛔
repeated here", "(⛔ touched)") carry ⛔ markers with the negator MISSING (e.g. "`apps/public` does ⛔ depend on `@twt/ui`" means
it does NOT). ⛔ Never copy text from those sites; quote the 11b.4 story file, the decision log, or the code's behaviour instead.
-->

# Story 11b.4a: The Family Memorial on the Public Sahyog Vivran Page — Render, Photo, and the Helpline Take-Down `[SURFACE]`

Status: review

## ⭐ GLYPH REGISTER — read this before any clause below

⭐ = an action to take · ⚠ = a hazard · **⛔ marks a negation and must be followed by an explicit negator** (`not` / `no` /
`never` / `nothing` / `neither`, or a prohibition verb). A ⛔ placed before a positive clause is an **inversion**, not
emphasis. Doubling (`⭐⭐`, `⛔⛔`) adds volume only.

---

## ✅ PREFLIGHT — STARTABLE for the build after Task 0.2. ⛔ NOT launchable until Row 41 closes.

**Authority.** The row was minted by `-398` **MA1** (author-commit): *"The public render (matrix fields, Tier-1 public
exceptions, the Astro slot, the public photo pipeline, the take-down) is a new row `11b-4a-family-memorial-public-render`,
gated on 11b.5's components."* Its content is ruled by the Panel: `-391` item 2 (Q2 A, Trustee-ratified), `-391` item 3 as
amended by `-393` (part (i) Trustee-ratified — the rider withdrawn, soft measures only; part (ii) author-commit — M1–M4), `-392` items 4–5 (Trustee-ratified, KEPT by `-395`), and
`-395` (author-commit: **only the nominee's request** counts). ⚠ `-395` item 3 adopts what `-393` (ii) did ⛔ not choose as a soft
measure — *"⛔ Not chosen: hiding at once and deleting later (5); requiring the nominee to make the request (6); the list's own
preview line"* — a question `-393` left open (Not covered: *"who may ask — with measure 6 ⛔ not chosen, whether the operator takes
a request from any family member or only the nominee who gave the permission (Q1 A) is ⛔ not ruled"*). The Panel, shown `-393`
(`-395` item 4), has ⛔ not been shown `-395`'s answer ⇒ **T1** in the routing note (told, quoting both lines). `-162` cl.3 (Trustee-ratified): family-owned material is
authorised at the point of submission — 11b.4 records that authorisation on every submission row; this story **reads** it
and ⛔ never asks again.

**Routing-template §0 gate, applied to every open question this story found** (template:
`_bmad-output/planning-artifacts/trustee-panel-routing-note-TEMPLATE.md`):

| # | Question (stripped of citations) | §0 verdict | Where it goes |
|---|---|---|---|
| G1 | Build the render before Story 11b.5's components exist? | **Ours** (sequencing; nobody sees a difference) | MP1 → `-412` |
| G2 | When the nominee who sent it has died, cannot be reached, or has been replaced, who can have the memorial taken down? | **Panel's** — what the Trust owes a family | **T1** (told: `-395` answers the question `-393` left open with what (ii) did ⛔ not choose — measure 6) then **PQ1**; built as `-395` literally until ruled |
| G3 | The family's words may name the member who died, and the photo shows their face — but no drive page shows the member's name today. Do the words still appear? | **Panel's** — what the Trust discloses about a person | **PQ2**; built as `-391` Q2 A ("as approved") until ruled |
| G4 | Does the public page mark where the Trust left a part out? | **Panel's to confirm** — disclosure | **PC1** — ⚖️ RULED **B** (`-411` item 3): ⛔ no marker — MP3 (b) |
| G5 | After a take-down, may the nominee send a new version? And when the Trust approved the memorial exactly as sent, a "smaller fix" means taking it down first | **Panel's to confirm** — what is owed; the second half narrows `-393` M4 in part | **PC2**; built as MP9 (yes — 11b.4 MA13: after a withdrawal the family may send again; `-392` Not covered) and MP8 (split by shape) |
| G6 | When do the 7 days start; who gets the email when the approver has left? | Split: the clock's start **MATCHES** `-392` item 4 (*"the family's request reaching the helpline"*) under MP14 (b) — **ours**, ⛔ not asked; who is told when an approver has left is **Panel's to confirm** (**PC3**); the email's mechanics are **ours** (MP10/MP11) | PC3 + MP10/MP11/MP14 |
| G7 | How is a part left out *after* publication (`-393` M4's "smaller fix")? | **Ours** — `-393` Not covered: *"the mechanism is the build's"* | MP8 → `-412` |
| G8 | How does the operator know the caller is the nominee? | **Ours** — `-395` Not covered: *"the build's"* | MP7 → `-412` |
| G9 | How the photo is served, resized and cleaned | **Ours** | MP4/MP5 → `-412` |
| G10 | The approver's email address is staff identity data | **An ADR** — ADR-0040 admits exactly two read paths, *"a third is a new ADR"* | **ADR-0043** (Task 1) |
| G11 | The family's description of the photo (its alt text) appears with it on the public page | **Panel's to confirm** — `-391` item 2 rules *"The words and photo"*; the v3 permission text names *"these words, and the photo if you added one"*; `RULED_TIER1_PUBLIC_EXCEPTIONS`: *"ADDING TO THIS LIST IS A RULING"* | **PC4**; built as admitted (AC2) until ruled — dark until Row 41 |
| G12 | A member must see MORE than the public (`-189` cl.3, TR) — does that reach the family's words, which the member app does ⛔ not show? | **Panel's to confirm** — `-195` cl.1 binds it to *"the drive data class — the nominee/bank fields and the drive record"*, and `familyMemorial` is served inside `drive` | **PC5**; built on the exclusion reading (Trap 17) until ruled |

⇒ ⭐ **ONE routing note** (T1, PQ1, PQ2, PC1–PC5), drafted at Task 1.3, ⛔ **not sent** by this story's author — BigDev sends it.
⛔ None of it blocks the BUILD; all of it is a go-live criterion on Row 41 (AC19). It discharges Row 41 (e) (*"`-395` item 3
shown to the Panel"*) only once sent **and** only because it shows item 3 itself (T1) — PQ1 alone is item 3's open edge, ⛔ not item 3.

> ## ✅ THE PANEL RULED — `2026-10-27-411` (Trustee-ratified, Dhiraj Rahul + Kalpana Bharti, relayed by BigDev 2026-10-27)
> *"by DR and KB / PQ1 - A / PQ2 - A / PC1 - B / PC2 - A / PC3 - A / PC4 - A / PC5 -A"* — the note was SENT and answered;
> ⛔ no reply to T1 is recorded (shown ⇒ Row 41 (e) MET).
> - **PQ1 A** — only the nominee who sent it; ⛔ no one else if that nominee has died or been replaced (built — MP6–MP8).
> - **PQ2 A** — words and photo as approved, though the page names ⛔ no member yet (built).
> - **PC1 B** — ⚠⚠ **a part the Trust left out is ⛔ NOT marked on the public page; the words on either side are joined.** This
>   REVERSES MP3 (a): the wire carries ⛔ no `omitted` segment, the page renders ⛔ no `render.omitted` copy, and `apps/public` no
>   longer needs `@twt/ui` (MP3, Traps 3, 5, 8, 16; AC2, AC3; Tasks 4.1, 5.2, 6.1, 6.2, 6.5 — all rewritten below). ⚠ The family's
>   outcome sentence *"They will appear on the member's Sahyog Vivran page like this."* (shown above a rendering WITH the marks)
>   becomes inaccurate ⇒ AC8 / Task 9.1 / Question 10 (wording owed by BigDev).
> - **PC2 A, PC3 A, PC4 A, PC5 A** — built as described (write again; ⛔ no substitute recipient; the alt text public on `-411` item 6;
>   the member-sees-more floor does ⛔ not reach the family's words, `-411` item 7).
> ⇒ Every "PQx / PCx asks the Panel" below is now ANSWERED by `-411`; this story's own author-commit is `-412`.

**STOP conditions — check at Task 0.1; any one ⇒ stop and ask BigDev:**
1. `origin/main` moved past `4e57fa42` and touched any file in *What already EXISTS* ⇒ re-read it before trusting this file
   (fired and disposed at v0.4 for `bab88287..4e57fa42` — header).
2. A decision newer than `-410` touches `memorial`, `-391`…`-398`, `-400`, `-405`, `sahyog-vivran`, the matrix, or `helpline_operator`.
3. Migration `0186` or decision `-412` or `ADR-0043` is taken on any branch or worktree ⇒ re-number everywhere in this file.
4. Story 11b.5 has moved off `backlog` ⇒ MP1 re-opens (its components may now exist).
5. The 11b.4 permission text (`MEMORIAL_SUBMISSION_AUTHORISATION_COPY_VERSION`) moved past `2026-10-25.v3-pending-hi-review`, or
   any version's text no longer says *"on this member's Sahyog Vivran page, which anyone with its link can read"* ⇒ the
   placement this story may use has changed (Trap 12).
6. The helpline's member lookup by mobile (`POST /api/v1/p/:pariwarId/admin/members/search` `{ by: 'mobile', value }`, key
   `member.view_validity`, admin `MemberSearchRoute`) does ⛔ not return **deceased** members (Task 0.1 (f) confirms) ⇒ MP12 re-opens.

---

## Story

As **a bereaved family whose words the Trust has approved**,
I want **those words — and the photo, if we sent one — to appear on our member's Sahyog Vivran page exactly as the Trust
approved them, and to come down if our nominee asks the helpline**,
so that **the people who gave for our member can read who they gave for, in our voice, and so that we are never trapped
by a decision we made in grief**.

And, as **a helpline operator**, I want **a single, careful screen to record a nominee's take-down request after calling
them back, offer a smaller fix, and take the memorial down within 7 days** — so that the Trust keeps its word to the family
and the approver is told.

---

## 📜 Policy meaning (AI-10-1 — read before the ACs)

This story introduces **two** predicates and changes **one** that decide what a family gets. In the family's terms:

1. **Publication.** *"Once the Trust approves your memorial, your words — less any part the Trust left out, with ⛔ no mark where it was
   (`-411` item 3) — and your photo appear on your member's Sahyog Vivran page for anyone who has its link, and stay there until a newer
   version you send is approved, your nominee asks the helpline to take it down, or the Trust withdraws its approval on one
   of its four grounds. The Trust can also switch memorials off for a time, and if your member's data is erased the memorial
   goes with it."*
   - **Checked against the Niyamavali:** the rulebook is **silent** on family-written memorial content. §6.5 reads *"Post-approval
     outcomes and reversals are publicly visible on the memorial / Sahyog Vivran (consent-gated)."* — it sits in Part 6
     (CLAIM) and concerns claim **outcomes**; ⛔ not engaged by family-written content. Part 10 reads *"(a) public
     contributor-list rendering; (b) verifier-name publication on the Sahyog Vivran; (c) In Memoriam inclusion. Default
     opt-in is not permitted; an opt-out path is provided."* — a claim-time-era consent list. The tension with `-162` cl.3
     (*"never prospectively, at claim time"*) is pre-existing and recorded in the 11b.4 routing note, E2 (*"The Niyamavali's
     claim-time consent list ("(c) In Memoriam inclusion") is likewise pre-`-162` and binds ⛔ nothing"*) — ⛔ not created here,
     ⛔ not a blocker (the Niyamavali is a rulebook, not a spec). ⚠ Part 10's letters do ⛔ not line up with the claim-screen
     boxes `-162` dealt with (it retired (b) `sahyog_vivran_publication`, (c) `in_memoriam_listing` and (d), and kept (a)
     `claim_time_dpdpa`, cl.4). Result: **no conflict**. Read at v0.4 in the main checkout (sha256 `niyamavali.md`
     `f91746355a81e85a…`, `niyamavali.hi.md` `dfe8179678016dce…`; the Hindi §6.5 and Part 10 match); Task 0.1 (g) re-checks the
     hashes, the Row 41 (j) way.
2. **Take-down.** *"Only the nominee who sent the memorial can have it taken down. The helpline calls that nominee back on
   the number the member recorded for them before acting; anyone else who calls is listened to and asked to have the
   nominee call."*
   - ⚠⚠ **THE CONSEQUENCE THAT MUST BE SAID OUT LOUD (the 10.10 lesson):** *"If that nominee has died, cannot be reached, or
     has since been replaced, nobody in the family can have the memorial taken down. If the Trust approved it with a part
     left out, the family's current nominee can send a new version, which replaces it once the Trust approves it; otherwise
     it comes down only if the Trust itself withdraws its approval on one of its four grounds."* That is what `-395` item 3
     means when built literally (a Send needs the **current** nominee's `claim_handover` step-up — `resolveHandoverNominee`,
     `memorial/handlers.ts`; `memorialCanSend` is false only after a clean `approved`), and the v2/v3 permission text already
     says the first half to the nominee (*"Only the nominee can ask for it to be taken down; the helpline will not remove it
     at anyone else's request."*). ⭐ It is **T1 + PQ1** in the routing note.
   - **Checked against the Niyamavali:** silent on who may withdraw family content; Part 10's *"an opt-out path is provided"*
     is satisfied for the nominee and ⛔ not for anyone else — recorded, ⛔ not a conflict (Part 10 is the claim-time-era list
     above, which binds ⛔ nothing here). Re-checked at Task 0.1 (g).
3. **Writing again after a take-down** (changes `memorialCanSend` / `memorialCanWithdraw` for the new `taken_down` state).
   *"After your memorial is taken down at your nominee's request, your nominee may write and send a new one whenever they
   wish, just as after the Trust withdraws its approval; it appears only once the Trust approves it."*
   - ⚠ This amends the 11b.4 sentence recorded at Row 41 (j) (*"once the Trust has approved your memorial exactly as you sent
     it, you cannot send another version in the app; the helpline is how you ask for a change"*) — after this story the
     helpline route can end in a new version. Task 1.4 adds a dated annotation to Row 41 (j).
   - **Checked against the Niyamavali:** silent on re-submission of family content. Result: **no conflict**. ⇒ ⚖️ confirmed by the Panel — `-411` item 4 (PC2 A).

Scope: ⛔ no contribution, assignment, claim or payout predicate is read or written. The family's own predicates (above) are
in scope per the 11b.4 / Row 41 (j) precedent.

---

## 🎯 What already EXISTS — re-read at `4e57fa42` (re-verify at Task 0.1)

| Need | What exists | Reuse? |
|---|---|---|
| The family's words, photo key, permission | `memorial_submissions` (migration `0182_memorial-authorship.sql`; schema `packages/domain/src/schema/memorial_submissions.ts`) — `body_ciphertext`, `alt_text_ciphertext`, `photo_object_key`, `photo_mime`, `handover_nominee_ref` (a `member_nominee_versions.version_id`, ⛔ no FK), `supersedes_submission_id` chain, `pool_id`, `deceased_member_id` | ⭐ read only |
| The Trust's decision | `memorial_review_decisions` — `action`, `omissions` jsonb (UTF-16 spans + reason), `photo_left_out_reason`, `actor_id`, `actor_display` | ⭐ read only; `actor_id` is the **approver** (MP10) |
| Withdrawals | `memorial_withdrawals` — PK `submission_id` (one per version), `withdrawn_by memorial_withdrawal_actor ('family','trust')`, `reason_code memorial_review_reason`, CHECKs `memorial_withdrawals_reason_iff_trust`, `memorial_withdrawals_actor_display_check` (both written for `trust` only) | ⭐ widen (MP6, Task 2) |
| "Which version the page shows" | `latestApprovedIndex(chain)` — `packages/domain/src/memorial/status.ts` (scans newest → oldest for an approval with `withdrawal === null`) | ⭐ reuse — ⚠ Trap 1 |
| State derivation | `deriveMemorialStatus(link)` (`status.ts`) — ONE link (`MemorialChainLinkState` has ⛔ no timestamps), exhaustive switch, **throws** on an unknown actor; `MEMORIAL_STATES` (7, **in `status.ts`**, ⛔ not `vocab.ts`); `memorialCanSend` = `state !== 'approved'`; `memorialCanWithdraw` = `with_the_trust`; `memorialChainState(chain)` (`submission.ts`) = `deriveMemorialStatus(head)` — called by `decideMemorialSend`, the member GET (`memorial/handlers.ts`) and the review DETAIL's `memorialState` (`memorial-review/handlers.ts`); the review list derives each row from its head (`memorial-review/handlers.ts`); `deriveEarlierApprovalWithdrawn` (`status.ts`) | ⭐ widen (`taken_down`) — ⚠ Traps 15, 18 |
| Chain read + lock | `readMemorialChain` (oldest → newest), `lockMemorialPool` (`pg_advisory_xact_lock(hashtext('memorial:'||pool_id))`) — `packages/domain/src/memorial/submission.ts` | ⭐ every new writer takes the lock |
| The presenter (preview == outcome) | `packages/ui/src/memorial/presenter.ts` — `reconstructMemorial(words, decision)` → `asApproved` paragraphs of segments `{kind:'text',text} \| {kind:'omitted',key:'render.omitted',reason}`; `memorialParagraphs`; `MEMORIAL_OMITTED_KEY` | ⭐ **the** source of the public text (MP3) |
| Bidi safety | `packages/ui/src/memorial/bidi.ts` `isolateMemorialBidi` (11b.4 R13) | ⭐ apply per text segment on the page |
| Decrypt | `apps/api/src/modules/memorial/memorial-crypto.ts` `decryptMemorialField` (`MEMORIAL_FIELD_CLASS`) | ⭐ reuse in the public handler |
| Photo storage | Port `MemorialPhotoStorage` (`packages/contracts/src/memorial/photo-storage.ts`): `put`, `signedReadUrl(key, ttl)`, `delete` — ⛔ no `getBytes`. Adapters `packages/platform-adapters/src/memorial-photo-storage/{gcs,local-fs,in-memory}.ts`; wired `apps/api/src/deps.ts` (bucket `MEMORIAL_PHOTO_BUCKET`, else local-fs) | ⭐ add `getBytes` (MP4) — shape from `ClaimDocumentStorage.getBytes` (`packages/contracts/src/claims/documents.ts`), ⚠ which returns `Promise<Uint8Array>` and THROWS on a missing object (GCS `download()`); ours returns `null` — a stated departure (`ignoreNotFound` is a *delete* option, ⛔ not a read one) |
| The switch | `config.memorialAuthorshipEnabled` ← `MEMORIAL_AUTHORSHIP_ENABLED === '1'` (`apps/api/src/config.ts`), off by default | ⭐ the public render obeys it too (MP13) |
| Public page (Astro 6 SSR) | `apps/public/src/pages/sahyog-vivran/[driveToken].astro` (header: `public, max-age=60, s-maxage=300`, `Vary: Accept-Language`; outage `no-store`; `noindex`); pure view `apps/public/src/lib/sahyog-vivran-render.ts` `buildSahyogVivranView`; fetch `apps/public/src/lib/sahyog-vivran.server.ts` `fetchSahyogVivran` + hand-written guard `isSahyogVivranResponse` (⚠ checks only the keys it knows; an unknown key passes; it `return true`s early when `appealReversal === null` — Trap 5) | ⭐ extend |
| Public API | `GET /api/v1/p/:pariwarId/public-pages/sahyog-vivran/:driveToken` (`apps/api/src/modules/public-pages/routes.ts`; handler `sahyogVivran` in `public-pages/handlers.ts`): `openScopeTx` (`SET LOCAL ROLE twt_app` + `app.pariwar_id` — the memorial tables already grant it SELECT, `0182`) → `resolveDirectoryPublicationEnabled` kill switch (in-handler `reply.status(404).send()`) → `poolDomain.readPublicSahyogVivran` (the FULL drive read incl. contributors; returns `poolId`; null ⇒ the same empty 404) → decrypts (`withKmsOutageClassification`) → the `drive` object → ⚠ `writeAppealReversalDisclosureAudit` when `drive.appealReversal !== null` (global advisory lock; *"⛔ Do not widen this to log every request"*) | ⭐ extend the page (add `familyMemorial`); ⛔ never reuse this flow for the photo (Trap 19) |
| Visible pool states | `SAHYOG_VIVRAN_VISIBLE_POOL_STATES = ['live','closed','settled']` — **already exported** from `packages/domain/src/pool/sahyog-vivran-read.ts` | ⭐ import it for the photo route's narrow read (⛔ no edit to that file — AC17) |
| Erasure backstop pattern | `public-pages/handlers.ts` — `if (storedName === memberDomain.ANONYMIZED_SENTINEL)` after the deceased-name decrypt | ⭐ mirror for the body (Trap 4) |
| Matrix | `packages/contracts/public-pages/public-vs-private-matrix.yaml` (`sahyog-vivran` surface: `edge_cacheable`, `noindex`); `RULED_TIER1_PUBLIC_EXCEPTIONS` (`packages/contracts/src/public-pages/matrix.ts` — *"ADDING TO THIS LIST IS A RULING, NEVER A CODE CHANGE"*) — six pairs today | ⭐ +3 pairs citing `-391` item 2 |
| Prohibited wire keys | `SAHYOG_VIVRAN_PROHIBITED_KEYS` (contracts `public-pages/sahyog-vivran.ts`) — bans `status` | ⭐ obey (`familyMemorial`, ⛔ never `status`) |
| Staff email (6.25) | Port `apps/jobs/src/scheduler/staff-email-client.ts` (SES / ZeptoMail / fake, plain text); sweep `apps/jobs/src/scheduler/claim-suspicion-staff-emails.ts` (cross-tenant selector on the BYPASSRLS service pool → one child per pair, enqueued with `retryLimit: CHILD_RETRY_LIMIT` = **4**, each child under `withPariwarScope`; the **child's** claiming tx `beginSuspicionStaffEmail` inserts the row as `attempting`); outbox `claim_suspicion_staff_emails` (`0152`: outcomes `attempting/accepted/rejected/no_target/error`; ⚠ CHECK `…_no_target_recipient_check` = `(recipient_user_id IS NULL) = (outcome = 'no_target')` — `no_target` is ONLY the claim-level row written when ⛔ no admin is eligible; an ineligible recipient on a fresh pair writes ⛔ no row (`not_due`); a claimed row whose re-check fails ends `error`); identity reads `packages/domain/src/claim/staff-email-identity-read.ts` (Q1 `staffEmailRecipientsSql`, Q2 `readAdminEmailCiphertext(userId)`); fence `apps/jobs/tests/staff-email-identity-read-fence.test.ts` (exact allow-lists; projection rules in `Q_MODULE` only) | ⭐ mirror the shape (MP10); Q2 gains a caller **only after ADR-0043** |
| Roles | `helpline_operator` (`packages/domain/src/rbac/roles.ts`, scope ceiling `pariwar`; holds `claim.file`, `helpdesk.create/respond`, `member.view_validity`, `claim.view_nominee_name_check`, and — Story 6.9 (D5a in `roles.ts`; the REVOKE bullet, scope D7) — `claim.manage_dpdpa_consent` for a *"post-settlement takedown request"* revoke route; ⛔ no memorial key); `trustee_panel` holds `memorial.review` | ⭐ new key `memorial.takedown` (MP6) |
| Admin step-up | `requireStepUp(deps, actionContext)` (`apps/api/src/modules/step-up/gate.ts`; a free string — ⛔ no registry; contracts `actionContext` is `z.string().max(128)`) — e.g. `claim_file` for the helpline intake (`apps/api/src/modules/reconciliation/routes.ts`); the contracts `*_STEP_UP_CONTEXT` constants + their import in `apps/admin/src/api/client.ts` are the precedent | ⭐ new context `memorial_takedown` (MP6) |
| Admin idempotency | `idempotency.createKeyedStore(deps.pool)` — used by `/api/v1/p/:pariwarId/...` admin writes (drive-target, feature-flags) | ⭐ reuse (AC6/AC7) |
| Enum `ADD VALUE` posture | `0150_claim-closed-enum-values.sql` header: ADD VALUE in its **own file**; drizzle applies every pending file in ONE transaction ⇒ ⛔ no later file in the same run may name the new value as an enum literal (55P04) | ⭐ Trap 6 |
| Admin review UI | `apps/admin/src/modules/memorial-review/{MemorialReviewPage.tsx,derive.ts,i18n-en.ts}`, route `/p/$pariwarId/memorial-reviews[/$submissionId]`; withdrawal ternary `MemorialReviewPage.tsx` (two-way), `decidedDateLabel` (same file), `memorial.state.*` map (`i18n-en.ts`); `RootLayout.tsx` links memorial-reviews when `pariwarId` is set, **⛔ not key-gated** (a Pariwar grant never reaches `nationalGrants`) | ⭐ show helpline withdrawals (AC12) |
| Admin wiring | router `apps/admin/src/router.tsx`; route components `apps/admin/src/routes/*Route.tsx`; client + hooks `apps/admin/src/api/{client,hooks}.ts`; API module registration `apps/api/src/server.ts` (beside `registerMemorialReviewModule`); jobs registration `apps/jobs/src/boot.ts` (beside `registerClaimSuspicionStaffEmailWorkers`); OpenAPI `packages/contracts/scripts/emit-openapi.ts` (the `memorial-reviews` paths are the precedent) — `pnpm contracts:emit-openapi`, `pnpm contracts:check-openapi-determinism`; `pnpm friction:check` | ⭐ follow |
| Infra (what the photo route meets) | `apps/api/Dockerfile`: `FROM node:22-alpine` (musl); the runtime stage copies only `dist`/`package.json`/`assets` — a *"PR-1 placeholder"* (⛔ no `node_modules`, so ⛔ no workspace package and ⛔ no `sharp` reach it today); API built by `tsc`, ⛔ no bundler. Deploy: Dokploy (`infra/dokploy/compose.yaml`), ⛔ not Cloud Run; Traefik routes `/p/`, `/_astro/`, `/peer-request` and two `.well-known` paths to `apps/public` — ⛔ no `/sahyog-vivran/` path (the 6.30 F5 mismatch). ⛔ No edge cache: `infra/cloudflare/README.md` — *"**Deferred-apply.** There is no live TWT Cloudflare zone in this environment."* | ⚠ Row 41 (n), (p), (q) |
| Family screens | `apps/mobile/app/(memorial)/{index,write,photo,preview,outcome}.tsx`; copy `packages/i18n/locales/{hi,en}/memorial.json` | ⭐ add the `taken_down` state's copy (AC8) |
| Financial-truth gate | `scripts/sahyog-vivran-financial-truth/check.ts` — any file whose name matches `/sahyog-vivran/i` (or under `apps/public/src/pages/sahyog-vivran`) must join `SCAN_FILES` **in the same commit** | ⭐ add every new such file |

**What does ⛔ NOT exist (grepped at `bab88287`, re-checked at `4e57fa42`):** any public read of a memorial · any public image route or image pipeline
(the only `<img>` on public pages is the branding logo) · any image library in a `package.json` (⚠ `sharp@0.34.5` is in `pnpm-lock.yaml` only as `astro`'s optionalDependency, with `@img/sharp-linuxmusl-x64@0.34.5` already locked) · any edge cache, CDN
purge or surrogate-key mechanism · `@twt/ui` in `apps/public` (its deps are `@astrojs/node`, `@twt/contracts`, `@twt/domain`,
`@twt/i18n`, `@twt/tokens`, `astro`) · `@twt/ui` as a **runtime** dependency of `apps/api` (it is a devDependency) ·
`MemorialRecord` / `PortraitFrame` / `KinshipLattice` (11b.5 `backlog`; `apps/mobile/components/shradhanjali/*` is a
sample-data prototype, ⛔ not production) · a `helpline` withdrawal actor · a take-down request record · a memorial
event in `events_log` (11b.4 MA11: audit lines only) · a memorial-body sentinel check anywhere.

---

## ⚠ THE NINETEEN TRAPS

Each Trap ends with **→ Task** — where the dev acts on it (the dev works from the Tasks).

### Trap 1 — ⚠ Taking down the version on the page can bring an OLDER one back
`latestApprovedIndex` returns the newest approval **with no withdrawal**, scanning backwards. A chain `v1
approved_with_omissions → v2 approved` is reachable (11b.4 MA13 forbids a new version only after a *clean* `approved`). Withdraw
v2 alone and the page falls back to **v1** — a take-down that publishes the family's previous words. ⇒ ⭐ the take-down
writes a `helpline` withdrawal on **every** version of the chain that has none yet (MP8). ⭐ Test the chain shapes in AC7's table.
**→ Task 3.3, 3.4, 7.3.**

### Trap 2 — ⚠ A 5-minute signed URL inside a page cached for 5 minutes breaks
`MEMORIAL_PHOTO_URL_TTL_SECONDS = 300` and the page is `s-maxage=300` + `max-age=60`: an embedded signed URL expires while a
PoP is still serving the HTML. ⇒ ⭐ the photo has its **own public route** with the page's cache posture, and it re-checks the
same predicate on every uncached request (MP4) — which is also how a take-down reaches the photo. (⚠ Today ⛔ no edge cache
exists at all — Infra row — so every request is "uncached" until Row 41 (p) is met.) **→ Task 5.3, 6.3.**

### Trap 3 — ⚠ The left-out text and its reason must ⛔ never leave the API
`reconstructMemorial` keeps the `reason` on every `omitted` segment (for the family's screen, 11b.4 R10). ⇒ ⭐ the API cuts the
spans and serialises ONLY joined strings (MP3 (b) — ⛔ no `omitted` segment, so ⛔ not even the POSITION of a cut leaves the API);
the DTO is `.strict()` so a `reason`, `key`, `kind`, `segments` or `omitted` key is a parse failure, and a test asserts no left-out substring appears anywhere in the response body — on a fixture
that **holds** an omission (in the words **and** the alt text), with the kept text asserted **present** first (else the
absence proves nothing). **→ Task 5.2, 5.4.**

### Trap 4 — ⚠ An erased member's memorial decrypts SUCCESSFULLY to `[anonymized]`
`anonymizeMember` overwrites the ciphertexts with an *encrypted* `ANONYMIZED_SENTINEL`; the decrypt succeeds and returns the
string. ⇒ ⭐ if the body **or** the alt text decrypts to the sentinel, the whole memorial is omitted (`familyMemorial: null`) —
words **and** photo (the photo object was deleted best-effort; ⛔ never point at it). ⭐ Import the constant, ⛔ never retype it.
Reachable: RTBF is legal from `withdrawn`/`terminated` (`rtbf-legality.ts`) with ⛔ no deceased gate. ⚠ `anonymizeMember`
**retains** `mobile_blind_index` and the withdrawals, so the take-down lookup (MP12) still finds an erased member and
`latestApprovedIndex` is still ≥ 0 ⇒ the take-down lookup and drive view apply the same erasure check (AC6, AC13).
⭐ The photo route may check erasure **without a decrypt**: the deceased's `members.state = 'anonymized'` — **if** Task 0.1 (j)
confirms EVERY erasure path (`rtbf/handlers.ts`, `member-data-rights/handlers.ts`) leaves `members.state = 'anonymized'` whatever
the prior state — ⚠ the 10.21 path is legal on a `terminated` overlay where the state *"is whatever it already was"*
(`rtbf-legality.ts`) (`anonymizeMember` itself does ⛔ not touch `members.state`); otherwise keep the body-decrypt sentinel check.
**→ Task 5.2, 5.3, 5.4, 7.2.**

### Trap 5 — ⚠ Seven pin sites and one hand-written guard fix today's payload
Adding `familyMemorial` and the three matrix ids breaks, **by design**:
1. `apps/api/tests/integration/public-pages/sahyog-vivran.spec.ts` — exact `Object.keys(body.drive)`;
2. `apps/public/tests/sahyog-vivran-render.test.ts` — `sahyogVivranSurfaceFieldIds` + null-mapped keys;
3. `apps/public/tests/integration/public-pages/scrape-test.spec.ts` — **two** pins: its own `it` over the surface's tier-1
   ids, and `tier1AtPublic('sahyog-vivran')`;
4. `packages/contracts/tests/public-pages-sahyog-vivran.test.ts` — `.strict()` + prohibited keys;
5. `packages/contracts/tests/public-pages.test.ts` — *"carries EXACTLY the six ruled Tier-1 public exceptions"* (an identity
   array of `surface.field@decision`; ⇒ nine); its `escalation_count` stays 1;
6. `apps/public/tests/sahyog-vivran-copy.test.ts` — `KEYS` (*"EVERY key `[driveToken].astro` resolves"*) gains
   `family_memorial.heading` (⛔ no `memorial:render.omitted` — PC1 B);
7. `apps/public/src/lib/surface-fields.ts` — a source map, ⛔ not a test: `SAHYOG_VIVRAN_FIELD_IDS`; `deriveFieldIds` **throws**
   on an unmapped key.

⚠⚠ And the guard `isSahyogVivranResponse` (`sahyog-vivran.server.ts`) does ⛔ **not** reject unknown keys — an unvalidated
`familyMemorial` would reach the render unchecked — and it `return true`s early at `if (rev === null) return true;` (the
`appealReversal` block), so any check placed after that block is SKIPPED whenever `appealReversal` is null (the usual case). ⇒ ⭐
validate `familyMemorial` exactly (`words` an array of strings; `photo` null or `{ altText: string }`; ⛔ no other key) placed
**before** the `appealReversal` block; a test feeds a malformed `familyMemorial` with `appealReversal: null` and expects
`bad_response`. ⭐ Update each pin as an identity array, ⛔ never a count. ⚠ Also pinned: the eleven CHECK names in
`packages/domain/tests/integration/rls/memorial-policy-regression.spec.ts` (0187 adds two — Trap 7's pair; Task 2.3), the `memorialState` and
`withdrawnBy` enums in `openapi/v1.yaml` (Trap 15), and `apps/public/tests/member-drive-detail-field-floor.test.ts` — Trap 17.
**→ Task 2.3, 4.1, 4.3, 5.4, 6.1, 6.5.**

### Trap 6 — ⚠ `ALTER TYPE … ADD VALUE 'helpline'` cannot share a run with a CHECK that names `'helpline'`
⇒ ⭐ `0186` holds the `ADD VALUE` **alone**; `0187` compares `withdrawn_by::text` (text, ⛔ not an enum literal). Hand-authored,
`IF NOT EXISTS`, ⛔ never regenerate an applied migration ([[project_live_db_test_gotchas]]). **→ Task 2.1, 2.2.**

### Trap 7 — ⚠ `memorial_withdrawals.reason_code` IS the reviewer's reason enum
It is typed `memorial_review_reason`, shared with `memorial_review_decisions`. Adding `family_asked` there would let a
**reviewer** cite it at the database level — a fifth ground, against `-391` item 7 (Confirm 2 A: *"The four reasons in Q4 A,
and ⛔ no others"*, Trustee-ratified). ⇒ ⭐ a `helpline` withdrawal carries **no** reason (`-393` item 4: ⛔ no merit test);
`family_asked` is ⛔ **not minted**. The withdrawal points at its request instead (`takedown_request_id`, MP6). ⚠ The sprint
ledger's 2026-10-23 line *"`family_asked` + merit note"* is STALE (`-393` superseded "on merit"). ⚠ This **departs from 11b.4
MA18's parts list** (*"a reason value (`family_asked`, minted then) and an optional Tier-1 note"*; *"for a smaller fix, the operator
withdraws the approval"*) — `-412` names the departure; ⛔ never drop 11b.4 MA18's text silently. (`-398` item 18, MA18 (a), rules only
*"the helpline operator's take-down is 11b.4a's, ⛔ not built here; `family_asked` is ⛔ not minted; `memorial_withdrawal_actor`
stays `family · trust`"* — the parts list is 11b.4's proposal, ⛔ not ruled text.) ⚠ A `helpline` row also writes `internal_note_ciphertext` (a Tier-1,
UPDATE-granted column on `memorial_withdrawals`) as **NULL** — a CHECK in `0187`. **→ Task 1.1, 2.2.**

### Trap 8 — ⚠ HTML is ⛔ not React Native
HTML collapses the spaces and single newlines `<Text>` keeps ⇒ ⭐ `white-space: pre-wrap` on each paragraph (11b.4 AC11).
⛔ Never `set:html`; Astro `{}` interpolation only. ⭐ `isolateMemorialBidi` is applied by the API to each kept segment BEFORE the join (MP3 (b)) — the page renders the finished string; `dir="auto"` per paragraph;
⛔ no `lang` attribute on the family's text (its language is ⛔ not recorded — `authorisation_locale` is the permission's).
**→ Task 6.2, 6.5.**

### Trap 9 — ⚠ "No trace" is a byte property, ⛔ not a visual one
`-393` M1: *"⛔ no "removed" marker, ⛔ no gap, ⛔ no date"*. ⇒ ⭐ a taken-down (or withdrawn, or never-written, or erased)
memorial answers `familyMemorial: null` — the same JSON, the same headers, the same HTML as a drive whose family never wrote;
the photo route answers the **same empty 404** as an unknown drive token. ⭐ A test diffs the two responses.
⚠ "The same headers" can ⛔ not hold literally: the API echoes a per-request `x-request-id`
(`middleware/request-context/index.ts`), `@fastify/rate-limit` adds `x-ratelimit-limit/-remaining/-reset` on every call
(`plugins/rate-limit/index.ts` — ⛔ no `addHeaders: false`), and Node adds `Date`. ⇒ ⭐ the diff compares status, body bytes,
and headers **excluding** `date`, `x-request-id`, `x-ratelimit-*`, `connection`, `keep-alive`, with `deps.clock` pinned and the
contributor fixture unchanged between the renders. ⭐ Every refusal (switch off, kill switch, unknown token, no shown memorial,
photo left out, erased, missing object) answers the page's own in-handler `reply.status(404).send()` — ⛔ never the memorial
module's `memorialNotFound()` (a JSON error envelope, ⛔ not empty). ⭐ The Astro endpoint builds its own response headers and
⛔ never forwards upstream ones. ⭐ Non-vacuity: the fixture's MIDDLE state (after approval) is asserted to carry the memorial
section and a `200` photo — else two empty responses diff equal and prove nothing. **→ Task 5.3, 5.4, 6.3, 6.5.**

### Trap 10 — ⚠ The approver's email is staff identity data
ADR-0040: *"⛔ No other new path is admitted; a third is a new ADR."* Q2 (`readAdminEmailCiphertext`) is *"called only by
the staff-email child"* of 6.25. ⇒ ⭐ ADR-0043 is drafted and its id is cited **before** any line of the approver-email code,
and the fence's allow-lists widen **in the same commit** as the new caller, each new entry citing ADR-0043. ⚠ Ratification is
a go-live gate (Row 41), ⛔ not a merge fence (the ADR-0040 precedent). **→ Task 1.2, 8.1, 8.3.**

### Trap 11 — ⚠ Do ⛔ not call a take-down "immediate"
`-155` cl.2: *"⛔ The word "immediate" may not be used about this control in any artifact."* (the glyph is the ruling's own) —
ruled about the **kill switch**; applying it to the take-down is **our analogy** (same cache, same latency), ⛔ not the ruling's
scope. Once an edge cache exists (Row 41 (p)), a take-down stays visible for up to **about 5 minutes** after the operator acts
(`s-maxage=300`; a browser's `max-age=60` is counted against the edge's `Age`, so it adds little) — the `-155` figure. ⇒ ⭐ the
operator's screen says *"it leaves the page within about 5 minutes"*; ⛔ no copy, comment or test name says "immediately".
**→ Task 9.2, 9.3.**

### Trap 12 — ⚠ The permission names ONE place
v1–v3 all say *"on this member's Sahyog Vivran page, which anyone with its link can read"*. ⇒ ⛔ not on In Memoriam (11b.6),
⛔ not on `/sahyog`, ⛔ not in the member app's drive detail (11b.17), ⛔ not in `<meta>` / Open Graph / `og:image` / a share
card / a sitemap — a link preview copies the photo to another company's servers. ⭐ A test asserts the `<head>` carries none of
the memorial's text or photo URL — after first asserting the `<body>` **does** carry both (non-vacuity). **→ Task 6.5.**

### Trap 13 — ⚠ `apps/public` holds ⛔ no KMS
`apps/public/tests/no-kms-in-public.test.ts` scans for it. ⇒ ⭐ decrypt in the API handler; `apps/public` receives plaintext
segments only. **→ Task 5.2, 6.1.**

### Trap 14 — ⚠ The deceased's name follows ITS gate, ⛔ not the memorial's
The page shows the member's name only once `NAME_PUBLICATION_AUTHORISED` holds (`-173`, `-209` cl.2 — unsatisfiable on every
drive today; `-223` cl.1: a null name renders `message_block.headline.no_family`). ⇒ the memorial section must ⛔ not
render the member's name in its heading, and ⛔ never synthesises an alt text (the alt text is the family's, as approved — it may
name the member, which is PQ2). The **family's own words** may name the member — that is
PQ2, built as `-391` Q2 A. ⭐ [[feedback_never_mangle_member_names]]: ⛔ never abbreviate a name inside the family's text.
**→ Task 6.2, 6.5.**

### Trap 15 — ⚠ `deriveMemorialStatus` THROWS on an unknown actor
Insert one `helpline` row before `status.ts` knows it and the family GET, the review detail and the public read all 500. ⇒ ⭐
**one commit** (Task 3, step 3.0) carries: the domain vocab (`packages/domain/src/memorial/vocab.ts` — the actor) and
`status.ts` (`MEMORIAL_STATES` lives there), the **contracts copy** (`packages/contracts/src/memorial/vocab.ts` —
`MEMORIAL_WITHDRAWAL_ACTORS`, `MEMORIAL_STATES`, pinned equal by `packages/contracts/tests/memorial.test.ts`, which also asserts
`not.toContain('helpline')` — invert it with a dated note), `MemorialWithdrawalActorSchema` (contracts `dto.ts`, used by the
review-detail response — un-widened it 500s the detail on serialisation: response schemas are PARSED), `MemorialStateSchema`,
the derivation (Trap 18), the mobile `outcome.tsx` copy, the admin display, and a regenerated `openapi/v1.yaml` (it pins the
`memorialState` and `withdrawnBy` enums — `pnpm contracts:emit-openapi`).
⚠ `apps/admin/src/modules/memorial-review/MemorialReviewPage.tsx` renders the withdrawal with a **two-way ternary**: a
`helpline` row would silently read *"The Trust withdrew its approval."* and ⛔ nothing fails to compile — make it a total map.
The same file's `decidedDateLabel` and `i18n-en.ts`'s `memorial.state.*` map also need `taken_down`. **→ Task 3.0.**

### Trap 16 — ⚠ `@twt/ui` is only a devDependency of `apps/api` — and (were it ever added) a plain dependency CRASHES `apps/public`'s image
⭐ **After `-411` item 3 (PC1 B), `apps/public` does ⛔ NOT need `@twt/ui`**: the API sends finished strings, so the page needs neither
`isolateMemorialBidi` nor `render.omitted` ⇒ ⛔ do not add it (the `noExternal` warning below stays for whichever later story does —
11b.5).
The public handler calls `reconstructMemorial` at runtime ⇒ ⭐ move `@twt/ui` to `apps/api`'s `dependencies`, and add it to
`apps/public` (11b.4 deferred item (11), epics C-1: *"`apps/public` adds `@twt/ui` as a dependency; `@twt/ui`'s dependency list
stays exactly `@twt/contracts`"*). ⚠⚠ In `apps/public` that is ⛔ not enough: `astro.config.mjs` bundles workspace packages via
`vite.ssr.noExternal: ['@twt/domain','@twt/i18n','@twt/contracts','@twt/tokens']` because the standalone image *"copies
`dist/`, not the workspace symlinks"*, and `@twt/ui`'s `main` is `./src/index.ts` (TypeScript source Node cannot run). Dev
mode and vitest both pass; only the built image crashes. ⇒ ⭐ add `'@twt/ui'` to `noExternal`, and prove it with
`pnpm --filter @twt/public build` then `node apps/public/dist/server/entry.mjs` rendering a memorial fixture.
⚠ In `apps/api` the question *"how does `@twt/contracts` reach the runtime"* has ⛔ no answer today: every workspace package's
`main` is TypeScript source, the API is built by `tsc` (⛔ no bundler), and the Dockerfile's runtime stage is a placeholder that
copies ⛔ no `node_modules` (Infra row). ⇒ record it as a finding (Row 41 (n)), ⛔ never as a step to mirror. **→ Task 5.1, 6.1.**

### Trap 17 — ⚠ A floor test says the member must see MORE than the public
`apps/public/tests/member-drive-detail-field-floor.test.ts` reads `SAHYOG_VIVRAN_FIELD_IDS` live and requires every public id to
have a `MEMBER_COUNTERPART` on `MemberDriveDetailResponse` — enforcing `-189` cl.3 (Trustee-ratified): *"a member must see MORE
than the public, ⛔ never less"*. This story keeps the memorial **off** the member drive detail (Trap 12 — the permission names one
place). `-195` cl.1 scopes `-189` cl.3 to *"the drive data class — the nominee/bank fields and the drive record"*; family-authored
content is a different data class (epics 11b.6: *"a different data class on a different basis"*) ⇒ ⭐ **our reading**: the floor
does ⛔ not reach it. ⚠ That reading is THIN on one point: `-195` cl.1 bounded `-189` cl.3 as *"a DATA-CLASS-SPECIFIC INVARIANT,
⛔ NOT a universal rule over every surface pair ⇒ it binds the drive data class — the nominee/bank fields and the drive record"*,
and `familyMemorial` is served INSIDE `drive` (AC1) — and the floor test's own failure text reads *"the member now sees LESS than
the public on the drive data class"*. ⇒ ⚖️ **RULED by `2026-10-27-411` item 7 (PC5 A)**: the floor does ⛔ not reach the family's words, although they are served inside
`drive`. (Question 4 kept the field inside `drive`.)
**How the test records it** — ⚠ ⛔ NOT the appeal-lineage form: those `[]` rows are declared *"a GAP — not an exclusion"*
(`declaredGaps`, an exact set of three) — mapping the memorial ids that way would record a `-189` shortfall. ⇒ ⭐ a separate,
asserted exclusion block (e.g. `DATA_CLASS_EXCLUDED`, each id citing `-195` cl.1 + `2026-10-27-411` item 7), with `declaredGaps` **unchanged**.
⚠ The mechanics: `FieldIdMapping` maps one model key to one id or `null`, so `familyMemorial` maps to `null` (the container) and
the three ids live in a separate element map (the `nomineeAccounts` / `SAHYOG_VIVRAN_NOMINEE_ACCOUNT_FIELD_IDS` precedent) —
and `PUBLIC_DETAIL_FIELD_IDS` in the floor test (which today spreads only `SAHYOG_VIVRAN_FIELD_IDS` and
`SAHYOG_VIVRAN_NOMINEE_ACCOUNT_FIELD_IDS`) must spread the new map **too**, or the three ids escape the floor test silently. ⚠ Once
spread, the test that fails any public id whose `MEMBER_COUNTERPART` is `undefined` would go red, and `declaredGaps` is COMPUTED
from every `[]` counterpart ⇒ that test subtracts `DATA_CLASS_EXCLUDED` before checking counterparts, and a new assertion pins the
exclusion set to exactly the three ids (⛔ never `[]` rows — they would change `declaredGaps`).
**→ Task 6.1.**

### Trap 18 — ⚠ State is derived from the HEAD alone; `taken_down` is a CHAIN property
`memorialChainState(chain)` = `deriveMemorialStatus(head)`, and `MemorialChainLinkState` carries ⛔ no timestamps. In the
reachable shapes `[A-omit, family-withdrawn]` and `[A-omit, trust-withdrawn(A)]` the head is ALREADY withdrawn, so MP8 adds ⛔ no
`helpline` row to it ⇒ a head-only rule returns `withdrawn` / `approval_withdrawn`, ⛔ not `taken_down`. Head-only consumers drift
too: the member GET's `reasonCode: withdrawal?.withdrawnBy === 'trust' ? …` would send the Trust's reason beside `taken_down`
for `[A-omit, A(T)]` → take-down → `[H, T]`, and `deriveEarlierApprovalWithdrawn` returns the Trust's reason for `[A-omit, A(T), pending]` → take-down →
`[H, T, H]`. ⇒ ⭐ two functions: `deriveMemorialStatus(link)` maps `helpline → taken_down` (exhaustiveness; the review list's
per-row head state); a new chain-level `deriveMemorialChainState(chain)` (reads `submission.createdAt`, `withdrawal.withdrawnAt`)
implements MP9 and **replaces** `memorialChainState` at all THREE call sites (`decideMemorialSend`, the member GET, the review detail's `memorialState`) — grep `memorialChainState(` at Task 0.1 for any new one. Under
`taken_down` the member view sends `reasonCode: null`, `earlierApprovalWithdrawn: null`, `earlierApprovalStands: false`.
⚠ Both timestamps default to `clock_timestamp()` (`0182`) and every writer inserts after `lockMemorialPool`, so
`created_at > withdrawn_at` is sound under the lock. **→ Task 3.0, 3.1, 3.4.**

### Trap 19 — ⚠ The photo route must ⛔ NOT reuse the page handler's flow
The page handler runs the FULL drive read (`readPublicSahyogVivran` — every contributor) and writes
`writeAppealReversalDisclosureAudit` whenever `drive.appealReversal !== null` — a global advisory lock, with the code's own
*"⛔ Do not widen this to log every request"*. Copying that flow adds a disclosure audit and a contributor read per photo
request. ⇒ ⭐ the photo route resolves token → pool through a NARROW domain read that imports `SAHYOG_VIVRAN_VISIBLE_POOL_STATES`
(already exported) and the same kill switch, reads ⛔ no contributors and writes ⛔ no appeal-reversal audit. **→ Task 3.2, 5.3.**

---

## ⚖️ Build decisions MP1–MP14 (ANSWERED by BigDev 2026-10-27 — MP1–MP13 as recommended except MP10 → (b); MP14 → (b); to be recorded as `-412` at Task 1.1)

### MP1 — Build the render now, without waiting for Story 11b.5
⭐ **(a) Build it in `apps/public` now** from the 11b.4 presenter, with the portrait as the UX's nested-wrapper frame
(UX §FuneralFrame: *"rendered as nested wrappers … div → div → img on web … The pattern, not a typed atom"*). 11b.5 later
lifts this markup into `<MemorialRecord>` / `<PortraitFrame>`. **Why:** 11b.5's own ACs need inputs that do not exist (birth
dates, the deceased's public name — null on every drive, kinship — not collected, 11b.4 MA2) and cite Story 0.9 findings that
were never gathered; waiting on it leaves every approved memorial invisible with ⛔ no date. **Supersedes in part** `-398` MA1's
*"gated on 11b.5's components"* (author-commit ⇒ superseded by author-commit). ⚠ **Cost:** 11b.5 inherits a markup it must
refactor into components, and the frame's look is ⛔ not validated against Story 0.9 (un-attested, as for 11b.4).
Rejected — (b) wait for 11b.5: the page stays empty indefinitely and 11b.5 would have to be re-scoped anyway.

### MP2 — What the page shows
⭐ **(a)** Exactly one version per drive: `chain[latestApprovedIndex(chain)]` — the latest approval with no withdrawal of any
kind (11b.4 MA13: *"the latest **approved** version shows until a newer one is approved"*). Shown only when **all** hold: the
switch is on (MP13); the Pariwar's publication kill switch is on (the page 404s otherwise); the drive resolves; neither the
body nor the alt text decrypts to the sentinel (Trap 4). ⛔ No pool-state test beyond what the page already applies (writing
opens only at `closed`/`settled` — 11b.4 MA14). It is part of `drive` (⚠ Trap 17 / PC5), so it renders on **every** page number
of the contributor list (one rule per page). Decrypts go through `withKmsOutageClassification` like the deceased-name decrypt: a KMS **outage** re-throws (the page's 503
outage state); only a bad envelope omits the memorial. ⚠ **Cost:** one body + one alt-text decrypt per page request — each a
`decryptDek` audit line through the deployment-wide advisory lock ([[project_kms_audit_per_hmac_global_lock]]) — **bounded only
by `limits.search`** until an edge cache exists (⛔ none does — Infra row; Row 41 (p)). The photo route checks erasure without a
decrypt where Task 0.1 (j) allows (Trap 4).

### MP3 — The words: the API cuts and JOINS — ⚖️ RULED by `-411` item 3 (PC1 B); the build's (a) below is SUPERSEDED
⭐ **(b) — RULED.** The API runs `reconstructMemorial`, keeps only the `text` segments of `asApproved`, applies
`isolateMemorialBidi` to EACH kept segment (11b.4 R13 — a cut can leave an unbalanced direction control on either side), and joins
them into ONE string per paragraph with the **join rule** (ours — `-411` Not covered: *"how the words are joined … the build's"*):
at each cut, trim the whitespace at the end of the text before it and at the start of the text after it, then insert one `\n` if
the removed stretch (the cut plus the trimmed whitespace) held a line break, else one space; nothing is inserted at a paragraph's
start or end; a paragraph left with ⛔ no kept text is DROPPED (⛔ no empty `<p>` — that would be a visible gap). The alt text the
same way, into one string (all of it left out ⇒ `""` ⇒ `alt=""`). A pure function `joinKeptSegments` in
`apps/api/src/modules/public-pages/memorial-public-text.ts` (ONE consumer — ⛔ not in `@twt/ui`, [[feedback_no_premature_package]]),
unit-tested on: a mid-sentence cut, a cut at a paragraph's start/end, a cut spanning a line break, adjacent cuts, a whole
paragraph cut, a hostile-bidi segment beside a cut. ⚠ **Cost (accepted by the Panel):** *"The page would show the Trust's edit as
if the family had written it that way, and would differ from what the family saw before sending."* — a recorded departure from
UX *"preview matches public output exactly"* and from epics 11b.4's *"explicit notation"*, on the Panel's authority.
*Superseded — the build had proposed:* **(a)** The API runs `reconstructMemorial` and returns `asApproved` with each `omitted` segment stripped to `{kind:'omitted'}`;
the page renders an omitted segment as the **same copy key the family saw** (`memorial` namespace `render.omitted` —
*"[a part left out by the Trust]"*; ⛔ no second string is minted). **Why:** the family-authorship invariant (epics 11b.4: *"a future
reviewer can always reconstruct what the family originally wrote vs. what moderation removed"*; *"redact specific harmful
sentences with explicit notation"*) — silently joining the words around a cut would put the Trust's edit in the family's
mouth; and UX *"preview matches public output exactly"*. ⚠ **Cost:** a reader sees that something was left out, which may
raise the questions `-393` M1 wants to avoid for take-downs ⇒ **PC1**. *(Rejected at the time — (b) no marker; the Panel then chose (b).)*

### MP4 — The photo: its own route, re-checked every time
⭐ **(a)** `GET /sahyog-vivran/[driveToken]/memorial-photo` in `apps/public` (an Astro `APIRoute`, the `.well-known/*.ts`
precedent) proxies `GET /api/v1/p/:pariwarId/public-pages/sahyog-vivran/:driveToken/memorial-photo`, which runs MP2's predicate
through a **narrow** token → pool read (Trap 19 — ⛔ never the page handler's flow), then — only if the shown version has a photo
and the Trust did ⛔ not leave it out — reads the bytes (`MemorialPhotoStorage.getBytes`, new; all three adapters) and returns the
MP5 variant: `Content-Type: image/jpeg`, `Cache-Control: public, max-age=60, s-maxage=300`, `X-Content-Type-Options: nosniff`,
⛔ no `Set-Cookie`. Every refusal — including a missing object and a storage read that fails — is the page's empty in-handler
404 (Trap 9); the ONE exception is a KMS outage where the route still decrypts (Trap 4): `503` + `no-store` (the page's outage
rule). ⛔ No query parameter (⛔ no cache-buster — it would mint shared-cache keys, the 11b.3b reason). The page links it with
`loading="lazy"` and a fixed 4:5 frame (`object-fit: contain`). ⚠ **Cost:** once an edge cache exists, after a new version is
approved the old photo can be served for up to ~5 minutes beside the new words; until then every request costs a chain read, a
storage read of up to 10 MiB and a `sharp` decode, bounded only by `limits.search`; the object key ⛔ never reaches the wire, so
there is no per-version URL.
Rejected — (b) a public bucket / public ACL (bypasses the take-down, the switch and the kill switch); (c) longer signed URLs
(a take-down would not reach a URL already handed out).

### MP5 — The photo: re-encoded with `sharp`, metadata-free, bounded
⭐ **(a)** Add `sharp` to `apps/api`, pinned to **`0.34.5`** — the version already in `pnpm-lock.yaml` as `astro`'s optional dependency, so the
repo carries one libvips build (latest on npm is `0.35.5`; moving both is a separate change). Per request: resize to fit **960 × 1200** without enlargement, convert to sRGB, JPEG quality 82, **strip all metadata**
(EXIF, XMP, IPTC, ICC — `sharp` drops it unless `withMetadata` is called; ⛔ never call it). **Why:** the stored object is
up to 10 MiB (11b.4 MA8) on a 360 px page over cellular; `-400` item 3 kept the ICC profile, whose description and date tags
would otherwise become public; ⚠ It does ⛔ **not** fix orientation: the ingest stripper already drops APP1 (and the EXIF orientation with it —
`apps/api/src/modules/memorial/photo-metadata.ts`, `-398` MA8), so stored objects carry ⛔ no orientation to apply; Row 41 (h)
stays open. ⚠ **Cost:** a new native dependency
in the API image (`node:22-alpine` ⇒ musl ⇒ `@img/sharp-linuxmusl-x64@0.34.5`, already in `pnpm-lock.yaml`; ⚠ the runtime stage
copies ⛔ no `node_modules` today — Row 41 (n)); CPU and ~200 MB peak memory per request at `limitInputPixels: 50_000_000`
(bounded only by `limits.search` until an edge cache exists — Row 41 (p)); architecture §4.11.2's *"edge-compatible responsive
media pipeline … committed in an implementation ADR"* and its *"Astro Image component on the public site"* stay unbuilt — this
is ONE variant behind a proxied plain `<img>`, recorded as a dated departure (Task 11.4). Rejected — (b) serve the stored bytes (10 MiB, colour metadata public); (c) an edge
transform vendor (a cloud control ⇒ an ADR and a vendor this story need not choose).

### MP6 — The take-down's vocabulary (mints — ⛔ not covered by the `-210` cl.2 delegation, per `-398` §2)
⭐ **(a)** `memorial_withdrawal_actor` gains **`helpline`**; `MEMORIAL_STATES` gains **`taken_down`**; new enum
**`memorial_takedown_outcome`** (`taken_down`, `kept`, `superseded` — MP8 (c)); new permission key **`memorial.takedown`** (pariwar dimension) granted
to `helpline_operator` (+ derived `super_admin`) — catalog **53 → 54** (69 → 70 keys); new admin step-up context
**`memorial_takedown`** on the take-down act only. `memorial_withdrawals` gains `takedown_request_id uuid NULL` with CHECK
`(withdrawn_by::text = 'helpline') = (takedown_request_id IS NOT NULL)` and an FK to the request; `actor_display_check` becomes
`(withdrawn_by::text IN ('trust','helpline')) = (actor_display IS NOT NULL) …`; `reason_iff_trust` is **unchanged** (a
`helpline` row has ⛔ no reason — Trap 7); and `internal_note_ciphertext IS NULL` on a `helpline` row. ⚠ This **departs from
the 10.21 pattern** — `-107` cl.1b: *"The Helpdesk Operator may intake / verify / route but may NOT execute — already ruled, and
NOT re-opened."*, a ruling scoped to DPDPA data-rights fulfilment (`member.data_rights`, Story 10.21 AC3) — on the authority of
`-392` item 4 (Trustee-ratified, standing): *"removed within 7 days, by the helpline operator"*. It is ⛔ not the first execute
grant to the role in this area: Story 6.9 (D5a; the REVOKE bullet, scope D7) granted `helpline_operator` `claim.manage_dpdpa_consent` for a *"post-settlement
takedown request"* revoke route, and D7 placed *"the member-facing "take down my memorial" management UI + the actual page
takedown"* in Epic 11b (`6-9-claim-time-dpdpa-consent.md`, D7). ⚠ **Cost:** the helpline role can now change what a public page shows, directly (until now it could only revoke a consent).

### MP7 — How the operator knows the caller is the nominee (`-395` Not covered: *"the build's"*)
⭐ **(a) Call back.** The operator's screen (⛔ never for an erased memorial — Trap 4) shows the nominee recorded on the **shown** version (`handover_nominee_ref` →
that `member_nominee_versions` row's name and mobile, decrypted, one `memorial.takedown.read` audit line). The operator ends
the call, rings that number, and only then records the request, ticking *"I called the nominee back on this number and they
asked for it"* (the request row stores `verified_by = 'called_back'` — a one-value CHECK, room for later methods). Anyone
else is listened to (`-393` M4) and asked to have the nominee call. ⚠ **Cost:** a nominee who has changed their number
cannot be verified ⇒ PQ1's ground. ⚠ *Extended 2026-10-27, review R1 / RR2: the tick means "I called THIS nominee about THIS version" — the screen
clears it when either the number or the shown version changes, and the record is refused (MP8 (c)) if another version is shown by the time it is written.*
⭐ **Not a new disclosure to the role:** `helpline_operator` already holds `claim.view_nominee_name_check`, which reads every
nominee version's name, mobile and address on `GET /api/v1/p/:pariwarId/admin/claims/:claimCaseId/nominee-declaration/snapshots`
(`claims.nominee-declaration.handlers.ts`). It is new only in **context** (outside a claim) — `-412` says so.
Rejected — (b) an OTP to the nominee's number (a new SMS template, DLT approval — roster Rows 30/40; a heavier lever for the
same proof).

### MP8 — What a take-down does, and the "smaller fix"
⭐ **(a) The take-down.** Taking it down writes, under the pool lock, a `helpline` withdrawal on **every** version of the chain
that has no withdrawal yet — the shown one, every older un-withdrawn approval (Trap 1), and any newer version still with the
Trust or not approved — so nothing returns without a **new Send**.
⭐ **(b) The "smaller fix"** of `-393` M4 (*"leaving out a sentence or a name, removing only the photo, or sending a new
version"*) is done **by the nominee sending a new version** without the part, which the Trust reviews (11b.4 MA18's proposal).
It splits by the chain's state (`memorialCanSend(deriveMemorialChainState(chain))`):
- **the head is NOT a clean `approved`** (e.g. the shown version is `approved_with_omissions`, or a newer version is pending):
  the nominee can send now and the shown version **stays up** until the new one is approved (11b.4 MA13: *"the latest approved
  version shows until a newer one is approved"*). ⛔ No take-down; the operator records `kept`.
- **the head IS a clean `approved`**: 11b.4 MA13 refuses a new Send (`409 memorial.already_reviewed`) ⇒ the smaller fix needs
  the take-down first, and the memorial is **down** while the new version waits for review — the operator says so before
  acting. ⚠ This **narrows `-393` M4 in part** (M4 offers fixes *"smaller than removal"*; here each one passes through a removal)
  ⇒ `-412` records it with a dated pointer under `-393`; the Panel ACCEPTED it (`-411` item 4, PC2 A).
⚠ In both branches the new version is sent by the **current** nominee (a Send needs their `claim_handover` step-up), who may
differ from the nominee who asked — the operator's script says so.
⭐ **(c) The window between request and outcome.** The outcome re-reads the chain under the lock. If `latestApprovedIndex === -1`
(the Trust withdrew it meanwhile), or the shown version is no longer the request's `submission_id` (a newer version was
approved, possibly under another nominee), `{ outcome: 'taken_down' }` answers `409 memorial_takedown.shown_changed`; the
operator closes the request with `{ outcome: 'superseded' }` (⛔ no public change, ⛔ no email) — accepted ONLY when the same
re-read shows the shown version changed, else `409 memorial_takedown.shown_unchanged` and asks the nominee of the
version now shown (if any) to call. **Why:** `-395` item 3 counts only *"the nominee whose code sent it"* — a request verified
against one version is ⛔ not a request about another. ⚠ *Extended 2026-10-27, review R1 (`-412` amended): the same guard now stands at
RECORD time — a record carries the version the operator was looking at (`shownSubmissionId`) and answers `409 memorial_takedown.shown_changed`,
with nothing written, when another is shown by the time of the write.*
**Why (a)/(b):** an operator-side omission would be a fifth ground against `-391` item 7 and an edit act against 11b.4 MA6
(*"⛔ no edit act"*) and the permission text (*"will never change your words"*). ⚠ **Cost:** a version the nominee sent minutes
earlier is withdrawn too; a clean-approved memorial is down during a smaller fix.
Rejected — (d) the operator edits the omissions of the shown version (a new ground, an edit act — needs the Panel).

### MP9 — After a take-down
⭐ **(a)** The family's state is `taken_down`; `memorialCanSend` is **true** (11b.4 MA13 — after a withdrawal the family may send
again; `-392` Not covered: *"whether "removed" ends the memorial or lets the family send a new version — Story 11b.4 MA13 lets them
send again after a Trust withdrawal"* — a removal is ⛔ not a ban); the outcome screen says, in the Pattern 4 register, that the memorial was taken down at the
nominee's request, that it is no longer on the page, and that the nominee may write again whenever they wish. ⇒ ⚖️ confirmed — `-411` item 4 (PC2 A). **Derivation:** `taken_down` when the chain carries a `helpline` withdrawal and ⛔ no version was created after
the newest one (`created_at > withdrawn_at`); otherwise the head's own state as today — a CHAIN rule (Trap 18), in the new
`deriveMemorialChainState`. `memorialCanWithdraw(taken_down)` is false. Under `taken_down` the member view sends `reasonCode:
null`, `earlierApprovalWithdrawn: null`, `earlierApprovalStands: false`. The admin review queue's **pending** view excludes
`helpline`-withdrawn versions; its **decided** view lists such a head as `taken_down` (head-only, accepted — the detail tells the
full story); the review detail shows *"Taken down at the nominee's request · {time}"* on each such version (AC12). Rejected — (b) the memorial is ended for good (a restriction ⛔ no ruling makes).

### MP10 — The approver email (`-392` item 5, KEPT by `-395`)
⭐ **(a) A mirror of 6.25, with ⛔ no departure from `0152`'s CHECKs.** ⛔ No row is written by the take-down. The jobs sweep
(cross-tenant selector on the service pool, as 6.25) **derives** the due pairs itself, from each `taken_down` outcome: one
`(request, approver)` pair per **eligible** approver whose own pair holds no row (while the request holds no `no_target` row), else —
when ⛔ none is eligible and the request holds ⛔ no row at all — `(request, NULL)` (6.25's claim-level pair). ⚠ *Narrowed
2026-10-27, review R2 (`-412` amended): v0.4 derived pairs only from a request holding "no outbox row at all", which lost a sibling
approver whenever a sweep stopped between two.* **The recipients — MP10 (b), ANSWERED by BigDev 2026-10-27 (*"email every
approver"*):** the distinct `actor_id`s of the approval decisions on **every approved version the take-down withdrew** (Trap 1 —
usually one person). `-392` item 5 says *"the approver — the person who approved the memorial (the decision's recorded actor)"*,
singular ⇒ `-412` records the plural as **our reading**; each person is told only about an approval they made themselves, so ⛔ no
one new learns anything. (Rejected — (a) only the approver of the shown version.) Per due pair the sweep enqueues one child (`retryLimit: CHILD_RETRY_LIMIT` = 4, as 6.25 — ⛔ never `retries: 0`).
The **child's claiming transaction** (the `beginSuspicionStaffEmail` shape) re-checks under `withPariwarScope`: a recipient child
inserts the row born claimed (`attempting`, `0152`'s `attempting_claimed` CHECK), or — if the approver is no longer eligible on
this fresh pair — writes ⛔ no row (`not_due`); the NULL child writes the `no_target` row (MP11); outcomes `attempting / accepted / rejected /
no_target / error`; held / transient / terminal classes as 6.25. Eligibility (ADR-0043's Q3): the approver is `users.status =
'active'` with `admin_credentials` (⛔ no role required: they are told about their own approval); the address is read through
**Q2 as admitted by ADR-0043**. Plain text, ⛔ no family name, ⛔ no deceased's name, ⛔ no words:
> *Subject:* A family memorial you approved was taken down
> *Body:* A family memorial you approved for a Sahyog Vivran page has been taken down by the helpline at the nominee's
> request. You do not need to do anything. To see which, open Memorial reviews in the Trust console.
⚠ **Cost:** an approver who has left gets ⛔ no email and ⛔ no one else is told (MP11).

### MP11 — When the approver cannot be emailed
⭐ **(a) Exactly 6.25's rule.** When the approver is ⛔ not eligible, the SELECTOR derives the `(request, NULL)` pair and its child
writes ONE request-level `no_target` row (`recipient_user_id` NULL — `0152`'s `…_no_target_recipient_check` (`(recipient_user_id
IS NULL) = (outcome = 'no_target')`) copied unchanged) plus one `error`-level structured log
(`memorial.takedown.approver_unreachable`, `{ pariwarId, requestId }`); a recipient child whose fresh re-check fails writes ⛔ no row
(`not_due` — the next sweep re-derives the pair); a row already claimed whose re-check fails ends `error` (6.25's `expired`). A
request holding the request-level `no_target` row is ⛔ never due again (so ⛔ no late email beside a `no_target`), and a (request, recipient) pair that already holds a row is ⛔ never due twice. ⛔ No fallback recipient. ⚠ *Narrowed 2026-10-27 by the code review (R2; `-412` amended): this read "a request holding **any** outbox row is never due again" — written at v0.4 when ONE approver was emailed — and lost a sibling approver whenever a sweep stopped between two.*
**Why:** `-392` item 5 names *"the person who approved"*; choosing someone else is a new disclosure. ⇒ part of **PC3**.
(If BigDev picks MP10 (b) — several approvers — 6.25's rule still holds: the selector derives a pair per eligible approver, and
`(request, NULL)` only when ⛔ none is eligible.)

### MP12 — How the operator finds the memorial
⭐ **(a)** By the deceased member's **registered mobile number** — the repo's member-search convention
([[project_membership_number_deferred_feature]]) — through the lookup the helpline already uses — `POST /api/v1/p/:pariwarId/admin/members/search` `{ by: 'mobile', value }`
(`member-validity/routes.ts`; key `member.view_validity`, held by `helpline_operator`; admin `MemberSearchRoute`). Task 0.1 (f)
confirms it returns **deceased** members (STOP 6 — confirmed at v0.4: `searchMembers` matches the mobile blind index with ⛔ no
state filter, `member/search-read.ts`; death is an overlay). The search returns a `memberId`; the operator then opens
`GET /api/v1/p/:pariwarId/memorial-takedowns/members/:memberId/drives` — a new domain accessor reading `memorial_submissions` by
`deceased_member_id` (indexed, `memorial_submissions_deceased_idx`), then each pool's chain — listing the drive(s) with a shown,
un-erased memorial (11b.4 R28: more than one closed pool can exist). ⛔ No list of every published memorial (a list of names
nobody needs). ⚠ **Cost:** a caller who does not know the member's number needs
the operator's existing tools first.

### MP13 — The switch
⭐ **(a)** The public render and the photo route obey `MEMORIAL_AUTHORSHIP_ENABLED` (off ⇒ `familyMemorial: null`, photo 404 —
Trap 9's bytes). One lever, one Row 41. The operator's take-down routes do ⛔ not obey it (a take-down must stay possible when
the lever is off — the review routes' precedent). ⚠ **Cost:** turning the switch off hides every memorial on every page within
~5 minutes; that is its job.

### MP14 — The 7-day clock and its watch
⚠ The ruled reading: `-392` item 4 (TR, kept by `-395`) — *"As recorded: within 7 days of the family's request reaching the
helpline."*; `-392` Not covered — *"what the 7 days are counted from, if not the request reaching the helpline (the reading in
item 4), and what happens if they pass"*.
⭐ **(b) — ANSWERED (BigDev 2026-10-27).** The clock starts when **the nominee's request first reaches the helpline**: the
operator records `first_contact_at` (the time of the nominee's first call or message asking for the take-down; a call from anyone
else starts nothing — `-395` item 3) alongside `received_at` (DB clock, when the verified request is recorded); `due_at =
first_contact_at + 7 days` (stored, the helpdesk SLA precedent — stored `sla_first_response_due` / `sla_resolution_due` computed
at creation by `computeTicketSlaDueDates`, `packages/domain/src/helpdesk/routing.ts`; overdue derived by
`packages/domain/src/helpdesk/sla.ts`). Bounds (CHECKs in `0187`): `first_contact_at <= received_at` and `first_contact_at >=
received_at - interval '7 days'`; both timestamps are stored on the request row (append-only — `twt_app` holds no UPDATE grant) and shown on
the drive screen; the `memorial.takedown.request_record` audit line carries a HASH of the payload, and `first_contact_at` is in that
hash (`received_at` is the row's DB clock and never was). ⚠ *Amended 2026-10-27, review RR12 (`-412` amended): this read "both
timestamps are written in the audit line" — the audit entry has no free fields, so neither is a readable field of the line.* **Why:** it MATCHES item 4's reading (as `-395` narrowed "the family" to the nominee), and recording late does
⛔ not shorten the family's 7 days. ⚠ **Cost:** `first_contact_at` is operator-entered, ⛔ not DB-stamped — it can be mistyped or
back-dated within the bound; the bound, the append-only request row and the on-screen display contain it (the audit line holds only a hash of it — RR12).
Rejected — (a) the clock from the recorded request (`due_at = received_at + 7 days`): a departure from item 4 (later than the
first call), and a late recording would eat into the family's 7 days. The operator's list shows open requests
oldest first, with *overdue* derived from `due_at`. A daily jobs sweep logs one `warn` line with the count of overdue open
requests per Pariwar (⛔ no email — ⛔ no further identity read). ⛔ No automatic take-down at day 7 (`-393` M4: the nominee may
choose to keep it). ⚠ **Cost:** a request the operator forgets to record has ⛔ no clock (under either option). Rejected — (c) reuse a helpdesk ticket category (a routing-policy version bump —
[[project_helpdesk_default_policy_version_trap]] — for one SLA).

---

## Acceptance Criteria

### AC0 — Governance before code
**Given** the build decisions above **When** Task 0.2 has BigDev's answers **Then** Decision `-412` (AUTHOR-COMMIT) records
MP1–MP14 as answered, the mints of MP6, the supersession in part of `-398` MA1 (MP1), the departure from the 10.21 pattern
(`-107` cl.1b, MP6), the narrowing in part of `-393` M4 (MP8 (b)), MP14 (b)'s clock matching `-392` item 4, MP10 (b)'s recipient reading, and the
readings named in Task 1.1 — committed **alone**, before any code ([[feedback_governance_commits_precede_implementation]]) **And**
`docs/adr/ADR-0043-…md` is drafted (`Status: drafted`) and its `adr-index.md` row added in the same commit as its reconciliation
note **And** the routing note (T1, PQ1, PQ2, PC1–PC5) exists under `_bmad-output/planning-artifacts/` and is ANSWERED — `2026-10-27-411`
(Trustee-ratified, committed alone before this story's records) **And** Row 41
gains its new criteria (AC19) **And** ⛔ no `-412` text quotes `deferred-work.md` item (1) or the `0152` header (header ⚠ GLYPH
INVERSIONS UPSTREAM).

### AC1 — The public read
**Given** a drive whose chain has an approved, un-withdrawn version **When** `GET …/public-pages/sahyog-vivran/:driveToken` is
served with the switch on **Then** `drive.familyMemorial` is non-null and carries that version per MP2/MP3 **And** `drive.familyMemorial` is `null` **iff** `latestApprovedIndex(chain) === -1`, or the switch is off, or the body or
alt text decrypts to the sentinel, or a decrypt fails with a bad envelope, or the kept words are EMPTY and there is no photo (⚠ a fifth arm, added 2026-10-27 by review R22 — it was built and untested) — ⚠ ⛔ never keyed on the HEAD's state: `[A-omit, pending]` is `with_the_trust` at the head
while v1 is still the page's (a positive leg proves v1 shows) **And** the chain is read inside the existing public scope transaction, ⛔ never a
second one **And** a bad envelope omits the memorial and keeps the page with one `error` log, while a KMS outage re-throws to the 503
outage state (`withKmsOutageClassification` — the deceased-name precedent).

### AC2 — The wire and the matrix
**Given** the contract **Then** `familyMemorial` is `.strict()`: `{ words: string[], photo: { altText: string } | null }` — each
`words` entry one paragraph of kept text joined per MP3 (b) (`-411` item 3) **And** ⛔ no key named `status`, `kind`, `segments`,
`omitted`, `reason`, `key`, `submissionId`, `objectKey`, `url`, `approvedAt`, `approver` exists anywhere in it **And** the matrix
`sahyog-vivran` surface declares `family_memorial_words`, `family_memorial_photo`, `family_memorial_photo_alt_text` at
`pii_tier: 1`, `tier: public`, each with its mandatory `tier1_public_exception: { decision, rationale, scope }` block (the matrix
parse fails without it — `packages/contracts/src/public-pages/matrix.ts`) **And** `RULED_TIER1_PUBLIC_EXCEPTIONS` gains exactly
those three `(sahyog-vivran, field)` pairs — the words and the photo citing `2026-10-23-391` item 2, the alt text citing
`2026-10-27-411` item 6 (each pair needs its own authority — `-205` cl.2), in the **same commit** as the field declarations (the `-173` follow-up's §11 timing rule) — ⚠ item 2 rules *"The words and
photo"* and the v3 permission text names *"these words, and the photo if you added one"*; the **alt text** is a third field
neither names — ⚖️ RULED public by `2026-10-27-411` item 6 (PC4 A), so the allow-list widens on a ruling (*"ADDING TO THIS LIST
IS A RULING"*) **And** every pin of Trap 5 is updated as an identity array.

### AC3 — The render
**Given** a non-null `familyMemorial` **When** the page renders **Then** the section and the figure are gated on the matrix
visibility of each of the three ids for `viewerContext="public"` (the same path `<MatrixField>` uses — every other field on
`[driveToken].astro` renders through it; ⛔ never markup that bypasses the matrix, which would make the ids decorative) **And** a
`<section aria-labelledby>` headed by the new copy key
`family_memorial.heading` sits after the drive header and before the contributor list **And** each paragraph is a `<p dir="auto"
style="white-space: pre-wrap">` (or a class carrying exactly that) rendering one `familyMemorial.words` string as given (already isolated and joined by the API — MP3 (b)) **And** ⛔ no
`render.omitted` copy, element or class marks a cut anywhere on the page (`-411` item 3; a test on a fixture with an omission)
**And** ⛔ no `set:html` exists in any `apps/public` file this story
touches (an AST/regex source test whose file list is asserted non-empty and to include `FamilyMemorial.astro`) **And** the photo is `<figure><div><div><img src="/sahyog-vivran/{token}/memorial-photo"
alt="{`photo.altText` as given}" loading="lazy" decoding="async"></div></div></figure>` with the UX frame (2 px ink border,
6 pt inner pad, 4:5) from `@twt/tokens` CSS variables **And** ⛔ no memorial text, alt text or photo URL appears in `<head>`
(Trap 12) **And** the deceased's name is ⛔ not added by this section (Trap 14) **And** a test proves the public strings equal
`joinKeptSegments(reconstructMemorial(…).asApproved)` for the same input, and that ⛔ no left-out substring and ⛔ no marker
appears (the family's screen keeps its marks — 11b.4 R10 — and now DIFFERS from the page, by `-411` item 3).

### AC4 — The photo route
**Given** MP4/MP5 **Then** the route answers `200 image/jpeg` only under MP2's predicate with a photo the Trust kept, else the
**same empty 404** as an unknown token (a test compares status, body bytes and headers per Trap 9's exclusions) — except a KMS
outage where the route decrypts: `503` + `no-store` **And** the route uses the narrow read (Trap 19): a test asserts a photo
request on a drive with an appeal reversal writes ⛔ no appeal-reversal audit line **And** the output's longest edge is ≤ 1200 px,
it carries ⛔ no EXIF/XMP/IPTC/ICC segment (a test walks the JPEG markers: only SOI, DQT, SOF, DHT, SOS, EOI, and APP0 JFIF;
the fixture is a PNG and a JPEG with a kept ICC profile, each stored **through the Send ingest path**, ⛔ never seeded around it),
and its dimensions are the stored dimensions scaled (⛔ no rotation applied — MP5) **And** `Cache-Control: public, max-age=60,
s-maxage=300` and `nosniff` are set **And** `MemorialPhotoStorage.getBytes(key)` returns `null` for a missing object in all three
adapters (GCS: catch the 404 from `download()` and return `null` — a departure from `ClaimDocumentStorage.getBytes`, which
throws) ⇒ the route 404s; any other storage error also 404s, with one `error` log **And** the Astro endpoint forwards ⛔ no query
string and ⛔ no request header but the existing `X-Forwarded-For` rule of `fetchSahyogVivran`, and builds its own response
headers (⛔ never forwards the upstream ones).

### AC5 — No trace (`-393` M1)
**Given** a drive whose memorial was taken down **When** its page and photo route are fetched **Then** both are identical —
status, body bytes, headers (Trap 9's exclusions), JSON (with `familyMemorial: null`) and rendered HTML — to the same drive's
response before any memorial was written (fixture: render, write, approve, take down, render again; diff; the API diff in
Task 5.4, the HTML diff in Task 6.5) **And** the MIDDLE render (after approval) is asserted to contain the memorial section and
the photo route to answer `200` — else the diff proves nothing **And** ⛔ no copy key, element or CSS class on the page names a
removal.

### AC6 — Recording a take-down request
**Given** a `helpline_operator` (key `memorial.takedown`, pariwar dimension) **When** they look the member up by registered mobile
(MP12), list that member's drives (`GET …/memorial-takedowns/members/:memberId/drives`) and open a drive with a shown memorial
(`GET …/memorial-takedowns/drives/:poolId`) **Then** they see the words as approved, the photo (5-minute signed URL — the
existing audited `memorial.photo.url` path), the recorded nominee's name and mobile (MP7), and any open request **And** an
erased memorial (Trap 4 — the sentinel, or `members.state = 'anonymized'`) is ⛔ never listed and its drive view is `404
memorial_takedown.not_found` **And** `POST /api/v1/p/:pariwarId/memorial-takedowns/drives/:poolId/requests`
(Idempotency-Key; body `{ calledBack: true, firstContactAt, <the shown version> }` (⚠ the shown version added 2026-10-27, review R1 / `-412` amended: a version that is no longer the shown one is `409 memorial_takedown.shown_changed` and writes no row) — `calledBack: false`, or a `firstContactAt` in the future or more
than 7 days before now, is a 400) records `memorial_takedown_requests` (`first_contact_at` as entered, `received_at` DB clock,
`due_at = first_contact_at + 7 days` — MP14 (b), `verified_by 'called_back'`, `handover_nominee_ref` snapshot, the shown `submission_id`, actor +
`actor_display`) under the pool lock **And** a second open request for the same drive is `409 memorial_takedown.request_open`
**And** a drive with ⛔ no shown memorial is the neutral `404 memorial_takedown.not_found` **And** `trustee_panel`,
`pariwar_admin` and a member token are refused (`actor-denial` spec) **And** the read writes one `memorial.takedown.read` audit
line; the write goes through `withCompensatingAudit` as `memorial.takedown.request_record`.

### AC7 — Deciding the request
**Given** an open request **When** the operator posts `POST /api/v1/p/:pariwarId/memorial-takedowns/requests/:requestId/outcome`
with `{ outcome: 'taken_down' }` (admin step-up `memorial_takedown`, Idempotency-Key) **Then** under the pool lock, in one
transaction, the chain is re-read (MP8 (c)): if `latestApprovedIndex === -1` or the shown version ≠ the request's
`submission_id` ⇒ `409 memorial_takedown.shown_changed`; else one `memorial_takedown_outcomes` row and a `helpline` withdrawal on
**every** version without one (MP8 (a)) — ⛔ no email row (the sweep derives it, MP10); audit `memorial.takedown.decide`
**And** `{ outcome: 'kept' }` and `{ outcome: 'superseded' }` (⛔ no step-up) close the request and change nothing public —
`superseded` only when the re-read shows the shown version changed, else `409 memorial_takedown.shown_unchanged`
**And** a second outcome is `409 memorial_takedown.already_decided` **And** an outcome after `due_at` is still accepted, and the
drive screen then shows the decided request as *"decided after the due date"* **And** a table test covers the chain shapes that
can exist (after a clean `approved` ⛔ no new version can be sent — 11b.4 MA13, `409 memorial.already_reviewed`): `[A]`,
`[A-omit]`, `[A-omit, A]` (Trap 1), `[N, A]`, `[A-omit, pending]`, `[A-omit, not_approved]`, `[A-omit, family-withdrawn]`,
`[A-omit, not_approved, A]`, `[A-omit, trust-withdrawn(A)]`, `[A-omit, trust-withdrawn(A), pending]` (Trap 18), and the re-send
after a take-down `[H, H, A′]` followed by a second take-down — after `taken_down`, `latestApprovedIndex` is `-1` and the family
state is `taken_down` in every shape, with `reasonCode` and `earlierApprovalWithdrawn` null **And** `[A(T)]` (nothing shown) is
`404 memorial_takedown.not_found` at the request **And** `[H, F′]` (a re-send after a take-down, then a family Withdraw) derives
`withdrawn`, ⛔ not `taken_down` (the `created_at > withdrawn_at` leg) **And** the race of a take-down with a concurrent Send,
family Withdraw, review decision or Trust withdraw-approval, and two concurrent request records, are serialised by the lock (a
`races.spec.ts` leg per pair — Task 7.3).

### AC8 — The family's view
**Given** `taken_down` **Then** `GET /api/v1/member/memorial` returns `memorialState: 'taken_down'`, `canSend: true`,
`canWithdraw: false`, `reasonCode: null`, `earlierApprovalWithdrawn: null`, `earlierApprovalStands: false` (an integration
leg in `takedown.spec.ts`) **And** the outcome screen renders ONE new flat key `outcome.taken_down` (⚠ `outcome.tsx` builds
`` `outcome.${state}` `` for the state line, and every existing state is one flat string — `outcome.approved`,
`outcome.approval_withdrawn`, …; ⛔ no `.*` children) in en + hi, with real `t()` in a render test
([[feedback_stub_must_call_not_transcribe]]), saying the words were taken down at the nominee's request, are no longer on the
page, and may be written again whenever they wish — beside the existing `outcome.write_again` and `outcome.helpline` (proposed
text: AC14) **And** the existing `outcome.approved_with_omissions` line (*"The Trust approved your words and left out a part. They will appear
on the member's Sahyog Vivran page like this."*), shown above a rendering WITH the marks, is reworded (en + hi) so it no longer
claims the page looks like the marked rendering (`-411` item 3) — the APPROVED wording (Question 10, AC14), with a render test using real `t()`
**And** ⛔ no copy says "removed by the Trust", "deleted" or "immediately" **And** a new Send after `taken_down`
works exactly as after `approval_withdrawn` (an integration leg in `takedown.spec.ts`).

### AC9 — The approver email
**Given** ADR-0043 drafted and cited **Then** migration `0187` adds `memorial_takedown_approver_emails`, mirroring `claim_suspicion_staff_emails`' states, grants and CHECKs
**unchanged** (incl. `…_no_target_recipient_check`): at most one recipient row per (request, approver) and at most one
NULL-recipient `no_target` row per request (MP10/MP11) **And** a jobs sweep registered in `apps/jobs/src/boot.ts` derives the due
outcomes and enqueues one child each (`retryLimit: CHILD_RETRY_LIMIT` = 4); the **child's claiming transaction** inserts the row
born claimed (`attempting`) for a recipient pair (⛔ no row on a failed fresh re-check — `not_due`), or the request-level
`no_target` row (+ the `memorial.takedown.approver_unreachable` error log) for the selector's `(request, NULL)` pair; a request
holding the request-level `no_target` row is ⛔ never due again, and a (request, recipient) pair that already holds a row is ⛔ never due twice (⚠ narrowed 2026-10-27, review R2 — the v0.4 wording *any outbox row* lost a sibling approver); it sends MP10's text through the existing staff-email port,
reading the address via Q2 and eligibility via ADR-0043's Q3, with the 6.25 held / transient / terminal classes (a claimed row
whose re-check fails ends `error`) **And** the outbox `detail` is a fixed vocabulary (⛔ never provider message text) **And**
`staff-email-identity-read-fence.test.ts`'s allow-lists gain exactly the new module/caller, each with an `ADR-0043` comment,
**and** its **projection** rules (today: exactly one `SELECT 1 FROM admin_credentials` and one `se_q2.email_ciphertext`, checked in
`Q_MODULE` only) are extended to Q3's module — ⚠ putting Q3 in `staff-email-identity-read.ts` trips `projection:q1-count`; putting
it in a new module escapes the projection checks unless the fence names it **And**
the plaintext address exists only in the child's memory until the provider call (ADR-0040's rule, extended).

### AC10 — The watch
**Given** open requests past `due_at` **Then** the operator's list (`GET …/memorial-takedowns/requests?open=true`, oldest first)
marks them overdue (derived) **And** a daily jobs sweep (pg-boss `boss.schedule(cron, { tz })`, the service pool) emits one
`warn` line `memorial.takedown.overdue` with `{ pariwarId, count }` per Pariwar with ≥ 1 (⛔ no names, ⛔ no ids beyond the
Pariwar) and is silent at zero (a sweep spec — Task 8.3). ⚠ *Added 2026-10-27, review R15 (`-412` amended):* a request whose deceased member has since been erased (`members.state = 'anonymized'`) is ⛔ listed and ⛔ counted — erasure already removes the memorial from the page (AC13), so the request is moot. A MISSING member row is ⛔ read as erased here (the foreign key makes it impossible, and a watch must not under-count over a shape it cannot name); `isDeceasedErased`, which guards the drive view and the record, reads a missing row as erased to FAIL CLOSED — the two differ on purpose.

### AC11 — The operator's screen
**Given** `apps/admin` **Then** a route `/p/$pariwarId/memorial-takedowns` (lookup + open requests) and
`/p/$pariwarId/memorial-takedowns/$poolId` (the drive) exist (`apps/admin/src/router.tsx`), linked from `RootLayout.tsx` when
`pariwarId` is set — ⛔ not key-gated (the memorial-reviews precedent: a Pariwar grant never reaches `nationalGrants`); the
server's `memorial.takedown` check is the boundary and the page shows its own no-access state on a 403 **And** the drive screen
shows, before the take-down button, the smaller-fix script (`-393` M4: *"leaving out a sentence or a name, removing only the
photo, or sending a new version"* — done by the nominee, MP8 (b)) in the branch the chain is in, that a new version is sent by
the **current** nominee (named when they differ from the caller), and that it leaves the page *"within about 5 minutes"* (Trap
11) — proposed text in AC14 **And** a decided request after `due_at` reads *"decided after the due date"* **And** operator-facing
copy is precise (UX-DR55 operator register) and English-only (the admin precedent) **And** ⛔ no take-down affordance exists for
any other role **And** a component test proves the script renders before the button in both branches and a 403 renders the
no-access state.

### AC12 — The review surface tells the truth
**Given** `memorial-reviews` **Then** a `helpline`-withdrawn version is ⛔ not in the **pending** queue (already true —
`listMemorialReviewQueue` excludes any withdrawn head; a test only) and the **decided** view lists such a head as `taken_down`
(`memorial.state.*` map + `decidedDateLabel`) **And** the detail shows *"Taken down at the nominee's request · {time}"* on each
such version (the total withdrawal map — Trap 15) **And** `withdraw-approval` on a `helpline`-withdrawn target answers the
existing neutral `404 memorial_review.not_found` (`latestApprovedIndex` skips any withdrawal; `MEMORIAL_REVIEW_ERROR_CODES` is
closed — ⛔ no new code) **And** each leg has a named test (Task 3.4 queue/target, Task 9.2 the page).

### AC13 — Erasure
**Given** `anonymizeMember` on the deceased **Then** the page answers `familyMemorial: null` and the photo route 404s (Trap 4)
**And** the take-down lookup and drive view ⛔ never show an erased memorial (AC6) — an AC13 leg in `takedown.spec.ts` **And** an erased deceased's OPEN request is ⛔ listed and ⛔ counted overdue (review R15 — an AC13 leg, with a live control row) **And** the
three new tables carry ⛔ no family free text and ⛔ no Tier-1 column: ids, timestamps, enums, `actor_display` snapshots of
**staff** only, and on the email outbox `0152`'s mirrored text columns (`detail` / `first_detail` ≤ 200, `provider_message_id`,
`claimed_by_job`) where `detail` is a fixed vocabulary from a builder (the `suspicionStaffEmailDetail` shape — ⛔ never provider
message text: SES errors list addresses) — so the `rtbf-anonymize.test.ts` table/statement pins are unchanged (RTBF never
touches staff `actor_display` — confirmed at v0.4).

### AC14 — Copy
**Given** the new keys (`sahyog-vivran:family_memorial.heading`, `memorial:outcome.taken_down`, the admin English strings)
**Then** each exists in en + hi where the surface is bilingual (and the reworded `memorial:outcome.approved_with_omissions`; the `sahyog-vivran` and `memorial` namespaces are already
registered — `catalog.ts`, `KNOWN_NAMESPACES` — ⛔ no registration change), covered by `microcopy.yaml` (read the **list**,
⛔ never the header) **And** `docs/tone-review-checklist.md` gains rows marked **UN-ATTESTED** (incl. the reworded `outcome.approved_with_omissions`) (the author's Hindi is ⛔ not a
review) **And** text — APPROVED by BigDev 2026-10-27 (*"all as recommended"*); `-412` records it; Task 9 changes it only with BigDev's say:
- `family_memorial.heading` — hi *"परिवार के शब्द"*, en *"In the family's words"*.
- `outcome.taken_down` — en *"At the nominee's request, the helpline has taken your words down. They are no longer on the
  member's Sahyog Vivran page. You can write again whenever you wish."*; hi *"नॉमिनी के अनुरोध पर हेल्पलाइन ने आपके शब्द हटा
  दिए हैं। वे अब सदस्य के सहयोग विवरण पेज पर नहीं हैं। आप जब चाहें फिर से लिख सकते हैं।"* (the vocabulary of the existing
  `outcome.*` strings; "the nominee", ⛔ not "you", because the person reading may be a later nominee than the one who asked).
- Operator script (English, AC11): *"Before you take it down, ask what is troubling them. Offer what is smaller than removal:
  leaving out a sentence or a name, removing only the photo, or sending a new version."* then, by branch — **can send:**
  *"The nominee can send a new version from the app now. This memorial stays on the page until the Trust approves the new one."*
  · **clean approved:** *"A new version can be sent only after this one is taken down, so the memorial will be off the page
  while the Trust reviews the new one."* — then *"A new version is sent by the current nominee{, {name}, who is not the person who
  asked}."* and, on the button's confirm: *"It leaves the page within about 5 minutes."*
- `outcome.approved_with_omissions` (REWORDED — Question 10, approved 2026-10-27) — en *"The Trust approved your words and left out
  a part, marked below. On the member's Sahyog Vivran page the part left out is simply not there — nothing marks where it was."*;
  hi *"ट्रस्ट ने आपके शब्द एक अंश छोड़कर स्वीकार किए; छोड़ा गया अंश नीचे दिखाया गया है। सदस्य के सहयोग विवरण पेज पर वह अंश बस नहीं
  होगा — वहाँ कोई निशान नहीं होगा।"* (replaces 11b.4's *"… They will appear on the member's Sahyog Vivran page like this."*).

### AC15 — Friction and weight
**Given** `friction-budget.md` / `friction-budget.yaml` (`member-public-web`) **Then** the page's added weight (HTML + CSS) and
the photo's typical size (≤ ~250 KB at MP5's settings, measured on the fixture) are recorded and disposed **in a commit before**
`friction:check` (it diffs from the merge-base — [[project_friction_budget_baseline_ratchet]]).

### AC16 — Recorded risks and deferrals (each in `deferred-work.md` with a Trigger)
(1) RULED — `-411` item 1 (PQ1 A): nominee died / unreachable / replaced ⇒ ⛔ no family take-down (except the current nominee's new
version over an `approved_with_omissions` memorial) — a ratified, accepted cost; recorded with ⛔ no Trigger. (2) RULED — `-411` item 2
(PQ2 A). (3) RULED — `-411` items 3–7 (PC1 B; PC2–PC5 A). (4) Edge latency ~5 min once a
cache exists, ⛔ no purge. (5) A new approved photo can sit beside the new words for ~5 min (MP4). (6) Kinship (11b.4 item (2)) —
still 11b.5's / a Panel purpose question. (7) A family's own erasure request (11b.4 item (7)) — ⛔ not built. (8) The architecture
§4.11.2 responsive pipeline and Astro Image component (MP5). (9) 11b.5 refactor of this markup (MP1). (10) Story 0.9 visual
validation un-attested. (11) Counsel: `-393` M4 + nominee-only against the privacy policy's *"withdrawal is as easy as giving it"*
(carried from `-393`/`-395`). (12) `sharp` CPU and memory per photo request — bounded only by `limits.search` until Row 41 (p).
(13) ⛔ No edge cache and ⛔ no Traefik route for `/sahyog-vivran/*` (inherits the 6.30 F5 mismatch) — Row 41 (p), (q). (14)
`-392` Not covered: *"whether the operator's decision is reviewed, or can be appealed"* — moot for the take-down (⛔ no merit
decision after `-393` (ii)); open for `kept` / `superseded` (no review; recorded). (15) `-393` Not covered: *"the operator's call
script, and what the family is told when they decide to keep it"* — the script is AC14's proposal; what a family is told on
`kept` is ⛔ not built (no family-facing notice; the call is the telling). (16) The MP8 (b) narrowing of `-393` M4 for a
clean-approved memorial — accepted by the Panel (`-411` item 4, PC2 A). (17) The v3 permission text says the Trust *"will never
change your words"*, while the page now joins the words across an unmarked cut (`-411` item 3 accepted *"as if the family had
written it that way"*) — carried to counsel with (11). ⭐ And **discharge**, ⛔ never delete — at **every** reference site of each item (grep the item's
letter and its distinctive phrase across the whole file): 11b.4 section items (1) and (11) → *"HOMED in 11b.4a — closes when
11b.4a is `done` on main"*; 11b.4 items (2) and (7) (Triggers name *"row 11b-4a"* / *"11b.4a"*) → *"trigger reached at 11b.4a;
carried as 11b.4a items (6)/(7), ⛔ not closed"*; the 11b.3 RENDER-NOTHING producers line for the family story → annotated, and its
bullet *"the memorial visual components (Story 11b.5) — `backlog`"* → annotated with MP1 (the render no longer waits on 11b.5).

### AC17 — Nothing else moves
⛔ No change to: In Memoriam / 11b.6 surfaces, `/sahyog`, the member app's drive detail (11b.17 — Trap 17), kinship capture, the review
reasons enum, the permission text versions, `sahyog-vivran-read.ts`'s pool-state tuple, the deceased-name gate, the Pariwar kill
switch's semantics. ⭐ `git diff origin/main -- apps/public/src/pages/sahyog.astro apps/mobile/app/'(tabs)'/shradhanjali.tsx
packages/domain/src/pool/sahyog-vivran-read.ts packages/contracts/src/contributions/member-drive-detail.ts
packages/domain/src/pool/member-drive-detail.ts` is **empty** (`SAHYOG_VIVRAN_VISIBLE_POOL_STATES` is already exported — ⛔ no
export is added).

### AC18 — Done means green on the committed tree
**Given** the last commit **Then** `pnpm ci:local` passes **36 / 36** on a fresh database **named `twt_dev`** in its own container
([[project_known_livedb_test_failures]]; ⛔ never :5432 — [[project_prepush_hook_inherits_5432]]); the row moves to `done` only after
that run.

### AC19 — Dark until Row 41 closes
**Given** the merge **Then** ⛔ nothing becomes visible: the switch stays off (Row 41) **And** Row 41 (b) is marked met by this
story's landing commit **And** Row 41 gains: (l) ADR-0043 ratified; (m) the routing note sent, PQ1/PQ2 answered and PC1–PC5
confirmed — ✅ MET 2026-10-27 by `2026-10-27-411` (record it as met when adding it); (n) `sharp` loads in the `apps/api` runtime image (`node:22-alpine` ⇒
`@img/sharp-linuxmusl-x64`) — meaningful only once the runtime stage carries its dependencies (today it copies ⛔ none; a Dokploy
deploy check); (o) a real-device check of the public page (Hindi + English text, a hostile-bidi fixture, a rotated phone photo,
TalkBack/VoiceOver reading the section); (p) an edge cache rule covering the page and `/sahyog-vivran/*/memorial-photo` (the path
has ⛔ no extension) exists — until then every request reaches the API; (q) the production proxy routes `/sahyog-vivran/*` to
`apps/public` (Traefik routes ⛔ no `/sahyog-vivran/` path today — 6.30 F5) **And** Row 41 (j) carries a dated annotation: the `memorialCanSend`
sentence gains Policy meaning 3 (a take-down leads to a new Send).

---

## Tasks / Subtasks

Each code Task (1–9) ends with **Done when** — the named test(s), each shown RED against a mutant first (11b.4's discipline).

- [x] **Task 0 — Re-verify and get answers (AC0)**
  - [x] 0.1 `git fetch origin`; `git merge-base --is-ancestor 4e57fa42 HEAD`; `git diff --name-only 4e57fa42..origin/main -- packages apps scripts docs`; rebase if behind. Re-take every NUMBER in the header across all branches + worktrees (`git for-each-ref`, `git worktree list`). Check STOPs 1–6. Also:
    (a) `latestApprovedIndex`, `deriveMemorialStatus`, `memorialChainState`, `deriveEarlierApprovalWithdrawn`, `listMemorialReviewQueue`, `memorialWithdrawApprovalTargetId` still read as in *What already EXISTS*;
    (b) every Trap 5 pin still pins an exact set, and `isSahyogVivranResponse` still returns early on a null `appealReversal`;
    (c) step-up contexts have ⛔ no registry (`requireStepUp(deps, actionContext)`, `step-up/gate.ts`) ⇒ declare `MEMORIAL_TAKEDOWN_STEP_UP_CONTEXT` once in contracts and import it in the route **and** the admin OTP caller in `apps/admin/src/api/client.ts` (the 10.21 footgun);
    (d) the `apps/api` runtime image still copies ⛔ no `node_modules` (Trap 16 — a finding for Row 41 (n), ⛔ not a step);
    (e) `0152` + `claim-suspicion-staff-emails.ts` + `suspicion-staff-email.ts` shape to mirror (MP10/MP11 — `beginSuspicionStaffEmail`, `CHILD_RETRY_LIMIT`, the `no_target` CHECK);
    (f) `admin/members/search` by mobile still returns deceased members (MP12; STOP 6 — confirmed at v0.4);
    (g) re-check the Niyamavali hashes in the **main checkout** (`docs/legal/niyamavali{,.hi}.md`) against the Policy meaning's recorded sha256; re-read if either moved;
    (h) `claim.view_nominee_name_check` still in the `helpline_operator` bundle (MP7);
    (i) `rtbf-anonymize.test.ts` still leaves staff `actor_display` untouched (AC13);
    (j) EVERY erasure path (`apps/api/src/modules/rtbf/handlers.ts`, `apps/api/src/modules/member-data-rights/handlers.ts`, incl. erasure on a `terminated` overlay — `rtbf-legality.ts`) leaves `members.state = 'anonymized'` whatever the prior state ⇒ the photo route's decrypt-free erasure check (Trap 4); if either does not, keep the body-decrypt check there.
  - [x] 0.2 BigDev answers **Questions 1–9** (Dev Notes) — MP1–MP14, the copy (MP10, AC14), and the readings and routing items. ⛔ No code before.
    ⭐ **Answered 2026-10-27 (Question 1):** *"MP1-MP13 as recommended, email every approver."* then *"yes, go with option (b) for MP14, prepare the routing note"* ⇒ MP1–MP9, MP11–MP13 (a); **MP10 (b)**; **MP14 (b)**. The routing note is DRAFTED (Task 1.3), ⛔ not sent. **Open:** Questions 2–9.
    ⭐ **Answered 2026-10-27 (Questions 2–8):** *"all as recommended"* ⇒ the copy of MP10 and AC14 APPROVED as proposed; MP7's nominee name + mobile on the take-down screen; PC5 built on the exclusion reading (`familyMemorial` stays inside `drive`); PC4 the alt text admitted and asked; the departure from 11b.4 MA18's parts list accepted; MP8 (b)'s narrowing accepted (told in PC2); the photo route JOINS `SAHYOG_VIVRAN_APPLICABLE_CONTROLS`. **Open:** Question 9 only (when BigDev sends the note) — ⛔ it does not block Task 1.
- [x] **Task 1 — Governance commits (AC0)**
  - [x] 1.1 Decision `-412` (AUTHOR-COMMIT; `-411` is the Panel's ruling, already committed), committed **alone**: MP3 SUPERSEDED by `-411` item 3 (PC1 B) and the join rule (ours); the answers; the mints (MP6, incl. `superseded`); `-398` MA1 superseded in part (MP1) with a dated pointer under `-398`; the departure from the 10.21 pattern (`-107` cl.1b verbatim, MP6; the 6.9 D7 precedent); MP7's context note; the departure from 11b.4 MA18's parts (Trap 7); MP8 (b)'s narrowing in part of `-393` M4 with a dated pointer under `-393`; MP14 (b) — the clock from the nominee's first contact, matching `-392` item 4 (MP14 (a) rejected as a departure); MP10 (b) — every approver of every approved version the take-down withdrew, our reading of `-392` item 5's *"the approver"*; the Trap 17 reading — now RULED by `-411` item 7; the alt text — now RULED by `-411` item 6; the photo route joins `SAHYOG_VIVRAN_APPLICABLE_CONTROLS` (Question 8).
  - [x] 1.2 `docs/adr/ADR-0043-memorial-takedown-approver-email.md` (`_adr-template.md`): amends ADR-0040's amendment to admit (Q2) a second caller — the memorial take-down approver-email child, for the recipient set MP10 settles — and (Q3) the approver eligibility read (`users.status`, `EXISTS admin_credentials` for ONE `user_id`, ⛔ no identity column projected); the fence's projection rules extended to Q3's module (AC9); everything else in ADR-0040 unchanged; *"a fourth is a new ADR"*. `adr-index.md` row + reconciliation note (Total 154 → 155; re-count, ⛔ never add) in the same commit. `Status: drafted`.
  - [x] 1.3 ✅ DONE 2026-10-27 — SENT by BigDev and ANSWERED: `2026-10-27-411` (ruling block in the note). Was: ⭐ DRAFTED 2026-10-27 at BigDev's request (during validate, before Task 1): `_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-10-27-11b4a-family-memorial-public-render.md` — at Task 1, re-check it against the final `-412` and Questions 2–9's answers (PC2, PC4, PC5 depend on Questions 7, 5, 4), then hand it to BigDev; ⛔ not sent by the agent. Shape: from the TEMPLATE, in the template's order: **T1** (told — `-395` item 3 answers `-393`'s open *"who may ask"* with what (ii) did ⛔ not choose as a soft measure (6); quote both lines; ⛔ never call it a reversal), then **PQ1**, **PQ2**, **PC1–PC5** (PC2 includes MP8 (b)'s narrowing; PC3 who is told when an approver has left — the clock matches item 4, ⛔ not asked; PC4 the alt text; PC5 the member-sees-more floor); ⛔ not sent.
  - [x] 1.4 Records: `epics.md` dated notes under `### Story 11b.4` (MP1 supersession; 11b.4a's scope) **and** `### Story 11b.5` (its `<PortraitFrame>` AC now refactors this story's markup — MP1); Row 41 new criteria (l)–(q) and the (j) annotation (AC19); `deferred-work.md` annotations (AC16) — dated lines, ⛔ never rewrites.
  - **Done when:** `-412` is a commit touching only `.decision-log.md`; ADR-0043 + index in one commit; the note exists unsent.
- [x] **Task 2 — Schema (AC6, AC7, AC9)**
  - [x] 2.1 `0186_memorial-withdrawal-actor-helpline.sql`: `ALTER TYPE "memorial_withdrawal_actor" ADD VALUE IF NOT EXISTS 'helpline';` **alone** (Trap 6 header copied from `0150`).
  - [x] 2.2 `0187_memorial-takedown.sql`: enum `memorial_takedown_outcome` (`taken_down`, `kept`, `superseded`); `memorial_takedown_requests` (request_id PK, pariwar_id, pool_id, submission_id + FK (pariwar_id, submission_id), handover_nominee_ref, verified_by CHECK = 'called_back', first_contact_at (operator-entered; CHECK `first_contact_at <= received_at AND first_contact_at >= received_at - interval '7 days'` — MP14 (b)), received_at `clock_timestamp()`, due_at (= first_contact_at + 7 days; CHECK), actor_id, actor_display non-blank; ⛔ no partial unique index can express "open" (openness lives in the outcomes table) ⇒ "one open request per drive" is enforced under the pool lock in the handler, with a race test); `memorial_takedown_outcomes` (request_id PK + FK, outcome, decided_at, actor_id, actor_display); `memorial_takedown_approver_emails` (mirror `0152` **unchanged in its CHECKs** — incl. `…_no_target_recipient_check` and `attempting_claimed` — keyed on `request_id`, with `0152`'s unique-index shape; MP10/MP11); `memorial_withdrawals.takedown_request_id` + a **composite** FK `(pariwar_id, takedown_request_id)` (the house pattern) + CHECK `(withdrawn_by::text = 'helpline') = (takedown_request_id IS NOT NULL)` + CHECK `withdrawn_by::text <> 'helpline' OR internal_note_ciphertext IS NULL` (Trap 7);
`actor_display_check` dropped and re-added using `::text`, inside a `DO … EXCEPTION WHEN duplicate_object` guard (`ADD
CONSTRAINT` has ⛔ no `IF NOT EXISTS`). GRANT SELECT, INSERT only; ENABLE + FORCE RLS, per-command policies on `app.pariwar_id`; ⛔ no DELETE, ⛔ no UPDATE (except the outbox columns `0152` grants). ⚠ Copy ⛔ no prose from the `0152` header (header ⚠ GLYPH INVERSIONS UPSTREAM). Update `_journal.json`.
  - [x] 2.3 Drizzle schema files + `policies/` RLS module; **update** the existing `memorial-policy-regression.spec.ts` (its pinned set of
    eleven CHECK names gains the new ones; its `actor_display_check` probes gain a `helpline` leg); the new RLS regression spec `packages/domain/tests/integration/rls/memorial-takedown-policy-regression.spec.ts` (ENABLE+FORCE, positive/negative/fail-closed, every CHECK, grants) — the pattern of the 56 `*policy-regression*` siblings.
  - **Done when:** both RLS specs pass on a fresh `twt_dev`, and dropping any one new CHECK turns one named probe RED.
- [x] **Task 3 — Domain + the Trap 15 set (ONE commit with Task 2's types) (AC1, AC7, AC8, AC12)**
  - [x] 3.0 **The same commit** also carries (Trap 15): `packages/contracts/src/memorial/vocab.ts` (`helpline`, `taken_down`); the inverted `not.toContain('helpline')` in `packages/contracts/tests/memorial.test.ts` (dated note); `MemorialWithdrawalActorSchema` and `MemorialStateSchema` (contracts `dto.ts`); the mobile `outcome.tsx` `taken_down` branch + the flat `outcome.taken_down` key (en + hi); the admin total withdrawal map, `decidedDateLabel` and `memorial.state.*` (`MemorialReviewPage.tsx`, `i18n-en.ts`); a regenerated `openapi/v1.yaml` (`pnpm contracts:emit-openapi`).
  - [x] 3.1 `vocab.ts` (the `helpline` actor, the outcome enum); `status.ts` (`MEMORIAL_STATES` + `taken_down`; per-link `deriveMemorialStatus` maps `helpline → taken_down`; the new chain-level `deriveMemorialChainState(chain)` implementing MP9 — Trap 18 — which **replaces** `memorialChainState` (`submission.ts`) at all three call sites: `decideMemorialSend`, the member GET, the review detail (`memorial-review/handlers.ts`); `memorialCanSend(taken_down) = true`, `memorialCanWithdraw(taken_down) = false`); the member GET (`memorial/handlers.ts`) sends `reasonCode: null`, `earlierApprovalWithdrawn: null`, `earlierApprovalStands: false` under `taken_down`; `review.ts` — ⛔ no code: the pending queue and the withdraw-approval target already skip any withdrawal (AC12 — tests only).
  - [x] 3.2 `packages/domain/src/memorial/public-read.ts` — `readPublicMemorial(tx, pariwarId, poolId)` → the shown version's ciphertexts, omissions, photo key/left-out (⛔ no decrypt here); and the NARROW photo-route read `readPublicMemorialPhotoTarget(tx, pariwarId, driveToken)` (token → pool restricted to `SAHYOG_VIVRAN_VISIBLE_POOL_STATES`, the shown version's photo key / left-out, the deceased's member state — Trap 19; ⛔ no contributors).
  - [x] 3.3 `packages/domain/src/memorial/takedown.ts` — list a member's drives with a shown, un-erased memorial (MP12, by `deceased_member_id`); the drive view; record request; decide outcome (MP8 (a) withdraw-all; MP8 (c) re-read ⇒ `shown_changed`; `kept` / `superseded`); the due outcomes the sweep reads (MP10); overdue count (MP14); every writer takes `lockMemorialPool`.
  - [x] 3.4 Unit + domain tests: the AC7 chain-shape table (incl. `[N, A]`, `[A-omit, A(T), pending]`, `[A(T)]` ⇒ not found, `[H, F′]` ⇒ `withdrawn`); the review detail's `memorialState` is `taken_down` for `[A-omit, family-withdrawn]` after a take-down; derivation of `taken_down` incl. a Send after it; `latestApprovedIndex === -1` after a take-down; the pending queue excludes and the withdraw-approval target skips a `helpline` head (AC12). Fixtures seed across **separate transactions** ([[project_db_clock_ordering_tests_tie]]).
  - **Done when:** the chain table passes and a mutant `deriveMemorialChainState` that reads only the head turns `[A-omit, family-withdrawn]` RED; `memorial.test.ts` and the OpenAPI determinism check pass in the same commit.
- [x] **Task 4 — Contracts (AC2, AC6–AC8)**
  - [x] 4.1 `familyMemorial` schema in `public-pages/sahyog-vivran.ts` — `{ words: string[], photo: { altText: string } | null }`, `.strict()` (MP3 (b)); prohibited-key test incl. `kind`, `segments`, `omitted`, `reason`, `key`, `submissionId`, `url` (`MemorialStateSchema` moved to 3.0).
  - [x] 4.2 Take-down DTOs (`packages/contracts/src/memorial/takedown.ts`): member drives, drive view, open-request list (with derived `overdue`), request input `{ calledBack: z.literal(true), firstContactAt: <ISO timestamp> }` (MP14 (b)) (⚠ review R1: plus the shown version), outcome input `{ outcome: 'taken_down' | 'kept' | 'superseded' }`, error codes (`memorial_takedown.not_found`, `.request_open`, `.already_decided`, `.shown_changed`, `.shown_unchanged`); `MEMORIAL_TAKEDOWN_STEP_UP_CONTEXT`.
  - [x] 4.3 Matrix YAML (each id with its `tier1_public_exception` block) + `RULED_TIER1_PUBLIC_EXCEPTIONS` (+3: words + photo citing `2026-10-23-391` item 2, alt text citing `2026-10-27-411` item 6) — **same commit**, with `public-pages.test.ts`'s identity array (six → nine); register the take-down paths in `packages/contracts/scripts/emit-openapi.ts` and regenerate `openapi/v1.yaml` (`pnpm contracts:emit-openapi`; `pnpm contracts:check-openapi-determinism`).
  - **Done when:** contracts tests pass; removing one exception pair turns the matrix parse RED.
- [x] **Task 5 — The public API (AC1, AC4, AC5, AC13)**
  - [x] 5.1 `apps/api` dependencies: `@twt/ui` to `dependencies`; `sharp@0.34.5` (MP5; `@img/sharp-linuxmusl-x64` is already locked).
  - [x] 5.2 `public-pages/handlers.ts` (`sahyogVivran`): after the drive read, `readPublicMemorial` → decrypt body + alt (`withKmsOutageClassification`) → sentinel check (Trap 4) → `reconstructMemorial` → `joinKeptSegments` (MP3 (b): keep text segments, isolate each, join; new `memorial-public-text.ts` + its unit test) → `familyMemorial`; behind MP13.
  - [x] 5.3 New route `…/sahyog-vivran/:driveToken/memorial-photo` in `public-pages/routes.ts` (same `limits.search` rate limit, same kill switch, the in-handler empty 404 for every refusal — Trap 9; the narrow read — Trap 19, ⛔ never the page handler's flow, ⛔ no appeal-reversal audit); `getBytes` on the port + three adapters (GCS catches `download()`'s 404 ⇒ `null`); the MP5 transform in `apps/api/src/modules/public-pages/memorial-photo-variant.ts`; the route joins `PUBLIC_ALLOWLIST` in `apps/api/tests/integration/login-wall.spec.ts` with its written defence; it joins `SAHYOG_VIVRAN_APPLICABLE_CONTROLS` (`sahyog-vivran-controls.ts`) IN WRITING ONLY — Question 8, answered; the set lists controls, ⛔ not routes (departure (c); `-412` §3 item 5 amended).
  - [x] 5.4 Integration specs: `public-pages/sahyog-vivran-memorial.spec.ts` (AC1 states incl. the bad-envelope and KMS-outage legs, AC3 equality, Trap 3's no-left-out-substring on a fixture holding omissions, the AC5 API diff with its middle-state assertion, AC13), `public-pages/sahyog-vivran-memorial-photo.spec.ts` (AC4: the JPEG-marker walk on PNG + ICC-JPEG fixtures stored **through the Send ingest path**; output dimensions = stored dimensions scaled, ⛔ no rotation; size ≤ 1200 px; headers; 404 parity per Trap 9's exclusions; no appeal-reversal audit line). Update the Trap 5 pins.
  - **Done when:** both specs pass; a mutant that stops stripping `reason` (Trap 3), one that keys on the head state (AC1), and one that calls `withMetadata()` (AC4) each turn a named leg RED.
- [x] **Task 6 — The public page (AC3, AC4, AC5; Traps 12, 16, 17)**
  - [x] 6.1 ⛔ NO `@twt/ui` in `apps/public` (Trap 16 — after `-411` item 3 the page renders finished strings); `isSahyogVivranResponse` validates `familyMemorial` **before** the `appealReversal` block (Trap 5); `buildSahyogVivranView` gains the memorial view model; `surface-fields.ts`: `familyMemorial: null` + a new element map of the 3 ids; `member-drive-detail-field-floor.test.ts`: `PUBLIC_DETAIL_FIELD_IDS` spreads the new map, and the 3 ids sit in a separate asserted exclusion block (`DATA_CLASS_EXCLUDED`, citing `-195` cl.1 + `2026-10-27-411` item 7) that the counterpart test subtracts, pinned to exactly those 3 ids; `declaredGaps` unchanged (Trap 17); `sahyog-vivran-copy.test.ts` `KEYS` + `family_memorial.heading`.
  - [x] 6.2 `apps/public/src/components/FamilyMemorial.astro` (section, one `<p>` per `words` string, figure; ⛔ no marker — each gated through the matrix as `<MatrixField>` does); place it in `[driveToken].astro`; update the two stale doc-blocks (`sahyog-vivran-render.ts`, `[driveToken].astro` — *"the family story (11b.4, `backlog`)"*).
  - [x] 6.3 `apps/public/src/pages/sahyog-vivran/[driveToken]/memorial-photo.ts` (APIRoute proxy: forwards ⛔ no query string, only `X-Forwarded-For`; builds its own response headers).
  - [x] 6.4 Add every new `*sahyog-vivran*` / `pages/sahyog-vivran/**` file to the financial-truth `SCAN_FILES` **by hand** in the same
    commit — ⚠ its `wholeDirs` scan is ⛔ not recursive and ⛔ never sees `pages/sahyog-vivran/[driveToken]/memorial-photo.ts`;
    and the pii-scrape route coverage loads `.astro` only (`packages/contracts/scripts/check-pii-scrape.ts`) ⇒ AC4's own header
    test is the photo endpoint's only guard — say so in the endpoint's doc-block.
  - [x] 6.5 Tests: render (pre-wrap, `dir="auto"`, marker copy, bidi on a hostile fixture, the ⛔-no-`set:html` source scan with a non-empty file list incl. `FamilyMemorial.astro`, `<head>` clean after asserting the body carries the text and photo URL — Trap 12); the guard leg (malformed `familyMemorial` + `appealReversal: null` ⇒ `bad_response`); the AC5 HTML diff with its middle-state assertion; `scrape-test.spec.ts` (both pins, +3 tier-1 ids); the built-image proof: `pnpm --filter @twt/public build` then `node apps/public/dist/server/entry.mjs` renders a memorial fixture (still worth it — a new component and a new endpoint); a fixture with an omission renders ⛔ no marker text, element or class.
  - **Done when:** the render, guard and floor tests pass; a mutant that renders a marker fails the no-marker leg.
- [x] **Task 7 — Take-down API (AC6, AC7, AC12, AC13)**
  - [x] 7.1 `memorial.takedown` key (`permissions.ts`, catalog 54 / 70; `permissions.test.ts`), grant (`roles.ts`; `roles.test.ts`); step-up context `memorial_takedown` (the contracts constant, 4.2).
  - [x] 7.2 `apps/api/src/modules/memorial-takedown/{index,routes,handlers}.ts`, registered in `apps/api/src/server.ts` (beside `registerMemorialReviewModule`). Routes (all under `/api/v1/p/:pariwarId`, key `memorial.takedown`; idempotent writes via `idempotency.createKeyedStore(deps.pool)` per [[project_idempotent_write_handler_shape]] (COMMIT then record); 23505 inside a SAVEPOINT ([[project_domain_limit_clamp_and_savepoint_retry]])):

    | Method + path | Step-up | Audit | Errors |
    |---|---|---|---|
    | `GET /memorial-takedowns/members/:memberId/drives` | — | — | — (empty list) |
    | `GET /memorial-takedowns/drives/:poolId` | — | `memorial.takedown.read` (nominee decrypt) | `404 memorial_takedown.not_found` (incl. erased) |
    | `GET /memorial-takedowns/requests?open=true` | — | — | — |
    | `POST /memorial-takedowns/drives/:poolId/requests` | — | `memorial.takedown.request_record` (`withCompensatingAudit`) | `400` (`calledBack` ≠ true; `firstContactAt` in the future or > 7 days ago), `404 …not_found`, `409 …request_open`, `409 …shown_changed` (review R1) |
    | `POST /memorial-takedowns/requests/:requestId/outcome` | `memorial_takedown` for `taken_down` only | `memorial.takedown.decide` | `404 …not_found`, `409 …already_decided`, `409 …shown_changed`, `409 …shown_unchanged` |
  - [x] 7.3 Specs `apps/api/tests/integration/memorial-takedown/{takedown,actor-denial,races}.spec.ts`: `takedown.spec.ts` (AC6/AC7 legs, AC8 member GET `taken_down` + Send-after leg, AC13 erased-memorial leg, the late-outcome leg); `actor-denial.spec.ts` (`trustee_panel`, `pariwar_admin`, a member token); `races.spec.ts` (take-down × Send, × family Withdraw, × review decision, × Trust withdraw-approval; two concurrent request records). Audit-sink union gains `memorial.takedown.read`.
  - **Done when:** the three specs pass; a mutant that withdraws only the shown version turns `[A-omit, A]` RED (Trap 1); one without the lock turns a race leg RED.
- [x] **Task 8 — Jobs (AC9, AC10) — ⛔ never started before ADR-0043 (Task 1.2) is committed**
  - [x] 8.1 `packages/domain/src/memorial/takedown-approver-email-read.ts` (or extend `staff-email-identity-read.ts`, per ADR-0043's text): Q3 eligibility; Q2 reused.
  - [x] 8.2 `apps/jobs/src/scheduler/memorial-takedown-approver-emails.ts` (mirror the 6.25 sweep: the service-pool selector derives `(request, approver)` for each eligible approver of a `taken_down` request whose own pair holds no row, or `(request, NULL)` when none is eligible and the request holds ⛔ no row at all (⚠ narrowed, review R2) → one child per pair, `retryLimit: CHILD_RETRY_LIMIT`; a recipient child inserts `attempting` or nothing (`not_due`), the NULL child inserts `no_target` — MP10/MP11) + `memorial-takedown-overdue.ts` (`boss.schedule(cron, { tz })`, daily); register both in `apps/jobs/src/boot.ts` (beside `registerClaimSuspicionStaffEmailWorkers`); own pool if it needs tx + audit ([[project_jobs_pool_two_connection_starvation]]).
  - [x] 8.3 Fence test allow-lists widened with `ADR-0043` comments, and its projection rules extended to Q3's module (AC9); sweep specs — approver email: eligible, `no_target` (approver ineligible at selection ⇒ one NULL-recipient row + the error log; the request is then never re-derived), fresh-pair re-check fails ⇒ ⛔ no row, claimed-then-ineligible ⇒ `error`, transient, held, idempotent re-run; overdue: one `warn` per Pariwar with ≥ 1, ⛔ no ids beyond the Pariwar, silent at zero.
  - **Done when:** the fence and both sweep specs pass; moving Q3 into an un-named module turns the fence RED.
- [x] **Task 9 — Family + admin surfaces (AC8, AC11, AC12, AC14)**
  - [x] 9.1 Mobile: the `taken_down` copy (landed in 3.0) — render test with real `t()` (en + hi); the reworded `outcome.approved_with_omissions` (en + hi, Question 10's wording; AC8) with its render test; `memorial-source-pins.test.ts` if it enumerates states. (`memorial-copy.ts` holds Send refusals only.)
  - [x] 9.2 Admin: `apps/admin/src/modules/memorial-takedown/*`; routes in `apps/admin/src/router.tsx` + `apps/admin/src/routes/MemorialTakedownRoute.tsx`; `RootLayout.tsx` link when `pariwarId` is set (⛔ not key-gated — AC11); `apps/admin/src/api/{client,hooks}.ts` (the step-up OTP caller imports `MEMORIAL_TAKEDOWN_STEP_UP_CONTEXT`); the drive screen's script by branch, the current-nominee line, *"decided after the due date"*; the review detail line *"Taken down at the nominee's request · {time}"* (AC12). Tests: the script renders before the button in both branches, a 403 renders the no-access state, the review detail line renders for a `helpline` row.
  - [x] 9.3 i18n catalogs (namespaces already registered — ⛔ no `catalog.ts` change), `microcopy.yaml` lists, tone-review rows (UN-ATTESTED).
  - **Done when:** the mobile render test and the admin tests pass; a two-way ternary mutant turns the review-detail test RED.
- [x] **Task 10 — Budgets (AC15)** — measure, record, commit the friction disposition; then `pnpm friction:check`.
- [x] **Task 11 — Records (AC16, AC19)**
  - [x] 11.1 `deferred-work.md`: AC16 items (1)–(16) as a new `11b.4a` section; the discharge annotations of AC16 at every reference site.
  - [x] 11.2 Row 41: (l)–(q) added ((m) recorded as met by `-411`); (j) annotated; ((e) was annotated MET on 2026-10-27 with `-411`'s records). ⛔ (b) is NOT met — it is owed at the landing commit (dated), when 11b.4a is `done` on main (reworded by review R23; it read "(b) met by the landing commit").
  - [x] 11.3 Story: Completion Notes, File List, Change Log.
  - [x] 11.4 Architecture §4.11.2 dated annotation (MP5's single variant behind a proxied plain `<img>`, ⛔ not the Astro Image component; the ADR still owed).
- [x] **Task 12 — Verify and close (AC17, AC18)** — AC17's `git diff` check (empty); commit; `pnpm ci:local` 36 / 36 on a fresh `twt_dev` in its own container; only then `review` → (after code review) `done`.

---

## Dev Notes

### The shape of the change
```
memorial_submissions ─┬─ memorial_review_decisions (actor_id = approver)
                      ├─ memorial_withdrawals  (+ 'helpline', + takedown_request_id)
                      └─ memorial_takedown_requests ── memorial_takedown_outcomes (taken_down | kept | superseded)
                                                    └─ memorial_takedown_approver_emails ◀── apps/jobs child ◀── sweep ──▶ staff-email port
public page GET (apps/api) ── readPublicSahyogVivran → readPublicMemorial → decrypt → sentinel → reconstructMemorial → strip
public photo GET (apps/api) ── readPublicMemorialPhotoTarget (narrow) → getBytes → sharp → image/jpeg   (⛔ no contributors, ⛔ no appeal audit)
apps/public [driveToken].astro ── FamilyMemorial.astro ── <img src=/sahyog-vivran/{t}/memorial-photo>
apps/public …/memorial-photo.ts ── proxies → the photo GET (own headers)
state: deriveMemorialStatus(link) [per row] · deriveMemorialChainState(chain) [replaces memorialChainState]
```

### Named identifiers (⛔ never invent a synonym — footgun 14)
`familyMemorial` (wire) · `family_memorial_words`, `family_memorial_photo`, `family_memorial_photo_alt_text` (matrix ids) ·
`memorial.takedown` (key) · `memorial_takedown` (step-up context) · `MEMORIAL_TAKEDOWN_STEP_UP_CONTEXT` (its contracts constant) ·
`helpline` (actor) · `taken_down` (state and outcome value) · `kept`, `superseded` (outcomes) · `memorial_takedown_requests`,
`memorial_takedown_outcomes`, `memorial_takedown_approver_emails` (tables) · `takedown_request_id`, `first_contact_at` / `firstContactAt` (columns / wire) · `called_back`
(`verified_by`) · `readPublicMemorial`, `readPublicMemorialPhotoTarget`, `deriveMemorialChainState` · `DATA_CLASS_EXCLUDED` (the
floor test's exclusion block) · `memorial.takedown.read`, `memorial.takedown.request_record`, `memorial.takedown.decide` (audit) ·
`memorial.takedown.overdue`, `memorial.takedown.approver_unreachable` (logs) · `memorial_takedown.not_found`,
`memorial_takedown.request_open`, `memorial_takedown.already_decided`, `memorial_takedown.shown_changed`,
`memorial_takedown.shown_unchanged` (errors) ·
`outcome.taken_down`, `family_memorial.heading` (copy keys).

### Rulings checked (verbatim where they bind)
- `-391` item 2 (TR): *"The words and photo appear on the public page, **as the Trust approved them**. … the reviewer leaves out any child's name, and the photo if it shows a child, before approval. Living adults named by the family appear as written."*
- `-391` item 7 (TR): *"The four reasons in Q4 A, and ⛔ no others, are the only grounds on which a family's words or photo may be left out or declined."*
- `-392` item 4 (TR, kept by `-395`): *"How fast: removed within 7 days, by the helpline operator. As recorded: within 7 days of the family's request reaching the helpline."* — MP14 (b) matches the second sentence (as `-395` narrowed "the family" to the nominee).
- `-392` item 5 (TR, kept by `-395`): *"An email is sent to the approver — the person who approved the memorial (the decision's recorded actor)."*
- `-392` Not covered: *"whether the operator's decision is reviewed, or can be appealed"*; *"what the 7 days are counted from, if not the request reaching the helpline (the reading in item 4), and what happens if they pass"*; *"whether "removed" ends the memorial or lets the family send a new version — Story 11b.4 MA13 lets them send again after a Trust withdrawal"*.
- `-393` M1: *"A memorial that is taken down leaves the Sahyog Vivran page exactly as if none had been written: ⛔ no "removed" marker, ⛔ no gap, ⛔ no date"*; M4: *"the helpline operator asks what is troubling them and offers what is smaller than removal: leaving out a sentence or a name, removing only the photo, or sending a new version. If the family still wants it taken down, it is taken down."*; (ii) *"⛔ Not chosen: hiding at once and deleting later (5); requiring the nominee to make the request (6); the list's own preview line"* — T1; Not covered: *"how a part is left out **after** publication (M4) — the mechanism is the build's"*, *"the operator's call script, and what the family is told when they decide to keep it"*.
- `-395` item 3 (AC): *"taken down **only on the nominee's request** — the nominee whose code sent it (the one recorded on the submission)"*; Not covered: how the operator knows the caller is the nominee (*"the build's"*); *"the nominee has died, cannot be reached, or has since been replaced … whose request counts then is open"*.
- `-107` cl.1b: *"The Helpdesk Operator may intake / verify / route but may NOT execute — already ruled, and NOT re-opened."* — DPDPA data-rights scope (Story 10.21 AC3); MP6 departs from the pattern.
- `-160` cl.4(e) (TR): the kill switch *"turns publication off irrespective of the underlying member authorisation"* — the memorial sits behind it.
- `-155` cl.2 (TR): ⛔ never the word "immediate" about this lever.
- `-162` cl.3 (TR): authorised at submission — read from the row, ⛔ never re-asked.
- `-189` cl.3 (TR) / `-195` cl.1 (AC): the member-sees-more floor and its scope (Trap 17, PC5).

### Testing standards
Vitest everywhere; live-DB specs on a fresh `twt_dev` ([[project_live_db_test_gotchas]], [[project_db_clock_ordering_tests_tie]] —
the `created_at > withdrawn_at` derivation needs **separate transactions** in fixtures, one transaction gives equal `now()`;
`clock_timestamp()` columns help but seed through separate txns anyway). Every new test is shown RED against a mutant
(11b.4's discipline) — each Task's **Done when** names one. Every "absence" assertion first asserts the presence it is measured
against (Traps 3, 9, 12; AC3's scan). ⛔ Never `--write` with Prettier ([[project_prettier_not_enforced]]). ⚠ `\u` escapes in
written content can land raw — scan new files for invisibles ([[project_unicode_escapes_written_raw]]); the bidi fixtures are
exactly where this bites.

### Previous-story intelligence (11b.4)
- Migration numbers in 11b.4's text are pre-rebase (`0181`/`0182`); the files are `0182`/`0183`.
- Drizzle wraps pg errors — check `err.cause.code` for 23505 (`isUniqueViolation`).
- `ci:local` is **36** jobs; the 10.23 gate refuses a DB not named `twt_dev`; turbo does ⛔ not pass `TWT_ALLOW_DESTRUCTIVE_LIVE_TESTS` through.
- `done` was once set before the committed-tree run and walked back — AC18 exists for that.
- V4 signed URLs embed their signing time ⇒ never key a cache or a "refetch once" guard on the URL (11b.4 T2).
- `@fastify/multipart` truncates long text fields silently — ⛔ not relevant here (no multipart), noted for the admin form.
- Review agents ran with disjoint file ownership; [[feedback_concurrent_review_agents_mutate_tree]] — check the branch before every commit.

### Git intelligence
`bab88287..4e57fa42` is the TalkBack session (PR #306): `-409` moved the name chain out of `memorial/handlers.ts` into
`kyc/member-facing-name.ts`, and the memorial screens (`index`, `write`, `photo`, `preview`) gained heading announcements
(`useMemorialAnnounce.ts`) — re-read those files before editing near them; `outcome.tsx` is unchanged. ⛔ None touches the public
page, the photo storage or the staff-email path. 11b.4 landed as PR #303 (`f5e0e3ab`); 5.11b (#304) added `0184`/`0185` (SMS) —
the next migration is `0186`.

### Latest tech
`sharp` pinned `0.34.5` (lockfile's; npm latest `0.35.5`, Node ≥ 20.9 — repo `>=22.12.0`). Use `sharp(buf, { failOn: 'error',
limitInputPixels: 50_000_000 }).resize({ width: 960, height: 1200, fit: 'inside', withoutEnlargement: true }).toColourspace('srgb').jpeg({ quality: 82,
mozjpeg: true }).toBuffer()` — ⛔ never `withMetadata()`/`keepMetadata()`. The API base is `node:22-alpine` (musl) ⇒
`@img/sharp-linuxmusl-x64@0.34.5` (already in `pnpm-lock.yaml`); the runtime stage copies ⛔ no `node_modules` today — Row 41 (n).
Astro 6 `APIRoute` returns a web `Response`; pass bytes as a `Uint8Array` body with explicit headers; `apps/public/astro.config.mjs`
sets `output: 'server'`, so the endpoint is SSR by default (⛔ no `prerender` export needed); ⛔ no Astro middleware exists, so ⛔ no
cookie reaches the endpoint.

### Project Structure Notes
**NEW** — `packages/domain/migrations/0186_memorial-withdrawal-actor-helpline.sql`, `0187_memorial-takedown.sql` (+ `meta/_journal.json`)
· `packages/domain/src/schema/memorial_takedown_*.ts` + the `policies/` module · `packages/domain/src/memorial/{public-read,takedown,takedown-approver-email-read}.ts`
· `packages/domain/tests/integration/rls/memorial-takedown-policy-regression.spec.ts` · `packages/contracts/src/memorial/takedown.ts`
· `apps/api/src/modules/memorial-takedown/{index,routes,handlers}.ts` · `apps/api/src/modules/public-pages/{memorial-photo-variant,memorial-public-text}.ts`
· `apps/api/tests/integration/public-pages/sahyog-vivran-memorial{,-photo}.spec.ts` · `apps/api/tests/integration/memorial-takedown/{takedown,actor-denial,races}.spec.ts`
· `apps/public/src/components/FamilyMemorial.astro` · `apps/public/src/pages/sahyog-vivran/[driveToken]/memorial-photo.ts`
· `apps/jobs/src/scheduler/memorial-takedown-{approver-emails,overdue}.ts` (+ specs) · `apps/admin/src/modules/memorial-takedown/*`
· `apps/admin/src/routes/MemorialTakedownRoute.tsx` · `docs/adr/ADR-0043-memorial-takedown-approver-email.md`
· `_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-10-27-11b4a-family-memorial-public-render.md`.
**UPDATE** — `packages/domain/src/memorial/{vocab,status,submission}.ts` · the memorial-photo-storage port + three adapters ·
`packages/contracts/src/memorial/{vocab,dto}.ts` · `packages/contracts/src/public-pages/{sahyog-vivran,matrix}.ts` + the matrix YAML ·
`packages/contracts/scripts/emit-openapi.ts` + `openapi/v1.yaml` · `packages/domain/src/rbac/{permissions,roles}.ts` ·
`apps/api/src/modules/public-pages/{routes,handlers}.ts` · `apps/api/src/modules/memorial/handlers.ts` (member GET under
`taken_down`) · `apps/api/src/server.ts` · `apps/api/src/audit/audit-sink.ts` · `apps/api/package.json` · `apps/public/src/lib/{sahyog-vivran.server,sahyog-vivran-render,surface-fields}.ts` · `[driveToken].astro` ·
`apps/jobs/src/boot.ts` · `apps/mobile/app/(memorial)/outcome.tsx` · `packages/i18n/locales/{hi,en}/{memorial,sahyog-vivran}.json` ·
`apps/admin/src/{router.tsx,RootLayout.tsx,api/client.ts,api/hooks.ts}` + `modules/memorial-review/{MemorialReviewPage.tsx,i18n-en.ts}` ·
`scripts/sahyog-vivran-financial-truth/check.ts` (`SCAN_FILES`) · the Trap 5 pins · the two RLS specs · the fence test ·
`microcopy.yaml` · `docs/tone-review-checklist.md` · friction budget files · `docs/knowledge-transfer/adr-index.md` · records
(`.decision-log.md`, `deferred-work.md`, `epics.md`, the roster, `sprint-status.yaml`, `architecture.md` §4.11.2).
**⛔ NOT CHANGED** — AC17's list. `packages/api-client/src/index.ts` changes only if the member DTO's type changes (types only; ⛔ no other edit).

### References
- Story 11b.4: `_bmad-output/implementation-artifacts/11b-4-memorial-authorship-surface-family-writes-the-story.md` (MA1, MA8, MA13, MA16, MA18; AC11; AC16 (1), (11)).
- Story 6.9: `_bmad-output/implementation-artifacts/6-9-claim-time-dpdpa-consent.md` (D7 — the helpline take-down-request precedent).
- Rulings: `.decision-log.md` `-107`, `-155`, `-160`, `-162`, `-173`, `-189`, `-195`, `-205`, `-209`, `-223`, `-391`, `-392`, `-393`, `-395`, `-398`, `-400`, `-405`, `-409`.
- Routing note (11b.4): `_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-10-23-11b4-family-memorial-five-questions.md` (E2 — the Niyamavali's claim-time list).
- ADRs: `docs/adr/ADR-0040-staff-email-transport.md`, `docs/adr/ADR-0022-public-astro-ssr-shell-cache-safety.md` (`apps/public` reads, the cache posture), `docs/knowledge-transfer/adr-index.md`.
- Launch gate: `docs/launch-gate-inventory/inventory-roster.md` Row 41.
- Infra: `apps/api/Dockerfile`, `apps/public/Dockerfile`, `infra/dokploy/compose.yaml`, `infra/cloudflare/README.md`.
- UX: `_bmad-output/planning-artifacts/ux-design-specification.md` — Sahyog Vivran visual grammar; `<MemorialRecord>`, `<PortraitFrame>`, FuneralFrame (2 px ink border + 6 pt inner pad; 4:5 is a listed variant, 1:1 the default); Pattern 4; UX-DR55; memorial column width (360 pt mobile / 480 pt desktop); Latin numerals for dates.
- Architecture: `_bmad-output/planning-artifacts/architecture.md` AR-48 (public shell), §4.11.2 (media budget; Astro Image component).
- Epics: `_bmad-output/planning-artifacts/epics.md` `### Story 11b.3`, `### Story 11b.4`, `### Story 11b.5`, Epic 11b header C-1, C-4, C-5.

### ❓ Questions for BigDev (Task 0.2)
1. ✅ ANSWERED 2026-10-27 — MP1–MP13 as recommended except **MP10 (b)** (every approver); **MP14 (b)** (the clock from the
   nominee's first contact). (Was: MP1–MP14 — accept the ⭐ options, or which differ? incl. MP10 (a)/(b), MP14 (a)/(b), MP8 (c).)
2. ✅ ANSWERED 2026-10-27 — as recommended (*"all as recommended"*). Copy — MP10's email text, and AC14's three proposals (`family_memorial.heading`, `outcome.taken_down`, the operator script) —
   approve, or your words?
3. ✅ ANSWERED 2026-10-27 — as recommended (*"all as recommended"*). MP7 — the operator already sees nominee mobiles on the claim snapshots screen; are you content to show the recorded nominee's
   mobile on the take-down screen too (new only in context)?
4. ✅ ANSWERED 2026-10-27 — as recommended (*"all as recommended"*). Trap 17 — build on the exclusion reading and ask the Panel (PC5, recommended), or move `familyMemorial` out of `drive` to a
   top-level sibling?
5. ✅ ANSWERED 2026-10-27 — as recommended (*"all as recommended"*). AC2 — admit the alt text as a third public field on the reading that it is the family's own words about their photo, and ask
   the Panel (PC4, recommended), or leave the alt text off the public page until ruled?
6. ✅ ANSWERED 2026-10-27 — as recommended (*"all as recommended"*). Trap 7 — accept the departure from 11b.4 MA18's parts list (⛔ no `family_asked`, ⛔ no operator note; the withdrawal points at
   its request)?
7. ✅ ANSWERED 2026-10-27 — as recommended (*"all as recommended"*). MP8 (b) — accept that for a clean-approved memorial every "smaller fix" passes through a take-down (a narrowing in part of
   `-393` M4, told to the Panel in PC2)?
8. ✅ ANSWERED 2026-10-27 — as recommended (*"all as recommended"*). Task 5.3 — the photo route joins `SAHYOG_VIVRAN_APPLICABLE_CONTROLS` (recommended: yes — it serves the same surface's data
   under the same kill switch and rate limit), or stays outside it with a written reason?
9. ✅ ANSWERED 2026-10-27 — the note was SENT and the Panel answered (`-411`). (Was: ⏳ open — no recommendation given.) The routing note (T1, PQ1, PQ2, PC1–PC5) — send it now (it also discharges 11b.4's Row 41 (e) through T1), or hold it until the
   build is reviewed?
10. ✅ ANSWERED 2026-10-27 — *"approve Question 10 as proposed"* (the Hindi still needs a non-author check — AC14). The family's outcome line after `-411` item 3 (PC1 B). Today `outcome.approved_with_omissions` says *"The Trust approved
    your words and left out a part. They will appear on the member's Sahyog Vivran page like this."* above a rendering WITH the
    marks — no longer true of the page. Proposed (UN-ATTESTED Hindi): en *"The Trust approved your words and left out a part, marked
    below. On the member's Sahyog Vivran page the part left out is simply not there — nothing marks where it was."*; hi *"ट्रस्ट ने
    आपके शब्द एक अंश छोड़कर स्वीकार किए; छोड़ा गया अंश नीचे दिखाया गया है। सदस्य के सहयोग विवरण पेज पर वह अंश बस नहीं होगा —
    वहाँ कोई निशान नहीं होगा।"* Approve, or your words?

---

## Dev Agent Record

### Agent Model Used

Claude Opus 5.5 (`claude-opus-5-5`) — `bmad-dev-story 11b-4a`, 2026-10-27; Tasks 8 and 9 built by two forked agents with disjoint
file ownership (⛔ no commits of their own), reviewed and committed by the main session.

### Debug Log References

- `ci:local` **36 / 36** at `990187b6` on a FRESH `twt_dev` in its own container (`twt-11b4a-pg`, :5447). The first run (35 / 36)
  failed `ai-10-5-coverage-guard`: the new built-server render spec made `apps/public` DB-gated and the live-DB job did not run
  it ⇒ `@twt/public` joined the integration filter in `ci-local.sh` AND `ci.yml` (`990187b6`), then the fresh re-run passed.
- Full `apps/api` suite (before Task 8): 2358 / 2360 — one 20 s timeout in `claims/verifier-console.spec.ts` under full-suite
  load (26 / 26 alone; the known contention class, ⛔ this story).
- Vitest 2's bundled Vite cannot host Astro 6's plugins ⇒ ⛔ no `.astro` container harness; the render assertions run against the
  BUILT server instead (Astro `build()` into `node_modules/.cache`, real HTTP) — which is also the built-image proof (Trap 16).
- Raw-invisible trap hit once (`\u2028/\u2029` landed raw inside a regex literal) — caught by the transform error, rewritten
  as escapes; every new file with bidi fixtures scanned afterwards.

### Completion Notes List
- ⭐ **Built (2026-10-27, `bmad-dev-story 11b-4a`):** governance first — `-412` alone (`3d42b98a`, + dated pointers under `-398` MA1
  and `-393` M4), ADR-0043 drafted + index row (`35c39dcf`), Row 41 (l)–(q) + the (j) annotation, epics notes, deferred-work
  discharge annotations (`fb3be64b`); then code: `0186` (`helpline`, alone — Trap 6) + `0187` (requests / outcomes / the 6.25-shaped
  approver outbox; the `helpline` CHECK pair via `::text`), the chain-level `deriveMemorialChainState` at all three call sites
  (Trap 18), the public read + the narrow photo read (Trap 19), the take-down domain (withdraw-all — Trap 1; MP8 (c));
  `familyMemorial` on the wire (finished strings — `-411` item 3) with its three ruled matrix pairs; the API page read + the join
  rule (`joinKeptSegments`, ours) + the photo route (`sharp@0.34.5`, ⛔ metadata); `apps/public` guard + `FamilyMemorial.astro` +
  the photo proxy; the take-down API (`memorial.takedown`, catalog 54); the approver email + overdue watch (ADR-0043 fence);
  the operator screens; the family outcome copy.
- **Mutants shown RED (each restored):** head-only chain state (`[A-omit, family-withdrawn]`); shown-only take-down (`[A-omit, A]`);
  a dropped new CHECK (name pin + named probe); a removed exception pair (matrix parse); a leaked reason (Trap 3 raw-body leg);
  a head-keyed public read (`[A-omit, pending]`); `withMetadata()` (both AC4 legs); the guard check after the early return; a
  rendered marker (built-server no-marker leg); the take-down without the pool lock (race leg); a two-way withdrawal ternary
  (admin review detail); Q3 moved to an un-named module (fence); Q3 dropped from the selector (MP10 (b) / MP11 legs).
- **Departures, stated:** (a) the photo-route claim lock is an ADVISORY lock per request, ⛔ `FOR UPDATE` — `twt_app` holds ⛔ no
  UPDATE on `memorial_takedown_requests`; (b) the overdue watch runs daily at 09:00 IST (the story named no time); (c) the photo
  route JOINS `SAHYOG_VIVRAN_APPLICABLE_CONTROLS` by documentation — ⛔ no eighth entry (ordinals 2/3 bind nothing on it);
  (d) `joinKeptSegments` takes the cut TEXTS beside `asApproved` (the presenter's `omitted` segment carries ⛔ no text, and the
  join rule needs to know whether a cut held a line break) — the cut text ⛔ never leaves the module; (e) the drive view stays
  readable after a take-down while it has requests (so a decided request can be seen), 404 only with ⛔ no shown memorial AND ⛔ no
  request, or erased; (f) a `memorial_takedown.first_contact_out_of_range` 400 code added to the closed list.
- **Measured (AC15):** static page weight 11 471 unchanged; photo variant 21 501 B (photo-like 3000×4000) / 147 903 B (full-noise
  worst case). Friction: ONE new row (the take-down's call-back), disposition committed after the implementation (`f017a4a4`). The DYNAMIC HTML, measured at
  the review fix round on a real build against a stub API: no memorial 6 655 B; +536 B words only, +633 B photo only, +926 B both (≈ 773 B of fixed markup plus the
  words) — recorded in the Story 11b.4a friction disposition in `friction-budget.md`.
- ⚠ **Owed at landing / not claimed here:** Row 41 (b) is marked met by the LANDING commit (⛔ not this branch); the Hindi of the
  new copy is the author's (tone-review rows UN-ATTESTED); Row 41 (l), (n)–(q) stay open by design — the switch stays off.
- Ultimate context engine analysis completed — comprehensive developer guide created (2026-10-27, `bmad-create-story 11b.4a`, four read-only research agents at `bab88287`).
- Re-validated 2026-10-27 at `4e57fa42` (`bmad-create-story validate 11b.4a`, four read-only verifiers: code claims, governance, design reachability, internal consistency); 40 findings, BigDev "all" — see v0.4.

### File List
**New (42):**
- `_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-10-27-11b4a-family-memorial-public-render.md`
- `apps/admin/src/modules/memorial-takedown/MemorialTakedownPage.tsx`
- `apps/admin/src/modules/memorial-takedown/derive.ts`
- `apps/admin/src/modules/memorial-takedown/i18n-en.ts`
- `apps/admin/src/routes/MemorialTakedownRoute.tsx`
- `apps/admin/tests/memorial-takedown.test.tsx`
- `apps/api/src/modules/memorial-takedown/handlers.ts`
- `apps/api/src/modules/memorial-takedown/index.ts`
- `apps/api/src/modules/memorial-takedown/routes.ts`
- `apps/api/src/modules/public-pages/memorial-photo-variant.ts`
- `apps/api/src/modules/public-pages/memorial-public-read.ts`
- `apps/api/src/modules/public-pages/memorial-public-text.ts`
- `apps/api/tests/integration/memorial-takedown/actor-denial.spec.ts`
- `apps/api/tests/integration/memorial-takedown/races.spec.ts`
- `apps/api/tests/integration/memorial-takedown/takedown.spec.ts`
- `apps/api/tests/integration/public-pages/sahyog-vivran-memorial-photo.spec.ts`
- `apps/api/tests/integration/public-pages/sahyog-vivran-memorial.spec.ts`
- `apps/api/tests/unit/memorial-public-text.test.ts`
- `apps/jobs/src/scheduler/memorial-takedown-approver-emails.ts`
- `apps/jobs/src/scheduler/memorial-takedown-overdue.ts`
- `apps/jobs/tests/memorial-takedown-approver-emails-live.test.ts`
- `apps/jobs/tests/memorial-takedown-overdue.test.ts`
- `apps/public/src/components/FamilyMemorial.astro`
- `apps/public/src/pages/sahyog-vivran/[driveToken]/memorial-photo.ts`
- `apps/public/tests/family-memorial-source.test.ts`
- `apps/public/tests/integration/public-pages/family-memorial-render.spec.ts`
- `docs/adr/ADR-0043-memorial-takedown-approver-email.md`
- `packages/contracts/src/memorial/takedown.ts`
- `packages/domain/migrations/0186_memorial-withdrawal-actor-helpline.sql`
- `packages/domain/migrations/0187_memorial-takedown.sql`
- `packages/domain/src/memorial/public-read.ts`
- `packages/domain/src/memorial/takedown-approver-email-read.ts`
- `packages/domain/src/memorial/takedown-approver-email.ts`
- `packages/domain/src/memorial/takedown.ts`
- `packages/domain/src/policies/memorial-takedown-rls.ts`
- `packages/domain/src/schema/memorial_takedown_approver_emails.ts`
- `packages/domain/src/schema/memorial_takedown_requests.ts`
- `packages/domain/tests/integration/memorial/takedown-approver-email.spec.ts`
- `packages/domain/tests/integration/memorial/takedown.spec.ts`
- `packages/domain/tests/integration/rls/memorial-takedown-policy-regression.spec.ts`
- `packages/domain/tests/memorial/memorial-takedown-chain.test.ts`
- `packages/platform-adapters/tests/memorial-photo-storage/get-bytes.test.ts`

**Modified (78):**
- `.decision-log.md`
- `.github/workflows/ci.yml`
- `_bmad-output/implementation-artifacts/deferred-work.md`
- `_bmad-output/planning-artifacts/architecture.md`
- `_bmad-output/planning-artifacts/epics.md`
- `apps/admin/src/api/client.ts`
- `apps/admin/src/api/hooks.ts`
- `apps/admin/src/modules/memorial-review/MemorialReviewPage.tsx`
- `apps/admin/src/modules/memorial-review/i18n-en.ts`
- `apps/admin/src/router.tsx`
- `apps/admin/src/routes/RootLayout.tsx`
- `apps/admin/tests/memorial-review.test.tsx`
- `apps/api/package.json`
- `apps/api/src/audit/audit-sink.ts`
- `apps/api/src/modules/memorial-review/handlers.ts`
- `apps/api/src/modules/memorial/handlers.ts`
- `apps/api/src/modules/public-pages/handlers.ts`
- `apps/api/src/modules/public-pages/routes.ts`
- `apps/api/src/modules/public-pages/sahyog-vivran-controls.ts`
- `apps/api/src/server.ts`
- `apps/api/tests/integration/login-wall.spec.ts`
- `apps/api/tests/integration/public-pages/rate-limit-key.spec.ts`
- `apps/api/tests/integration/public-pages/sahyog-vivran.spec.ts`
- `apps/jobs/src/boot.ts`
- `apps/jobs/tests/staff-email-identity-read-fence.test.ts`
- `apps/mobile/app/(memorial)/outcome.tsx`
- `apps/mobile/tests/unit/memorial-screens-render.test.ts`
- `apps/public/src/lib/sahyog-vivran-render.ts`
- `apps/public/src/lib/sahyog-vivran.server.ts`
- `apps/public/src/lib/surface-fields.ts`
- `apps/public/src/pages/sahyog-vivran/[driveToken].astro`
- `apps/public/tests/integration/public-pages/scrape-test.spec.ts`
- `apps/public/tests/member-drive-detail-field-floor.test.ts`
- `apps/public/tests/sahyog-serves.test.ts`
- `apps/public/tests/sahyog-vivran-client.test.ts`
- `apps/public/tests/sahyog-vivran-copy.test.ts`
- `apps/public/tests/sahyog-vivran-render.test.ts`
- `docs/knowledge-transfer/adr-index.md`
- `docs/launch-gate-inventory/inventory-roster.md`
- `docs/tone-review-checklist.md`
- `friction-budget.md`
- `microcopy.yaml`
- `openapi/v1.yaml`
- `packages/contracts/public-pages/public-vs-private-matrix.yaml`
- `packages/contracts/scripts/emit-openapi.ts`
- `packages/contracts/src/memorial/index.ts`
- `packages/contracts/src/memorial/photo-storage.ts`
- `packages/contracts/src/memorial/vocab.ts`
- `packages/contracts/src/public-pages/matrix.ts`
- `packages/contracts/src/public-pages/sahyog-vivran.ts`
- `packages/contracts/tests/memorial.test.ts`
- `packages/contracts/tests/public-pages-sahyog-vivran.test.ts`
- `packages/contracts/tests/public-pages.test.ts`
- `packages/domain/migrations/meta/_journal.json`
- `packages/domain/src/memorial/index.ts`
- `packages/domain/src/memorial/status.ts`
- `packages/domain/src/memorial/submission.ts`
- `packages/domain/src/memorial/vocab.ts`
- `packages/domain/src/policies/index.ts`
- `packages/domain/src/rbac/permissions.ts`
- `packages/domain/src/rbac/roles.ts`
- `packages/domain/src/schema/index.ts`
- `packages/domain/src/schema/memorial_withdrawals.ts`
- `packages/domain/tests/integration/rls/memorial-policy-regression.spec.ts`
- `packages/domain/tests/memorial/memorial-status.test.ts`
- `packages/domain/tests/rbac/permissions.test.ts`
- `packages/domain/tests/rbac/roles.test.ts`
- `packages/i18n/locales/en/memorial.json`
- `packages/i18n/locales/en/sahyog-vivran.json`
- `packages/i18n/locales/hi/memorial.json`
- `packages/i18n/locales/hi/sahyog-vivran.json`
- `packages/platform-adapters/src/memorial-photo-storage/gcs.ts`
- `packages/platform-adapters/src/memorial-photo-storage/in-memory.ts`
- `packages/platform-adapters/src/memorial-photo-storage/local-fs.ts`
- `packages/queue/src/index.ts`
- `pnpm-lock.yaml`
- `scripts/ci-local.sh`
- `scripts/sahyog-vivran-financial-truth/check.ts`
- `_bmad-output/implementation-artifacts/11b-4a-family-memorial-public-render.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`

**Review fix round (2026-10-27) — files the lists above do not name.** *New (5):*
- `apps/admin/tests/memorial-takedown-route.test.tsx`
- `apps/api/tests/unit/memorial-photo-variant.test.ts`
- `apps/api/tests/unit/memorial-public-read.test.ts`
- `apps/public/src/lib/family-memorial.ts`
- `apps/public/tests/family-memorial-gating.test.ts`

*Modified — 11b.4 files this story had not touched before (4):*
- `apps/api/src/modules/memorial/photo-metadata.ts`
- `apps/api/tests/integration/forced-pagination.spec.ts` (a comment only)
- `apps/api/tests/integration/memorial/member-memorial.spec.ts`
- `apps/api/tests/unit/memorial-photo-metadata.test.ts`

---

## Change Log

| Date | Version | Change |
|---|---|---|
| 2026-10-27 | v1.4 | **Committed** on `story/11b-4a-family-memorial-public-render` (on `ea28cbe8`), in three commits, governance first (AC0): (1) `-412`'s dated notes and ADR-0043's note; (2) the code, tests and the regenerated `openapi/v1.yaml` — everything the three review passes changed; (3) these records (the story, `deferred-work.md`, `friction-budget.md`, the ledger). ⛔ Not pushed. AC18 is still open — a 36 / 36 `ci:local` on this committed tree — so the Status stays `review`. |
| 2026-10-27 | v1.3 | **Third code review pass** (`bmad-code-review 11b.4a`, on the second fix round only — 13 files, 527 lines, against a rebuilt start-of-pass-2 snapshot; three layers, none failed): 0 decisions, 6 patches RS1–RS6 applied (the record form's per-attempt state now bound to one scope — closing a swap-and-swap-back tick, a pre-ticked return, a stale Idempotency-Key replaying an old request's 201, and a stale first-contact time; stale step-up / status / confirm state; a failed "Try again" no longer replaces the page; the SOF minimum is 11; five tests made able to fail; six overstated notes corrected), 1 deferred (RW1), 10 dismissed. Lint, typecheck, the unit phase and the touched live specs green; the full `ci:local` not re-run. ⛔ Not committed. Status stays `review` (AC18). |
| 2026-10-27 | v1.2 | **Second code review pass** (`bmad-code-review 11b.4a`, re-run on the uncommitted fix round; one pass, three layers, none failed): the Auditor checked all 28 "APPLIED" notes — 26 confirmed, 1 overstated (R4, corrected), R24's retraction plausible. 1 decision (RR1 = A, accepted), 12 patches RR2–RR13 applied (the called-back attestation now bound to its version and number; the R14 guard closed for empty and short frames; stale step-up and status state; the R12 test pinning verdict-to-key; Pariwar-scoped pages; "Try again"; literal name substitution; stale comments; two weak tests; MP14 (b), AC10, AC13, MP8 (c), MP7 (a) and `-412` amended; File List and the AC15 weight record), 8 deferred, 9 dismissed. Lint, typecheck, the unit phase and the touched live specs green; the full `ci:local` not re-run. ⛔ Not committed. Status stays `review` (AC18). |
| 2026-10-27 | v1.1 | **Code review fix round** (`bmad-code-review 11b.4a`, BigDev "apply every patch"): 27 of the 28 patches applied (R1 was the decision, DECIDED A), R24 retracted, R7 / R17 in part; `-412` amended (MP8 (c), MP11 / MP10 (b)), ADR-0043 dated note; AC1 / AC6 / AC9 / MP10 (a) / MP11 / Task 4.2 / 8.2 / 11.2 and the route table amended; `shownSubmissionId` on the record body; the approver selector gated per (request, recipient); `publicMemorialText` shared by the page and the drive view; `openapi/v1.yaml` regenerated. Verified live on a throwaway DB (every DB-gated spec touched passes; `ci:local` 35 / 36 first run, the one failure a load-timeout in an untouched admin test, unit phase re-run green at concurrency 2). ⛔ Not committed. Status stays `review`: AC18 moves the row to `done` only after a 36 / 36 `ci:local` on the COMMITTED tree (corrected after the second review pass — it had been set to `done` by the review skill's generic rule, which AC18 overrides). |
| 2026-10-27 | v1.0 | **Implemented** (`bmad-dev-story 11b-4a`): Tasks 0–12 complete; `-412` + ADR-0043 first; 0186/0187; the chain-level state; the public render (joined words, ⛔ marker), the photo route (`sharp`, ⛔ metadata), the take-down API + screens, the approver email + overdue watch, the family copy; friction row + disposition; deferred-work 11b.4a section; `@twt/public` joins the live-DB CI job. `ci:local` 36 / 36 at `990187b6` on a fresh `twt_dev`. Status → `review`. |
| 2026-10-27 | v0.8 | BigDev approved Question 10 as proposed (*"approve Question 10 as proposed"*): the reworded `outcome.approved_with_omissions` (en + hi) is in AC14's approved copy; AC8 points at it; the Hindi carries an UN-ATTESTED tone-review row like the rest. All Task 0.2 questions are answered ⇒ `bmad-dev-story 11b.4a` may start at Task 1 (`-412`, ADR-0043). |
| 2026-10-27 | v0.7 | ⚖️ **The Panel ruled** (DR + KB, relayed by BigDev): *"PQ1 - A / PQ2 - A / PC1 - B / PC2 - A / PC3 - A / PC4 - A / PC5 -A"* — transcribed as `2026-10-27-411` (Trustee-ratified, committed alone, `2cf8127e`); this story's own author-commit is RENUMBERED `-412` (every body reference; the Change Log rows above keep `-411` as written). **PC1 B reverses MP3 (a):** the public page carries ⛔ no marker — the API keeps the text segments, isolates each, and joins them (`joinKeptSegments`, the join rule ours); the wire is `{ words: string[], photo: { altText: string } | null }`; `apps/public` no longer needs `@twt/ui` (Trap 16); Traps 3/5/8, AC2/AC3, Tasks 4.1/5.2/6.1/6.2/6.5 rewritten; the alt text cites `-411` item 6; Trap 17 cites `-411` item 7. The family outcome line `outcome.approved_with_omissions` becomes inaccurate ⇒ AC8 / Task 9.1 / Question 10 (wording owed by BigDev). AC16 (1)–(3) RULED; (17) added (permission text vs unmarked joins, to counsel). Row 41 (e) MET; AC19 (m) met. Question 9 answered (sent). |
| 2026-10-27 | v0.6 | BigDev answered Questions 2–8: *"all as recommended"* — copy approved (MP10 email, AC14 heading, `outcome.taken_down`, operator script); MP7 nominee mobile on the take-down screen; PC5 / PC4 built as recommended and asked; Trap 7 departure and MP8 (b) narrowing accepted; the photo route joins `SAHYOG_VIVRAN_APPLICABLE_CONTROLS`. Question 9 (when to send the note) had ⛔ no recommendation and stays open with BigDev. The routing note's header updated (Questions 4/5/7 settled ⇒ PC5/PC4/PC2 final). Task 0.2 is complete for the build ⇒ Task 1 may start. |
| 2026-10-27 | v0.5 | BigDev answered Question 1: *"MP1-MP13 as recommended, email every approver."*; asked why MP14 (b) was not recommended (it MATCHES `-392` item 4; v0.4 had labelled (a) a departure but kept its star — a miss, stated to BigDev); then *"yes, go with option (b) for MP14, prepare the routing note"*. Recorded: MP10 (b) (every approver of every withdrawn approval — our reading of "the approver"); MP14 (b) (`first_contact_at` + bounds + `due_at = first_contact_at + 7 days`; threaded into Task 2.2, AC6, Task 4.2, the route table, Named identifiers); G6/PC3 lose the clock question. The routing note is DRAFTED (Task 1.3) — `trustee-panel-routing-note-2026-10-27-11b4a-family-memorial-public-render.md`: T1, PQ1 (recommends B — the current nominee when the original has died or been replaced), PQ2 (recommends A — the 2026-10-23 note already stated no page names the member), PC1–PC5; ⛔ not sent; its E4 commands run (two patterns fixed for bold markup). Questions 2–9 open. |
| 2026-10-27 | v0.4 | Re-validated at `4e57fa42` after the rebase (four read-only verifiers; 40 findings, BigDev "all"; each HIGH re-checked by hand against code or log). Header re-pinned (STOP 1/2 fired on the TalkBack landing and disposed; ledger next `-27k`; `dacbf424` → `598a321d`). Governance: T1 added (`-395` item 3 answers `-393`'s open "who may ask" with what (ii) did not choose — Row 41 (e) needs item 3 itself shown); PC4 (alt text) and PC5 (the member-sees-more floor) added; MP14 named a departure from `-392` item 4; MP8 split by chain shape, the clean-approved case named a narrowing in part of `-393` M4; `-107` cl.1b quoted verbatim and re-scoped ("departs from the 10.21 pattern"; 6.9 D7 cited); G5/MP9 re-cited to 11b.4 MA13 + `-392` Not covered; Policy meaning corrected (consequence sentence: a current nominee can replace an `approved_with_omissions` memorial; predicate 3 added; Niyamavali §6.5 / Part 10 quoted; the E2 record cited, ⛔ not `-391`/`-393`). Design: MP10/MP11 now copy `0152`'s CHECKs unchanged (v0.2's "true mirror" with a per-recipient `no_target` could ⛔ not be built; `retries: 0` was false — the limit is 4; rows are born in the child's claim) and email ONE approver; MP8 (c) + `superseded` + `409 shown_changed` define the request→outcome window; Trap 18 (state is head-derived; a chain-level `deriveMemorialChainState`); Trap 19 (the photo route's narrow read — ⛔ no appeal-reversal audit); Trap 16 (`@twt/ui` needs `vite.ssr.noExternal`; the API runtime image is a placeholder on `node:22-alpine`); ⛔ no edge cache / Traefik route ⇒ Row 41 (p), (q); Trap 9's header exclusions and in-handler 404; erased memorials hidden from the take-down screens; AC11 link ⛔ not key-gated. Code: Trap 5 rewritten (seven pin sites; `isSahyogVivranResponse` passes unknown keys and returns early on a null `appealReversal`); Trap 17 mechanics (`PUBLIC_DETAIL_FIELD_IDS` spread; an exclusion block, ⛔ not the GAP form); `getBytes` null departs from the claim precedent; matrix `tier1_public_exception` blocks; flat `outcome.taken_down`; AC17 empty diff (the states export already exists). Structure: Task 3.0 carries the whole Trap 15 set + OpenAPI; a route table in Task 7.2; every AC clause mapped to a Task; "Done when" mutant lines; a Trap → Task line on every Trap; Project Structure Notes; Questions renumbered 1–9; four glyph inversions fixed. **Then the pass's own diff was re-validated** (one fresh read-only verifier): 2 HIGH / 4 MEDIUM / 11 LOW, all the pass's own, all applied — `memorialChainState` has a THIRD caller (the review detail); Trap 17 / G12 had quoted the `-189` sentence `-195` cl.1 answered the other way (now quotes the binding sentence); MP11 re-shaped to 6.25's selector-derived `(request, NULL)` pair with "due only while no outbox row"; T1 is "answers the question `-393` left open", ⛔ not a reversal; Row 41 (m) gates PC1–PC5 too; the floor test subtracts `DATA_CLASS_EXCLUDED`; `superseded` needs a changed shown version (`409 shown_unchanged`); plus name/quote/attribution fixes (`resolveHandoverNominee`, the Cloudflare and Traefik quotes, 6.9 D5a, the erasure-path wording). |
| 2026-10-27 | v0.3 | Renumbered before the first commit: the pushed branch `fix/talkback-session-2026-10-27` took Decision `-409`/`-410` and ledger `-27e`–`-27h` ⇒ this story's decision is `-411` and its ledger letter `-27i`; header notes that branch's move of the name chain to `kyc/member-facing-name.ts`. Migration `0186`, `ADR-0043` and catalog `53` unaffected (that branch adds none). |
| 2026-10-27 | v0.2 | Checklist validation (one fresh-context verifier, 26 findings, all applied): AC7's chain shapes re-drawn (four were unreachable after a clean `approved`); AC1 keyed on `latestApprovedIndex`, ⛔ not the head's state; Trap 17 (the member-sees-more floor test + `-189`/`-195` reading); Trap 15 widened (contracts vocab copy, `MemorialWithdrawalActorSchema`, the admin ternary); MP5 claims ⛔ no orientation fix (ingest drops it) and pins `sharp` `0.34.5`; AC12 uses the existing 404; KMS-outage rule; the two missed gates (`login-wall` allowlist, the RLS CHECK-name pin); fence projection rules; MP10 a true 6.25 mirror (`no_target`) [⚠ 2026-10-27 v0.4: ⛔ not a mirror — `0152`'s CHECK forbids a per-recipient `no_target`; corrected at v0.4]; MP7/MP12 answered from code; MatrixField gating; latency stated as ~5 min; citations corrected (`-205` cl.2 vs `-173` §11; `-393` (i) TR / (ii) author-commit). |
| 2026-10-27 | v0.1 | Created by `bmad-create-story 11b.4a` at `bab88287`: row `backlog → ready-for-dev`. MP1–MP14 PROPOSED; one routing note planned (PQ1, PQ2, PC1–PC3), ⛔ not drafted or sent; ADR-0043 owed before the approver-email code. ⛔ No code, ⛔ no decision id taken. |

---

### Review Findings

Code review 2026-10-27 (`bmad-code-review 11b.4a`) — HEAD `ea28cbe8`, diff `4e57fa42..ea28cbe8` (122 files, +10,441 / −173), reviewed in three chunks by surface —
A data and domain (`packages/*`, migrations 0186/0187), B API (`apps/api`, `openapi/v1.yaml`, lockfile), C surfaces and jobs (`apps/public`, `apps/admin`,
`apps/jobs`, `apps/mobile`, `scripts`, `.github`) — each by three parallel read-only layers (Blind Hunter on the chunk diff alone, Edge Case Hunter with project
read access, Acceptance Auditor against this spec and the load-bearing-invariant checklist): nine layers, none failed. The records diff (2,197 lines: this file,
ADR-0043, `-412`, the routing note, friction, microcopy, launch-gate inventory) was NOT reviewed as code; the chunk-C Auditor read it to judge the record-owned ACs
(AC0, AC14–AC17). About 108 raw reports merged into 67 clusters. After the layers reported, the reviewer read every load-bearing claim against the checkout before
classifying it: CONFIRMED in code — R2, R3, R6, R7, R9, R10, R13 (the absence of any `flatten`), R18, R19, R20, R23, R25 (a), R27 (a) (R24 was listed here and RETRACTED — see it); RECORDED already (dismissed) — EXIF orientation (MP5 + the
deferred-work device-check item), the photo-route CPU cost (AC16 (12), (13)), the stale-photo window (AC16 (5)), `kept` having no review (AC16 (14), (15)), the
7-day lower bound (MP14 (b), answered by BigDev); REFUTED — the migration-journal `when` values (a one-day step from main's 0183–0185, the repo's convention),
cross-request Idempotency-Key reuse (the server namespace includes `requestId`), the "no concurrency test for one open request per drive" (`races.spec` runs it),
the overdue-watch allowlist asymmetry (refused in production and when empty). Panel-routing gate applied: nothing here goes to the Panel — R1 is BigDev's call (a
refusal, not a change to what any person sees or is owed). No HIGH finding. Severity tags are the reviewer's; family numbers are
`_bmad/custom/load-bearing-invariant-checklist.md`. ⚠ This section was written BEFORE any fix; the **Fix round** at its end records what was applied, what fell short and how it was
verified.

- [x] [Review][Patch] R1 [LOW-MED] The call-back is not bound to the version the operator was looking at — DECIDED A (BigDev, 2026-10-27, reply "1") [`apps/api/src/modules/memorial-takedown/handlers.ts` `recordRequest`, `packages/domain/src/memorial/takedown.ts`, AC6] — the POST body is exactly `{calledBack, firstContactAt}` (the spec), so a request snapshots whatever version is shown AT THE WRITE, with that version's nominee. If a newer version approved under a DIFFERENT nominee lands between the operator viewing the drive and recording, the call was to the old nominee's number and the request is recorded against the new one — the identity check `-395` item 3 rests on then holds for the wrong person. `decide` already refuses this (409 `shown_changed`, MP8 (c)); `record` does not. **A —** carry the shown version (or its `handoverNomineeRef`) in the POST body and refuse with 409 `shown_changed` (a wire + OpenAPI + UI + AC6 body-shape change); cost: a spec edit and a few hours, for a window of minutes. **B —** leave it, record it in AC16 with a Trigger; cost: when it does happen the record is wrong and nothing flags it. Recommendation A. Panel gate: NOT the Panel's — stripped of citations it is "should record refuse if the thing changed under the operator". Source: auditor B. **DECIDED A.** Carry the shown version (or its `handoverNomineeRef`) in the POST body and refuse with 409 `shown_changed`, as `decide` does. AC6's "the body is exactly `{calledBack, firstContactAt}`" is a spec sentence this REVERSES, so the edit must reach every Task that restates the body shape (at least Task 4.2's contract and Task 7.2's route table), the OpenAPI, the admin client and the record form in the same change; add a race leg (a version approved between the drive view and the record ⇒ 409, no row written). Governance first: a dated note on `-412` MP8 (c) if it names the window. **APPLIED.** `shownSubmissionId` (required, `.strict()`) is the drive view's `shown.submissionId`; the domain compares it under the pool lock and answers `shown_changed` (409, ⛔ no row, ⛔ no success audit line); the admin form echoes it and a refused record shows its OWN sentence (`error.record.shown_changed` — the decide sentence "close the request as changed" would mislead); race legs in both orders; `-412` MP8 (c), AC6, Task 4.2 and the route table amended.

- [x] [Review][Patch] R2 [MED] Sibling approver can be lost: "a request holding ANY outbox row is never due again" — family 2 REAL GAP, against `-392` item 5 / MP10 (b) [`packages/domain/src/memorial/takedown-approver-email.ts:186-209`, `apps/jobs/src/scheduler/memorial-takedown-approver-emails.ts`] — `dueRequest` (`NOT EXISTS … mt_any`) stops deriving (request, approver) pairs once ONE approver's child has written its row; branch 3 re-derives only rows that already exist as `attempting`. If the sweep stops between two approvers of one request (`maxPairs`, the budget, a `boss.send` failure that is only alarmed, a crash, or a keyset-page boundary) the rest are never emailed, and the alarm text "the rest wait for the next tick" is false. Provenance: the rule was written at v0.4 when ONE approver was emailed; v0.5 (MP10 (b), "email every approver") did not revisit it. Not in AC16 or deferred-work. Fix: gate branch 1 per (request, recipient) and keep the request-level gate only for the `(request, NULL)` / `no_target` pair (this preserves MP11's "no late email beside a `no_target`"); add a partial-run leg (u1 has a row, u2 not ⇒ u2 still due) and a page-boundary leg; a dated amendment on `-412` MP11 and AC9's "never due again" sentences lands FIRST (governance before code). Sources: blind A, edge A, auditor A, auditor C. **APPLIED.** The per-(request, recipient) gate; the `(request, NULL)` branch keeps the request-level gate; the locked re-check ALSO refuses a pair beside a `no_target` row (`request_has_rows` — beyond the finding, kept: without it "no late email beside a `no_target`" held only at selection time). `-412`, AC9, MP10 (a), MP11, Task 8.2 and ADR-0043 amended. VERIFIED FOR REAL: with the OLD selector restored, 3 of the new domain legs FAIL (u2 still due; two approvers across two keyset pages; the `no_target` leg) and all 9 pass with the fix.
- [x] [Review][Patch] R3 [MED] The drive view re-decrypts and re-audits on every window focus — AC6 "one read = one `memorial.takedown.read` line", families 6 and 8 [`apps/admin/src/api/hooks.ts:2148-2150`] — `useMemorialTakedownDrive` sets only `retry: false`, and `createQueryClient` leaves `refetchOnWindowFocus` / `refetchOnReconnect` at TanStack's `true`. Each focus decrypts the nominee's name and mobile and the family's words and writes an audit line nobody performed — the trap `useNomineeNameCheck` documents ("Do not remove these two flags"). The operator is on a phone call and will switch windows. Fix: both flags `false` and a test that a focus event does not re-fetch. Source: auditor C. **APPLIED.** Both flags `false`; 2 tests (a focus event and a reconnect event each leave the drive read once; a default-options probe on the same client IS re-read, so the events really fired).
- [x] [Review][Patch] R4 [MED] The photo route's predicate legs are untested — AC4, MP4, `-160` cl.4(e), Trap 9; a green suite proves nothing here [`apps/api/tests/integration/public-pages/sahyog-vivran-memorial-photo.spec.ts`] — five legs exist (PNG, ICC JPEG, 404 parity for left-out / missing / unknown, query-string 400, no appeal audit). None turns the Pariwar publication kill switch off (deleting `resolveDirectoryPublicationEnabled` from `sahyogVivranMemorialPhoto` stays green), none uses a non-visible pool state, none injects a storage error or a `sharp` refusal (AC4: "any other storage error also 404s, with one `error` log"), and the switch-off / erased cases check status only, not body bytes and headers. AC1's "one `error` log" on a bad envelope is also unasserted. ⚠ Not verified by the reviewer: the "BAD ENVELOPE / KMS OUTAGE" page test in `sahyog-vivran-memorial.spec.ts` asserts 500 where the comments promise 503, and its `mockRejectedValueOnce` may be consumed by the earlier name decrypt, never reaching the memorial resolver — read that test first. Sources: auditor B, blind B. **APPLIED.** Four predicate legs (kill switch off, non-visible pool state, storage fault, `sharp` refusal) each compared to the unknown-token 404 on status, body bytes and headers; three of the four show the photo as a 200 first — the storage-fault leg does not (its app has a storage instance of its own) and is held by its exactly-one `error` log (corrected at RR10); one `error` log asserted where AC4/AC1 say so. On the suspected KMS test: the "500 vs 503" half was WRONG (the API answers an unclassified throw 500; 503 is `apps/public`'s outage view, as the sibling legs assert); the "consumed spy" half could not be shown — the test now PROVES its spy is the memorial's decrypt (AAD `fieldClass: memorial`).
- [x] [Review][Patch] R5 [MED] The operator drive view's photo and alt-text branch has no test, and `drive()` re-implements the page's reconstruct / join [`apps/api/src/modules/memorial-takedown/handlers.ts` `drive()`, `apps/api/tests/integration/memorial-takedown/takedown.spec.ts`] — AC6. `approved()` sends no photo; a grep for `photoUrl|hasPhoto|altText` over the take-down tests and the domain spec is empty (verified). Unprotected: `photoKept` suppression when the Trust left the photo out, the 5-minute `signedReadUrl`, the `viewer: 'helpline'` audit line, the alt cut-and-join. Two copies of reconstruct / join / alt-join can drift while "the words as the page shows them" stays green. Fix: those legs, and call the shared `joinKeptSegments` path instead of a second copy. Source: auditor B. **APPLIED** (after a partial first pass). Tests for the three `drive()` branches (photo kept, left out, `signedReadUrl` throws) and a page-parity assertion; the duplicated orchestration is GONE — the page and the drive view both call `publicMemorialText` (new, in `memorial-public-text.ts`, with its own unit tests).
- [x] [Review][Patch] R6 [MED] The take-down list page fails silently — a 5xx or network failure on the open-requests or member-drives query renders blank, which reads as "nothing is overdue" [`apps/admin/src/modules/memorial-takedown/MemorialTakedownPage.tsx:99-149`] — only the 403 and `.data` paths are handled (verified: no `open.isError`, `isLoading` or `drives.isError`); the drive page already has both states (`:170-173`). Fix: loading and `role="alert"` error states. Sources: blind C, edge C. **APPLIED.** Loading and `role="alert"` states for both queries.
- [x] [Review][Patch] R7 [MED] Step-up send / verify failures are never rendered, and Verify stays enabled while the follow-up decide is pending [`MemorialTakedownPage.tsx:300-319`] — verified: no `verify.isError` / `stepUp.isError`, only `decide.isError && !needsStepUp`. The operator cannot tell a wrong code from no effect, and a take-down stalls silently. Fix: `role="alert"` for either error, a "code sent" status, Verify disabled while pending. Sources: blind C, edge C. **PARTIAL — one of its three claims did NOT hold.** Done: send-code and verify failures render as `role="alert"`, a "Code sent" status, and Verify's pending-disable is pinned by a test. NOT done, claim false: "Verify stays enabled while the follow-up decide is pending" — `needsStepUp` derives from `decide.error`, which TanStack clears when the retry goes pending, so the whole step-up block (Verify included) UNMOUNTS during the retry (seen with a throwaway probe). Side effect to know: the step-up prompt disappears while the retry runs.
- [x] [Review][Patch] R8 [MED] The call-back record form can be submitted with no number on screen [`MemorialTakedownPage.tsx:220-272`] — the form's gate is `d.shown !== null && open === null`; when the nominee's mobile (or the whole nominee) cannot be read the panel says "unreadable" but "I called them back" is still tickable, so the attestation `-395` item 3 rests on can be made about a number nobody saw. The spec is silent on this case. Fix (fail closed): require `d.nomineeToCallBack?.mobile != null`, otherwise show the existing unreadable text. ⚠ If BigDev wants the operator to record from another source of the number, say so — that is the opposite choice. Source: edge C. **APPLIED.** No mobile on screen ⇒ no form; a `takedown-record-unavailable` section shows the existing unreadable text.
- [x] [Review][Patch] R9 [MED] The drive page's state is not scoped to the request or the drive [`MemorialTakedownPage.tsx:162-167,243-250,320-321`, `apps/admin/src/routes/MemorialTakedownRoute.tsx:51`] — (a) after a request is recorded and closed `kept` / `superseded` the form reappears with `calledBack` still ticked and the old first-contact time; (b) no `key={poolId}` (verified), so a history jump between two drive URLs carries `calledBack`, the confirming flag and the OTP into the other drive; (c) a new request shows the previous `decide.data` ("Recorded.") or error. Fix: `key={poolId}`; on record success reset `calledBack` / `firstContact` and `decide.reset()`. Source: edge C. **APPLIED.** `key={poolId}` (a new route test mounts the real route and switches `poolId`); on record success `calledBack`, `firstContact` reset and `decide.reset()`.
- [x] [Review][Patch] R10 [MED] The new states are not announced — family 13 (d), web analogue [`MemorialTakedownPage.tsx`, `apps/admin/src/modules/memorial-takedown/i18n-en.ts:50`] — "Request recorded" is never shown (`takedown.record.recorded` is defined and used nowhere — verified), and the decide confirmation is a `role="status"` inside the `open !== null` section, which unmounts when the refetch shows the request decided (an inference from reading the code, not run). A screen-reader user gets no durable cue. Fix: one persistent status region outside the conditional sections, and tests for both success paths (the admin tests cover neither). Source: auditor C. **APPLIED.** One always-mounted `role="status"` region (`sr-only` while empty): decided, then code-sent, then "Request recorded." (the previously unused key).
- [x] [Review][Patch] R11 [MED] The approver-email child has no concurrent-redelivery or crash-reclaim leg — family 2 [`apps/jobs/tests/memorial-takedown-approver-emails-live.test.ts`] — billed as "a mirror of 6.25", but 6.25's suite has AC4 (i) (four children via `Promise.all` ⇒ ONE send) and AC4 (ii) (a crash-left `attempting` row is reclaimed) and this one has neither; the domain spec's `held_by_other` leg is sequential. An email is an external side effect. Also reported, not individually verified: provider `rejected`, `no_address` / `invalid_address`, `read_failed` / `decrypt_failed`, the give-up path, budget exhaustion, a mixed reachable / left pair — check the domain spec before adding. Sources: auditor C, blind C. **APPLIED.** 10 new live tests (N concurrent children ⇒ one send; crash-left row reclaimed; the give-up; the hold park; `rejected`; `no_address` / `invalid_address`; decrypt and read failures; a mixed pair; the R2 end-to-end). Live run: 18 / 18.
- [x] [Review][Patch] R12 [LOW-MED] Matrix gating of `FamilyMemorial.astro` is untested — AC3 names the risk ("the ids become decorative") [`apps/public/src/components/FamilyMemorial.astro:5-53`, `apps/public/tests/family-memorial-source.test.ts`] — all three ids are `public`, so the built-server spec cannot reach the negative leg, and no test asserts the component asks `visibilityOf` at all; deleting the gating changes no outcome. The repo has the pattern (`sahyog-vivran-message-block.test.ts:186-188`, `sahyog-live-section.test.ts:389-391`) and the lesson (deferred-work: a public surface with ZERO `visibilityOf` calls "shipped green"). Fix: a source-scan for the three calls and, if feasible, a planted above-ceiling verdict; add a gating mutant to the Done-when list. (The Astro endpoint not consulting the matrix is NOT a finding — AC4 does not ask for it and the API route re-checks every predicate.) Sources: auditor C, blind C. **APPLIED.** A source-scan for the three `visibilityOf` calls plus a planted above-ceiling verdict. Needed an extraction: the decision now lives in `apps/public/src/lib/family-memorial.ts` (pure, the `sahyog-vivran-message-block.ts` precedent) because `.astro` is not unit-testable; the component keeps the three literal calls. Output for a non-empty memorial is unchanged (the built-server byte-identity legs pass on a fresh build).
- [x] [Review][Patch] R13 [LOW-MED] A PNG with an alpha channel is flattened to black in the public JPEG [`apps/api/src/modules/public-pages/memorial-photo-variant.ts:25-34`] — only `.resize().toColourspace('srgb').jpeg()`, no `.flatten()`. PNG is accepted at Send, and the one PNG test is opaque (`channels: 3`). Recorded nowhere (a grep for flatten / alpha / transparent over the spec, deferred-work and the code is empty). Fix: `.flatten({ background: '#ffffff' })` and a test with a real RGBA PNG. Sources: blind B, edge B, auditor B. **APPLIED.** `.flatten({ background: '#ffffff' })`; the test uses a real RGBA PNG and fails (pixel 0, a black matte) without it.
- [x] [Review][Patch] R14 [LOW-MED] A photo over 50 megapixels is accepted at Send and then 404s forever [`memorial-photo-variant.ts:20-25`, ingest in `apps/api/src/modules/memorial/photo-metadata.ts`] — ingest caps bytes (10 MiB), not pixels; `limitInputPixels` makes `sharp` throw, the route 404s, and the page still advertises the photo with its alt text (a broken-image slot). Fix: reject on pixel count at Send, or raise the limit to cover the largest accepted 10 MiB image. Sources: edge B, blind B. **APPLIED.** Declared pixels are checked at Send (JPEG SOFn, PNG IHDR) against ONE constant, `MEMORIAL_PHOTO_MAX_PIXELS`, which `MEMORIAL_PHOTO_VARIANT.limitInputPixels` now takes; the refusal is the existing `photo_too_large` (no new enum value). Mutating the comparison turns 5 unit tests red; the Send wiring is covered by a live row in `member-memorial.spec.ts` (34 / 34).
- [x] [Review][Patch] R15 [LOW-MED] An open take-down request for a member who is later erased is unreachable and counted overdue forever [`packages/domain/src/memorial/takedown.ts:337-388`, `apps/api/src/modules/memorial-takedown/handlers.ts:169`] — AC13 is silent and AC16 does not record it. The drive view 404s for an erased subject, but `listOpenMemorialTakedownRequests` and `countOverdueMemorialTakedownRequests` do not filter erased members and `decide` has no erased check: the operator cannot close it and the daily `warn` repeats it. Five reports (blind A, blind B, edge A, edge B, auditor A). Fix (recommended, no new vocabulary): exclude erased subjects from the list and the overdue count — erasure already removes the memorial from the page (AC13), so the request is moot — and add an AC13 leg. Alternatives not taken: auto-close with a new outcome (a mint, outside the `-210` cl.2 delegation per `-398` §2), or keep the drive view readable for an erased subject that has an open request. **APPLIED — after one correction.** The first formulation INNER-joined `members`, so a request whose deceased member row is missing was dropped; the unchanged overdue-watch test (its fixture deliberately skips the drive's parents) caught it in the live run. Both queries now exclude a subject ONLY when its row exists and is anonymized (`IS DISTINCT FROM` / `NOT EXISTS`) — a watch must not under-count over a shape it cannot name. Mutation: removing the exclusion turns the R15 leg and the MP14 count leg red.
- [x] [Review][Patch] R16 [LOW] `recordRequest` checks the first-contact window BEFORE the idempotency lookup, so a legitimate retry returns 400 instead of the stored 201 [`apps/api/src/modules/memorial-takedown/handlers.ts:289-298`] — the key lives 24 h; a `firstContactAt` that was inside 7 days at the first call can age out by the retry. Fix: move the check into `run()`, after the stored-result lookup. Source: edge B. **APPLIED.** The window check is the first thing inside `run()`; the leg ages a first contact out of the window with a controlled clock and replays the key — the stored 201 comes back; without the key it is the 400.
- [x] [Review][Patch] R17 [LOW] The open-request list is unbounded, and the forced-pagination guard cannot see `{requests}` / `{drives}` [`packages/domain/src/memorial/takedown.ts:337-355`, `handlers.ts:257-279`, FR-91 `forced-pagination.spec.ts`] — bounded in practice (one open request per drive) and the sibling review list is paginated. Fix: clamp `.limit()` with a keyset cursor, or put the route on the guard's stated allowlist. Sources: edge A, edge B, auditor B, blind B. **PARTIAL.** Done: the open list is clamped (`clampLimit`, a fixed 200 default and cap, oldest `due_at` first, response keys unchanged; the truncation cost is in the domain doc). NOT done as asked: no allowlist entries in `forced-pagination.spec.ts` — the guard inspects only top-level arrays and `{items}` bodies, so entries for these routes would be inert (a probe found 57 other `{name: []}` GET bodies it cannot see); a comment above the allowlist says so instead. `memberDrives` is not clamped (its `DISTINCT ON` orders by pool id, so a LIMIT would cut by id, not age).
- [x] [Review][Patch] R18 [LOW] The operator script drops its "not the person who asked" caution when the current nominee's name is unreadable [`apps/admin/src/modules/memorial-takedown/derive.ts:18-21`] — `c.isNomineeToCallBack || c.name === null` sends a different person with a null name to the generic line (verified). Fix: branch on `isNomineeToCallBack` alone and substitute the existing `takedown.callBack.unreadable` string for `{name}` — no new copy. Sources: blind C, auditor C. **APPLIED.** Branches on `isNomineeToCallBack` alone; a null name becomes `takedown.callBack.unreadable` — no new copy.
- [x] [Review][Patch] R19 [LOW] MP14 (b): the drive screen shows `firstContactAt` but not `receivedAt` or `dueAt` [`MemorialTakedownPage.tsx`] — the spec says both are "shown on the drive screen"; the DTO carries both; verified `receivedAt` is rendered nowhere and `dueAt` only in the list. Source: auditor C. **APPLIED.** A second line per request on the drive screen: "Recorded <receivedAt> · Due <dueAt>".
- [x] [Review][Patch] R20 [LOW] The OpenAPI document promises a 503 `no-store` KMS-outage arm the photo route cannot produce [`packages/contracts/scripts/emit-openapi.ts`, `openapi/v1.yaml:17067`] — the route decrypts nothing (Trap 19; its own doc-block says "no KMS-outage 503 arm") and AC4's 503 is conditional on "where the route decrypts" (verified). The 400 text also omits `first_contact_out_of_range`. Fix the text and regenerate. Sources: blind B, blind A, auditor B. **APPLIED.** The photo entry loses the KMS-outage sentence and the 503; the record entry gains `shownSubmissionId`, the 409 `shown_changed` and the 400 `first_contact_out_of_range`; `openapi/v1.yaml` regenerated ONCE (deterministic; the delta is exactly those 14 lines).
- [x] [Review][Patch] R21 [LOW] Four of nine outbox CHECKs have no violating-row probe — family 5 [`packages/domain/tests/integration/rls/memorial-takedown-policy-regression.spec.ts`] — `attempt_count_check`, `detail_length_check`, `first_detail_length_check`, `first_detail_vocabulary_check` (the last only by pattern text). Probe (d) pins every CHECK name, so a dropped CHECK is caught and a weakened one (`>= 0`) is not; "dropping any one new CHECK turns a probe RED" holds for existence only. Source: auditor A. **APPLIED.** Probe (l2) covers the four CHECKs plus two legal rows; it runs as the superuser because `twt_app`'s INSERT grant excludes `attempt_count` and `first_detail` (it would hit 42501 before the CHECK).
- [x] [Review][Patch] R22 [LOW] The fifth `null` arm of `readPublicMemorial` is undocumented and untested, and the component can draw a heading over nothing [`apps/api/src/modules/public-pages/memorial-public-read.ts:74`, `apps/public/src/components/FamilyMemorial.astro:26-53`] — `{words: [], photo: null}` ⇒ `familyMemorial: null` (sensible), but AC1 and the file header list four conditions; and if the words are empty and the matrix hides the photo, `wordsVisible` still renders a heading-only section, which breaks "no trace" (Trap 9). Fix: amend AC1 and the header, add a test, add a `hasContent` guard to the component. Sources: auditor A, auditor B, edge C, blind A, blind C. **APPLIED.** The fifth arm is in the file header, the contract docblock and AC1 (amended), with a unit test; the component's `hasContent` guard (in `planFamilyMemorial`) draws nothing for empty words with the photo hidden — removing it turns 2 tests red; a built-server leg asserts no heading.
- [x] [Review][Patch] R23 [LOW] Closure language that over-claims — family 10 [`sahyog-vivran-render.ts`, `apps/public/src/pages/sahyog-vivran/[driveToken].astro`, Task 11.2] — the code doc-blocks say "DISCHARGED" while `deferred-work.md` says "HOMED… Closes when 11b.4a is `done` on main. ⛔ Not closed yet"; Task 11.2 is ticked `[x]` "(b) met by the landing commit" while Row 41's (b) is unchanged (the Completion Notes admit it is owed at landing). Fix: say "HOMED" in the code; untick or reword 11.2. Verified: `[driveToken].astro:28` and `sahyog-vivran-render.ts:27` say "DISCHARGED 2026-10-27 by Story 11b.4a"; Task 11.2 is ticked `[x]`. Source: auditor C. **APPLIED.** Both doc-blocks say HOMED; Task 11.2 no longer claims (b) is met.
- [x] [Review][Patch] R24 [LOW] ~~Ledger: `sprint-status.yaml`'s YAML `last_updated` block carries only `-27i`; `-27k` … `-27p` exist only as top-of-file comment lines.~~ — **RETRACTED on re-check (2026-10-27): the finding's premise was wrong.** The reviewer checked four letters (`-27e` … `-27h`) on main, found each in both the top-comment ledger and the YAML block, and generalised "main carries each letter in both places". The full comparison on main says otherwise: from 2026-10-20 on, 174 letters sit in the top-comment ledger and 88 in the block, and `-27a` … `-27c` and `-26d` … `-26g` are comment-only too. The block is a partial mirror; the top-comment ledger is the active one, so `-27k` … `-27p` being comment-only follows the convention and is no gap. `sprint-status.yaml` was not touched for this. Source: auditor C (the claim), the reviewer (the generalisation).
- [x] [Review][Patch] R25 [LOW] Comments that state something the code does not — (a) `apps/public/src/pages/sahyog-vivran/[driveToken]/memorial-photo.ts:12` names `tests/memorial-photo-endpoint.test.ts` as the header check; the file does not exist (verified), the real check is the AC4 leg of the DB-gated `family-memorial-render.spec.ts`; (b) `memorial-public-text.ts` says "ONE consumer" and `memorial-takedown/handlers.ts` is a second; (c) `routes.ts`: "BOTH timestamps are in the audit line" — they are only inside `requestPayloadHash` (MP14 (b): "written in"); (d) the overdue-watch header says its queue name "is a module constant HERE — owed to `QUEUE_NAMES`" while the code imports `QUEUE_NAMES.MEMORIAL_TAKEDOWN_OVERDUE_WATCH`; (e) "joins `SAHYOG_VIVRAN_APPLICABLE_CONTROLS`" is a comment only (disclosed as departure (c)). Sources: auditor C, auditor B, blind C. **APPLIED** for (a)–(e). The "BOTH timestamps" comment was in `handlers.ts`, not `routes.ts` — corrected to say only `first_contact_at` is inside `requestPayloadHash` (and `received_at` never was); the same "joins `SAHYOG_VIVRAN_APPLICABLE_CONTROLS`" wording in `login-wall.spec.ts` is corrected too.
- [x] [Review][Patch] R26 [LOW] Hygiene — the orphaned JSDoc in `packages/contracts/src/public-pages/sahyog-vivran.ts` (the new `PublicSahyogVivranFamilyMemorial` block sits between the "Do not harmonise it back" docblock and `SAHYOG_VIVRAN_PROHIBITED_KEYS`; verified by Auditor A); the dead export `MEMORIAL_TAKEDOWN_DUE_MS` (zero uses; the 7 days live as SQL `168 hours` and the handler's `FIRST_CONTACT_WINDOW_MS`); the typed `memorial_takedown_approver_emails.ts` declares seven CHECKs and omits the two `*_vocabulary_check`s its sibling declares; hard-coded English labels in the admin page ("Drive", "Before you take it down", "Decide the request") and an empty `<th scope="col">`. Sources: auditor A, auditor C, blind A, blind C. **APPLIED.** The JSDoc move; `MEMORIAL_TAKEDOWN_DUE_MS` removed (zero uses repo-wide, in no export pin); the two vocabulary CHECKs declared on the typed schema; the admin labels through the resolver, the empty `<th>` is "Status".
- [x] [Review][Patch] R27 [LOW] Test hardening — (a) `apps/public/tests/integration/public-pages/family-memorial-render.spec.ts:134,137`: `section.length < b.length` and `indexOf('Drive details') < …` pass vacuously when the marker is absent (verified); the readiness loop sleeps only on a thrown fetch; (b) `family-memorial-source.test.ts` — the title promises `set:text` but asserts `set:html` and `innerHTML`, and the file list is hand-kept; (c) the Q3 fence `apps/jobs/tests/staff-email-identity-read-fence.test.ts:129-134` matches `SELECT … FROM admin_credentials` and the alias `mt_ac.` only, so a `JOIN admin_credentials ac` projection is invisible — add JOIN and any-alias rules and a planted positive control; (d) the admin tests do not cover the Idempotency-Key lifecycle, the record form's `calledBack` gate, the member lookup, verify-then-retry or the `kept` / `superseded` success paths, and `beforeEach` resets 4 of the 7 mocked client functions; (e) AC15: the HTML / CSS weight added to the page is described, not measured. Sources: blind C, edge C, auditor C. **APPLIED** for (a)–(e). (a) presence is asserted before the order checks and the readiness loop backs off on a 5xx; (b) the title is fixed and a completeness scan stops the file list going stale; (c) the Q3 fence now has JOIN and any-alias rules with five planted controls a scratch replica of the old rule is blind to; (d) the admin suite grew from 12 to 36 tests and every mock is reset; (e) MEASURED on a real build against a stub API: a page with NO memorial is 6,655 B of HTML; words only +536 B (153 B of it the words), photo only +633 B, both +926 B (≈ 773 B of fixed markup); the static page weight is UNCHANGED at 11,471 B with 0 JS (`dist/page-weight.json`).
- [x] [Review][Patch] R28 [LOW] Families 3 / 12 legs fall short of the sibling standard [`apps/api/tests/integration/memorial-takedown/actor-denial.spec.ts`, `takedown.spec.ts`] — the five routes cover `trustee_panel`, `pariwar_admin`, another Pariwar (404), a member bearer and anonymous; the sibling `memorial/actor-denial.spec.ts` also tests step-up "expired" and "another context" (a helpline operator routinely holds `claim_file`), and no test passes another Pariwar's `poolId` / `requestId` / `memberId` under the caller's own `pariwarId`; `decide`'s Idempotency-Key and the 7-day window boundaries are untested. Route wiring is pinned (the positive leg elevates with the right context) — this is coverage, not a hole. Sources: auditor B, blind B. **APPLIED.** Step-up expired and another-context legs, another Pariwar's ids under the caller's own path (neutral 404 and no write; the member lookup answers 200 `{drives: []}`, asserted as the route's neutral answer), the Idempotency-Key replay and in-progress 409 on `decide`, the window boundaries to the millisecond, and record-vs-decision races in both orders.

- [x] [Review][Defer] R29 NUL byte in `driveToken` ⇒ 500 instead of the empty 404 [`packages/contracts/src/public-pages/sahyog-vivran.ts:649`] — the shared param `z.string().trim().min(1).max(64)` admits `%00` and `pools.publicToken` is `text`, which cannot hold NUL; the anonymous GET throws. Pre-existing on the page route (same param, same lookup); the photo route inherits it. Inference — not run; no test plants a NUL. Reveals nothing about existence. deferred, pre-existing — fix once in the shared param with a leg on both routes. Source: edge B.
- [x] [Review][Defer] R30 Nullable-enum OpenAPI shape — `smallerFix` is `type: [string, "null"]` with an `enum` that omits null, so a strict validator rejects a legitimate null [`openapi/v1.yaml:9628-9634`] — deferred, pre-existing: the generator emits this shape at four sites; fix once in `emit-openapi.ts`. Source: blind B.
- [x] [Review][Defer] R31 The `no_target` unreachable-approver log is emitted after the commit [`apps/jobs/src/scheduler/memorial-takedown-approver-emails.ts:259-266`] — a crash in the window loses the only signal (the durable `no_target` row remains) — deferred, pre-existing: it mirrors 6.25's shape. Sources: blind C, edge C.
- [x] [Review][Defer] R32 Static `import sharp` in `public-pages/handlers.ts` — if the native binary is missing the API fails to boot with the memorial switch OFF; a lazy import would confine it to one route — deferred: moot until the image has `node_modules` (deferred-work item (13), Row 41 (n)); inference. Source: auditor B.
- [x] [Review][Defer] R33 `isNomineeToCallBack` compares nominee VERSION ids, not people [`handlers.ts:232`] — if re-saving the same person's declaration mints a new `member_nominee_versions` row the script tells the operator "not the person who asked" about the person who asked — deferred: spec-literal (MP8 (b) compares versions) and an inference; needs a trace of the nominee-declaration versioning. Source: auditor B.
- [x] [Review][Defer] R34 `lockMemorialPool` is taken before the pariwar-scoped read in `recordMemorialTakedownRequest` (a global `hashtext('memorial:'||pool_id)` key) — an operator who knows a foreign pool UUID can briefly take that tenant's lock before the 404; `decide` reads first — deferred: low impact; unverified whether the 11b.4 writers share the ordering. Source: auditor B.
- [x] [Review][Defer] R35 GCS `download()` 404 is read as "object missing" even when the BUCKET is missing or misnamed [`packages/platform-adapters/src/memorial-photo-storage/gcs.ts:67-77`] — a misconfigured bucket serves silent 404s for every photo — deferred: operations-visible (no photo loads); revisit at the first real bucket. Source: edge A.
- [x] [Review][Defer] R36 Same-millisecond tie at the take-down boundary [`packages/domain/src/memorial/status.ts:98`] — `createdAt.getTime() > newestTakedown` compares millisecond-truncated `Date`s, so a re-send committing in the same millisecond as the take-down would read `taken_down`; no fixture exercises the tie (the re-send fixtures use `Date.now() + 60_000`) — deferred: inference on reachability (a Send committing within 1 ms of the take-down, under the pool lock). Sources: blind A, edge A.

Dismissed as noise or handled elsewhere (31): the 7-day lower bound on `first_contact_at` making a late first contact unrecordable (ruled — MP14 (b), BigDev, cost stated); the migration-journal `when` values "synthetic" (repo convention, one-day steps from main); a decide Idempotency-Key reused across requests (the server namespace includes `requestId`); `withIdempotency` weaknesses (the repo's commit-then-`recordResult` shape; payload-agnostic replay is the store's contract); an upper-case UUID in idempotency / audit keys (branded ids are lower-case); any `23514` mapped to `first_contact_out_of_range` (the only CHECK a record insert realistically trips); the hand-rolled step-up gate (covered by the positive and 403 legs); OpenAPI shape nits (no 401s, a single-value `?open=true`); photo-route cost, size cap and proxy robustness (recorded — AC16 (12), (13)); EXIF orientation dropped at ingest (recorded — MP5 and the deferred-work device-check item); two erasure predicates for the page and the photo route (Auditor A traced both erasure handlers: same-transaction `anonymized` projection); `@twt/ui` as an API runtime dependency and lockfile churn (recorded — deferred-work item (11)); thin audit on list reads and log volume; positional pairing in `joinKeptSegments` (single-layer, the AC3 test asserts a literal array); SSR-guard strictness and deploy order; the Astro endpoint not consulting the matrix (AC4 does not ask); overdue-watch alarm and allowlist asymmetry (MP14 specifies one `warn` line; the allowlist is refused in production and when empty); member-drives query not invalidated (`gcTime: 0` and `refetchOnMount: 'always'` refetch it); admin timestamps without a zone; `@twt/public` joining the DB-gated CI job (disclosed, AI-10-5); the mobile `taken_down` testID (covered by test, per Auditor C); `kept` / `superseded` needing no step-up (recorded — AC16 (14), (15); `calledBack` is an attestation by the spec's own statement); approver-email specs not run under `twt_app` (single-layer, unverified); "no concurrency test for one open request per drive" (refuted — `races.spec`); mixed `7 days` / `168 hours` units; rolling-deploy break of the new required key; the sixth error code (disclosed departure (f)); the drive view readable after a take-down (disclosed departure (e)); `alt=""` when the Trust left out all of the alt text (specified — MP3, "never synthesised", PC4 A); Trap 11 "immediately" in negated comments; the new alt text and photo cached separately for ~5 minutes (recorded — AC16 (5), Row 41 (p)).

**Fix round — 2026-10-27 (BigDev: reply "1" on R1 = option A; then "1" = apply every patch).** 27 of the 28 patches applied (R1 was the decision, DECIDED A; R2–R28 the rest), R24 retracted, R7 and R17 applied in
part (the reasons are on their lines). Method: four agents with disjoint file ownership (the admin console; the take-down domain / API chain; the
approver email and jobs; the public page and photo) and the reviewer, who did the governance first — `-412` amended by dated notes (MP8 (c) for R1; MP11
and MP10 (b) for R2), ADR-0043's sentence by a dated in-body note — then the spec sentences those two reverse (AC1, AC6, AC9, MP10 (a), MP11, Task 4.2,
Task 8.2, the route table, Task 11.2), the two code doc-blocks (R23), the admin wiring of R1, the shared `publicMemorialText` helper (R5), the OpenAPI text
and ONE regeneration of `openapi/v1.yaml`. Files: 52 modified (the story, `deferred-work.md`, `.decision-log.md`, ADR-0043, `sprint-status.yaml` and — from the second pass — `friction-budget.md` among them) and 5 new (`apps/admin/tests/memorial-takedown-route.test.tsx`,
`apps/api/tests/unit/memorial-photo-variant.test.ts`, `apps/api/tests/unit/memorial-public-read.test.ts`, `apps/public/src/lib/family-memorial.ts`,
`apps/public/tests/family-memorial-gating.test.ts`). ⛔ Nothing was committed when this was written (the commits are in the Change Log, v1.4).

*Verification, on a fresh throwaway `twt_dev` (container on :5452, all 187 migrations, `DATABASE_URL` set on each command):* every DB-gated spec this round
touched passes — domain take-down 23, approver email 9, RLS policy regression 18; API take-down 15 / actor denial 7 / races 12, public page 5, photo 10,
Send ingest 34, forced pagination 6, login wall 5; jobs approver email 18, overdue watch 2, Q3 fence 2; the built-server render spec 7 (it builds into a
fresh temp `outDir` each run, so it exercised the patched source). Tests that can fail, shown: with the OLD approver selector restored 3 of the new R2 legs
FAIL (9 / 9 with the fix); with R15's exclusion removed its leg and the MP14 count leg FAIL; the record-sentence test fails when the form uses the decide
sentence; the agents' own mutation lists went red one fix at a time (admin: every fix; the flatten, the pixel check, the fifth null arm, each matrix
verdict, `hasContent`, the component's `visibilityOf` call).

*`pnpm ci:local` against that database — read this exactly:* the FIRST full run was **35 of 36**. `integration-tests` and the other 34 jobs passed;
`test (unit)` failed on 5 tests in `apps/admin/tests/helpline-claim-page.test.tsx` (Story 6.18 — a file this round does not touch or import through), each at
the 5 s default timeout, the file taking 41 s under `--concurrency=4` and 4 s alone (17 / 17). The whole admin suite alone: 80 files, 1359 tests. The
unit phase re-run by hand at `--concurrency=2`: 37 / 37 tasks successful. ⛔ That is NOT recorded as "36 / 36 on one invocation" — it is a load-timeout of the
class `project_ci_local_concurrency_oversubscription` describes, shown by isolation and a lower-concurrency re-run, not by a clean full run.

*One defect the live run found in the fix itself:* R15's first formulation dropped a request whose deceased `members` row is missing; the unchanged
overdue-watch test caught it (see R15). *Wrong or unproven reviewer claims, recorded rather than quietly dropped:* R24 (retracted — the premise was a
generalisation from four letters); R7's "Verify stays enabled while the decide is pending" (false); R4's "500 vs 503" half (false). *Disclosures:* one
agent ran one DB-gated test (`apps/jobs/tests/memorial-takedown-overdue.test.ts`) against the native dev database on :5432 because the shell exports
`DATABASE_URL` — it failed at its first `INSERT` inside an uncommitted transaction, so nothing was committed (⚠ not confirmed by a query; that database is
BigDev's); every later run used `env -u DATABASE_URL`. Another ran one pure-unit contracts test without it (no database use).

*New operator copy, for the AC14 tone-review decision (admin console, English only, plain chrome — not policy wording):* 13 keys in
`apps/admin/src/modules/memorial-takedown/i18n-en.ts` — `takedown.lookup.drivesLoading`, `.drivesError`; `takedown.open.loading`, `.error`, `.drive`, `.status`;
`takedown.script.title`; `takedown.decide.title`; `takedown.requests.received`; `takedown.stepUp.sent`, `.sendError`, `.verifyError`;
`error.record.shown_changed` — and, from the second pass, a 14th, `takedown.record.retry` ("Try again"). *Still owed, unchanged by this round:* Row 41 (b) at the landing commit; Row 41 (o)–(q); the UN-ATTESTED Hindi and device
checks; the commit / push / PR.

### Second pass — the fix round re-reviewed (2026-10-27, `bmad-code-review 11b.4a`, BigDev: "re-run code review", then "1" = one pass over the whole delta)

Scope: the UNCOMMITTED fix round against `ea28cbe8` — 50 code files (45 tracked + 5 new), 4,129 lines of diff, plus the 366-line records delta as Auditor context only. Three parallel
read-only layers (Blind Hunter on the delta alone; Edge Case Hunter with read access to the post-fix tree; Acceptance Auditor against the amended spec, the checklist and the
records), none failed. The Auditor was told to treat this file's own "APPLIED" notes as CLAIMS: of R1–R28 it found 26 CONFIRMED (R7 and R17 as the partials they say they are,
R24's retraction plausible) and ONE OVERSTATED (R4 — the storage-fault leg has no "200 first"; corrected at RR10). Every finding below was read against the working tree
before it was classified; the reviewer claims that did not hold are the ones in the Dismissed list below. Panel-routing gate applied: nothing here goes to the Panel — RR1 is BigDev's call and the Auditor's
two "possibly Panel-level" flags fail the strip-the-citations test (the first is staff-notification timing, the second is unreachable). No HIGH finding.

- [x] [Review][Decision] RR1 [LOW] — **RESOLVED A (BigDev, 2026-10-27, reply "1"): leave it; closed as ACCEPTED, no code change.** A previously ineligible approver is emailed about an old take-down whenever they next become eligible — there is no age horizon [`packages/domain/src/memorial/takedown-approver-email.ts` `pairDue`; named in the `-412` amendment] — the per-pair gate (R2) means an approver who was suspended, disabled or otherwise not eligible when their sibling was emailed, and is later reinstated, is due again; nothing bounds how old the take-down may be. It is the same re-derivation MP11 already describes for a `not_due` pair, now reachable for the whole approver set, and I wrote it into `-412` as an accepted consequence WITHOUT asking you — `-412` is your author-commit, so it is asked here. **A —** leave it: each (request, approver) pair is emailed at most once, whenever they are eligible; cost: a staff member reinstated months later gets an email about a long-closed take-down (the text names no family, no deceased, no words). **B —** add a horizon (N days from the `taken_down` outcome): a later reinstatement is not told; cost: a NEW number only you can pick, a selector + re-check change and a test, and an approver reinstated after it is never told, against MP10 (b)'s *every approver*. Recommendation A. Panel gate: NOT the Panel's — stripped of citations it is "should a reinstated staff member be emailed about an old take-down"; `-411` item 5 (an approver who has LEFT is not told) is untouched. Sources: blind, auditor. **Accepted as built:** each (request, approver) pair is emailed at most once, whenever the approver is eligible; no horizon.

- [x] [Review][Patch] RR2 [MED] The called-back attestation survives a refused record — it re-opens, at the screen, the hole R1 closed in the API (family 12; AC6, `-395` item 3) [`apps/admin/src/modules/memorial-takedown/MemorialTakedownPage.tsx:166-292`, `apps/admin/src/api/hooks.ts` `useRecordMemorialTakedownRequest`] — `calledBack` is cleared only in the record's `onSuccess`, while `onSettled` refetches the drive on a FAILURE: after a 409 `shown_changed` the form re-renders for the NEW version and the NEW nominee with "I called them back" still ticked, and one click attests a call that was never made to that person. The R1 admin test mocks an unchanged drive and never looks at the box. Verified in code. Fix: derive the tick from what it was made for — keep the (shown version, mobile) it was ticked for and treat it as unticked when either differs — and mint a fresh Idempotency-Key for that new attempt; a leg: 409 → refetch returns a new version and nominee → the box is unticked and Record is disabled until re-ticked. Sources: edge, auditor. **APPLIED.** The attestation is now a claim about what it was made for: `calledBackFor` holds `<shown version>|<mobile>` and the tick is derived from it, so a refetch that swaps either leaves the box unticked. Legs: a 409 → refetch → a new version and nominee → unticked and Record disabled (a forced submit records nothing; re-ticking is a NEW attestation carrying the new version), plus a control — a 500 that changes nothing keeps the tick. Mutation: reverting to a bare boolean fails the 409 leg. ⚠ *Corrected at RS1:* the stored tick was never CLEARED when the key changed (a swap and swap-back brought it back), and the Idempotency-Key and the first-contact time were not renewed either; the form's state now starts over on a change of scope.
- [x] [Review][Patch] RR3 [MED] The row and the Status were set to `done`, which AC18 forbids — "the row moves to `done` only after [a 36 / 36 `ci:local` on the committed tree]"; neither holds (nothing is committed; the first run was 35 / 36) — **APPLIED during triage:** Status and the sprint-status row are back to `review`, the `-27q` ledger line and the Change Log row say why. The skill's generic "all patches resolved ⇒ `done`" rule yields to the story's own AC. Source: auditor (F2); the mistake was the reviewer's.
- [x] [Review][Patch] RR4 [LOW-MED] R14's guard has holes, and its comment over-claims [`apps/api/src/modules/memorial/photo-metadata.ts:213,271`, the comment (iv) and `memorial-photo-variant.ts`] — a JPEG SOFn shorter than the 7 bytes the check reads skips it silently, and a declared width or height of 0 (a JPEG SOF; a PNG IHDR) gives a product of 0 that passes the bound; `sharp` refuses both, so the photo is stored, advertised and 404s forever — the exact failure R14 closed for big images. The comment "a photo accepted here is one the page can always serve" is also not true (the stripper never decodes: see RR20). Fix: a SOF shorter than 8, a zero dimension in a SOF or an IHDR ⇒ the existing `photo_unreadable`; make the comment say what is true; unit tests at each edge. Sources: edge, blind. **APPLIED.** A SOF shorter than 8, or a zero width or height in a SOF or an IHDR ⇒ the existing `photo_unreadable`; the comment now says it bounds the DECLARED size and never decodability (RR20). The two PNG fixtures in the stripper's unit test used a 0 × 0 IHDR — not a PNG header — and are now 1 × 1. Each guard, removed alone, fails its own test (1, 3 and 2 tests). ⚠ *Corrected at RS4:* the frame minimum is 11, not 8 (lengths 8–10 are truncated frames `sharp` refuses), and a second comment, in `memorial-photo-variant.ts`, still over-claimed.
- [x] [Review][Patch] RR5 [LOW-MED] Step-up and status state go stale [`MemorialTakedownPage.tsx` the `status` expression, the `decideWith` retry] — `stepUp.isSuccess`, `verify.isError` and the typed OTP are never reset, so when the elevation lapses and a take-down asks again the live region announces "Code sent. Enter it below." though no new code was sent and the spent OTP is still in the box; and `decide.isSuccess` is cleared only by the NEXT record's `onSuccess`, so while the next record is pending or fails the old "Recorded." is still the visible status. Fix: reset `stepUp`, `verify` and the OTP when a verify succeeds (before the retry), and `decide.reset()` when a record is submitted; legs: a second step-up prompt does not say "Code sent"; a failed record clears the old "Recorded.". Sources: blind, edge. **APPLIED.** After a verified code `stepUp`, `verify` and the OTP are reset before the retry; `decide.reset()` runs when a record is SUBMITTED (it had run only on success). Two legs (a second prompt says nothing of "Code sent" and the box is empty; a failed record clears the old "Recorded."); the `stepUp` and OTP resets, removed alone, fail them. ⚠ *Corrected at RS2:* the `verify.reset()` in the verify's `onSuccess` was inert (nothing reads `verify`'s state after a success), so the claim that EACH reset is proven was false for it; the resets now sit at the start of every decide attempt, and `verify.reset()` where a new code is requested, each with a leg.
- [x] [Review][Patch] RR6 [LOW] The R12 source test pins the three `visibilityOf` calls, not which verdict feeds which part [`apps/public/tests/family-memorial-source.test.ts`] — it checks that three strings and `planFamilyMemorial(memorial,` occur; swapping the photo verdict into `words:` (or a decoy call whose result is dropped) passes it AND `family-memorial-gating.test.ts`, which tests the pure function. Neither can fail on the one mistake the gating exists to prevent. Fix: one pattern per key — `words:\s*visibilityOf('sahyog-vivran', 'family_memorial_words', 'public').visible` and the two others. Sources: blind, auditor. **APPLIED.** One pattern per key (`words:` ← `family_memorial_words`, `photo:` ← `family_memorial_photo`, `altText:` ← `family_memorial_photo_alt_text`). Swapping the words and photo verdicts in the component FAILS this test; the pure gating test alone still passes it — the gap, shown.
- [x] [Review][Patch] RR7 [LOW] The list page is not keyed by Pariwar [`apps/admin/src/routes/MemorialTakedownRoute.tsx:41,52`] — a route change of `pariwarId` keeps `memberId`, the typed mobile and the search results, so the previous Pariwar's member names and masked mobiles stay on screen and the drives lookup queries the new Pariwar with the old member id (the route is keyed for the drive page by `poolId` only). Verified. Fix: `key={pariwarId}` on the list page and a composite key on the drive page; extend the route test. Source: edge. **APPLIED.** a `pariwarId` key on the list page and a composite `pariwarId:poolId` key on the drive page; two route legs (the typed mobile does not travel; the same pool id under another Pariwar is a different page); each key, removed alone, fails its leg.
- [x] [Review][Patch] RR8 [LOW] The record form dead-ends on "Not readable just now" [`MemorialTakedownPage.tsx` the `mobileToCallBack === null` section, `hooks.ts`] — R8 hid the form when the nominee's mobile cannot be read, and R3 turned off the passive refetch that would have recovered it, so a transient decrypt failure is cured only by reloading the browser while the 7-day clock runs. Fix: an explicit "Try again" (a refetch the operator asked for — one more read, one more audit line, which is what a read is); a test. Source: blind. **APPLIED.** A "Try again" button (new key `takedown.record.retry` — the 14th new admin copy key) refetches the drive; a leg shows the form appearing once the number can be read, and a second client read of the drive (each click is a read and so an audit line — RW1).
- [x] [Review][Patch] RR9 [LOW] `operatorScript` substitutes the name with a string `replace` [`apps/admin/src/modules/memorial-takedown/derive.ts:21`] — `$&`, `$'` or `$\`` in a decrypted name is read as a replacement pattern. Fix: a replacer function; a test with `$&` in the name. Source: blind. **APPLIED.** A replacer function; a leg with `$&`, `$'` and a backtick pattern in the name. Reverting to a string replace fails it.
- [x] [Review][Patch] RR10 [LOW] Comments and a note that say more than the code does [`apps/api/tests/integration/memorial-takedown/takedown.spec.ts:~489`, `apps/api/tests/integration/public-pages/sahyog-vivran-memorial-photo.spec.ts` header, R4's note above] — the R5 parity comment says the drive view "keeps its OWN copy of the page's reconstruct / join" (R5 removed that copy; the assertion now checks wiring, and the comment says a drift would turn it red); the photo spec's header and R4's note say each predicate leg shows "a 200 first" and the storage-fault leg does not (its second app has a separate storage instance; the one-`error`-log assertion is what keeps it honest). Fix: say what is true in all three. Sources: blind, auditor. **APPLIED.** The R5 parity comment says it checks WIRING and that the shared function's own drift is `memorial-public-text.test.ts`'s; the photo spec's header and R4's note say three legs show a 200 first and the storage-fault leg is held by its one `error` log.
- [x] [Review][Patch] RR11 [LOW] Two tests that cannot catch what their titles claim [`apps/api/tests/unit/memorial-photo-variant.test.ts`, `apps/jobs/tests/memorial-takedown-approver-emails-live.test.ts`] — "the ONE number" asserts the variant's limit equals `MEMORIAL_PHOTO_MAX_PIXELS`, so a reintroduced `50_000_000` literal also passes (pin the source: `limitInputPixels: MEMORIAL_PHOTO_MAX_PIXELS`); and the "address after `begun`" leg promises no address in "rows, alarms, logs or errors" but its `seen` collects alarms, rows and logs, never `h.errors` (verified). Fix: both. Sources: blind. **APPLIED.** `memorial-photo-variant.test.ts` pins the source (`limitInputPixels: MEMORIAL_PHOTO_MAX_PIXELS`, and no literal): a re-introduced `50_000_000` fails the pin while the old equality test still passes. ⚠ *Corrected at RS5:* the leak leg's `onError` sink is fed ONLY for a `no_target` request, so it is empty in that leg and proves nothing — the line was removed and the title no longer says "errors".
- [x] [Review][Patch] RR12 [LOW] Spec and record consistency [`MP14 (b)`, `AC10`, `AC13`, `MP8 (c)`, `MP7 (a)`, `-412` §3, `deferred-work.md`] — (a) MP14 (b) still says *"both timestamps are written in the `memorial.takedown.request_record` audit line"* and its cost clause says the audit line contains a back-dated entry; the corrected handler comment says only `first_contact_at` is inside the payload HASH and `received_at` never was (the audit entry has no free fields) — the request ROW (append-only, no UPDATE grant) holds both; amend MP14 (b) in-body and by a dated note on `-412`; (b) R15's behaviour — an erased subject's request is neither listed nor counted overdue — is in no AC (AC10 / MP14 say "every open request", AC13 covers the lookup and drive view only): amend; (c) the record-time guard is annotated only on `-412`: annotate MP8 (c) and MP7 (a) in the story body as MP10 (a) / MP11 / AC9 were; (d) `-412` §3 item 5 still says the photo route "joins `SAHYOG_VIVRAN_APPLICABLE_CONTROLS`" — it is documentation only (departure (c)): a dated note; (e) the first review's deferred-work section says "the 27 patches R2–R28" — R2–R28 is 27 numbers, one retracted. Source: auditor. **APPLIED.** MP14 (b) and its cost clause now say what the audit line holds (a hash with `first_contact_at` in it; both timestamps on the append-only row); AC10 and AC13 state R15's rule, including why a missing member row is not read as erased there while `isDeceasedErased` fails closed; MP8 (c) and MP7 (a) carry the record-time guard in the body; `-412` has dated notes 3 and 4 and an amended §3 item 5 ("in writing only"). The deferred-work wording was fixed with the second-pass section.
- [x] [Review][Patch] RR13 [LOW] Records the Fix round claims but the story does not carry [`## Dev Agent Record` File List and Completion Notes, `friction-budget.md`] — the File List does not name the five new files (they sit only in the Fix-round paragraph); and AC15 asks for the page's added HTML + CSS weight to be recorded and disposed in the friction record before `friction:check`, while the measurement (6,655 B with no memorial; +536 B words only, +633 B photo only, +926 B both; the static page weight unchanged at 11,471 B, 0 JS) sits only in R27's note. Fix: the File List, a Completion Note, and one sentence in the Story 11b.4a friction disposition; run `friction:test` and `friction:check` after. Source: auditor. **APPLIED.** The File List names the 5 new files and the 4 existing 11b.4 files the round touched for the first time (computed from `git diff`, not remembered); the AC15 measurement is in the Story 11b.4a friction disposition in `friction-budget.md`; `friction:test` and `friction:check` pass.

- [x] [Review][Defer] RR14 `memberDrives` (the member lookup's drives) is unclamped — its `DISTINCT ON` orders by pool id, so a LIMIT would cut by id, not age [`packages/domain/src/memorial/takedown.ts`] — deferred: bounded by the member's pools that carry a shown memorial; N+1 reads inside the loop. Source: auditor.
- [x] [Review][Defer] RR15 The forced-pagination guard cannot see named arrays (`{requests}`, `{drives}`, and 57 other `{name: []}` GET bodies) [`apps/api/tests/integration/forced-pagination.spec.ts`] — deferred, pre-existing: widening it would flag dozens of unrelated routes. Source: edge, auditor.
- [x] [Review][Defer] RR16 The open-request list truncates silently at 200, with no indicator in the response or the screen — while R15's own rationale is that a list that under-counts "reads as nothing is open" [`packages/domain/src/memorial/takedown.ts` `OPEN_REQUESTS_LIMIT`] — deferred: one open request per drive keeps a Pariwar far below it, and the overdue watch counts every request, unclamped. Source: blind, auditor.
- [x] [Review][Defer] RR17 The step-up prompt unmounts while the retried take-down runs (R7's residual) [`MemorialTakedownPage.tsx` `needsStepUp`] — deferred: cosmetic; the retry result still lands in the status region. Source: admin agent, auditor.
- [x] [Review][Defer] RR18 Focus falls to the page body when the record form or the decide section unmounts after a record or a decision (family 13) [`MemorialTakedownPage.tsx`] — deferred, pre-existing in the design: the new status region announces the result but does not move focus. Source: auditor.
- [x] [Review][Defer] RR19 The unreadable-name fallback reads *"…the current nominee, Not readable just now, who is not the person who asked."* — a capitalised label in the middle of a sentence [`apps/admin/src/modules/memorial-takedown/derive.ts`, `i18n-en.ts`] — deferred: a dedicated sentence is new operator copy and AC14's approval is yours. Source: blind, auditor.
- [x] [Review][Defer] RR20 A photo the stripper accepts but `sharp` refuses (corrupt entropy data, a frame it decodes to nothing) is stored, advertised and 404s forever — the stripper checks structure and now size, never decodability [`apps/api/src/modules/memorial/photo-metadata.ts`] — deferred: nothing is live before Row 41; a decode check at Send is the remedy. Source: blind.
- [x] [Review][Defer] RR21 An upper-case `shownSubmissionId` from a non-UI client gets a false 409 `shown_changed` — the contract accepts any-case UUIDs and the domain compares with `!==` [`packages/contracts/src/memorial/takedown.ts`] — deferred: it fails SAFE, and the only client echoes the server's own lower-case value. Source: blind.

Dismissed (8 — nine with RR1, closed as accepted, which is the count the Change Log and the ledger give): "two different erased predicates" (both read `members.state = 'anonymized'`; only the missing-row handling differs, and that is deliberate and documented); the signed-URL equality test "may not test the TTL" (the in-memory fake embeds `?ttl=`); the GPS absence assertion "has no positive control" (the input is built from `APP1_EXIF`, which carries a `GPS-` string); the record window check running inside the idempotency claim reusing a key after a 400 (`withIdempotency` releases the key when `run()` throws; the Auditor traced it); the photo route's storage fault answering a cacheable empty 404 and its SEARCH tier being "documentation only" (both as AC4 and departure (c) specify); the typed schema's CHECKs "with no migration" (0187 already has them — the typed model was the omission); an all-words-left-out memorial being silently not shown (unreachable: `omissions.ts` refuses a decision that leaves the body blank, `nothing_left`); the process note that "governance first" cannot be shown in one uncommitted tree (not a defect — an instruction for the commit step: split the commits, `-412` and the ADR first).

**Second-pass fix round — 2026-10-27 (BigDev: RR1 = A, "1"; then "1" = apply every patch).** RR1 accepted as built (recorded in `-412` as ACCEPTED); RR2 and RR4–RR13 applied
(RR3 was applied during triage); no agents this time — the pieces share one page. *Verification.* Mutation checks, one fix at a time, each restored and compared: the bare-boolean
mutant fails RR2's 409 leg; each of the three RR4 guards fails its own tests (1, 3 and 2); each RR5 reset fails its leg; swapping the words and photo verdicts fails RR6's
pattern while the pure gating test alone still passes (the gap, shown); each RR7 key, the RR8 button, RR9's replacer and RR11's source pin fail theirs. `turbo run lint typecheck`:
40 / 40 tasks green. The unit phase (`turbo run test --concurrency=2`): 37 / 37 tasks — admin 1,367, api 750, domain 3,056, jobs 1,132, contracts 1,583, public 776 tests passed.
Live specs on a fresh `twt_dev` (container on :5452, 187 migrations, `DATABASE_URL` set per command): jobs approver 18 / 18 (with the leak leg now collecting the error sink)
and overdue 2 / 2; Send ingest 34 / 34 (RR4's wiring); take-down API 15 / 7 / 12; photo 10; page 5; domain take-down 23 and approver email 9. The record gates (`friction:test`
and `friction:check`, governance-boundary, custom-field, schema, benefit, microcopy, domain-invariants, the financial-truth scan) and the OpenAPI determinism check pass.
⛔ The full `pnpm ci:local` was NOT re-run after this pass: its last run (35 / 36, above) predates RR2–RR13. AC18 therefore stays open — a 36 / 36 on the COMMITTED tree — and the
Status stays `review`. *One thing found while fixing:* the stripper's unit tests built their PNGs from a 0 × 0 IHDR, which is not a PNG header; RR4's zero-dimension rule exposed
it and the fixtures are now 1 × 1. ⛔ Nothing was committed when this was written; it was then committed in three commits — `-412` and ADR-0043 first (AC0), then the code, then these records (Change Log, v1.4).

### Third pass — the second fix round re-reviewed (2026-10-27, `bmad-code-review 11b.4a`, BigDev: "2" = re-run, then "1" = all three layers)

Scope: the second fix round ALONE — 13 code files, 527 lines of diff, taken against a rebuilt snapshot of the tree at the start of the second pass (`ea28cbe8` + the saved pass-2
patch; the other 37 files compared byte-identical, which is how the snapshot was checked). Three parallel read-only layers, none failed. The Auditor checked RR1–RR21 and the fix-round
paragraph, and recomputed what the repo allows: 52 tracked files modified + 5 new (50 code = 45 + 5), 14 new admin copy keys (60 → 74, none removed), and no remaining "`done`" claim that
contradicts AC18. Of the second-pass notes it found most CONFIRMED and six OVERSTATED (RS6); it found no AC violation and no blocker. Checked against the code before classifying, with
`sharp` itself where the claim was about `sharp`: a zero-width or zero-height JPEG is refused ("Empty JPEG image (DNL not supported)") and so is a length-9 frame ("Bogus marker
length") — RR4's rejections are backed, and the frame minimum should be 11. Panel-routing gate applied: nothing here goes to the Panel. No HIGH finding; **no decision is needed**.

- [x] [Review][Patch] RS1 [MED] The record form's per-attempt state outlives the scope it was entered in — four faces of one cause [`apps/admin/src/modules/memorial-takedown/MemorialTakedownPage.tsx`: `calledBackFor`, `firstContact`, `recordKey`] — RR2 derived the tick from a `(version|mobile)` key but never CLEARS the stored value when the key changes, and the form's other per-attempt state is reset only in the record's `onSuccess`. (a) **Swap and swap-back:** tick for A, a refetch shows B (unticked), a later refetch shows A again ⇒ the box is silently ticked with no new attestation — also when the key goes null (an unreadable-mobile window) and returns; this contradicts RR2's own comment. (b) **A pre-ticked form returns:** an open request appears (a 409 `request_open`, or a response lost after a commit) and is later decided — the key never changed — and the form comes back ticked, with the old error. (c) **A stale Idempotency-Key:** a record that commits server-side while the client sees an error leaves the old key in `recordKey`; after that request is decided and the form returns, a NEW call-back goes out under the OLD key and the server replays the stored 201 for the OLD request for up to 24 h — the new request is silently never recorded. (d) **`firstContact`** — the time the 7-day clock starts from — survives a swap: after `shown_changed` the new tick sits beside the previous call's time. Verified by reading: the only resets are in the record's `onSuccess`. Fix: one scope, `<version>|<mobile>|<number of requests>`, held in state; when it differs from the one held, reset in render (React's derive-state pattern) the tick, `firstContact` to now, `recordKey` to a fresh key, and the record mutation (its stale error). Legs for (a), (b), (c), (d); each reset, removed alone, must fail its leg. Sources: blind, edge. **APPLIED.** The form's tick, first-contact time and Idempotency-Key start over whenever the scope `<version>|<mobile>|<request count>` changes (an effect, so nothing is lagged behind a render); a record's stale REFUSAL is cleared only when the request count changes — not on a version swap, where the operator must still read why the form changed, and not after a success, where "Request recorded." must outlive the refetch (a first draft cleared the record unconditionally and would have wiped both; caught before it was written). Four legs — swap and swap-back, an open request decided elsewhere, a lost-answer record then a new call-back under a NEW key, and the first-contact time across a change of nominee. Each reset, removed alone, fails its leg.
- [x] [Review][Patch] RS2 [LOW-MED] More stale UI state across attempts [`MemorialTakedownPage.tsx` `decideWith`, the step-up block, `confirming`] — (a) a step-up prompt left unverified (the operator clicks kept) keeps its "Code sent", the old code and the old verify error when a take-down asks again; (b) a wrong code's alert survives "Send me a code"; (c) `record.isSuccess` keeps the status saying "Request recorded." beside a pending or failed decision; (d) `confirming` stays true after kept / superseded, so "Confirm: take it down" appears pre-armed on the next request (pre-existing in the build). Also: `verify.reset()` in the verify's `onSuccess` (RR5) is inert — the page reads only `verify.isPending` and `verify.isError`, both already false after a success. Fix: at the start of every decide attempt reset `stepUp`, `verify`, the OTP, `record` and `confirming`; `verify.reset()` when a new code is requested (that is the stale it can really clear). A leg each. Sources: edge, auditor, blind. **APPLIED.** Every decide attempt starts by resetting `stepUp`, `verify`, the OTP and `record`; `verify.reset()` also runs when a new code is requested (the stale it can really clear); the confirm step disarms when a decision SUCCEEDS. A first draft also disarmed it at the start of every non-take-down attempt — a mutant showed no test could tell, because the success path already covers it, so that line was removed rather than kept untested. Four legs (a second prompt after an abandoned one; a wrong code's alert; "Request recorded." beside a failed decision; the confirm step after kept and after a successful take-down); each reset, removed alone, fails its leg.
- [x] [Review][Patch] RS3 [LOW-MED] "Try again" can make things worse, and can never help in one case [`MemorialTakedownPage.tsx` the page guard `drive.isError || !drive.data` and the unavailable section] — (a) a refetch that FAILS sets `isError` while the previous data is retained, so the guard replaces the WHOLE page with a dead-end alert that has no retry — RR8 made that reachable on demand; (b) the button also shows when `nomineeToCallBack` is null (the nominee row is gone — permanent), where no retry can succeed. Fix: the error replaces the page only when there is no data; with data, keep the page and show an inline `role="alert"` ("Could not load this drive. Please reload."); the button only when a nominee exists. Legs: a failing retry keeps the page and the button; no nominee, no button. Sources: edge, auditor, blind. **APPLIED.** The page is replaced by an error only when there is NO data; with data in hand a failed refresh keeps the page and adds an inline alert (`takedown.drive.error` — no new copy). "Try again" is offered only when a nominee exists. Two legs; restoring the old guard, or removing the condition, fails them.
- [x] [Review][Patch] RS4 [LOW] The SOF guard is looser than its comment, and one comment still over-claims [`apps/api/src/modules/memorial/photo-metadata.ts:215-221`, `apps/api/src/modules/public-pages/memorial-photo-variant.ts:13`] — a valid frame is at least 11 bytes (length 2 + precision + height + width + Nf + one 3-byte component); the comment's "8 or more" counts no component at all, so lengths 8–10 and an Nf of 0 pass `length < 8` and are truncated frames (VERIFIED: `sharp` refuses a length-9 frame, "Bogus marker length"). And `memorial-photo-variant.ts:13` still says *"a photo the Send accepted is one this route can decode"* — the over-claim RR4 named; the file is not in the round's diff. Fix: `length < 11` or Nf = 0 ⇒ `photo_unreadable`; the arithmetic in the comment; line 13 says what is true (the size is bounded; decodability is RR20); rows at lengths 8, 9, 10 and Nf = 0. Sources: edge, blind, auditor. **APPLIED.** A SOF shorter than 11, or with a component count of 0, ⇒ `photo_unreadable`; the comment's arithmetic is right and cites the `sharp` check; the `memorial-photo-variant.ts` comment no longer says a photo the Send accepted can always be decoded. Five rows (7, 8, 9, 10 bytes; 11 with Nf 0) plus a control that the smallest valid frame is still accepted; lowering the minimum back to 8 fails three rows, dropping the component check fails one.
- [x] [Review][Patch] RS5 [LOW] Tests that cannot fail, or protect less than their notes say [`apps/admin/tests/memorial-takedown.test.tsx`, `apps/jobs/tests/memorial-takedown-approver-emails-live.test.ts`, `apps/public/tests/family-memorial-source.test.ts`] — (a) RR2's "not even a forced submit records anything" assertion is synchronous: TanStack's `mutate` reaches `mutationFn` after a microtask, so a call made by the submit is not counted yet; (b) the RR2 control waits only for the refetch to START (`toHaveBeenCalledTimes(2)`), so "still ticked" can pass mid-flight; (c) the leak leg collects `h.errors`, but `onError` is fed ONLY by the `no_target` branch (`memorial-takedown-approver-emails.ts:266`), so in a leg with an eligible approver it is always empty — the title's "errors" is unbacked (verified); (d) RR6's patterns match any object literal in the file, not the one passed to `planFamilyMemorial(...)`. Fix: (a) flush before asserting, and show it fails with the `calledBack` guard removed; (b) await the refetch's promise inside `act`; (c) drop the vacuous line and the word from the title — the sink is the no-target alarm channel; (d) scope the patterns to that call's argument object. Sources: blind, auditor. **APPLIED.** (a) the forced-submit assertion is flushed first and fails with the `calledBack` guard removed (2 tests); (b) the control awaits the refetch's promise inside `act`; (c) the leak leg no longer collects the empty sink and its title no longer says "errors"; (d) the source patterns are scoped to the object passed to `planFamilyMemorial(...)` — a swap beside a CORRECT decoy literal is still caught.
- [x] [Review][Patch] RS6 [LOW] Second-pass records that say more than is true, or disagree [the story's Second pass section, `apps/api/src/modules/memorial-takedown/handlers.ts:314`, Task 5.3] — (a) RR5's note says "each reset, removed alone, fails them" (false for `verify.reset()`, RS2), RR8's says "a second read in the audit trail" (the leg asserts a second client call), RR11's says the leak leg now covers errors (RS5 (c)), RR2's omits that the Idempotency-Key was not rotated, RR4's says the comment is fixed (one of two sites, RS4); (b) the Dev Agent Record's "Measured (AC15)" line (~:1161) lacks the dynamic-HTML figures, which sit only in R27's note and `friction-budget.md`; (c) counts disagree — the header says "five reviewer claims did not hold", the list says "Dismissed (8)", the Change Log and the ledger say 9 (8 listed + RR1 closed as accepted); (d) stale cross-references: `handlers.ts:314` cites MP14 (b)'s deleted "written in the audit line", and Task 5.3 still says the photo route "JOINS `SAHYOG_VIVRAN_APPLICABLE_CONTROLS`" unqualified. Sources: auditor. **APPLIED.** The overstated notes carry dated corrections (RR2, RR4, RR5, RR8, RR11); the Dev Agent Record's "Measured (AC15)" line has the dynamic-HTML figures; the counts are reconciled (8 listed, 9 with RR1); `handlers.ts` no longer cites MP14 (b)'s deleted sentence and Task 5.3 says "in writing only".

- [x] [Review][Defer] RW1 "Try again": the retry's outcome is not announced, focus falls to the body when the unavailable panel unmounts on success, and every click is a real read and an audit line (no cooldown) [`MemorialTakedownPage.tsx`] — deferred: joins RR18 (Story 11b.8's audit); each click is the operator's own act, which is what an audit line records. Sources: auditor, blind.

Dismissed (10): the Idempotency-Key "not rotated after a 409" (the server releases a key when the run throws — traced in pass 2; RS1 rotates it anyway, for the commit-then-error case that is the real hazard); "the checkbox can never be ticked when the key is null" (the form renders only with a version AND a mobile, so the key exists whenever the form does); "other fixtures may now be rejected" (the stripper's own fixtures were the only zero-dimension ones, `_fixture.ts`'s SOF0 is 1 × 1 and 11 bytes long, and the integration specs pass); a "duplicate `const unreadable`" (two describe scopes — the file compiles and its suite is green); `decide.reset()` at submit "detaching a pending decide" (the record form shows only when no request is open, and a decision needs an open one); "the first RR7 test may pass without the key" (it fails when the key is removed — mutation-checked); "a JPEG height of 0 is legal" (not to `sharp` — verified above); "other `.replace` interpolation sites" (there is one in the module); "the storage-fault leg is weak" (it asserts the message *memorial photo read failed*, which the `sharp` path does not write); "the RR5 `waitFor` can pass in the in-between state" (while the second decide is pending its error is cleared, so the prompt is unmounted and `getByTestId('takedown-step-up')` throws until the second refusal re-mounts it — and removing the resets fails it).

**Third-pass fix round — 2026-10-27 (BigDev: "1" = apply every patch).** RS1–RS6 applied directly, no agents. *What the work found about itself:* two of the first mutants were NOT caught — RS1 (b)'s leg was
masked by another reset, and RS2 (d) covered only the "kept" path — so both legs were rewritten to reach the paths they claim to; one line was removed because no test could tell it from its absence; and a first
draft of RS1 that reset the record mutation unconditionally would have wiped both the "changed while you were on the call" refusal and the "Request recorded." status (found while designing it, before it was
written). *Verification.* Mutation checks, one change at a time, each restored and compared: 12 page mutants all red (after the rewrites); both halves of RS4's guard; the scoped source patterns against a
swap beside a correct decoy literal. `turbo run lint typecheck`: 40 / 40 tasks green. The unit phase at `--concurrency=2`: 37 / 37 — admin 1,378, api 755, domain 3,056, jobs 1,132, contracts 1,583, public 776
tests passed. Live specs on a fresh `twt_dev` (:5452, 187 migrations): jobs approver 18 / 18 and overdue 2 / 2; Send ingest 34 / 34 (RS4's wiring); take-down API 15 / 7 / 12; photo 10. The record gates, the
financial-truth scan and the OpenAPI determinism check pass. Files: 52 modified and 5 new — unchanged by this round; no new copy key (RS3 reuses `takedown.drive.error`), so the count stays 14.
⛔ The full `pnpm ci:local` was NOT re-run after this round; AC18 stays open (36 / 36 on the COMMITTED tree), the Status stays `review`, and nothing was committed when this was written; it was then committed in three commits — `-412` and
ADR-0043 first (AC0), then the code, then these records (Change Log, v1.4).