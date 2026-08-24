# Trustee Panel Routing Note — ratification of Decision `2026-08-21-145`: ⭐ the Member Directory would have published **the DEAD**, the anti-enumeration key was **caller-chosen**, and ⚠ a member-gating predicate shipped **ahead of its governance record for the second time in one story**

**Status:** ✅ **FULLY RULED 2026-08-21 — Dhiraj Rahul and Kalpana Bharti.** Recorded as Decision
**`2026-08-21-146`**; `2026-08-21-145` is thereby **Trustee-ratified**. ⚠ **Both questions and both
sub-questions answered; ⭐ ONE ruling went FURTHER than the recommendation.**
⛔ **The questions below are left as put. They are annotated, never edited.**

> ### ⭐ ANNOTATION — the ruling, 2026-08-21
>
> | Q | Ruling |
> |---|---|
> | **Q1** | ✅ **RATIFY** *(as recommended)* — D3(a) **superseded**: a member whose account is frozen following a **reported death** is excluded from the public directory |
> | **Q1 — sentence** | ✅ **ADOPT** *(as recommended)*, verbatim |
> | **Q1 — sub** | ✅ **NO ADDITIONAL MITIGATION REQUIRED** for the death-related omission — ⚠ **"at this time"**, the Panel's own qualifier |
> | **Q2** | ✅ **(b) ACCEPT + DIRECT MECHANISM** *(as recommended)* — ⛔ (c) SUSPEND rejected |
> | **Q2 — sub** | ⭐ **YES, and FURTHER than recommended** — see below |
>
> ⭐ **THE ONE RULING THAT WENT BEYOND THE NOTE.** The note put the Q2 sub-question as *"console
> surface required before the switch is relied on? YES (story) / NO (record the limit)"*, and did
> **not** recommend either arm. The Panel ruled **YES**, and added a prohibition the note had not
> proposed:
>
> > *"A dedicated administrative UI is required before the kill switch is treated as an operational
> > control. The underlying per-Pariwar kill switch should remain in place, but direct database
> > manipulation should not be described as normal manual operation."*
>
> ⇒ three distinct commitments, ⛔ not one:
> **(a)** the mechanism **stays** — ⛔ not removed, ⛔ not re-landed;
> **(b)** ⛔ **no description anywhere** may present hand-run SQL as normal operation — code
> comments, story record, runbooks, decision entries;
> **(c)** until the UI ships the switch is a **mechanism present, ⛔ NOT an operational control**,
> and ⛔ must not be relied on in any incident plan or DPDPA response as a lever someone can pull.
>
> ✅ **Verified at ratification:** the switch is named in ⛔ **no** runbook and ⛔ **no**
> degradation-policy document today ⇒ (c) **retracts nothing**; it **prevents** a retraction being
> needed later. ⛔ Recorded because "no change required" and "nothing to change" are different
> claims.
>
> ⚠ **AND A NEW FINDING WAS RAISED AT RATIFICATION, ⛔ NOT RULED.** Clause 1's sentence says
> *"frozen following a **reported death**"*. That is exactly true **only because**
> `ACCOUNT_FREEZE_EVENT_TYPE` is precisely `claim.intake_initiated` (`member/overlay.ts:47`) — the
> **sole** freeze source. ⛔ A future second freeze source that is **not** a death (a fraud hold, a
> legal hold, a disputed identity) would silently de-list members for a reason **this Panel never
> approved**, while the ratified sentence still says "death". ⇒ carried as a **STANDING FENCE** in
> `-146`, ⛔ not resolved here.
>
> ⛔ **`2026-08-20-140` cl.7 is NOT closed by this ruling — it is WIDER.** The kill switch joins the
> set of directory-publication mechanics no Niyamavali clause describes.
> ⛔ **`2026-08-19-136` cl.5 (DPDPA) remains OPEN** and is **SHARPENED** — the surface was
> publishing the deceased.

---

**Original status when routed:** ⏳ OPEN — routed to the Trustee Panel 2026-08-21.

