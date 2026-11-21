# Question for counsel — the fraud register: what the Trust may collect, check, keep and delete about the people who file death claims

**From:** BigDev (Solo Builder), for the Trust · **Prepared:** 2026-11-02 (Story 6.22b Task 0.3, DL1 — accepted by BigDev 2026-11-02;
the counsel gate in Decision `2026-09-21-238`) · **Status:** WRITTEN 2026-11-02; **SENT by BigDev
2026-11-21**, with the two notes of 2026-11-21 below. Awaiting counsel's answer.
**Roster:** Row 47 (`fraud-register-finding-live`) leg (f) — *"row `6-22b`'s counsel question (`-238` (a)–(c)) WRITTEN and SENT"*.
Writing this file meets the WRITTEN half; the leg stays open until it is sent. Questions 1–3 are the three points the Panel's
2026-09-21 ruling named for counsel ((a), (b), (c)); questions 4–7 follow from the same rulings; question 8 is a separate retention
item owed since 2026-09-25, put here so that one letter carries every retention question.

**Please read the note of 2026-11-21 at the end first.** The Trust's Panel has decided five things since this was written; they change
the design described below and questions 3, 4, 6 and 7. The questions themselves are unchanged and still need answering.

---

## The situation, in brief

**Nothing below is live, and nothing in it is built.** No identity number is collected from anyone, nothing is checked, no one is
barred and nothing is deleted. The Trust's own rules forbid building any of it until your answer is recorded.

The Trust is a mutual-aid trust of teachers: when a member dies, the other members contribute and the money is paid to the member's
nominees. A family member (the *claimant*) files a death claim. The claimant and the person paid are often **not** members of the Trust.

The Trust's Panel ruled on 2026-09-21 that the Trust will keep a **register of people found to have taken part in a false death claim**,
and bar them from filing again. What it ruled, in plain words:

- **Only the guilty are kept.** Identity documents collected on a claim are deleted when the claim closes with no finding of fraud.
  Only records where an investigation found fraud are kept.
- **The bar reaches the people who filed** — the claimant and the person paid. Members are asked nothing new about their nominees.
- **Only an exact identifier may bar someone automatically** — the PAN, or an Aadhaar-based token. A match on name, date of birth and
  father's name is held for a person to check; it never bars on its own.
- **The bar is for life and cannot be appealed**; only a senior administrator may lift it.
- **PAN and Aadhaar of the claimant and the person paid are to be collected on the claim form** as that identifier.
- **The legal basis the Trust intends to rely on** is the DPDP Act's exemption for the prevention, detection and investigation of an
  offence (section 17(1)(c)).

Today the claim form collects the claimant's name, mobile number and address, and the bank details of the person to be paid. It
collects **no** PAN, Aadhaar number, date of birth or father's name for either of them. The Trust knows its own members by their mobile
number; for some members it also holds the last four digits of their Aadhaar number, as returned by DigiLocker during sign-up.

**The design we expect to build, if you advise it is lawful** (questions 1–7 are asked against it):

1. **PAN only.** No Aadhaar number in any form — no number, no photocopy, no hash — unless you identify a lawful route (question 2).
   Because the Panel's ruling asks for Aadhaar, dropping it is being put to the Panel as its own question; it is not yet decided.
2. **Whose PAN:** the person who files the claim and each person to be paid. Members are asked nothing new.
3. **Checked** against the person's name through a commercial PAN-verification service (a data processor).
4. **Kept** encrypted, with a one-way keyed fingerprint of the PAN used only to spot an exact repeat across the whole Trust.
5. **Name, date of birth and father's name** of the claimant and the person paid are collected for the human check. Father's name is
   new information about people who are usually not members.
6. **Deleted** when a claim closes with no finding of fraud; **kept** only where a finding of fraud stands.

**Our own understanding, from public sources — not legal advice; please correct anything we have wrong** (sources listed at the end):

- The official bulk PAN-verification service (Protean / NSDL) is open to listed regulated and government bodies and large tax deductors;
  no listed category appears to fit a trust like ours. Commercial services offer PAN checks with a name-match score.
- A UIDAI token is issued only to an authentication user agency or sub-agency, as part of an authentication response. DigiLocker gives
  us only the last four digits. UIDAI's 2025 data-vault guidance says a hash of the Aadhaar number should not be used as a reference
  key.
- The Aadhaar (Sharing of Information) Regulations require a lawful purpose, notice and consent for collecting an Aadhaar number, and
  forbid keeping it longer than necessary for the purpose stated at the time.
- Roughly three in four adults in India hold a PAN by count (an upper estimate); poorer and rural families are likely to hold one less
  often. For a person with no PAN, tax law uses a signed declaration (Form 60).
