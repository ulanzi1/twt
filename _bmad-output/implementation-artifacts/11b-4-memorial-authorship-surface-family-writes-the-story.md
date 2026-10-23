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
⭐ LETTERS: `Q1–Q4` = the Panel questions (routing note); `MA1–MA13` = build decisions (this file); `D-…` are
never used bare.
-->

# Story 11b.4: MemorialAuthorshipSurface — Family Writes the Story + Family-Authorship-Preserved Invariant `[SURFACE]`

Status: ready-for-dev

## ⭐ GLYPH REGISTER — read this before any clause below

⭐ = an action to take · ⚠ = a hazard · **⛔ marks a negation and must be followed by an explicit
negator** (`not` / `no` / `never` / `nothing` / `neither`, or a prohibition verb). A ⛔ placed before a
positive clause is an **inversion**, not emphasis. Doubling (`⭐⭐`, `⛔⛔`) adds volume only.

## ✅ PREFLIGHT — **STARTABLE for the build. ⛔ NOT launchable** until the Panel answers Q1, Q2 and Q4 and the public render lands.

⭐ **Authority.** `#decision-2026-08-28-162` **cl.3** (Trustee-ratified) binds this story by name:
*"FAMILY-OWNED MATERIAL IS AUTHORISED AT THE POINT OF SUBMISSION … 11b.4 owes the authorisation **in its own
surface**, at the moment of submission … ⛔ It is ⛔ not discharged by adding a box back to the claim screen
under a new name."* Its open follow-up: *"Story 11b.4 carries clause 3 into its own ACs and Tasks list — the
AC-only route has already failed on this epic."* ⇒ **AC4 + Task 4** carry it. ⛔ Nothing supersedes `-162`
(traced 2026-10-23: `-163`, `-166`, `-168`, `-177`, `-183` cite it and re-affirm).

⭐ **The routing template's §0 gate, applied.** Most questions in this story are the **author's** and are ruled
below as build decisions **MA1–MA13** (⭐ = recommended; BigDev answers them at Task 0.2). **Four pass the gate**
and are routed in **one drafted note**:
`_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-10-23-11b4-family-memorial-four-questions.md`
(⛔ **not yet sent** — it is "shown to the Panel" only once BigDev sends it).

| Q | Plain question | Blocks the BUILD? | Blocks GO-LIVE? | Built here as |
|---|---|---|---|---|
| **Q1** | Who may write the memorial and give permission, for the family? | ⛔ No | ⭐ **Yes** | Option A — the nominee, through the existing handover sign-in (the only principal that exists) |
| **Q2** | What of the memorial is shown publicly, and what never is? | ⛔ No (publication is ⛔ not in this story — MA1) | ⭐ **Yes** — it fixes the **wording of the permission** (AC4) | Draft wording on Option A; final wording after the ruling |
| **Q3** | Can the family take it down after it appears? | ⛔ No | Only for the render row | Withdrawal **before review** only (MA9) — ⛔ no publication exists to take down |
| **Q4** | Is the family told why words were left out, and can they ask again? | ⛔ No | ⭐ Yes | Option A — told in the app, may send a new version |

