# Caller-Consent Spoken Script (Hindi) — P0-2d Operator Shadowing

> **Operator-spoken script for per-call caller-spoken-consent at call-open** per ethics-protocol §3.8. Caller's spoken consent is **recorded as part of the call** if the host helpline operates call-recording; **documented in researcher's per-shift notes only** if the host helpline does not operate call-recording. Hindi-primary; verbatim phrasing committed as default. The host helpline MAY substitute its existing caller-consent phrasing if equivalent in scope (per README §8 Open ADR slot 7 + ethics-protocol §8 trustee sign-off requirement). The script covers: opening consent prompt + fast-path for calls-before-prompt + caller-declines decision-tree + non-Hindi-caller rule + caller-revokes-mid-call decision-tree + abrupt-hang-up rule + callback rule + emotional-overload-observer-discretion-end decision-tree.

> **This script is delivered by the OPERATOR, NOT the researcher.** The researcher does NOT speak to the caller at any point (observer-not-participant discipline per ethics-protocol §3.4).

> **The script is delivered at the start of each observed call.** It is NOT delivered for calls where the operator OR researcher has determined the call is not in scope (e.g., wrong-number calls, internal admin calls).

---

## §1 — Opening consent prompt (delivered at call-open by operator)

**Operator's verbatim phrasing (Hindi, after standard greeting):**

> *"Namaste / Pranaam — [host-helpline standard greeting]. Aaj humare saath ek aur saathi baith ke sun rahe hain — TWT naam ki ek nayi sangthan ke liye research kar rahe hain ki helpline operators kaise kaam karte hain. Woh kisi bhi baat mein dakhal nahin denge + aapse baat nahin karenge — bas chuppi se observe kar rahe hain. Sirf workflow aur category ka observation — aapki ya caller ki koi bhi niji jaankari ya identity record nahin hogi. Kya aapko theek hai humare saathi ke baith ke sunne mein? Aap chahein to nahin bhi bol sakte hain — uss case mein woh chale jayenge + sirf hum dono baat karenge."*

**Free English translation (for researcher + trustee review reference only — NOT spoken to caller):**

> "Namaste / Pranaam — [host-helpline standard greeting]. Today a colleague is sitting with us, listening — they are doing research for a new organization called TWT, about how helpline operators work. They will not interfere in any way + will not speak with you — just silently observe. Only workflow and category observation — no personal information or identity of you or the caller will be recorded. Is it okay with you if our colleague sits and listens? You may also say no — in that case they will leave + only the two of us will talk."

**Fast-path rule (P-05) — caller begins speaking before consent prompt is delivered:**
- If the caller begins speaking before the operator can deliver the consent prompt, the **operator may interrupt once** to deliver the consent script.
- If the caller does not pause to hear the consent prompt, **default-no-consent applies** — observation does not begin for that call.
- Per-shift note row: `caller-consent-no-response` (tally only).

---

## §2 — Caller-consent verdict decision-tree

### §2.1 — Caller consents

**Caller's response patterns:**
- "Haan, theek hai." / "Theek hai." / "Koi baat nahin." / explicit affirmation

**Action:**
- Observation proceeds.
- Researcher remains in position (observer-not-participant discipline).
- Per-shift note row: `caller-consent-given` (data row).
- Operator continues call normally.

### §2.2 — Caller declines

**Caller's response patterns:**
- "Nahin, mujhe theek nahin lag raha." / "Aap akele baat kariye." / explicit decline

**Action:**
- Researcher immediately exits observation:
  - Steps out of room OR mutes audio + closes notes
  - No data captured from this call
  - Returns to room only when call ends + operator signals
- Per-shift note row: `caller-consent-declined` (tally only, NOT a data row)
- Operator continues call normally (without observation)

**Operator's reassurance phrasing (Hindi):**

> *"Bilkul theek hai — saathi chale jaate hain. Hum baat karte hain."*

> ("Of course it's fine — the colleague will leave. We'll talk.")

### §2.3 — Caller does not respond / silent

