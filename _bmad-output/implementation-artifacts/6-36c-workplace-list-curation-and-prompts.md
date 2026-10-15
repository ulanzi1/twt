---
baseline_commit: 2581c514
---

<!--
⭐ CUT 2026-10-14 by `bmad-create-story 6.36` (SW1). ⭐ THE RECORD is 6.36a's file (`6-36a-member-workplace-and-posting-history.md`).
This file BUILDS **SW9's staff half** (the Super Admin's list; the Pariwar Admin's SUGGESTION and the member's confirm-or-refuse route) and
**SW16 (2)–(5)** (the home cards and the invite, the transfer prompt, the replace prompt, the campaign). Where a summary here and 6.36a's text disagree, 6.36a's text is the record.
⚠ Before Task 1: `git diff --name-only 2581c514..HEAD -- packages apps scripts infra` — re-read any cited file that moved.

STATUS: `backlog` — flips to `ready-for-dev` when 6.36a AND 6.36b are `done` (⭐ `2026-10-14-332`: wave 2, in parallel with 6.36). Migration `0164`
(`when` `1794195600008`); test database `twt-test-pg-b` (`:5434`), re-migrated from `main` first; worktree `.claude/worktrees/6-36c`;
merges to `main` LAST (after 6.36).
⭐ 2026-10-15 (`2026-10-15-338`, `08932f43` — the lines above are kept as written): starts only when row 6-36 is `done` (AC0) — ⛔ not in
parallel with it; this file is re-validated against `main` then and flips to `ready-for-dev` only after that; the SHARED test databases
(`twt-test-pg`, `:5433`, and `:5432`) — ⛔ no longer `twt-test-pg-b`; the migration number and the worktree are unchanged.
GLYPH REGISTER, ADDRESSING RULE, LETTERS: as 6.36a.
-->

# Story 6.36c: Keeping the Lists Full — the Super Admin's Office List, a Pariwar Admin Suggests a Workplace the Member Confirms, and the Prompts That Ask Members to Fill Theirs In `[SURFACE]`

Status: backlog

> ⭐⭐ **WHAT THIS PART IS.** The school list comes from an import (6.36a); offices are ⛔ not in it, and ~11k Bihar schools are missing
> from the only bulk copy found (SF1). So: the SUPER ADMIN keeps an office list and adds any missing school; a PARIWAR ADMIN suggests a
> listed entry for a member's *"my workplace isn't listed"* and the MEMBER confirms it (⛔ never a staff act that sets or creates a
> workplace — SW9); and members are prompted, in the app only, to add their workplace, invite colleagues and name the people who know them
> — including by a Pariwar Admin's campaign. ⛔ No SMS, ⛔ no push, ⛔ no WhatsApp
> from any of it (`-307` §2 item 4).

## Story

As **the Super Admin** — I want to keep the office list and add any school the import missed; as **a Pariwar Admin** — I want to suggest
the right entry for a member's unlisted workplace and to run a short campaign asking members to name people who know them; and as **a
member** — I want to confirm my workplace and to be reminded to invite my colleagues,
so that **the people asked about a death really are a member's colleagues, and as few members as possible are left with nobody to ask.**

## Policy meaning (AI-10-1)

**This part introduces ⛔ no predicate that gates a member's access to a benefit.** It curates a list and shows prompts; ⛔ no claim,
contribution, pool or payment reads either. ⚠ A Pariwar Admin's SUGGESTION changes ⛔ nothing on its own: only the MEMBER's confirmation
writes a posting (I2), and 6.36 counts that posting only if recorded before the cut (SW20). Checked against the Niyamavali: ⛔ no clause
governs it.

## The rulings and decisions this part builds (6.36a is the record)

- `-307` §2 item 2 (offices from a list kept by staff; *"isn't listed"* ⇒ a Pariwar Admin review) as NARROWED by **SW9** (a Pariwar Admin
  SUGGESTS an existing entry and the member confirms; ONLY the Super Admin adds) — ⚠ if BigDev answered SW9 B or C, **SC2** is owed; amend
  AC2–AC4 before Task 1.
