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

Status: in-progress

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
cannot be verified ⇒ PQ1's ground. ⭐ **Not a new disclosure to the role:** `helpline_operator` already holds `claim.view_nominee_name_check`, which reads every
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
against one version is ⛔ not a request about another.
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
(cross-tenant selector on the service pool, as 6.25) **derives** the due pairs itself, from each `taken_down` outcome whose request
holds ⛔ no outbox row at all: one `(request, approver)` pair per **eligible** approver, else — when ⛔ none is eligible —
`(request, NULL)` (6.25's claim-level pair). **The recipients — MP10 (b), ANSWERED by BigDev 2026-10-27 (*"email every
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
request holding any outbox row is ⛔ never due again (so ⛔ no late email beside a `no_target`). ⛔ No fallback recipient.
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
received_at - interval '7 days'`; both timestamps are written in the `memorial.takedown.request_record` audit line and shown on
the drive screen. **Why:** it MATCHES item 4's reading (as `-395` narrowed "the family" to the nominee), and recording late does
⛔ not shorten the family's 7 days. ⚠ **Cost:** `first_contact_at` is operator-entered, ⛔ not DB-stamped — it can be mistyped or
back-dated within the bound; the bound, the audit line and the on-screen display contain it.
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
alt text decrypts to the sentinel, or a decrypt fails with a bad envelope — ⚠ ⛔ never keyed on the HEAD's state: `[A-omit, pending]` is `with_the_trust` at the head
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
(Idempotency-Key; body `{ calledBack: true, firstContactAt }` — `calledBack: false`, or a `firstContactAt` in the future or more
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
holding any outbox row is ⛔ never due again; it sends MP10's text through the existing staff-email port,
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
Pariwar) and is silent at zero (a sweep spec — Task 8.3).

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
**And** the take-down lookup and drive view ⛔ never show an erased memorial (AC6) — an AC13 leg in `takedown.spec.ts` **And** the
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
  - [x] 4.2 Take-down DTOs (`packages/contracts/src/memorial/takedown.ts`): member drives, drive view, open-request list (with derived `overdue`), request input `{ calledBack: z.literal(true), firstContactAt: <ISO timestamp> }` (MP14 (b)), outcome input `{ outcome: 'taken_down' | 'kept' | 'superseded' }`, error codes (`memorial_takedown.not_found`, `.request_open`, `.already_decided`, `.shown_changed`, `.shown_unchanged`); `MEMORIAL_TAKEDOWN_STEP_UP_CONTEXT`.
  - [x] 4.3 Matrix YAML (each id with its `tier1_public_exception` block) + `RULED_TIER1_PUBLIC_EXCEPTIONS` (+3: words + photo citing `2026-10-23-391` item 2, alt text citing `2026-10-27-411` item 6) — **same commit**, with `public-pages.test.ts`'s identity array (six → nine); register the take-down paths in `packages/contracts/scripts/emit-openapi.ts` and regenerate `openapi/v1.yaml` (`pnpm contracts:emit-openapi`; `pnpm contracts:check-openapi-determinism`).
  - **Done when:** contracts tests pass; removing one exception pair turns the matrix parse RED.
- [x] **Task 5 — The public API (AC1, AC4, AC5, AC13)**
  - [x] 5.1 `apps/api` dependencies: `@twt/ui` to `dependencies`; `sharp@0.34.5` (MP5; `@img/sharp-linuxmusl-x64` is already locked).
  - [x] 5.2 `public-pages/handlers.ts` (`sahyogVivran`): after the drive read, `readPublicMemorial` → decrypt body + alt (`withKmsOutageClassification`) → sentinel check (Trap 4) → `reconstructMemorial` → `joinKeptSegments` (MP3 (b): keep text segments, isolate each, join; new `memorial-public-text.ts` + its unit test) → `familyMemorial`; behind MP13.
  - [x] 5.3 New route `…/sahyog-vivran/:driveToken/memorial-photo` in `public-pages/routes.ts` (same `limits.search` rate limit, same kill switch, the in-handler empty 404 for every refusal — Trap 9; the narrow read — Trap 19, ⛔ never the page handler's flow, ⛔ no appeal-reversal audit); `getBytes` on the port + three adapters (GCS catches `download()`'s 404 ⇒ `null`); the MP5 transform in `apps/api/src/modules/public-pages/memorial-photo-variant.ts`; the route joins `PUBLIC_ALLOWLIST` in `apps/api/tests/integration/login-wall.spec.ts` with its written defence; it JOINS `SAHYOG_VIVRAN_APPLICABLE_CONTROLS` (`sahyog-vivran-controls.ts`) — Question 8, answered.
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
- [ ] **Task 7 — Take-down API (AC6, AC7, AC12, AC13)**
  - [ ] 7.1 `memorial.takedown` key (`permissions.ts`, catalog 54 / 70; `permissions.test.ts`), grant (`roles.ts`; `roles.test.ts`); step-up context `memorial_takedown` (the contracts constant, 4.2).
  - [ ] 7.2 `apps/api/src/modules/memorial-takedown/{index,routes,handlers}.ts`, registered in `apps/api/src/server.ts` (beside `registerMemorialReviewModule`). Routes (all under `/api/v1/p/:pariwarId`, key `memorial.takedown`; idempotent writes via `idempotency.createKeyedStore(deps.pool)` per [[project_idempotent_write_handler_shape]] (COMMIT then record); 23505 inside a SAVEPOINT ([[project_domain_limit_clamp_and_savepoint_retry]])):

    | Method + path | Step-up | Audit | Errors |
    |---|---|---|---|
    | `GET /memorial-takedowns/members/:memberId/drives` | — | — | — (empty list) |
    | `GET /memorial-takedowns/drives/:poolId` | — | `memorial.takedown.read` (nominee decrypt) | `404 memorial_takedown.not_found` (incl. erased) |
    | `GET /memorial-takedowns/requests?open=true` | — | — | — |
    | `POST /memorial-takedowns/drives/:poolId/requests` | — | `memorial.takedown.request_record` (`withCompensatingAudit`) | `400` (`calledBack` ≠ true; `firstContactAt` in the future or > 7 days ago), `404 …not_found`, `409 …request_open` |
    | `POST /memorial-takedowns/requests/:requestId/outcome` | `memorial_takedown` for `taken_down` only | `memorial.takedown.decide` | `404 …not_found`, `409 …already_decided`, `409 …shown_changed`, `409 …shown_unchanged` |
  - [ ] 7.3 Specs `apps/api/tests/integration/memorial-takedown/{takedown,actor-denial,races}.spec.ts`: `takedown.spec.ts` (AC6/AC7 legs, AC8 member GET `taken_down` + Send-after leg, AC13 erased-memorial leg, the late-outcome leg); `actor-denial.spec.ts` (`trustee_panel`, `pariwar_admin`, a member token); `races.spec.ts` (take-down × Send, × family Withdraw, × review decision, × Trust withdraw-approval; two concurrent request records). Audit-sink union gains `memorial.takedown.read`.
  - **Done when:** the three specs pass; a mutant that withdraws only the shown version turns `[A-omit, A]` RED (Trap 1); one without the lock turns a race leg RED.
- [ ] **Task 8 — Jobs (AC9, AC10) — ⛔ never started before ADR-0043 (Task 1.2) is committed**
  - [ ] 8.1 `packages/domain/src/memorial/takedown-approver-email-read.ts` (or extend `staff-email-identity-read.ts`, per ADR-0043's text): Q3 eligibility; Q2 reused.
  - [ ] 8.2 `apps/jobs/src/scheduler/memorial-takedown-approver-emails.ts` (mirror the 6.25 sweep: the service-pool selector derives `(request, approver)` or `(request, NULL)` for each `taken_down` request with ⛔ no outbox row → one child per pair, `retryLimit: CHILD_RETRY_LIMIT`; a recipient child inserts `attempting` or nothing (`not_due`), the NULL child inserts `no_target` — MP10/MP11) + `memorial-takedown-overdue.ts` (`boss.schedule(cron, { tz })`, daily); register both in `apps/jobs/src/boot.ts` (beside `registerClaimSuspicionStaffEmailWorkers`); own pool if it needs tx + audit ([[project_jobs_pool_two_connection_starvation]]).
  - [ ] 8.3 Fence test allow-lists widened with `ADR-0043` comments, and its projection rules extended to Q3's module (AC9); sweep specs — approver email: eligible, `no_target` (approver ineligible at selection ⇒ one NULL-recipient row + the error log; the request is then never re-derived), fresh-pair re-check fails ⇒ ⛔ no row, claimed-then-ineligible ⇒ `error`, transient, held, idempotent re-run; overdue: one `warn` per Pariwar with ≥ 1, ⛔ no ids beyond the Pariwar, silent at zero.
  - **Done when:** the fence and both sweep specs pass; moving Q3 into an un-named module turns the fence RED.
- [ ] **Task 9 — Family + admin surfaces (AC8, AC11, AC12, AC14)**
  - [ ] 9.1 Mobile: the `taken_down` copy (landed in 3.0) — render test with real `t()` (en + hi); the reworded `outcome.approved_with_omissions` (en + hi, Question 10's wording; AC8) with its render test; `memorial-source-pins.test.ts` if it enumerates states. (`memorial-copy.ts` holds Send refusals only.)
  - [ ] 9.2 Admin: `apps/admin/src/modules/memorial-takedown/*`; routes in `apps/admin/src/router.tsx` + `apps/admin/src/routes/MemorialTakedownRoute.tsx`; `RootLayout.tsx` link when `pariwarId` is set (⛔ not key-gated — AC11); `apps/admin/src/api/{client,hooks}.ts` (the step-up OTP caller imports `MEMORIAL_TAKEDOWN_STEP_UP_CONTEXT`); the drive screen's script by branch, the current-nominee line, *"decided after the due date"*; the review detail line *"Taken down at the nominee's request · {time}"* (AC12). Tests: the script renders before the button in both branches, a 403 renders the no-access state, the review detail line renders for a `helpline` row.
  - [ ] 9.3 i18n catalogs (namespaces already registered — ⛔ no `catalog.ts` change), `microcopy.yaml` lists, tone-review rows (UN-ATTESTED).
  - **Done when:** the mobile render test and the admin tests pass; a two-way ternary mutant turns the review-detail test RED.
- [ ] **Task 10 — Budgets (AC15)** — measure, record, commit the friction disposition; then `pnpm friction:check`.
- [ ] **Task 11 — Records (AC16, AC19)**
  - [ ] 11.1 `deferred-work.md`: AC16 items (1)–(16) as a new `11b.4a` section; the discharge annotations of AC16 at every reference site.
  - [ ] 11.2 Row 41: (b) met by the landing commit (dated); (l)–(q) added ((m) recorded as met by `-411`); (j) annotated; ((e) was annotated MET on 2026-10-27 with `-411`'s records).
  - [ ] 11.3 Story: Completion Notes, File List, Change Log.
  - [ ] 11.4 Architecture §4.11.2 dated annotation (MP5's single variant behind a proxied plain `<img>`, ⛔ not the Astro Image component; the ADR still owed).
- [ ] **Task 12 — Verify and close (AC17, AC18)** — AC17's `git diff` check (empty); commit; `pnpm ci:local` 36 / 36 on a fresh `twt_dev` in its own container; only then `review` → (after code review) `done`.

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

### Debug Log References

### Completion Notes List
- Ultimate context engine analysis completed — comprehensive developer guide created (2026-10-27, `bmad-create-story 11b.4a`, four read-only research agents at `bab88287`).
- Re-validated 2026-10-27 at `4e57fa42` (`bmad-create-story validate 11b.4a`, four read-only verifiers: code claims, governance, design reachability, internal consistency); 40 findings, BigDev "all" — see v0.4.

### File List

---

## Change Log

| Date | Version | Change |
|---|---|---|
| 2026-10-27 | v0.8 | BigDev approved Question 10 as proposed (*"approve Question 10 as proposed"*): the reworded `outcome.approved_with_omissions` (en + hi) is in AC14's approved copy; AC8 points at it; the Hindi carries an UN-ATTESTED tone-review row like the rest. All Task 0.2 questions are answered ⇒ `bmad-dev-story 11b.4a` may start at Task 1 (`-412`, ADR-0043). |
| 2026-10-27 | v0.7 | ⚖️ **The Panel ruled** (DR + KB, relayed by BigDev): *"PQ1 - A / PQ2 - A / PC1 - B / PC2 - A / PC3 - A / PC4 - A / PC5 -A"* — transcribed as `2026-10-27-411` (Trustee-ratified, committed alone, `2cf8127e`); this story's own author-commit is RENUMBERED `-412` (every body reference; the Change Log rows above keep `-411` as written). **PC1 B reverses MP3 (a):** the public page carries ⛔ no marker — the API keeps the text segments, isolates each, and joins them (`joinKeptSegments`, the join rule ours); the wire is `{ words: string[], photo: { altText: string } | null }`; `apps/public` no longer needs `@twt/ui` (Trap 16); Traps 3/5/8, AC2/AC3, Tasks 4.1/5.2/6.1/6.2/6.5 rewritten; the alt text cites `-411` item 6; Trap 17 cites `-411` item 7. The family outcome line `outcome.approved_with_omissions` becomes inaccurate ⇒ AC8 / Task 9.1 / Question 10 (wording owed by BigDev). AC16 (1)–(3) RULED; (17) added (permission text vs unmarked joins, to counsel). Row 41 (e) MET; AC19 (m) met. Question 9 answered (sent). |
| 2026-10-27 | v0.6 | BigDev answered Questions 2–8: *"all as recommended"* — copy approved (MP10 email, AC14 heading, `outcome.taken_down`, operator script); MP7 nominee mobile on the take-down screen; PC5 / PC4 built as recommended and asked; Trap 7 departure and MP8 (b) narrowing accepted; the photo route joins `SAHYOG_VIVRAN_APPLICABLE_CONTROLS`. Question 9 (when to send the note) had ⛔ no recommendation and stays open with BigDev. The routing note's header updated (Questions 4/5/7 settled ⇒ PC5/PC4/PC2 final). Task 0.2 is complete for the build ⇒ Task 1 may start. |
| 2026-10-27 | v0.5 | BigDev answered Question 1: *"MP1-MP13 as recommended, email every approver."*; asked why MP14 (b) was not recommended (it MATCHES `-392` item 4; v0.4 had labelled (a) a departure but kept its star — a miss, stated to BigDev); then *"yes, go with option (b) for MP14, prepare the routing note"*. Recorded: MP10 (b) (every approver of every withdrawn approval — our reading of "the approver"); MP14 (b) (`first_contact_at` + bounds + `due_at = first_contact_at + 7 days`; threaded into Task 2.2, AC6, Task 4.2, the route table, Named identifiers); G6/PC3 lose the clock question. The routing note is DRAFTED (Task 1.3) — `trustee-panel-routing-note-2026-10-27-11b4a-family-memorial-public-render.md`: T1, PQ1 (recommends B — the current nominee when the original has died or been replaced), PQ2 (recommends A — the 2026-10-23 note already stated no page names the member), PC1–PC5; ⛔ not sent; its E4 commands run (two patterns fixed for bold markup). Questions 2–9 open. |
| 2026-10-27 | v0.4 | Re-validated at `4e57fa42` after the rebase (four read-only verifiers; 40 findings, BigDev "all"; each HIGH re-checked by hand against code or log). Header re-pinned (STOP 1/2 fired on the TalkBack landing and disposed; ledger next `-27k`; `dacbf424` → `598a321d`). Governance: T1 added (`-395` item 3 answers `-393`'s open "who may ask" with what (ii) did not choose — Row 41 (e) needs item 3 itself shown); PC4 (alt text) and PC5 (the member-sees-more floor) added; MP14 named a departure from `-392` item 4; MP8 split by chain shape, the clean-approved case named a narrowing in part of `-393` M4; `-107` cl.1b quoted verbatim and re-scoped ("departs from the 10.21 pattern"; 6.9 D7 cited); G5/MP9 re-cited to 11b.4 MA13 + `-392` Not covered; Policy meaning corrected (consequence sentence: a current nominee can replace an `approved_with_omissions` memorial; predicate 3 added; Niyamavali §6.5 / Part 10 quoted; the E2 record cited, ⛔ not `-391`/`-393`). Design: MP10/MP11 now copy `0152`'s CHECKs unchanged (v0.2's "true mirror" with a per-recipient `no_target` could ⛔ not be built; `retries: 0` was false — the limit is 4; rows are born in the child's claim) and email ONE approver; MP8 (c) + `superseded` + `409 shown_changed` define the request→outcome window; Trap 18 (state is head-derived; a chain-level `deriveMemorialChainState`); Trap 19 (the photo route's narrow read — ⛔ no appeal-reversal audit); Trap 16 (`@twt/ui` needs `vite.ssr.noExternal`; the API runtime image is a placeholder on `node:22-alpine`); ⛔ no edge cache / Traefik route ⇒ Row 41 (p), (q); Trap 9's header exclusions and in-handler 404; erased memorials hidden from the take-down screens; AC11 link ⛔ not key-gated. Code: Trap 5 rewritten (seven pin sites; `isSahyogVivranResponse` passes unknown keys and returns early on a null `appealReversal`); Trap 17 mechanics (`PUBLIC_DETAIL_FIELD_IDS` spread; an exclusion block, ⛔ not the GAP form); `getBytes` null departs from the claim precedent; matrix `tier1_public_exception` blocks; flat `outcome.taken_down`; AC17 empty diff (the states export already exists). Structure: Task 3.0 carries the whole Trap 15 set + OpenAPI; a route table in Task 7.2; every AC clause mapped to a Task; "Done when" mutant lines; a Trap → Task line on every Trap; Project Structure Notes; Questions renumbered 1–9; four glyph inversions fixed. **Then the pass's own diff was re-validated** (one fresh read-only verifier): 2 HIGH / 4 MEDIUM / 11 LOW, all the pass's own, all applied — `memorialChainState` has a THIRD caller (the review detail); Trap 17 / G12 had quoted the `-189` sentence `-195` cl.1 answered the other way (now quotes the binding sentence); MP11 re-shaped to 6.25's selector-derived `(request, NULL)` pair with "due only while no outbox row"; T1 is "answers the question `-393` left open", ⛔ not a reversal; Row 41 (m) gates PC1–PC5 too; the floor test subtracts `DATA_CLASS_EXCLUDED`; `superseded` needs a changed shown version (`409 shown_unchanged`); plus name/quote/attribution fixes (`resolveHandoverNominee`, the Cloudflare and Traefik quotes, 6.9 D5a, the erasure-path wording). |
| 2026-10-27 | v0.3 | Renumbered before the first commit: the pushed branch `fix/talkback-session-2026-10-27` took Decision `-409`/`-410` and ledger `-27e`–`-27h` ⇒ this story's decision is `-411` and its ledger letter `-27i`; header notes that branch's move of the name chain to `kyc/member-facing-name.ts`. Migration `0186`, `ADR-0043` and catalog `53` unaffected (that branch adds none). |
| 2026-10-27 | v0.2 | Checklist validation (one fresh-context verifier, 26 findings, all applied): AC7's chain shapes re-drawn (four were unreachable after a clean `approved`); AC1 keyed on `latestApprovedIndex`, ⛔ not the head's state; Trap 17 (the member-sees-more floor test + `-189`/`-195` reading); Trap 15 widened (contracts vocab copy, `MemorialWithdrawalActorSchema`, the admin ternary); MP5 claims ⛔ no orientation fix (ingest drops it) and pins `sharp` `0.34.5`; AC12 uses the existing 404; KMS-outage rule; the two missed gates (`login-wall` allowlist, the RLS CHECK-name pin); fence projection rules; MP10 a true 6.25 mirror (`no_target`) [⚠ 2026-10-27 v0.4: ⛔ not a mirror — `0152`'s CHECK forbids a per-recipient `no_target`; corrected at v0.4]; MP7/MP12 answered from code; MatrixField gating; latency stated as ~5 min; citations corrected (`-205` cl.2 vs `-173` §11; `-393` (i) TR / (ii) author-commit). |
| 2026-10-27 | v0.1 | Created by `bmad-create-story 11b.4a` at `bab88287`: row `backlog → ready-for-dev`. MP1–MP14 PROPOSED; one routing note planned (PQ1, PQ2, PC1–PC3), ⛔ not drafted or sent; ADR-0043 owed before the approver-email code. ⛔ No code, ⛔ no decision id taken. |