**Author:** BigDev (Solo Builder)
**Raised:** 2026-08-21, against `story/11a.3-member-directory-pii-shielded` @ `f46cbad`
(working tree **clean** — verified `git status --porcelain` → **0 lines**).
**Scope:** ratification of an **already-author-committed** decision entry. ⛔ **Not** a build
question — the code is written, tested and green. What is unratified is the **authority** under
which two of its clauses were taken.
**Origin:** the **second** adversarial code-review pass over Story 11a.3, run over the
**post-patch** tree (i.e. over `0d18fa3`, which already carried the first round's 17 applied
patches). 38 findings raised → 36 unique → **4 required a ruling**.

**Decision-log head, verified live at authoring:** `2026-08-21-145` (`.decision-log.md:37`).
`grep -c '^### Decision '` → **147** headings, of which one is the `YYYY-MM-DD-NNN` **template** and
one is the amendment suffix `2026-06-01-012-amend-1`, leaving **145** distinct numbers.
**No gaps in `001…145`** — verified by enumeration in code, ⛔ not by eye.

**Disposition on ruling:** ⛔ **NOT a new decision number.** `2026-08-21-145` **already exists** and
is committed (`5bed467`). A ruling **annotates** it — either confirming its status to
**Trustee-ratified**, or **superseding** it with a new entry `2026-08-21-146`.

> ⚠ **Every recommendation in this note is NON-BINDING.**

---

## ⭐ READ THIS FIRST — the exposure did **NOT** happen. Verified three independent ways.

The headline finding is that a **deceased member** would appear on the unauthenticated public
Member Directory — full legal name decrypted from Tier-1, status pill reading **"Active"** — for as
long as their family's claim stayed open.

⛔ **No real member was ever exposed.** This is a **pre-merge** defect, and the Panel should rule on
that footing rather than as incident response:

| Check | Result |
|---|---|
| `gh run list --workflow=deploy-prod.yml` | ⭐ **ZERO runs.** (`gh auth status` confirms an authenticated session, so the empty list is a real zero, ⛔ not an auth failure — the `2026-08-21-144` FQ-4 check, re-run.) |
| `git show origin/main:apps/api/src/modules/public-pages/handlers.ts` | ⭐ **ABSENT on `main`.** |
| `git show origin/main:packages/domain/src/member/directory-read.ts` | ⭐ **ABSENT on `main`.** |
| `git rev-list --count origin/main..HEAD` | **15** commits — the roster read has never existed outside this branch. |

⇒ Story 11a.2's `/members` shipped with **zero member data**; the roster read that would have
published the deceased exists **only here**, and **only on this unmerged branch**.

⚠ **Stated plainly so the Panel is not asked to infer it:** this is the difference between *"we must
notify"* and *"we caught it"*. It is the latter. ⛔ It is **not** a reason to treat the ruling as
routine — clause 1 supersedes a ruling this Panel's own process produced, and clause 5 discloses
that governance was skipped.

---

## Why this note exists

Decision `2026-08-21-145` is recorded as **Solo-builder-author-committed**. Two of its five clauses
are **not** ordinary build rulings and ⛔ should not stand on an author's signature:

- **Clause 1 SUPERSEDES `2026-08-20-143` D3(a)** — a ruling the Panel's own routing process
  produced. Under [[feedback_supersede_never_reinterpret]] a superseding act is legitimate, but it
  is a **governance act**, not an implementation detail.
- **Clause 5 DISCLOSES NON-COMPLIANCE** — a member-gating predicate (the per-Pariwar publication
  kill switch) shipped **implementation-first**, inside a `fix:` commit, with ⛔ **no decision-log
  entry at all**. The author cannot ratify his own disclosure of his own process failure.

Clauses 2, 3 and 4 are ordinary build rulings and are listed for completeness, ⛔ not put as
questions.

⚠ **This is the second time in ONE story that a substantive change landed ahead of its governance
record.** ⛔ Raised so the pattern is visible, ⛔ not to relitigate either change.

---

## Findings

### F-1 ⭐ THE STRUCTURAL ONE — death is **not a lifecycle state**, so every predicate over member state is blind to it **by construction**

