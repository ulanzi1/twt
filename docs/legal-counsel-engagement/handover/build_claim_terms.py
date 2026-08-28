import sys; sys.path.insert(0, sys.argv[1])
import docxgen as D
B=[]; a=B.append
a(D.para('Tirhut Wing Trust', 'Title'))
a(D.para('Claim Terms — DRAFT v0.2', 'Subtitle'))
a(D.para('Trustee answers incorporated  |  28 August 2026  |  NOT FOR PUBLICATION', 'Subtitle'))
a(D.para(''))
a(D.para('**This is an unreviewed first draft prepared for counsel.** It has not been adopted, published, or shown to any nominee. Passages marked [TO SUPPLY] are gaps the trust must fill; passages marked [FOR COUNSEL] are specific questions put to counsel.'))
a(D.para('**Why this document exists.** On 28 August 2026 counsel supplied a clause — reproduced verbatim at clause 8 below — which binds the Nominee to disclosure "as a condition of submitting or pursuing a claim" and which refers to "the applicable Claim Terms". **No such instrument existed.** This draft is that instrument, assembled so the clause has somewhere to live. It was raised as question 9 of the Terms and Conditions v0.2 annex; **that question remains open**, and clause 8 may on counsel\'s advice belong here, in the Terms and Conditions, or in both.'))
a(D.para('**Provenance.** Every substantive clause is assembled from requirements the Trust has already committed to — principally FR-31 (dual nominee accounts), FR-37 (claim filing with bank details entered at claim time), FR-41 (human shepherd), FR-43A (denial appeal) — and from the Trustee Panel decision of 28 August 2026 recorded at 2026-08-28-160. **Clause 8 is counsel\'s own text, verbatim.** Apart from clause 8, nothing here is invented drafting, and no legal drafting is originated.'))
a(D.para('**Who this binds.** The Nominee — the person who files or pursues a claim following a Member\'s death. A Nominee **need not be a Member of the Trust** (FR-37). These terms are therefore the *only* contractual instrument that reaches them: the membership Terms and Conditions do not.'))

a(D.heading('Preamble', 1))
a(D.para('These Claim Terms govern the filing and pursuit of a claim following the death of a Member of Tirhut Wing Trust ("the Trust"). By submitting a claim, you accept them.'))
a(D.para('Trust registration particulars and registered address: [TO SUPPLY — as per the membership Terms and Conditions, clause "Preamble"]'))

a(D.heading('1. Definitions', 1))
a(D.bullet('**Nominee** — the person who files or pursues a claim in respect of a deceased Member. You need not be a Member of the Trust.'))
a(D.bullet('**Deceased Member** — the Member in respect of whose death the claim is made.'))
a(D.bullet('**Claim** — the request that the Trust facilitate contributions from Members to you, following the Deceased Member\'s death.'))
a(D.bullet('**Contribution** — a payment a Member makes **directly to you**, at the Trust\'s facilitation. The Trust is not a party to that payment.'))
a(D.bullet('**Cycle** — the bounded period during which Members are asked to contribute in respect of an approved claim.'))

a(D.heading('2. Who may file, and when', 1))
a(D.para('A claim may be filed by the Nominee, whether or not the Nominee is a Member of the Trust (FR-37). The Trust may also assist filing through its helpline where the Nominee cannot file directly.'))
a(D.para('Claims are typically brought some months after the death, not in its immediate aftermath.'))
a(D.para('[TO SUPPLY — the filing window: how long after death a claim may be brought, and whether any limitation applies. No deadline has been committed to.]'))

a(D.heading('3. What you must provide', 1))
a(D.para('To file a claim you provide (FR-37):'))
a(D.bullet('**Bank account #1** — account number, IFSC, and account holder name.'))
a(D.bullet('**Bank account #2** — account number, IFSC, and account holder name.'))
a(D.bullet('Optionally, a **UPI VPA** for each account.'))
a(D.bullet('A **death certificate** for the Deceased Member.'))
a(D.bullet('Such identity evidence as the Trust requires to verify your relationship to the Deceased Member.'))
a(D.para('**Both accounts must be your own.** The account holder name on each account must match your name as the Nominee. **You may not give the details of an account belonging to anyone else**, and the Trust may refuse or halt a claim where the names do not match.'))
a(D.para('You are responsible for the accuracy of the details you provide. Contributions are paid **directly by Members to the account you name**, so the Trust cannot recover a contribution sent to details you entered incorrectly.'))

a(D.heading('4. Two accounts, and the Member chooses', 1))
a(D.para('The two accounts you provide are **equal**. There is no primary and no secondary account, no default, and **no routing by the Trust** (FR-31). Each contributing Member chooses which of the two to pay. You may therefore receive contributions across both accounts, in proportions the Trust neither sets nor predicts.'))

a(D.heading('5. The Trust does not hold or pay your money', 1))
a(D.para('Contributions travel **directly from the contributing Member to you**. The Trust does not hold, receive, or disburse contribution money, and is not a party to any such payment. The Trust facilitates and records; it does not pay.'))
a(D.para('It follows that the Trust cannot issue a receipt for a contribution, cannot reverse one, and cannot compel one.'))

