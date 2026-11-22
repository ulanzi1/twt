# Runbook: Personal data breach response

> ⚠ **NOT AUTHORITATIVE until signed in `operational-readiness-ledger.md`.** This is a draft written by Story 14.3. No trustee has
> signed it, it has not been rehearsed, and counsel has not been asked about breach reporting. Until it is signed, the interim
> escalation in `docs/knowledge-transfer/on-call-playbook.md` §2.13 stands.

> **Status:** draft (Story 14.3 author-commit 2026-11-20, Decision `2026-11-20-467`); unsigned; launch-gate Row 53 (a) open
> **Owner role:** the breach owner — designated by the Trustee Panel, Decision `2026-11-20-468` (one named person is both the breach owner and the published contact; the name is in the decision). The owner is a Trustee; reach them at `dpo@aipwt.org` (Decision `2026-11-20-469`; the mailbox is not yet verified, and no stand-in is recorded). ⚠ One mailbox is not enough under a 72-hour clock: ALSO use the interim escalation — Solo Builder + Trustee Panel chair + counsel `lc-1`, as on-call playbook §2.13.
> **Last material edit:** 2026-11-20 by Solo Builder (initial)
> **Architectural authority:** architecture.md §2.12 (breach reporting; breach detection signals), §1.5 (a chain break triggers a P0 incident), Launch Gate Risks (incident response table-top) · PRD FR-99, FR-47 · DPDP Act 2023 ss.8(6), 8(9) · DPDP Rules 2025 (G.S.R. 846(E)) Rule 7 · Decision `2026-11-20-467`

This runbook says what the Trust does when personal data it holds is, or may have been, exposed, changed, lost or reached by someone
who should not have it. It has two legal clocks, one register, and three notices that people send.

**Three rules before anything else.**

1. **Every breach is notifiable.** The law has no threshold of seriousness: Rule 7 applies on *"any personal data breach"*. Nobody
   decides that a breach is too small to report. A field for "how many people" is a fact to record, never a test to pass.
2. **A signal is not yet a breach — and a confirmed leak always is.** A red CI job, a log line or a failed check is a prompt to ASSESS.
   Once it is confirmed that personal data leaked, it is a breach, whatever the cause and however few people.
3. **The system drafts; people send.** The admin app records the incident and drafts the notices. It sends nothing — not to a member,
   not to the Board, not to CERT-In. Each "sent" entry is recorded by staff AFTER they have sent the notice by their own means.

**The two clocks (DPDP Rules 2025, Rule 7).** Both start when the Trust BECOMES AWARE of the breach.

| Clock | To whom | What | By when |
|---|---|---|---|
| A | Each affected person | Rule 7(1): what happened (nature, extent, timing); what it may mean for her; what the Trust is doing; what she can do; whom to ask | *"without delay"* |
| B1 | The Data Protection Board | Rule 7(2)(a): what happened (nature, extent, timing **and location**) and the likely impact | *"without delay"* |
| B2 | The Data Protection Board | Rule 7(2)(b): the detailed report — updated description, the broad facts, mitigation, findings about the person who caused it, remedial measures, and a report on the notices given to affected people | *"within seventy-two hours of becoming aware"*, or a longer period the Board allows on a written request |

These duties bind the Trust from DPDP commencement — 13 May 2027 as far as found (the Gazette's own dates allow 14 May; asked of
counsel). Before that, and from go-live, the Trust follows this runbook as its own standard.

## 1. Prerequisites

- **Access:** a Super Admin account (the one permission `breach.manage` is held by the Super Admin only). The register is at
  `/data-protection/breaches` in the admin app. The breach owner (a Trustee) need not hold one: a Super Admin RECORDS what the owner
  decides, on the owner's behalf (Decision `2026-11-20-471`) — so a Super Admin must be reachable within the 72 hours. Without that account, record the same facts on paper with times and enter them later —
  the clocks do not wait for the app.
