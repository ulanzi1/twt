# Recruitment Log — P0-2b Bereaved-Spouse Conversation

**Authority:** Story 0.9 AC-1 recruitment-log discipline · ethics-protocol.md §3.0 bereavement-context recruitment discipline (trustee-mediated paths only; cold recruitment forbidden) · ethics-protocol.md §4 identity protection (substantive identity NDA stored out-of-band) · README.md §3 recruitment paths (operations-policy committed at framework level — bereavement-context restricted)

**Scope:** Pseudonym-to-recruitment-path mapping for the 1 bereaved-spouse conversation per Story 0.9. The log is the framework-level audit trail proving 1 participant was recruited per the protocol; **substantive identity verification is trustee-side via the out-of-band roster** (NOT in this file).

---

## Schema header

Each recruitment row carries the following columns:

| Column | Type | Purpose | Allowed values / notes |
|---|---|---|---|
| `pseudonym` | slug | Canonical identity reference | `Bereaved-Spouse-1` for the primary participant; `Bereaved-Spouse-1A` (P-07) if the original spouse's data persists post-synthesis-withdrawal AND a substitute is added — their data coexist; see substitute-spouse-logic below |
| `recruitment_path` | enum | Which trustee-mediated path identified this candidate | `TSCT-trustee-referral` (TSCT trustee identifies candidate from ~556-deceased-family operational history) / `Trustee-Panel-personal-network-referral` (TWT Trustee Panel member suggests candidate from personal network) / `BSWLB-referral` (Bihar Widow Welfare Board referral via trustee-mediated request) / `Bihar-grief-support-NGO-referral` (Bihar NGO with appropriate ethical standing referral via trustee-mediated request) |
| `recruitment_date` | YYYY-MM-DD | Date candidate was identified via recruitment path | Populated at Task 7 |
| `consent_obtained_date` | YYYY-MM-DD | Date spouse signed Hindi informed-consent form per ethics-protocol §2 (a)-(h) + §2-bis re-consent-for-quotation checkbox + §2-tris trustee-approval transparency | Populated at Task 7; MUST precede `interview_scheduled_date` |
| `interview_scheduled_date` | YYYY-MM-DD | Date conversation is scheduled to occur | Populated at Task 7 |
| `interview_conducted_date` | YYYY-MM-DD | Date conversation actually occurred | Populated at Task 8 |
| `withdrawal_status` | enum | Per ethics-protocol §5 withdrawal lifecycle | `pending-recruitment` (at Task 5 author-commit; before recruitment) / `pending-consent` (post-recruitment, pre-consent-signature) / `pending-interview` (post-consent, pre-conversation) / `active` (post-conversation, pre-synthesis) / `withdrawn-before-conversation` / `withdrawn-during-conversation` / `withdrawn-before-synthesis` / `withdrawn-after-synthesis` / `granular-quote-withdrawal-active` (synthesis broadly intact; specific quote withdrawn per ethics-protocol §2-bis). **Note (P-17):** For `withdrawn-before-synthesis` and `withdrawn-during-conversation`: interview content (notes + recording) is destroyed but the signed consent form is retained in out-of-band storage as audit-trail evidence per ethics-protocol §5. |
| `quotation_re-consent_engagement` | enum | Per ethics-protocol §2-bis re-consent-for-quotation tracking | `not-opted-in` (consent form §2-bis checkbox = "no"; no re-consent contacts) / `pending-synthesis` (consent form §2-bis checkbox = "yes"; awaiting synthesis-author-commit) / `re-consent-requested-on-N-quotes` (researcher routed re-consent requests for N quotes; awaiting response) / `re-consent-confirmed-on-N-quotes` (spouse confirmed N quotes; quotes carry `[quote-re-confirmed YYYY-MM-DD]` marker in synthesis) / `re-consent-declined-on-N-quotes` (spouse declined N quotes; paraphrase only in synthesis) / `re-consent-confirmed-then-withdrawn-N-quotes` (spouse confirmed N quotes initially + later withdrew; supersession noted) |
| `recording_storage_log` | text (optional) | If `recording_consent = recording-with-consent`: recording file path + retention end date | Populated at Task 6.2 if audio recording chosen; e.g., "encrypted file at <path>; retention end YYYY-MM-DD" |
| `data_destruction_log` | text (optional) | If withdrawal triggers data destruction OR retention timer reaches end: destruction event log | Populated at destruction; e.g., "raw recording destroyed YYYY-MM-DD via secure-delete; trustee chair notified YYYY-MM-DD" |

