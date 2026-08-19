# Trustee Panel Routing Note — the Member Directory cannot show a member's name without decrypting Tier-1, at **either** tier

**Status:** ✅ **RULED 2026-08-19 — Dhiraj Rahul and Kalpana Bharti.** Recorded as **Decision
`2026-08-19-135`**. ⚠ **All five answered, and Q1 went WIDER than the question put.**
⛔ **The questions below are left as put. They are annotated, never edited.**

> ### ⭐ ANNOTATION — the ruling, 2026-08-19
>
> | Q | Ruling |
> |---|---|
> | **Q1** | ⚠ **YES — and FULL NAME**, not the first-name + last-initial the question asked about |
> | **Q2** | ✅ **YES — full name** at the authenticated tier |
> | **Q3** | ⛔ **BUILD IT NAMELESS** |
> | **Q4** | ✅ **Use the existing KYC / legal name**; ⛔ no Tier-3 display-name attribute minted |
> | **Q5** | ✅ Keep rendering and decryption paths **SEPARABLE**, so a future Trustee decision toggles public full-name display **without redesign** |
>
> ⛔ **Both non-binding recommendations on Q1 and Q2 were NOT followed.** The note recommended NO for the
> public tier and *shielded* for the authenticated tier. The Panel authorised **full name at both**.
>
> ⚠ **Q3's antecedent does not obtain** — it was put as *"if Q1 and Q2 are both NO"*, and both are YES.
> Decision `2026-08-19-135` **clause 6** recorded two readings and ⛔ flagged it rather than assuming.
>
> ✅ **RESOLVED 2026-08-19 by Decision `2026-08-19-136`: reading (A).** ⛔ The author's reading **(B) was
> WRONG.** The directory is built with **full legal names publicly visible NOW**, as the **initial**
> posture — ⛔ explicitly **not permanent**, and the implementation *"must not hard-code full-name
> publication as permanent."*
> ⭐ **Q5 resolves into a design requirement:** a **Pariwar-level, governed, configurable
> presentation-policy control** — `public_member_name = full_name` (launch) → `shielded_name`
> (*"Ramesh Kumar"* → *"Ramesh K."*) → future modes — ⛔ **without** changing the stored KYC name and
> ⛔ **without** a second identity system. ⭐ **Member's legal/KYC name ≠ its public-directory
> presentation.** `splitFirstNameLastInitial()` becomes the `shielded_name` **mode**, not a discarded
> helper.
> ⛔ **F-5 is now LAUNCH-BLOCKING** (`136` clause 4): under (A) public legal names render at launch, so
> the inert tier-leak leg must be operative **before the directory ships**.
>
> ⛔ **Supersedes** (clause 7): **FR-75**'s *"first-name + last-initial only"* · **FR-74**'s public-tier
> name form · **`architecture.md:1538`** *"CI guards that no Tier 1 field is rendered to a public
> surface"* — the last requires an **explicit** amendment in G5.
> ⚠ **F-5 is now load-bearing:** the tier-leak guard is **inert**, and under this ruling it must be made
> operative **before** any public name renders.

**Author:** BigDev (Solo Builder)
**Raised:** 2026-08-19, against `governance/epic-11a-directory-attribute-model` @ `b94ea97` (clean),
branched from `main` @ `adf3c52`.
**Scope:** Story **11a.3** rows 6 and 7 (`Full name`, `Public-tier name`). ⛔ **Not** an attribute-model
question — Sprint Change Proposal 2026-08-19 §4.1.2 ruled both rows **out** of the directory attribute
model precisely so they would be routed here.
**Origin:** **G3** of Sprint Change Proposal `2026-08-19` §4.3, approved by BigDev 2026-08-19. Escalated
from Epic 10 Retrospective **SD-1 (c)** and **AI-10-4**.
**Decision-log head, verified live at authoring:** `2026-08-18-131` (`.decision-log.md:37`).
`grep -c '^### Decision '` → **133** headings, of which one is the `YYYY-MM-DD-NNN` **template**, leaving
**132** numbered headings over **131** distinct numbers — the `+1` is the amendment suffix
`2026-06-01-012-amend-1`. **No gaps in `001…131`** (verified by enumeration, not by eye).
**Disposition on ruling:** a single `.decision-log.md` entry. ⚠ **Number not pre-assigned.** **G1**
(`2026-08-19-132`, ratifying R1–R7) is also pending and unrecorded; whichever lands first takes `132`.
⚠ **Re-verify the head at ruling time.** Per Decision `2026-08-09-095` the entry must **label per-clause
provenance**.

> ⚠ **Every recommendation in this note is NON-BINDING.**

> ⛔ **This note does NOT depend on G1.** §4.1.2 removed both name rows from the attribute model, so the
> question below stands whether or not R1–R7 are ratified. It may be ruled before, after, or alongside G1.

