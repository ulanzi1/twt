# Trustee Panel routing note — a disqualified nominee: who gets the money, and how far the ban reaches

> **§0 gate — passed (2026-09-21).** All three questions are the Panel's: who **receives** when a nominee is
> disqualified, whether one Pariwar's decision binds every other, and whether a lifetime exclusion follows
> the person who rewrote a dead member's nominee. Stripped of every citation: *"if the person named turns
> out to be a cheat, who does the money go to; does one community's decision shut somebody out everywhere;
> and is losing the claim the end of it, or is the person barred for life?"*
>
> ⚠ **Three short reaches**, deliberately kept out of the companion note on what the Trust keeps. That one
> is heavy; bundling everything into one document is how a note comes back answered in four words.

> ## ✅ PANEL RULED — 2026-09-21
>
> **Ratifying trustees:** Dhiraj Rahul + Kalpana Bharti. ✅ **DISCHARGED — recorded as `2026-09-21-240`** in `.decision-log.md` (2026-09-21); the sanction chain of
> Q2 also amends `2026-09-21-238` cl.3. ⭐ Kept, ⛔ not deleted: this line previously read *"owed an entry"*.
>
> | | Ruled | Meaning |
> |---|---|---|
> | **Q1** | **option B** | The ladder stands: two nominees and **one** involved ⇒ **the other receives the whole amount**. Where ⛔ **no** honest nominee remains (both involved, or a lone nominee involved) the **State Trustee** may authorise payment to a person who produces **proof of succession**. ⛔ No legal-heir schema is built |
> | **Q2** | **option C** | The ban is **Trust-wide**, and is imposed **one level up** after the Pariwar Admin **refers** it — ⛔ the Pariwar Admin ⛔ no longer imposes it themselves |
> | **Q3** | **option C** | A post-death rewrite ⇒ the claim is **refused immediately**; a lifetime ban follows **only** after the same investigation required for a faked death |
>
> ⭐ All three match the note's recommendation.
>
> **⚠⚠ Q2 SUPERSEDES the Panel's own earlier instruction, and that must be recorded as a supersession.** The
> 2026-09-20/21 ruling said *"Pariwar admin imposes it."* Option C moves imposition **up one level** and
> leaves the Pariwar Admin as the **referrer**. ⚠ This is ⛔ not a clarification.
>
> ⭐⭐ **Q2's open sub-question — RULED the same day (2026-09-21, DR + KB): `state_trustee` IMPOSES,
> `super_admin` LIFTS.** The note had flagged that *"one level up"* was ⛔ not named, and that letting Super
> Admin both impose and lift would leave the lift checking ⛔ nothing. The Panel named the separation.
> ⇒ the full chain is: **helpline operator or District Admin flags → District Admin verifies → Pariwar Admin
> refers → STATE TRUSTEE imposes → SUPER ADMIN may lift.** ⛔ Not appealable; indefinite.
> ⚠ **Implementation note for whoever builds it:** direct `state_trustee` gating is **RANK-ORDER BLOCKED** in
> this codebase (6.20 D8), so the imposing route ⛔ cannot simply be gated on that role — it needs the same
> treatment D8 gives the Pariwar-dimension step.
>
> **⚠ What this ruling does ⛔ NOT cover:**
> - **Q1's "proof of succession"** — what document satisfies it, and who bears the cost of obtaining it,
>   is **unspecified**.
> - ⭐ **Q1 accepts the 75/25 redistribution** flagged below: a secondary nominee named at **25%** receives
>   **100%** when the primary is disqualified. That **moves R5(E)'s ratified split** in this case and is now
>   a ruled consequence, ⛔ not an open question.
> - ⛔ It does **not** move `-226`, `-227` or `-233`–`-236`.
>
> ⭐ **Implementation needs a ROW.** ⚠ **Q1's first row lands inside Story 6.20** — see D17(c), which stops
> being provisional: a disqualified **primary** yields the rank set `{2}`, which 6.20's coherence check
> refuses ⇒ the surviving nominee is **re-ranked to rank 1**. The rest is the fraud register's own story.

---

# Question 1 — when a nominee is disqualified for fraud, who receives the money?

**In one sentence:** You have ruled that a nominee changed after the death is discarded and *"only nominee
that was chosen by member will receive"* — which answers the case where a **new** name was slipped in, but
⛔ not the case where **the person the member genuinely chose** is the one who cheated.