a(D.heading('6. What you receive is what was actually contributed', 1))
a(D.para('The Trust may indicate an expected amount. **That is an indication, not a promise.** If contributions actually made fall short of it, **you receive what was actually contributed.** The Trust does not make up the difference and does not undertake to. **There is no guaranteed sum.**'))

a(D.heading('7. If you are paid too much', 1))
a(D.para('If a Member reports having paid you more than they were asked to, the Trust will **facilitate** recovery by asking you to return the excess. The Trust **will not enforce** recovery and cannot compel repayment. Whether you return it is a matter between you and that Member.'))
a(D.para('[FOR COUNSEL] Please advise whether the Trust\'s position here is sustainable, and whether any obligation to return an overpayment arises independently of these terms.'))

a(D.heading('8. Public Disclosure of Nominee and Claim Information', 1))
a(D.para('_Text supplied by counsel, 28 August 2026. Reproduced verbatim._'))
a(D.para("As a condition of submitting or pursuing a claim, every Nominee shall accept the applicable Claim Terms and acknowledges that the Trust may make the Nominee's full name, complete bank-account and banking information, and other information provided by the Nominee in connection with the claim available to Members and/or the public, as the Trust deems necessary for the administration, verification, transparency, operation and smooth functioning of the Trust and its programmes."))
a(D.para("The Nominee expressly authorizes and agrees to such disclosure as a condition of making or pursuing the claim."))
a(D.para("The Trust shall determine, having regard to the purposes for which the information is required, what information is made available, to whom, and for how long."))

a(D.heading('9. What this means in practice', 1))
a(D.para('This clause states plainly what clause 8 authorises, so that it is not accepted without being understood. It reflects the Trustee Panel decision of 28 August 2026.'))
a(D.bullet('**While contributions are being collected for you, your full bank account details may be shown publicly** — including to people who are not Members. This is how a contributing Member confirms they are paying the right person.'))
a(D.bullet('**After the collection period closes, the Trust reduces what is shown.** A masking period is set by the Trust for each Pariwar. It may be immediate, a set number of days, or the Trust may mask permanently.'))
a(D.bullet('**Once masked, the public sees only the last four digits of the account**, together with the bank, branch and IFSC needed to recognise it. The full account number is not shown.'))
a(D.bullet('**The Trust holds your complete details internally** whether or not they are shown publicly.'))
a(D.bullet('The Trust intends to reduce public exposure over time as it grows.'))
a(D.para('[FOR COUNSEL] Clause 8 leaves the Trust to determine "what information is made available, to whom, and for how long", and clause 9 describes how the Trust presently intends to exercise that discretion. Please advise whether clause 9 should be binding rather than descriptive, and whether a Nominee should be told the masking period applicable to their own claim at the time they accept.'))

a(D.heading('10. Someone from the Trust will help you', 1))
a(D.para('The Trust assigns a person to each claim to guide you through it (FR-41). That person acts for the Trust. **They are not your legal or financial adviser**, and their help does not make the Trust responsible for decisions that are yours.'))

a(D.heading('11. If your claim is refused', 1))
a(D.para('The Trust may refuse a claim. If it does, you may **appeal internally**, and the appeal is decided within the Trust (FR-43A).'))
a(D.para('**These terms do not purport to exclude the jurisdiction of any court.**'))
a(D.para('[TO SUPPLY — the appeal window, who decides, and the external forum available afterwards. The external forum is an open launch-gate item on which counsel\'s advice is separately sought.]'))

a(D.heading('12. Your information and your rights over it', 1))
a(D.para('The Trust processes your personal data to operate the mutual-aid scheme and to administer your claim. At the time you file, the Trust records your consent to specified uses of information relating to the Deceased Member separately from clause 8.'))
a(D.para('**Retention.** The Trust retains claim and transaction records for the period required by law, including the record-retention periods applicable to transactional and account records. **A request to erase does not override a retention obligation the Trust is subject to**, and the Digital Personal Data Protection Act 2023 does not require erasure where retention is necessary for compliance with any law in force.'))
a(D.para('**Retention is not publication.** That the Trust must keep a record does **not** mean the record stays public. What is shown publicly, and for how long, is governed by clause 9; what the Trust holds internally is governed by this clause. The two are separate, and the masking in clause 9 applies regardless of how long the underlying record is retained.'))
a(D.para('[FOR COUNSEL] **A gap the Trust wishes to flag rather than paper over.** The Trust\'s data-subject rights — export, and erasure with anonymisation — were designed around **Members**. A Nominee is not necessarily a Member, but is plainly a data principal, and clause 8 authorises publishing their bank details. **The retention position above is settled**; what is not is: what **export and correction** rights the Nominee must have, and whether a Nominee may **withdraw the clause 8 authority** after a claim is settled — noting that withdrawal would bear on public display under clause 9, not on retention.'))

