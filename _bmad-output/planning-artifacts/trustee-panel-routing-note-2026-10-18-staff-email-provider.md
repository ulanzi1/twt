# Trustee Panel routing note — which company sends the Trust's staff emails

> **§0 gate — passed (BigDev, 2026-10-18).** You ratified ADR-0040 on 2026-10-18 (Decision `2026-10-18-358`). That ADR says it *"records
> which provider is enabled in production (the Panel's choice)"* — but the consent sheet asked you only to ratify, so the choice was never
> put to you. It is yours because the provider receives the Pariwar Admins' email addresses (personal data) and processes them on the
> Trust's behalf, and the Trust's stated posture is to keep personal data in India — which company holds staff data is a data-handling
> choice, not an engineering one.
> **What is ours, and not asked:** how the email is built and sent (plain text, no tracking, one email per admin per refusal), and the
> technical set-up of either account.
> Routed by BigDev (2026-10-18), owed from the 2026-10-18 sitting. Sent and answered 2026-10-18.

---

> ## PANEL RULING — 2026-10-18 (Dhiraj Rahul + Kalpana Bharti, relayed by BigDev) — Decision `2026-10-18-361`
>
> *"email provider / We start with Zoho, until AWS SES approves us."*
>
> Neither A nor B alone: **B first, then A** — Zoho ZeptoMail from go-live, AWS SES once Amazon approves the Trust for sending.
> Everything below is kept **unedited**, as the question was put.
>
> ⚠ *Dated correction, 2026-10-18 (Story 6.37c code review round 2) — about the decision entry, ⛔ the ruling:* `-361`'s **NOT
> RATIFIED** reading (iii) says *"the ZeptoMail adapter stays built and set up after the switch, as the fallback ADR-0040 already
> keeps."* ADR-0040 keeps no set-up fallback: it says *"the other stays built and unset"* (ADR-0040, Decision section; roster Row 24's
> notes say the same). So "set up" after the switch is our reading alone, ⛔ supported by the ADR — keeping ZeptoMail configured after
> SES goes live would need ADR-0040 amended. The Panel's ruling (Zoho first, SES once approved) is unaffected.

---

# The question

**In one sentence:** the Trust's first email — telling every Pariwar Admin that a claim was refused on suspicion and to open the list (no
names in it) — can be sent through Amazon's email service in Mumbai or through Zoho's email service in India; which should it use?

**Why it cannot be decided without you:** the company chosen holds the Pariwar Admins' email addresses and handles every staff email on
the Trust's behalf. Both are built; the system sends nothing until one is chosen.

## The one fact that decides it

**Both keep the data in India and both are built; they differ in how much new set-up the Trust takes on and how well the system can
check the account before sending.** The Trust's system runs on Google's cloud. Amazon's service means opening an Amazon cloud account
as well; Zoho's means a Zoho account. Amazon's service lets the system check the account is healthy before it sends; Zoho's offers no
such check.

---

# What you are choosing between

| | Option | What changes for staff | Cost |
|---|---|---|---|
| **A** | **Amazon (AWS SES, Mumbai region).** | Pariwar Admins get the email from Amazon's service. | The Trust opens and looks after an Amazon cloud account beside its Google one (an access key kept in the Trust's secret store); Amazon must first approve the account for real sending. |
| **B** | **Zoho (ZeptoMail, India data centre).** | Pariwar Admins get the email from Zoho's service. | A Zoho account; its region is fixed when it is opened, so it must be opened as an Indian account (checked at set-up). The system cannot check the account's health before sending — a problem shows only after a send fails. Zoho renamed the service (Zoho CPaaS) in September 2026. |
| **C** | **Decide later.** | No staff email is sent until you choose (the system holds them; nothing is sent). | Pariwar Admins are not emailed about a suspicion refusal; they see it only when they open the list. |

**Our reading:** **A** — **because** Amazon documents its Mumbai region, and the system can check the account before it sends,
so a fault is caught before an admin misses an email; the extra account is a one-time set-up. B is a sound choice if the Trust would
rather not open an Amazon account.

---

# What is at stake right now

- **Live today:** nothing. No staff email has been sent; the system is not in production.
- **Blocked:** the staff email's go-live only (roster Row 24). Nothing else waits on this.
- **If nothing is decided:** no staff email is sent (as option C).

---

# How much to trust this note

- **Earlier versions of this question:** none — the consent sheet for ADR-0040 asked only Ratify / Defer / Reject, which is why this is
  owed now.
- **Corrected in this note:** none.
- **Still uncertain:** whether delivering to each admin's own mailbox (Gmail or others, wherever hosted) is acceptable — that is with
  counsel either way (roster Row 24 (c)), and the choice here does not change it.

---

# In plain English

When a claim is refused because a nominee change looks suspicious, the system emails every Pariwar Admin to say so and to open the list.
The email names nobody. Two companies can send it, both from India: Amazon or Zoho. We built both so you could choose. We suggest Amazon,
because the system can check the account is working before it sends; Zoho is fine too if you would rather not add an Amazon account.
Until you choose, no staff email goes out. If this summary and the evidence below ever disagree, the evidence is the record.

---
---

# EVIDENCE — for the record, not for the meeting

## E1 — What is already ratified, verbatim

> **ADR-0040** (ratified 2026-10-18, Decision `2026-10-18-358`): *"BigDev chose to build BOTH (`-299` §3) so that go-live picks ONE by
> config — **this ADR, when ratified, records which provider is enabled in production** (the Panel's choice; ⭐ recommended: SES, the
> documented India region); the other stays built and unset."*
>
> **Roster Row 24 (a):** *"ADR-0040 ratified — the provider enabled in production, and the amendment of ADR-0009 §5 admitting Q1 / Q2"*
> — recorded PART MET (the provider not chosen).

## E2 — What is NOT ratified

- Which provider (this question).
- "An India-region provider" is our reading of the architecture's posture line (*"Data residency: PII in India…"*; *"final scope per
  counsel"*), not a ratified rule (ADR-0040, Residency F12).

## E3 — What the system does today

- Both adapters are built and tested (Story 6.25); `STAFF_EMAIL_PROVIDER` selects one; unset ⇒ `config:provider_unset` — the sweep holds
  and sends nothing (`apps/jobs/src/scheduler/staff-email-config.ts`).
- SES: a pre-flight `GetAccount` check (sending enabled, production access) runs before sending. ZeptoMail: no pre-flight
  endpoint usable with the send key (recorded as a no-op in ADR-0040).

## E4 — Commands to re-verify every claim

```
grep -n "records which provider is" docs/adr/ADR-0040-staff-email-transport.md
grep -n "ap-south-1\|cpaas.zoho.in\|GetAccount\|pre-flight endpoint" docs/adr/ADR-0040-staff-email-transport.md
grep -n "the provider enabled in production" docs/launch-gate-inventory/inventory-roster.md
grep -rn "STAFF_EMAIL_PROVIDER" apps/jobs/src | head
```