## The one fact that decides it

⭐⭐ **The Trust has ⛔ NO concept of a legal heir. It knows only nominees.**

⚠ This is where the Trust differs structurally from an insurer, and it is worth one paragraph because it is
the heart of the question. In Indian insurance law a nomination is a **payment mechanism, ⛔ not a transfer
of ownership**: under *Sarbati Devi v. Usha Devi* (1984) the nominee is simply the authorised payee and
holds the proceeds **as trustee for the legal heirs**. The 2015 amendment (§39(7)) made a nominee
*beneficially* entitled **only** where they are a **parent, spouse or child**; everyone else remains a
*"collector"* holding for the family. And §39 **⛔ does not override succession law**. ⇒ when an insurer's
nominee is disqualified, the nomination simply falls away and **succession law decides** — there is always
somebody underneath.

**The Trust has ⛔ nothing underneath.** Its only fallback is *the previous nominee version*, which ⛔ does
not exist when the declared nominee is themselves the wrongdoer.

⭐ **The Trust's own structure already absorbs most of this.** A member may name **two** nominees, and it is
very unlikely that **both** would be involved in the same fraud. So the ladder is:

| Case | Who is paid |
|---|---|
| Two nominees, **one** involved | ⭐ The **other nominee** receives the whole amount |
| Two nominees, **both** involved | ⚠ ⛔ No nominee remains |
| **One** nominee named, and involved | ⚠ ⛔ No nominee remains |

⇒ the only genuinely open question is the last two rows — **what happens when ⛔ no honest nominee is left.**
⚠ Those rows are **rare but ⛔ not negligible**: a second nominee is entirely optional today (FR-4:
*"one or two nominees"*, ⛔ never prompted), so a member naming only a spouse is an ordinary case.

| | Option | What changes for a person | Cost |
|---|---|---|---|
| **A** | One of two involved → the other is paid in full. With ⛔ no honest nominee left, the claim is refused and ⛔ nobody is paid | Most cases resolve to a person the member actually chose | Needs ⛔ no new machinery at all. ⚠ In the last two rows a family that did ⛔ nothing wrong receives **nothing**, and the pool keeps money collected for that death |
| **B** | Same ladder — but where ⛔ no honest nominee remains, the **State Trustee** may authorise payment to a person who produces proof of succession | The rare case has a named route instead of a dead end | ⭐ Uses discretion the Trust **already has** (R5(E) sends multi-nominee disputes to the State Trustee) and needs ⛔ no heir schema. ⚠ It is case-by-case and slow, and the Trust would be weighing succession documents it has ⛔ never handled |
| **C** | Build a proper legal-heir capability, as an insurer has | Every disqualification resolves by rule | Complete. ⚠ Succession certificates, disputes between relatives, and a whole subsystem — disproportionate to a case the Trust expects to be rare |

**Our reading: B** — **because** it gives the framework you asked for **without** building the machinery.
The two-nominee structure absorbs the common case by itself; the residue goes to the authority the
*Niyamavali* already names for nominee questions. We are ⛔ **not** proposing to force members to name two
nominees: that would tax every member for a rare event, and the second nominee stays optional exactly as
it is today.

⚠ **One consequence of the first row to decide with it.** The member said **25%** to the secondary. Paying
them **100%** is a redistribution the member ⛔ never authorised — an insurer would send the disqualified
share to the estate, ⛔ not to the co-nominee, because a nomination is share-specific. On the Trust's own
model (nominees take beneficially, §39(7) notwithstanding) paying the survivor in full is defensible, ⭐ but
it moves the **75/25 that R5(E) ratifies**, so it is a choice to make openly rather than a consequence to
discover.

---

# Question 2 — whose ban is it: one Pariwar's, or the whole Trust's?

**In one sentence:** You ruled that the **Pariwar Admin** imposes the ban — and Pariwars are separate
communities whose administrators' authority stops at their own.

## The one fact that decides it

⭐ **If the ban is Trust-wide, one Pariwar's administrator permanently excludes a person from every other
Pariwar** — communities that ⛔ never saw the evidence and were ⛔ never asked.