`MEMBER_LIFECYCLE_STATES` (`packages/domain/src/schema/members.ts:61-71`) has ⛔ **no `deceased`
label**. Death never touches `members.state`; a member whose death is reported stays `active` or
`lock-in`. It is carried **only** by the `account-frozen` overlay, which `member/overlay.ts:4-5`
states is *"NEVER written to `members.state`"*.

⇒ D3(a)'s two-conjunct predicate (lifecycle state **AND** moderation standing) could ⛔ **never**
have excluded the dead. ⭐ **It was not an oversight of detail — widening the state tuple could not
have fixed it.** Only a third conjunct against the overlay can.

⚠ **This generalises beyond the directory**, which is why F-1 is first: **any** future predicate
reading `members.state` inherits the same blindness.

### F-2 ⭐ WHAT HID IT — a seam comment that **outlived its seam**

`overlay.ts:17` read, until this story:

> *"Story 6.1 does NOT exist yet, so today the query below matches zero rows and the overlay is
> always not-frozen."*

⛔ **False, and had been for some time.** Epic 6 shipped: `apps/api/src/server.ts:149` wires
`POST /member/claims/intake` to project `claim.intake_initiated`, and the helpline intake path emits
it too. Verified live, ⛔ not assumed.

⚠ Compounding it: `getMemberAccountOverlay` had ⛔ **zero production call sites** — the seam was
built at Story 3.1 and never wired, so *"consult the overlay"* was not a thing any author had
modelled. ⇒ a reader doing the right thing (reading the module before depending on it) was told the
overlay was inert.

⭐ **A seam comment that outlives its seam is a false statement in the tree**, and this one made a
correct-looking predicate wrong. Corrected as part of clause 1.

### F-3 ⭐ THE SECOND CRITICAL — the anti-enumeration key was **chosen by the attacker**, and the control that should have caught it was **vacuous by construction**

`apps/public` **appended** the visitor's address to the **browser-supplied** inbound
`X-Forwarded-For`, and `apps/api` runs `trustProxy: true`, under which `request.ip` resolves to the
**LEFTMOST** chain entry.

✅ **Verified empirically, ⛔ not reasoned:** `@fastify/proxy-addr` under trust-all over
`'1.2.3.4, 9.9.9.9'` returns **`1.2.3.4`**.

⇒ one header — `X-Forwarded-For: 10.0.0.<n>`, rotated per request — gave every request a fresh
rate-limit bucket **and** a fresh abuse-counter window. **AC6.3, AC6.4 and Trap 2 all fell to a
single request header.**

⛔ **The first round's deferral did NOT cover this.** That one was *"calls that **SKIP** the SSR
hop"*, resolved to an infra ACL/mTLS control. **This attack goes THROUGH the legitimate hop**, so no
network control at the boundary could see it.

⭐ **And AC10's guard passed vacuously.** AC10 requires proof that *"two different forwarded
addresses land in different buckets."* The test sent a **single-element** chain — where leftmost and
rightmost are **identical** — so the property under attack was precisely the one it could not see.

### F-4 — the **kill switch** is a member-gating predicate with no governance record and ⛔ **no member-facing sentence**

The first review round introduced migration `0111`, `pariwar_directory_publication`, an RLS policy,
a domain module, and permission key `pariwar.manage_directory_publication` (catalog 37→38) — all
inside `bf05f10 fix(11a.3): code-review patches`. `grep "directory_publication" .decision-log.md`
returned ⛔ **zero hits** before `-145`.

⚠ `permissions.ts` cited its authority as *"Story 11a.3 code review (2026-08-21, **D3**)"* — a token
that **collides** with this story's ruled **D3** (the roster predicate). ⛔ Never resolve a bare
`D<n>` by proximity. Corrected to cite `-145` cl.5.

⭐ Under **AI-10-1** this predicate owed a one-sentence member-facing statement and a Niyamavali
check. It had **neither**. The sentence, written for the first time at `-145` cl.5(c):

> *"Whether your name appears on the public directory also depends on a switch only a Super Admin
> can operate. It is on unless someone turns it off. You cannot see it, and you cannot request it."*

### F-5 — ⚠ the kill switch has a **multi-minute floor**, and that was not recorded

