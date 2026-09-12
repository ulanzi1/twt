---
baseline_commit: 19ff4109
---

<!--
⭐ BASELINE — `governance(11b.17): close AC4's last conditional`. ⭐ Created 2026-09-10 to discharge
Story `11b-17` **Task 0e** / `#decision-2026-09-10-212` **Consequence 3** — the work cl.2 created and
which is ⛔ NOT story F's to absorb.
⚠⛔ **RE-VALIDATED 2026-09-11.** The pin is ⭐ VERIFIED an ancestor of HEAD and ⛔ nothing under it
moved — ⚠ but ⛔ several claims below were **wrong when written**, ⛔ not rotted since. See Change Log
**0.2**. ⚠ The branch topology is a carried risk, ⛔ not a blocker — Preflight row **T**.
-->

# Story 8.17: The Nominee's UPI ID Reaches the Member — On the Payment Screen, Where They Are Asked to Pay `[SURFACE]`

Status: ready-for-dev

## ✅ PREFLIGHT — ✅ **STARTABLE. ⛔ ZERO BLOCKING DECISIONS.**

⭐ The authority is **Trustee-ratified and already ruled** — `#decision-2026-09-10-212` **cl.2**,
applying `#decision-2026-09-04-191` **cl.1**. ⛔ Nothing here waits on the Panel.

⚠ **WHAT TRAVELS WITH THIS STORY. ⛔ None blocks it; ⛔ none may be dropped:**

| | Carried | Where it binds |
|---|---|---|
| **`-212` Consequence 3** | The ruling names *"the **`nominee-accounts` handler's decrypt**"* as touched scope | AC4 / Task 2 — ⭐ **ONE** new soft decrypt is AUTHORISED |
| **`-212` Consequence 4** | The `.strict()` additive-field blank-out **FIRES** | AC8 / Task 4 — a deployment-ordering constraint |
| **`-212` Consequence 5** | A UPI-ID label must be minted in `contribution.json` | AC6 / Task 3 |
| **`-212` Consequence 6** | The screen labels the nominee *"Account holder"*, against `-190` cl.2 — ⛔ **STILL UNRESOLVED** | AC6(a) — ⛔ record, ⛔ do ⛔ not fix by side effect |
| **§8.4(ii)** | ⚠ **DE-ROUTED, ⛔ NOT LOGGED** — ⛔ not a Panel question, ⛔ and ⛔ not a ruling | AC6(b) / D2 — ⭐ align with `6-18`, ⛔ touch nothing |
| **Three governance records** | Item (e)'s named home; three stale comments | AC0 / Task 0 — owed **before `11b-17` ships** |
| **T — topology** | `-212` and `-213` are ⛔ **NOT on `main`**; the governance branch is ⛔ unpushed; `-214` is ⛔ **ABSENT from `.decision-log.md` on THIS branch entirely** (it exists only on the unpushed governance branch) | ⚠ recorded risk — this story's authority must merge **with or before** its code |

---

## Story

As a member who has been asked to contribute to a colleague's Sahyog drive,
I want to see the family's UPI ID, not just a button that pays for me,
so that I can pay from whichever app or device I actually use — or hand it to whoever in my family
does the paying — instead of being locked to one screen at one moment.

⚠⛔ **AND WHAT THAT SENTENCE DOES ⛔ NOT BUY, STATED SO IT IS ⛔ NOT DISCOVERED IN REVIEW:** ⭐ the ACs
order **read-only text**. ⛔ There is ⛔ **no copy-to-clipboard and no share affordance** — ⛔ neither
is prescribed anywhere in the UX spec (its `clipboard` hits are all about pasting the **UTR back**),
and ⛔ the four coordinates `pay.tsx` renders today carry none either. ⇒ ⭐ this is a **pre-existing**
gap this story ⛔ does ⛔ not close and ⛔ does ⛔ not widen. ⚠ If a copy affordance is wanted, it is a
**separate** story — ⛔ do ⛔ not add one here by inference from the sentence above.

## 📜 Policy meaning (AI-10-1, CONFIRMED BigDev 2026-08-18)

⛔ **⛔ NO PREDICATE THAT GATES A MEMBER'S ACCESS TO A BENEFIT** is introduced or changed — ⛔ no
eligibility, ⛔ no assignment, ⛔ no obligation, ⛔ no amount owed. ⭐ This story **widens ⛔ nothing**:
it adds ⛔ no drive, ⛔ no member and ⛔ no state to what the payment screen already serves.

⚠ **ONE DISCLOSURE CHANGES, and it gates ⛔ no benefit.** In the member's terms:

> **"When you are asked to contribute, you can now see the family's UPI ID itself — not only a
> button that pays for you."**

⭐ **The Niyamavali check, reported honestly:** the check yields **nothing dispositive** — the
Niyamavali is an unexecuted, agent-drafted design reference that binds nothing
([[feedback_niyamavali_rulebook_not_spec]]). ⇒ ⭐ **the authority is `-191` cl.1 as applied at `-212`
cl.2, ⛔ nothing else.**

## 🎯 What already EXISTS — ⭐ verified live, ⛔ not assumed

| Fact | Where | Verified |
|---|---|---|
| ⭐ The payment screen **exists and ships** | `apps/mobile/app/(contribution)/pay.tsx` (625 lines) | ⭐ read |
| ⭐ It **already renders unmasked coordinates** — holder, bank, **full account number**, IFSC | `pay.tsx:473-480` (`FieldRow` ×4), inside the **else-branch of the ternary at `:447`** | ⭐ read |
| ⛔ It renders **⛔ NO VPA row** — only a boolean drives the button | `contributions/nominee-accounts.ts:61` `vpaPresent: z.boolean()` | ⭐ read |
| ⚠⛔ **The GET that feeds that block does ⛔ NOT decrypt the VPA** — ⭐ read Trap 4 | `payment/handlers.ts:240` (route), `:328-386` (3 soft decrypts), `:385` `vpaPresent: row.vpaCiphertext != null` | ⭐ read |
| ⚠ A **different** handler decrypts it — the **intent POST**, ⛔ not this path | `payment/handlers.ts:98` (route), `:153-170` (the decrypt → the `upi://pay` URL) | ⭐ read |
| ⭐ The VPA **is genuinely collectable** — ⛔ not an inert gate | `apps/mobile/app/(claim)/nominee-review.tsx:232-239` — an **optional** nominee-filled field, `VPA_RE`-validated (`:146`) | ⭐ read |
| ⭐ **POPULATION IS ATTESTED** — `-191` **cl.5**: *"**11 of 558** nominee accounts carry one **in the test database**"* | `.decision-log.md#decision-2026-09-04-191` cl.5 | ⭐ read |
| ⚠⛔ **AND THE LIMIT OF THAT ATTESTATION, STATED** — ⛔ it is the **TEST** database, and ⛔ there is ⛔ **NO seed writer** (the only writer is the optional intake). ⇒ ⛔ it says **nothing** about production | `packages/domain/migrations/0080_claim-nominee-bank-vpa.sql` — a bare `ADD COLUMN`, ⛔ no backfill | ⭐ read |
| ⭐ The intake, persistence and decrypt shipped at **8.13** (`done`) | `packages/domain/src/claim/nominee-bank-persist.ts:195`; `claims/nominee-bank.ts:41` `NOMINEE_BANK_VPA_REGEX` | ⭐ read |

