---
baseline_commit: a44aef23
---

<!--
⭐ BASELINE: `a44aef23` — `governance(11b.20): friction-budget disposition`. `origin/main` was fetched
and matched it on 2026-09-19. Two facts, stated separately:
  - the pin is an ancestor of HEAD (durable);
  - every code claim below was re-derived at `d72d4e68` (v0.2 validate, 2026-09-19), where
    `git diff a44aef23..d72d4e68 -- packages apps scripts` is EMPTY (perishable).
⚠ Code claims go stale as soon as a sibling ships (`11b-22` touches `[driveToken].astro`), so re-diff
`packages apps scripts` before starting (Task 0).
⚠ No `file:NNN` pointer in this file points into `.decision-log.md`, `deferred-work.md` or
`sprint-status.yaml` (all newest-first). Cite those by decision id / clause / item title / row key only.
⚠ KEY `11b-18` IS SKIPPED for the reason recorded in `11b-19`. It is absent from `development_status`.
-->

# Story 11b.21: Member Contributor List — Full Name and the Unnamed Row, at Parity with the Public Page `[SURFACE]`

Status: in-progress

## ⭐ GLYPH REGISTER — read this before any clause below

⭐ = an action to take · ⚠ = a hazard · **⛔ marks a negation and must be followed by an explicit
negator** (`not` / `no` / `never` / `nothing` / `neither`, or a prohibition verb). A ⛔ placed before a
positive clause is an **inversion**, not emphasis.

## ✅ PREFLIGHT — **STARTABLE.** No Panel question blocks it.

⭐ **Authority.** This story discharges existing rulings. It asks no new question of the Panel.

| Axis | Ruled by | What it requires |
|---|---|---|
| **A — the NAME FORM** | `2026-09-04-189` **cl.3** (Trustee-ratified), scoped by `-195` **cl.1** (author-committed) to the drive data class; `-221` **cl.4** (author-committed): *"AXIS A IS A DISCHARGE, ⛔ NOT A QUESTION"* | The member contributor list stops showing **less** of a name than the public page does |
| **B — the UNNAMED ROW** | `2026-09-18-222` **cl.1–cl.4** (Trustee-ratified, option **(B)**) | The member list **keeps** a withheld contributor's row in the producer's position and renders `A contributor` / `एक सहकर्मी` |

⚠ **`2026-09-02-177` cl.2 (the "CARRY") is no longer a live authority.** It is superseded by `-189` cl.3
(`-221` cl.2). Citing it as a reason to keep the shielded form is the defect `-221` records.

⭐ **Seven engineering calls are ruled in THIS FILE (the "Decisions" section below).** Each passed the
routing template's §0 gate as the author's to make. Task 1 records them as ONE author-commit decision
entry (**`2026-09-19-224`**, the next free id; the current HEAD is `-223`) **before any code**
([[feedback_governance_commits_precede_implementation]]). That entry also records the **supersession**
of three author-committed clauses this story overturns: `-168` cl.5, `-169` cl.4 and `-169` cl.8
(see D2, D3-presenter, D7).

⚠ **One reading stays open for BigDev, and the story does not wait on it:** D3's mononym arm (see
**Question for BigDev**). The default keeps what members see **today**, so building it creates no new
disclosure. If BigDev reads `-222` cl.2 as covering cross-surface comparison, the answer is a routing
note, and the only code change is one arm of D3.

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
(`-169` cl.6). This story changes **how a row is labelled** and **stops dropping** rows. It does
⛔ not change who counts as a contributor. ⛔ Nothing here reads `members.state` to decide eligibility,
and ⛔ nothing reads `is_valid`, `is_assignable` or a moderation overlay. (D7 **removes** the one
`members`-lifecycle read this path had; that read decided display, never eligibility.)

⭐ **One sentence, in the member's terms:** *"the contributor list for my pool shows each person's name
exactly as the public page for that drive shows it (or more), and where a name cannot be shown it says
'A contributor' in that person's place, without saying why."*
**Checked against the Niyamavali: no clause governs how a contributor's name is displayed** (grep
`last initial` / `contributor` over the Niyamavali: no hit). The governing text is the rulings cited in
the PREFLIGHT: **two Trustee-ratified** (`-189` cl.3, `-222` cl.1–cl.4) and **three author-committed**
(`-195` cl.1, `-221`, `-177` cl.2 as superseded), all checked verbatim at `a44aef23`.

---

## ⚠ THE EIGHT TRAPS

### Trap 1 — Re-admitting `member.anonymousMember` is ruled out by name
`-222` **Consequence 3**: the placeholder may ⛔ **not** come from `member.anonymousMember`
(`common.json`, *"an anonymous member"* / *"एक गुमनाम सदस्य"*). That key would *"state that the person
exercised their right to erasure when the name was merely absent"*. It also stays **in the catalog**
(⛔ not deleted): its removal is a separate dead-seam decision (`deferred-work.md`, the
`ANONYMOUS_MEMBER_I18N_KEY` item).
⚠ `pool-contributors-rtbf.spec.ts` asserts `.not.toContain('anonymousMember')` and
`.not.toContain('anonymized')` as **raw-JSON substring** checks (`:372-374`, and `:442-444` for
`omittedCount` / `rowKey` / `"kind"`). ⇒ ⛔ No new field, kind or key name may contain any of those
substrings. Use `unnamed`.

### Trap 2 — ⚠ The presenter THROWS on an unresolvable name, and the mobile catch DROPS the row
`packages/ui/src/contribution-list/presenter.ts` `case 'unknown': throw …` (`:76-80`).
`PoolContributorList.tsx` wraps each row in `try/catch` and returns `null` (`:108-143`). ⇒ **If you
route the placeholder through the existing `unknown` arm without changing the presenter, every withheld
row is silently dropped again**, with every type check green. ⭐ The placeholder needs a real, rendered
arm (AC3).

### Trap 3 — ⚠ The RTBF pre-filter destroys the row's POSITION, and skipping the decrypt is a TIMING SIGNAL
`member-pool/handlers.ts` (`resolveContributorList`) calls `getCurrentMemberStates` (`:1135`) and then
runs `const representable = confirmed.filter(…)` (`:1159`) **before** decrypt. Filtering there removes
the row, and removing only the null-filter at `:1250-1251` still leaves erased contributors missing.
⚠ **Keeping erased rows but still skipping their decrypt is ⛔ not acceptable either.** An erased row
would then cost **zero** KMS calls, while a corrupt envelope or the decrypted sentinel costs **one**.
That difference identifies **which** rows are erased, and `-222` cl.2 (Trustee-ratified) says
*"⛔ NOTHING may disclose WHICH"*. `-219` cl.3 calls a labelled RTBF disclosure *"strictly worse"*,
and 11b-3b AC12(iii) records that the rule *"covers status and timing"*. The public route has no
pre-filter: an erased row there costs one call and is caught by the sentinel.
⭐ **D7: delete the pre-filter and the batched state read.** Every row with a profile goes through the
same decrypt. The erased row decrypts to `ANONYMIZED_SENTINEL` and becomes `{ name: null }`.
`-170` already records that the state read *"is an **OPTIMIZATION**, ⛔ never the guarantee"*; the
sentinel is the guarantee.

### Trap 4 — ⚠ A literal `full_name`, a reused public resolver, or an UNCLEANED name breaks parity
- `-181` cl.1: the member form is **mode-resolved** from the Pariwar's stored
  `public_name_presentation_mode`. ⛔ Never hard-code "full name".