- Most of the DPDP Act's duties, including section 8 and the section 17 exemptions, take effect on 13 May 2027.
- Bank and insurance fraud registries in India give the person notice and a chance to reply before listing them, and debarment is for a
  fixed period (RBI's 2024 fraud-risk directions, following the Supreme Court's 2023 judgment in *State Bank of India v. Rajesh
  Agarwal*; IRDAI's 2025 fraud-monitoring guidelines).

## The questions

1. **Keeping the register.** May the Trust keep, **indefinitely**, the PAN, name, date of birth and father's name of a person — usually
   not a member — whom its own investigation found to have taken part in a false death claim, together with the finding itself? Is
   section 17(1)(c) of the DPDP Act a sufficient basis for a private trust to do so, or is there another? If not indefinitely, for how
   long? And on what basis may the Trust do this before the Act's main provisions take effect in May 2027?
2. **An Aadhaar-based identifier.** Is our understanding right that a UIDAI token is available only to an authentication user agency,
   and that the last four digits we receive from DigiLocker cannot serve as an exact identifier? Is there **any** lawful route for a
   trust like ours to hold an exact, stable Aadhaar-based identifier — for example as a sub-agency under the 2025 good-governance
   rules, or through offline verification?
3. **If not, what Aadhaar duties remain.** If the answer to question 2 is no, we expect to propose to the Trust's Panel that no Aadhaar
   number is collected in any form (the Panel's ruling asks for Aadhaar, so the decision is the Panel's). Would collecting an Aadhaar
   number **without** a token create duties the Trust could not meet — the data-vault rules or the Sharing Regulations? And is any such
   duty already on us for the last four digits members give at sign-up?
4. **PAN at filing.** On what basis may the Trust **ask** the person filing a death claim, and the person to be paid, for their PAN, check
   it, and keep it? May the Trust **require** it, given that a meaningful share of poorer families hold none? Is a signed declaration (a
   statement like Form 60) an acceptable alternative for someone with no PAN? What must the person be told when it is collected — the
   purpose, whether it is mandatory, and what the alternatives are?
5. **Checking the PAN.** May the Trust check a PAN through a commercial verification service? What must the contract with that service
   say — its duties as a processor, how long the service itself may keep the data, and where the data is held? Would a PAN document
   fetched from DigiLocker with the person's consent be a better route?
6. **The bar itself.** The Panel ruled that a person found to have committed fraud on a death claim is barred from filing again,
   **for life**, with **no appeal** (only a senior administrator may lift the bar). For a person who is **not a member**, found guilty by
   the Trust's own staff, is that lawful as ruled? Must the person first be told what is alleged and be given a chance to reply? May the
   bar be indefinite, or must it be for a fixed period?
7. **Deleting at a clean close.** The Panel ruled that identity information collected on a claim is deleted when the claim closes with
   no finding of fraud. Does any law require the Trust to **keep** a paid person's PAN or identity details — for income tax, the Trust's
   accounts, or audit — and if so, for how long?
8. **Death certificates.** Separately, the Panel ruled (2026-09-25) that every death certificate a family sends, and the details read
   from it, is kept for as long as the Trust keeps claim records — it is not an identity document and is not deleted when a claim
   closes. On what basis may the Trust keep death certificates and those details for that period, including when the person asks for
   their data to be erased, and when the person who died or the person who sent it is not a member?

## What we need back

A short written answer to each. It will be recorded as a decision. What each answer unblocks:

- **Questions 1–3** answer the three points the Panel's ruling named for counsel. Until they are answered, nothing of the register may
  be built.
- **Question 4** decides whether the claim form may ask for a PAN at all, whether it may be required, and what the form must say.
- **Question 5** decides how the PAN is checked and whether a verification vendor may be contracted.
- **Question 6** may send the bar back to the Panel, if notice, a reply or a time limit is required.
- **Question 7** decides when a paid claim's identity details may be deleted.
- **Question 8** is a go-live condition for the claims system's handling of death certificates.

If any answer depends on facts we have not given, please say which.

## Sources for "our own understanding" (each read 2026-11-02)

- Protean Online PAN Verification — overview: https://tinpan.proteantech.in/services/online-pan-verification/pan-verification-overview.html ;
  FAQ: https://tinpan.proteantech.in/faqs/online-pan-verification/faq-pan-verify-general.html
- Income Tax Department, "How to verify PAN": https://www.incometax.gov.in/iec/foportal/help/how-to-verify-pan
- A commercial PAN-check response (name-match score, Aadhaar-seeding status): https://www.cashfree.com/docs/reference/pan-verification
- UIDAI Circular 1 of 2018 (Virtual ID, UID token, limited KYC):
  https://uidai.gov.in/images/46Circular_for_Implementation_of_Virtual_ID_UID_Token_and_Limited_KYC_0001_compressed.pdf
- UIDAI Circular 14 of 2025: https://www.uidai.gov.in/images/Circular-No.14_of-2025.pdf ; Aadhaar Data Vault FAQ v10 (2025-11-03):
  https://www.uidai.gov.in/images/FAQs_Aadhaar_Data_Vault_03112025_v10.pdf
- Aadhaar (Sharing of Information) Regulations 2016:
  https://www.uidai.gov.in/images/The_Aadhaar_Sharing_of_information_regulation_2016.pdf
- PAN coverage — individual PANs against the whole population (April 2024):
  https://www.businesstoday.in/personal-finance/news/story/almost-50-population-have-pan-gap-between-male-female-closing-income-tax-dept-data-427084-2024-04-26 ;
  electors, January 2025: https://www.deccanherald.com/india/india-now-has-991-crore-voters-election-commission-3368788 (the "three in
  four adults" figure is our own division of the two, an upper estimate)
- DPDP Rules commencement (G.S.R. 843(E), 13 November 2025): https://consentos.in/learn/dpdp-rules-notification-status/
- *State Bank of India v. Rajesh Agarwal* (Supreme Court, 27 March 2023):
  https://api.sci.gov.in/supremecourt/2021/1710/1710_2021_1_1501_43127_Judgement_27-Mar-2023.pdf
- RBI Master Directions on Fraud Risk Management (July 2024), as reproduced at:
  https://elplaw.in/wp-content/uploads/2024/07/RBI-Revised-Master-Directions-on-Fraud-Risk-Management-July-2024.pdf
- IRDAI Fraud Monitoring Framework Guidelines (9 October 2025), summary:
  https://www.jsalaw.com/wp-content/uploads/2025/10/JSA-Prism-Insurance-October-2025-Fraud-Monitoring-Framework.Final_.pdf

*Not reached on 2026-11-02:* the Income Tax Department's own PAN statistics (the server refused the request), the RBI's own copy of the
directions (it redirected), any Gazette notice after September 2026. Re-check the DPDP commencement date before sending.

---

**Note, 2026-11-21 — the DPDP commencement date re-checked before sending (nothing in the questions changes).** Two current secondary
sources still give **13 May 2027** for sections 3 to 17 of the Act (so sections 8 and 17) and the bulk of the Rules:
https://dpdpa.dcomply.in/updates/ (last updated 15 November 2026) and https://consentos.in/learn/dpdp-rules-notification-status/
(reviewed 20 November 2026). MeitY's January 2026 proposal to shorten the 18-month window to 12 months was for Significant Data
Fiduciaries only, and remains a proposal that was never gazetted. The Removal of Difficulties Order, S.O. 5458(E) of 5 October 2026 (Gazette 6 October 2026),
corrects wording in sections 9(1) and 10(2)(c)(ii) and changes no date. Since 13 November 2026 the Consent Manager provisions (section
6(9), Rule 4) are in force; that does not touch these questions. The Gazette texts themselves were not read — this re-check rests on
the two secondary sources, as the 2 November check did.

---

**Note, 2026-11-21 — what the Trust's Panel has decided since this question was written (please read this first).** On 21 November the
Panel answered the policy questions this letter refers to. Where an answer changes the design described above, the Panel's answer is
the Trust's direction, subject to your advice:

1. **Aadhaar is kept, not dropped.** Design item 1 above ("PAN only") is no longer the plan. The Panel chose to keep its ruling that
   PAN **and** Aadhaar are collected, and to wait until there is a lawful way for the Trust to hold an Aadhaar-based identifier. So
   **question 2** (is there any lawful route) now decides whether the Aadhaar half can ever be built, and **question 3** now reads:
   *what would a lawful route require of the Trust (the data-vault rules, the Sharing Regulations), and is any such duty already on us
   for the last four digits members give at sign-up?* Whether the PAN half may be built first, while Aadhaar waits, is a further
   question now with the Panel.
2. **A PAN is required to file a claim and to be paid.** The Panel chose this over a signed declaration. A family with no PAN is told
   to contact the Trust's helpline, which directs them to a PAN centre to apply for one. **Question 4** therefore asks: *may the Trust
   require a PAN in this way, and what must the person be told?* If you advise that it may not be required, or that an alternative
   such as a declaration must be offered, the Panel has said that comes back to it.
3. **A PAN that cannot be confirmed does not stop the claim.** The claim goes on, and the person approving it must see the doubt and
   record a reason. (This bears on question 5.)
4. **Every deletion waits for a period you set.** Design item 6 above said details are deleted "when a claim closes with no finding of
   fraud". The Panel decided instead that identity details are deleted **after a period set by counsel** in each case: for a claim
   closed with no finding of fraud; for a claim that was paid; and for a claim that was refused — without taking away the family's
   right to appeal, which today has no time limit for most refusals. **Question 7** therefore asks for **three**
   periods: *how long may (or must) the Trust keep these details for a closed claim, a paid claim, and a refused claim?*
5. **A nominee is barred only if an investigation finds that they took part.** Being named as the nominee of a member found guilty is
   not enough. (This bears on question 6: the bar reaches a nominee or claimant only after a finding about that person.)

Nothing has been built on any of these; the Trust's rules still forbid building the register until your answers are recorded.

**Further note, 2026-11-21 (later the same day).** The Panel has since answered two more points that bear on this letter. (a) **The PAN
half is built first**, once your answers allow it; the Aadhaar half is added only if there is a lawful route (question 2). (b) **Staff
notes from an investigation that found a member innocent are deleted after a period you set, like the family's details**; the finding
itself is kept. So for **question 7**, please also advise how long the Trust may keep those notes, and whether the finding may be kept
longer than the notes.
