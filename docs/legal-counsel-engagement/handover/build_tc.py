import sys; sys.path.insert(0, sys.argv[1])
import docxgen as D
B=[]; a=B.append
a(D.para('Tirhut Wing Trust', 'Title'))
a(D.para('Terms and Conditions of Membership — DRAFT v0.2', 'Subtitle'))
a(D.para('Counsel-supplied disclosure clauses inserted  |  28 August 2026  |  NOT FOR PUBLICATION', 'Subtitle'))
a(D.para(''))
a(D.para('**This is an unreviewed draft.** It has not been adopted, published, or shown to any member. It is the priority-1 artefact under the review-scope charter. Passages marked [TO SUPPLY] are gaps the trust must fill; passages marked [FOR COUNSEL] are specific questions put to counsel.'))
a(D.para('**Provenance.** Every substantive clause below is assembled from requirements the trust has already committed to in its product requirements document, **with the exception of clauses 14 and 15**, whose text was **supplied by counsel (Adv. Mohit Agrawal) on 28 August 2026** and is reproduced **verbatim**. The italicised phrasings in clauses 3, 4, 10, 11 and 12 are **required verbatim** by requirement FR-94 and must survive review in that form unless counsel advises otherwise — several are inherited from the precedent trust, TSCT. Apart from clauses 14 and 15, nothing here is invented drafting.'))
a(D.para('**v0.2 change log.** v0.1 (24 August 2026) was submitted to counsel and is retained unaltered as the record of what was handed over. v0.2 inserts counsel-supplied clauses **14** and **15**, renumbers the former clauses 14–16 to **16–18**, and amends clause 13 for consistency (see the note in that clause). **The rest of the draft remains unreviewed** — the sixteen original clauses have not been returned on, and the seven questions in the Annex are unanswered.'))

a(D.heading('Preamble', 1))
a(D.para('*"Today\'s support becomes tomorrow\'s strength — आज का सहयोग कल का सहारा."*'))
a(D.para('Tirhut Wing Trust ("the Trust") facilitates mutual aid among its members. These terms govern membership. By registering, you accept them.'))
a(D.para('Trust registration particulars, registered address, and the registration numbers required by law: [TO SUPPLY — Indian Trust Act registration, 12A/12AB, GST where applicable]'))

a(D.heading('1. Definitions', 1))
a(D.bullet('**Member** — a person whose registration the Trust has accepted and who is not suspended or terminated.'))
a(D.bullet('**Pariwar** — the local unit within which a member is enrolled.'))
a(D.bullet('**Vyawastha Shulk** — the one-time administrative fee of Rs 110 payable at registration.'))
a(D.bullet('**Contribution** — a payment a member makes directly to a nominee of a deceased member, at the Trust\'s facilitation.'))
a(D.bullet('**Niyamavali** — the Trust\'s rulebook, as amended from time to time. These terms are tied to a specific version of it.'))

a(D.heading('2. What the Trust is, and what it is not', 1))
a(D.para('*"Facilitator, not financial intermediary, not guarantor."*'))
a(D.para('The Trust introduces members to one another and routes information. **It does not hold, receive, or disburse contribution money.** Contributions travel directly from the contributing member to the nominee. The Trust is not a party to that payment.'))
a(D.para('*"Commitment is purely ethical."*'))
a(D.para('[FOR COUNSEL] The Trust does hold the Rs 110 fee, and that fee is mandatory. The Trust\'s own analysis is that this creates consideration and makes the member–Trust relationship an enforceable contract, notwithstanding the ethical framing of the contribution obligation. Please confirm or correct that reading, and advise whether the two statements above can sit together as drafted.'))

a(D.heading('3. Membership', 1))
a(D.para('*"Registration alone does not constitute legal membership."*'))
a(D.para('Registration begins a process. Membership follows acceptance by the Trust and payment of the Vyawastha Shulk. The Trust may decline a registration.'))

a(D.heading('4. The fee, and withdrawal', 1))
a(D.para('The Vyawastha Shulk of Rs 110 is payable once, at registration, and is **not refundable**. A member who withdraws voluntarily forfeits it. No part of it is returned on withdrawal, suspension, or termination.'))
a(D.para('[FOR COUNSEL] Please advise on the enforceability of a non-refundable mandatory fee under the Consumer Protection Act 2019, and on what disclosure at the point of payment is required.'))

