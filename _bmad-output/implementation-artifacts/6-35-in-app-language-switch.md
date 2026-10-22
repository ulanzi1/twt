---
baseline_commit: b883dc15
---

<!--
PINNED: b883dc15 (`main` = `origin/main`, 2026-10-22, after `git fetch origin`). Worktree `.claude/worktrees/6-35-in-app-language-switch`,
branch `story/6-35-in-app-language-switch`. Two facts, kept apart (footgun #24): the pin is an ancestor of HEAD (durable); the CODE
claims below were derived at b883dc15 (perishable). Re-check before Task 1:
`git fetch origin && git diff --name-only b883dc15..origin/main -- packages apps scripts docs/launch-gate-inventory microcopy.yaml openapi friction-budget.md`.

STATUS: ready-for-dev (created 2026-10-22 via `bmad-create-story 6.35`; validated 2026-10-22, v1.1 + re-validated v1.2).

START CONDITION — MET at the pin: rows 6-27 (a), 6-27b, 6-27c, 6-27d, 6-30, 6-31, 6-34, 6-37e and 5-12 / 5-13 are `done` on `main`.
6.35 changes ONE domain read that 6.27c and 6.31 both call (`resolvePeerRequestLocale`) and the two senders' config checks; it
changes ⛔ any other sender's CODE (⚠ the claim-contact family's BEHAVIOUR can move — LS15). Siblings (as of 2026-10-22, after
`git fetch`): `3-3c-member-kyc-name-english-only` LANDED on `main` (`40420410` — `common.json` ×2 (`kyc.*`), `microcopy.yaml`,
`openapi/v1.yaml`, `kyc.tsx`: rebase before Task 1); `8-15-fixed-amount-transition-staged-card` edits a doc comment in
`packages/api-client/src/index.ts` (`:575-583`, low conflict); `6-36d-exclude-nominees-from-the-five` (uncommitted story) plans its
OWN migration and edits `schema/claim_peer_mesh_pings.ts`, both begin inputs and both child call sites — see Sequencing (S2).

NUMBERS (footguns #19 / #42(e)): this file names ⛔ migration number, decision id, roster row number or ledger letter that is not
yet TAKEN. At the pin `main` held migrations to 0178, decisions to `-381`, roster Rows to 39, ledger `2026-10-22u`. As of
2026-10-22 (validation): `-382` is on `main` (3.3c) and `-383` on `story/8-15-…` ⇒ next free ≥ `-384`; ledger letters to `ad`
(`main` and the 8-15 worktree), `v` committed by 8-15, `w` held by 6-36d ⇒ ≥ `ae`; migrations still 0178 everywhere, but 6-36d's story
ALSO names "the next free" (0179). Each is "the next free one" at the moment of ITS commit — re-grep `main`, every branch and every
worktree. This story's migration is named by its SLUG (`member-preferred-locale`), its roster row by its KEY (`language-switch-hindi-reviewed`).

§0 GATE (the Panel template, `trustee-panel-routing-note-TEMPLATE.md`): the RULE is ratified — `-303` Q1 rider (Hindi to a member
whose preferred language is Hindi, English to English) and `-310` CF1 A (*"the Pariwar's language until the setting exists; then
each member's choice … The WhatsApp reminder at 48 hours follows the same rule"*, option A as put). HOW the choice is captured
and stored is the AUTHOR's (`-305` §2 item 2, author-commit: *"saved on the phone and recorded on the server when the member changes
it — ⛔ never on first launch"*). Build decisions LS1–LS15 are the author's, with two edges:
(i) a member who has ⛔ never chosen gets the Pariwar's language (LS8). CF1 A as put is SILENT on a non-chooser once the setting
exists, and so is `-305` §2 item 2. The author applies the routing note's own premise (the Pariwar's default is the best fact we have):
a non-chooser has ⛔ recorded preference for `-303`'s rider to honour ⇒ MATCH, recorded in the Task 0.3 entry as the AUTHOR'S
READING — ⛔ cited as CF1's words.
(ii) LS10 is ⚠ ⛔ a MATCH for every option. A config hold does ⛔ only delay: past the claim's answer window an unsent text stays
unsent (the console's `not_sent` — ⛔ a finished row; that claim's five are ⛔ texted), and past +72 h a reminder ⛔ begun gets ⛔ row
at all (an existing un-marked row is finished `skipped_late`). And `-303` lists among what it does NOT cover *"if Meta refuses, the
reminder does ⛔ not go, and the text still does"* (⛔ ruled; ⛔ in the note put to the Panel) — 6.31 WR6 applies it per locale, built
as a hold of a Pariwar ON that locale. An option that holds
or drops a recipient for ANOTHER language's template gap (LS10 (a)) narrows `-303` Q1 A for that recipient ⇒ the Panel's (write
the note from the template; ⛔ build Task 3 until ruled). An option that delays or drops only on the recipient's OWN language's gap
(LS10 (b)) is MATCH. ⇒ Whether a routing note is owed is DECIDED AT TASK 0.2 with LS10's answer.
⛔ ONE place is kept OUT whatever LS10's answer: sending a member who chose English the Hindi text because the English template is
missing (LS10 (c)) — it narrows `-303`'s rider. Freeze row 10 (`epics.md:555`) is read in the Task 0.3 entry (LS4).

GLYPH REGISTER: `⛔` negates the word it precedes — before a word that is ALREADY negative (no / not / never / nothing / none) it is
emphasis only, ⛔ a double negative; `⭐` emphasis / action; `⚠` a hazard. ⛔ No `file:NNN` into `.decision-log.md`,
`deferred-work.md` or `sprint-status.yaml` (newest-first files) — cite the decision id + clause, the item's phrase, or the row key.
Line numbers into CODE files are as of the pin; re-grep the symbol if a line moved.

LETTERS: F = found facts (at the pin) · LS = build decisions (PROPOSED; answered at Task 0.2) · I = invariants · T = traps ·
S = Task 0.1 STOP conditions. Decision-entry letters (PM, WR, CF, R, W …) keep their own stories' meaning.
-->

# Story 6.35: The Member Chooses Hindi or English in the App — Saved on the Phone, Recorded on the Server Only When They Change It, and the Neighbours' Text and Its WhatsApp Reminder Then Follow Their Choice `[SURFACE]`

Status: ready-for-dev

> **WHAT THIS STORY IS, IN ONE PARAGRAPH.** The member app always shows Hindi: `LocaleProvider` is in-memory state mounted with ⛔
> initial locale, and ⛔ control anywhere calls `setLocale` (F1). The Panel ruled that the neighbours' text goes in each member's
> preferred language, Hindi or English (`-303` rider), and that until members can choose in the app it goes in the Pariwar's
> language — *"then each member's choice"* (`-310` CF1 A). 6.35 builds the choice: a language screen (and a small switch on the login
> screen) that changes the app at once and saves it on the phone (MMKV); when a signed-in member CHANGES it, the server records it
> on the member (`members.preferred_locale`); ⛔ nothing is recorded on first launch or by inference. Then the ONE domain read both
> peer-mesh senders call — `resolvePeerRequestLocale` — returns the member's recorded choice, else the Pariwar's default, per
> RECIPIENT (today it is per Pariwar), and every text / reminder records which (`locale_source = 'member_choice' | 'pariwar_default'`).
>
> **Day-one output.** The app switch works for every member at once. The text/reminder half has ⛔ visible effect today: at the pin
> 6.27c HOLDS every Pariwar (`config:counsel_basis_pending`, Row 27) and ⛔ Pariwar has WhatsApp provisioned — it is built so the
> right language goes the day those lift (verify at Task 0.1, S1). ⚠ ONE behaviour moves with ⛔ code change: the claim-contact
> senders take the FILER's screen language (`(claim)/contact.tsx:184`), so an English-choosing filer makes `'en'` reachable there for
> the first time (F21, LS15).
>
> **What already ships and this story READS — rebuild ⛔ none of it:**
> - `LocaleProvider` / `useLocale().setLocale` / `useT` — `packages/i18n/src/react.ts:30-60` (⛔ change needed in the package);
> - `mmkvStorage` — `apps/mobile/lib/mmkv.ts:26-32` (synchronous; ⛔ AsyncStorage — [[project_mmkv_asyncstorage_equivalent]]);
> - the member API client `memberAuth` (`apps/mobile/lib/member-api.ts`) over `packages/api-client/src/index.ts` `call()`;
> - the settings-entry pattern — `apps/mobile/components/notifications/NotificationSettingsEntry.tsx` + `app/(settings)/`;
> - the locale enum `localeEnum = pgEnum('locale', ['hi','en'])` — `packages/domain/src/schema/pariwar_passport.ts:54`;
> - the one language read `resolvePeerRequestLocale` — `packages/domain/src/claim/peer-mesh-request.ts:634-646`
>   (its comment: *"THE ONE read row 6-35 will change (to "the member's choice, else the Pariwar's default")"*);
> - both senders' template tables — `PEER_MESH_REQUEST_SMS_LOCALES = ['hi','en']` (`apps/jobs/src/scheduler/peer-mesh-sms-templates.ts:33`)
>   and the reminder's per-locale `waTemplateConfigKey('peer_mesh.reminder', locale, pariwarId)`.

## Story

As **a member**,
I want **to choose whether the app speaks to me in Hindi or English, and to have the Trust remember that choice**,
so that **I can read every screen in my language, and the text the Trust sends me when I am asked about a neighbour's death (and
its WhatsApp reminder) comes in the language I chose** — while a member who never chooses keeps exactly what they have today.

## The rulings and records this story builds on

| Source | Key (verbatim, abridged) | Status |
|---|---|---|
| `2026-10-10-303` ruling item 2 (Q1 rider) | *"The text is sent in Hindi to a member whose preferred language is Hindi, and in English to a member whose preferred language is English."* | ⭐ TRUSTEE-RATIFIED |
| `-303` Consequence 3 | *"Row `6-31-…` is RATIFIED as to substance (Q1 A as put) and follows the same language rule."* | consequence of the ratified Q1 A |
| `-303` "What this ruling does ⛔ NOT cover" | *"if Meta refuses, the reminder does ⛔ not go, and the text still does."* | author text in a ratified entry's not-covered list — ⛔ ruled; ⛔ in the note put to the Panel (`…asking-the-neighbours.md:67` omits it); §0 (ii) leans on it — the Task 0.3 entry says so |
| 6.31 WR6 (committed by `-365`) | *"Meta refuses or files it as MARKETING ⇒ ⛔ reminder in that locale; the text still goes."* — per LOCALE | author-commit |
| Roster Row 35 (b) | *"the en + hi reminder templates approved by Meta as UTILITY … a locale Meta refuses or files as MARKETING is recorded as "Meta refuses" for that locale (`-303`)"* — Row 35 can close with ONE locale refused | go-live roster |
| `-303` "Our reading" — preferred language | *"the language they chose in the app, recorded on the server when they choose it (and when they first use the app); for a member who has never used the app, the Pariwar's default language"* — ⚠ never shown to the Panel (`-305` §1 (a)); its *"and when they first use the app"* is OVERTAKEN by `-305` §2 item 2 | ⛔ NOT RATIFIED — overtaken |
| `2026-10-10-305` §1 (b) | the app has ⛔ no language choice — `LocaleProvider` in-memory, ⛔ initial locale ⇒ always `hi` | author-commit (FOUND) |
| `-305` §2 item 2 | *"a NEW row builds the switch (saved on the phone and recorded on the server when the member changes it — ⛔ never on first launch), and from then the member's recorded choice is their preferred language"* | author-commit |
| `-305` §2 item 5 | mints `6-35-in-app-language-switch` | author-commit |
| `2026-10-10-310` CF1 A — option A AS PUT in `trustee-panel-routing-note-2026-10-10-6-27-confirms.md` | *"Yes — the Pariwar's language until the setting exists; then each member's choice (our suggestion). The WhatsApp reminder at 48 hours follows the same rule."* Relayed: *"App is not live, so CF1 may not be relevant."* | ⭐ TRUSTEE-RATIFIED |
| `-310` "Our reading" | *"CF1 governs only the interval between go-live and an in-app language switch (row `6-35`) … 6.27c sends by the Pariwar default until 6-35 replaces it with the member's choice."* | ⛔ not ratified (reading) |
| `2026-10-10-311` PM22 [c] (the 6.27 file) | *"row `6-35` … changes this ONE read to member's choice, else the Pariwar's default. Row 6-31's reminder reads the same. ⛔ No `member_language_preferences` table in 6.27. ⚠ RECORDED: the app always renders `hi` … a Pariwar whose default is `en` would send English texts that open Hindi screens … row 6-35 fixes both halves."* | author-commit |
| 6.27c R10 (the 6.27c file) | `resolvePeerRequestLocale(db, pariwarId) → { locale, source: 'pariwar_default' }` — *"the ONE read row 6-35 will change"* | story (built) |
| 6.31 story WR14 (committed by `2026-10-19-365`, "all as recommended") | `-365` reads *"The ONE language read the text uses (`resolvePeerRequestLocale`), read again at the reminder."*; the 6.31 STORY file adds *"⛔ The ping's `locale_source` copied … reading again is the ruled rule — `-310` CF1 A"* | author-commit |
| deferred-work **W8** — *"`locale_source` is a literal in the begin, ⛔ threaded from `resolvePeerRequestLocale().source`"* | *"⭐ Trigger: row 6-35 — thread the source into the begin AND widen 0156's `locale_source` CHECK in the same change."* | deferred — to be closed by this story (AC3) |
| PRD / epics **FR-68** | *"Hindi + English variants on every member-facing string. Language switcher in profile. Hindi default for Bihar v1."* | PRD |
| UX spec §Platform Strategy | *"Hindi default for Bihar v1; language switcher in profile."* — ⚠ the app has ⛔ profile screen (F4) | UX |
| UX spec `:554` / `:718` / `:1126` | *"Hindi-as-translation-layer (transliterated Hindi, mixed scripts, …) → violates Hindi-first parity"*; *"Devanagari and Latin at the same hierarchy level must be visually balanced"*; *"the section headers can be bilingual"* | UX |
| `epics.md` freeze table row 10 (`:555`) | *"every member-visible string carries Hindi parity; English never primary on member surfaces"*; its anchor column: *"AR-59 + FR-68/69/80. "Hindi-first posture" is PRD policy; the parity contract is architectural"* — and (`:540`) *"Any change to a Frozen item requires an ADR or trustee-ratified Sprint Change Proposal."* UX `:2611` reads it as *"Hindi-primary member surfaces"* | FROZEN |
| `2026-10-22-382` KB6 (3.3c, on `main`) | *"BigDev approves the three Hindi strings … ⛔ new roster row — the 6.18 / 3.3b precedent for a form label and validation messages, ⛔ the Rows 37 / 39 consent-flow precedent. Row `6-35-in-app-language-switch` will make the en strings member-facing too."* | author-commit |

