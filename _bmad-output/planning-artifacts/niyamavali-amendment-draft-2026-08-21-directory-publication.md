# Niyamavali Amendment — DRAFT for Trustee Panel ratification

**Status:** ⏳ **DRAFTED, ⛔ NOT RATIFIED AND NOT APPLIED.** Per Decision `2026-08-21-144` clause 7(c)
the amendment is **authorised, not made**: BigDev drafts, the **Panel ratifies**, and the ratified
text is reproduced **verbatim in both locales** in its ratifying entry.
**Author:** BigDev, Solo Builder — 2026-08-21
**Authority:** Decision `2026-08-21-144` clauses 1, 2, 4, 5, 7(c). ⛔ Nothing here exceeds it except
**Amendment 1**, which is flagged below as requiring the Panel's specific attention.
**Target:** `docs/legal/niyamavali.md` and `docs/legal/niyamavali.hi.md` ⚠ — both currently
**UNTRACKED** (`git ls-files docs/legal` → empty). Per `144` clause 7(a) they are brought under
version control **before** this is applied.

> ⛔ **DO NOT APPLY THIS TO `docs/legal/` YET.** Applying it before ratification would make an
> unratified, unrecorded change to the Trust's legal corpus.

---

## ⭐ DOCTRINE — how a rulebook/build conflict is to be treated (Trustee Panel, 2026-08-21)

Recorded here because it governs how this draft is read, and ⛔ because it corrects a framing this
draft originally carried:

> **The Niyamavali is the Trust's public-facing rulebook. It is not the development specification and
> does not constrain implementation sequencing.** Where development approved by the Trustee Panel
> introduces a new member-facing policy, the Niyamavali **will be amended to accurately reflect that
> approved policy**. An apparent conflict between existing Niyamavali wording and newly ratified
> development behaviour is therefore a **required rulebook amendment** — ⛔ **not** an instruction to
> reinterpret the clause, and ⛔ **not** a blocker on the development.
>
> ⛔ **Existing clauses are never silently reinterpreted.** Where new development makes a
> public-facing clause obsolete, inconsistent or incomplete, it is **flagged** and the corresponding
> amendment is **drafted for ratification** — which is what Amendment 1 below is.

⇒ **Amendment 1 is therefore squarely WITHIN Decision `144`, not beyond it.** ⚠ An earlier revision of
this draft flagged it as exceeding the ruling and treated the code/rulebook mismatch as a reason to
**sequence ratification behind a code change**. ⛔ **Both framings were wrong and are withdrawn.**

---

## ⭐ THE INCONSISTENCY — identified, ⛔ not reinterpreted

Decision `144` authorised **adding** clauses. Drafting them found that one existing clause is
**inconsistent with the Trustee-approved directory policy**, in both locales:

> **§4.4 Transparency**, second sentence, verbatim:
> *"Public rendering of any personal information is **consent-gated** and never default opt-in."*
>
> Hindi: *"किसी भी व्यक्तिगत जानकारी का सार्वजनिक प्रदर्शन **सहमति-आधारित** है, कभी स्वतः (default opt-in) नहीं।"*

⛔ **The Member Directory is default, unconsented, and carries no member opt-out** — by Panel ruling
(`2026-08-19-135`/`-136`, re-affirmed at `144` cl.6). ⇒ Adding a Part 10 clause **without touching
§4.4** would leave the rulebook asserting two incompatible things.

⚠ **This is why Amendment 1 exists.** It is an **express exception** bringing the public rulebook into
alignment with the approved policy — ⛔ never a quiet reinterpretation
([[feedback_supersede_never_reinterpret]]). ⛔ **§4.4 is not a technical blocker and was not treated as
one**; the directory is unaffected by the wording it is being amended to align with.
⚠ **The Panel should still ratify Amendment 1 explicitly**, because it changes a clause `144` did not
name — ⛔ not because the amendment is in doubt.

⚠ **Related, and deliberately NOT drafted:** §6.5 and Part 10's existing consent bullet are **scoped
to named surfaces** (contributor list, *Sahyog Vivran*, *In Memoriam*) and are ⛔ **not** contradicted
by the directory. They are left **untouched**.

---

## Amendment 1 — §4.4 (Part 4), second sentence **AMENDED**

⚠ **Requires the Panel's specific attention — see above.**

### English — replace the second sentence of §4.4

> Public rendering of any personal information is **consent-gated** and never default opt-in, **save
> for the public member directory published under Part 10, which is rendered on the authority of the
> Trustee Panel and not on consent.** That exception is stated here **expressly**, and reaches no
> further than what Part 10 names.

### हिन्दी — §4.4 के दूसरे वाक्य के स्थान पर

> किसी भी व्यक्तिगत जानकारी का सार्वजनिक प्रदर्शन **सहमति-आधारित** है, कभी स्वतः (default opt-in) नहीं —
> **इसका अपवाद केवल भाग 10 के अंतर्गत प्रकाशित सार्वजनिक सदस्य-निर्देशिका है, जो सहमति पर नहीं, अपितु
> ट्रस्टी पैनल के प्राधिकार पर प्रदर्शित होती है।** यह अपवाद यहाँ **स्पष्ट रूप से** कहा गया है और भाग 10 में
> नामित सीमा से आगे नहीं जाता।