**Caller's response patterns:**
- Silence
- Confusion / asking what was said
- Distress / inability to process the consent question (e.g., caller is in immediate crisis)

**Action — default-no-consent:**
- The researcher does NOT interpret silence or confusion as consent
- Researcher immediately exits observation per §2.2 procedure
- Per-shift note row: `caller-consent-no-response` (tally only)
- Operator continues call without observation

**Operator's follow-up phrasing (Hindi) — only if caller is responsive but seems confused:**

> *"Koi baat nahin — humara saathi chale jaate hain. Hum baat karte hain."*

> ("No matter — our colleague will leave. We'll talk.")

The operator does NOT pressure the caller to consent. The operator does NOT re-explain the consent question. Default-no-consent.

### §2.4 — Caller communicates in a language other than Hindi

**Situation:**
- Caller opens the call in a language the operator cannot deliver the consent script in (e.g., Tamil, Telugu, Marathi, English-only caller who does not understand Hindi phrasing)

**Action — default-no-consent:**
- The operator does NOT attempt a partial or improvised consent script in an unfamiliar language
- **Default-no-consent applies immediately** — observation does not proceed for that call
- Researcher exits per §2.2 procedure
- Per-shift note row: `caller-consent-no-response` (tally only; language noted as reason if researcher wishes)
- The call proceeds normally between operator and caller without observation

---

## §3 — Caller revokes consent mid-call decision-tree

### §3.1 — Caller explicitly revokes

**Caller's response patterns mid-call:**
- "Ab aap akele baat kariye." / "Saathi ko bhej deejiye." / explicit revocation
- "Mujhe niji baat karni hai." / "Yeh personal hai." / privacy assertion

**Action:**
- Researcher immediately ceases observation of that call:
  - Steps out of room OR mutes audio + closes notes
  - Destroys any partial data captured from that call (tears note page / erases digital note; **for digital notes, destruction must include removal from any auto-sync or cloud-backup layer** — researcher uses a notes application with auto-sync disabled during shifts, or purges sync layers immediately upon destruction)
- Per-shift note row: `caller-consent-revoked-mid-call` (tally only, NOT a data row — the data is destroyed)

**Operator's reassurance phrasing (Hindi):**

> *"Bilkul theek hai — saathi chale jaate hain. Hum sirf hum dono baat karte hain."*

> ("Of course it's fine — the colleague will leave. We'll talk just the two of us.")

### §3.2 — Caller ends call abruptly

**Caller's response patterns:**
- Caller hangs up suddenly mid-call
- Caller stops responding without explicit revocation

**Action:**
- **Data captured before the abrupt hang-up is retained** as a normal observation row, finalized at the point of hang-up. This is distinct from explicit revocation (§3.1) — only post-hang-up capture is excluded; pre-hang-up observations are retained.
- Researcher does NOT capture or attempt to capture data from after the abrupt end
- Per-shift note row: `caller-ended-call-abruptly` (data row for pre-hang-up observations; no data captured post-hang-up)

### §3.3 — Callback from same caller within the same shift

**Situation:**
- A caller who previously gave consent (or declined, or hung up) calls back within the same shift

**Action:**
- The callback is treated as a **new call** — it is a new per-call consent event
- The operator delivers the consent script again per §1
- Previous consent (given or declined) from the earlier call in the same shift does NOT carry over
- Per-shift note row for the callback call is a new row (separate from the original call row)

---

## §4 — Emotional-overload-observer-discretion-end decision-tree

**This applies when the caller is in significant emotional distress during a call, AND the operator is managing that distress, AND the observer's silent presence may compound the caller's distress even though the caller previously gave per-call consent.**

### §4.1 — Trigger criteria (operator-discretion-judgement-based)

The framework does NOT commit hard trigger criteria (deferred per README §8 ADR slot 8). Researcher uses judgement based on:

- Caller's voice patterns (crying, breathing distress, voice trembling)
- Caller's speech content (expressions of overwhelm, requests for privacy, references to crisis)
- Operator's posture toward managing the distress (operator may signal observer's presence is unhelpful)
- Researcher's own emotional load (if researcher's presence is making researcher unable to maintain observer-not-participant discipline)