⚠ **STALE LEDGER TEXT — do ⛔ build it.** The 6-35 sprint-row comment still reads *"(`-303` rider; CF1 confirm owed)"* — CF1 was
RULED by `-310` the same day. Annotated (dated) at story creation in the ledger entry; ⛔ rewritten, ⛔ annotated again.

## ⭐ THE INVARIANTS

- **I1 — ⛔ Nothing is recorded that the member did not choose.** The server value changes ONLY by `PUT /api/v1/member/language`,
  and the app calls it ONLY after an explicit selection of a language DIFFERENT from the one shown (in the screen or the login
  switch). ⛔ First-launch write, ⛔ device-language inference, ⛔ "adopt the Pariwar default as a choice", ⛔ backfill.
  *Proof:* AC9 — a fresh install that signs in and uses the app with ⛔ switch ⇒ ZERO `PUT` calls; `preferred_locale` stays NULL.
- **I2 — A member who never chose is unchanged.** `preferred_locale IS NULL` ⇒ the resolver returns exactly today's answer
  (`pariwar_default`, the passport's language) and the app shows exactly today's screen language (Hindi pre-login; LS4 after).
  *Proof:* the resolver leg with a NULL member; the existing 6.27c / 6.31 suites stay green with only the type/CHECK edits of AC3.
- **I3 — The text's language is its RECIPIENT's.** Resolved per ping from the recipient member (⛔ the deceased, ⛔ the Pariwar
  alone), recorded on the row with WHY (`locale`, `locale_source`).
- **I4 — ⛔ Wrong-language fallback.** Whatever LS10's answer, a recipient whose chosen language has ⛔ usable template is ⛔ sent
  the other language's text (LS10 (c) — that would narrow `-303`'s rider). *Proof:* AC4 / AC5 legs: an `en` template missing ⇒ the
  English-chooser waits or is skipped per LS10's answer, ⛔ a Hindi text to them.
