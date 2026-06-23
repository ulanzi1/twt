# Runbook: Trustee Credential-Loss & Super-Admin Succession

> **Status:** draft (author-committed; **awaiting ≥2-trustee sign-off** per ledger) — discharges the gated follow-up of `.decision-log.md` Decision 2026-06-21-059 amendment A. **Required before production go-live; NOT yet sign-off-attested.**
> **Owner role:** Trustee Panel (governance owner) + Infrastructure on-call (execution; Solo Builder primary at v1, backup engineer per A-13 / Story 0.6)
> **Last material edit:** 2026-06-23 by BigDev (Solo Builder) — Trustee Panel amendments (§2.4 three-way separation of duties + §2.6 24-hour break-glass reconciliation); initial draft 2026-06-22
> **Architectural authority:** ADR-0009 (admin authentication — passkeys, recovery codes, step-up, identity tables, `mintEnrollmentToken`) · ADR-0008 (RBAC — Super Admin = the only `global`-scoped role) · `.decision-log.md` Decision 2026-06-21-059 amendment A (Super Admin governance model) + Decision 2026-06-12-045 · architecture §2.3–§2.7 (admin auth + RBAC) + §2.10 (sole-engineer credential restrictions) + §5.9 (credential rotation) + §5.10 (backup-engineer access posture) · Story 0.2 credential-escrow framework (`docs/escrow/`) · Story 0.6 backup engineer (`docs/backup-engineer/`)

This runbook governs recovery from **loss of an administrator's authentication credentials** and **succession of Super-Admin authority** when a holder departs (death, resignation, incapacity) or must be transferred/revoked. It exists because Super Admin is the apex of the admin trust chain (ADR-0008: the only `global`-scoped role, applied cross-Pariwar via `requireGlobalPermission`), and a botched recovery can either lock the trust out of its own platform or hand apex authority to the wrong party.

## Super-Admin governance invariants (non-negotiable — every procedure below preserves all four)

Per Decision 2026-06-21-059 amendment A:

1. **SA-1** — Super Admin manages ordinary admin accounts (Super Admin is the issuing authority for the recovery paths below; an ordinary admin never self-elevates).
2. **SA-2** — Super-Admin assignment requires **trustee approval** (every grant in §2.4/§2.5/§2.6 carries a recorded trustee approval — never an operator acting alone).
3. **SA-3** — **At least one active trustee must continuously hold Super-Admin access** (the continuity invariant — the spine of the **grant-before-revoke** discipline; never revoke the last trustee Super Admin).
4. **SA-4** — **No single non-trustee individual may be the sole holder of Super-Admin privileges** (the anti-capture invariant — a lone operator holding SA with no trustee co-holder is an incident, not a steady state).

> **Central safety discipline:** any change to the Super-Admin holder set is **grant-before-revoke** and is gated on a post-change re-check of SA-3 + SA-4 (§4). If a procedure cannot complete without transiently violating SA-3, **stop and escalate to §2.6** — do not proceed.

## 0. Scenario selector (triage first)

| Symptom | Section | Self-service? |
|---|---|---|
| Lost one passkey device; a second passkey **or** a live session still works | **§2.1** | Yes |
| Lost **all** passkeys; **recovery codes still available** | **§2.2** | Yes (password + recovery code) |
| Lost **all** passkeys **and** recovery codes exhausted — account locked out | **§2.3** | No — needs a functioning Super Admin |
| A Super-Admin holder has died / resigned / become incapacitated | **§2.4** | No — trustee-governed succession |
| Planned Super-Admin transfer or revocation (routine governance) | **§2.5** | No — trustee-approved |
| **No functioning Super Admin remains** (sole SA holder lost, or all SA holders simultaneously locked out) | **§2.6** | No — break-glass via escrow |

## 1. Prerequisites