- ⛔ Never call `kyc.resolvePublicMemberName` on the member side: it **omits mononyms** under
  `shielded_name` (`-181`'s trap). ⭐ Use `notifications.resolveMemberFacingDeceasedName(mode, …)`.
- ⚠⚠ **But that resolver does ⛔ no token cleaning, and the public one does.** `resolvePublicMemberName`
  first runs `publicNameTokens(storedName)` (`kyc/public-name.ts:138-144`): it strips bidi controls and
  edge-invisible characters, and drops tokens with no letter or digit. The member resolver splits on
  whitespace only. Verified results under `shielded_name`:
  - `"Rajesh ​Sharma"` (zero-width space) gives member `"Rajesh ​."` and public `"Rajesh S."`. **The
    member sees less**, which is a `-189` cl.3 breach.
  - `"Sunita ."` gives member `"Sunita .."` and public `null`.
  ⭐ **Feed the cleaned tokens in:**
  `resolveMemberFacingDeceasedName(mode, kyc.publicNameTokens(storedName).join(' '))`
  (`publicNameTokens` is exported via `kyc/index.ts:26`).
- A test must **flip the stored mode and assert the rendered form changes**. That is the only test
  that catches a hard-coded literal. Dirty-name cases (the two above) must be in it too.

### Trap 5 — ⚠ An infrastructure fault must ⛔ never render as "A contributor"
Today a decrypt failure is a per-row `null`, which is dropped. With placeholders, a systemic fault would
render **every row as "A contributor"**, which a member would read as mass erasure. Two routes lead
there:
- **A KMS outage.** The public route solved this with `KmsOutageError` / `withKmsOutageClassification`,
  but those are module-private in `public-pages/handlers.ts` (`:1317`, `:1352`). ⭐ D4 extracts them.
- **A DB fault on the profile read.** The member route today catches a profile-read error inside the
  per-row `try` (`:1196-1209`), re-throws only `isAbortedTransaction`, and otherwise returns `null`. The
  public route decided the opposite at its fifth review pass (`public-pages/handlers.ts:1066-1071`):
  *"ANY FAILURE OF IT IS AN OUTAGE, ⛔ NEVER A PLACEHOLDER … A dropped connection carries ⛔ none
  (`Connection terminated unexpectedly`, `ECONNRESET`) … ⛔ Do ⛔ not move it back inside the `try`."*
  ⭐ D4 moves the member read **outside** the `try` too.
Both outcomes go to the member route's **existing** fail-soft (`{ assigned: false }`).

### Trap 6 — ⚠ The wire change breaks every installed build, and MMKV holds the OLD shape
- `packages/api-client` **throws** on `schema.parse` (`index.ts:264`, `:333`; the route wrapper at
  `:564-571`) against a `.strict()` schema (the 8-17 AC8 finding). ⇒ the moment the API returns
  `{ name }`, every older build's query errors.
- ⚠ **What an older build then shows depends on its cache.** The component branches only on
  `isLoading` and `!data || !data.assigned` (`PoolContributorList.tsx:184`, `:195`), and React Query
  keeps the last good `data` when a refetch fails. So a warm or hydrated old build **keeps showing the
  stale list** for the session. A cold one **self-suppresses** (a calm placeholder, not an error wall).
- ⚠ `usePoolContributorsQuery` is persisted to MMKV. `Provider.tsx` sets `maxAge` 7 days with ⛔ no
  `buster`, and the persister rewrites the whole-client timestamp on **every** save. The client default
  `gcTime` is 7 days (`lib/query-client.ts:18`). ⇒ an old `['member','pool-contributors']` entry is
  re-hydrated and re-persisted on every launch, and is **never deleted** on an active device. A new
  query key only **hides** it. ⭐ D6 also **removes** it.
⭐ AC6 handles all three.

### Trap 7 — ⚠ Stale "first-name + last-initial" / "omits the row" prose is everywhere
Contracts, the `ui` view-model, presenter and `i18n-keys` headers, `index.ts`, the mobile component
header, `sahyog-vivran.ts`, the render module, the message-block module, the encryption README,
`[driveToken].astro`, the en `$comment`, the FR-74 matrix, `bounded-decrypt.ts`, and the member
drive-list/detail handlers all describe the **old** behaviour or the **old** file location.
⭐ **Annotate, never rewrite** ([[feedback_supersede_never_reinterpret]]). Keep the old sentence and
add a dated note that it is superseded by this story and `-222`. The full inventory is Task 7.

### Trap 8 — ⚠ Fences that go RED on write, and one that passes vacuously
- `packages/ui/tests/contribution-list/death-term.test.ts` scans **code and comments** of every `.ts`
  under `packages/ui/src/contribution-list` (lowercased, alphanumerics only) for `deceased`,
  `membersstate`, `dateofdeath` and `accountfrozen`. ⇒ ⛔ No annotation in `packages/ui` may name
  `resolveMemberFacingDeceasedName` or say "deceased". Write "the member-side name resolver (server)".
- `apps/mobile/tests/unit/contributor-list-render.test.ts:771-806` bans `deceased` and `members?.state`
  in the component, route, `NomineeConsole` and the hook (comments stripped). The client binds ⛔ no
  resolver anyway.
- `presenter.test.ts:202-204` asserts every ref key `startsWith('contributor_list.')`, and `:43` pins
  `rowA11y.ref.namespace` to `'contribution'`. The D1 ref breaks the first by design: rewrite it to
  assert "every ref is `contributor_list.*` **except exactly one**, `sahyog-vivran` →
  `value.contributor_unnamed`". `:43` still holds (the a11y ref stays in `contribution`).
- `pool-name-form.test.ts`'s `CONSUMERS` lists only `ActiveContributionCard.tsx` and
  `YogdaanBahiRow.tsx` (`:30-32`). Today it gives this surface **no** coverage, so "it still passes"
  proves nothing. ⭐ Add `PoolContributorList.tsx` to `CONSUMERS` (Task 6).
- Removing the `:1240` call leaves `splitFirstNameLastInitial` unused in `member-pool/handlers.ts`
  (imported at `:81` from `./name.js`). ⭐ Delete the import or lint fails. `contribution-note.ts:232`
  keeps its own use.

---

## ⚖️ Decisions (the author's to make; each passed the routing template's §0 gate)

> ⭐ All seven are recorded in **`2026-09-19-224`** by Task 1, before any code. None changes what the
> Trust discloses about a person beyond what `-189` cl.3 and `-222` already ruled. D3's mononym arm is
> the one flagged reading (see the end of this file).

**D1 — KEY STRATEGY: ONE key.** `packages/ui` reads the **existing**
`sahyog-vivran` → `value.contributor_unnamed` (en `A contributor`, hi `एक सहकर्मी`).
⛔ No second key is minted in `contribution` or anywhere else.
- **Ground:** `-222` cl.2 (Trustee-ratified): *"⛔ ⛔ No member-specific variant is minted, and ⛔ no
  second key."* The 11b-3b fourth-pass deferred item gives the choice to this story: *"Engineering,
  ⛔ not the Panel's — the WORDS are ruled; `11b-21` picks one key vs a same-words key per namespace and
  records it."*
- ⚠ **`-222` Consequence 3 reads *"⭐ A new key in the RULED word, under the cl.2 constraint."*** One
  existing key satisfies cl.2 and does ⛔ not satisfy Consequence 3's "new". `-224` records that
  **cl.2 (a ratified clause) is followed and Consequence 3's "new key" is deliberately not met**, as an
  annotation to `-222`. ⛔ Do not argue that the existing key "is" the new key: that re-reads ratified
  text ([[feedback_supersede_never_reinterpret]]). The `sprint-status.yaml` `11b-21` row comment
  (*"⭐ A new key, in the RULED word"*) and the 2026-09-18d ledger entry carry the same phrase and get
  the same annotation (Task 1). This closes the `deferred-work.md` item *"`-222` key strategy for
  `11b-21`"*.
- **Mechanics:** widen `ContributionListI18nRef.namespace` (`view-model.ts:33`) from the literal
  `'contribution'` to `'contribution' | 'sahyog-vivran'`. The view-model doc already anticipates
  *"11b.3 may add a second namespace"* (`view-model.ts:28`). Every namespace is imported statically into
  the one catalog (`packages/i18n/src/catalog.ts:72-77`), so `t(…, { namespace: 'sahyog-vivran' })`
  resolves on every mount point with no registration step. `t()` **throws** on an unknown namespace or
  key (`resolver.ts`), so the AC3 real-`t()` leg is a real check.
- ⚠ This deliberately breaches the "namespace is a fence by convention" note in 11b-3b's header
  comment, for exactly **one** ref. Annotate that note. `sahyog-shared-dark-copy.test.ts` fences only
  `index_line.*` and `message_block.*`, so it does ⛔ not fire; ⛔ do not append to it (its header:
  *"A third needs its own ruling"*).

**D2 — WIRE SHAPE: `ConfirmedContributorRow = z.object({ name: z.string().min(1).nullable() }).strict()`.**
This mirrors `PublicSahyogVivranContributor` (`sahyog-vivran.ts:572-577`): one row kind, a nullable
name, ⛔ no cause field, ⛔ no row key, and ⛔ no copy on the wire (the word resolves at render).
- **Ground:** on the **wire**, `-169` cl.8 (*"exactly ONE kind"*) holds, because a nullable field is not
  a second kind. `-222` cl.3 and `-177` cl.3 (no row key) hold. The field is named `name`, ⛔ not
  `fullName`: `contributions.test.ts:206` rejects a decoy field called `fullName`, and `name` is the
  public contract's spelling.
- ⚠ **In the presenter, `-169` cl.8 does ⛔ not survive.** Its full text is *"the contributor row has
  exactly ONE kind, **everywhere — wire, presenter, render layer, tests**."* AC3 adds an `unnamed` input
  kind and a `placeholder` output kind. `-222` cl.3 superseded only D5's placeholder prohibition
  (`-169` cl.1), not cl.8. ⇒ `-224` records **`-169` cl.8 SUPERSEDED in part (presenter and render
  layer)** by this story, both author-committed. Likewise **`-168` cl.5** (*"AN UNRESOLVABLE NAME
  THROWS, AND ⛔ NO KEY IS MINTED"*): the throw ends. "No key minted" still holds (D1 mints none).
- **Client render key:** AC5's `keyExtractor` uses the list index. `-222` cl.3 keeps D5's *"⛔ NO ROW
  KEY — ⛔ not an index"* for the **wire**. `-224` records that a **client-side FlashList render key**
  is ⛔ not a row key in that sense: it never leaves the device, and the shipped key already embeds the
  index. The Story 8.3 `keyExtractor` deferral stays open (`-177` cl.3).

**D3 — NAME FORM: `resolveMemberFacingDeceasedName(mode, publicNameTokens(storedName).join(' '))`, then
`normalisePublicName`.** The mode is read once per request
(`resolvePoolNamePresentationModeForRequest(tx, pariwarId)`, `member-pool/pool-identity.ts:63-68`; it
wraps the same `kyc.resolvePublicNamePresentationMode` the public route calls at
`public-pages/handlers.ts:843`, with the same fallback to `full_name`). A **mononym** under
`shielded_name` renders the **mononym**, ⛔ not the placeholder.
- **Ground:** `-189` cl.3 (*"MORE … ⛔ never less"*). With the cleaned tokens, both sides share the
  token rule, the form rule and the mode: under `full_name` the member sees the full name, and under
  `shielded_name` sees `Firstname L.`, exactly as public does.
- **The mononym arm:** `-181` cl.1 is the model (a mononym is shown, not omitted, on member surfaces).
  ⚠ `-181` is author-committed and scoped to the **deceased pool identity** (Story 8.16 `INV-form`), and
  its reason was a functional regression for the member's own pool. ⇒ `-224` records this as an
  **extension of `-181` to contributors**, ⛔ not as `-181` itself.
- ⭐ For a mononym this keeps what a member **already sees today**: `splitFirstNameLastInitial("Ravi")`
  gives `lastInitial: ''`, and the row renders `Ravi`. Switching to the public resolver would **take a
  name away** from members in shielded Pariwars, a new withholding no ruling asked for.
- ⚠ **Residual, recorded rather than hidden (AC8):** a member comparing their list with the public
  page could match a public placeholder to a named mononym on their own list. That tells them the
  public row's cause was "mononym" and not one of the other four. The only person who learns this
  already sees that person's name, and **the same correlation exists today** (member `Ravi`, public
  placeholder). This is weighed against `-222` cl.2's *"NOTHING may disclose WHICH"*; see **Question for
  BigDev**.
- ⚠ **Reachability:** the mode column (`pariwar_public_name_presentation.mode`, `DEFAULT 'full_name'`,
  migration 0110) has ⛔ no production writer. `setPublicNamePresentationMode` is called only from tests,
  and ⛔ no admin toggle ships. ⇒ in production every Pariwar is `full_name`, and the shielded and
  mononym arms are **structural** (reachable once a writer ships). The tests still must cover them.
- ⛔ Do ⛔ not fork the resolver. A neutrally named **re-export** of the same function from
  `@twt/domain` (e.g. `resolveMemberFacingPersonName`) is allowed. A second implementation is ⛔ not.

**D4 — FAULT ≠ ERASURE.** Extract `INVISIBLE_CHARS`, `EDGE_INVISIBLE_OR_SPACE`, `BIDI_CONTROLS`,
`normalisePublicName`, `KmsOutageError` and `withKmsOutageClassification`
(`public-pages/handlers.ts:1265-1352`) into a shared module under `apps/api/src/modules/kyc/` (e.g.
`kyc/name-render.ts`). The public handler then imports them, **unchanged in behaviour**.
- `KmsOutageError`'s message is hard-coded to the public surface (`:1319`, *"sahyog-vivran: KMS
  unavailable while resolving contributor names"*). ⭐ Make it neutral (*"KMS unavailable while
  resolving contributor names"*) or take a surface label. No test asserts the text (grep: source only).
- On the member route, a classified **outage throws**. `mapWithConcurrency` rejects on the first throw
  (`bounded-decrypt.ts:68-74`), so it reaches the existing `poolContributors` catch, which fail-softs to
  `CONTRIBUTOR_LIST_UNASSIGNED`. The list self-suppresses and never shows N false placeholders.
- ⭐ **The profile read moves OUTSIDE the per-row `try`**, as on the public route. Any failure of it
  throws and reaches the same fail-soft. This retires today's "non-`25P02` profile-read error ⇒ `null`"
  arm.
- A **per-envelope** failure (INVALID_ARGUMENT: corrupt or AAD mismatch) is `{ name: null }`.
- `isAbortedTransaction` needs no special case once the read is uncaught: it propagates like any error.

**D5 — ACCESSIBILITY COPY: no new copy.** The placeholder row's label is
`t('contributor_list.row_a11y', { name: <placeholder> })` (`contribution.json`: en
`"{name}, confirmed contributor"`, hi `"{name}, पुष्ट अंशदाता"`), which gives *"A contributor, confirmed
contributor"* / *"एक सहकर्मी, पुष्ट अंशदाता"*. It is redundant but true and cause-blind. A
bespoke a11y string would be new copy on a governance-heavy surface, which is a product call and ⛔ not
this story's.

**D6 — CACHE: new query key + `gcTime: 0` (never persisted) + remove the old key.**
- `usePoolContributorsQuery` moves to a new key, e.g. `['member', 'pool-contributors', 'v2']`, so an
  old-shape payload is never hydrated into the new component.
- The query sets `gcTime: 0`, which `Provider.tsx`'s `shouldDehydrateQuery`
  (`status === 'success' && gcTime !== 0`) treats as **never persist**. This is the same single control
  the drive-detail hook uses (`useMemberDriveDetailQuery.ts:39`: *"the two are ONE control in two
  files"*).
- ⭐ **At startup, remove the orphan:** `queryClient.removeQueries({ queryKey: ['member',
  'pool-contributors'], exact: true })`, run once after the persisted cache has been restored (e.g. in
  `PersistQueryClientProvider`'s `onSuccess`). Without it the old entry, holding shielded names of
  colleagues who may since have been erased, stays in MMKV indefinitely (Trap 6). ⛔ Do ⛔ not add a
  persister `buster`: it would drop every member's whole cache for one surface.
- **Ground:** the payload now carries colleagues' **full legal names**. `-172` recorded that an erased
  member's name can render offline from MMKV for up to 7 days (`deferred-work.md`,
  `CR-11b.2a-COMBINED-W3`). After this story that name would be a full name, a **higher-severity**
  residual. `-172` cl.3 and that item named the remedies (*"a per-query `gcTime`; a `queryClient.clear()`
  on `signOut`"*) and said *"⛔ NO CODE CHANGE LANDS ON THIS"* at the time. D6 is the per-query remedy,
  applied to **this surface only**; `-224` records that it acts on that item.
- ⚠ **Cost, stated:** the list no longer shows instantly from cache on a cold start or offline. And
  because `ViewContributorsEntry` (home tab, `app/(tabs)/index.tsx:55`) returns `null` until `data`
  exists (`ViewContributorsEntry.tsx:26-31`), the **home-screen "View contributors" entry is absent on a
  cold start or offline until the first fetch succeeds**. The home tab keeps an observer mounted, so
  `gcTime: 0` does ⛔ not cause a refetch on every navigation.
- This is ⛔ not the repo-wide fix (member-scoped keys + purge on sign-out); that deferred item stays
  open.

**D7 — TIMING: every withheld cause costs the same, except "no profile".** Delete the
`getCurrentMemberStates` call and the `representable` pre-filter. Every confirmed row with a profile and
a ciphertext goes through the **same** single decrypt. The erased row decrypts to `ANONYMIZED_SENTINEL`
and becomes `{ name: null }`.
- **Ground:** `-222` cl.2 (Trustee-ratified, *"⛔ NOTHING may disclose WHICH"*, covering timing per
  11b-3b AC12(iii)) and `-170` (the state read *"is an **OPTIMIZATION**, ⛔ never the guarantee"*; the
  guarantee is the decrypted-plaintext sentinel check). The public route already works this way.
- ⚠ **Supersession:** `-169` cl.4 (author-committed) made the batched state read *"MORE central under
  D5"*, because D5 omitted erased rows. D5's omission is superseded by `-222`, and the read now has no
  consumer on this path. ⇒ `-224` records **`-169` cl.4 SUPERSEDED on the member contributor path** by
  this story. Its clock-domain constraint (mirror `getCurrentMemberState`, ⛔ never `getMemberStateAt`)
  is moot here, and stays binding for any other caller of `getCurrentMemberStates`.
- ⚠ **Cost, stated:** one extra KMS call per erased contributor, the same cost the public route already
  pays.
- ⚠ **Residual, inherited and ⛔ not closed:** a contributor with ⛔ no KYC profile row (or a null
  ciphertext) still costs **zero** KMS calls. That is the 11b-3b sixth-pass `deferred-work.md` item
  (*"Reachability is UNPROVEN"*), now covering the member route too.

**OUT OF SCOPE, stated so it is not "fixed" by accident:**
- `member-pool/contribution-note.ts:232`: the member's **own** name on their Contribution Note PDF. It
  is a self-view, outside the drive data class (`-195` cl.1), and its form is ⛔ not raised here.
- `11b-22`: the `value.contributions_count` copy (`[driveToken].astro` ~`:161`/`:201`, adjacent to Task
  7's `:163-168` annotation; rebase carefully if it lands first).
- The Nominee Console's pool relationship (`deferred-work.md`, *"`<PoolContributorList>` composes the
  wrong pool relationship"*). ⛔ Not fixed here; AC5 states it.

---

## Acceptance Criteria

### AC0 — Governance before code
**Given** the seven decisions above, **when** the story starts, **then** Task 1's commit lands
**first**, containing:
- the `2026-09-19-224` author-commit entry in `.decision-log.md`, recording D1–D7, the supersessions
  (`-168` cl.5; `-169` cl.4 on this path; `-169` cl.8 in part), the Consequence 3 non-fulfilment (D1),
  the render-key distinction (D2), the `-181` extension (D3) and the `-172` remedy (D6);
- annotations (only) on `-222`, `-221`, `-168`, `-169` and `-172` pointing at `-224`;
- the `sprint-status.yaml` `11b-21` row-comment annotation (D1) and the row moved to `in-progress`;
- the `epics.md` section for 11b.21;
- the FR-24 annotations (`epics.md` and the PRD) and the Story 8.3 AC annotations.

⛔ No `packages/` or `apps/` change is in that commit.

### AC1 — Axis A: the member sees the mode-resolved name, never a shorter form than public
**Given** a confirmed contributor whose stored name is `Rajesh Kumar Sharma`,
**when** the Pariwar's mode is `full_name` (the default), **then** the member wire carries
`{ name: "Rajesh Kumar Sharma" }` and the row renders exactly that.
**And when** the stored mode is flipped to `shielded_name` (`setMode`, as in
`member-name-form-parity.spec.ts`), **then** the same request returns `{ name: "Rajesh S." }`, the
**same string** the public route emits for that name and mode.
**And** under `shielded_name`, `"Rajesh ​Sharma"` (zero-width space) returns `"Rajesh S."` (the
public string), and `"Sunita ."` returns the same as public (D3's token cleaning; Trap 4).
**And** a mononym `Ravi` under `shielded_name` returns `{ name: "Ravi" }` (D3).
**And** an invisible-only or bidi-only stored name becomes `{ name: null }` (the shared normaliser, D4).
**And** `splitFirstNameLastInitial` is no longer called by `resolveContributorList`, and its import in
`member-pool/handlers.ts` is removed.

### AC2 — Axis B: every confirmed row is KEPT, in producer order, and cause-blind
**Given** a pool with confirmed contributors C1…C5 in producer order (earliest live confirmation's
`event_version`, `member_id` final tie-break), where C2 is RTBF-erased, C3 has no KYC profile row, and
C4's envelope is corrupt,
**when** a member reads the list, **then** `confirmed` has **exactly five** rows in the order
`[C1-name, null, null, null, C5-name]`.
**And** the three `null` rows are **byte-identical** on the wire. ⛔ No field, key or ordering
difference distinguishes erasure, sentinel, missing profile, failed decrypt, or empty-after-normalise.
**And** the erased row (C2) and the corrupt row (C4) each cost **exactly one** `decryptDek` call (D7).
**And** the decrypted `ANONYMIZED_SENTINEL` yields `null` (compare against the imported constant, ⛔ never
a re-typed literal).
**And** `getCurrentMemberStates` is no longer called on this path.
**And** `pending` is **unchanged byte-for-byte**, still computed from `confirmed.length` (`-169` cl.6:
the two axes never subtract).
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
real-`t()` leg (`contributor-list-render.test.ts:1221-1235`, the loop over
`CONTRIBUTION_LIST_I18N_REFS`) resolves the new ref in **both locales**
([[feedback_stub_must_call_not_transcribe]]).
**And** `forbidden-imports.test.ts` still bans `@twt/domain` and every name resolver from `packages/ui`,
and `death-term.test.ts` still passes (Trap 8). Name resolution stays on the server.
**And** the `nameParts` output arm is **gone**. The view-model doc's *"⛔ Do ⛔ NOT widen this type to
carry a full name"* is **annotated as superseded by 11b-21**, ⛔ not deleted (Task 7).

### AC4 — ONE key, enforced by a test that can fail
**Given** D1, **then** a test asserts that across **every** namespace file in `packages/i18n/locales/{en,hi}`:
- **exactly one** key has the value `A contributor` (en);
- **exactly one** key has the value `एक सहकर्मी` (hi);
- both are `sahyog-vivran` → `value.contributor_unnamed`.

⚠ The existing single-placeholder check (`apps/public/tests/sahyog-vivran-copy.test.ts:306-316`) reads
**only** `en/sahyog-vivran.json`, so a second key in `contribution.json` would pass it. Model the
directory scan on `apps/public/tests/sahyog-stage-vocabulary.test.ts` (`readdirSync(join(LOCALES_DIR,
locale))`). ⭐ **Prove the new test has teeth:** plant a duplicate in `contribution.json`, see it fail,
then remove the plant. The banned words (`sahyog-vivran-copy.test.ts:89-98`: `/anonym/i`,
`not recorded`, `withheld`, `removed`, `erased`, `unavailable`, `गुमनाम`, `दर्ज नहीं`) stay banned.

### AC5 — Mobile renders the name or the placeholder, and nothing is dropped
**Given** `apps/mobile/components/contributor-list/`, **then**:
- the adapter maps `{ name: string }` → `{ kind: 'name', name }` and `{ name: null }` → `{ kind: 'unnamed' }`;
- the component renders `name` as-is (⛔ no join) or `t(ref.key, undefined, { namespace: ref.namespace })`
  for the placeholder;
- the placeholder is **visually the same row** as a named one (plain text; an italic/secondary style
  mirroring the public placeholder's `text-gray-600 italic` is allowed). ⛔ No icon, badge or colour that
  could read as a *cause*;
- the row's `accessibilityLabel` is the D5 string;
- `keyExtractor` no longer embeds name parts: use `(item, index) => \`${item.name ?? ''}-${index}\``. It
  is a client render key, ⛔ never a wire key (D2).

⚠ The Story 8.3 `keyExtractor` deferral stays **open**, with its re-pointed trigger (`-177` cl.3).
**And** the per-row `try/catch` stays, but for a valid payload it can **no longer drop a row**. A test
feeds `[name, null, name]` and asserts **three** rendered rows.
**And** the empty/loading/error branches stay **outside** the list (the Fabric empty→populated crash
rule; the `contributor-list-render.test.ts:688` pin stays).
**And** the memo still depends on `locale`, ⛔ not `t` (the `useT()` fresh-closure rule).
**And** the Nominee Console mounts the same `<PoolContributorList/>` (`NomineeConsole.tsx:213`) and
renders the same way. The Completion Notes state what it actually shows: that route resolves the
**session member's own assigned pool as a payer** (`resolveMemberLivePool`), ⛔ not the death-linked
drive the console is about (the open `deferred-work.md` item). So a nominee acting as the deceased sees
**full names** of contributors to whatever other drive the deceased was rostered on as a payer, or the
no-pool copy.

### AC6 — Deployment order and cache are STATED, ⛔ not discovered in production
**Given** Trap 6, **then** the Completion Notes state:
- **(a)** that the new API response makes every **older** build's contributor query fail its strict
  parse; that a **cold** old build self-suppresses the list (contributor screen, Nominee Console panel,
  `ViewContributorsEntry`), and a **warm** one keeps showing the stale list for the session;
- **(b)** the release order chosen, on this evidence (checked at v0.2): `expo-updates` is ⛔ not a
  dependency, updates are disabled natively (`AndroidManifest.xml` `expo.modules.updates.ENABLED=false`,
  `Expo.plist` `EXUpdatesEnabled=false`), `app.json` is `"version": "0.1.0"` with no `runtimeVersion`,
  and ⛔ no deploy workflow ships mobile. ⇒ there is ⛔ no OTA path and ⛔ no evidence of store installs.
  Either ship together and **record** the window, or follow 8-17 AC8's precedent (a mobile build that
  tolerates both shapes first, API second). Re-check the evidence before choosing; ⛔ do not assume it;
- **(c)** that D6's new query key, `gcTime: 0` and the startup removal of the old key are in place, with
  tests asserting all three;
- **(d)** that `-172`'s offline 7-day residual (`CR-11b.2a-COMBINED-W3`) is **closed on this surface**
  (new entries never persist, and the old entry is removed), and stays open repo-wide.

### AC7 — Faults are not erasure (D4, D7)
**Given** the shared extraction, **then** the public-pages suite passes **unchanged** (same tests, same
behaviour; only the `KmsOutageError` message text may change, D4).
**And** on the member route a KMS **outage** during any row's decrypt yields `{ assigned: false }`,
⛔ never a list of placeholders. A test covers an outage on one row of many (model:
`public-pages/sahyog-vivran.spec.ts` ~`:1114`, `vi.spyOn(t.deps.encryption.kms,
'decryptDek').mockRejectedValueOnce(Object.assign(new Error('14 UNAVAILABLE: kms'), { code: 14 }))`).
**And** a **profile-read** failure (including a status-less error) yields `{ assigned: false }`, ⛔ never
a `null` row (model: ~`:1139`).
**And** a per-envelope rejection yields that row's `{ name: null }` and costs **exactly one**
`decryptDek` call, the same as an erased row (model: ~`:1158`).
**And** the **timing residual** from `deferred-work.md` (11b-3b sixth pass) is recorded as **now also
covering the member route**, for the missing-profile case only. ⛔ Do not claim it is closed.

### AC8 — The `-195` cl.1 compliance statement is WRITTEN (`-222` Consequence 2)
**Given** 11b-3b's AC10 precedent, **then** the Completion Notes carry this statement for the
**contributor-name data class**:
**✅ COMPLIANT after this story.**
- **Public:** mode-resolved, via `resolvePublicMemberName` (the full name is the ceiling: `-175` cl.3
  permits it, and `-136` cl.1 requires the form to be a Pariwar-level configurable policy). **Member:** mode-resolved, via `resolveMemberFacingDeceasedName` over the **same cleaned
  tokens** (`publicNameTokens`). Same token rule, same form rule, same stored mode.
- ⇒ For every stored name and mode, the member form is **equal to or longer than** the public form.
  The only divergence is a mononym under `shielded_name`, where the member sees the name and the public
  sees the placeholder.
- ⚠ In production every Pariwar is `full_name` (no writer for the mode), so the shielded and mononym
  arms are tested but not yet reachable.
- **Both surfaces** render `A contributor` / `एक सहकर्मी` for a withheld name, from one key.
- The member wire still has ⛔ no `total`. It needs none, because every confirmed row is now a row.

**And** it lists the **residuals** honestly:
- the D3 cross-surface mononym correlation (pre-existing; kept, not created);
- the AC7 missing-profile timing residual;
- the kill-switched-Pariwar case from the routing note §3 (the member surface is the only disclosure
  point there). `-222` ruled option (B) **without addressing it**; it is carried as a residual, ⛔ not
  claimed as ruled.

**And** the `deferred-work.md` top section (*"Carried from `-221`"*) is **re-marked, ⛔ not deleted**.
Axis A gets `✅ DISCHARGED by 11b-21` and Axis B gets `✅ BUILT by 11b-21`
([[feedback_closure_language_precision]]). Also re-marked: the fourth-pass *"`-222` key strategy"* item
(**✅ CLOSED by `-224` D1**), the sixth-pass timing item (now covers the member route, missing-profile
only), and `CR-11b.2a-COMBINED-W3` (**closed on the member contributor surface by `-224` D6; open
repo-wide**).

### AC9 — The friction budget is DISPOSED, ⛔ not skipped
`MEMBER_FACING_PREFIXES` is `['apps/mobile/','apps/public/']` (`scripts/friction-budget/lib.ts:453`), so
AC-4's attribution-on-change **fires**. ⇒ `friction-budget.md` gains a **Story 11b.21 disposition** in
the same PR.
- ⚠ Expected shape: *declaration affirmed, ⛔ no new row*.
- ⚠ **One candidate friction to weigh honestly:** D6's no-offline, no-instant-from-cache list, **and
  the home-screen "View contributors" entry that is absent until the first fetch**. Say whether it is
  friction to the member and why.
- 11b.20 missed this and needed a fix-up commit (`a44aef23`). The leg diffs **committed** history
  (`${baseRef}...HEAD`), so it passes vacuously until you commit. ⭐ Run `pnpm friction:check` after
  committing.

### AC10 — Tests invert, and none of the old guarantees is lost silently
The following tests are **rewritten, ⛔ not deleted**. Each rewritten `it(...)` keeps a one-line
comment naming what it used to assert and the ruling that inverted it:
- `apps/api/tests/unit/pool-contributors.test.ts` (`:65`, unresolvable ⇒ omitted **→ placeholder**);
- `apps/api/tests/integration/contributions/pool-contributors-rtbf.spec.ts`:
  - erased ⇒ absent **→ `null` in position**;
  - `toHaveLength(2)` **→ 3**, at all three sites (`:365`, `:385`, `:411`);
  - the drop-to-zero case (`:421-446`, `confirmed` equals `[]` at `:435`) **→ one `null` row**;
  - the TOCTOU sentinel leg (`:492-548`, "row is OMITTED" at `:541-543`) **→ a `null` row in
    position**;
  - fixture expectations derived with `splitFirstNameLastInitial` (`:137-141`) → the D3 form;
  - the stale "⛔ NO `ORDER BY`" comment (`:377-383`) → annotate (the read is ordered since 11b.3);
  - **keep:** `pending` byte-identical, the sentinel never on the wire, no `anonymousMember`, no
    `omittedCount` / `rowKey` / `"kind"` (`:442-444`), no cause on the wire, the top-level keys pin
    (`:445`);
- `packages/contracts/tests/contributions.test.ts` (fixtures → `{ name }`; keep **every** row decoy at
  `:206` — `nameCiphertext`, `fullName`, `phone`, `bankAccount`, `memberId` — the six status decoys at
  `:197` and the pending decoys at `:228`; add `firstName` / `lastInitial` as **rejected** row decoys);
- `packages/ui/tests/contribution-list/presenter.test.ts` (kinds; the `nameParts` pins at `:52-56`,
  `:105-107`; the ref count and `startsWith` pin at `:202-204` per Trap 8; `:43` stays; the
  `ANTI-WIDENING` block `:110+`);
- `apps/mobile/tests/unit/contributor-list-render.test.ts`: the adapter (`:507-586`), `nameParts`
  (`:598-606`), the `unknown`-throws pin (`:608`), the WIRE_READ rule `/\bitem\.(firstName|lastInitial)\b/`
  (`:622-660`, rewrite to the new field and keep its non-vacuity floor), FENCE 4 over the catch block
  (`:455-473`), "writes NO render arm for the unknown kind" (`:487`), the keyExtractor byte-pin
  (`:698-699`), the ref count (`:1204-1205`) and the a11y ref;
- `packages/i18n/tests/contributor-list-empty.test.ts` (its D5 header, `:3-5`, by annotation).

⚠ The DB-gated specs (`skipIf(!hasDatabase)`) **skip silently** in `turbo test`. Run them against the
live test DB and state that you did ([[project_live_db_test_gotchas]]).

---

## Tasks / Subtasks

- [x] **Task 0 — Re-verify the baseline** (all ACs)
  - [x] `git fetch origin`. `git diff a44aef23..origin/main --stat -- packages apps scripts`. If
        anything under `member-pool/`, `contribution-list/`, `public-pages/handlers.ts`,
        `pool-contributor-list.ts`, `contributor-list/`, `kyc/public-name.ts` or
        `notifications/pool-identity.ts` moved, re-derive every cite below first.
  - [x] Re-run the routing note §7 commands. Confirm the five `return null` arms (`:1208`, `:1215`,
        `:1225`, `:1238`, `:1243`) and the RTBF pre-filter (`:1159`) in `resolveContributorList`
        (`:1091-1280`).
  - [x] Confirm `.decision-log.md` HEAD is still `-223`. If not, take the next free id and update every
        `-224` reference in this file.
- [x] **Task 1 — GOVERNANCE COMMIT, before any code** (AC0)
  - [x] Write `### Decision 2026-09-19-224` (**Author-committed, BigDev**; follow the `-181` entry's
        shape) recording D1–D7 and the out-of-scope fence, each with its ground as given above. Include
        the §0-gate line: *"each is the author's: none changes what the Trust discloses beyond `-189`
        cl.3 and `-222`; D3's mononym arm keeps an existing display and is flagged for BigDev."*
  - [x] In the same entry, record: `-168` cl.5 superseded (the throw); `-169` cl.8 superseded in part
        (presenter and render layer); `-169` cl.4 superseded on the member contributor path (D7);
        `-222` Consequence 3's "new key" deliberately not met (D1); the client render-key distinction
        (D2); D3 as an extension of `-181`; D6 as the per-query remedy for `CR-11b.2a-COMBINED-W3`.
  - [x] Annotate `-222`, `-221`, `-168`, `-169` and `-172` with a pointer to `-224`, as annotations only
        (⛔ no edit of their clauses).
  - [x] `epics.md`: add `### Story 11b.21: …` after the 11b.20 section and before `## Epic 12`, using
        the **SECTIONED** header block (`SECTIONED 2026-09-19 (Story 11b.21 Task 1, before the first line
        of code)`), the 11b.19/11b.20 precedent, commissioning authority `-222` Consequence 1 + `-221`
        cl.4.
  - [x] Annotate **FR-24** at `epics.md:68` (*"First-name + last-initial only"*) and the PRD's §FR-24
        (`prds/prd-TWT-2026-05-22/prd.md:550`, *"(first-name + last-initial). No PII."*) as
        **superseded for the member list by `-189` cl.3 / `-222`, built at 11b-21**. Do the same for the
        Story 8.3 ACs at `epics.md:3169` / `:3179`. Annotate only; ⛔ do not amend the FR text.
  - [x] Sprint row `11b-21-…` → `in-progress`; annotate its row comment and the 2026-09-18d ledger
        entry's *"A new key, in the RULED word"* with a pointer to `-224` D1; prepend a ledger entry
        (SAFE prepend: read first, guard on size, then write; [[project_sprint_status_safe_prepend]]).
  - [x] Commit as `governance(11b.21): -224 — seven engineering calls; section the story; row → in-progress`.
- [x] **Task 2 — Shared name-render module** (D4, AC7)
  - [x] Move `INVISIBLE_CHARS`, `EDGE_INVISIBLE_OR_SPACE`, `BIDI_CONTROLS`, `normalisePublicName`,
        `KmsOutageError` and `withKmsOutageClassification` into `apps/api/src/modules/kyc/name-render.ts`
        (or similar), moving their doc-blocks with them. `public-pages/handlers.ts` imports them.
        Neutralise the `KmsOutageError` message (D4).
  - [x] Run the public-pages unit + integration suites **unchanged**. They must pass.
  - [x] ⚠ After moving any doc-block, grep `\*\*/` to make sure no markdown emphasis closed a JSDoc
        ([[project_markdown_emphasis_closes_jsdoc]]).
- [x] **Task 3 — Contract** (D2, AC2, AC10)
  - [x] `ConfirmedContributorRow` → `{ name: z.string().min(1).nullable() }.strict()`. Annotate the
        header docs (*"never full names"*, *"firstName + lastInitial"*) as superseded.
  - [x] Update `contributions.test.ts`: fixtures, every existing decoy kept, and the old field names
        added as rejected decoys.
  - [x] Check `packages/api-client` still type-checks. The route is ⛔ not in `openapi/v1.yaml`, so no
        regen is needed. The Fastify route's response schema (`routes.ts:63`) follows the contract.
- [x] **Task 4 — API handler** (D3, D4, D7, AC1, AC2, AC7, AC10)
  - [x] Read the mode once via `resolvePoolNamePresentationModeForRequest(tx, pariwarId)`. This is the
        house pattern: `handlers.ts:486` (`resolveDriveList`), `:754` (`resolveDriveDetail`).
  - [x] Delete the `getCurrentMemberStates` call and the `representable` filter (D7). Map over
        `confirmed` directly.
  - [x] Wrap `deps.encryption` with `withKmsOutageClassification`. Per row:
        - profile read **outside** any `try`: any failure throws (D4);
        - no profile or null ciphertext ⇒ `null`;
        - decrypt inside the `try`: `KmsOutageError` ⇒ **re-throw**; other decrypt fault ⇒ `null`;
        - sentinel (imported `ANONYMIZED_SENTINEL`) ⇒ `null`;
        - otherwise `normalisePublicName(notifications.resolveMemberFacingDeceasedName(mode,
          kyc.publicNameTokens(fullName).join(' ')))`, where `''` ⇒ `null`.
  - [x] Remove the `row !== null` filter. `pending` keeps using `confirmed.length`.
  - [x] Remove the now-unused `splitFirstNameLastInitial` import (`:81`).
  - [x] Keep logs member-attributed and **name-free** ([[project_anonymous_diagnostic_log_convention]]).
        ⛔ Never log a cause-per-row that could reach a client.
  - [x] Update the `poolContributors` / `resolveContributorList` doc-blocks (step 7 *"→
        first+last-initial"*) by annotation.
  - [x] Tests: the unit rewrite; the `pool-contributors-rtbf.spec.ts` inversions (AC10); live-DB legs
        for AC1 (the mode flip, dirty names, the mononym), AC2 (the five-row order, byte-identical
        nulls, one `decryptDek` each for erased and corrupt, no state read) and AC7 (outage and
        profile-read failure ⇒ `{ assigned: false }`). Seed fixtures on the
        `public-pages/sahyog-vivran.spec.ts` model (`{ name, anonymized?, corrupt? }`, corrupt =
        encrypted under a `randomUUID()` pariwar, ~`:164-167`; no-profile ~`:1236`; shielded mononym
        ~`:1307`); the member spec's `seedPoolWithConfirmedContributors` takes names only today.
- [x] **Task 5 — `packages/ui` presenter** (D1, D5, AC3, AC4, AC10)
  - [x] Change the input/output kinds per AC3, widen the namespace literal, and add the placeholder ref
        to `i18n-keys.ts` with a doc citing `-222` cl.2 and D1. ⛔ No comment in this package may say
        "deceased" (Trap 8).
  - [x] Update the presenter, `ANTI-WIDENING` and no-list-iteration tests per AC10 and Trap 8. Add the
        AC4 cross-namespace one-key test (in `packages/i18n/tests/`) and prove its teeth.
- [x] **Task 6 — Mobile** (D6, AC5, AC6, AC10)
  - [x] Change the adapter, the component render and the a11y label, then the keyExtractor.
  - [x] Change `usePoolContributorsQuery` to the new key and `gcTime: 0`, with a comment pointing at
        `Provider.tsx` (*"the two are ONE control in two files"*, as `useMemberDriveDetailQuery.ts`
        says).
  - [x] Add the one-time startup `removeQueries` of the old exact key after restore (D6), with a test.
  - [x] Update `contributor-list-render.test.ts` pins per AC10. Add the three-rows test, the real-`t()`
        placeholder leg in both locales, and the query-options test (key + `gcTime: 0`).
  - [x] Add `PoolContributorList.tsx` to `pool-name-form.test.ts`'s `CONSUMERS` and run it (Trap 8).
- [x] **Task 7 — Annotate the stale prose** (Trap 7; AC3's view-model annotation). Use the form
      `⚠ SUPERSEDED 2026-09-?? by Story 11b.21 / -222: …`
  - [x] `packages/contracts/src/public-pages/sahyog-vivran.ts` (`:538-548`, `:569`) and
        `apps/public/src/lib/sahyog-vivran-render.ts` (`:142-151`): *"until 11b-21"*.
  - [x] `apps/public/src/pages/sahyog-vivran/[driveToken].astro` (`:163-168`).
  - [x] `public-pages/handlers.ts` (`:1054-1055`).
  - [x] en `sahyog-vivran.json` `$comment.contributor_unnamed` (the only one naming `11b-21`): record D1
        (*"the member surface reads THIS key"*). Add the same pointer to the hi `$comment`. ⛔ Do not touch
        the value strings.
  - [x] `public-vs-private-matrix.yaml` (`contributor_name`, `:1316-1323`): *"discharged by
        `11b-21`"* → discharged.
  - [x] `member-pool/handlers.ts` drive-list/detail notes (*"pool-contributors OMITS the row"*,
        `:614-615`, `:1012-1015`) and `member-drive-detail.spec.ts:714-715`.
  - [x] The `PoolContributorList.tsx` header, and `contributor-list-empty.test.ts`'s D5 header.
  - [x] `packages/ui`: `view-model.ts:45,64-65,79`; `presenter.ts:23-27` (*"wire row is `{ firstName,
        lastInitial }`"*) and `:48-58` (*"No producer can emit `unknown`"*); the `i18n-keys.ts` header
        `:5-18` (*"All ten"*, *"NO NAMESPACE IS CREATED"*, *"row omitted entirely"*); `index.ts`'s
        *"NAME PARTS ONLY … form UNRULED"* header.
  - [x] Files that locate the moved helpers in `public-pages/handlers.ts`:
        `apps/public/src/lib/sahyog-vivran-message-block.ts:72,76` and
        `packages/domain/src/encryption/README.md:97`.
  - [x] `apps/api/src/modules/kyc/bounded-decrypt.ts:56` and `tests/unit/bounded-decrypt.test.ts:123`
        (comments naming `ConfirmedContributorRow`).
  - [x] ⭐ Finish with `grep -rn "11b-21\|lastInitial\|last-initial\|OMITTED ENTIRELY\|public-pages/handlers" packages apps`.
        Every remaining hit is either a true statement or annotated.
- [ ] **Task 8 — Records** (AC5, AC6, AC8, AC9)
  - [x] Completion Notes: the AC5 nominee line, the AC6 (a)–(d) statement, and the AC8 compliance
        statement with residuals.
  - [x] `deferred-work.md`: the four re-marks in AC8.
  - [x] `friction-budget.md`: add the 11b.21 disposition (AC9).
  - [ ] Sprint row → `review`, with a ledger prepend.
- [ ] **Task 9 — Verify** (AC4, AC9, AC10)
  - [ ] Run `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm i18n:check`, the live-DB specs for
        member-pool, public-pages and contributions, `astro check` (`apps/public`) and
        `pnpm friction:check` (after commit).
  - [ ] Then `pnpm ci:local`, which runs on push. Report the job count.

---

## Dev Notes

### The code path, at `a44aef23`

| Layer | File | Today | After |
|---|---|---|---|
| Route | `apps/api/src/modules/member-pool/routes.ts:61-63` | `GET /api/v1/member/pool-contributors`; response schema at `:63` | unchanged (schema follows the contract) |
| Handler | `member-pool/handlers.ts:161-185` `poolContributors` (inside `createMemberPoolHandlers`' `return {`, `:109`) | fail-soft `{ assigned:false }` (`CONTRIBUTOR_LIST_UNASSIGNED`, `:1080`) on any throw | unchanged; now also catches a KMS outage and a profile-read fault (D4) |
| Pipeline | `handlers.ts:1091-1280` `resolveContributorList` | `:1135` batched state read; `:1159` RTBF **filter**; `:1182-1248` per-row map (profile read caught at `:1196-1209`; `splitFirstNameLastInitial` at `:1240`); `:1250-1251` null **filter** | ⛔ no state read, ⛔ no filters; mode-resolved, token-cleaned name |
| Producer | `packages/domain/src/contribution/read.ts` (~`:158-227`) | ordered by earliest live confirmation `event_version`, `member_id` final tie-break | unchanged. `mapWithConcurrency` writes each result at its input index, so order survives |
| Contract | `packages/contracts/src/contributions/pool-contributor-list.ts:42-51` | `{ firstName, lastInitial }` `.strict()` | `{ name: string\|null }` `.strict()` |
| SDK | `packages/api-client/src/index.ts:564-571` | throwing zod `parse` | unchanged (Trap 6) |
| Presenter | `packages/ui/src/contribution-list/{view-model,presenter,i18n-keys,index}.ts` | two input kinds, `unknown` throws (`presenter.ts:76-80`), `nameParts` output (`view-model.ts:80-81`), 10 refs | AC3 |
| Mobile | `apps/mobile/components/contributor-list/{contribution-row-input.ts,PoolContributorList.tsx,usePoolContributorsQuery.ts}` | joins parts (`:115-117`); name-bearing key (`:275-277`); key `['member','pool-contributors']`, persisted | AC5/AC6 |
| Mount points | `app/(contribution)/contributors.tsx:13`, `components/nominee-console/NomineeConsole.tsx:213`, `ViewContributorsEntry.tsx:26` (home tab) | — | all inherit the change |

### Public precedent to mirror (Story 11b-3b)
`apps/api/src/modules/public-pages/handlers.ts:843` (mode read once), `:849` (outage wrapper), and
`:1038-1177` (per-row map, **no filter**, `{ name: null }` on every withheld cause, `KmsOutageError`
re-thrown, the profile read **outside** the `try` at ~`:1066-1071`, the name at `:1127`:
`normalisePublicName(kyc.resolvePublicMemberName(mode, storedName))`). The contract is
`PublicSahyogVivranContributor` (`sahyog-vivran.ts:572-577`). The render is `[driveToken].astro:736-740`:
the placeholder is a plain `<span class="text-gray-600 italic">` (`:737`), and a named contributor goes
through `<MatrixField surface="sahyog-vivran" field="contributor_name">` (`:739`).
⭐ After D7, the member route has **no** batched member-state read, like the public route. RTBF is caught
by the sentinel on both.

### Name resolvers — which one, and why
- `kyc.resolvePublicMemberName` (`packages/domain/src/kyc/public-name.ts:73-107`): the **public**
  resolver. It cleans tokens (`publicNameTokens`, `:138-144`), then under `shielded_name` maps a mononym
  to `''` ⇒ omit. ⛔ **Not for this surface** (Trap 4).
- `notifications.resolveMemberFacingDeceasedName(mode, storedName): string`
  (`packages/domain/src/notifications/pool-identity.ts:141-162`, exported via `export * as
  notifications`; already imported in `member-pool/handlers.ts:44`): the **member** resolver. Its
  shielded arm produces `Firstname L.` and shows a mononym. Its `full_name` arm collapses whitespace.
  Empty or whitespace-only input returns `''`. ⚠ It does ⛔ no token cleaning, so feed it
  `publicNameTokens(storedName).join(' ')`. ⭐ Use this one.
- `splitFirstNameLastInitial` (`packages/domain/src/kyc/name.ts:47-53`, re-exported via
  `member-pool/name.ts`) takes the **last** token's first grapheme. It stays in use elsewhere (the
  Contribution Note, both resolvers' shielded arms).

### Rulings checked and found to leave this story unchanged
- `-223`: about the **deceased** name on 11b-20. Contributor RTBF is a real cause and `-223` cl.4 does
  ⛔ not reach it.
- `-180` / `8-16`: the **deceased** pool identity on member surfaces. This is the direct precedent, but
  it is a different data subject.
- `-174` / `-175`: a contributor's name **may** render at `public` in the **full-name** form (`-175`
  cl.3); `-175`'s "unconditional" withdrew `-174` cl.3's staged-reduction condition. The shipped public
  code **mode-resolves**, because `-136` cl.1 makes public name display *"a Pariwar-level, governed,
  configurable policy"* (the `epics.md` Story 8.3 annotation calls this *"A CEILING, ⛔ NOT A
  LITERAL"*; that phrase is the annotation's, ⛔ not the ruling's). So the full name is the ceiling,
  reached under the default `full_name`. Both stand unchanged.
- `-219` cl.4: the amended public sentence states that the unnamed rows are visible by design, that
  their count is therefore knowable, and that nothing may disclose **which**. The member wire gains ⛔ no
  count field; the count is knowable from the rows, as on public.
- `-172`: the RTBF guarantee ends at the wire. D6 **closes** the device residual on this surface only.

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
  `normalisePublicName`. ⇒ the member route must normalise too (AC1).
- **11b-20:** the friction-budget disposition was forgotten and cost a fix-up commit (AC9).
- **11b-3b fifth review pass:** the profile read was moved outside the `try` because a dropped
  connection carries no SQLSTATE. ⇒ D4 does the same here.
- **11b-3b:** its ACs went stale when `-219` landed, and five review passes followed. ⇒ when a ruling
  lands mid-story, annotate the AC in place.
- **11b-3b:** the throw-message kind-only fix in `presenter.ts` (a name leaking into a logged
  `error.message`) must survive the rewrite of that `switch`.
- **11b-17 review (`Provider.tsx`):** `gcTime: 0` alone does not keep a response out of MMKV; the
  `shouldDehydrateQuery` marker does. And a hydrated orphan inherits the 7-day default (D6).
- **Commit pattern:** `governance(11b.21): …` → `feat(11b.21): …` (code plus story, ledger and
  deferred-work records) → review → `fix(11b.21): …`. **Rebase-merge, ⛔ never squash** for governance
  stories ([[project_story_automator_ops]]).

### References
- `.decision-log.md`:
  - `#decision-2026-09-18-222` (cl.1–cl.4 Trustee-ratified, cl.5 author-committed; Consequences 1–4)
  - `#decision-2026-09-18-221` (cl.2, cl.4)
  - `#decision-2026-09-04-189` cl.3
  - `#decision-2026-09-04-195` cl.1
  - `#decision-2026-09-16-219` cl.2–cl.4
  - `#decision-2026-09-02-181` cl.1
  - `#decision-2026-09-02-177` cl.2 (superseded) and cl.3
  - `#decision-2026-08-31-170` (the state read is an optimization)
  - `#decision-2026-08-30-169` cl.1 (D5, placeholder half superseded), cl.4 (superseded here, D7),
    cl.6, cl.8 (superseded in part here, D2)
  - `#decision-2026-08-30-168` cl.5 (superseded here, D2)
  - `#decision-2026-09-01-172` cl.3
  - `-136` cl.1, `-174` cl.3, `-175` cl.3–cl.4
- `_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-09-18-member-surface-placeholder-clause-conflict.md`
  (§3 kill-switch residual, §4 the five member-side drop arms, §7 commands)
- `_bmad-output/implementation-artifacts/deferred-work.md`: the top section (`-221`); the 11b-3b fourth
  pass (key strategy) and sixth pass (timing residual); `CR-11b.2a-COMBINED-W3`; the
  `ANONYMOUS_MEMBER_I18N_KEY` item; the `<PoolContributorList>` wrong-pool-relationship item
- `_bmad-output/implementation-artifacts/11b-3b-sahyog-vivran-named-identity-render-layer.md`: AC10
  (compliance-statement shape) and AC12
- `_bmad-output/implementation-artifacts/8-17-nominee-vpa-on-the-payment-screen.md`: AC8
  (deployment-order statement)
- `_bmad-output/implementation-artifacts/8-16-member-pool-identity-name-form-alignment.md`: AC7
  (friction disposition) and Trap 4 (mononym)
- `apps/mobile/components/drive-detail/useMemberDriveDetailQuery.ts` and `apps/mobile/components/Provider.tsx`
  (`gcTime: 0` as the never-persist marker)
- Test models: `apps/api/tests/integration/public-pages/sahyog-vivran.spec.ts`,
  `apps/api/tests/integration/contributions/member-name-form-parity.spec.ts`,
  `apps/public/tests/sahyog-stage-vocabulary.test.ts`

### ❓ Question for BigDev (does ⛔ not block the story; D3 is written as the default)
**D3, the mononym under `shielded_name`.** The default keeps what members see today (`Ravi`), extending
`-181` to contributors under `-189` cl.3. The alternative is exact parity with public (a placeholder): it
removes a name members currently see, but it closes the cross-surface correlation residual against
`-222` cl.2. ⭐ If you read `-222` cl.2's *"NOTHING may disclose WHICH"* as covering cross-surface
comparison, the honest move is a routing note (what the Trust discloses, and to whom), ⛔ not a silent
switch; only D3's mononym arm would change.
⚠ Only Pariwars on `shielded_name` are affected, and today ⛔ none can be (no writer for the mode).

## Dev Agent Record

### Agent Model Used

Claude Opus 5 (1M context), via `bmad-dev-story`, 2026-09-19.

### Debug Log References

- Task 0: `git fetch origin`; `git diff a44aef23..origin/main -- packages apps scripts` EMPTY; all five `return null` arms and the `:1159` pre-filter confirmed in `resolveContributorList`; `.decision-log.md` HEAD was `-223` ⇒ `-224` used.
- Task 4: the first lint run failed on 4 × `no-irregular-whitespace`. My edit tooling had written the `​`-style escapes in two comments as LITERAL invisible characters. Fixed by rewriting every literal invisible in the authored files as an escape sequence (the string values are unchanged). Re-diffed: zero literal invisibles in added lines.
- Task 5, AC4 teeth: I planted `contributor_list.unnamed_plant: "A contributor"` in `en/contribution.json`, and the new one-key test FAILED naming `contribution → contributor_list.unnamed_plant`. I then removed the plant, the test passed, and `git status` showed the locales clean.
- D6 mechanics, verified in `@tanstack/react-query-persist-client`'s `PersistQueryClientProvider`: `onSuccess` runs after `persistQueryClientRestore` and BEFORE `persistQueryClientSubscribe`. ⇒ the removal happens in memory, and the next whole-client save writes MMKV without the retired entry.

### Completion Notes List

**Implementation, in order (governance first).** `71ef29ee` is the governance commit (`-224`, annotations, the epics section, row → in-progress). ⛔ It has no `packages/`/`apps/` change. The implementation is one `feat(11b.21)` commit.
- **D4:** `apps/api/src/modules/kyc/name-render.ts` now holds the character classes, `normalisePublicName`, `KmsOutageError` (message neutralised) and `withKmsOutageClassification`, all moved verbatim with their doc-blocks. The public route imports them. The public-pages suites pass unchanged (106/106 live-DB). A "one implementation" source pin covers both routes (`name-render.test.ts`).
- **D2:** `ConfirmedContributorRow = { name: string(min 1) | null }.strict()`. All existing decoys are kept; `firstName`, `lastInitial`, `reason`, `cause`, `kind`, `rowKey` and `unnamed` are now rejected decoys.
- **D3/D4/D7 (handler):** the mode is read once. The batched state read and the `representable` pre-filter are deleted. The profile read sits outside any `try`. Decrypt runs under the classifier, and a `KmsOutageError` re-throws to the existing fail-soft. The sentinel is compared against the imported constant. The name is `normalisePublicName(resolveMemberFacingDeceasedName(mode, publicNameTokens(stored).join(' ')))`. There is no row filter, and `pending` still comes from `confirmed.length`. The `splitFirstNameLastInitial` import is removed.
  ⚠ **Also removed:** `isAbortedTransaction`. Its one caller was the per-row profile-read catch, which D4 deletes, so it would otherwise fail lint as unused. Its doc-block rationale is quoted as SUPERSEDED at the new profile-read comment.
- **D1/D2 (presenter):** input `name | unnamed`; output `name | placeholder` (ref `sahyog-vivran` → `value.contributor_unnamed`); namespace union widened; ELEVEN refs; the `never` guard still throws with the kind only (tested with a forged operand carrying a name). `death-term.test.ts` and `forbidden-imports.test.ts` pass unchanged.
- **Mobile (AC5/D6):** the adapter maps `null` → `unnamed`. The component renders the name as-is, or `t()` of the placeholder ref (key AND namespace from the ref) in italic/secondary text, with ⛔ no icon, badge or colour. The a11y label is the D5 `row_a11y` string. The keyExtractor is `` `${item.name ?? ''}-${index}` ``. The hook uses `POOL_CONTRIBUTORS_QUERY_KEY` (`['member','pool-contributors','v2']`) and `gcTime: 0`. `Provider.tsx`'s `onSuccess` calls `removeRetiredPoolContributorsCache` (exact match on the old key). The per-row `try/catch`, the memo on `locale` (not `t`), and the empty/loading/error branches outside the list are all unchanged.

**Deviation, stated (Trap 8 / Task 6):** `PoolContributorList.tsx` was ⛔ not added to `pool-name-form.test.ts`'s `CONSUMERS` itself, because `CONSUMERS` also drives AC3's "renders `deceasedDisplayName`" check, which is false for a contributor row. It was added to a `FENCED` superset (`[...CONSUMERS, contributor list]`) that the two AC2b fences iterate: no form decider or shielding helper is bound, and no join is performed. Those fences now cover this surface, and are no longer vacuous for it.

**Deviation, stated (AC1's `"Sunita ."`):** AC1 says `"Sunita ."` "returns the same as public". That holds under `full_name` (both `Sunita`). Under `shielded_name`, cleaning leaves a MONONYM, so the member gets `Sunita` and the public gets `null` — D3's mononym arm, where the member sees MORE. The live-DB leg asserts exactly that, and asserts `member === public` wherever the public form is non-null.

**Found beyond Task 7's inventory and annotated:** `packages/contracts/src/public-pages/matrix.ts` (the `contributor_name` carry note), `packages/api-client/src/index.ts` (the `memberPoolContributors` doc), and `packages/domain/src/contribution/read.ts` (header + `ConfirmedContributor` doc: "decrypts to first-name + last-initial").

**AC5 — the Nominee Console, stated.** It mounts the same `<PoolContributorList/>` (`NomineeConsole.tsx:213`) and renders the same way. That route resolves the **session member's own assigned pool as a payer** (`resolveMemberLivePool`), ⛔ not the death-linked drive the console is about (the open `deferred-work.md` item, ⛔ not fixed here). ⇒ a nominee acting as the deceased sees **full names** (under the default mode) of contributors to whatever other drive the deceased was rostered on as a payer, or the no-pool copy.

**AC6 — deployment order and cache.**
- **(a)** The new response makes every OLDER build's contributor query fail its strict parse (`packages/api-client` throws on `schema.parse`). A **cold** old build self-suppresses: the contributor screen and the Nominee Console panel show the no-pool copy, and `ViewContributorsEntry` renders nothing. A **warm** old build keeps showing its stale list for the session, because React Query keeps the last good `data` when a refetch fails.
- **(b)** Evidence re-checked 2026-09-19, ⛔ not assumed: `expo-updates` is ⛔ not in `apps/mobile/package.json`; `AndroidManifest.xml` has `expo.modules.updates.ENABLED=false`; `Expo.plist` has `EXUpdatesEnabled` `<false/>`; `app.json` is `"version": "0.1.0"` with no `runtimeVersion`; ⛔ no workflow (`ci.yml`, `deploy-prod.yml`, `deploy-staging.yml`, `nightly-integrity.yml`, `code-escrow-mirror.yml`) builds or ships mobile. ⇒ ⛔ no OTA path and ⛔ no evidence of store installs. **Release order chosen: ship together, API and mobile in one release. The window is recorded:** any build that exists outside this repo's control (a sideloaded dev build) degrades as in (a) until it is rebuilt from this commit. ⚠ If store installs ever exist before this ships, switch to 8-17 AC8's order (a mobile build tolerating both shapes first, API second). This choice does ⛔ not cover that case.
- **(c)** In place and tested: the new key and `gcTime: 0` (a source pin on the hook, plus the Provider's `gcTime !== 0` exclusion), and the startup removal (a source pin on `onSuccess`, plus a real `QueryClient` test showing the retired key removed and the current key kept) — `contributor-list-render.test.ts`, "Story 11b.21 — D6".
- **(d)** `-172`'s offline 7-day residual (`CR-11b.2a-COMBINED-W3`) is **CLOSED ON THIS SURFACE**: new entries are never persisted, and the retired entry is removed at startup. It stays **OPEN REPO-WIDE** (the shared-device/sign-out half, and every other member-scoped persisted query).

**AC7.** The public-pages suite passes unchanged. On the member route (live DB): a gRPC-14 outage on one row of three yields `{ assigned:false }`; a status-less `Connection terminated unexpectedly` on the second profile read yields `{ assigned:false }`; an INVALID_ARGUMENT on one row yields exactly one `{ name: null }` with the other row named. `decryptDek` per single-row pool: named 1, erased 1, corrupt (AAD mismatch) 1, no profile **0**.
⚠ **Timing residual — now also covering the member route, ⛔ not closed.** Zero KMS calls for a missing profile row or null ciphertext; and, per the sixth-pass item's own text, for an envelope that fails to PARSE before the KMS call. The deferred item is re-marked to say so.

**AC8 — the `-195` cl.1 compliance statement, contributor-name data class: ✅ COMPLIANT after this story.**
- **Public:** mode-resolved via `resolvePublicMemberName`. The full name is the ceiling: `-175` cl.3 permits it, and `-136` cl.1 requires the form to be a Pariwar-level configurable policy. **Member:** mode-resolved via `resolveMemberFacingDeceasedName` over the **same cleaned tokens** (`publicNameTokens`). Same token rule, same form rule, same stored mode, same normaliser (`kyc/name-render.ts`).
- ⇒ For every stored name and mode, the member form is **equal to or longer than** the public form. The only divergence is a mononym under `shielded_name`, where the member sees the name and the public sees the placeholder. This is asserted by calling the public functions in the AC1 live-DB leg.
- ⚠ In production every Pariwar is `full_name` (the mode has no writer), so the shielded and mononym arms are tested but ⛔ not yet reachable.
- **Both surfaces** render `A contributor` / `एक सहकर्मी` for a withheld name, from ONE key (AC4's cross-namespace test).
- The member wire still has ⛔ no `total`, and needs none: every confirmed row is now a row.
- **Residuals, stated:** (1) the D3 cross-surface mononym correlation — pre-existing, kept and ⛔ not created (see "Question for BigDev"); (2) the AC7 zero-KMS timing residual (missing profile / unparseable envelope); (3) the kill-switched-Pariwar case (routing note §3): there the member surface is the only disclosure point, and `-222` ruled option (B) **without addressing it** — carried as a residual, ⛔ not claimed as ruled.

**AC8 re-marks, done in `deferred-work.md`:** the top section's Axis A is `✅ DISCHARGED by 11b-21` and Axis B is `✅ BUILT by 11b-21` (original text kept); the fourth-pass key-strategy item is `✅ CLOSED by -224 D1`; the sixth-pass timing item now covers the member route; `CR-11b.2a-COMBINED-W3` is closed on the member contributor surface and ⛔ open repo-wide.

**AC9:** `friction-budget.md` gains the Story 11b.21 disposition: declaration affirmed, ⛔ no new row. D6's cold-start/offline loss (including the absent home-tab entry) is weighed there and stated as an availability loss, ⛔ not AR-60 friction, with its payer and what it protects.

### File List

- `.decision-log.md` (governance commit)
- `_bmad-output/planning-artifacts/epics.md` (governance commit)
- `_bmad-output/planning-artifacts/prds/prd-TWT-2026-05-22/prd.md` (governance commit)
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `_bmad-output/implementation-artifacts/11b-21-member-contributor-name-form-parity.md`
- `_bmad-output/implementation-artifacts/deferred-work.md`
- `friction-budget.md`
- `apps/api/src/modules/kyc/name-render.ts` (new)
- `apps/api/src/modules/kyc/bounded-decrypt.ts`
- `apps/api/src/modules/member-pool/handlers.ts`
- `apps/api/src/modules/public-pages/handlers.ts`
- `apps/api/tests/unit/name-render.test.ts` (new)
- `apps/api/tests/unit/pool-contributors.test.ts`
- `apps/api/tests/unit/bounded-decrypt.test.ts`
- `apps/api/tests/integration/contributions/pool-contributors-rtbf.spec.ts`
- `apps/api/tests/integration/contributions/member-drive-detail.spec.ts`
- `apps/mobile/components/Provider.tsx`
- `apps/mobile/components/contributor-list/PoolContributorList.tsx`
- `apps/mobile/components/contributor-list/contribution-row-input.ts`
- `apps/mobile/components/contributor-list/usePoolContributorsQuery.ts`
- `apps/mobile/components/contributor-list/pool-contributors-cache.ts` (new)
- `apps/mobile/tests/unit/contributor-list-render.test.ts`
- `apps/mobile/tests/unit/pool-name-form.test.ts`
- `apps/public/src/lib/sahyog-vivran-message-block.ts`
- `apps/public/src/lib/sahyog-vivran-render.ts`
- `apps/public/src/pages/sahyog-vivran/[driveToken].astro`
- `packages/api-client/src/index.ts`
- `packages/contracts/public-pages/public-vs-private-matrix.yaml`
- `packages/contracts/src/contributions/pool-contributor-list.ts`
- `packages/contracts/src/public-pages/matrix.ts`
- `packages/contracts/src/public-pages/sahyog-vivran.ts`
- `packages/contracts/tests/contributions.test.ts`
- `packages/domain/src/contribution/read.ts`
- `packages/domain/src/encryption/README.md`
- `packages/i18n/locales/en/sahyog-vivran.json` (`$comment` only)
- `packages/i18n/locales/hi/sahyog-vivran.json` (`$comment` only)
- `packages/i18n/tests/contributor-list-empty.test.ts`
- `packages/i18n/tests/contributor-placeholder-one-key.test.ts` (new)
- `packages/ui/src/contribution-list/i18n-keys.ts`
- `packages/ui/src/contribution-list/index.ts`
- `packages/ui/src/contribution-list/presenter.ts`
- `packages/ui/src/contribution-list/view-model.ts`
- `packages/ui/tests/contribution-list/presenter.test.ts`

## Change Log

| Date | Version | Description | Author |
|---|---|---|---|
| 2026-09-19 | 0.1 | Created via `bmad-create-story` at `a44aef23`. Carries both axes of the `-221` breach, per `-222` Consequence 1. Six engineering calls (D1–D6) are ruled in-file for recording at `-224` by Task 1. ⛔ No open Panel question; one flagged reading for BigDev (D3). Status → `ready-for-dev`. | BigDev + Claude |
| 2026-09-19 | 0.2 | `bmad-create-story validate` (three parallel read-only verifiers; code claims re-derived at `d72d4e68`, no code drift). ⭐ **Parity:** the member resolver does no token cleaning, so dirty names showed the member LESS than public; D3 now feeds `publicNameTokens`. ⭐ **Timing:** v0.1's erased-row decrypt skip created an RTBF-only zero-KMS signal against `-222` cl.2, mislabelled "inherited"; new **D7** drops the pre-filter and state read (`-170`), superseding `-169` cl.4. ⭐ **Faults:** the profile read moves outside the `try` (public fifth-pass precedent). ⭐ **Cache:** D6 now also removes the orphaned old key, which v0.1's new key only hid. **Supersessions recorded:** `-168` cl.5, `-169` cl.8 (in part); D1 records Consequence 3 as not met rather than re-reading it. **Fences:** `death-term.test.ts`, the `startsWith` ref pin, and the full mobile/RTBF-spec pin inventory added; `pool-name-form.test.ts` was vacuous for this surface. **Corrections:** AC5 Nominee Console pool relationship; AC6 warm-cache symptom and no-OTA release evidence; mode column has no production writer; `-174`/`-175` "unconditional" → `-136` ceiling; `-219` cl.4 misquote; "four Trustee rulings" → two + three; kill-switch "ruled" → residual; PRD FR-24 quote; the `<MatrixField>` claim; line cites in `resolveContributorList`; Task 7 inventory (+message-block, README, presenter/i18n-keys headers, bounded-decrypt); glyph inversions; AC↔Task tags. Status stays `ready-for-dev`. | BigDev + Claude |
| 2026-09-19 | 1.0 | `bmad-dev-story`: governance commit `71ef29ee` (`-224`), then the implementation — shared `kyc/name-render.ts` (D4); wire `{ name: string \| null }` (D2); mode-resolved, token-cleaned name with every confirmed row kept and no state pre-filter (D3/D7); presenter `name \| unnamed` → `name \| placeholder` from ONE key (D1); mobile render + keyExtractor; cache never persisted + retired key removed (D6). Tests inverted per AC10 with "Was:" notes; new live-DB legs for AC1/AC2/AC7; AC4 one-key test with proven teeth. Records: AC5/AC6/AC8 statements, deferred-work re-marks, friction disposition. Status → `review`. | BigDev + Claude |
