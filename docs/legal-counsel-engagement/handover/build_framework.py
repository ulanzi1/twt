import sys; sys.path.insert(0, sys.argv[1])
import docxgen as D

B = []
a = B.append
a(D.para('Tirhut Wing Trust', 'Title'))
a(D.para('Legal Counsel Engagement — Framework Handover Pack', 'Subtitle'))
a(D.para('Prepared for the Trustee Panel and Adv. Mohit Agrawal  |  24 August 2026', 'Subtitle'))
a(D.para(''))
a(D.para('This pack states the engagement framework as it currently stands on the record, what has been verified, and what remains outstanding. It is a summary for handover; the authoritative records are the trust\'s decision log and the Story 0.13 framework documents cited throughout.'))

a(D.heading('1. Nature of the engagement', 1))
a(D.para('The engagement is **concurrent review, not post-hoc audit**. Counsel\'s findings are intended to shape specifications while they are being drafted, rather than to certify them after the fact. This is a structural property of the framework, not a preference.'))
a(D.table([
  ['Item', 'Position'],
  ['Counsel', 'Adv. Mohit Agrawal (roster id lc-1)'],
  ['Bar Council enrolment', 'BR/869/2014, Bihar State Bar Council'],
  ['Engaged since', '21 June 2026'],
  ['Term', '12 months, concurrent review across the term'],
  ['Retainer', 'Rs 2,00,000 per year, activated 21 June 2026'],
  ['Per-artefact SLA', '5–10 business days (2–3 business days if expedited at surge pricing)'],
  ['Scope charter', 'Accepted by counsel, 21 June 2026'],
  ['Multiple counsel', 'Permitted if practice-area scope exceeds one counsel\'s competence'],
], [2600, 6760]))

a(D.heading('2. Qualification — verified 24 August 2026', 1))
a(D.para('All six mandatory criteria are satisfied. Four of the six are disqualifying if unmet.'))
a(D.table([
  ['Criterion', 'Status', 'Evidence'],
  ['Bar Council of India enrolment', 'Met', 'BR/869/2014, Bihar'],
  ['DPDPA practice', 'Met', 'Attested; corroborated by the 21 June 2026 opinion'],
  ['Indian Trust Act 1882 practice', 'Met', 'Attested'],
  ['Concurrent-review availability', 'Met', 'Attested across the term'],
  ['Professional indemnity insurance', 'Met', 'New India Assurance, Rs 50 lakh, expires 1 August 2027'],
  ['Conflict of interest', 'Met', 'No prior engagement with TSCT or any operating mutual-aid trust'],
], [3200, 1400, 4760]))
a(D.para('**Note on the insurance figure.** The engagement letter template sets no numeric floor for professional-indemnity cover — it requires only that cover be adequate for the engagement scope. Rs 50 lakh is therefore recorded as attested, not as assessed adequate; no assessment has been made and the framework offers no threshold against which to make one. The policy expires 1 August 2027, which spans a twelve-month term from 21 June 2026 but not an extension.'))

a(D.heading('3. Review scope', 1))
a(D.para('Counsel accepted the review-scope charter on 21 June 2026. It comprises:'))
a(D.bullet('**Five primary scope items** — trust-posture copy reviewed during drafting; DPDPA consent flow design; denial-appeal procedural fairness; the account state machine transition table; and the dual-path claim authority-to-file evidentiary specification.'))
a(D.bullet('**A thirteen-row regulatory surface review** — every cash flow the trust handles, with applicable law and the trust\'s stated posture for each.'))
a(D.bullet('**Architecture decision-record slots** reserved for counsel-dependent choices.'))
a(D.bullet('**Pre-launch checkpoints** — Phase-0 closure, terms version-pin lock, first-claim pre-launch, and the public-launch gate.'))