⚠ **What is already ruled (Panel, or author-commit where marked), and this story must satisfy** (⛔ none is reopened):
`-162` **cl.2** (boxes (b) `sahyog_vivran_publication` and (c) `in_memoriam_listing` RETIRED — ⛔ never reused,
⛔ never re-worded); `-162` **cl.5** (**author-committed**, extending `-160` cl.5's preserve-don't-delete discipline: the two enum values
and every existing `consent_records` row PRESERVED); `-160` **cl.3** (family-owned information rests on **the family's own consent**, ⛔ no per-subject
gate on member- or nominee-owned data); `-160` **cl.6** + `-223` (author-commit) (⛔ **no family veto over the member's own name**
— nothing in this surface may gate, withhold or ask about the deceased member's name).

⭐ **One governance entry is written by THIS story** — Task 1 records **MA1–MA13** (as answered) plus the two
enum mints and the permission key as ONE author-commit entry (**`2026-10-23-389`** or the next free id) **before
any code**, committed alone ([[feedback_governance_commits_precede_implementation]]). ⚠ The enum mints and the
permission key are ⛔ **not** covered by the `-210` cl.2 delegation (it covers only tracking vocabularies with ⛔ no
member-facing or authority effect) — they need that entry, ⛔ not the delegation.

⚠ **STOP conditions for Task 0.1** — halt and tell BigDev if any of these is true at the fresh `origin/main`:
1. a decision newer than `-388` cites `-162`, `11b.4`, `memorial`, or `family-authored` ([[feedback_story_validate_footguns]] #6, #15);
2. a story file other than this one, or a new row, owns a family memorial / tribute / parichay (#10);
3. any file under `packages/domain/src/memorial/`, `apps/api/src/modules/memorial*`, or `apps/mobile/app/(memorial)/` already exists;
4. the Panel has answered the routing note (then transcribe the answer FIRST and re-read every AC against it).

---

## Story

As **the nominee of a member who has died, writing for the family**,
I want **to write a few words about them in my own way — at my own pace, over days if I need, with a photo if I
choose — see exactly how it will read, and send it to the Trust knowing what will happen to it**,
so that **my words for my loved one stay mine: the Trust may leave a sentence out, or say no and tell me why,
but ⛔ never rewrites, summarises, embellishes, or generates what I said.**

## 📜 Policy meaning (AI-10-1, CONFIRMED BigDev 2026-08-18)

⭐ **No predicate that gates a MEMBER's access to a benefit** is introduced or changed. ⛔ No `is_valid`,
`is_assignable`, `members.state`, moderation overlay, eligibility, contribution or claim predicate is read or
written. ⛔ Nothing here touches who is paid, who is covered, or who may contribute.

⭐ **One new predicate gates a FAMILY's ability to send a memorial** — "the drive for this member's death is
`live`, `closed` or `settled`, and the person is in the member session the family uses after a death (the Ravi-mode session-as-deceased);
sending additionally needs the nominee's handover code" (`resolveMemorialDrive`, Task 3). **In the family's terms:** *"once the Trust has opened a collection for the person who died, the nominee
can write about them — during the collection and at any time after it, with no deadline."*
**Checked against the Niyamavali — no clause governs who may write a memorial or when.** Grepped
`docs/legal/niyamavali.md` for `memorial` / `In Memoriam` / `photo` / `portrait` / `narrative` /
`श्रद्धांजलि`: two hits, both **pre-`-162` consent prose** (the claim-time consent list *"(c) In Memoriam
inclusion"*, and *"publicly visible on the memorial / Sahyog Vivran (consent-gated)"*). ⛔ Neither governs
authorship, and both are overtaken by `-160`/`-162`. ⚠ That file is the **local, git-untracked** copy of the
private corpus (`git ls-files docs/legal` is empty), the Niyamavali is a rulebook ⛔ not a ratified spec
([[feedback_niyamavali_rulebook_not_spec]]), so the check is reproducible only where the corpus is present.

⭐ **A second new predicate decides what a REVIEWER may do** (MA6: approve · approve with sentences left out ·
not approved). **In the family's terms:** *"the Trust can leave out a sentence of mine or say no and tell me why,
but it can never change my words."* Same Niyamavali result (no clause).

---

## 🎯 What already EXISTS — read at `d87d047a`

| Need | What exists | Reuse? |
|---|---|---|
| A post-death author principal | **Ravi-mode** — the family signs in to the **deceased member's** account; writes elevate via `requireMemberStepUp(deps, 'claim_handover')` (OTP to the **nominee's** declared mobile; `CLAIM_HANDOVER_ACTION_CONTEXT` in `apps/api/src/modules/claims/claims.service.ts`) | ⭐ Yes — the only principal (Q1 option A) |
| "Which drive is this?" | `nomineeConsole.resolveActiveNomineePool` (`packages/domain/src/nominee-console/read.ts`) — ⚠ matches **only `live`** pools | ⛔ **No** — Trap 2 |
| Visible-drive states | `SAHYOG_VIVRAN_VISIBLE_POOL_STATES = ['live','closed','settled']` (`packages/domain/src/pool/sahyog-vivran-read.ts`) | ⭐ Import the constant |
| Point-of-submission wording registry | `CLAIM_CONTACT_AGREEMENT_VERSIONS` (`packages/domain/src/claim/claim-contact-agreement-copy.ts`) — versioned, never edited; the client sends only `locale` (+ `agreed`) and the server picks the current version | ⭐ The **pattern** (MA5) — 11b.4 deliberately ALSO echoes the version so a stale screen is refused |
| The handover step-up on the phone | `apps/mobile/lib/use-handover-otp.ts` (Story 6.21b shared hook; precedent `app/(claim)/certificate-replacement.tsx` retries with the file still picked). ⚠ Its header: *"⛔ never `useStepUpGate` — that sends to the SESSION member's phone"*. Elevation lasts **5 minutes** (`stepUpElevatedMs`, `apps/api/src/config.ts`) | ⭐ Yes — AC7a |
| The deceased's name in the family's own app | 11b.21's member-surface name form, `apps/api/src/modules/kyc/name-render.ts` (⚠ the console shows only a curated **pool** name — ⛔ not a person's name) | ⭐ Yes (AC2 intro) |
| Photo storage | Per-purpose ports in `@twt/contracts` (`ClaimDocumentStorage`, `HelpdeskAttachmentStorage`, …) + adapters `packages/platform-adapters/src/<name>/{gcs,in-memory,local-fs}.ts`, wired in `apps/api/src/context.ts` + `deps.ts`; multipart through the API, object key ⛔ never on the wire | ⭐ A **new** port on the helpdesk-attachment precedent (MA8) |
| Append-only decision record | `member_moderation_actions` (`packages/domain/src/schema/member_moderation_actions.ts`): SELECT+INSERT grants only, Tier-1 `rationale_ciphertext`, `actor_display` snapshot | ⭐ The **shape** — ⛔ not the table (member sanctions are a different subject) |
| Draft persistence | MMKV via `mmkvStorage` (`apps/mobile/lib/mmkv.ts`); `apps/mobile/lib/helpdesk-draft.ts`, `components/nominee-console/console-resume.ts` (versioned `.v1` key) | ⭐ Yes (MA3) |
| Mobile upload | `apps/mobile/lib/use-death-certificate-upload.ts` + `app/(claim)/document.tsx` (`expo-image-picker`) | ⭐ The pattern |
| Audit | `writeAuditEntry` / `withCompensatingAudit` (`packages/domain/src/audit/`) — hash only, ⛔ never content | ⭐ Yes |
| RBAC | `packages/domain/src/rbac/permissions.ts` (`PERMISSION_CATALOG_VERSION = 52`), `roles.ts`, `requirePermissionHook` | ⭐ New key (MA7) |
| Admin precedent for a review queue | `apps/admin/src/modules/news-blog/` + `apps/api/src/modules/news-blog/` | ⭐ Layout precedent |
| Shradhanjali prototype | `apps/mobile/components/shradhanjali/*` (`MemoryInput`, `MemorialPortrait`, `KinshipLattice`, `sample-data.ts`) — **P0-5 measurement surfaces on sample data** | ⛔ **Not** production; ⛔ not extended (11b.5 owns the components) |

⛔ **What does NOT exist** (each verified at the pin): a content-moderation queue, action vocabulary, or appeal
(`MODERATION_ACTIONS = ['suspend','terminate','restore']` is member-only); any field for a family story,
portrait or kinship on the `sahyog-vivran` matrix surface; any navigation **into** `(nominee)` (the console
route exists but ⛔ nothing links to it — `grep -rn "(nominee)" apps/mobile` hits only `_layout.tsx` and a
two comments: `(polls)/_layout.tsx`, `lib/nominee-bank-vpa.ts`); a server-side member draft table; any rich-text editor or renderer on mobile; the `disabled-T+90`
account state (`packages/domain/src/state-machine.ts` header: a "focused follow-up" — ⛔ not built).

---

## ⚠ THE NINE TRAPS

### Trap 1 — ⚠ "Moderation queue per Story 10.10" points at the wrong thing
Story 10.10 is **member** suspend/terminate/restore; 10.20/10.22 are member-sanction records and appeals. ⛔ None
moderates content, and the family author is ⛔ not the sanctioned member. ⇒ This story builds its **own**
append-only review record (MA6). ⛔ Never add `remove`/`redact` to `MODERATION_ACTIONS` (defined TWICE: `packages/domain/src/member/moderation/status.ts`
and `packages/contracts/src/member-moderation/enums.ts`), ⛔ never write to
`member_moderation_*`, ⛔ never reuse `member.moderate`.

### Trap 2 — ⚠ The console resolver goes dark exactly when authorship begins
`resolveActiveNomineePool` matches **only `live`** pools; the UX places authorship **post-close**. ⛔ Do ⛔ not
widen that resolver — it would change Story 9.1's console (reconciliation, contributor list) for closed drives.
⇒ A **new** resolver `resolveMemorialDrive` over `SAHYOG_VIVRAN_VISIBLE_POOL_STATES`, with the same deterministic
tie-break and the same `> 1` log.

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
named `*sahyog-vivran*`; ⛔ no edit to `sahyog-vivran-read.ts` beyond **importing** the visible-states constant
(MA1 keeps the public read untouched).

### Trap 6 — ⚠ Verbatim means VERBATIM — ⛔ no normalisation on the way in
⛔ No `.trim()`, ⛔ no NFC/NFKC, ⛔ no whitespace collapse, ⛔ no line-ending rewrite of the stored body. Validation
(non-blank, length) runs on a **derived** view; the stored ciphertext decrypts to the exact string the family
sent. ⚠ The omission spans (MA6) are offsets into **that** string, so any normalisation silently shifts every
span. Pin it with a test that round-trips `"  पहली पंक्ति\r\n\r\n*दूसरी*  "` byte-for-byte.

### Trap 7 — ⚠ The mobile keyboard autocorrects by default
React Native `TextInput` autocorrects on iOS by default. Invariant (d) forbids correction *"beyond family explicit
opt-in"* and UX Pattern 6: *"auto-correction never silently changes characters"*. ⇒ `autoCorrect={false}` on
the narrative and alt-text inputs; spell-check underlines may stay (they suggest, ⛔ never change).

### Trap 8 — ⚠ Review-time refusals can become an oracle
A reviewer request for a submission in another Pariwar, an already-decided submission, or a superseded one must
each refuse with **one neutral code** in a fixed check order (scope first) — [[feedback_story_validate_footguns]]
#46. ⛔ Never a distinct "exists but not yours".

### Trap 9 — ⚠ `@twt/domain` (pg-touching) cannot be imported by Metro
[[project_contracts_domain_bundle_boundary]] — the paragraph/omission presenter that the mobile **preview** and the
later public render share must live in a **pure** package (`@twt/ui` headless presenter, per epic header C-1), ⛔
never in `@twt/domain`.

---

## ⚖️ Build decisions MA1–MA13 (PROPOSED — the author's; BigDev answers at Task 0.2; ⭐ = recommended)

Each passed the routing template's §0 gate: ⛔ none changes what the Trust discloses, owes, or bases legally.

### MA1 — Scope: build the writing, sending and reviewing; ⛔ NOT the public render
⭐ **(a) Split.** This row builds authorship → submission → Trust review → outcome to the family. The **public
render** (matrix fields, `RULED_TIER1_PUBLIC_EXCEPTIONS` entries, the Astro slot, the photo pipeline, take-down)
moves to a **new row** `11b-4a-family-memorial-public-render`, gated on **Q2 + Q3** and on 11b.5's components.
**Why:** the render needs Panel rulings this row does ⛔ not (narrative, portrait and kinship are Tier-1 by fact;
a public Tier-1 field is a ruling, never a code change — `matrix.ts`). The 11b.3 three-way split is the precedent.
⚠ Cost: an approved memorial appears nowhere until 11b.4a lands — hence the go-live fence (MA12).
Rejected — (b) one row, render blocked inside it: the story would sit half-done for an unknown time.

### MA2 — Kinship rows: ⛔ not collected in this row
⭐ **(a) Defer to 11b.4a/11b.5.** Kinship names living relatives (incl. children) for a purpose the Trust has ⛔
not yet ruled (Q2). ⚠ Collecting names before the purpose exists is purpose-creep; the Trust should hold ⛔ no
names it does ⛔ not yet know what to do with. ⇒ Epic step (d) is **deferred, recorded** (Task 9), ⛔ not dropped.
Rejected — (b) collect now, hold privately: data with ⛔ no settled use, and its disclosure wording would itself be
a Q2 dependency.

### MA3 — Drafts live ONLY on the phone until the family sends
⭐ **(a) MMKV, key `memorial-draft:v1:<poolId>`.** `-162` cl.3 makes **sending** the act of authorisation. A
server-side draft would put the family's unsent words in the Trust's hands **before** they authorised it. ⇒ ⛔
nothing reaches the server until Send. Debounced auto-save (≈800 ms) + a visible *"Saved on this phone"* line
(UX-DR50); restore on return with *resume / start again* (arch §4.13). **Named TTL: none — kept until the family
sends or discards** (fursat: ⛔ no deadlines). ⚠ Cost: a draft does ⛔ not follow the family to another phone —
said plainly on the screen. Rejected — (b) server drafts: pre-authorisation processing, and a new table.

### MA4 — Formatting: paragraphs only in v1; emphasis deferred
⭐ **(a)** A blank line separates paragraphs; ⛔ no markup, ⛔ no `*`/`_` interpretation, ⛔ no HTML. Epic (b)'s
*"emphasis"* is **deferred, recorded** (Task 9, trigger: a Story 0.9 conversation or a family request) — on a
phone keyboard, emphasis means teaching markup syntax to a grieving family. Text renders as text everywhere
(React Native `<Text>`; later Astro `{}` interpolation, ⛔ never `set:html`). Rejected — (b) the T&C
remark/rehype chain: a markdown dialect the family never asked for.

### MA5 — The authorisation is recorded ON the submission row, ⛔ NOT as a `consent_type`
⭐ **(a)** Columns `authorisation_copy_version` + `authorisation_locale` on `memorial_submissions`, resolved
against a domain registry `MEMORIAL_SUBMISSION_AUTHORISATION_VERSIONS` (claim-contact-agreement pattern: versioned,
⛔ never edited — a change is a new version). The row **is** the act. **Why ⛔ not `consent_records`:** recording on the row keeps the authorisation and the words
it authorises **indivisible** (one row, one txn, ⛔ no orphan either way), and the two retired values may ⛔ never be
reused (`-162` cl.2). ⚠ `-177`'s References gloss (*"⛔ no `consent_type` may be minted"*) sits on the nominee-bank
D5 ruling and is ⛔ not a general ban — `claim_contact_agreement` was minted after it (migration 0124) — so (b) is
rejected on **indivisibility**, ⛔ not on `-177`. ⚠ v1 wording is drafted on Q2 option A; if the
Panel rules otherwise, v2 is added **before go-live** (v1 is ⛔ never edited).
Rejected — (b) a new `consent_type`: splits the act from the words; (c) reuse `sahyog_vivran_publication`: forbidden.

### MA6 — The reviewer's three acts, and ⛔ no fourth
⭐ `memorial_review_action` pgEnum = **`approved` · `approved_with_omissions` · `not_approved`**. Omissions are
`[start, end)` **UTF-16 offsets into the verbatim body** (non-empty, in range, non-overlapping, sorted; ≥ 1 for
`approved_with_omissions`, 0 otherwise). `not_approved` and `approved_with_omissions` require a **reason code**
(`memorial_review_reason` pgEnum: `may_hurt_someone` · `names_a_child` · `against_the_law` · `please_talk_to_us`);
an optional **internal note** (Tier-1, ⛔ never shown to the family). The family sees **reason-code copy only**
(tone-reviewable; ⛔ no reviewer free text reaches a grieving family unreviewed). `please_talk_to_us` carries the
helpline — that is epic AC's *"request specific changes via empathetic helpdesk conversation"* (⛔ no staff-initiated
ticket exists; Task 9 records it). ⭐ **⛔ There is no "edit" act, ⛔ no text field in the review input, and the input
schema is `.strict()`** — the invariant is enforced by **absence**, ⛔ not by policy.
One decision per submission (unique index); a wrong decision is cured by the family's next version, ⛔ never by
overwriting. Rejected — a separate `return_for_changes`: with Q4 option A every outcome already allows a new version.

### MA7 — Who reviews: a new key `memorial.review`, held by `trustee_panel` (+ `super_admin`, which derives every key)
⭐ Epic: *"moderation by trustees"*; PRD FR-77: *"reviewed by trust before publish"*. Catalog `52 → 53` with a
header-log line (`permissions.test.ts` pins 68 → 69 keys). `trustee_panel` has a `pariwar` ceiling, so the key is live
for it (verified at the pin). ⚠ The launch-gate row (MA12) also checks that ≥ 1 person holds `trustee_panel` in the
Pariwar — otherwise the queue is unreachable. ⚠ Task 2 must prove the key is **live** for its holder — `trustee_panel`'s grants must resolve on
the `pariwar` dimension (a pariwar-dimension key is inert for district/state-ceiling roles; `roles.ts` already
records one inert grant, `member.moderate`) — [[feedback_story_validate_footguns]] #18.
Rejected — `pariwar_admin`: the epic names trustees.

### MA8 — The photo: one, optional, private, ⛔ never served publicly in this row
⭐ New port `MemorialPhotoStorage` in `packages/contracts/src/memorial/photo-storage.ts` (helpdesk-attachment
precedent — each purpose its own port) + adapters `packages/platform-adapters/src/memorial-photo-storage/
{gcs,in-memory,local-fs}.ts` + a private bucket. JPEG/PNG, ≤ 10 MiB (reuse the claim-document constants **by
value**, ⛔ not by import — the purposes differ). **Alt text required when a photo is present** (UX; family-authored,
Tier-1, verbatim). Reviewer views through a short-TTL signed URL. ⚠ **EXIF/GPS stripping and the public image
pipeline belong to 11b.4a** — ⛔ nothing here serves the bytes publicly. Upload happens **with Send** (MA3), ⛔
never before.

### MA9 — Versions, replacement, withdrawal
⭐ `memorial_submissions` is **append-only**: a new Send creates a new row with `supersedes_submission_id` → the
previous latest; **`UNIQUE (supersedes_submission_id)`** + a partial unique index on `(pool_id) WHERE
supersedes_submission_id IS NULL` make the chain linear under a race (23505 → one neutral retryable refusal;
SAVEPOINT if inside a larger txn — [[project_domain_limit_clamp_and_savepoint_retry]]). ⭐ **Every write (send /
withdraw / decide) takes `pg_advisory_xact_lock` keyed on the pool** (the 7.3 precedent) inside the scope tx, then
re-reads the chain — unique indexes alone would let "decided AND superseded" or "decided AND withdrawn" both commit
across three tables. ⛔ No `FOR UPDATE` on these tables (it needs UPDATE privilege; they are SELECT + INSERT only).
⚠ **Keyed on `pool_id`** because the Sahyog Vivran page is per drive and v1 is one death → one claim → one pool (the
resolver logs `> 1`); if that ever changes, the key question re-opens with it. A pending submission may be
**withdrawn by the family** (`memorial_withdrawals`, unique per submission) **only while it is with the Trust** —
⛔ nothing is published in this row, so post-publication take-down is **Q3 / 11b.4a**. The reviewer may ⛔ not decide
a superseded or withdrawn submission (Trap 8).

### MA10 — Status is DERIVED, ⛔ never stored
⭐ Pure `deriveMemorialStatus(latestSubmission, decision?, withdrawal?)` → `none` · `with_the_trust` · `approved` ·
`approved_with_omissions` · `not_approved` · `withdrawn`. ⛔ No mutable status column (the 10.20 posture). ⚠ ⛔
Never name a wire key `status` — `SAHYOG_VIVRAN_PROHIBITED_KEYS` bans it on the public surface and 11b.4a will
consume this shape; use `memorialState`.

### MA11 — ⛔ No events; audit lines only
⭐ The append-only tables **are** the record; ⛔ no consumer of a `memorial.*` event exists
([[feedback_no_premature_package]]). Audit actions: `memorial.submission.create` · `memorial.submission.withdraw`
· `memorial.review.read` (each Tier-1 decrypt for a reviewer) · `memorial.review.decide`. ⛔ No PII in audit
(hash only). Rejected — events: an unconsumed registry entry and a financial-truth-gate hazard (Trap 5).

### MA12 — The go-live fence: a launch-gate row, ⛔ not a feature flag
⭐ **(a)** Add a row to `docs/launch-gate-inventory/inventory-roster.md`: **Row 40** in the roster's `### Row N — \`slug\`` block shape (the Row 39 precedent — gate_name, owner,
closure_criteria, current_status, …): *"Family memorial authorship ⛔ not enabled in production until Q1, Q2 and Q4
are ruled, AC4's final wording version is in force, 11b.4a has landed, the AC14 tone review is recorded, and ≥ 1
person holds `trustee_panel` in the Pariwar."* ([[project_not_in_production_merge_is_not_golive]] — a go-live fence does ⛔ not
block a merge.) Rejected — (b) a `feature_flag_versions` flag: needs a `governance_boundary.yaml` `allow` entry
with an ADR ([[feedback_story_validate_footguns]] #50) for a fence that a launch-gate row already provides.

### MA13 — May a family send again after `approved`?
⭐ **(a) No, in this row** — `canSend` = `memorialState ∈ {none, with_the_trust, approved_with_omissions,
not_approved, withdrawn}`. Changing a memorial the Trust has approved belongs with what is published (Q3 / 11b.4a);
the family is pointed to the helpline. Rejected — (b) allow, reviewed fresh: which version the page shows meanwhile is
a render question this row cannot answer.

---

## Acceptance Criteria

### AC0 — Governance before code
**Given** MA1–MA13 as answered at Task 0.2
**Then** ONE author-commit decision entry (`-389` or next free) records them, the two pgEnum mints
(`memorial_review_action`, `memorial_review_reason`), the permission key `memorial.review` (catalog 52 → 53), and states the §0 line ("changes no disclosure, no
obligation, no basis; supersedes no clause; routes Q1–Q4") — committed **alone**, before any `packages/` or `apps/`
change; **and** a records commit adds the `epics.md` **SECTIONED** header block on `### Story 11b.4`, annotates the
`-162` open follow-up *"carries clause 3 into its own ACs and Tasks"* as **SCHEDULED at 11b.4 AC4/Task 4** (⛔ not
"closed"), mints the row `11b-4a-family-memorial-public-render: backlog` if MA1(a) is chosen, and moves the row
`ready-for-dev → in-progress` via a safe ledger prepend.

### AC1 — The family reaches the surface only when there is a drive to write about
**Given** a member session (the Ravi-mode session-as-deceased; GET is ⛔ not step-up-gated, mirroring
`apps/api/src/modules/nominee-console/routes.ts`)
**When** `GET /api/v1/member/memorial` runs
**Then** `resolveMemorialDrive` returns the pool whose originating claim's `deceased_member_id` is the session
member and whose `current_state ∈ SAHYOG_VIVRAN_VISIBLE_POOL_STATES` (deterministic tie-break + `> 1` log, as
the console); `null` ⇒ `200 { memorial: null }` and the mobile entry renders **nothing** (⛔ no placeholder)
**And** the response carries `memorialState` (MA10); the latest submission's verbatim `body` + `altText` +
`omissions`; the reason code (⛔ never the internal note); `canSend` (MA13) and `canWithdraw` (= `with_the_trust`)
**And** it carries `authorisation: { copyVersion, text }`, resolved by the server for the request locale — the
phone ⛔ never holds the registry (`@twt/domain` is ⛔ not importable by Metro — Trap 9)
**And** a home entry in `apps/mobile/app/(tabs)/index.tsx`, next to `<ClaimProxyFlowEntry />`, links to
`/(memorial)` **only** when `memorial` is non-null — ⛔ no badge, ⛔ no count, ⛔ no reminder. ⚠ `(tabs)/shradhanjali.tsx`
is a **live tab on P0-5 sample data** and is ⛔ not the entry.

### AC2 — A grief-paced, one-decision-per-screen flow
**Given** the `(memorial)` route group
**Then** the screens are: **intro** (*"Would you like to share a few words about {name}?"* — with *"Not now"* as
an equal choice and a no-name variant when the name resolver returns null) → **write** → **photo (optional)** →
**preview** → **send** (AC4) → **sent / outcome**
**And** ⛔ no progress bar, ⛔ no step counter, ⛔ no percentage, ⛔ no "incomplete" language, ⛔ no deadline anywhere
(the namespace joins `scope.copy_globs`, so every tone rule, `fursat-pressure` included, scans it — AC14)
**And** every screen has an always-visible *"Save and come back"* in the sticky header (UX-DR50/56); 44pt targets;
`lang="hi-IN"`-equivalent text handling (Pattern 6) with **`autoCorrect={false}`** (Trap 7)
**And** skipping is complete: a family that never writes sees ⛔ nothing further and the Sahyog Vivran page is ⛔
not changed.

### AC3 — The draft stays on the phone (MA3)
**Then** text, alt text and the local photo URI auto-save to MMKV `memorial-draft:v1:<poolId>`; reopening offers
*resume / start again*; a vanished local photo URI degrades to "no photo" with a gentle line (⛔ never an error);
the draft is cleared **only** after a `201` from Send; the screen says the draft is kept on this phone.

### AC4 — ⭐ The permission is given AT SEND, in this surface (`-162` cl.3)
**Given** the preview screen
**When** the family presses Send
**Then** the screen shows, **immediately above the Send button and in the family's locale**, the authorisation
text the server returned in AC1 (`authorisation.text`, from the current `MEMORIAL_SUBMISSION_AUTHORISATION_VERSIONS`
entry) — what the Trust will do with the words and photo, that the Trust reads it first, may leave a sentence out but
never changes the words, that a child's name will be left out (Q2 option A as put), and (per Q2's ruling) where it
will appear
**And** the client sends **only** `{ authorisationCopyVersion, authorisationLocale }` — the server resolves the
text, refuses a non-current version with one dignified `memorial.authorisation_outdated` (the app reloads the text)
**And** the authorisation columns are written **in the same transaction** as the submission row (indivisible)
**And** ⛔ no checkbox, ⛔ no box on the claim screen, ⛔ no `consent_records` row, ⛔ no reuse of
`sahyog_vivran_publication` / `in_memoriam_listing`, ⛔ no question about the member's name or the nominee's data
(`-160` cl.3/cl.6, epic scope fence)
**And** the v1 wording is marked in the registry's doc-comment as **drafted on Q2 option A — final only after the
ruling** (MA5).

### AC5 — The family's words are stored verbatim and are reconstructible (the load-bearing invariant)
**Then** `memorial_submissions.body_ciphertext` (Tier-1 `piiColumn(1, …)`) and `alt_text_ciphertext` decrypt to
the **exact** string received (Trap 6 round-trip test)
**And** `memorial_review_decisions` stores omissions as offsets **separately** — the verbatim body is ⛔ never
rewritten, ⛔ never copied into a "published" column
**And** a pure `reconstructMemorial(body, omissions)` in `@twt/ui` yields `{ original, asApproved }` where
`asApproved` replaces each omitted span with the explicit notation copy key (⛔ never silent removal) — a future
reviewer can always see what the family wrote and what the Trust left out
**And** both tables are append-only (SELECT + INSERT grants; ⛔ no UPDATE/DELETE grant; RLS by `pariwar_id`).

### AC6 — ⛔ No AI, ⛔ no rewriting, anywhere in the flow
**Then** the review input schema is `.strict()` with ⛔ no text-carrying field (a test posts `body`, `text`,
`narrative` → 400)
**And** ⛔ no module in this story imports an LLM/AI SDK — a test asserts `apps/api`, `apps/admin`, `apps/mobile`,
`packages/domain` and `packages/ui` `package.json` dependency maps contain ⛔ no `@anthropic-ai/*`, `openai`,
`@google/generative-ai`, `@google/genai`, `langchain*`, `ai` (Vercel) — planted-violation teeth recorded
**And** ⛔ no translation, ⛔ no summarisation, ⛔ no transliteration, ⛔ no grammar or tone transform exists on
any path (a v2 AI feature would be an explicit family opt-in — recorded in Dev Notes, ⛔ not built).

### AC7 — Send: validation that never punishes
**Given** `POST /api/v1/member/memorial/submissions` (multipart) behind `requireMemberSession` +
`requireMemberStepUp(deps, 'claim_handover')`
**Then** it re-resolves the drive under the MA9 advisory lock (⛔ nothing from the client is trusted except text, alt text, photo,
version, locale), requires a non-blank body (blank = whitespace-only **on a derived view**) of ≤ 6,000 Unicode code
points (MA-default; BigDev may change at Task 0.2), a photo ⇒ alt text non-blank ≤ 300 code points, JPEG/PNG ≤ 10 MiB
**And** every refusal is a Pattern-4 message (what happened · what to do · helpline), ⛔ never "Error/Invalid/
Failed", `caution` token, `aria`-linked, works at 360 px; a refusal ⛔ never clears the draft
**And** order: resolve → validate → `put` photo → `withCompensatingAudit` (intent line first, then the single txn:
advisory lock + submission row + authorisation columns + supersede link; a compensating line on failure) →
`201 { memorialState: 'with_the_trust' }`; a photo
`put` whose txn fails is deleted best-effort and logged (anonymous-log convention)
**And** a second Send while one is with the Trust **supersedes** it (MA9); a race resolves to one 23505 →
`409 memorial.try_again` (neutral).

### AC7a — The handover code is asked for at Send, ⛔ never at the start
**Given** the elevation lasts 5 minutes and a family may write over days
**When** Send (or Withdraw) returns `403 auth.step_up_required`
**Then** the app runs the handover OTP through `apps/mobile/lib/use-handover-otp.ts` (⛔ never `useStepUpGate` — that
sends to the session member's phone) and **retries with the draft and photo intact**; the no-nominee result routes to
the helpline with Pattern-4 copy; the code is ⛔ never asked for before the family has written anything.

### AC8 — Withdraw before review
**Given** `POST /api/v1/member/memorial/submissions/:id/withdraw` (same guards)
**Then** allowed only for the latest submission while `with_the_trust`; anything else → one neutral 404
**And** the outcome screen afterwards offers *"Write again"* with ⛔ no judgement.

### AC9 — The Trust's review queue and decision (admin)
**Given** a staff session holding `memorial.review` in the Pariwar
**Then** `GET /api/v1/p/:pariwarId/memorial-reviews` lists submissions `with_the_trust` (oldest first, `clampLimit`,
⛔ no body in the list — name of the deceased + sent date only)
**And** `GET …/memorial-reviews/:submissionId` decrypts body + alt text (one `memorial.review.read` audit line per
decrypt) and returns a 5-minute signed photo URL
**And** `POST …/memorial-reviews/:submissionId/decision` accepts `{ action, omissions?, reasonCode?, internalNote? }`
(`.strict()`), validates MA6's rules, writes ONE decision row (unique per submission) + `actor_display` snapshot
through `withCompensatingAudit` (intent line, then the txn under the MA9 advisory lock)
**And** refusals follow Trap 8: out-of-scope / unknown / superseded / withdrawn / already-decided → **one** neutral
`404 memorial_review.not_found`, checked scope-first; missing key → 403 via the standard hook
**And** the admin screen (`apps/admin/src/modules/memorial-review/`) shows the verbatim text with **sentence-level**
selection for omissions (a client-side sentence splitter is a UI aid only — the server validates offsets, ⛔ not
sentences) and ⛔ no editable text control anywhere on the page.

### AC10 — The family learns the outcome, gently, in the app (Q4 option A)
**Then** the outcome screen shows: `approved` → the text as approved; `approved_with_omissions` → the text with the
explicit notation where words were left out + the reason copy; `not_approved` → the reason copy + helpline +
*"Write again"* (prefilled from **their own last sent text**, which they may keep or change)
**And** ⛔ no SMS, ⛔ no push, ⛔ no email (Trap 4); the internal note ⛔ never reaches the wire (a contract test)
**And** the approved copy ⛔ must not claim the memorial is already visible anywhere — it says it **will** appear on
the Sahyog Vivran page (true only once 11b.4a lands — MA12).

### AC11 — Presenter shared by preview and (later) the public page
**Then** `@twt/ui` exports pure `memorialParagraphs(body)` (blank-line split, CRLF-aware, ⛔ no trimming of the
family's text inside a paragraph) and `reconstructMemorial` (AC5); the mobile **preview** renders through them
**And** a test proves preview output == outcome output for the same input (UX: *"preview matches public output
exactly"* — 11b.4a must reuse the same presenter, recorded in its deferred-work trigger).

### AC12 — Copy: Hindi-first, real `t()`, both locales
**Then** a new `memorial` namespace in `packages/i18n/locales/{hi,en}/memorial.json`, registered in
`KNOWN_NAMESPACES` **and** the `catalogs` map + imports (`packages/i18n/src/catalog.ts` — both enforced by
`packages/i18n/tests/catalog-registration.test.ts`), parity green (`pnpm i18n:check`)
**And** every interpolated key has a **real-`t()`** test in hi and en ([[feedback_stub_must_call_not_transcribe]]);
`t()` throws on a missing param ⇒ the no-name intro is a **separate key**, ⛔ never `{name}` with an empty string
**And** Hindi numerals ⛔ never appear in dates/counts (Latin digits); the family's own text is ⛔ never touched
**And** admin copy follows the admin module's `i18n-en.ts` pattern.

### AC13 — Accessibility
**Then** WCAG 2.1 AA on the mobile flow: labels on every input, error text linked to its field, alt-text field
labelled as describing the photo for people who cannot see it, focus order follows reading order, 44pt targets,
TalkBack-Hindi pass recorded **or** recorded as outstanding ([[feedback_record_unattested_no_backfill]]).

### AC14 — Copy review is RECORDED, ⛔ not assumed
**Then** `microcopy.yaml` `scope.copy_globs` gains the `memorial` namespace and the `fursat-pressure` rule covers it
(`pnpm microcopy:check && pnpm microcopy:test` green, with a planted fursat frame — e.g. "hurry up" / "जल्दी कीजिए" /
"50% complete" — turning it red, recorded). ⚠ The rule has ⛔ no `deadline` arm and rules have ⛔ no per-rule scope;
widening it would fire on shipped `claim.json`/`contribution.json` copy. ⇒ "no deadline" is pinned by the Task 6.4
source-scan test, ⛔ not by widening a shared rule
**And** a row in `docs/tone-review-checklist.md` *"Ad-hoc copy-review record"* names the namespace and the
authorisation text, recorded **⚠ UN-ATTESTED** until a **non-author** human signs it (who/when/what); the agent ⛔
never self-attests
**And** tone review is ⛔ **never** applied to the family's own words (invariant (f)).

### AC15 — The friction budget is DISPOSED, ⛔ not skipped
**Then** `friction-budget.md` gains a **row**: payer = the family (nominee), protects = *the family's words reach
the page as they wrote them, and only with their permission*, `optional`; committed **before** `pnpm friction:check`
is run (it diffs `base...HEAD` — a pre-commit run passes vacuously).

### AC16 — Recorded risks, ⛔ not faked
**Then** `deferred-work.md` gains, under a *"Deferred from: story 11b-4 …"* heading, each with a trigger:
(1) **public render** → row `11b-4a` (Q2, Q3; EXIF stripping; matrix fields + Tier-1 exceptions; same presenter;
`s-maxage=300` take-down latency); (2) **kinship capture** (MA2) → 11b.4a/11b.5; (3) **emphasis** (MA4);
(4) **staff-initiated helpdesk conversation** for `please_talk_to_us`; (5) **non-nominee authors** (Q1 B/C);
(6) **formal family appeal** (Q4 B); (7) **family-data export/erasure** — the author is ⛔ not a data subject of any
export route, and ⛔ no RTBF path reaches the two tables; (8) **Story 0.9 un-attested** — every Pattern-4 /
grief-pacing claim here is **⛔ not validated against a family conversation** (`_bmad-output/research/
p0-2b-bereaved-spouse.md` holds only `_AWAITING_CONVERSATION_CONDUCT_` placeholders); (9) **`disabled-T+90`** —
when the account state machine is built it must ⛔ not cut the family off from this surface (epic: *"no deadlines"*);
(10) **staff-assisted authoring** on the family's instruction (Q1 option A as put to the Panel); (11) **`@twt/ui` in
`apps/public`** — `apps/public` does ⛔ not depend on `@twt/ui` today (epic header C-1), so 11b.4a's reuse of the
AC11 presenter needs that dependency first
**And** the existing open item (title verbatim) *"⛔ FOUR PRODUCERS THE EPIC AC NAMES THAT DO ⛔ NOT EXIST — the ruled posture is
RENDER NOTHING"* is **annotated** (family story: producer BUILT at 11b.4; render still nothing until 11b.4a) — ⛔
not closed, ⛔ not deleted.

### AC17 — Nothing else moves
**Then** ⛔ no change to: the claim consent screen or `dpdpa-consent*` files; `consent_records` or its enum;
`sahyog-vivran-read.ts` beyond importing the visible-states constant; the public matrix YAML / `matrix.ts` /
`apps/public`; `member_moderation_*` or either `MODERATION_ACTIONS`; `resolveActiveNomineePool`; the Shradhanjali
prototype components
**And** `git diff --name-only <pin>..HEAD -- apps/public packages/contracts/public-pages` is **empty** at review.

### AC18 — Closes only on green, and says so precisely
**Then** `pnpm ci:local` passes after the **last** commit — on :5433 only if 6-36d's applied `0180` is reconciled
with this branch's journal, otherwise on a fresh DB on **:5434** (the 6.35 precedent, ledger `2026-10-23s`) (the job count recorded,
e.g. "N/N"), integration included; the migration applies on the test DB; the Completion Notes say which gates ran
and which were vacuous; the row moves `in-progress → review` only then.

---

## Tasks / Subtasks

- [ ] **Task 0 — Re-verify, then get the build decisions answered** (AC0)
  - [ ] 0.1 `git fetch origin`; `git merge-base --is-ancestor d87d047a origin/main`; rebase the branch onto
        `origin/main`; `git diff --name-only d87d047a..origin/main -- packages apps scripts` — if any file named in
        this story moved, re-derive its cite. Re-check every NUMBER in the header comment across **all branches and
        worktrees** (`git for-each-ref` + each worktree's working copy). Run the four PREFLIGHT STOP checks.
  - [ ] 0.2 Put MA1–MA13 to BigDev (⭐ = recommended) and record each answer verbatim in the Dev Agent Record.
        ⚠ If MA1 is answered (b), STOP — the story must be re-planned.
  - [ ] 0.3 Ask BigDev whether the routing note has been **sent**; record the answer (⛔ never assume —
        [[feedback_shown_to_panel_means_sent]]). If the Panel has ruled, transcribe first and re-read AC4/AC10.
- [ ] **Task 1 — Governance commit, alone** (AC0)
  - [ ] 1.1 `### Decision 2026-10-23-389` (or next): **Author-commit (BigDev)** — MA1–MA13 as answered; the enum
        mints + permission key (with "⛔ not covered by `-210` cl.2"); §0 line; **Not covered:** Q1–Q4 (routed, by note path).
        Insert under the `Newest first` separator. If the decision-log write is refused, ask BigDev once
        ([[project_decision_log_writes_user_inserted]]).
  - [ ] 1.2 Commit **only** `.decision-log.md`: `governance: Decision 2026-10-23-389 — AUTHOR-COMMIT (BigDev): 11b.4 build decisions …`.
        Check `git branch --show-current` first.
  - [ ] 1.3 Records commit: `epics.md` SECTIONED block on `### Story 11b.4` (MA1 split, MA2 kinship deferral, Trap 3,
        and the 10.10 correction); `-162` follow-up annotation; if MA1(a), add the row
        `11b-4a-family-memorial-public-render: backlog` after the 11b-4 row; ledger prepend (safe pattern —
        [[project_sprint_status_safe_prepend]]) + row → `in-progress`; verify YAML with a duplicate-key loader and
        `^last_updated:` count == 1.
- [ ] **Task 2 — Schema, migration, RBAC** (AC5, AC9, MA6–MA9)
  - [ ] 2.1 `packages/domain/src/schema/memorial_submissions.ts`, `memorial_review_decisions.ts`,
        `memorial_withdrawals.ts` (+ `schema/index.ts`); pgEnums generated from domain tuples in
        `packages/domain/src/memorial/vocab.ts`. Body + alt text + internal note via `piiColumn(1, 'memorial')` (`packages/domain/src/encryption/column.ts` —
        `fieldClass` is a free marker, ⛔ no registry; the column is identity at the driver, so encrypt/decrypt in the
        service layer with `encryptTier1` / `decryptTier1`, as `claim_contacts` does).
  - [ ] 2.2 Hand-authored `packages/domain/migrations/0181_memorial-authorship.sql` (⚠ 0180 is 6-36d's — re-check) (idempotent; enums; tables; FKs to
        `pools`, `claims`, `members`; the two unique indexes of MA9; unique `(submission_id)` on decisions and
        withdrawals; CHECKs: omissions JSONB array shape, reason required unless `approved`); `_journal.json` entry
        with a `when` later than every journal entry on `origin/main` **and** on 6-36d's branch ([[project_sibling_migration_when_order_shared_db]]); ⛔ never `db:generate`.
  - [ ] 2.3 RLS policies `packages/domain/src/policies/memorial-*-rls.ts`; GRANT SELECT, INSERT only.
  - [ ] 2.4 `memorial.review` in `permissions.ts` (52 → 53, header log), granted to `trustee_panel` in `roles.ts`;
        update the pinned tests (`packages/domain/tests/rbac/permissions.test.ts` 52→53, 68→69 keys; `roles.test.ts`);
        **prove it is live** for `trustee_panel` on the `pariwar` dimension (MA7).
- [ ] **Task 3 — Domain** (AC1, AC5, AC7–AC9)
  - [ ] 3.1 `packages/domain/src/memorial/{vocab,status,resolve,submission,withdrawal,review,authorisation-copy,errors,index}.ts`.
        `resolveMemorialDrive` imports `SAHYOG_VIVRAN_VISIBLE_POOL_STATES` (Trap 2, Trap 5).
  - [ ] 3.2 `deriveMemorialStatus` (pure, exhaustive `never` arm); omission validator (pure).
  - [ ] 3.3 `MEMORIAL_SUBMISSION_AUTHORISATION_VERSIONS` v1, hi + en, doc-comment "drafted on Q2 option A".
  - [ ] 3.4 Unit tests: status table; omission edge cases (empty, overlap, unsorted, out of range, surrogate-pair
        boundary — an offset splitting a surrogate pair is refused); verbatim round-trip (Trap 6).
- [ ] **Task 4 — ⭐ The point-of-submission authorisation** (AC4 — `-162` cl.3)
  - [ ] 4.1 Server resolves the version; refuses non-current; writes the two columns in the submission txn.
  - [ ] 4.2 Mobile renders the resolved text above Send in the active locale; sends only version + locale.
  - [ ] 4.3 Tests: no `consent_records` row is written by Send (integration count-delta on the subject, explicit);
        a grep test that ⛔ neither retired enum value appears in any new file; the authorisation and the row commit or
        roll back together.
- [ ] **Task 5 — API** (AC1, AC6–AC10)
  - [ ] 5.1 `packages/contracts/src/memorial/{dto,photo-storage,index}.ts` (`.strict()` DTOs; `memorialState`, ⛔
        never `status`); adapters `packages/platform-adapters/src/memorial-photo-storage/`; wire in `context.ts` +
        `deps.ts` (`MEMORIAL_PHOTO_BUCKET`, the existing bucket-env shape); export the adapters from
        `packages/platform-adapters/src/index.ts`; add the bucket under `infra/gcp`; add the storage to
        `apps/api/tests/integration/_setup.ts` (helpdesk-attachment precedent); SDK methods in
        `packages/api-client/src/index.ts` (mobile calls go through it); routes in
        `packages/contracts/scripts/emit-openapi.ts` (`ci:local` runs `contracts-determinism`).
  - [ ] 5.2 `apps/api/src/modules/memorial/{index,routes,handlers}.ts` (member) + `register…Module` in
        `apps/api/src/server.ts` — mirror the nominee-console route's read
        guard for GET; step-up for writes.
  - [ ] 5.3 `apps/api/src/modules/memorial-review/{index,routes,handlers}.ts` (admin) + registration — `requirePermissionHook(deps,
        'memorial.review', { dimension: 'pariwar' })`; Trap 8 ordering.
  - [ ] 5.4 Integration specs (`apps/api/tests/integration/memorial/`, :5433, rollback isolation, explicit values):
        happy path; supersede race (two concurrent Sends → one 409); withdraw rules; decision rules; cross-Pariwar
        404; no-key 403; no-step-up 403; internal note absent from member GET; review input with `body` → 400.
  - [ ] 5.5 AC6 dependency-map test with planted-violation teeth (Debug Log).
- [ ] **Task 6 — Mobile** (AC1–AC4, AC7, AC8, AC10–AC13)
  - [ ] 6.1 Find the Ravi-mode home screen; add the conditional entry (AC1).
  - [ ] 6.2 `apps/mobile/app/(memorial)/{_layout,index,write,photo,preview,outcome}.tsx`;
        `apps/mobile/components/memorial-authorship/`; `apps/mobile/lib/{memorial-api,memorial-draft,memorial-i18n}.ts`.
  - [ ] 6.3 `@twt/ui` `memorialParagraphs` + `reconstructMemorial` (AC11) with tests; preview == outcome test.
  - [ ] 6.4 Node tests (no RN mount harness): draft lib (mock `lib/mmkv`), i18n real-`t()` hi/en, a source scan
        that `autoCorrect={false}` is on both inputs, and ⛔ no progress/step/percent/deadline strings in the
        `memorial` namespace.
  - [ ] 6.5 The handover step-up leg (AC7a) via `use-handover-otp.ts`; test the retry keeps the draft + photo.
  - [ ] 6.6 Accessibility pass (AC13); TalkBack-Hindi recorded **or** recorded ⚠ UN-ATTESTED.
- [ ] **Task 7 — Admin review screen** (AC9)
  - [ ] 7.1 `apps/admin/src/modules/memorial-review/` (list + detail + decision); sentence-selection aid; ⛔ no
        editable text control (a test asserts no `<textarea>`/`contenteditable` bound to the body).
- [ ] **Task 8 — Copy, tone, friction, launch gate** (AC12, AC14, AC15, MA12)
  - [ ] 8.1 `memorial` namespace hi/en; `KNOWN_NAMESPACES`; `microcopy.yaml` glob + fursat scope; planted-string teeth.
  - [ ] 8.2 Tone-review checklist row, ⚠ UN-ATTESTED.
  - [ ] 8.3 Friction-budget row; commit; then `pnpm friction:check`.
  - [ ] 8.4 Launch-gate inventory **Row 40** (MA12).
- [ ] **Task 9 — Records** (AC16)
  - [ ] 9.1 `deferred-work.md` items (1)–(11) + the FOUR-PRODUCERS annotation.
- [ ] **Task 10 — Verify and close** (AC17, AC18)
  - [ ] 10.1 AC17 diff check; eslint per package (per-package cwd); `tsc --noEmit`; `pnpm --filter @twt/i18n test`;
        microcopy; friction; `pnpm ci:local` with `DATABASE_URL='postgresql://twt_dev_app:devpass@127.0.0.1:5433/twt_dev?sslmode=disable'`
        after the **last** commit; record the job count.
  - [ ] 10.2 Story file: File List, Completion Notes (which gates were vacuous), Change Log; row → `review` with a
        ledger entry.

---

## Dev Notes

### The code path, at `d87d047a`
- **Principal:** member session (deceased's account) + `requireMemberStepUp(deps, 'claim_handover')`
  (`apps/api/src/modules/auth/member/member-step-up.gate.ts`; precedent use `apps/api/src/modules/reconciliation/routes.ts`).
- **Drive:** `pools` ⨝ `claims` on the originating claim; states from `SAHYOG_VIVRAN_VISIBLE_POOL_STATES`.
- **Name for the intro prompt:** the session member IS the deceased — read their own name and render it through
  11b.21's form (`apps/api/src/modules/kyc/name-render.ts`); the public `namePublicationAuthorised` gate does ⛔ not
  apply to the family's own screen. ⛔ Never mangle a name ([[feedback_never_mangle_member_names]]); `null` → the
  no-name key.
- **Upload pattern:** `apps/mobile/lib/use-death-certificate-upload.ts`; server multipart in
  `apps/api/src/modules/claims/claims.documents.handlers.ts` (lifecycle guard → MIME/size → `put` → txn).
- **Point-of-submission precedent:** `packages/domain/src/claim/claim-contact-agreement-copy.ts`,
  `claim/claim-contact-persist.ts`, `apps/api/src/modules/claims/claims.contact.handlers.ts`.
- **Write-path obligations** (header of `claims.dpdpa-consent.handlers.ts`): LOCKED re-read, audit-or-throw, server
  resolves copy, ⛔ no PII on audit.
- **Append-only record shape:** `packages/domain/src/schema/member_moderation_actions.ts` (grants, Tier-1 rationale,
  `actor_display`).
- **Scope tx:** reads that need RLS stay inside `openScopeTx` — ⚠ moving one to the service pool is green in CI and
  dead in production ([[feedback_story_validate_footguns]] #56).

### Rulings checked and found to leave this story unchanged
`-159` (D4(b) — the de-authorised drive tick-box; ⛔ not this data class) · `-165` / `-176` (nominee-bank Tier-1;
11b.3 D-rulings) · `-190`/`-191` (bank coordinates withdrawn) · `-210` (enum delegation — ⛔ does not reach MA6/MA7) ·
`-223` (⛔ no withheld-name case).

### Load-bearing invariant families to self-check
Verbatim storage (Trap 6) · no-edit-by-absence (AC6) · `-162` cl.3 at Send (AC4) · financial-truth gate file names
(Trap 5) · Metro bundle boundary (Trap 9) · oracle-free refusals (Trap 8) · fursat copy (AC14) · Latin numerals ·
`.strict()` responses parsed by the client — tighten INPUT schemas only ([[feedback_story_validate_footguns]] #29).

### Testing standards
Vitest everywhere; `pnpm --filter <pkg> test <name>` (⛔ no `--`); live-DB on :5433 ([[project_prepush_hook_inherits_5432]]);
separate transactions where ordering by `now()` matters ([[project_db_clock_ordering_tests_tie]]); mobile node-only
tests with `lib/mmkv` mocked and RTL `cleanup` ([[project_mobile_vitest_and_expo_install_traps]]); every new
regex/gate gets a planted violation recorded in the Debug Log; integration assertions use explicit values, ⛔ never
counts over shared fixtures.

### Previous-story intelligence
- **11b.22 / 11b.20:** friction-budget disposition was missed once and fixed late — AC15 makes it explicit; stubs
  transcribe — real `t()` legs only; stale prose — grep every phrasing.
- **11b.3 / 11b.3b:** the family-story slot is deliberately **empty** (*"render nothing, no placeholder, no 'coming
  soon'"*) — this row must ⛔ not touch it (AC17); field counts on the matrix surface are pinned
  (`scrape-test.spec.ts`), another reason the render is its own row.
- **6.35:** decision ids are taken on other branches — re-check at Task 0.1 and immediately before Task 1.
- **9.1:** the console's "Open research risk (do not silently resolve…)" precedent for Story 0.9 — AC16 (8) follows it.

### References
- `_bmad-output/planning-artifacts/epics.md` — `### Story 11b.4` (binding block + ACs); Epic 11b header rows **C-1**,
  **C-4**; `### Story 11b.3` (family story in the public shell), `### Story 11b.5`, `### Story 11b.6`.
- `.decision-log.md` — `#decision-2026-08-28-162` cl.2/3/5; `#decision-2026-08-28-160` cl.3/5/6;
  `#decision-2026-09-02-177` (References gloss); `#decision-2026-09-08-210` cl.2; `#decision-2026-09-19-223`.
- `_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-10-23-11b4-family-memorial-four-questions.md` (Q1–Q4).
- `_bmad-output/planning-artifacts/ux-design-specification.md` — `<MemorialAuthorshipSurface>` (§Nominee Surfaces),
  `<MemorialRecord>`, `<PortraitFrame>`, Journey 4, UX-DR50/55/56, Patterns 4/5/6, Shradhanjali grammar, accessibility.
- `_bmad-output/planning-artifacts/prds/prd-TWT-2026-05-22/prd.md` — **FR-77** (⚠ the UX spec's "FR-20" is a UX-local
  number; PRD FR-20 is the _daan engine), FR-68, FR-69, FR-74, FR-97.
- `_bmad-output/planning-artifacts/architecture.md` — public page composition; §2.7 PII tiers; minor-data handling;
  §4.11.2 media budget; §4.13 form drafts; §4.15 actor adaptation.
- `docs/tone-guide.md`, `docs/tone-review-checklist.md`, `friction-budget.md`, `microcopy.yaml`,
  `docs/launch-gate-inventory/inventory-roster.md`.

### ❓ Questions for BigDev (do ⛔ not block the story; MA1–MA13 are written as defaults)
1. **Send the routing note?** Q1, Q2 and Q4 gate go-live only; the build can start now.
2. **MA1 split** — agree to mint `11b-4a-family-memorial-public-render` at Task 1.3?
3. **MA2** — defer kinship (epic step (d)) rather than collect names before Q2?
4. **MA4** — paragraphs only, emphasis deferred?
5. **AC7 limits** — 6,000 code points for the story, 300 for alt text?
6. **MA13** — may a family send a new version after an `approved` memorial?

---

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

- Ultimate context engine analysis completed — comprehensive developer guide created (`bmad-create-story`, 2026-10-23, at `d87d047a`).

### File List

## Change Log

| Date | Version | Change |
|---|---|---|
| 2026-10-23 | v0.1 | Created via `bmad-create-story` at `d87d047a` in worktree `.claude/worktrees/11b-4-…`: `backlog → ready-for-dev`. Panel routing note drafted (Q1–Q4, ⛔ not sent). Build decisions MA1–MA13 proposed. |
| 2026-10-23 | v0.2 | Fresh-context validation applied before commit: handover step-up leg (AC7a), server-supplied authorisation text, fursat test that can fail, advisory-lock concurrency, migration `0181` (0180 is 6-36d's), Q4 in the go-live fence, audit order per `withCompensatingAudit`, missing wiring (api-client, server registration, openapi, infra, test setup, catalog map), name source, governance re-characterised (`-162` cl.5 / `-223` author-commit; `-177` ⛔ not a general ban). |
