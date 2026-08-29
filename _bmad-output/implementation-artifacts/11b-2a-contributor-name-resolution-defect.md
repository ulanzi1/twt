---
baseline_commit: 07a5ced
---

# Story 11b.2a: Contributor Name Resolution — RTBF defect fix + decrypt bound `[DEFECT]`

Status: blocked-awaiting-decisions

> ⛔⛔ **BLOCKED — A THIRD VALIDATION PASS FALSIFIED THE GROUND OF A RULING (2026-08-29, at `07a5ced`).**
> ⭐ **D3(a) · D3-shape(ii)(a) · D4(a) STAND.** ⛔ **D3-rollout(a) is RE-OPENED — its zero-population
> ground is FALSE: Epic 9's `contribution.confirmed` producer SHIPPED at Story 9.4/9.5.** ⚠ And
> **D3-shape(i)** ruled the union's SHAPE but never `rowKey`'s **DERIVATION** — a privacy decision
> (**D3-key**) that AC5 cannot be built without. ⇒ **Tasks 0/1/3/4 are startable; ⛔ Tasks 2 and 5 are NOT.**

> ⭐⛔ **THIS STORY EXISTS BECAUSE A VALIDATION PASS FOUND A LIVE, USER-VISIBLE DEFECT ON SHIPPED
> CODE.** It was split out of Story 11b.2 on 2026-08-29 because it is a different risk class from a
> headless presenter: it edits a shipped API handler, widens a `.strict()` wire contract consumed by
> an already-released mobile build, and needs a live-DB integration test.
>
> ⭐ **It is independent of the presenter and of the mobile rewire. If capacity is scarce, ship this
> FIRST** — a Hindi reader currently sees the English token `[anonymized]` where a person's name
> belongs.

## ✅ PREFLIGHT — the dev agent's first action

⭐ **Ruled and STANDING (BigDev, 2026-08-29), written below with their grounds:**
· **D3(a)** — fix the RTBF defect **here**, as its own story.
· **D3-shape (i)(a)** — the wire is a **discriminated union** (SHAPE only — ⛔ see D3-key).
· **D3-shape (ii)(a)** — **one batched** state read.
· **D4(a)** — **bound** the N+1 decrypt here. ⭐ Its ground CHANGED (see D4) but its verdict did not.

⛔⛔ **RE-OPENED / UNRULED — ⛔ do NOT proceed on either:**
· **D3-rollout** — ⛔ **the ruling's whole ground is FALSIFIED.** See the block below.
· **D3-key** (NEW) — ⛔ **`rowKey`'s derivation was never ruled**, and AC5's two requirements pull
  against each other. See the D3-key block in Decisions.

⛔ **Task 0 TRANSCRIBES those rulings into `.decision-log.md`. It does ⛔ NOT author them, ⛔ not
paraphrase them, and ⛔ not supply a ground.** ⚠ If any decision below has been edited back to UNRULED,
**STOP and report blocked** ([[feedback_supersede_never_reinterpret]]).

⛔⛔ **THAT PRECONDITION WAS CHECKED LIVE, AND IT FAILED. THE PRODUCER HAS LANDED.** D3-rollout(a)
rested entirely on the confirmed-contributor population being **zero**, derived from *"Epic 9's
`contribution.confirmed` producer is unbuilt."* ⭐ **That premise is FALSE and was false when written.**
Verified at `07a5ced`:

| Evidence | What it says |
|---|---|
| `sprint-status.yaml:12178-12179` | `9-4-utr-matching-engine…: done` · `9-5-…contribution-confirmed-as-canonical-financial-truth: done` |
| `packages/domain/src/reconciliation/matcher-write.ts:117` | `appendConfirmedContribution()` — the live append |
| `apps/jobs/src/boot.ts:635,652` | *"The FIRST live producer of contribution.confirmed"* — `registerReconciliationMatchWorkers`, registered **unconditionally** |
| `packages/domain/src/index.ts:177` | *"live since Story 9.4's matcher"* |
| `packages/domain/src/trustee-lite/violator-flags.ts:20` · `packages/validity-service/src/types.ts:102` | *"two live emitters since Story 9.4"* |

⚠ ⭐ **HOW THE FALSE PREMISE GOT IN — it is this story's own Trap 4 shape, one level up.** The claim was
read off **stale Epic-8-era comments** (`pool-contributor-list.ts:88`, `contribution/read.ts:18`,
`contribution-notify-triggers.ts:18`), all still saying *"unbuilt"*. ⛔ **The very same contract file
says the opposite at `:7-8`** — *"produced by the Epic 9 matcher since Story 9.4 — this list is **live,
not structurally empty**"*. A self-contradicting file was cited on its stale half.
⇒ ⛔ **D3-rollout must be RE-RULED by BigDev. ⛔ It does not carry over**
([[feedback_supersede_never_reinterpret]]), and ⛔ **no dev agent may supply its ground.**

⚠ ⭐ **AND RECORD THE SECOND-ORDER GAP HONESTLY, ⛔ do not paper it over**
([[feedback_record_unattested_no_backfill]]): *"producer unbuilt"* was a **code** claim and it is
refuted. *"Zero confirmed rows in production"* is a **DATA** claim about live Pariwar databases, and
⛔ **nobody has ever checked it** — ⛔ not at authoring, ⛔ not here. It is **UN-ATTESTED**, ⛔ not
"still true". The re-ruling starts from that position, ⛔ not from an inherited zero.

> ✅ **BASELINE RE-PINNED `80e0d12` → `07a5ced`, and ⛔ NO VERIFIED CLAIM MOVED.** `git diff --name-only
> 80e0d12..07a5ced` returns **four `_bmad-output/` files and nothing else** — both intervening commits
> are governance-only, so ⛔ no cited code path is in either diff (the `fe8a6f9` / `9b05372` precedent).
> ⭐ The cited loop's **content has not changed since Story 8.3 (`afce9e0`)**, so the `:309-334` range is
> stable. ⚠ ⛔ **But its INTERNAL line citations were wrong and are corrected throughout this file** —
> see Trap 2. Branch off `governance/11b-2-validate-split`, ⛔ **not `main`** (on `main` this file does
> not exist); re-`fetch` before you branch.

---

## Story

As a member who exercised my right to erasure,
I want my name to be genuinely absent from the contributor list my contribution still appears on,
so that the erasure I asked for is the erasure I actually got — in both languages, on every surface.

---

## 📜 Policy meaning (AI-10-1, CONFIRMED BigDev 2026-08-18)

**This story introduces ⛔ NO predicate that gates a member's access to a benefit.** It changes how an
already-decided contributor row is **displayed**. ⛔ Nothing in it may be read by, joined into, or
referenced from an eligibility, validity, assignability, pool-assignment or claim path.

⚠ **It DOES introduce one render predicate over a member's own identity, and it must be stated:**

**Predicate — *"does this member's NAME appear on a contributor row, or the anonymized marker?"***
The name appears iff the member's lifecycle state is **not `anonymized`**; an `anonymized` member
resolves to the ratified *"an anonymous member"* key **regardless of any residual stored name**
(`display-name.ts:47-58`, Story 3.12 defense-in-depth).

**In the member's terms:** *"if you exercised your right to erasure, your contribution stays counted
but your name does not appear next to it — anywhere, on any surface, in any language. If you did not,
your name appears exactly as it always did."*

