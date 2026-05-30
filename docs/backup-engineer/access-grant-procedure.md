# Access-Grant Procedure — Backup Engineer

> **Status:** drafted
> **Owner role:** Solo Builder (routine grant provisioning + revocation execution); Trustee Panel chair (grant authorization + revocation authorization); Legal Counsel per Story 0.13 (NDA / contract-related grant disputes); Backup Engineer (grant recipient, NOT self-modifier per scope-of-work §5 exclusion 8)
> **Architectural authority:** architecture §5.10 (backup engineer access posture — read-only default; write/admin per-action approval; break-glass path; credential rotation cadence; activity audit-logged); architecture §5.4 (lines 3074-3082 — WIF trust-relationship recovery; Secondary IAM-admin role to ≥3 principals; promotion-approver backup ≥2 principals); architecture §3078-3082; architecture §2.10a (audit-mirror separation); architecture §5.9 (high-sensitivity tier separation); architecture Cross-Cutting #2 (audit-line emission); AR-67

---

> **Structural-invariant block.** This procedure commits the **property** (read-only default; write/admin per-action approval; revocation-first discipline). Specific IAM commands, GCP project IDs, GitHub team names, role IDs, and any credential-material are **operations-policy territory + escrow-handled out-of-band** per the Story 0.4 + Story 0.5 structural invariant against secret-leakage. They are NOT inlined here. Inlined credentials in this procedure would be a framework violation — refactor to operations-policy reference + `../escrow/credential-inventory.md` envelope reference.

---

## §1. Prerequisites

Preconditions that must hold before the procedure begins. Cite framework + architecture for non-obvious prerequisites.

- **Signed contract on file** per `contract-template.md` §12 ratification path (Story 0.6 Task 10 closure).
- **Named engineer recorded in `engineer-roster.md`** with status `contracted-not-onboarded` or beyond.
- **NDA executed and on file with legal counsel** per contract §6 + Story 0.13 NDA template return.
- **Trustee authorization to provision the IAM grant** recorded in `.decision-log.md` Decision 2026-05-30-006 (or supersession thereof per the contract-signature `[CONTINUITY]` entry per Task 10).
- **Solo Builder reachable** to execute the grant actions (if Solo Builder unreachable, trustee quorum-open per Story 0.2 is required; this is itself a bus-factor scenario which contradicts the prerequisite — escalate per §5). **GitHub grant gap:** the trustee quorum-open path covers GCP IAM admin actions only; GitHub repo and team membership grants require Solo Builder's GitHub account specifically. If Solo Builder is unreachable, GitHub grants cannot be provisioned via a trustee-only path. In this scenario GitHub grant provisioning must be deferred until Solo Builder is reachable, OR until a Story 0.3 ADR establishes a trustee-held GitHub admin path. Record the deferral as a gap-list row in `backup-engineer-ledger.md`.
- **GCP IAM admin authority** for the trust's prod + staging + dev + audit-mirror projects (Solo Builder holds this at v1; the grant of Secondary IAM-admin role to the backup engineer per §2(c) is itself the architectural property being established).
- **GitHub org admin authority** for the trust's primary repo + the mirror destination per Story 0.3 (Solo Builder holds for primary; mirror destination admin per Story 0.3 Decision 003 Open Follow-up #1 ADR).

`[deferred ADR — placeholder procedure]` The activation-paging surface integration (which paging SaaS routes activation requests) is deferred per architecture §5.10 (operations-policy + ADR territory). Until the ADR lands, the interim is: paging via Trustee Panel chair direct contact + on-call playbook §5 escalation list; the prerequisite "paging surface configured" is `not-applicable` at v1 + flagged for future revisit.

## §2. Step-by-step access grant

Executed in order. Each step is concrete enough that Solo Builder (or trustee-authorized substitute under bus-factor) can execute without judgment calls.

### 2.1 GitHub primary repo read-access