a(D.heading('5. Contributions', 1))
a(D.para('When a member of your Pariwar dies, you may be asked to contribute to that member\'s nominee. The Trust will tell you whom to pay and how much. **You pay the nominee directly.**'))
a(D.para('The Trust records that you have contributed. It issues a **Contribution Note** as the record of that fact.'))

a(D.heading('6. Contribution Notes are not receipts', 1))
a(D.para('A Contribution Note records that a contribution was made. It is **not a receipt, and not an invoice**, and must not be described or relied upon as either. The Trust did not receive your money; it is not in a position to receipt it.'))
a(D.para('[FOR COUNSEL] This distinction carries tax and evidentiary consequences for the member. Please advise on the wording, and on whether any statutory notice must accompany the Note.'))

a(D.heading('7. When a cycle is under-funded', 1))
a(D.para('If the contributions actually received for a nominee fall short of the indicative amount, **the nominee receives what was actually contributed.** The Trust does not top up the difference, and does not undertake to. There is no guaranteed sum.'))

a(D.heading('8. Over-payment', 1))
a(D.para('If you pay more than you were asked to, you may report it. The Trust will **facilitate** recovery from the nominee by asking. **It will not enforce recovery**, and cannot compel repayment.'))

a(D.heading('9. Payment mismatches', 1))
a(D.para('Where a payment reference does not reconcile, the Trust may ask you to upload a payment screenshot. This is requested **only on mismatch**, and not as a routine condition of contributing.'))

a(D.heading('10. Communications', 1))
a(D.para('*"Missed information is the member\'s responsibility — official communications are delivered via the channels listed in this clause."*'))
a(D.para('The **official channel is the in-app surface.** Telegram and WhatsApp Business are mirrors offered for convenience and are not official. It is the member\'s responsibility to check the in-app surface.'))

a(D.heading('11. Disqualification from office', 1))
a(D.para('*"A member holding an office-bearer position in a parallel teacher organization is disqualified for the duration of that role. Membership in a parallel teacher organization is permitted; office-bearing is not."*'))

a(D.heading('12. Grievances', 1))
a(D.para('*"Internal resolution via the appeal flow is the primary path for grievance; judicial challenge is not contractually barred, but core-team discretion is preserved."*'))
a(D.para('A member whose claim is denied may appeal internally. The appeal is decided within the Trust. **These terms do not purport to exclude the jurisdiction of any court.**'))
a(D.para('[FOR COUNSEL] The precedent trust\'s terms stated that no judicial challenge was permitted. The Trust has deliberately dropped that phrasing, on the view that Indian courts routinely set aside contractual ouster of jurisdiction and that the mandatory fee makes the relationship enforceable in any event. Please confirm that dropping it is correct, and that the substitute above is safe.'))

a(D.heading('13. Your data', 1))
a(D.para('The Trust processes your personal data to operate the mutual-aid scheme. You may **export your data**, and you may **ask to be forgotten** — on which the Trust soft-deletes your profile and anonymises your past contributions. **No fee is refunded** on erasure.'))
a(D.para('Disclosure of your own information is authorised by clause 14 below. Where the Trust publishes information belonging to someone other than you — your family\'s, or a nominee\'s — that disclosure rests on **their** authority, not yours: a nominee\'s on clause 15, a family\'s on the consent that family gives.'))
a(D.para('[FOR COUNSEL] **Amended 28 August 2026, and the amendment is flagged rather than made silently.** v0.1 read: *"Consent for each distinct publication of your information is recorded separately."* That sentence described a **per-subject consent gate** which the Trustee Panel superseded on 28 August 2026 as a governance **mechanism** (decision 2026-08-28-160, clause 3) when it adopted your clause 14. Leaving it would have contradicted clause 14 inside the same document. **Please confirm the replacement wording, and confirm that clause 13 and clause 14 now sit together.**'))
a(D.para('[FOR COUNSEL] This is also scope item (b) of the charter — the consent-flow design — and is reviewed separately. This clause states only what the terms must say; the flow itself is a separate submission.'))

a(D.heading('14. Public Disclosure of Member Information', 1))
a(D.para('_Text supplied by counsel, 28 August 2026. Reproduced verbatim._'))
a(D.para("As a condition of membership, every Member shall accept these Terms and Conditions and acknowledges that the Trust may, during the Member's membership and, where applicable, after the Member's death, make the Member's full name and other personal information provided to or held by the Trust available to Members and/or the public, as the Trust deems necessary for the establishment, administration, verification, transparency, operation and smooth functioning of the Trust and its programmes."))
a(D.para("The Member expressly authorizes and agrees to such disclosure as a term of membership. This authority applies to the Member's own personal information and continues, to the extent applicable, after the Member's death."))
a(D.para("The Trust shall determine, having regard to the purposes for which the information is required, what information is made available, to whom, and for how long."))

