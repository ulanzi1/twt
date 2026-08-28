# Trustee Panel routing note — 2026-08-28
## Does the 28 August consent model survive Deed Clause 15(c)? And two consequences of cl.10 nobody recorded

**Author:** BigDev, Solo Builder — 2026-08-28
**Occasion:** Routing the findings recorded at `.decision-log.md#decision-2026-08-28-163`. ⚠ **That
entry is the record; this note is the instrument** — it is what actually puts the questions to the
Panel. ⛔ A decision-log entry does not route anything.
**Routed to:** Trustee Panel · **Adv. Mohit Agrawal** (T&C review return due **2026-09-07**).
**Status:** ⏳ **ROUTED, ⛔ NOTHING RATIFIED AND NOTHING APPLIED.**

> ⛔⛔ **THE HEADLINE, AND IT IS NOT THE ONE THIS NOTE WAS OPENED TO WRITE.**
> This note was started to route two consequences of `2026-08-28-160` **cl.10**. Checking them
> against the Trust Deed surfaced something larger:
>
> ⭐⭐ **THE 28 AUGUST CONSENT MODEL IS, ON ITS FACE, INCONSISTENT WITH DEED CLAUSE 15(c) — AND THE
> ROUTING NOTE OF 2026-08-24 HAD ALREADY IDENTIFIED THIS EXACT PROBLEM AND ASKED THE PANEL ABOUT IT.**
> The Panel answered it in substance on 28 August by adopting the T&C basis. ⛔ **The corresponding
> Deed drafting instruction was never issued.** ⇒ the model is ratified while the instrument that
> governs it still says the opposite.
>
> ⚠ ⛔ **This is stated as a conflict on the face of two documents, ⛔ not as legal advice.** The author
> is ⛔ not counsel. What is asserted is that the texts do not agree; what they *mean together* is
> Q1's subject.

---

## 1. What Deed Clause 15(c) says, verbatim, today

Read at `docs/legal/trust-deed.md:191` on 2026-08-28 — ⛔ **unchanged** since the 2026-08-24 note
quoted it:

> *"Public rendering of any **member, contributor, nominee, or verifier** information (including
> memorial or contributor-list surfaces) shall be effected **only with explicit, revocable,
> purpose-specific consent and never on a default opt-in basis**."*

Four mandatory adjectives, and the clause names **memorial and contributor-list surfaces** expressly
— so it ⛔ cannot be read as aimed at something else. It names **nominee** expressly too.

## 2. Where the 28 August model does not meet it

| Deed 15(c) requires | The 28 August model | Reads as |
|---|---|---|
| **explicit** consent | T&C acceptance with scroll-through + digital signature (`-160` cl.4(c)) | ⭐ **arguably met** — this is the one limb the model strengthens |
| **revocable** | `-160` cl.6 removes the family's decline path; clause 8 binds the nominee **"as a condition of"** pursuing a claim | ⛔ **not met** — a condition of membership or of claiming is not revocable while one remains a member or a claimant |
| **purpose-specific** | *"as the Trust deems necessary for the establishment, administration, verification, transparency, operation and smooth functioning"* | ⛔ **not met** — this is the opposite of purpose-specific, and is the very phrase `-160` cl.9 already defers for DPDP alignment |
| **never default opt-in** | acceptance is a **condition of membership** / of claiming | ⛔ **not met on its face** — a mandatory term is not an opt-in at all |

⚠ ⭐ **Note what this means about `-160` cl.9.** The Panel already resolved to align *"as the Trust
deems necessary"* to the DPDP Act **before launch**. ⇒ **the Deed was already asking for the same
thing** — so the alignment work is ⛔ not only a DPDPA matter; it is a **Deed-compliance** matter, and
it is owed **before** the model is relied on, ⛔ not merely before launch.

## 3. ⚠ The 2026-08-24 note asked this, and the answer never reached the Deed

`trustee-panel-routing-note-2026-08-24-drive-record-publication-basis.md` **Q1**:

> *"Does the Trust wish to publish a deceased member's name on the public drive record on a basis
> **other than the family's consent**? ⭐ **If yes, the change is to Deed Clause 15(c)**, and because
> the Deed is UNEXECUTED and already in redraft, it is a **DRAFTING instruction to counsel** — ⛔ not
> an amendment to an executed instrument."*

⇒ On 2026-08-28 the Panel **answered yes in substance**: the member's T&C acceptance became the basis
(`-160` cl.4(a)), C-5's consent mechanism was superseded (cl.3), and the boxes were retired (`-162`).
⛔ **No Deed drafting instruction was issued, and Clause 15(c) is untouched.**

