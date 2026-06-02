# Question Bank — P0-2c VI/Low-Vision Member Accessibility Validation

> **This is a PROMPT LIST, NOT a script.** Researcher uses prompts flexibly as conversation starters between surface walkthroughs.
>
> **Anti-leading discipline:** §1-§4 prompts MUST NOT pre-frame TWT-specific UX categories (no "UX-DR", "Pattern 4", "dignified-validation" framing). Participant describes lived AT-walkthrough experience **in their own words**.
>
> **Anti-leading carve-out for §5-§6-§7** per Story 0.9 P-05 review-patch precedent: §5 cross-cutting + §6 UX-DR clause-evaluation + §7 AT-specific researcher-led prompts necessarily introduce TWT-specific content, but they are **opt-in mid- or late-session** per ethics-protocol §3.7. §1-§4 anti-leading discipline still applies to the rest of the session.
>
> **AT-configuration-honored discipline applies throughout:** researcher does NOT prescribe, configure, modify, or troubleshoot participant's AT setup per ethics-protocol §3.8.

## Preamble: Hindi-primary prompts

All prompts authored in Hindi with embedded English glossary for technical terms (`screen reader`, `voice control`, `magnification`, `prototype`, `WCAG`, `UX-DR`, `surface`). Researcher may rephrase per participant's dialect (Hindi-Bhojpuri blend permitted per ethics-protocol §3.2).

---

## §1 — Where they succeeded (दिमेंशन 1)

**Anti-leading note:** Do NOT prompt for TWT-specific UX terms. Participant describes success in their own words.

1. *"Aapne abhi jin screens ko explore kiya, unmein se kaunsa wala sabse aasaani se kaam kiya — jahaan aapko lag raha tha 'haan, yeh samajh aaya'?"*
   (Of the screens you explored, which worked most easily — where you felt "yes, I understand this"?)
2. *"AT (screen reader / magnification / voice control) ke saath aap kahaan smoothly aage badh paaye? Koi specific moment yaad hai?"*
   (Where did you move forward smoothly with AT? Any specific moment you remember?)
3. *"Kya aisi koi action ya button thi jisne aapki AT ke saath bilkul waisi prakriya ki jaisi aapko expectation thi?"*
   (Was there any action or button that behaved exactly the way you expected with your AT?)
