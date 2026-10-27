---
baseline_commit: bab88287
---

<!--
⭐ BASELINE: `bab88287` — `story(6.36f): ledger 2026-10-27d — LANDED on main by fast-forward (PR #305, CI 36/36)`.
`origin/main` was fetched and equals it (2026-10-27). Two facts, stated separately:
  - the pin is an ancestor of HEAD (durable);
  - every code claim below was read at `bab88287` (perishable). Re-diff `packages apps scripts` at Task 0.1.
⚠ No `file:NNN` pointer in this file points into `.decision-log.md`, `deferred-work.md` or `sprint-status.yaml` (all
newest-first). Cite those by decision id / clause / item / row key only.
⭐ NUMBERS at the pin (re-check ALL of them at Task 0.1 across every branch AND every worktree):
  next decision id `-411` (HEAD `-408` on main; `-409` and `-410` are TAKEN on the pushed branch `fix/talkback-session-2026-10-27` — ⛔ never reuse them) · next migration `0186` (HEAD `0185_contribution-suppression-batch-indexes`) ·
  `PERMISSION_CATALOG_VERSION` `53` (69 keys) · next ADR `ADR-0043` (HEAD `ADR-0042`, none higher on any branch) ·
  launch-gate: this story CLOSES Row 41 (b) and ADDS criteria to Row 41 (no new row) · ledger: this story's creation
  entry is `2026-10-27i` (`-27e`–`-27h` are taken on that branch). Live peer worktrees at creation: none (`git worktree list` showed main only) — ⚠ but the MAIN checkout is on branch
  `fix/talkback-session-2026-10-27` (pushed, ahead of `bab88287` by `-409`/`-410` and ledger `-27e`–`-27h`; ⛔ no migration, ADR or catalog change): include it in every number sweep (STOP 3). ⚠ It MOVES 11b.4's `resolveIntroName` out of `memorial/handlers.ts` into `apps/api/src/modules/kyc/member-facing-name.ts` (`resolveMemberFacingName`, fail-soft) — once it lands, read the name chain there, ⛔ never re-create it in `memorial/`.
⭐ WORKTREE: `.claude/worktrees/11b-4a-family-memorial-public-render`, branch `story/11b-4a-family-memorial-public-render`
(created from `origin/main` `bab88287`). Push with `-u origin story/11b-4a-…` the first time, ⛔ never a bare `git push`.
⭐ LETTERS: `MP1–MP14` = this story's build decisions (⛔ never `MA` — those are 11b.4's, cited by `-398`).
`PQ1`, `PQ2`, `PC1–PC3` = the questions in this story's routing note. 11b.4's letters are cited qualified
(`11b.4 MA13`, `-393 M1`) per `-168` cl.9.
⚠ GLYPH INVERSIONS UPSTREAM: the 11b.4 section of `deferred-work.md` (items (1), (2), (7), (11)) and the `0183` header carry
several ⛔ markers with the negator MISSING (e.g. "`apps/public` does ⛔ depend on `@twt/ui`" means it does NOT). ⛔ Never
copy text from those items; quote the 11b.4 story file or the decision log instead.
-->

# Story 11b.4a: The Family Memorial on the Public Sahyog Vivran Page — Render, Photo, and the Helpline Take-Down `[SURFACE]`