- **Out-of-band identity verification is available.** Before issuing *any* recovery to a person (§2.2 step-up aside, and §2.3/§2.4/§2.6), the requester's identity is confirmed over a **pre-registered out-of-band channel** (the phone/email of record for that admin) **plus a second-person witness**. For a trustee, the witness is a co-trustee or the Trustee Panel chair on rota. **Policy point for trustee sign-off:** confirm the registered out-of-band channels and the witness rule. Social-engineering an enrollment link is the primary threat this runbook defends against.
- **Audit baseline intact.** The audit-log integrity check has passed within the operational window (`audit-log-integrity-verification.md`). Every action here is a privileged, audited event (ADR-0009 §8 taxonomy: `passkey.enroll`, `recovery_code.consume`, `scope.change`, `authz.denied`); a broken chain before recovery corrupts the trail of the recovery itself.
- **Holder register is current.** A trustee-accessible register records, at all times, **who holds Super Admin** and **which holders are trustees** (needed to evaluate SA-3 / SA-4). **Dependency:** see §Open dependencies — there is no automated SA-holder report at v1; the register is maintained manually until one ships.
- **For escrow-dependent paths (§2.6):** the relevant credential-escrow envelopes must be **sealed** and the ≥2-trustee quorum-open procedure rehearsed (`docs/escrow/sealing-procedure.md`, `escrow-ledger.md` dry-run log). At v1 several envelopes are `_not yet sealed_` — this is a **go-live gate** (§Open dependencies).
- **Admin-management surface.** ADR-0009 exposes `mintEnrollmentToken(deps, userId)` and `createAdminAccount(...)` for the ops/Super-Admin caller; the self-service admin **UI** for these is deferred (post-1.17 per ADR-0009). At v1, Super-Admin recovery actions run via the **operator/ops path** under audit + co-sign, not a console. Steps that assume the deferred UI are tagged `[deferred admin-UI — placeholder procedure]`.

## 2. Step-by-step procedure

### 2.1 Lost one passkey — a second factor still works (self-service)

Precondition: the admin can still authenticate (a second registered passkey, or a live full session).

1. **Authenticate** with the working passkey (or use the live session). ADR-0009 caps passkeys at **≤2 devices**, so a replacement usually requires freeing a slot first.
2. **Revoke the lost device.** Within the full session, remove the lost passkey credential (counter-regression protection already rejects a cloned authenticator, but an explicitly lost device must be revoked, not left enrolled). Emits `passkey.auth`/revocation audit. `[deferred admin-UI — placeholder procedure: at v1 the revoke runs via the ops path against \`webauthn_credentials\` for that \`user_id\`, co-signed + audited.]`
3. **Enroll the replacement passkey** via the **full-session enrollment path** (ADR-0009 §4: a passkey may be enrolled with an existing 2nd factor present). Emits `passkey.enroll`.
4. **If recovery codes were also consumed/low,** re-provision the 10 one-time recovery codes (returned once; stored SHA-256-hashed) and have the admin store them out-of-band.
5. **No Super-Admin involvement required** unless the admin *is* the sole Super Admin and the loss risks SA-3/SA-4 — if so, additionally run §4 invariant checks.

### 2.2 Lost all passkeys — recovery codes still available (self-service bootstrap)

Precondition: no working passkey, but the admin holds ≥1 unused recovery code.

1. **First factor:** authenticate with email + password (Argon2id+pepper, ADR-0009 §3).
2. **Second factor:** consume **one recovery code** in place of a passkey (ADR-0009 §4: single-use burn, SHA-256-hashed). Emits `recovery_code.consume`. This yields a full session.
3. **Enroll a fresh passkey** via the full-session enrollment path (§2.1 step 3). Restore the ≤2-device set as needed.
4. **Re-provision recovery codes** (the consumed code is burned; if the set is now low/exhausted, mint a new set of 10). Store out-of-band.
5. **Forbidden:** do NOT route this through a Super-Admin enrollment link (§2.3) while a valid recovery code exists — the self-service path is lower-risk and leaves the Super-Admin issuance path uncluttered.

### 2.3 Account lockout — all passkeys lost AND recovery codes exhausted

Precondition: the admin has **no passkey and no recovery code**. Password alone never grants enrollment (ADR-0009 §4). Recovery requires a **functioning Super Admin** to issue a single-use out-of-band enrollment link.

> If the locked-out person **is** the sole/only-trustee Super Admin → **do not use this section; go to §2.6.**

1. **Verify identity out-of-band** (§1) — pre-registered channel + witness. This is the human gate; record it.
2. **Super Admin confirms eligibility:** the enrollment link is honoured by the server **only while the target user has 0 passkeys** (ADR-0009 §4 bootstrap window). The Super Admin therefore **revokes any residual passkey credentials** for the target `user_id` so the count is 0. `[deferred admin-UI — placeholder procedure: ops-path delete against \`webauthn_credentials\`, co-signed + audited.]`
3. **Super Admin mints the enrollment link:** `mintEnrollmentToken(deps, userId)` (ADR-0009 §4 — an ops/Super-Admin path, **not** a public route; protected by `requireGlobalPermission`). The token is a signed single-use HMAC link.
4. **Deliver the link out-of-band** to the verified channel from step 1 (never in-band; never logged in plaintext).
5. **Target enrolls** a fresh passkey via the link (bootstrap window), and is issued **10 new recovery codes** (returned once). Emits `passkey.enroll`.
6. **Audit + close:** confirm `passkey.enroll` for the target is in the audit log with the issuing Super Admin recorded; record the out-of-band verification in the recovery log.