a(D.heading('4. Opinions given to date', 1))
a(D.table([
  ['Date', 'Subject', 'Form', 'Effect'],
  ['21 June 2026', 'Edge / WAF data-residency and sub-processor posture', 'Written', 'Cleared as designed. Closed launch-gate Row 3.'],
  ['24 August 2026', 'Publication of members\' full legal names on an unauthenticated public page', 'Written, counsel-signed', 'Cleared for the member directory. Authorised its publication.'],
], [1500, 3600, 1700, 2560]))
a(D.para('**Both opinions carry a scope fence, and counsel has adopted it.** An opinion covers the posture as it was described to counsel. A material change — a new data class, a new subject population, or a new recipient — re-opens the review. Neither opinion is a standing waiver.'))
a(D.para('**One matter is held for counsel\'s reconsideration.** The 24 August opinion was initially recorded as extending to three further public surfaces that have not yet been built: two publishing deceased members and their families, and one publishing nominee bank account details. The basis given was member consent through the trust\'s terms of service. Those subjects are not parties to the terms — the families and the nominees never accepted them — and the trust has separately ruled that consent of that kind does not by itself suffice for those surfaces. The extension is therefore held pending counsel\'s revisit. Nothing waits on it: none of the three surfaces has been built.'))

a(D.heading('5. Custody of the executed instruments', 1))
a(D.para('The engagement letter, the non-disclosure agreement and the conflict-of-interest disclosure were executed on 21 June 2026 and are presently held in a trustee\'s personal cloud vault.'))
a(D.para('**This is recorded as interim.** The framework requires secure, non-repository, trustee-accessible storage. A personal vault is secure but is controlled by one person, which is the opposite of trust-accessible: were that trustee unavailable, the trust could not reach its own legal instruments.'))
a(D.para('**The destination is the trust\'s credential-escrow arrangement** — physical sealed envelopes held in the joint bank safe deposit and at trustee residences, as ratified by the Trustee Panel on 5 June 2026. An inventory entry has been created for these instruments. They are not yet sealed; sealing awaits the trust\'s wider escrow execution.'))
a(D.para('**Two further copies are contemplated and neither yet exists:** a counsel-side archive copy, and a working reference copy in trust-controlled shared storage. A sealed vault copy does not serve routine reference to the service levels, the fee schedule or the termination provisions.'))

a(D.heading('6. Outstanding items', 1))
a(D.table([
  ['#', 'Item', 'Owner', 'Note'],
  ['1', 'Terms and conditions draft — submission to counsel', 'Trust', '**Overdue.** Due 5 July 2026 (two weeks from signature). A draft accompanies this pack.'],
  ['2', 'Counsel\'s revisit of the three unbuilt public surfaces', 'Counsel', 'Best taken after item 1 is with counsel — the terms are the basis cited.'],
  ['3', 'Counsel-side archive path for the executed instruments', 'Counsel', 'Framework expects a copy on each side.'],
  ['4', 'Working reference copy in trust-controlled storage', 'Trust', 'Distinct from the sealed escrow copy.'],
  ['5', 'Escrow sealing of the executed instruments', 'Trust', 'Awaits the trust\'s wider escrow execution.'],
], [500, 3500, 1200, 4160]))

a(D.heading('7. A note on the record', 1))
a(D.para('Between June and August 2026 the trust\'s own framework documents did not record this engagement. The consequence was that a number of internal records stated that counsel was not engaged, and at least one decision was taken on that footing. The record has since been corrected; the engagement is now entered, marked as reconstructed from the decision log rather than captured at the time.'))
a(D.para('This is stated plainly because it bears on item 1 above. The obligation to submit the terms draft within two weeks of signature was not tracked, because the signature date itself was not recorded. It is recorded now.'))

a(D.para(''))
a(D.para('_Prepared by the Solo Builder for the Trustee Panel. Sources: the trust\'s decision log, the Story 0.13 engagement framework, and the launch-gate inventory._', spacing_after=0))

D.build('docs/legal-counsel-engagement/handover/TWT-Counsel-Engagement-Framework-2026-08-24.docx', ''.join(B))
print('framework pack written')