4. *"Kya kabhi aisa laga ki TWT ka design AT-users ko 'samajhta' hai? Agar haan, kahaan?"*
   (Did it ever feel like TWT's design "understands" AT users? If yes, where?)
5. *"Jab aapne pehli baar screen open ki — kya koi cheez immediately samajh aayi? Jaise heading, ya navigation, ya kuch aur?"*
   (When you first opened a screen — did anything immediately make sense? Like heading, navigation, or something else?)
6. *"Kaunsa surface (signup / My Pool / Yogdaan Bahi) sabse comfortable laga AT ke saath? Kyon?"*
   (Which surface felt most comfortable with AT? Why?)

## §2 — Where they got stuck (दिमेंशन 2)

**Anti-leading note:** Do NOT prompt for UX-DR-specific clause categories. Participant describes stuck-points in their own words.

1. *"Aapne kahaan stuck feel kiya — kahaan AT ka response saaf nahin tha, ya aap aage badh nahin paaye?"*
   (Where did you feel stuck — where AT's response wasn't clear, or you couldn't move forward?)
2. *"Kya koi screen ya button aisa tha jahaan AT bilkul kuch nahin bolta tha, ya kuch ulta-pulta bolta tha?"*
   (Was there any screen or button where AT said nothing at all, or something garbled?)
3. *"Stuck honne ke baad aapne kya try kiya? Aur kya help mil sakti thi recovery mein?"*
   (After getting stuck, what did you try? And what could have helped recovery?)
4. *"Kya aisi koi action thi jise aap chahte the lekin AT us tak le hi nahin gaya?"*
   (Was there any action you wanted but AT didn't take you to it at all?)
5. *"Kya aisa kuch tha jahaan AT kuch bola lekin aapko samajh nahin aaya kya karna hai — Hindi galat thi, ya speed galat thi, ya kuch aur?"*
   (Was there anything where AT said something but you didn't understand what to do — wrong Hindi, wrong speed, or something else?)
6. *"Magnification ke saath kya kabhi text ya button reachable nahin tha? Kahaan?"* (if magnification user)
   (With magnification, was text or button sometimes not reachable? Where?)
7. *"Voice control se kya kabhi command samajhna mushkil tha prototype ko? Kahaan?"* (if voice-control user)
   (With voice control, did the prototype struggle to understand commands? Where?)

## §3 — What AT behavior surprised the designer (दिमेंशन 3)

**Anti-leading note:** This dimension is **researcher-led-with-participant-confirmation** because participant typically does NOT have insight into TWT's design assumptions, only their own AT experience. Researcher captures observations + asks participant to confirm or correct interpretation.

Researcher captures during walkthrough (real-time):
1. TalkBack Hindi pronunciation quirks observed
2. Devanagari conjunct reading order anomalies observed
3. Focus-jump behavior (where focus jumped unexpectedly)
4. Voice-control activation patterns observed
5. Magnification re-flow behavior observed
6. ARIA-live announcement timing observed
7. Screen-reader silence on state transitions observed
8. Touch-target activation under magnification observed

Then researcher asks participant:
1. *"Maine notice kiya ki [specific AT-event]. Kya aapko bhi waisa lagta hai, ya main galat samajh raha hoon?"*
   (I noticed [specific AT-event]. Did you also feel that, or am I misinterpreting?)
2. *"Kya yeh AT behavior aapke liye normal hai, ya prototype-specific?"*
   (Is this AT behavior normal for you, or prototype-specific?)
3. *"Kya aisa kuch hua jo aapne pehle kabhi nahin dekha kisi aur app mein?"*
   (Did anything happen that you've never seen before in any other app?)
4. *"Kya AT ne kabhi kuch bola jo aapko surprise kiya — achha ya bura?"*
   (Did AT ever say something that surprised you — good or bad?)
5. *"Jab aapne [specific button / control] activate kiya, AT ne kya response diya? Kya aapne wahi expect kiya tha?"*
   (When you activated [specific button / control], what response did AT give? Did you expect that?)

## §4 — What copy or interaction patterns broke (दिमेंशन 4)

**Anti-leading note:** Do NOT pre-frame TWT-specific "Pattern 4 dignified validation" framing. Participant describes broken copy/interactions in their own words.

1. *"Kya koi text aisa tha jo AT ne padha lekin aapko galat ya unclear laga?"*
   (Was there any text AT read but felt wrong or unclear to you?)
2. *"Kya koi error message ya feedback message aisa tha jo AT ne padha lekin recovery ka raasta saaf nahin tha?"*
   (Was there any error/feedback message AT read but the recovery path wasn't clear?)
3. *"Kya kabhi aisa laga ki AT 'mechanically' padh raha hai — bina samajh ke?"*
   (Did it ever feel like AT was reading "mechanically" — without understanding?)
4. *"Kya koi button ya control aisa tha jiska label AT ne galat bola, ya bilkul nahin bola?"*
   (Was there any button/control whose label AT mispronounced, or didn't say at all?)
5. *"Kya koi screen aisi thi jahaan ka design AT ke liye 'add-on' jaisa laga — natural feel nahin aaya?"*
   (Was there any screen where the design felt like an "add-on" for AT — didn't feel natural?)
6. *"Failure ke time AT ne kya kaha — kya woh kindness ya respect ke saath laga, ya nahin?"*
   (At failure time, what did AT say — did it feel kind / respectful, or not?)

## §5 — Cross-cutting Hindi-Devanagari-AT-grammar findings (opt-in late-session)

**Opt-in per ethics-protocol §3.7.** Offered only if conversation pace permits + participant opts in.

For each cross-cutting accessibility-grammar element, prompt:

1. *"Hindi TalkBack ne aapko jin shabdon ka uchcharan sahi kiya / galat kiya — kya aap kuch specific yaad rakh sakte hain?"*
   (Hindi TalkBack's pronunciation — correct or incorrect, any specific words you can remember?)
2. *"Devanagari conjuncts (jaise क्ष, ज्ञ, त्र) — kya AT ne unhe sahi pada?"*
   (Devanagari conjuncts — did AT read them correctly?)
3. *"Focus order — kya AT ne logical sequence mein elements visit kiye?"*
   (Focus order — did AT visit elements in logical sequence?)
4. *"AT failure ke time copy kaisa tha — kya recovery saaf thi?"*
   (Copy at AT failure time — was recovery clear?)
5. *"Status pill / button colors par AT bola text label ya sirf color? Color-independence kaise feel hua?"*
   (Status pill / button colors — did AT speak text label or only color? How was color-independence?)
6. *"≥56pt touch-target (UPI button) magnification ke saath reachable laga?"* (if magnification user)
   (≥56pt touch-target with magnification — felt reachable?)
7. *"Voice-control activation reliable thi prototype ke critical buttons par?"* (if voice-control user)
   (Voice-control activation reliable on critical buttons?)
8. *"Reduced-motion preference honored hua? Animations ne tikleef di kya?"*
   (Reduced-motion preference honored? Did animations cause discomfort?)

## §6 — UX-DR clause-evaluation prompts (opt-in mid-session per ethics-protocol §3.7)

**D-06 review-patch: ≤15-minute hard time-box.** Start a mental timer when participant opts in. If 15 minutes elapse, stop and mark remaining cells `not-evaluated-due-to-pacing-constraint`.

**Prioritization order (highest-risk first):**
1. **WCAG AA critical-path** (NFR-20 launch-blocker): screen reader compatibility (`ux-dr67-screen-reader-compat-*`) → form labels (`ux-dr67-form-labels-*`) → keyboard navigation (`ux-dr67-keyboard-navigation-*`) → color independence (`ux-dr67-color-independence-*`)
2. **TWT-specific UX-DR68**: Hindi TalkBack (`ux-dr68-hindi-talkback-*`) → Devanagari conjunct (`ux-dr68-devanagari-conjunct-*`) → Hindi voice input (`ux-dr68-hindi-voice-input-*`)
3. **UX-DR65 touch-target**: critical ≥56pt (`ux-dr65-critical-56pt-*`) → 44pt default (`ux-dr65-44pt-default-*`)
4. **UX-DR66 same-product principle** (`ux-dr66-same-product-principle-*`)
5. Remaining UX-DR67 clauses + reduced-motion per-surface rows + cross-cutting rows

**Opt-in offer wording** (verbatim from `interview-protocol.md` §4):

> *"Hum kuch design rules likhe hain — accessibility ke baare mein. Agar aap chahen, hum kuch dikha sakte hain aur poochh sakte hain ki kya woh aapke experience ke saath match karte hain. Par agar aap aaram se nahin hain to bilkul zaroori nahin."*

If opted-in, for each enumerated UX-DR66/67/68 + UX-DR65 clause × each of the 3 named prototype surfaces (signup / my-pool / yogdaan-bahi), prompt in the prioritization order above:

*"Yeh design rule [clause text in Hindi paraphrase + verbatim cite if needed] aapke experience ke saath kaisa match karta hai? Theek lagta, behtar ho sakta, ya bilkul nahin?"*
(How does this design rule match your experience? Lands as intended, could be better, or not at all?)

Per-clause verdict captured in `ux-dr-clause-evaluation-worksheet.md`:
- `lands-as-intended`
- `requires-revision-with-proposed-clause`
- `requires-deeper-redesign`
- `not-evaluated-due-to-participant-non-engagement`
- `not-evaluated-due-to-prototype-surface-coverage-gap`

If declined: all clauses marked `not-evaluated-due-to-participant-non-engagement`.

**Worksheet content references:** UX-DR66 (epics line 463); UX-DR67 (epics line 464 + 8 sub-clauses per UX spec §13 lines 2590-2602); UX-DR68 (epics line 465 + 6 sub-clauses per UX spec §13 lines 2604-2634); UX-DR65 (epics line 462 + 3 touch-target categories).

## §7 — AT-specific behavioral prompts (researcher-led with participant confirmation)

For specific AT events that surface during walkthrough, researcher captures observation + asks participant to confirm or correct the researcher's interpretation:

1. **Screen-reader announcement timing of state transitions**
   *"Jab status change hua (e.g., pending → confirmed), AT ne aapko bataaya — kab? Pehle ya baad mein? Kya delay tha?"*
2. **Focus restoration after UPI Intent context switch**
   *"UPI app se wapas aaye to AT ka focus kahaan tha — same button par, ya kahin aur? Kya aapne expected jagah par paaya?"*
3. **Voice-control activation of ≥56pt UPI button** (if voice-control user)
   *"Aapne 'Submit UPI' bola — kya prototype ne activate kiya immediately, ya retry karna padaa?"*
4. **Magnification re-flow on My Pool card** (if magnification user)
   *"Magnification 150% ya zyada par card layout broken laga? Text overflow, button cutoff?"*
5. **Reduced-motion honoring on state-pill transitions**
   *"Status pill change time animation chala? Aapko comfortable laga?"*
6. **ARIA-live politeness setting for daily countdown** (P-14 review-patch: "Sushil" refers to the Story 8.2 `<ActiveContributionCard>` 15-day tone gradient — the My Pool card's daily countdown shifts from polite to assertive ARIA-live announcement cadence as the 15-day deadline approaches; see epics line 2878)
   *"15-din countdown bara-bar bola AT ne, ya polite tarike se announce kiya — interrupt nahin?"*
7. **List virtualization scroll AT behavior on Yogdaan Bahi (500-row test data, entry-level Android — Story 0.10 canonical device per epics line 2959)**
   *"Yogdaan Bahi list scroll smoothly aage badhi AT ke saath? Kya kuch lag-rahit feel hua?"*

## §8 — Closing prompts

(Per ethics-protocol §3 + Story 0.9 §5 precedent.)

1. *"Kya aap kuch aur batana chahte hain jo maine nahin poocha?"*
   (Is there anything else you want to share that I didn't ask about?)
2. *"Kya kuch aisa hua jo aapke liye important tha, lekin maine pakad nahin paaya?"*
   (Did something happen that was important for you, but I didn't capture?)
3. *"Aapki AT setup ke baare mein ek baat — kya aapko lagta hai TWT ko AT-users ke liye kya commit karna chahiye?"*
   (One thing about your AT setup — what do you think TWT should commit to for AT users?)
4. *"Kya hum aapse synthesis ke baad sampark kar sakte hain (re-consent-for-quotation) — kuch specific quotes confirm karne ke liye?"*
   (May we contact you after synthesis for re-consent-for-quotation — to confirm specific quotes?)
5. *"Aapka travel-reimbursement yahaan hai. Aapka mansik samay ka mehantana, agar Trustee Panel ne sahmati di hai, woh bhi yahaan hai."*
   (Your travel-reimbursement is here. Your time-stipend, if Trustee Panel agreed, is also here.)