1. Solo Builder verifies the named engineer's GitHub identity (username + organization-membership confirmation) per the technical-fit assessment outcome recorded in `engineer-roster.md`.
2. Solo Builder adds the engineer to the trust's GitHub team with **read-only** scope on the primary repo + read-only scope on the relevant `docs/` directories.
3. Solo Builder verifies the team-membership took effect via the engineer's confirmed clone of the repo (the engineer reports successful `git clone` execution to the trustee facilitator during onboarding session segment (b)).
4. Solo Builder records the grant date + GitHub team membership reference in `engineer-roster.md` `iam_grant_status` column.

`[deferred ADR — placeholder procedure]` The specific GitHub team name + role ID are operations-policy territory; not inlined here. Operations-policy ADR slot tracked in `../knowledge-transfer/adr-index.md` Section H.

### 2.2 GitHub mirror destination read-access

1. Trustee Panel chair (or delegated trustee with mirror-destination admin authority per Story 0.3 Task 7 ADR) verifies the named engineer's identity on the mirror destination platform.
2. Trustee adds the engineer to the mirror destination's access-list with **read-only** scope.
3. Trustee verifies the access took effect via engineer-reported successful clone from the mirror.
4. Trustee records the grant date + mirror destination access reference in `engineer-roster.md` `iam_grant_status` column.

**Note:** This step is `pending-prerequisite` until Story 0.3 Tasks 7-11 close (mirror destination ratified + ≥2-trustee read-access verified). Before that, the mirror does not exist as an accessible destination.

### 2.3 GCP IAM Secondary admin role

1. Solo Builder verifies the named engineer's Google Cloud identity (the engineer's Google Workspace email or GCP-IAM-compatible identity per the engineer's technical setup).
2. Solo Builder grants the **GCP IAM Secondary admin role** to the engineer per architecture §3078-3082 ("Secondary IAM-admin role granted to ≥3 principals — Solo Builder + backup engineer per A-13 + one trustee with engineering capability"). The role scope is per architecture §5.10 backup-engineer access posture: read-only default for daily-ops, with write/admin requiring per-action approval.
3. Solo Builder verifies the grant took effect via the engineer's confirmed ability to read GCP project metadata (project list query) without ability to perform write operations.
4. Solo Builder records the grant date + GCP project list (which projects the grant covers) + role reference in `engineer-roster.md` `iam_grant_status` column.

`[deferred ADR — placeholder procedure]` The specific GCP role ID (e.g., a custom role with specific permissions, or a stock Google role with conditions) is operations-policy + IAM-mechanism-ADR territory; not inlined here. Operations-policy ADR slot tracked in `../knowledge-transfer/adr-index.md` Section H. Until the ADR lands, the interim is: Solo Builder grants the closest stock Google role matching the read-only-default property (e.g., `roles/viewer` or equivalent) + records the role choice in `engineer-roster.md` Notes column for future operations-policy normalization.

### 2.4 Framework-document read-access

1. Already in place via Step 2.1 (GitHub primary repo read-access grants visibility to all `docs/` directories — `docs/knowledge-transfer/` + `docs/runbooks/` + `docs/escrow/` framework READMEs + `docs/escrow/code-escrow/` + `docs/degradation-policy/` + `docs/adr/` + this `docs/backup-engineer/`).
2. No additional grant step required; the framework documents are repo-resident.

**Exclusion:** the engineer does **NOT** have read-access to the sealed credentials themselves (`docs/escrow/` envelope contents). The framework documents (READMEs, ledgers, procedures) are readable; the envelope contents (the actual credential material) are sealed per Story 0.2 sealing-procedure and accessible only through trustee quorum-open per Story 0.2 + bus-factor activation per §2 + Story 0.6 activation-procedure §2.3.

### 2.5 Planning-artifact read-access

1. Already in place via Step 2.1 (GitHub primary repo read-access grants visibility to `_bmad-output/planning-artifacts/` — architecture.md + epics.md + PRD shards + UX spec + sprint-change-proposals).
2. No additional grant step required.

### 2.6 Audit-mirror project access — DEFERRED