---

## Amendment 2 — Part 10 (Data Protection), **NEW** bullet

Carries all **three** disclosures `144` clause 4 requires: the **name**, the **waiting-period status**,
and — via Amendment 3 — the **de-listing**. Drafted as a bullet to match Part 10's existing shape
(⛔ no new subsection: Part 10 has none).

### English — append to Part 10

> - **The public member directory (FR-74 / FR-75).** The Trust publishes a **member directory on a
>   public page that requires no login**. For each listed member it shows the member's **name**, their
>   **district**, and a **status label**. The name shown is the member's **legal name as recorded at
>   KYC**. This rendering is made on the **authority of the Trustee Panel** and is **not
>   consent-gated**; the general rule in §4.4 does not apply to it, and **there is no member opt-out**.
>   This is stated plainly rather than left to be inferred.
>   - **The displayed form is a Pariwar-level setting, not a permanent fact.** A Pariwar may change
>     the form in which names are displayed — for example from *"Ramesh Kumar"* to *"Ramesh K."* — and
>     may change it back. Doing so **does not alter the member's KYC record**, which is unchanged and
>     separately protected. The change is a **governed act** and is recorded as one.
>   - **A member's internal lifecycle state is not published; a status label is.** A member serving a
>     waiting period is shown as **"Waiting period"**. The Trust's **internal lifecycle terms are not
>     published**, and the label is the only status information the directory carries.
>   - **Legal-counsel review.** This clause is subject to the review required by Part 11, which has
>     **not been completed**. Its presence here records **what the Trust does**; ⛔ it does not assert
>     that the review has occurred.

### हिन्दी — भाग 10 में जोड़ें

> - **सार्वजनिक सदस्य-निर्देशिका (FR-74 / FR-75)।** ट्रस्ट एक **सदस्य-निर्देशिका** ऐसे सार्वजनिक पृष्ठ पर
>   प्रकाशित करता है जिसके लिए **किसी लॉगिन की आवश्यकता नहीं** है। प्रत्येक सूचीबद्ध सदस्य के लिए उसमें सदस्य का
>   **नाम**, उसका **ज़िला**, और एक **स्थिति-लेबल** दिखाया जाता है। दिखाया जाने वाला नाम सदस्य का **KYC पर
>   अभिलिखित विधिक नाम** है। यह प्रदर्शन **ट्रस्टी पैनल के प्राधिकार** से किया जाता है और **सहमति-आधारित नहीं**
>   है; §4.4 का सामान्य नियम इस पर लागू नहीं होता, और **सदस्य के लिए कोई opt-out उपलब्ध नहीं है।** यह बात
>   संकेत पर नहीं छोड़ी गई, स्पष्ट शब्दों में कही गई है।
>   - **प्रदर्शित रूप एक परिवार-स्तरीय व्यवस्था है, कोई स्थायी तथ्य नहीं।** कोई परिवार नामों के प्रदर्शित रूप को
>     बदल सकता है — उदाहरणार्थ *"रमेश कुमार"* से *"रमेश कु."* — और उसे पुनः बदल भी सकता है। ऐसा करने से सदस्य
>     का **KYC अभिलेख नहीं बदलता**, जो अपरिवर्तित रहता है और पृथक् रूप से संरक्षित है। यह परिवर्तन एक **शासित
>     कार्य (governed act)** है और उसी रूप में अभिलिखित होता है।
>   - **सदस्य की आंतरिक जीवनचक्र-स्थिति प्रकाशित नहीं होती; एक स्थिति-लेबल प्रकाशित होता है।** प्रतीक्षा-अवधि में
>     चल रहा सदस्य **"प्रतीक्षा अवधि"** के रूप में दिखाया जाता है। ट्रस्ट के **आंतरिक जीवनचक्र-शब्द प्रकाशित नहीं
>     किए जाते**, और यही लेबल एकमात्र स्थिति-सूचना है जो निर्देशिका वहन करती है।
>   - **विधिक-परामर्श समीक्षा।** यह खंड भाग 11 द्वारा अपेक्षित समीक्षा के अधीन है, जो **अभी पूर्ण नहीं हुई है**।
>     यहाँ इसका समावेश यह अभिलिखित करता है कि **ट्रस्ट क्या करता है**; ⛔ यह दावा नहीं करता कि समीक्षा हो चुकी है।

---

## Amendment 3 — §8.4b (Part 8), **NEW** section

Placed **after §8.4a**, before §8.5. ⛔ **Deliberately not added as a row to §8.4a's table:** that
table states how suspension and termination differ **in kind at every dimension**, and here they do
**not** differ — both de-list. A row where the two columns match would break the table's own thesis.

### English — insert as §8.4b