- **A display name is set** on that admin account (the register refuses a nameless admin; the name is stored on every entry).
- **The time the Trust became aware**, to the minute, in IST. This starts both clocks. If in doubt, take the EARLIER time.
- **Environment:** production. For a rehearsal, tick "rehearsal" when opening the record — it cannot be changed afterwards and every
  draft is headed `REHEARSAL — DO NOT SEND`.
- **Know what is not in place** (so nobody waits for it): there is no alerting or paging — nothing built tells the Trust that a breach
  has happened; the Board has no filing portal that we could find; no breach SMS text is registered with the DLT; the notices are
  drafted in English only.

## 2. Step-by-step procedure

### 2.1 — Triage: is this a signal, or a breach?

Whoever notices tells the breach owner (`dpo@aipwt.org` — Decisions `2026-11-20-468` / `-469`) AND the interim escalation of on-call playbook §2.13, at once. Use this table to find where a
signal shows up today and what to do first. **A signal opens an assessment; it is not a breach until personal data is confirmed
exposed.**

| What was noticed | Where it shows today | First step |
|---|---|---|
| The audit log's chain check failed (Stories 1.10 / 1.11a) | The admin Integrity page shows a red banner until acknowledged; the breach page lists it under "Signals to assess". ⚠ The alerter only writes a log line, and the nightly check runs on a CI database, not production — in production a failure is seen only when someone runs the check. | Open an incident from the signal (2.2). Acknowledge the check on the Integrity page separately — that page owns acknowledgement. |
| The PII-scrape gate went red (Story 1.16b) | A failed CI job (`pii-scrape`) on a pull request or on `main`. Nothing at runtime watches for a leak. | Read what the job flagged. If a public page did serve personal data in production, it is a breach: open an incident, source `pii_scrape_failure`. |
| Validity-cache alerts (Story 4.8) | Log lines only (`validity_cache.fallback_rate_alert`, `validity_cache.poisoned`); the rate monitor lives in one process's memory. By design stale values are not served — this is rarely a personal-data matter. | Assess. Open an incident (source `validity_cache_alert`) only if a member was shown another member's data or a wrong status was disclosed to someone. |
| A cross-tenant read anomaly, an unusual PII export volume, an RLS-bypass attempt, an out-of-hours privileged session, Class-A dead-letter build-up (architecture §2.12) | ⛔ Not built. No signal exists for any of the five. They are found only by a person reading logs or the audit log. | If a person finds one, open an incident with the matching source and assess. |
| A member, staff, a partner or a regulator tells us | Helpline, helpdesk ticket, email, phone | Open an incident, source `external_report`. Take the reporter's own account in full; record it as a timeline event (refer to members by member id, never by name or number). |
| A notice or text reached the wrong person (for example a mistyped mobile number) | Reported by the recipient or noticed by staff | Assess as a possible breach and open an incident (source `external_report` or `other`). ⛔ Do not judge it too small to matter. Whether it is a notifiable breach is a question already owed to counsel — launch-gate Row 49 (d), `counsel-question-2026-11-03-field-worker-data-basis.md` question 6. Until that answer is recorded, treat it as notifiable. |
| Anything else | — | Open an incident, source `other`. |

### 2.2 — Open the incident (minutes, not hours)

1. In the admin app go to **Data protection → Breaches** and choose **Open an incident** — or, from "Signals to assess", **Open an
   incident from this** (it fills the source, the signal reference and the awareness time from the failed check).
2. Enter a short title, the time the Trust became aware (IST), and the source. Real or rehearsal is fixed here.
3. The detail page now shows the **Board report due** time: awareness + 72 hours.

### 2.3 — Contain, and record as you go

4. Stop the exposure first (revoke a session or a grant, take a page down, rotate a credential — `secret-rotation.md`, `rollback.md`).
   Record each step as a **mitigation** entry (implemented or proposed) and what happened when as **timeline event** entries.
5. Record an **assessment** as soon as anything is known, and again whenever it changes (the latest one feeds the drafts): nature,
   extent, **location**, the data categories, the estimated number of people (or "unknown"), the Pariwars affected, the likely
   consequences for a person, the safety measures a person can take, and the contact a person can use.
   - Use the appendix below, "Where personal data is held and who receives it", to work out what could have been reached.
   - ⚠ Free text can hold personal data. Refer to members by member id — never by name, mobile or any identity number.