---

## Substantive identity discipline (per ethics-protocol §4)

**The recruitment-log does NOT carry substantive names or contacts.** Those are stored **out-of-band per operations policy**, access-controlled to Solo Builder + Trustee Panel chair per need-to-know basis.

This file commits the property (1 participant recruited per the protocol) + the audit-trail shape (pseudonym + path + dates + withdrawal status + re-consent engagement); substantive identity verification is trustee-side via the out-of-band roster.

**NDA territory** inheriting Story 0.6 engineer-roster + Story 0.7 rota + Story 0.8 Shikshakamitra contact-identity discipline.

---

## Sampling acknowledgment (per ethics-protocol bereavement-context)

Single conversation is a **deep narrow signal**, NOT a statistical claim. The synthesis represents one bereaved-spouse's lived experience.

- Recruitment-path bias is acknowledged: each path (TSCT / Trustee Panel personal-network / BSWLB / Bihar grief-support NGO) introduces selection bias toward different sub-populations.
- TSCT-trustee-referral path is the primary recommended path because TSCT has the natural population (~556 deceased-member families per `tsct-reference-learnings.md`) AND the bereaved spouse will have experienced a comparable claim process (the TSCT model is what TWT inherits structurally).
- Trustee-Panel-personal-network-referral path introduces personal-network bias (e.g., a teacher colleague's wife) but may surface bereaved spouses who would not be on TSCT's roster.
- BSWLB referral path may surface bereaved spouses without prior welfare-trust experience; this is a useful counter-balance to TSCT bias but may not directly evaluate TWT's claim-filing flow assumptions.
- Bihar grief-support NGO referral path is similar to BSWLB.
- Cross-population generalization requires future research surfaces.

---

## Substitute spouse logic (per ethics-protocol §5 withdrawal)

If the recruited spouse withdraws at any stage, a substitute spouse is recruited per the same trustee-mediated path (or an alternate trustee-mediated path if the original path's candidate pool is exhausted). The 1-participant minimum is maintained.

Substitute pseudonym: the original pseudonym `Bereaved-Spouse-1` is reassigned to the substitute (per Story 0.8 substitute-logic precedent) IF the original spouse's data is fully destroyed per withdrawal lifecycle; OR a new pseudonym `Bereaved-Spouse-1A` is assigned IF the original spouse's data persists as `withdrawn-after-synthesis` with supersession marker (per ethics-protocol §5).

Substitute recruitment requires trustee-approval refresh per ethics-protocol §2-tris — a streamlined re-approval per the Trustee Panel chair fallback (README §5) is acceptable to avoid recruiting delay; full Trustee Panel re-approval is preferred but not required.

---

## Recruitment rows

### Row 1 — Bereaved-Spouse-1 (pre-staged at Task 5; populated at Task 7)

| Field | Value |
|---|---|
| `pseudonym` | Bereaved-Spouse-1 |
| `recruitment_path` | _PENDING_TRUSTEE_APPROVAL_AND_RECRUITMENT_ |
| `recruitment_date` | _PENDING_RECRUITMENT_ |
| `consent_obtained_date` | _PENDING_RECRUITMENT_ |
| `interview_scheduled_date` | _PENDING_RECRUITMENT_ |
| `interview_conducted_date` | _PENDING_INTERVIEW_CONDUCT_ |
| `withdrawal_status` | pending-recruitment |
| `quotation_re-consent_engagement` | _PENDING_CONSENT_FORM_§2-bis_CHECKBOX_ |
| `recording_storage_log` | _PENDING_RECORDING_CHOICE_ |
| `data_destruction_log` | _ |

(Substantive identity stored out-of-band per ethics-protocol §4; NOT in this file.)
