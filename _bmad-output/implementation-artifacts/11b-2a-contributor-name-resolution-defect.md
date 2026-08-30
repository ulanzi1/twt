---
baseline_commit: 3a51745
---

# Story 11b.2a: Contributor Erasure — RTBF defect fix (D5: OMIT the row) + decrypt bound `[DEFECT]`

Status: ready-for-dev

> ⭐⭐ **FINAL RULING (BigDev, 2026-08-30) — D5: RTBF REMOVES THE CONTRIBUTOR ENTIRELY. ⛔ NO ANONYMIZED
> ROW IS EMITTED.** The erased member's public contributor representation **disappears**; ⛔ it is ⛔ not
> replaced by a marker, a placeholder or a `rowKey`. ⭐ **This is PUBLIC ERASURE, ⛔ not destruction of
> the underlying legal record** — legally-required records persist in restricted internal systems and
> ⛔ are never used to restore the public representation.
>
> ⭐⭐ **AND IT SIMPLIFIES THE STORY DRAMATICALLY.** With omission there is only ONE kind of row ⇒ the
> discriminated union, the `rowKey` and the whole `.strict()` wire widening **cease to exist as
> questions**. ⇒ ✅ **D3-shape(i) · D3-key · D3-rollout are all VACATED** — ⛔ their questions ceased to
> exist, ⛔ they were ⛔ not reversed on their merits (`2026-08-24-159`'s "D4(a) was VACATED by D1(b)"
> precedent). ⛔ **THE STORY HAS NO WIRE CHANGE AND THEREFORE NO ROLLOUT RISK.**
>
> ⭐ **The ruling is a CONSISTENCY correction, ⛔ not a new posture.** `directory-read.ts`'s
> `DIRECTORY_VISIBLE_MEMBER_STATES` (`2026-08-20-143` cl.3, D3(a)) **already OMITS `anonymized`** from
> the public member directory. ⇒ the contributor list was **the outlier**, and this brings it into line.
>
> ✅ **AND EVERY REMAINING QUESTION IS NOW RULED (BigDev, 2026-08-30). ⛔ NOTHING IS GATED.**
> · **D3-aggregate** — the RTBF-omitted contributor **still counts** in `confirmedCount` and every
>   aggregate representing **confirmed historical transactions**. ⭐ **Contribution state: `CONFIRMED`
>   · Public representation: `OMITTED`.** ⇒ ⛔ **this story changes NO aggregate; only `rows` shrinks.**
> · **D5 scope** — ⛔ **not** "public vs member-gated". The contributor list is a **product on BOTH
>   surfaces**; D5 applies **wherever the contributor list is rendered**. ⇒ it binds **11b.2, 11b.2b
>   and 11b.3** too.

