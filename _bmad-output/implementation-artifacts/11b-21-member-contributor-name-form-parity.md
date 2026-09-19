---
baseline_commit: a44aef23
---

<!--
⭐ BASELINE: `a44aef23` — `governance(11b.20): friction-budget disposition`. `origin/main` was fetched
and matched it on 2026-09-19. Every code claim below was checked at that commit. ⚠ Code claims go stale
as soon as a sibling ships (`11b-22` touches `[driveToken].astro`), so re-diff `packages apps scripts`
before starting (Task 0).
⚠ KEY `11b-18` IS SKIPPED for the reason recorded in `11b-19`. It is absent from `development_status`.
-->

# Story 11b.21: Member Contributor List — Full Name and the Unnamed Row, at Parity with the Public Page `[SURFACE]`

Status: ready-for-dev

## ⭐ GLYPH REGISTER — read this before any clause below

⭐ = an action to take · ⚠ = a hazard · **⛔ marks a negation and must be followed by an explicit
negator** (`not` / `no` / `never` / `nothing` / `neither`, or a prohibition verb). A ⛔ placed before a
positive clause is an **inversion**, not emphasis.

## ✅ PREFLIGHT — **STARTABLE.** No Panel question is open.

⭐ **Authority.** This story discharges an existing ruling. It asks no new question.

| Axis | Ruled by | What it requires |
|---|---|---|
| **A — the NAME FORM** | `2026-09-04-189` **cl.3** (Trustee-ratified), scoped by `-195` **cl.1** to the drive data class; `-221` **cl.1/cl.4**: *"a DISCHARGE, ⛔ not a question"* | The member contributor list stops showing **less** of a name than the public page does |
| **B — the UNNAMED ROW** | `2026-09-18-222` **cl.1–cl.4** (Trustee-ratified, option **(B)**) | The member list **keeps** a withheld contributor's row in the producer's position and renders `A contributor` / `एक सहकर्मी` |

⚠⛔ **`2026-09-02-177` cl.2 (the "CARRY") is ⛔ NOT a live authority.** It is superseded by `-189` cl.3
(`-221` cl.2). Citing it as a reason to keep the shielded form is the defect `-221` records.

⭐ **Six engineering calls are ruled in THIS FILE (the "Decisions" section below).** Each passed the
routing template's §0 gate as the author's to make. Task 1 records them as ONE author-commit decision
entry (**`2026-09-19-224`**, the next free id; the current HEAD is `-223`) **before any code**
([[feedback_governance_commits_precede_implementation]]).

---

## Story

As a **member looking at who has contributed to my pool's current drive**,
I want **to see each contributor's name in the same form the public Sahyog Vivran page shows it, and to
see a row saying "A contributor" wherever a name cannot be shown**,
so that **I am never told less about my own pool than a stranger on the internet is, and I can tell
when the list is incomplete.**

## 📜 Policy meaning (AI-10-1, CONFIRMED BigDev 2026-08-18)

⭐ **No predicate that gates a member's access to a benefit** is introduced or changed. Which rows
appear is still decided by one rule: a *reconciliation-confirmed* contribution to this pool's cycle
(`listConfirmedContributorsForPool`). That rule is untouched. The `pending` aggregate is also untouched
(`-169` cl.6). This story changes **how a row is labelled** and **stops dropping** rows. ⛔ It does
⛔ not change who counts as a contributor. ⛔ Nothing here reads `members.state` to decide eligibility,
and ⛔ nothing reads `is_valid`, `is_assignable` or a moderation overlay.

⭐ **One sentence, in the member's terms:** *"the contributor list for my pool shows each person's name
exactly as the public page for that drive shows it (or more), and where a name cannot be shown it says
'A contributor' in that person's place, without saying why."*
**Checked against the Niyamavali: no clause governs how a contributor's name is displayed** (grep
`last initial` / `contributor` over the Niyamavali: no hit). The governing text is the four Trustee
rulings cited in the PREFLIGHT, all checked verbatim at `a44aef23`.

---

## ⚠ THE SEVEN TRAPS

### Trap 1 — ⛔ Re-admitting `member.anonymousMember` is ruled out by name
`-222` **Consequence 3**: the placeholder may ⛔ **not** come from `member.anonymousMember`
(`common.json`, *"an anonymous member"* / *"एक गुमनाम सदस्य"*). That key would *"state that the person
exercised their right to erasure when the name was merely absent"*. It also stays ⛔ **undeleted**: its
removal is a separate dead-seam decision (`deferred-work.md`, the `ANONYMOUS_MEMBER_I18N_KEY` item).
⚠ `pool-contributors-rtbf.spec.ts` asserts `.not.toContain('anonymousMember')` and
`.not.toContain('anonymized')` as **raw-JSON substring** checks. ⇒ ⛔ No new field, kind or key name
may contain either substring. Use `unnamed`.

### Trap 2 — ⚠ The presenter THROWS on an unresolvable name, and the mobile catch DROPS the row
`packages/ui/src/contribution-list/presenter.ts` `case 'unknown': throw …`. `PoolContributorList.tsx`
wraps each row in `try/catch` and returns `null`. ⇒ **If you route the placeholder through the
existing `unknown` arm without changing the presenter, every withheld row is silently dropped again**,
with every type check green. ⭐ The placeholder needs a real, rendered arm (AC3).