- `-307` §2 item 4 (the prompts, the campaign) as specified by **SW16 (2)–(5)** (the invite card's condition superseded — SW16 (2));
  `-133` cl.2's POSTURE (creation is the Super Admin's / the Panel's) applied by analogy — ⛔ not as a ruling on this list, which is ⛔ not a
  directory attribute (SW2).

## Acceptance Criteria

1. **AC0 — ⛔ no code before row 6-36 is `done`** (`2026-10-15-338` — was *"6.36a AND 6.36b"* under `2026-10-14-332`); migration `0164` / `when` `1794195600008`.
2. **AC1 — RBAC** (the catalog version bumped ONCE for this story — `51 → 52` at `2581c514`; re-read `PERMISSION_CATALOG_VERSION` at
   build): three keys, each pariwar-dimension — `workplace.manage` (`super_admin` ONLY — it derives every key, so ⛔ no `roles.ts` const;
   the `approval_warning_reason.manage` precedent), `workplace.review` (`pariwar_admin` + derived `super_admin`), `known_people.run_campaign`
   (`pariwar_admin` + derived `super_admin`); the version note names the decision id; both pins in `packages/domain/tests/rbac/permissions.test.ts`
   updated; ⛔ not `district_admin`, ⛔ not `state_trustee`, ⛔ not `block_admin` on any.
3. **AC2 — the Super Admin's list** (`/api/v1/p/:pariwarId/admin/workplaces`): GET (filter by district, kind, status, `q`; paginated,
   bounded; `workplace.manage` OR `workplace.review` — the Pariwar Admin's suggest picker searches with it); POST add (`kind`, `name`,
   `district` — the district MUST be one of the Pariwar's LISTED `workplace_districts` spellings (6.36a Task 1.1b; a retired one is refused), so ⛔ no new district spelling is
   minted here (6.36a SW5); ⚠ a Pariwar with ⛔ no import has ⛔ no districts, so ⛔ no office can be added there until its list is
   imported — recorded — `villageName?`, `blockCode?`, and for a school
   `udiseSchoolCode?`, refused if that code already exists; a later import ⛔ never overwrites this staff row — 6.36a AC2); POST `/:workplaceId/rename`; POST `/:workplaceId/delist` (⛔ not delete; a
   delisted entry stays on every posting — I3); every write step-up-gated; audit `admin_workplace.added` / `.renamed` / `.delisted`
   (context: kind, district — ⛔ not the name text beyond the resource id).
4. **AC3 — the Pariwar Admin's queue** (`/api/v1/p/:pariwarId/admin/workplace-requests`): GET the `pending` requests (an older one is
   already `withdrawn` by any newer posting — 6.36a's writer), newest first, paginated — each showing the typed name, the typed place, the
   district, the date, and how many pending requests carry the same typed name (case- and space-folded); ⛔ not the member's name, mobile
   or id on the wire (⛔ not needed to find a place); POST `/:requestId/suggest` `{ workplaceId }` — the workplace must be LISTED in the
   same Pariwar (else 422 `workplace.not_found`) AND in the request's district (else 422 `workplace.district_mismatch` — a same-named school
   elsewhere would move the member's district, 6.36a SW5); step-up; ⇒ `suggested` with `suggested_workplace_id`, `suggested_by_actor_id`,
   `suggested_at`; audit `admin_workplace.request_suggested` (context: request id, workplace id); POST `/:requestId/close` (an entry that
   names ⛔ no real workplace) ⇒ `closed`, audited. ⛔ No staff route writes a posting. A Pariwar Admin can ⛔ never ADD (SW9 A) — a test
   that `workplace.review` alone gets 403 on AC2's POST.
