# Trustee Panel routing note — 2026-09-10

## Story 11b.17 (**Story F** — the member's view of ONE drive) is **written and ⛔ not yet built.** Two questions block it. **(1)** You ruled **"Expected" / लक्ष्य** onto the member's drive *list* last week — ⭐ **and ⛔ only where a `super_admin` has switched it on for that Pariwar, which is ⛔ nowhere today** — and told us the *detail* page was **⛔ not decided by that ruling**, so we are asking. **(2)** ⚠⛔ **A clause you ratified says the family's UPI ID is *"shown to the logged-in member"* — and we recorded it as *satisfied* by a payment button that ⛔ never shows it.** We think that reading may be wrong, and we would rather ask than keep it.

> ⚠⛔ **A NOTE ON WHAT COUNTS AS EVIDENCE HERE.** Every factual claim below is either (a) **verbatim
> ratified text** from `.decision-log.md`, or (b) **verified repository state** — a shipped file's
> contents, a grep with its result, an absent route. ⛔ We have deliberately ⛔ **not** rested any part
> of this escalation on a code comment, a doc-block, or a story file's own prose — ⚠ **and Q2 exists
> precisely because we once did.** ⭐ §7 lists every command, so any claim here can be re-run.

> ⭐⭐ **THE ONE THING TO KNOW BEFORE READING FURTHER.** ⛔ **Neither question is a defect in what you
> ruled.** **Q1** is a question your own record left **explicitly open and handed to this story by
> name.** **Q2** is a place where you ruled clearly and **we narrowed it in our own notes** without
> coming back to you. ⇒ ⭐ Q1 asks you to **extend**; Q2 asks you to **confirm or correct us**.

---

## 1. What is being asked, precisely

| # | Question | What is blocked |
|---|---|---|
| **Q1** | Where a `super_admin` **has** switched the member reveal on, does the member's **per-drive detail** show **"Expected" / लक्ष्य** — and for **which** drives? ⭐ The switch itself is ⛔ not in question. | ⛔ Story F cannot start. Its own "shows at least what the public shows" test ⛔ cannot be written either way. |
| **Q2** | Does *"the UPI ID is shown to the logged-in member"* mean the **ID itself is displayed**, or is a **"Pay by UPI" button** enough? | ⛔ Story F cannot start. ⚠ And a **standing record of ours is wrong** in one reading or the other. |

⭐ **Q2 is the one we would most like answered**, because a wrong answer there is not a missing
feature — it is either **a ratified instruction we quietly declined to follow**, or **a Tier-1 field
about to be put on screen on a reading you never gave.**

---

## 2. ⭐ What was ratified, and what was ⛔ NOT

### 2.1 Verbatim — `2026-09-04-189` **cl.3** (Trustee-ratified)

> ⭐⭐ **A MEMBER MUST SEE MORE THAN THE PUBLIC, AND ⛔ NEVER LESS.**

### 2.2 Verbatim — `2026-09-09-211` **Consequence 2** — ⭐ this note's occasion