**Checked against the Niyamavali:** ⚠ **§4.4 SPEAKS to it but ⛔ GOVERNS NOTHING** (*"public rendering
of any personal information is consent-gated and never default opt-in"* — `.decision-log.md:902`), and
the distinction is ⛔ not pedantry: the Niyamavali is **agent-drafted and UNRATIFIED**
([[feedback_niyamavali_rulebook_not_spec]]), and `friction-budget.md:44` ranks it **below** Trust Deed
cl.15(c), which ⭐ itself binds nothing ([[project_legal_corpus_private_repo_split]]). ⇒ cite §4.4 as
**alignment, ⛔ never as authority**. ⭐ **The obligation this story actually discharges is STATUTORY
(DPDPA erasure) and RATIFIED (`member.anonymousMember`, Story 3.12) — ⛔ neither needs §4.4.** On that
footing the story moves the build INTO compliance — today the marker silently does not happen. ⚠ The **positive** half (on what authority
a contributor's name renders publicly at all) is ⛔ not this story's; 11b.3 owns it.

⛔⛔ **AND THE C-5 SHARP EDGE INVERTS HERE — READ IT BEFORE YOU ADD A CONJUNCT.** The epic instructs
authors to add the `account-frozen` (death) overlay conjunct to predicates that lack it. ⭐ **On a
CONTRIBUTOR read that silently DELETES dead contributors from the historical record** — *"the right
conjunct in the wrong read"* (`2026-08-24-159` cl.11, verbatim). Two rules, ⛔ neither subsuming the
other:

| | Rule | Mechanism |
|---|---|---|
| **Death** | the name **STAYS** — a historical fact nobody asked to remove | ⛔ **no mechanism** — the seam takes a `MemberLifecycleState` and is blind to death **by construction**, and that blindness is **correct here** ([[project_death_is_an_overlay_not_a_state]]) |
| **RTBF** | the name **GOES** — a legal obligation the member exercised | `resolveMemberDisplayName`'s `anonymized` branch — **this story** |

⚠ ⭐ **A deceased member IS reachable by RTBF** — `member.rtbf_anonymized` reaches `anonymized` from
**every** lifecycle state and death touches ⛔ none of them. ⇒ the two rules **overlap on real
people** and must be implemented as two independent things. ⛔ **A diff that adds a death conjunct to
any contributor path must be rejected in review.** ⚠ ⛔ And do **not** restate this as *"contribution
history is immutable"* — it is **not**, and that sentence implements the wrong thing.

---

## 🎯 The defect — verified end-to-end at `80e0d12`

`apps/api/src/modules/member-pool/handlers.ts:309-334`:

```ts
const rows: ConfirmedContributorRow[] = [];
for (const contributor of confirmed) {
  const kycProfile = await kycDomain.getMemberKycProfile(tx, pariwarId, contributor.memberId);
  if (!kycProfile || kycProfile.nameCiphertext === null) { /* warn */ continue; }   // :312→317
  let fullName: string;
  try { fullName = await decryptKycField(kycProfile.nameCiphertext, pariwarId, deps.encryption); }
  catch (err) { /* warn */ continue; }                                              // :325→327
  const { firstName, lastInitial } = splitFirstNameLastInitial(fullName);
  if (firstName === '') { /* warn */ continue; }                                    // :330→332
  rows.push({ firstName, lastInitial });                                            // :334
}
```

**The chain, traced to the line:**
1. RTBF does ⛔ **not** null the column. `member/anonymize.ts:144` writes
   `nameCiphertext: await encSentinel(...)` — `encSentinel` (`:101-113`) **encrypts**
   `ANONYMIZED_SENTINEL = '[anonymized]'` (`:70`) via `encryptTier1` → `serializeEnvelope`.
2. So `nameCiphertext !== null` ⇒ the `:312` guard does ⛔ not fire.
3. `decryptKycField` succeeds cleanly ⇒ the `:325-327` catch does ⛔ not fire.
4. `splitFirstNameLastInitial('[anonymized]')` (`kyc/name.ts:47-53`) → one token →
   `{ firstName: '[anonymized]', lastInitial: '' }`.
5. `firstName !== ''` ⇒ the `:330` guard does ⛔ not fire.
6. `rows.push` **executes**. The internal sentinel renders **verbatim, un-i18n'd, in both locales**,
   where a person's name belongs.

⛔ **The loop never calls `resolveMemberDisplayName`.** ⭐ Verified stronger at `07a5ced`: that function has
**zero production call sites repo-wide** — the only references are its own definition
(`display-name.ts:47`) and its unit test (`packages/domain/tests/member/display-name.test.ts`).

⚠ ⛔ **Be precise about what this is and is not.** It is ⛔ **NOT a Tier-1 leak** — RTBF really did
overwrite the ciphertext; nothing residual escapes. It **IS** the ratified `member.anonymousMember`
copy **silently not happening**.

### ⭐⛔ It was RECORDED — this story DISCHARGES the record, it does not discover it

`deferred-work.md:3980`, **RTBF-D1 (Story 3.12, 2026-07-02)**, open, never closed:

> *"the display-time name-resolver seam is **NOT wired** into a real member-backed public read … at
> Epic 3 the public contributor surfaces … are **sample-data only** … **HONEST: no public surface is
> 'anonymized' today because no real member-backed public read exists yet** … **Re-trigger: when
> Epic 6/8 introduces a real contributor/member-directory read.**"*

⭐ **The re-trigger FIRED at Story 8.3** — which built exactly that real member-backed contributor
read — and nothing acted. ⇒ the accurate finding is **not** *"unrecorded"*; it is **"a routed item's
trigger fired, its stated ground (*'no real member-backed public read exists yet'*) is now falsified,
and it silently became a live defect."** ⛔ Do not file a new deferral for it
([[feedback_negative_claims_checkable_in_repo]], [[feedback_closure_language_precision]]).

**Two more 8.3 items land inside this diff and are likewise re-triggers, ⛔ not new findings:**
· `deferred-work.md:2161` — *"Sequential per-contributor KYC decrypt loop (N+1) … **Re-trigger: when
  Epic 9's producer lands and confirmation volume grows** — batch-decrypt … (never a plaintext cache
  at rest)."* ⭐ **This is AC3/D4 verbatim, already routed.** ⚠ It cites `handlers.ts:203-220` — the
  pre-10.27 line numbers for the same loop.
· `deferred-work.md:2162` — *"`ConfirmedContributorRow.lastInitial` (`.max(16)`) doesn't structurally
  guarantee 'initial-only'."* ⚠ Task 2 opens this exact schema; note it, ⛔ do not silently fix it.

---

## ⛔ THE FOUR TRAPS

### Trap 1 — ⛔⛔ "THE BOUNDARY ALREADY LOADS THE MEMBER" IS FALSE, AND THE NAIVE FIX IS AN N+1 WORSE THAN THE ONE AC3 EXISTS TO BOUND.

`resolveMemberDisplayName` needs a `MemberLifecycleState`. Verified at `80e0d12`:

- `getMemberKycProfile` (`packages/domain/src/kyc/profile-read.ts:24-37`) is a bare
  `select().from(memberKycProfiles)` — ⛔ **it returns no `state` column at all.**
- The only state load in this module is `getMemberStateAt(tx, memberId, now)` at `handlers.ts:398`,
  inside `resolveMemberLivePool`, keyed on **`ctx.memberId`** — the **requesting** member, ⛔ not any
  contributor.
- `getMemberStateAt` (`packages/domain/src/member/read.ts:127-138`) is a **full event-stream replay per
  member** — `select().from(eventsLog).where(streamId = memberId AND occurredAt <= atTimestamp)
  .orderBy(eventVersion)` → `replayMemberState`. ⚠ It carries an `occurred_at` **upper bound** (⛔ it is
  not literally "unbounded"), but it takes ⛔ **no `LIMIT`** — the whole stream replays.

⛔⛔ **AND THERE ARE TWO SIBLINGS, ⛔ NOT ONE — PICKING THE WRONG ONE RE-CREATES THIS STORY'S DEFECT.**
`getCurrentMemberState` (`read.ts:151`) is the **NO-upper-bound** variant, and its own doc-block states
the reason in terms:

> *"`occurred_at` is DB-generated while any `atTimestamp` a caller holds is the injected APP clock, and
> bounding by it can make an audit field disagree with the state `projectMemberState`'s OWN unbounded
> replay is about to write moments later."*

⇒ ⭐ **if the batched read inherits `getMemberStateAt`'s `lte(occurredAt, now)` bound and the DB clock
leads the injected app clock, the `member.rtbf_anonymized` event falls OUTSIDE the replay window, the
member resolves `active`, and THE ERASED NAME RENDERS** — ⛔ the exact defect this story exists to fix,
reintroduced by the choice of sibling. **AC2 mirrors `getCurrentMemberState`, ⛔ never `getMemberStateAt`.**

⇒ ⛔⛔ **Calling it per contributor row adds one full event-stream replay per row — strictly worse
than the KMS decrypt AC3 exists to bound, and `mapWithConcurrency` does not make it acceptable.**
⭐ **AC2 and AC3 are in tension and the fix must resolve it, ⛔ not paper over it.**
→ ✅ **RESOLVED by D3-shape(ii)(a): one batched read, O(1) round trips.**

### Trap 2 — ⚠ "⛔ MUST NOT SILENTLY `continue`" IS SCOPED TO THE ANONYMIZED CASE ONLY.

⛔⛔ **AND THE LINE NUMBERS AN EARLIER PASS GAVE FOR THEM WERE ALL WRONG — these are verified at
`07a5ced` and the loop has not moved since `afce9e0`.** The prior `:313`/`:326`/`:331` pointed at
*comment* and *condition* lines, ⛔ not at the `continue`s a reviewer will diff:

| Guard | Condition | `continue` | Its rationale comment |
|---|---|---|---|
| null / missing ciphertext | `:312` | **`:317`** | `:313-315` |
| decrypt failure | `:323-325` (`try`/`catch`) | **`:327`** | `:319-321` |
| empty split | `:330` | **`:332`** | (inline warn `:331`) |

Each has a documented rationale, and the **`:319-321`** comment (⛔ not `:322-324`) exists to preserve
exactly that fail-soft posture (skip one row, ⛔ never fail the response).

⛔ **Removing them turns three per-row degradations into a whole-response failure.** The prohibition
is: **the anonymized case must not `continue`** — an RTBF member's contribution still **counts**.
⚠ The three existing `continue`s are preserved **verbatim, with their comments**.

### Trap 3 — ⭐⛔ WIDENING A `.strict()` RESPONSE SHAPE BREAKS EVERY STALE MOBILE CLIENT.

⛔ This is not theoretical, and 11b.9 already priced it eight days ago:

- **There is no OTA.** `11b-9-…md:725-734`, verified: *"`apps/mobile` has no `expo-updates`/OTA config
  (`package.json`, `eas.json`), so it ships via EAS Build → app-store submission only, so the review
  window is real."*
- **The client validates and CACHES.** `apps/mobile/components/contributor-list/usePoolContributorsQuery.ts:33`
  → `memberAuth.memberPoolContributors()`; its header: *"The response is **Zod-validated inside the
  SDK** … **Auto-persisted to MMKV**."*
- ⚠ ⭐ **And the exposure is worse here than in 11b.9.** 11b.9's break was one *request* path, accepted
  because claim-filing volume in a short window is low and recoverable. **A widened `.strict()`
  RESPONSE row fails validation for every read on every stale client, and MMKV persists the stale
  shape.** 9.6 recorded the same hazard shape (*"an older mobile build receiving a newer wire enum
  before an app update … loud-by-default i18n throw"*).

⇒ **the widening must be backward-compatible for a stale reader, or the rollout risk must be ruled
explicitly.** ⛔⛔ **AND THE RULING THAT ACCEPTED IT HAS BEEN RE-OPENED — ⛔ do NOT proceed on it.**
⚠ ⭐ Verified: because the SDK parses with the **bundled** `.strict()` schema
(`packages/api-client/src/index.ts:558-564`), the union breaks **every row on every read** for a stale
client, ⛔ not only anonymized rows. D3-rollout(a) accepted that **solely** because the population was
believed to be zero — ⭐ **and that belief is refuted** (see Preflight). ⇒ the exposure is no longer
provably empty: it is a **real, user-visible break of the contributor list on every stale build**, for
however many confirmed rows production actually holds — a number ⛔ **nobody has measured**.
⛔ **The old "widen BEFORE Epic 9's producer" ordering constraint is now UNSATISFIABLE — the producer
landed at Story 9.4. ⛔ Do not carry it forward, ⛔ do not route it as a re-trigger, and ⛔ do not treat
its impossibility as satisfaction.**

### Trap 4 — ⭐⛔ THE ROW TUPLE IS HAND-MAINTAINED IN THREE PLACES, AND THE NAIVE GREP FINDS NONE OF THEM.

11b.1's headline finding (`11b-1-…md:1224-1234`): *"**A FIFTH hand-maintained copy** of the claim-time
consent-type list — and it **500'd ONLY on the path where a family actually TICKED the new box** …
The fifth copy — an inline `z.enum([...])` — had ⛔ no lockstep test, so the request parsed, the
consent row was written, and the **event append threw**."*

⚠ ⭐ **The two halves that matter, and the authoring pass carried only the weaker one:**
1. **The fix was at the ROOT, not the grep:** *"fixed at the root: `CLAIM_TIME_CONSENT_TYPES` +
   `CLAIM_TIME_PUBLICATION_CONSENT_TYPES` **declared once, both event schemas derived**."*
2. **The test-shape lesson:** *"Appending `sahyogDrivePublication: false` to the existing rows —
   **which is what satisfying the compiler looks like** — leaves every test green and ships the bug.
   **It surfaced only because the integration combo table was extended to GRANT the consent.**"*
   ⇒ ⛔ the fixture must **exercise the new variant**, ⛔ not merely compile against it.

⛔⛔ **And name the grep, because the naive one fails.** A grep for the *new* symbol finds nothing —
that is precisely why the fifth copy survived. **Grep `lastInitial`.** Run live at `07a5ced`:

⚠ ⭐ **THE GREP RETURNS ~20 FILES; THIS TABLE IS THE ~10 THAT ARE THE CONTRIBUTOR-ROW TUPLE. ⛔ THE
REST ARE DELIBERATELY OUT OF SCOPE, AND YOU MUST NOT "RECONCILE" THEM:** the 8.2 `deceasedLastInitial`
family (`active-contribution-card.ts:24`, `yogdaan-bahi/sample-data.ts:18,50,58`,
`note-template.ts:82-83`), and the `splitFirstNameLastInitial` **producer + its tests**
(`kyc/public-name.ts:78-99`, `tests/kyc/public-name.test.ts`, `tests/unit/member-pool.test.ts:14-40`).
⛔ **They are a different tuple on a different surface. Touching them is scope creep, not thoroughness.**

| Site | Nature |
|---|---|
| `packages/contracts/src/contributions/pool-contributor-list.ts:49` | the canonical schema |
| ⛔ **`apps/mobile/components/contributor-list/PoolContributorList.tsx:40-43`** | ⭐⛔ **a LOCAL `interface ConfirmedRow { firstName; lastInitial }` — ⛔ NOT imported from `@twt/contracts`. Widening the contract will ⛔ NOT fail this file's typecheck.** This is 11b.1's defect class, already present. |
| `apps/api/src/modules/member-pool/contribution-note.ts:210` | an independent inline structural type |
| `apps/api/src/modules/member-pool/name.ts:21-25` · `packages/domain/src/kyc/name.ts:25` | the producer + `SplitName` |
| `packages/domain/src/notifications/pool-identity.ts:98,123` | `deceasedLastInitial` re-spelling |
| `apps/api/tests/unit/_pool-identity-fake.ts:31` · `apps/api/tests/unit/pool-contributors.test.ts:97` · `packages/contracts/tests/contributions.test.ts:156-191` | fixtures |

---

## Acceptance Criteria

### AC1 — The RTBF defect is FIXED, and the marker really reaches the wire ✅ `[D3(a) RULED]`

`handlers.ts:309-334` routes every contributor row through `resolveMemberDisplayName({ state, name })`
before the row is pushed, so an `anonymized` member yields the anonymized variant and ⛔ never the
decrypted `'[anonymized]'` sentinel.

**And ⛔ THREE kinds, not two.** The resolver returns `name | unknown | anonymized`
(`display-name.ts:36-39`). `unknown` is **unreachable here** — the `:312` guard already `continue`s
on a null ciphertext — so map it with an **exhaustive `never` check that throws**, ⛔ never a silent
fall-through to a blank name, and **record the branch as un-attested**
([[feedback_record_unattested_no_backfill]]).
**And** ⛔ the fix must **not** be a magic string in `firstName`, and ⛔ must **not** `continue` for
the anonymized case — an RTBF member's contribution still **counts**: `confirmedCount` is the
confirmed-set size and ⛔ must not move. ⚠ The three **existing** integrity `continue`s at **`:317` /
`:327` / `:332`** are preserved **verbatim with their comments** (Trap 2's corrected table).
**And** ⛔ the fix adds **no** death-derived conjunct anywhere.

### AC2 — The lifecycle state is loaded in BOUNDED work, ⛔ never one replay per row ✅ `[D3-shape(ii)(a) RULED]`

⛔ **`getMemberStateAt` is NOT called per contributor row** (Trap 1). A **batched state resolver**
lands in `packages/domain/src/member/read.ts` — one `eventsLog` query over the contributor
`streamId` **set**, grouped and replayed per member in memory, returning
`Map<MemberId, MemberLifecycleState>` — and a test asserts the number of state-resolution round trips
is **O(1) in the contributor count**, ⛔ not O(n).

⛔⛔ **AND IT MIRRORS `getCurrentMemberState` (`read.ts:151`), ⛔ NEVER `getMemberStateAt` — THE CLOCK
DOMAIN IS LOAD-BEARING AND GETTING IT WRONG SILENTLY RE-CREATES THIS STORY'S DEFECT** (Trap 1). It
takes ⛔ **no `atTimestamp` parameter** and applies ⛔ **no `lte(occurredAt, …)` bound**: RTBF
correctness is a **RIGHT-NOW** question, and an app-clock bound can exclude a DB-clock-stamped
`member.rtbf_anonymized` event and render the erased name. ⚠ A test asserts the resolver's SQL carries
**no `occurred_at` upper bound**, so a later "consistency" refactor toward `getMemberStateAt` fails
loudly rather than silently un-erasing a member.

**And** the `streamId` set is **chunked at a named documented constant**; ⛔ not an inline literal, and
⛔ **not `DIRECTORY_DECRYPT_CONCURRENCY`** — a chunk size and a concurrency bound are different
quantities and must not drift into each other.
**And** ⛔ it takes **no dynamic `.limit()`** ([[project_domain_limit_clamp_and_savepoint_retry]]) and
⛔ returns **state only** — no decrypt, no KYC join, ⛔ no death overlay.
**And** the mechanism is documented at the call site with a one-line note saying why the obvious
per-row call is forbidden, and why `members.state` was ⛔ **not** joined instead (projector liveness
must not enter the RTBF correctness path).

### AC3 — The decrypt cost is BOUNDED ✅ `[D4(a) RULED]`

The serial per-row decrypt is replaced by a **bounded-concurrency** batch on the `public-pages`
precedent (`apps/api/src/modules/public-pages/handlers.ts:58` `DIRECTORY_DECRYPT_CONCURRENCY = 8`;
`mapWithConcurrency` defined `:67`, called at `:210` / `:408`), with the per-row fail-soft preserved
**exactly**.

**And** ⛔ the bound is **ONE exported constant imported by both call sites** — ⛔ **not** two
constants reconciled by a cross-reference comment.
**And** ⛔⛔ **`mapWithConcurrency` IS SHARED THE SAME WAY — ⛔ never copy-pasted.** ⚠ Verified at
`07a5ced`: **both** `DIRECTORY_DECRYPT_CONCURRENCY` (`:58`) **and** `mapWithConcurrency` (`:67`) are
**module-private** in `public-pages/handlers.ts` — ⛔ neither is exported. Sharing only the constant
while duplicating the helper re-creates **the exact drift class this AC exists to forbid**, and the
helper is the half that carries the load-bearing behaviour (⭐ *"results written at the item's own
index, ⛔ never pushed in completion order"* — a completion-ordered result silently shuffles a public
page). ⇒ **extract BOTH to one shared module and import them at both sites.** ⚠ A second consumer now
exists, so this is shared tooling, ⛔ not a premature package ([[project_no_premature_package]]). ⚠ ⭐ **11b.9's review filed exactly that mechanism
as insufficient eight days ago** (`11b-9-…md:762-767`): *"Two independently hand-written SQL
predicates … reconciled only by a 'change one, check the other' comment … **real maintainability /
drift risk**."* ⛔ Do not ship the mechanism a live review already rejected.
**And** ⛔ **no plaintext-name cache at rest is introduced** — 8.3's own comment forbids it by name
([[project_validity_cache_failopen_pattern]]).
**And** the routing note for `deferred-work.md:2161` is marked **discharged by this story**, ⛔ not
"closed", and ⛔ not re-filed as a new item.

### AC4 — The wire carries the anonymized case as a DISCRIMINATED UNION ⛔ `[BLOCKED — D3-rollout RE-OPENED]`

`ConfirmedContributorRow` becomes the ruled `z.discriminatedUnion('kind', [...])` — `kind: 'name'`
carrying `firstName` + `lastInitial` + `rowKey`, `kind: 'anonymized'` carrying `rowKey` only, both
`.strict()`. ⛔ Never a sentinel string, ⛔ never an ambiguous optional field.

**And** ⚠ **`.strict()` is re-tested INSIDE the union** — the existing shape test asserts strictness on
a flat object, and discriminated-union strictness is a different code path. ⛔ Do not assume it carried.
⛔⛔ **THIS AC CANNOT BE SATISFIED AS WRITTEN AND ⛔ MUST NOT BE ATTEMPTED.** Its rollout half rested on
D3-rollout(a), whose ground is **falsified** (Preflight): Epic 9's producer landed at Story 9.4/9.5.
⇒ · the *"population is zero"* clause is **false**; · the *"widening lands BEFORE Epic 9's producer"*
ordering is **unsatisfiable**; · and the exposure window is ⛔ **no longer provably empty**.
**And** ⛔ **the re-ruled posture — whatever BigDev rules — is RECORDED in the decision entry with its
real, measured exposure.** ⛔ An unstated posture fails this AC; ⛔ **an inherited one fails it worse.**
⚠ **Task 2 stays BLOCKED until D3-rollout is re-ruled.** ⛔ The dev agent does ⛔ not re-rule it, and
⛔ does not treat the impossible ordering constraint as vacuously satisfied
([[feedback_supersede_never_reinterpret]], [[feedback_closure_language_precision]]).
**And** ⭐ **every re-spelling of the tuple is reconciled at the ROOT, ⛔ not by appending a field to
each copy** (Trap 4). At minimum, `PoolContributorList.tsx:40-43`'s local `ConfirmedRow` is made to
**derive from the contract** so a future widening cannot pass its typecheck silently. ⚠ That file is
11b.2b's to edit — ⛔ if 11b.2b has not landed, this story adds a **failing-by-construction** lockstep
test rather than leaving the copy unguarded.
**And** `deferred-work.md:2162` (`lastInitial` `.max(16)` doesn't guarantee initial-only) is **noted
as touched-and-unchanged**, ⛔ not silently fixed and ⛔ not silently ignored.

### AC5 — ⭐ A STABLE ROW KEY IS ADDED, because this is the only story that can add one ⛔ `[BLOCKED — D3-key UNRULED]`

`deferred-work.md:2163` (Story 8.3) defers the FlashList `keyExtractor` `index` churn, and names its
blocker in terms: *"removing `index` risks duplicate-key collisions **since the PII-shielded shape
carries no stable per-member identifier**."* Its re-trigger — *"if this list ever needs to scale
beyond a single pool's roster (**e.g. reused for the Epic 11b public render**)"* — **has fired by
name**, and its deferral ground (*"dozens, not the ~16k scale"*) is falsified by Epic 11b's own
performance contract.

⇒ the widened row carries **`rowKey`** — present on **both** union variants (an anonymized row still
needs a stable identity to recycle against).

⛔⛔ **BUT ITS DERIVATION WAS NEVER RULED, AND THE TWO REQUIREMENTS AS WRITTEN PULL AGAINST EACH
OTHER.** D3-shape(i)(a) ruled the **SHAPE** (`rowKey: z.string().min(1)`) and ⛔ nothing else. The prose
demands a key that is simultaneously:
· **STABLE** — it must survive the 60s poll, or FlashList recycling is no better than the `index` this
  AC exists to remove; **and**
· **NON-RE-IDENTIFYING across requests** — *"⛔ not anything that re-identifies across rows or
  requests"*, because a per-member permalink is the enumeration primitive `11a.3`'s handler refuses in
  terms (`epics.md:4904`).

⚠ ⭐ **Every derivation that is stable across polls is a deterministic function of `memberId` — i.e. a
cross-request pseudonym.** A per-response salt satisfies the second and ⛔ fails the first. ⇒ ⛔ **the
two clauses cannot both hold at full strength, and the trade is a PRIVACY ruling, ⛔ not a dev-agent
implementation detail.**

⛔⛔ **AND THE RTBF EDGE IS SHARPER STILL — READ IT BEFORE PROPOSING A SCHEME.** The ruled union puts
`rowKey` on the **`anonymized` variant too**. A deterministic per-member key therefore leaves a
**stable identifier attached to an erased member's row** — a residual handle surviving erasure, ⭐ **in
the very story whose purpose is erasure**, and on the one surface where the marker is supposed to mean
*"this person is gone."* ⇒ **D3-key must rule the anonymized variant's key explicitly**, ⛔ not inherit
the `name` variant's scheme by default.

⇒ ⛔ **AC5 is BLOCKED pending D3-key.** ⛔ It must ⛔ not be `memberId` and ⛔ not a blind index —
those two exclusions stand regardless of how D3-key rules.
**And** `deferred-work.md:2163` is marked **discharged**, with 11b.2b named as the consumer that
removes `index` from the `keyExtractor`.

### AC6 — It is proven end-to-end over a REALLY-anonymized member ✅ `[D3(a) RULED]`

An integration test at **`apps/api/tests/integration/contributions/pool-contributors-rtbf.spec.ts`**
drives a real anonymization and asserts the marker reaches the wire.

⛔ **Not by stubbing `resolveMemberDisplayName`.** ⛔ Not in `apps/api/tests/unit/` — ⚠ note that
`apps/api/tests/unit/pool-contributors.test.ts` **already exists and is DB-free**, so extending it is
the wrong-home trap that forces the stub this AC forbids.
**And** it asserts `pending.count` and `confirmedCount` are **unchanged** by the anonymization.
**And** ⭐ **the fixture EXERCISES the variant** — it anonymizes a member who **has a confirmed
contribution in the pool under test** — ⛔ it does not merely add an `anonymized: false` column to
existing fixture rows (Trap 4, half 2).
⭐ Precedents to drive the real anonymization: `apps/api/tests/integration/rtbf/rtbf.spec.ts` and
`packages/domain/tests/integration/member/rtbf-anonymize.spec.ts`.
⚠ `integration-tests` concurrency is **1** and is **LOAD-BEARING** — ⛔ never raise it
([[project_ci_local_concurrency_oversubscription]]).

---

## Tasks / Subtasks

> ⛔ **Task 0 first** ([[feedback_governance_commits_precede_implementation]]).
> ⛔⛔ **TASKS 2 AND 5 ARE GATED.** ✅ Startable now: **Task 0** (transcribe the STANDING rulings + the
> falsification), **Task 1** (batched state read), **Task 3** (the boundary fix), **Task 4** (the decrypt
> bound). ⛔ **Task 2 needs D3-rollout re-ruled AND D3-key ruled; Task 5's rowKey assertions need D3-key.**
> ⚠ Tasks 3 and 4 do ⛔ not touch the wire — they are genuinely independent of the widening.

- [ ] **Task 0 — Governance first** ✅ `[startable — transcribe 3 STANDING rulings + 1 falsification + 1 new OPEN decision]`
  - [ ] Read the `.decision-log.md` head **live** (`2026-08-28-167` at authoring; ⛔ do not hardcode)
        and **TRANSCRIBE** the **STANDING** rulings — **D3(a)** / **D3-shape (i)(a) SHAPE-ONLY +
        (ii)(a) batched read)** / **D4(a)** — one clause each, quoting the ground verbatim.
        ⭐ D3-shape's entry carries **both** sub-clauses and its three implementation constraints
        (chunking · no dynamic `.limit()` · state-only), ⭐ **plus the clock-domain constraint**
        (mirror `getCurrentMemberState`, ⛔ never `getMemberStateAt`).
  - [ ] ⛔⛔ **RECORD THE FALSIFICATION AS ITS OWN CLAUSE — this is the load-bearing half of Task 0.**
        **D3-rollout(a) is RE-OPENED**: its sole ground (*"Epic 9's producer is unbuilt ⇒ population
        zero"*) is **FALSE and was false when ruled** — the producer shipped at Story 9.4/9.5 (cite the
        Preflight evidence table). ⭐ Record **precisely**: the ruling is **superseded by falsification
        of its ground**, ⛔ NOT reversed on its merits, ⛔ NOT "closed"
        ([[feedback_supersede_never_reinterpret]], [[feedback_closure_language_precision]]).
        ⚠ ⭐ **And record the residual UN-ATTESTED fact**: whether production holds zero confirmed rows
        has ⛔ never been measured ([[feedback_record_unattested_no_backfill]]).
  - [ ] ⛔ **Record D3-key as OPEN** — `rowKey`'s derivation was never ruled and AC5's stability and
        non-re-identification clauses conflict; the anonymized variant's key needs its own ruling.
        ⛔⛔ **The dev agent does not decide and does not supply a ground for D3-rollout or D3-key.**
        ⛔ `governance:` prefix, own commit, before any code.
  - [ ] Record in the same entry that **RTBF-D1's re-trigger fired at Story 8.3 and was not acted on**
        — the honest framing, ⛔ not "newly discovered".
- [ ] **Task 1 — Bound the state load (AC2)** ✅ `[D3-shape(ii)(a) RULED — startable]`
  - [ ] Add the batched state resolver next to `getMemberStateAt` in
        `packages/domain/src/member/read.ts` → `Map<MemberId, MemberLifecycleState>`, one query,
        chunked at a named constant. ⛔ **Never `getMemberStateAt` per row** (Trap 1).
  - [ ] ⛔ State only — no decrypt, no KYC join, ⛔ no death overlay. ⛔ No dynamic `.limit()`.
  - [ ] ⛔ Do not push the state read into the domain contributor read (`ConfirmedContributor` is
        `{ memberId }` by design and the boundary decrypts).
- [ ] **Task 2 — Widen the contract at the ROOT (AC4, AC5)** ⛔ `[BLOCKED — D3-rollout re-opened + D3-key unruled]`
  - [ ] `grep -rn "lastInitial" packages apps --include='*.ts' --include='*.tsx'` and reconcile
        **every** site in Trap 4's table. ⛔ Declare once, derive; ⛔ do not append a field to each copy.
  - [ ] Add `rowKey` to **both** union variants (AC5). Re-test `.strict()` **inside** the union.
  - [ ] ⛔⛔ **DO NOT START.** The LIVE check has already been run and it **FAILED** — the producer
        landed at Story 9.4/9.5. ⛔ Task 2 resumes only once **D3-rollout is re-ruled** and **D3-key is
        ruled**.
  - [ ] ⭐ **While here, fix the stale comments that caused the false premise** — `pool-contributor-list.ts:88`
        and `contribution/read.ts:18` still say the producer is *"unbuilt"*, contradicting `:7-8` of the
        same file. ⛔ A self-contradicting contract is what a future pass will misread again.
  - [ ] Record the **re-ruled** D3-rollout posture and its **measured** exposure in the contract's
        doc-block (Trap 3). ⛔ Not the old window.
- [ ] **Task 3 — The boundary fix (AC1)** ✅ `[D3(a) RULED — startable]`
  - [ ] Route `:309-334` through `resolveMemberDisplayName`; exhaustive `never` over three kinds.
  - [ ] ⛔ Preserve the **`:317` / `:327` / `:332`** `continue`s verbatim with their comments
        (`:313-315` / `:319-321`) — ⚠ **Trap 2's corrected table, ⛔ not the old `:313`/`:326`/`:331`.**
  - [ ] ⛔ Add no death conjunct anywhere.
- [ ] **Task 4 — Bound the decrypt (AC3)** ✅ `[D4(a) RULED — startable]`
  - [ ] Bounded concurrency on the `public-pages` precedent; per-row fail-soft preserved exactly.
  - [ ] ⭐ **ONE exported constant imported by both sites** — ⛔ not a cross-reference comment.
  - [ ] ⛔ No plaintext cache at rest.
- [ ] **Task 5 — Prove it (AC6)** ⚠ `[AC6 startable; ⛔ the rowKey assertions wait on D3-key]`
  - [ ] `apps/api/tests/integration/contributions/pool-contributors-rtbf.spec.ts` — real
        anonymization, fixture that **exercises** the variant, aggregates unchanged.
  - [ ] A test asserting state-resolution round trips are O(1) in the contributor count (AC2).
  - [ ] ⭐ A test asserting the batched resolver's SQL carries **no `occurred_at` upper bound** (AC2's
        clock domain) — so a later refactor toward `getMemberStateAt` fails loudly (Trap 1).
- [ ] **Task 6 — Discharge the records, ⛔ do not re-file them**
  - [ ] `deferred-work.md`: **RTBF-D1** discharged · **`:2161`** (N+1) discharged · **`:2163`**
        (keyExtractor) discharged with 11b.2b named as the consumer · **`:2162`** noted as
        touched-and-unchanged. ⛔ Precise closure language ([[feedback_closure_language_precision]]).
  - [ ] ⛔⛔ **DO NOT FILE THE OLD ORDERING CONSTRAINT — IT IS ALREADY IMPOSSIBLE.** An earlier pass
        drafted a standing item reading *"the widening must land BEFORE Epic 9's producer … re-trigger:
        Epic 9's producer landing."* ⭐ **That re-trigger fired at Story 9.4, before this story was
        written.** Filing it would route a **future** watch for a **past** event — ⛔ the RTBF-D1 decay
        pattern re-created inside the story that discharges RTBF-D1.
  - [ ] ⭐ **File instead what is actually true and actually open:** *"`ConfirmedContributorRow` is
        `.strict()` and SDK-parsed from the bundled schema, with no OTA. Epic 9's producer is LIVE, so
        any widening is a real break for stale clients over a real, UNMEASURED population. D3-rollout
        is RE-OPENED pending a posture ruled against measured exposure."* **Re-trigger: the widening
        being scheduled.** ⛔ Not marked closed.
  - [ ] ⭐⛔ **File the STALE-COMMENT finding as its own item** — three shipped files still assert Epic
        9's producer is *"unbuilt"* (`pool-contributor-list.ts:88`, `contribution/read.ts:18`,
        `contribution-notify-triggers.ts:18`), one of them contradicting its own file header at `:7-8`.
        ⭐ **This is what falsely grounded a ruling.** ⛔ Not a cosmetic docs nit.
- [ ] **Task 7 — Close out**
  - [ ] `pnpm --filter @twt/api test` · `pnpm --filter @twt/contracts test` · `pnpm turbo run typecheck`
        · then `pnpm ci:local` green. ⚠ `git push` runs the full `ci:local` via a pre-push hook —
        that is the "hang", ⛔ not a failure.
  - [ ] ⛔ **`friction-budget.md` is NOT touched** — AC-4 is a path trigger over `apps/mobile/` +
        `apps/public/` (`scripts/friction-budget/lib.ts:453`) and this story touches neither. ⚠ **Unless**
        AC4 forces the `PoolContributorList.tsx:40-43` edit — **then it fires and the ledger MUST
        change in the same PR** (see 11b.2b's Task for the shape of that note).
  - [ ] Flip `development_status[11b-2a-contributor-name-resolution-defect]` and add ONE combined
        top-of-file `last_updated` entry ([[project_sprint_status_ledger]]).

---

## ⚖️ Decisions — ✅ **ALL FOUR RULED (BigDev, 2026-08-29).** ⛔ Do not re-litigate.

### ✅ D3 — Fix the RTBF defect here? → **(a) fix it HERE, as its own story.** RULED 2026-08-29.

Fixing it was ⛔ not in the epic's AC for Story 11b.2. ⚠ But **RTBF-D1 is a routed obligation whose
re-trigger already fired once unacted** (`deferred-work.md:3980`), and D9's RTBF half is a standing
constraint assigned by name to 11b.2/11b.3.

**Ground:** this story exists for it; the seam's own header names this consumer; and ⛔ leaving it would
mean 11b.2's presenter ships an anonymized branch that **no producer ever emits** — a vacuous branch
reporting green forever. ⛔ (b) (route to a 3.12 follow-up) was rejected — it would have required
recording the branch as **un-attested** and **correcting RTBF-D1's now-falsified ground in place**,
which is strictly more bookkeeping than fixing it.

⇒ ⭐ **This story is a `[DEFECT]` fix on shipped code, and it may ship independently of — and before —
11b.2.** ⛔ It does not wait on the presenter.

### ⚠ D3-shape — **RULED BigDev 2026-08-29: (i)(a) SHAPE-ONLY + (ii)(a).** ⛔ Do not re-litigate the ruled halves.

⛔ **(i)(a) ruled the union's SHAPE and ⛔ NOT `rowKey`'s derivation — that is D3-key, still OPEN.**
⚠ **(ii)(a)'s clock domain was under-specified and is corrected in AC2** (mirror `getCurrentMemberState`,
⛔ never `getMemberStateAt`).

**(i) The wire shape → (a) DISCRIMINATED UNION.**

```ts
export const ConfirmedContributorRow = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('name'),
    firstName: z.string().min(1),
    lastInitial: z.string().max(16),
    rowKey: z.string().min(1),
  }).strict(),
  z.object({
    kind: z.literal('anonymized'),
    rowKey: z.string().min(1),
  }).strict(),
]);
```

**Ground:** it mirrors `MemberDisplayName`'s own union, makes an illegal state **unrepresentable**, and
forces every consumer to handle both — the property (b) and (c) were rejected for lacking. ⛔ (d) was
rejected because it puts **copy on the wire**, which every presenter in this repo exists to prevent,
and 11b.2's presenter could not then distinguish the marker from a real name.

⚠ ⛔ **THE ROLLOUT POSTURE IS A SEPARATE, STILL-OPEN CLAUSE — SEE D3-rollout. ⛔ Task 2 MUST NOT LAND
THE WIDENING UNTIL IT IS RULED.** The union's own bullet made naming it a condition of choosing (a).

**(ii) The lifecycle state → (a) ONE BATCHED READ.**

A single batched state resolver is added **next to `getMemberStateAt`** in
`packages/domain/src/member/read.ts` — one query over `eventsLog` filtered to the contributor
`streamId` **set**, grouped and replayed per member in memory, returning a
`Map<MemberId, MemberLifecycleState>`. **O(1) round trips in the contributor count.**

**Ground:** (c) was rejected outright — a bounded N+1 of full event-stream replays is still an N+1
(Trap 1). ⛔ (b) (`members.state` join) was rejected because `members.state` is **projector-maintained**
current state, and every other read in this module trusts the **replay**; mixing the two would make the
RTBF guarantee depend on projector liveness, which is exactly the coupling
[[project_member_lifecycle_domain_substrate]] keeps out of the correctness path.

⚠ **Three implementation constraints the ruling carries, ⛔ none optional:**
· ⭐ **Chunk the `streamId` set.** A pool roster is dozens, but the Epic-11b public render is the
  ~10,000-row case; an unbounded `inArray` is a query-plan cliff. Chunk at a **named documented
  constant**, ⛔ not an inline literal — and ⛔ do **not** reuse `DIRECTORY_DECRYPT_CONCURRENCY`
  (a concurrency bound and a chunk size are different quantities that will drift into each other).
· ⚠ **⛔ No dynamic `.limit()`.** The domain limit-clamp gate clamps every dynamic `.limit()`
  ([[project_domain_limit_clamp_and_savepoint_retry]]); this read is set-bounded and takes none.
· ⛔ **The batched read returns state ONLY.** ⛔ It does not decrypt, ⛔ does not join KYC, and ⛔ does
  not take a death overlay — `resolveMemberDisplayName` takes a `MemberLifecycleState` and is blind to
  death **by construction**, and that blindness is **correct here** (Trap 2's table).

### ⛔⛔ D3-rollout — **RE-OPENED 2026-08-29 (third validation pass). ⛔ UNRULED. Its ground is FALSIFIED.**

⛔ **(a) "accept the break, name the window" was ruled on 2026-08-29 and is SUPERSEDED THE SAME DAY —
⛔ by falsification of its ground, ⛔ NOT on its merits.** ⭐ The verdict may well be re-taken; ⛔ it may
⛔ **not** be inherited. The analysis below is preserved **as the record of what was ruled and why it
fell** ([[feedback_supersede_never_reinterpret]]) — ⛔ read it as history, ⛔ not as instruction.

⭐ **What broke it:** the ruling's whole ground was *"Epic 9's `contribution.confirmed` producer is
unbuilt ⇒ population ZERO ⇒ nothing for a stale client to fail on."* **The producer shipped at Story
9.4/9.5** (Preflight evidence table). ⇒ ⛔ **every "zero" and "empty for its whole duration" sentence
below is FALSE**, and the ordering constraint it calls *"load-bearing"* is **unsatisfiable**.

⚠ ⭐ **What a re-ruling owes, ⛔ and it cannot be answered from the repo:** the confirmed-contributor
row count in **live Pariwar databases**. ⛔ It has never been measured
([[feedback_record_unattested_no_backfill]]). ⛔ Do not re-rule on an assumed zero — that is the
identical mistake, one layer down. ⭐ Note the expand/contract option **(b)** rejected below was
rejected *partly* because a total break was cheap at zero population; ⛔ **that arithmetic changes if
the population is not zero, so (b) deserves re-costing, ⛔ not re-rejection by reference.**

<details><summary>⛔ SUPERSEDED — the 2026-08-29 ruling, preserved verbatim as record</summary>

⛔⛔ **The break, stated plainly so the window is honest.** The ruled union is a **hard break for every
stale mobile client, on EVERY row, on EVERY read — ⛔ not only on anonymized rows.** Verified at
`80e0d12`: the SDK bundles `PoolContributorListResponse` from `@twt/contracts` and parses with it
(`packages/api-client/src/index.ts:558-564`), and `ConfirmedContributorRow` is `.strict()` (`:51`). A
stale build carries the **old** schema ⇒ `kind` and `rowKey` are **unknown keys** ⇒ `.strict()` rejects
⇒ **the whole response fails to parse** and the member's contributor list breaks outright until an
app-store update. ⚠ There is **no OTA** (EAS Build → store submission only), and the response is
**MMKV-persisted** in both directions.

⭐ **THE WINDOW, AND IT IS THE WHOLE GROUND OF THE RULING:**
· **Population today: ZERO.** Epic 9's `contribution.confirmed` producer is unbuilt ⇒ there are **0
  confirmed contributor rows** ⇒ ⛔ **there is nothing for a stale client to fail on.**
· **Exposure runs from this merge to the next app-store release**, and is **empty for its whole
  duration** provided the ordering below holds.
· ⛔⛔ **THE ORDERING IS THE RULING'S LOAD-BEARING HALF: the widening MUST land BEFORE Epic 9's
  producer, ⛔ NEVER after.** ⚠ If the producer lands first, the population is no longer zero, the
  ground of this ruling is **falsified**, and the posture must be **re-ruled** — ⛔ it does not carry
  over on its own.

⚠ ⭐ **AND THAT ORDERING MUST OUTLIVE THIS STORY'S MEMORY.** It is exactly the shape that decayed in
RTBF-D1 and in 8.3's D11 — a real obligation with a named trigger that nobody re-read. ⇒ **Task 6
routes it into `deferred-work.md` as a standing ordering constraint with re-trigger = *Epic 9's
`contribution.confirmed` producer landing*, ⛔ not marked closed**, stating that if the producer lands
while the widening is unmerged the posture is **re-opened, ⛔ not inherited**.

⛔ **(b) expand/contract was rejected on verified grounds, ⛔ not on taste** — a tolerant stale client
would ignore `kind`/`rowKey` but the `anonymized` variant **has no `firstName`**, which the old schema
requires (`.min(1)`) ⇒ anonymized rows fail anyway. It converts a total break into a **partial** one at
the cost of two releases **and** of relaxing the `.strict()` teeth the 8.3 contract exists to keep.
⛔ **(c) endpoint versioning was rejected** — no versioning substrate exists; building one for a
zero-row population is SD-1.

</details>

### ⛔ D3-key — **NEW, OPEN. `rowKey`'s DERIVATION was never ruled.** ⛔ Blocks AC5 + Task 2.

**The question:** how is `rowKey` derived, and ⭐ **does the `anonymized` variant derive it the same
way as the `name` variant?**

**Why it is a decision and ⛔ not an implementation detail** — AC5's two requirements conflict:
**stable across the 60s poll** (or it is no better than the `index` it replaces) vs **⛔ must not
re-identify across rows or requests** (a per-member permalink is the enumeration primitive `11a.3`
refuses in terms, `epics.md:4904`). ⭐ Every scheme stable across polls is a deterministic function of
`memberId` — a cross-request pseudonym; a per-response salt inverts the trade.

⛔⛔ **And the RTBF edge is the sharp one:** a deterministic key on the **`anonymized`** variant leaves
a **stable handle on an erased member's row**, in the story whose purpose is erasure.

**Costed options (⛔ none ruled):**
· **(a)** HMAC(`memberId`, per-**pool** salt) — stable within a pool, ⛔ correlatable across requests.
· **(b)** HMAC(`memberId`, per-**response** salt) — ⛔ breaks recycling across polls; AC5's own ground fails.
· **(c)** (a) for `name` rows + a **per-response random** key for `anonymized` rows — ⭐ erasure leaves no
  stable handle; ⚠ anonymized rows recycle worse (⛔ but they are the rare case).
· **(d)** Drop `rowKey` from this story and leave `deferred-work.md:2163` open — ⛔ costs AC5 entirely
  and 11b.2b keeps `index`.

⚠ ⭐ **Whichever is ruled, the ground must state what the key is allowed to reveal to a client that
collects responses over time.** ⛔ An unstated answer is what AC5 currently ships.

### ✅ D4 — Bound the N+1 decrypt here? → **(a) bound it HERE.** RULED 2026-08-29.

The serial per-row decrypt is pre-existing (8.3) and **already routed** at `deferred-work.md:2161` with
a re-trigger that has fired.

⭐⛔ **THE GROUND CHANGED AND THE VERDICT GOT STRONGER, ⛔ not weaker.** The original entry said the loop
*"currently costs nothing (0 confirmed contributors)"*. ⛔ **That is false** — Epic 9's producer is live
(Preflight), so the N+1 KMS decrypt is a **real cost on a real path today**, ⛔ not a forward-looking
one. ⚠ `:2161`'s own re-trigger — *"when Epic 9's producer lands **and** confirmation volume grows"* —
has **half fired by fact and half unmeasured**. ⇒ **D4(a) stands, ⛔ and it is now the load-bearing
half of this story rather than the opportunistic one.**

**Ground:** Task 3 already edits this exact loop, so the marginal cost is small, and 8.3's own comment
at `handlers.ts:306` names Epic 11b as where it bites — *"(the Epic-11b public Sahyog Vivran render is
where it bites, not member-session-gated)"*. ⛔ (b) (defer to 11b.3) was rejected: this story would then
edit the loop and leave the known unbounded cost in place — a *"we were here and did not fix it"*
record — and `:2161` would have its trigger fired **twice** unacted, which is the RTBF-D1 decay pattern
repeating inside the very story that discharges RTBF-D1.

⇒ **AC3 stands as written**: bounded concurrency on the `public-pages` precedent, **one shared exported
constant** (⛔ never a cross-reference comment — 11b.9's review already filed that as insufficient),
per-row fail-soft preserved exactly, ⛔ no plaintext cache at rest, and `deferred-work.md:2161`
**discharged**.

⚠ ⭐ **AC3 and AC2 are now two separate bounds and must not be conflated:** AC2 bounds the **state
replay** (one batched read, D3-shape(ii)(a)); AC3 bounds the **KMS decrypt** (bounded concurrency).
⛔ One constant does not serve both — see AC2's chunk-size warning.

## Dev Notes

- **⚠ The domain contributor read is identities-only, and that is correct.**
  `packages/domain/src/contribution/read.ts:132` `listConfirmedContributorsForPool` →
  `ConfirmedContributor = { memberId }` (`:112-114`). ⛔ Do not push decryption or state into it —
  the boundary decrypts, by design.
- **⚠ `.strict()` + Zod discriminated unions.** D3-shape(i)(a) **is** ruled ⇒ re-test the `.strict()`
  semantics **inside** the union — the existing shape test asserts strictness on a flat object, and
  union-member strictness is a different code path. ⛔ Do not assume it carried.
- **⭐ The `2026-08-28-165` cl.2 masking ruling does NOT apply here.** It is scoped to **account**
  fields on `sahyog-vivran`. ⛔ Do not cite it as authority for anything about contributor names.
- **⚠ `git push` runs the full `ci:local` via a pre-push hook** — the "hang", ⛔ not a failure
  ([[project_friction_budget_baseline_ratchet]]).
- **⚠ `integration-tests` concurrency is `1` and is LOAD-BEARING** — ⛔ never raise it.
- **⚠ Live-DB test gotchas:** ⛔ never regenerate an applied migration (42P07); ⛔ never `DROP SCHEMA`
  (42P01); assert **membership**, not counts ([[project_live_db_test_gotchas]]).
- **⚠ The `governance:` prefix is a real convention (144 commits at `07a5ced`) but formally invalid under the
  checked-in `commitlint.config.js`** — it survives only because commitlint is wired to nothing. Use
  it; the divergence is routed by 11b.2's Task 3.

### Testing

```
pnpm --filter @twt/api test                 # unit
pnpm --filter @twt/contracts test           # the shape tests
pnpm turbo run typecheck                    # ⭐ where Trap 4's root-derivation actually bites
pnpm ci:local                               # before push — integration concurrency 1 is LOAD-BEARING
```

### Project Structure Notes

| Path | New/Update | Note |
|---|---|---|
| `apps/api/src/modules/member-pool/handlers.ts` | UPDATE ✅ `[D3(a) + D4(a) RULED]` | `:309-334`. ⛔ Preserve the three `continue`s and `confirmedCount` semantics **exactly**. ⛔ No death conjunct. |
| `packages/contracts/src/contributions/pool-contributor-list.ts` | ⛔ **BLOCKED** `[D3-rollout re-opened + D3-key unruled]` | The ruled `discriminatedUnion('kind', …)` + `rowKey` on both variants. ⚠ Re-test `.strict()` INSIDE the union. ⚠ ⛔ Grep `lastInitial` and reconcile at the ROOT first (Trap 4). |
| `packages/domain/src/member/read.ts` | **UPDATE** ✅ `[D3-shape(ii)(a) RULED]` | ⭐ **NEW: the batched lifecycle read** → `Map<MemberId, MemberLifecycleState>`, one query, chunked at a named constant. ⛔ None exists today. ⛔ State only; ⛔ no dynamic `.limit()`. ⛔⛔ **Mirrors `getCurrentMemberState` (`:151`) — ⛔ NEVER `getMemberStateAt` (`:127`): no `atTimestamp`, no `occurred_at` bound (Trap 1's clock domain).** |
| `packages/domain/src/member/display-name.ts` | ⚠ **READ-ONLY — reuse** | ⛔ Do not reimplement the `anonymized` branch; ⛔ do not add a death conjunct to it. |
| `apps/api/src/modules/member-pool/contribution-note.ts` · `name.ts` | UPDATE `[Trap 4]` | Re-spellings of the tuple. |
| `apps/mobile/components/contributor-list/PoolContributorList.tsx` | ⚠ **AC4 boundary** | `:40-43`'s local `ConfirmedRow` must derive from the contract. ⛔ If 11b.2b has not landed, add a failing-by-construction lockstep test instead of editing here. ⚠ **Editing this path FIRES friction-budget AC-4.** |
| `apps/api/tests/integration/contributions/pool-contributors-rtbf.spec.ts` | **NEW** | ⛔ `.spec.ts` under `tests/integration/`. ⛔ Not `tests/unit/pool-contributors.test.ts` (DB-free — the wrong-home trap). |
| `packages/ui/**` | ⛔ **NOT TOUCHED** | The presenter is 11b.2's. |
| `packages/contracts/src/public-pages/matrix.ts` | ⛔ **NOT TOUCHED** | No surface or field is declared here. |
| `.decision-log.md` | UPDATE | Task 0. Read the head **live**. |
| `_bmad-output/implementation-artifacts/deferred-work.md` | UPDATE | RTBF-D1 · `:2161` · `:2163` discharged; `:2162` noted. ⛔ Precise closure language. |

### References

- [Source: `apps/api/src/modules/member-pool/handlers.ts:290-340`] — ⭐ the defective loop; `:306` = 8.3's own "where it bites" comment; **`:317`/`:327`/`:332` = the fail-soft `continue`s** (conditions `:312`/`:323-325`/`:330`; rationale comments `:313-315`/`:319-321`); `:398` = the ONLY state load, keyed on the requester
- [Source: `packages/domain/src/kyc/profile-read.ts:24-37`] — ⛔ `getMemberKycProfile` returns **no `state` column** (Trap 1)
- [Source: `packages/domain/src/member/read.ts:127-138`] — ⛔ `getMemberStateAt` is a **full event-stream replay per member**, `occurred_at`-bounded, no `LIMIT` (Trap 1)
- [Source: `packages/domain/src/member/read.ts:151`] — ⭐⛔ `getCurrentMemberState`, the **NO-upper-bound** sibling AC2 mirrors; its doc-block carries the **clock-domain** argument (Trap 1)
- [Source: `packages/domain/src/reconciliation/matcher-write.ts:117` · `apps/jobs/src/boot.ts:635,652` · `packages/domain/src/index.ts:177`] — ⭐⛔ **Epic 9's `contribution.confirmed` producer is LIVE** (Story 9.4/9.5) — what falsified D3-rollout's ground
- [Source: `packages/domain/src/member/anonymize.ts:70,101-113,144`] — the sentinel, `encSentinel`, and the **encrypted** write into `name_ciphertext`
- [Source: `packages/domain/src/kyc/name.ts:25,47-53`] — `SplitName`; the single-token path that lets the sentinel through
- [Source: `packages/domain/src/member/display-name.ts:26,36-39,47-58`] — ⭐ the THREE-kind union; `ANONYMOUS_MEMBER_I18N_KEY`
- [Source: `packages/domain/src/contribution/read.ts:112-114,132`] — `ConfirmedContributor = { memberId }`
- [Source: `packages/contracts/src/contributions/pool-contributor-list.ts:16-22,39,42-51,59-65`] — the shape; ⚠ the `pending` **aggregate** that does exist
- [Source: `apps/api/src/modules/public-pages/handlers.ts:58,67,210,408`] — `DIRECTORY_DECRYPT_CONCURRENCY`; `mapWithConcurrency` def + both call sites
- [Source: `apps/mobile/components/contributor-list/PoolContributorList.tsx:40-43`] — ⛔ the local hand-maintained tuple copy
- [Source: `apps/mobile/components/contributor-list/usePoolContributorsQuery.ts:33`] — SDK Zod validation + MMKV persistence (Trap 3)
- [Source: `packages/api-client/src/index.ts:558-564`] — ⭐ the SDK parses with the **bundled** `PoolContributorListResponse`; why a stale `.strict()` build fails on EVERY row (D3-rollout)
- [Source: `packages/domain/src/member/read.ts:127-138`] — where the batched sibling read lands (D3-shape(ii)(a))
- [Source: `deferred-work.md:2161,2162,2163,3980`] — ⭐ the four routed items this story discharges or notes
- [Source: `11b-9-…md:725-734,762-767`] — ⭐ no OTA / the review window (`:725-734`); ⛔ the cross-reference-comment mechanism already filed as insufficient (`:762-767`)
- [Source: `11b-1-…md:1224-1234`] — ⭐ the fifth-copy finding, both halves (Trap 4)
- [Source: `.decision-log.md#decision-2026-08-24-159` cl.11] — D9(a); *"the right conjunct in the wrong read"*
- [Source: `apps/api/tests/integration/rtbf/rtbf.spec.ts` · `packages/domain/tests/integration/member/rtbf-anonymize.spec.ts`] — how to drive a **real** anonymization
- [Source: `scripts/friction-budget/lib.ts:453`] — `MEMBER_FACING_PREFIXES`; when AC-4 fires

---

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List

### Change Log

| Date | Version | Description | Author |
|---|---|---|---|
| 2026-08-29 | 0.2 | ⛔⛔ **THIRD VALIDATION PASS (`bmad-create-story validate 11b.2a`, at `07a5ced`) — STATUS DROPPED `ready-for-dev` → `blocked-awaiting-decisions`.** Baseline re-pinned `80e0d12` → `07a5ced` (⛔ no verified claim moved: `git diff --name-only` returns four `_bmad-output/` files and nothing else). ⭐⭐ **THE FINDING: D3-rollout(a)'s SOLE GROUND IS FALSE.** *"Epic 9's `contribution.confirmed` producer is unbuilt ⇒ population ZERO"* — the producer **shipped at Story 9.4/9.5** (`sprint-status:12178-12179` both `done`; `matcher-write.ts:117` `appendConfirmedContribution`; `boot.ts:652` registered unconditionally; *"two live emitters since Story 9.4"* in two packages). ⚠ **The false premise was read off STALE Epic-8-era comments** (`pool-contributor-list.ts:88`, `contribution/read.ts:18`) — ⭐ **one of which contradicts its own file header at `:7-8`**. ⇒ D3-rollout **RE-OPENED** (superseded by falsification, ⛔ not reversed on merits); AC4's *"widen BEFORE Epic 9's producer"* ordering is **UNSATISFIABLE**; Task 6's standing item would have routed a **future** watch for a **past** event — the RTBF-D1 decay pattern re-created inside the story discharging RTBF-D1. ⭐ The residual *"zero rows in production"* claim is recorded **UN-ATTESTED** — never measured. **(2)** ⛔⛔ **AC2 named the WRONG state-read sibling.** `read.ts` has two: `getMemberStateAt` (`:127`, `occurred_at`-bounded) and `getCurrentMemberState` (`:151`, unbounded), whose doc-block warns that an **app-clock** bound can disagree with the projector's **DB-clock** replay ⇒ an `rtbf_anonymized` event falling outside the window **renders the erased name** — this story's own defect, reintroduced. AC2 now mirrors `getCurrentMemberState` + a test asserting no `occurred_at` bound. **(3)** ⛔ **NEW decision D3-key** — D3-shape(i)(a) ruled `rowKey`'s SHAPE, ⛔ never its DERIVATION; AC5's *"stable"* and *"must not re-identify across requests"* clauses **conflict**, and a deterministic key on the `anonymized` variant leaves **a stable handle on an erased row**. AC5 + Task 2 BLOCKED; four options costed, ⛔ none ruled. **(4)** ⛔ **Every `continue` line number was wrong** — `:313`/`:326`/`:331` → **`:317`/`:327`/`:332`** (conditions `:312`/`:323-325`/`:330`; comments `:313-315`/`:319-321`, ⛔ not `:322-324`). 11b.2's re-validate fixed this family at `07a5ced` but that commit ⛔ never touched this file. **(5)** AC3 shared only the CONSTANT — ⚠ `mapWithConcurrency` (`public-pages/handlers.ts:67`) is **equally module-private** and carries the load-bearing input-order behaviour ⇒ **both** are extracted. **(6)** *"§4.4 **governs** it"* → **SPEAKS to but governs nothing** (unratified; ranked below a Deed clause that itself binds nothing) — the obligation discharged here is **statutory + ratified**, ⛔ neither needs §4.4. **(7)** Trap 4's grep returns **~20 files** against a **10-row** table ⇒ the out-of-scope classes are now named (the 8.2 `deceasedLastInitial` family + the `splitFirstNameLastInitial` producer/tests). Citation corrections: `11b-9-…md:753-757` → **`:762-767`** · `getMemberStateAt` is `occurred_at`-bounded, ⛔ not *"unbounded"* · `resolveMemberDisplayName` has **no `dist/` reference** (the zero-production-call-sites half is CONFIRMED) · `governance:` 142 → **144**. ⭐ **Verified clean:** the entire defect trace line-by-line, Trap 1's no-`state`-column claim, the mobile local `ConfirmedRow:40-43`, the SDK parse site, all four `deferred-work.md` anchors, `friction-budget/lib.ts:453`, decision-log head `2026-08-28-167`, the commitlint-unwired claim, the death-vs-RTBF table against `epics.md:4906`, and `tests/integration/contributions/` as a valid home. | BigDev + Claude |
| 2026-08-29 | 0.1 | **Split out of Story 11b.2 by the validation pass at `80e0d12`.** Carries the live RTBF contributor-name defect, the decrypt bound, the wire widening and the stable row key. ⭐ Findings applied at authoring: **(1)** ⛔ *"nothing had recorded it"* is **false** — **RTBF-D1** (`deferred-work.md:3980`) recorded the unwired seam and its re-trigger **fired at Story 8.3**; this story **discharges** it rather than claiming novelty. **(2)** ⛔⛔ *"the boundary already loads the member"* is **false** — `getMemberKycProfile` returns no `state` and `getMemberStateAt` is a **full event-stream replay per member**, so the naive fix is an N+1 **worse** than the one AC3 bounds ⇒ new **D3-shape(ii)** and **AC2**. **(3)** The anonymized wire shape was **entirely unspecified** ⇒ **D3-shape(i)** with four costed options. **(4)** Widening a `.strict()` **response** breaks every stale mobile client — **no OTA**, SDK-validated, **MMKV-persisted** ⇒ Trap 3 + an explicit rollout-posture AC. **(5)** *"must not silently `continue`"* re-scoped to the anonymized case only — three existing integrity `continue`s preserved verbatim. **(6)** The resolver returns **THREE** kinds; `unknown` gets an exhaustive throwing check recorded un-attested. **(7)** Trap 4 now names the working grep (`lastInitial`), all seven re-spellings, and 11b.1's **two** load-bearing halves (root-derivation + exercise-the-variant). **(8)** AC3's drift mechanism changed from a cross-reference comment — **already filed as insufficient by 11b.9's review** — to one shared constant. **(9)** **AC5 added**: `deferred-work.md:2163`'s keyExtractor re-trigger has fired by name and this is the only story that can supply the stable key it lacks. **(10)** AC6 given a real home, the two real-anonymization precedents, and the exercise-the-variant fixture rule. **(11)** Task 0 is **TRANSCRIBE-or-STOP**. | BigDev + Claude |