a(D.heading('15. Public Disclosure of Nominee and Claim Information', 1))
a(D.para('_Text supplied by counsel, 28 August 2026. Reproduced verbatim._'))
a(D.para("As a condition of submitting or pursuing a claim, every Nominee shall accept the applicable Claim Terms and acknowledges that the Trust may make the Nominee's full name, complete bank-account and banking information, and other information provided by the Nominee in connection with the claim available to Members and/or the public, as the Trust deems necessary for the administration, verification, transparency, operation and smooth functioning of the Trust and its programmes."))
a(D.para("The Nominee expressly authorizes and agrees to such disclosure as a condition of making or pursuing the claim."))
a(D.para("The Trust shall determine, having regard to the purposes for which the information is required, what information is made available, to whom, and for how long."))
a(D.para('[FOR COUNSEL] This clause binds the **Nominee**, who accepts the **Claim Terms** — a separate instrument from these Terms and Conditions, which bind the Member. The Claim Terms do not yet exist as a drafted document. **Please confirm whether clause 15 belongs here, in the Claim Terms, or in both**, and identify what else the Claim Terms must contain.'))

a(D.heading('16. The Trust\'s ledger', 1))
a(D.para('The Trust\'s internal financial ledger is **not published**. Members receive information about their own contributions and their own Pariwar\'s cycles.'))

a(D.heading('17. Amendment', 1))
a(D.para('These terms are tied to a version of the Niyamavali. When either changes, a new version is issued and members are asked to accept it. **Every version is retained**, and the Trust can recover which version any member accepted, and when.'))

a(D.heading('18. Governing law and jurisdiction', 1))
a(D.para('[TO SUPPLY — governing law, seat, and dispute-resolution mechanism. The Trust is Bihar-registered; counsel to advise.]'))

a(D.heading('Annex — matters specifically referred to counsel', 1))
a(D.para('Questions 1–7 were put in v0.1 on 24 August 2026 and **remain unanswered**. Questions 8–11 are new in v0.2 and arise from the insertion of counsel\'s clauses 14 and 15.'))
a(D.table([
  ['#', 'Clause', 'Question'],
  ['1', '2', 'Do the facilitator statement and the mandatory fee sit together? Is the enforceable-contract reading correct?'],
  ['2', '4', 'Enforceability of a non-refundable mandatory fee under the Consumer Protection Act 2019; required disclosure.'],
  ['3', '6', 'Tax and evidentiary consequences of a Contribution Note that is expressly not a receipt.'],
  ['4', '12', 'Is dropping the no-judicial-challenge phrasing correct, and is the substitute safe?'],
  ['5', '13', 'Interaction with the separate consent-flow submission.'],
  ['6', '18', 'Governing law, seat and dispute-resolution mechanism.'],
  ['7', 'Whole', 'Do the seven verbatim phrasings required by FR-94 survive review in that form? Where not, what replaces them?'],
  ['8', '13', 'NEW. Clause 13 was amended to remove a per-subject-consent sentence that contradicted clause 14. Confirm the replacement wording, and that 13 and 14 now sit together.'],
  ['9', '15', 'NEW. Clause 15 binds the Nominee via the Claim Terms — a separate instrument that does not yet exist as a drafted document. Does clause 15 belong here, in the Claim Terms, or in both? What else must the Claim Terms contain?'],
  ['10', '14, 15', 'NEW. Both clauses turn on "as the Trust deems necessary". The Trust has resolved to proceed on this wording and to align the final pre-launch version to the DPDP Act 2023. Advise what that alignment requires, given the Act\'s requirement that consent be specific and purpose-limited.'],
  ['11', '14', 'NEW. Clause 14 authorises disclosure of the Member\'s own information after death. It does not address information belonging to the deceased\'s family. Confirm that family-owned information requires the family\'s own consent and is outside clause 14.'],
], [500, 1000, 7860]))
a(D.para(''))
a(D.para('_Clauses 14 and 15 supplied by counsel and reproduced verbatim; all other clauses assembled from the Trust\'s committed product requirements. Unreviewed. Not adopted. Not published._', spacing_after=0))
D.build('docs/legal-counsel-engagement/handover/TWT-Terms-and-Conditions-DRAFT-v0.2-for-counsel-review.docx', ''.join(B))
print('T&C draft v0.2 written')