### 2.4 — Tell the Board, first intimation (Clock B1 — without delay)

6. Open the **Board — first intimation** draft, check it has no `[MISSING — …]` line, and copy it.
7. Send it to the Data Protection Board. `[no portal yet — re-check]`: on 2026-11-20 no Board filing route was found (`dpb.gov.in` does
   not resolve; published reports of mid-November 2026 have no Board member appointed; a Kerala High Court order of October 2026,
   reported second-hand, expected the Board functional by about 2 December 2026). Look up the current route at the time — the monthly
   review in `dpo-appointment-and-sdf-watch.md` keeps the last answer. If there is still no route, ask counsel `lc-1` the same hour
   how the intimation is to be delivered, keep proof of every attempt, and say in the entry exactly what was sent, to whom and when.
   ⛔ This runbook does not say where to send it in that case — that is counsel's to answer, and it has not been asked.
8. Record **Board — first intimation recorded** with the time sent and the reference.

### 2.5 — Tell each affected person (Clock A — without delay)

9. Open the **Notice to affected people** draft, check it, and have a person translate it into Hindi (⛔ no machine translation is sent
   unreviewed; no Hindi template exists yet).
10. Send it through channels that EXIST and that the member registered or uses:
    - **In the app** — the Pariwar's News or noticeboard banner (the member's own account), written so it identifies no member;
    - **WhatsApp or the Pariwar's announcement channels**, only where they are live for that Pariwar, and never with a member's
      details in a shared channel;
    - **A phone call** from the helpline to each affected member, for a small number of people or where the app will not reach them.
    - ⛔ SMS only if a breach text is registered with the DLT (none is — launch-gate Row 53 (f)); an unregistered text is not delivered.
    - Whether these channels satisfy *"through her user account or any mode of communication registered by her"* is asked of counsel
      (CQ3; not yet answered). Until it is, use the in-app notice AND one direct channel per affected member.
11. Record **Notice to affected people recorded** for each sending: the time, the channel, how many were reached.

### 2.6 — CERT-In `[COUNSEL — CQ2]`

12. The CERT-In Directions of 28 April 2022 ask for a report within **6 hours of noticing** certain cyber incidents. Whether they
    reach a public charitable trust is asked of counsel and not answered. **Until it is, take the conservative reading: report to
    CERT-In within 6 hours**, by the route the Directions give (their Annexure I lists the incident types; look the reporting
    address up at the time — it was read at the story's authoring on 2026-11-01 and could not be re-read on 2026-11-20, so none is
    printed here), and record **CERT-In report recorded**. This is in addition to the Board, not instead of it.

### 2.7 — The 72-hour report (Clock B2)

13. Record **cause findings** (the broad facts; findings about the person who caused it) and **remedial** measures.
14. Open the **Board — 72-hour report** draft. It lists the notices already recorded. Clear every `[MISSING — …]` line by recording
    the missing fact, then copy and send it by the route of step 7, and record **Board — 72-hour report recorded**.
15. If the report cannot be complete in time, ask the Board IN WRITING for a longer period BEFORE the due time; record a **Board
    extension recorded** entry only once the Board has allowed it (the due time moves only then). The page shows "Board report
    overdue" when the time passes with no report recorded.
15a. If an extension was recorded WRONGLY (a mistyped date, or one the Board did not in fact allow), record **Withdraw a recorded
    longer period**, choose that extension and say why (Decision `2026-11-20-471`). The due time goes back to the last extension
    still standing, or to awareness + 72 hours. Both entries stay on the timeline. ⛔ Do not "correct" it by recording a later one.