The audit-mirror project (`twt-audit-mirror-prod` per architecture §5.5) is structurally separate from the prod environment per §2.10a. The engineer does NOT receive routine access to the audit-mirror project at IAM grant time.

**Activation path:** bus-factor activation per `activation-procedure.md` §2.3 + trustee co-sign per scope-of-work §3 + Story 0.2 sealing-procedure §1 audit-mirror credential retrieval; the trustee + the engineer jointly retrieve the audit-mirror credentials from the escrow envelope; the audit-mirror access is **per-activation-event scoped**, not a persistent grant.

This is the **Story 0.2 review Decision 3 structural fix**: the engineer is the non-Solo-Builder principal that the §2.10a structural fix requires; the operational principal availability (Tasks 8-10 closure) is what flips the audit-mirror-credential rows from three-blocker to two-blocker per `../escrow/credential-inventory.md` rows 87-88.

### 2.7 Write/admin grants — PER-ACTION ONLY

No persistent write/admin grant is provisioned at Step 2.1-2.5. Per architecture §5.10:

- **Daily-ops:** read-only; no write/admin.
- **Surge:** per-action write/admin scoped per Solo Builder co-sign per scope-of-work §2 — granted at action time, revoked at action completion.
- **Bus-factor:** per-action write/admin requires per-action trustee approval per scope-of-work §3 + break-glass path with audit + paging per architecture §5.10.

The per-action grant + revocation mechanism is operations-policy territory per `README.md` §8 deferred-ADR slot 3 (per-action trustee co-sign mechanism). Until the ADR lands, the interim is: written `.decision-log.md` `[CONTINUITY]` entry per write/admin action citing trustee approver + action + timestamp + post-action audit-line reference (per scope-of-work §3 audit-line emission obligation).

`[deferred ADR — placeholder procedure]` The specific per-action write/admin co-sign mechanism (signed offline-approval token vs. real-time MFA-style co-sign vs. workflow-mediated approval) is operations-policy + ADR territory; not defined here. ADR slot tracked in `../knowledge-transfer/adr-index.md` Section H (per-action-trustee-co-sign-mechanism slot).

## §3. Rollback / revocation procedure

What to do if the grant must be revoked (contract termination, breach, trustee-directed revocation, end-of-engagement).

