// AuthAuditSink — the injectable audit seam for every privileged auth event
// (AC-9, Task 6.1).
//
// THE SEAM, NOT THE SINK. Story 1.8 exposed `onAuthorizationDenied` without
// building the sink; this is the symmetric move for the auth surface. The default
// implementation is a structured log line. The FR-47 tamper-evident hash-chain
// audit log + `events_log` writes + off-site mirror are **Story 1.10** (D-item →
// 1.10) — do NOT build hash chaining here (Reconciliation R4). Story 1.10 swaps a
// real sink in via dependency injection WITHOUT touching auth code.
//
// Events carry NO secret material: an OTP is referenced by `otp_hash`, never the
// code; a password is never logged; a session id is referenced, never its cookie.

/** The closed set of privileged auth events emitted to the sink. */
export type AuthAuditEventType =
  | 'login.success'
  | 'login.failure'
  | 'login.lockout'
  | 'login.logout'
  | 'passkey.enroll'
  | 'passkey.auth'
  | 'passkey.auth.failure'
  | 'recovery_code.consume'
  | 'recovery_code.failure'
  | 'password_reset.failure'
  | 'password_reset.request'
  | 'password_reset.consume'
  | 'step_up.send'
  | 'step_up.consume'
  | 'step_up.failure'
  | 'scope.change'
  | 'authz.denied'
  // ── Security-policy abuse signals (Story 1.14, §2.11 Layer-2) ────────────────
  // The taxonomy is becoming a general security-audit surface (it already carries
  // authz.denied + scope.change); a rename to SecurityAuditEventType is out of
  // scope (noted, not done — Story 1.14 Project Structure Notes).
  | 'rate_limit.exceeded'
  | 'abuse.honeypot'
  // ── Provisioning surface (Story 1.15, FR-61/FR-62) ───────────────────────────
  // The first global-scoped write surface. `pariwar.provisioned` records a new
  // Pariwar mint+passport-persist; `pariwar.deploy_triggered` records a Dokploy
  // build trigger via the deploy seam.
  | 'pariwar.provisioned'
  | 'pariwar.deploy_triggered'
  // ── Member mobile+OTP auth surface (Story 3.2, FR-1) ─────────────────────────
  // Member login/session/step-up/device events. EVERY context carries the otp_hash
  // (never the code) + masked mobile (last-4) only — never plaintext mobile, never a
  // token. The default sink is the Story 1.10 hash-chain (FR-47).
  | 'member_login.otp_send'
  | 'member_login.otp_consume'
  | 'member_login.failure'
  | 'member_session.refresh'
  | 'member_session.reuse_revoke'
  // Refresh rejected because the member's lifecycle state is withdrawn/anonymized
  // (PR-Patch-9): the login gate blocks such members, so a long-lived refresh chain
  // must too — the chain is revoked and this records it.
  | 'member_session.revoked'
  | 'member_session.logout'
  | 'member_step_up.send'
  | 'member_step_up.consume'
  | 'member_step_up.failure'
  | 'member_device.bound'
  | 'member_device.dropped'
  // ── Member first-signup creation surface (Story 3.6a, FR-1) ──────────────────
  // The signup-create endpoint that finally mints the member from the signup_continuation seam
  // (the FIRST production member.signup_initiated). Context carries masked-mobile (last-4) ONLY —
  // NEVER plaintext mobile, NEVER the continuation token / jti.
  //   created — a member was created (members row + member_identities + the full session issued).
  //   failure — a signup-create attempt was rejected (bad/expired/consumed continuation, mobile
  //             mismatch, duplicate member, or the default Pariwar is unconfigured).
  | 'member_signup.created'
  | 'member_signup.failure'
  // ── Member KYC signup surface (Story 3.3b, FR-2) ─────────────────────────────
  // KYC step events. Context carries masked-Aadhaar (last-4) + transaction_id ONLY —
  // NEVER name/dob/photo/raw Aadhaar, NEVER the OAuth code or PKCE code_verifier.
  //   initiate   — a DigiLocker pull was begun;
  //   verified   — the eAadhaar was verified+persisted (callback step);
  //   confirmed  — the member confirmed the shown DigiLocker profile (confirm step);
  //   manual     — a self-declared manual-fallback record was stored;
  //   failure    — a DigiLocker verification failure (routes the member to manual, AC2).
  | 'member_kyc.initiate'
  | 'member_kyc.verified'
  | 'member_kyc.confirmed'
  | 'member_kyc.manual'
  | 'member_kyc.failure'
  // Story 3.4 — signup nominee declaration. NON-PII context only (nominee_count + split);
  // NEVER nominee name/mobile/address. Emitted once per declare (and re-declare via 3.9).
  //   declared — 1–2 nominees were declared with a server-derived 75/25 (or sole) split.
  | 'member_nominees.declared'
  // Story 3.5 — signup medical disclosure. NON-PII context only (ima_list_version +
  // condition_count); NEVER the selected condition codes / free-text additional context.
  // Emitted once per submit (and re-submit via 3.9 — append-only history).
  //   disclosed — a medical disclosure + concealment-denial ack was recorded.
  | 'member_medical.disclosed'
  // Story 3.6a — signup T&C acceptance (the SECOND consent-registry consumer, copying 3.5's
  // audit-or-throw chain). NON-PII context (tc_version_id only); the legal body is public text.
  //   accepted — a tc_acceptance consent was recorded (fire-and-forget emitAuthAudit, after ok=true).
  // The compensating `member_terms.accept_rolled_back` (5xx) line is written DIRECTLY via
  // writeAuditEntry on a post-audit rollback (NOT via emitAuthAudit) — mirroring 3.5's
  // `member_medical.disclosure_rolled_back`, which is likewise absent from this emit-sink union.
  | 'member_terms.accepted'
  // ── Member signup ₹110 Vyawastha Shulk surface (Story 3.6b, FR-1 / AR-67) ─────
  // The signup-fee payment + the 5-condition lock-in entry gate. Context is NON-PII: masked UTR
  // (last-4) + amount only — NEVER a full UTR, NEVER a token. The reference-code capture (D2 port
  // seam) + the lock-in clock-start marker emit here too.
  //   intent   — a UPI Intent URL was built (the OS-level handoff seam).
  //   paid     — a receipt was persisted (the load-bearing confirm; AR-67 indefinite retention).
  //   failure  — a confirm/intent attempt was rejected (unconfigured VPA, terminal member, etc.).
  | 'member_vyawastha_shulk.intent'
  | 'member_vyawastha_shulk.paid'
  | 'member_vyawastha_shulk.failure'
  // Epic-8 pool contribution (Story 8.4) — the UPI Intent build + the UTR self-attestation (yellow pill).
  //   intent  — a server-authoritative upi://pay was built (context: masked/non-PII — amount_inr, account),
  //             OR the first-class no-VPA/unassigned fail-soft (context: reason). NO payee/UTR in context.
  //   attested— a contribution.utr-attested claim was recorded (context: MASKED utr last-4 + idempotent flag).
  //   failure — an intent/attest attempt was rejected (unassigned, not-live, bad-UTR, tr-mismatch).
  | 'member_contribution.intent'
  | 'member_contribution.attested'
  | 'member_contribution.failure'
  // Story 9.9 — the donor-facing nominee-accounts read occurred. Context: the account COUNT only,
  // NEVER the decrypted holder-name/account#/IFSC (AC6).
  | 'member_contribution.nominee_accounts_viewed'
  // Story 8.5 — the UPI Failure Coach anonymous failure-report. The member's SELF-CLASSIFIED failure mode
  // is the diagnostic signal, encoded ENTIRELY in the action NAME (one action per mode) — there is NO
  // context payload, NO free-text, NO UTR/tr/amount/VPA anywhere. `actorId = memberId` is the audit
  // SUBJECT (per platform audit conventions), NOT PII-in-the-log; "anonymous" refers to the failure detail,
  // not removal of the audit subject (D2/AC3). The no-free-text contract shape (@twt/contracts
  // ContributionFailureReportRequest, `.strict()`) is the load-bearing teeth for this decision.
  | 'member_contribution.failure_insufficient_balance'
  | 'member_contribution.failure_wrong_pin'
  | 'member_contribution.failure_app_issue'
  | 'member_contribution.failure_network_issue'
  | 'member_contribution.failure_other'
  // The Reference Code port-seam capture (D2/R5) — attribution_source stored; NO registry validation,
  // NO new lifecycle event (the 14-event member vocabulary is frozen). Context carries no PII.
  | 'member_attribution.captured'
  // The lock-in clock-start marker (member.lock_in_entered emitted) — context carries the FR-8
  // lock_in_days_at_join snapshot + the resolved lock_in_policy_version (both NON-PII).
  | 'member.lock_in_entered'
  // ── Member Life Events panel surface (Story 3.9, FR-5) ───────────────────────
  // Self-service address + posting updates (nominee + medical Life Events updates reuse the 3.4/3.5
  // audit lines above). Context is NON-PII: address carries a presence marker ONLY (NEVER the raw
  // address bytes); posting carries district (non-PII geographic) + is_retirement.
  //   address.updated — a new append-only member_addresses row was written + member.address_updated emitted.
  //   posting.updated — a new append-only member_postings row was written + member.posting_updated emitted.
  | 'member_life_events.address_updated'
  | 'member_life_events.posting_updated'
  // ── Member voluntary-withdrawal surface (Story 3.10, FR-6) ───────────────────
  // The withdrawal confirm (member.withdrawal_completed emitted → state withdrawn) + the signup
  // rejoin-lock block. Context is NON-PII: reason_code (bounded enum) + rejoin_permitted_at only —
  // NEVER the free-text reason_text (Tier-1, member_withdrawals only), NEVER a token. The actorId
  // carries the member_id; the rejoin-block line carries masked mobile (last-4) + rejoin_permitted_at.
  //   completed      — a withdrawal was confirmed (₹110 forfeited; 12-month rejoin lock written).
  //   rejoin_blocked — a same-identity signup was blocked inside the 12-month rejoin-lock window.
  | 'member_withdrawal.completed'
  | 'member_withdrawal.rejoin_blocked'
  // ── Member moderation surface, signup-guard half (Story 10.10, FR-56 → FR-6) ─
  // The rejoin-lock block for a CURRENTLY-terminated identity. Distinct from `member_withdrawal.
  // rejoin_blocked` above on purpose — a moderation termination is not voluntary and must not
  // masquerade as a withdrawal in any audit/reporting query keyed on the action name (Story 10.10
  // review). The three `member_moderation.{suspended,terminated,restored}` action-write lines live
  // in the separate Story 1.10 hash-chain sink (`audit.writeAuditEntry`), not here. Context is
  // NON-PII: masked mobile (last-4) + rejoin_permitted_at only, same shape as the withdrawal line.
  //   rejoin_blocked — a same-identity signup was blocked inside the moderation-termination 12-month
  //                    rejoin-lock window.
  | 'member_moderation.rejoin_blocked'
  // ── Member data-export surface (Story 3.11, FR-95 / DPDPA data-portability) ───
  // The export request + the one-time gated download. Context is NON-PII: export_id, member_id (the
  // actorId), status, byte size — NEVER any exported field value, NEVER the plaintext. The `.generated`
  // line is emitted by the apps/jobs build worker (via writeAuditEntry directly, not this sink); it is
  // listed here for taxonomy completeness.
  //   requested  — a member requested an export (pending row created + build job enqueued).
  //   generated  — the build worker finished the ZIP + stored it envelope-encrypted (jobs-side).
  //   downloaded — the one-time gated download streamed the ZIP (consumed_at stamped).
  | 'member_data_export.requested'
  | 'member_data_export.generated'
  | 'member_data_export.downloaded'
  // ── Member RTBF anonymization surface (Story 3.12, FR-96 / DPDPA Right-To-Be-Forgotten) ──────
  // The member-initiated RTBF confirm (member.rtbf_anonymized emitted → state anonymized; every
  // Tier-1 PII column field-level anonymized). Context is NON-PII: anonymized_at + anonymization_actor
  // (the member_id) ONLY — NEVER any cleared PII value, NEVER a token. The actorId carries the member_id.
  //   completed — RTBF anonymization was confirmed (soft-delete: member row + history retained,
  //               PII fields overwritten with the anonymized sentinel; mobile_blind_index retained).
  | 'member_rtbf.completed'
  // ── Member-app claim filing surface (Story 6.2, FR-37 / Epic 6) ──────────────
  // The Ravi-mode intake flow. Context is NON-PII throughout: the handover-OTP lines carry
  // the otp_hash HMAC correlation (never the code) + masked nominee mobile (last-4) ONLY —
  // NEVER the nominee's name/mobile/UPI/Aadhaar; the intake lines carry claim_case_id +
  // deceased_member_id + intake_channel + relationship ONLY — NEVER any claimant PII.
  //   handover_otp_send    — a handover-trust OTP was sent to the nominee's declared mobile.
  //   handover_otp_consume — a submitted handover-trust OTP verified (elevation recorded).
  //   handover_otp_failure — a wrong/expired/absent handover-trust OTP verify attempt.
  //   intake_initiated     — claim.intake_initiated appended → a new claim frozen the account.
  //   intake_idempotent    — a double-tap/retry returned the EXISTING claim (no second freeze).
  //   intake_failed        — the intake attempt threw (neither created nor an idempotent hit);
  //                          recorded so a failed account-freeze attempt is never audit-silent.
  | 'member_claim.handover_otp_send'
  | 'member_claim.handover_otp_consume'
  | 'member_claim.handover_otp_failure'
  | 'member_claim.intake_initiated'
  | 'member_claim.intake_idempotent'
  | 'member_claim.intake_failed'
  // ── Intake Convergence Point (ICP) surface (Story 6.4, AR-62 / Epic 6) ────────
  // A genuine cross-channel SECOND intake was recorded `pending` awaiting operator/trustee
  // resolution on the <ConvergenceDecisionStrip>. DISTINCT from intake_idempotent (a trivial
  // same-channel retry) — a pending cross-channel attempt is a reviewable event. Context is
  // NON-PII: claim_case_id + intake_attempt_id + deceased_member_id + intake_channel + actor.
  //   convergence_pending — a second-channel attempt awaits resolution (no second freeze).
  //   convergence_merged  — an operator confirmed convergence (channel unioned; NO lifecycle event).
  //   convergence_overridden — an operator treated the attempt as separate (a distinct claim minted).
  // `convergence_merged`/`convergence_overridden` are resolved from the shared admin console
  // (claims.convergence.handlers.ts), NOT from this member-app handler — but the resolved
  // attempt's ORIGINATING channel decides the prefix (Review Finding: the resolution endpoint
  // is channel-agnostic and must not mislabel a member-app-originated attempt as helpline_claim.*).
  | 'member_claim.convergence_pending'
  | 'member_claim.convergence_merged'
  | 'member_claim.convergence_overridden'
  // ── Death-certificate upload surface (Story 6.5, FR-38 / Epic 6) ──────────────
  // A death-certificate (or other doc-type) upload was accepted (202) → bytes stored + the OCR
  // parity job enqueued. NON-PII context: claim_case_id + claim_document_id + document_type +
  // intake_channel + the acting actor. NEVER the extracted identity fields (Tier-1).
  | 'member_claim.document_uploaded'
  // ── Bank-statement reconciliation upload surface (Story 9.3, FR-29 / Epic 9) ──
  // The nominee (member Ravi-mode) + staff (District-Admin takeover/fallback) upload lines for the
  // <BankStatementUpload> transport. NON-PII context throughout: pool_id + claim_case_id + bank_code +
  // outcome (parsed|fallback) + reason? + the acting actor + role. NEVER a raw statement row / UTR / any
  // Tier-1 field (those stay in the blob store; only the object key + counts persist as the event).
  //   statement_uploaded          — a raw statement landed + was stored (parsed or routed to fallback).
  //   fallback_requested          — the "Hum aapke liye padh lenge" manual-transcription task was raised.
  //   upload_rejected             — a dignified reject (too large / empty / bad bank / virus-quarantined).
  //   storage_unavailable         — an AR-45 storage/scanner outage degraded to retry-or-defer (never 500).
  | 'member_reconciliation.statement_uploaded'
  | 'member_reconciliation.fallback_requested'
  | 'member_reconciliation.upload_rejected'
  | 'member_reconciliation.storage_unavailable'
  | 'staff_reconciliation.statement_uploaded'
  | 'staff_reconciliation.fallback_requested'
  | 'staff_reconciliation.upload_rejected'
  | 'staff_reconciliation.storage_unavailable'
  // ── Member self-verify recovery screenshot upload (Story 9.7, FR-32 / Epic 9) ──
  // The member RECOVERY surface's upload. Context is NON-PII: pool_id + a machine reason token
  // (the mismatch reason, or `trouble_with_utr` for the FR-32 fallback) + the content_type —
  // NEVER the screenshot bytes, NEVER a UTR, NEVER free text ([[project_anonymous_diagnostic_log_convention]]).
  | 'member_self_verify.screenshot_uploaded'
  | 'member_self_verify.upload_rejected'
  | 'member_self_verify.storage_unavailable'
  // ── Helpline-mediated claim filing surface (Story 6.3, FR-37 / Epic 6) ────────
  // The operator-console (Priya-path) intake — the TWIN of the member-app lines above.
  // Context is NON-PII throughout: the intake lines carry claim_case_id + deceased_member_id
  // + intake_channel + relationship + lookup_method + the OPERATOR's id (the audit actor) —
  // NEVER caller/nominee PII. `lookup_method` (memberId | mobile | pariwar) is the search
  // dimension the operator used; it rides on the AUDIT context ONLY, never the domain payload.
  // Operator attribution is claim-scoped (events_log.actor_id = operator admin actor id + this
  // audit line); the fuller helpdesk operator-attribution model is Story 10.3.
  //   intake_initiated  — claim.intake_initiated appended → a new claim frozen the account.
  //   intake_idempotent — a convergence hit (prior app OR helpline claim) returned the EXISTING
  //                       claim (no second freeze) — the crude cross-channel dedup (RICH ICP = 6.4).
  //   intake_failed     — the intake attempt threw; recorded so a failed account-freeze attempt
  //                       is never audit-silent.
  //   readback_confirmed — the operator confirmed the identity read-back with the caller
  //                        (Review Finding — AC4's literal "read-back-confirm" audit line).
  //   escalated         — the operator escalated to a supervisor (AR-61, AC5). Audit-only; the
  //                        fuller Story 0.7 fallback-handler ledger is referenced, not
  //                        re-implemented here.
  | 'helpline_claim.intake_initiated'
  | 'helpline_claim.intake_idempotent'
  | 'helpline_claim.intake_failed'
  | 'helpline_claim.readback_confirmed'
  | 'helpline_claim.escalated'
  // Death-certificate operator upload-on-behalf accepted (Story 6.5) — TWIN of the member line.
  | 'helpline_claim.document_uploaded'
  // ── ICP convergence-resolution surface (Story 6.4, AR-62) ─────────────────────
  // The operator-console pending/merge/override lines (the <ConvergenceDecisionStrip>). Context
  // is NON-PII throughout: claim ids + intake_attempt_id + intake_channel(s) + the resolving
  // operator id + (override only) the audited reason. NEVER caller/nominee PII.
  | 'helpline_claim.convergence_pending'
  | 'helpline_claim.convergence_merged'
  | 'helpline_claim.convergence_overridden'
  // ── Ground-inspection admin surface (Story 6.7, FR-40 / Epic 6) ───────────────
  // The schedule/reschedule/findings/complete/refusal/photo verbs on a ground-inspection
  // ASSIGNMENT. Post-commit SINK lines (NOT a same-tx DB write — the durable record is the
  // events_log event for schedule/complete + the assignment row state). Context is NON-PII:
  // ground_inspection_id + claim_case_id + district + inspector_actor_id (+ override actor,
  // photo_count, disposition/refusal_reason) — NEVER the encrypted location/contact/notes/caption.
  | 'admin_ground_inspection.scheduled'
  | 'admin_ground_inspection.rescheduled'
  | 'admin_ground_inspection.findings_recorded'
  | 'admin_ground_inspection.photo_uploaded'
  | 'admin_ground_inspection.completed'
  | 'admin_ground_inspection.refused'
  // ── Claim-time nominee bank collection surface (Story 6.8, FR-37 / Epic 6) ────
  // The dual-account (#1/#2) disbursement-detail collection — member-app (Ravi-mode) + helpline
  // twin. Post-commit SINK lines (the durable record is the claim.nominee_bank_recorded event).
  // Context is NON-PII: claim_case_id + account_ranks_present + ifsc_validated + intake_channel +
  // the acting actor — NEVER the encrypted holder name / account number / IFSC.
  | 'member_claim.nominee_bank_recorded'
  | 'helpline_claim.nominee_bank_recorded'
  // ── Claim-time DPDPA consent surface (Story 6.9, FR-97 / UX-DR2) ──────────────
  // The three-checkbox granular consent capture + the AC3 revoke mechanism — member-app (Ravi-mode)
  // + helpline twin. Post-commit SINK lines (the durable record is the claim.dpdpa_consent_recorded
  // event + the consent_records rows/audit-or-throw chain). Context is NON-PII: claim_case_id +
  // consent_types_granted / consent_type + intake_channel — NEVER the checkbox text, locale, or any
  // subject identity beyond the claim id.
  | 'member_claim.dpdpa_consent_recorded'
  | 'helpline_claim.dpdpa_consent_recorded'
  | 'member_claim.dpdpa_consent_revoked'
  | 'helpline_claim.dpdpa_consent_revoked'
  // ── Verifier-console read surface (Story 6.10, FR-42 / UX-DR39 / Epic 6) ──────
  // The READ-ONLY bounded compound signals view for one claim. An AUDITED read (the
  // adminValidityRead precedent — a ₹50L-stakes decision-support surface leaves a trail of who
  // read which claim's signals). Context is NON-PII: claim_case_id + district + deceased_member_id —
  // NEVER a decrypted identity/extracted field, note, caption, or any signal payload.
  | 'admin_verifier_console.read'
  // ── Verifier adjudication surface (Story 6.11, FR-42 / UX-DR40 / Epic 6) ──────
  // The FIRST verifier WRITE — approve/deny/escalate/revise on the decision strip. Post-commit SINK
  // lines (the durable records are the claim.verifier_* event + the claim_verifier_decisions row).
  // Context is NON-PII: claim_case_id + district + outcome + reason_code + the acting actor — NEVER
  // the encrypted rationale (D-G — the rationale is never on an audit line, log, index, or filter).
  //   verifier_approved — a verifier approved the claim (→ verifier_approved).
  //   verifier_denied   — a verifier denied the claim (→ denied).
  //   verifier_escalated — a verifier escalated to the State Trustee (identity annotation; no state change).
  //   decision_revised  — a verifier revised a prior same-outcome decision (reason/rationale correction).
  //   decision_rejected — an approve/deny/escalate/revise attempt was rejected by a domain guard (state
  //     window, reason/outcome mismatch, revision conflict) — no event/row written; recorded so a failed
  //     adjudication attempt is still audited (AC10 — fail-closed, AND audited, not just fail-closed).
  | 'admin_claim.verifier_approved'
  | 'admin_claim.verifier_denied'
  | 'admin_claim.verifier_escalated'
  | 'admin_claim.decision_revised'
  | 'admin_claim.decision_rejected'
  // ── Shepherd assignment surface (Story 6.12, FR-41 / Epic 6) ──────────────────
  // The human-shepherd routing/attribution surface (a District Admin as the family's named contact).
  // Post-commit SINK lines (the durable records are the claim.shepherd_assigned event + the
  // claim_shepherd_assignments row). Context is NON-PII: claim_case_id + district + shepherd_actor_id +
  // previous_shepherd_actor_id + assignment_reason — NEVER the shepherd's name/phone/WhatsApp (AC8, D-G).
  //   shepherd_assigned   — a shepherd was assigned (the automatic first assignment, reason `initial`).
  //   shepherd_reassigned — a shepherd was reassigned (manual R6 `reassignment` or AR-61 `fallback`).
  | 'admin_claim.shepherd_assigned'
  | 'admin_claim.shepherd_reassigned'
  // ── State-Trustee cycle-freeze surface (Story 6.13, D-B / Epic 6) ──────────────
  // The FIRST state_trustee-facing surface (v1 actor = pariwar_admin-as-Trustee-Lite). Post-commit SINK
  // lines (the durable records are the claim.state_trustee_* / claim.approved / claim.verifier_* events +
  // the claim_state_trustee_decisions rows + the cycle_freeze_commits record). Context is NON-PII:
  // claim_case_id (or commit_id) + outcome/phase + reason_code — NEVER the rationale (D-G/AC10).
  //   vote      — a per-claim frozen vote (approve → state_trustee_approved / deny → denied).
  //   route     — a durable route-to-R9 exclusion (metadata only; no lifecycle change).
  //   escalation_resolved — a verifier escalation resolved to verifier_approved / denied.
  //   committed — the bulk claim.approved commit (the cycle-boundary milestone Epic 7 keys off).
  //   rejected  — a vote/route/resolve/commit attempt rejected by a domain guard (fail-closed AND audited).
  | 'admin_cycle_freeze.vote'
  | 'admin_cycle_freeze.route'
  | 'admin_cycle_freeze.escalation_resolved'
  | 'admin_cycle_freeze.committed'
  | 'admin_cycle_freeze.rejected'
  // Story 6.14 — the R9 special-case voting panel surface. Post-action SINK lines (the durable records are
  // the claim_r9_voting_sessions / claim_r9_votes rows + the finalize's claim.r9_outcome event + trustee
  // decision row). Context is NON-PII: claim_case_id + clause_id/outcome/counts + reason_code — NEVER the
  // per-vote rationale (AC10).
  //   open      — an R9 voting session opened (clause snapshot + immutable panel captured; metadata-only).
  //   vote      — a per-vote cast/revise (metadata-only).
  //   finalize  — the panel outcome finalized (the sole lifecycle-changer → claim.r9_outcome).
  //   cancel    — a session cancelled/corrected (session + votes superseded; routed_to_r9 stays live).
  //   rejected  — an open/vote/finalize/cancel attempt rejected by a domain guard (fail-closed AND audited).
  | 'admin_r9_voting.open'
  | 'admin_r9_voting.vote'
  | 'admin_r9_voting.finalize'
  | 'admin_r9_voting.cancel'
  | 'admin_r9_voting.rejected'
  // Story 6.15 — the verifier concealment-linkage assessment surface (the human-supplied
  // claim.concealed_ima_condition_linked fact). Post-action SINK line (the durable records are the
  // claim_concealment_assessments row + the claim.concealment_assessed identity event). Context is NON-PII:
  // claim_case_id + kind + actor — NEVER the optional Tier-1 note (D-G). The assessment flags/routes; it
  // never denies, so there is no approve/deny audit line here (the State Trustee decides at cycle-freeze).
  //   write     — a tri-state concealment assessment recorded/revised (metadata-only).
  //   rejected  — an assessment attempt rejected by a domain guard (fail-closed AND audited).
  | 'admin_concealment_assessment.write'
  | 'admin_concealment_assessment.rejected'
  // Story 6.16 — the internal 3-stage appeal surface (the LAST story of Epic 6). Post-action SINK lines
  // (the durable records are the claim_appeal_* rows + the claim.appeal_* events + the claim.reversed publish
  // hook). Context is NON-PII: claim_case_id + stage + decision/outcome + disposition_category + reason_code —
  // NEVER the Tier-1 rationale (AC10/D-G). `member_claim.appeal_initiated` is the claimant/operator initiate
  // line (AC1/AC7 — AR-61 on-behalf carries on_behalf:true).
  //   stage1     — a Stage-1 District-Admin review decision (reverse/advance).
  //   stage2_open/vote/finalize/cancel — the Stage-2 panel verbs.
  //   stage3     — a Stage-3 Trustee discretion decision (reverse/uphold-final).
  //   rejected   — any appeal write rejected by a domain guard (fail-closed AND audited).
  | 'member_claim.appeal_initiated'
  | 'admin_appeal.stage1'
  | 'admin_appeal.stage2_open'
  | 'admin_appeal.stage2_vote'
  | 'admin_appeal.stage2_finalize'
  | 'admin_appeal.stage2_cancel'
  | 'admin_appeal.stage3'
  | 'admin_appeal.rejected'
  // Story 7.5 — the per-Pariwar fixed-amount schedule surface (the FR-15 12-month-notice standard change +
  // the emergency adjustment override). Post-action SINK lines (the durable records are the
  // pool_fixed_amount_schedule row + the immutable pool_fixed_amount_emergency_attestations record). Context
  // is NON-PII: change_type + version + fixed_amount + effective_from, and (emergency) the panel roster ids +
  // documented_reason (policy/operational ONLY — never member-specific, D3, so it is safe in the audit line).
  //   schedule  — a standard (12-month-notice) fixed-amount change written.
  //   emergency — an emergency override written (schedule row + attestation, step-up-gated).
  //   rejected  — a schedule/emergency attempt rejected by a guard (fail-closed AND audited).
  | 'admin_pool_fixed_amount.schedule'
  | 'admin_pool_fixed_amount.emergency'
  | 'admin_pool_fixed_amount.rejected'
  // ── Reconciliation review queue surface (Story 9.8, FR-50 / Epic 9) ────────────
  // The trustee ADJUDICATION surface (v1 actor = pariwar_admin-as-Trustee-Lite / finance_officer). Each
  // action is step-up-gated + attributed (server-resolved display_name, fail-closed). Post-commit SINK
  // lines (the durable records are the contribution.confirmed / reconciliation.contribution-rejected /
  // reconciliation.confirmation-reversed events). Context is NON-PII: case_key + pool_id + member_id +
  // reason_code — NEVER the rationale / UTR-in-the-clear (D-G).
  //   read                 — an audited read of the queue / a case detail (the 6.10 audited-read precedent).
  //   confirmed            — the trustee confirmed a case (contribution.confirmed; the member greens).
  //   rejected             — the trustee rejected a case (reconciliation.contribution-rejected; case closed).
  //   recovery_facilitated — facilitate-recovery: an audited action only, NO outcome event (D7 — the case
  //     stays OPEN; the Story 7.6 no-silent-remap invariant).
  //   confirmation_reversed — review-and-reverse (reconciliation.confirmation-reversed; green→held, D3).
  //   action_rejected      — an action attempt rejected by a guard / step-up / display-name (fail-closed AND audited).
  | 'admin_reconciliation.read'
  | 'admin_reconciliation.confirmed'
  | 'admin_reconciliation.rejected'
  | 'admin_reconciliation.recovery_facilitated'
  | 'admin_reconciliation.confirmation_reversed'
  | 'admin_reconciliation.action_rejected';

