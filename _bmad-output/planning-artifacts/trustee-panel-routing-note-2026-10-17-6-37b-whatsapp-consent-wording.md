# Trustee Panel routing note — the claimant's agreement to be contacted: adding WhatsApp and calls, and the nominees

> **§0 gate — passed (2026-10-17).** You answered (Decision `2026-10-17-351`, answer 2) that a claimant agrees at filing to be contacted
> by SMS, WhatsApp, call or any later means. The agreement a claimant ticks today says less than that, and the rule you ratified for
> WhatsApp consent asks for an explicit agreement. What a person is asked to agree to, and the legal basis for contacting them, is
> yours — with counsel.
> **What is ours, and not asked:** the Hindi translation of whatever wording you choose (it goes through its human review), and how the
> agreement is stored.
> Routed by BigDev from Story 6.37b (2026-10-17), at the Panel's invitation (*"Any followup question, let the panel know"*).

---

> ## PANEL RULING — 2026-10-17 (Dhiraj Rahul + Kalpana Bharti, relayed by BigDev) — Decision `2026-10-17-352`
>
> *"Q1 - B*
> *Q2 - WhatsApp and calls go to the claimant and nominee both but The claimant's agreement doesn't cover the nominees. Instead it's
> permissible under DPDPA. Let me copy paste it for you.*
> *Legitimate Interest / Legal Duty (Section 7 exemptions): If an external claimant submits a claim (e.g., insurance claim, deceased
> estate settlement, banking claim), processing the nominee's personal data (phone number/email) to reach out is permissible if it is
> necessary to enforce legal rights, prevent fraud, or fulfill contractual/regulatory obligations."*
>
> **Recorded, for counsel before WhatsApp or calls to a nominee go live** (`-352`): the quoted basis against the Act's text (our
> understanding: no general legitimate-interest ground; Section 7's listed legitimate uses; Section 17(1)(a) for legal claims); Meta's
> own opt-in rule for WhatsApp; and an amendment to architecture §3.4 / ADR-0029. Everything below is kept **unedited**, as the
> questions were put.

---

# The question

**In one sentence:** the claim form asks the claimant to agree that the Trust may contact the nominees and the claimant *"by text
message and by post"* — should it now also name WhatsApp and phone calls, and can the claimant's agreement cover the nominees too?

**Why it cannot be decided without you:** you told us the claimant's agreement covers SMS, WhatsApp and calls. The words a claimant
actually sees today mention only texts and post, so a WhatsApp message sent on that agreement would rest on something they were never
asked. Changing what people are asked to agree to, and deciding whose agreement counts for whom, is yours, with counsel.

## The one fact that decides it

**The agreement as built reads: *"I agree that the Trust may contact the nominees and the claimant named here, by text message and by
post, about this claim."*** It does not mention WhatsApp, phone calls, or other means. And the rule you ratified for WhatsApp says a
person's consent must be explicit — given by them, not assumed and not bundled into other terms.

---

# What you are choosing between

**Question 1 — the wording.**

| | Option | What changes for a person | Cost |
|---|---|---|---|
| **A** | **Name the channels:** *"…by text message, WhatsApp, phone call and post, about this claim."* | The claimant agrees, knowingly, to WhatsApp and calls; the delivery ladder's WhatsApp step can then be used for them. | Any new channel in future needs its own wording change and a fresh agreement. |
| **B** | **Name the channels and add *"or any other means of communication that may appear in future."*** | As A, and later channels are covered in advance. | An agreement to channels nobody has named yet may not count as explicit consent — counsel is likely to object, and it could weaken the agreement for WhatsApp too. |
| **C** | **A separate tick-box for WhatsApp,** next to the existing agreement. | The claimant chooses WhatsApp on its own; leaving it unticked still allows texts, calls and post. | One more tick on the form; a claimant who does not tick it gets no WhatsApp message, so the ladder's WhatsApp step is skipped for them. |

**Question 2 — the nominees.**

| | Option | What changes for a person | Cost |
|---|---|---|---|
| **A** | **WhatsApp and calls go to the claimant only;** nominees are contacted by text and post, as today. | Nominees are not messaged on WhatsApp on the strength of someone else's agreement. | The ladder's WhatsApp step does not apply to a nominee; they get the SMS steps and the letter. |
| **B** | **The claimant's agreement covers the nominees too.** | Nominees can receive WhatsApp messages and calls. | The nominee never agreed themselves; under the data-protection law each person gives their own consent, so counsel is likely to say this is not valid. |