⭐⭐ **THE DAY-ONE RENDER, SAID PLAINLY:** for most members the selected account will carry ⛔ **no**
VPA ⇒ ⭐ **AC2's "no row" branch is the ordinary case**, ⛔ not the edge case. ⛔ Do ⛔ not build as
though the row is usually there.

---

## ⛔ THE TRAPS

### Trap 1 — ⭐⭐ **THERE ARE ⛔ TWO TYPES NAMED `NomineeBankAccountView`. ⛔ EDITING THE WRONG ONE IS A DIFFERENT, UNRULED DISCLOSURE**

| | File | Exported? | Whose eyes | Consumers |
|---|---|---|---|---|
| ✅ **THIS ONE** | `packages/contracts/src/contributions/nominee-accounts.ts:46` | ⭐ **exported** | the **paying member** (9.9 donor path) | `payment/handlers.ts` → `pay.tsx` |
| ⛔ **⛔ NOT THIS ONE** | `packages/contracts/src/claims/nominee-bank.ts:112` | ⚠ **module-private `const`** | **staff / the nominee** at claim time | `RecordNomineeBankResponse`, `NomineeBankStatusResponse` |

⚠⛔ **BOTH already carry `vpaPresent`**, so a grep for that field lands in **both**. ⛔ `-212` cl.2
rules the VPA onto the **member payment surface ⛔ only**; putting the plaintext on the claims presence
view would be a **⛔ NEW disclosure ⛔ nobody has ruled**.

⭐ **THE PROVENANCE, so the two are never confused:** Story **8.13** added `vpaPresent` to the
**claims** view (`e7862103`) — ⭐ exactly the file its own Task named (`8-13:62`). The **donor** view's
`vpaPresent` came from Story **9.9** (`974894da`). ⇒ ⭐ **both stories edited what they said they
edited**; the collision is in the **type name**, ⛔ not in anyone's paperwork.

### Trap 2 — ⚠⛔ **ADDING ONE FIELD BLANKS THE SCREEN ON EVERY INSTALLED OLDER BUILD**

`NomineeBankAccountView` is `.strict()` and `api-client`'s `call` uses a **throwing** `schema.parse`
(`packages/api-client/src/index.ts:261` — ⛔ no `safeParse`, ⛔ no `.passthrough()`, ⛔ no tolerance
layer anywhere). ⇒ the moment the API ships `vpa`, **every app build older than that release rejects
the unknown key**, `call` throws, `pay.tsx:185-187` sets `accountsLoadFailed`, and `:359`
**early-returns the ENTIRE screen** as `upi_intent.load_failed` — ⛔ not a missing row, **⛔ the whole
screen**, until the member updates.

⭐ This is `deferred-work.md`'s **11b.3a third-pass item (e)** hazard, and **`-212` Consequence 4
fires it**. ⇒ ⛔ it is ⛔ not this story's to *solve* repo-wide, ⚠ but this story is the one that
**detonates** it ⇒ **AC8 / Task 4** owe a **stated deployment order**.

### Trap 3 — ⛔ **THE VPA IS OPTIONAL AND ALWAYS WILL BE. ⛔ A NULL IS ⛔ NOT AN ERROR**

`vpa_ciphertext` is **nullable by design** — *"a nominee without a VPA is a first-class state (do NOT
chain `.notNull()`)"* (`packages/domain/src/schema/claim_nominee_bank_accounts.ts:65-67`). ⭐ A member
seeing an account with ⛔ no UPI ID is **ordinary**, ⛔ never a failure. ⛔ Do ⛔ not render a
placeholder, an error, or `vpa_not_collected` copy in the field's place — ⭐ **omit the row.**

### Trap 4 — ⚠⛔⛔ **THE DECRYPT YOU NEED IS ⛔ NOT THE ONE YOU ARE THINKING OF. ⭐ EXACTLY ONE NEW ONE IS AUTHORISED**

⛔ **`payment/handlers.ts:153-170` is ⛔ NOT on this path.** It sits inside the **intent POST**
(route at `:98`), builds `ContributionIntentResponse`, and its plaintext is folded into the
`upi://pay` URL. ⛔ It is a **different function**, a **different response type**, fetched by a
**separate request**, and its value is **unreachable** from the view `pay.tsx:473-480` renders.

⭐ **The handler that actually feeds that block** is the **nominee-accounts GET** (route at `:240`).
Its own doc-block says so: *"`vpaPresent` is computed from the presence of the VPA ciphertext
**WITHOUT decrypting it**."* ⇒ ⭐⭐ **AC1 is unshippable without a FOURTH soft decrypt in that
handler.**

⭐⭐ **AND THAT DECRYPT IS AUTHORISED BY THE RULING ITSELF.** `-212` **Consequence 3** names the
touched scope: *"The payment-screen change touches `NomineeBankAccountView`, **the `nominee-accounts`
handler's decrypt**, and `pay.tsx`."* ⇒ ⛔ this is ⛔ **not** a widening; ⭐ it is the scope cl.2
already stated. **⭐ ONE new `decryptNomineeBankFieldSoft` — ⛔ and nothing else** (AC4).

⚠⛔ **THE COST, SIZED IN THE UNIT `550a7acd` ESTABLISHED — ⛔ not hand-waved:**
`envelope.ts:92-93` fires `auditHook('decryptDek')` on **every** `decryptTier1`, and ⛔ **there is
⛔ NO DEK cache** ⇒ **one audit line per encrypted FIELD**, ⛔ not per request and ⛔ not per row.
`packages/domain/src/audit/write.ts` holds `pg_advisory_xact_lock(AUDIT_CHAIN_LOCK_KEY)` — ⚠ **one
fixed, deployment-wide, cross-tenant key** — across 5-6 sequential round trips ⇒ ⭐ **the cost is
SERIALIZATION, ⛔ not query volume.**

