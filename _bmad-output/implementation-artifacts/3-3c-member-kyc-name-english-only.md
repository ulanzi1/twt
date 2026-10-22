---
baseline_commit: b883dc15
---
<!--
PINNED: created against origin/main = b883dc15 (fetched 2026-10-22), on branch `story/3-3c-member-kyc-name-english-only`
  (worktree `.claude/worktrees/3-3c-member-kyc-name-english-only`). Re-check at Task 0.1.
§0 GATE: the words are the Trustees' — `-227` cl.1 (Trustee-ratified, "Please use English Name everywhere") — but `-227` itself
  lists "the wider English-name sweep of cl.1 (member KYC, Story 6.5)" as ⛔ covered and ⛔ scheduled, and its scope answer gated
  only the two names 6.18 compares. Applying the rule to the member's own KYC name WIDENS that set from two names to three. The
  authority for the widening is `-378` §0 (author-commit: "the English-only capture of member KYC names … are the author's"), and
  the Panel was TOLD (the sent full-name note; `-379` answered it without objection). Every build decision below is the AUTHOR's
  (KB1–KB8). ⛔ Panel question. ⛔ Counsel question. See "Panel questions: NONE" for why the widening stays the author's.
GLYPH REGISTER: `⛔` negates the words after it · `⭐` = act on this · `⚠` = hazard. ⛔ `file:NNN` into `.decision-log.md`,
  `deferred-work.md`, `sprint-status.yaml` or `inventory-roster.md` — cite the decision id, the item's phrase or the row key. Code
  cites (`path:NNN`) are as of `b883dc15`; re-check at Task 0.1.
NUMBERS: no decision id is claimed here. The decision id and the ledger letter are "the next free one" at the commit that takes
  them (`-366` decision 6). At creation: newest decision `-381` ⇒ next `-382`. ⚠ Creation WROTE ledger letter `2026-10-22v`
  into this worktree's uncommitted `sprint-status.yaml` — writing is ⛔ a claim: `story/8-15-…` has since COMMITTED its own
  `2026-10-22v`, the `6-35` worktree holds a `v` and the `6-36d` worktree a `w`. ⇒ Task 0.1 RE-LETTERS creation's line to the next
  free letter (S3 scan FIRST), and Task 0.4 takes the next free one after that.
LETTERS: G = found facts · KB = build decisions · N = invariants · TR = traps · AC0–AC7 · S = Task 0.1 stop conditions.
-->

# Story 3.3c: The Member's Own Name Is Typed in English in the Manual KYC Fallback — "in English, as on Aadhaar" `[SURFACE]`

Status: review

> **WHAT THIS STORY IS, IN ONE PARAGRAPH.** A member signing up who enters their details manually — offered beside DigiLocker on the
> choose screen, and again after a DigiLocker failure — types their own name, date of birth (and optionally a photo) on the manual KYC
> screen. Today that name may be typed in any script — Hindi letters included — and it is stored exactly as typed. `-227` cl.1
> (Trustee-ratified) says *"Please use English Name everywhere"*; its scope answer gated only the two names 6.18 compares and left
> **member KYC names** as an owed sweep, ⛔ scheduled; `-378` decision 6 (author-commit) scheduled this half of it: the manual
> fallback's typed name becomes **English-only
> at input**, using the SAME `EnglishScriptName` predicate Story 6.18 built for the nominee and account-holder names, and its label says
> *"in English, as on Aadhaar"*. ⛔ Transliteration anywhere. ⛔ Backfill. ⛔ Any output schema gated. DigiLocker's name (`Poi@name`) is
> already the English name on the Aadhaar and is ⛔ touched.

**What already ships and this story READS — rebuild none of it:**
- `EnglishScriptName`, `ENGLISH_NAME_REGEX`, `isEnglishScriptName` — `packages/contracts/src/_common/primitives.ts:65-153` (Story 6.18 AC12).
- The manual KYC route `POST /api/v1/member/kyc/manual` — `apps/api/src/modules/kyc/kyc.routes.ts:49-56`, handler `kyc.handlers.ts:357-447` (Story 3.3b).
- The manual KYC screen — `apps/mobile/app/(signup)/kyc.tsx` (Story 3.3b).
- The `{ error: { code: 'request.validation', … details: { issues } } }` 400 envelope — `apps/api/src/middleware/error-mapping/index.ts:158-168`.
- The shared real-`t()` copy-test pattern — `apps/mobile/tests/unit/nominee-name-copy-resolves.test.ts` (Story 6.18).

## Story

As a teacher signing up who enters my details manually instead of through DigiLocker,
I want the manual KYC screen to ask for my name in English, exactly as it is printed on my Aadhaar, and to tell me plainly — before I
submit — when what I typed is not in English letters,
so that the name the Trust holds for me is the same English name every other part of the system (claims, texts, the death-certificate
check) compares against, and no one ever has to guess whether two scripts spell the same person.

## The rulings and records this story builds on