> ### 8.4b Effect on public visibility
>
> A member who is **suspended** or **terminated** is **removed from the public member directory**
> (Part 10). The directory **does not state why a member is not listed**, and does not distinguish
> absence caused by a moderation act from absence caused by anything else.
>
> *This section states a consequence, not a ground. It confers no authority to suspend or terminate,
> and adds nothing to §8.2 or §8.5.*
>
> > **Inference is possible, and is not concealed.** A person who knows that someone is a member, and
> > who observes that they are not listed, may infer that a change in their membership status has
> > occurred. The Trust records that it has **considered this and has not adopted a further measure
> > against it**. What the Trust undertakes is narrower, and is stated exactly: **the directory
> > discloses no reason.**

### हिन्दी — §8.4b के रूप में जोड़ें

> ### 8.4b सार्वजनिक दृश्यता पर प्रभाव
>
> **निलंबित** अथवा **समाप्त** सदस्य को **सार्वजनिक सदस्य-निर्देशिका (भाग 10) से हटा दिया जाता है।** निर्देशिका
> यह **नहीं बताती कि कोई सदस्य सूचीबद्ध क्यों नहीं है**, और मॉडरेशन-कार्य से हुई अनुपस्थिति को किसी अन्य कारण से
> हुई अनुपस्थिति से पृथक् नहीं दर्शाती।
>
> *यह खंड एक परिणाम कहता है, कोई आधार नहीं। यह निलंबन या समाप्ति का कोई प्राधिकार प्रदान नहीं करता, और §8.2
> अथवा §8.5 में कुछ नहीं जोड़ता।*
>
> > **अनुमान संभव है, और उसे छिपाया नहीं गया है।** जो व्यक्ति यह जानता है कि कोई व्यक्ति सदस्य है, और यह देखता
> > है कि वह सूचीबद्ध नहीं है, वह यह अनुमान लगा सकता है कि उसकी सदस्यता-स्थिति में कोई परिवर्तन हुआ है। ट्रस्ट
> > अभिलिखित करता है कि उसने **इस पर विचार किया है और इसके विरुद्ध कोई अतिरिक्त उपाय नहीं अपनाया है।** ट्रस्ट
> > जो वचन देता है वह इससे संकीर्ण है और ठीक-ठीक कहा गया है: **निर्देशिका कोई कारण प्रकट नहीं करती।**

---

## ⛔ What this draft deliberately does NOT say

- ⛔ **Nothing about re-listing after a successful appeal.** Decision `144` clause 2 ruled the §8.8
  sub-question **NO**, and clause 3 records the re-listing as **resolved via explicit deferral** —
  the rulebook stays silent and `144` is its only durable record.
  ⚠ **The cost, stated once and not re-argued:** §8.4b tells a member the sanction **de-lists** them
  and does not tell them that winning an appeal **restores** the listing — the rulebook carries the
  harm without the remedy. That is the Panel's ruling as given; ⛔ it is recorded, not reopened.
- ⛔ **No claim of DPDPA compliance.** Part 11's counsel review is named as **not completed**
  (`2026-08-19-136` cl.5 remains open). ⛔ A governance record is not a statutory notice.
- ⛔ **No amendment to §6.5, §8.2, §8.5, §8.8 or Part 10's existing consent bullet.**
- ⛔ **No mention of the internal term `lock-in`** — per `144` clause 4 the value is non-public; only
  the label *"Waiting period"* appears.

## ⚠ Consequential items, ⛔ not part of this text

1. **Appendix A (Rule Index)** carries a quick-reference row per rule family. ⚠ It has **no row** for
   directory publication. Whether to add one is a **presentational** call — raised so it is not
   discovered later as an omission.
2. **`144` clause 8's wire-vocabulary change** is the implementation item that brings the code into
   line with the approved policy Amendment 2 states — ⛔ today `handlers.ts:128` still emits the
   literal `lock-in` over the public JSON contract.
   ⛔ **This does NOT gate ratification.** Per the doctrine above, the rulebook states the **approved
   policy**; where the code has not yet caught up, the code is the item that moves. Amendment 2 is
   therefore drafted to state the policy **as ruled**, ⛔ without hedging its wording to match a
   transient implementation state.
3. The **`docs/legal/` tracking story** (`144` cl.7(a)) precedes **application** of the ratified text
   — ⛔ a records-management precondition, ⛔ not a policy one.

---

## Ratification template

```
Decision 2026-08-__-___ : Niyamavali amendment — public member directory (ratifying 2026-08-21-144 cl.7(c))

A1  §4.4 express exception          : RATIFIED / AMENDED / REFUSED  — reasoning:
A2  Part 10 directory bullet         : RATIFIED / AMENDED / REFUSED  — reasoning:
A3  §8.4b public visibility          : RATIFIED / AMENDED / REFUSED  — reasoning:
    Appendix A row                   : ADD / DO NOT ADD

Ratified text reproduced VERBATIM, BOTH LOCALES, in this entry.
Ratifying trustees:                    , 
Date:
```

---

*Drafted 2026-08-21 against `docs/legal/niyamavali.md` (380 lines) and `.hi.md` (377 lines).*
⏳ **AWAITING RATIFICATION. ⛔ NOT APPLIED.**