| | Option | What changes for a person | Cost |
|---|---|---|---|
| **A** | Trust-wide, imposed by the Pariwar Admin who investigated | A banned person ⛔ cannot join anywhere | One Pariwar's administrator binds all the others on evidence only they saw |
| **B** | That Pariwar only | Each community decides for itself | A fraudster simply joins the next Pariwar. ⚠ Close to ⛔ no ban at all |
| **C** | Trust-wide, but imposed one level up after the Pariwar Admin refers it | A banned person ⛔ cannot join anywhere, and a Trust-level office made that call | Slower, and adds a step to the process you already specified |

**Our reading: C** — **because** a consequence that reaches everywhere should be decided by someone
answerable everywhere. ⚠ This **modifies the process you gave us**, so we are flagging it rather than
quietly building it.

---

# Question 3 — does the ban reach the nominee-changed-after-death case?

**In one sentence:** Your ruling terminates and bans *"the member, if guilty"* — but where a nominee was
changed **after** the member died, **the member is dead**, and the person who changed it is a relative.

## The one fact that decides it

⭐ **There is ⛔ no living member to terminate in that case.** Your answer to the post-death question was
that the District Admin refuses the claim, records a reason and notifies the Pariwar Admin — it said
⛔ nothing about a ban.

| | Option | What changes for a person | Cost |
|---|---|---|---|
| **A** | Refusing the claim is the whole consequence | The person who rewrote a dead member's nominee loses that claim and ⛔ nothing more | They may try again on another death, in another family |
| **B** | The ban follows the person who made the change | Someone who rewrites a dead person's nominee is excluded for life | ⚠ A relative who corrected a phone number in good faith, ⛔ not knowing the rule, faces the same lifetime exclusion as a fraudster — and the system ⛔ cannot tell the two apart |
| **C** | Refusal is immediate; the ban follows **only** after the same investigation required for a faked death | Proportionate: the claim is refused now, exclusion only on a finding | Two processes instead of one |

**Our reading: C** — **because** you have already said a change dated on or after the day of death *raises
suspicion* and that a **human** decides what follows. A lifetime exclusion is far heavier than refusing one
claim, and deserves the same finding of guilt you required for a faked death.

---

# ⚠ Not a question today — but the Panel should know

⭐ **The Trust pays every nominee beneficially. Insurance law would ⛔ not.** Under §39(7) only a **parent,
spouse or child** takes beneficially; a **brother, uncle, cousin, niece, sister-in-law or friend** is a
*collector* who holds the money for the family. Your expanded relationship list now contains **all** of
those. ⇒ where an insurer would treat a cousin as a conduit to the family, the Trust hands them the money
outright.

That is a defensible choice for a mutual-aid trust — members name who they want helped, ⛔ not who the law
would give it to. ⚠ But it has ⛔ never been recorded as a **choice**, and it is the reason Question 1 has
⛔ no fallback. ⇒ If the Panel wants it examined, it deserves **its own note**; we are ⛔ not asking it here.

---

# What is at stake right now

- **Live today:** ⛔ Nothing. ⛔ No ban, ⛔ no register, ⛔ no signup check exists anywhere.
- **Blocked:** ⛔ **Nothing in the nominee work.** The declaration history, the lock at the first claim, the
  release route and the refusal path are unaffected by all three answers. ⚠ **Question 1 is the exception
  worth noting:** it does ⛔ not block the build, but it decides what a family is *told* when a claim is
  refused, so the copy waits on it.
- **If nothing is decided:** the defaults are **A, A and C**. ⚠ On Question 2 that means a Pariwar Admin
  binding the whole Trust — the one default we are ⛔ not comfortable with, and the reason it is asked.

---

# How much to trust this note

- **Earlier versions of this question:** ⭐⭐ the first draft's Question 1 asked whether a ban should stop
  someone **being named as a nominee**. **Struck** — the Trust holds ⛔ no identifier for a declared
  nominee (a name and a mobile the member typed, ⛔ nothing more), so it ⛔ cannot recognise one against a
  register. Checking by name would be exactly the guesswork the companion note says must ⛔ never bar
  anyone. ⚠ BigDev caught it; the question it has been replaced by — *who gets the money instead* — is the
  one that should have been asked.
- **Corrected in this note:** an earlier draft treated Question 3 as already answered by the post-death
  ruling. ⭐ Re-reading showed that ruling answers only what happens to **the claim**, ⛔ not what happens to
  **the person** — genuinely open, and had been recorded as closed in error.