15b. If the deadline is missed — the report is filed after the due time, or the incident is closed after the due time with no
    report — the page shows **"The 72-hour deadline was missed"** and keeps showing it after "overdue" clears. Each report is judged
    against the due time recorded BEFORE it, so an extension entered afterwards does not clear it. Say why in the closing summary
    and when the Panel is told (step 19). ⚠ The app cannot tell a missed report from one that was never owed: an incident closed
    after 72 hours as NOT a breach shows the same line — then the summary says it was established not to be a breach and how,
    ⛔ an admission of a missed report that was never due.

### 2.8 — Review, sign-off and close

16. The breach owner reviews the response. A Super Admin records it as an **owner review** entry on the owner's behalf, in the
    owner's words (Decision `2026-11-20-471` — the owner need not hold an account, as with the trustees' sign-off in step 17).
17. When at least two trustees OTHER THAN the breach owner have signed the incident's summary by their own means (Decision
    `2026-11-20-470` — the owner is a Trustee and runs the response, so their own signature is not one of the two), record
    **Sign-off recorded** with their names
    and the date. ⚠ This is the operator's record that trustees signed — it is not the trustees signing in the app.
18. Record **Closed** with a summary. Nothing can be added after closing; if more is learned, open a new incident and refer to the
    first by its id.
19. Tell the Trustee Panel what happened, what was notified and what changes; anything the Panel decides as a result is recorded
    in `.decision-log.md`. Re-run the audit-chain check (`audit-log-integrity-verification.md`).

## 3. Rollback procedure

A breach record is append-only by design: nothing in it is edited or deleted.

- **A wrong entry** — record a **note** that says which entry is wrong and why, then the correct entry. For an assessment, record a new
  assessment: the latest one is used for the drafts.
- **An incident opened by mistake, or a signal that turns out not to be a breach** — record the reasoning as an **owner review** and
  close it with a summary that says no personal data was exposed and how that was established. ⛔ Do not close a confirmed leak this way.
- **A real incident opened as a rehearsal (or the reverse)** — the flag cannot be changed. Close the wrong record with a note naming the
  right one, and open a new record with the SAME awareness time. The clocks run from the true awareness time, not from the new record.
- **A notice sent with an error** — send a correction by the same channel and record both sendings.

## 4. Verification checks