⇒ ⭐ **THIS STORY'S PRICE: `+1` audit line per VPA-bearing account — ⭐ `0`, `1` or `2` per screen
load** (the GET's `ciphertextRows.map(...)` covers **BOTH** accounts, ⛔ not the selected one),
taking this route from **≤6 to ≤8**. ⚠⛔ **AND THE PART WORTH SAYING OUT LOUD:** the VPA is decrypted
for an account the member **may never open**, and ⛔ there is ⛔ **no lazy path** — the contract is a
list built in a single pass. ⭐ That is the accepted price of cl.2; ⛔ it is ⛔ not free, and ⛔ this
story ⛔ does ⛔ not pretend it is.

### Trap 5 — ⚠⛔⛔ **FOUR LIVE ARTEFACTS FORBID EXACTLY WHAT AC3 ORDERS. ⭐ THEY ARE SUPERSEDED — ⛔ NAME IT, ⛔ DO ⛔ NOT QUIETLY EDIT**

| # | Artefact | What it asserts |
|---|---|---|
| 1 | `packages/contracts/tests/contributions-nominee-accounts.test.ts:36` | a test named ***"REJECTS a raw `vpa` field"*** — `safeParse({…, vpa})` must be `false` |
| 2 | `apps/api/tests/integration/payment/nominee-accounts.spec.ts:298-309` | `expect('vpa' in account).toBe(false)` · `not.toContain('ravi@upi')` · an **exact-SIX-keys** `Object.keys(acc1).sort()` equality |
| 3 | `apps/api/src/modules/payment/handlers.ts:257-263` | *"`-191` cl.1 … is **ALREADY SATISFIED** by that path … ⛔ Adding `vpa` to this wire would be a NEW Tier-1 exposure ⛔ nobody ruled on"* |
| 4 | `friction-budget.md:1952-1959` | records the donor path's shape as the **six** fields, *"pinned by a live-DB regression test"* |

⭐⭐ **ARTEFACT 3 IS THE NARROW READING `-212` cl.2 OVERTURNED** — ⭐ the very one the Dev Notes
describe. ⇒ ⛔ it is ⛔ not "a stale comment to tidy"; it is a **superseded position that must be
re-stated as superseded** ([[feedback_supersede_never_reinterpret]]).
⚠⛔ **AND ONE SUBTLETY THAT WILL BE GOT WRONG:** artefact 2's `not.toContain('ravi@upi')` must
**MOVE** to the audit sink (AC5) — ⛔ it must ⛔ **not** simply be deleted. ⭐ After AC3 the VPA
*belongs* in the response and ⛔ still ⛔ **never** in an audit line.

### Trap 6 — ⚠⛔ **THREE STALE COMMENTS SAY THE VPA DOES ⛔ NOT EXIST. ⭐ ONE IS THE HEADER OF THE FILE TASK 2 EDITS**

`-191` **cl.5** already corrected **two** by name. ⭐ **The third was routed to THIS STORY by name**
— routing note **§4.2b**: *"that comment is **STALE** and we are recording it as a **defect to fix**"*;
and `11b-17`'s Dev Notes: *"this is the third. ⇒ **it belongs in `8-17`'s packet**."*

| # | Site | The false claim |
|---|---|---|
| 1 | `apps/api/src/modules/payment/handlers.ts:20-23` ⭐ **Task 2 edits this file** | *"There is **NO VPA in the substrate today** … defer VPA collection to a dedicated story"* |
| 2 | `packages/contracts/src/public-pages/sahyog-vivran.ts` | *"`vpa` is null for every nominee today (Story 8.4 shipped with the resolver absent)"* |
| 3 | `packages/i18n/locales/*/member-drive-list.json:49` `$comment.nominee` | *"⛔ no VPA"*, attributing it to *"story F's per-drive view"* — ⭐ still true of **F**, ⚠ now misleading about the substrate |

### Trap 7 — ⛔ **`selectedAccountAllFieldsUnavailable` CHECKS ⛔ THREE FIELDS ON PURPOSE. ⛔ DO ⛔ NOT ADD `vpa` TO IT**

`pay.tsx:263-267` tests `accountHolderName` + `accountNumber` + `ifsc` against the sentinel. ⛔ A VPA
decrypt failure fails-soft to **OMISSION**, ⛔ never to the sentinel (AC2/Task 2) ⇒ ⭐ adding `vpa`
to that conjunction would make a missing UPI ID capable of blanking the coordinates block. ⛔ It is
⛔ not an oversight to "complete" — ⭐ it is **three by design.**

---

## Acceptance Criteria

### AC0 — Governance first, and **three records** land with it
Task 0 lands a `governance:` commit before any code ([[feedback_governance_commits_precede_implementation]])
carrying **all** of:
**(a)** the `epics.md` entry under Epic 8 (⛔ none exists — Epic 8's entries stop at 8.16) and the
sprint-row flip;
**(b)** ⭐ **`deferred-work.md` 11b.3a third-pass item (e) names THIS STORY as its home.** Its heading
still reads `✅ CLOSED` while its body reads *"RE-OPENED AS A BUILD OBLIGATION — **Trigger: FIRED**"*
and *"it needs a **NAMED HOME**"*. ⭐ `-212` **Consequence 3** owes that record **before `11b-17`
ships**, and `11b-17` is in active work ⇒ ⛔ this ⛔ cannot wait for the code;
**(c)** ⭐ the sprint-row ledger records §8.4(ii) as **DE-ROUTED but ⛔ NOT LOGGED** (AC6(b)/D2).
⚠⛔ **Do ⛔ NOT write "closed" or "resolved" there** — ⛔ no decision entry exists, and `-213` still
reads *"UNRULED"*. ⭐ Record the **disagreement**, ⛔ not a closure.

### AC1 — The member can READ the family's UPI ID on the payment screen
On `apps/mobile/app/(contribution)/pay.tsx`, the selected account's **UPI ID renders as text the
member can read**, beside the account number and IFSC already shown — ⭐ inside the **else-branch of
the ternary at `:447`**, ⛔ never in the decrypt-failure branch.
**And** it is **UNMASKED and complete**. ⚠ ⭐ **State the ground honestly: this is an INFERENCE from
the account-number precedent** (`contributions/nominee-accounts.ts:20` — *"no masking; a masked
account# cannot be transferred to"*), ⛔ **not** something `-212` cl.2 states. ⭐ The inference is
sound — a masked VPA cannot be paid to either — ⚠ but ⛔ do ⛔ not cite it as ratified.
⚠ Note the asymmetry AC4 makes unavoidable: the member **reads** one account's VPA, the server
**decrypts** both (Trap 4).

### AC2 — Where there is no VPA, the row is ABSENT
Per Trap 3 — an account with ⛔ no `vpa` renders **⛔ no row at all**: ⛔ no placeholder, ⛔ no error,
⛔ no "not collected" copy. **And** the pay button's existing behaviour is **⛔ unchanged** in that
case. **And** `selectedAccountAllFieldsUnavailable` stays a **three-field** test (Trap 7).
⭐ Per the day-one note above, ⭐ **this is the ordinary path**, ⛔ not the edge.

### AC3 — The wire carries the VPA, and ⛔ only on this path
`vpa` is added to **`packages/contracts/src/contributions/nominee-accounts.ts`**'s
`NomineeBankAccountView` as **optional** — per Trap 1, ⛔ **NOT** to `claims/nominee-bank.ts:112`.
⭐ The field name is **`vpa`**, camelCase, matching this file's convention and the intent handler's
own plaintext name.
**And** `vpaPresent` **stays** — ⭐ it is non-PII and 8.13 records a live reason to keep it
(`8-13:250`).
**And** a test asserts the **claims** presence view still carries ⛔ **no** `vpa`.

### AC4 — ⭐ EXACTLY ONE new decrypt, and ⛔ nothing else moves
⭐ **AUTHORISED:** one additional `decryptNomineeBankFieldSoft` for `vpaCiphertext`, inside the
existing `ciphertextRows.map(...)` in the **nominee-accounts GET** — ⭐ the scope `-212` Consequence 3
names.
⛔ **FORBIDDEN:** ⛔ any **second** new decrypt · ⛔ any new KMS call outside that map · ⛔ any change
to the **intent** handler's decrypt · ⛔ no public surface · ⛔ no drive-detail page (⭐ `-212` cl.2
excludes it — story `11b-17`) · ⛔ no change to `resolveMemberLivePool`'s scope · ⛔ no change to the
`upi://pay` URL, `tr`, or the attest path · ⛔ no masking of any coordinate.
**And** the story states the audit cost **in the unit `550a7acd` established** (Trap 4) — ⛔ a silent
cost is the defect this AC exists to prevent.

### AC5 — The read stays ATTRIBUTABLE, and ⛔ no PII enters the audit line
The existing `member_contribution.nominee_accounts_viewed` audit **stays as it is** —
`payment/handlers.ts:391-395` records the **account COUNT only** (`:390` is the describing comment).
⛔ The VPA must ⛔ **never** reach an audit line, an event payload, or a log ⇒ ⭐ a test asserts it,
following the shipped idiom at `apps/api/tests/integration/nominee/nominee-declare.spec.ts:193-207`
(`events_log` payload scan **+** `JSON.stringify(t.auditSink.events)`).
⚠ Per Trap 5, the existing `not.toContain('ravi@upi')` **moves here**; ⛔ it is ⛔ not deleted.

### AC6 — The label is minted; ⭐ ONE question stays open and ⛔ ONE is CLOSED
⭐ The new UPI-ID label is **minted in `contribution.json`** beside its four siblings
(`upi_intent.{account_holder,account_number,ifsc,bank}_label`), **both locales**, ⛔ never inlined.
⚠ ⭐ **Keys in these files are FLAT dotted strings** — mint `"upi_intent.vpa_label"`, ⛔ not a nested
object.
⚠ ⭐ **AND THE WORDING IS ⛔ NOT A FREE CHOICE.** `-212` Consequence 5 says ⛔ none exists *"on any
member surface"* — ⭐ true of `contribution.json`, ⚠ **and the app already ships one**:
`packages/i18n/locales/{en,hi}/claim.json:60-62` carries `nominee.bank.vpa` = *"UPI ID (optional)"* /
*"UPI ID (ज़रूरी नहीं)"*. ⇒ ⭐ **match that treatment, ⛔ do ⛔ not invent one** — drop the
*"(optional)"* (this is a display label, ⛔ not a form field), and ⭐⭐ **keep "UPI ID" in LATIN
script in Hindi**, exactly as `IFSC` is kept at `:215`.

⭐ **(a) — ⛔ STILL OPEN, ⛔ do ⛔ not fix by side effect.** This screen calls the nominee *"Account
holder"*, which `-190` **cl.2** rules ⛔ not to be used (*"the public wording is **Nominee Name**"*),
and the member drive list already carries `nominee.label` on that ground. ⚠ **Whether cl.2 binds
⛔ only the public surface is ⛔ UNRESOLVED** — `-212` **Consequence 6** is the last word on it, and
⛔ nothing since (`-213`, `-214`) revisits it. ⛔ Do ⛔ not relabel.
⚠ ⭐ **And ⛔ do ⛔ not conflate it with `-214`'s ratified *"Nominee full name"*** — that is a
different string, a different decision (§8.1) and a different surface (the drive-detail message
block). ⛔ Its *"both the member and the public view"* scope ⛔ does ⛔ not reach the payment screen.
⚠⛔ **AND `-214` ITSELF CARRIES THE SAME TOPOLOGY RISK AS ROW T, ⛔ NOT MERELY A DIFFERENT SCOPE:**
⛔ it is ⛔ **absent from `.decision-log.md` on this branch entirely** — recorded on
`governance/11b-17-validate-and-panel-routing` (`ff92cb00`), ⛔ not on `main` and ⛔ not on this
story's branch. ⭐ A dev who greps `.decision-log.md` for `-214` will find ⛔ **nothing**; ⛔ that is
⛔ not this citation being wrong, ⭐ it is the same carried risk Row T already names for `-212`/`-213`.

⚠ **(b) — §8.4(ii) is ⛔ NOT a Panel question ⛔ AND ⛔ NOT a ruling. ⭐ This story touches it ⛔ not
at all.** ⛔ Do ⛔ not route it; ⛔ do ⛔ not act on it; ⛔ do ⛔ not record it as closed.
⭐ **THE GROUND, and its exact status — ⛔ traced, ⛔ not taken from prose**
([[feedback_trace_internal_state_never_cite_decision_text]]): `deferred-work.md` item **(b)
`D5-subject` (i)** contains the sentence *"⇒ ⭐ **the SCHEMA is the authority**"* — ⭐ it is real and
it is quoted correctly. ⚠⛔ **But that item is an OPEN deferred item WITH A TRIGGER** (*"the first
story that revisits nominee-bank collection"*), ⛔ **not a ruling**, and its subject is the
**consent-subject gap** (does the row identify a nominee at all), ⛔ not the two-accounts case
directly.
⚠⛔ **AND THE RE-GROUNDING THAT APPLIES IT TO §8.4(ii) IS AN *AUTHOR-COMMITTED CORRECTION INSIDE A
SIBLING STORY* — `11b-17`'s AC4 and its Change Log v1.1, on an ⛔ UNMERGED branch. ⛔ It has ⛔ NEVER
REACHED `.decision-log.md`.** ⚠ `-213`'s own entry is **unamended** and still reads *"the
differing-holder-name case is ⛔ still UNRULED and is ROUTED"* ⇒ ⛔ the log and the sibling **disagree**,
and ⛔ **this story is ⛔ not the instrument that settles them.**
⇒ ⭐ **WHAT THE DEV DOES: ⛔ NOTHING.** ⛔ No edit to `member-pool/handlers.ts` · ⛔ no Panel routing ·
⛔ no closure written anywhere. ⭐ Align with `6-18-nominee-holder-name-on-the-verification-console`
(`ready-for-dev`), which ⭐ **explicitly records that it does ⛔ NOT close `D5-subject` (i)** — ⚠ so
⛔ do ⛔ not read `6-18` as having closed it either.

### AC7 — The superseded positions are RE-STATED as superseded, ⛔ not quietly edited — **and the friction-budget disposition is RECORDED**
Each of Trap 5's four artefacts and Trap 6's three comments is updated to say **what changed and
under what authority** (`-212` cl.2; `-191` cl.5 for the substrate claims) —
⛔ never silently deleted, ⛔ never reworded as though it had always said so
([[feedback_supersede_never_reinterpret]], [[feedback_closure_language_precision]]).
⚠ ⭐ **Trap 6 item 3 (`member-drive-list.json`) is a PARTIAL supersession** — *"⛔ no VPA"* remains
**true of story F's surface**; ⛔ only the substrate half is stale. ⛔ Do ⛔ not over-correct it.
**And** the **friction-budget disposition is recorded** (Task 6) — ⭐ per Story 8.13's precedent
(`friction-budget.md:646`) the expected outcome is *declaration affirmed, ⛔ no new row*, ⚠ but an
**unrecorded** disposition fails this AC.

### AC8 — The deployment order is STATED, ⛔ not discovered in production
Per Trap 2: the story record names the order — the **API ships the additive field ⛔ only alongside
or after** a mobile build that tolerates it, **or** the older-build blank-out is **accepted and
recorded** as a known window with its user-visible symptom (the **whole screen**, ⛔ not the row).
⛔ An unstated order fails this AC.

---

## ⚖️ Decisions

### ✅ D1 — **RULED before this story existed** (`#decision-2026-09-10-212` cl.2, Trustee-ratified)

> ⭐⭐ **THE RULING:** the nominee's UPI ID is ⛔ **NOT** on the member's drive-detail page. ⭐ It is
> **ADDED to the PAYMENT screen**, where a member is actually asked to pay. **DR + KB, 2026-09-10.**

⭐ **AND THE SCOPE CLAUSE, ⛔ which is ⛔ not optional reading** — Consequence 3, verbatim:

> *"cl.2 CREATES WORK OUTSIDE STORY F, AND IT IS ⛔ NOT F's TO ABSORB. The payment-screen change
> touches `NomineeBankAccountView` (`contracts/contributions/nominee-accounts.ts`), **the
> `nominee-accounts` handler's decrypt**, and `pay.tsx`."*

⇒ ⭐⭐ **the ruling itself contemplates the new decrypt** ⇒ AC4 authorises **one**, and ⛔ no more.

⭐ **THE GROUND, from the routing note the Panel answered:** the pay path resolves to **ONE** drive —
`resolveMemberLivePool` needs `active` + a `live` cycle + an **assignment** (and, of several, takes
the **soonest-closing**) — so on a drive-detail page listing every drive a Pariwar ever ran,
*"the button is enough"* was ⛔ **empty**: for almost every drive shown, ⛔ there is no button. ⇒ ⭐ the
coordinate belongs where the **payment purpose** is.

⚠⛔ **AND WHAT THIS SUPERSEDED, NAMED:** `deferred-work.md` **11b.3a third-pass item (e)**'s *"do
⛔ NOT add `vpa` to that wire; that would be a NEW Tier-1 exposure ⛔ nobody ruled on."* ⭐ Superseded
by cl.2 — ⚠ **and its stated ground was ⛔ FALSE when written**: `-191` cl.1 had already ruled, and
item (e) quotes that clause three lines above its own prohibition
([[feedback_closure_language_precision]]).

### ⚠ D2 — **§8.4(ii) is DE-ROUTED, ⛔ and the governance record for that is OWED**

⭐ v0.1 routed §8.4(ii) to the Panel. ⭐ That routing was **DROPPED** — correctly — because
`11b-17`'s own validate pass re-grounded it on `D5-subject (i)`'s *"the SCHEMA is the authority"*.
⚠⛔ **But "de-routed" is ⛔ NOT "ruled".** The chain is: an **OPEN deferred item** (⛔ not a ruling)
→ applied by an **author-committed correction in a sibling story** (⛔ not a decision entry)
→ on an **unmerged branch** (⛔ not on `main`) → while **`-213`'s entry still says UNRULED**.
⇒ ⭐ **the honest status is: ⛔ nobody should ACT on it, and ⛔ nobody should cite it as settled.**
⛔ **THE RECORD IS OWED, ⛔ and it is ⛔ NOT this story's to write** — it belongs with `11b-17`'s
correction ([[feedback_governance_commits_precede_implementation]]). ⭐ 8.17 names the gap and
⛔ steps around it; ⛔ it does ⛔ not fill it.
⚠⛔ **v0.2 of this file overstated this as *"✅ CLOSED"*** — ⛔ that was wrong, and the record of it
stays in the Change Log rather than being tidied away ([[feedback_record_unattested_no_backfill]],
[[feedback_closure_language_precision]]).

⛔ **ZERO BLOCKING DECISIONS.** AC6(a) is a **recorded question** and AC6(b) is a **de-routed,
un-logged** one — ⛔ neither is a gate on this build, ⭐ and ⛔ neither is closed.

---

## ⚠ What this story does ⛔ NOT do

⛔ No drive-detail page · ⛔ no public surface · ⛔ no widening of which drives the payment screen
serves · ⛔ no **second** new decrypt · ⛔ no change to `vpaPresent`, the pay button, the `upi://pay`
URL or the attest path · ⛔ no relabelling of *"Account holder"* · ⛔ no edit to
`member-pool/handlers.ts` · ⛔ no VPA on the claims presence view · ⛔ no copy-to-clipboard or share
affordance.

---

## Tasks / Subtasks

- [ ] **Task 0 — GOVERNANCE** (AC0) — ⛔ one `governance:` commit, ⛔ no code:
  - [ ] an `epics.md` entry under Epic 8 (⛔ none exists today) + the sprint-row flip
  - [ ] ⭐ `deferred-work.md` **11b.3a third-pass item (e)** — name **this story** as the home its own
        body asks for, and reconcile its `✅ CLOSED` heading with its `RE-OPENED` body
  - [ ] ⭐ correct the sprint-row ledger's stale §8.4(ii) framing (AC6(b))
  - ⚠ **Cite item (e) as *"11b.3a third-pass item (e)"*, ⛔ never a bare `(e)`** — that file's own rule
    is *"The ITEM LETTERS are the stable address"*, and a **bare `(e)` means Story 11b.1's**.
- [ ] **Task 1 — The contract** (AC3) — add optional `vpa` to `NomineeBankAccountView` in
      **`contributions/nominee-accounts.ts`**. ⚠⛔ **Re-read Trap 1 first.** ⭐ Keep `.strict()`; keep
      `vpaPresent`; ⛔ do ⛔ not touch `claims/nominee-bank.ts:112`.
- [ ] **Task 2 — The handler** (AC1, AC4, AC5) — ⚠⛔ **Re-read Trap 4 first: the decrypt at `:153-170`
      is the INTENT handler's and is ⛔ unreachable from here.** Add **ONE**
      `decryptNomineeBankFieldSoft` for `vpaCiphertext` inside the existing `ciphertextRows.map(...)`
      in the **nominee-accounts GET** (`:328-386`), beside the three already there.
      ⭐ Fail-soft to **omitted**, ⛔ never a 500, ⛔ never the sentinel string in the VPA's place.
      ⛔ The audit line at `:391-395` stays **count-only**.
      ⚠ While in this file, discharge **Trap 6 item 1** — its module header (`:20-23`) is false.
- [ ] **Task 3 — The screen + the label** (AC1, AC2, AC6) — a `FieldRow` beside `ifsc_label` at
      `pay.tsx:473-480`, ⭐ **inside the `:447` ternary's else-branch**; ⛔ omit the row when absent;
      ⛔ leave `selectedAccountAllFieldsUnavailable` at **three** fields (Trap 7).
      ⭐ Mint the **flat** key `"upi_intent.vpa_label"` in **both** locales, matching `claim.json`'s
      treatment — ⭐ **"UPI ID" stays LATIN in Hindi.**
      ⚠ Follow the file's existing `FieldRow` idiom and `tabular` usage — ⛔ do ⛔ not invent a variant.
- [ ] **Task 4 — The deployment order** (AC8, Trap 2) — state it explicitly in the story record.
      ⛔ Do ⛔ not discover this in production.
- [ ] **Task 5 — Supersessions** (AC7) — re-state Trap 5's four artefacts and Trap 6's three comments
      **as superseded, with the authority named**. ⚠ Trap 6 item 3 is **partial** — ⛔ do ⛔ not
      over-correct it.
- [ ] **Task 6 — Friction-budget disposition** (AC7) — ⭐ record it, per Story 8.13's precedent
      (`friction-budget.md:646`, *"declaration affirmed, ⛔ no new row"*). ⚠ This story adds a
      **read-only row** and ⛔ **zero** new deliberate steps ⇒ the expected disposition is
      *declaration affirmed, ⛔ no new row* — ⭐ but it must be **recorded**, ⛔ not assumed.
      ⚠ `friction-budget.md:1952-1959` also carries Trap 5 artefact 4 and moves with Task 5.
- [ ] **Task 7 — Tests** (AC1-AC5, AC6)
  - [ ] Contract: `vpa` optional; absent ⇒ parses; `vpaPresent` retained; ⛔ **claims** view still has
        ⛔ no `vpa`. ⚠⛔ **And supersede `contributions-nominee-accounts.test.ts:36`** — a test named
        *"REJECTS a raw `vpa` field"* now asserts the opposite of the ruling.
  - [ ] Handler: an account **with** a VPA returns it; **without** ⇒ the key is **ABSENT**, ⛔ not
        `null`; a decrypt failure ⇒ omitted, ⛔ not a 500.
  - [ ] ⚠⛔ **`nominee-accounts.spec.ts:298-309`** — invert `'vpa' in account`, extend the exact-key
        list from **six to seven**, and ⭐ **MOVE** `not.toContain('ravi@upi')` to the audit sink
        (AC5) — ⛔ do ⛔ not delete it.
  - [ ] ⛔⛔ **The VPA appears in ⛔ NO audit line, ⛔ NO event payload and ⛔ NO log** (AC5), following
        `nominee-declare.spec.ts:193-207`.
  - [ ] The screen renders the row when present and ⛔ omits it when absent — ⚠ **source-scan idiom**:
        ⛔ there is ⛔ no RN mount harness (`apps/mobile/components/drive-list/format.ts:1-11` records
        why); put any checkable logic in a plain `.ts`.
  - [ ] `i18n:check` parity green for the new key in **both** locales.
        ⚠⛔ **`microcopy:check` HAS REAL TEETH ON THIS KEY — ⛔ do ⛔ not skip it.**
        `microcopy.yaml`'s `copy_globs` lists **`packages/i18n/locales/{hi,en}/contribution.json`**
        by name — ⭐ the exact file Task 3 mints into — and the config says those two are **tested**,
        ⛔ not merely scanned (`scripts/microcopy/contribution.test.ts`).
        ⚠ ⛔ **Do ⛔ not believe that file's own HEADER**, which still says *"`scope.copy_globs` is
        empty until Epic 2+"* — ⭐ **it is STALE**; read the list, ⛔ not the preamble
        ([[feedback_gate_scope_semantic_coverage]]).
        ⭐ **EXPECTED RESULT: PASS.** A *"UPI ID"* label carries ⛔ no digits, ⛔ no prohibited
        vocabulary and ⛔ no scarcity/blame framing ⇒ ⛔ nothing in the vocabulary / numeral / tone
        rules fires. ⚠ ⭐ **Follow AC6's wording rule and it stays passing** — drop *"(optional)"*,
        keep *"UPI ID"* Latin. ⛔ A failure here means the WORDING drifted, ⛔ not that the gate is
        wrong.
  - [ ] ⭐ **Execute against `twt-test-pg` `:5433`.**

---

## Dev Notes

### Why this story exists at all — ⭐ read once, ⛔ it prevents a re-litigation

`-191` cl.1 ruled on **2026-09-04** that the VPA is *"shown to the logged-in member so they can make
the contribution"*. ⚠⛔ **It was then read narrowly, recorded as *"already satisfied"* by the pay
button, and ⛔ never put back to the Panel** — a ratified instruction that lapsed for **six days** and
was found only by tracing the payment path during Story `11b-17`'s validate pass. ⭐ **That narrow
reading is still in the codebase**, at `payment/handlers.ts:257-263` (Trap 5 artefact 3) — ⇒ ⭐ Task 5
retires it. ⛔ **Do ⛔ not re-open the question**; ⭐ it is ruled twice over (`-191` cl.1, `-212` cl.2).

### Requirements this surface sits under

FR-16 (pool-bound VPA pre-fill) · FR-27 (`pa=` UPI-Intent pre-fill source) · FR-31 (dual nominee
accounts) · FR-37 / Story 8.13 (claim-time optional VPA collection) · `-190` cl.3 (*a logged-in member
sees the **complete** banking information*). ⛔ None is in tension with this story; ⭐ they corroborate
AC1's unmasked render.

### Testing standards

Live-DB for the handler; contract tests in `packages/contracts`; ⚠ **⛔ no RN mount tests exist** —
source-scan plus plain-`.ts` extraction is the shipped idiom. ⭐ Assert **membership and explicit
values**, ⛔ never counts over the shared fixture ([[project_live_db_test_gotchas]]).

### References

- `.decision-log.md#decision-2026-09-10-212` **cl.2** (the ruling) · **Consequence 3** (⭐ the scope
  clause naming the handler's decrypt) · **Consequences 4-6** (what travels) ·
  `#decision-2026-09-04-191` **cl.1** (the clause it applies) **and cl.5** (⭐ the verified finding:
  the collection path, the **11/558** test-DB figure, and two stale claims corrected) ·
  `#decision-2026-09-04-190` **cl.2** (the *"Nominee Name"* wording — ⛔ unresolved here)
- ⚠ `#decision-2026-09-10-213` **cl.2** — ⛔ **still the LIVE text of §8.4(ii)** (*"still UNRULED and
  is ROUTED"*); it was ⛔ never amended, and ⛔ nothing in this story supersedes it (AC6(b), D2)
- `_bmad-output/implementation-artifacts/deferred-work.md` — **11b.3a third-pass item (e)** *(VPA
  collection; SUPERSEDED by `-212` cl.2; ⭐ still says it needs a named home)* and **item (b) `D5-subject` (i)**
  *(⭐ the "SCHEMA is the authority" sentence — ⚠ an **OPEN** deferred item with a trigger, ⛔ not a
  ruling; AC6(b)/D2)*. ⚠ ⛔ **Never cite a bare item letter in that file.**
- `_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-09-10-11b17-member-drive-detail-two-questions.md`
  **Q2** / **§4.2b** — the traced pay-path evidence the Panel ruled on, ⭐ **and the stale-comment
  defect it recorded** (Trap 6 item 1)
- `_bmad-output/implementation-artifacts/6-18-nominee-holder-name-on-the-verification-console.md`
  (`ready-for-dev`) — ⭐ the sibling to align with; ⚠ it **explicitly records that it does ⛔ NOT close
  `D5-subject` (i)**
- `apps/mobile/app/(contribution)/pay.tsx:447`, `:473-480`, `:263-267` — the ternary, the four
  `FieldRow`s this joins, the three-field sentinel check
- `apps/mobile/app/(claim)/nominee-review.tsx:232-239`, `:146` — where a VPA is actually collected
- `packages/contracts/src/contributions/nominee-accounts.ts:20`, `:46-61` — ⭐ the unmasking ground and
  **the view to edit**
- `packages/contracts/src/claims/nominee-bank.ts:112` — ⛔ **the view ⛔ NOT to edit** (Trap 1)
- `apps/api/src/modules/payment/handlers.ts:20-23` (⛔ stale header), `:98` (intent route), `:153-170`
  (⛔ **not** this path), `:240` (⭐ **this** route), `:257-263` (⛔ the superseded position),
  `:328-386` (⭐ where the new decrypt goes), `:391-395` (the count-only audit)
- `packages/domain/src/encryption/envelope.ts:92-93` · `packages/domain/src/audit/write.ts` — ⭐ the
  audit-line unit and the global advisory lock (Trap 4's sizing)
- `packages/domain/src/claim/nominee-bank-persist.ts:195` ·
  `packages/domain/src/schema/claim_nominee_bank_accounts.ts:61`, `:65-67`
- `packages/i18n/locales/{en,hi}/claim.json:60-62` — ⭐ the existing UPI-ID wording to match
- `_bmad-output/implementation-artifacts/8-13-…md` — the intake/persistence this builds on (`done`)

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List

## Change Log

| Date | Version | Description | Author |
|---|---|---|---|
| 2026-09-10 | 0.1 | Created to discharge Story `11b-17` **Task 0e** / `-212` **Consequence 3** — the work cl.2 created, which is ⛔ NOT story F's. ⭐ **ZERO open decisions**: the authority is Trustee-ratified (`-212` cl.2 applying `-191` cl.1). ⭐⭐ Four traps recorded from live verification: **(1)** ⛔ TWO types named `NomineeBankAccountView` — the exported donor view (`contributions/nominee-accounts.ts:46`) is the target; the module-private claims view (`claims/nominee-bank.ts:112`) is ⛔ NOT, and **both already carry `vpaPresent`** so a grep lands in both — ⚠ 8.13's own Task text names the wrong file for the symbol it edited; **(2)** the `.strict()` additive-field blank-out **detonates here** ⇒ Task 4 owes a stated deployment order; **(3)** a null VPA is a **first-class state**, ⛔ never an error ⇒ omit the row; **(4)** the decrypt **already happens** at `handlers.ts:155-164` ⇒ ⛔ add no KMS call, since each one is an audit line on a global lock. ⭐ Verified the VPA is **genuinely collectable** (`nominee-review.tsx` — an optional nominee-filled field) ⇒ ⛔ not an inert gate; ⚠ how many rows are populated is a **DATA question code cannot answer** and is recorded un-attested. ⚠ AC6 carries `-190` cl.2's *"Account holder"* conflict and §8.4(ii) as **recorded questions, ⛔ not gates**. | BigDev + Claude |
| 2026-09-11 | 0.2 | ⭐⭐ **VALIDATE PASS — 27 findings, all applied.** ⛔ The pin held (ancestor of HEAD, ⛔ nothing moved under it) ⇒ ⛔ **every defect below was wrong WHEN WRITTEN.** ⚠⛔ **THE LOAD-BEARING ONE: v0.1's Trap 4 was FALSE.** `handlers.ts:153-170` is the **intent POST**'s decrypt (route `:98`) — a different function, response type and request — and is ⛔ **unreachable** from the **nominee-accounts GET** (`:240`) that feeds `pay.tsx`, whose own doc-block says `vpaPresent` is computed *"WITHOUT decrypting"*. ⇒ v0.1's AC1 was **unshippable under its own AC4**. ⭐ **RESOLVED: `-212` Consequence 3 — ⛔ never quoted in v0.1 — names *"the `nominee-accounts` handler's decrypt"* as touched scope** ⇒ AC4 now authorises **exactly ONE** new soft decrypt and forbids any second, and ⭐ **the cost is SIZED** (`550a7acd`'s unit: `envelope.ts:92-93` fires one audit line per encrypted FIELD with ⛔ no DEK cache, on a deployment-wide `pg_advisory_xact_lock` ⇒ **+1 per VPA-bearing account, `0`/`1`/`2` per load, ≤6→≤8**) where v0.1 claimed *"adding none is the point."* ⚠⛔ **§8.4(ii) IS CLOSED, ⛔ not open** ⛔⛔ **← THIS SENTENCE IS FALSE; CORRECTED AT v0.3 — kept as the record, ⛔ not tidied away** — `D5-subject (i)` rules *"the SCHEMA is the authority"*; the wrong artefact is `member-pool/handlers.ts:534-542`, ⛔ not the schema; `-213`'s entry was never amended and sibling **`6-18`** (`ready-for-dev`) already builds on the answer. ⭐ AC6(a) is **genuinely still open** — ⛔ no change. ⭐ **New Traps 5-7:** four live artefacts forbid exactly what AC3 orders (incl. a test named *"REJECTS a raw `vpa` field"* and `handlers.ts:257-263` — ⭐ **the narrow reading `-212` cl.2 overturned**); three stale comments deny the VPA exists, one of them the **header of the file Task 2 edits**, ⭐ routed here **by name** by §4.2b and `11b-17`; and `selectedAccountAllFieldsUnavailable` is **three fields by design**. ⭐ **`-191` cl.5 now cited** — it **attests** the population v0.1 called *"un-attested"* (**11 of 558, TEST database**, ⛔ no seed writer ⇒ ⛔ says nothing about production). ⚠⛔ **v0.1's Trap 1 accusation against 8.13 was FALSE** — `git log -S` shows 8.13 edited exactly the file it named (`e7862103`); the donor view's `vpaPresent` came from **9.9** (`974894da`) ⇒ struck, ⭐ provenance recorded instead. ⚠ **`-212` Consequence 5's ground was over-broad** — `claim.json:60-62` already ships *"UPI ID (optional)"* in both locales ⇒ ⭐ match it, and **keep "UPI ID" LATIN in Hindi**. ⭐ New **AC7** (supersessions), **AC8** (the deployment order Task 4 had no AC for), **Task 6** (friction-budget disposition, per 8.13's precedent). ⚠ Cites corrected: `:390`→`:391-395`; `nominee-bank-persist.ts` → `packages/domain/src/claim/`; `:537` is a comment ⛔ not an assert; intake `:232-239`; the `:447` ternary branch; **flat** i18n keys; `microcopy:check` is **vacuous** here. ⚠⛔ **Bare `item (e)` (3 sites) violated `deferred-work.md`'s own addressing rule** — ⛔ a bare `(e)` means 11b.1's ⇒ qualified throughout. ⚠ **Topology recorded as a risk (Preflight row T):** `-212`/`-213` are ⛔ not on `main` and the governance branch is ⛔ unpushed. ✅ **Confirmed clean:** ⛔ no rival story, ⛔ no file collision with `11b-17`, ⛔ no double-owned or orphaned `-212` Consequence, and `-214`/AC10's scope ⛔ does ⛔ not reach this screen. | BigDev + Claude |
| 2026-09-11 | 0.3 | ⚠⛔ **SECOND VALIDATE PASS (a re-run on v0.2 itself) — 4 corrections, ⛔ 3 of them defects THIS FILE's own v0.2 introduced.** ⭐ Recorded because a validate pass that rewrites a story ⛔ can ⛔ not be assumed to have rewritten it correctly. ⚠⛔⛔ **THE SERIOUS ONE — v0.2 OVERSTATED §8.4(ii) AS *"✅ CLOSED"*, AND IT IS ⛔ NOT.** ⭐ The underlying text is **real** (`deferred-work.md` item (b) `D5-subject` (i) does say *"the SCHEMA is the authority"*, and `11b-17`'s post-validate AC4 + Change Log v1.1 do re-ground §8.4(ii) on it and drop the Panel routing) — ⛔ but the **STATUS** was traced wrong: it is an **OPEN deferred item with a trigger** (⛔ not a ruling), applied by an **author-committed correction inside a SIBLING story** (⛔ not a decision entry), on an **UNMERGED branch**, while **`-213`'s entry is unamended and still reads *"still UNRULED and is ROUTED"*** — and **`6-18` explicitly records that it does ⛔ NOT close `D5-subject` (i)**. ⇒ ⭐ **re-stated as DE-ROUTED but ⛔ NOT LOGGED**; **D2** now names the owed governance record as ⛔ **not this story's**; **AC0(c)** no longer orders a false closure into the ledger; the References stop calling `-213` *"superseded"*. ⚠ This is [[feedback_story_validate_footguns]] **#18** (a control asserted from decision text — ⭐ BUILT?/SCOPE?/**COST?** — here **SCOPE** and **status** both failed) and **#20(a)** (an author-committed note elevated to a ruling), committed by the pass that exists to catch exactly that. ⚠⛔ **AND ⛔ `microcopy:check` WAS INVERTED** — v0.2 told the dev the gate was *"vacuous"* with *"empty `copy_globs`"*; `microcopy.yaml` lists **`packages/i18n/locales/{hi,en}/contribution.json`** BY NAME — ⭐ the exact file Task 3 mints into — and calls them **tested**, ⛔ not merely scanned. ⚠ The false claim came from that file's own **STALE HEADER** (*"`copy_globs` is empty until Epic 2+"*) ⇒ ⭐ **read the list, ⛔ never the preamble** — ⚠ and note the header's comment cites [[feedback_gate_scope_semantic_coverage]], the very rule v0.2 invoked to reach the opposite, wrong conclusion. ⚠ **Task 6 was a NEW ORPHAN** — v0.2 fixed Task 4's missing AC and created the same defect one task later ⇒ tagged to **AC7**, which now carries the disposition. ⚠ Cite fixed: the contracts test is at **`:36`**, ⛔ not `:35` (`:35` is `});`) — two sites. ⭐ **Everything else in v0.2 re-verified and HELD**, including the Trap 4 handler-boundary finding, the audit sizing, the Trap 1 provenance correction, `-212` Consequence 3 verbatim, `-191` cl.5's *"11 of 558 … test database"*, the two `deferred-work.md` addressing quotes, the two `### (e)` headings, the unfiltered `ciphertextRows.map`, and every remaining `file:line` pointer ⚠ **except one, caught at v0.4: the ternary is at `:447`, ⛔ not `:448`.** ⚠⛔ **Recorded separately, ⛔ because this pass caused it:** the sprint-ledger prepend (+86 lines) will **rot `11b-17:654`'s `sprint-status.yaml:17685`/`:17739` cites on merge** — ⛔ not fixed here (that file's authoritative copy is on another branch); ⭐ they should become **block addresses**, per that same footgun **#19**. | BigDev + Claude |
| 2026-09-12 | 0.4 | ⭐ **THIRD PASS (governance + sibling cross-check against v0.3) — ⛔ ZERO CRITICAL findings; v0.3's central correction HELD under every source.** ⭐ The *"de-routed but ⛔ NOT LOGGED"* status for §8.4(ii) was re-verified clause by clause and is **precisely calibrated** — ⛔ neither over- nor under-stated: `D5-subject (i)` is confirmed *"NON-BLOCKING … ⛔ NOT resolved"* with a live **Trigger** line; `11b-17`'s AC4 sentence carries ⛔ **no** `#decision-` citation behind it; `11b-17`'s Task 0e literally **struck its own routing** (*"WITHDRAWN 2026-09-11: THERE IS ⛔ NOTHING FOR THE PANEL TO NAME"*) ⇒ ⭐ *"de-routed"* is the correct word; `-213` is unamended; `6-18:29`/`:212` confirm it does ⛔ not close `(i)`. ⭐ **Four fixes applied.** ⚠ **(1) `pay.tsx`'s ternary is at `:447`, ⛔ not `:448`** — one line off at **three** sites, carried unflagged from v0.1 through v0.3, ⚠⛔ **and v0.3's Change Log had claimed *"every remaining `file:line` pointer"* held** ⇒ that sentence is now corrected in place rather than left standing. ⭐ **(2)** AC7's **title** now names the friction-budget obligation its own body added at v0.3 — ⚠ v0.3 tagged Task 6 to AC7 without widening AC7's heading, so the AC described less than it required. ⭐ **(3)** Task 7's `microcopy:check` bullet now states the **EXPECTED RESULT: PASS** and why (⛔ no digits, ⛔ no prohibited vocabulary, ⛔ no scarcity/blame framing) — ⚠ v0.3 established the gate **has** teeth but ⛔ never told the dev what passing looks like, which invites a false alarm. ⭐ **(4)** ⚠⛔ **A FALSE CLAIM THIS STORY'S OWN VALIDATE PASS WROTE INTO `sprint-status.yaml` IS CORRECTED BY A SUCCESSOR LEDGER ENTRY** — the `2026-09-11a` block still asserted *"§8.4(ii) IS CLOSED, ⛔ NOT OPEN"*. ⛔ That was ⛔ not the dev's to clean up under AC0(c); ⭐ it was **ours**. ⚠ Corrected by **`2026-09-12a`**, a SUCCESSOR entry — ⛔ `11a`'s text is left **untouched**, per the `-128`/`-129` precedent ([[feedback_supersede_never_reinterpret]], [[feedback_record_unattested_no_backfill]]). ⭐ **Two observations carried, ⛔ neither actionable here:** ⚠ `11b-17`'s own AC4 **unconditionally relabels** its member-facing field to *"Nominee Name"* on `-190` cl.2 + `-206` cl.2 — ⭐ both **public**-scoped — i.e. the sibling **acts on** the very member-vs-public scope question `8-17`'s AC6(a) refuses to act on; ⇒ ⭐ `8-17` is the **more conservative** of the two and ⛔ that asymmetry is the governance record's, ⛔ not this story's to resolve. ⚠ The governance branch has moved three commits further (`11b.19`, `11b.20`, `11b.3b`) — ⭐ re-swept, ⛔ none touches the VPA, the payment screen or `8-17`. | BigDev + Claude |
| 2026-09-12 | 0.5 | ⚠ **FOURTH PASS — every `file:line` and decision citation re-traced against live source, ⛔ not from any prior pass's summary; ⛔ ZERO CRITICAL findings; v0.4's central correction HELD.** ⭐ Re-verified from scratch: baseline ancestry, all `pay.tsx`/`handlers.ts`/contracts/schema/i18n/microcopy/friction-budget citations, `-212`/`-191`/`-190`/`-213` verbatim text, `deferred-work.md` item (b) `D5-subject` (i) and item (e)'s heading/body split, the `sprint-status.yaml` `2026-09-11a`→`2026-09-12a` successor block, and `6-18`'s AC7/`:212` non-closure. ⭐ **Everything HELD**, including the `:447` ternary fix. ⚠ **Two corrections, both precision gaps rather than build-blocking.** ⚠⛔ **(1) v0.4's "governance branch moved THREE commits further" undercounted it — the actual number is SIX** (`116cb116`, `0080acfa`, `ff92cb00` were never named, alongside the three v0.4 did name — `738bb3ea`/`491a0fac`/`53efccd4`). ⭐ Diff-stat re-checked on all six against `pay.tsx`, the contracts/handlers/schema files this story touches: v0.4's CONCLUSION holds — ⛔ **none** touches the VPA, the payment screen or `8-17` — but the count itself was wrong, and a count is checked, ⛔ not estimated. ⚠⛔ **(2) `-214` was cited (AC6(a)) as a ratified decision without the same topology caveat Row T gives `-212`/`-213`** — `.decision-log.md` on THIS branch carries ⛔ **zero** trace of `-214`; it exists only on `governance/11b-17-validate-and-panel-routing` (`ff92cb00`, unpushed). ⭐ The **sprint-status.yaml** ledger already caught this at the FIRST validate pass (*"`-214` is absent from this story's branch entirely"*) — ⛔ but that caveat never reached the **story file itself**, so a dev reading only this document had no warning of it. ⭐ Fixed in place at Row T and at the AC6(a) citation, ⛔ not Change-Log-only, since the story file is what a dev actually reads. ⚠ **Substance unaffected:** `-214`'s content (§8.1, the `Nominee full name`/`District` table, *"both the member and the public view"*) was independently re-verified against `ff92cb00`'s commit message and does ⛔ **not** reach the payment screen — the citation's CONTENT was always right; only its **branch-presence caveat** was missing. ⛔ **NO CODE, ⛔ zero rows flip.** | BigDev + Claude |