**Our reading:** wording **A** and nominees **A** — **because** they make the agreement say plainly what the Trust will do, keep each
person's consent their own, and are the versions counsel is most likely to accept. If you prefer the claimant to opt in to WhatsApp
separately, **C** is the strongest form of consent, at the cost of fewer WhatsApp messages.

---

# What is at stake right now

- **Live today:** nothing. The app is not in production.
- **Blocked:** only the WhatsApp step of the delivery ladder. Until this is settled no WhatsApp message is sent, and the ladder moves on
  to the second SMS at 48 hours; everything else you ruled goes ahead.
- **If nothing is decided:** the ladder works without its WhatsApp step.

---

# How much to trust this note

- **Earlier versions of this question:** none. It follows from your answer 2 of 2026-10-17.
- **Corrected in this note:** none yet.
- **Still uncertain:** counsel's view on all three wording options and on the nominees — not yet asked; whether Meta's WhatsApp rules
  accept a consent given on a claim form (Meta asks that a person agree to receive WhatsApp messages from the business by name).

---

# In plain English

You told us a claimant agrees, when filing, to be contacted by SMS, WhatsApp or phone. The form actually says *"by text message and by
post"* — nothing about WhatsApp or calls — and your own rule for WhatsApp asks for an explicit agreement.

We suggest changing the wording to *"by text message, WhatsApp, phone call and post, about this claim"*, without *"any other means that
may appear in future"*, which counsel would likely not accept as a real agreement. And we suggest that WhatsApp and calls go only to the
claimant who agreed, not to the nominees, who have not agreed themselves. Both should be checked with counsel before the new wording is
used.

If this section and the evidence below ever disagree, the EVIDENCE is the record.

---
---

# EVIDENCE — for the record, not for the meeting

## E1 — What is already ratified, verbatim

> **`2026-10-17-351` answer 2 (Trustee-ratified):** *"We think this is already answered. Let us reiterate that when a claimant files a
> claim, he/she will be asked to agree to T&C, where it's mentioned that we will contact claimant over SMS/WhatsApp/Call or any other
> means of communication that may appear in future."*

> **Architecture §3.4 — the opt-in origination requirement (ratified with ADR-0029, 2026-07-08):** *"WA opt-in state may only
> transition to ACTIVE via a user-initiated interaction (the user-sent WhatsApp message above) or an explicit affirmative consent
> capture in-app (recorded with timestamp + the UI context). Passive defaults, pre-checked boxes, bundled consent, or inference from
> other settings are not valid opt-in origins. This protects against compliance drift under Meta policy and DPDPA consent semantics."*

## E2 — What is NOT ratified

No ruling sets the wording of the claim form's agreement to include WhatsApp or calls, or says whether the claimant's agreement is the
nominees' consent. `-351` records these as not covered.

## E3 — What the system does today

- The agreement text, English: `packages/i18n/locales/en/claim.json`, `contact.agreement` — *"I agree that the Trust may contact the
  nominees and the claimant named here, by text message and by post, about this claim."* Hindi: `packages/i18n/locales/hi/claim.json`,
  the same key — *"…टेक्स्ट संदेश और डाक द्वारा संपर्क कर सकता है।"* (by text message and by post).
- The agreement is recorded per claim: staff see whether it is on file, withdrawn or missing
  (`apps/admin/src/modules/helpline-claims/i18n-en.ts`, `helpline.contact.agreement.*`).
- Correction reminders go to the nominee on the contact record and to the claimant (`docs/launch-gate-inventory/dlt-template-requests-6-19.md`).
- ⚠ INFERENCE: Meta's WhatsApp Business policy expects an opt-in that names the business and WhatsApp; whether a claim-form agreement
  satisfies it is for counsel / Meta's terms, not settled here.

## E4 — Commands to re-verify every claim

```
grep -n '^### Decision .*-351:' .decision-log.md
grep -n 'contact claimant over SMS/WhatsApp/Call' .decision-log.md
grep -n '"contact.agreement"' packages/i18n/locales/en/claim.json packages/i18n/locales/hi/claim.json
grep -n 'explicit affirmative consent' _bmad-output/planning-artifacts/architecture.md
grep -n 'bundled' _bmad-output/planning-artifacts/architecture.md
grep -n "helpline.contact.agreement.live" apps/admin/src/modules/helpline-claims/i18n-en.ts
grep -n 'nominee person on the contact record' docs/launch-gate-inventory/dlt-template-requests-6-19.md
```

Run 2026-10-17 before handing the note to BigDev: all seven commands returned at least one line.