- **Still uncertain:** the insurance comparison in Question 1 rests on the general principle (a nomination
  confers ⛔ no beneficial title outside §39(7); the forfeiture rule denies a fraudulent claimant). ⚠ We did
  ⛔ **not** find a reported Indian case squarely on a **forged or fraudulent nomination**, so *"the money
  goes to the heirs"* is **reasoning from the principle, ⛔ not a citation**. Counsel should confirm it
  before the Panel relies on it as settled law.

---

# In plain English

You have decided that someone who defrauds the Trust over a death claim should never be allowed back. Three
things follow that the ruling did not reach.

The first is the one that matters most, and it comes from checking what insurance companies actually do.
When an insurer's nominee turns out to be a cheat, the money is **not** kept — it goes to the family,
because in law a nominee is only a *payee*, and underneath every nomination sits succession law saying who
the money really belongs to. **The Trust has nothing underneath.** It knows only the nominee a member wrote
down.

Happily, the Trust's own arrangement absorbs most of this. A member may name two nominees, and it is very
unlikely both would be in on the same fraud — so where one is, the other simply receives the whole amount,
and that person is somebody the member actually chose. That covers the ordinary case without any new
apparatus, and we are **not** suggesting members be forced to name two: that would burden everybody for
something rare, and the second nominee should stay optional exactly as it is.

What remains is the uncommon case where there is nobody honest left — a lone nominee who cheated, or both
of them. Rather than build a whole machinery for determining legal heirs, we suggest the rules already
provide for it: nominee disputes are settled at **State Trustee discretion**, and that same authority can
consider paying a family member who produces proof of inheritance. Rare case, named route, no new
apparatus. The alternative is that nobody is paid and the money stays in the pool — which may be the right
answer, but should be one you have chosen rather than one discovered the first time it happens.

Second: you said a Pariwar Admin imposes the ban. If it applies across the whole Trust, one community's
administrator is shutting a person out of every other community, on evidence only they saw. A decision that
reaches everywhere should be taken by someone who answers to everywhere.

Third: the ban was described for the case where someone fakes a death. Where a real death happened and a
relative quietly changed the nominee afterwards, the member is dead, so there is nobody to expel. The
question is whether the relative is barred for life or whether losing the claim is the end of it. We
suggest the claim is refused straight away, but a lifetime exclusion should need the same proper finding of
guilt you required for a faked death — because a relative who updated a phone number without knowing the
rule looks identical, to the system, to a fraudster.

⚠ If this section and the technical evidence below ever disagree, **the EVIDENCE is the record**.

---
---

# EVIDENCE — for the record, ⛔ not for the meeting

## E1 — What is already ratified, verbatim

> **`2026-09-20-234` clause V** (Trustee-ratified): *"…if nominee has been changed after death that nominee
> claim will be denied and **only nominee that was chosen by member will receive the claim**."*

> **`2026-09-20-234` clause X** (Trustee-ratified): *"Yes nominee should cover names, relationship, mobile,
> address, split. Yes all of them can be changed as long as member is alive."*

> **`2026-09-20-235` clause Y** (Trustee-ratified): *"District admin decides changed after death against
> death certificate date … A change done before a day of death will be assumed to be done by member,
> everything else will be discarded."*

> **`2026-08-12-099`** (Story 10.20): *"Termination is an exceptional governance act, ⛔ not a stronger
> suspension."*

⚠ **⛔ NOT ratified — a design reference only, and the basis for option B.** The *Niyamavali* (agent-drafted,
⛔ never ratified, ⛔ never a blocker — [[feedback_niyamavali_rulebook_not_spec]]) states at **§2.4 (R5(E))**:
*"Each member declares **one or two nominees** … Where **two** nominees are declared, disbursement is split
**75% to the primary and 25% to the secondary** … **Multi-nominee disputes are resolved at State Trustee
discretion.**"* ⇒ the discretion option B relies on **already exists in the design corpus** for nominee
questions; extending it to *"⛔ no eligible nominee remains"* is a step, ⛔ not an invention. ⚠ But it is
⛔ **not** ratified, so the Panel would be making it so.

## E2 — What is NOT ratified