a(D.heading('13. Changes to these terms', 1))
a(D.para('These terms are versioned. The version you accept is recorded against your claim, with the date and time of acceptance, and is retained.'))
a(D.para('[FOR COUNSEL] Please confirm that a claim is governed by the version accepted at filing, and that a later version does not reach a claim already filed.'))

a(D.heading('14. Governing law and jurisdiction', 1))
a(D.para('[TO SUPPLY — governing law, seat, and dispute-resolution mechanism. The Trust is Bihar-registered; counsel to advise. Should align with the membership Terms and Conditions.]'))

a(D.heading('Annex — matters specifically referred to counsel', 1))
a(D.table([
  ['#', 'Clause', 'Question'],
  ['1', 'Whole', 'Does clause 8 belong in these Claim Terms, in the membership Terms and Conditions, or in both? This is question 9 of the T&C v0.2 annex, restated here.'],
  ['2', '7', 'Is the facilitate-but-not-enforce position on overpayment sustainable? Does an independent obligation to repay arise?'],
  ['3', '9', 'Should the practical-effect clause be binding rather than descriptive? Must a Nominee be told their applicable masking period at acceptance?'],
  ['4', '12', 'Retention is settled (see the clause). What remains: what EXPORT and CORRECTION rights must a non-Member Nominee have, and may the clause 8 authority be withdrawn after settlement — bearing on public display under clause 9, not on retention?'],
  ['5', '13', 'Confirm that a claim is governed by the version accepted at filing.'],
  ['6', '14', 'Governing law, seat and dispute-resolution mechanism; alignment with the membership Terms and Conditions.'],
  ['7', '8, 9', 'Both instruments turn on "as the Trust deems necessary". The Trust has resolved to align the final pre-launch wording to the DPDP Act 2023. Advise what that alignment requires here, given that clause 8 reaches bank details rather than a name.'],
  ['8', '3', 'Clause 3 requires the account holder name to match the Nominee. Advise what the Trust must do when they do not match — refuse the claim, require correction, or accept with evidence — and whether the Trust may pay out on a matching-name account without further identity proof.'],
], [500, 900, 7960]))
a(D.para(''))
a(D.heading('Annex B — the claim-time consent boxes: what is left for them to do', 2))
a(D.para('This is a **scoping question about the Trust\'s own consent screen**, put here because clause 8 changed the answer. It is not a question about the drafting of these terms.'))
a(D.para('At claim time the Trust presently records four consents. Following the Trustee Panel decision of 28 August 2026, each data class has its **own** basis, and the boxes no longer all carry the weight they were built to carry:'))
a(D.table([
  ['Box', 'What it was built to authorise', 'What now authorises that'],
  ['(a) claim-time data processing (required)', "The Trust's processing of personal data at claim time", 'Unaffected. Still required, still the basis.'],
  ['(b) Sahyog Vivran publication', "Contributor list and verifier names on the per-claim page", "Contributor names are OTHER MEMBERS' data → their own membership terms, clause 14. Verifier names are staff data. Nominee bank details → clause 8 of these terms."],
  ['(c) In Memoriam listing', "The deceased Member's appearance on the In Memoriam roll", "The deceased Member's own name and personal information → membership terms, clause 14."],
  ['(d) Sahyog Drive publication', "The deceased Member's name on the public Sahyog Drive", "Membership terms, clause 14. This box is being removed from the claim screen."],
], [1800, 3400, 4160]))
a(D.para('**The question.** If clause 14 of the membership terms carries the Member\'s own information, and clause 8 of these terms carries the Nominee\'s, then boxes (b) and (c) appear to retain only one genuine subject: **information belonging to the family** — for example a memorial text the family writes about the deceased. That is not the Member\'s own information and not the Nominee\'s, so neither clause reaches it.'))
a(D.para('[FOR COUNSEL] Three parts, in order:'))
a(D.bullet('**(i)** Is that reading right — that with clauses 14 and 8 in force, the residual subject of boxes (b) and (c) is family-authored and family-owned content only?'))
a(D.bullet('**(ii)** If so, should those boxes be **re-scoped and re-worded** to ask only about family-owned content, or **retired** in favour of a single family-content consent captured where that content is actually authored?'))
a(D.bullet('**(iii)** A box that is presented as controlling something it no longer controls is, in the Trust\'s view, worse than no box: it invites a family to believe they have a choice the terms have already settled. **Please confirm the Trust must not keep such a box** for continuity or familiarity.'))
a(D.para('⚠ The Trust is **not** asking counsel to design the screen. The Panel decision superseded a consent mechanism without ruling which boxes survive it, and the Trust would rather ask than assume.'))
a(D.para(''))
a(D.para('_Clause 8 supplied by counsel and reproduced verbatim; all other clauses assembled from the Trust\'s committed product requirements and the Trustee Panel decision of 28 August 2026. Unreviewed. Not adopted. Not published._', spacing_after=0))
D.build('docs/legal-counsel-engagement/handover/TWT-Claim-Terms-DRAFT-v0.2-for-counsel-review.docx', ''.join(B))
print('Claim Terms draft v0.2 written')