> ⚠ **Nothing here is a live PII leak.** No member name is rendered on any public surface today, because
> no member-facing public surface exists yet. **F-5 states precisely which control would be relied upon
> to keep it that way, and why that control is not currently able to do so.**

---

## Why this note exists

Story 11a.3's tiered matrix asks for a member's name at two tiers:

| Row | Tier | Matrix says |
|---|---|---|
| 6 | `authenticated_member` | **Full name** |
| 7 | `public` (no auth) | **First-name + last-initial** |

There is no plaintext member name in this system to render at either tier. Both rows require decrypting
a **Tier-1 KMS envelope**, and one of them requires doing it in an **unauthenticated** process.

The Epic 10 retrospective flagged the public row. It did not flag the authenticated row, and that
undercount is **F-3**.

---

## Findings

### F-1 ⭐ THE FINDING — there is no plaintext member name anywhere in the system

The sole member name is `member_kyc_profiles.name_ciphertext`
(`packages/domain/src/schema/member_kyc_profiles.ts:71`), declared
`piiColumn(1, 'member_kyc')('name_ciphertext').notNull()` — a **Tier-1 envelope**, per-row DEK, KEK in
Cloud KMS. It is **KYC-derived**: it arrives from DigiLocker/Aadhaar (Story 3.3b), so it is a **legal
identity document field**, not a display handle a member chose.

`members` carries no name column and is a **certified PII-free table**
(`schema/member_identities.ts`: *"The `members` table stays PII-FREE (Story 3.1 — it is the lifecycle
anchor)"*).

### F-2 — this is a RATIFIED classification, not an oversight

`architecture.md:1526`, Tier 2 blind index: *"eHRMS ID, **member name** (for search and dedup) …
Stored as: ciphertext (Tier 1) + HMAC hash for equality lookup."*

`architecture.md:1530`, Tier 3 plaintext: *"School, district, designation, joining date, contribution
count."* — ⛔ **name is deliberately absent from the plaintext list.**

⇒ Unlike `School` and `Designation` (which §1.2 E6 of the proposal shows were *ratified as plaintext and
then never built*), the name's encryption is **working as designed**. Nothing here is a defect to fix;
it is a posture to either uphold or change by ruling.

### F-3 ⭐ THE RETROSPECTIVE UNDERCOUNTED — **both** rows need the decrypt, not one

SD-1 (c) raised the **public** tier only. Per F-2, member name is Tier-1 ciphertext + a Tier-2 blind
index — the blind index supports **equality lookup only**, never display. So rendering **full name at the
authenticated tier is also a Tier-1 decrypt**.

The authenticated row is *less* alarming than the public one, but it is **not free**, and ruling only the
public row would leave 11a.3 still unbuildable.

### F-4 — 10.7 ruled against admin-side Tier-1 decryption, and its reasoning does **not** cleanly reach here

Story 10.7 Decision 2: *"report templates emit ONLY Tier-3 clear + Tier-2 hashes + already-stored masked
derivations; a template column NEVER carries decrypted Tier-1 plaintext in v1"*, with `decryptIfPermitted`
shipped as a **named deferred seam**.

⚠ Its load-bearing distinction was **standing**: *"In 3.11 the member exports their OWN data → the
assembler decrypts … In 10.7 an admin exports OTHER members' data → PII-masked."*

**A member browsing a directory of peers is neither of those.** It is not self-access, and it is not bulk
admin export. ⛔ **10.7 does not settle this question and must not be cited as though it does** — that is
precisely the kind of borrowed-precedent reading the project's supersede discipline forbids.

### F-5 ⭐ THE SHARP ONE — the CI control the architecture names is **not currently able** to catch a Tier-1 public leak

`architecture.md:1538`: *"**CI guards that no Tier 1 field is rendered to a public surface.**"*

That guard is Story 1.16b (ADR-0013). Verified live at authoring, by running it:

```
$ pii-scrape gate — FR-74 Public-vs-Private matrix (Story 1.16b)
▸ Matrix: version 1, 0 surface(s)
  · no surfaces declared — Epic 11a (Story 11a.1) populates; all checks no-op
▸ Render snapshots: 0
  · no render snapshots available — every surface scrape is a no-op (AC-3)
✓ pii-scrape gate passed
```

Two separate reasons it cannot catch a tier leak today:

1. **`loadSnapshots()` is `return []`** — a stub (`packages/contracts/scripts/check-pii-scrape.ts:39-41`).
   The CI-side scan is structurally incapable of reading any surface, regardless of the matrix.
2. **The matrix declares zero surfaces**, so the **tier-leak leg is a no-op by construction** — stated in
   the test's own header: *"`surfaces: []` — Epic 11a populates it, so the tier-leak leg is a no-op."*