⭐ **The good news, and it is the same as in August:** the Deed is **UNEXECUTED** —
`docs/legal/trust-deed.md:25` still carries `[[City]], [[State]]` and `[[___]] day of [[Month]],
[[Year]]` — and is in **active redraft** (`trust-deed-objects-v3-redline.md`,
`trust-deed-objects-v4.md`). ⚠ **But v4 does ⛔ not reach Clause 15(c)**, and the numbering is a trap:
v4's *"15"* is **Object 15 — General Public Utility (Residuary)**, a different section entirely.
⇒ **this is a drafting decision, ⛔ not an amendment to an executed instrument** — and it is cheap
**now**.

## 4. ⛔⛔ TWO PRECONDITIONS THAT ARE WORSE THAN WHEN THEY WERE LAST RAISED

**(a) `docs/legal/` is STILL UNTRACKED.** `git ls-files docs/legal` returns **empty** on 2026-08-28,
listing **ten** files on disk including `trust-deed.md`, `niyamavali.md`, and **both** T&C files.
⚠ Decision `2026-08-21-144` **cl.7(a)** required version control **before** the directory amendment
was applied. That was **one week ago**, it has ⛔ not been done, and it now blocks a **third**
amendment. ⇒ ⭐ **the Trust's entire legal corpus — including the T&C on which the whole 28 August
model now rests — has ⛔ no diff, ⛔ no history and ⛔ no attribution.** A change to it leaves no trace.

**(b) ⭐⭐ AND A T&C ALREADY EXISTS — `docs/legal/terms-and-conditions.md`, 133 lines, 13 sections,
with an FR-94 verbatim-phrasings section and a completion checklist.**
⚠⛔ **The review roster records the opposite, by name.** Its Row 1 note states, of 2026-08-24:
*"⛔ **no T&C prose was ever authored**: verified 2026-08-24, the only T&C-adjacent prose anywhere in
the repo is the tagline in `packages/i18n/locales/hi/contribution.json`."*
⇒ ⭐ **that verification was almost certainly run git-aware, and the untracked legal corpus was
invisible to it** — precondition (a) is what made the error possible.
⚠ **Consequence:** the v0.1/v0.2 T&C drafts in `handover/` were assembled **from the PRD**, on the
premise that no T&C prose existed. ⛔ **Whether they duplicate, supersede, or conflict with
`docs/legal/terms-and-conditions.md` has ⛔ not been assessed.** ⚠ Note also that file is headed
**"ALL INDIA PARIWAR WELFARE TRUST"**, ⛔ not Tirhut Wing Trust — ⇒ ⛔ its status (precedent,
template, or this Trust's actual instrument under a former name) is **unknown and is ⛔ not assumed
here**.

## 5. The two cl.10 consequences this note was opened for

**(a) `2026-08-28-160` cl.10 appears to have DISSOLVED the SD-2 deferral — the one Epic 11b labels
BLOCKING.** SD-2's disposition (c) deferred the nominee-bank fragment on one verified property:
⛔ *"no browser surface holds a member token, by any mechanism"*, so an `authenticated_member` viewer
**cannot exist**; its written trigger is *"a browser surface that holds a member token."*
⇒ cl.10 makes that data **public** during the active campaign, and a `public`-tier field needs
⛔ **no authenticated viewer at all**. **The premise no longer obtains.**
⚠ ⛔ **Not declared dissolved here.** The AR-48 concept was *"carried, not deleted"*, and cl.10 masks
the **public** view while saying ⛔ nothing about an **authenticated** one — a post-masking
authenticated tier may still want it.

**(b) The same clause walks 11b.3 into a gate designed to fail closed.**
`packages/contracts/src/public-pages/matrix.ts:392` holds `RULED_TIER1_PUBLIC_EXCEPTIONS`, an
enumerated allowlist of **(surface, field)** pairs — currently **exactly two**. The nominee account
number is **Tier-1** (`schema/claim_nominee_bank_accounts.ts:61`, `piiColumn(1, …)`), so rendering it
at `public` is a **third** entry. The file forbids the obvious move in terms:
> *"⛔ ADDING TO THIS LIST IS A RULING, NEVER A CODE CHANGE … do NOT 'fix' a failing third entry by
> appending it here — **the gate failing is the gate working**."*

And 11b.1's own entry fences the surfaces out **by name**: *"Its scope does NOT reach 11b.3 (Sahyog
Vivran) or 11b.6 (In Memoriam)… moving them requires each surface's **OWN** Panel ruling."*
⇒ ⭐ **cl.10 authorised the POLICY; it did ⛔ not mint the matrix entry, and ⛔ could not have.**
⚠ Verified: ⛔ **neither `sahyog-vivran` nor `in-memoriam` is declared in the matrix at all** ⇒ a
**declaration blocked on a ruling**, ⛔ not an amendment. ⭐ **The gate is working as designed.**

