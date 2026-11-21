# Question for counsel — sending a member's name and mobile number to a partner when the member asks: the footing, the agreement with the partner, payment, and how long things are kept

**From:** BigDev (Solo Builder), for the Trust · **Prepared:** 2026-11-21, **REVISED 2026-11-21** before sending (questions 10 and 11 added
on BigDev's direction) · **Status:** WRITTEN, NOT yet sent. Nothing here is recorded as
asked until BigDev sends it.
**Written from:** Story 12.5 (the transport that carries a member's registered interest to a partner), Task 0.5. The Trustee Panel is
asked seven questions beside this one (`trustee-panel-routing-note-2026-11-21-12-5-partner-lead-data.md`, also not sent).
**Roster:** Row 54 (`partner-lead-handoff-live`), the go-live row for this feature. Your answer is its leg (b); nothing reaches a
partner before it.

---

## What is already established (so it is not asked again)

- **Nothing below is live.** No member uses the system, no partner offer has been shown, and nothing that sends details to a partner is
  built.
- **The privacy policy is a draft.** It has not been published and no member has accepted it. It will be published at go-live, so it
  can still be changed first.
- **As drafted, the policy does not cover this.** Its section on who the Trust shares with (§6) lists five groups and partners are not
  among them. The same section commits that the Trust does not sell personal data. Its retention table (§8) has no line for what is
  described here. §4.1 covers taking a consent back, and §7 covers where data is processed.
- **The trust deed exists in two drafts** that treat partner and commercial arrangements differently, and which one governs has not
  been recorded. We have not relied on either. If your answers depend on it, please say so.

## The situation, in brief

The app will show a member offers from partners — at first a home loan, a term insurance plan and a health camp. A member who is
interested opens the offer, is shown exactly which of their details would be sent, and agrees **for that one offer**. The Trust then
sends the partner one message containing the member's **full name, mobile number, district and preferred language**. Nothing else is
sent: no date of birth, no identity number, nothing about membership standing, contributions, claims, nominees, workplace or health.

The Trust keeps its own encrypted copy of those four details until the send is done; the plan is to remove it 30 days after delivery,
or at once if the send is stopped. Separately, the Trust keeps a permanent record that the member registered interest in that offer.
That record has no name or number in it, but it is tied to the member, and the way the Trust keeps its records means it is never
removed — not even when a former member's data is erased.

Before each attempt to send, the system checks again, and does not send if the member has taken the agreement back, has left or been
terminated, has had their data erased, or has been reported dead, or if the Trust has withdrawn the offer. Once the details are
delivered they cannot be called back. If the partner's system does not confirm receipt, the same message is sent again, up to seven
times over about a day and a half.

The Trust may be paid by partners. The terms are not agreed. They could be per lead delivered, or only when a member takes up the
partner's product.

**A second route is being considered instead of, or beside, the first.** The Trust would send nothing. The member would tap the
offer in the Trust's app and the partner's own form would open in the phone's own browser — not embedded in the Trust's app, so the
Trust cannot see what the member types there. The member would type their details and have their number checked by the partner in
its own way. The Trust would pass the partner only a code that says which offer the visit came from. The Trust would want to know
where members give up on that form.

## The questions

1. **The footing and the notice.** Is the member's own agreement, given for one named offer after being shown the four details, a
   sufficient footing under the Digital Personal Data Protection Act for the Trust to send them to that partner? What must the notice
   on that form say? Must the privacy policy name each partner, or is naming the kind of partner enough?
2. **What the partner is, and the agreement.** Once it has the details, is the partner responsible for them in its own right, or is it
   acting for the Trust? What are the minimum terms the Trust's agreement with a partner must carry before the first details are sent?
   We expect at least: use only for the offer the member asked about; no passing on; keeping the details secure; deleting on request;
   telling the Trust promptly of any breach; treating a repeated delivery of the same lead as one; and where the details are processed.
   Please correct or add to that list.
3. **Payment.** If a partner pays the Trust for each lead delivered, is the Trust selling personal data — in law, and against the
   promise in its own draft policy? Is a commission paid only when a member takes up the partner's product different? If either is
   permitted, what must members be told?
4. **How long things are kept.**
   (a) Is 30 days a sound period for the Trust's own copy of what it sent? What is the shortest and the longest you would advise?
   (b) May the Trust keep, permanently and even after erasure, the bare fact that a member once registered interest in an offer, with
   no contact details attached?
   (c) The Trustee Panel has ruled that once a member's death is reported, a request to erase that member's record is refused and the
   record is kept, and it left the retention period to you. Does that reach the Trust's copy of the four details from a partner
   offer, or may that copy be removed on the ordinary schedule?
5. **After delivery.** If a member takes the agreement back, or has their data erased, after the details were delivered: must the
   Trust tell the partner, and must it require the partner to delete? Is telling the partner "this member withdrew" itself something
   the Trust needs a footing for?
6. **Taking the agreement back.** The Act asks that withdrawing be as easy as agreeing. A screen for it will be built with the screen
   that shows the offers, and no offer goes live before it. Is it acceptable to tell members plainly that taking the agreement back
   stops only a send that has not happened yet?
7. **What an offer implies.** Does interest in a health camp, a loan or an insurance plan say enough about a member's health or money
   that the Trust owes more care with these leads than with an ordinary contact detail? Does your answer to 4 (b) change for a
   health-camp offer?
8. **Where the partner processes.** A partner's systems could be anywhere. Must the agreement require that the details stay in India,
   and does the draft policy's statement about where data is processed need changing?
9. **Breach.** If a partner suffers a breach involving details the Trust sent, what must the Trust itself do, and how quickly? (The
   Trust's own breach duties are the subject of its separate question of 2026-11-01.)
10. **How far the Trust's responsibility runs.** The Trust's view is that when a member, shown exactly what will go and to whom, tells
    the Trust to share, the Trust is carrying out the member's own decision — as one service does when a person signs in to another
    with it — and that from then on the partner is responsible under its own terms. Is that right in law? For what does the Trust
    stay answerable: the sharing itself, its choice of partner, anything the partner does? May the notice say that the partner will
    handle the details under the partner's terms, and may it go further and say the Trust is not responsible for misuse — or would
    that second statement be ineffective, or unwise to make?
11. **The second route — the partner's own form.**
    (a) If the Trust sends nothing about the member and passes only a code naming the offer, does the Trust need any footing at all,
    and what must it tell members before they leave its app for the partner's page?
    (b) To learn where members give up, may the Trust receive from the partner (i) totals for each step of the form, with no member
    identified, and (ii) step-by-step progress for each member, matched by the code? What would (ii) need — from the member, and in
    the agreement with the partner?
    (c) May the Trust be paid when a member who came this way takes up the partner's product?

## What we need back

A short written answer to each question that is sent. It will be recorded as a decision, and it answers the counsel leg of the go-live
row for this feature. Your answers to 1, 3, 4, 5, 10 and 11 will also be put before the Trustee Panel beside its own questions. If any answer
depends on facts we have not given — the partner terms, which draft of the deed governs, or the wording of the consent form, none of
which exists yet — please say which.