### 2.4 Super-Admin holder death · resignation · incapacity (succession)

Precondition: a person who **holds Super Admin** is permanently unavailable. Goal: install the successor **before** removing the departed holder (SA-3), under recorded trustee approval (SA-2).

> **Separation of duties (Trustee Panel directive, 2026-06-23).** No single individual may **simultaneously** (1) **approve** a Super-Admin grant, (2) **execute** the grant, and (3) **verify** its completion. These three roles are held by **three distinct individuals** for every grant in this section — e.g., the Trustee Panel approves (SA-2), Infrastructure on-call executes, and a second trustee or independent party verifies (§4). The three named roles are recorded in the recovery log for each grant. (Enforced as a forbidden action in §3 and a verification check in §4.)

1. **Establish the governance fact.** Obtain the out-of-band proof appropriate to the cause: **death** → death certificate; **incapacity** → medical certification; **resignation** → trustee/board resolution. Per the trust deed and Story 0.13 legal counsel where the cause has legal weight. **Policy point for sign-off:** confirm the proof standard per cause.
2. **Confirm the post-departure invariant state.** Using the holder register (§1), determine whether removing the departed holder would breach **SA-3** (no active trustee left holding SA) or **SA-4** (a lone non-trustee left as sole holder). If either would breach → the successor grant in step 3 is **mandatory and blocking** before step 4.
3. **Grant Super Admin to the successor (grant-before-revoke).** With **≥2-trustee approval recorded** (SA-2): if the successor has no admin account, create one (`createAdminAccount`) and bootstrap their factors via §2.3; then assign the **`global`-scoped Super-Admin grant** to the successor's `users.id`. The Super-Admin role definition is the seed authority (`seedRoles()` / `rbac-seed-reset.md`); the grant is the per-user assignment in `role_grants`. Emits `scope.change`. `[deferred admin-UI — placeholder procedure: at v1 the grant is applied via the ops path against \`role_grants\` (global scope) for the successor's \`user_id\`, ≥2-trustee-approved + co-signed + audited.]`
4. **Revoke the departed holder.** Only after step 3 verification (§4) confirms SA-3 + SA-4 hold **with the successor in place**: revoke the departed holder's Super-Admin grant, disable their `admin_credentials`, revoke their `webauthn_credentials`, and destroy their live `admin_sessions`. Emits `scope.change` + session-revocation audit.
5. **Update the holder register** and record the succession in the recovery log + a `.decision-log.md` successor entry (trustee governance action).

### 2.5 Super-Admin transfer / revocation (routine governance)

For planned changes that are not a loss event. Same spine: **grant-before-revoke**, **trustee-approved**, **invariant-checked**.

- **Transfer (A → B):** (1) ≥2-trustee approval recorded (SA-2); (2) ensure B has a hardened admin account (factors per §2.1–§2.3); (3) **grant** B the `global` Super-Admin role; (4) run §4 invariant checks **with both A and B holding**; (5) only then **revoke** A. Never revoke A first.
- **Revocation (remove a holder):** (1) ≥2-trustee approval recorded; (2) **before** revoking, verify the holder is **not** the last trustee Super Admin (SA-3) and that revocation leaves **no lone non-trustee sole holder** (SA-4); (3) if either check fails, **first** grant a qualifying trustee Super Admin (§2.4 step 3), then revoke; (4) revoke grant + disable credentials + destroy sessions; (5) update register + audit.

### 2.6 Break-glass — no functioning Super Admin remains (catastrophic)

Trigger: the **sole** Super Admin is lost, **or all** Super-Admin holders are simultaneously locked out, so no one can mint an enrollment link (§2.3) or grant Super Admin (§2.4). The in-band trust chain is broken; recovery comes from **out-of-band escrow under trustee quorum**, not from the application.