> ✅⭐ **FOURTH VALIDATION PASS (`bmad-create-story validate 11b.2a`, at `3a51745`) — TWO NEW
> DECISIONS RAISED AND ⭐ **BOTH RULED BY BigDev THE SAME DAY**. ✅ STATUS `ready-for-dev`.
> ⛔ NOTHING IS GATED.**
>
> ✅ **Baseline re-pinned `07a5ced` → `3a51745`, and ⛔ NO VERIFIED CLAIM MOVED** — `git diff
> --name-only 07a5ced..3a51745` returns **two `_bmad-output/` files and nothing else**.
> ⭐⭐ **THE FIX ITSELF IS UNTOUCHED. D5 · D3-shape(ii)(a) · D3-aggregate · D4(a) · D5-scope were all
> re-verified line-by-line and STAND. ⛔ Tasks 0/1/3/4 remain fully startable** — the whole RTBF
> omission plus the decrypt bound. What this pass found is that **D5's blast radius OUTSIDE this diff
> was under-recorded**, in two places that are live TODAY:
>
> · ✅⭐ **D6 → (a) DROP THE ANONYMIZED PRESENTER VARIANT.** The finding: 11b.2 is `ready-for-dev` and
>   its **AI-10-1 Policy-meaning note** states superseded policy in terms (`11b-2-…md:76-77`: *"An
>   `anonymized` member renders the ratified 'an anonymous member' marker"*) — ⭐ the one note the whole
>   AI-10-1 mechanism exists to put in front of the dev agent, with its Task 1 marked `startable`.
>   ⇒ **RULED: ⛔ no producer may emit an anonymized contributor row, so the contributor row has exactly
>   ONE kind — wire, presenter, render layer, tests.** ⛔ The unreachable branch is ⛔ **not** preserved
>   as defense-in-depth. ⭐ **This HONOURS D3(a)'s own ground** (*"a vacuous branch reporting green
>   forever"*). Task 6 routes all six 11b.2 artefacts by line.
> · ✅⭐ **D7 → (c) FIX AT THE SURFACE.** The finding, arithmetic and live at `3a51745`: a pool of 3 with
>   **exactly one** confirmed contributor, and that member RTBF'd ⇒ `rows` is `[]` ⇒ the app renders
>   *"No confirmed contributions yet."* directly beside *"2 pending confirmation (67%)"* — ⛔ **0 + 2 ≠ 3**,
>   and the 8.2 card on the sibling screen simultaneously says *"1 of 3"*.
>   ⇒ **RULED: ⛔ `confirmedCount` / `rosterSize` / `pending` and their financial semantics are UNTOUCHED,
>   ⛔ no new financial or status state is introduced — the empty-state copy describes THE LIST'S
>   REPRESENTATIONAL STATE instead of asserting that nothing was confirmed.** ⭐ **AC8** carries the
>   verbatim strings in both locales. ⭐⭐ **And the ruled change is a VALUE re-word of an existing key:
>   ⛔ no new key, ⛔ no code change, ⛔ no wire change, ⛔ no `apps/mobile/` edit** — so ⛔ the `.strict()`
>   stale-client hazard stays dissolved and ⛔ friction-budget AC-4 still does not fire.
>
> ⚠ ⭐ **AND ONE CORRECTION THAT IS ⛔ NOT A DECISION: the stale-comment finding is under-scoped by
> ~4×, and it misses the file in this story's OWN diff.** Task 6 named three files; the live family is
> **~12 source sites**, including `handlers.ts:296` / **`:304`** / `:339` — and `:304` is the
> **DECRYPT-COST SEAM comment AC3 exists to discharge**, which Task 4 edits. Task 6 is corrected below.

> ⭐⛔ **THIS STORY EXISTS BECAUSE A VALIDATION PASS FOUND A LIVE, USER-VISIBLE DEFECT ON SHIPPED
> CODE.** It was split out of Story 11b.2 on 2026-08-29 because it is a different risk class from a
> headless presenter: it edits a shipped API handler, widens a `.strict()` wire contract consumed by
> an already-released mobile build, and needs a live-DB integration test.
>
> ⭐ **It is independent of the presenter and of the mobile rewire. If capacity is scarce, ship this
> FIRST** — a Hindi reader currently sees the English token `[anonymized]` where a person's name
> belongs.

## ✅ PREFLIGHT — the dev agent's first action

⭐ **Ruled and STANDING:**
· **D5 (BigDev, 2026-08-30) — ⭐ THE GOVERNING RULING.** RTBF **removes the contributor entirely** from
  the contributor surface. ⛔ No anonymized row, ⛔ no marker, ⛔ no placeholder key. **Public erasure,
  ⛔ not destruction of the legal record.**
· **D3(a)** — fix the RTBF defect **here**, as its own story.
· **D3-shape (ii)(a)** — **one batched** state read. ⭐ **SURVIVES D5 and is now MORE central** — you
  still need each contributor's lifecycle state to know **whom to omit**.
· **D4(a)** — **bound** the N+1 decrypt here (RE-RULED on the corrected ground).

⛔ **VACATED BY D5 — ⛔ their questions ceased to exist; ⛔ they were NOT reversed on merits:**
· **D3-shape(i)** (the discriminated union) · **D3-key** (the `rowKey` derivation) · **D3-rollout**
  (the stale-client break). ⭐ **With omission there is one kind of row ⇒ ⛔ no wire change at all.**

· **D3-aggregate (2026-08-30)** — the omitted contributor **STILL COUNTS** toward `confirmedCount` and
  every aggregate whose semantics are **confirmed historical transactions**. ⛔ RTBF does ⛔ not
  retroactively alter that a contribution was confirmed. ⇒ ⛔ **no aggregate changes in this story.**
· **D5 scope (2026-08-30)** — D5 applies **wherever the contributor list is rendered**, on the
  member-session-gated surface **and** the public one. ⛔ The public/member-gated framing is rejected.

· **D6(a) (BigDev, 2026-08-30)** — ⛔ **no producer may emit an anonymized contributor row** ⇒ the
  contributor row has **exactly ONE kind**, and 11b.2's presenter carries ⛔ **no `anonymized` variant**.
  ⛔ The unreachable branch is ⛔ **not** kept as defense-in-depth.
· **D7(c) (BigDev, 2026-08-30)** — ⛔ **fix at the SURFACE.** ⛔ `confirmedCount` / `rosterSize` /
  `pending` and their financial semantics are **untouched**; ⛔ ⛔ no new financial or status state.
  ⭐ **AC8**: the empty-state copy describes the list's representational state, in both locales.

✅ **ALL DECISIONS ARE RULED. ⛔ Nothing is gated. Start at Task 0.**

⛔ **Task 0 TRANSCRIBES those rulings into `.decision-log.md`. It does ⛔ NOT author them, ⛔ not
paraphrase them, and ⛔ not supply a ground.** ⚠ If any decision below has been edited back to UNRULED,
**STOP and report blocked** ([[feedback_supersede_never_reinterpret]]).

⛔⛔ **THAT PRECONDITION WAS CHECKED LIVE, AND IT FAILED. THE PRODUCER HAS LANDED.** D3-rollout(a)
rested entirely on the confirmed-contributor population being **zero**, derived from *"Epic 9's
`contribution.confirmed` producer is unbuilt."* ⭐ **That premise is FALSE and was false when written.**
Verified at `07a5ced`:

| Evidence | What it says |
|---|---|
| `sprint-status.yaml:12317-12318` | `9-4-utr-matching-engine…: done` · `9-5-…contribution-confirmed-as-canonical-financial-truth: done` |
| `packages/domain/src/reconciliation/matcher-write.ts:116` | `appendConfirmedContribution()` — the live append |
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
I want to be genuinely gone from the contributor list — ⛔ not renamed, ⛔ not marked, ⛔ not left as a
placeholder someone can point at — so that the erasure I asked for is the erasure I actually got, in
both languages, on every surface, while the records the Trust must keep stay where only the Trust can
see them.

---

## 📜 Policy meaning (AI-10-1, CONFIRMED BigDev 2026-08-18)

**This story introduces ⛔ NO predicate that gates a member's access to a benefit.** It changes how an
already-decided contributor row is **displayed**. ⛔ Nothing in it may be read by, joined into, or
referenced from an eligibility, validity, assignability, pool-assignment or claim path.

⚠ **It DOES introduce one render predicate over a member's own identity, and D5 CHANGED IT — the
statement below is the D5 version and ⛔ supersedes the masking version:**

**Predicate — *"does this member's ROW appear on the contributor list at all?"*** ⛔ **Not** *"which
name renders"* — that was the pre-D5 predicate and it is superseded. The row appears iff the member's
lifecycle state is **not `anonymized`**; an `anonymized` member is **omitted entirely**.

**In the member's terms:** *"if you exercised your right to erasure, you disappear from the contributor
list — not as 'an anonymous member', but simply not there. If you did not, your name appears exactly as
it always did."*

✅ **AND THE AI-10-1 SECOND HALF IS RULED — the predicate is PURELY PRESENTATIONAL and ⛔ reaches no
benefit or accounting path.** Omission changes **how many rows render**; D3-aggregate ruled that it
changes ⛔ **no aggregate**: the erased member still counts toward `confirmedCount` and every measure
representing **confirmed historical transactions**. ⇒ ⭐ **two axes, ⛔ never subtracted from each
other** — *Contribution state: `CONFIRMED` · Public representation: `OMITTED`*.
⚠ ⛔ **The one way this predicate COULD become an accounting change is if someone merges the two axes
under the shared name `rosterSize`** — which silently **understates confirmation**. ⛔ That is forbidden
by D3-aggregate cl.(2) and routed as a standing hazard in Task 6.

⭐⭐ **AND D7(c) ADDS ⛔ NO SECOND PREDICATE — stated explicitly, because an absent note is
indistinguishable from an unasked question (AI-10-1).** AC8 is an **unconditional value re-word of one
i18n key**: ⛔ no branch, ⛔ no condition, ⛔ no new state, ⛔ nothing reads it back. ⇒ the predicate
above remains **the only one this story introduces**, and it is still purely presentational.
⚠ ⭐ **The rejected D7 alternatives WOULD have added one** — a *"why is this list empty"* discriminator
is a second predicate over a member's erasure, on the wire. ⛔ That is one more reason they were
rejected.

**Checked against the Niyamavali:** ⚠ **§4.4 SPEAKS to it but ⛔ GOVERNS NOTHING** (*"public rendering
of any personal information is consent-gated and never default opt-in"* — `.decision-log.md:902`), and
the distinction is ⛔ not pedantry: the Niyamavali is **agent-drafted and UNRATIFIED**
([[feedback_niyamavali_rulebook_not_spec]]), and `friction-budget.md:44` ranks it **below** Trust Deed
cl.15(c), which ⭐ itself binds nothing ([[project_legal_corpus_private_repo_split]]). ⇒ cite §4.4 as
**alignment, ⛔ never as authority**. ⭐ **The obligation this story actually discharges is STATUTORY
(DPDPA erasure) — ⛔ it does not need §4.4.** ⚠ ⭐ **And under D5 the ratified `member.anonymousMember`
copy is ⛔ NO LONGER the remedy either** — it was the pre-D5 answer, and D5 replaced masking with
omission. On that footing the story moves the build INTO compliance: today the erased member's row
renders the raw `'[anonymized]'` sentinel where a name belongs, and under D5 it must ⛔ not render
**at all**. ⚠ The **positive** half (on what authority a contributor's name renders publicly at all)
is ⛔ not this story's; 11b.3 owns it.

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
`getCurrentMemberState` (`read.ts:150`) is the **NO-upper-bound** variant, and its own doc-block states
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

⛔ **Removing them turns three per-row degradations into a whole-response failure.**
⚠ The three existing `continue`s are preserved **verbatim, with their comments**.

⭐⭐ **AND D5 INVERTS THE OTHER HALF OF THIS TRAP — READ THIS, THE OLD TEXT SAID THE OPPOSITE.** An
earlier pass wrote *"the anonymized case must NOT `continue`"*. **D5 rules the reverse: the anonymized
case MUST be omitted.** ⇒ this story **adds a FOURTH skip**, deliberately, and it is ⛔ **not** an
integrity degradation like the other three — it is the **ruled erasure behaviour**. ⚠ ⭐ **Give it its
own comment saying so**, so a later reader ⛔ cannot mistake it for a fail-soft and ⛔ cannot "fix" it
by restoring a row.
⛔⛔ **But whether the omitted member still counts toward `confirmedCount` is D3-aggregate and is
⛔ NOT ruled** — the other three skips deliberately DO still count (`:313-315`'s comment says so in
terms). ⛔ Do not copy that posture by default; ⛔ do not invent the opposite either.

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

⚠ ⭐ **THE GREP RETURNS 16 FILES (verified live at `3a51745`); THIS TABLE IS THE ~10 THAT ARE THE CONTRIBUTOR-ROW TUPLE. ⛔ THE
REST ARE DELIBERATELY OUT OF SCOPE, AND YOU MUST NOT "RECONCILE" THEM:** the 8.2 `deceasedLastInitial`
family (`active-contribution-card.ts:24`, `yogdaan-bahi/sample-data.ts:18,50,58`,
`note-template.ts:82-83`), and the `splitFirstNameLastInitial` **producer + its consumers + their tests**
(the PRODUCER is `kyc/name.ts:47`; `kyc/public-name.ts:78-99` is a **CONSUMER**, ⛔ not the producer —
an earlier pass labelled it one; plus `tests/kyc/public-name.test.ts`, `tests/unit/member-pool.test.ts:14-40`).
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

### AC1 — The RTBF defect is FIXED: the erased contributor is ⛔ ABSENT from the wire ✅ `[D3(a) + D5 RULED]`

`handlers.ts:309-334` **OMITS every `anonymized` contributor from `rows` entirely** — ⛔ no marker,
⛔ no placeholder, ⛔ no decrypted `'[anonymized]'` sentinel, ⛔ no row of any kind.

⭐⭐ **AND THE OMISSION HAPPENS BEFORE THE DECRYPT, ⛔ NOT AFTER — this is the whole shape of the fix.**
The state is already in hand from AC2's batched map, so an erased member is skipped **without ever
decrypting their name**. ⇒ ⭐ **strictly less Tier-1 plaintext is materialised than today**, and it
composes with AC3: fewer rows reach the bounded decrypt. ⛔ Do ⛔ not decrypt-then-discard.

**And** ⭐ **the skip carries its OWN comment marking it as the D5 erasure behaviour**, ⛔ explicitly
distinguished from the three integrity `continue`s beside it — a later reader must ⛔ not mistake it
for a fail-soft and "repair" it by restoring a row (Trap 2).
**And** ⛔ **`resolveMemberDisplayName` is NOT called** — D5 makes the contributor path an **omission**
question, ⛔ not a display-resolution one. ⚠ ⭐ **Consequence to record, ⛔ not to hide:** that seam
still has **zero production call sites** after this story, so **RTBF-D1 is ⛔ NOT discharged here** —
see Task 6, which re-dispositions it precisely.
**And** ⭐⭐ **`confirmedCount`, `computePendingAggregate` and the 8.2 meter are ⛔ NOT TOUCHED — D3-aggregate
RULED that the omitted contributor STILL COUNTS.** *Contribution state: `CONFIRMED` · Public
representation: `OMITTED`.* ⇒ ⛔ **the ONLY thing that shrinks is `rows`.** ⛔ Do ⛔ not subtract the
omitted member from any aggregate, ⛔ do not recompute `pool.rosterSize`, and ⛔ do not "reconcile"
`rows.length` with `confirmedCount` — ⭐ **their divergence is the RULED, CORRECT state**, exactly as it
already is for the three integrity skips (`:313-315`).
⚠ ⭐ **BUT THE DIVERGENCE HAS A BOUNDARY NOBODY COSTED, AND IT IS `[D7, OPEN]`.** When `rows` reaches
**ZERO** while `pending` does not, the shipped surface renders *"No confirmed contributions yet."*
beside *"N−1 pending"* — ⛔ **a member-visible sentence about money that is false on a reachable path.**
⛔ It changes ⛔ **nothing** in this AC: ⛔ still no aggregate is touched, ⛔ still no `rows.length ===
confirmedCount` reconciliation. ⭐ **D7 decides only what the SURFACE says**; ⛔ ⛔ do ⛔ not pre-empt it
in the handler, and ⛔ **never** by making `pending` representation-aware (D7(b), forbidden).
⚠ The three **existing** integrity `continue`s at **`:317` / `:327` / `:332`** are preserved
**verbatim with their comments** (Trap 2's corrected table).
**And** ⛔ the fix adds **no** death-derived conjunct anywhere.

### AC2 — The lifecycle state is loaded in BOUNDED work, ⛔ never one replay per row ✅ `[D3-shape(ii)(a) RULED]`

⛔ **`getMemberStateAt` is NOT called per contributor row** (Trap 1). A **batched state resolver**
lands in `packages/domain/src/member/read.ts` — one `eventsLog` query over the contributor
`streamId` **set**, grouped and replayed per member in memory, returning
`Map<MemberId, MemberLifecycleState>` — and a test asserts the number of state-resolution round trips
is **O(1) in the contributor count**, ⛔ not O(n).

⛔⛔ **AND IT MIRRORS `getCurrentMemberState` (`read.ts:150`), ⛔ NEVER `getMemberStateAt` — THE CLOCK
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

### AC3 — The decrypt cost is BOUNDED ✅ `[D4(a) RE-RULED on the corrected ground]`

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

### AC4 — ⛔ **VACATED BY D5.** The wire does ⛔ NOT change. `[D3-shape(i) + D3-rollout VACATED]`

⛔⛔ **DO NOT WIDEN `ConfirmedContributorRow`. DO NOT ADD `kind`. DO NOT ADD `rowKey`.**

D5 removes the erased contributor's row entirely ⇒ there is exactly **ONE** kind of contributor row, so
the discriminated union has **nothing to discriminate**. ⭐ **The question ceased to exist; it was ⛔ not
answered in the negative** (`2026-08-24-159`'s *"D4(a) was VACATED by D1(b) … ⛔ (a) did not become
wrong, its QUESTION ceased to exist"*, the precedent for this closure language
[[feedback_closure_language_precision]]).

⭐⭐ **AND THIS IS THE STORY'S BIGGEST WIN:** with no wire change there is **no `.strict()` break**, so
⛔ no stale-client hazard, ⛔ no OTA problem, ⛔ no MMKV-cache problem, ⛔ no rollout window to price and
⛔ nothing for D3-rollout to rule. **A live RTBF defect now ships behind ⛔ zero contract risk.**

⚠ `deferred-work.md:2162` (`lastInitial` `.max(16)` doesn't structurally guarantee initial-only) is
**noted as touched-and-unchanged** — ⛔ the schema is not opened at all now, so it is ⛔ not silently
fixed and ⛔ not silently ignored.

⚠ ⭐ **Trap 4 (the seven hand-maintained tuple re-spellings) is therefore ⛔ NOT exercised by this
story** — ⛔ nothing derives from a widened contract, so ⛔ no lockstep reconciliation is owed here.
⛔ **Do not do it opportunistically.** It survives as the standing hazard the moment ANY story widens
this tuple; Task 6 keeps it visible.

### AC5 — ⛔ **VACATED BY D5 and DESCOPED.** No `rowKey` ships here. `[D3-key VACATED]`

⛔⛔ **DO NOT ADD `rowKey`.** D5 removes the anonymized row, so the `anonymized`-variant key question —
the whole of D3-key — ⛔ ceases to exist, and yesterday's D3-key(c) ruling is **VACATED with it**
(⛔ not reversed: it was correct for the union D5 abolished).

⭐⭐ **AND THE DESCOPE IS THE POINT, ⛔ not a loss.** `rowKey`'s only surviving justification was
`deferred-work.md:2163`'s FlashList `keyExtractor` churn — a **VIRTUALIZATION-PERFORMANCE** concern
that has ⛔ nothing to do with RTBF. Keeping it here would:
· re-introduce the **only** `.strict()` wire widening in the story ⇒ resurrect the stale-client break
  and D3-rollout **that D5 just dissolved**; and
· **couple a live, user-visible RTBF defect to an unresolved rollout decision** — ⛔ exactly the
  coupling this story was split out of 11b.2 to avoid.

⇒ ⭐ **`rowKey` moves OUT. `deferred-work.md:2163` stays OPEN** and is re-dispositioned in Task 6 with
its blocker **restated correctly**: its recorded blocker was *"the PII-shielded shape carries no stable
per-member identifier"*, and ⛔ that is still true — D5 did ⛔ not supply one. ⛔ **Do NOT mark `:2163`
discharged**; ⛔ do not name 11b.2b as a consumer of a key that no longer ships.

⚠ ⭐ **And 11b.2b must be told**, because it was written expecting this key: its `:164` says
`` `${firstName}-${lastInitial}-${index}` `` *"is replaced by 11b.2a's ruled `rowKey`"* — ⛔ now false.
**11b.2b keeps `index` in its `keyExtractor`** until a separate story supplies a stable key. Task 6
routes the correction.

### AC6 — It is proven end-to-end over a REALLY-anonymized member ✅ `[D3(a) + D5 RULED]`

An integration test at **`apps/api/tests/integration/contributions/pool-contributors-rtbf.spec.ts`**
drives a real anonymization and asserts the member is **GONE from the wire**.

⭐⭐ **THE ASSERTIONS INVERT UNDER D5 — an earlier pass asserted the marker was PRESENT; assert ABSENCE:**
· the erased member's row is **⛔ absent from `confirmed[]` entirely** — ⛔ no `firstName`, ⛔ no marker,
  ⛔ no `member.anonymousMember`, ⛔ no `'[anonymized]'`, ⛔ no placeholder of any shape;
· ⭐ **the response contains the sentinel string NOWHERE** — assert on the **serialized JSON**, ⛔ not
  on a parsed field, so a leak through any new field is caught;
· ⚠ **the OTHER contributors are untouched** — same names, same order, ⛔ no shifted or dropped peers.

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

### AC7 — ⭐ THE RTBF NOTICE IS CORRECTED — but ⛔ NOT WRITTEN HERE `[D5, routed]`

⛔⛔ **D5 FALSIFIED SHIPPED, USER-FACING COPY IN BOTH LOCALES — and it is copy that promises exactly the
behaviour D5 abolishes.** Verified live in `packages/i18n/locales/{en,hi}/common.json`:

| Key | Ships today (en) | Under D5 |
|---|---|---|
| `rtbf.entry_hint` (`:217`) | *"Your contribution history stays on record, **without your name**."* | ⛔ **FALSE** — the row is gone, not renamed |
| `rtbf.ack_body` (`:219`) | *"Your contribution history stays on record **as "an anonymous member"**, so the trust's accounts remain complete."* | ⛔ **FALSE** — ⭐ and it names the very marker D5 removes |
| `rtbf.done_body` (`:227`) | *"We have removed your personal details from our records. **Your contribution history remains, without your name.**"* | ⛔ **FALSE on the second half**, ⚠ and **imprecise on the first** — D5 says legally-required records **DO** remain internally |

⚠ The Hindi rows (`:217`/`:219`/`:227`) carry the same three claims and fall the same way.

⭐ **The three statements D5 requires the notice to make** — recorded here verbatim so the owning story
builds from the ruling, ⛔ not from a paraphrase:
1. identifying information + the public contributor representation are **removed from public-facing
   surfaces**;
2. the contribution / claim and other applicable public representations are **no longer publicly
   displayed**;
3. records the Trust is **legally required to retain** remain in **restricted internal systems** for the
   applicable statutory/regulatory retention period, and are ⛔ **never used to restore the public
   representation**.

⛔⛔ **THIS AC IS DISCHARGED BY ROUTING, ⛔ NOT BY EDITING `common.json`. THREE REASONS, EACH SUFFICIENT:**
· ⭐ **It is a STATUTORY claim.** Naming a *"retention period"* to a member is legal text. This repo
  routes counsel's wording through the **Story 2.4 amendment workflow + a NON-AUTHOR tone-review
  sign-off**, ⛔ never a direct edit (`2026-08-28-161` precedent). Adv. Mohit Agrawal is engaged
  ([[project_dpdpa_counsel_engaged_but_unrecorded]]).
· ⚠ **The copy is ⛔ not this story's surface.** It belongs to the RTBF flow (Story 3.12 / the
  member-data-rights module), which this story does ⛔ not otherwise touch.
· ⛔⛔ **AND ONE STATEMENT MUST BE CHECKED AGAINST THE BUILD BEFORE IT IS PROMISED.** Statement 3 says
  retained records persist. ⚠ ⭐ **But `anonymize.ts:144` OVERWRITES `name_ciphertext` with an
  encrypted `[anonymized]` sentinel — the member's NAME is DESTROYED, ⛔ not retained.** What survives
  is the **financial/contribution trail keyed by `member_id`**. ⇒ the notice must be precise about
  **WHICH** records are retained; ⛔ a member reading statement 3 as *"they still hold my name"* would
  be **misled**, and the build cannot honour that reading.

⇒ **Task 6 files the routing packet** naming: the three statements, the six falsified keys (3 × 2
locales), the `anonymize.ts:144` name-destruction fact, and the microcopy-gate + tone-review
obligations. ⛔ **No `common.json` edit lands in this story's diff.**

### AC8 — The empty-state copy stops making a confirmation claim ✅ `[D7(c) RULED]`

⭐ **`contributor_list.empty` is RE-WORDED IN BOTH LOCALES.** ⛔ **No new key is minted, ⛔ no code
changes, ⛔ nothing on the wire moves.** The key's ⛔ only consumer is `PoolContributorList.tsx:124`
and ⛔ **no test pins its value**, so the value edit is the whole change.

⭐⭐ **THE RULED STRINGS, VERBATIM — ⛔ transcribe them, ⛔ do not paraphrase, ⛔ do not "improve" them**
(the AC7 discipline, applied here because copy that is re-derived is copy that drifts):

| Key | Ships today | ⭐ Under D7(c) |
|---|---|---|
| `contributor_list.empty` (en, `contribution.json:31`) | *"No confirmed contributions yet."* | ⭐ **"No contributor names to show right now."** |
| `contributor_list.empty` (hi, `contribution.json:31`) | *"अभी तक कोई पुष्ट अंशदान नहीं।"* | ⭐ **"अभी दिखाने के लिए कोई योगदानकर्ता नाम नहीं है।"** |

⭐ **Why these words.** They state a fact about **the list** and make ⛔ **no claim about
confirmation** — true when nothing is confirmed **and** true when confirmations exist but none is
representable, ⭐ **so no branch, no discriminator and no inference is needed.** `योगदानकर्ता` is the
register already used by this screen's own CTA (`view_cta` / `view_cta_a11y` / `view_cta_hint`,
`contribution.json:37-39`), so ⛔ no new vocabulary enters the surface.

**And** ⛔ **the pending strip is ⛔ NOT touched.** ⭐ It already owns the confirmation claim
(*"{count} pending confirmation ({percentage}%)"*, server-computed, ⛔ unaffected by D5) ⇒ ⛔ **no
information is lost** — it simply stops being asserted twice, once wrongly.

**And** ⛔ **⛔ NO new financial or status state is introduced for RTBF omission** — ⛔ no
`omittedCount`, ⛔ no `hasHiddenContributors`, ⛔ no reason code, ⛔ no field of any kind.
⛔⛔ **A server-emitted reason field is FORBIDDEN BY NAME:** `AssignedPoolContributorList` is
`.strict()` (`pool-contributor-list.ts:98`) and the SDK parses with the **bundled** schema
(`api-client:558-564`) ⇒ ⭐ **it would break every read on every stale client — Trap 3 and D3-rollout
resurrected in full**, in the story whose headline win is *"no wire change."*

**And** the two review layers **both** apply, ⛔ neither substitutes for the other
(`docs/tone-guide.md §5`, verbatim: *"automated lint passing does not substitute for a recorded human
tone-review sign-off"*):
· ✅ `pnpm microcopy:check` — `packages/i18n/locales/{en,hi}/contribution.json` **is** in the gate's
  `copy_globs` (`microcopy.yaml`), so the vocabulary register, the tone prohibitions and the numeral
  rule all bite these strings. ⭐⭐ **PRE-VERIFIED at authoring: both strings were run against the LIVE
  `microcopy.yaml` through the same regex engine the gate uses (Node, ⛔ not Python — several tone
  patterns use variable-width lookbehind that Python's `re` cannot even compile) ⇒ ⭐ ZERO findings**
  across every vocabulary term, every tone pattern and both numeral rules. ⚠ ⛔ **That is a pre-check,
  ⛔ not a substitute — run the gate.**
· ⚠ ⭐ **A NON-AUTHOR tone-review sign-off is recorded** (`docs/tone-review-checklist.md`).
⛔⛔ **AND THIS IS ⛔ NOT THE AC7 PATH.** AC7 routes **statutory** copy through counsel + the Story-2.4
amendment workflow. ⭐ This is **ordinary product microcopy** on a surface this story already owns.
⛔ Do ⛔ not route it through counsel; ⛔ do not let it wait on AC7.

**And** ⭐ **friction-budget AC-4 still does ⛔ NOT fire — and that was CHECKED, ⛔ not assumed.**
`MEMBER_FACING_PREFIXES = ['apps/mobile/', 'apps/public/']` (`scripts/friction-budget/lib.ts:453`);
`packages/i18n/` is in neither. ⚠ ⭐ **A new key or a render-side branch WOULD have fired it** — which
is a second reason the ruled change is a value re-word.

---

---

## Tasks / Subtasks

> ⛔ **Task 0 first** ([[feedback_governance_commits_precede_implementation]]).
> ⭐⭐ **D5 DELETED TASK 2 ENTIRELY** — there is no wire change, so ⛔ nothing widens, ⛔ nothing breaks,
> ⛔ nothing waits on a rollout ruling. ✅ **ALL tasks are startable NOW.**
> ✅ **D3-aggregate and D5-scope are RULED ⇒ Task 3 runs to completion.**
> ✅⭐ **D6(a) and D7(c) are RULED (fourth pass) ⇒ Task 2 is REVIVED as D7(c)'s copy fix, Task 5 gains
> the drop-to-zero case, and Task 6's 11b.2 routing is PRESCRIPTIVE. ⛔ NOTHING is gated.**

- [ ] **Task 0 — Governance first** ✅ `[startable]`
  - [ ] Read the `.decision-log.md` head **live** (`2026-08-28-167` at authoring; ⛔ do not hardcode).
  - [ ] ⭐⭐ **TRANSCRIBE D5 as the governing ruling**: RTBF **removes the contributor entirely**;
        ⛔ no anonymized row, marker or placeholder key. ⭐ **Public erasure, ⛔ NOT destruction of the
        legal record** — legally-required records persist in restricted internal systems and are
        ⛔ never used to restore the public representation. ⭐ Record the **consistency ground**:
        `DIRECTORY_VISIBLE_MEMBER_STATES` (`2026-08-20-143` cl.3) already omits `anonymized`, so the
        contributor list was the outlier.
  - [ ] ⛔ **Record D3-shape(i), D3-key and D3-rollout as VACATED — ⛔ NOT reversed, ⛔ NOT closed.**
        ⭐ Their questions **ceased to exist** when the anonymized row did (`2026-08-24-159`'s
        *"D4(a) was VACATED by D1(b)"* is the precedent and the required language
        [[feedback_closure_language_precision]]). ⚠ D3-key(c) was ruled **2026-08-29** and vacated
        **2026-08-30** — record both dates; it was **correct for the union D5 abolished**.
  - [ ] ⭐ Transcribe the **STANDING** rulings — **D3(a)** · **D3-shape(ii)(a)** (with the clock-domain
        constraint) · **D4(a)** *(as a RE-ruling, and why its first ground fell)*.
  - [ ] ⭐ **Transcribe D3-aggregate**: the omitted contributor **still counts** toward `confirmedCount`
        and every aggregate representing **confirmed historical transactions**; RTBF removes the
        **public individual representation** and ⛔ does not retroactively alter that the contribution
        was confirmed. ⭐ Record the two-axis form verbatim — **Contribution state: `CONFIRMED` ·
        Public representation: `OMITTED`** — and clause (2): `rosterSize` is **representation
        eligibility**, ⛔ **never** an inference of financial status.
  - [ ] ⭐ **Transcribe D5-scope**: D5 applies **wherever the contributor list is rendered** — the
        member-session-gated surface **and** the public one. ⛔ Record that the *"public vs
        member-gated"* framing was **REJECTED**, and that the earlier recorded assumption is
        **superseded** — ⛔ it reached the right surface for the wrong reason.
        ⛔ `governance:` prefix, own commit, before any code.
- [ ] **Task 1 — Bound the state load (AC2)** ✅ `[D3-shape(ii)(a) RULED — startable]`
  - [ ] Add the batched state resolver in `packages/domain/src/member/read.ts` →
        `Map<MemberId, MemberLifecycleState>`, one query, chunked at a named constant.
        ⛔ **Never `getMemberStateAt` per row** (Trap 1).
  - [ ] ⛔⛔ **Mirror `getCurrentMemberState` (`:150`) — no `atTimestamp`, no `occurred_at` bound.**
        ⭐ Under D5 this is **sharper than before**: a missed anonymization no longer renders a marker,
        it renders **the erased member's REAL NAME**.
  - [ ] ⛔ State only — no decrypt, no KYC join, ⛔ no death overlay. ⛔ No dynamic `.limit()`.
- [ ] **Task 2 — The empty-state copy (AC8)** ✅ `[D7(c) RULED — startable]`
      ⛔⛔ ~~**Widen the contract**~~ **STAYS DELETED BY D5.** ⛔ The contract is ⛔ not opened.
      ⚠ ⭐ **Do ⛔ NOT opportunistically fix `deferred-work.md:2162` or reconcile Trap 4's re-spellings** —
      ⛔ nothing derives from a widened tuple now. Both stay recorded in Task 6.
      ⭐ **The slot now carries D7(c)'s surface fix, which is a VALUE re-word and nothing else.**
  - [ ] Re-word `contributor_list.empty` in **both** locales to AC8's **verbatim** strings
        (`packages/i18n/locales/en/contribution.json:31` · `hi/contribution.json:31`).
        ⛔ **No new key. ⛔ No code change. ⛔ No `apps/mobile/` edit. ⛔ Nothing on the wire.**
  - [ ] ⛔ **Do ⛔ NOT touch `contributor_list.pending_strip` / `pending_strip_a11y`** — ⭐ they own the
        confirmation claim and are correct.
  - [ ] `pnpm microcopy:check` green (`contribution.json` is in `copy_globs`), **and** record a
        **NON-AUTHOR tone-review sign-off** (`docs/tone-guide.md §5` — ⛔ the lint does ⛔ not substitute).
  - [ ] ⛔ **⛔ NOT the AC7 path** — ⛔ no counsel, ⛔ no Story-2.4 amendment workflow. ⭐ Ordinary
        product microcopy on a surface this story owns.
- [ ] **Task 3 — The boundary fix (AC1)** ✅ `[D3(a) + D5 + D3-aggregate RULED — startable]`
  - [ ] ⭐ Skip every `anonymized` contributor **BEFORE the decrypt**, using AC2's state map —
        ⛔ never decrypt-then-discard.
  - [ ] ⭐ Give the skip **its own comment** marking it as the **D5 erasure behaviour**, ⛔ explicitly
        distinct from the three integrity `continue`s beside it (Trap 2).
  - [ ] ⛔ Preserve the **`:317` / `:327` / `:332`** `continue`s verbatim with their comments
        (`:313-315` / `:319-321`) — ⚠ **Trap 2's corrected table.**
  - [ ] ⛔ **`resolveMemberDisplayName` is NOT called.** ⛔ Add no death conjunct anywhere.
  - [ ] ⛔⛔ **Touch ⛔ NO aggregate.** D3-aggregate ruled the omitted contributor **still counts**:
        ⛔ `confirmedCount` unchanged · ⛔ `computePendingAggregate` unchanged · ⛔ `pool.rosterSize`
        unchanged (it is the **frozen financial denominator**, ⛔ NOT the ruling's representation-
        eligibility count — see D3-aggregate's clamp warning). ⭐ **Only `rows` shrinks.**
- [ ] **Task 4 — Bound the decrypt (AC3)** ✅ `[D4(a) RE-RULED — startable]`
  - [ ] Bounded concurrency on the `public-pages` precedent; per-row fail-soft preserved exactly.
  - [ ] ⭐ **ONE exported constant AND the `mapWithConcurrency` helper, both shared** — ⛔ not a
        cross-reference comment, ⛔ not a copy-pasted helper.
  - [ ] ⛔ No plaintext cache at rest.
- [ ] **Task 5 — Prove it (AC6)** ✅ `[startable]`
  - [ ] `pool-contributors-rtbf.spec.ts` — real anonymization; assert the member is **ABSENT**, the
        sentinel appears **nowhere in the serialized JSON**, and peer rows are **untouched**.
  - [ ] A test asserting state-resolution round trips are **O(1)** in the contributor count (AC2).
  - [ ] ⭐ A test asserting the batched resolver's SQL carries **no `occurred_at` upper bound** (AC2).
  - [ ] ⭐⭐ **THE D3-aggregate TEST — assert the DIVERGENCE, ⛔ not equality.** After a real
        anonymization: `confirmedCount` / `pending.count` / `pending.percentage` are **byte-identical
        to before**, while `confirmed.length` has **dropped by one**. ⭐ *Contribution state:
        `CONFIRMED` · Public representation: `OMITTED`* — ⛔ a test asserting `rows.length ===
        confirmedCount` would encode the **wrong** model and must ⛔ not be written.
  - [ ] ⛔⛔ **THE DROP-TO-ZERO CASE** ✅ `[D7(c) RULED]`. ⭐ The divergence test above drops `rows` from
        N to N−1; ⛔ **it never reaches ZERO, which is the case that rendered the contradiction.** Assert
        the wire for a pool whose **ONLY** confirmed contributor is RTBF'd: `confirmed` is `[]` **while**
        `pending.count === rosterSize − 1` and `pending.percentage` is unchanged.
        ⛔⛔ **AND ASSERT THE ⛔ ABSENCE OF A REASON FIELD** — the response carries ⛔ no `omittedCount`,
        ⛔ no `hasHiddenContributors`, ⛔ no reason code, ⛔ no new key of any shape. ⭐ `.strict()` would
        reject one, ⛔ but assert it explicitly so a later "helpful" addition fails loudly (AC8).
  - [ ] ⭐ **A locale test for AC8** — `contributor_list.empty` in **both** locales makes ⛔ NO
        confirmation claim. ⚠ ⭐ **Assert the PROPERTY, ⛔ not the sentence** — ⛔ a byte-equality test on
        copy pins the wording and turns every future tone review into a test edit. ⛔ And assert the key
        still **exists in both** locales (`t()` throws on a miss —
        [[project_missed_cycle_visibility_substrate]]).
  - [ ] ⛔ **No `rowKey` assertions** — nothing ships to assert on (AC5 vacated).
- [ ] **Task 6 — Route and re-disposition the records, ⛔ do not re-file them**
  - [ ] ⭐⭐ **RTBF-D1 (`deferred-work.md:3980`) — ⛔ NOT DISCHARGED. RE-DISPOSITION IT.** Its subject is
        the **display-time name-resolver seam**, and under D5 the contributor path **omits instead of
        masking** ⇒ `resolveMemberDisplayName` still has **ZERO production call sites** after this
        story. ⇒ record: *"the re-trigger fired at Story 8.3 and was not acted on; Story 11b.2a fixed
        the underlying defect by OMISSION (D5), so the seam remains unwired and this item is
        **superseded as to contributor surfaces** — masking is ⛔ not the mechanism there."*
        ⛔ Not "discharged", ⛔ not "closed" ([[feedback_closure_language_precision]]).
  - [ ] ⭐⭐ **`ANONYMOUS_MEMBER_I18N_KEY` / `member.anonymousMember` — ⛔ *"possibly-dead"* is
        SUPERSEDED; D6(a) makes the observation DEFINITE** ([[feedback_closure_language_precision]]).
        Record, verified at `3a51745`: the key lives at `common.json:215` (**en and hi**), the const at
        `display-name.ts:26`, the type arm at `:39`, plus `display-name.test.ts` — and it has ⛔ **ZERO
        production call sites**. ⭐ **D6(a) removed the LAST NAMED PROSPECTIVE CONSUMER**, and the only
        other surface that could plausibly have rendered it — the public member directory — **already
        omits `anonymized`** (`DIRECTORY_VISIBLE_MEMBER_STATES`, `2026-08-20-143` cl.3). ⇒ record it as
        **un-consumed, with ⛔ no named prospective consumer remaining across every KNOWN surface.**
        ⛔⛔ **⛔ DO NOT DELETE ANY OF IT HERE.** Removing a domain export, its type arm, its unit test
        and a **ratified bilingual string** is a distinct governance act with its own blast radius, and
        ⛔ D6 ruled the **presenter variant**, ⛔ not the seam. ⇒ route the **deletion question** as its
        own decision, ⛔ not marked closed.
  - [ ] ⭐ **`deferred-work.md:2163` (keyExtractor) — STAYS OPEN.** ⛔ Do ⛔ not mark it discharged and
        ⛔ do not name 11b.2b as the consumer. Its recorded blocker — *"the PII-shielded shape carries
        no stable per-member identifier"* — **is still true**; D5 supplied none.
  - [ ] ⭐⛔ **Correct 11b.2b — ⚠ AND IT IS SIX ANCHORS, ⛔ NOT THE THREE AN EARLIER PASS NAMED.**
        Verified live at `3a51745`: `:38-40` (its **Preflight** — *"11b.2a's D3-shape(i)(a) made the wire
        row a two-variant discriminated union … ⇒ branch on `kind`"*) · `:85` (the local-tuple row) ·
        ⛔⛔ **`:86`** · ⛔⛔ **`:162-167` — THE WHOLE OF ITS AC3** · `:169-170` (the *"explicit
        EXEMPTION"* rationale that exists only to justify the replacement).
        ⛔⛔ **AND TWO OF THEM ASSERT THE EXACT OPPOSITE OF THIS STORY'S OWN RULING, ⛔ not merely a
        stale line number:** `:86` says *"**11b.2a supplies the stable key** its deferral named as the
        blocker"* and `:166-167` says *"`deferred-work.md:2163` is confirmed **discharged** (11b.2a
        marks it; this story is the named consumer)"*. ⭐ **The bullet directly above forbids both.**
        ⇒ 11b.2b **keeps `index`**; its union / `rowKey` expectations are **VOID**; **its AC3 has no
        subject left** and needs re-authoring or deletion, ⛔ not a line-number patch.
  - [ ] `deferred-work.md:2161` (N+1 decrypt) **discharged** by AC3. ⚠ `:2162` **noted as
        touched-and-unchanged** — ⛔ the schema was never opened.
  - [ ] ⭐⭐ **FILE THE AC7 NOTICE-COPY ROUTING PACKET** — the three D5 statements verbatim; the **six
        falsified keys** (`rtbf.entry_hint` / `rtbf.ack_body` / `rtbf.done_body` × en+hi); the
        **`anonymize.ts:144` name-destruction fact** that statement 3 must not contradict; and the
        **counsel + Story-2.4 amendment-workflow + non-author tone-review** obligations
        (`2026-08-28-161` precedent). ⛔ **No `common.json` edit in this diff.**
  - [ ] ⛔⛔ **File the STALE-COMMENT finding — ⚠ AND IT IS ~4× WIDER THAN THE THREE FILES AN EARLIER
        PASS NAMED. ⭐ THE FAMILY REACHES INTO THIS STORY'S OWN DIFF.** Verified live at `3a51745`,
        `grep -rn "unbuilt\|0 confirmed" apps packages`. ⛔ Filing only the three is how the next
        reader greps, hits an un-named one, and **re-derives the identical false premise**
        ([[project_mechanization_split_commitment]] — the decay concentrates in the un-named half):
        · ⛔⛔ **IN THE DIFF — `apps/api/src/modules/member-pool/handlers.ts:296` / `:304` / `:339`.**
          ⭐ **`:304` is the DECRYPT-COST SEAM comment — *"today 0 confirmed → 0 decrypts"* — the very
          comment AC3/D4(a) exists to discharge, in the block Task 4 edits.** ⛔ A diff that bounds the
          decrypt and leaves `:304` standing ships a file documenting the opposite of its own ruling's
          ground. ⚠ ⭐ **AND `handlers.ts` CONTRADICTS ITSELF: `:562-563` already says *"Story 9.5 Task
          1a wired this to the real read"*** — the same self-contradicting shape this story flags in
          `pool-contributor-list.ts` (`:7-8` vs `:88`), one file closer in.
        · ⛔ **A SECOND self-contradicting file: `packages/domain/src/contribution/read.ts:18`** (*"is
          unbuilt"*) **vs `:127`** (*"Epic 9's producer landed at 9.4"*), plus `:36`. ⚠ An earlier pass
          cited `:18` alone — **its stale half**, exactly the error it was filing.
        · ⭐⭐ **`packages/contracts/src/contributions/pool-contributor-list.ts:88` — FILE IT WITH A
          NAMED CONSUMER: STORY 11b.3** (routed by BigDev, 2026-08-30, at 11b.2b's D10 verification).
          ⛔ **Do ⛔ NOT fix it here** — it stays out-of-diff under this bullet's own rule. ⭐ **Ground
          for the consumer: the file names 11b.3 ITSELF, at `:26-28`** — *"the downstream **Sahyog
          Vivran public render** (Epic 11b) reuses it unchanged"* — which is
          `11b-3-sahyog-vivran-per-claim-story-surface` (`backlog`, ⛔ **no story file yet**). ⚠ ⭐ **AND
          THE REACHABILITY CAVEAT IS RECORDED, ⛔ NOT ASSUMED AWAY** ([[feedback_trace_reachability_before_escalating]]):
          the same sentence says 11b.3 *"reuses it **unchanged**"*, so 11b.3 may **read** this contract
          without **editing** it. ⇒ file **two** triggers, ⛔ not one: **(i)** 11b.3's authoring pass —
          it must read this contract to build the public render, and `:88` is the line that would make
          it re-derive *"the list is structurally empty"*; **(ii) FALLBACK — the next story that edits
          `pool-contributor-list.ts` for ANY reason**, so the item ⛔ cannot evaporate if 11b.3 ships
          without opening the file. ⛔ Not marked closed.
        · The rest of the family: `packages/api-client/src/index.ts:553` ·
          `apps/mobile/components/contributor-list/PoolContributorList.tsx:11` ·
          `apps/mobile/components/contributor-list/usePoolContributorsQuery.ts:13,14,35` ·
          `apps/jobs/src/scheduler/contribution-notify-triggers.ts:18,480` · `apps/jobs/src/index.ts:75` ·
          `packages/queue/src/index.ts:249`.
        · ⚠ ⭐ **AND IT IS ASSERTED IN TEST NAMES, ⛔ not only in comments** — `packages/contracts/tests/
          contributions.test.ts:81,167` and `packages/domain/tests/integration/contribution/
          confirmed-contributors.spec.ts:10,59` all name *"Epic 9 producer unbuilt"* in the test title.
          ⛔ A green suite therefore **restates** the false premise on every run.
        ⛔ File it as ONE finding with the full site list. ⛔ **Do ⛔ not fix the out-of-diff sites in
        this story** — that is scope creep; ⭐ **but `handlers.ts:296/:304/:339` ARE in the diff and
        Tasks 3/4 correct them.**
  - [ ] ⭐⭐ **FILE THE `rosterSize` NAMING HAZARD — ⛔ this is the one that can silently understate
        confirmation.** D3-aggregate cl.(2) names `rosterSize` *"contributors currently eligible for
        public representation"*, but the shipped `pool.rosterSize` is the **FROZEN pool snapshot**
        (`contribution-binding.ts:426`; the *frozen-roster invariant*, `handlers.ts:566`) and feeds
        **two financial computations** — `computePendingAggregate` (`read.ts:232-242`) and the 8.2
        **on-the-wire** meter `progress:{confirmedCount, rosterSize}` (`handlers.ts:569`). ⛔ **Record
        that they are TWO QUANTITIES ON TWO AXES and must never be merged**, with the two worked
        failures from D3-aggregate: `pending` understating, and the `:488` clamp **deleting a confirmed
        contribution from the meter**. **Re-trigger: any story that renames, redefines or recomputes
        `rosterSize`, or that first needs a representation-eligibility count.** ⛔ Not marked closed.
  - [ ] ⭐⛔ **ROUTE D5 + D5-scope TO THE SIBLING STORIES — ⛔ they will otherwise re-derive an
        anonymized row from their own epic text** ([[feedback_spec_edits_must_propagate_to_tasks]]):
        **11b.2** (presenter), **11b.2b** (mobile — ⛔ no `kind`, ⛔ no `rowKey`, keeps `index`),
        **11b.3** (the public host — D5 binds it by name).
        ⛔⛔ **THE 11b.2 HALF IS ⛔ NOT A ONE-CLAUSE PARENTHETICAL — ⭐ D6(a) MAKES IT PRESCRIPTIVE.**
        *"Its anonymized branch has no producer"* names **one** of six live artefacts. ⭐ **D6(a):
        11b.2's presenter carries ⛔ NO `anonymized` variant — one kind of row, everywhere.** Route each
        of the six by line (verified at `3a51745`; D6's own table is the authority):
        · `:76-77` — the **AI-10-1 Policy-meaning note**, ⛔ **REWRITTEN.** ⭐ `:78-79`'s member's-terms
          sentence is **half-surviving** — *"your contribution stays counted"* is **exactly D3-aggregate
          cl.(1)** and ⭐ **STAYS**; *"your name does not appear next to it"* is **restated** (⛔ the ROW
          does not appear either). ⛔ Do ⛔ not delete the note.
        · `:350-354` · `:398` · `:442-445` — the **`anonymized` arm** ⛔ **DROPPED** ⇒ the variant becomes
          `name | unknown`. ⚠ ⭐⭐ **`unknown` SURVIVES on a real distinction, ⛔ not an exemption:**
          11b.2's **D8(a)** (`:403-404`) already ruled *"`unknown` THROWS, and ⛔ no key is minted for
          it"* ⇒ ⭐ it is a **throwing exhaustiveness guard** (⛔ meant to be unreachable), ⛔ not a
          rendering branch with copy behind it. **The `never` check stays.**
        · ⛔⛔ `:313` — **THE SEVENTH ARTEFACT, and the easiest to miss:** the declared i18n ref list
          covers all ten `contributor_list.*` keys **plus `member.anonymousMember`**. ⇒ ⛔ **the
          `member.anonymousMember` ref GOES**; ⭐ **the ten `contributor_list.*` refs STAY** — they are
          11b.2b's, and `:316-317` calls a bare key there *"this AC's crash, one story later."*
        · `:160-161` — the **minted duplicate key** and the `common`-vs-`contribution` namespace-crash
          analysis ⛔ **BOTH GO**; ⭐ the crash they mitigate is a crash on a row that can no longer exist.
        · `:669` · `:875` — the anonymized-variant tests ⛔ **DELETED, ⛔ not skipped** ⇒ ⭐ replaced by an
          **anti-widening** assertion (one kind; a second requires a ruling).
        · `:419` — ⛔ **VOID**; it asserts a wire fact D5 made false.
        ⚠ ⭐ **11b.2 is `ready-for-dev` with Task 1 `startable` — this routing is time-critical.**
  - [ ] ⚠ ⭐ **NAME THE FOURTH RENDERER — D5-scope says *"wherever the contributor list is rendered"*,
        and the routing list is three stories against FOUR live/planned surfaces.** Verified at
        `3a51745`, the shipped list is mounted **twice**: `apps/mobile/app/(contribution)/
        contributors.tsx:13` (the 8.3 route) **and** ⭐ **`apps/mobile/components/nominee-console/
        NomineeConsole.tsx:213`** — Story 9.1's **staff-takeover-session-as-deceased** surface
        (`11b-2-b…md:83` had to correct this same omission once already).
        ⭐ **Both inherit the fix automatically** — one API handler, one `usePoolContributorsQuery` —
        so ⛔ **no code change is owed there**; record it so the next reader ⛔ cannot mistake the
        three-story routing list for the surface inventory.
  - [ ] ⭐ **RECORD THE VERIFIED NEGATIVE: there is ⛔ NO public contributor-NAME render today.**
        `packages/domain/src/pool/public-read.ts` emits a confirmed **COUNT**
        (`CONFIRMED_CONTRIBUTION_COUNT`, `:201-215`) and the **deceased's** name — its header states
        *"⛔ no decryption"* (`:18-22`). ⇒ ⭐ **D5-scope's *public* contributor list is PROSPECTIVE and
        owned by 11b.3**, and the ONE live contributor-name path today is `handlers.ts:309-334`, which
        this story fixes. ⛔ Do ⛔ not read D5-scope as an un-actioned public defect.
  - [ ] ⚠ **Trap 4's seven re-spellings stay recorded as a standing hazard** — ⛔ unexercised by this
        story, live the moment any story widens this tuple.
- [ ] **Task 7 — Close out**
  - [ ] `pnpm --filter @twt/api test` · `pnpm turbo run typecheck` · then `pnpm ci:local` green.
        ⚠ `git push` runs the full `ci:local` via a pre-push hook — that is the "hang", ⛔ not a failure.
  - [ ] ⛔ **`friction-budget.md` is NOT touched** — AC-4 triggers on `apps/mobile/` + `apps/public/`
        (`scripts/friction-budget/lib.ts:453`) and ⭐ **this story touches NEITHER** (the mobile edit was
        AC4's, now vacated). ⚠ ⛔ `packages/contracts` is not member-facing either.
        ⚠ ⭐ **AND ⛔ NEITHER IS `packages/i18n` — RE-CHECKED AGAINST AC8, ⛔ not inherited.** D7(c) is a
        **value** re-word inside `packages/i18n/locales/`, so ⛔ no member-facing prefix is touched.
        ⛔⛔ **If the implementation drifts into a NEW KEY or a render-side branch, `apps/mobile/` IS
        touched and AC-4 FIRES** — ⭐ that is a second reason the ruled change is a value re-word.
  - [ ] Flip `development_status[11b-2a-contributor-name-resolution-defect]` and add ONE combined
        top-of-file `last_updated` entry ([[project_sprint_status_ledger]]).


## ⚖️ Decisions

### ⭐⭐ D5 — **THE GOVERNING RULING. RTBF REMOVES THE CONTRIBUTOR ENTIRELY.** RULED BigDev 2026-08-30. ⛔ FINAL.

**An RTBF invocation removes the contributor from the contributor surface.** ⛔ **No anonymized row is
emitted** — ⛔ no marker, ⛔ no placeholder, ⛔ no `rowKey`, ⛔ nothing occupying the position where that
person used to be.

**Ground:** the person's public contribution / name / claim representation **should disappear**, rather
than leaving an **identifiable or correlatable placeholder**. ⭐ The UX consequences are handled
**explicitly**, ⛔ not solved with an anonymized row and a `rowKey`.

⭐⭐ **AND IT IS PUBLIC ERASURE, ⛔ NOT DESTRUCTION OF THE UNDERLYING LEGAL RECORD.** Records the Trust
is legally required to retain **remain in restricted internal systems** for the applicable
statutory/regulatory retention period, and are ⛔ **never used to restore the public representation.**

⭐ **A ratified precedent supports it ⇒ this is a CONSISTENCY correction, ⛔ not a new posture:**
`DIRECTORY_VISIBLE_MEMBER_STATES` (`packages/domain/src/member/directory-read.ts`, `2026-08-20-143`
cl.3 D3(a)) **already OMITS `anonymized`** from the public member directory. ⇒ the contributor list was
**the outlier**; D5 aligns it.

**What D5 does to this story:**
· ✅ **AC1 becomes an OMISSION** — skip before decrypt. ⭐ Strictly less Tier-1 plaintext materialised.
· ✅ **AC2 SURVIVES and matters MORE** — the state decides whom to omit, and a clock-domain miss now
  leaks **the real name**, ⛔ not a marker.
· ✅ **AC3 / D4(a) survive**, marginally cheaper (fewer rows reach the decrypt).
· ⛔ **AC4 · AC5 · D3-shape(i) · D3-key · D3-rollout are VACATED** — one kind of row ⇒ ⛔ no union,
  ⛔ no key, ⛔ no wire change, ⛔ no stale-client break, ⛔ nothing to rule.
· ⭐ **AC7 is NEW** — D5 falsified shipped RTBF notice copy in **both locales**; routed, ⛔ not edited here.

### ✅ D3-aggregate — **RULED BigDev 2026-08-30. ⛔ Do not re-litigate.**

⭐⭐ **THE TWO-AXIS MODEL — this is the whole ruling and every consequence below follows from it:**

> **Contribution state: `CONFIRMED`** · **Public representation: `OMITTED`**

**(1) The RTBF-omitted contributor CONTINUES to contribute to `confirmedCount` and to every other
aggregate financial/statistical measure whose semantics represent CONFIRMED HISTORICAL TRANSACTIONS.**
⭐ **RTBF removes the contributor's public individual representation; ⛔ it does NOT retroactively alter
the fact that the contribution was confirmed.**

**(2) `rosterSize` is the number of contributors CURRENTLY ELIGIBLE FOR PUBLIC REPRESENTATION in the
roster.** ⛔ **It is NOT a measure of contribution-confirmation state and ⛔ MUST NOT be used to infer a
contributor's financial status.**

⇒ ⭐⭐ **AND THE CONSEQUENCE FOR THIS STORY IS THAT IT CHANGES ⛔ NO AGGREGATE AT ALL.** Only `rows`
shrinks. ⛔ `confirmedCount` is untouched · ⛔ `computePendingAggregate` is untouched · ⛔ the 8.2 meter is
untouched. **Task 3 no longer stops.**

⛔⛔ **BUT THE NAME `rosterSize` IS ALREADY TAKEN BY A DIFFERENT QUANTITY, AND CONFLATING THEM SILENTLY
UNDERSTATES CONFIRMATION — the exact harm clause (1) forbids.** Verified at `07a5ced`:

- `pool.rosterSize` is the **FROZEN POOL SNAPSHOT** — `matched.memberIds.length`
  (`packages/domain/src/pool/contribution-binding.ts:426`), and `handlers.ts:566` names the
  **frozen-roster invariant** in terms. It is a **membership/financial denominator**, ⛔ not a
  representation-eligibility count.
- It feeds **two financial computations**: `computePendingAggregate({rosterSize, confirmedCount})`
  (`read.ts:232-242`, `pending = rosterSize − confirmedCount`) and the **8.2 meter on the wire**,
  `progress: { confirmedCount, rosterSize }` (`handlers.ts:569`) — the member-visible *"X of Y"*.
- ⭐ There is a **clamp**: `Math.min(confirmed.length, pool.rosterSize)` (`:488`), whose comment says the
  frozen-roster invariant means it *"should never fire"*.

⇒ ⛔⛔ **IF A LATER PASS "ALIGNS" `pool.rosterSize` TO CLAUSE (2)'s DEFINITION, IT BREAKS BOTH:**
· **`pending` understates.** Pool of 10, 4 confirmed, one of them RTBF'd ⇒ representation-eligible
  roster 9, `confirmedCount` still 4 (clause 1) ⇒ `pending = 9 − 4 = 5`, ⛔ but **6 members genuinely
  have not confirmed.**
· ⛔⛔ **The clamp fires and DELETES A CONFIRMED CONTRIBUTION FROM THE METER.** Pool of 3, all 3
  confirmed, one RTBF'd ⇒ `confirmedCount` 3 **>** eligible roster 2 ⇒ the clamp renders *"2 of 2"*.
  ⭐ **A confirmed contribution vanishes from a financial meter — precisely what clause (1) forbids**,
  and what `:313-315`'s *"the aggregate must never understate confirmation"* has forbidden since 8.3.

⇒ ⭐ **THE RULED IMPLEMENTATION, and it is the MINIMAL one:**
· ⛔ **`pool.rosterSize` KEEPS its current meaning and its current uses — the frozen membership
  denominator on the FINANCIAL axis. ⛔ It is NOT redefined and NOT recomputed by this story.**
· ⭐ Clause (2)'s *"currently eligible for public representation"* is a **DISTINCT quantity on the
  REPRESENTATION axis.** ⛔ **No surface needs it yet** ⇒ ⛔ **do not build it, do not add it to a wire,
  and do not rename anything** ([[project_no_premature_package]]).
· ⛔ **The two axes never subtract from each other.** Clause (2)'s own second sentence forbids exactly
  that, and the arithmetic above is why.
· ⚠ ⭐ **Document both axes at `computePendingAggregate`'s call site and at the 8.2 meter**, so the next
  reader cannot mistake one `rosterSize` for the other. **Task 6 routes the naming hazard.**

### ✅ D5 SCOPE — **RULED BigDev 2026-08-30: D5 applies WHEREVER the contributor list is rendered.**

⛔⛔ **DO NOT FRAME THIS AS "the API is public vs member-gated." THAT FRAMING IS REJECTED.**

⭐ **The contributor list is a PRODUCT intended to exist on BOTH surfaces:**
· the **member-session-gated** contributor list, **and**
· the **public** contributor list.

⚠ ⭐ **The current fact that `/api/v1/member/pool-contributors` is member-session-gated does ⛔ NOT make
the underlying contributor-list product member-only.** ⇒ **D5 applies to the contributor's individual
public/member-visible representation WHEREVER the contributor list is rendered:** an RTBF-affected
contributor is **OMITTED**, ⛔ never represented by an anonymized row.

⇒ ⭐ **This supersedes the earlier open "scope question" and the assumption recorded against it** — the
assumption happened to reach the right surface, ⛔ but for the wrong reason, and the reason is what
binds the sibling stories ([[feedback_supersede_never_reinterpret]]).
⇒ ⛔ **IT BINDS MORE THAN THIS STORY.** Any surface rendering a contributor list inherits it — **11b.2**
(the presenter), **11b.2b** (the mobile render layer) and **11b.3** (the public host). **Task 6 routes
the ruling to all three**, so ⛔ none of them re-derives an anonymized row from its own epic text
([[feedback_spec_edits_must_propagate_to_tasks]]).

### ✅⭐ D6 — **RULED (a) BigDev 2026-08-30: DROP THE ANONYMIZED PRESENTER VARIANT.** ⛔ FINAL.

⛔⛔ **D5 MAKES AN RTBF'd CONTRIBUTOR ABSENT FROM THE CONTRIBUTOR LIST. ⛔ NO PRODUCER MAY EMIT AN
ANONYMIZED CONTRIBUTOR ROW.** ⇒ **11b.2's presenter carries ⛔ NO `anonymized` variant.** The
contributor row has **exactly ONE kind**, everywhere — wire, presenter, render layer, tests.
⛔ **The unreachable branch is ⛔ NOT preserved as defense-in-depth.** ⛔ (b) is REJECTED by name.

**Ground:** this is D3(a)'s own ground, honoured. D3(a) was ruled partly *because* *"leaving it would
mean 11b.2's presenter ships an anonymized branch that **no producer ever emits** — a vacuous branch
reporting green forever."* ⭐ **D5 produces exactly that condition.** Keeping the branch would mean
building, testing and maintaining a code path whose only possible input the system is now
**structurally incapable of constructing** — and a test asserting it can only do so by hand-forging a
row the API can never emit, which is a test of the fixture, ⛔ not of the system.

⛔ **(b) "keep it as defense-in-depth" was considered and REJECTED.** `display-name.ts:42-45`'s
defense-in-depth rationale is **sound where it lives** — it guards a resolver that is handed a
`(state, name)` pair and must not leak a stale name. ⛔ **It does ⛔ not transfer to a presenter that
is handed a row the boundary already decided to emit.** The contributor path's guard is the
**omission at `handlers.ts`**, ⛔ not a second guard downstream of it; a downstream branch that can
never fire is ⛔ not a second line of defence, it is dead code that reads like one.

⇒ ⭐ **WHAT DROPS, precisely — Task 6 routes each by line:**
| In `11b-2-…md` | Disposition |
|---|---|
| `:76-77` — the **AI-10-1 Policy-meaning note**'s *"Outcome 1"* | ⛔ **REWRITTEN.** ⭐ `:78-79`'s member's-terms sentence is **half-surviving**: *"your contribution stays counted"* is **exactly D3-aggregate cl.(1)** and ⭐ **stays**; *"your name does not appear next to it"* under-states D5 (⛔ the **row** does not appear either) and is **restated**. ⛔ Do not delete the note. |
| `:350-354` · `:398` · `:442-445` — the three-kind presenter variant | ⛔ **The `anonymized` arm is DROPPED.** ⚠ ⭐⭐ **`unknown` SURVIVES, and the reason is a REAL distinction, ⛔ not an exemption:** 11b.2's **D8(a)** already ruled that *"**`unknown` THROWS, and ⛔ NO KEY IS MINTED FOR IT**"* (`:403-404`). ⇒ it is a **throwing exhaustiveness guard**, which is *supposed* to be unreachable — ⛔ **not a rendering branch with copy behind it**, which is what D6 kills. ⭐ **A guard that never fires is working; a render arm that never fires is dead code.** ⇒ the variant becomes `name \| unknown`, and the `never` check stays. |
| ⛔⛔ `:313` — the declared **i18n ref list** | ⭐ **THE SEVENTH ARTEFACT, and the easiest to miss.** It declares refs for all ten `contributor_list.*` keys **plus `member.anonymousMember`**. ⇒ ⛔ **the `member.anonymousMember` ref GOES** (nothing renders it under D6(a)); ⭐ **the ten `contributor_list.*` refs STAY** — they are 11b.2b's, and `:316-317` says a bare key there is *"this AC's crash, one story later."* |
| the **minted duplicate** of `ANONYMOUS_MEMBER_I18N_KEY` + the `common`-vs-`contribution` namespace-crash analysis (`:160-161`) | ⛔ **BOTH GO.** ⭐ The crash they mitigate is a crash on a row that can no longer exist ⇒ ⛔ no key is minted, ⛔ no namespace bridge is built. ⭐ **This is a real simplification of 11b.2, ⛔ not a loss.** |
| `:669` · `:875` — the required **anonymized-variant tests** | ⛔ **DELETED, ⛔ not skipped.** ⭐ Replace with the **anti-widening** assertion: the presenter's row type has **one kind**, and a test fails if a second is added without a ruling. |
| `:419` — *"`kind: 'name' \| 'anonymized'`, both `.strict()`, both carrying `rowKey`"* | ⛔ **VOID** — it asserts a wire fact D5 made false. |

⭐⭐ **AND THE `ANONYMOUS_MEMBER_I18N_KEY` / `member.anonymousMember` DISPOSITION — ⛔ RECORDED
PRECISELY, ⛔ NOT DELETED HERE.** Verified live at `3a51745`: `common.json:215` (en **and** hi), the
domain const `display-name.ts:26`, its type `:39`, and `display-name.test.ts` — ⛔ **and ⛔ ZERO
production call sites.** ⇒ **D6(a) removes the LAST NAMED PROSPECTIVE CONSUMER.** The other surface
that could plausibly have rendered it — the public member directory — **already omits `anonymized`**
(`DIRECTORY_VISIBLE_MEMBER_STATES`, `2026-08-20-143` cl.3). ⇒ ⭐ **the seam and its key are now
unreachable-by-design across every KNOWN surface.**
⛔⛔ **BUT ⛔ DO ⛔ NOT DELETE THEM IN THIS STORY.** Deleting a domain export, its type arm, its unit
test and a **ratified bilingual string** is a distinct governance act with its own blast radius, and
it is ⛔ not what D6 ruled — D6 ruled the **presenter variant**. ⇒ Task 6 records the disposition as
**un-consumed with ⛔ no named prospective consumer remaining**, and routes the deletion question as
its own decision. ⛔ *"Possibly-dead"* is ⛔ **superseded** — after D6(a) the observation is no longer
tentative ([[feedback_closure_language_precision]]).

### ✅⭐ D7 — **RULED (c) BigDev 2026-08-30: FIX AT THE SURFACE.** ⛔ FINAL.

⛔⛔ **⛔ NO CHANGE TO `confirmedCount`, `rosterSize`, `pending`, OR THEIR FINANCIAL SEMANTICS. ⛔ NO
NEW FINANCIAL OR STATUS STATE FOR RTBF OMISSION.** ⭐ **When the representable contributor rows are
empty, the contributor-list copy DESCRIBES THE LIST'S REPRESENTATIONAL STATE — ⛔ it does ⛔ not
assert that no contributions have been confirmed.** The required microcopy lands in **both locales**.

⭐⭐ **THE FRAMING THAT MAKES THIS ONE STRING INSTEAD OF TWO — and it is D3-aggregate's own model.**
`contributor_list.empty` is a **LIST-AXIS** element that was making an **AGGREGATE-AXIS CLAIM**.
⇒ ⭐ **D7(c) returns it to its own axis.** The confirmation claim is already owned — and correctly —
by the pending strip beside it (`contributor_list.pending_strip`, *"{count} pending confirmation
({percentage}%)"*, server-computed and ⛔ untouched by D5). ⇒ ⛔ **no information is lost; it stops
being asserted twice, once wrongly.**

⛔⛔ **AND THIS IS WHY IT IS ONE STRING, ⛔ NOT A TWO-BRANCH "WHY IS IT EMPTY" DISCRIMINATOR — BOTH
ALTERNATIVES WERE COSTED AND BOTH ARE WORSE:**
· ⛔⛔ **A server-emitted reason field is FORBIDDEN — it resurrects the exact hazard D5 dissolved.**
  Verified at `3a51745`: **`AssignedPoolContributorList` is `.strict()`** (`pool-contributor-list.ts:98`)
  and the SDK parses with the **bundled** schema (`api-client:558-564`). ⇒ adding **any** field breaks
  **every read on every stale client** — ⭐ **Trap 3 and D3-rollout, resurrected in full**, in the one
  story whose headline win was *"no wire change and therefore no rollout risk."*
· ⛔ **A client-side inference is REJECTED as unsound.** The response carries ⛔ **no `rosterSize`**
  (`PoolContributorListPoolIdentity` is `letterCode` · `name` · `canonicalIdentifier`, `:73-79`), so
  "are there confirmations?" could only be inferred from `pending.percentage < 100` — ⚠ and
  `percentage` is `Math.round`ed (`read.ts:240`), so it reads **100 with a confirmation present** once
  the roster reaches ~200. ⛔ A correctness-bearing branch on a rounded display figure is the
  clock-domain mistake of Trap 1 in a different costume.

⇒ ⭐⭐ **THE RULED CHANGE IS THE MINIMAL ONE: RE-WORD THE EXISTING KEY'S VALUE IN BOTH LOCALES.
⛔ NO NEW KEY. ⛔ NO CODE CHANGE AT ALL.** Verified live: the key's ⛔ only consumer is
`PoolContributorList.tsx:124` (`t('contributor_list.empty', …)`) and ⛔ **no test pins its value.**
⇒ four consequences, each checked, ⛔ none assumed:
· ⛔ **No wire change** ⇒ ⛔ no `.strict()` break, ⛔ no stale-client hazard, ⛔ no MMKV problem.
· ⛔ **⛔ NO `apps/mobile/` EDIT** ⇒ ⭐ **friction-budget AC-4 still does ⛔ NOT fire**
  (`MEMBER_FACING_PREFIXES = ['apps/mobile/','apps/public/']`, `lib.ts:453`; `packages/i18n` is in
  neither). ⚠ ⭐ **This was CHECKED, ⛔ not assumed** — a new key, or a render-side branch, would have
  fired it.
· ⛔ **No collision with 11b.2.** Its `:162` says *"reuse them; ⛔ mint nothing"*, and `:313-317`
  **declares refs for all ten `contributor_list.*` keys** because 11b.2b will consume them — *"a bare
  key there is **this AC's crash, one story later**."* ⇒ ⭐ **a re-worded VALUE on the SAME key is the
  only change that keeps both true.** ⛔ A new key would have to be declared in 11b.2 as well.
· ⚠ **The gate and the review both apply**: `contribution.json` (en+hi) **is** in the microcopy gate's
  `copy_globs` (`microcopy.yaml`), and `docs/tone-guide.md §5` requires a **NON-AUTHOR tone-review
  sign-off** in addition to a green lint — ⛔ *"automated lint passing does not substitute"*.
  ⛔ This is ordinary product microcopy, ⛔ **NOT** the statutory AC7 path — ⛔ do ⛔ not route it
  through counsel or the Story-2.4 amendment workflow.

⛔ **(a) record-and-route-only was rejected** — it leaves a false sentence about money renderable on
the live app between this merge and 11b.2. ⛔ **(b) representation-aware `pending` was rejected on its
face** — D3-aggregate cl.(2), *"the two axes never subtract from each other."* ⛔ **(d) accept-as-correct
was rejected** — `contributor_list.empty` is a sentence about **contributions**, ⛔ not about the list,
so accepting it means ratifying a copy string that is false on a reachable path.

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

### ⚠ D3-shape — **(ii)(a) STANDS. (i)(a) ⛔ VACATED BY D5 (2026-08-30).**

⛔ **(i)(a) — the discriminated union — is VACATED**: with omission there is one kind of row, so the
question ceased to exist. ⛔ It was ⛔ not reversed on its merits. ✅ **(ii)(a) — the batched state read —
STANDS and is now MORE central** (it decides whom to omit). ⛔ Read the union material below as history.

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

### ⛔ D3-rollout — **⛔ VACATED BY D5 (2026-08-30).** ⛔ No wire change ⇒ ⛔ no break ⇒ ⛔ nothing to rule.

⭐⭐ **D5 DISSOLVED this question rather than answering it.** No `.strict()` widening ⇒ ⛔ no stale-client
hazard, ⛔ no OTA window, ⛔ no MMKV-cache problem, ⛔ no exposure to price.
⚠ **Its falsification record STANDS and still matters** — the Epic-9-producer-is-live finding is what
Task 0 records, and the stale comments that caused it are still in the tree (Task 6).

#### ⛔ History — the 2026-08-29 re-opening, preserved

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

### ⛔ D3-key — **RULED (c) 2026-08-29 · ⛔ VACATED BY D5 2026-08-30.** ⛔ History only.

⭐ **(c) was CORRECT for the union D5 abolished** — ⛔ it did not become wrong; its question ceased to
exist when the `anonymized` variant did. ⚠ **Both dates are recorded deliberately**: a ruling that
lived one day is still a ruling, and Task 0 transcribes it as **vacated**, ⛔ not as never-taken
([[feedback_supersede_never_reinterpret]]).

**The question was:** how is `rowKey` derived, and ⭐ **does the `anonymized` variant derive it the same
way as the `name` variant?** → ✅ **(c): NO — the two variants derive their keys DIFFERENTLY.**

· **`kind: 'name'`** → `HMAC(memberId, per-pool salt)` — stable across the 60s poll, so FlashList
  recycling is genuinely better than the `index` AC5 exists to remove.
· **`kind: 'anonymized'`** → a **per-response random** value — ⭐ **erasure leaves no stable handle.**

**Ground:** it is the only option that pays the recycling cost *only* on the rows where erasure makes
correlation a real harm. ⛔ **(a)** was rejected because a deterministic key on an erased row is a
residual identifier surviving erasure — the thing this story exists to prevent. ⛔ **(b)** was rejected
because it destroys recycling for **every** row and so fails AC5's own ground. ⛔ **(d)** was rejected
because it costs AC5 entirely and leaves 11b.2b on `index`.

⚠ ⭐ **THREE IMPLEMENTATION CONSTRAINTS THE RULING CARRIES, ⛔ none optional:**
· ⛔⛔ **The per-pool salt is a SERVER-HELD SECRET, ⛔ never the `poolId` itself.** `HMAC(memberId,
  poolId)` is computable by anyone holding a `memberId` ⇒ it becomes a **membership-confirmation
  oracle** ("is this member in this pool?"), which is the enumeration property `11a.3` refuses in terms.
  ⛔ Do not derive the salt from public data.
· ⚠ **The anonymized key must be unique WITHIN the response.** Two anonymized rows in one pool must not
  collide — generate per **row**, ⛔ not per response, or React/FlashList duplicate-key behaviour
  re-creates exactly the churn `deferred-work.md:2163` recorded.
· ⭐ **Both variants emit the same FORMAT** (same length/charset). ⛔ Not for secrecy — `kind` already
  discriminates — but so no downstream consumer can branch on key shape instead of on `kind`.

⛔⛔ **AND THE HONEST LIMIT OF (c) — ⛔ do NOT let the story claim erasure is uncorrelatable.** (c)
closes the **key** channel, ⛔ not the **neighbour** channel. A client that persists responses (⚠ **and
the mobile client DOES — the SDK auto-persists to MMKV**) can diff two polls:

> pre-erasure key set `{hA, hB, hC}` → post-erasure `{hA, hC, <random>}`. `hA` and `hC` are **stable by
> design**, so `hB` is visibly **missing** and one anonymized row is visibly **new** ⇒ the erased member
> is identified as the holder of `hB`.

⚠ ⭐ **The randomization of the erased row's own key is defeated by the STABILITY OF ITS NEIGHBOURS'
keys.** ⛔ This is ⛔ not fixable within (c) — the only cure is per-response randomization of **every**
key, which is option (b), rejected on recycling. ⇒ ⭐ **(c) remains the right trade, and the residual is
RECORDED, ⛔ not claimed away** ([[feedback_record_unattested_no_backfill]]). **Task 6 routes it.**

**Why it is a decision and ⛔ not an implementation detail** — AC5's two requirements conflict:
**stable across the 60s poll** (or it is no better than the `index` it replaces) vs **⛔ must not
re-identify across rows or requests** (a per-member permalink is the enumeration primitive `11a.3`
refuses in terms, `epics.md:4904`). ⭐ Every scheme stable across polls is a deterministic function of
`memberId` — a cross-request pseudonym; a per-response salt inverts the trade.

⛔⛔ **And the RTBF edge is the sharp one:** a deterministic key on the **`anonymized`** variant leaves
a **stable handle on an erased member's row**, in the story whose purpose is erasure.

<details><summary>The four costed options, preserved as the record of what (c) was chosen over</summary>

· **(a)** HMAC(`memberId`, per-**pool** salt) — stable within a pool, ⛔ correlatable across requests.
· **(b)** HMAC(`memberId`, per-**response** salt) — ⛔ breaks recycling across polls; AC5's own ground fails.
· **(c)** ✅ **RULED** — (a) for `name` rows + a **per-response random** key for `anonymized` rows.
· **(d)** Drop `rowKey` from this story and leave `deferred-work.md:2163` open — ⛔ costs AC5 entirely
  and 11b.2b keeps `index`.

</details>

### ✅ D4 — Bound the N+1 decrypt here? → **(a) bound it HERE. RE-RULED 2026-08-29 on the CORRECTED ground.**

⭐⛔ **THE RE-RULING IS ⛔ NOT REDUNDANT, AND THE DISTINCTION IS THE POINT.** D4(a) was first ruled on a
ground that included *"currently costs nothing (0 confirmed contributors)"* — ⛔ **false** (Preflight).
A verdict standing on a falsified ground is ⛔ **not** a verdict that carries over
([[feedback_supersede_never_reinterpret]]); it is re-taken. **BigDev re-ruled (a) on the corrected
ground, and the corrected ground is STRONGER** — the N+1 is a live cost on a live path, ⛔ not a
forward-looking one. ⇒ Task 0 transcribes **the re-ruling and why the first ground fell**, ⛔ not the
original clause.

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
- **⛔ ~~`.strict()` + Zod discriminated unions~~ — VOID under D5.** There is ⛔ no union and ⛔ no
  contract edit, so ⛔ nothing to re-test. ⚠ ⭐ **Keep the lesson for whoever DOES widen this tuple
  later:** discriminated-union strictness is a **different code path** from flat-object strictness —
  ⛔ do not assume the existing shape test carries.
- **⭐ The `2026-08-28-165` cl.2 masking ruling does NOT apply here.** It is scoped to **account**
  fields on `sahyog-vivran`. ⛔ Do not cite it as authority for anything about contributor names.
- **⚠ `git push` runs the full `ci:local` via a pre-push hook** — the "hang", ⛔ not a failure
  ([[project_friction_budget_baseline_ratchet]]).
- **⚠ `integration-tests` concurrency is `1` and is LOAD-BEARING** — ⛔ never raise it.
- **⚠ Live-DB test gotchas:** ⛔ never regenerate an applied migration (42P07); ⛔ never `DROP SCHEMA`
  (42P01); assert **membership**, not counts ([[project_live_db_test_gotchas]]).
- **⚠ The `governance:` prefix is a real convention (148 commits at `3a51745`) but formally invalid under the
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
| `packages/contracts/src/contributions/pool-contributor-list.ts` | ⛔ **NOT TOUCHED** `[AC4 VACATED by D5]` | The ruled `discriminatedUnion('kind', …)` + `rowKey` on both variants. ⚠ Re-test `.strict()` INSIDE the union. ⚠ ⛔ Grep `lastInitial` and reconcile at the ROOT first (Trap 4). |
| `packages/domain/src/member/read.ts` | **UPDATE** ✅ `[D3-shape(ii)(a) RULED]` | ⭐ **NEW: the batched lifecycle read** → `Map<MemberId, MemberLifecycleState>`, one query, chunked at a named constant. ⛔ None exists today. ⛔ State only; ⛔ no dynamic `.limit()`. ⛔⛔ **Mirrors `getCurrentMemberState` (`:150`) — ⛔ NEVER `getMemberStateAt` (`:127`): no `atTimestamp`, no `occurred_at` bound (Trap 1's clock domain).** |
| `packages/domain/src/member/display-name.ts` | ⚠ **READ-ONLY — reuse** | ⛔ Do not reimplement the `anonymized` branch; ⛔ do not add a death conjunct to it. |
| `apps/api/src/modules/member-pool/contribution-note.ts` · `name.ts` | ⛔ **NOT TOUCHED** `[D5]` | Re-spellings of a tuple that ⛔ no longer changes. |
| `apps/mobile/components/contributor-list/PoolContributorList.tsx` | ⛔ **NOT TOUCHED** `[AC4/AC5 VACATED]` | ⭐ The wire is unchanged ⇒ `:40-43`'s local `ConfirmedRow` stays valid and `:137-138`'s `index` keyExtractor stays. ⚠ ⭐ **So friction-budget AC-4 does ⛔ NOT fire.** |
| `apps/api/tests/integration/contributions/pool-contributors-rtbf.spec.ts` | **NEW** | ⛔ `.spec.ts` under `tests/integration/`. ⛔ Not `tests/unit/pool-contributors.test.ts` (DB-free — the wrong-home trap). |
| `packages/ui/**` | ⛔ **NOT TOUCHED** | The presenter is 11b.2's. |
| `packages/contracts/src/public-pages/matrix.ts` | ⛔ **NOT TOUCHED** | No surface or field is declared here. |
| `packages/i18n/locales/{en,hi}/contribution.json` | **UPDATE** ✅ `[AC8 / D7(c) RULED]` | ⭐ `:31` `contributor_list.empty` — a **VALUE re-word in BOTH locales**, AC8's strings **verbatim**. ⛔ No new key · ⛔ no code change · ⛔ no wire change · ⛔ no `apps/mobile/` edit ⇒ ⛔ AC-4 does not fire. ⚠ In the microcopy gate's `copy_globs` **and** owed a **non-author tone review**. ⛔ Do ⛔ not touch `pending_strip`. |
| `packages/i18n/locales/{en,hi}/common.json` | ⛔ **NOT TOUCHED — ROUTED** `[AC7]` | ⛔ Three keys × two locales FALSIFIED by D5 (`rtbf.entry_hint` `:217` / `ack_body` `:219` / `done_body` `:227`). ⛔ Statutory copy ⇒ counsel + Story-2.4 amendment workflow + non-author tone review. |
| `packages/domain/src/member/directory-read.ts` | ⚠ **READ-ONLY — the PRECEDENT** | `DIRECTORY_VISIBLE_MEMBER_STATES` already omits `anonymized` (`2026-08-20-143` cl.3). ⛔ Do not edit; cite it. |
| `.decision-log.md` | UPDATE | Task 0. Read the head **live**. |
| `_bmad-output/implementation-artifacts/deferred-work.md` | UPDATE | RTBF-D1 · `:2161` · `:2163` discharged; `:2162` noted. ⛔ Precise closure language. |

### References

- [Source: `apps/api/src/modules/member-pool/handlers.ts:290-340`] — ⭐ the defective loop; `:306` = 8.3's own "where it bites" comment; **`:317`/`:327`/`:332` = the fail-soft `continue`s** (conditions `:312`/`:323-325`/`:330`; rationale comments `:313-315`/`:319-321`); `:398` = the ONLY state load, keyed on the requester
- [Source: `packages/domain/src/kyc/profile-read.ts:24-37`] — ⛔ `getMemberKycProfile` returns **no `state` column** (Trap 1)
- [Source: `packages/domain/src/member/read.ts:127-138`] — ⛔ `getMemberStateAt` is a **full event-stream replay per member**, `occurred_at`-bounded, no `LIMIT` (Trap 1)
- [Source: `packages/domain/src/member/read.ts:150`] — ⭐⛔ `getCurrentMemberState`, the **NO-upper-bound** sibling AC2 mirrors; its doc-block carries the **clock-domain** argument (Trap 1)
- [Source: `packages/domain/src/reconciliation/matcher-write.ts:116` · `apps/jobs/src/boot.ts:635,652` · `packages/domain/src/index.ts:177`] — ⭐⛔ **Epic 9's `contribution.confirmed` producer is LIVE** (Story 9.4/9.5) — what falsified D3-rollout's ground
- [Source: `packages/domain/src/member/anonymize.ts:70,101-113,144`] — the sentinel, `encSentinel`, and the **encrypted** write into `name_ciphertext`
- [Source: `packages/domain/src/kyc/name.ts:25,47-53`] — `SplitName`; the single-token path that lets the sentinel through
- [Source: `packages/domain/src/member/display-name.ts:26,36-39,47-58`] — ⚠ the THREE-kind union + `ANONYMOUS_MEMBER_I18N_KEY`. ⛔ **Under D5 this seam is NOT called by this story** — cited to explain why RTBF-D1 stays un-discharged (Task 6)
- [Source: `packages/domain/src/member/directory-read.ts:82-96`] — ⭐⭐ `DIRECTORY_VISIBLE_MEMBER_STATES`: the RATIFIED precedent that already OMITS `anonymized` (`2026-08-20-143` cl.3) — D5's consistency ground
- [Source: `packages/i18n/locales/{en,hi}/common.json:217,219,227`] — ⛔ the three RTBF notice keys D5 FALSIFIED, in both locales (AC7)
- [Source: `apps/api/src/modules/member-pool/routes.ts:57`] — ⚠ the endpoint is **member-session-gated**, ⛔ not public (the open SCOPE question)
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
- [Source: `packages/i18n/locales/{en,hi}/contribution.json:30-39`] — ⭐ the `contributor_list.*` family; `:31` is AC8's re-worded key, `:33-34` the pending strip that ⛔ already owns the confirmation claim, `:37-39` the `योगदानकर्ता` register AC8 reuses
- [Source: `packages/contracts/src/contributions/pool-contributor-list.ts:73-79,98`] — ⛔⛔ `PoolContributorListPoolIdentity` carries **no `rosterSize`**, and `AssignedPoolContributorList` is **`.strict()`** — why D7's server-side and client-inference alternatives were both rejected
- [Source: `microcopy.yaml` (`scope.copy_globs`) · `docs/tone-guide.md §5` · `docs/tone-review-checklist.md`] — ⚠ `contribution.json` (en+hi) IS gated; ⛔ a green lint does **not** substitute for a NON-AUTHOR tone-review sign-off
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
| 2026-08-30 | 1.4 | ✅ **TASK 6's STALE-COMMENT FILING GAINS A NAMED CONSUMER FOR ONE SITE — `pool-contributor-list.ts:88` IS ROUTED TO STORY 11b.3** (BigDev, 2026-08-30, at 11b.2b's D10 verification). ⛔ **Nothing else changes**: it stays **out-of-diff** for this story, ⛔ is **not fixed here**, and the rest of the ~12-site family is filed exactly as before. ⭐⭐ **Ground for the consumer — the file names 11b.3 ITSELF at `:26-28`**: *"the downstream **Sahyog Vivran public render** (Epic 11b) reuses it unchanged"* ⇒ `11b-3-sahyog-vivran-per-claim-story-surface`. ⚠ ⭐ **AND THE REACHABILITY CAVEAT IS RECORDED, ⛔ NOT ASSUMED AWAY** ([[feedback_trace_reachability_before_escalating]]): that same sentence says 11b.3 *"reuses it **unchanged**"*, so 11b.3 may **read** this contract without **editing** it — a route to a story that never opens the file just relocates the problem. ⇒ **TWO triggers are filed, ⛔ not one: (i)** 11b.3's authoring pass — ⭐ `:88` is precisely the line that would make it re-derive *"the list is structurally empty"*, the same false premise that falsified D3-rollout's sole ground in this story's own third pass; **(ii) FALLBACK — the next story that edits `pool-contributor-list.ts` for ANY reason.** ⛔ Not marked closed. | BigDev + Claude |
| 2026-08-30 | 1.3 | ✅✅ **BOTH FOURTH-PASS DECISIONS RULED BY BigDev ⇒ STATUS `blocked-awaiting-decisions` → `ready-for-dev`. ⛔ NOTHING IS GATED; ALL TASKS ARE STARTABLE.** ⭐⭐ **D6 → (a) DROP THE ANONYMIZED PRESENTER VARIANT.** ⛔ No producer may emit an anonymized contributor row ⇒ the contributor row has **exactly ONE kind — wire, presenter, render layer, tests** — and ⛔ the unreachable branch is **NOT** preserved as defense-in-depth. ⭐ **Ground: this HONOURS D3(a)’s own ground**, which rejected *“a vacuous branch reporting green forever”* — D5 produces exactly that condition, and a test for the branch could only pass by hand-forging a row the API is **structurally incapable of constructing** (a test of the fixture, ⛔ not of the system). ⛔ **(b) rejected by name:** `display-name.ts:42-45`’s defense-in-depth rationale is sound **where it lives** (a resolver handed a `(state, name)` pair) and ⛔ does **not** transfer to a presenter handed a row the boundary already decided to emit — the contributor path’s guard **is** the omission at `handlers.ts`. ⇒ **Task 6’s 11b.2 routing is now PRESCRIPTIVE across SEVEN artefacts by line:** `:76-77` the **AI-10-1 Policy-meaning note** REWRITTEN (⭐ `:78-79`’s *“your contribution stays counted”* is **exactly D3-aggregate cl.(1)** and **STAYS**; *“your name does not appear next to it”* is restated — ⛔ the ROW does not appear either) · `:350-354`/`:398`/`:442-445` the **`anonymized` arm** DROPPED ⇒ the variant becomes `name \| unknown` (⚠ ⭐⭐ **`unknown` SURVIVES on a REAL distinction, ⛔ not an exemption** — 11b.2’s **D8(a)** at `:403-404` already ruled *“`unknown` THROWS, and ⛔ no key is minted for it”*, so it is a **throwing exhaustiveness guard**, ⛔ **not** a rendering branch with copy behind it; ⭐ **a guard that never fires is working, a render arm that never fires is dead code** — the `never` check stays) · `:160-161` the **minted duplicate key** and its `common`-vs-`contribution` namespace-crash analysis **both go** (⭐ the crash they mitigate is a crash on a row that can no longer exist) · `:669`/`:875` the anonymized-variant tests **DELETED, ⛔ not skipped**, replaced by an **anti-widening** assertion · `:419` **VOID** · ⛔⛔ **`:313` — THE SEVENTH ARTEFACT, and the easiest to miss:** its declared i18n **ref list** covers all ten `contributor_list.*` keys **plus `member.anonymousMember`** ⇒ ⛔ **that one ref GOES**, ⭐ **the ten `contributor_list.*` refs STAY** (they are 11b.2b’s — `:316-317` calls a bare key there *“this AC’s crash, one story later”*). ⭐ **`ANONYMOUS_MEMBER_I18N_KEY` / `member.anonymousMember` disposition SHARPENED — *“possibly-dead”* is SUPERSEDED** ([[feedback_closure_language_precision]]): D6(a) removed the **last named prospective consumer**, and the only other plausible surface (the public directory) **already omits `anonymized`** ⇒ recorded as **un-consumed with ⛔ no named prospective consumer remaining**. ⛔⛔ **But ⛔ NOT DELETED here** — removing a domain export, its type arm, its unit test and a **ratified bilingual string** is a distinct governance act, and D6 ruled the **presenter variant**, ⛔ not the seam; the deletion question is routed as its own decision. ⭐⭐ **D7 → (c) FIX AT THE SURFACE.** ⛔ `confirmedCount` / `rosterSize` / `pending` and their financial semantics are **UNTOUCHED**; ⛔ **no new financial or status state** for RTBF omission. ⭐ **NEW AC8**: when the representable rows are empty the copy **describes the list’s representational state** instead of asserting nothing was confirmed, in **both locales**, with the strings recorded **verbatim** (the AC7 transcribe-don’t-paraphrase discipline). ⭐⭐ **THE FRAMING THAT MAKES IT ONE STRING, NOT TWO — and it is D3-aggregate’s own model:** `contributor_list.empty` is a **LIST-AXIS** element that was making an **AGGREGATE-AXIS CLAIM**; D7(c) returns it to its own axis, and ⛔ **no information is lost** because the pending strip beside it already owns the confirmation claim. ⛔⛔ **Both alternatives were COSTED AND REJECTED ON VERIFIED GROUNDS: (i) a server-emitted reason field is FORBIDDEN — `AssignedPoolContributorList` is `.strict()` (`pool-contributor-list.ts:98`) and the SDK parses with the BUNDLED schema (`api-client:558-564`), so it breaks EVERY read on EVERY stale client ⇒ ⭐ Trap 3 and D3-rollout resurrected in full, in the story whose headline win is “no wire change”; (ii) a client-side inference is UNSOUND — the response carries ⛔ NO `rosterSize` (`:73-79`), so “are there confirmations?” could only come from `pending.percentage < 100`, and `percentage` is `Math.round`ed (`read.ts:240`) ⇒ it reads 100 with a confirmation present once the roster reaches ~200.** ⇒ ⭐⭐ **THE RULED CHANGE IS THE MINIMAL ONE — a VALUE re-word of the EXISTING key in both locales: ⛔ no new key, ⛔ NO CODE CHANGE AT ALL.** Verified: the key’s only consumer is `PoolContributorList.tsx:124` and ⛔ **no test pins its value**. ⇒ four checked consequences: ⛔ no wire change ⇒ the `.strict()` hazard stays dissolved · ⛔ **no `apps/mobile/` edit ⇒ friction-budget AC-4 still does NOT fire** (⚠ ⭐ **CHECKED, ⛔ not inherited** — a new key or a render-side branch WOULD have fired it) · ⛔ **no collision with 11b.2**, whose `:162` says *“reuse them; mint nothing”* and whose `:313-317` **declares refs for all ten `contributor_list.*` keys** for 11b.2b — ⭐ a re-worded VALUE on the SAME key is the only change that keeps **both** true (⛔ a new key would have to be declared in 11b.2 as well) · ⚠ **both review layers apply** — `contribution.json` (en+hi) **is** in the microcopy gate’s `copy_globs` (⭐⭐ **and both ruled strings were PRE-VERIFIED against the LIVE `microcopy.yaml` through the gate’s own regex engine — Node, ⛔ not Python, whose `re` cannot even compile the variable-width-lookbehind tone patterns ⇒ ZERO findings**; ⛔ a pre-check, ⛔ not a substitute), and `docs/tone-guide.md §5` requires a **NON-AUTHOR tone-review sign-off** (*“automated lint passing does not substitute”*); ⛔ this is ordinary product microcopy, ⛔ **NOT** the statutory AC7 path — ⛔ no counsel, ⛔ no Story-2.4 amendment workflow. ⛔ (a) record-and-route-only rejected (leaves a false sentence about money renderable between this merge and 11b.2) · ⛔ (b) representation-aware `pending` rejected on its face (D3-aggregate cl.(2)) · ⛔ (d) accept-as-correct rejected (`contributor_list.empty` is a sentence about **contributions**, ⛔ not about the list). **Task 2 is REVIVED in place** — the wire widening ⛔ stays deleted by D5; the slot now carries D7(c)’s copy fix. **Task 5** gains the **drop-to-zero** case plus an assertion that the response carries ⛔ **no reason field of any shape**, and an AC8 locale test that asserts the **PROPERTY, ⛔ not the sentence** (⛔ a byte-equality test on copy pins the wording and turns every future tone review into a test edit). | BigDev + Claude |
| 2026-08-30 | 1.2 | ⛔⛔ **FOURTH VALIDATION PASS (`bmad-create-story validate 11b.2a`, at `3a51745`) — STATUS DROPPED `ready-for-dev` → `blocked-awaiting-decisions`. ⛔ TWO NEW DECISIONS, ⛔ NEITHER DEFAULTED.** ✅ Baseline re-pinned `07a5ced` → `3a51745` — `git diff --name-only` returns **two `_bmad-output/` files and nothing else**, so ⛔ no verified claim moved. ⭐⭐ **THE FIX IS UNTOUCHED: D5 · D3-shape(ii)(a) · D3-aggregate · D4(a) · D5-scope all re-verified line-by-line and STAND; Tasks 0/1/3/4 remain fully startable.** What the pass found is that **D5’s blast radius OUTSIDE this diff was under-recorded**. ⛔⛔ **(1) D6 — 11b.2 IS `ready-for-dev` AND ITS AI-10-1 POLICY-MEANING NOTE STATES SUPERSEDED POLICY IN TERMS** (`11b-2-…md:76-77`: *“An `anonymized` member renders the ratified ‘an anonymous member’ marker”*) — ⭐ the one note the whole AI-10-1 mechanism exists to put in front of the dev agent, with its Task 1 marked `startable`. ⇒ **does 11b.2’s presenter KEEP a permanently-unreachable `anonymized` variant or DROP to one kind?** (a) drop — ⭐ D3(a)’s **own ground** rejected *“a vacuous branch reporting green forever”*, and D5 produces exactly that, so D3(a)’s second ground is now **self-defeating**; (b) keep as defense-in-depth — `display-name.ts:42-45`’s own stated rationale, ⚠ but it **mints a duplicate** of the `ANONYMOUS_MEMBER_I18N_KEY` Task 6 is simultaneously flagging **possibly-dead**, so ⛔ the two must be ruled TOGETHER; (c) defer — ⛔ rejected on its face. ⭐ **The note itself is corrected either way** ([[feedback_spec_edits_must_propagate_to_tasks]]). ⛔⛔ **(2) D7 — UNDER D5 THE SHIPPED MEMBER SURFACE CAN STATE TWO CONTRADICTORY THINGS ABOUT MONEY AT ONCE.** Arithmetic, verified live: `pending` is computed from the **un-shrunk domain** list (`handlers.ts:340-343`) while `rows` **shrinks**; the mobile surface reads **both** (`PoolContributorList.tsx:121-126` · `:81`). ⇒ pool of 3, exactly ONE confirmed and that member RTBF’d ⇒ *“No confirmed contributions yet.”* beside *“2 pending confirmation (67%)”* — ⛔⛔ **0 + 2 ≠ 3**, one member is neither confirmed nor pending, and the 8.2 card on the sibling screen simultaneously says *“1 of 3”*. ⭐ **This is ⛔ NOT a re-litigation of D3-aggregate** — that ruling governs the AGGREGATE axis and is correct; the harm it forbids arrives through the **PRESENTATION** door, which it does not govern. ⚠ ⭐ It is **new**: the three integrity `continue`s can already produce the divergence, but they are **logged anomalies** — D5 makes it the **ordinary, designed** path. Four options costed, (b) *“make `pending` representation-aware”* **named and FORBIDDEN** (D3-aggregate cl.(2)). Task 5 gains the **drop-to-zero** case `[waits on D7]` — ⛔ assert the divergence only, ⛔ never an answer to D7. ⚠ **(3) NOT A DECISION — the STALE-COMMENT finding was under-scoped ~4× and MISSED THE FILE IN THIS STORY’S OWN DIFF.** Three files were named; the live family is ~12 source sites plus **test titles**. ⭐⛔ `handlers.ts:296`/**`:304`**/`:339` are **inside Tasks 3/4** — and `:304` is the **DECRYPT-COST SEAM comment AC3 exists to discharge** (*“today 0 confirmed → 0 decrypts”*); `handlers.ts:562-563` already says *“Story 9.5 Task 1a wired this to the real read”*, so ⛔ **`handlers.ts` contradicts itself** — the `pool-contributor-list.ts` shape, one file closer in. ⛔ **A SECOND self-contradicting file: `contribution/read.ts:18` vs `:127`** — an earlier pass cited **its stale half**, the exact error it was filing. ⚠ And `contracts/tests/contributions.test.ts:81,167` + `confirmed-contributors.spec.ts:10,59` **assert it in their test NAMES**, so a green suite restates the false premise every run. ⚠ **(4) 11b.2b routing named 3 anchors; live there are SIX** — `:38-40` · `:85` · **`:86`** · **`:162-167` (the WHOLE of its AC3)** · `:169-170` — and ⛔⛔ **two assert the OPPOSITE of this story’s ruling** (*“11b.2a supplies the stable key”*, *“`:2163` is confirmed **discharged** … this story is the named consumer”*), which the bullet above forbids. ⚠ **(5) The D5 surface inventory is FOUR, not three** — the shipped list is mounted twice (`app/(contribution)/contributors.tsx:13` **and** `NomineeConsole.tsx:213`, Story 9.1’s staff-takeover surface); ⭐ both inherit the server-side fix, so ⛔ no code is owed — recorded so the story list is not mistaken for the surface list. ⭐ **(6) VERIFIED NEGATIVE recorded: there is ⛔ NO public contributor-NAME render today** — `pool/public-read.ts` emits a confirmed **COUNT** (`:201-215`) + the **deceased’s** name and its header states *“⛔ no decryption”* (`:18-22`) ⇒ D5-scope’s *public* list is **prospective**, owned by 11b.3. **Citation corrections:** `getCurrentMemberState` is at **`read.ts:150`**, ⛔ not `:151` (5 sites — ⚠ `:151` is its query BODY, the same *“points at a body line, not the declaration”* class Trap 2 corrected) · `appendConfirmedContribution` is **`matcher-write.ts:116`**, ⛔ not `:117` · sprint-status rows are **`:12317-12318`**, ⛔ not `:12178-12179` · `governance:` 144 → **148** · Trap 4’s grep returns **16** files, ⛔ not *“~20”* · `kyc/public-name.ts:78-99` was labelled the `splitFirstNameLastInitial` **producer** — it is a **CONSUMER**; the producer is `kyc/name.ts:47` (the References had it right, the Trap did not). ⭐ **Verified clean at `3a51745`:** the whole defect trace `:309-334` line-by-line · all three `continue`s at `:317`/`:327`/`:332` with comments `:313-315`/`:319-321` · `getMemberStateAt:127-138` and its `lte` bound · `getCurrentMemberState`’s clock-domain doc-block **verbatim** · `getMemberKycProfile:24-37` returns no `state` · `anonymize.ts:70`/`:101-113`/`:144` · `directory-read.ts:82-96` omitting `anonymized` · `display-name.ts:26`/`:36-39`/`:47-58` · `resolveMemberDisplayName` **still zero production call sites** · `public-pages/handlers.ts:58`/`:67`/`:210`/`:408` both still module-private · contracts `:7-8`/`:49`/`:51`/`:88` · SDK `:558-564` · mobile `:40-43`/`:137-138` · **all six RTBF i18n keys in both locales** at `:217`/`:219`/`:227` · `member.anonymousMember` at `common.json:215` (en+hi) · all four `deferred-work.md` anchors · `contribution-binding.ts:426` · `handlers.ts:398`/`:488`/`:566`/`:569` · `friction-budget/lib.ts:453` · decision-log head still `2026-08-28-167` · `routes.ts:57` · `boot.ts:635,652`. | BigDev + Claude |
| 2026-08-30 | 1.1 | ✅✅ **THE LAST TWO OPEN ITEMS RULED (BigDev) ⇒ STATUS `blocked-awaiting-decisions` → `ready-for-dev`. ⛔ NOTHING IS GATED.** ⭐⭐ **D3-aggregate — THE TWO-AXIS MODEL: *Contribution state: `CONFIRMED` · Public representation: `OMITTED`*.** The RTBF-omitted contributor **continues to contribute to `confirmedCount` and every aggregate financial/statistical measure whose semantics represent confirmed historical transactions**; RTBF removes the **public individual representation** and ⛔ **does not retroactively alter that the contribution was confirmed**. cl.(2): `rosterSize` is **the number of contributors currently eligible for public representation**, ⛔ **not** a measure of confirmation state and ⛔ **never** usable to infer financial status. ⇒ ⭐ **this story now changes ⛔ NO AGGREGATE AT ALL — only `rows` shrinks**, and Task 3 runs to completion. ⛔⛔ **AND THE VALIDATION PASS CAUGHT A TRAP IN APPLYING cl.(2): THE NAME `rosterSize` IS ALREADY TAKEN BY A DIFFERENT QUANTITY.** Verified: `pool.rosterSize` is the **FROZEN pool snapshot** (`contribution-binding.ts:426`; the *frozen-roster invariant*, `handlers.ts:566`) and feeds **two financial computations** — `computePendingAggregate` (`read.ts:232-242`) and the **on-the-wire** 8.2 meter `progress:{confirmedCount, rosterSize}` (`handlers.ts:569`). ⇒ if a later pass "aligns" it to cl.(2)'s definition: **(i) `pending` UNDERSTATES** — pool of 10, 4 confirmed, one RTBF'd ⇒ `9 − 4 = 5` pending while **6** genuinely have not confirmed; and ⛔⛔ **(ii) the `:488` clamp FIRES AND DELETES A CONFIRMED CONTRIBUTION FROM THE METER** — pool of 3, all confirmed, one RTBF'd ⇒ `confirmedCount 3 > eligible 2` ⇒ renders *"2 of 2"*, ⭐ **exactly the harm cl.(1) forbids** and what `:313-315` has forbidden since 8.3. ⇒ **RULED IMPLEMENTATION is the MINIMAL one: `pool.rosterSize` KEEPS its meaning and uses (the frozen FINANCIAL denominator); cl.(2)'s representation-eligibility count is a DISTINCT quantity that ⛔ NO surface needs yet ⇒ ⛔ do not build it, do not rename anything** ([[project_no_premature_package]]); ⛔ **the two axes never subtract from each other** — cl.(2)'s own second sentence forbids it. Task 6 files the naming hazard with both worked failures; Task 5 gains the **divergence test** (`confirmedCount`/`pending` byte-identical while `confirmed.length` drops by one — ⛔ a `rows.length === confirmedCount` assertion would encode the WRONG model). ⭐⭐ **D5 SCOPE — the "public vs member-gated" framing is REJECTED.** The contributor list is a **PRODUCT intended to exist on BOTH surfaces** (member-session-gated **and** public); the current fact that `/api/v1/member/pool-contributors` is member-gated ⛔ does not make the product member-only. ⇒ **D5 applies to the contributor's individual public/member-visible representation WHEREVER the contributor list is rendered.** ⚠ The earlier recorded scope ASSUMPTION is **superseded** — ⭐ it reached the right surface **for the wrong reason**, and the reason is what binds the siblings ⇒ **Task 6 routes D5 + D5-scope to 11b.2, 11b.2b and 11b.3** so ⛔ none re-derives an anonymized row from its own epic text. ⭐ The AI-10-1 note's second half is now **RULED purely presentational**, with the axis-merge named as the one way it could become an accounting change. | BigDev + Claude |
| 2026-08-30 | 1.0 | ⭐⭐ **FINAL RULING D5 (BigDev) — RTBF REMOVES THE CONTRIBUTOR ENTIRELY; ⛔ NO ANONYMIZED ROW IS EMITTED.** The erased member's public representation **disappears** rather than leaving an **identifiable or correlatable placeholder**; UX consequences handled explicitly, ⛔ not solved with an anonymized row + `rowKey`. ⭐ **Public erasure, ⛔ NOT destruction of the legal record** — legally-required records persist in restricted internal systems for the statutory retention period and are ⛔ never used to restore the public representation. ⭐ **Recorded as a CONSISTENCY correction, ⛔ not a new posture:** `DIRECTORY_VISIBLE_MEMBER_STATES` (`directory-read.ts`, `2026-08-20-143` cl.3) **already omits `anonymized`** from the public directory — the contributor list was **the outlier**. ⭐⭐ **THE STORY SHRANK AND UNBLOCKED:** with one kind of row, **AC4 · AC5 · D3-shape(i) · D3-key · D3-rollout are all VACATED** — ⛔ their questions **ceased to exist**, ⛔ they were **NOT reversed on merits** (`2026-08-24-159`'s "D4(a) was VACATED by D1(b)" precedent, [[feedback_closure_language_precision]]). ⇒ ⛔ **NO WIRE CHANGE ⇒ no `.strict()` break, no OTA/MMKV hazard, no rollout window, and Task 2 is DELETED.** ⚠ D3-key(c) lived exactly one day (ruled 08-29, vacated 08-30) — **both dates recorded**; it was **correct for the union D5 abolished**. **AC1 rewritten as an OMISSION** that skips **BEFORE the decrypt** (⭐ strictly less Tier-1 plaintext materialised, and it composes with AC3), carrying its **own comment** marking it the D5 erasure behaviour so a later reader ⛔ cannot mistake it for a fail-soft — ⚠ **Trap 2 INVERTED**: the old text said *"the anonymized case must NOT `continue`"*, D5 rules the reverse. **AC2 SURVIVES and matters MORE** — the state decides whom to omit, so a clock-domain miss now leaks **the real name**, ⛔ not a marker. **AC6's assertions INVERT** to absence, incl. a **serialized-JSON** sentinel check. ⭐ **AC7 NEW — D5 FALSIFIED SHIPPED USER-FACING COPY IN BOTH LOCALES:** `rtbf.entry_hint` `:217`, `rtbf.ack_body` `:219` (⭐ it names *"an anonymous member"*, the very marker D5 removes) and `rtbf.done_body` `:227` all promise *"your contribution history stays on record, without your name"* — ⛔ now false. ⛔⛔ **Routed, ⛔ NOT edited here:** it is **statutory** text (counsel + Story-2.4 amendment workflow + non-author tone review, `2026-08-28-161` precedent), it is **3.12's surface**, and ⭐ **statement 3 must be checked against the build — `anonymize.ts:144` DESTROYS the name** (encrypted-sentinel overwrite), so the notice must be precise about **which** records are retained or it misleads. ⛔⛔ **TWO THINGS D5 DOES NOT SETTLE, both recorded OPEN, ⛔ neither defaulted:** **D3-aggregate** — does the omitted member still count in `confirmedCount`/`rosterSize`? Keeping it leaves `rows.length < confirmedCount`, and ⭐ **that delta is itself a correlatable trace** across MMKV-cached polls; dropping it **retroactively moves a financial aggregate**; and ⚠ `rosterSize` is a **third** question — if the count drops while the roster holds, the erased member silently becomes **"pending"**, misrepresenting someone who *did* contribute. **SCOPE** — this endpoint is **member-session-gated**, ⛔ not public (`routes.ts:57`), while D5 says *"public"*; the file **proceeds on "D5 reaches it"** because the alternative leaves the defect shipped, ⚠ but that is an **ASSUMPTION recorded openly**, ⛔ not a ruling. ⭐ **RTBF-D1 is ⛔ NOT discharged** — under D5 the path **omits instead of masking**, so `resolveMemberDisplayName` still has **zero production call sites**; re-dispositioned as **superseded as to contributor surfaces**. ⭐ **`deferred-work.md:2163` STAYS OPEN** — its blocker (*"no stable per-member identifier"*) is still true, D5 supplied none ⇒ **11b.2b keeps `index`** and its union/`rowKey` expectations at `:39`/`:85`/`:164` are **void**; Task 6 corrects it. ⚠ Trap 4's re-spellings are **unexercised** and stay a standing hazard; friction-budget AC-4 **does not fire** (no `apps/mobile` edit). | BigDev + Claude |
| 2026-08-29 | 0.3 | ✅ **TWO DECISIONS RULED BY BigDev — D3-key(c) and D4(a).** ⭐ **D3-key(c): the two union variants derive `rowKey` DIFFERENTLY** — `HMAC(memberId, per-pool salt)` on `kind:'name'` (stable across the 60s poll ⇒ real FlashList recycling), **per-row random** on `kind:'anonymized'` (⭐ erasure leaves no stable handle). (a) rejected — a deterministic key on an erased row is a residual identifier surviving erasure; (b) rejected — destroys recycling for every row and fails AC5's own ground; (d) rejected — costs AC5 entirely and leaves 11b.2b on `index`. ⇒ **AC5 UNBLOCKED and now fully specified**; Task 2's blocker list drops from two to one. ⚠ ⭐ **Three constraints the ruling carries, added to AC5 + Task 2:** the per-pool salt is a **SERVER-HELD SECRET, ⛔ never `poolId`** (`HMAC(memberId, poolId)` is computable by anyone holding a memberId ⇒ a **membership-confirmation oracle**, the enumeration property `11a.3` refuses in terms) · the anonymized key is generated **per ROW, not per response** (or duplicate-key churn returns) · both variants emit the **same format** so no consumer branches on key shape instead of `kind`. ⛔⛔ **AND THE HONEST LIMIT IS RECORDED, ⛔ not claimed away:** (c) closes the **key** channel, ⛔ NOT the **neighbour** channel — surviving rows keep stable keys by design, so a client persisting responses (⚠ the SDK auto-persists to **MMKV**) can diff two polls, see which key **vanished**, and identify the erased member anyway. ⛔ Not fixable within (c); the only cure is option (b), rejected. **Task 6 routes it as a standing residual, and AC5 forbids any test or comment asserting erasure is uncorrelatable.** Task 5 gains the **D3-key(c) test triple** — a `name` key identical across two requests · an `anonymized` key differing across two requests · ⭐ **the anonymized key is NOT the HMAC that member carried pre-anonymization** (the entire point of (c)) — plus a per-row-uniqueness test. ⭐ **D4(a) RE-RULED, ⛔ not restated:** its first ground included *"currently costs nothing (0 confirmed contributors)"*, which v0.2 falsified; a verdict standing on a falsified ground does ⛔ not carry over ([[feedback_supersede_never_reinterpret]]), so it was **re-taken on the corrected ground — which is STRONGER** (the N+1 is a live cost on a live path). Task 0 now transcribes the re-ruling **and why the first ground fell**. ⛔ **D3-rollout remains RE-OPENED and is now the story's ONLY blocker** — status stays `blocked-awaiting-decisions`, but **Tasks 0/1/3/4/5 are startable**, which is the whole RTBF defect fix plus the decrypt bound; ⛔ only Task 2 (the wire widening) waits. | BigDev + Claude |
| 2026-08-29 | 0.2 | ⛔⛔ **THIRD VALIDATION PASS (`bmad-create-story validate 11b.2a`, at `07a5ced`) — STATUS DROPPED `ready-for-dev` → `blocked-awaiting-decisions`.** Baseline re-pinned `80e0d12` → `07a5ced` (⛔ no verified claim moved: `git diff --name-only` returns four `_bmad-output/` files and nothing else). ⭐⭐ **THE FINDING: D3-rollout(a)'s SOLE GROUND IS FALSE.** *"Epic 9's `contribution.confirmed` producer is unbuilt ⇒ population ZERO"* — the producer **shipped at Story 9.4/9.5** (`sprint-status:12178-12179` both `done`; `matcher-write.ts:117` `appendConfirmedContribution`; `boot.ts:652` registered unconditionally; *"two live emitters since Story 9.4"* in two packages). ⚠ **The false premise was read off STALE Epic-8-era comments** (`pool-contributor-list.ts:88`, `contribution/read.ts:18`) — ⭐ **one of which contradicts its own file header at `:7-8`**. ⇒ D3-rollout **RE-OPENED** (superseded by falsification, ⛔ not reversed on merits); AC4's *"widen BEFORE Epic 9's producer"* ordering is **UNSATISFIABLE**; Task 6's standing item would have routed a **future** watch for a **past** event — the RTBF-D1 decay pattern re-created inside the story discharging RTBF-D1. ⭐ The residual *"zero rows in production"* claim is recorded **UN-ATTESTED** — never measured. **(2)** ⛔⛔ **AC2 named the WRONG state-read sibling.** `read.ts` has two: `getMemberStateAt` (`:127`, `occurred_at`-bounded) and `getCurrentMemberState` (`:151`, unbounded), whose doc-block warns that an **app-clock** bound can disagree with the projector's **DB-clock** replay ⇒ an `rtbf_anonymized` event falling outside the window **renders the erased name** — this story's own defect, reintroduced. AC2 now mirrors `getCurrentMemberState` + a test asserting no `occurred_at` bound. **(3)** ⛔ **NEW decision D3-key** — D3-shape(i)(a) ruled `rowKey`'s SHAPE, ⛔ never its DERIVATION; AC5's *"stable"* and *"must not re-identify across requests"* clauses **conflict**, and a deterministic key on the `anonymized` variant leaves **a stable handle on an erased row**. AC5 + Task 2 BLOCKED; four options costed, ⛔ none ruled. **(4)** ⛔ **Every `continue` line number was wrong** — `:313`/`:326`/`:331` → **`:317`/`:327`/`:332`** (conditions `:312`/`:323-325`/`:330`; comments `:313-315`/`:319-321`, ⛔ not `:322-324`). 11b.2's re-validate fixed this family at `07a5ced` but that commit ⛔ never touched this file. **(5)** AC3 shared only the CONSTANT — ⚠ `mapWithConcurrency` (`public-pages/handlers.ts:67`) is **equally module-private** and carries the load-bearing input-order behaviour ⇒ **both** are extracted. **(6)** *"§4.4 **governs** it"* → **SPEAKS to but governs nothing** (unratified; ranked below a Deed clause that itself binds nothing) — the obligation discharged here is **statutory + ratified**, ⛔ neither needs §4.4. **(7)** Trap 4's grep returns **~20 files** against a **10-row** table ⇒ the out-of-scope classes are now named (the 8.2 `deceasedLastInitial` family + the `splitFirstNameLastInitial` producer/tests). Citation corrections: `11b-9-…md:753-757` → **`:762-767`** · `getMemberStateAt` is `occurred_at`-bounded, ⛔ not *"unbounded"* · `resolveMemberDisplayName` has **no `dist/` reference** (the zero-production-call-sites half is CONFIRMED) · `governance:` 142 → **144**. ⭐ **Verified clean:** the entire defect trace line-by-line, Trap 1's no-`state`-column claim, the mobile local `ConfirmedRow:40-43`, the SDK parse site, all four `deferred-work.md` anchors, `friction-budget/lib.ts:453`, decision-log head `2026-08-28-167`, the commitlint-unwired claim, the death-vs-RTBF table against `epics.md:4906`, and `tests/integration/contributions/` as a valid home. | BigDev + Claude |
| 2026-08-29 | 0.1 | **Split out of Story 11b.2 by the validation pass at `80e0d12`.** Carries the live RTBF contributor-name defect, the decrypt bound, the wire widening and the stable row key. ⭐ Findings applied at authoring: **(1)** ⛔ *"nothing had recorded it"* is **false** — **RTBF-D1** (`deferred-work.md:3980`) recorded the unwired seam and its re-trigger **fired at Story 8.3**; this story **discharges** it rather than claiming novelty. **(2)** ⛔⛔ *"the boundary already loads the member"* is **false** — `getMemberKycProfile` returns no `state` and `getMemberStateAt` is a **full event-stream replay per member**, so the naive fix is an N+1 **worse** than the one AC3 bounds ⇒ new **D3-shape(ii)** and **AC2**. **(3)** The anonymized wire shape was **entirely unspecified** ⇒ **D3-shape(i)** with four costed options. **(4)** Widening a `.strict()` **response** breaks every stale mobile client — **no OTA**, SDK-validated, **MMKV-persisted** ⇒ Trap 3 + an explicit rollout-posture AC. **(5)** *"must not silently `continue`"* re-scoped to the anonymized case only — three existing integrity `continue`s preserved verbatim. **(6)** The resolver returns **THREE** kinds; `unknown` gets an exhaustive throwing check recorded un-attested. **(7)** Trap 4 now names the working grep (`lastInitial`), all seven re-spellings, and 11b.1's **two** load-bearing halves (root-derivation + exercise-the-variant). **(8)** AC3's drift mechanism changed from a cross-reference comment — **already filed as insufficient by 11b.9's review** — to one shared constant. **(9)** **AC5 added**: `deferred-work.md:2163`'s keyExtractor re-trigger has fired by name and this is the only story that can supply the stable key it lacks. **(10)** AC6 given a real home, the two real-anonymization precedents, and the exercise-the-variant fixture rule. **(11)** Task 0 is **TRANSCRIBE-or-STOP**. | BigDev + Claude |