### §4.2 — Action

- Researcher exits the call observation at observer-discretion:
  - Steps out of room OR mutes + closes notes
- Researcher does NOT signal the operator OR the caller about the exit — the exit is silent + minimal
- Researcher does NOT capture any further data from that call
- Per-shift note row: `emotional-overload-observer-discretion-end` (tally only, NOT a data row)
- Researcher does NOT require operator-debrief on that call (operator's caller-management is the priority; debrief may be voluntary at end-of-shift)

### §4.3 — No operator signaling required for exit; re-entry requires operator confirmation

- Operator does NOT need to signal the researcher to exit
- Operator focuses entirely on the caller's distress
- Researcher exits silently

### §4.4 — Re-entry after emotional-overload exit

- **Before returning to observation position**, researcher signals operator via a discreet channel (text message to operator's device OR quiet knock at doorway)
- Operator confirms readiness via hand-signal or nod
- Researcher returns to observation position **only after operator confirmation**
- The next per-call consent prompt proceeds only after re-entry is confirmed
- **Researcher does NOT re-enter mid-call** — re-entry occurs only between calls

---

## §5 — Per-shift consent tally

At end of each shift, the operator + researcher together (between-call or end-of-shift) record:

- **Total calls in shift:** N
- **Calls with `caller-consent-given`:** N (data rows)
- **Calls with `caller-consent-declined`:** N (tally only)
- **Calls with `caller-consent-no-response`:** N (tally only)
- **Calls with `caller-consent-revoked-mid-call`:** N (tally only)
- **Calls with `caller-ended-call-abruptly`:** N (tally only)
- **Calls with `emotional-overload-observer-discretion-end`:** N (tally only)
- **Total observed-call time** (only `caller-consent-given` calls count): X hours

The per-shift consent tally feeds the per-shift note summary + the host-helpline-engagement-log.

---

## §6 — Host-helpline-existing-consent-procedure compatibility

If the host helpline has an existing caller-consent procedure (e.g., a recorded-line disclaimer at call-open), the script in §1 can be **appended to** the existing procedure, NOT replacing it. The combined disclosure is:

1. Host-helpline's existing recorded-line disclaimer (e.g., "This call may be recorded for quality and training purposes")
2. **THEN** the script in §1 (which adds the research-observer-specific consent)

The two are sequenced; the host-helpline's existing procedure goes first, then the research-observer consent is added.

If the host helpline's existing procedure is **incompatible** with the research-observer consent (e.g., the existing procedure does not permit additional disclosures), the host helpline operations lead determines whether the shadowing engagement can proceed at all — recorded as the §0 host-helpline-approval check OR as a substitute-host-helpline trigger.

---

## §7 — Word-for-word phrasing as ADR slot

The verbatim Hindi phrasing in §1 is committed as **framework default**. The host helpline MAY substitute its existing caller-consent phrasing if equivalent in scope (per README §8 ADR slot 7). Equivalence-in-scope means the substitute phrasing covers:

- Identification of the observer's presence
- The observer's purpose (research about how helpline operators work)
- The observer-not-participant discipline (will not interfere; will not speak with caller)
- Caller-identity-NEVER-recorded discipline (identity + personal content will never be recorded)
- Caller's right to decline (default-no-consent if caller does not affirmatively consent)
- Caller's right to revoke mid-call

If the host helpline's existing phrasing covers all these elements, the substitute phrasing is acceptable. If not, the framework default phrasing in §1 is used.

**Trustee sign-off required for any substitution:** the substitute phrasing — whether accepted as equivalent or modified — requires **Trustee Panel sign-off** before shadowing begins, recorded in `trustee-review-log.md` per ethics-protocol §8. Shadowing does NOT begin until the trustee sign-off on the substitute phrasing exists. The Trustee's equivalence-in-scope check is the authoritative gate on whether the six required elements are adequately covered.