> ⚠ Story `11b-17` (**F**, the member's drive **detail**) is ⛔ **not** ruled here. ⭐ Whether the
> per-drive view shows लक्ष्य, and on which axis, is F's question — ⛔ it does ⛔ not inherit this by
> symmetry.

### 2.3 Verbatim — `2026-09-09-211` **cl.1**

> **THE MEMBER'S DRIVE LIST RENDERS THE EXPECTED FIGURE.** Story `11b-15`'s fourth-tab list shows
> लक्ष्य per drive. ⛔ Its previous scope sentence — *"⛔ no target (story **C** keeps it hidden)"* — is
> **RETIRED**, at all three sites it appeared.

### 2.3b ⭐⭐ Verbatim — `2026-09-09-211` **cl.2 and cl.3** — ⛔ THE GATE, WHICH IS ⛔ NOT IN QUESTION

> **cl.2** … ⭐ **`-190` cl.7(c) already authorises it** — the reveal is reserved to a Superadmin
> *"separately for member and for public"*. A member-only reveal is therefore an
> **already-ruled-legitimate** state, ⛔ not a new disclosure class.
>
> **cl.3. ⭐ THE DEFAULT IS FAIL-CLOSED, AND ⛔ NOTHING RENDERS AT LAUNCH.** An absent
> `pariwar_drive_target_visibility` row is **HIDDEN FROM EVERYONE** (`-190` cl.7(b)). ⛔ No Pariwar has
> a row today. ⇒ ⛔ **no expected figure renders to any member on the day this ships**, and ⛔ no action
> is required to comply — ⭐ the state is already correct.

⇒ ⭐⭐ **SO THE RULE IS, AND STAYS: a member sees this figure ⛔ ONLY where a `super_admin` has switched
`reveal_to_members` ON for that Pariwar.** ⛔ Q1 does ⛔ **not** touch that. ⭐ Q1 asks ⛔ only what
appears on the **detail page** *once the switch is on*.

### 2.4 Verbatim — `2026-09-04-190` **cl.7** (Trustee-ratified)

> **7. ⭐ THE TARGET — WHO SETS IT AND WHO MAY REVEAL IT ARE SPLIT.**
> … **(b)** it is ⛔ **NOT visible** to member or public;
> **(c)** ⭐ **ONLY A SUPERADMIN may make it visible**, and **separately for member and for public**.

### 2.5 Verbatim — `2026-09-04-191` **cl.1** (Trustee-ratified — **Dhiraj Rahul** and **Kalpana Bharti**)

> **1. ⭐ `nominee_vpa` — A MEMBER FIELD, ⛔ NOT A PUBLIC ONE.** `-190` cl.1 removed the banking
> coordinates from `public`; ⇒ the VPA goes with them, and is **shown to the logged-in member so they
> can make the contribution**. ⭐ Closes `-190` follow-up (i) — BigDev proposed removal-for-consistency
> and the Panel confirmed it, ⚠ **with the purpose stated**: it is ⛔ not merely withheld from the
> public, it is **carried on the member surface as a payment coordinate**.

### 2.6 ⭐ What was ⛔ NOT ruled

- ⛔ **Nothing** says whether the **detail** page shows लक्ष्य. `-211` says so in as many words (§2.2).
- ⛔ **Nothing** says what *"shown to the logged-in member"* requires **on screen**.
- ⛔ **Nothing** says whether लक्ष्य on a **closed** drive behaves like a live one. ⚠ `-204` **cl.2**
  placed it *"right of the progress bar, **on a LIVE row**"* — ⭐ a slot that describes a live row and
  ⛔ says nothing about a finished one.

---

## 3. ⛔⛔ Q1 — does the **detail** show लक्ष्य?

### 3.1 What exists today — ⭐ verified, ⛔ not asserted

- The member's **list** carries it: `driveTargetInr` at
  `packages/contracts/src/contributions/member-drive-list.ts:187`.
- ⚠ **It is carried on `live` rows ⛔ ONLY.** The producer's own guard,
  `satisfiesMemberDriveLiveRowPairing` (`:236-244`), enforces
  `entry.status === 'live' ? true : entry.driveTargetInr === undefined`.
- ⭐ **⛔ Nothing renders today regardless.** The reveal is **fail-closed**: an absent
  `pariwar_drive_target_visibility` row is hidden from everyone (`-190` cl.7(b)), and ⛔ **no Pariwar
  has a row.**
- ⭐ **There is ⛔ no detail page yet.** `apps/mobile/app/(tabs)/` contains `index`, `panchayat`,
  `sahyog`, `shradhanjali` — ⛔ no per-drive route. Story F would build the first one.

### 3.1b ⭐⭐ THE SWITCH ITSELF IS **BUILT AND OPERABLE** — ⭐ traced end to end, ⛔ not taken on trust

⚠⛔ **We checked this because we had ⛔ not.** Our statement that the figure is *"off until a
Superadmin turns it on"* rested on the **decision text**, ⛔ not on the code — and this programme has
already been bitten once by a governed control that was ratified, documented and **⛔ unwritable**
(the public name-publication basis, still provisioning-inert today). ⇒ ⭐ the chain, each link
verified:

| Link | Where |
|---|---|
| The table + the one-way CHECK (public-on **implies** member-on) | `0115_pariwar-drive-target.sql:103`, `:143` |
| The permission key, ⛔ `super_admin` only | `rbac/permissions.ts:1079` |
| ⭐ `super_admin` **holds** it — its bundle **IS** the catalog, so the key auto-derives | `rbac/roles.ts:264-266` |
| ⭐ Asserted by a test, ⛔ not assumed — `expect(holders).toEqual(['super_admin'])`, `pariwar_admin` excluded | `tests/rbac/roles.test.ts:218-240` |
| The API module is **mounted**, ⛔ not merely imported | `apps/api/src/server.ts:246` |
| The routes gate on the key | `modules/drive-target/routes.ts:11` |
| The write **reaches the column** | `modules/drive-target/handlers.ts:416` |
| The admin route is in the tree | `apps/admin/src/router.tsx:131-134`, `:284` |
| The form, and its refusal of the forbidden combination | `RevealSwitchesForm.tsx:105` |

⇒ ⭐⭐ **`-211` cl.3 is true in the STRONG sense: the figure is off because ⛔ nobody has switched it,
⛔ not because nobody CAN.** ⚠ There is ⛔ no navigation link to the page — ⭐ but that is how **all 29**
per-Pariwar admin pages work (`nominee-bank-masking`, `directory-publication` and the rest are
URL-reached too), ⛔ so it is ⛔ not a defect in this control.

### 3.2 ⛔⛔ THE FINDING

Story F was written to say *"⛔ no target"*. ⚠⛔ **That is the exact sentence `-211` cl.1 retired from
the sibling story**, and F had copied it. ⇒ as written, F would have produced a **detail page showing
less than the list it opens from, and less than the public index** — the inversion cl.3 exists to
forbid, and a contradiction of F's own acceptance criteria.

⭐ We have struck it. ⛔ **But striking it does ⛔ not decide what replaces it**, and `-211` told us not
to assume.

### 3.3 ⚠ And there is a **second axis** the list never had to face

The list carries लक्ष्य on **live** rows only. ⭐ The **detail** page covers **three** stages — `live`,
`closed` and `settled`. ⇒ a question the list's ruling ⛔ never met:

> ⚠ **On a drive that has FINISHED, does the member see what the target had been?**

⭐ **INFERENCE — ⛔ labelled as such:** we read `-204` cl.2's *"on a LIVE row"* as describing **where
the number sat on that screen**, ⛔ not as a rule that the figure disappears once a drive closes. ⚠ But
that is our reading of a slot description, ⛔ not a ruling, so we are ⛔ not acting on it.

---

## 4. ⛔⛔ Q2 — *"shown to the logged-in member"*: the ID, or a button?

### 4.1 ⭐ What you ruled — §2.5, in one line

The UPI ID is a **member field**, *"shown to the logged-in member so they can make the contribution"*,
and your record states the purpose: *"⛔ not merely withheld from the public, it is **carried on the
member surface as a payment coordinate**."*

### 4.2 What exists today — ⭐ verified

`packages/contracts/src/contributions/nominee-accounts.ts:44`, `:61` — the member's payment screen
receives a **boolean**, ⛔ never the ID:

```
* `vpaPresent` says whether a UPI `pa=` can be built for this account today WITHOUT exposing the VPA itself.
      vpaPresent: z.boolean(),
```

The ID itself is read **server-side** and folded into a UPI payment link, so a member can **tap and
pay** ⛔ without ever seeing the string.

### 4.2b ⛔⛔ **AND THE PAY PATH REACHES ⛔ EXACTLY ONE DRIVE** — ⭐ traced, ⛔ not assumed

⚠⛔ **This is the fact that changes Q2, and we ⛔ had not checked it when we first drafted this note.**

⭐ The payment path is **real and complete**: `api-client:746` posts to
`POST /api/v1/member/contribution/intent` (mounted at `server.ts:207`), the handler decrypts
`vpa_ciphertext` at the API boundary (`payment/handlers.ts:155-164`) and returns a `upi://pay` URL,
which `UPIIntentButton.tsx` launches. ⛔ Nothing here is stubbed.

⛔⛔ **BUT ITS SCOPE IS ⛔ ONE POOL.** Every call runs through `resolveMemberLivePool`
(`member-pool/handlers.ts:849-900`), which returns `null` unless **all** of these hold, and otherwise
returns **exactly one** pool:

1. the member is **`active`**;
2. the Pariwar has a **`live`** contribution cycle;
3. the member is **assigned** in it;
4. of several, it takes the **soonest-closing** one.

⇒ ⭐⭐ **the member can tap-and-pay on ⛔ ONE drive: their OWN, currently-assigned, LIVE one.**

⚠⛔⛔ **STORY F's PAGE SHOWS ⛔ EVERY DRIVE THE PARIWAR HAS EVER RUN, IN THREE STATES.** For ⛔ all of
them but that single one — another family's drive, a `closed` drive, a `settled` drive — ⛔ **there is
⛔ no intent, ⛔ no button and ⛔ no pay path of any kind.**

⇒ ⚠⛔ **SO OPTION (A) — *"the button is enough"* — IS ⛔ EMPTY ON THIS SURFACE.** On story F's page a
`vpaPresent` boolean would light up a control that ⛔ leads nowhere, for ⛔ every drive but one.

⭐ **THE FAIR COUNTER, STATED SO IT IS ⛔ NOT BURIED:** on those other drives there is ⛔ **no payment
purpose** — the member is ⛔ not being asked to pay them. ⇒ ⭐ excluding the VPA there is **principled,
⛔ not a gap** — and it points at an answer we ⛔ had not offered you: ⭐ **that the VPA simply does
⛔ not belong on story F's surface at all**, because F's surface has ⛔ no payment purpose. ⚠ That is
⛔ neither of the two readings we first described, which is why we are adding it as **option (D)**.

⚠ **AND THE ASYMMETRY THAT ARGUES THE OTHER WAY:** under `-199` the other **five** coordinates —
account number, IFSC, bank, branch, holder name — go onto that page for **every** drive. ⇒ singling
out the VPA gives the member five coordinates and withholds the **sixth** — ⭐ the one that exists to
be handed out.

> ⭐ **One thing we can and cannot tell you.** The VPA **column and its intake exist** and a writer is
> live (`claim/nominee-bank-persist.ts:195`). ⛔ We ⛔ cannot say from code **how many nominees have
> actually supplied one** — it is an **optional** field. ⚠ A code comment at `payment/handlers.ts:21-22`
> still claims *"There is NO VPA in the substrate today"*; ⭐ that comment is **STALE** and we are
> recording it as a defect to fix, ⛔ not relying on it here.

### 4.3 ⛔⛔ THE FINDING — ⚠ **and it is ours, ⛔ not yours**

Our own working record (`deferred-work.md`, item (e)) reasons as follows, verbatim:

> ⭐⭐ **AND cl.1's purpose is ALREADY SATISFIED, ⛔ by a path that predates it:** the plaintext VPA is
> consumed **SERVER-SIDE** into the member's UPI intent … ⇒ ⛔ **do ⛔ NOT "close" anything by adding
> `vpa` to that wire**; that would be a NEW Tier-1 exposure ⛔ nobody ruled on.

⚠⛔⛔ **THAT LAST PHRASE IS ⛔ NOT ACCURATE, AND WE ARE CORRECTING IT IN FRONT OF YOU.** You **did**
rule on it — cl.1, Trustee-ratified, **with the purpose stated.** ⇒ what is genuinely unruled is ⛔ not
*whether* the member gets the VPA, but **what *"shown"* requires**:

- ⭐ **The narrow reading (what we built):** the member can *use* the coordinate. Purpose served; the
  string stays off the screen and out of screenshots.
- ⭐ **The plain reading (what the words say):** *"shown … carried on the member surface"* means the
  member can **read it** — and can therefore pay from **another** device, another app, or by reading
  it to someone, ⛔ none of which a button on one screen supports.

⚠ **We took the narrow reading in a working note and recorded the item CLOSED.** ⛔ It was never put
back to you. ⭐ Story F is the first surface that would act on it either way, which is why it surfaces
now.

### 4.4 ⚖️ What is actually at stake — ⛔ stated plainly

⚠ A UPI ID is ⛔ **not** like an account number. It is designed to be handed out — it is how people are
paid. ⭐ But it is still a **bereaved family's** payment address, and Story F would put it in front of
**every member of the Pariwar, for every drive, indefinitely** (`-199`), on a phone, ⛔ where it can be
screenshotted and forwarded.

⇒ ⭐ the question is ⛔ not *"is a VPA sensitive"* in the abstract. It is: **does your instruction that
it be *shown* mean shown, given that population?**

---

## 5. ⚖️ Stated fairly, in both directions

**For showing more (Q1 लक्ष्य on all stages; Q2 the ID visible):**
⭐ These are the people who **funded** the drive. A trust that hides from its own members what a drive
was aiming for, or where the money was sent, is a strange kind of transparency. ⭐ And cl.3 — *a member
sees more than the public, never less* — points this way on every axis.

**For showing less (Q1 live-only; Q2 the button only):**
⚠ Everything on a member's phone is **screenshottable, forwardable, and ⛔ not revocable** — a page can
be taken down; a screenshot cannot. ⚠ **"Expected"** on a **closed** drive is a fact about a
family's shortfall that serves ⛔ no payment purpose once the drive is over. ⚠ And the UPI ID's purpose
— **paying** — is already fully served without displaying it.

⛔ **We take neither side.** ⭐ We note only that Q2's narrow reading was adopted **without asking**, and
that is the part we are correcting.

---

## 6. The options — ⛔ none is pre-ruled

### 6.1 Q1 — लक्ष्य on the member's drive detail

| | Option |
|---|---|
⭐⭐ **ALL THREE OPTIONS SIT ⛔ BEHIND THE SWITCH.** In every one of them a member sees **nothing**
unless a `super_admin` has switched **`reveal_to_members`** ON for that Pariwar (`-190` cl.7(b)/(c);
`-211` cl.2). ⛔ That gate is ⛔ **not** what is being asked and is ⛔ not on the table.

| | Option — ⭐ each applies ⛔ ONLY where the member reveal is ON |
|---|---|
| **(A)** | ⭐ **Show it on ALL THREE stages** (`live` · `closed` · `settled`). ⭐ Consistent with the list by construction; ⭐ satisfies cl.3 on every stage; ⚠ discloses a finished drive's shortfall. |
| **(B)** | ⭐ **Show it on LIVE drives only** — ⭐ exactly mirrors the list and `-204` cl.2's slot. ⚠ A member opening a **closed** drive sees no figure, which is ⛔ not less than the public (the public index is live-only too). |
| **(C)** | ⛔ **Do not show it on the detail at all**, even with the switch on. ⚠⛔ We must say plainly: this would put the **detail below the list** for the same drive, and we ⛔ cannot reconcile it with cl.3 or with F's own acceptance criteria. ⇒ if you choose it, ⭐ it needs a stated reason we can record. |
| **(D)** | ⭐ Something else. |

### 6.2 Q2 — the UPI ID on the member's drive detail

| | Option |
|---|---|
| **(A)** | ⭐ **Confirm the narrow reading — the button is enough.** ⛔ The ID stays off every screen; `vpaPresent` remains a boolean. ⚠⛔ **But see §4.2b: on story F's page that button exists for ⛔ ONE drive out of every drive shown**, so on this surface (A) is close to indistinguishable from (D). |
| **(D)** ⭐ **new — added after tracing the pay path** | ⭐ **The VPA belongs on the PAYMENT surface, ⛔ not on story F's.** cl.1 is satisfied where a member is actually **asked to pay** — their own live assigned drive — and the drive-detail page carries the other five coordinates ⛔ without it. ⭐ This states a **boundary** rather than a reading, and it is the option our own tracing suggests. |
| **(B)** | ⭐ **Confirm the plain reading — show the ID.** ⭐ cl.1 is applied as written; Story F renders it beside the other coordinates. ⚠ A new Tier-1 field reaches the member surface, and we would record the exposure the way `-199` was recorded. |
| **(C)** | ⭐ **Show it, but narrower than `-199`** — e.g. ⛔ only while a drive is still collecting, or ⛔ only for the drives that member was asked to pay into. ⚠ This would make the VPA the **one** coordinate scoped differently from the rest, which we would need to build and test separately. |
| **(D)** | ⭐ Something else. |

⚠⛔ **A note on `-199`, so it is ⛔ not mistaken for a ruling of yours.** The decision applying `-190`
cl.3 *"literally"* — any member, any drive in their Pariwar, any stage — is **author-committed by
BigDev**, ⛔ **not Trustee-ratified.** ⭐ It enumerated *"account number, IFSC, UPI ID and holder
name"*. ⇒ Q2(B) is ⛔ not a new grant so much as an admission that the enumeration and our working
note **disagreed**, and ⛔ nobody noticed.

---

## 7. ⭐ How every fact above was established — ⛔ re-runnable

⭐ All paths relative to the repository root; `main` at `a2617869`.

| # | Claim | Command |
|---|---|---|
| C1 | `-211` hands the लक्ष्य question to F by name | `sed -n '110,116p' .decision-log.md` |
| C2 | `-211` cl.1 retired *"no target"* from story E | `sed -n '57,62p' .decision-log.md` |
| C3 | `-191` cl.1 is **Trustee-ratified** (DR + KB) and states the purpose | `sed -n '2022,2036p' .decision-log.md` |
| C4 | ⛔ Only `-191` **cl.4** was ever superseded (by `-204`); ⭐ cl.1 stands | `grep -n "191.*SUPERSEDED\|SUPERSEDED.*191" .decision-log.md` |
| C5 | `-199` is **author-committed**, ⛔ not Trustee-ratified | `sed -n '1486,1488p' .decision-log.md` |
| C6 | The member wire carries लक्ष्य | `grep -n "driveTargetInr" packages/contracts/src/contributions/member-drive-list.ts` |
| C7 | ⚠ It is carried on **live** rows only | `sed -n '236,244p' packages/contracts/src/contributions/member-drive-list.ts` |
| C8 | The member payment wire carries a **boolean**, ⛔ never the VPA | `grep -n "vpaPresent\|vpa" packages/contracts/src/contributions/nominee-accounts.ts` |
| C9 | Our working note called it *"a NEW Tier-1 exposure ⛔ nobody ruled on"* | `sed -n '336,352p' _bmad-output/implementation-artifacts/deferred-work.md` |
| C10 | The reveal is fail-closed and ⛔ no Pariwar has a row | `sed -n '83,90p' .decision-log.md` |
| C11 | ⛔ No per-drive route exists today | `ls "apps/mobile/app/(tabs)/"` |
| C12 | The reveal **permission key** exists, `super_admin` only | `grep -n "manage_drive_target_visibility" packages/domain/src/rbac/permissions.ts` |
| C13 | `super_admin` **holds** it (bundle = the catalog); a test asserts the holder set | `sed -n '218,240p' packages/domain/tests/rbac/roles.test.ts` |
| C14 | The API module is **mounted**, and the write reaches the column | `grep -n "registerDriveTargetModule" apps/api/src/server.ts` · `sed -n '410,420p' apps/api/src/modules/drive-target/handlers.ts` |
| C15 | The admin page is routed, and the form refuses public-on-without-member-on | `grep -n "drive-target" apps/admin/src/router.tsx` · `sed -n '105p' apps/admin/src/modules/drive-target/RevealSwitchesForm.tsx` |
| C16 | The intent route is mounted and the client posts to it | `grep -n "registerPaymentModule" apps/api/src/server.ts` · `sed -n '746p' packages/api-client/src/index.ts` |
| C17 | The handler decrypts the VPA server-side and returns a `upi://pay` URL | `sed -n '155,192p' apps/api/src/modules/payment/handlers.ts` |
| C18 | ⛔ The pay path resolves to ONE pool — active + live cycle + assigned + soonest-closing | `sed -n '849,900p' apps/api/src/modules/member-pool/handlers.ts` |
| C19 | The VPA column has a live writer; the "no VPA in the substrate" comment is STALE | `grep -n "vpaCiphertext" packages/domain/src/claim/nominee-bank-persist.ts` · `sed -n '21,22p' apps/api/src/modules/payment/handlers.ts` |

---

# Appendix A — In plain words

## The first question

Last week you decided that when a member opens the list of drives in their Pariwar, they can see the
figure you named **"Expected"** — लक्ष्य — for each one.

⭐⭐ **But ⛔ only if it has been switched on for that Pariwar.** You ruled that this figure stays
**hidden from everyone** unless a **Superadmin** deliberately turns it on, and that they can turn it on
for **members** and for the **public** separately. ⭐ ⛔ Nobody has turned it on anywhere, so ⛔ **no
member sees it today, and none will until someone does.** ⛔ **None of that is in question here** — we
are ⛔ not asking you to revisit the switch.

⭐ What you also said, in the same decision, is that this did **not** automatically settle what happens
on the **detail page** for a single drive, and that we should come back and ask. ⭐ This is us asking:
**when the switch IS on, what should the detail page show?**

There is a reason it matters. A member taps a drive in the list and opens its page. ⚠ If the list shows
the figure and the page does not, then **going in for more detail gives you less** — which is
the opposite of how it should work, and the opposite of a rule you have already given us: *a member
should see more than a stranger, never less.*

⚠ There is one extra wrinkle. On the list, the figure appears only for drives that are **still
collecting**. ⭐ The detail page also covers drives that have **finished**. ⇒ so: **should a member
looking at a finished drive still be able to see what it had been aiming for?** ⛔ Nobody has decided
that, and we are not deciding it for you.

> ⭐ **Nothing shows to anyone today either way** — the figure is switched off everywhere until a
> Superadmin turns it on, and ⛔ nobody has.

## The second question — ⚠ this one is a correction, ⛔ not a request

In September you ruled that the family's **UPI ID** is a **member** field. Your words were that it is
*"shown to the logged-in member so they can make the contribution"* — and the record went further,
saying it is *"carried on the member surface as a payment coordinate"*, ⛔ not merely kept from the
public.

⚠⛔ **What we actually built shows the member a "pay" button and ⛔ never the ID itself.** The app
knows the UPI ID behind the scenes and uses it to make the payment work, but a member ⛔ cannot read it.

⛔⛔ **And then we wrote in our own working notes that your instruction was "already satisfied" by that
button, and closed the matter — without asking you.** ⚠ We also wrote that showing the ID *"would be a
new exposure nobody ruled on"*, which was ⛔ **not right**: you had ruled on it. ⭐ We are putting that
in front of you rather than leaving it buried in a file.

⇒ **so: when you said the UPI ID is *shown* to the member, did you mean they can see it?**

⭐ It makes a practical difference. If a member can only tap a button, they can pay ⛔ only from that
phone, in that app, at that moment. If they can **read** the ID, they can pay from a different app,
from a computer, or pass it to a family member who is doing the paying.

⚠ And the reason it is not obvious: a UPI ID is meant to be given out — it is how people get paid. ⛔ But
this one belongs to a **bereaved family**, and the plan is to show it to **every member of the
Pariwar, for every drive, from now on** — on phones, where anything on screen can be photographed and
passed along.

### ⭐⭐ And one more thing we found only by checking — it may make the question simpler

⚠⛔ **That "pay" button works on ⛔ exactly ONE drive: the member's own, currently open, the one they
have actually been asked to contribute to.** ⛔ For every other drive on the new page — another
family's, or one that has already finished — ⛔ there is ⛔ no button, and ⛔ no way to pay, because
⛔ nobody is asking them to.

⇒ ⭐ So on this new page, *"the button is enough"* is ⛔ **not really an answer** — for almost every
drive shown there ⛔ **is no button.**

⭐ Which points at a third possibility we had ⛔ not offered you: **that the UPI ID simply belongs on
the *payment* screen — where a member is being asked to pay — and ⛔ not on this new page at all.**
⚠ The new page would then show the family's bank account number, IFSC, bank and branch, ⛔ but not the
UPI ID. ⚠ That is a little odd — ⭐ the UPI ID is the one detail *designed* to be handed out, and it
would be the one we hold back.

⛔ **We are not arguing for any of the three.** ⭐ We are saying that we chose one quietly, and that was
not ours to choose.

## What happens now

⛔ **Nothing is being built until you answer.** Story F is written and held.

⭐ If you are content with the payment button as it is, say so and we will correct our note to say you
confirmed it — ⛔ rather than that nobody had been asked.