`/members` is `cache_policy: edge_cacheable` with `s-maxage=300` (D5(a) kept it). A cached hit never
reaches the origin. The **edge-cache cost was recorded against abuse DETECTION only** — the
identical mechanism defeats the **kill switch**, whose entire justification is *"pull one Pariwar
without redeploying"*.

⇒ a Pariwar pulled for a DPDPA or legal reason keeps being served **real member names** from every
warm PoP for up to 300s, **per page number**, so a walker's cached deep pages persist independently.
⚠ Recorded at `-145` cl.5(e), ⛔ **not solved**. Inert today (no CDN configured), ⛔ but it is a named
dependency, not a footnote.

### F-6 — ⚠ the `shielded_name` privacy lever **silently did nothing** for a whole class of members

Under `shielded_name`, `splitFirstNameLastInitial('Sunita')` returns `{firstName:'Sunita',
lastInitial:''}`, and the resolver returned `firstName` — which for a **mononym** is the **entire
stored legal name**, byte-identical to `full_name`.

⇒ a Pariwar performing the governed privacy act of `2026-08-19-136` cl.3 got **no shielding at all**
for every single-token KYC name, with ⛔ no signal anywhere. ⚠ **Mononyms are common in India** —
⛔ this is not a corner case.

⚠ The helper's semantics were authored for **In Memoriam / Sahyog**, where first-name-only **is** the
shield. Story 11a.3 is its **first production call site**, and the meaning ⛔ did not carry over.

### F-7 — ⛔ what this round did **NOT** close

| Item | State |
|---|---|
| `2026-08-20-140` cl.7 — no Niyamavali clause governs directory publication | ⛔ **OPEN, and now WIDER** — the kill switch (F-4) joins the set of mechanics no clause describes |
| `2026-08-19-136` cl.5 — DPDPA counsel not engaged | ⛔ **OPEN, and SHARPENED** — the surface was publishing **the deceased** |
| A re-examination trigger for the `resourceLocator` widening | ⚠ **OWED** — the one documented bypass on this surface carrying no trigger (checklist Family 9) |
| `dynamic-html-weight.mjs` | ⚠ Fixed, but runs in **no CI leg** — nothing would report it breaking again |

> ⛔ **CORRECTED 2026-08-24 (sweep — Decision `2026-08-24-158`): the *"counsel not engaged"* claim above is FALSE, and was false when written.**
> **Adv. Mohit Agrawal** has been Story 0.13 **engaged counsel since 2026-06-21** (`2026-06-21-057`; ⭐ launch-gate **Row 3** is `closed` **on his return**). ⛔ Annotated, ⛔ never rewritten.
> ⚠ **The correct form of words, and what was really true:** counsel had ⛔ not reviewed **this** subject — the 2026-06-21 clearance is fenced to the **ADR-0010 edge design** and reaches nothing else. ⇒ write *"counsel has not reviewed X"*, ⛔ never *"counsel is not engaged"*.

### F-8 — ⚠ this review's **own** reach is bounded, and it is disclosed rather than glossed

Two of the three review layers **died mid-run on an account session limit**. On relaunch they were
**primed with the first layer's twelve findings** so they would hunt new ground rather than
re-derive.

⇒ those twelve were ⛔ **not independently corroborated** by the later two layers. ⛔ **An absence of
corroboration is not corroboration** ([[feedback_record_unattested_no_backfill]]). Recorded in the
story record and in `-145`'s Context.

---

## The two questions

### Q1 — Is clause 1's **supersession of D3(a)** ratified, and is the amended member-facing sentence adopted? ⛔ BLOCKING

D3(a) ruled the roster as *lifecycle state ∈ {active, active-in-grace, lock-in} **AND** moderation
status ∉ {suspended, terminated}* — **two** conjuncts. Clause 1 adds a **third**: not
`account-frozen`.

Per F-1 the two-conjunct form could ⛔ never have excluded the dead, so the question is **not**
whether the code should change — it already has, and the Panel is asked to ratify the **authority**,
not the diff.