5. **AC4 — the member confirms.** A member whose request is `suggested` sees, on the home (ONE dismissible notice) and in Life Events →
   Workplace (this part adds the question to 6.36a's screen): *"We think your workplace is [name], [district]. Is that right?"*;
   `POST /api/v1/member/life-events/workplace-requests/:requestId/answer` `{ answer: 'yes' | 'no' }` (`Idempotency-Key`; the request must be
   the CALLER's — another member's is the same 404 as an unknown one) — *"Yes"*, in ONE transaction: re-checks that the workplace is still
   LISTED and that the request's `started_on` is ⛔ not before the member's latest posting's start; marks the request `confirmed` FIRST;
   then writes a NEW posting through 6.36a's ONE writer (the `workplace` arm, the request's `started_on`, `exceptRequestId` = this
   request); emits `member.posting_updated` and the audit line exactly as the posting route does (the HANDLER emits them,
   `life-events/handlers.ts:190-210` — ⛔ never the writer); *"No"* returns it to `pending` (it reappears in the queue); a request ⛔ not
   `suggested` (e.g. `withdrawn` because the member has posted again since) ⇒ 409 `workplace.request_closed`. After a `closed`: *"We could not find '[typed name]'. Please choose your
   workplace again."*
6. **AC5 — the prompts endpoint** (`GET /api/v1/member/known-people/prompts`): `{ noWorkplace, hasWorkplace, transferReview,
   suggestedWorkplace: { requestId, name, district } | null, replaceNeeded: boolean (an accepted person can ⛔ no longer be asked — SW16
   (4); ⛔ no names), campaign: { campaignId } | null }` where `noWorkplace` = the member has ⛔ no posting, or their latest posting names ⛔ no
   workplace and is ⛔ not a retirement (a district-only posting from before the Pariwar's import, an unconfirmed *"isn't listed"*);
   `hasWorkplace` = their latest posting names a workplace (listed or since delisted); `transferReview` = the latest posting names a
   workplace, an EARLIER posting named a DIFFERENT workplace, and it was recorded within 30 days (⛔ never after a retirement, ⛔ never for a
   first confirmed *"isn't listed"* — the member has ⛔ not moved); `replaceNeeded` = the member has at least one `unavailable` row in 6.36b
   AC7's list (an accepted person who has withdrawn from the Trust or had a claim filed for their death; ⛔ never a late renewal; an erased
   person's link has already ended and frees its slot — SW16 (4)); `campaign` = a live campaign in the Pariwar AND the
   member has fewer than three accepted people AND has asked ⛔ nobody since the campaign began. `replaceNeeded`, `campaign` and
   `transferReview` are false for any member who is ⛔ not `active`, and card (b) hides its *"Add people who know you"* button for them
   (6.36a SW16 — every people-who-know-me prompt is for `active` members only; they could ⛔ not act on it, 6.36b AC10). ⛔ No flag depends on whether OTHER members are at a workplace (SW16 (2) —
   ⛔ no disclosure; a test).
7. **AC6 — the cards** (home, below the My Pool card — Story 8.2 keeps it topmost, `apps/mobile/app/(tabs)/index.tsx:64-67`), each
   rendering `null` when its flag is false, each dismissible for 30 days on the phone (MMKV — a per-viewer convenience): (a) `noWorkplace`
   ⇒ *"Add your workplace"* (→ Life Events → Workplace); (b) `hasWorkplace` ⇒ *"Invite your colleagues to join"* — *"Invite"* opens the
   share sheet (RN `Share.share`) with the member's own editable message (copy + the app link from config + the Trust's name from config),
   ONE share per tap, and *"Add people who know you"* (6.36b's screen); (c) `suggestedWorkplace` ⇒ AC4's question; (d) *"You have a new
   workplace — check the people who know you."*; (e) *"Someone who knows you can no longer be asked — add someone else."* — ⛔ never who,
   ⛔ never why (SW16 (4)); (f)
   the campaign: *"Add people who know you"* — dismissed per campaign id.
8. **AC7 — the campaign** (`/api/v1/p/:pariwarId/admin/known-people-campaigns`): POST start `{ startsOn, endsOn }` (IST dates; ≤ 30 days;
   ⛔ not overlapping a live one — 409), POST `/:campaignId/end`, GET list; `known_people.run_campaign`; audit
   `admin_known_people.campaign_started` / `.campaign_ended`; ⛔ no message sent to a phone (a test asserts ⛔ no dispatcher / SMS / push call).
9. **AC8 — the admin pages:** `apps/admin/src/modules/workplaces/` — `WorkplacesPage` (Super Admin: list, add, rename, delist) and
   `WorkplaceRequestsPage` (Pariwar Admin: the queue, a suggest picker that searches the listed entries of the request's district, close);
   the campaign control on the Pariwar Admin's page; routes registered in `apps/admin/src/router.tsx`, links in `RootLayout.tsx` inside a
   Pariwar context; `i18n-en.ts` per module; a page test each.
10. **AC9 — records and close:** `friction-budget.md` gains the prompts' row (`optional` — SF15) and the confirm question's row
    (`optional`); Row 31 (f)'s screen list gains these cards; `pnpm ci:local` green.

## Tasks / Subtasks

- [ ] **Task 1 — the migration (AC7).** `known_people_campaigns` (`campaign_id`, `pariwar_id`, `started_by_actor_id`, `starts_on date`,
      `ends_on date`, `ended_at timestamptz null`, `ended_by_actor_id uuid null`, `created_at`; CHECK `ends_on >= starts_on AND ends_on -
      starts_on <= 30`; an exclusion or a writer lock against overlap — the writer takes `pg_advisory_xact_lock` on the Pariwar); RLS; the
      policy spec. ⚠ `workplace_requests.state` already admits `closed` (6.36a Task 1.3) — ⛔ no ALTER needed; confirm at build.
- [ ] **Task 2 — RBAC (AC1).** `packages/domain/src/rbac/permissions.ts` (three keys appended to `SEED_PERMISSION_KEYS`, the version note,
      `PERMISSION_CATALOG_VERSION`), `roles.ts` (`pariwar_admin` gains `workplace.review` + `known_people.run_campaign`), the pins.
- [ ] **Task 3 — the domain (AC2–AC5, AC7).** `packages/domain/src/member/workplace-admin.ts` (add / rename / delist; the request queue
      read with the same-name count; suggest; close; the member's answer — *"Yes"* through 6.36a's ONE posting writer) and
      `packages/domain/src/member/known-people-prompts.ts` (AC5's flags in ONE read; `clampLimit` on every dynamic limit).
- [ ] **Task 4 — the API (AC2–AC5, AC7).** Admin routes in a new module `apps/api/src/modules/workplaces/` (the approval-warning-reasons
      shape — `apps/api/src/modules/approval-warning-reasons/routes.ts:1-45`: key + step-up per write through shared `chain` / `writeChain`
      consts, `:42-44`; ⚠ the human-actor gate `scripts/claim-adjudication-human-actor-invariant/check.ts` covers ONLY
      `apps/api/src/modules/claims/*.routes.ts` — this module is ⛔ not scanned, so its tests must prove the actor binding themselves); the
      member answer route (AC4) in 6.36a's life-events module; the member prompts route in 6.36b's module; the audit types added to
      `AuthAuditEventType` (`apps/api/src/audit/audit-sink.ts`); the forced-pagination guard covers every collection GET automatically
      (it walks `app.swagger()`); route tests incl. AC3's 403 and AC4's one-transaction confirm.
- [ ] **Task 5 — the admin app (AC8).** The two pages + the campaign control; `apiFetch` calls in `apps/admin/src/api/client.ts` and hooks
      in `hooks.ts`; step-up handled like the existing step-up writers.
- [ ] **Task 6 — the member app (AC4, AC6).** `apps/mobile/components/workplace/` — `AddWorkplaceCard`, `InviteColleaguesCard`,
      `WorkplaceSuggestionCard`, `TransferReviewCard`, `ReplaceNamedCard`, `CampaignCard`; the confirm question added to 6.36a's Life Events
      "Workplace" screen; mounted on the home below the My Pool card; dismissals in MMKV (keys
      versioned `…v1`, cleared on sign-out); the share sheet with ONE message (⛔ not "invite all").
- [ ] **Task 7 — copy + close (AC9).** The member copy in 6.36a's `workplace` namespace (en + hi); the admin copy in each module's
      `i18n-en.ts`; the `friction-budget.md` rows; Row 31 (f)'s screen list gains these cards; the Change Log and File List;
      `pnpm ci:local`.

## Dev Notes
- **Precedents:** the add-and-replace staff list with ⛔ no edit-in-place — 6.23a's approval-warning reasons (`packages/domain/src/claim/
  approval-warning-reasons.ts:120,315,332`; its page test `apps/admin/tests/approval-warning-reasons-page.test.tsx`); a Pariwar Admin queue —
  6.19c's correction-closure queue (`claims.correction-closure.routes.ts:12-21`; ⚠ its recorded defect: a filter applied AFTER the SQL
  `LIMIT` hides live rows — filter IN SQL); banners are ⛔ not the campaign's carrier (text only, ⛔ no link field, two-person publish, one
  banner at a time — `packages/contracts/src/banners/dto.ts:200-214`).
- ⚠ **A suggestion is the one staff act near who is asked — and it decides ⛔ nothing.** Only the member's *"Yes"* writes a posting, through
  the ONE posting writer; 6.36 reads that posting like any other (as of the cut — SW20).
- ⚠ **Uniform withholding:** `replaceNeeded` is ONE boolean for a person who left the Trust and a person reported dead (a death claim is ⛔
  never disclosed by the card); what a namer CAN still tell is recorded in 6.36a SW14.
- **Testing standards:** as 6.36a (+ admin vitest/jsdom page tests, `apps/admin/vitest.config.ts:16-20`).
- **References:** 6.36a (SW9, SW16, SF1); `-307` §2 items 2 and 4; `-133` cl.2; `packages/domain/src/rbac/permissions.ts:735-755`.

## Dev Agent Record
### Agent Model Used
### Completion Notes List
- 2026-10-14 — cut by `bmad-create-story 6.36` (SW1). ⛔ No code.
### File List

## Change Log
| Date | Version | Change |
|---|---|---|
| 2026-10-15 | 1.7 | `2026-10-15-338` (`08932f43`): AC0 — starts when row 6-36 is `done`, ⛔ not in parallel with it; the shared test databases, ⛔ not `:5434`; re-validated against `main` before `ready-for-dev`. |
| 2026-10-14 | — | `2026-10-14-330` committed (`d44708e8`) — BigDev: *"all A, SC4 yes"*; every AC and Task here was written to the recommended answers ⇒ ⛔ none changed. |
| 2026-10-14 | 1.6 | `2026-10-14-332` (`33902d82`): wave 2 — starts when 6.36a AND 6.36b are done, in parallel with 6.36; migration `0164` / `…008`; `:5434`; merges last. |
| 2026-10-14 | 1.5 | Validate round 5: `replaceNeeded` = at least one `unavailable` row (the word "erased" dropped — an erased link has ended); the withholding note points to 6.36a SW14. |
| 2026-10-14 | 1.4 | Validate round 4: offices only in LISTED district spellings; `transferReview` and card (b)'s people-who-know-me button only for `active` members. |
| 2026-10-14 | 1.3 | Validate round 3: `replaceNeeded` (a boolean, ⛔ no names — an erased person has none; the card names ⛔ nobody); `transferReview` needs an earlier, DIFFERENT workplace; `hasWorkplace` includes a delisted one; the people-who-know-me flags only for `active` members. |
| 2026-10-14 | 1.2 | Validate round 2: the confirm's order (`confirmed` FIRST, then the posting with `exceptRequestId`), its re-checks, the caller's own request, the handler's event + audit, and the question shown here; a suggestion bound to the request's district; the admin GET open to `workplace.review`; offices only in the Pariwar's `workplace_districts`; `noWorkplace` covers a district-only posting; `transferReview` ⛔ never after a retirement; `replaceNamed` ⛔ never for a late renewal; the campaign card ends when the member asks someone. |
| 2026-10-14 | 1.1 | Checklist validation: SW9 is a SUGGESTION the member confirms (the confirm route here); the cards follow SW16 (2) — `noWorkplace` / a neutral invite, ⛔ no flag about other members; the human-actor gate's real scope; the forced-pagination guard is automatic; `-133` cl.2 cited as posture; friction-budget rows. |
| 2026-10-14 | 1.0 | Cut by `bmad-create-story 6.36` (SW1): SW9 (staff half), SW16 (2)–(5) — written to the RECOMMENDED answers. |
