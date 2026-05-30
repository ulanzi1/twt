# Recruitment Log — P0-2a Teacher Empathy Interviews

**Authority:** Story 0.8 AC-1 Task 5 + ethics-protocol.md §4 identity protection (substantive name + contact stored out-of-band per operations policy) + README §3 recruitment paths.

**Purpose:** Pseudonym-to-recruitment-path mapping. Audit-trail proving 5 participants were recruited per the protocol. **Does NOT carry substantive identity** — names + contacts are NDA territory stored out-of-band.

**Schema:** append-only; forbidden-removal rule applies.

**Status at author-commit (2026-05-30, Task 5):** Schema header committed + 5 `pending-recruitment` rows for Shikshakamitra-1 through Shikshakamitra-5. Substantive recruitment occurs at Task 7 _AWAITING EXTERNAL ACTION_.

---

## Schema columns

| Column | Description |
|---|---|
| `pseudonym` | `Shikshakamitra-N` where N ∈ {1, 2, 3, 4, 5} (assigned in recruitment order; preserved across withdrawals — see ethics-protocol §5) |
| `recruitment_path` | `bihar-state-ed-dept-directory` \| `vaishali-teacher-union` \| `vaishali-shikshakamitra-association` \| `trustee-network-referral` \| `school-visit-recruitment` |
| `recruitment_date` | YYYY-MM-DD when researcher made initial contact |
| `consent_obtained_date` | YYYY-MM-DD when signed consent form was obtained per ethics-protocol §2 |
| `interview_scheduled_date` | YYYY-MM-DD scheduled date |
| `interview_conducted_date` | YYYY-MM-DD actual interview date; `n/a` if withdrawn before interview |
| `withdrawal_status` | `pending-recruitment` (at author-commit) \| `pending-interview` (post-consent) \| `active` (post-interview) \| `withdrawn-before-interview` \| `withdrawn-during-interview` \| `withdrawn-before-synthesis` \| `withdrawn-after-synthesis` |
| `block_level_slug` | `vaishali-block-<a/b/c/...>` — block-level slug per ethics-protocol §4 demographic-context granularity; NEVER village name |
| `notes` | Free-text annotations (e.g., recruitment difficulty, substitute recruitment context, scheduling reschedules) |

---

## Out-of-band substantive identity store

The recruitment-log file **does NOT** carry:
- Participant's real name
- Participant's phone number / WhatsApp / email
- Participant's specific school name
- Participant's specific village name
- Any other personally-identifying information

These data are stored **out-of-band** per operations policy in a researcher-only access-controlled file outside the trustee-accessible repo. Trustee Panel chair may access under documented need-to-know per Story 0.6 engineer-roster precedent (e.g., to authenticate a participant withdrawal request).

**Out-of-band store schema (researcher-only):**
- `pseudonym` (matches recruitment-log)
- `real_name` (as participant identifies)
- `contact_primary` (phone / WhatsApp)
- `contact_secondary` (if applicable; backup channel)
- `village_name` (substantive)
- `school_name` (substantive)
- `recruitment_path_detail` (specific source — e.g., "referral by Trustee X via WhatsApp on 2026-05-31")

The out-of-band store is updated in tandem with the recruitment-log; trustee-side access events are logged in `.decision-log.md` as `[CONTINUITY]` entries with rationale.

---

## Rows

At Task 5 author-commit, the recruitment-log carries 5 placeholder rows:

| `pseudonym` | `recruitment_path` | `recruitment_date` | `consent_obtained_date` | `interview_scheduled_date` | `interview_conducted_date` | `withdrawal_status` | `block_level_slug` | `notes` |
|---|---|---|---|---|---|---|---|---|
| Shikshakamitra-1 | `pending-task-7` | `pending` | `pending` | `pending` | `pending` | `pending-recruitment` | `pending` | Reserved for Task 7 first-recruitment |
| Shikshakamitra-2 | `pending-task-7` | `pending` | `pending` | `pending` | `pending` | `pending-recruitment` | `pending` | Reserved for Task 7 second-recruitment |
| Shikshakamitra-3 | `pending-task-7` | `pending` | `pending` | `pending` | `pending` | `pending-recruitment` | `pending` | Reserved for Task 7 third-recruitment |
| Shikshakamitra-4 | `pending-task-7` | `pending` | `pending` | `pending` | `pending` | `pending-recruitment` | `pending` | Reserved for Task 7 fourth-recruitment |
| Shikshakamitra-5 | `pending-task-7` | `pending` | `pending` | `pending` | `pending` | `pending-recruitment` | `pending` | Reserved for Task 7 fifth-recruitment |

---

## Pseudonym preservation under withdrawal

Per ethics-protocol §5: when a participant withdraws before interview, the pseudonym number is **preserved for audit-trail consistency**; the substitute participant receives the next available number (Shikshakamitra-6 etc.), and the 5-participant minimum is maintained by re-recruitment.

Example: if Shikshakamitra-3 withdraws before interview, the recruitment-log row for Shikshakamitra-3 is updated to `withdrawal_status = withdrawn-before-interview`; a new row is appended for Shikshakamitra-6 (the substitute); the 5-participant target is met by participants {1, 2, 4, 5, 6}.

---

## Sampling-bias acknowledgment template

At Task 9 synthesis-author-commit, the synthesis §2 Recruitment summary reads from this log to acknowledge sampling bias. Specific bias dimensions to surface:

- Distribution across recruitment paths (4 of 5 from ed-dept directory + 1 from trustee referral → bias toward bureaucratically-visible candidates)
- Block-level slug distribution (all 5 from `vaishali-block-a` → bias toward single-block context)
- Demographic distribution (per per-interview note demographics: age band; gender; tenure; school grade-level)
- Withdrawal pattern (if substitutes were needed, the withdrawal context informs the bias)

---

## Forbidden states

- A row with substantive name / contact / village / school inlined — FORBIDDEN per ethics-protocol §4 identity protection.
- A row with `withdrawal_status` set to a terminal state (`withdrawn-*`) but `pseudonym` reassigned to a substitute participant — FORBIDDEN; pseudonyms are preserved for audit-trail.
- Recruitment-log row deletion — FORBIDDEN; supersession-schema is the only allowed lifecycle exit.
- A `consent_obtained_date` populated before `recruitment_date` — invalid lifecycle order.
- An `interview_conducted_date` populated without `consent_obtained_date` — violates ethics-protocol §2 informed-consent-before-interview rule.