### Trap 3 — ⛔ The RTBF pre-filter destroys the row's POSITION
`member-pool/handlers.ts` (`resolveContributorList`) runs
`representable = confirmed.filter(c => state !== 'anonymized')` **before** decrypt. Filtering there
removes the row. Removing only the `:1250` null-filter still leaves erased contributors missing.
⭐ Both must become a per-row map to `{ name: null }`. The erased row must still **skip the decrypt**
(it is ⛔ never scheduled for decryption; keep that).

### Trap 4 — ⛔ A literal `full_name` or a reused public resolver breaks `-181`
`-181` cl.1: the member form is **mode-resolved** from the Pariwar's stored
`public_name_presentation_mode`. ⛔ Never hard-code "full name". ⛔ And never call
`kyc.resolvePublicMemberName` on the member side, because it **omits mononyms** under `shielded_name`
(`-181`'s trap). ⭐ Use `notifications.resolveMemberFacingDeceasedName(mode, storedName)`. It is the
shipped member-side resolver: the same form rule as public, and it shows a mononym instead of omitting
it (D3). A test must **flip the stored mode and assert the rendered form changes**. That is the only
test that catches a hard-coded literal.

### Trap 5 — ⚠ A KMS outage must ⛔ not render as N placeholders
Today a decrypt failure is a per-row `null`, which is dropped. With placeholders, a systemic KMS outage
would render **every row as "A contributor"**, which a member would read as mass erasure. The public
route solved this with `KmsOutageError` / `withKmsOutageClassification`, but those are module-private
in `public-pages/handlers.ts`. ⭐ D4 extracts them and routes an outage to the member route's
**existing** fail-soft (`{ assigned: false }`).

### Trap 6 — ⚠ The wire change breaks every installed build, and the MMKV cache holds the OLD shape
`packages/api-client` **throws** on `schema.parse` against a `.strict()` schema (the 8-17 AC8
finding). ⇒ the moment the API returns `{ name }`, every older build's query errors. The component then
self-suppresses (a calm placeholder, not an error wall), so the list **silently disappears** on that
build. ⚠ Separately, `usePoolContributorsQuery` is persisted to MMKV for **7 days** and
**hydrate does ⛔ not re-validate**. A new build can therefore start up holding an old
`{ firstName, lastInitial }` payload. ⭐ AC6 handles both.

### Trap 7 — ⚠ Stale "first-name + last-initial" / "omits the row" prose is everywhere
Contracts, the `ui` view-model, `index.ts`, the mobile component header, `sahyog-vivran.ts`, the
render module, `[driveToken].astro`, both locale `$comment`s, the FR-74 matrix, and the member
drive-list/detail handlers (`handlers.ts:608-620`, `:1012-1015`) all describe the **old** behaviour.
⭐ **Annotate, never rewrite** ([[feedback_supersede_never_reinterpret]]). Keep the old sentence and
add a dated note that it is superseded by this story and `-222`. The full inventory is Task 7.

---

## ⚖️ Decisions (the author's to make; each passed the routing template's §0 gate)

> ⭐ All six are recorded in **`2026-09-19-224`** by Task 1, before any code. ⛔ None changes what the
> Trust discloses about a person beyond what `-189` cl.3 and `-222` already ruled.

**D1 — KEY STRATEGY: ONE key.** `packages/ui` reads the **existing**
`sahyog-vivran` → `value.contributor_unnamed` (en `A contributor`, hi `एक सहकर्मी`).
⛔ No second key is minted in `contribution` or anywhere else.
- **Ground:** `-222` cl.2 says *"no second key"*. Consequence 3 says *"a new key in the RULED word"*,
  meaning new **relative to `member.anonymousMember`**. The existing key already *is* that key.
  Reading one key satisfies both clauses. Two same-word keys satisfy only one. This closes the
  `deferred-work.md` item *"`-222` key strategy for `11b-21`"*.
- **Mechanics:** widen `ContributionListI18nRef.namespace` from the literal `'contribution'` to
  `'contribution' | 'sahyog-vivran'`. The view-model doc already anticipates *"may add a second
  namespace"*. Mobile already registers `sahyog-vivran` (`MemberDriveDetail.tsx`, `VIVRAN_NS`), so no
  catalog change is needed.
- ⚠ This deliberately breaches the "namespace is a fence by convention" note in 11b-3b's header
  comment, for exactly **one** ref. Annotate that note.

**D2 — WIRE SHAPE: `ConfirmedContributorRow = z.object({ name: z.string().min(1).nullable() }).strict()`.**
This mirrors `PublicSahyogVivranContributor`: one row kind, a nullable name, ⛔ no cause field,
⛔ no row key, and ⛔ no copy on the wire (the word resolves at render).
- **Ground:** `-169` cl.8 (*"exactly ONE row kind"*) holds, because a nullable field is not a second
  kind. `-222` cl.3 and `-177` cl.3 (no row key) hold. The field is named `name`, ⛔ not `fullName`:
  `contributions.test.ts` rejects a decoy field called `fullName`, and `name` is the public contract's
  spelling.

**D3 — NAME FORM: `resolveMemberFacingDeceasedName(mode, storedName)`, then normalise.** The mode is
read once per request (`resolvePoolNamePresentationModeForRequest`). A **mononym** under
`shielded_name` renders the **mononym**, ⛔ not the placeholder.
- **Ground:** `-181` cl.1 means both sides share the form rule and the mode, so under `full_name` the
  member sees the full name and under `shielded_name` sees `Firstname L.`, exactly as public does.
- ⭐ For a mononym, this keeps what a member **already sees today**. `splitFirstNameLastInitial("Ravi")`
  gives `lastInitial: ''`, and the row renders `Ravi`. Switching to the public resolver would **take a
  name away from members** in shielded Pariwars. That would be a new withholding that no ruling asked
  for, and `-181`'s trap names that exact mechanism.
- `-189` cl.3 (*"MORE … ⛔ never less"*) is satisfied either way. Showing the mononym is the "more".
- ⚠ **Residual, recorded rather than hidden (AC8):** a member comparing their list with the public
  page could match a public placeholder to a named mononym on their own list. That tells them the
  public row's cause was "mononym" and not one of the other four. The only person who learns this
  already sees that person's name. ⚠ This is weighed against `-222` cl.2's *"NOTHING may disclose
  WHICH"*; see **Question for BigDev** at the end.
- ⛔ Do ⛔ not fork the resolver. A neutrally named **re-export** of the same function from
  `@twt/domain` (e.g. `resolveMemberFacingPersonName`) is allowed. A second implementation is ⛔ not.

**D4 — OUTAGE ≠ ERASURE.** Extract `normalisePublicName`, `KmsOutageError` and
`withKmsOutageClassification` from `apps/api/src/modules/public-pages/handlers.ts` into a shared
module under `apps/api/src/modules/kyc/` (e.g. `kyc/name-render.ts`). The public handler then imports
them, **byte-for-byte unchanged in behaviour**.
- On the member route, a classified **outage throws**. The existing `poolContributors` catch
  fail-softs to `CONTRIBUTOR_LIST_UNASSIGNED`: the list self-suppresses and never shows N false
  placeholders.
- A **per-envelope** failure (INVALID_ARGUMENT: corrupt or AAD mismatch) is `{ name: null }`.
- `isAbortedTransaction` keeps re-throwing, as today.

**D5 — ACCESSIBILITY COPY: no new copy.** The placeholder row's label is
`t('contributor_list.row_a11y', { name: <placeholder> })`, which gives *"A contributor, confirmed
contributor"* / *"एक सहकर्मी, पुष्ट अंशदाता"*. It is redundant but true and cause-blind. ⛔ Minting a
bespoke a11y string would be new copy on a governance-heavy surface, which is a product call and ⛔ not
this story's.

**D6 — CACHE: new query key + `gcTime: 0` (never persisted).**
- `usePoolContributorsQuery` moves to a new key, e.g. `['member', 'pool-contributors', 'v2']`. That
  orphans every persisted old-shape payload so it is never hydrated into the new component.
- The query sets `gcTime: 0`, which `Provider.tsx`'s `shouldDehydrateQuery` treats as **never
  persist**. This is the same single control the drive-detail hook uses.
- **Ground:** the payload now carries colleagues' **full legal names**. `-172` recorded that an erased
  member's name can render offline from MMKV for up to 7 days. After this story that name would be a
  full name, a **higher-severity** residual. ⭐ `gcTime: 0` closes it **on this surface**.
- ⚠ **Cost, stated:** the list no longer shows instantly from cache on a cold start or offline.
- ⛔ This is ⛔ not the repo-wide fix (member-scoped keys + purge on sign-out); that deferred item stays
  open.

**⛔ OUT OF SCOPE, stated so it is not "fixed" by accident:**
- `member-pool/contribution-note.ts:232`: the member's **own** name on their Contribution Note PDF. It
  is a self-view, outside the drive data class (`-195` cl.1), and its form is ⛔ not raised here.
- `11b-22`: the `value.contributions_count` copy.

---

## Acceptance Criteria

### AC0 — Governance before code
**Given** the six decisions above, **when** the story starts, **then** Task 1's commit lands **first**,
containing:
- the `2026-09-19-224` author-commit entry in `.decision-log.md`;
- the `epics.md` section for 11b.21;
- the FR-24 annotation;
- the ledger row moved to `in-progress`.

⛔ No `packages/` or `apps/` change is in that commit.

### AC1 — Axis A: the member sees the mode-resolved name, never a shorter form than public
**Given** a confirmed contributor whose stored name is `Rajesh Kumar Sharma`,
**when** the Pariwar's mode is `full_name` (the default), **then** the member wire carries
`{ name: "Rajesh Kumar Sharma" }` and the row renders exactly that.
**And when** the stored mode is flipped to `shielded_name`, **then** the same request returns
`{ name: "Rajesh S." }`, the **same string** the public route emits for that name and mode.
**And** a mononym `Ravi` under `shielded_name` returns `{ name: "Ravi" }` (D3).
**And** an invisible-only or bidi-only stored name becomes `{ name: null }` (the shared normaliser, D4).
⛔ `splitFirstNameLastInitial` is no longer called by `resolveContributorList`.

### AC2 — Axis B: every confirmed row is KEPT, in producer order, and cause-blind
**Given** a pool with confirmed contributors C1…C5 in producer order (earliest live confirmation's
`event_version`), where C2 is RTBF-erased, C3 has no KYC profile row, and C4's envelope is corrupt,
**when** a member reads the list, **then** `confirmed` has **exactly five** rows in the order
`[C1-name, null, null, null, C5-name]`.
**And** the three `null` rows are **byte-identical** on the wire. ⛔ No field, key or ordering
difference distinguishes erasure, sentinel, missing profile, failed decrypt, or empty-after-normalise.
**And** the erased row is **never scheduled for decryption** (assert zero `decryptDek` calls for it).
**And** the decrypted `ANONYMIZED_SENTINEL` backstop still yields `null` (compare against the imported
constant, ⛔ never a re-typed literal).
**And** `pending` is **unchanged byte-for-byte**, still computed from the pre-omission
`confirmed.length` (`-169` cl.6: the two axes never subtract).
**And** the response's top-level keys are still exactly `['assigned','confirmed','pending','pool']`.
⛔ No `total`, `omittedCount` or `unnamedCount` is added.

### AC3 — The UI layer renders a placeholder arm, from ONE key
**Given** `packages/ui/src/contribution-list`, **then**:
- the **input** display name is `{ kind: 'name'; name: string } | { kind: 'unnamed' }`;
- the **output** display name is
  `{ kind: 'name'; name: string } | { kind: 'placeholder'; ref: { key: 'value.contributor_unnamed', namespace: 'sahyog-vivran' } }`.

**And** the presenter ⛔ **no longer throws** for `unnamed`. The exhaustiveness `never` guard stays, and
its message still carries the **kind only, never the operand**.
**And** `CONTRIBUTION_LIST_I18N_REFS` gains exactly **one** ref (the placeholder), making **11**.
`member.anonymousMember` stays absent, and the test asserting that absence stays.
**And** the presenter test that every ref resolves is extended to the new namespace, **and** the mobile
real-`t()` leg (`contributor-list-render.test.ts`, the loop over `CONTRIBUTION_LIST_I18N_REFS`) resolves
the new ref in **both locales** ([[feedback_stub_must_call_not_transcribe]]).
**And** `forbidden-imports.test.ts` still bans `@twt/domain` and every name resolver from `packages/ui`.
Name resolution stays on the server.
**And** the `nameParts` output arm is **gone**. The view-model doc's *"⛔ Do ⛔ NOT widen this type to
carry a full name"* is **annotated as superseded by 11b-21**, ⛔ not deleted.

### AC4 — ONE key, enforced by a test that can fail
**Given** D1, **then** a test asserts that across **every** namespace file in `packages/i18n/locales/{en,hi}`:
- **exactly one** key has the value `A contributor` (en);
- **exactly one** key has the value `एक सहकर्मी` (hi);
- both are `sahyog-vivran` → `value.contributor_unnamed`.

⚠ The existing `sahyog-vivran-copy.test.ts` single-placeholder check scans **only** `sahyog-vivran.json`,
so a second key in `contribution.json` would pass it. ⭐ **Prove the new test has teeth:** plant a
duplicate in `contribution.json`, see it fail, then remove the plant. The banned words
(`Anonymous`/`गुमनाम`, `Not recorded`/`दर्ज नहीं`, `Name withheld`, `Removed`/`Erased`, `Unavailable`)
stay banned.

### AC5 — Mobile renders the name or the placeholder, and nothing is dropped
**Given** `apps/mobile/components/contributor-list/`, **then**:
- the adapter maps `{ name: string }` → `{ kind: 'name', name }` and `{ name: null }` → `{ kind: 'unnamed' }`;
- the component renders `name` as-is (⛔ no join) or `t(ref.key, undefined, { namespace: ref.namespace })`
  for the placeholder;
- the placeholder is **visually the same row** as a named one (plain text; an italic/secondary style
  mirroring the public page's `text-gray-600 italic` is allowed). ⛔ No icon, badge or colour that could
  read as a *cause*;
- the row's `accessibilityLabel` is the D5 string;
- `keyExtractor` no longer embeds name parts: use `(item, index) => \`${item.name ?? ''}-${index}\``. It
  is a client render key, ⛔ never a wire key.

⚠ The Story 8.3 `keyExtractor` deferral stays **open**, with its re-pointed trigger (`-177` cl.3).
**And** the per-row `try/catch` stays, but for a valid payload it can **no longer drop a row**. A test
feeds `[name, null, name]` and asserts **three** rendered rows.
**And** the empty/loading/error branches stay **outside** the list (the Fabric empty→populated crash
rule; the `:688` pin stays).
**And** the memo still depends on `locale`, ⛔ not `t` (the `useT()` fresh-closure rule).
**And** the Nominee Console, which mounts the same `<PoolContributorList/>`, renders the same way.
State that explicitly in the Completion Notes: the nominee (session-as-deceased) now sees full names too.

### AC6 — Deployment order and cache are STATED, ⛔ not discovered in production
**Given** Trap 6, **then** the Completion Notes state:
- **(a)** that the new API response makes every **older** build's contributor query fail its strict
  parse, and that the symptom is the list **self-suppressing** on the contributor screen, in the Nominee
  Console panel, and behind `ViewContributorsEntry`'s gate;
- **(b)** the release order chosen: ship together and **accept and record** that window until members
  update; ⭐ **or**, if the dev verifies that production builds are installed, ship a mobile build first
  whose row schema tolerates both shapes for one release. ⚠ Verify the release state (EAS/store
  evidence in the repo). ⛔ Do not assume it;
- **(c)** that D6's new query key and `gcTime: 0` are in place, with a test asserting both;
- **(d)** that `-172`'s offline 7-day residual is **closed on this surface** and stays open repo-wide.

### AC7 — Outage is not erasure (D4)
**Given** the shared extraction, **then** the public-pages suite passes **unchanged** (behaviour
byte-identical, same tests).
**And** on the member route a KMS **outage** during any row's decrypt yields `{ assigned: false }`
(the existing fail-soft), ⛔ never a list of placeholders. A test covers it: an outage on one row of many.
**And** a per-envelope rejection yields that row's `{ name: null }` and **costs the same one**
`decryptDek` call an erased-then-sentinel row would, where reachable.
**And** the **timing residual** from `deferred-work.md` (sixth pass) is recorded as **inherited by the
member route**: a missing profile or an RTBF pre-filtered row costs **zero** KMS calls. ⛔ Do not claim
it is closed.

### AC8 — The `-195` cl.1 compliance statement is WRITTEN (`-222` Consequence 2)
**Given** 11b-3b's AC10 precedent, **then** the Completion Notes carry this statement for the
**contributor-name data class**:
**✅ COMPLIANT after this story.**
- **Public:** mode-resolved, via `resolvePublicMemberName`. **Member:** mode-resolved, via
  `resolveMemberFacingDeceasedName`. Same form rule, same stored mode.
- ⇒ For every stored name and mode, the member form is **equal to or longer than** the public form.
  The only divergence is a mononym under `shielded_name`, where the member sees the name and the public
  sees the placeholder.
- **Both surfaces** render `A contributor` / `एक सहकर्मी` for a withheld name, from one key.
- The member wire still has ⛔ no `total`. It needs none, because every confirmed row is now a row.

**And** it lists the **residuals** honestly:
- the D3 cross-surface mononym correlation;
- the AC7 timing residual;
- the kill-switched-Pariwar case from the routing note §3 (the member surface is the only disclosure
  point there). That was the Panel's to weigh, and `-222` ruled it.

**And** the `deferred-work.md` top section (*"Carried from `-221`"*) is **re-marked, ⛔ not deleted**.
Axis A gets `✅ DISCHARGED by 11b-21` and Axis B gets `✅ BUILT by 11b-21`
([[feedback_closure_language_precision]]).

### AC9 — The friction budget is DISPOSED, ⛔ not skipped
`MEMBER_FACING_PREFIXES` includes `apps/mobile/` (`scripts/friction-budget/lib.ts`), so AC-4's
attribution-on-change **fires**. ⇒ `friction-budget.md` gains a **Story 11b.21 disposition** in the
same PR.
- ⚠ Expected shape: *declaration affirmed, ⛔ no new row*.
- ⚠ **One candidate friction to weigh honestly:** D6's no-offline, no-instant-from-cache list. Say
  whether it is friction to the member and why.
- 11b.20 missed this and needed a fix-up commit (`a44aef23`). The leg diffs **committed** history
  (`${baseRef}...HEAD`), so it passes vacuously until you commit. ⭐ Run `pnpm friction:check` after
  committing.

### AC10 — Tests invert, and none of the old guarantees is lost silently
The following tests are **rewritten, ⛔ not deleted**. Each rewritten `it(...)` keeps a one-line
comment naming what it used to assert and the ruling that inverted it:
- `apps/api/tests/unit/pool-contributors.test.ts` (unresolvable ⇒ omitted **→ placeholder**);
- `apps/api/tests/integration/contributions/pool-contributors-rtbf.spec.ts`:
  - erased ⇒ absent **→ `null` in position**;
  - `toHaveLength(2)` **→ 3**;
  - the drop-to-zero case **→ one `null` row**;
  - **keep:** `pending` byte-identical, the sentinel never on the wire, no `anonymousMember`, no cause
    on the wire;
- `packages/contracts/tests/contributions.test.ts` (fixtures → `{ name }`; keep the decoy teeth for
  `nameCiphertext` / `phone` / `bankAccount` / `memberId`; add `firstName` / `lastInitial` as
  **rejected** decoys);
- `packages/ui/tests/contribution-list/presenter.test.ts` (kinds, arms, the 10 → 11 ref count, the
  namespace pin);
- `apps/mobile/tests/unit/contributor-list-render.test.ts` (adapter, kinds, keyExtractor pin, a11y ref).

⚠ The DB-gated specs (`skipIf(!hasDatabase)`) **skip silently** in `turbo test`. Run them against the
live test DB and state that you did ([[project_live_db_test_gotchas]]).

---

## Tasks / Subtasks

- [ ] **Task 0 — Re-verify the baseline** (all ACs)
  - [ ] `git fetch origin`. `git diff a44aef23..origin/main --stat -- packages apps scripts`. If
        anything under `member-pool/`, `contribution-list/`, `public-pages/handlers.ts`,
        `pool-contributor-list.ts` or `contributor-list/` moved, re-derive every cite below first.
  - [ ] Re-run the routing note §7 commands. Confirm the five `return null` arms and the RTBF pre-filter
        in `resolveContributorList`.
  - [ ] Confirm `.decision-log.md` HEAD is still `-223`. If not, take the next free id and update every
        `-224` reference in this file.
- [ ] **Task 1 — GOVERNANCE COMMIT, before any code** (AC0)
  - [ ] Write `### Decision 2026-09-19-224` (**Author-committed, BigDev**; follow the `-181` entry's
        shape) recording D1–D6 and the out-of-scope fence, each with its ground as given above. Include
        the §0-gate line: *"each is the author's: none changes what the Trust discloses beyond `-189`
        cl.3 and `-222`."*
  - [ ] Annotate `-222` and `-221` with a pointer to `-224`, as annotations only (⛔ no edit of their
        clauses).
  - [ ] `epics.md`: add `### Story 11b.21: …` after the 11b.20 section and before `## Epic 12`, using
        the **SECTIONED** header block (`SECTIONED 2026-09-19 (Story 11b.21 Task 1, before the first line
        of code)`), the 11b.19/11b.20 precedent, commissioning authority `-222` Consequence 1 + `-221`
        cl.4.
  - [ ] Annotate **FR-24** at `epics.md:68` and `prds/prd-TWT-2026-05-22/prd.md` (*"First-name +
        last-initial only"*) as **superseded for the member list by `-189` cl.3 / `-222`, built at
        11b-21**. Do the same for the Story 8.3 ACs at `epics.md` ~`:3169` / `:3179`. ⛔ Annotate only;
        ⛔ do not amend the FR text.
  - [ ] Sprint row `11b-21-…` → `in-progress`, and prepend a ledger entry (SAFE prepend: read first,
        guard on size, then write; [[project_sprint_status_safe_prepend]]).
  - [ ] Commit as `governance(11b.21): -224 — six engineering calls; section the story; row → in-progress`.
- [ ] **Task 2 — Shared name-render module** (D4, AC7)
  - [ ] Move `INVISIBLE_CHARS`, `EDGE_INVISIBLE_OR_SPACE`, `BIDI_CONTROLS`, `normalisePublicName`,
        `KmsOutageError` and `withKmsOutageClassification` into `apps/api/src/modules/kyc/name-render.ts`
        (or similar), moving their doc-blocks with them. `public-pages/handlers.ts` imports them.
  - [ ] Run the public-pages unit + integration suites **unchanged**. They must pass.
  - [ ] ⚠ After moving any doc-block, grep `\*\*/` to make sure no markdown emphasis closed a JSDoc
        ([[project_markdown_emphasis_closes_jsdoc]]).
- [ ] **Task 3 — Contract** (D2, AC2, AC10)
  - [ ] `ConfirmedContributorRow` → `{ name: z.string().min(1).nullable() }.strict()`. Annotate the
        header docs (*"never full names"*, *"firstName + lastInitial"*) as superseded.
  - [ ] Update `contributions.test.ts`: fixtures, and the old field names as rejected decoys.
  - [ ] Check `packages/api-client` still type-checks. The route is ⛔ not in `openapi/v1.yaml`, so no
        regen is needed.
- [ ] **Task 4 — API handler** (AC1, AC2, AC7)
  - [ ] Read the mode once via `resolvePoolNamePresentationModeForRequest`. This is the house pattern:
        `handlers.ts:486`, `:754`.
  - [ ] Replace the RTBF `filter` with a per-row map: erased ⇒ `{ name: null }`, with no decrypt.
  - [ ] Wrap `deps.encryption` with `withKmsOutageClassification`. Per row:
        - profile read failure ⇒ keep today's behaviour and still re-throw `isAbortedTransaction`;
        - no profile or null ciphertext ⇒ `null`;
        - `KmsOutageError` ⇒ **re-throw**;
        - other decrypt fault ⇒ `null`;
        - sentinel ⇒ `null`;
        - otherwise `normalisePublicName(resolveMemberFacingDeceasedName(mode, fullName))`, where `''` ⇒ `null`.
  - [ ] Remove the `row !== null` filter. `pending` keeps using `confirmed.length`.
  - [ ] Keep logs member-attributed and **name-free** ([[project_anonymous_diagnostic_log_convention]]).
        ⛔ Never log a cause-per-row that could reach a client.
  - [ ] Update the `poolContributors` / `resolveContributorList` doc-blocks (step 7 *"→
        first+last-initial"*) by annotation.
  - [ ] Tests: the unit rewrite; live-DB legs for AC1 (the mode flip, the mononym), AC2 (the five-row
        order, byte-identical nulls, zero decrypts for the erased row) and AC7 (outage ⇒
        `{ assigned: false }`).
- [ ] **Task 5 — `packages/ui` presenter** (D1, D5, AC3, AC4)
  - [ ] Change the input/output kinds per AC3, widen the namespace literal, and add the placeholder ref
        to `i18n-keys.ts` with a `$comment`-style doc citing `-222` cl.2 and D1.
  - [ ] Update `index.ts`'s stale *"NAME PARTS ONLY … form UNRULED"* header by annotation.
  - [ ] Update the presenter, anti-widening and no-list-iteration tests. Add the AC4 cross-namespace
        one-key test (in `packages/i18n/tests/` or `packages/ui/tests/`) and prove its teeth.
- [ ] **Task 6 — Mobile** (D6, AC5, AC6)
  - [ ] Change the adapter, the component render and the a11y label, then the keyExtractor.
  - [ ] Change `usePoolContributorsQuery` to the new key and `gcTime: 0`, with a comment pointing at
        `Provider.tsx` (*"the two are ONE control in two files"*, as `useMemberDriveDetailQuery.ts`
        says).
  - [ ] Update `contributor-list-render.test.ts` pins. Add the three-rows test, the real-`t()`
        placeholder leg in both locales, and the query-options test.
  - [ ] ⚠ Run `pool-name-form.test.ts` (the 8.16 fence: clients bind no form decider or mode). It must
        still pass: the client receives a resolved string.
- [ ] **Task 7 — Annotate the stale prose** (Trap 7). Use the form `⚠ SUPERSEDED 2026-09-?? by Story 11b.21 / -222: …`
  - [ ] `packages/contracts/src/public-pages/sahyog-vivran.ts` (~`:540-548`, `:569`) and
        `apps/public/src/lib/sahyog-vivran-render.ts` (~`:143-152`): *"until 11b-21"*.
  - [ ] `apps/public/src/pages/sahyog-vivran/[driveToken].astro` (~`:163-168`).
  - [ ] `public-pages/handlers.ts` (~`:1054-1055`).
  - [ ] en/hi `sahyog-vivran.json` `$comment.contributor_unnamed`: record D1 (*"the member surface reads
        THIS key"*). ⛔ The value strings are **untouched**.
  - [ ] `public-vs-private-matrix.yaml` (`contributor_name`, ~`:1316-1323`): *"discharged by
        `11b-21`"* → discharged.
  - [ ] `member-pool/handlers.ts` drive-list/detail notes (*"pool-contributors OMITS the row"*,
        ~`:608-620`, `:1012-1015`) and `member-drive-detail.spec.ts:715`.
  - [ ] The `PoolContributorList.tsx` header, and `contributor-list-empty.test.ts`'s D5 header.
  - [ ] `view-model.ts:45,79`.
  - [ ] ⭐ Finish with `grep -rn "11b-21\|lastInitial\|last-initial\|OMITTED ENTIRELY" packages apps`.
        Every remaining hit is either a true statement or annotated.
- [ ] **Task 8 — Records** (AC6, AC8, AC9)
  - [ ] Completion Notes: the AC5 nominee line, the AC6 (a)–(d) statement, and the AC8 compliance
        statement with residuals.
  - [ ] `deferred-work.md`: re-mark the `-221` top section and the fourth-pass *"`-222` key strategy"*
        item (**✅ CLOSED by `-224` D1**). Annotate the sixth-pass timing item as now covering the
        member route too.
  - [ ] `friction-budget.md`: add the 11b.21 disposition.
  - [ ] Sprint row → `review`, with a ledger prepend.
- [ ] **Task 9 — Verify**
  - [ ] Run `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm i18n:check`, the live-DB specs for
        member-pool, public-pages and contributions, `astro check` (`apps/public`) and
        `pnpm friction:check` (after commit).
  - [ ] Then `pnpm ci:local`, which runs on push. Report the job count.

---

## Dev Notes

### The code path, at `a44aef23`

| Layer | File | Today | After |
|---|---|---|---|
| Route | `apps/api/src/modules/member-pool/routes.ts:61-63` | `GET /api/v1/member/pool-contributors` | unchanged |
| Handler | `member-pool/handlers.ts:161-185` `poolContributors` | fail-soft `{ assigned:false }` on any throw | unchanged; now also catches a KMS outage (D4) |
| Pipeline | `handlers.ts:1091-1300` `resolveContributorList` | `:1161` RTBF **filter**; `:1182-1248` decrypt → `splitFirstNameLastInitial` (`:1240`); `:1250` null **filter** | per-row map; mode-resolved name; ⛔ no filters |
| Producer | `packages/domain/src/contribution/read.ts:128-230` | ordered by earliest live confirmation `event_version`, `member_id` final tie-break | unchanged. `mapWithConcurrency` preserves the index, so order survives |
| Contract | `packages/contracts/src/contributions/pool-contributor-list.ts:42-51` | `{ firstName, lastInitial }` `.strict()` | `{ name: string\|null }` `.strict()` |
| SDK | `packages/api-client/src/index.ts:564-571` | throwing zod `parse` | unchanged (Trap 6) |
| Presenter | `packages/ui/src/contribution-list/{view-model,presenter,i18n-keys,index}.ts` | two input kinds, `unknown` throws, `nameParts` output, 10 refs | AC3 |
| Mobile | `apps/mobile/components/contributor-list/{contribution-row-input.ts,PoolContributorList.tsx,usePoolContributorsQuery.ts}` | joins parts; name-bearing key; persisted 7d | AC5/AC6 |
| Mount points | `app/(contribution)/contributors.tsx`, `components/nominee-console/NomineeConsole.tsx:213`, `ViewContributorsEntry.tsx` | — | all inherit the change |

### Public precedent to mirror (Story 11b-3b)
`apps/api/src/modules/public-pages/handlers.ts:843` (mode read once), `:849` (outage wrapper), and
`:1038-1177` (per-row map, **no filter**, `{ name: null }` on every withheld cause, `KmsOutageError`
re-thrown). The contract is `PublicSahyogVivranContributor` (`sahyog-vivran.ts:572-577`). The render
is `[driveToken].astro:736-740`, as plain text, ⛔ not through `<MatrixField>`.
⚠ One difference is deliberate: the public route has **no** batched member-state read, and RTBF is
caught only by the sentinel. The member route **keeps** its batched `getCurrentMemberStates` read
(`handlers.ts:1158`, mirroring `getCurrentMemberState`, `-169` cl.4) so erased rows skip the decrypt.

### Name resolvers — which one, and why
- `kyc.resolvePublicMemberName` (`packages/domain/src/kyc/public-name.ts:73-107`): the **public**
  resolver. Under `shielded_name` it maps a mononym to `''` ⇒ omit. ⛔ **Not for this surface** (Trap 4).
- `notifications.resolveMemberFacingDeceasedName` (`packages/domain/src/notifications/pool-identity.ts:141-162`):
  the **member** resolver. Its shielded arm produces `Firstname L.` (the trailing period matches
  public on purpose) and shows a mononym. Its `full_name` arm collapses whitespace. ⭐ Use this one.
- `splitFirstNameLastInitial` (`packages/domain/src/kyc/name.ts:47-53`) takes the **last** token's
  initial. It stays in use elsewhere (the Contribution Note, both resolvers' shielded arms).

### Rulings checked and found ⛔ NOT to change this story
- `-223`: about the **deceased** name on 11b-20. Contributor RTBF is a real cause and `-223` cl.4
  does ⛔ not reach it.
- `-180` / `8-16`: the **deceased** pool identity on member surfaces. This is the direct precedent,
  but it is a different data subject.
- `-174` / `-175`: public contributor name is the full name, unconditional. ⛔ Unchanged.
- `-219` cl.4: no count of unnamed rows is published. ⛔ Unchanged: the member wire gains no count.
- `-172`: the RTBF guarantee ends at the wire. D6 **narrows** the device residual on this surface.

### Load-bearing invariant families to self-check
From `_bmad/custom/load-bearing-invariant-checklist.md`:
- **Family 6:** field-pick, minimal PII per consumer. The wire is `{ name }` only.
- **Family 10:** closure honesty, AC8's re-marks.
- **Family 11:** policy meaning, above.
- **Family 13:** React Native semantic a11y. `accessible` on the labelled row container; the
  placeholder row is announced like any row.

### Testing standards
- Vitest across packages. Live-DB specs use the `twt-test-pg` container. ⛔ Never regenerate an applied
  migration (none is needed here) ([[project_live_db_test_gotchas]]).
- Assert **membership and order**, not incidental counts from shared fixtures.
- Stubs must **call** the real `t()` / resolver, never transcribe their output
  ([[feedback_stub_must_call_not_transcribe]]).

### Previous-story intelligence
- **11b-20 review:** an invisible-only or bidi holder name rendered blank because the API skipped
  `normalisePublicName`. ⇒ the member route must normalise too (AC1, last bullet).
- **11b-20:** the friction-budget disposition was forgotten and cost a fix-up commit (AC9).
- **11b-3b:** its ACs went stale when `-219` landed, and five review passes followed. ⇒ when a ruling
  lands mid-story, annotate the AC in place.
- **11b-3b:** the throw-message kind-only fix in `presenter.ts` (a name leaking into a logged
  `error.message`) must survive the rewrite of that `switch`.
- **Commit pattern:** `governance(11b.21): …` → `feat(11b.21): …` (code plus story, ledger and
  deferred-work records) → review → `fix(11b.21): …`. **Rebase-merge, ⛔ never squash** for governance
  stories ([[project_story_automator_ops]]).

### References
- `.decision-log.md`:
  - `#decision-2026-09-18-222` (cl.1–cl.4, Consequences 1–4)
  - `#decision-2026-09-18-221` (cl.1–cl.4)
  - `#decision-2026-09-04-189` cl.3
  - `#decision-2026-09-04-195` cl.1
  - `#decision-2026-09-16-219` cl.1–cl.4
  - `#decision-2026-09-02-181`
  - `#decision-2026-09-02-177` cl.2 (superseded) and cl.3
  - `#decision-2026-08-30-169` cl.1 (D5, placeholder half superseded), cl.6, cl.8
  - `#decision-2026-09-01-172`
- `_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-09-18-member-surface-placeholder-clause-conflict.md`
  (§3 and §4: the verified facts behind option (B))
- `_bmad-output/implementation-artifacts/deferred-work.md`: the top section (`-221`); the 11b-3b
  fourth pass (key strategy) and sixth pass (timing residual)
- `_bmad-output/implementation-artifacts/11b-3b-sahyog-vivran-named-identity-render-layer.md`: AC10
  (compliance-statement shape) and AC12
- `_bmad-output/implementation-artifacts/8-17-nominee-vpa-on-the-payment-screen.md`: AC8
  (deployment-order statement)
- `_bmad-output/implementation-artifacts/8-16-member-pool-identity-name-form-alignment.md`: AC7
  (friction disposition) and Trap 4 (mononym)
- `apps/mobile/components/drive-detail/useMemberDriveDetailQuery.ts` and `apps/mobile/components/Provider.tsx`
  (`gcTime: 0` as the never-persist marker)

### ❓ Question for BigDev (does ⛔ not block the story; D3 is written as the default)
**D3, the mononym under `shielded_name`.** The default keeps what members see today (`Ravi`), per
`-181` and `-189` cl.3. The alternative is exact parity with public (a placeholder): it removes a
name members currently see, but it closes the cross-surface correlation residual against `-222` cl.2.
⭐ If you read `-222` cl.2's *"NOTHING may disclose WHICH"* as covering cross-surface comparison, the
honest move is a routing note (what the Trust discloses, and to whom), ⛔ not a silent switch.
⚠ Only Pariwars on `shielded_name` are affected; the default mode is `full_name`, where public and
member agree for mononyms.

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List

## Change Log

| Date | Version | Description | Author |
|---|---|---|---|
| 2026-09-19 | 0.1 | Created via `bmad-create-story` at `a44aef23`. Carries both axes of the `-221` breach, per `-222` Consequence 1. Six engineering calls (D1–D6) are ruled in-file for recording at `-224` by Task 1. ⛔ No open Panel question; one flagged reading for BigDev (D3). Status → `ready-for-dev`. | BigDev + Claude |