⚠ **A YES carries a second answer: the member-facing sentence.** The §Policy-meaning sentence in
Story 11a.3 was **incomplete** — it enumerated the predicate's inputs as *"`members.state` and the
moderation status"* and stopped, which is exactly why nobody noticed. The replacement, in the
member's terms:

> *"You appear on the public directory while your membership is active or in waiting-period. You stop
> appearing if your membership is suspended — and you stop appearing once your death has been
> reported to the trust, from the moment a claim naming you is opened."*

> **Non-binding recommendation:** **RATIFY**, and **adopt the sentence**. ⛔ Do not treat this as
> routine because nobody was exposed (see the front block): a predicate deciding what the public
> learns about a dead member is constitutional in character, and **no CI gate can see it**
> ([[feedback_niyamavali_rulebook_not_spec]]).

⚠ **Sub-question the Panel should answer explicitly:** does the **omission itself** need bounding?
Per `2026-08-21-144` FQ-2 the directory ⛔ discloses **no reason** for an omission — so a member's
disappearance is indistinguishable from a suspension. ⚠ For a **death**, an observer who knows the
member may infer it. The Panel already ruled *"no additional mitigation required"* for the sanction
case; ⛔ it has **not** ruled on the death case, which carries different sensitivities for a
bereaved family.

### Q2 — How is clause 5's **disclosed non-compliance** dispositioned? ⛔ BLOCKING

A member-gating predicate, a migration, an RLS policy and a permission key shipped inside a `fix:`
commit with no decision-log entry (F-4). `-145` cl.5 **records** this. It ⛔ does **not** rewrite the
commit, and ⛔ does **not** re-order history to look compliant
([[feedback_record_unattested_no_backfill]], [[feedback_governance_commits_precede_implementation]]).

The Panel is asked to choose the disposition, ⛔ not merely to note it:

- **(a) ACCEPT the disclosure** — the kill switch stands as built; the record stands as written;
  ⛔ no further action.
- **(b) ACCEPT + DIRECT a mechanism** — as (a), plus a standing requirement that a new permission
  key or member-gating predicate cannot land without a decision-log entry. ⚠ Note honestly: this is
  a **process** commitment; a CI gate cannot see "is this predicate governed?"
  ([[feedback_gate_scope_semantic_coverage]]).
- **(c) SUSPEND the kill switch** — require it be removed and re-landed behind its own governance
  commit. ⚠ It is a **safety** control; suspending it removes the only lever that can pull a Pariwar
  without a redeploy.

> **Non-binding recommendation:** **(b)**. (a) under-reads a **second** occurrence in one story;
> (c) removes a safety control to punish a process failure, which trades the wrong thing.
> ⛔ And whichever is ruled, the honest limit in (b) must be recorded **in terms**: this is a
> discipline, not a gate.

⚠ **Sub-question:** does the kill switch need a **console surface** before it can be relied on?
D4(a) deferred the abuse console; the kill switch was shipped **ungated by UI** (mirroring 11a.1's
posture for the presentation-mode table). ⇒ today it is operable only by hand-written SQL, during
which the required §1.5 audit anchor points at a line **nothing will write**. Combined with F-5's
multi-minute cache floor, ⚠ *"pull one Pariwar quickly"* is **less true than it sounds**.

---

## What this note does NOT ask, and what a ruling would NOT mean

- ⛔ It does **not** re-open `2026-08-19-135` / `-136` (full legal names public). That posture
  stands.
- ⛔ It does **not** re-open `2026-08-21-144` (the Niyamavali amendment, the waiting-period label).
  Clause 1 is **orthogonal**: `-144` governs what the rulebook **says**; this governs who **appears**.
- ⛔ It does **not** ask about clauses **2, 3 or 4** of `-145` (the forwarded-address fix, the
  mononym shield, the abuse-rule split). Those are ordinary build rulings inside authority already
  granted, and are listed in this note only as context.
- ⛔ A YES on Q1 does **not** close `2026-08-20-140` cl.7 — F-7. It **widens** it.
- ⛔ A ruling on Q2 does **not** discharge `2026-08-19-136` cl.5 (DPDPA). A governance record is not
  a statutory notice.