- **I5 — One attempt, one language.** A re-claimed ping (a prior attempt may have sent) re-uses the `locale` recorded at its first
  begin — ⛔ re-resolved — so a possible second text carries the same words; a row begun by pre-6.35 code (`locale IS NULL`) was
  sent in the Pariwar's default, so its re-claim writes THAT (LS9). Backstopped in the database: once written, `locale` cannot
  change (the guard's written-once arm), and a finished row's `locale` is frozen with its other delivery columns. (The reminder
  re-claims only while `send_started_at IS NULL` — nothing sent — so it re-reads, per WR14.)
- **I6 — ⛔ Other sender's CODE moves.** OTP, suspicion texts, claim-contact ladder / reminders, alerts, moderation, cycle-open, the
  WhatsApp opt-in code, push — byte-unchanged except named comment lines (AC12). ⚠ Code-unchanged ≠ behaviour-unchanged: the
  claim-contact family and suspicion (c) read `contact_locale`, the FILER's screen language — LS15 decides it. They are listed in
  ONE deferred item (LS11).
- **I7 — Ids only.** ⛔ Mobile, name or link code in a log, alarm or audit context; the audit context carries the locale code only.

## 📜 Policy meaning (AI-10-1)

**6.35 introduces ⛔ no predicate that gates a member's access to a benefit, and changes ⛔ none.** It adds a stored preference and
changes ONE read that decides the LANGUAGE of a text — ⛔ whether a text is sent, to whom, or what anyone is owed. In the member's
terms: *"the language you pick in the app is the language the app speaks to you, and the language the Trust texts you in when it asks
whether you knew a member who has died — picking a language never changes whether, when, or how much any family is paid, or whether
you are asked."* Checked against the Niyamavali: ⛔ clause governs the language of the app or of these texts (⛔ a benefit predicate;
the Niyamavali is a rulebook, ⛔ binding — [[feedback_niyamavali_rulebook_not_spec]]). ⚠ LS10's template gate can DELAY — and, past
the window or +72 h, DROP — neighbour texts / reminders; that is a provisioning gate on a SIGNAL (`-263` FQ10 A: *"The neighbours can ⛔
never block a claim on their own."*), ⛔ a predicate on a member's benefit. ⚠ RE-CHECK this sentence at Task 0.2 against LS10's
answer: under LS10 (b), a member who picked English whose English reminder template Meta refused gets ⛔ WhatsApp reminder while a
Hindi neighbour does — then the member sentence must add *"if the Trust cannot send the reminder in your language, you get the text
without it."*

## ⭐ FOUND FACTS (at b883dc15 — each re-run at Task 0.1)

- **F1 — The app has ⛔ language state that outlives a render tree.** `LocaleProvider` (`packages/i18n/src/react.ts:30-40`) is
  `useState(props.initialLocale ?? DEFAULT_LOCALE)`; `initialLocale` is read on MOUNT only. `apps/mobile/app/_layout.tsx:88-99` mounts
  `<LocaleProvider>` (`:93`) with ⛔ `initialLocale` ⇒ always `'hi'`. ⛔ `setLocale` call, ⛔ language control, ⛔ stored locale in
  `apps/mobile` (grep `setLocale`, `भाषा`, `expo-localization` ⇒ comments only). `DEFAULT_LOCALE = 'hi'` (`packages/i18n/src/locale.ts:36`).
- **F2 — Provider order** `LocaleProvider > SessionProvider (lib/session-context.tsx) > Provider (components/Provider.tsx)` ⇒ the session
  layer CAN call `useLocale().setLocale` (it is inside the provider). `_layout.tsx` returns `null` until fonts load (`:77-79`).
- **F3 — MMKV.** `mmkv = createMMKV({ id: 'twt-p0-5' })` (`lib/mmkv.ts:14-16`); `mmkvStorage` get/set/remove, synchronous (`:26-32`).
  Newer keys are dotted with a `.vN` suffix (`pool-onboarding.completed.v1`, `known-people.saved-names.v1`). ⛔ `clearAll` anywhere;
  sign-out (`lib/session-context.tsx:114-137`) clears named member data only — its ONLY caller is `app/(withdrawal)/index.tsx`.
  Session tokens live in SecureStore (`lib/session.ts:16-21`), ⛔ MMKV.
- **F4 — ⛔ Profile or settings screen.** `NotificationSettingsEntry.tsx:3-4`: *"the app has no dedicated profile/settings screen
  yet."* Settings are understated entry buttons stacked on the home tab (`app/(tabs)/index.tsx:80-102`); `app/(settings)/` holds
  `_layout.tsx` (a `<Stack />`), `notifications.tsx`, `telegram-notifications.tsx`; the root layout registers the group (`_layout.tsx:196-202`).
- **F5 — Logged-out screens.** `app/(auth)/login.tsx` (70 lines, one `YStack`, `useT()` keys `auth.*`), `otp.tsx`, `rejoin-locked.tsx`,
  `terminated.tsx`. ⛔ welcome screen. The SIGNUP WIZARD (`(signup)` tc → kyc → workplace → nominees → medical → whatsapp → payment)
  runs AFTER `signIn` and BEFORE the home tab is usable ⇒ without a login-screen switch a member reads login + the whole wizard in Hindi.
- **F6 — The app already sends the SHOWN locale to the server at six sites**, each a record of what the member SAW:
  `(signup)/tc.tsx:95,126` (T&C — the handler echoes the locale; ONE body per version, `member-terms.handlers.ts:52-56`, so English
  causes ⛔ 404), `(claim)/consent.tsx:169-172`, `(claim)/contact.tsx:184` (a claim's `contact_locale` default),
  `(life-events)/address.tsx:44`, `life-events/MedicalForm.tsx:112`; `lib/public-site.ts` passes `?lang=`. These become CORRECT
  (they record the real shown language) — ⛔ change them. (T&C's `locale` records the SCREEN language, ⛔ the body's — one body per
  version.) ⚠ `contact.tsx:184` is ⛔ only a record: it becomes the claim's `contact_locale`, which DRIVES other senders (F21, LS15).
- **F7 — ⛔ Locale header.** `packages/api-client/src/index.ts` `call()` (`:257-300`) sets only `content-type`, `authorization`,
  `extraHeaders`; ⛔ `Accept-Language` anywhere. ⛔ add one (out of scope).
- **F8 — The server stores ⛔ member language.** `members` (`packages/domain/src/schema/members.ts`): `member_id, pariwar_id, state,
  state_event_version, lock_in_days_at_join, custom_fields, created_at, updated_at`. `:4` *"lifecycle ANCHOR — NOT the member's
  profile"*; `:126-127` *"⚠ `members` IS A CERTIFIED PII-FREE TABLE"* (a locale code is ⛔ PII). A non-`state` column is written by
  a plain scoped UPDATE (the 0018 trigger fires only on `state`, `:117-124`; precedents `member/lock-in.ts:82`,
  `custom-fields/member-write.ts:119`). RLS `members_tenant_isolation_*` on `app.pariwar_id`; `GRANT SELECT, INSERT, UPDATE ON members
  TO twt_app` (0018, table-wide). Add-column precedent: `0096_members-custom-fields.sql:10-14` (*"a HOT table … Add-defaulted only;
  NO blocking backfill"*).
- **F9 — ⛔ `/me` endpoint.** `MemberFullSession` (`packages/contracts/src/members/auth.ts:40-52`) carries ⛔ locale; ⛔ member route
  returns the Pariwar's `locale_default`. Member routes take ⛔ RBAC key (`packages/domain/src/rbac/permissions.ts:374-376`) — they
  are `requireMemberSession`-gated ⇒ ⛔ catalog bump.
- **F10 — The simple self-service write precedent** is Life Events address: `POST /api/v1/member/life-events/address`
  (`apps/api/src/modules/life-events/routes.ts:91-101`, `preHandler: [memberSession]`, ⚠ ⛔ rate limit on THIS route — `memberWrite`
  (`:108-113`, a LOCAL const with `perMemberKey` from `plugins/rate-limit/index.js`) is used by the posting route `:115-127`
  (`config: { rateLimit: memberWrite }`)); handler `handlers.ts:205-251` — `openScopeTx` → write → `emitAuthAudit(deps, request,
  'member_life_events.address_updated', { … context: { locale } })` (`:242`, ⚠ INSIDE the `try`, BEFORE `closeScopeTx` at `:249` in
  the `finally` — the precedent audits before commit). `emitAuthAudit`'s fields take `actorId`, `pariwarId`, `context`; `context` is
  SHA-256 hashed (`auth/shared/audit.ts:22-31`; `audit_log_entries` has ⛔ context column). The audit action set is a CLOSED union
  (`apps/api/src/audit/audit-sink.ts`, e.g. `:173`) — the ONLY list (⛔ DB CHECK, ⛔ catalog test). PUT is supported end to end (a
  member PUT route `claims.peer-request.member.routes.ts:89`; `call()` `:262`; 8 `method: 'put'` OpenAPI registrations); a
  `memberSession` preHandler is all the login-wall spec needs. Contracts are camelCase `.strict()` (`packages/contracts/src/life-events/address.ts:29-34`;
  ⛔ import `@twt/domain`); OpenAPI paths hand-registered in `packages/contracts/scripts/emit-openapi.ts` → `openapi/v1.yaml`
  (CI `contracts:check-openapi-determinism`). Login wall: `apps/api/tests/integration/login-wall.spec.ts` (every route tagged).
- **F11 — The one read is per PARIWAR.** `resolvePeerRequestLocale(db, pariwarId)` (`peer-mesh-request.ts:640-646`) reads
  `pariwar_passport.locale_default`; `PeerRequestLocale = { locale: 'hi'|'en'; source: 'pariwar_default' }` (`:617-621`);
  `PeerRequestLocaleMissingError` ⇒ a HOLD (`config:locale_unavailable`), any other throw ⇒ a retry.
- **F12 — 6.27c resolves ONE language per Pariwar and holds per Pariwar.** `claim-peer-mesh-requests.ts` header `:4` *"a hold per
  PARIWAR (every config gap here is per Pariwar or global)"*; `pariwarConfig()` (`:208-237`) resolves the locale (`:218`), checks THAT
  locale's DLT id (`:224-227` ⇒ `config:dlt_template_id_missing:${locale}`) and preflight (`:228-232`), returns `{ config: { locale } }`;
  the sweep memoises it per Pariwar (`:315-337`) and parks a held Pariwar's in-flight pings, keeping it out of the three-day give-up
  (`:362-375`); the child reads it once (`:592`) and renders every ping with it (`:715-721`). `beginFresh` writes the LITERAL
  `locale_source = 'pariwar_default'` (`peer-mesh-request.ts:472` — W8). ⛔ `locale` column on `claim_peer_mesh_pings` (only
  `locale_source`, `schema/claim_peer_mesh_pings.ts:139`). ⚠ The DLT template id is GLOBAL per locale, ⛔ per Pariwar:
  `sms.dlt.template_id.peer_mesh.request.${locale}` (`peer-mesh-sms-templates.ts:71-72`); 6.37 AC9 (a) deliberately checks only the
  Pariwar's OWN locale in `pariwarConfig` (`:228-229`: *"⛔ in `globalConfigGap` (a broken `en` template would otherwise hold every
  Hindi Pariwar)"*), pinned by `apps/jobs/tests/claim-peer-mesh-requests-live.test.ts:954` (whose second half — *"and holds the English
  one"* — pins that an `en` Pariwar holds on its own template). A ping held past the claim's answer window is ⛔ begun at all:
  `listDuePeerMeshRequestClaims` lists only NULL pings inside the window, and such a ping stays NULL — the console's `'not_sent'`
  (`peer-mesh-request.ts:710-711`, R16). A claim whose only due ping cannot be begun is still enqueued each sweep, counts against
  `maxClaims` (the starvation warned of at `claim-peer-mesh-requests.ts:386-389`) and decrypts the deceased's name each run (R9). `begun` returns
  `recipientMemberId = ping.member_id` (the recipient); the re-claim (`:425-445`) resolves nothing today.
- **F13 — 6.31 resolves per Pariwar too.** `peerMeshWaReminderConfig` (`claim-peer-mesh-wa-reminders.ts:173-206`): the locale
  (`:188-190`), then that locale's template NAME (`:201`; key `wa.template.<purpose>.<locale>.<pariwarId>` — PER Pariwar) ⇒
  `config:wa_template_missing:${locale}` (`:205`); the row records `template_name, locale, locale_source`
  (`packages/domain/src/claim/peer-mesh-wa-reminder.ts:294,356-375`). ⚠ The child does ⛔ know the recipient before the begin:
  `listClaimDuePeerMeshWaReminderPings` returns ping ids only (`:586-610`); `ping.member_id` is first read under the lock
  (`lockClaimPingReminder`, `:213`); the begin takes ONE pre-resolved `template: { name, locale, localeSource }` (`:294`) from
  `config.*` (`claim-peer-mesh-wa-reminders.ts:577`), and the send uses `config.templateName` / `config.locale` (`:672-673`). A
  reminder re-claim happens only while `send_started_at IS NULL` (`:373`) and already rewrites the locale. A reminder ⛔ begun before
  +72 h gets ⛔ row at all (`dueConjunctsSql`: a ping whose window passed while held *"was NEVER due and gets ⛔ row"*); an existing
  un-marked row past +72 h is finished `skipped_late` (`markLatePeerMeshWaReminders`, `:774-797`). "Meta refuses" is recorded in a
  Decision (Row 35 (b)); the code only ever sees an UNSET key (`:205`) — ⛔ config value means "refused".
- **F14 — The CHECKs and the type pins that admit only `'pariwar_default'`** (all MUST move together — W8):
  `0156_claim-peer-mesh-replies.sql:61` (pings), `0171_peer-mesh-wa-reminders.sql:75` (reminders; `:74` `locale IN ('en','hi')`);
  `PEER_MESH_LOCALE_SOURCES = ['pariwar_default']` (`schema/claim_peer_mesh_pings.ts:53-54`, *"⚠ LOCKSTEP with 0156's CHECK"*);
  `apps/jobs/tests/claim-peer-mesh-wa-reminders.test.ts:73-77` (`toEqualTypeOf<'pariwar_default'>()` — *"A wider … (row 6-35) FAILS here
  … widen the CHECK in the same row, then this leg."*); two RLS/record specs assert `'member_choice'` ⇒ 23514
  (`packages/domain/tests/integration/rls/claim-peer-mesh-replies-policy-regression.spec.ts:169` — by error code only;
  `packages/domain/tests/integration/claim/peer-mesh-wa-reminder-record.spec.ts:216` — by constraint NAME) — these FLIP (they now
  insert it successfully). Also broken by the signature change (⛔ deliberate pins, just callers): `packages/domain/tests/integration/claim/peer-mesh-request.spec.ts:558-559`
  (`resolvePeerRequestLocale(db, pid)`), the reminder begin callers in `peer-mesh-wa-reminder.spec.ts` / `…-concurrency.spec.ts`; and
  the 6.37 live leg `claim-peer-mesh-requests-live.test.ts:954` (F12) — wholly under LS10 (a), its English-Pariwar half under LS10 (b).
- **F15 — The finished-row freeze.** `claim_peer_mesh_pings_guard_delivery()` (`0166_peer-mesh-request-sending.sql:78-128`) freezes the
  `delivery_cols` array (incl. `locale_source`) once a send finished — ONLY when `OLD.send_outcome <> 'attempting'` (`:88`); its
  attempting-row checks (6.27c R15, `:105-125`) and link_code's written-once arm (`:101-104`) do ⛔ cover a locale ⇒ today a re-claim
  could rewrite one. Only 0156 (`:68-93`, the SHORTER body) and 0166 define the function; ⛔ 0167–0178 replaces it ⇒ copy 0166's FULL
  body. A NEW `locale` column must join that array (CREATE OR REPLACE in the new migration) and the column GRANT UPDATE list (0156:65 —
  UPDATE-only; INSERT is table-wide from 0054:78 ⇒ `GRANT UPDATE ("locale")` only).
- **F16 — Migrations.** Hand-authored `packages/domain/migrations/NNNN_slug.sql`, highest `0178_member-wa-opt-in-codes.sql`; journal
  `meta/_journal.json` `when` = previous + 86400001 (0178 = `1794886800022`); ⛔ `db:generate` (diffs a frozen 0020 snapshot); statements
  split by `--> statement-breakpoint`; ⛔ edit an applied migration ([[project_live_db_test_gotchas]]).
- **F17 — Copy.** Flat dotted keys in `packages/i18n/locales/{en,hi}/common.json`; the parity gate (`pnpm i18n:check`, root
  `package.json:25`) checks en→hi only — ⚠ but the English catalog IS complete (equal keys and `{param}` tokens both ways in every
  namespace; `t()` THROWS on a missing key, `resolver.ts:62-65`); `common` IS in `microcopy.yaml` `scope.copy_globs` (`:388-389` at the
  pin, +4 on `main` after 3.3c — read the LIST, ⛔ the header — footgun #22 (a)) ⇒ the microcopy gate runs on new keys, `$comment`
  VALUES included (footgun #27; `common.test.ts` scans `Object.values`; `report` is an always-on vocabulary term, `microcopy.yaml:36`).
  Stories enrol their new / edited mobile files in `code_globs` (6.18, 6.21b, 6.27a, 3.3c KB8). The language-names precedent: `niyamavali.json` `switch_to_hindi: "हिन्दी"`, `switch_to_english: "English"` (BOTH catalogs —
  endonyms), used by `apps/public/src/layouts/PublicShell.astro:147-152`. `$comment.<topic>` keys document a block in both catalogs;
  the `hi` one records *"agent-authored and NOT YET HUMAN-REVIEWED — go-live Row …"*.
- **F18 — Mobile tests.** `apps/mobile/vitest.config.ts`: `include: ['tests/unit/**/*.test.ts']`, env `node`, ⛔ setup file ⇒ `.test.ts`
  only (render with `createElement`), `// @vitest-environment jsdom` per file, RTL `cleanup` in `afterEach`, mock `react-native-mmkv`
  (in-memory Map — `tests/unit/pool-onboarding-gate.test.ts:10-23`) or `lib/mmkv`; render inside a REAL `LocaleProvider`
  (`tests/unit/wa-notifications-screen-render.test.ts:108-110`); copy-key test shape `tests/unit/wa-notifications-copy-keys.test.ts`.
- **F19 — Data export** reads the `members` row with a bare `.select()` — every column (`packages/domain/src/data-export/assemble.ts:176-180`) —
  but builds the `profile` object field by field (`:414-418`, `lockInDaysAtJoin` at `:417`), so a new column is ⛔ copied unless added there; contract `ProfileSection` (`packages/contracts/src/data-export/data-export.ts:124-239`,
  `.strict()`), strict-parsed at `apps/jobs/src/data-export.ts:68`; tests `packages/domain/tests/integration/data-export/data-export.spec.ts`,
  `apps/jobs/tests/data-export.test.ts` ([[project_data_export_sections_strict_parsed]]).
- **F20 — Stale "always Hindi" premises in code and records** that become false when this ships (comments/records only):
  CODE — `apps/api/src/modules/wa-opt-in/code-delivery.ts:40` (*"the app is always Hindi"*); `apps/jobs/src/scheduler/moderation-notify.ts:310`
  (*"Per-member locale preference is not yet on the member record"*); `contribution-notify-triggers.ts:236` (*"there is no member
  locale column today"*); (`(tabs)/_layout.tsx:24-26` ANTICIPATES the switch — ⛔ stale, keep). RECORDS — 5-10 F15 (*"the English is not
  member-visible today"*); 6.30 (*"The mobile app always renders Hindi until row 6-35"*); 6.27 PM22's RECORDED line; 6.27c `:35` and
  `:731-732` (*"the app always renders `hi`"*); 6.27c R11 (*"the template id of the Pariwar's locale"*, `:315-317`); 6.31 WR7 (the template
  name for the Pariwar's locale); 5-13 story `:491` (*"(the app is always Hindi — …)"*); `docs/launch-gate-inventory/dlt-template-requests-6-19.md`
  `:18-22` (*"the 6.27c sweep HOLDS every Pariwar whose language's id is unset"* — operative, changes with LS10) and `:218` (*"The LANGUAGE is
  the Pariwar's default until row 6-35 lets members choose"*); memory `project_mobile_app_no_language_switch` (also its stale *"Panel
  confirm CF1 owed"*). ⚠ Consequence: the app's ENGLISH strings become member-visible for the first time — `-382` KB6 already records it.
- **F21 — Every other sender** (I6) — none names 6-35: suspicion (a)/(b) hard-coded `hi` (`claim-suspicion-notices.ts:97-102`,
  `suspicion-notice.ts:776`); ⚠ the claim-contact family (certificate, correction, ladder SMS + the ladder WhatsApp step, closure —
  `claim-contact-ladder.ts:1121`, `claim-certificate-reminders.ts:672`, `claim-correction-closure.ts:373`, `claim-contact-ladder-whatsapp.ts:424`)
  and suspicion purpose (c) (`claim-suspicion-notices.ts:97`: *"BOTH for (c) (its `contact_locale`…)"*) by `claim_contacts.contact_locale` —
  which is the FILER's SCREEN language (`(claim)/contact.tsx:91` `useLocale()`, `:184`; stored `claim-contact-persist.ts:269,445`), ⛔ a
  claimant-language control. Today it is always `hi`; 6.35 makes `'en'` reachable: an English-choosing filer sends the claimant (maybe a
  non-member who reads Hindi) English texts, and an `en` agreement SKIPS the Hindi-review gate (`claim-contact-whatsapp-basis.ts:45-46`:
  `if (payload['locale'] !== 'en' && !version.hiReviewed) return … 'hindi_not_reviewed'`). Code unchanged; behaviour CHANGES — LS15. OTP English-only (`packages/channels/src/otp-sms-template.ts:67,73`;
  deferred *"OTP DLT templates are English-only"*); moderation `DEFAULT_LOCALE` (`apps/jobs/src/scheduler/moderation-notify.ts:310-312`
  *"Per-member locale preference is not yet on the member record"*); contribution / cycle-open (`contribution-notify-triggers.ts:234-238`);
  news / survey push teasers; the 5.13 code template (`code-delivery.ts:40-41`); `getLocale`'s `sessionLocale` rung (`packages/i18n/src/locale.ts:74-95`,
  ⛔ caller supplies it; its only callers are public Astro pages — ⛔ wiring needed).
- **F22 — What does ⛔ switch with `setLocale`.** Every `useT()` consumer re-renders (memo rows included), but: the tab titles
  `'My Pool'`, `'Shradhanjali'`, `'Panchayat'` are English literals in BOTH locales (`(tabs)/_layout.tsx:52,59,66`); the Shradhanjali tab
  is hard-coded Hindi (`ShradhanjaliSahyogVivran.tsx:170,216,225`, `MemoryInput.tsx:17,29`, `KinshipLattice.tsx:16`); strings already
  translated into STATE stay in the old language until reset (`login.tsx:32,41-45` `setError(t(…))`, `otp.tsx` `setNotice`).
- **F23 — The jobs worker bypasses RLS.** `withPariwarScope` sets `app.pariwar_id` but never `SET ROLE` (`db.ts:164-185`); the jobs pool
  is the BYPASSRLS service login (`apps/jobs/src/boot.ts:611-615`); CI's login is a superuser (`db.ts:103-108`). Only the API's
  `openScopeTx` sheds to `twt_app` (`scope-tx.ts:33-39`). ⇒ in the senders, a query's OWN predicates are the only tenant scope.
  `readPeerMeshRequestEligibility` filters `pr_m.pariwar_id = ${pariwarId}` and maps "no row" to `peer_not_eligible` (`peer-mesh-request.ts:193-196`).
  `pariwar_passport` is readable by `twt_app` across Pariwars (`USING (true)`), so the API's GET can read the default.
- **F24 — The session layer.** `StoredSession.memberId` is set at `signIn` (`session-context.tsx:107`) and on restore; a pending-signup
  member has a full session (`otp.tsx:62-63`) and `requireMemberSession` has ⛔ state gate (`member-session-guard.ts:25-40` checks only the
  JWT and `typ`) ⇒ GET / PUT work during the signup wizard. Member data is cleared on THREE paths: `signOut` (`:114-137`) and two in
  the refresh path (`:66-90` — a refused refresh, termination during refresh). ⛔ app-level `AppState` listener exists; four
  screen-scoped ones do (`pay.tsx:229`, `whatsapp.tsx:202`, `notifications.tsx:123`, `use-death-certificate-status.ts:92`).

## ⚖️ Build decisions LS1–LS15 (PROPOSED — answered by BigDev at Task 0.2; ⭐ = recommended; LS10 carries ⛔ ⭐)

- **LS1 — Where the server keeps the choice.** ⭐ **(a)** two nullable columns on `members`: `preferred_locale locale` (the existing
  enum) and `preferred_locale_set_at timestamptz` — both NULL until the first explicit change; ⛔ default, ⛔ backfill (F8: a non-PII
  code; a plain scoped UPDATE; RLS and grant already cover it; a nullable add on a hot table needs ⛔ rewrite). **(b)** a new
  one-row-per-member table `member_language_choices` (+ RLS policy file, per-command policies, column GRANT, its own RLS spec).
  *Cost (a):* bends the *"anchor, ⛔ profile"* comment (`members.ts:4`) — record a dated line there. *Cost (b):* ~4 more artefacts
  for one value; the resolver gains a second join.
- **LS2 — The API.** ⭐ `GET /api/v1/member/language` and `PUT /api/v1/member/language` (body `{ locale: 'hi'|'en' }`), both ⇒
  `MemberLanguageResponse { chosenLocale: 'hi'|'en'|null, pariwarDefaultLocale: 'hi'|'en' }` (camelCase, `.strict()`, in a new
  `packages/contracts/src/member-language/language.ts`, re-exported from `src/index.ts`). `preHandler: [memberSession]`; PUT rate-limited
  by the module's OWN `memberWrite`-shaped const with `perMemberKey` (`config: { rateLimit: … }` — the Life Events POSTING route, F10;
  `memberWrite` there is module-local); ⛔ Idempotency-Key (setting an absolute value — a repeat is the same state); ⛔ events_log
  event (⛔ a lifecycle fact; ⛔ `MEMBER_EVENT_TYPES` change); the audit AFTER COMMIT, and ONLY when the value CHANGED — ⚠ UNLIKE the
  precedent (which audits inside the `try`): `ok = true` → `await closeScopeTx(scopeTx, true)` → then `if (changed) emitAuthAudit(deps,
  request, 'member.language_changed', { actorId, pariwarId, context: { locale } })` (add to the closed union — its only list). A missing
  passport ⇒ 503 (`ServiceUnavailableError`, `http-errors.ts`); a missing member row ⇒ 409. ⛔ terminal-state guard — a locale code is
  harmless (the session guard does ⛔ check state, F24; termination is enforced at login / refresh; five other modules carry a
  `TERMINAL_STATES` guard, e.g. `data-export/handlers.ts:38-46`, ⛔ needed here).
- **LS3 — The phone store.** ⭐ `apps/mobile/lib/app-language.ts`: MMKV key `app-language.v1` (`'hi'|'en'` — the language last
  CHOSEN or ADOPTED on this phone) and `app-language.pending.v1` (JSON `{ locale, memberId: string | null, processId? }` — an explicit
  change ⛔ yet recorded; `null` = made before sign-in, and then carries the app-process boot id so a LATER process drops it — LS5). Read synchronously in `_layout.tsx` ⇒ `<LocaleProvider initialLocale={readStoredLanguage() ?? undefined}>`.
  Both KEPT on sign-out (a phone setting, like the OS language). Inject a `SyncStorage` for tests (the `known-people-saved-names.ts:19-38`
  shape). ⛔ AsyncStorage, ⛔ `expo-localization`, ⛔ device language (I1).
- **LS4 — What the app shows when nothing is stored.** ⭐ Before sign-in: Hindi (FR-68, unchanged). After sign-in, from `GET`:
  `chosenLocale ?? stored phone language ?? pariwarDefaultLocale` — DISPLAYED via `setLocale`, ⛔ saved as a choice, ⛔ PUT (closes
  PM22's *"English texts that open Hindi screens"* for an `en` Pariwar). *Cost (a):* ⚠ it DISPLAYS English as primary to a member of an
  `en` Pariwar who never chose it — freeze row 10 (*"English never primary on member surfaces"*). The author reads row 10 as the
  surface CLASSIFICATION (member surfaces Hindi-first, parity enforced), which the Pariwar's `locale_default` (its schema:
  *"Default chrome locale"*, `pariwar_passport.ts:85`; the Story 2.x `getLocale` ladder *"auth session > Pariwar-Passport
  `locale_default` > …"*) and a member's explicit choice leave unchanged — recorded in the Task 0.3 entry. Row 10's own anchor is
  *"AR-59 + FR-68/69/80. "Hindi-first posture" is PRD policy; the parity contract is architectural"*, and FR-68 itself requires *"Language
  switcher in profile"* ⇒ the SWITCH is ⛔ a change to the frozen item. ⚠ Against: UX `:2611` reads row 10 as *"Hindi-primary member
  surfaces"* for what is rendered — if BigDev reads "primary" as "shown", an English DEFAULT display may be a change (ADR / SCP,
  `epics.md:540`), and (b) avoids the edge. Also (a): a cold start shows Hindi, then
  flips to the Pariwar's English after the GET (the adopted default is ⛔ stored); offline it stays Hindi. *Alternative (b):* ignore
  the Pariwar default in the app (Hindi until the member switches) — cheaper, ⛔ freeze-row-10 edge, leaves PM22's half open.
- **LS5 — Reconciling at sign-in and app start (with a session).** ⭐ ONE function `syncAppLanguage(memberId)` in `lib/app-language.ts`,
  called from `SessionProvider` in ONE effect keyed on `session?.memberId` (covers sign-in AND start with a stored session), and from
  ONE new app-level `AppState` → `active` listener (⛔ app-level one exists today — F24; the four screen-scoped ones are untouched):
  (1) a pending change for THIS member, or made before sign-in (`memberId: null`) in THIS app process ⇒ `PUT` it (⭐ a null pending
  from an EARLIER process is dropped, ⛔ PUT — else a login-screen choice would be recorded for whoever signs in next, however much
  later, who did ⛔ choose it — I1; the screen language it set stays via `app-language.v1`); on 2xx clear pending and adopt the
  response; on failure keep pending (retried next start/foreground) — ⛔ banner outside the screen; a pending change tagged with
  ANOTHER member ⇒ dropped (a shared phone); (2) else `GET` ⇒ LS4. Network failure ⇒ silent, ⛔ retry loop. Every call bounded by
  `withTimeout`. ⚠ RACES, both closed: (i) after EVERY await, re-read a choice counter that `chooseLanguage` bumps (or `pending`) and
  DROP the result if it moved — else a slow GET resolving after the member switched puts the old language back; (ii) ONE in-flight PUT
  (single-flight promise in `lib/app-language.ts`) shared by the screen and the sync — else a foreground sync during the screen's PUT
  sends a second one.
  *Cost:* a change made on phone A and another on phone B — the server keeps the LATEST `PUT`; each phone adopts the server's
  value at its next sync (last-writer-wins, recorded). ⚠ Recorded edges: a server choice adopted for member A is written to
  `app-language.v1` and then outranks member B's Pariwar default on a shared phone (LS4's order); (speculative) a Ravi-mode session-as-deceased (Nominee Console) would PUT onto the
  deceased's row — the Nominee Console is ⛔ the member app, confirm at Task 0.1.
- **LS6 — Where the control lives.** ⭐ **(a)** BOTH: a new screen `app/(settings)/language.tsx` reached by a new
  `components/settings/LanguageSettingsEntry.tsx` on the home tab (placed directly above `<NotificationSettingsEntry />`, same
  understated button shape), AND a one-line switch at the foot of `app/(auth)/login.tsx`. **(b)** the screen only. *Cost (b):* F5 — an
  English-reading member gets login and the whole signup wizard in Hindi; FR-68's "profile" does ⛔ exist (F4) either way.
- **LS7 — The words that let someone FIND the switch.** ⭐ The two option names are endonyms in BOTH catalogs — `"हिन्दी"` and
  `"English"` (F17's public-site precedent); the login switch shows only the OTHER language's endonym (`English` on a Hindi screen,
  `हिन्दी` on an English one); the home entry label is the bilingual `"भाषा / Language"` in BOTH catalogs — ⚠ a DEPARTURE from UX
  `:554` (which lists *"mixed scripts"* as an anti-pattern outright), argued under `:1126` (bilingual section headers on *"mixed-register
  surfaces … where the surface genuinely hosts both registers"* — the entry is the one place a reader of EITHER language must find),
  both scripts visually balanced (`:718`); recorded in the author-commit. (UX Pattern 12's *"never both at once, never a toggle"*
  (`:2611`) governs per-Pariwar custom-field labels only.) The endonyms are names, ⛔ labels.
  *Alternative:* the entry label in the current language only (a member who cannot read Hindi cannot find it).
- **LS8 — The one read.** ⭐ `resolvePeerRequestLocale(db, { pariwarId, memberId })` ⇒ `{ locale, source: 'member_choice' | 'pariwar_default' }`
  — ONE query: the passport row LEFT JOIN the member's `preferred_locale` ON `m.pariwar_id = ${pariwarId} AND m.member_id = ${memberId}`
  EXPLICITLY (the jobs pool is BYPASSRLS — RLS does ⛔ protect it, F23); a non-NULL choice ⇒ `member_choice`; a NULL choice ⇒ the passport
  ⇒ `pariwar_default`; a passport row with ⛔ member row THROWS (a data fault — ⛔ a silent `pariwar_default`); ⛔ passport ⇒
  `PeerRequestLocaleMissingError`. `PeerRequestLocale['source']` widens; `PEER_MESH_LOCALE_SOURCES = ['pariwar_default', 'member_choice']`.
  Still the ONE function (6.27c R10 / 6.31 WR14: *"keep it a single function"*). A Pariwar-only helper for the config checks
  (`resolvePariwarDefaultLocale(db, pariwarId)`, the old body) is ALLOWED. In the text sender it is called in `beginPeerMeshRequest`
  AFTER step ③ (`readPeerMeshRequestEligibility` proves the member row is in this Pariwar) and passed into `beginFresh`. ⚠ A
  `PeerRequestLocaleMissingError` thrown INSIDE a begin is ⛔ a hold (the child catches it only at config, `:217-222`) — a retried
  throw; unreachable in practice (the config check reads the passport first; the passport has ⛔ DELETE grant).
- **LS9 — When the language of a text / reminder is fixed.** ⭐ TEXT: resolved at the FRESH begin (`beginFresh`, inside the claiming
  transaction, for `ping.member_id`), written to the row as `locale` + `locale_source` (W8 — the literal goes); a RE-CLAIM reuses the
  row's recorded `locale` (I5) — `beginPeerMeshRequest` returns `locale` in its `begun` result for BOTH paths and the child renders each
  ping with ITS locale (⛔ the Pariwar's). REMINDER: resolved per recipient INSIDE the reminder's begin, after the lock reads
  `ping.member_id` (F13 — the child does ⛔ know the recipient earlier): the config carries BOTH template names, the begin picks THAT
  locale's name and records `template_name` / `locale` / `locale_source`, and returns them in `begun` for the send (WR14 — unchanged
  rule, now per member). ⇒ a NEW migration (slug `member-preferred-locale`): the two `members` columns (LS1 (a)); `ALTER TABLE
  claim_peer_mesh_pings ADD COLUMN locale text` + CHECK `claim_peer_mesh_pings_locale_check` (`locale IS NULL OR locale IN ('hi','en')`,
  mirroring 0171:74) ONLY. ⚠ ⛔ a `(send_outcome IS NULL) = (locale IS NULL)` CHECK: `skipFresh` finishes a ping `skipped_superseded` /
  `no_target` WITHOUT a begin, so a finished row legitimately has ⛔ locale. A re-claimed row with `locale IS NULL` was begun by
  pre-6.35 code, which SENT the Pariwar's default ⇒ the re-claim writes `locale = resolvePariwarDefaultLocale(…)` and keeps
  `locale_source = 'pariwar_default'` — ⛔ the member's choice (I5; dev/test data only — ⛔ production, S1). Add `locale` to the column
  GRANT (`GRANT UPDATE ("locale")`) and to `claim_peer_mesh_pings_guard_delivery()`'s `delivery_cols`, plus a written-once arm
  (`IF OLD.locale IS NOT NULL AND NEW.locale IS DISTINCT FROM OLD.locale THEN RAISE …` — link_code's shape, 0166 `:101-104`) — `CREATE OR
  REPLACE` from 0166's FULL body (F15); DROP + re-ADD both `locale_source` CHECKs as `IN ('pariwar_default','member_choice')` under
  their SAME names (pings, reminders).
- **LS10 — A recipient whose language's template is missing or refused. ⚠ DECIDED AT TASK 0.2 with ⛔ ⭐ pre-set; the §0 edge (ii)
  routing verdict follows the answer.** The facts every option rests on: (1) 6.27c's DLT id and pre-flight are GLOBAL per locale
  (F12), and 6.37 AC9 (a) deliberately checks only the Pariwar's OWN locale; (2) 6.31's template names are PER Pariwar (F13); (3) a
  hold DROPS as well as delays — past the claim's answer window an unsent text stays unsent (`not_sent`, F12), past +72 h an un-begun
  reminder gets ⛔ row (F13); (4) `-303`'s not-covered list: *"if Meta refuses, the reminder does ⛔ not go, and the text still does"*,
  which WR6 applies per locale — BUILT as a hold of a Pariwar ON the refused locale (6.31 `:384-386`) — and Row 35 (b) lets ONE locale
  close as "Meta refuses", a fact the code cannot see (only an unset key, F13); the DLT sheet lists templates 13 (hi) and 14 (en) — the neighbours'
  texts (`docs/launch-gate-inventory/dlt-template-requests-6-19.md`).
  **(a)** both senders' Pariwar config requires BOTH locales — 6.27c: each of `PEER_MESH_REQUEST_SMS_LOCALES` has its DLT id and passes
  pre-flight, else `config:dlt_template_id_missing:<locale>` (first missing, `['hi','en']` order); 6.31: both names, else
  `config:wa_template_missing:<locale>`; the config result carries ⛔ locale. *Cost:* TEXT — ONE missing or pre-flight-failing `en` DLT
  template holds EVERY Pariwar's neighbour texts, all-Hindi Pariwars and Hindi recipients included; a hold past the window ⇒ those
  five are ⛔ texted; REVERSES 6.37 AC9 (a) (flip the live leg `:954` and a dated note on 6.37 AC9 (a)). REMINDER — a Pariwar whose
  `en` template is refused or unset ⇒ ⛔ reminder to ANY recipient, Hindi ones included (beyond WR6 as built, which holds only a
  Pariwar ON the refused locale) ⇒ narrows `-303` Q1 A for Hindi recipients ⇒ the Panel's (§0 (ii)) — a routing note is owed before Task 3.
  **(b)** per RECIPIENT: the Pariwar config resolves BOTH locales' template state (DLT id + pre-flight for the text; name for the
  reminder) and holds the Pariwar only on a NON-template gap, or when BOTH locales are unusable; at the begin, a recipient whose OWN
  language's template is unusable — TEXT: the ping is ⛔ begun and waits (stays NULL and due inside the window, re-tried each sweep;
  past the window it stays `not_sent`, F12); REMINDER: that recipient's reminder is ⛔ begun and waits (past +72 h it gets ⛔ row, F13).
  ⇒ 6.37 AC9 (a)'s property is KEPT and EXTENDED: a broken `en` template holds ⛔ Hindi recipient, and a broken `hi` template holds ⛔
  English-chooser — the `:954` leg's second half (*"and holds the English one"*) FLIPS (an `en` Pariwar's Hindi-chooser is sent).
  "Meta refuses" vs "unset": the code sees only an unset key, so (b) either names a config value meaning "refused" (then that
  recipient is finished ⛔ reminder at once — WR6) or MERGES the arms (wait, then ⛔ row past +72 h) — decided with LS10.
  *Cost:* a per-ping wait path and its reasons (possibly a detail-vocabulary value — collides with 6-36d's detail-vocabulary
  migration, Sequencing); the per-Pariwar park / give-up machinery gains a per-ping branch; a claim whose only due ping waits is ⛔
  held — it is enqueued every sweep, counts against `maxClaims` (the starvation of `claim-peer-mesh-requests.ts:386-389`) and decrypts
  the deceased's name each run (R9) — so (b) needs a skip / back-off for such claims; only a recipient whose OWN language has the gap
  is delayed / dropped ⇒ MATCH (⛔ routing note), but the Policy-meaning sentence must then say so.
  **(c) ⛔ OFFERED — the Panel's:** send the Pariwar's language when the chosen one has ⛔ template (narrows `-303`'s rider, I4).
- **LS11 — Scope.** ⭐ ONLY: the app's own language, the server record, and the two ratified consumers (the neighbours' text and its
  reminder). Every F21 sender keeps its language; ONE deferred-work item *"Senders that ignore the member's chosen language (row 6-35)"*
  lists them with ⭐ Trigger: *"a story or ruling that sets a language rule for that message"* (⚠ suspicion (a)/(b) and the claim-contact
  family may text a non-member — a member choice may ⛔ apply; the claim-contact family is LS15's). The same item lists F22's
  non-switching surfaces (tab titles, the hard-coded Hindi Shradhanjali tab). Stale *"always Hindi"* comments in CODE (F20 — three
  lines) are corrected in place (comments only).
- **LS12 — The data export.** ⭐ **(a)** the profile section gains `preferredLanguage: 'hi'|'en'|null` — `ProfileSection`
  (`data-export.ts:124-239`), the `.select()` + `profile` object (`assemble.ts:176-180`, `:414-418`), the jobs strict parse
  (`apps/jobs/src/data-export.ts:68`), tests `data-export.spec.ts` + `apps/jobs/tests/data-export.test.ts` (F19) — a choice the Trust keeps
  about the member is the member's data. **(b)** leave the export unchanged (safe — the `.select()` reads every column, but the
  hand-built `profile` object never copies it); a deferred item.
- **LS13 — What the screen tells the member.** ⭐ Title *"Language / भाषा"*-style per locale (`language.title`), one line:
  *"Choose the language for this app. Some messages from the Trust (SMS and WhatsApp) will also come in this language."* (true: the
  neighbours' text and its WhatsApp reminder; *"some"* stays true as more follow). ⛔ list of which messages; ⛔ promise about OTP.
  *Alternative:* say nothing about messages (then the member is ⛔ told why the Trust records it).
- **LS14 — Go-live.** ⭐ **(a)** A new roster row keyed `language-switch-hindi-reviewed` (the new Hindi strings: entry, title, intro,
  error; the endonyms need ⛔ review) — a go-live gate, ⛔ a merge fence ([[project_not_in_production_merge_is_not_golive]]). **(b)**
  BigDev approves the four Hindi strings at Task 0.2, ⛔ roster row — the `-382` KB6 / 6.18 / 3.3b precedent (labels and messages,
  ⛔ a consent flow). Either way ⛔ new row for the English strings (English is the authoring language; the existing English catalog
  becomes visible — F20, as `-382` KB6 already records — ⛔ gated).
- **LS15 — The claim-contact family's language (C-family, F21).** The filer's screen language becomes the claim's `contact_locale`
  (`(claim)/contact.tsx:184`), which drives the ladder SMS + WhatsApp step, the certificate / correction reminders, closure and suspicion
  (c), and an `en` agreement skips the `hindi_not_reviewed` WhatsApp-basis gate. ⚠ The SAME body `locale` is the agreement evidence:
  `claims.contact.handlers.ts:132-133` (`checkboxTextShown: resolveClaimContactAgreementCopy(ctx.locale), locale: ctx.locale`), and the
  Hindi check reads *"the AGREEMENT's locale (the words the claimant saw)"* (`claim-contact-whatsapp-basis.ts:13-14`) ⇒ ⛔ pin the
  submitted `locale` alone — that would record an agreement to Hindi words the member never saw.
  ⭐ **(b)** render `(claim)/contact.tsx` (or the whole `(claim)` flow) in Hindi regardless of the app language — the submitted
  `locale` stays the SHOWN one (`'hi'`) — until a claimant-language rule exists (a nested `LocaleProvider initialLocale="hi"` around the
  screen, a dated comment, a render leg; the claimant is often a non-member who reads Hindi, and the Hindi-review gate keeps its
  reach) — the LS11 deferred item names the trigger. **(b′)** split the body into `agreementLocale` (shown) and `contactLocale` (pinned
  `'hi'`) — a contract + handler change. **(a)** accept and record it (correct in one sense: the filer saw English) — ⚠ then the
  `hindi_not_reviewed` skip for `en` agreements and English texts to a Hindi-reading claimant become live with ⛔ ruling; recorded in
  the Task 0.3 entry. ⚠ None is a language rule for the claimant — that is a later story's or the Panel's.

## Acceptance Criteria

1. **AC1 — The server record (LS1).** A forward migration (slug `member-preferred-locale`, next free number, journal `when` = previous
   + 86400001) adds `members.preferred_locale locale NULL` and `members.preferred_locale_set_at timestamptz NULL`, ⛔ default, ⛔ backfill;
   idempotent (`psql -f` twice succeeds); `db:migrate` + `db:check` green on :5433. The Drizzle schema (`schema/members.ts`) gains both
   columns with a dated comment under the *"anchor"* note. ⛔ Writer other than AC2's PUT (grep `preferred_locale` / `preferredLocale`
   writes ⇒ the domain setter only).
2. **AC2 — The API (LS2).** `GET` / `PUT /api/v1/member/language` as LS2, both tagged member-session (the login-wall spec walks them),
   contracts lockstep-tested (`packages/contracts/tests/member-language.test.ts`: `.strict()` rejects an extra key; `locale` rejects
   `'fr'`), OpenAPI emitted and committed. Integration legs on :5433: GET with ⛔ choice ⇒ `{ chosenLocale: null, pariwarDefaultLocale: 'hi' }`;
   PUT `en` ⇒ `{ chosenLocale: 'en', … }`, the row's `preferred_locale = 'en'` and `preferred_locale_set_at` set; a second identical PUT
   ⇒ 200, ⛔ second audit line and `set_at` unchanged; PUT `hi` after ⇒ changes and audits once; ⛔ token ⇒ 401; a member of Pariwar B
   ⛔ reaches Pariwar A's row (RLS); a body `{ locale: 'fr' }` or an extra key ⇒ 400; the audit context carries ONLY `{ locale }` (I7 —
   asserted on the in-memory audit sink: the stored context is a hash); the audit is emitted AFTER the commit (a forced commit failure ⇒
   ⛔ audit line).
3. **AC3 — The one read + the record of why (LS8, LS9; closes W8).** `resolvePeerRequestLocale(db, { pariwarId, memberId })` per LS8;
   legs: NULL choice ⇒ the passport + `pariwar_default`; `en` choice in an `hi` Pariwar ⇒ `en` + `member_choice`; a member of ANOTHER
   Pariwar id (an `en` choice there) ⇒ throws — ⛔ their choice, ⛔ a silent `pariwar_default` (scoped; this leg runs on the superuser /
   jobs handle, ⛔ under `SET LOCAL ROLE twt_app`, where RLS would mask a missing predicate); ⛔ passport ⇒ `PeerRequestLocaleMissingError`. The
   migration widens both `locale_source` CHECKs (same names) and adds the pings `locale` column per LS9 (incl. the freeze array, the
   written-once arm and GRANT). `beginFresh` writes `locale` + `locale_source` FROM the read (⛔ literal); a re-claim keeps them (leg:
   change the member's choice between attempt 1 and the re-claim ⇒ the re-claim renders the FIRST locale; a re-claim of a row with
   `locale IS NULL` writes the PARIWAR DEFAULT and `pariwar_default` even when the member has since chosen `en`; a `skipped_superseded`
   row with ⛔ locale is accepted by the CHECK). F14's four pins FLIP deliberately, each with a dated comment (the type pin now
   `'pariwar_default' | 'member_choice'`; the two specs now ACCEPT `'member_choice'` and still reject `'device'`); F14's broken callers
   (`peer-mesh-request.spec.ts:558-559`) move to the new signature. DB legs: a finished row's `locale` cannot be rewritten (the freeze),
   and an `attempting` row's non-NULL `locale` cannot be changed (the written-once arm — I5's backstop); the R15 attempting-row checks
   of 0166 still fire (the full body was copied).
4. **AC4 — The neighbours' text per recipient (6.27c; LS9, LS10).** `pariwarConfig` per LS10's answer; ⛔ `locale` in
   `PariwarSendConfig`; the child renders each ping with its begun `locale`. Legs in `apps/jobs/tests/` (the existing 6.27c suite's
   fixtures): two neighbours in one claim, one with `en` chosen and one with ⛔ choice in an `hi` Pariwar ⇒ two sends, the
   template/words of `en` and of `hi` respectively, rows `member_choice`/`en` and `pariwar_default`/`hi` — RED against today's code
   (which sends Hindi to both). The `en` DLT id unset or pre-flight-failing ⇒ ⛔ Hindi text to the English-chooser (I4), and: under
   LS10 (a), EVERY Pariwar HELD `config:dlt_template_id_missing:en` (flip `claim-peer-mesh-requests-live.test.ts:954`, dated); under
   LS10 (b), the English-chooser's ping is ⛔ begun and stays due while the Hindi neighbour's is sent, an all-Hindi Pariwar is ⛔
   held, and an `en` Pariwar with a broken `hi` template still texts its English recipients and holds ⛔ Hindi-chooser beyond their
   own ping (`:954`'s English-Pariwar half flips, dated); a claim whose only due ping waits does ⛔ starve the sweep (the skip /
   back-off leg).
5. **AC5 — The reminder per recipient (6.31; LS9, LS10).** `peerMeshWaReminderConfig` carries both template names; the locale is
   resolved per reminder recipient INSIDE the begin (from `ping.member_id`) and recorded (`locale`, `locale_source`, `template_name` of
   THAT locale); the send uses `begun.*`. Legs: an `en`-choosing neighbour gets the `en` template and `member_choice`; the member changes
   their choice after the text ⇒ the reminder goes in the NEW choice (WR14's "read again" — ⛔ copied from the ping). The `en` template
   name unset ⇒ under LS10 (a) `config:wa_template_missing:en` HOLD of the Pariwar; under LS10 (b) only the English-chooser waits, and
   a locale recorded "Meta refuses" ⇒ that recipient ⛔ reminded while the Hindi recipient is (WR6).
6. **AC6 — The phone remembers (LS3).** `lib/app-language.ts` exports `readStoredLanguage`, `chooseLanguage(locale, memberId|null)`,
   `syncAppLanguage(memberId)`; `_layout.tsx` mounts `LocaleProvider` with the stored language. Unit legs (in-memory storage): ⛔ stored
   ⇒ `undefined` (Hindi); a stored `en` ⇒ the provider starts `en`; a choice survives a simulated restart. ALL THREE member-data clear
   paths (`signOut` and the two refresh paths, F24) leave both keys — a source-scan leg (the `known-people-session.test.ts:34-63` shape;
   `signOut` cannot be unit-called); the existing session-context source-pin tests (`link-target.test.ts:177`) re-run green.
7. **AC7 — The controls (LS6, LS7, LS13).** `app/(settings)/language.tsx` (two options `accessibilityRole="radio"` +
   `accessibilityState={{ checked }}` inside an `accessibilityRole="radiogroup"` container — `(claim)/contact.tsx`'s `ChoiceRow`
   `:45-64`, `:262` — the current one checked; selecting the OTHER re-renders every `useT()` consumer at once (F22's exceptions stay)
   and calls `chooseLanguage`; selecting the current one is a no-op; header title `<Stack.Screen options={{ title: t('language.title') }} />`
   — the `notifications.tsx:208` precedent — so the header ⛔ shows the route name), `LanguageSettingsEntry` on the home tab above
   `NotificationSettingsEntry`, the login-screen switch. Render legs (real `LocaleProvider`, jsdom, the `wa-notifications-screen-render`
   scaffold — ⚠ its tamagui / RN mocks forward only `testID` and `selectable` (`:76-91`), have ⛔ `XStack`, and the container ignores
   `onPress`: add `XStack` to the mock and forward `onPress` → `onClick`, `accessibilityRole` → `role`, `accessibilityState.checked` →
   `aria-checked` (the 5.10 `selectable` precedent), proven RED by dropping each prop, or a `ChoiceRow`-shaped option is neither
   clickable nor checkable in the test): switching re-renders a `useT()` string in the other language; the PUT is called ONCE per change; a failed PUT
   keeps the new language on screen, leaves `pending`, and shows ONE `accessibilityRole="alert"` + `accessibilityLiveRegion="assertive"`
   line (`language.error_not_recorded`; + `AccessibilityInfo.announceForAccessibility` on iOS only — TalkBack would speak it twice,
   `contact.tsx:154-157`; 3.3c's `kyc.tsx` is the freshest precedent); the login switch writes `pending` with `memberId: null` and calls
   ⛔ API. ⛔ `[t]` dependency in any file this story adds or edits ([[project_uset_fresh_closure_memo_trap]]; existing `[t]` deps
   elsewhere are ⛔ touched).
8. **AC8 — Reconciliation (LS4, LS5).** Unit legs for `syncAppLanguage` with a mocked `memberAuth`: pending (own / null) ⇒ ONE PUT then
   cleared; pending for another member ⇒ dropped, ⛔ PUT; a `memberId: null` pending from an EARLIER app process ⇒ dropped, ⛔ PUT
   (I1); ⛔ pending + server `en` ⇒ `setLocale('en')` + stored, ⛔ PUT; ⛔ pending +
   server null + ⛔ phone choice + `pariwarDefaultLocale: 'en'` ⇒ displays `en`, stores ⛔ choice, ⛔ PUT; GET fails ⇒ ⛔ change, ⛔ throw;
   the member switches while a GET is pending ⇒ the GET's later result is DROPPED and the chosen language stays; a sync while the
   screen's PUT is in flight ⇒ still ONE PUT (single-flight).
9. **AC9 — ⛔ Never on first launch (I1).** A leg drives a fresh install (empty storage) through sign-in and one `syncAppLanguage` with
   server `chosenLocale: null` ⇒ ZERO PUT calls and ⛔ `app-language.v1` written; an API leg confirms a member who only GETs has
   `preferred_locale IS NULL`.
10. **AC10 — Copy (LS7, LS13).** New `common.json` keys (en + hi, hand-edited — ⛔ `prettier --write`, [[project_prettier_not_enforced]]):
    `language.entry`, `language.title`, `language.intro`, `language.option_hi`, `language.option_en`, `language.error_not_recorded`,
    `language.switch_hint` (+ a `$comment.language` in both, the `hi` one naming the LS14 row (or the LS14 (b) approval) — ⚠ the
    `$comment` VALUES are scanned: ⛔ microcopy vocabulary terms such as `report`, `user`; F17). Add the `language.*` keys AWAY from 3.3c's
    `kyc.*` block (rebase conflicts). A copy-key test (the `wa-notifications-copy-keys` shape) resolves every literal key of the new/edited
    files in BOTH locales through the real `t()` (pass params for any `{param}` key — `t(key, undefined)` throws on one); the new / edited
    mobile files (`language.tsx`, `LanguageSettingsEntry.tsx`, `lib/app-language.ts`, `login.tsx`) enrolled in `microcopy.yaml` `code_globs`
    (3.3c KB8 — `login.tsx`'s `#C0392B` at `:64` then needs a scoped allow entry, its teeth proven); `pnpm i18n:check`,
    `pnpm microcopy:test && pnpm microcopy:check` green.
11. **AC11 — The export (LS12).** Per the LS12 answer: (a) `preferredLanguage` in `ProfileSection` + `assemble.ts` + the jobs strict
    parse, with legs in both export tests (F19); or (b) the deferred item written.
12. **AC12 — Nothing else's CODE moves (I6, LS11).** `git diff b883dc15 --stat` shows ⛔ change in `otp-sms-template.ts`,
    `claim-suspicion-notices.ts`, `suspicion-notice.ts`, `claim-contact-ladder*.ts`, `claim-certificate-reminders.ts`,
    `claim-correction-*.ts`, `news-publish.ts`, `survey-publish.ts`, `packages/i18n/src/**` (except comments, if any),
    `packages/api-client/src/index.ts` beyond the two new methods — state the diff in the Debug Log. `code-delivery.ts` (`:40`),
    `moderation-notify.ts` (`:310`) and `contribution-notify-triggers.ts` (`:236`) may change those COMMENT lines only. ⚠ Code-unchanged
    ≠ behaviour-unchanged: the claim-contact family's language is AC15's.
13. **AC13 — Governance before code.** Task 0's author-commit decision (LS1–LS15 answers + the §0 edges + I4's kept-out Panel
    option + the freeze-row-10 reading) is committed ALONE before any code; records (epics entry, roster row if LS14 (a), deferred items,
    dated notes) in their own commit. If LS10's answer narrows `-303` Q1 A (§0 (ii)), the routing note is written from the template and
    Task 3 waits for the ruling; Tasks 1, 2, 4, 5 may proceed.
14. **AC14 — The gate.** `DATABASE_URL=<:5433> pnpm ci:local` green ([[project_prepush_hook_inherits_5432]],
    [[project_ci_local_double_run_pollution]]); the job count and commit recorded.
15. **AC15 — The claim-contact language (LS15).** Per the LS15 answer: (b) with the app in English, `(claim)/contact.tsx` RENDERS in
    Hindi and submits `'hi'` — the agreement text recorded is the Hindi one the member saw (a render leg asserts both, RED against the
    pre-change file once the app can show English), with a dated comment naming LS15 and the LS11 deferred item; or (b′) the body
    carries `agreementLocale` (shown) and `contactLocale` (`'hi'`), contract + handler + legs; or (a) ⛔ code change, and the Task 0.3
    entry records the `hindi_not_reviewed` skip and the English-to-claimant consequence.

## Tasks / Subtasks

- [ ] **Task 0 — Preflight, decisions, governance (AC13)**
  - [ ] 0.1 `git fetch origin`; rebase onto `origin/main` (3.3c landed — `common.json`, `microcopy.yaml`, `openapi/v1.yaml`); re-run the
    header's baseline diff; re-derive F1–F24 (re-grep each symbol). **STOP** and tell BigDev if:
    **S1** any production database or real member exists, or a Pariwar is no longer held by `config:counsel_basis_pending`
    (LS10's costs change from "planned" to "live"); **S2** another branch / worktree edits `peer-mesh-request.ts`,
    `claim-peer-mesh-requests.ts`, `claim-peer-mesh-wa-reminders.ts`, `peer-mesh-wa-reminder.ts`, `schema/claim_peer_mesh_pings.ts`,
    `_layout.tsx`, `login.tsx`, `(tabs)/index.tsx`, `session-context.tsx`, `(claim)/contact.tsx`, `schema/members.ts`,
    `packages/api-client/src/index.ts` or `common.json` (`git branch -a`, `git worktree list`, ListAgents — 6-36d DOES (Sequencing), 8-15
    edits the api-client; [[feedback_shared_tree_branch_switch]]); **S3** a decision after `-383` touches language, `-303`'s rider or
    CF1; **S4** either template set is NOT both-locale on the DLT sheet / Row 35 (b) any more, or a locale is recorded "Meta refuses" /
    DLT-rejected; **S5** `beginFresh` / `skipFresh` / `finishAttempting` / the reminder begin no longer match F12 / F13 / LS9 (the CHECK
    and re-claim rules rest on it).
  - [ ] 0.2 Put LS1–LS15 to BigDev in plain language (recommended first, each with its cost; LS10 with ⛔ recommendation and its four
    facts); record the answers verbatim. From LS10's answer, decide §0 edge (ii): a narrowing ⇒ the routing note (template) and Task 3
    waits; MATCH ⇒ ⛔ note. Re-check the Policy-meaning sentence against LS10's answer.
  - [ ] 0.3 The author-commit decision (next free id ≥ `-384`; "supersedes ⛔ thing; realises `-305` §2 item 2 and `-310` CF1 A's *"then
    each member's choice"*; overtakes `-303`'s not-ratified *"and when they first use the app"* as `-305` already did; records edge (i)
    as the AUTHOR'S READING (CF1 A is silent on a non-chooser), edge (ii) per LS10's answer (noting it leans on `-303`'s not-covered
    list, ⛔ ruled text), the freeze-row-10 reading with both sides (LS4), the LS7 bilingual label (a departure from UX `:554`, argued
    under `:1126`), LS15's answer, and LS10 (c) as the Panel's, ⛔ taken"); stage in the scratchpad, try the insert
    ([[project_decision_log_writes_user_inserted]]); commit it ALONE (`governance:` prefix); write its SHA only AFTER the commit.
  - [ ] 0.4 Records commit: the `epics.md` Story 6.35 entry (Epic 6, after 6.34 (`:3480`) — the post-hoc *"> **Added 2026-10-… (Story
    6.35, Task 0.4)** —"* format); the LS14 roster row if (a); deferred-work: W8 marked *"Closed by 6.35 (AC3)"* at EVERY site that cites
    it (deferred-work *"W8 — `locale_source` is a literal…"* and 6.27c Review Defer W8 `:692` — grep *"locale_source. is a literal"*;
    6.27c's totals lines only count it), the LS11 item, LS12 (b) if chosen; dated notes on 6.27 PM22, 6.27c R10 and R11, 6.31 WR14 and
    WR7 (*"built per recipient by 6.35"*), the DLT sheet `dlt-template-requests-6-19.md:18-22` (the hold rule per LS10's answer) and
    `:218`, and — under LS10 (a) — 6.37 AC9 (a); the ledger (next free letter ≥ `ae`). (The 6-35 sprint-row comment was already
    annotated at creation — ⛔ again.)
- [ ] **Task 1 — Schema + the one read (AC1, AC3; LS1, LS8, LS9)**
  - [ ] 1.1 The migration (F16; T1) + journal; `schema/members.ts` (+ dated comment), `schema/claim_peer_mesh_pings.ts` (`locale`
    column; `PEER_MESH_LOCALE_SOURCES` widened), `schema/claim_peer_mesh_wa_reminders.ts` comment (its type imports
    `PeerMeshLocaleSource`, so it widens automatically). `db:migrate` on :5433; `psql -f` twice.
  - [ ] 1.2 Domain setter/reader for the member choice — `packages/domain/src/member/preferred-locale.ts`
    (`getMemberLanguage(db, { pariwarId, memberId })` ⇒ `{ chosenLocale, pariwarDefaultLocale }`, `setMemberLanguage(db, {…, locale })`
    ⇒ `{ changed: boolean, … }` — `UPDATE … SET preferred_locale = $l, preferred_locale_set_at = now(), updated_at = now() WHERE
    member_id = $m AND pariwar_id = $p AND preferred_locale IS DISTINCT FROM $l RETURNING` (the `custom-fields/member-write.ts:117-121`
    precedent); ⛔ opens a transaction — the caller's scoped `Db`); export via the `member` barrel (`member/index.ts`).
  - [ ] 1.3 `resolvePeerRequestLocale` per LS8 (explicit predicates; called after step ③); `resolvePariwarDefaultLocale`; `beginFresh` /
    the re-claim per LS9 (thread `locale` + `source`; a `locale IS NULL` re-claim writes the Pariwar default; return `locale` in `begun`);
    keep `PeerRequestLocaleMissingError`.
  - [ ] 1.4 Legs (:5433): AC3's resolver (cross-tenant on the jobs handle) and re-claim legs; the freeze, written-once and R15 guard
    legs; FLIP F14's two specs (dated comments); move `peer-mesh-request.spec.ts:558-559` to the new signature; the setter's `changed` legs.
- [ ] **Task 2 — The API (AC2; LS2)**
  - [ ] 2.1 Contracts `member-language/language.ts` + index export + lockstep test (T6).
  - [ ] 2.2 `apps/api/src/modules/member-language/{routes,handlers}.ts` (the Life Events shape, F10 — with the module's own rate-limit
    const and the audit AFTER commit, LS2) registered where the other member modules are; `'member.language_changed'` added to
    `audit-sink.ts`'s union; domain errors mapped (or a 500 — T7).
  - [ ] 2.3 `emit-openapi.ts` paths → `pnpm contracts:emit-openapi`; commit `openapi/v1.yaml` (after the rebase — 3.3c changed it).
  - [ ] 2.4 `packages/api-client`: `memberLanguage()`, `memberLanguageSet(locale)` on the member client (the `member*` naming
    convention); 8-15 edits a doc comment in the same file (`:575-583`).
  - [ ] 2.5 AC2's integration legs (`apps/api/tests/integration/member-language/member-language.spec.ts`).
- [ ] **Task 3 — The senders (AC4, AC5; LS9, LS10)**
  - [ ] 3.1 `claim-peer-mesh-requests.ts`: `pariwarConfig` per LS10's answer ((a) both locales' DLT id + pre-flight, else hold; (b) both
    locales' state resolved, the Pariwar held only on a non-template gap or both unusable; the begin waits a recipient on their OWN
    language's gap; a skip / back-off for a claim whose only due ping waits), ⛔ `locale` in `PariwarSendConfig`; the child takes `locale`
    from each `begun` result (`:715-721`); update the header lines `:4`, `:10-11`, `:14` that say "the Pariwar's language" (dated).
  - [ ] 3.2 `peer-mesh-wa-reminder.ts` + `claim-peer-mesh-wa-reminders.ts` (F13): `peerMeshWaReminderConfig` resolves BOTH template
    names (`templates: Record<'hi'|'en', string | null>` — `null` = unset; ⛔ `locale` / `localeSource` in the config; LS10 decides what a
    missing / refused one does); `beginPeerMeshWaReminder`'s input `template` → `templates`; the begin calls `resolvePeerRequestLocale(db, { pariwarId,
    memberId: ping.member_id })` after the eligibility read, writes `template_name` / `locale` / `locale_source` of THAT locale (INSERT
    `:354-360`, re-claim `:368-375`), and returns `locale`, `localeSource`, `templateName` in `begun`; the send (`:669-675`) uses `begun.*`.
  - [ ] 3.3 FLIP `apps/jobs/tests/claim-peer-mesh-wa-reminders.test.ts:73-77` (dated); FLIP `claim-peer-mesh-requests-live.test.ts:954`
    (dated) — wholly under LS10 (a), its English-Pariwar half under LS10 (b); update the reminder begin callers in
    `packages/domain/tests/integration/claim/peer-mesh-wa-reminder.spec.ts` and `…-concurrency.spec.ts`; AC4 / AC5 legs; every existing
    6.27c / 6.31 leg green with fixtures provisioning BOTH locales (T3).
- [ ] **Task 4 — The app (AC6–AC9, AC15; LS3–LS7, LS13, LS15)**
  - [ ] 4.1 `lib/app-language.ts` (LS3, LS5) with injectable storage + client; `_layout.tsx` `initialLocale` (+ its `:88-92` comment).
  - [ ] 4.2 `session-context.tsx`: ONE effect keyed on `session?.memberId` calls `syncAppLanguage` (sign-in and start); ⛔ touch any of
    the three clear paths (LS3 keeps the keys) — a dated comment saying so. ONE new app-level `AppState` → `active` listener for the
    resync (the four screen-scoped listeners stay as they are); the single-flight PUT and the choice counter live in `lib/app-language.ts` (LS5).
  - [ ] 4.3 `app/(settings)/language.tsx` (with its `Stack.Screen` title), `components/settings/LanguageSettingsEntry.tsx`, the home-tab
    mount, the login switch; `(settings)/_layout.tsx` comment; enrol the new / edited files in `microcopy.yaml` `code_globs` (AC10).
  - [ ] 4.4 Copy (AC10); the three F20 CODE comments corrected (`code-delivery.ts:40`, `moderation-notify.ts:310`,
    `contribution-notify-triggers.ts:236`); `(tabs)/_layout.tsx:24-26` KEPT (it anticipates the switch).
  - [ ] 4.5 Legs: AC6–AC9 (`tests/unit/app-language.test.ts`, `language-screen-render.test.ts`, `language-copy-keys.test.ts`, a login
    render leg, the three-clear-paths source scan); a route source test — `LanguageSettingsEntry` holds `'/(settings)/language'` and
    `app/(settings)/language.tsx` exists (the `wa-signup-step-render` PREV/NEXT shape; `tsc` accepts any two-segment `Href` —
    [[project_mobile_typed_routes_worktree]]), proven RED.
  - [ ] 4.6 LS15 per the answer (AC15).
- [ ] **Task 5 — The export (AC11; LS12)** per the answer.
- [ ] **Task 6 — Close (AC12, AC14)**
  - [ ] 6.1 AC12's diff statement in the Debug Log.
  - [ ] 6.2 `ci:local` on :5433 (AC14); every new leg shown RED against the pre-change code (AC3 re-claim, AC4 split, AC5 per-recipient,
    AC7 switch, AC9) — say so in the Debug Log.
  - [ ] 6.3 Records that become stale on `done`: 5-10 F15, 6.30's *"always renders Hindi"*, 6.27 PM22 RECORDED line, 6.27c `:35` and
    `:731-732`, 5-13 `:491`, `-310`'s reading — dated notes, ⛔ edits; the memory `project_mobile_app_no_language_switch` updated (it will
    be FALSE; also drop its stale *"Panel confirm CF1 owed"* — ruled by `-310`).
  - [ ] 6.4 Story Status → `review`; sprint row → `review`; ledger.

## Dev Notes

### ⚠ TRAPS

- **T1 — Migration.** Hand-authored; journal `when` = previous + 86400001; ⛔ `db:generate`; idempotent (`ADD COLUMN IF NOT EXISTS`,
  `DROP CONSTRAINT IF EXISTS` before each re-ADD, `CREATE OR REPLACE FUNCTION`). The CHECK names are `claim_peer_mesh_pings_locale_source_check`
  (0156:61) and `claim_peer_mesh_wa_reminders_locale_source_check` (0171:75) — re-ADD under the SAME names (the reminders spec asserts
  its name, `peer-mesh-wa-reminder-record.spec.ts:216`; the pings spec asserts the code 23514 only). The new pings CHECK is
  `claim_peer_mesh_pings_locale_check`. The guard function: `CREATE OR REPLACE` from 0166's FULL body (`:78-128`) — copying 0156's shorter
  body (`:68-93`) silently DELETES 6.27c's R15 attempting-row checks. ⛔ edit 0156 / 0166 / 0171 (applied).
- **T2 — The freeze trigger is a column LIST, and it only freezes FINISHED rows.** A new pings column ⛔ in `delivery_cols` is silently
  rewritable after a finished send; and on an `attempting` row nothing stops a re-claim rewriting `locale` (F15) — AC3's freeze and
  written-once legs prove both.
- **T3 — Both-locale fixtures.** A fixture that provisions only one template: under LS10 (a) it HOLDS; under (b) only a leg with a
  recipient of the missing language waits. Fix the shared fixture helpers ONCE (provision both); ⛔ weaken the check. A leg that wants
  the hold / wait unsets ONE.
- **T4 — `initialLocale` is read on mount only** (F1). The stored language must be read SYNCHRONOUSLY before the provider mounts
  (`_layout.tsx` already waits for fonts — read it at module or component top, ⛔ in an effect). A later change goes through `setLocale`.
- **T5 — `useT()` is a fresh closure** — depend on `locale` from `useLocale()`, ⛔ `[t]` in files this story adds or edits
  ([[project_uset_fresh_closure_memo_trap]]; `notifications.tsx` had the loop). ⛔ call `syncAppLanguage` from a render path. A string
  stored in STATE via `t()` (`login.tsx`'s `setError`) does ⛔ re-translate on a switch (F22) — on the login screen, clear the error on
  switch or store the KEY.
- **T6 — Contracts tests are outside tsc** ([[project_contracts_tests_outside_tsc]]) — run `vitest` in `packages/contracts`.
- **T7 — Map every new domain error** in the API error mapping or it surfaces as a 500 (5.4's lesson).
- **T8 — ⛔ The "first launch" trap in disguise.** `syncAppLanguage` must ⛔ PUT what it DISPLAYS (LS4's Pariwar default, the stored
  phone language for a member with ⛔ server value). Only a `pending` record — written ONLY by `chooseLanguage` — may be PUT.
- **T9 — JSDoc** — bold markdown like `**cl.3**` inside `/** */` can close it ([[project_markdown_emphasis_closes_jsdoc]]).
- **T10 — Pre-push** hits :5432 — push with `DATABASE_URL=…:5433` ([[project_prepush_hook_inherits_5432]]); live-DB known failures
  ([[project_known_livedb_test_failures]]); a `deadlock detected` is lock order ([[project_fk_truncate_cascade_deadlock]]).
- **T11 — Same-tx `now()`.** The `set_at` "unchanged on a repeat PUT" leg needs two transactions ([[project_db_clock_ordering_tests_tie]]).
- **T12 — Fabric lists.** If the screen grows a list, render empty/error OUTSIDE it ([[project_fabric_flatlist_empty_populated_crash]]);
  two options need ⛔ list.
- **T13 — RLS does ⛔ guard the senders** (F23). The jobs handle is BYPASSRLS: every new read in `peer-mesh-request.ts` /
  `peer-mesh-wa-reminder.ts` carries its own `pariwar_id` predicate, and its cross-tenant leg runs on that handle — ⛔ under
  `SET LOCAL ROLE twt_app`, which would pass even with the predicate missing.
- **T14 — Accessibility assertions under mocks.** The render scaffold's tamagui / RN mocks drop a11y props (AC7) — forward them and prove
  the assertion RED by dropping the prop, or the radio / alert legs test nothing.

### Reuse map

| Need | Use | ⛔ Rebuild |
|---|---|---|
| locale state | `useLocale().setLocale` (`@twt/i18n/react`) | a second context |
| phone store | `mmkvStorage` + an injected `SyncStorage` (`lib/known-people-saved-names.ts:19-38`) | AsyncStorage, a new MMKV instance |
| member write route | Life Events (`life-events/routes.ts:91-127` — the posting route's `config: { rateLimit }`; `handlers.ts:205-251`) | an RBAC key |
| audit | `emitAuthAudit` + the closed union — AFTER `closeScopeTx(…, true)` (LS2) | `writeAuditEntry` directly (access-wrapper gate) |
| tenant-scoped member read in jobs | `readPeerMeshRequestEligibility`'s explicit `pariwar_id` predicate (`peer-mesh-request.ts:193-196`) | relying on RLS (F23) |
| locale enum | `localeEnum` (`schema/pariwar_passport.ts:54`) | a new pg enum |
| settings entry | `NotificationSettingsEntry.tsx` | a settings menu |
| choice control | `accessibilityRole="radio"` + `accessibilityState={{ checked }}` in an `accessibilityRole="radiogroup"` container (`(claim)/contact.tsx` `ChoiceRow` `:45-64`, `:262`, `:267,276`) | a new primitive |
| inline error line | `accessibilityRole="alert"` + `accessibilityLiveRegion="assertive"` (+ iOS `announceForAccessibility`) — 3.3c `kyc.tsx`, `contact.tsx:154-157` | `role="alert"` |
| screen title | `<Stack.Screen options={{ title: t(…) }} />` (`notifications.tsx:208`) | a custom header |
| render-test scaffold | `tests/unit/wa-notifications-screen-render.test.ts` | a mocked `useT` |
| copy-key test | `tests/unit/wa-notifications-copy-keys.test.ts` | — |
| timeouts | `withTimeout` (`lib/with-timeout.ts`, `CALL_TIMEOUT_MS`) | a hung fetch ([[project_tanstack_refetch_rejoins_hung_fetch]]) |

### Testing standards

Domain / jobs / API integration on :5433 with `DATABASE_URL` set explicitly; `ci:local` the same. Mobile: vitest, `.test.ts`,
`// @vitest-environment jsdom`, mock `react-native-mmkv` or `lib/mmkv` and `lib/member-api`, RTL `cleanup` in `afterEach`
([[project_mobile_vitest_and_expo_install_traps]]). Every new leg RED against the pre-change code (Task 6.2).

### Project structure notes

New: `packages/contracts/src/member-language/`, `apps/api/src/modules/member-language/`, `packages/domain/src/member/preferred-locale.ts`,
`apps/mobile/lib/app-language.ts`, `apps/mobile/app/(settings)/language.tsx`, `apps/mobile/components/settings/LanguageSettingsEntry.tsx`,
one migration. Edited: the two schedulers, `peer-mesh-request.ts`, `peer-mesh-wa-reminder.ts` (begin input and result change),
three schema files, `_layout.tsx`, `session-context.tsx`, `login.tsx`, `(tabs)/index.tsx`, `(claim)/contact.tsx` (LS15 (b) only),
`common.json` ×2, `microcopy.yaml`, `audit-sink.ts`, `emit-openapi.ts` + `openapi/v1.yaml`, `packages/api-client/src/index.ts`, three
comment lines (F20), the data-export trio (LS12 (a)). ⛔ New package ([[feedback_no_premature_package]]);
⛔ edit to `packages/i18n/src`.

### Sequencing

- 6-36d (nominee exclusion at selection) — S2 FIRES. ⛔ shared CHECK or function: 6-36d widens
  `claim_peer_mesh_pings_detail_vocabulary_check` / `…first_detail_vocabulary_check` and the IN-list in
  `claim_peer_mesh_pings_replacement_guard()`; 6.35 touches the `*_locale_source_check` pair, the new `*_locale_check` and
  `claim_peer_mesh_pings_guard_delivery()`. Real collisions: both name "the next free" migration (0179, journal idx 179, `when`
  `1794973200023`); both edit `schema/claim_peer_mesh_pings.ts`; both change the INPUT types of `beginPeerMeshRequest` and
  `beginPeerMeshWaReminder` (6-36d adds `nomineeMobileIndexes`, its ND4) and the two child call sites (`claim-peer-mesh-requests.ts:620-623`,
  `claim-peer-mesh-wa-reminders.ts:569-578`) and the same domain spec callers; under LS10 (b) 6.35 may also need a detail-vocabulary
  value. Whichever lands second rebases, renumbers its migration + journal `when`, and re-runs both stories' legs.
- 3-3c LANDED (`40420410`) — rebase before Task 1; 8-15 touches `packages/api-client/src/index.ts` (a doc comment only).
- Rows 5-11 (SMS fallback) and the F21 senders read whatever this leaves; LS11's deferred item is their pointer.
- Go-live: the LS14 row; ⛔ merge fence.

### Previous story intelligence (6.27c, 6.31, 5.12)

- 6.27c: *"keep it a single function"* (R10); W8 names this story; holds are per Pariwar by design (header `:4`).
- 6.31: WR14 reads the language AGAIN at the reminder (⛔ copied) — keep that; its round-2 P6 pinned the source type on purpose;
  WR6 records a refused locale as "Meta refuses"; as built, a Pariwar ON that locale HOLDS (6.31 `:384-386`) — 6.35 makes it per
  recipient only under LS10 (b).
- 6.37: AC9 (a) moved the DLT pre-flight into `pariwarConfig` for the Pariwar's OWN locale precisely so a broken `en` template would
  ⛔ hold Hindi Pariwars (F12) — LS10 (a) would reverse it.
- 3.3c (landed): the freshest mobile precedent — the inline alert shape, `code_globs` enrolment (KB8), and `-382` KB6 on Hindi string
  approval without a roster row.
- 5.12: the screen re-fetch loop from `[t]` (T10 there); render tests under a REAL `LocaleProvider`; copy-key tests per screen; the
  governance-first commit order (decision alone → records → code).

### Git intelligence

The last five commits on `main` (`b883dc15` … `651ffc53`) are 6.37e's review rounds and ledger: author-commit decisions committed ALONE,
then records, then code; fences updated with dated comments, ⛔ deleted; ledger letters per commit.

### Latest tech information

⛔ library change. `react-native-mmkv` v4 (`createMMKV`) is already pinned; `useLocale`/`setLocale` are the repo's own. ⛔ add
`expo-localization` or an i18n framework (I1 forbids device inference; the repo's `@twt/i18n` is the system).

### References

- `.decision-log.md` — `2026-10-10-303` (Q1 rider, Consequence 3, Our reading), `2026-10-10-305` §1 (a)(b), §2 items 2 and 5,
  `2026-10-10-310` CF1 A + Our reading, `2026-10-10-311` PM22, `2026-10-19-365` WR14 / WR6, `2026-09-28-263` FQ10 A,
  `2026-10-22-382` KB6; `epics.md` freeze table row 10 (`:555`); 6.37 AC9 (a)
- `_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-10-10-6-27-confirms.md` (CF1 option A as put)
- `_bmad-output/implementation-artifacts/6-27-peer-mesh-sending-replies-and-date-of-death.md` (PM22, F26, F32),
  `6-27c-peer-mesh-sending-texts-and-links.md` (R10, BF14, Review Defer W8), `6-31-peer-mesh-whatsapp-reminder-at-48-hours.md` (WR14, P6),
  `5-12-whatsapp-yes-lasts-until-withdrawn.md` (T10, the screen tests)
- `deferred-work.md` — *"`locale_source` is a literal in the begin"* (W8); *"OTP DLT templates are English-only"* (context, ⛔ closed)
- `_bmad-output/planning-artifacts/epics.md` FR-68; PRD §4.10 FR-68; `ux-design-specification.md` §Platform Strategy, Pattern 12
- `docs/launch-gate-inventory/dlt-template-requests-6-19.md` (templates 13 / 14), `inventory-roster.md` Rows 27, 28, 35 (b)
- Code: as cited in F1–F24

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List

## Change Log

| Date | Version | Change |
|---|---|---|
| 2026-10-22 | 1.0 | Created via `bmad-create-story 6.35` at `b883dc15` — three read-only research passes (governance trace; mobile i18n; server language reads + precedents). LS1–LS14 PROPOSED; ⛔ Panel routing owed (§0). Status ready-for-dev. |
| 2026-10-22 | 1.1 | Validated (`bmad-create-story validate 6.35`; three read-only verifiers — governance / server-domain-jobs / mobile-client; BigDev "all"). Critical: LS10 rewritten with ⛔ ⭐ — the DLT id is GLOBAL (6.37 AC9 (a) reversal under (a)), a hold drops as well as delays, `-303` / WR6 per-locale refusal ⇒ §0 edge (ii) decided at Task 0.2 with LS10; the reminder resolves per recipient INSIDE the begin (both template names in config); LS15 / AC15 added — `contact_locale` is the filer's screen language (claim-contact family + `hindi_not_reviewed`); numbers re-stated (≥ `-384`, ledger ≥ `ae`, 6-36d's 0179 race). Also: freeze row 10 + UX `:554/:718/:1126` (Pattern 12 mis-cite), edge (i) as the author's reading, `-382` KB6 as LS14 (b), stale records (DLT sheet, R11, WR7, 5-13, two code comments), F22–F24, explicit tenant predicates (jobs BYPASSRLS), pre-6.35 re-claim writes the Pariwar default, guard full body + written-once arm, LS2 audit-after-commit / rate-limit precedent, the export paths, a11y shapes and mock forwarding, sync races, `pnpm i18n:check`, route / clear-path source tests. ⛔ Code. |
| 2026-10-22 | 1.2 | Re-validated (a fresh-context read-only verifier on the v1.1 edits; BigDev "re-validate once then commit"). Critical: LS10 (b) rewritten so it IS the MATCH §0 (ii) says — both locales resolved, the Pariwar held only on a non-template gap or both unusable, a recipient waits only on their OWN language's gap (`:954`'s English-Pariwar half flips; the refused-vs-unset split needs a config value or merges; the starving-claim cost and a skip / back-off); LS15 (b) no longer pins the submitted `locale` alone (it is also the agreement evidence, `claims.contact.handlers.ts:132-133`) — the contact screen renders in Hindi instead, with (b′) a body split. Also: the hold mechanism corrected (an unsent text stays `not_sent`; an un-begun reminder gets ⛔ row); WR6 "as built" is a Pariwar hold on the refused locale; `-303`'s not-covered clause labelled ⛔ ruled; I1 kept by dropping a null pending from an earlier app process (⭐); freeze row 10 both sides; LS7 a departure from UX `:554` argued under `:1126`; F19 bare `.select()`; the render mock gains `XStack` / `onPress`; six line pointers; W8 closure wording; AC3 cross-Pariwar leg throws; T3; Task 4 header. ⛔ Code. |