- ⭐⭐ **The ban ruling is ⛔ NOT in `.decision-log.md`** — given in session 2026-09-20/21; an entry is owed
  **before any build** ([[feedback_governance_commits_precede_implementation]]).
- ⛔ No ruling covers who receives when the **declared** nominee is disqualified, the **geographic scope** of
  a Pariwar Admin's sanction, or whether the post-death rewrite carries a **personal** consequence.
- ⛔ No ruling has ever addressed whether a non-close-relative nominee takes **beneficially** — the Trust
  simply does, and it has ⛔ never been recorded as a decision.

## E3 — What the code actually does

- **⛔ No concept of a legal heir, a succession certificate, or an estate exists anywhere** in the schema.
  The only payout destination is a **nominee's bank account** at claim time.
- **Nominee identity is ⛔ not linked to membership.** A nominee is a name, relationship, mobile and optional
  address on `member_nominees`; claim bank accounts carry *"deliberately ⛔ NO `nominee_rank` column, ⛔ NO FK
  to `member_nominees`"* (6.8 D1). ⇒ the struck Question 1 had ⛔ no substrate at all.
- **Pariwar scope is enforced and asymmetric** — a narrower grant ⛔ never satisfies a broader check, so
  Question 2's option A needs a Trust-wide read of a Pariwar-scoped act that ⛔ does not exist
  ([[project_rbac_geo_scope_containment]]).
- **⛔ No ban, ⛔ no register, ⛔ no signup check.** The only permanent-exclusion mechanism is the **12-month
  re-join lock** on `member_identities.mobile_blind_index`.
- **INFERENCE (labelled):** that a relative might change a nominee in good faith is an inference about human
  behaviour, ⛔ not an observation — there is ⛔ no production data (`-232`), so ⛔ no post-death rewrite has
  ever occurred in this system.

## E4 — Commands to re-verify every claim

```
grep -rniE "\blegal[_ ]?heirs?\b|\bsuccession\b|\bestate\b|\bheirs?\b" packages/domain/src/schema/ packages/domain/src/claim/
grep -n "nominee_rank\|NO FK" packages/domain/src/schema/claim_nominee_bank_accounts.ts
sed -n '38,55p' packages/contracts/src/nominee/declaration.ts
grep -nE "^### Decision .*-234|^### Decision .*-235|^### Decision .*-099" .decision-log.md
grep -n "as long as member is alive" .decision-log.md
grep -niE "blacklist|black-list|permanently barred|never re-join" .decision-log.md
```

⚠ **An empty result is a finding, ⛔ not a pass.** The **first** and **last** commands are both expected to
return **empty** — the first is the evidence that the Trust has ⛔ no heir concept, the last that the ban
ruling has ⛔ not been recorded. All commands were **run on 2026-09-21** and every claim above held.

⚠⚠ **THE FIRST COMMAND WAS WRONG WHEN FIRST WRITTEN, AND RUNNING IT IS WHAT CAUGHT IT.** It read
`grep -rniE "legal_heir|succession|estate" …` with ⛔ no word boundaries, and returned **five matches** —
every one the substring `eState` inside `memberLifecycl**eState**Enum` and `claimLifecycl**eState**Enum`.
⇒ an unbounded term made a **true** claim look **false**. The bounded form above returns empty, as claimed.
⭐ Recorded because this is the **second** E4 command in this pair of notes to fail on being run (the other
was a date false-positive in the companion note) — ⚠ which is the argument for the template's rule that
these are run before sending, ⛔ not written as a formality.

## E5 — External sources for the insurance comparison

- Section 39, Insurance Act 1938 — <https://indiankanoon.org/doc/610691/>
- §39(7) beneficial-nominee concept — <https://lawtarazoo.com/blog/insurance-act-section-39-beneficial-nominee-2015.html>
- Nominee as trustee for legal heirs; *Sarbati Devi* line of authority — <https://www.lawweb.in/2013/01/a-mere-nomination-made-under-section-39.html>
- Insurance nomination ⛔ does not override succession law (Karnataka HC, 2025) — <https://www.business-standard.com/industry/news/insurance-nomination-must-yield-to-succession-laws-k-taka-hc-seeks-clarity-125030400949_1.html>
- Rights of nominees, sectoral divergence — <https://trilegal.com/news-insights/thoughtleadership-tanmay-mondaq-the-rights-of-nominees-of-insurance-policies-explained/>