Status: ready-for-dev

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
`-395` (author-commit: **only the nominee's request** counts). `-162` cl.3 (Trustee-ratified): family-owned material is
authorised at the point of submission — 11b.4 records that authorisation on every submission row; this story **reads** it
and ⛔ never asks again.

**Routing-template §0 gate, applied to every open question this story found** (template:
`_bmad-output/planning-artifacts/trustee-panel-routing-note-TEMPLATE.md`):

| # | Question (stripped of citations) | §0 verdict | Where it goes |
|---|---|---|---|
| G1 | Build the render before Story 11b.5's components exist? | **Ours** (sequencing; nobody sees a difference) | MP1 → `-411` |
| G2 | When the nominee who sent it has died, cannot be reached, or has been replaced, who can have the memorial taken down? | **Panel's** — what the Trust owes a family | **PQ1** in the routing note; built as `-395` literally until ruled |
| G3 | The family's words may name the member who died, and the photo shows their face — but no drive page shows the member's name today. Do the words still appear? | **Panel's** — what the Trust discloses about a person | **PQ2**; built as `-391` Q2 A ("as approved") until ruled |
| G4 | Does the public page mark where the Trust left a part out? | **Panel's to confirm** — disclosure | **PC1**; built as MP3 (marked) |
| G5 | After a take-down, may the nominee send a new version? | **Panel's to confirm** — what is owed | **PC2**; built as MP9 (yes — the status quo of `-391` item 4 / 11b.4 MA13) |
| G6 | When do the 7 days start; who gets the email when the approver has left? | Mixed ⇒ split: the clock's start is **Panel's to confirm** (**PC3**); the email's mechanics are **ours** (MP11) | PC3 + MP10/MP11 |
| G7 | How is a part left out *after* publication (`-393` M4's "smaller fix")? | **Ours** — `-393` Not covered: *"the mechanism is the build's"* | MP8 → `-411` |
| G8 | How does the operator know the caller is the nominee? | **Ours** — `-395` Not covered: *"the build's"* | MP7 → `-411` |
| G9 | How the photo is served, resized and cleaned | **Ours** | MP4/MP5 → `-411` |
| G10 | The approver's email address is staff identity data | **An ADR** — ADR-0040 admits exactly two read paths, *"a third is a new ADR"* | **ADR-0043** (Task 1) |

⇒ ⭐ **ONE routing note** (PQ1, PQ2, PC1–PC3), drafted at Task 1.3, ⛔ **not sent** by this story's author — BigDev sends it.
⛔ None of it blocks the BUILD; all of it is a go-live criterion on Row 41 (AC19). It also discharges Row 41 (e) (*"`-395` item 3
shown to the Panel"*) once sent — PQ1 *is* `-395` item 3's open edge.

**STOP conditions — check at Task 0.1; any one ⇒ stop and ask BigDev:**
1. `origin/main` moved and touched any file in *What already EXISTS* ⇒ re-read it before trusting this file.
2. A decision newer than `-408` touches `memorial`, `-391`…`-398`, `-400`, `-405`, `sahyog-vivran`, the matrix, or `helpline_operator`.
3. Migration `0186` or decision `-411` or `ADR-0043` is taken on any branch or worktree ⇒ re-number everywhere in this file.
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

This story introduces **two** predicates that decide what a family gets. In the family's terms:

1. **Publication.** *"Once the Trust approves your memorial, your words — less any part the Trust left out, which is marked
   — and your photo appear on your member's Sahyog Vivran page for anyone who has its link, and stay there until your
   nominee asks the helpline to take it down or the Trust withdraws its approval on one of its four grounds."*
   - **Checked against the Niyamavali:** the rulebook is **silent** on family-written memorial content. §6.5 (*Post-decision
     visibility*) concerns claim **outcomes** and is ⛔ not engaged. Part 10 lists **claim-time** consents ((a)–(c)); that
     text now reads against `-162` cl.3 (*"never prospectively, at claim time"*) — a pre-existing tension already recorded
     by `-391`/`-393`, ⛔ not created here, ⛔ not a blocker (the Niyamavali is a rulebook, not a spec). Result: **no
     conflict**. ⚠ This was checked from the governance trace at authoring; Task 0.1 (g) re-runs it in the main checkout
     (`docs/legal/` is untracked) and records both files' sha256, the Row 41 (j) way.
2. **Take-down.** *"Only the nominee who sent the memorial can have it taken down. The helpline calls that nominee back on
   the number the member recorded for them before acting; anyone else who calls is listened to and asked to have the
   nominee call."*
   - ⚠⚠ **THE CONSEQUENCE THAT MUST BE SAID OUT LOUD (the 10.10 lesson):** *"If that nominee has died, cannot be reached, or
     has since been replaced, nobody in the family can have the memorial taken down — it then comes down only if the Trust
     itself withdraws its approval on one of its four grounds."* That is what `-395` item 3 means when built literally, and
     the v2/v3 permission text already says it to the nominee (*"Only the nominee can ask for it to be taken down; the
     helpline will not remove it at anyone else's request."*). ⭐ It is **PQ1** in the routing note.
   - **Checked against the Niyamavali:** silent on who may withdraw family content; Part 10's *"an opt-out path is provided"*
     is satisfied for the nominee and ⛔ not for anyone else — recorded, ⛔ not a conflict (the rulebook speaks of claim-time
     consents, which `-162` retired). Re-run at Task 0.1 (g).

⛔ No predicate gating a **member's** access to a benefit is introduced or changed (contribution, assignment, claim,
payout — none is read or written here).

---

## 🎯 What already EXISTS — read at `bab88287` (re-verify at Task 0.1)

| Need | What exists | Reuse? |
|---|---|---|
| The family's words, photo key, permission | `memorial_submissions` (migration `0182_memorial-authorship.sql`; schema `packages/domain/src/schema/memorial_submissions.ts`) — `body_ciphertext`, `alt_text_ciphertext`, `photo_object_key`, `photo_mime`, `handover_nominee_ref` (a `member_nominee_versions.version_id`, ⛔ no FK), `supersedes_submission_id` chain, `pool_id`, `deceased_member_id` | ⭐ read only |
| The Trust's decision | `memorial_review_decisions` — `action`, `omissions` jsonb (UTF-16 spans + reason), `photo_left_out_reason`, `actor_id`, `actor_display` | ⭐ read only; `actor_id` is the **approver** (MP10) |
| Withdrawals | `memorial_withdrawals` — PK `submission_id` (one per version), `withdrawn_by memorial_withdrawal_actor ('family','trust')`, `reason_code memorial_review_reason`, CHECKs `memorial_withdrawals_reason_iff_trust`, `memorial_withdrawals_actor_display_check` (both written for `trust` only) | ⭐ widen (MP6, Task 2) |
| "Which version the page shows" | `latestApprovedIndex(chain)` — `packages/domain/src/memorial/status.ts` (scans newest → oldest for an approval with `withdrawal === null`) | ⭐ reuse — ⚠ Trap 1 |
| State derivation | `deriveMemorialStatus` (`status.ts`) — exhaustive switch, **throws** on an unknown actor; `MEMORIAL_STATES` (7); `memorialCanSend` = `state !== 'approved'`; `memorialCanWithdraw` = `with_the_trust` | ⭐ widen (`taken_down`) — ⚠ Trap 15 |
| Chain read + lock | `readMemorialChain` (oldest → newest), `lockMemorialPool` (`pg_advisory_xact_lock(hashtext('memorial:'||pool_id))`) — `packages/domain/src/memorial/submission.ts` | ⭐ every new writer takes the lock |
| The presenter (preview == outcome) | `packages/ui/src/memorial/presenter.ts` — `reconstructMemorial(words, decision)` → `asApproved` paragraphs of segments `{kind:'text',text} \| {kind:'omitted',key:'render.omitted',reason}`; `memorialParagraphs`; `MEMORIAL_OMITTED_KEY` | ⭐ **the** source of the public text (MP3) |
| Bidi safety | `packages/ui/src/memorial/bidi.ts` `isolateMemorialBidi` (R13) | ⭐ apply per text segment on the page |
| Decrypt | `apps/api/src/modules/memorial/memorial-crypto.ts` `decryptMemorialField` (`MEMORIAL_FIELD_CLASS`) | ⭐ reuse in the public handler |
| Photo storage | Port `MemorialPhotoStorage` (`packages/contracts/src/memorial/photo-storage.ts`): `put`, `signedReadUrl(key, ttl)`, `delete` — ⛔ no `getBytes`. Adapters `packages/platform-adapters/src/memorial-photo-storage/{gcs,local-fs,in-memory}.ts`; wired `apps/api/src/deps.ts` (bucket `MEMORIAL_PHOTO_BUCKET`, else local-fs) | ⭐ add `getBytes` (MP4) — precedent `ClaimDocumentStorage.getBytes` (`packages/contracts/src/claims/documents.ts`) |
| The switch | `config.memorialAuthorshipEnabled` ← `MEMORIAL_AUTHORSHIP_ENABLED === '1'` (`apps/api/src/config.ts`), off by default | ⭐ the public render obeys it too (MP13) |
| Public page (Astro 6 SSR) | `apps/public/src/pages/sahyog-vivran/[driveToken].astro` (header: `public, max-age=60, s-maxage=300`, `Vary: Accept-Language`; outage `no-store`; `noindex`); pure view `apps/public/src/lib/sahyog-vivran-render.ts` `buildSahyogVivranView`; fetch `apps/public/src/lib/sahyog-vivran.server.ts` `fetchSahyogVivran` + hand-written guard `isSahyogVivranResponse` | ⭐ extend |
| Public API | `GET /api/v1/p/:pariwarId/public-pages/sahyog-vivran/:driveToken` (`apps/api/src/modules/public-pages/routes.ts`; handler `public-pages/handlers.ts`): scope tx → `resolveDirectoryPublicationEnabled` kill switch (404) → `poolDomain.readPublicSahyogVivran` (returns `poolId`) → decrypts → the `drive` object | ⭐ extend (add `familyMemorial`) |
| Erasure backstop pattern | `public-pages/handlers.ts` — `if (storedName === memberDomain.ANONYMIZED_SENTINEL)` after the deceased-name decrypt | ⭐ mirror for the body (Trap 4) |
| Matrix | `packages/contracts/public-pages/public-vs-private-matrix.yaml` (`sahyog-vivran` surface: `edge_cacheable`, `noindex`); `RULED_TIER1_PUBLIC_EXCEPTIONS` (`packages/contracts/src/public-pages/matrix.ts` — *"ADDING TO THIS LIST IS A RULING, NEVER A CODE CHANGE"*) — six pairs today | ⭐ +3 pairs citing `-391` item 2 |
| Prohibited wire keys | `SAHYOG_VIVRAN_PROHIBITED_KEYS` (contracts `public-pages/sahyog-vivran.ts`) — bans `status` | ⭐ obey (`familyMemorial`, ⛔ never `status`) |
| Staff email (6.25) | Port `apps/jobs/src/scheduler/staff-email-client.ts` (SES / ZeptoMail / fake, plain text); sweep `apps/jobs/src/scheduler/claim-suspicion-staff-emails.ts`; outbox table `claim_suspicion_staff_emails` (migration `0152`); identity reads `packages/domain/src/claim/staff-email-identity-read.ts` (Q1 eligibility, Q2 `readAdminEmailCiphertext`); fence `apps/jobs/tests/staff-email-identity-read-fence.test.ts` (exact allow-lists) | ⭐ mirror the shape; Q2 gains a caller **only after ADR-0043** |
| Roles | `helpline_operator` (`packages/domain/src/rbac/roles.ts`, scope ceiling `pariwar`; holds `claim.file`, `helpdesk.create/respond`, nominee-correction raise …; ⛔ no memorial key); `trustee_panel` holds `memorial.review` | ⭐ new key `memorial.takedown` (MP6) |
| Admin step-up | `requireStepUp('<context>')` — e.g. `claim_file` for the helpline intake (`apps/api/src/modules/reconciliation/routes.ts`) | ⭐ new context `memorial_takedown` (MP6) |
| Enum `ADD VALUE` posture | `0150_claim-closed-enum-values.sql` header: ADD VALUE in its **own file**; drizzle applies every pending file in ONE transaction ⇒ ⛔ no later file in the same run may name the new value as an enum literal (55P04) | ⭐ Trap 6 |
| Admin review UI | `apps/admin/src/modules/memorial-review/{MemorialReviewPage.tsx,derive.ts,i18n-en.ts}`, route `/p/$pariwarId/memorial-reviews[/$submissionId]` | ⭐ show helpline withdrawals (AC12) |
| Family screens | `apps/mobile/app/(memorial)/{index,write,photo,preview,outcome}.tsx`; copy `packages/i18n/locales/{hi,en}/memorial.json` | ⭐ add the `taken_down` state's copy (AC8) |
| Financial-truth gate | `scripts/sahyog-vivran-financial-truth/check.ts` — any file whose name matches `/sahyog-vivran/i` (or under `apps/public/src/pages/sahyog-vivran`) must join `SCAN_FILES` **in the same commit** | ⭐ add every new such file |

**⛔ What does NOT exist (grepped at `bab88287`):** any public read of a memorial · any public image route or image pipeline
(the only `<img>` on public pages is the branding logo) · any image library in a `package.json` (⚠ `sharp@0.34.5` is in `pnpm-lock.yaml` only as `astro`'s optionalDependency) · any CDN
purge / surrogate-key mechanism · `@twt/ui` in `apps/public` (its deps are `@astrojs/node`, `@twt/contracts`, `@twt/domain`,
`@twt/i18n`, `@twt/tokens`, `astro`) · `@twt/ui` as a **runtime** dependency of `apps/api` (it is a devDependency) ·
`MemorialRecord` / `PortraitFrame` / `KinshipLattice` (11b.5 `backlog`; `apps/mobile/components/shradhanjali/*` is a
sample-data prototype, ⛔ not production) · a `helpline` withdrawal actor · a take-down request record · a memorial
event in `events_log` (11b.4 MA11: audit lines only) · a memorial-body sentinel check anywhere.

---

## ⚠ THE SEVENTEEN TRAPS

### Trap 1 — ⚠ Taking down the version on the page can bring an OLDER one back
`latestApprovedIndex` returns the newest approval **with no withdrawal**, scanning backwards. A chain `v1
approved_with_omissions → v2 approved` is reachable (11b.4 MA13 forbids a new version only after a *clean* `approved`). Withdraw
v2 alone and the page falls back to **v1** — a take-down that publishes the family's previous words. ⇒ ⭐ the take-down
writes a `helpline` withdrawal on **every** version of the chain that has none yet (MP8). ⭐ Test the chain shapes in AC7's table.

### Trap 2 — ⚠ A 5-minute signed URL inside a page cached for 5 minutes breaks
`MEMORIAL_PHOTO_URL_TTL_SECONDS = 300` and the page is `s-maxage=300` + `max-age=60`: an embedded signed URL expires while a
PoP is still serving the HTML. ⇒ ⭐ the photo has its **own public route** with the page's cache posture, and it re-checks the
same predicate on every uncached request (MP4) — which is also how a take-down reaches the photo.

### Trap 3 — ⚠ The left-out text and its reason must ⛔ never leave the API
`reconstructMemorial` keeps the `reason` on every `omitted` segment (for the family's screen, R10). ⇒ ⭐ the API cuts the
spans and serialises segments as `{kind:'text',text} | {kind:'omitted'}` only; the DTO is `.strict()` so a `reason` or
`key` key is a parse failure, and a test asserts no left-out substring appears anywhere in the response body.

### Trap 4 — ⚠ An erased member's memorial decrypts SUCCESSFULLY to `[anonymized]`
`anonymizeMember` overwrites the ciphertexts with an *encrypted* `ANONYMIZED_SENTINEL`; the decrypt succeeds and returns the
string. ⇒ ⭐ if the body **or** the alt text decrypts to the sentinel, the whole memorial is omitted (`familyMemorial: null`) —
words **and** photo (the photo object was deleted best-effort; ⛔ never point at it). ⭐ Import the constant, ⛔ never retype it.

### Trap 5 — ⚠ Five exact-set tests and one hand-written guard pin today's payload
Adding `familyMemorial` breaks, **by design**: `apps/api/tests/integration/public-pages/sahyog-vivran.spec.ts` (exact
`Object.keys(body.drive)`), `apps/public/tests/sahyog-vivran-render.test.ts` (`sahyogVivranSurfaceFieldIds` + null-mapped
keys), `apps/public/tests/integration/public-pages/scrape-test.spec.ts` (`tier1AtPublic('sahyog-vivran')`),
`packages/contracts/tests/public-pages-sahyog-vivran.test.ts` (`.strict()` + prohibited keys), and
`apps/public/src/lib/surface-fields.ts` (`SAHYOG_VIVRAN_FIELD_IDS`; `deriveFieldIds` **throws** on an unmapped key). ⚠⚠ And
`isSahyogVivranResponse` (`sahyog-vivran.server.ts`): a field it does not know turns the page into its **OUTAGE** state. ⇒ ⭐
update each as an identity array, ⛔ never a count. ⚠ Also pinned: the eleven CHECK names in
`packages/domain/tests/integration/rls/memorial-policy-regression.spec.ts` (0187 adds one — Task 2.3), and
`apps/public/tests/member-drive-detail-field-floor.test.ts` — Trap 17.

### Trap 6 — ⚠ `ALTER TYPE … ADD VALUE 'helpline'` cannot share a run with a CHECK that names `'helpline'`
⇒ ⭐ `0186` holds the `ADD VALUE` **alone**; `0187` compares `withdrawn_by::text` (text, ⛔ not an enum literal). Hand-authored,
`IF NOT EXISTS`, ⛔ never regenerate an applied migration ([[project_live_db_test_gotchas]]).

### Trap 7 — ⚠ `memorial_withdrawals.reason_code` IS the reviewer's reason enum
It is typed `memorial_review_reason`, shared with `memorial_review_decisions`. Adding `family_asked` there would let a
**reviewer** cite it at the database level — a fifth ground, against `-391` item 7 (Confirm 2 A: *"The four reasons in Q4 A,
and ⛔ no others"*, Trustee-ratified). ⇒ ⭐ a `helpline` withdrawal carries **no** reason (`-393` item 4: ⛔ no merit test);
`family_asked` is ⛔ **not minted**. The withdrawal points at its request instead (`takedown_request_id`, MP6). ⚠ The sprint
ledger's 2026-10-23 line *"`family_asked` + merit note"* is STALE (`-393` superseded "on merit"). ⚠ This **departs from 11b.4
MA18's parts list** (*"a reason value (`family_asked`, minted then) and an optional Tier-1 note"*; *"for a smaller fix, the operator
withdraws the approval"*) — `-411` names the departure; ⛔ never drop MA18's text silently.

### Trap 8 — ⚠ HTML is ⛔ not React Native
HTML collapses the spaces and single newlines `<Text>` keeps ⇒ ⭐ `white-space: pre-wrap` on each paragraph (11b.4 AC11).
⛔ Never `set:html`; Astro `{}` interpolation only. ⭐ `isolateMemorialBidi` on each text segment; `dir="auto"` per paragraph;
⛔ no `lang` attribute on the family's text (its language is ⛔ not recorded — `authorisation_locale` is the permission's).

### Trap 9 — ⚠ "No trace" is a byte property, ⛔ not a visual one
`-393` M1: *"⛔ no "removed" marker, ⛔ no gap, ⛔ no date"*. ⇒ ⭐ a taken-down (or withdrawn, or never-written, or erased)
memorial answers `familyMemorial: null` — the same JSON, the same headers, the same HTML as a drive whose family never wrote;
the photo route answers the **same empty 404** as an unknown drive token. ⭐ A test diffs the two responses.

### Trap 10 — ⚠ The approver's email is staff identity data
ADR-0040: *"⛔ No other new path is admitted; a third is a new ADR."* Q2 (`readAdminEmailCiphertext`) is *"called only by
the staff-email child"* of 6.25. ⇒ ⭐ ADR-0043 is drafted and its id is cited **before** any line of the approver-email code,
and the fence's allow-lists widen **in the same commit** as the new caller, each new entry citing ADR-0043. ⚠ Ratification is
a go-live gate (Row 41), ⛔ not a merge fence (the ADR-0040 precedent).

### Trap 11 — ⚠ Do ⛔ not call a take-down "immediate"
`-155` cl.2: *"⛔ The word "immediate" may not be used about this control in any artifact."* — ruled about the **kill switch**;
applying it to the take-down is **our analogy** (same cache, same latency), ⛔ not the ruling's scope. A take-down stays visible
for up to **about 5 minutes** after the operator acts (`s-maxage=300`; a browser's `max-age=60` is counted against the edge's
`Age`, so it adds little) — the `-155` figure. ⇒ ⭐ the operator's screen says *"it leaves the page within about 5 minutes"*;
⛔ no copy, comment or test name says "immediately".

### Trap 12 — ⚠ The permission names ONE place
v1–v3 all say *"on this member's Sahyog Vivran page, which anyone with its link can read"*. ⇒ ⛔ not on In Memoriam (11b.6),
⛔ not on `/sahyog`, ⛔ not in the member app's drive detail (11b.17), ⛔ not in `<meta>` / Open Graph / `og:image` / a share
card / a sitemap — a link preview copies the photo to another company's servers. ⭐ A test asserts the `<head>` carries none of
the memorial's text or photo URL.

### Trap 13 — ⚠ `apps/public` holds ⛔ no KMS
`apps/public/tests/no-kms-in-public.test.ts` scans for it. ⇒ ⭐ decrypt in the API handler; `apps/public` receives plaintext
segments only.

### Trap 14 — ⚠ The deceased's name follows ITS gate, ⛔ not the memorial's
The page shows the member's name only once `NAME_PUBLICATION_AUTHORISED` holds (`-173`, `-209` cl.2 — unsatisfiable on every
drive today; `-223` cl.1: a null name renders `message_block.headline.no_family`). ⇒ the memorial section must ⛔ not
render the member's name in its heading, and ⛔ never synthesises an alt text (the alt text is the family's, as approved — it may
name the member, which is PQ2). The **family's own words** may name the member — that is
PQ2, built as `-391` Q2 A. ⭐ [[feedback_never_mangle_member_names]]: ⛔ never abbreviate a name inside the family's text.

### Trap 15 — ⚠ `deriveMemorialStatus` THROWS on an unknown actor
Insert one `helpline` row before `status.ts` knows it and the family GET, the review detail and the public read all 500. ⇒ ⭐
one commit carries: the domain vocab (`packages/domain/src/memorial/vocab.ts`), the **contracts copy** of the same vocab
(`packages/contracts/src/memorial/vocab.ts` — `MEMORIAL_WITHDRAWAL_ACTORS`, `MEMORIAL_STATES`, pinned equal by
`packages/contracts/tests/memorial.test.ts`, which also asserts `not.toContain('helpline')` — invert it with a dated note),
`MemorialWithdrawalActorSchema` (contracts `dto.ts`, used by the review-detail response — un-widened it 500s the detail on
serialisation), `MemorialStateSchema`, the derivation, the mobile `outcome.tsx` copy, and the admin display.
⚠ `apps/admin/src/modules/memorial-review/MemorialReviewPage.tsx` renders the withdrawal with a **two-way ternary**: a
`helpline` row would silently read *"The Trust withdrew its approval."* and ⛔ nothing fails to compile — make it a total map.

### Trap 16 — ⚠ `@twt/ui` is only a devDependency of `apps/api`
The public handler calls `reconstructMemorial` at runtime ⇒ ⭐ move it to `dependencies` (and add it to `apps/public` — 11b.4
deferred item (11), epics C-1: *"`apps/public` adds `@twt/ui` as a dependency; `@twt/ui`'s dependency list stays exactly
`@twt/contracts`"*). Verify how `@twt/contracts` reaches the API's runtime build and do the same.

### Trap 17 — ⚠ A floor test says the member must see MORE than the public
`apps/public/tests/member-drive-detail-field-floor.test.ts` reads `SAHYOG_VIVRAN_FIELD_IDS` live and requires every public id to
have a `MEMBER_COUNTERPART` on `MemberDriveDetailResponse` — enforcing `-189` cl.3 (Trustee-ratified): *"a member must see MORE
than the public, ⛔ never less"*. This story keeps the memorial **off** the member drive detail (Trap 12 — the permission names one
place). `-195` cl.1 scopes `-189` cl.3 to *"the drive data class — the nominee/bank fields and the drive record"*; family-authored
content is a different data class (epics 11b.6: *"a different data class on a different basis"*) ⇒ ⭐ **our reading**: the floor
does ⛔ not reach it. ⇒ ⭐ `-411` records that reading; the test maps the three ids to `[]` with an asserted reason (the
appeal-lineage precedent in that file) — ⛔ never by escaping the map. ⚠ One model key (`familyMemorial`) maps to three ids: state
how (the container plus an element map) so none of the three slips out of the floor.

---

## ⚖️ Build decisions MP1–MP14 (PROPOSED — BigDev answers at Task 0.2; recorded as `-411`)

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
opens only at `closed`/`settled` — 11b.4 MA14). It is part of `drive`, so it renders on **every** page number of the
contributor list (one rule per page). Decrypts go through `withKmsOutageClassification` like the deceased-name decrypt: a KMS **outage** re-throws (the page's 503
outage state); only a bad envelope omits the memorial. ⚠ **Cost:** one body + one alt-text decrypt per uncached page request, and
one body decrypt per uncached photo request (its sentinel check — `anonymizeMember` scrubs every field together, so the body
suffices) — each a `decryptDek` audit line through the deployment-wide advisory lock
([[project_kms_audit_per_hmac_global_lock]]); the edge cache bounds it.

### MP3 — The words: the API cuts, the page marks
⭐ **(a)** The API runs `reconstructMemorial` and returns `asApproved` with each `omitted` segment stripped to `{kind:'omitted'}`;
the page renders an omitted segment as the **same copy key the family saw** (`memorial` namespace `render.omitted` —
*"[a part left out by the Trust]"*; ⛔ no second string is minted). **Why:** the family-authorship invariant (epics 11b.4: *"a future
reviewer can always reconstruct what the family originally wrote vs. what moderation removed"*; *"redact specific harmful
sentences with explicit notation"*) — silently joining the words around a cut would put the Trust's edit in the family's
mouth; and UX *"preview matches public output exactly"*. ⚠ **Cost:** a reader sees that something was left out, which may
raise the questions M1 wants to avoid for take-downs ⇒ **PC1**. Rejected — (b) no marker.

### MP4 — The photo: its own route, re-checked every time
⭐ **(a)** `GET /sahyog-vivran/[driveToken]/memorial-photo` in `apps/public` (an Astro `APIRoute`, the `.well-known/*.ts`
precedent) proxies `GET /api/v1/p/:pariwarId/public-pages/sahyog-vivran/:driveToken/memorial-photo`, which runs MP2's predicate,
then — only if the shown version has a photo and the Trust did ⛔ not leave it out — reads the bytes (`MemorialPhotoStorage.getBytes`,
new; all three adapters) and returns the MP5 variant: `Content-Type: image/jpeg`, `Cache-Control: public, max-age=60,
s-maxage=300`, `X-Content-Type-Options: nosniff`, ⛔ no `Set-Cookie`. Every refusal is the page's empty 404. ⛔ No query
parameter (⛔ no cache-buster — it would mint shared-cache keys, the 11b.3b reason). The page links it with `loading="lazy"`
and a fixed 4:5 frame (`object-fit: contain`). ⚠ **Cost:** after a new version is approved, the old photo can be served for
up to ~5 minutes beside the new words; on a KMS outage the photo route answers `503` with `no-store` (the page's outage rule); the object key ⛔ never reaches the wire, so there is no per-version URL.
Rejected — (b) a public bucket / public ACL (bypasses the take-down, the switch and the kill switch); (c) longer signed URLs
(a take-down would not reach a URL already handed out).

### MP5 — The photo: re-encoded with `sharp`, metadata-free, bounded
⭐ **(a)** Add `sharp` to `apps/api`, pinned to **`0.34.5`** — the version already in `pnpm-lock.yaml` as `astro`'s optional dependency, so the
repo carries one libvips build (latest on npm is `0.35.5`; moving both is a separate change). Per request: resize to fit **960 × 1200** without enlargement, convert to sRGB, JPEG quality 82, **strip all metadata**
(EXIF, XMP, IPTC, ICC — `sharp` drops it unless `withMetadata` is called; ⛔ never call it). **Why:** the stored object is
up to 10 MiB (11b.4 MA8) on a 360 px page over cellular; `-400` item 3 kept the ICC profile, whose description and date tags
would otherwise become public; ⚠ ⛔ It does **not** fix orientation: the ingest stripper already drops APP1 (and the EXIF orientation with it —
`apps/api/src/modules/memorial/photo-metadata.ts`, `-398` MA8), so stored objects carry ⛔ no orientation to apply; Row 41 (h)
stays open. ⚠ **Cost:** a new native dependency
in the API image; CPU per uncached request (bounded by the edge cache and `limits.search`); architecture §4.11.2's
*"edge-compatible responsive media pipeline … committed in an implementation ADR"* stays unbuilt — this is ONE variant, recorded
as a dated departure (Task 11.4). Rejected — (b) serve the stored bytes (10 MiB, colour metadata public); (c) an edge
transform vendor (a cloud control ⇒ an ADR and a vendor this story need not choose).

### MP6 — The take-down's vocabulary (mints — ⛔ not covered by the `-210` cl.2 delegation, per `-398` §2)
⭐ **(a)** `memorial_withdrawal_actor` gains **`helpline`**; `MEMORIAL_STATES` gains **`taken_down`**; new enum
**`memorial_takedown_outcome`** (`taken_down`, `kept`); new permission key **`memorial.takedown`** (pariwar dimension) granted
to `helpline_operator` (+ derived `super_admin`) — catalog **53 → 54** (69 → 70 keys); new admin step-up context
**`memorial_takedown`** on the take-down act only. `memorial_withdrawals` gains `takedown_request_id uuid NULL` with CHECK
`(withdrawn_by::text = 'helpline') = (takedown_request_id IS NOT NULL)` and an FK to the request; `actor_display_check` becomes
`(withdrawn_by::text IN ('trust','helpline')) = (actor_display IS NOT NULL) …`; `reason_iff_trust` is **unchanged** (a
`helpline` row has ⛔ no reason — Trap 7). ⚠ This overrides the `-107` cl.1b precedent (*"the helpline operator may intake /
verify / route but may NOT execute"*) **for memorial take-downs only**, on the authority of `-392` item 4 (Trustee-ratified,
standing): *"removed within 7 days, by the helpline operator"*. ⚠ **Cost:** a second staff role can now change a public page.

### MP7 — How the operator knows the caller is the nominee (`-395` Not covered: *"the build's"*)
⭐ **(a) Call back.** The operator's screen shows the nominee recorded on the **shown** version (`handover_nominee_ref` →
that `member_nominee_versions` row's name and mobile, decrypted, one `memorial.takedown.read` audit line). The operator ends
the call, rings that number, and only then records the request, ticking *"I called the nominee back on this number and they
asked for it"* (the request row stores `verified_by = 'called_back'` — a one-value CHECK, room for later methods). Anyone
else is listened to (`-393` M4) and asked to have the nominee call. ⚠ **Cost:** a nominee who has changed their number
cannot be verified ⇒ PQ1's ground. ⭐ **Not a new disclosure to the role:** `helpline_operator` already holds `claim.view_nominee_name_check`, which reads every
nominee version's name, mobile and address on `GET /api/v1/p/:pariwarId/admin/claims/:claimCaseId/nominee-declaration/snapshots`
(`claims.nominee-declaration.handlers.ts`). It is new only in **context** (outside a claim) — `-411` says so.
Rejected — (b) an OTP to the nominee's number (a new SMS template, DLT approval — roster Rows 30/40; a heavier lever for the
same proof).

### MP8 — What a take-down does, and the "smaller fix"
⭐ **(a)** Taking it down writes, under the pool lock, a `helpline` withdrawal on **every** version of the chain that has no
withdrawal yet — the shown one, every older un-withdrawn approval (Trap 1), and any newer version still with the Trust or not
approved — so nothing returns without a **new Send**. The "smaller fix" of `-393` M4 (*"leaving out a sentence or a name,
removing only the photo, or sending a new version"*) is done **by the nominee**: the operator takes it down **only if the
nominee chooses that**, and the nominee sends a new version without the part, which the Trust reviews (11b.4 MA18's own
proposal). **Why:** an operator-side omission would be a fifth ground against `-391` item 7 and an edit act against 11b.4 MA6
(*"⛔ no edit act"*) and the permission text (*"will never change your words"*). ⚠ **Cost:** for a "smaller fix" the memorial is
**down** while the new version waits for review — the operator says so before acting; and a version the nominee sent minutes
earlier is withdrawn too.
Rejected — (b) the operator edits the omissions of the shown version (a new ground, an edit act — needs the Panel).

### MP9 — After a take-down
⭐ **(a)** The family's state is `taken_down`; `memorialCanSend` is **true** (the status quo of `-391` item 4 and 11b.4 MA13 —
a removal is ⛔ not a ban); the outcome screen says, in the Pattern 4 register, that the memorial was taken down at the
nominee's request, that it is no longer on the page, and that the nominee may write again whenever they wish. ⇒ **PC2** asks the
Panel to confirm. **Derivation:** `taken_down` when the chain carries a `helpline` withdrawal and ⛔ no version was created after
the newest one (`created_at > withdrawn_at`); otherwise the head's own state as today. `memorialCanWithdraw(taken_down)` is
false. The admin review queue excludes `helpline`-withdrawn versions; the review detail shows *"taken down at the nominee's
request"* with the time (AC12). Rejected — (b) the memorial is ended for good (a restriction ⛔ no ruling makes).

### MP10 — The approver email (`-392` item 5, KEPT by `-395`)
⭐ **(a) A true mirror of 6.25.** ⛔ No row is written by the take-down: the jobs sweep **derives** the due pairs itself — each
`taken_down` outcome × each **distinct approver** (the `actor_id` of the decision on every version that take-down withdrew that was
approved; usually one person) with ⛔ no send row yet — and each row is **born claimed** (`attempting`, 6.25's
`attempting_claimed` CHECK; outcomes `attempting / accepted / rejected / no_target / error` — `claim_suspicion_staff_emails`,
migration `0152`; sweep `claim-suspicion-staff-emails.ts`: claim, re-check, send, held / transient / terminal, `retries: 0`), reading the
address through **Q2 as admitted by ADR-0043** and an eligibility check that the approver is `users.status = 'active'` with
`admin_credentials` (ADR-0043's Q3 — ⛔ no role required: they are told about their own approval). Plain text, ⛔ no family
name, ⛔ no deceased's name, ⛔ no words:
> *Subject:* A family memorial you approved was taken down
> *Body:* A family memorial you approved for a Sahyog Vivran page has been taken down by the helpline at the nominee's
> request. You do not need to do anything. To see which, open Memorial reviews in the Trust console.
⚠ **Cost:** an approver who has left gets ⛔ no email and ⛔ nobody else is told (MP11).

### MP11 — When the approver cannot be emailed
⭐ **(a)** Terminal `no_target` (6.25's name for it) on the send row + one `error`-level structured log (`memorial.takedown.approver_unreachable`);
⛔ no fallback recipient. **Why:** `-392` item 5 names *"the person who approved"*; choosing someone else is a new disclosure.
⇒ part of **PC3**.

### MP12 — How the operator finds the memorial
⭐ **(a)** By the deceased member's **registered mobile number** — the repo's member-search convention
([[project_membership_number_deferred_feature]]) — through the lookup the helpline already uses — `POST /api/v1/p/:pariwarId/admin/members/search` `{ by: 'mobile', value }`
(`member-validity/routes.ts`; key `member.view_validity`, held by `helpline_operator`; admin `MemberSearchRoute`). Task 0.1 (f)
confirms it returns **deceased** members (STOP 6). The result shows the drive(s) with a shown memorial for that member (R28: more than one closed pool can exist). ⛔ No
list of every published memorial (a list of names nobody needs). ⚠ **Cost:** a caller who does not know the member's number needs
the operator's existing tools first.

### MP13 — The switch
⭐ **(a)** The public render and the photo route obey `MEMORIAL_AUTHORSHIP_ENABLED` (off ⇒ `familyMemorial: null`, photo 404 —
Trap 9's bytes). One lever, one Row 41. The operator's take-down routes do ⛔ not obey it (a take-down must stay possible when
the lever is off — the review routes' precedent). ⚠ **Cost:** turning the switch off hides every memorial on every page within
~5 minutes; that is its job.

### MP14 — The 7-day clock and its watch
⭐ **(a)** The clock starts when the operator **records** the verified request (`received_at` = DB clock); `due_at = received_at +
7 days` (stored, the helpdesk SLA precedent — `packages/domain/src/helpdesk/sla.ts`). The operator's list shows open requests
oldest first, with *overdue* derived from `due_at`. A daily jobs sweep logs one `warn` line with the count of overdue open
requests per Pariwar (⛔ no email — ⛔ no further identity read). ⛔ No automatic take-down at day 7 (`-393` M4: the nominee may
choose to keep it). ⚠ **Cost:** a request the operator forgets to record has ⛔ no clock ⇒ **PC3** asks the Panel to confirm the
start. Rejected — (b) reuse a helpdesk ticket category (a routing-policy version bump —
[[project_helpdesk_default_policy_version_trap]] — for one SLA).

---

## Acceptance Criteria

### AC0 — Governance before code
**Given** the build decisions above **When** Task 0.2 has BigDev's answers **Then** Decision `-411` (AUTHOR-COMMIT) records
MP1–MP14 as answered, the mints of MP6, the supersession in part of `-398` MA1 (MP1), and the `-107` cl.1b override scope (MP6) —
committed **alone**, before any code ([[feedback_governance_commits_precede_implementation]]) **And** `docs/adr/ADR-0043-…md`
is drafted (`Status: drafted`) and its `adr-index.md` row added in the same commit as its reconciliation note **And** the
routing note (PQ1, PQ2, PC1–PC3) exists under `_bmad-output/planning-artifacts/`, ⛔ not sent **And** Row 41 gains its new
criteria (AC19) **And** ⛔ no `-411` text quotes `deferred-work.md` item (1) (Trap — glyph inversions).

### AC1 — The public read
**Given** a drive whose chain has an approved, un-withdrawn version **When** `GET …/public-pages/sahyog-vivran/:driveToken` is
served with the switch on **Then** `drive.familyMemorial` is non-null and carries that version per MP2/MP3 **And** `drive.familyMemorial` is `null` **iff** `latestApprovedIndex(chain) === -1`, or the switch is off, or the body or
alt text decrypts to the sentinel — ⚠ ⛔ never keyed on the HEAD's state: `[A-omit, pending]` is `with_the_trust` at the head
while v1 is still the page's (a positive leg proves v1 shows) **And** the chain is read inside the existing public scope transaction, ⛔ never a
second one **And** a bad envelope omits the memorial and keeps the page with one `error` log, while a KMS outage re-throws to the 503
outage state (`withKmsOutageClassification` — the deceased-name precedent).

### AC2 — The wire and the matrix
**Given** the contract **Then** `familyMemorial` is `.strict()`: `{ words: Paragraph[], photo: { altText: Paragraph[] } | null }`
where `Paragraph = { segments: ({ kind: 'text', text: string } | { kind: 'omitted' })[] }` **And** ⛔ no key named `status`,
`reason`, `key`, `submissionId`, `objectKey`, `url`, `approvedAt`, `approver` exists anywhere in it **And** the matrix
`sahyog-vivran` surface declares `family_memorial_words`, `family_memorial_photo`, `family_memorial_photo_alt_text` at
`pii_tier: 1`, `tier: public` **And** `RULED_TIER1_PUBLIC_EXCEPTIONS` gains exactly those three `(sahyog-vivran, field)` pairs,
each citing `2026-10-23-391` item 2 (each pair needs its own authority — `-205` cl.2), in the **same commit** as the field
declarations (the `-173` follow-up's §11 timing rule) — ⚠ item 2 rules *"The words and photo"*; the **alt text** is a third field,
admitted on **our reading** that it is part of the photo as the family sent it, recorded in `-411` **And**
every exact-set test of Trap 5 is updated as an identity array.

### AC3 — The render
**Given** a non-null `familyMemorial` **When** the page renders **Then** the section and the figure are gated on the matrix
visibility of each of the three ids for `viewerContext="public"` (the same path `<MatrixField>` uses — every other field on
`[driveToken].astro` renders through it; ⛔ never markup that bypasses the matrix, which would make the ids decorative) **And** a
`<section aria-labelledby>` headed by the new copy key
`family_memorial.heading` sits after the drive header and before the contributor list **And** each paragraph is a `<p dir="auto"
style="white-space: pre-wrap">` (or a class carrying exactly that) whose text segments pass through `isolateMemorialBidi` and whose
omitted segments render the `memorial:render.omitted` copy **And** ⛔ no `set:html` exists in any `apps/public` file this story
touches (an AST/regex source test) **And** the photo is `<figure><div><div><img src="/sahyog-vivran/{token}/memorial-photo"
alt="{alt text as approved: text segments joined, each omitted segment as the resolved `render.omitted` string}" loading="lazy" decoding="async"></div></div></figure>` with the UX frame (2 px ink border,
6 pt inner pad, 4:5) from `@twt/tokens` CSS variables **And** ⛔ no memorial text, alt text or photo URL appears in `<head>`
(Trap 12) **And** the deceased's name is ⛔ not added by this section (Trap 14) **And** a test proves the public segments equal
`reconstructMemorial(…).asApproved` with `reason`/`key` stripped, for the same input (preview == outcome == public).

### AC4 — The photo route
**Given** MP4/MP5 **Then** the route answers `200 image/jpeg` only under MP2's predicate with a photo the Trust kept, else the
**same empty 404** as an unknown token (a test compares status, headers and body) **And** the output's longest edge is ≤ 1200 px,
it carries ⛔ no EXIF/XMP/IPTC/ICC segment (a test walks the JPEG markers: only SOI, DQT, SOF, DHT, SOS, EOI, and APP0 JFIF;
the fixture is a PNG and a JPEG with a kept ICC profile, each stored **through the Send ingest path**, ⛔ never seeded around it) **And** `Cache-Control: public, max-age=60, s-maxage=300` and `nosniff` are set
**And** `MemorialPhotoStorage.getBytes(key)` returns `null` for a missing object in all three adapters (GCS `ignoreNotFound`
style) ⇒ the route 404s **And** the Astro endpoint forwards ⛔ no query string and ⛔ no request header but the existing
`X-Forwarded-For` rule of `fetchSahyogVivran`.

### AC5 — No trace (`-393` M1)
**Given** a drive whose memorial was taken down **When** its page and photo route are fetched **Then** both are identical —
status, headers, JSON (with `familyMemorial: null`) and rendered HTML — to the same drive's response before any memorial was
written (fixture: render, write, approve, take down, render again; diff) **And** ⛔ no copy key, element or CSS class on the
page names a removal.

### AC6 — Recording a take-down request
**Given** a `helpline_operator` (key `memorial.takedown`, pariwar dimension) **When** they look the member up by registered mobile
(MP12) and open a drive with a shown memorial **Then** they see the words as approved, the photo (5-minute signed URL — the
existing audited `memorial.photo.url` path), the recorded nominee's name and mobile (MP7), and any open request **And** `POST /api/v1/p/:pariwarId/memorial-takedowns/drives/:poolId/requests`
(Idempotency-Key; body `{ calledBack: true }` — `false` is a 400) records `memorial_takedown_requests` (`received_at` DB
clock, `due_at` +7 days, `verified_by 'called_back'`, `handover_nominee_ref` snapshot, the shown `submission_id`, actor +
`actor_display`) under the pool lock **And** a second open request for the same drive is `409 memorial_takedown.request_open`
**And** a drive with ⛔ no shown memorial is the neutral `404 memorial_takedown.not_found` **And** `trustee_panel`,
`pariwar_admin` and a member token are refused (`actor-denial` spec) **And** the read writes one `memorial.takedown.read` audit
line; the write goes through `withCompensatingAudit` as `memorial.takedown.request_record`.

### AC7 — Deciding the request
**Given** an open request **When** the operator posts `…/requests/:requestId/outcome` with `{ outcome: 'taken_down' }` (admin
step-up `memorial_takedown`, Idempotency-Key) **Then** under the pool lock, in one transaction: one `memorial_takedown_outcomes`
row and a `helpline` withdrawal on **every** version without one (MP8) — ⛔ no email row (the sweep derives it, MP10); audit `memorial.takedown.decide`
**And** `{ outcome: 'kept' }` (⛔ no step-up) closes the request and changes nothing public **And** a second outcome is `409
memorial_takedown.already_decided` **And** an outcome after `due_at` is still accepted (the page shows it was late) **And** a
table test covers the chain shapes that can exist (after a clean `approved` ⛔ no new version can be sent — 11b.4 MA13,
`409 memorial.already_reviewed`): `[A]`, `[A-omit]`, `[A-omit, A]` (Trap 1), `[A-omit, pending]`, `[A-omit, not_approved]`,
`[A-omit, family-withdrawn]`, `[A-omit, not_approved, A]`, `[A-omit, trust-withdrawn(A)]`, and the re-send after a take-down
`[H, H, A′]` followed by a second take-down — after `taken_down`, `latestApprovedIndex` is `-1` and the family state is
`taken_down` in every shape **And** the race with a concurrent Send, family Withdraw, review decision or Trust withdraw-approval is
serialised by the lock (a `races.spec.ts` leg per pair).

### AC8 — The family's view
**Given** `taken_down` **Then** `GET /api/v1/member/memorial` returns `memorialState: 'taken_down'`, `canSend: true`,
`canWithdraw: false` **And** the outcome screen renders new copy keys `outcome.taken_down.*` (en + hi, real `t()` in a render
test — [[feedback_stub_must_call_not_transcribe]]) saying the memorial was taken down at the nominee's request, is no longer on the
page, and that they may write again whenever they wish, with the helpline CTA **And** ⛔ no copy says "removed by the Trust",
"deleted" or "immediately" **And** a new Send after `taken_down` works exactly as after `approval_withdrawn`.

### AC9 — The approver email
**Given** ADR-0043 drafted and cited **Then** migration `0187` adds `memorial_takedown_approver_emails` (one row per (request,
approver user), born claimed by the sweep — MP10), mirroring `claim_suspicion_staff_emails`' states, CHECKs and grants **And** a jobs sweep registered in
`apps/jobs/src/boot.ts` sends MP10's text through the existing staff-email port, reading the address via Q2 and eligibility via
ADR-0043's Q3, with the 6.25 held / transient / terminal classes and `no_target` (MP11) **And**
`staff-email-identity-read-fence.test.ts`'s allow-lists gain exactly the new module/caller, each with an `ADR-0043` comment,
**and** its **projection** rules (today: exactly one `SELECT 1 FROM admin_credentials` and one `se_q2.email_ciphertext`, checked in
`Q_MODULE` only) are extended to Q3's module — ⚠ putting Q3 in `staff-email-identity-read.ts` trips `projection:q1-count`; putting
it in a new module escapes the projection checks unless the fence names it **And**
the plaintext address exists only in the child's memory until the provider call (ADR-0040's rule, extended).

### AC10 — The watch
**Given** open requests past `due_at` **Then** the operator's list marks them overdue (derived) **And** a daily jobs sweep emits one
`warn` line `memorial.takedown.overdue` with `{ pariwarId, count }` per Pariwar with ≥ 1 (⛔ no names, ⛔ no ids beyond the Pariwar).

### AC11 — The operator's screen
**Given** `apps/admin` **Then** a route `/p/$pariwarId/memorial-takedowns` (lookup + open requests) and
`/p/$pariwarId/memorial-takedowns/$poolId` (the drive) exist, linked from `RootLayout.tsx` for holders of `memorial.takedown`
**And** the drive screen shows, before the take-down button: the smaller-fix script (`-393` M4: *"leaving out a sentence or a
name, removing only the photo, or sending a new version"* — done by the nominee, MP8), that the memorial is down while a new
version is reviewed, and that it leaves the page *"within about 5 minutes"* (Trap 11) **And** operator-facing copy is precise
(UX-DR55 operator register) and English-only (the admin precedent) **And** ⛔ no take-down affordance exists for any other role.

### AC12 — The review surface tells the truth
**Given** `memorial-reviews` **Then** a `helpline`-withdrawn version is ⛔ not in the pending queue (already true —
`listMemorialReviewQueue` excludes any withdrawn head; a test only) **And** the detail shows *"Taken down at the nominee's request ·
{time}"* on each such version **And** `withdraw-approval` on a `helpline`-withdrawn target answers the existing neutral
`404 memorial_review.not_found` (`latestApprovedIndex` skips any withdrawal; `MEMORIAL_REVIEW_ERROR_CODES` is closed — ⛔ no new code).

### AC13 — Erasure
**Given** `anonymizeMember` on the deceased **Then** the page answers `familyMemorial: null` and the photo route 404s (Trap 4)
**And** the three new tables carry ⛔ no free text and ⛔ no Tier-1 column (ids, timestamps, enums, `actor_display` snapshots of
**staff** only), so the `rtbf-anonymize.test.ts` table/statement pins are unchanged — or, if Task 0.1 shows `actor_display` is
in RTBF scope for staff, the pins move with a dated note.

### AC14 — Copy
**Given** the new keys (`sahyog-vivran:family_memorial.heading`, `memorial:outcome.taken_down.*`, the admin English strings)
**Then** each exists in en + hi where the surface is bilingual, registered in `catalog.ts` / `KNOWN_NAMESPACES`, covered by
`microcopy.yaml` (read the **list**, ⛔ never the header) **And** `docs/tone-review-checklist.md` gains rows marked **UN-ATTESTED**
(the author's Hindi is ⛔ not a review) **And** proposed text (Task 9 may refine, `-411` records the final):
`family_memorial.heading` — hi *"परिवार के शब्द"*, en *"In the family's words"*.

### AC15 — Friction and weight
**Given** `friction-budget.md` / `friction-budget.yaml` (`member-public-web`) **Then** the page's added weight (HTML + CSS) and
the photo's typical size (≤ ~250 KB at MP5's settings, measured on the fixture) are recorded and disposed **in a commit before**
`friction:check` (it diffs from the merge-base — [[project_friction_budget_baseline_ratchet]]).

### AC16 — Recorded risks and deferrals (each in `deferred-work.md` with a Trigger)
(1) PQ1 unanswered — nominee died / unreachable / replaced ⇒ ⛔ no family take-down. (2) PQ2 unanswered. (3) PC1–PC3 unanswered.
(4) Edge latency ~5 min, ⛔ no purge. (5) A new approved photo can sit beside the new words for ~5 min (MP4). (6) Kinship (11b.4
item (2)) — still 11b.5's / a Panel purpose question. (7) A family's own erasure request (11b.4 item (7)) — ⛔ not built. (8) The
architecture §4.11.2 responsive pipeline (MP5). (9) 11b.5 refactor of this markup (MP1). (10) Story 0.9 visual validation
un-attested. (11) Counsel: M4 + nominee-only against the privacy policy's *"withdrawal is as easy as giving it"* (carried from
`-393`/`-395`). (12) `sharp` CPU per uncached photo request. ⭐ And **discharge**, ⛔ never delete: 11b.4 section items (1) and
(11) → *"HOMED in 11b.4a — closes when 11b.4a is `done` on main"*; the 11b.3 RENDER-NOTHING producers line for the family story
→ annotated.

### AC17 — Nothing else moves
⛔ No change to: In Memoriam / 11b.6 surfaces, `/sahyog`, the member app's drive detail (11b.17 — Trap 17), kinship capture, the review
reasons enum, the permission text versions, `sahyog-vivran-read.ts`'s pool-state tuple, the deceased-name gate, the Pariwar kill
switch's semantics. ⭐ `git diff origin/main -- apps/public/src/pages/sahyog.astro apps/mobile/app/'(tabs)'/shradhanjali.tsx
packages/domain/src/pool/sahyog-vivran-read.ts` is empty except a documented export.

### AC18 — Done means green on the committed tree
**Given** the last commit **Then** `pnpm ci:local` passes **36 / 36** on a fresh database **named `twt_dev`** in its own container
([[project_known_livedb_test_failures]]; ⛔ never :5432 — [[project_prepush_hook_inherits_5432]]); the row moves to `done` only after
that run.

### AC19 — Dark until Row 41 closes
**Given** the merge **Then** ⛔ nothing becomes visible: the switch stays off (Row 41) **And** Row 41 (b) is marked met by this
story's landing commit **And** Row 41 gains: (l) ADR-0043 ratified; (m) the routing note's PQ1/PQ2 answered — or BigDev records
launching without them; (n) `sharp` builds in the production API image (a Cloud Run deploy check); (o) a real-device check of the
public page (Hindi + English text, a hostile-bidi fixture, a rotated phone photo, TalkBack/VoiceOver reading the section).

---

## Tasks / Subtasks

- [ ] **Task 0 — Re-verify and get answers (AC0)**
  - [ ] 0.1 `git fetch origin`; `git merge-base --is-ancestor bab88287 HEAD`; `git diff --name-only bab88287..origin/main -- packages apps scripts docs`; rebase if behind. Re-take every NUMBER in the header across all branches + worktrees (`git for-each-ref`, `git worktree list`). Check STOPs 1–6. Also:
    (a) `latestApprovedIndex`, `deriveMemorialStatus`, `listMemorialReviewQueue`, `memorialWithdrawApprovalTargetId` still read as in *What already EXISTS*;
    (b) every Trap 5 test still pins an exact set;
    (c) step-up contexts have ⛔ no registry (`requireStepUp(deps, ctx)`, `step-up/gate.ts`) ⇒ declare `MEMORIAL_TAKEDOWN_STEP_UP_CONTEXT` once in contracts and import it in the route **and** the admin OTP caller (the 10.21 footgun);
    (d) how `@twt/contracts` reaches the API's runtime build (Trap 16);
    (e) `0152` + `claim-suspicion-staff-emails.ts` shape to mirror;
    (f) `admin/members/search` by mobile returns deceased members (MP12; STOP 6);
    (g) re-run the Niyamavali check for both Policy-meaning sentences in the **main checkout** (`docs/legal/niyamavali{,.hi}.md`; record sha256 of each);
    (h) `claim.view_nominee_name_check` still in the `helpline_operator` bundle (MP7);
    (i) `rtbf-anonymize.test.ts`'s scope for staff `actor_display` (AC13).
  - [ ] 0.2 BigDev answers MP1–MP14 (and approves the copy of MP10 and AC14). ⛔ No code before.
- [ ] **Task 1 — Governance commits (AC0)**
  - [ ] 1.1 Decision `-411` (AUTHOR-COMMIT), committed **alone**: the answers; the mints (MP6); `-398` MA1 superseded in part (MP1) with a dated pointer under `-398`; the `-107` cl.1b scope note; MP7's context note; the departure from 11b.4 MA18's parts (Trap 7); the Trap 17 reading of
`-189` cl.3 / `-195` cl.1; the alt-text reading of `-391` item 2 (AC2).
  - [ ] 1.2 `docs/adr/ADR-0043-memorial-takedown-approver-email.md` (`_adr-template.md`): amends ADR-0040's amendment to admit (Q2) a second caller — the memorial take-down approver-email child — and (Q3) the approver eligibility read (`users.status`, `EXISTS admin_credentials` for ONE `user_id`, ⛔ no identity column projected); the fence's projection rules extended to Q3's module (AC9); everything else in ADR-0040 unchanged; *"a fourth is a new ADR"*. `adr-index.md` row + reconciliation note (Total 154 → 155; re-count, ⛔ never add) in the same commit. `Status: drafted`.
  - [ ] 1.3 The routing note from the TEMPLATE (`trustee-panel-routing-note-2026-10-27-11b4a-family-memorial-public-render.md`): PQ1, PQ2, PC1–PC3 in the template's order; ⛔ not sent.
  - [ ] 1.4 Records: `epics.md` `### Story 11b.4` dated note (MP1 supersession; 11b.4a's scope); Row 41 new criteria (l)–(o); `deferred-work.md` annotations (AC16) — dated lines, ⛔ never rewrites.
- [ ] **Task 2 — Schema (AC6, AC7, AC9)**
  - [ ] 2.1 `0186_memorial-withdrawal-actor-helpline.sql`: `ALTER TYPE "memorial_withdrawal_actor" ADD VALUE IF NOT EXISTS 'helpline';` **alone** (Trap 6 header copied from `0150`).
  - [ ] 2.2 `0187_memorial-takedown.sql`: enum `memorial_takedown_outcome`; `memorial_takedown_requests` (request_id PK, pariwar_id, pool_id, submission_id + FK (pariwar_id, submission_id), handover_nominee_ref, verified_by CHECK = 'called_back', received_at `clock_timestamp()`, due_at, actor_id, actor_display non-blank; ⛔ no partial unique index can express "open" (openness lives in the outcomes table) ⇒ "one open request per drive" is enforced under the pool lock in the handler, with a race test); `memorial_takedown_outcomes` (request_id PK + FK, outcome, decided_at, actor_id, actor_display); `memorial_takedown_approver_emails` (mirror `0152`); `memorial_withdrawals.takedown_request_id` + a **composite** FK `(pariwar_id, takedown_request_id)` (the house pattern) + CHECK;
`actor_display_check` dropped and re-added using `::text`, inside a `DO … EXCEPTION WHEN duplicate_object` guard (`ADD
CONSTRAINT` has ⛔ no `IF NOT EXISTS`). GRANT SELECT, INSERT only; ENABLE + FORCE RLS, per-command policies on `app.pariwar_id`; ⛔ no DELETE, ⛔ no UPDATE (except the outbox columns `0152` grants). Update `_journal.json`.
  - [ ] 2.3 Drizzle schema files + `policies/` RLS module; **update** the existing `memorial-policy-regression.spec.ts` (its pinned set of
    eleven CHECK names gains the new one; its `actor_display_check` probes gain a `helpline` leg); the new RLS regression spec `packages/domain/tests/integration/rls/memorial-takedown-policy-regression.spec.ts` (ENABLE+FORCE, positive/negative/fail-closed, every CHECK, grants) — the 52-sibling pattern.
- [ ] **Task 3 — Domain (AC1, AC7, AC8, AC12 — one commit with Task 2's types, Trap 15)**
  - [ ] 3.1 `vocab.ts` (`helpline`, `taken_down`, the outcome enum); `status.ts` (MP9 derivation; exhaustive; `memorialCanSend(taken_down)=true`); `review.ts` — ⛔ no code: the queue and the withdraw-approval target already skip any withdrawal (AC12 — tests only).
  - [ ] 3.2 `packages/domain/src/memorial/public-read.ts` — `readPublicMemorial(tx, pariwarId, poolId)` → the shown version's ciphertexts, omissions, photo key/left-out (⛔ no decrypt here).
  - [ ] 3.3 `packages/domain/src/memorial/takedown.ts` — record request, decide outcome (MP8's withdraw-all), the due approver pairs the sweep reads (MP10), overdue count (MP14); every writer takes `lockMemorialPool`.
  - [ ] 3.4 Unit tests: the AC7 chain-shape table; derivation of `taken_down` incl. a Send after it; `latestApprovedIndex === -1` after a take-down.
- [ ] **Task 4 — Contracts (AC2, AC6–AC8)**
  - [ ] 4.1 `MemorialStateSchema` + `taken_down`; `familyMemorial` schema in `public-pages/sahyog-vivran.ts` (`.strict()` all the way down); prohibited-key test incl. `reason`, `key`, `submissionId`, `url`.
  - [ ] 4.2 Take-down DTOs (`packages/contracts/src/memorial/takedown.ts`): lookup, drive view, request input `{ calledBack: z.literal(true) }`, outcome input.
  - [ ] 4.3 Matrix YAML + `RULED_TIER1_PUBLIC_EXCEPTIONS` (+3, citing `2026-10-23-391` item 2) — **same commit**; regenerate `openapi/v1.yaml` (`contracts-determinism`).
- [ ] **Task 5 — The public API (AC1, AC4, AC5, AC13)**
  - [ ] 5.1 `apps/api` dependencies: `@twt/ui` to `dependencies`; `sharp@0.34.5` (MP5).
  - [ ] 5.2 `public-pages/handlers.ts`: after the drive read, `readPublicMemorial` → decrypt body + alt → sentinel check (Trap 4) → `reconstructMemorial` → strip → `familyMemorial`; behind MP13.
  - [ ] 5.3 New route `…/sahyog-vivran/:driveToken/memorial-photo` (same rate limit, same kill switch, same 404); `getBytes` on the port + three adapters; the MP5 transform in `apps/api/src/modules/public-pages/memorial-photo-variant.ts`; the route joins
    `PUBLIC_ALLOWLIST` in `apps/api/tests/integration/login-wall.spec.ts` with its written defence, and `-411` says whether it joins
    `SAHYOG_VIVRAN_APPLICABLE_CONTROLS` (`sahyog-vivran-controls.ts`).
  - [ ] 5.4 Integration specs: `public-pages/sahyog-vivran-memorial.spec.ts` (AC1 states, AC3 equality, AC5 diff, AC13), `public-pages/sahyog-vivran-memorial-photo.spec.ts` (AC4 markers, rotation, size, headers, 404 parity). Update the Trap 5 sets.
- [ ] **Task 6 — The public page (AC3, AC4; Traps 12, 17)**
  - [ ] 6.1 `apps/public/package.json` + `@twt/ui`; `isSahyogVivranResponse` + `familyMemorial`; `buildSahyogVivranView` gains the memorial view model; `surface-fields.ts` + 3 ids; `member-drive-detail-field-floor.test.ts` maps them to `[]` with the asserted reason (Trap 17).
  - [ ] 6.2 `apps/public/src/components/FamilyMemorial.astro` (section, paragraphs, figure); place it in `[driveToken].astro`; update the two stale doc-blocks (`sahyog-vivran-render.ts`, `[driveToken].astro` — *"the family story (11b.4, `backlog`)"*).
  - [ ] 6.3 `apps/public/src/pages/sahyog-vivran/[driveToken]/memorial-photo.ts` (APIRoute proxy).
  - [ ] 6.4 Add every new `*sahyog-vivran*` / `pages/sahyog-vivran/**` file to the financial-truth `SCAN_FILES` **by hand** in the same
    commit — ⚠ its `wholeDirs` scan is ⛔ not recursive and ⛔ never sees `pages/sahyog-vivran/[driveToken]/memorial-photo.ts`;
    and the pii-scrape route coverage loads `.astro` only (`packages/contracts/scripts/check-pii-scrape.ts`) ⇒ AC4's own header
    test is the photo endpoint's only guard — say so in the endpoint's doc-block.
  - [ ] 6.5 Tests: render (pre-wrap, `dir="auto"`, marker copy, bidi on a hostile fixture, a ⛔-no-`set:html` source scan, `<head>` clean — Trap 12), `scrape-test.spec.ts` (+3 tier-1 ids).
- [ ] **Task 7 — Take-down API (AC6, AC7, AC12)**
  - [ ] 7.1 `memorial.takedown` key (`permissions.ts`, catalog 54 / 70; `permissions.test.ts`), grant (`roles.ts`; `roles.test.ts`); step-up context `memorial_takedown`.
  - [ ] 7.2 `apps/api/src/modules/memorial-takedown/{index,routes,handlers}.ts`, registered in `server.ts`: lookup, drive view (nominee decrypt + `memorial.takedown.read`), request, outcome; Idempotency-Key per [[project_idempotent_write_handler_shape]] (COMMIT then record); 23505 inside a SAVEPOINT ([[project_domain_limit_clamp_and_savepoint_retry]]).
  - [ ] 7.3 Specs `apps/api/tests/integration/memorial-takedown/{takedown,actor-denial,races}.spec.ts`; audit-sink union gains `memorial.takedown.read`.
- [ ] **Task 8 — Jobs (AC9, AC10) — ⛔ never started before ADR-0043 (Task 1.2) is committed**
  - [ ] 8.1 `packages/domain/src/memorial/takedown-approver-email-read.ts` (or extend `staff-email-identity-read.ts`, per ADR-0043's text): Q3 eligibility; Q2 reused.
  - [ ] 8.2 `apps/jobs/src/scheduler/memorial-takedown-approver-emails.ts` (mirror the 6.25 sweep) + `memorial-takedown-overdue.ts`; register in `boot.ts`; own pool if it needs tx + audit ([[project_jobs_pool_two_connection_starvation]]).
  - [ ] 8.3 Fence test allow-lists widened with `ADR-0043` comments; sweep specs (eligible, `no_target`, transient, held, idempotent re-run).
- [ ] **Task 9 — Family + admin surfaces (AC8, AC11, AC12, AC14)**
  - [ ] 9.1 Mobile: `taken_down` in `outcome.tsx` (the state copy lives there; `memorial-copy.ts` holds Send refusals only); copy en + hi; render test with real `t()`; `memorial-source-pins.test.ts` if it enumerates states.
  - [ ] 9.2 Admin: `apps/admin/src/modules/memorial-takedown/*`, routes, `RootLayout.tsx` link, `hooks.ts`/`client.ts`; the review page's
    withdrawal ternary becomes a total map over the three actors (Trap 15).
  - [ ] 9.3 i18n catalogs, `microcopy.yaml` lists, tone-review rows (UN-ATTESTED).
- [ ] **Task 10 — Budgets (AC15)** — measure, record, commit the friction disposition; then `friction:check`.
- [ ] **Task 11 — Records (AC16, AC19)**
  - [ ] 11.1 `deferred-work.md`: AC16 items (1)–(12) as a new `11b.4a` section; discharge annotations on 11b.4 items (1), (11) and the 11b.3 producers line.
  - [ ] 11.2 Row 41: (b) met by the landing commit (dated); (l)–(o) added.
  - [ ] 11.3 Story: Completion Notes, File List, Change Log.
  - [ ] 11.4 Architecture §4.11.2 dated annotation (MP5's single variant; the ADR still owed).
- [ ] **Task 12 — Verify and close (AC17, AC18)** — AC17's `git diff` check; commit; `pnpm ci:local` 36 / 36 on a fresh `twt_dev` in its own container; only then `review` → (after code review) `done`.

---

## Dev Notes

### The shape of the change
```
memorial_submissions ─┬─ memorial_review_decisions (actor_id = approver)
                      ├─ memorial_withdrawals  (+ 'helpline', + takedown_request_id)
                      └─ memorial_takedown_requests ── memorial_takedown_outcomes
                                                    └─ memorial_takedown_approver_emails ──▶ apps/jobs sweep ──▶ staff-email port
public GET (apps/api) ── readPublicSahyogVivran → readPublicMemorial → decrypt → sentinel → reconstructMemorial → strip
apps/public [driveToken].astro ── FamilyMemorial.astro ── <img src=/sahyog-vivran/{t}/memorial-photo>
apps/public …/memorial-photo.ts ── proxies → apps/api photo route ── getBytes → sharp → image/jpeg
```

### Named identifiers (⛔ never invent a synonym — footgun 14)
`familyMemorial` (wire) · `family_memorial_words`, `family_memorial_photo`, `family_memorial_photo_alt_text` (matrix ids) ·
`memorial.takedown` (key) · `memorial_takedown` (step-up context) · `helpline` (actor) · `taken_down` (state and outcome value) ·
`kept` (outcome) · `memorial_takedown_requests`, `memorial_takedown_outcomes`, `memorial_takedown_approver_emails` (tables) ·
`takedown_request_id` (column) · `called_back` (`verified_by`) · `readPublicMemorial` · `memorial.takedown.read`,
`memorial.takedown.request_record`, `memorial.takedown.decide` (audit) · `memorial.takedown.overdue`,
`memorial.takedown.approver_unreachable` (logs) · `memorial_takedown.not_found`, `memorial_takedown.request_open`,
`memorial_takedown.already_decided` (errors).

### Rulings checked (verbatim where they bind)
- `-391` item 2 (TR): *"The words and photo appear on the public page, **as the Trust approved them**. … the reviewer leaves out any child's name, and the photo if it shows a child, before approval. Living adults named by the family appear as written."*
- `-391` item 7 (TR): *"The four reasons in Q4 A, and ⛔ no others, are the only grounds on which a family's words or photo may be left out or declined."*
- `-392` items 4–5 (TR, kept by `-395`): *"removed within 7 days, by the helpline operator"*; *"An email is sent to the approver — the person who approved the memorial (the decision's recorded actor)."*
- `-393` M1: *"A memorial that is taken down leaves the Sahyog Vivran page exactly as if none had been written: ⛔ no "removed" marker, ⛔ no gap, ⛔ no date"*; M4: *"the helpline operator asks what is troubling them and offers what is smaller than removal: leaving out a sentence or a name, removing only the photo, or sending a new version. If the family still wants it taken down, it is taken down."*; Not covered: *"how a part is left out **after** publication (M4) — the mechanism is the build's"*.
- `-395` item 3 (AC): *"taken down **only on the nominee's request** — the nominee whose code sent it (the one recorded on the submission)"*; Not covered: how the operator knows the caller is the nominee (*"the build's"*); *"the nominee has died, cannot be reached, or has since been replaced … whose request counts then is open"*.
- `-160` cl.4(e) (TR): the kill switch *"turns publication off irrespective of the underlying member authorisation"* — the memorial sits behind it.
- `-155` cl.2 (TR): ⛔ never the word "immediate" about this lever.
- `-162` cl.3 (TR): authorised at submission — read from the row, ⛔ never re-asked.

### Testing standards
Vitest everywhere; live-DB specs on a fresh `twt_dev` ([[project_live_db_test_gotchas]], [[project_db_clock_ordering_tests_tie]] —
the `created_at > withdrawn_at` derivation needs **separate transactions** in fixtures, one transaction gives equal `now()`;
`clock_timestamp()` columns help but seed through separate txns anyway). Every new test is shown RED against a mutant
(11b.4's discipline). ⛔ Never `--write` with Prettier ([[project_prettier_not_enforced]]). ⚠ `\u` escapes in written content can
land raw — scan new files for invisibles ([[project_unicode_escapes_written_raw]]); the bidi fixtures are exactly where this bites.

### Previous-story intelligence (11b.4)
- Migration numbers in 11b.4's text are pre-rebase (`0181`/`0182`); the files are `0182`/`0183`.
- Drizzle wraps pg errors — check `err.cause.code` for 23505 (`isUniqueViolation`).
- `ci:local` is **36** jobs; the 10.23 gate refuses a DB not named `twt_dev`; turbo does ⛔ not pass `TWT_ALLOW_DESTRUCTIVE_LIVE_TESTS` through.
- `done` was once set before the committed-tree run and walked back — AC18 exists for that.
- V4 signed URLs embed their signing time ⇒ never key a cache or a "refetch once" guard on the URL (T2).
- `@fastify/multipart` truncates long text fields silently — ⛔ not relevant here (no multipart), noted for the admin form.
- Review agents ran with disjoint file ownership; [[feedback_concurrent_review_agents_mutate_tree]] — check the branch before every commit.

### Git intelligence
Last five commits on `main` are 6.36f's landing and review records (mobile nominee marks) — ⛔ none touches the memorial, the
public page or the staff-email path. 11b.4 landed as PR #303 (`f5e0e3ab`); 5.11b (#304) added `0184`/`0185` (SMS) — the next
migration is `0186`.

### Latest tech
`sharp` pinned `0.34.5` (lockfile's; npm latest `0.35.5`, Node ≥ 20.9 — repo `>=22.12.0`). Use `sharp(buf, { failOn: 'error',
limitInputPixels: 50_000_000 }).resize({ width: 960, height: 1200, fit: 'inside', withoutEnlargement: true }).toColourspace('srgb').jpeg({ quality: 82,
mozjpeg: true }).toBuffer()` — ⛔ never `withMetadata()`/`keepMetadata()`. ⚠ Check prebuilt binaries cover the API's Cloud Run base image
(`linux-x64` glibc; Alpine needs `linuxmusl`) — Row 41 (n). Astro 6 `APIRoute` returns a web `Response`; pass bytes as a `Uint8Array`
body with explicit headers; `apps/public/astro.config.mjs` sets `output: 'server'`, so the endpoint is SSR by default (⛔ no `prerender` export needed).

### References
- Story 11b.4: `_bmad-output/implementation-artifacts/11b-4-memorial-authorship-surface-family-writes-the-story.md` (MA1, MA8, MA13, MA16, MA18; AC11; AC16 (1), (11)).
- Rulings: `.decision-log.md` `-155`, `-160`, `-162`, `-173`, `-205`, `-209`, `-223`, `-391`, `-392`, `-393`, `-395`, `-398`, `-400`, `-405`.
- Routing note (11b.4): `_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-10-23-11b4-family-memorial-five-questions.md`.
- ADRs: `docs/adr/ADR-0040-staff-email-transport.md`, `docs/adr/ADR-0022-public-astro-ssr-shell-cache-safety.md` (`apps/public` reads, the cache posture), `docs/knowledge-transfer/adr-index.md`.
- Launch gate: `docs/launch-gate-inventory/inventory-roster.md` Row 41.
- UX: `_bmad-output/planning-artifacts/ux-design-specification.md` — Sahyog Vivran visual grammar; `<MemorialRecord>`, `<PortraitFrame>`, FuneralFrame; Pattern 4; memorial column width (360 pt mobile / 480 pt desktop); Latin numerals for dates.
- Architecture: `_bmad-output/planning-artifacts/architecture.md` AR-48 (public shell), §4.11.2 (media budget).
- Epics: `_bmad-output/planning-artifacts/epics.md` `### Story 11b.3`, `### Story 11b.4`, `### Story 11b.5`, Epic 11b header C-1, C-4, C-5.

### ❓ Questions for BigDev (Task 0.2)
1. MP1–MP14 — accept the ⭐ options, or which differ?
2. MP10's email text and AC14's heading copy — approve, or your words?
3. MP7 — the operator already sees nominee mobiles on the claim snapshots screen; are you content to show the recorded nominee's
   mobile on the take-down screen too (new only in context)?
5. Trap 17 — accept our reading that the member-sees-more floor (`-189` cl.3, scoped by `-195` cl.1) does ⛔ not reach the
   family's words, or put it to the Panel as PC4?
4. The routing note — send it now (with 11b.4's Row 41 (e)), or hold it until the build is reviewed?

---

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List
- Ultimate context engine analysis completed — comprehensive developer guide created (2026-10-27, `bmad-create-story 11b.4a`, four read-only research agents at `bab88287`).

### File List

---

## Change Log

| Date | Version | Change |
|---|---|---|
| 2026-10-27 | v0.3 | Renumbered before the first commit: the pushed branch `fix/talkback-session-2026-10-27` took Decision `-409`/`-410` and ledger `-27e`–`-27h` ⇒ this story's decision is `-411` and its ledger letter `-27i`; header notes that branch's move of the name chain to `kyc/member-facing-name.ts`. Migration `0186`, `ADR-0043` and catalog `53` unaffected (that branch adds none). |
| 2026-10-27 | v0.2 | Checklist validation (one fresh-context verifier, 26 findings, all applied): AC7's chain shapes re-drawn (four were unreachable after a clean `approved`); AC1 keyed on `latestApprovedIndex`, ⛔ not the head's state; Trap 17 (the member-sees-more floor test + `-189`/`-195` reading); Trap 15 widened (contracts vocab copy, `MemorialWithdrawalActorSchema`, the admin ternary); MP5 claims ⛔ no orientation fix (ingest drops it) and pins `sharp` `0.34.5`; AC12 uses the existing 404; KMS-outage rule; the two missed gates (`login-wall` allowlist, the RLS CHECK-name pin); fence projection rules; MP10 a true 6.25 mirror (`no_target`); MP7/MP12 answered from code; MatrixField gating; latency stated as ~5 min; citations corrected (`-205` cl.2 vs `-173` §11; `-393` (i) TR / (ii) author-commit). |
| 2026-10-27 | v0.1 | Created by `bmad-create-story 11b.4a` at `bab88287`: row `backlog → ready-for-dev`. MP1–MP14 PROPOSED; one routing note planned (PQ1, PQ2, PC1–PC3), ⛔ not drafted or sent; ADR-0043 owed before the approver-email code. ⛔ No code, ⛔ no decision id taken. |