| Source | Key (verbatim, abridged) | Status |
| --- | --- | --- |
| [`-227`](../../.decision-log.md#decision-2026-09-20-227) cl.1 | *"No transliteration should not be counted as clerical reason. Please use English Name everywhere to avoid this."* Scope answered in-session: the two names 6.18 compares, *"validated to English script **from now on**; rows already stored stay exactly as they are and are ⛔ **never rewritten**. ⚠ The wider sweep — **member KYC names** and Story 6.5's **death-certificate name comparison** … owes its own story."* ⚠ Its "What this ruling does ⛔ NOT cover" list: *"the wider English-name sweep of cl.1 (member KYC, Story 6.5) — recorded, ⛔ not scheduled."* | Trustee-ratified — member KYC names are ⛔ covered by it |
| Committed readings of `-227`'s scope | Story 6.19 D9 (`6-19-correction-return-reminders-and-closure.md`; carried into 6.19a as "D9 (claimant name ⛔ not English-gated)"): *"D9 — the claimant's NAME is ⛔ not English-gated. `-227` cl.9 scoped the gate to the two names the check compares; UX-DR57 requires bilingual input."*; `packages/contracts/src/claims/contact.ts:18-19`: *"`-227` cl.9 scoped the English rule to the two names the name check compares, and UX-DR57 requires bilingual input"* | both stand — this story widens the set by ONE field (the member's own typed KYC name) on `-378`'s authority; the claimant's name stays bilingual |
| [`-378`](../../.decision-log.md#decision-2026-10-22-378) decision 6 | *"The manual fallback becomes English-only (the `EnglishScriptName` input predicate, its label "in English, as on Aadhaar") — a NEW row `3-3c-member-kyc-name-english-only: backlog`. ⛔ Transliteration anywhere (`-227`). ⛔ Backfill: the app is ⛔ in production. A non-English name that still reaches a text gets the same rule in its own script."* §0: *"…and the English-only capture of member KYC names (decision 6 — it BUILDS `-227` cl.1's "Please use English Name everywhere", whose scope answer recorded member KYC names as an owed sweep, ⛔ an exclusion) are the author's."* Does NOT cover: *"Story 6.5's death-certificate name comparison (`claim/parity.ts`) — the rest of `-227`'s owed sweep (`deferred-work.md` (b-4)), ⛔ in row 3-3c"* | author-commit |
| The sent note `trustee-panel-routing-note-2026-10-22-6-37e-full-name-two-slots.md` | *"Where a member types it instead, the app will ask for it in English — your own ruling (`-227`: "Please use English Name everywhere")"*; its E2 lists the change under "What is NOT ratified" | TOLD to the Panel, ⛔ asked; the Panel answered the note (`-379`, "Q1 A, Q2 A") without objecting |
| [`-379`](../../.decision-log.md#decision-2026-10-22-379) "Not covered:" | *"English-only capture of member KYC names — the author's, row `3-3c-member-kyc-name-english-only` (`-378` decision 6)."* | a not-covered line in a Trustee-ratified entry — ⛔ a ruling on this story |
| [`-380`](../../.decision-log.md#decision-2026-10-22-380) "Does NOT cover" | *"English-only capture of member KYC names (row `3-3c-member-kyc-name-english-only`)"* | a not-covered line in an author-commit — ⛔ a ruling |
| Story 6.18 AC12 + its review patch + the `primitives.ts` doc block | AC12: *"allowing Latin letters, spaces, `.`, `'` and `-`"*, ⛔ on an output schema, ⛔ backfill, and the sentence *"the gate is ⛔ not applied to member KYC names (`domain/src/kyc/name.ts` is deliberately Devanagari-aware) or to Story 6.5's death-certificate comparison … — `-227` cl.9's wider sweep is its own story"* — ⭐ THIS story is that story. Accented letters REFUSED: an explicit BigDev decision (2026-09-20) recorded in the `primitives.ts` doc block; acceptance of iOS smart apostrophes and three non-breaking spaces (U+00A0 / U+2007 / U+202F) is in the code (`primitives.ts:97-123`); 6.18's `[Review][Patch]` item (the `ENGLISH_NAME_REGEX` / `D’Souza` one) says *"⭐ ask before widening"*. *"As printed on the passbook"* is `-227`'s AI-10-1 policy meaning | done |
| `deferred-work.md` (b-4) | *"`-227` cl.9's wider English-name sweep is ⛔ NOT in 6.18"* + its dated `-378` note (member KYC names → row 3-3c; the 6.5 half still open) | open (this story discharges the member-KYC half only) |
| `deferred-work.md` "rework code review of 6-37e … R1", first bullet | templates 8 / 10 / 12 Normal while carrying name variables; trigger *"MSG91's written answer or a device proof (Row 32 (d)), or row 3-3c `done` with existing names migrated"* | open — ⚠ see TR6: 3.3c `done` alone does ⛔ fire it |
| UX-DR57 (epics; an Epic 3 "UX-DR anchors" entry) and its source, `ux-design-specification.md` Pattern 6 | UX-DR57: *"Accepts both scripts natively; no in-app script-toggle; numeric inputs Latin-only with dignified hint on wrong-script entry."* Pattern 6: *"Input field accepts both scripts natively; placeholder text bilingual on critical fields (**member name**, school, district)."* Recovery: *"A user who enters in the wrong script (e.g., Hindi numerals in a numeric field) sees a dignified hint … **rather than blocked input**; auto-correction never silently changes characters."* | design requirement — ⚠ NARROWED for this ONE field (the member's own name), against an Epic 3 anchor that names it. 6.18 recorded ⛔ narrowing of UX-DR57 for its two names; this story records its own in the KB7 entry. The "dignified hint" survives (KB3); the "rather than blocked input" does ⛔ (G9) |
| PRD FR-2 | manual KYC fields are entered manually; the member waits on trustee validation | ⚠ no trustee review surface exists (G8) — ⛔ this story's |

Clause numbering: Story 6.18 numbers `-227`'s clauses 9–12 after `-226`'s 1–8, so 6.18's "`-227` cl.9" is the decision log's
`-227` **decision 1** ("cl.1" here). Same text.

## ⭐ THE INVARIANTS

- **N1 — ONE predicate.** The manual name uses `EnglishScriptName` (server) and `isEnglishScriptName` (client) from `@twt/contracts`
  — ⛔ a second regex, ⛔ `ENGLISH_NAME_REGEX.test(x.trim())` hand-rolled, ⛔ a KYC-specific variant (KB1).
- **N2 — INPUT-ONLY.** The gate goes on `KycManualSubmitRequest.name` and ⛔ nowhere else: ⛔ `KycProfile.name`
  (`packages/contracts/src/kyc/profile.ts:42` — the DigiLocker mapper's output; gating it would make a DigiLocker KYC throw),
  ⛔ `KycProfileSummaryResponse.name` (`signup.ts:109-118` — responses are serializer-parsed, so a gate there turns every stored
  non-Latin name and the RTBF `[anonymized]` sentinel into a 500; this read has ⛔ decrypt sentinel — `decryptKycField` throws),
  ⛔ the callback response (the same `KycProfileSummaryResponse`, `kyc.routes.ts:79`).
- **N3 — ⛔ Transliteration, ⛔ normalisation, ⛔ backfill.** The typed value is refused or accepted; ⛔ never rewritten. Rows already
  stored in another script stay exactly as they are and still read back.
- **N4 — Never a silent server-only 400.** The member sees the reason BEFORE submit (client check), and if a `request.validation`
  400 on the name still reaches the screen, it renders the English-name message — ⛔ today's *"DigiLocker is unavailable…"* (G6).
- **N5 — ⛔ Anything about DigiLocker, `kyc/name.ts`, `name-render.ts`, `claim/parity.ts`.** Read-side and the 6.5 half are out of scope.

## 📜 Policy meaning (AI-10-1, CONFIRMED BigDev 2026-08-18)

⭐ **This story ADDS A CONJUNCT to a predicate that gates a member's access to a benefit** — completing the manual KYC step, which is
what moves a signing-up member from `pending-kyc` to `pending-fee` (and so towards membership). Today the step needs a non-blank name and
date of birth; after this story it also needs the name to be in English letters.

> ⭐ *In the member's terms:* **"If you enter your details yourself instead of through DigiLocker, type your name in English letters,
> exactly as it is printed on your Aadhaar card. A name typed in Hindi letters is not accepted — the screen asks you to type it again in
> English, and nothing else about your signup changes."**

- **Checked against the Niyamavali:** `packages/domain/seed/niyamavali-v1-clauses.sql` was grepped for `aadhaar`, `kyc`, `digilocker`,
  `english`, `आधार`, `अंग्रेज़ी` / `अंग्रेजी`, `नाम` and `name` — ⛔ clause speaks to KYC, Aadhaar or the script of a name (the `name`
  hits are code comments; the only `नाम` hit is "नामितों", nominees, in R14). Result: **no conflict and no support** — the authority is `-227` cl.1 (Trustee-ratified), ⛔ the Niyamavali, which is a
  rulebook, ⛔ a spec ([[feedback_niyamavali_rulebook_not_spec]]). `docs/knowledge-transfer/niyamavali-fr-mapping.md` maps FR-2 to a
  *"KYC-verification Niyamavali clause"* that the v1 seed does ⛔ carry — recorded, ⛔ a blocker.
- **Checked against `-227` cl.1 and `-378` decision 6 VERBATIM:** "English Name everywhere" — MATCH; "the manual fallback becomes
  English-only (the `EnglishScriptName` input predicate …)" — MATCH (KB1 reuses it unchanged); label *"in English, as on Aadhaar"* —
  MATCH (KB2); ⛔ transliteration / ⛔ backfill — MATCH (N3); DigiLocker ⛔ touched — MATCH (N5).
- ⚠ **Sharp edges (the worst real outputs — shown to BigDev at Task 0.2 BEFORE any recommendation is taken):**
  1. **A member whose Aadhaar English name carries a character outside the class** — an accented letter (*"José"*), a comma
     (*"Kumar, Ravi"*), a digit, brackets — **cannot complete the manual step** with the name as printed. They can type it without that
     character, or use DigiLocker (which carries the printed name unchanged). Aadhaar English names are plain ASCII letters, spaces,
     dots, apostrophes and hyphens in practice, but ⛔ the repo holds proof of that (G10). Widening the class is a product decision
     (6.18: *"ask before widening"*) — KB1.
  2. **A member who cannot type English letters** must have someone help them type it — the friction ledger already names
     `relative (manual-KYC fallback)` as the payer of this step (KB5).
  3. **What a refusal does and does ⛔ do.** ⛔ Record, ⛔ state change, ⛔ flag, ⛔ penalty: the app does ⛔ send an un-English name, and a
     direct API call gets a 400 before any handler runs. But the step **cannot be completed** until the name is typed in English letters
     — edges 1 and 2 are real delays for the members they describe (a retype is possible at once; DigiLocker is ⛔ on the manual form — `kyc.tsx:257-291` has the title, the banner, two inputs
     and Submit — so it is reached only by leaving the KYC step and re-entering it).

## §0 re-run — every edge checked against the ruled words

| Edge | Against the ruled words | Outcome |
| --- | --- | --- |
| Whose decision | `-227`'s "does ⛔ NOT cover" list puts member KYC outside the ruling; `-378` §0 makes it the author's; the Panel was TOLD (sent note) and answered `-379` without objecting | WIDENS `-227`'s scope answer from two names to three on an author-commit — the author's per `-378` §0 (see "Panel questions: NONE") |
| Which field | `-378` d6: *"`KycManualSubmitRequest.name`"* | MATCH — only that field (N2) |
| Which predicate | `-378` d6: *"the `EnglishScriptName` input predicate"* | MATCH — unchanged (KB1 (a)) |
| Accented Latin refused | BigDev's 2026-09-20 decision (the `primitives.ts` doc block; 6.18's review patch); "as on Aadhaar" is this field's analogue of `-227`'s policy-meaning *"as printed on the passbook"* | the author's (KB1) |
| The label words | `-378` d6: *"in English, as on Aadhaar"* | MATCH — en verbatim; hi the author's translation, shown at Task 0.2 (KB2) |
| UX-DR57 "accepts both scripts natively" / Pattern 6 "member name" / "rather than blocked input" | a design requirement, ⛔ a ratified clause; `-227` cl.1 is Trustee-ratified and `-378` d6 applies it to this field | NARROWED for this ONE field, recorded in the KB7 entry; ⛔ the rest of signup (G9) |
| Stored non-English names | `-227` scope: *"never rewritten"*; `-378` d6: *"⛔ Backfill"* | MATCH (N3) |
| DigiLocker name | `-378` d6: *"`Poi@name` — the English name"* | MATCH — ⛔ gated, ⛔ touched (N5; TR2) |
| The death-certificate comparison | `-378` "Does NOT cover" | out of scope — (b-4) stays open for it |

⇒ ⛔ Panel question. ⛔ Counsel question.

## ⭐ FOUND FACTS (G — at `b883dc15`; re-check at Task 0.1)

- **G1 — The contract.** `packages/contracts/src/kyc/signup.ts:90-101`:
  `name: z.string().trim().min(1).max(200)` inside `KycManualSubmitRequest` (`.strict()`, with `dob` and optional `photo`). The file
  imports only `z` (:22) and `Iso8601Datetime` (:24). The doc comment (:85-89) says the record is stored `self_declared` *"awaiting
  trustee verify"*. `EnglishScriptName` is `z.string().trim().min(1).max(200).regex(ENGLISH_NAME_REGEX, 'Please enter the name in
  English')` (`primitives.ts:147-153`) ⇒ a **drop-in** swap (same trim / min / max).
- **G2 — The emitted OpenAPI** `openapi/v1.yaml` (the `KycManualSubmitRequest` component, ~:2182-2200) has `name: {type: string,
  minLength: 1, maxLength: 200}` and ⛔ `pattern`; `EnglishScriptName` fields elsewhere emit the pattern (e.g. ~:2274). Regenerate
  with `pnpm contracts:emit-openapi`; `contracts:check-openapi-determinism` checks it in CI.
- **G3 — The handler stores the name verbatim.** `kyc.handlers.ts:404` `encryptKycField(body.name, …)` → Tier-1 `name_ciphertext`
  (`member_kyc_profiles`), `source: 'manual'`, `verificationStrength: 'self_declared'`, `trusteeVerified: false`. ⛔ Normalisation,
  ⛔ HMAC. The name is ⛔ in the `member.kyc_manual_fallback` event or the `member_kyc.manual` audit. ⇒ ⛔ handler change is needed:
  the route's `schema.body` is `KycManualSubmitRequest` (`kyc.routes.ts:52`), so the contract change gates it.
- **G4 — `KycManualSubmitRequest` has ⛔ contract unit test in `packages/contracts/tests`.** Its only schema legs are
  `apps/api/tests/unit/kyc-signup.test.ts:162-186` (accepts `'Asha Devi'`, rejects empty name / empty dob / bad photo / unknown key).
- **G5 — Every existing request fixture is Latin** (`'Asha Devi'`, `'Asha'`, `'Ram Devi'`): `kyc/kyc-signup.spec.ts:167,218,245`,
  `signup/signup-create.spec.ts:445`, `wa-opt-in/wa-opt-in-code.spec.ts:121,533`, `wa-opt-in/wa-opt-in.spec.ts:454`. ⇒ ⛔ fixture
  breaks. Devanagari KYC names in the repo (`member-pool.test.ts:30` `'राजेश शर्मा'`; direct `INSERT`s into `member_kyc_profiles` in
  `public-pages/*`, `contributions/*`, `apps/jobs/tests/*`) are read-side and planted in the DB — ⛔ via the route — and must keep passing.
- **G6 — The mobile screen.** `apps/mobile/app/(signup)/kyc.tsx` (335 lines): `const [name, setName] = useState('')` (:71); the `Input`
  (:262-269) uses `placeholder` and `accessibilityLabel` `t('kyc.manual_name')`, `accessibilityHint` `t('kyc.manual_name_required')`;
  `onManualSubmit` (:172-191) checks only blank (`kyc.manual_name_required`, :173-175), then
  `memberAuth.kycManualSubmit({ name: name.trim(), dob: dob.trim() })` (:184); errors go to
  `setError(e instanceof ApiError ? kycErrorMessage(e.code) : t('kyc.fallback_empathy'))` (:188), where `kycErrorMessage` (:92-94)
  maps only the seven provider codes in `KYC_ERROR_CODES` (:34-42) and falls back to `kyc.fallback_empathy` — ⇒ **a
  `request.validation` 400 today renders "DigiLocker is unavailable — you can enter your details manually…" on the manual screen.**
  The banner is a red `<Text accessibilityRole="alert" accessibilityLiveRegion="assertive">` (:194-198). The name `Input` has ⛔
  `maxLength`. `offerManualFallback` (:143-147) enters the manual step with the banner ALREADY set (*"<error>. DigiLocker is
  unavailable…"*). **Reachability:** the choose screen offers "Enter my details manually" as a PEER of DigiLocker whenever
  `manualEnabled` (:313-326; initial state `true`, kept on a failed status read), and the API flag defaults ON
  (`apps/api/src/config.ts:404`, `KYC_MANUAL_FALLBACK_ENABLED ?? 'true'`) ⇒ the manual form is reachable without trying DigiLocker,
  and the route is ⛔ dark. ⛔ Mobile test covers this screen today; the jsdom + RTL render harness the other signup screens use
  exists (`apps/mobile/tests/unit/wa-code-entry-render.test.ts` — renders the real screen under `LocaleProvider`, mocks
  `react-native`, `tamagui`, `react-native-safe-area-context`, `../../lib/member-api`, `lib/mmkv` and `expo-router`, constructs
  `ApiError` directly). `kyc.tsx:28` imports `expo-web-browser`, which ⛔ mobile test mocks yet. `apps/mobile/tsconfig.json` excludes
  `tests/**` ⇒ `tsc` does ⛔ typecheck a new mobile test.
- **G7 — Copy** (`packages/i18n/locales/{en,hi}/common.json`, flat keys, `kyc.*` at lines 26-50):
  `kyc.manual_name` (:35) en *"Full name (as on Aadhaar)"* / hi *"पूरा नाम (आधार के अनुसार)"*;
  `kyc.manual_name_required` (:39) en *"Please enter your full name as written on your Aadhaar."* / hi *"कृपया अपना पूरा नाम वैसे ही
  दर्ज करें जैसा आपके आधार पर लिखा है।"*. Existing English-name keys: `nominees.name_english` (`common.json:57`, en *"Please write the
  name in English."* / hi *"कृपया नाम अंग्रेज़ी में लिखें।"*) and `nominee.bank.holder_english` (`claim.json:56`). ⛔ KYC-specific one.
  ⭐ **The mobile app always renders `hi`** (`packages/i18n/src/locale.ts:36` `DEFAULT_LOCALE = 'hi'`; `_layout.tsx:88-97` mounts
  `<LocaleProvider>` with ⛔ `initialLocale`; ⛔ `setLocale` call in `apps/mobile`) ⇒ **the Hindi strings are the ones members read
  today.** ⚠ Row `6-35-in-app-language-switch` (backlog, its own worktree) adds a language switch — once it lands the en strings are
  member-facing too, so review both locales as member copy.
- **G8 — ⛔ Anyone reviews a manual KYC submission.** ⛔ Code writes `trusteeVerified: true`; ⛔ admin KYC surface exists
  (`deferred-work.md`, "identity collision at signup is unenforced (2026-08-10)", row "Manual KYC"). FR-2's *"trustee-action queue"*
  is unbuilt — recorded, ⛔ this story's.
- **G9 — UX-DR57 precedent.** `packages/contracts/src/claims/contact.ts:18-19` keeps the CLAIMANT's name bilingual, citing UX-DR57;
  6.18 gated only the two names `-227` named. 3.3c gates the third field `-378` d6 named, and ⛔ any other signup field (address,
  workplace, posting stay bilingual).
- **G10 — Aadhaar's English name.** The DigiLocker mapper reads `Poi@name` only (`apps/api/src/modules/kyc/providers/digilocker/mapper.ts:69`;
  ⛔ `LData` / local-language block read anywhere). ⛔ Proof in the repo that `Poi@name` is always inside `ENGLISH_NAME_REGEX`; the
  fixture provider returns `'Fixture Member'` (`providers/fixture.ts:31`). ⇒ ⛔ gate on the DigiLocker path (N2 / TR2).
- **G11 — The predicate's own doc block excludes KYC names today.** `primitives.ts:93-95`, the LAST paragraph of the first JSDoc
  block (`:65-96`, closing ` */` at `:96`; a second JSDoc `:97-122` belongs to `ENGLISH_NAME_REGEX` at `:123`; `EnglishScriptName`
  at `:147` has ⛔ doc comment of its own):
  *"⛔ NOT applied to member KYC names (`domain/src/kyc/name.ts` is deliberately Devanagari-aware, and a KYC name is copied from a
  government document, not typed) nor to Story 6.5's death-certificate comparison (`claim/parity.ts`, a 20% fuzzy tolerance). cl.9's
  wider sweep is its own story."* — and its premise ("a KYC name is copied … not typed") is false for the manual path. ⚠ A second
  premise in the `ENGLISH_NAME_REGEX` block (`:113-114`): *"Two spellings of one name can therefore coexist. That is harmless HERE and
  nowhere else would it be: Trap 1 forbids the system comparing two names at all"* — ⛔ true for KYC names: `claim/parity.ts`
  machine-compares the decrypted `member_kyc_profiles.name` against the OCR name (moot in v1 — OCR returns nothing,
  [[project_ocr_v1_always_empty]]). ⇒ a DATED superseding note, ⛔ a silent rewrite ([[feedback_supersede_never_reinterpret]]) — AC4.
  The same exclusion sentence also stands in `6-18-nominee-holder-name-on-the-verification-console.md` AC12 ⇒ a dated note there too
  (Task 0.4).
- **G12 — `kyc/name.ts` is ⛔ input normalisation.** `packages/domain/src/kyc/name.ts` is a read-side display split
  (`splitFirstNameLastInitial`, Devanagari-aware via `Intl.Segmenter` grapheme `firstGrapheme`). It must keep working for stored
  Devanagari names (N3) — ⛔ touch it.
- **G13 — The friction gate.** `scripts/friction-budget/lib.ts:453` `MEMBER_FACING_PREFIXES = ['apps/mobile/', 'apps/public/']`; AC-4
  (`evaluateDeclaration`, :503+) passes ONLY on a NEW or AMENDED row in `friction-budget.md` or a NEW `**Story <id> disposition …**`
  block (:496 regex) — touching the file is ⛔ enough. `## The ledger` is at `friction-budget.md:16`; the existing row
  `| relative (manual-KYC fallback) | "facilitator" posture | forced |` (:28). 6.18's English-script row (:1571) sits OUTSIDE
  `## The ledger` — a `deferred-work.md` item records the gate never counted it.
- **G14 — The 400 envelope and its issue shape (VERIFIED).** `error-mapping/index.ts:158-168`: `{ error: { code: 'request.validation',
  message: 'Request failed schema validation', details: { issues: error.validation }, request_id } }`; the api-client raises
  `ApiError(400, 'request.validation', …, details)` (`packages/api-client/src/index.ts:286-298`; `ApiError` exposes `details`,
  `:197-211`). ⛔ Client reads `details.issues` today. Each issue is built by `fastify-type-provider-zod` 4.0.2
  (`node_modules/fastify-type-provider-zod/dist/src/errors.js:33-42`, read in the main checkout — same SHA) as
  `{ keyword: issue.code, instancePath: '/'+path.join('/'), schemaPath, params: { issue }, message }`. For a refused script on `name`:
  `{ keyword: 'invalid_string', instancePath: '/name', schemaPath: '#/name/invalid_string', params: { issue: { validation: 'regex', … } },
  message: 'Please enter the name in English' }`; for a 201-char name: `keyword: 'too_big'`, same `instancePath`. A shipped test
  already pins the form: `apps/api/tests/integration/claims/nominee-bank-helpline.spec.ts:399-405` asserts
  `issues.map(i => [i.instancePath, i.message])`. Zod 3 issues carry ⛔ the input value ⇒ the 400 does ⛔ echo the typed name, and the
  error handler sends 400s without logging them.
- **G15 — The OTHER writers of a member's own name.** Only two production writers of `member_kyc_profiles.name_ciphertext`: the manual
  route (typed) and the DigiLocker callback (`kyc.handlers.ts:243-259`, the government `Poi@name`). RTBF writes the `[anonymized]`
  sentinel (`packages/domain/src/member/anonymize.ts:168-170`). `members` has ⛔ name column; ⛔ profile-edit, admin-create or
  helpline KYC-entry path exists; the data-rights correction is a RECORD, ⛔ a write path. ⇒ the manual route is the ONLY typed path.
- **G16 — `microcopy:check` does ⛔ scan this screen.** `microcopy.yaml` `scope.code_globs` lists by name the mobile files 6.18, 6.21b,
  6.19c and 6.27a touched (e.g. `apps/mobile/app/(claim)/nominee-review.tsx`); `kyc.tsx` and the new `lib/kyc-manual-name.ts` are ⛔
  listed ⇒ its green says nothing about them. `common.json` IS in `copy_globs`, so the copy half is genuinely scanned. `kyc.tsx` carries
  two hex literals (`#C0392B`, `#1E8E3E`); the enrolled 6.18 files needed SCOPED hex allow-list entries (the `nominee-review.tsx`
  `'#(B00020|1E8E3E)\b'` entry and its reasoning block — the app-wide literal convention, ⛔ token layer in `apps/mobile`).

## ⚖️ Build decisions KB1–KB8 (PROPOSED — BigDev answers at Task 0.2; each ⭐ recommendation is what Tasks 1–6 build)

- **KB1 — Which predicate.** ⭐ **(a) Recommended:** `EnglishScriptName` / `isEnglishScriptName` UNCHANGED (`-378` d6 names it; N1).
  Worst output: a member whose printed Aadhaar English name has an accent, comma, digit or bracket cannot type it as printed (Policy
  meaning edge 1). **Cost:** that rare member drops the character or uses DigiLocker. **(b)** a KYC-only variant that also allows `,`
  (and/or digits). **Cost:** a second predicate that drifts from the nominee / holder names the death claim later compares against,
  and a name `-227` would then refuse on the nominee side. **(c)** widen the ONE predicate. **Cost:** changes 6.18's five live input
  surfaces at once — a product decision 6.18 reserved (*"ask before widening"*).
- **KB2 — The words** (both locales; the Hindi is what members read — G7). ⭐ **(a) Recommended:**

  | Key | en | hi |
  | --- | --- | --- |
  | `kyc.manual_name` (label — value CHANGED) | Full name (in English, as on Aadhaar) | पूरा नाम (अंग्रेज़ी में, आधार के अनुसार) |
  | `kyc.manual_name_required` (blank — value CHANGED) | Please enter your full name in English, as written on your Aadhaar. | कृपया अपना पूरा नाम अंग्रेज़ी में वैसे ही दर्ज करें जैसा आपके आधार पर लिखा है। |
  | `kyc.manual_name_english` (NEW — wrong script) | Please write your name in English letters, as it is printed on your Aadhaar. | कृपया अपना नाम अंग्रेज़ी अक्षरों में लिखें, जैसा आपके आधार पर छपा है। |

  ⛔ `{param}` in any of them (the resolver throws on a missing interpolation param). **Cost:** two existing values change in place
  (copy, ⛔ ratified text); and `kyc.manual_name_english` gives the WRONG REASON to Policy-meaning edge 1's members — *"José"*,
  *"Kumar, Ravi"*, *"Asha Devi 2"* are refused yet ARE in English letters, so the message tells them to do what they already did.
  **(b)** reuse `nominees.name_english` for the wrong-script message. **Cost:** it does ⛔ say "Aadhaar", ties the KYC screen's words
  to the nominee form's, and has the same wrong-reason gap. **(c)** an exact message for `kyc.manual_name_english`: en *"Please use
  only English letters (A–Z), spaces and . ' - in your name, as on your Aadhaar."* / hi *"कृपया अपने नाम में केवल अंग्रेज़ी अक्षर
  (A–Z), खाली जगह और . ' - का उपयोग करें, जैसा आपके आधार पर लिखा है।"* **Cost:** a longer, more technical sentence on a screen most
  members reach with a Devanagari name, for whom (a) is the plainer reason. ⇒ BigDev picks between (a) and (c) with edge 1 in view;
  if (a), the Change Log records that the message is knowingly approximate for edge 1.
- **KB3 — When the member is told, and how a screen reader hears it.** ⭐ **(a) Recommended:** a live inline message under the name
  field as soon as the trimmed value is non-empty and ⛔ English (the `nominee-review.tsx:333-342` markup — by analogy with UX-DR57's
  *"dignified hint on wrong-script entry"*, which the DR attaches to numeric inputs; it mounts once and its text does ⛔ change per keystroke, so TalkBack announces it once), AND `onManualSubmit`
  refuses before any request. Exactly:
  - on a NON-ENGLISH submit: `setError(null)` (clears the banner, including the stale *"DigiLocker is unavailable…"* that
    `offerManualFallback` may have set — G6), the inline message stays the ONE place the sentence shows, and
    `AccessibilityInfo.announceForAccessibility(t('kyc.manual_name_english'))` on BOTH platforms — ⛔ iOS-guarded. The
    `nominee-review.tsx:277-283` guard does ⛔ fit here: there the call fires in the same tick a live region MOUNTS, so unguarded
    TalkBack spoke it twice; here the inline alert mounted earlier while typing and its text does ⛔ change, so on submit the live
    region does ⛔ re-fire and, guarded, a TalkBack user pressing submit would hear nothing. VoiceOver ignores
    `accessibilityLiveRegion` (Android-only), so the call is also the ONLY iOS announcement;
  - while the inline message shows, the name `Input`'s `accessibilityHint` is `t('kyc.manual_name_english')` (else today's
    `kyc.manual_name_required`) — the message is programmatically tied to the field (3.3b AC4);
  - a BLANK submit keeps today's `setError(t('kyc.manual_name_required'))`, unchanged.

  **Cost:** one announce call on submit and a conditional hint. **(b)** on submit only (the `NomineeForm.tsx:118` pattern). **Cost:** the
  member types the whole form before learning the name was refused.
- **KB4 — A server 400 that still reaches the screen** (N4; G6, G14). With KB3, the client and server run the SAME script predicate,
  so a script refusal cannot reach the server from the app; the ONE name 400 the app can still trigger is a name over 200 characters
  (`isEnglishScriptName` has ⛔ length bound; the `Input` has ⛔ `maxLength`) — and a name-keyed mapping would then tell a member whose
  name IS in English letters to "write it in English letters". ⭐ **(a) Recommended:** `maxLength={200}` on the name `Input` (the
  same Tamagui `Input` takes it — `nominee-review.tsx:352` note, `:368` IFSC; 6.18's own holder-name field has ⛔ `maxLength`; RN
  `maxLength` and zod `.max` both count JS string length — a name 400 is then unreachable from the app), AND keep a narrow mapping as a guard: a
  `request.validation` `ApiError` with an issue where `instancePath === '/name'` AND `keyword === 'invalid_string'` renders
  `kyc.manual_name_english`; every OTHER error (incl. `too_big` on `/name`) keeps today's mapping, unchanged. **Cost:** the client reads
  `details.issues` for the first time (shape VERIFIED — G14). **(b)** `maxLength={200}` only, ⛔ mapping; N4 recorded as satisfied by
  construction. **Cost:** a future divergence between client and server predicates would fall back to the false "DigiLocker is
  unavailable" message silently. **(c)** any `request.validation` on this screen renders `kyc.manual_name_english`. **Cost:** a
  too-long DoB (`.max(40)`) would be blamed on the name.
- **KB5 — The friction declaration** (G13 — the mobile change trips AC-4). ⭐ **(a) Recommended:** ONE new row INSIDE `## The ledger`:
  `| member or relative (typing the member's own name in ENGLISH letters, as on Aadhaar, in the manual-KYC fallback — `-227` cl.1 /
  `-378` decision 6; INPUT-ONLY, ⛔ retroactive) | the member's name staying the one English name the claim checks compare against
  (⛔ transliteration at review) | forced |`, plus a `**Story 3.3c disposition (declaration row added) …**` block naming why.
  **Cost:** one ledger row. **(b)** a disposition block only (the existing `relative (manual-KYC fallback)` row already names the payer).
  **Cost:** the new script obligation is ⛔ named anywhere the gate reads — 6.18's row sits outside the ledger, uncounted.
- **KB6 — Hindi review of the new words.** Both precedents exist, and BigDev sees both: **for a row** — the go-live roster gates
  member-facing Hindi strings of the WhatsApp OPT-IN (consent) flow: Row 37 (`wa-opt-in-lasting-yes-hindi-reviewed`) (a) gates 5.12's
  `waNotifications.*` status strings — `active_desc` is consent wording (*"…until you turn them off here or reply STOP on WhatsApp."*) —
  and Row 39 (b) gates *"the 15 `waCode.*` Hindi strings"* of the same opt-in flow, labels and errors included, even though *"BigDev reviewed and edited
  them in session"* (Row 28's control pattern); **against a row** — 6.18's `nominees.name_english` / `nominee.bank.holder_english` and
  3.3b's own `kyc.*` strings carry ⛔ roster row. The real line: consent-flow copy (rows) vs a form label and validation messages
  (⛔ rows). ⭐ **(a) Recommended:** BigDev approves the three Hindi strings at Task 0.2 (KB2's
  table), recorded verbatim in Debug Log (a); ⛔ new roster row — the 6.18 / 3.3b precedent for name-field labels and validation
  messages beside already-shipped siblings (*"कृपया नाम अंग्रेज़ी में लिखें।"*). **Cost:** ⛔ second Hindi reader, where Rows 37 / 39
  required one for comparable strings. **(b)** a new roster row `kyc-manual-name-hindi-reviewed` gating go-live (Row 28's control
  pattern). **Cost:** a gate on three strings. ⚠ Either way, row 6-35 (G7) will make the en strings member-facing — review them as
  member copy too.
- **KB7 — The record.** ⭐ **(a) Recommended:** ONE author-commit decision entry (Task 0.3) recording: KB1–KB6 and KB8 as answered;
  **the basis** — `-227` cl.1's words, its "does ⛔ NOT cover" bullet quoted verbatim, the 6.19 D9 / `contact.ts` readings quoted, and
  the plain statement that this WIDENS `-227`'s scope answer from two names to three on `-378` §0's authority, with the Panel TOLD
  (sent note; `-379`); the UX-DR57 / Pattern 6 narrowing for this ONE field against its Epic 3 anchor (G9); and the dated supersession
  of the exclusion sentence at BOTH sites (`primitives.ts` and the 6.18 story file's AC12) and of the `ENGLISH_NAME_REGEX` block's
  "Trap 1 forbids … comparing" premise for KYC names (G11). **Cost:** one entry. **(b)** the story file only. **Cost:** the widening,
  the narrowing of UX-DR57 and the reversal of a recorded exclusion would live nowhere a decision grep finds.
- **KB8 — `microcopy:check` scope** (G16). ⭐ **(a) Recommended:** enrol `apps/mobile/app/(signup)/kyc.tsx` and
  `apps/mobile/lib/kyc-manual-name.ts` in `microcopy.yaml` `scope.code_globs`, with ONE scoped hex allow-list entry for `kyc.tsx`
  (`'#(C0392B|1E8E3E)\b'`, the reason pointing at the existing 6.18 reasoning block); the new inline message uses the screen's own
  `#C0392B`, ⛔ `nominee-review.tsx`'s `#B00020`. If enrolment surfaces findings on 3.3b's EXISTING lines, list them in Debug Log (c)
  and ask before fixing — ⛔ silently widen the story. **Cost:** possible pre-existing findings. **(b)** ⛔ enrol; record in the File
  List that the gate does ⛔ cover these files (owed with the broad `apps/mobile/**` glob). **Cost:** AC6's `microcopy:check` green
  says nothing about the screen.

## 🏛️ Panel questions: NONE

§0 (template): the question "may the manual KYC name be refused when not in English?" was ⛔ answered by `-227` — its "does ⛔ NOT
cover" list names *"the wider English-name sweep of cl.1 (member KYC, Story 6.5)"* as recorded and ⛔ scheduled. What holds:
- **FOUND:** the Trustees' words are *"Please use English Name everywhere"* (`-227` cl.1); their scope answer gated two names and called
  the member-KYC sweep owed, ⛔ excluded (`-378` §0: *"an owed sweep, ⛔ an exclusion"*); `-227` Consequence 3 says only that a new story
  is owed.
- **DECIDED:** `-378` §0 (author-commit) made *"the English-only capture of member KYC names"* the author's, and decision 6 scheduled it.
- **TOLD:** the sent full-name note told the Panel *"Where a member types it instead, the app will ask for it in English — your own
  ruling"*, listing it under "What is NOT ratified"; the Panel answered that note (`-379`) without objecting.
- **Why it stays the author's under the template's §0 test.** Taking the rule from two names to a third field is arguably an
  extension of a ratified clause, and the step gates the path to membership (what the Trust OWES a member). It stays the author's
  because: the extension is IN the direction of the Trustees' own word "everywhere", ⛔ against it; it refuses ⛔ member outright —
  edges 1–2 are DELAYS (a retype, help from someone, or leaving for DigiLocker — Policy meaning edge 3), shown to BigDev at 0.2;
  and the Panel was told and did ⛔ object. ⚠ If
  BigDev reads it the other way at Task 0.2, the question goes to the Panel on the template, ⛔ this story's KB entry.

What remains (which predicate, which words, when and how the member is told) is the author's.

## Acceptance Criteria

**AC0 — Governance first.** Task 0.2's answers are recorded verbatim (Debug Log (a)); the author-commit entry (KB7) is committed ALONE
before any code; the records commit follows it (Task 0.4). ⛔ A Panel note.

**AC1 — The contract gates the manual name, input-only.**
**Given** `packages/contracts/src/kyc/signup.ts`
**When** `KycManualSubmitRequest` is parsed
**Then** `name` is `EnglishScriptName` (imported from `../_common/primitives.js`) — `'Asha Devi'`, `'A. Devi'`, `'R. P. Yadav'`,
`'Mary-Anne O'Neill'`, `'D’Souza'` (U+2019), `'A'.repeat(200)` accepted; `'आशा देवी'`, `'Asha देवी'`, `'José'`, `'Asha Devi 2'`, `''`,
`'   '`, `'A'.repeat(201)` (built from allowed characters, so it fails on LENGTH only) refused; a leading/trailing-space name is accepted
and TRIMMED
**And** `dob` and `photo` are unchanged
**And** `KycProfile.name`, `KycProfileSummaryResponse.name`, the callback response and every other schema in `kyc/` are ⛔ changed
**And** the doc comment says, in one line, that the name is English-only at input per `-227` cl.1 / `-378` d6 and that stored names
are ⛔ rewritten
**And** `openapi/v1.yaml` is regenerated (`pnpm contracts:emit-openapi`) — the `KycManualSubmitRequest.name` gains the `pattern`, and
⛔ other hunk appears in the diff.

**AC2 — The route refuses a non-English name and stores nothing.**
**Given** a `pending-kyc` member with the manual fallback enabled
**When** they `POST /api/v1/member/kyc/manual` with `name: 'आशा देवी'` (and, separately, `'Asha देवी'`)
**Then** the response is 400 `request.validation`, and `details.issues.map(i => [i.instancePath, i.keyword, i.message])` equals
`[['/name', 'invalid_string', 'Please enter the name in English']]` (G14; the `nominee-bank-helpline.spec.ts:399-405` form)
**And** ⛔ `member_kyc_profiles` row is written, the member stays `pending-kyc`, ⛔ `member.kyc_manual_fallback` event and ⛔
`member_kyc.manual` audit is emitted
**And** the same member then posting `'Asha Devi'` succeeds exactly as today (200, `pending-fee`, `manual_pending`).

**AC3 — Stored non-English names still read (⛔ backfill).**
**Given** a `member_kyc_profiles` row PLANTED in the DB with a Devanagari name (`source: 'manual'`)
**When** `GET /api/v1/member/kyc/profile-summary` is read for that member
**Then** it returns 200 with the Devanagari name unchanged (the output schema is ungated)
**And** ⛔ migration, script or job rewrites any stored name.

**AC4 — The exclusion sentence is superseded, ⛔ rewritten.**
**Given** the first JSDoc block of `primitives.ts` (`:65-96`, ending with the "⛔ NOT applied to member KYC names …" paragraph — G11)
**Then** that paragraph stays word for word, and a DATED note is added INSIDE the same block, after it and before the closing ` */`
(⛔ between the two JSDoc blocks), saying: from Story 3.3c (`-378` decision 6, building `-227` cl.1) the predicate IS applied to the
manual KYC fallback's typed name (`KycManualSubmitRequest.name`), input-only; the premise "a KYC name is copied … not typed" does ⛔
hold for that path; the DigiLocker name and 6.5's `claim/parity.ts` remain ungated; `kyc/name.ts` stays Devanagari-aware for stored
names
**And** a dated note in the `ENGLISH_NAME_REGEX` block, after the "Two spellings … Trap 1 forbids the system comparing two names at
all" sentence (`:113-114`), says that premise does ⛔ hold for KYC names — `claim/parity.ts` machine-compares them (moot while OCR is
empty; the 6.5 half of `deferred-work.md` (b-4))
**And** neither note carries a `**/` sequence (it would close the JSDoc — [[project_markdown_emphasis_closes_jsdoc]]).

**AC5 — The member is told before submitting, in Hindi and English.**
**Given** `apps/mobile/app/(signup)/kyc.tsx`
**When** the member types a name that is non-empty and ⛔ `isEnglishScriptName`
**Then** (KB3) an inline `accessibilityRole="alert"` + `accessibilityLiveRegion="assertive"` message shows `kyc.manual_name_english`
under the field, and the `Input`'s `accessibilityHint` becomes `kyc.manual_name_english` while it shows
**And** submitting sends ⛔ request, clears the banner (`setError(null)`), and announces `kyc.manual_name_english` once via
`AccessibilityInfo.announceForAccessibility` on both platforms (⛔ `Platform` guard — KB3)
**And** a blank name still shows `kyc.manual_name_required` in the banner; an English name submits exactly as today
**And** (KB4) the name `Input` has `maxLength={200}`; a `request.validation` 400 with an issue `instancePath === '/name'` AND
`keyword === 'invalid_string'` renders `kyc.manual_name_english`; every other error (incl. `too_big` on `/name`) renders exactly as today
(KB4 (b) answered ⇒ `maxLength` only, and this clause and the render test's 400 leg are dropped; KB3 (b) answered ⇒ ⛔ inline message
while typing — the submit refusal, announce and hint remain)
**And** the field's label / placeholder / `accessibilityLabel` is `kyc.manual_name` (KB2 words) — the screen-reader contract of 3.3b AC4
kept (label, hint tied to the field, alert region)
**And** the client uses `isEnglishScriptName` from `@twt/contracts` — ⛔ `ENGLISH_NAME_REGEX` directly (N1)
**And** a render test of the real `kyc.tsx` (the `wa-code-entry-render.test.ts` harness — G6) proves: a Devanagari name shows the inline
alert and `kycManualSubmit` is NEVER called; a rejected `ApiError` 400 (`/name`, `invalid_string`) renders `kyc.manual_name_english`.

**AC6 — Copy resolves through the real `t()`.**
**Given** the KB2 keys in `packages/i18n/locales/{en,hi}/common.json`
**Then** a mobile unit test drives the screen's PURE message-selection functions (Task 3) and asserts the EXACT expected key per input
— `''` and `'   '` → `kyc.manual_name_required`; `'आशा देवी'` and `'Asha देवी'` → `kyc.manual_name_english`; `'Asha Devi'` and `'D’Souza'`
→ `null`; a 400 (`/name`, `invalid_string`) → `kyc.manual_name_english`; a 400 (`/name`, `too_big`), a 400 on `/dob`, a 409
`kyc.not_pending` and a non-`ApiError` → `null` — and THEN resolves every non-null key through the real `t()` in BOTH locales
(non-empty; `en` ≠ `hi`) ([[feedback_stub_must_call_not_transcribe]]; the `nominee-name-copy-resolves.test.ts` pattern; KB4 (b)
answered ⇒ ⛔ `ApiError` legs). ⛔ A test that
only resolves whatever keys come back (it passes vacuously when a mutant returns `null`)
**And** `pnpm i18n:check` (parity) and `pnpm microcopy:check` pass — with `kyc.tsx` and `lib/kyc-manual-name.ts` enrolled per KB8 (a),
or the File List recording that the gate does ⛔ scan them (KB8 (b)).

**AC7 — Records and proof.**
**Then** `friction-budget.md` carries KB5's declaration and `pnpm friction:test` + `pnpm friction:check` pass
**And** a mutant proof: dropping `EnglishScriptName` back to `z.string().trim().min(1).max(200)` turns the AC1 SCRIPT refusal legs
(`'आशा देवी'`, `'Asha देवी'`, `'José'`, `'Asha Devi 2'`) and the AC2 400 test RED (the blank and length legs stay green by design); a
client mutant replacing `isEnglishScriptName` with `() => true` in `lib/kyc-manual-name.ts` turns the AC6 Devanagari and mixed legs
(exact key `kyc.manual_name_english`) and the AC5 render leg RED; a third mutant dropping `keyword === 'invalid_string'` from
`manualSubmitErrorKey` (keying on `/name` alone) turns the AC6 `too_big` leg RED (KB4 (b) answered ⇒ ⛔ third mutant) — each recorded
in the Debug Log, then reverted
**And** tsc, eslint, the contracts / api unit suites and the KYC integration specs (:5433) pass; `ci:local` before push.

## Tasks / Subtasks

**Commit plan.** Task 0 is three commits: 0.1's creation commit (the story file + creation's `v` ledger line, so the tree is clean),
0.3 ALONE (`.decision-log.md` only), then 0.4. **Tasks 1–5 are ONE code commit** (the contract, the OpenAPI, the
client, the copy and the tests only make sense together — the tree is green only at that boundary). Task 6 proves on that commit;
Task 7 is a records commit. Branch `story/3-3c-member-kyc-name-english-only` ([[feedback_commit_on_story_branch]]); ⛔ main.

- [x] **Task 0 — governance FIRST (AC0). ⛔ No code.**
  - [x] 0.1 Preflight. ⭐ The creation-commit step below is DONE (2026-10-22, at validation: S3 scanned, ledger re-lettered `2026-10-22x`, the two files committed by path as `story(3.3c): created + validated …`) — start at `git fetch origin`. ⚠ The worktree was DIRTY at creation: the story file is untracked and `sprint-status.yaml` carries creation's
        uncommitted ledger line (written as `2026-10-22v` — ⛔ free: see NUMBERS) + the row's `ready-for-dev`. FIRST run S3 (below)
        over refs AND worktrees, RE-LETTER creation's ledger line to the next free letter (add "validated v1.1" to it), THEN commit
        those two files alone (`story(3.3c): created — ledger 2026-10-22<letter> …`; `git add` the two paths by name,
        `git diff --cached --name-only` shows only them) — `git rebase` refuses a dirty tree, and a broad `git add` later would sweep
        them into the governance-only commit.
        Then `git fetch origin`; `git diff --name-only b883dc15 origin/main -- packages/contracts/src/_common packages/contracts/src/kyc apps/api/src/modules/kyc apps/mobile/app/\(signup\) apps/mobile/lib packages/i18n/locales friction-budget.md microcopy.yaml openapi`
        — ANY file ⇒ rebase onto `origin/main` (fast-forward landing only — [[feedback_land_prs_by_fast_forward]]), resolve the
        top-of-`sprint-status.yaml` ledger BY HAND ([[project_sprint_status_safe_prepend]]), re-derive the G-facts that moved,
        re-pin `baseline_commit`. **STOP conditions:** (S1) `git log b883dc15..origin/main -- .decision-log.md` shows a ruling on
        member names, `-227`, or the manual fallback; (S2) a story added under `_bmad-output/implementation-artifacts/` touches
        `kyc.tsx`, `signup.ts` or `primitives.ts`, or row `6-35-in-app-language-switch` has landed (G7 / KB6 then change); (S3) another
        ref OR another worktree's WORKING files holds the next decision id, or creation's OWN ledger letter, or the one 0.4 will take — refs:
        `for r in $(git for-each-ref --format='%(refname)' refs/heads refs/remotes); do git show "$r:.decision-log.md" | grep -o '^### Decision 2026-1[0-2]-[0-9]*-[0-9]*'; git show "$r:_bmad-output/implementation-artifacts/sprint-status.yaml" | grep -o '^# last_updated: 2026-1[0-2]-[0-9]*[a-z]*'; done | sort -u | tail -4`;
        worktrees: the same two greps over `<wt>/.decision-log.md` and `<wt>/_bmad-output/implementation-artifacts/sprint-status.yaml`
        for every path in `git worktree list` (at validation, 2026-10-22: 6-35, 6-36d, 8-15 — `8-15` already ahead of `b883dc15`); (S4) `ListAgents`
        shows another session on this worktree. `pnpm install --frozen-lockfile --prefer-offline` if `node_modules` is absent (it is,
        at creation).
  - [x] 0.2 **Put to BigDev** (Policy meaning sharp edges FIRST, edge 3's wording included — [[feedback_never_mangle_member_names]]: the
        worst real output before any recommendation), then the basis ("Panel questions: NONE" — FOUND / DECIDED / TOLD and why the
        widening stays the author's), then KB1–KB8 (KB2 with options (a) and (c) side by side; KB6 with both precedents). Record the
        answers VERBATIM in Debug Log (a). If BigDev edits any KB2 word, the edit is theirs — build it; if an edit changes a RATIFIED
        phrase (`-378` d6's *"in English, as on Aadhaar"*), apply the template §0 and say so. If BigDev reads the widening as the
        Panel's, STOP: write the note from the template, ⛔ build.
  - [x] 0.3 Write the **3.3c build entry** — an AUTHOR-COMMIT, next free id (dated the day it is COMMITTED) — in `.decision-log.md`,
        the shape of `-378` / `-380`: Decision type / Status / Author / Ratifying trustees: None / §0 gate (the basis as KB7 (a)
        states it — `-227`'s "does ⛔ NOT cover" bullet and the 6.19 D9 / `contact.ts` readings quoted verbatim; the widening from
        two names to three said plainly; the Panel TOLD) / Occasion / The decisions (KB1–KB8 as answered; the UX-DR57 / Pattern 6
        narrowing for this one field against its Epic 3 anchor; the dated supersessions of G11 at both sites and of the
        `ENGLISH_NAME_REGEX` "Trap 1" premise for KYC names) / **PQ:** none / Supersessions (⛔ ratified clause — the G11 sentences
        are code comments and 6.18 AC12 a story AC, each superseded by a dated note, ⛔ edited) / **Does NOT cover** (the DigiLocker
        name; 6.5's `claim/parity.ts` — (b-4) stays open; a trustee review of manual KYC — G8; the 6.37e R1 templates 8 / 10 / 12
        item — TR6; the claimant's name, which stays bilingual — 6.19 D9) / Consequences / References. It BUILDS `-227` cl.1 / `-378`
        d6; it ⛔ re-reads them. Stage in the scratchpad, re-grep every ref AND worktree for the id right before inserting (S3),
        prepend above the newest `### Decision` ([[project_decision_log_writes_user_inserted]] — try, verify additive-only, ask once if
        refused); stage ONLY `.decision-log.md` (`git add .decision-log.md`; `git diff --cached --name-only` must print that one path)
        and commit it ALONE (`governance(3.3c): Decision 2026-10-22-NNN — AUTHOR-COMMIT (BigDev): …` — the `-380` commit shape —
        [[feedback_governance_commits_precede_implementation]]); write its SHA after the commit, ⛔ before.
  - [x] 0.4 The **records commit** (after 0.3), every edit append-only: `epics.md` — a new `### Story 3.3c: …` section immediately after
        `### Story 3.3b` (before `### Story 3.4`), in 6.37e's "Added … (`bmad-create-story 3.3c`; this entry written at its Task 0.4)"
        blockquote shape (row created by `-378` d6; build decisions by the 0.3 entry; ⛔ migration; full ACs → this file; not a merge
        fence) + a dated one-line note under 6.18's *"`-227` cl.9's wider English-name sweep … owes its own story"* pointing to 3.3c for the
        member-KYC half; `6-18-nominee-holder-name-on-the-verification-console.md` AC12 — a dated note directly after its *"the gate is
        ⛔ not applied to member KYC names …"* sentence pointing to the 0.3 entry and row 3-3c (⛔ edit AC12's words);
        `deferred-work.md` (b-4) — a dated note (the member-KYC half BUILT by row 3-3c, in progress; ⛔ "Closed" until `done` on `main` —
        [[feedback_closure_language_precision]]; the 6.5 half still open); `deferred-work.md` 6.37e R1 first bullet — a dated note per
        TR6 (its *"row 3-3c, English-only member KYC names, is independent and not built"* goes stale — the note says 3.3c is being
        built and still migrates ⛔ names); this story file (Status, Debug Log (a), Change Log); `sprint-status.yaml` — row
        `ready-for-dev` → `in-progress`, the ledger line at the next free letter after creation's `v`
        ([[project_sprint_status_safe_prepend]]), and a dated append to the row comment: its *"Feeds 6.37e's rework"* is moot —
        6.37e landed (`dbd52239`) on a script-agnostic name rule, so 3.3c is independent of it (Sequencing).

- [x] **Task 1 — The contract (AC1, AC4).**
  - [x] 1.1 `packages/contracts/src/kyc/signup.ts`: import `EnglishScriptName` from `../_common/primitives.js`; `name: EnglishScriptName,`;
        a one-line comment above it (`-227` cl.1 / `-378` d6, input-only, ⛔ backfill). Update the :85-89 doc comment's name line.
        ⛔ Touch `KycProfileSummaryResponse` or any other schema (N2).
  - [x] 1.2 `primitives.ts`: AC4's two dated notes — the first INSIDE the first JSDoc block, after the G11 paragraph and before the
        closing ` */` at `:96`; the second in the `ENGLISH_NAME_REGEX` block after `:113-114`. ⛔ Edit a word of either existing
        block; ⛔ `**/`.
  - [x] 1.3 `pnpm contracts:emit-openapi`; check the `openapi/v1.yaml` diff is ONLY the `pattern` line(s) on this component.
  - [x] 1.4 Contract unit legs (AC1): in `packages/contracts/tests/english-script-name.test.ts`, a NEW
        `describe('Story 3.3c — KycManualSubmitRequest.name (-378 decision 6)')` block. ⛔ Add to 6.18's blocks — `:68` *"AC12 —
        applied to EXACTLY the two INPUT fields"* and `:87` *"AC12 — the FOUR bound write routes all inherit the gate from the two
        field edits"* stay true of 6.18's scope, and the KYC field is a third, direct edit. Import `KycManualSubmitRequest`,
        `KycProfile` and `KycProfileSummaryResponse` from `'../src/index.js'` (all reach it via `kyc/index.ts`). Legs: AC1's accept /
        refuse list on `KycManualSubmitRequest`; NEW input-only legs — `KycProfile` and `KycProfileSummaryResponse` still accept
        `'आशा देवी'` and `'[anonymized]'` (⛔ such leg exists today; the existing input-only block `:126-207` tests only
        `NomineeNameCheckResponse`). Extend `apps/api/tests/unit/kyc-signup.test.ts:162-186` with the AC1 refusal legs.

- [x] **Task 2 — The route, proven over HTTP (AC2, AC3).** ⛔ handler change (G3).
  - [x] 2.1 `apps/api/tests/integration/kyc/kyc-signup.spec.ts`: AC2 — Devanagari and mixed names → 400 `request.validation`; assert
        `details.issues.map(i => [i.instancePath, i.keyword, i.message])` EXACTLY (G14) and record the observed shape in Debug Log (b);
        ⛔ profile row, `SELECT state FROM members` still `pending-kyc`, ⛔ `member.kyc_manual_fallback` in the spec's event-type read,
        ⛔ `t.auditSink.ofType('member_kyc.manual')` — all checked BEFORE the `'Asha Devi'` post; then `'Asha Devi'` → 200 as today.
        (Body validation runs before the `memberSession` preHandler and the handler, so these hold by construction; the server
        mutant flips them to a 200 plus a row.)
  - [x] 2.2 AC3 — seed with the spec's own `seedPendingKycMember` (`:29-47`), then plant a Devanagari `member_kyc_profiles` row the way
        `apps/api/tests/integration/_peer-reply-fixture.ts:31-39` does (raw `INSERT … 'self_declared', 'manual'` with
        `encryption.encryptKycField(name, pariwarId, env.deps.encryption)` — add `encryption` to the spec's `@twt/domain` import;
        `kyc-signup.spec.ts` plants ⛔ profile rows today), and read `/profile-summary` → 200, the name unchanged.

- [x] **Task 3 — The client (AC5).**
  - [x] 3.1 New pure module `apps/mobile/lib/kyc-manual-name.ts` (the 6.21b / 6.18 "pure key-selection function stands in for a render
        harness" pattern): `manualNameMessageKey(name: string): 'kyc.manual_name_required' | 'kyc.manual_name_english' | null` (blank →
        required; non-English → english; else null) and `manualSubmitErrorKey(e: unknown): 'kyc.manual_name_english' | null` (an
        `ApiError` with code `request.validation` and an entry in `details.issues` with `instancePath === '/name'` AND
        `keyword === 'invalid_string'` → english; anything else, `too_big` on `/name` included → `null` = keep today's mapping). Read
        `details` defensively (`unknown` → narrow; a malformed `details` → `null`). Uses `isEnglishScriptName` from `@twt/contracts`
        (N1). (KB4 (b) answered ⇒ omit `manualSubmitErrorKey` and its legs.)
  - [x] 3.2 `kyc.tsx` (KB3 / KB4 as answered):
        - the name `Input` gains `maxLength={200}`, and its `accessibilityHint` is `t('kyc.manual_name_english')` while the inline
          message shows, else `t('kyc.manual_name_required')` as today;
        - the inline message under the name `Input` when `manualNameMessageKey(name) === 'kyc.manual_name_english'` — the
          `nominee-review.tsx:333-342` markup (`accessibilityRole="alert"`, `accessibilityLiveRegion="assertive"`, `fontSize="$2"`)
          in this screen's own `#C0392B` (KB8);
        - `onManualSubmit`, in this order: blank name → today's `setError(t('kyc.manual_name_required'))`; english-failure →
          `setError(null)`, `AccessibilityInfo.announceForAccessibility(t('kyc.manual_name_english'))` (both platforms — KB3),
          return — ⛔ request; THEN today's blank-DoB check (`:177-180`) and the request, unchanged. Add
          `import { AccessibilityInfo } from 'react-native'` (`kyc.tsx:23-31` imports neither it nor `Platform`; the
          `nominee-review.tsx:30` import form);
        - the `catch` consults `manualSubmitErrorKey` first (→ `setError(t(key))`), else today's line (:188) unchanged.

        ⛔ Change the DigiLocker paths, `KYC_ERROR_CODES` or `kycErrorMessage`.

- [x] **Task 4 — Copy (AC5, AC6).** KB2's words (as answered at 0.2) into `packages/i18n/locales/en/common.json` and `…/hi/common.json`
      — two values changed, one key added after `kyc.manual_name_required`, both files, same position. ⛔ `{param}`.

- [x] **Task 5 — Tests, the friction declaration and the copy-gate scope (AC5, AC6, AC7).**
  - [x] 5.1 `apps/mobile/tests/unit/kyc-manual-name-copy-resolves.test.ts`: both pure functions over AC6's input table with the EXACT
        expected key asserted per input (`''`, `'   '`, `'आशा देवी'`, `'Asha देवी'`, `'Asha Devi'`, `'D’Souza'`, a 400 `/name`
        `invalid_string` `ApiError`, a 400 `/name` `too_big`, a 400 on `/dob`, a 409 `kyc.not_pending`, a non-ApiError); THEN every
        non-null key resolved through the real `t()` in `en` and `hi` (non-empty; `en` ≠ `hi`); a source check (the 6.18 copy
        test's third leg, `nominee-name-copy-resolves.test.ts:84,93`) — ⚠ that leg asserts the LITERAL `t('<key>')`, which a key returned
        by a function never matches: assert `kyc.tsx` still contains `t('kyc.manual_name')` and imports both `lib/kyc-manual-name` functions,
        and `lib/kyc-manual-name.ts` contains each `'kyc.manual_name_required'` / `'kyc.manual_name_english'` literal. Mock `lib/mmkv` if the import chain needs it ([[project_mobile_vitest_and_expo_install_traps]]).
  - [x] 5.2 `apps/mobile/tests/unit/kyc-manual-render.test.ts` (AC5) on the `wa-code-entry-render.test.ts` harness (jsdom + RTL, the
        real screen under `LocaleProvider`; reuse its `react-native` mock (it supplies `Platform` / `AccessibilityInfo` — assert the
        announce call), its `tamagui` DOM stand-ins and `react-native-safe-area-context`; mock `../../lib/member-api` with
        `memberAuth.kycStatus` (manual enabled) + `kycManualSubmit`, `lib/mmkv`, `expo-router`, AND `expo-web-browser` (`kyc.tsx:28`
        imports it; its build pulls `expo-modules-core` + `react-native`, ⛔ mocked by any mobile test yet, and vitest runs in `node`);
        RTL `cleanup` — [[project_mobile_vitest_and_expo_install_traps]]). Reach the form by pressing the `t('kyc.manual_cta')` button
        (`:313-326`). Type a VALID DoB in every leg — `onManualSubmit` returns on a blank DoB (`:177-180`), which would make "never
        called" pass even under the client mutant. Legs: `'आशा देवी'` + DoB → the inline alert shows the resolved
        `kyc.manual_name_english`, submit never calls `kycManualSubmit`, the announce is called once; an English name + DoB with
        `kycManualSubmit` rejecting an `ApiError` 400 (`/name`, `invalid_string`) → the banner shows `kyc.manual_name_english`. ⚠ `apps/mobile/tsconfig.json`
        excludes `tests/**` — the test is ⛔ typechecked; keep it simple.
  - [x] 5.3 `friction-budget.md`: KB5 as answered — the row INSIDE `## The ledger` (after the `relative (manual-KYC fallback)` row) and/or
        the `**Story 3.3c disposition (…)**` block (the gate's regex: `^\*\*Story\s+(\S+?)\s+disposition\b`).
  - [x] 5.4 `microcopy.yaml` (AC6, KB8 as answered): (a) add `apps/mobile/app/(signup)/kyc.tsx` and `apps/mobile/lib/kyc-manual-name.ts`
        to `scope.code_globs` beside the 6.18 entries, plus ONE scoped allow-list entry for `kyc.tsx` (`pattern: '#(C0392B|1E8E3E)\b'`,
        a `reason` pointing at the 6.18 reasoning block); any finding on 3.3b's existing lines → Debug Log (c) and ask; or (b) a File
        List line that the gate does ⛔ scan these files.

- [x] **Task 6 — Proof and gates (AC7)** on the Task 1–5 commit: the three AC7 mutants (record RED → revert → GREEN in Debug Log (c));
      `pnpm --filter @twt/contracts test`, the api unit suite, the KYC integration spec + `signup-create.spec.ts` + the two `wa-opt-in`
      specs on :5433 (`DATABASE_URL` explicit — [[project_prepush_hook_inherits_5432]]), the mobile unit suite (incl. the 5.1 and 5.2
      files), tsc, eslint,
      `pnpm i18n:check`, `pnpm microcopy:check`, `pnpm friction:test && pnpm friction:check`, `pnpm contracts:check-openapi-determinism`;
      `ci:local` before any push ([[project_known_livedb_test_failures]] — name any pre-existing failure, ⛔ hide it).

- [x] **Task 7 — Records and close.** Story Status → `review`, Dev Agent Record, File List, Change Log (newest first); sprint row
      `in-progress` → `review` + ledger. ⛔ "Closed by" on (b-4)'s member-KYC half until the row is `done` on `main`.

## Dev Notes

### ⚠ TRAPS

- **TR1 — ⛔ an output schema.** `apps/api/src/plugins/zod-openapi` sets a `serializerCompiler`: responses are PARSED. `EnglishScriptName`
  on `KycProfileSummaryResponse.name` (or any response) = a 500 for every stored Devanagari name and the RTBF `[anonymized]` sentinel.
  6.18 AC12 wrote this reason into the file; keep it true.
- **TR2 — ⛔ the DigiLocker path.** `KycProfile.name` (`kyc/profile.ts:42`) is the mapper's output. Gating it would make a member's
  DigiLocker KYC throw on a name the government printed — a NEW refusal on a benefit that `-378` d6 ⛔ ordered and that ⛔ policy-meaning
  note covers. If a reviewer asks for it, it is a new decision, ⛔ this story's.
- **TR3 — ⛔ `.transform()` / normalisation.** A ZodPipeline drops `pattern` / `minLength` / `maxLength` from the emitted OpenAPI
  (`primitives.ts:98-121`); and normalising (NFC, smart-quote folding) would REWRITE what the member typed (N3). The predicate already
  ACCEPTS the iOS smart apostrophes and NBSPs.
- **TR4 — key the client on `instancePath` + `keyword`, ⛔ on `instancePath` alone (G14).** The shape is verified
  (`{ keyword, instancePath: '/name', params: { issue }, message }`); Task 2.1 still asserts it, so a library upgrade that changes it
  goes RED on the server side first. Keying on `/name` alone would show "write it in English letters" for a `too_big` on an English
  name; keying on `params.issue.path` or `message` couples the client to internals. A mismatch falls back silently to the
  "DigiLocker is unavailable" message — the reason AC6 asserts exact keys.
- **TR5 — The api-client does ⛔ request-side parse** (`packages/api-client/src/index.ts:427-428`) ⇒ the server is the only enforcement
  and the client check is a courtesy; both are required (N4).
- **TR6 — 6.37e R1's trigger.** `deferred-work.md`'s "rework code review of 6-37e … R1" first bullet fires on *"row 3-3c `done` with existing
  names migrated"*. 3.3c migrates ⛔ names (N3; `-378` d6 *"⛔ Backfill"*) ⇒ its `done` does ⛔ fire that trigger by itself. Record that in
  a dated note (Task 0.4); ⛔ close or re-word the item. ⚠ Also ⛔ claim "no KYC name can be Devanagari after 3.3c": stored rows and the
  DigiLocker path (G10) are both unproven.
- **TR7 — ⛔ touch `kyc/name.ts`, `name-render.ts`, `claim/parity.ts`, `anonymize.ts`.** Read-side, the 6.5 half, and RTBF — out of scope (N5).
- **TR8 — Hindi is what members read today (G7).** The en strings are unreachable on mobile until row 6-35's language switch lands;
  review the hi strings as the primary copy and the en strings as member copy too.
- **TR9 — The 3.3b screen's existing a11y contract** (3.3b AC4: label, per-field guidance, alerts programmatically associated; a WCAG
  AA launch-blocker) must survive: keep `accessibilityLabel` on the `Input`, tie the message to the field through `accessibilityHint`
  (KB3), and remember `accessibilityLiveRegion` is Android-only and fires on MOUNT / text CHANGE — VoiceOver hears the inline message
  ONLY through the `announceForAccessibility` call, and TalkBack hears a SUBMIT only through it too (the alert mounted while typing).
  ⛔ `Platform`-guard that call here. ⛔ Set the banner AND show the inline message for the same refusal (the sentence twice on screen,
  announced twice).
- **TR10 — the creation edits are uncommitted, and their ledger letter is ⛔ free (Task 0.1).** Re-letter creation's line after the
  S3 scan, then commit it by path before any rebase; stage `.decision-log.md` ALONE at 0.3. ⛔ `git add -A` / `git commit -a` anywhere
  in Task 0.
- **TR11 — ⛔ quote "passbook" in a file enrolled in `microcopy.yaml` (KB8 (a)).** The microcopy checks scan line by line with ⛔
  comment stripping (`scripts/microcopy/lib.ts`, `eachLine`), so a code comment in `kyc.tsx` or `lib/kyc-manual-name.ts` quoting
  `-227`'s *"as printed on the passbook"* fails the `passbook` vocabulary rule. Cite the decision id instead. (Today's `kyc.tsx`
  yields exactly two findings under the gate — its hex literals at `:195` / `:200` — which KB8's allow-list entry covers.)

### Reuse map

| Need | Reuse | ⛔ Rebuild |
| --- | --- | --- |
| The predicate | `EnglishScriptName`, `isEnglishScriptName` (`@twt/contracts`) | a regex |
| Inline wrong-script message markup | `apps/mobile/app/(claim)/nominee-review.tsx:333-342` | new component |
| Announce on submit | `AccessibilityInfo.announceForAccessibility(…)` as in `nominee-review.tsx:277-283` — but UNGUARDED here (KB3: the live region does ⛔ re-fire on submit) | a re-keyed live region |
| Copy test | `apps/mobile/tests/unit/nominee-name-copy-resolves.test.ts`, `certificate-copy-resolves.test.ts` | — |
| Screen render test | `apps/mobile/tests/unit/wa-code-entry-render.test.ts` (jsdom + RTL harness) | a new harness |
| Contract legs | `packages/contracts/tests/english-script-name.test.ts` — a NEW `describe` block beside 6.18's | a new contract test file; edits to 6.18's blocks |
| Manual-route HTTP harness | `apps/api/tests/integration/kyc/kyc-signup.spec.ts:162-227`, `seedPendingKycMember` (`:29-47`) | new fixtures |
| Planting a stored KYC name | `apps/api/tests/integration/_peer-reply-fixture.ts:31-39` (`encryption.encryptKycField` + raw INSERT) | a new helper |
| 400 issue assertion | `apps/api/tests/integration/claims/nominee-bank-helpline.spec.ts:399-405` | — |
| Copy-gate enrolment | `microcopy.yaml` 6.18 `code_globs` entries + the `nominee-review.tsx` scoped hex entry | a broad glob |
| Friction row shape | `friction-budget.md` `## The ledger` table; disposition blocks (e.g. the 3.3b one at :180) | — |

### Testing standards

Contract unit (vitest) · API unit · API integration on :5433 (live DB, `DATABASE_URL` explicit) · mobile unit (vitest, pure functions +
real `t()`) · a mutant per layer (AC7). Every refusal leg asserts what was ⛔ persisted, ⛔ just the status code.

### Project structure notes

- Contract: `packages/contracts/src/kyc/signup.ts` (UPDATE), `src/_common/primitives.ts` (UPDATE — comment only), `openapi/v1.yaml` (REGENERATED).
- Mobile: `apps/mobile/app/(signup)/kyc.tsx` (UPDATE), `apps/mobile/lib/kyc-manual-name.ts` (NEW), `apps/mobile/tests/unit/kyc-manual-name-copy-resolves.test.ts` (NEW), `apps/mobile/tests/unit/kyc-manual-render.test.ts` (NEW).
- Gate config: `microcopy.yaml` (UPDATE, KB8 (a)).
- Copy: `packages/i18n/locales/{en,hi}/common.json` (UPDATE).
- Tests: `packages/contracts/tests/english-script-name.test.ts`, `apps/api/tests/unit/kyc-signup.test.ts`, `apps/api/tests/integration/kyc/kyc-signup.spec.ts` (UPDATE).
- Records: `friction-budget.md`, `.decision-log.md` (0.3), `epics.md`, `6-18-nominee-holder-name-on-the-verification-console.md` (dated note), `deferred-work.md`, `sprint-status.yaml`.
- ⛔ Migration. ⛔ `apps/api/src/**` source change. ⛔ `packages/domain/**`. ⛔ admin.

### Sequencing

Independent of 6.37e's texts (its name rule is script-agnostic) and of Row 30 (d) / Row 32 (d). The sprint row's comment still says
*"Feeds 6.37e's rework"* — written when 6.37e's rework was pending; 6.37e has since landed (`dbd52239`), so that is moot, and Task 0.4
records it. It does ⛔ discharge 6.37e R1 (TR6). Row 6-35 (language switch) changes who reads the en strings (G7). The 6.5
death-certificate half of (b-4) remains a separate future story.

### Previous story intelligence

- **3.3b** built the route and screen; its manual name had ⛔ script rule and its doc promised a trustee review that was never built (G8).
  Its review deferrals W1 (photo bytes) / W2 (`dob` format) stay deferred — ⛔ fix them here.
- **6.18** built the predicate. Its review taught: export ONE predicate (three hand-rolled client copies drifted); accept iOS smart
  apostrophes and pasted NBSPs; ⛔ a silent server-only 400; a real-`t()` copy test in both locales; a "dropping the gate turns the 400
  test RED" mutant; plant a non-Latin row to prove the output stays ungated.
- **6.37e** (just landed): BigDev rejects any rule whose worst output is meaningless — show the worst case first
  ([[feedback_never_mangle_member_names]]). Here the worst case is a refused submit, ⛔ a mangled name.

### Git intelligence

Recent commits are all 6.37e (landed `dbd52239`, ledger `b883dc15`): governance entry committed alone → records commit → one code commit
→ review rounds as `story(…)` commits; ledger lines are `story(<key>): ledger <date><letter> — …`. Same shape here.

### Latest tech information

⛔ new library. `zod` (contracts), `fastify-type-provider-zod@^4` (the 400 — TR4), Tamagui `Input` / `Text` (mobile). ⛔ upgrade.

### References

- `-227` cl.1 and its "does ⛔ NOT cover" list · `-378` decision 6 and §0 · `-379` "Not covered:" / `-380` "Does NOT cover" · the sent full-name note · Story 6.18 AC12 and its review patch · Story 6.19 D9 · `deferred-work.md` (b-4) and the 6.37e R1 item
- `ux-design-specification.md` Pattern 6 · go-live roster Rows 28 / 37 / 39 (`docs/launch-gate-inventory/inventory-roster.md`)
- `packages/contracts/src/_common/primitives.ts:65-153` · `packages/contracts/src/kyc/signup.ts:85-136`
- `apps/api/src/modules/kyc/kyc.routes.ts:49-56` · `kyc.handlers.ts:357-447` · `error-mapping/index.ts:158-168`
- `apps/mobile/app/(signup)/kyc.tsx` · `packages/i18n/locales/{en,hi}/common.json:26-57`
- `scripts/friction-budget/lib.ts:453,496,503` · `friction-budget.md` `## The ledger`
- PRD FR-2 (`_bmad-output/planning-artifacts/prds/prd-TWT-2026-05-22/prd.md`) · UX-DR57 (`epics.md`)

## Dev Agent Record

### Agent Model Used

Claude Opus 5.5 (`claude-opus-5-5`) — `bmad-create-story 3.3c` (story v1.0).

### Debug Log References

- (a) Task 0.2 — BigDev's answers to the basis and KB1–KB8, VERBATIM (2026-10-22; shown first: Policy-meaning edges 1–3, then the
  FOUND / DECIDED / TOLD basis, then KB1–KB8 with KB2 (a) / (c) side by side and both KB6 precedents):
  - Basis (author's or Panel's?): *"Mine (Recommended)"* ⇒ author-commit; build proceeds.
  - KB2 (words): *"(a) Plain (Recommended)"* — the three en / hi strings exactly as KB2's table (a); BigDev approved the Hindi (KB6 (a)).
    Knowingly approximate for Policy-meaning edge 1 (*"José"* is in English letters yet refused) — recorded, accepted.
  - KB1, KB3, KB4, KB5, KB6, KB7, KB8: *"All (a) (Recommended)"*.
  - Task 0.1 preflight: origin/main = `b883dc15` (⛔ drift, ⛔ rebase); S1 ⛔ new decision; S2 ⛔ new story, 6-35 ⛔ landed; S3 newest id
    `-381` everywhere ⇒ `-382`; letters held `v` (8-15, 6-35), `w` (6-36d), `x` (this branch) ⇒ `y`; S4 three peer sessions, all idle.
    Task 0.3 entry `-382` committed alone: `73ad0ad2`.
- (b) Task 2.1 — the `details.issues` shape as emitted, OBSERVED over HTTP on :5433 (`kyc-signup.spec.ts` "3.3c AC2"): for both
  `'आशा देवी'` and `'Asha देवी'`, `issues.map(i => [i.instancePath, i.keyword, i.message])` is EXACTLY
  `[['/name', 'invalid_string', 'Please enter the name in English']]`; the 400 body does ⛔ contain the typed name. G14 / TR4 hold.
- (c) Task 6 — on code commit `bf7781d1`, each mutant applied, run, reverted (`git checkout --`, tree clean after each):
  - **M1 server** — `name: z.string().trim().min(1).max(200)` in `signup.ts`: contracts RED on exactly the four SCRIPT legs
    (`'आशा देवी'`, `'Asha देवी'`, `'José'`, `'Asha Devi 2'`; 4 failed / 31 passed — blank and length legs green by design); api unit
    RED on "rejects a name not in English letters (3.3c)" (1 / 9); integration RED on "3.3c AC2" (1 / 7 — AC3 stays green, as it
    must). Reverted → GREEN.
  - **M2 client** — `isEnglishScriptName` → `() => true` in `lib/kyc-manual-name.ts`: RED on the Devanagari and mixed
    `manualNameMessageKey` legs, the "keys returned are the keys resolved" leg, and the render test's Devanagari leg (4 / 20).
    Reverted → GREEN.
  - **M3 client** — `keyword === 'invalid_string'` dropped (keyed on `/name` alone): RED on exactly the `400 /name too_big` leg
    (1 / 20). Reverted → GREEN.
  - **Render test vs the PRE-change `kyc.tsx`** (`bf7781d1~1`): RED on the Devanagari leg and the server-400 leg (2 / 3; the English
    leg green) — the render legs are ⛔ vacuous. Restored.
  - **KB8 `microcopy:check` teeth** — with the new `kyc.tsx` allow-list entry removed, the gate fails on EXACTLY three findings, all
    FM-14 hex: `kyc.tsx` `#C0392B` (3.3b's banner), `#1E8E3E` (3.3b's notice), `#C0392B` (3.3c's inline message). ⛔ vocabulary,
    tone or numeral finding on 3.3b's existing lines ⇒ nothing to ask. Entry restored → gate green.

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.
- `bmad-dev-story 3.3c` (Claude Opus 5.5), 2026-10-22. Commits on `story/3-3c-member-kyc-name-english-only`: `73ad0ad2` (`-382`,
  `.decision-log.md` ALONE) → `2c1ed842` (Task 0.4 records) → `bf7781d1` (Tasks 1–5, one code commit) → the Task 7 records commit.
- **Built:** `KycManualSubmitRequest.name` is `EnglishScriptName` (6.18's predicate, unchanged); ⛔ handler change — the route's body
  schema carries it (G3). The emitted OpenAPI gains exactly one `pattern` line. ⛔ output schema, ⛔ DigiLocker, ⛔ `domain`, ⛔
  migration (N2 / N5; TR1 / TR2 / TR7). `primitives.ts` carries two dated superseding notes; ⛔ word of either block edited; ⛔ `**/`.
- **Client:** `lib/kyc-manual-name.ts` (pure): `manualNameMessageKey` (blank → required; non-English → english; else `null`) and
  `manualSubmitErrorKey` (only a `request.validation` with an issue on `/name` + `invalid_string` → english; malformed `details` →
  `null`). `kyc.tsx`: inline alert (`#C0392B`, `fontSize="$2"`, role alert + assertive) while the name is non-empty and ⛔ English;
  the `Input`'s hint switches to the same message; `maxLength={200}`; submit order blank → non-English (`setError(null)`, one
  unguarded `announceForAccessibility`, ⛔ request) → blank DoB → request; the `catch` consults `manualSubmitErrorKey` first. ⛔
  change to DigiLocker paths, `KYC_ERROR_CODES` or `kycErrorMessage`.
- **Copy** as BigDev approved (KB2 (a)), both locales; `i18n:check` parity green; the copy test resolves every selected key through
  the real `t()` in `en` and `hi`.
- **Gates:** contracts 1428 / 1428; mobile unit 1295 / 1295 (incl. the two new files, 17 + 3); api unit 566 passed / 1 skipped;
  `kyc-signup` + `signup-create` + two `wa-opt-in` specs 69 / 69 on :5433; typecheck (contracts, api, mobile, i18n) and lint exit 0;
  `i18n:check`, `microcopy:check`, `friction:test` (38 / 38), `friction:check` (AC-4: 1 row added — affirmed, on the committed
  history), `contracts:check-openapi-determinism` exit 0.
  `DATABASE_URL=…:5433 pnpm ci:local` on `bf7781d1`: **36 / 36 jobs green** (incl. `integration-tests`, `microcopy`, `friction-budget`,
  `schema-diff`, `kyc-provider-boundary`) — ⛔ known live-DB failure surfaced.
- **Open, ⛔ closed by this story:** `deferred-work.md` (b-4)'s 6.5 half; the 6.37e R1 first bullet (TR6 — 3.3c migrates ⛔ names);
  a trustee review of manual KYC (G8). Hindi approved by BigDev in session — ⛔ second reader (KB6 (a)). ⛔ pushed, ⛔ landed.

### File List

- `.decision-log.md` — `2026-10-22-382` (Task 0.3, committed alone)
- `_bmad-output/planning-artifacts/epics.md` — `### Story 3.3c` + the dated note under 6.18's owed-sweep sentence
- `_bmad-output/implementation-artifacts/6-18-nominee-holder-name-on-the-verification-console.md` — AC12 dated note
- `_bmad-output/implementation-artifacts/deferred-work.md` — (b-4) and 6.37e R1 dated notes
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — row, ledger `2026-10-22y` / `z`, row comment
- `_bmad-output/implementation-artifacts/3-3c-member-kyc-name-english-only.md` — this file
- `packages/contracts/src/kyc/signup.ts` — `name: EnglishScriptName`; doc comment
- `packages/contracts/src/_common/primitives.ts` — two dated notes (comment only)
- `openapi/v1.yaml` — REGENERATED (one `pattern` line)
- `packages/contracts/tests/english-script-name.test.ts` — the 3.3c `describe` blocks
- `apps/api/tests/unit/kyc-signup.test.ts` — 3.3c refusal leg
- `apps/api/tests/integration/kyc/kyc-signup.spec.ts` — AC2, AC3
- `apps/mobile/app/(signup)/kyc.tsx` — the manual name (KB3 / KB4)
- `apps/mobile/lib/kyc-manual-name.ts` — NEW
- `apps/mobile/tests/unit/kyc-manual-name-copy-resolves.test.ts` — NEW
- `apps/mobile/tests/unit/kyc-manual-render.test.ts` — NEW
- `packages/i18n/locales/en/common.json`, `packages/i18n/locales/hi/common.json` — two values changed, one key added
- `friction-budget.md` — one ledger row + the 3.3c disposition
- `microcopy.yaml` — `kyc.tsx` + `lib/kyc-manual-name.ts` enrolled; one scoped hex entry

## Change Log

- v1.4 (2026-10-22) — **Implemented** (`bmad-dev-story 3.3c`, Claude Opus 5.5): Tasks 1–7 done; code commit `bf7781d1`; the three
  AC7 mutants RED → reverted → GREEN (Debug Log (c)); every gate green (Completion Notes). KB2 (a)'s wrong-script message is knowingly
  approximate for Policy-meaning edge 1 (*"José"* is in English letters yet refused) — BigDev's accepted cost. Status → `review`;
  sprint row `in-progress` → `review`, ledger `2026-10-22z`. ⛔ pushed.
- v1.3 (2026-10-22) — **Dev started** (`bmad-dev-story 3.3c`, Claude Opus 5.5): Task 0 done — preflight clean, BigDev's answers
  (Debug Log (a): author's basis; all recommendations), `-382` AUTHOR-COMMIT committed alone (`73ad0ad2`), records commit (epics
  `### Story 3.3c` + 6.18 owed-sweep note; 6.18 AC12 dated note; deferred-work (b-4) and 6.37e R1 dated notes; sprint row →
  `in-progress`, ledger `2026-10-22y`, row comment dated). Status → `in-progress`.
- v1.2 (2026-10-22) — **Re-validated** (one fresh-context read-only verifier against v1.1's own edits): 1 HIGH / 6 MEDIUM / 7 LOW,
  all applied. HIGH: v1.1 said creation "TOOK" ledger letter `v` — `story/8-15-…` had COMMITTED its own `v` and two other worktrees
  hold `v` / `w` ⇒ NUMBERS, Task 0.1 (S3 scan BEFORE the creation commit, re-letter creation's line) and TR10 restated. MEDIUM:
  KB3's iOS-only guard copied a precedent that does ⛔ fit (the live region does ⛔ re-fire on submit ⇒ TalkBack heard nothing) — the
  announce is now unguarded (KB3, AC5, Task 3.2, TR9, Reuse map); Task 5.2 names the full mock set (incl. `expo-web-browser`), the
  `kyc.manual_cta` entry and a valid DoB in every leg (else the mutant leg passes vacuously); "DigiLocker stays available beside
  it" was false (⛔ route on the manual form) — edge 3 and the §0 reasoning reworded; Row 37 / 39 described as opt-in (consent-flow)
  strings in KB6; Task 6's "three mutants" now matches AC7 (a third mutant pins KB4's `invalid_string` narrowing). LOW: the
  `maxLength` precedent (`nominee-review.tsx:352/368`), the NBSP / smart-quote attribution (`primitives.ts:97-123`), Task 0.3's
  commit message (the `-380` AUTHOR-COMMIT shape), the `react-native` import in Task 3.2 and the check order, TR11 (`passbook` in
  enrolled files), KB4 (b) / KB3 (b) conditionals carried into AC5 / AC6, N2's wording in the v1.1 row, UX-DR57's "dignified hint"
  cited by analogy (it attaches to numeric inputs). ⛔ Code; ⛔ id taken; Status stays `ready-for-dev`. Committed on the story
  branch with creation's ledger line re-lettered `2026-10-22x` (highest held elsewhere: `w`) — Task 0.1's creation-commit step.
- v1.1 (2026-10-22) — **Validated** (`bmad-create-story validate 3.3c`, Claude Opus 5.5; three read-only verifiers — code claims,
  governance, design — at `b883dc15`, spot-checked; BigDev: "all"). Status stays `ready-for-dev`; ⛔ code; ⛔ decision id taken.
  Basis restated: `-227` lists member KYC as ⛔ covered — the widening from two names to three rests on `-378` §0 with the Panel
  TOLD (header, rulings table, §0 re-run, "Panel questions: NONE", KB7, Task 0.3); `-379` / `-380` rows split and relabelled; 6.18
  attributions corrected; UX-DR57 / Pattern 6 "member name" narrowing recorded (6.18 recorded none). KB3 specified (iOS-guarded
  announce, banner cleared, hint tied to the field); KB4 re-scoped (`maxLength={200}`; match `/name` + `invalid_string` only — a
  `too_big` would have blamed an English name on its script); KB2 option (c) for edge 1's wrong reason; KB6 both roster precedents
  (Rows 37 / 39 vs 6.18 / 3.3b) + row 6-35; new KB8 (`microcopy:check` scope — G16). G14 issue shape VERIFIED (library source +
  `nominee-bank-helpline.spec.ts`); G6 reachability (manual offered beside DigiLocker; flag default ON) + render harness; G11 second
  premise + JSDoc placement; TR1's decrypt-sentinel claim dropped and N2's replaced by the negative claim (`decryptKycField` throws). AC1 length legs `'A'.repeat(200|201)`; AC5 a11y + render leg;
  AC6 exact keys per input (the client mutant was vacuous); AC7 server mutant scoped to script legs. Task 0.1 commits the dirty
  creation edits first (rebase refuses a dirty tree; creation took ledger `v`) and S3 greps worktrees; Task 0.3 stages
  `.decision-log.md` alone; Task 0.4 adds the 6.18 AC12 dated note and the row comment's "Feeds 6.37e's rework"; Task 1.4 a new
  `describe` block (6.18's titles stay true); Task 2.2's planting precedent corrected; Tasks 5.2 (render) / 5.4 (microcopy) added.
  Policy-meaning edge 3 reworded (the step cannot complete until retyped). Premise wording ("When DigiLocker cannot be used") widened.
- v1.0 (2026-10-22) — **Created** (`bmad-create-story 3.3c`, Claude Opus 5.5) against `origin/main` = `b883dc15` on
  `story/3-3c-member-kyc-name-english-only`: row `backlog` → `ready-for-dev`. G1–G15, KB1–KB7 proposed, ⛔ Panel question. Not committed,
  not pushed.
