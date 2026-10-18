# ADR Ratification — Trustee Consent Sheet (2026-10-17)

**Purpose:** collect Trustee Panel consent for the **three `drafted` Section A ADRs** — **ADR-0040** (staff email transport),
**ADR-0041** (the SMS gateway, MSG91) and **ADR-0042** (MSG91's delivery reports). Mark **Ratify / Defer / Reject** and initial.

**Trustee Panel (≥2-trustee quorum required to ratify):** Dhiraj Rahul (Trustee 1) · Kalpana Bharti (Trustee 2)
**Prepared by:** BigDev (Solo Builder)
**Outcome:** ✅ **ALL THREE RATIFIED 2026-10-18** (Dhiraj Rahul + Kalpana Bharti, relayed by BigDev — *"2. ratified"*; Decision `2026-10-18-358`),
with ADR-0042's §3.11 pointer. ⚠ Not covered: ADR-0040's production email provider (not asked — roster Row 24 (a)).
**Authority for the flip:** `docs/adr/README.md` lifecycle (`drafted → under-trustee-review → ratified`); `docs/knowledge-transfer/adr-index.md` is the authoritative status ledger.

> **Status as of 2026-10-17.** Section A breakdown (the index summary): `slot-reserved-pre-write` 112 · `drafted` **3** ·
> `under-trustee-review` 0 · `ratified` 37 · `superseded` 1 · **Total 153**. The three `drafted` rows are all on this sheet; if all three
> ratify, **`drafted` reaches 0**. ⚠ A pre-existing drift is recorded in the index (a tally of the rows gives 111 / 39, not the summary's
> 112 / 37); it is not corrected by this sheet.
>
> **None of these ratifications is a merge gate** — each is a go-live gate (roster Rows 24 (a), 32 (a), 33 (a)). Nothing is in
> production.

---

## Read-first priority

**Three things the Panel should read before signing.**

### 1. ADR-0042 departs from architecture §3.11 step 1 — ratifying it accepts the departure

Architecture §3.11 (ratified) says every inbound webhook *"**Verify** provider signature at handler entry"*. MSG91 offers **no
signature at all** — only custom static headers — so ADR-0042 authenticates its delivery reports with a **static secret header**
compared in constant time. Ratifying ADR-0042 accepts that; so that §3.11 does not silently contradict a ratified ADR, the following
one-line pointer is applied to §3.11 **on ratification** (approve it with ADR-0042):

```diff
 1. **Verify** provider signature at handler entry (per §3.5, §2.8 patterns).
+   A provider that offers no request signature (MSG91's SMS delivery reports) is authenticated by a
+   static secret header compared in constant time, as recorded in ADR-0042; the signature step is
+   restored if the provider adds signing.
```

Ratifying ADR-0042 also accepts a second, matching departure: the architecture's edge capability *"Ingress signature verification —
verifies inbound traffic origin before passing to backend"* cannot be met for this route either (there is no signature to verify), so
the route is protected by the same static header instead (ADR-0042, *"The edge bar, too"*).

### 2. What a forged delivery report could do, under the follow-up you ruled

The reports are protected by a secret header (Read-first 1). If that secret leaked, could a forged report harm a family? Compared with
today (reports change nothing yet), no: a forged report can never make a person count as reached who would not count today. But compared
with genuine reports, two things become possible under the follow-up you ruled on 2026-10-17 (Decisions `2026-10-17-350`, `-351`): a
forged "delivered" report could end a real failure's follow-up early — and with it the hold on closing their claim for silence, so the
claim could then be closed for silence as though the family had been reached; and a forged "not delivered" report could start a
follow-up for a person who was in fact reached — up to two more copies of a reminder, about
eight days' hold on closure, a request to the District Admin to call or post a letter, and, at the end, that person treated as not
reached on that number (letter-eligible for good; closure notice by letter). Both are limited to the persons targeted, one follow-up
at a time. The secret is KEPT (Decision `2026-10-18-355`): MSG91 offers no signature and publishes no source addresses, so there is
nothing stronger to use; the cost — a leaked secret can end a real follow-up's protection until it is changed — is recorded in
ADR-0042's dated note.

### 3. ADR-0041's main accepted risk is now being closed by the delivery-report work

ADR-0041 accepted that MSG91 says "accepted" even for texts that never arrive. Rows 6-37b (receiving reports, ADR-0042) and 6-37c (the
Panel's delivery ladder) close that gap; until both are done, no claim-text template is switched on (roster Row 32 note (9)).

---

## 1 · ADR-0040 — Staff email transport

**File:** `docs/adr/ADR-0040-staff-email-transport.md` · **Authored:** 2026-10-09, Story 6.25 · **Status:** `drafted` · **Never
presented to the Panel.** · **Go-live gate:** roster Row 24 (a).

**What it commits:** staff email (the email to every Pariwar Admin for a standing suspicion refusal — *"open the list"*, no names, no
note) is sent through a provider-agnostic port in `apps/jobs` with two real adapters — **AWS SES v2 in Mumbai (`ap-south-1`)** and
**Zoho ZeptoMail** — one chosen per environment by config. It **amends ADR-0009 §5's "sole query path"** for identity data to admit
exactly two further read paths, both fenced by a source test: an eligibility check that reads no identity column, and a read of ONE
admin's encrypted email, decrypted only in the sending job's memory.

**Accepted risks:** "accepted" is not delivery; a timeout or provider error may produce a second email (recorded and alarmed); every
alarm reaches the logs only until alerting is wired to a named person (Row 24).

| | Ratify | Defer | Reject | Initials | Notes / conditions |
|---|---|---|---|---|---|
| **Dhiraj Rahul** | ☑ | ☐ | ☐ | (relayed by BigDev) | *"2. ratified"* — Decision `2026-10-18-358` |
| **Kalpana Bharti** | ☑ | ☐ | ☐ | (relayed by BigDev) | *"2. ratified"* — Decision `2026-10-18-358` |

---

## 2 · ADR-0041 — The SMS gateway: MSG91

**File:** `docs/adr/ADR-0041-sms-gateway-msg91.md` · **Authored:** 2026-10-17, Story 6.37 · **Status:** `drafted` (amended twice the same
day — Story 6.37's review; Story 6.37b's CRQID) · **Never presented to the Panel.** · **Go-live gate:** roster Row 32 (a).

**What it commits:** every SMS — the correction, closure and certificate texts, the suspicion notices, the neighbours' request, and both
login codes — is sent through **MSG91's Flow API** behind the existing SMS seam, with each template's named values; a **template
pre-flight** reads each template from MSG91 before a text is spent, because MSG91's own answer cannot be trusted (it says "success" even
to a fake key). Where a run can hold (suspicion notices, the neighbours' request) a broken template holds it; on the correction, closure
and certificate paths only a proven fault stops a text. Every send now carries an id MSG91 echoes back in its delivery report.

**Accepted risks:** "accepted" is not delivery (being closed — Read-first 3); no idempotency key, so a retried timeout can text a person
twice (recorded, not hidden); a false template mismatch can hold a run until MSG91's response format is confirmed in writing.

| | Ratify | Defer | Reject | Initials | Notes / conditions |
|---|---|---|---|---|---|
| **Dhiraj Rahul** | ☑ | ☐ | ☐ | (relayed by BigDev) | *"2. ratified"* — Decision `2026-10-18-358` |
| **Kalpana Bharti** | ☑ | ☐ | ☐ | (relayed by BigDev) | *"2. ratified"* — Decision `2026-10-18-358` |

---

## 3 · ADR-0042 — MSG91's delivery reports

**File:** `docs/adr/ADR-0042-msg91-delivery-report-ingress.md` · **Authored:** 2026-10-17, Story 6.37b · **Status:** `drafted` · **Never
presented to the Panel.** · **Go-live gate:** roster Row 33 (a).

**What it commits:** MSG91's delivery reports are received at one public route authenticated by a **static secret header** (Read-first 1),
stored as a six-field record (plus our own receive time) that **never includes the phone number**, acknowledged only after the record is saved, and matched by a
background job to the exact text through our own id. The api always starts, whatever the state of the secret; the results go into one
new table; the existing send records are never changed. Cloudflare is told not to challenge this one route.

**Accepted risks:** a secret header is weaker than a signature — anyone holding it could post a report (bounded — Read-first 2); a
Secret Manager outage when the api starts disables the webhook until a restart; the route's rate limit (1,200 a minute, provisional) is
counted per caller-supplied address; a report that never comes leaves a text counted as accepted, caught by a daily silence alarm.

**Approving this row also approves the §3.11 pointer in Read-first 1.**

| | Ratify | Defer | Reject | Initials | Notes / conditions |
|---|---|---|---|---|---|
| **Dhiraj Rahul** | ☑ | ☐ | ☐ | (relayed by BigDev) | *"2. ratified"* — Decision `2026-10-18-358` |
| **Kalpana Bharti** | ☑ | ☐ | ☐ | (relayed by BigDev) | *"2. ratified"* — Decision `2026-10-18-358` |

---

## On ratification — what changes

| Artifact | Change |
|---|---|
| `docs/adr/ADR-0040-*.md`, `ADR-0041-*.md`, `ADR-0042-*.md` | `Status:` → `ratified`; ratifying trustees + date; changelog row |
| `docs/knowledge-transfer/adr-index.md` | The three Section A rows flip; summary `drafted` 3→**0**, `ratified` 37→**40**; **Total unchanged at 153**. Row **and** reconciliation in the **same commit**, per `README.md` §7 |
| `_bmad-output/planning-artifacts/architecture.md` §3.11 | The one-line pointer in Read-first 1 (with ADR-0042 only) |
| `docs/launch-gate-inventory/inventory-roster.md` | Rows 24 (a), 32 (a), 33 (a) — evidence link to the ratifying decision |
| `.decision-log.md` | One entry, numbered from the head **at ruling time** (`2026-10-17-353` was the head when this sheet was prepared 2026-10-17; re-verify before writing — the actual ratification landed as Decision `2026-10-18-358`, minted after `-357`) |
| This sheet | Filed alongside the prior sheets |

**Nothing else.** No code, no migration, no story status. Ratifying ADR-0042 does **not** approve the architecture §3.4 amendment for
WhatsApp contact about a claim — that is its own item in the same pack (now for the claimant only — Decision `2026-10-18-356`).

**Quorum:** ≥2 trustees. **Prepared:** 2026-10-17, BigDev (Solo Builder).

*Revised 2026-10-18, before presentation (Story 6.37c Task 0.4, Decision `2026-10-18-355` decision 15): Read-first 1 gains the edge-bar
departure ADR-0042 records; Read-first 2 rewritten — it said the bound "holds under the Panel's ruling", true of Story 6.37b as built
but not under the follow-up ladder; this sheet's own "seven-field record" corrected to six of MSG91's fields plus our receive time (ADR-0042: "seven columns — six of MSG91's
fields").*