**Order is intentional — revoke first, audit-log emission, then notify** (revocation precedes courtesy notification per the §2.10 + Cross-Cutting #2 audit discipline; this is the standard separation-of-duties pattern).

### 3.1 Trustee-initiated revocation (contract termination, breach, end-of-engagement)

1. **Trustee Panel records revocation authorization** in `.decision-log.md` `[CONTINUITY]` entry per the Story 0.1 + 0.2 + 0.3 + 0.4 + 0.5 + 0.6 supersession schema. Authorization cites: termination type (per contract §10 trigger taxonomy); effective date; access-scope-to-revoke (full revocation vs. partial revocation if scope-narrowing rather than termination). **For immediate for-cause termination specifically:** before recording this authorization, the Trustee Panel MUST assess in-flight surge scope per contract §10 — if a surge engagement is in progress, the panel decides whether to grant a bounded completion window or halt immediately, and records that decision in the same `.decision-log.md` entry. The authorization entry MUST precede execution of step 2.
2. **Solo Builder executes revocation** (or trustee-authorized substitute if Solo Builder unreachable):
   - GitHub team membership removal (primary repo + mirror destination);
   - GCP IAM Secondary admin role removal;
   - Audit-line emission per Cross-Cutting #2 (`{action_class: "iam_grant_revocation", revoked_principal, revoking_actor, authorization_reference, scope}`);
   - `engineer-roster.md` row status flip to `terminated` (forbidden-removal rule applies — row never deleted; supersession marker recorded);
   - `engineer-roster.md` `iam_grant_status` column flip to `revoked` with revocation date.
3. **Engineer notification** sent post-revocation by Trustee Panel chair (not by Solo Builder; trustee handles the courtesy notification to honor the contract §10 termination disposition).
4. **Backup-engineer-ledger.md "Activation event log" entry** recorded with: revocation date + revoking trustee + revocation reason + audit-line reference.

**If Solo Builder becomes unreachable after Trustee Panel authorizes revocation (step 1) but before execution completes (step 2):** route to §3.3 (bus-factor scenario revocation) for the remaining steps. The trustee authorization from step 1 remains valid and carries through the §3.3 substitute-executor path. See also §3.3.

### 3.2 Engineer-initiated termination (mid-contract)

1. **Engineer submits termination notice** per contract §5 (60-day notice for routine; immediate for trust non-payment or scope expansion per contract §10).
2. **Trustee Panel acknowledges + ratifies** the notice in `.decision-log.md` `[CONTINUITY]` entry.
3. **Notice-period work continues under all engagement modes unchanged** — read-only daily-ops, surge engagement, and bus-factor activation (if triggered during the notice period) all proceed per the normal engagement-mode disciplines. Access posture is unaltered for the full notice period. No access restriction is placed on the engineer upon giving notice; the full mode-set continues until the notice period ends and revocation executes per step 4.
4. **At notice-period end, Solo Builder executes revocation per §3.1 steps 2-4** with revocation authorization from the Trustee Panel acknowledgment entry.

### 3.3 Bus-factor scenario revocation (Solo Builder unreachable; engineer-self-modify forbidden)

Under bus-factor scenario where the engineer's revocation is needed but Solo Builder is unreachable:

1. **Trustee Panel quorum-open per Story 0.2** unsealable the GCP IAM admin credentials (per Story 0.2 sealing-procedure §1 + the §2.10a structural fix per Story 0.2 review Decision 3).
2. **Trustee-authorized substitute engineer** (per Story 0.1 AC-4 path 2 substitute-engineer model) executes the GCP IAM admin actions to remove the backup engineer's Secondary admin role + GitHub team membership.
3. **Audit-line emission + ledger entry** per §3.1 steps 2-4.
4. **The substitute engineer's own access is revoked** post-revocation-of-the-backup-engineer per the substitute-engineer authorization scope (per Story 0.1 AC-4 path 2 default: substitute access is per-event scoped, not persistent).

`[deferred ADR — placeholder procedure]` The specific quorum-open mechanism for GCP IAM admin credentials is operations-policy territory; tracked in `../knowledge-transfer/adr-index.md` Section H.

## §4. Verification checks

Observable post-conditions that prove the operation succeeded. Each check returns a deterministic pass/fail signal.

- [ ] **GCP IAM grant active** — `gcloud iam policies get` against the project list returns the engineer's principal as Secondary admin with read-only effective permissions; verification artifact attached to `engineer-roster.md` `iam_grant_status` evidence column. _(Specific gcloud command + project IDs are operations-policy territory not inlined; the property "engineer's principal returns as Secondary admin with read-only effective permissions" is the verification check.)_
- [ ] **GitHub team membership active** — engineer can clone the primary repo + (post-Story-0.3-Tasks-7-11-closure) the mirror destination.
- [ ] **KT pack read-access verified** — engineer reports successful clone + read of `docs/knowledge-transfer/` to the trustee facilitator during onboarding segment (b) per `onboarding-checklist.md` §2(b).
- [ ] **On-call playbook walked through** — engineer reports successful walkthrough of `docs/knowledge-transfer/on-call-playbook.md` 13 incident classes per `onboarding-checklist.md` §2(e).
- [ ] **Write/admin grant absent** — verification that the secondary admin role does NOT include write/admin scopes per architecture §5.10 read-only default; engineer's attempted write to a non-production resource returns IAM-permission-denied error (the failure is the verification — write authority is correctly absent).
- [ ] **Audit-line emission verified** — engineer's first read-access events appear in the audit log per architecture Cross-Cutting #2; trustee facilitator confirms via Auditor-role query against the audit log cold tier per architecture §5.6.
- [ ] **Engineer-roster row updated** — `engineer-roster.md` row reflects `iam_grant_status: provisioned` + grant date + GCP project list + GitHub team reference.
- [ ] **Sealed credentials NOT accessible** — engineer's attempt to read `docs/escrow/` envelope content (NOT the framework READMEs which ARE readable) returns permission-denied OR the envelopes don't exist at the engineer's access path (depends on whether escrow custodial mechanism is git-internal or out-of-band per Story 0.2 Decision 2 mechanism ADR).

If any check fails, do not declare the grant complete; escalate per §5.

## §5. Contact escalation list

Roles, not individuals where possible. Specific contacts live in operations policy.

- **Routine grant provisioning:** Solo Builder (BigDev).
- **Grant authorization + revocation authorization:** Trustee Panel chair (or delegated trustee with grant-authorization authority per `.decision-log.md` Decision 006).
- **NDA / contract-related grant disputes:** Legal Counsel per Story 0.13.
- **GCP support coordination** (if IAM grant action requires Google Workspace cooperation — e.g., domain-verification for the engineer's Google identity): out-of-band per operations policy; Solo Builder handles routine coordination; Trustee Panel escalation for non-routine.
- **GitHub support coordination** (if team-membership action requires GitHub-side intervention — e.g., enterprise-tier provisioning): out-of-band per operations policy.
- **Substitute engineer authorization** (when bus-factor revocation requires non-Solo-Builder principal): per Story 0.1 AC-4 path 2 model; Trustee Panel chair authorizes.
- **Trustee Panel chair on rota** when operation affects trustee-relevant invariants (e.g., revocation under for-cause termination; bus-factor revocation; access-grant under contract-signature event).

---

## Cross-references

- `README.md` §4 invariant 1 (no operational secrets inlined) — applies to this procedure; specific IDs are not inlined
- `README.md` §8 — Open ADR slots referenced by `[deferred ADR — placeholder procedure]` tags in §1 + §2.3 + §2.7 + §3.3
- `contract-template.md` §13 Schedule A — IAM grant inventory annexed at signature; cross-references this procedure
- `scope-of-work.md` §1 daily-ops mode + §2 surge mode + §3 bus-factor mode + §5 exclusions — the engagement modes this access grant enables
- `onboarding-checklist.md` §4 verification checks — this procedure §4 verification checks land here at onboarding time
- `activation-procedure.md` §2.3 bus-factor activation — references this procedure for the per-action write/admin grant + audit-mirror access mechanism
- `engineer-roster.md` `iam_grant_status` column — records the grant status per row
- `backup-engineer-ledger.md` "Activation event log" + "Pack-revision log" — revocation events + grant-policy revisions logged here
- `../escrow/credential-inventory.md` rows 87-88 (`audit-mirror-write-service-account` + `audit-mirror-read-service-account`) — the audit-mirror credentials the engineer accesses per §2.6 under bus-factor activation
- `../escrow/credential-inventory.md` row 91 (`backup-engineer-access-credentials`) — the activation-time credential envelope per Story 0.2
- `../escrow/sealing-procedure.md` §1 — the audit-mirror sealing structural fix the engineer enables per §2.6
- `../escrow/code-escrow/restoration-procedure.md` §2.5b + §3.x — code-escrow restoration access supported by this grant
- `../knowledge-transfer/on-call-playbook.md` §5 — escalation list cross-referenced for grant escalations
- `../knowledge-transfer/adr-index.md` Section H — deferred-ADR slots for this procedure's `[deferred ADR]` tags
- `../../.decision-log.md` — Decision 2026-05-30-006 + Task 10 contract-signature `[CONTINUITY]` entry + Task 11 onboarding-completion entry

## Changelog

| Date | git SHA | Author | Material edit? | Re-sign required? | Ledger entry |
|---|---|---|---|---|---|
| 2026-05-30 | n/a (pre-git at author-commit) | Solo Builder (BigDev) via dev-story agent | initial author-commit | yes (≥2 trustees per Task 8) | `backup-engineer-ledger.md` Framework-commit record row |