## 6. The questions

**Q1 — To the Panel and to counsel, and it is the one that matters.** Deed Clause 15(c) requires
consent that is **explicit, revocable, purpose-specific and never default opt-in**, for exactly the
surfaces Epic 11b builds. The 28 August model rests instead on **acceptance as a condition** of
membership and of claiming. ⇒ **Does the Trust intend to amend Deed Clause 15(c) to match the model
it has adopted — and if so, on what drafting?** ⚠ Because the Deed is **unexecuted and in redraft**,
this is a **drafting instruction**, ⛔ not an amendment. ⛔ **If the answer is no, the model does not
stand and `2026-08-28-160` needs revisiting** — ⛔ this note does not assume which way it goes.
⭐ **Sub-question to counsel:** does an accepted contractual **term** satisfy 15(c)'s *"consent"*, or
does 15(c) require a **separate, revocable act** — the very mechanism `-160` cl.3 superseded?

**Q2 — To the Panel.** Is SD-2's deferral **dissolved**, **narrowed**, or does it **survive** for a
post-masking authenticated tier? ⛔ It may not be quietly treated as still blocking, ⛔ nor quietly
treated as gone.

**Q3 — To the Panel.** Will the Panel rule a **third** `RULED_TIER1_PUBLIC_EXCEPTIONS` entry for
nominee bank fields on `sahyog-vivran`? ⚠ Story 11b.3 ⛔ **cannot declare its surface** until this
lands. ⛔ Do not resolve it by editing the allowlist.

**Q4 — To BigDev, ⛔ not the Panel.** Put `docs/legal/` under version control (§4(a)), then assess
`docs/legal/terms-and-conditions.md` against the `handover/` drafts (§4(b)). ⚠ Until (a) is done, any
Deed or T&C drafting instruction from Q1 lands in a corpus with ⛔ no history.

## 7. What this note does ⛔ NOT do

⛔ Does **not** ratify, amend or apply anything · ⛔ does **not** rule Q1, Q2 or Q3 · ⛔ does **not**
edit `matrix.ts`, `epics.md` Story 11b.3, the Deed, or any file in `docs/legal/` · ⛔ does **not**
assert that the 28 August model is invalid — only that it and Deed 15(c) **do not agree on their
face** · ⛔ does **not** block Story 11b.9, whose subject is the **member's own** name and whose
blockers are its own D1/D2/D4/D5 · ⛔ mints **no** launch-gate roster row.

⚠ **And nothing here reopens what the Panel actually settled:** the retirement of the claim-screen
boxes (`-162`) and the clearance of the three surfaces (`-160` cl.7) stand. ⛔ What is unsettled is
whether the **instrument beneath them** says what they assume it says.

---

## Sources — every one read on 2026-08-28

- `docs/legal/trust-deed.md` **:191** (Clause 15(c), verbatim) · **:25** (unexecuted placeholders) · **:307** (Clause 28 — ⚠ note it addresses **Deed vs *Niyamavali***; ⛔ it does **not** name the T&C) · `trust-deed-objects-v4.md` (⚠ its *"15"* is **Object 15**, ⛔ not Clause 15)
- ⛔ `git ls-files docs/legal` → **empty**; ten files on disk incl. `terms-and-conditions.md` (**133 lines, 13 sections**, headed *"ALL INDIA PARIWAR WELFARE TRUST"*)
- `_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-08-24-drive-record-publication-basis.md` **Q1** (the question whose answer never reached the Deed)
- `.decision-log.md#decision-2026-08-28-160` (**cl.3 · cl.4 · cl.6 · cl.9 · cl.10**) · `#decision-2026-08-28-162` (box retirement) · `#decision-2026-08-28-163` (the findings this note routes) · `#decision-2026-08-24-159` **cl.2** (the second allowlist entry + the 11b.3/11b.6 fence) · `#decision-2026-08-21-144` **cl.7(a)** (the version-control precondition, ⛔ still unmet)
- `packages/contracts/src/public-pages/matrix.ts` **:376-398** · `packages/domain/src/schema/claim_nominee_bank_accounts.ts` **:61**
- `_bmad-output/planning-artifacts/epics.md` — the SD-2 / AI-11a-2 disposition (c) block at Story 11b.3
- `docs/legal-counsel-engagement/review-artifact-roster.md` Row 1 notes (the *"no T&C prose was ever authored"* claim §4(b) corrects)