1. **Declare the incident.** P0; notify the Trustee Panel chair on rota. If Solo Builder is also unreachable, this overlaps the bus-factor / degradation path (`on-call-playbook.md` §3; degradation policy Story 0.4 ≥2-trustee activation).
2. **Open the credential escrow under ≥2-trustee quorum-open** (Story 0.2; `docs/escrow/sealing-procedure.md` reverse path; record in `escrow-ledger.md` quorum-open log). The relevant envelopes are the **database-access recovery** envelopes — `cloud-sql-iam-recovery-grant` + `cloud-sql-service-account-prod` (`docs/escrow/credential-inventory.md`) — which hold the IAM-grant procedure to reach the DB **without** any operational engineer's day-to-day access (architecture §2.10).
3. **Engage the backup engineer if needed** (Story 0.6; `backup-engineer-access-credentials`): read-only by default, **write/admin requires per-action trustee approval** (architecture §5.10). The backup engineer executes the technical step under trustee oversight; trustees hold the authority.
4. **Re-establish a trustee Super Admin at the data layer.** Under quorum + audit: restore/insert the **`global`-scoped Super-Admin grant** in `role_grants` for a verified trustee's `users.id` (seed authority per `rbac-seed-reset.md`), then bootstrap that trustee's factors via §2.3 (`mintEnrollmentToken` now works again once a Super Admin exists). This re-arms the in-band chain.
5. **Return to in-band procedures.** With one trustee Super Admin restored, run §2.4/§2.5 to rebuild the holder set to satisfy SA-3 + SA-4 (≥1 trustee, no lone non-trustee, ideally ≥2 holders).
6. **Record** the break-glass open + every data-layer write in `escrow-ledger.md` + a `.decision-log.md` entry; **re-seal** the escrow envelopes afterward (re-seal-post-open).
7. **Reconcile within 24 hours (Trustee Panel directive, 2026-06-23).** All direct database modifications performed under break-glass recovery must be **independently reviewed and reconciled against application-level records within 24 hours of restoration** — the reviewer is not the person who executed the writes (separation of duties). The reconciliation confirms every data-layer write maps to an intended, authorised effect and that no unintended row was changed; discrepancies escalate per §5 as a P0 security incident. Record the reconciliation outcome in `escrow-ledger.md` + the `.decision-log.md` break-glass entry. (Enforced as a verification check in §4.)

## 3. Rollback / failure-mode procedure

- **Grant-before-revoke failed midway (successor grant did not take, departed holder already revoked).** This is the dangerous state — potential SA-3 breach. **Immediately** re-grant a verified trustee Super Admin (restore from the holder register / §2.6 if no SA can act). Do not leave the system below one trustee Super Admin.
- **Enrollment link suspected compromised / sent to the wrong channel.** The token is single-use and only valid while the target has 0 passkeys; **invalidate** it by either having the legitimate target consume it immediately under supervision, or enrolling-then-revoking to close the bootstrap window, then re-issue per §2.3 to the re-verified channel. Audit the incident.
- **Recovery executed for an unverified requester (social-engineering suspected).** Treat as a P0 security incident: revoke the just-issued credentials + grant, destroy sessions, audit-review the issuing Super Admin's recent actions, engage Story 0.13 legal counsel if a breach is plausible.

### Forbidden actions

- ❌ **Revoke-before-grant** on any Super-Admin change. Always grant the successor first (SA-3).
- ❌ Revoke the **last trustee** Super Admin. There is no valid procedure that leaves zero trustee Super Admins.
- ❌ Leave a **lone non-trustee** as sole Super Admin (SA-4) as a steady state — restore a trustee SA immediately.
- ❌ Issue an enrollment link or grant Super Admin **without** out-of-band identity verification (§1) and recorded **trustee approval** (SA-2).
- ❌ Allow a **single individual** to approve, execute, **and** verify the same Super-Admin grant (§2.4 separation of duties). These three roles are always three distinct people.
- ❌ Deliver an enrollment link or recovery codes **in-band** or in any logged/plaintext channel.
- ❌ Bypass audit emission. Every action here must produce its ADR-0009 §8 audit event; bypass invalidates the recovery's provenance and the bus-factor posture.
- ❌ Open the credential escrow without the **≥2-trustee quorum** (Story 0.2), or skip the **re-seal** after a break-glass open.
- ❌ Use the §2.3 Super-Admin enrollment path while a valid **recovery code** still exists (use §2.2).

## 4. Verification checks

Run after **every** procedure that changes the admin/SA holder set:

- [ ] **SA-3 holds:** ≥1 **active trustee** holds a `global` Super-Admin grant (query the holder register / `role_grants` global-scope rows; cross-check trustee status).
- [ ] **SA-4 holds:** no single non-trustee is the **sole** Super-Admin holder (if any non-trustee holds SA, ≥1 trustee also holds it).
- [ ] **Grant-before-revoke honoured:** for transfers/succession, the successor's grant audit event (`scope.change`) **precedes** the departed holder's revocation event.
- [ ] **Trustee approval recorded** (SA-2) for every Super-Admin grant/revoke in this run.
- [ ] **Separation of duties honoured** (§2.4 succession): the individuals who **approved**, **executed**, and **verified** the Super-Admin grant are three distinct people, named in the recovery log.
- [ ] **Recovery is auditable:** the expected ADR-0009 §8 events are present (`passkey.enroll` / `recovery_code.consume` / `scope.change`) with the issuing Super Admin and the out-of-band verification recorded.
- [ ] **Departed holder fully de-authorised** (§2.4/§2.5): grant revoked, `admin_credentials` disabled, `webauthn_credentials` removed, live `admin_sessions` destroyed.
- [ ] **Bootstrap window closed:** any enrollment link issued is consumed or invalidated; the target now has ≥1 passkey and a fresh recovery-code set.
- [ ] **Escrow re-sealed** (§2.6 only): `escrow-ledger.md` shows a re-seal-post-open event for every opened envelope.
- [ ] **Break-glass reconciliation complete** (§2.6 only): every direct database modification has been independently reviewed (by someone other than the executor) and reconciled against application-level records **within 24 hours of restoration**, with the outcome recorded.
- [ ] **Admin login works** end-to-end for the recovered/incoming holder (passkey + step-up OTP per ADR-0009).

If any check fails, do not declare success; escalate per §5.

## 5. Contact escalation list

Roles, not individuals where possible; specific contacts live in operations policy.

- **Governance owner (all Super-Admin grants/revocations + succession):** Trustee Panel (≥2-trustee approval for SA changes — SA-2).
- **Execution (recovery / ops path):** Infrastructure on-call (Solo Builder primary at v1; backup engineer per A-13 / Story 0.6).
- **Out-of-band identity verification witness:** co-trustee or Trustee Panel chair on rota.
- **Break-glass / escrow quorum (§2.6):** Trustee Panel chair on rota + a second trustee (≥2 to quorum-open per Story 0.2).
- **Suspected social-engineering / mis-issued credential (P0 security):** Trustee Panel chair + Story 0.13 legal counsel (when engaged) + Audit-mirror integrity-check on-call.
- **Solo Builder also unreachable (bus-factor):** degradation policy Story 0.4 ≥2-trustee activation (`on-call-playbook.md` §3).

## Open dependencies / gaps (recorded, not closed — per `.decision-log.md` Decision 2026-06-21-059 + closure-language discipline)

- **No dedicated Super-Admin recovery escrow envelope exists yet.** §2.6 currently bottoms out at the **DB-access** recovery envelopes (`cloud-sql-iam-recovery-grant` / `cloud-sql-service-account-prod`) + re-granting at the data layer. **Recommendation:** add a purpose-built `super-admin-bootstrap-recovery` envelope to `docs/escrow/credential-inventory.md` (holding the SA re-grant + trustee-bootstrap procedure), so the apex-authority recovery is a first-class, rehearsed envelope rather than a derivation from DB access. Trustee decision required.
- **Escrow envelopes are `_not yet sealed_` at v1.** The §2.6 path is only operational once the relevant envelopes are sealed and ≥1 dry-run per envelope-class has run (`escrow-ledger.md`). **This is part of the production go-live gate.**
- **Admin-management UI is deferred** (post-1.17 per ADR-0009). All `[deferred admin-UI — placeholder procedure]` steps run via the ops/DB path under co-sign + audit until the console ships; the placeholders are replaced then.
- **No automated SA-holder report at v1.** SA-3 / SA-4 are evaluated against a manually-maintained holder register. **Recommendation:** ship a trustee-facing "who holds Super Admin (and which are trustees)" report so §4 is a query, not a manual reconciliation.
- **OQ-3 seed-matrix amendments** (Decision 2026-06-21-059 amendment B) are a separate gated pre-production-seed follow-up; the Super-Admin role definition consumed here assumes the ratified catalogue.

---

## Changelog

| Date | git SHA | Author | Material edit? | Re-sign required? | Ledger entry |
|---|---|---|---|---|---|
| 2026-06-23 | _draft_ | BigDev (Solo Builder) | yes — Trustee Panel amendments | yes (≥2 trustees) | _pending sign-off — incorporates Trustee Panel recommendations: §2.4 three-way separation of duties (approve / execute / verify) + §2.6 24-hour independent break-glass reconciliation_ |
| 2026-06-22 | _initial_ | BigDev (Solo Builder) | initial | yes (≥2 trustees) | _pending — discharges Decision 2026-06-21-059 amendment A on ≥2-trustee sign-off_ |