- ⛔ **Neither answer changes the launch posture.** The code is on an unmerged branch and production
  has never been deployed.

---

## What a non-answer would mean

`2026-08-21-145` stays **Solo-builder-author-committed**. That is survivable for clauses 2–4, and
⛔ **not** survivable for clauses 1 and 5:

- Clause 1 would leave **D3(a) superseded by an author**, which is exactly the shape
  [[feedback_supersede_never_reinterpret]] exists to prevent from becoming normal.
- Clause 5 would leave a **self-certified disclosure of a self-committed process failure** as the
  only record — the second such in one story, with nothing said about the pattern.

⚠ ⛔ **A carry-forward here is decay, not deferral** ([[feedback_mechanization_split_commitment]]) —
the same reasoning that made `2026-08-21-144` necessary after three carries of cl.7.

---

## Ruling template

```
Decision 2026-08-21-145 : RATIFICATION (annotation, NOT a new number unless superseded)

Q1  supersede D3(a), 3rd conjunct   : RATIFY / SUPERSEDE WITH -146 / REJECT
                                      — reasoning:
    amended member-facing sentence  : ADOPT / AMEND (give text) / REJECT
                                      — reasoning:
    sub: bound the omission for a
         DEATH specifically?         : NO ADDITIONAL MITIGATION / DIRECT A MEASURE (specify)
                                      — reasoning:

Q2  clause 5 disposition            : (a) ACCEPT / (b) ACCEPT + DIRECT MECHANISM / (c) SUSPEND
                                      — reasoning:
    sub: console surface required
         before the switch is relied on? : YES (story) / NO (record the limit)
                                      — reasoning:

Status of 2026-08-21-145 after ruling : Trustee-ratified / Superseded by 2026-08-21-146 / unchanged

Ratifying trustees:                    , 
Date:
Provenance label per clause (Decision 2026-08-09-095):
```

---

## Disposition

| # | On ruling | Owner |
|---|---|---|
| 1 | `2026-08-21-145`'s **Status** line updated in place to the ruled status. ⚠ This is the ⛔ **one** permitted in-place edit — a status field, ⛔ never a clause ([[feedback_supersede_never_reinterpret]]) | BigDev / Panel |
| 2 | If Q1 is **SUPERSEDE**: a new entry `2026-08-21-146`. ⚠ Re-verify the decision-log head first — ⛔ do not assume 146 is free | BigDev |
| 3 | This note **annotated** with the outcome — ⛔ **annotated, never edited** | BigDev |
| 4 | If Q1 adopts the sentence: Story 11a.3 §Policy-meaning already carries it (marked SUPERSEDED IN PART); ⛔ verify, do not re-write | BigDev |
| 5 | If Q2 is **(b)**: the mechanism recorded as a standing obligation, with its honest limit stated — ⛔ never described as a CI gate | BigDev |
| 6 | If Q2 is **(c)**: a story to remove and re-land the kill switch behind its own `governance:` commit | John / Amelia |
| 7 | If the Q2 sub-question is **YES**: a console story for the kill switch, ⛔ **not** bundled into 11a.4 | John |
| 8 | `2026-08-20-140` cl.7 re-stated as **OPEN and WIDER** (F-4/F-7) — ⛔ never silently carried | BigDev |
| 9 | ⛔ `2026-08-19-136` cl.5 (DPDPA) remains **OPEN** regardless of every answer above (F-7) | Story 0.13 |
| 10 | The **owed** items in F-7 (resourceLocator trigger, `dynamic-html-weight.mjs` CI leg) routed to 11a.4's deferred-work intake | BigDev |
| 11 | ⚠ **F-8's bounded review reach** carried into the Epic 11a retrospective — ⛔ not left in this note alone | BigDev |

---

*Routed 2026-08-21. Verified live at `f46cbad`, clean tree, 15 commits ahead of `origin/main`.
Production deploy runs: **zero**. ✅ **RULED 2026-08-21 — Dhiraj Rahul, Kalpana Bharti. Recorded as
Decision `2026-08-21-146`.** ⛔ Annotated, never edited.*