Meanwhile **seven public pages have shipped** (`apps/public/src/pages/`: `index`, `niyamavali`, `terms`,
`blog`, `blog/`, `404`, `500`), and the script's message *"apps/public is a tsc stub until Story 2.5"* is
**stale** — 2.5 shipped.

⚠ **Stated fairly, because half of this gate genuinely works.** The **naked-PII leg is active and has
teeth**: `apps/public/tests/integration/public-pages/scrape-test.spec.ts` feeds the pure engine the REAL
Niyamavali and T&C render HTML and carries an explicit **negative control** — *"the gate catches a planted
naked phone/email (teeth, not vacuous)"*. ⛔ It is the **tier-leak leg specifically** — the one
`architecture.md:1538` names, and the only one that would catch a decrypted name — that is inert.

⭐ **And the circularity is the point.** The matrix is populated by **Story 11a.1** — the story this ruling
gates. So the control that would catch a Tier-1 leak on the Member Directory is authored by the work that
cannot start until this question is answered. ⛔ **The Panel must not treat "CI will catch it" as an
available mitigation when ruling Q1.**

### F-6 — the *rendering* is already solved, and members already see shielded peer names

`packages/domain/src/kyc/name.ts` ships `splitFirstNameLastInitial()` — the Story-1.16b PII-shield rule
(*"Every member-facing surface that names the DECEASED member surfaces only `firstName + lastInitial` …
never the full surname"*), locale-aware via `Intl.Segmenter` for Devanagari.

It has **two live consumers**: `apps/api/src/modules/member-pool/` and the `apps/jobs` cycle-open
notification payload.

⇒ ⭐ **A shielded peer name in an authenticated member context is already shipped, accepted practice.**
The directory would not be introducing that pattern; it would be extending its reach from *the member
assigned to my pool* to *any member in the directory* — a change in **scale and enumerability**, not in
kind.

### F-7 — nothing mechanical prevents the decrypt; this is purely a policy question

`apps/public/package.json:18` already declares `"@twt/domain": "workspace:*"`. The Astro SSR process can
reach the KMS decrypt path today. ⛔ There is no technical barrier to fall back on — **only a ruling.**

### F-8 — if both rows are refused, the directory's purpose is in question

A Member Directory with no member name shows: district, plus whichever Pariwar-selected attributes apply
(Block, School, Designation), plus a status pill. FR-75's stated purpose is *"institutional legitimacy and
trust verification"*.

⚠ **I do not know whether a nameless directory serves that purpose**, and this note does not assume it
does or does not. It is **Q3**.

---

## The five questions

### Q1 — May `apps/public` (unauthenticated SSR) decrypt Tier-1 to render first-name + last-initial? ⛔ BLOCKING

*This is the whole question.* A YES puts member-name field-crypto in an unauthenticated request path for
every listed member on every page view, and stands against `architecture.md:1538`.

⚠ **Ruling YES additionally requires answering:** what makes the tier-leak guard operative before the
surface ships (F-5), given that 11a.1 both populates it and is gated by this ruling?

> **Non-binding recommendation:** **NO** for v1. It is the only answer that leaves `architecture.md:1538`
> intact, and F-5 means the stated safety net is not currently there to catch a mistake.

### Q2 — May the authenticated-member tier decrypt Tier-1 to render a member's name? ⛔ BLOCKING

Distinct from Q1 and **must be ruled separately** (F-3). If ruled YES, a sub-question: **full name**
(as the matrix asks) or **shielded** first-name + last-initial (as F-6's shipped precedent does)?

> **Non-binding recommendation:** **YES, shielded** — `splitFirstNameLastInitial()`, not full name. It
> matches shipped practice exactly (F-6), keeps the crypto boundary at authentication, and asks the Panel
> to accept no new pattern. ⚠ It does introduce **enumerability at directory scale**, which the pool
> context does not have — Story 11a.3's anti-enumeration safeguards would become load-bearing rather than
> defensive.

### Q3 — If Q1 and Q2 are both NO, is the Member Directory still built? ⚠ DIRECTIVE

Options: build it nameless · **defer the directory** to a later epic · reduce 11a to the shell and
noticeboard stories (11a.2, 11a.5, 11a.6) and drop 11a.3.

⛔ **The Panel should answer this even if Q1/Q2 are YES**, so the fallback is on record rather than
improvised later. This is open item **O4**.

### Q4 — Is a Tier-3 member-authored **display name** minted as an alternative? ⚠ DIRECTIVE

A member-chosen display handle, plaintext, **distinct from the KYC legal name**, would remove the Tier-1
decrypt from the directory entirely at both tiers.

⚠ Costs: a second name field; a divergence question when display name ≠ KYC name (which is *the whole
point* of it, but has consequences for verification and for the In Memoriam roll); and it is a new
member attribute, so under R1/R7 it would be **platform-common**, not Pariwar-specific.

> **Non-binding recommendation:** worth ruling **explicitly either way** rather than leaving latent. If
> Q1/Q2 are both NO, this is the most likely route to a directory that is still worth building.

### Q5 — Does this extend 10.7's `decryptIfPermitted` seam, or is it its own control? ⚠ DIRECTIVE

10.7 shipped `decryptIfPermitted` as a named deferred seam with a `reports.view_pii`-class gate. If Q1 or
Q2 is YES, the Panel should say whether that seam is the vehicle — one control, one audit path — or
whether a directory decrypt is a **separate** control with its own permission key.

> **Non-binding recommendation:** **separate.** Per F-4, the two have different standing semantics, and
> collapsing them would import 10.7's admin-export reasoning into a member-read surface where it does not
> apply.

---

## What a non-answer would mean

⛔ **Story 11a.3 cannot be authored.** Rows 6 and 7 are two of its thirteen matrix rows, and the story's
entire premise is a *tiered* render — a tier model with an unresolved top row is not implementable.

Rows 1–4 (District, Block, School, Designation) are **unaffected** and remain buildable once G1, G5 and
G6 land. A partial 11a.3 covering only those rows is possible **but should be an explicit ruling under
Q3**, not a silent narrowing by an implementer.

⚠ **The failure mode this note exists to prevent:** a story author, finding no ruling, picks the
"obviously safe" option — renders no name — and ships a directory whose value was never assessed (F-8),
with the narrowing recorded nowhere. That is how FR-74's school/designation rows were lost twice already
(Sprint Change Proposal §1.2 E10: *two independent authors, years apart, both narrowed to district and
neither recorded why*).

---

## What this note does NOT ask, and what a ruling would NOT mean

- ⛔ It does **not** ask to change any PII tier. F-2's classification stands unless the Panel says
  otherwise in terms.
- ⛔ It does **not** ask about nominee names, deceased-member names on Sahyog Vivran, or verifier names on
  public verifier profiles (`prd.md:1059`). Those are separate surfaces with separate consent postures.
  ⚠ A YES on Q1 would make them **worth revisiting**, but does not rule them.
- ⛔ A ruling here does **not** amend Story 10.7. F-4 explains why 10.7 does not govern this; the converse
  also holds.
- ⛔ It does **not** ask the Panel to fix F-5. That is engineering work owed regardless of this ruling, and
  is recorded separately — but per F-5 it **does** bear on how much assurance a YES on Q1 can assume.
- ⛔ It does **not** touch the attribute model (R1–R7). Those are G1's.

---

## Ruling template

```
Decision 2026-08-__-___ : Member Directory name posture (Story 11a.3 rows 6, 7)

Q1  public-tier Tier-1 decrypt        : ALLOWED / REFUSED / DEFERRED   — reasoning:
Q2  authenticated-tier decrypt         : ALLOWED (full) / ALLOWED (shielded) / REFUSED — reasoning:
Q3  directory if both refused          : BUILD NAMELESS / DEFER DIRECTORY / DROP 11a.3 — reasoning:
Q4  Tier-3 display-name attribute      : MINT / DO NOT MINT / DEFER    — reasoning:
Q5  vehicle if any decrypt allowed     : 10.7 SEAM / SEPARATE CONTROL / N-A — reasoning:

Ratifying trustees:                    , 
Date:
Provenance label per clause (Decision 2026-08-09-095):
```

---

## Disposition

| # | On ruling | Owner |
|---|---|---|
| 1 | One `.decision-log.md` entry, per-clause provenance labelled. ⚠ Re-verify the head; `132` may be taken by G1 | BigDev / Panel |
| 2 | Sprint Change Proposal `2026-08-19` §4.1.2 annotated with the outcome — ⛔ **annotated, never edited** | BigDev |
| 3 | Open item **O4** closed by Q3 | BigDev |
| 4 | If Q1 or Q2 is ALLOWED: `architecture.md` §2.7 amended, and the Q5 control named before 11a.3 is authored | Winston |
| 5 | If Q4 is MINT: a predecessor story for the display-name attribute, ahead of 11a.3 | John |
| 6 | F-5 raised as engineering work on its own track — ⛔ **not** bundled into this ruling | BigDev / Murat |

---

*Routed 2026-08-19. Verified live at `b94ea97`. ✅ **RULED 2026-08-19** — Dhiraj Rahul, Kalpana Bharti —
recorded as Decision `2026-08-19-135`. ⛔ Clause 6 (the Q3 reading) awaits confirmation.*