- [ ] The incident's awareness time is the time the Trust first knew, not the time the record was opened.
- [ ] A first intimation to the Board is recorded, with a reference or proof of sending.
- [ ] A notice to affected people is recorded for every affected Pariwar, with channel and reach, and a Hindi version was reviewed by a person before sending.
- [ ] The 72-hour report is recorded before the due time, or a Board extension is recorded and the report is within it. The page does not show "Board report overdue".
- [ ] The CERT-In step was either done within 6 hours or counsel's recorded answer (CQ2) says it does not apply.
- [ ] No entry names a member by name, mobile or identity number.
- [ ] If the page shows "The 72-hour deadline was missed", the closing summary says why — a late report, or that no report was owed (not a breach) and how that was established.
- [ ] An owner review (recorded by a Super Admin on the owner's behalf), a recorded sign-off by at least two trustees other than the breach owner, and a closing summary exist. (The app checks only that two different names were recorded — it does not know who the owner is; check the names yourself.)
- [ ] The Trustee Panel has been told; the audit-chain check passes afterwards.

If any check fails, do not declare the incident handled; escalate per §5.

## 5. Contact escalation list

- **Primary:** the breach owner — designated by the Trustee Panel, Decision `2026-11-20-468`. A Trustee; `dpo@aipwt.org` (Decision `2026-11-20-469`). ⚠ The mailbox is not yet verified, and no stand-in or phone route is recorded.
- **Alongside, until the mailbox is verified and a stand-in is recorded:** Solo Builder + Trustee Panel chair + counsel `lc-1` (`docs/legal-counsel-engagement/counsel-roster.md`). Counsel is engaged; counsel has not been asked about breach reporting, a DPO or SDF status (the questions are written, not sent).
- **Secondary (if the primary cannot be reached — the clocks are running, do not wait):** Trustee Panel chair on rota; then the backup engineer per `docs/backup-engineer/`.
- **Trustee escalation:** every confirmed breach is told to the Trustee Panel chair at once (the interim escalation of on-call playbook §2.13).
- **Published contact for members' questions (DPDP Act s.8(9)):** launch-gate Row 8 — the Panel has named the person (Decision `2026-11-20-468`, the same person as the breach owner). The contact is `dpo@aipwt.org` (Decision `2026-11-20-469`) — recorded, ⛔ yet published (the privacy policy and Terms are published at go-live). It is typed into each incident's assessment as the contact for affected people; the app does not fill it in.

## Appendix — Where personal data is held and who receives it

*Found by grep on 2026-11-20 at `a7c99c6a` (methods stated per block). It is a working list for an incident, ⛔ not a complete
register: no completeness is claimed, and a new table, decrypt site or processor added after this date is not here until someone adds
it. Re-run the greps at an incident.*

**Tables that hold personal data** — method: `_ciphertext` columns in `packages/domain/src/schema/*.ts` (encrypted fields), plus
plaintext facts beside them. Each line is a table and what it holds.

- **Members:** `member_identities` (mobile); `member_kyc_profiles` (name, date of birth, photo — KYC derived from Aadhaar; the full Aadhaar number is never stored); `member_addresses`; `member_medical_disclosures` (health); `member_postings` (workplace); `member_device_tokens`; `member_withdrawals` (reason text); `member_data_rights_corrections`; `member_moderation_actions`, `member_moderation_appeals`, `member_moderation_grounds`; `member_search_projection` and `member_validity_cache` (derived); `member_contribution_ledger` and `vyawastha_shulk_receipts` (payment history); `consent_records`.
- **Nominees:** `member_nominees`, `member_nominee_versions` (name, mobile, address); `nominee_corrections`; `nominee_determinations`; `claim_nominee_bank_accounts` (account holder name, account number, IFSC, VPA).
- **Known people and workplace requests** (people who are not members): `member_known_people`, `known_people_campaigns`; `workplace_requests`.
- **Claims and deaths:** `claim_contacts` (the claimant's name, mobile and address); `claim_documents` (the deceased's name, date of birth, date of death, certificate number); `claim_ground_inspections` and its questionnaire, photo and discrepancy tables (family contact, location, date and time of death); `claim_peer_mesh_replies`; the decision and rationale tables (`claim_verifier_decisions`, `claim_state_trustee_decisions`, `claim_r9_votes`, `claim_appeal_decisions`, `claim_appeal_panel_votes`); `claim_correction_chase`, `claim_correction_closure`, `claim_certificate_reminder`; `claim_fraud_investigation_steps`, `claim_concealment_assessments`, `claim_warning_approvals`.
- **Field workers:** `field_workers` (name and mobile — decrypted on the admin field-worker screens); `field_worker_ending_appeals`, `field_worker_move_requests`, `field_worker_notices` (no name or mobile; they point at a worker). `field_worker_code_sms_sends` holds no name, mobile or code.
- **Memorial pages:** `memorial_submissions` (the text, the photo's alt text, and the **family list** — `kinship_ciphertext`); `memorial_review_decisions`, `memorial_withdrawals` (internal notes).
- **Staff:** `users`, `admin_credentials` (email).
- **Exports:** `data_exports`, `report_exports` (an encrypted copy of whatever was exported), `data_export_delivery_grants`.
- **Helpdesk:** `helpdesk_tickets` (what a member wrote).
- **Partner leads** (Story 12.5, added 2026-11-22): `marketplace_lead_handoffs`. Each row holds the four details a member agreed to send to one partner (whole name, mobile, district, preferred language) as ONE Tier-1 ciphertext, `member_fields_ciphertext`. The details are dropped on a cancel or an erasure, and 30 days after delivery or a final failure. The row itself stays and says which partner was sent a member's details. No production code writes a row until Story 12.3.
- **The logs themselves:** `audit_log_entries` and `events_log` record who did what to whom; payloads are designed to carry ids, not names.
- **The breach register:** `breach_incidents`, `breach_incident_entries` — no member columns; free text is typed by staff.

**Files in object storage** — method: the adapters in `packages/platform-adapters/src/`: claim documents (death certificates),
memorial photos, helpdesk attachments, bank statements, self-verify payment screenshots, contribution-note PDFs, snapshots.

**Where encrypted fields are decrypted** — method: `decrypt…(` call sites under `apps/` and `packages/domain/src`.

- **API** (`apps/api/src/modules/`): claims (the largest by far), kyc, field-worker (the admin field-worker screens), reports, public-pages, memorial, memorial-review, memorial-takedown, member-pool, member-moderation, member-moderation-appeals, known-people, data-export, auth, wa-opt-in, reconciliation-review, payment, nominee, nominee-links, member-validity, member-data-rights, medical.
- **Jobs** (`apps/jobs/src/scheduler/`): `module-lead-handoff.ts` (the partner lead sweep — the four details, once per attempt), `field-worker-code-sms.ts` (the SMS sweep), `field-worker-notice-emails.ts`, `claim-peer-mesh-requests.ts`, `claim-peer-mesh-wa-reminders.ts`, `claim-suspicion-notices.ts`, `claim-suspicion-staff-emails.ts`, `memorial-takedown-approver-emails.ts`.

**Outside parties that RECEIVE personal data (processors)** — method: outbound hosts and provider adapters in `apps/*/src` and
`packages/*/src`.

- **MSG91** (SMS): a mobile number and the text — one-time passwords, alert fallbacks, and a field worker's mobile and code.
- **Meta — WhatsApp Business** (`graph.facebook.com`): a mobile number and the template's variables.
- **Telegram** (`api.telegram.org`): chat ids and the post or message text.
- **Apple and Google push** (APNs, FCM): a device token and the notification text.
- **Amazon SES** (the staff-email path, `staff-email-client.ts`): staff email addresses and the email body — for example `field_worker_notice_emails`, whose body is a link only.
- **DigiLocker** (`api.digitallocker.gov.in`): the KYC exchange for a member's identity.
- **Google Cloud** (storage, database, key management): hosts the data and the files above.
- **Cloudflare** (edge): all traffic passes through it.
- **Partners** (Story 12.5; ⛔ live — roster Row 54 gates the first send): each receives, at its own HTTPS endpoint, the four details above for a member who registered interest in its offer. It is listed here because it receives the data. This list does not decide whether a partner is the Trust's processor; that is for counsel (Row 54 (b)), and the partner's duties are in its agreement (Row 54 (e)).

A breach at any of these is the Trust's breach to report for the Trust's data: add the processor's own account of it as timeline events.

---

## Changelog

| Date | git SHA | Author | Material edit? | Re-sign required? | Ledger entry |
|---|---|---|---|---|---|
| 2026-11-20 | (this commit) | Solo Builder (Story 14.3) | yes (initial) | yes (≥2 trustees) — not yet signed | none yet |
| 2026-11-20 | (this commit) | Solo Builder (Story 14.3) | yes — the owner lines, after the Panel's ruling (Decision `2026-11-20-468`) | yes (≥2 trustees) — not yet signed | none yet |
| 2026-11-20 | (this commit) | Solo Builder (Story 14.3) | yes — the owner's contact and capacity (Decision `2026-11-20-469`) | yes (≥2 trustees) — not yet signed | none yet |
| 2026-11-20 | (this commit) | Solo Builder (Story 14.3) | yes — the incident sign-off is by two trustees OTHER THAN the breach owner (Decision `2026-11-20-470`) | yes (≥2 trustees) — not yet signed | none yet |
| 2026-11-21 | (this commit) | Solo Builder (Story 14.3 code review) | yes — a Super Admin records the owner's review on the owner's behalf (step 16, prerequisites); a wrong extension is withdrawn (15a); a missed deadline stays shown and is explained (15b, §4) (Decision `2026-11-20-471`) | yes (≥2 trustees) — not yet signed | none yet |
| 2026-11-22 | (this commit) | Solo Builder (Story 12.5 code review) | no — the appendix's working list only: the partner-lead table, its decrypt site and partners as recipients; no step changed | no — ⚠ BigDev to confirm | none yet |