export interface AuthAuditEvent {
  readonly type: AuthAuditEventType;
  /** The acting subject (user) id when known; null for pre-identification events. */
  readonly actorId: string | null;
  /** The active Pariwar when the event is scoped; null for global/pre-scope events. */
  readonly pariwarId?: string | null;
  /** Request correlation id (architecture §3.2). */
  readonly traceId?: string;
  /** Non-sensitive structured context (otp_hash, action_context, prev/new scope…). */
  readonly context?: Readonly<Record<string, unknown>>;
  /** Emission time; injectable clock keeps tests deterministic. */
  readonly at: Date;
}

export interface AuthAuditSink {
  emit(event: AuthAuditEvent): void;
}

/**
 * Default sink: a single structured `console.info` line tagged `[auth-audit]`.
 * Deliberately inert beyond logging — the real sink is Story 1.10. Never throws
 * (an audit-sink failure must not break the auth path); a sink that needs
 * durability guarantees is the 1.10 hash-chain's concern.
 */
export const consoleAuthAuditSink: AuthAuditSink = {
  emit(event: AuthAuditEvent): void {
    try {
      console.info(
        '[auth-audit]',
        JSON.stringify({
          type: event.type,
          actorId: event.actorId,
          pariwarId: event.pariwarId ?? null,
          traceId: event.traceId ?? null,
          at: event.at.toISOString(),
          ...(event.context ? { context: event.context } : {}),
        }),
      );
    } catch {
      // An audit log line must never take down the request path.
    }
  },
};
