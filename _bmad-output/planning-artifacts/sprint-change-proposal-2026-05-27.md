# Sprint Change Proposal — TWT Architecture/PRD Reconciliation

**Date:** 2026-05-27
**Author:** BigDev (via `/bmad-correct-course` workflow)
**Status:** Approved for implementation handoff
**Scope:** Pre-CE (Create Epics) reconciliation of 10 architecture-vs-PRD alignment defects

---

## 1. Issue Summary

A focused audit identified 18 alignment defects between TWT's PRD (`prd-TWT-2026-05-22/prd.md`) and Architecture (`architecture.md`). Ten load-bearing items were selected for resolution before launching `bmad-create-epics-and-stories`; the remaining eight are deferred to Implementation Readiness (IR) review post-epics.

**Trigger:** PRD and architecture had drifted in ten substantive places — half are stale-deferral artifacts (text written when decisions were open, never updated when decisions closed), half are silent narrowings or under-specifications (architecture quietly optimized PRD's broad statements, or PRD failed to surface architectural launch gates). Either class will silently break epic/story planning if not reconciled.

**Triggering principle established this session:** TWT's three-doc discipline — **PRD owns business policy** (eligibility, cadence, consequences); **architecture owns structural semantics** (state, transitions, events, outcomes); **ADRs own implementation specifics** (vendor controls, formulas, thresholds). Where a doc strays into another's territory, drift becomes inevitable. The 10 reconciliations restore the boundaries.

---

## 2. Impact Analysis

### Affected artifacts

| Artifact | Edits | Notes |
|---|---|---|
| `architecture.md` | 26 edits across 13 sections + 3 new subsections | Bulk of changes |
| `prd-TWT-2026-05-22/prd.md` | 5 edits (lines 1018, 1181, 427, 1462 + new addendum row) | Scope clarifications + cross-reference to architecture gates |
| `prd-TWT-2026-05-22/addendum.md` | 1 edit (RA-29 row) | Bulk-alert SMS scope clarification |

### Code / implementation impact

| Area | Impact |
|---|---|
| **Cloud provider language** | Translation cleanup; no implementation impact (GCP already canonical per §5.1) |
| **Authentication / OTP** | Adds step-up SMS-OTP for ~15 high-trust operations; session model committed at 90d/2-trusted-device |
| **Communication channels** | Three-tier hierarchy (in-app / WhatsApp / SMS) with dual-gated WA + member self-declared opt-in via user-initiated WA message |
| **Member state primitive** | New `apps/api/modules/member/` state machine commitment with event-sourced semantics |
| **Cache invalidation** | Per-cohort optimization authorized with correctness invariants |
| **Feature-flag tool** | Capability bar committed; specific tool deferred to ADR with named decision gate |
| **Edge / WAF** | Pivot-readiness committed; substitution boundaries enumerated; cache-safe SSR guarantee added |
| **Helpdesk subsystem** | New §3.5a giving architectural identity to existing module skeleton (`apps/api/modules/helpdesk/`) |
| **Public pages with login-walled fragments** | Composition contract committed (cache-safe SSR + registry-declared authenticated fragments) |
| **Pool-spawn capacity** | Envelope committed with launch readiness gate (measured evidence required) |
| **Launch gates** | PRD §12 Phase 0 inherits architecture's gate inventory by reference |

### No epics yet — this is the right time

Items being reconciled BEFORE `bmad-create-epics-and-stories` runs. Reconciling after would have created cascading epic rework.

---

## 3. Recommended Approach

**Path forward: Direct Adjustment.** Modify PRD + Architecture in place; no rollback required, no MVP scope reduction. All 10 reconciliations are documentation-level (architecture/PRD text); they ratify decisions that have either been silently made or were never made.

**Rationale:**
- All 10 defects are pre-CE; no implementation work needs revision.
- 32 distinct edits are mechanical-once-approved; estimated 4–6 hours of careful application.
- One substantive new architectural commit (member self-declared WA opt-in flow + step-up OTP set) — already pre-aligned with BigDev's direction this session.
- One launch-readiness gate added (FR-20 pool-spawn measured validation); no new launch dependency that wasn't already implicit.

**Sequencing recommendation:** apply all 32 edits in a single PR (or paired PR per doc), then run `bmad-create-epics-and-stories` against the reconciled docs.

---

## 4. Detailed Change Proposals

> All edits below are pre-approved by BigDev during the `/bmad-correct-course` workflow run on 2026-05-27. OLD text is verbatim from the current docs; NEW text is the locked replacement.

---

### Item 1 — AWS↔GCP Reconciliation

**Defect:** Architecture §§1.1, 1.5, 1.6, 2.7, 2.10 contain AWS-canonical text from a pre-decision draft; §5.1 closes the cloud decision as GCP `asia-south1` with §5.2 acting as a "reads-as" translation overlay. Translation works for most service names but glosses over the genuine IAM-isolation-strength difference between AWS cross-account boundaries and GCP cross-project boundaries.

**Resolution:** Hoist GCP language into source sections; drop §5.2 overlay; new §2.10a commits IAM isolation outcome (properties only — specific cloud controls live in ADR per the architecture-vs-ADR discipline).

---

**EDIT 1A — Architecture §1.1 Datastore (lines 583–586)**

```
OLD:
**Decision:** Managed Postgres in an India region. AWS RDS Mumbai (`ap-south-1`) is the
default; GCP Cloud SQL Mumbai is an acceptable alternative if a GCP relationship
predominates. Specific provider committed in an ADR; both support PostgreSQL RLS
first-class.

NEW:
**Decision:** Managed Postgres in an India region — **GCP Cloud SQL Postgres**
(`asia-south1`, Mumbai), per §5.1. PostgreSQL RLS first-class support is a hard
requirement; Cloud SQL satisfies it.
```

---

**EDIT 1B — Architecture §2.7 Tier 1 envelope encryption (lines 1262–1269)**

```
OLD:
- **Tier 1 — Ciphertext (envelope-encrypted).** Mobile, email, Aadhaar number, DOB,
  address, nominee bank account, nominee IFSC, medical disclosures.
  - Envelope encryption: KEK in KMS (AWS KMS / GCP KMS depending on cloud); per-row DEK
    encrypted by KEK and stored alongside the ciphertext.
  - Encryption at the application layer (`packages/domain/encryption/`); the database
    sees only ciphertext.
  - Library named in an ADR (AWS Database Encryption SDK or Google Tink — choice depends
    on cloud provider final selection).

NEW:
- **Tier 1 — Ciphertext (envelope-encrypted).** Mobile, email, Aadhaar number, DOB,
  address, nominee bank account, nominee IFSC, medical disclosures.
  - Envelope encryption: KEK in **Cloud KMS** (HSM-backed, per §5.2); per-row DEK
    encrypted by KEK and stored alongside the ciphertext.
  - Encryption at the application layer (`packages/domain/encryption/`); the database
    sees only ciphertext.
  - Library: **Google Tink** (committed in an ADR alongside Cloud KMS integration).
```

---

**EDIT 1C — Architecture §1.5 (lines 736–739 + 766–773)**

Cold tier replacement:

```
OLD:
- **Cold tier (canonical, S3 in `ap-south-1`):** AWS S3 with Object Lock in **Compliance
  mode** (Mumbai region). Audit log entries replicated to S3 per Step 2 commitment.
  Compliance mode is structurally immutable — not even root account can delete locked
  objects until retention expires. 7-year retention per FR-47.

NEW:
- **Cold tier (canonical, Cloud Storage in `asia-south1`):** **GCP Cloud Storage** with
  **Bucket Lock + Object Retention Lock** (Cohasset-assessed WORM-equivalent; per §5.2).
  Retention-locked objects are structurally immutable until retention expiry; administrative 
  principals cannot delete or shorten retention during the active retention window. 7-year retention per FR-47.
```

Write-path scoping replacement:

```
OLD:
**Write-path scoping:**
- **Write-via-restricted-IAM-role** scoped to append-only key patterns matching the
  hash-chain sequence; no prefix overwrites.
- **Cross-account separation:** the S3 write role lives in a separate AWS account from
  the read role used by the integrity-check job. Aligns with the Step 2 "mirror
  credentials separable from sole-engineer access" commitment.
- **Bucket policy denies writes from any principal except the named write role** —
  belt-and-braces against IAM misconfiguration.

NEW:
**Write-path scoping:**
- **Write-via-restricted-IAM-role** scoped to append-only object-name patterns matching
  the hash-chain sequence; no overwrites permitted by the role.
- **Cross-project isolation under enforced org policy** (per §5.2, IAM Isolation
  Commitment §2.10a): the Cloud Storage write role lives in a dedicated GCP project
  (`twt-audit-mirror`) under org-policy constraints that prevent cross-project
  service-account impersonation and cross-project IAM grants by org-level admins. The
  read role used by the integrity-check job lives in a separate GCP project. Aligns with
  Step 2 "mirror credentials separable from sole-engineer access."
- **Bucket IAM policy denies writes from any principal except the named write role** —
  belt-and-braces against IAM misconfiguration.
```

---

**EDIT 1D — Architecture §1.6 (line 794) + §2.10 (lines 1355–1364)**

§1.6:

```
OLD:
…archived to S3 in `ap-south-1` with Object Lock for older cycles.

NEW:
…archived to Cloud Storage in `asia-south1` with Object Retention Lock for older cycles.
```

§2.10 audit log mirror credentials separability:

```
OLD:
**Audit log mirror credentials separability (Category 1 carryover):**
- **Write to S3 mirror:** dedicated IAM role in a dedicated AWS account
  (`twt-audit-mirror`); the role has `PutObject` to the audit-mirror bucket only, no
  Delete, no other actions.
- **Read for integrity check:** separate IAM role; runs in a dedicated execution
  environment (named in Category 5 — likely a separate `apps/jobs/audit/` deployment
  unit with its own credentials).
- **Sole-engineer prod-DB credentials cannot access either role.** Credentials stored in
  the cloud provider's Secrets Manager; rotation policy in Category 5.
- The Auditor role (read) and the mirror-write role (write) are in different AWS
  accounts; an attacker who compromises one cannot pivot to the other.

NEW:
**Audit log mirror credentials separability (Category 1 carryover):**
- **Write to Cloud Storage mirror:** dedicated GCP service account in a dedicated GCP
  project (`twt-audit-mirror`); the account has `roles/storage.objectCreator` scoped to
  the audit-mirror bucket only — no Delete, no other actions.
- **Read for integrity check:** separate service account in a separate GCP project;
  runs in a dedicated execution environment (`apps/jobs/audit/` deployment unit with
  its own credentials).
- **Sole-engineer prod-DB credentials cannot access either project.** Credentials
  stored in Secret Manager; rotation policy in Category 5.
- The Auditor role (read), the mirror-write role (write), and the prod-data project
  live in **separate GCP projects under the IAM Isolation Commitment (§2.10a, below)**.
  An attacker who compromises one cannot pivot to the other through IAM alone.
```

---

**EDIT 1E — NEW §2.10a "Isolation Commitment — preserving audit independence"**

Insert after §2.10, before §2.11.

```
#### 2.10a Isolation Commitment — preserving audit independence

§1.5, §2.10, and §5.2 require that audit-mirror credentials remain operationally
and administratively separable from production data access.

Because the canonical cloud is GCP (§5.1), the architecture commits the following
properties:

- Compromise of production application credentials must not permit modification
  of audit-mirror data.
- Compromise of audit-read credentials must not permit access to production data.
- Sole-engineer operational credentials must not transitively grant audit-write
  authority.
- Separation controls must survive routine IAM mistakes and be periodically
  verified.

Implementation mechanism (project isolation, organization boundaries, org policy,
service-account restrictions, or equivalent) is selected and frozen in an ADR.

Quarterly attestation is required.

If attestation demonstrates that selected controls do not preserve independence
guarantees, isolation strength must be escalated before launch.
```

---

**EDIT 1F — Architecture §5.2 (lines 2475–2492)**

Replace the "Earlier reference → GCP service" 3-column table with a forward-looking 3-column map (Concern | GCP service | Property satisfied). Drop the "Earlier reference" column.

```
NEW preamble:
GCP service map covering the canonical service for every property the architecture
commits.

| Concern | GCP service | Property satisfied |
|---|---|---|
| Datastore | **Cloud SQL Postgres** (`asia-south1`) with regional HA | India PII residency, RLS, managed-in-region |
| Audit log cold tier | **Cloud Storage** with **Bucket Lock** + **Object Retention Lock** (Cohasset-assessed WORM-equivalent) | Structurally immutable retention; 7-year per FR-47 |
| Audit lifecycle tiering | Cloud Storage with **Nearline** → **Coldline** → **Archive** transitions | Cost-tier storage matching access frequency |
| Pool Engine snapshot cold | Cloud Storage with Object Retention Lock | Tamper-evident snapshot durability |
| Object storage (KYC, statements, certificates, attachments) | Cloud Storage | DPDPA-compliant managed storage |
| Key management (KEK + HMAC keys) | **Cloud KMS** with HSM-backed keys | KEK rotation + HMAC key isolation |
| Secrets storage | **Secret Manager** | Rotation, IAM-scoped access |
| Container registry | **Artifact Registry** in `asia-south1` | Container lifecycle + signed-image discipline |
| IAM | **GCP projects** for separation, under §2.10a Isolation Commitment | Audit independence + cross-project isolation |
| Push notifications | FCM | Per FR-58C-flagged provider decision |
| Edge / WAF | Cloudflare front-line (DPDPA compatibility per legal review — see §5.8a + §10 Item 10) | Property bar per §5.8a |
```

---

**EDIT 1G — Architecture Category 5 preamble (lines 2449–2451) — DELETE**

```
DELETE the preamble entirely:
Earlier sections named AWS-specific services as illustrative (S3 Object Lock, RDS Mumbai,
AWS KMS). §5.2 below establishes the canonical GCP service map; those earlier
references read as their GCP equivalents per this section.
```

Category 5 starts directly at §5.1.

---

### Item 2 — OTP/SMS Channel Architecture

**Defect:** Architecture §2.2 lists "SMS via DLT-registered headers" as an OTP channel candidate, contradicting (a) architecture's own line 123 "no SMS," and (b) PRD addendum RA-29's bulk-alert SMS kill (which is precisely scoped to bulk-alert, not OTP — but neither doc surfaced the distinction).

**Resolution:** Distinguish bulk-alert SMS (banned, per RA-29) from transactional OTP-SMS (preserved as canonical, with DLT-transactional/PE/OE registration). Add full step-up OTP for high-trust operations. Commit three-tier channel hierarchy: in-app primary + WhatsApp Business dual-gated + SMS transactional fallback. Member opt-in for WhatsApp is self-declared via user-initiated WA message to the Pariwar's WA Business number (admin-configurable, not hardcoded).

---

**EDIT 2A — Architecture line 123 (Architectural Commitments / Operationally committed)**

```
OLD:
- Channels: in-app push primary (FCM + APNs); WhatsApp Business admin-toggleable per
  Pariwar; Telegram mirror; no SMS.

NEW:
- **Communication channels — three-tier hierarchy:**
  - **In-app push (universal):** FCM + APNs; every notification category fires
    in-app.
  - **WhatsApp Business — dual-gated:** Pariwar admin toggle (FR-72) AND member
    self-declared opt-in (architecture §3.4). Scope: Meta UTILITY templates only —
    payment reminder, payout issued, claim accepted, expiry warning, membership
    lapse. Per-Pariwar WA Business number is admin-configurable, not hardcoded.
  - **SMS — three preserved surfaces** (no bulk-alert SMS, per PRD addendum RA-29):
    (a) canonical OTP channel via DLT-transactional (PE/OE) headers (§2.2);
    (b) step-up OTP for high-trust operations (§2.2);
    (c) per-member transactional fallback when both WA gates ON and WA delivery
        fails (§3.4); plus per-Pariwar cycle-open SMS bridge for time-critical
        alerts under degraded-push + disabled-WA conditions (§3.4 existing).
  - **Telegram mirror:** TSCT-cohort honor; admin-toggleable; non-canonical;
    announcements-only.
- **In-app-engagement cost optimization (per-Pariwar, FR-58C-flag-gated):** suppress
  WhatsApp send when member acted on the same notification in-app within the
  staleness window. Time-critical templates always send through both channels
  regardless.
```

---

**EDIT 2B — Architecture §2.2 Member authentication (replace lines 1120–1144 entirely)**

```
NEW:
#### 2.2 Member authentication — mobile + OTP

**Decision:** Per FR-1, members authenticate via phone number + OTP at signup;
subsequent logins via phone + OTP or session-resume via stored refresh token.
**OTP delivery channel is SMS via DLT-transactional (PE/OE) headers** — distinct
from the bulk-alert SMS ban (RA-29). Voice OTP may be introduced as a fallback
channel via ADR. WhatsApp is not an authentication channel in v1 — identity
(SMS) and communication (WhatsApp) remain separated.

**Session model — long-lived with explicit re-OTP gates:**
- **Refresh-token lifetime:** 90 days; refresh-on-app-open extends if device is in
  trusted-device state.
- **Trusted-device binding:** max **2 trusted devices per member** (configurable
  per Pariwar via FR-58C — covers typical primary + backup/family phone). Binding
  a 3rd device drops the oldest and requires step-up OTP.
- **Force-re-OTP signals** (session invalidated; OTP required on next action):
  SIM-swap-positive; device-binding state change; risk signals as defined by the
  fraud-policy ADR (e.g., suspected device takeover, anomalous access patterns).
  Specific detection formulas and thresholds live in the fraud-policy ADR, not
  architecture.
- **Session-resume vs first-login:** session-resume does not require OTP unless
  a force-re-OTP signal fires; first-login on any device requires OTP regardless.

**Step-up OTP — high-trust operations require fresh SMS-OTP at action time:**
Regardless of session state, the following operations require a fresh DLT-
transactional SMS-OTP within the action's commit window:
- **Member-side identity / account:** mobile-number change; account-recovery
  initiation; member self-deactivation / pause; account deletion / RTBF request
  acknowledgment (DPDPA); DigiLocker re-link.
- **Member-side financial:** nominee change; bank-account / IFSC change.
- **Claim / payout-side:** claim filing; trust-payout authorization (admin);
  refund / claw-back initiation (admin).
- **Admin / trustee-side:** staff privilege escalation / role grant; Niyamavali
  rule amendment (trustee — FR-7); per-Pariwar branding bundle changes affecting
  public surfaces (FR-60); disaster-window declaration (FR-98); helpline operator
  co-pilot session start (v2+; architectural slot reserved).
- **Step-up OTP TTL:** 3 minutes; single-use; emits audit line per send + per
  consume tagged with the operation identifier.

**Discipline:**
- **OTP issuance rate-limited per device, per member, and per IP** — separate
  budgets for cost protection and abuse protection; budgets enforced
  independently (a member legitimately authenticating on a fresh device must
  not be locked by an unrelated IP-level abuse window). Specific budgets in
  Category 5 Observability.
- Per-phone OTP throttling: separate thresholds for login-OTP vs step-up-OTP
  (Category 5 Observability).
- OTP TTL: login-OTP 5 min; step-up-OTP 3 min; one-time use; invalidated on
  next-OTP-request.
- OTP delivery failure surfaces alternate channels per ADR (voice OTP if
  introduced; helpdesk-mediated escalation otherwise).

**OTP-mechanism security floor.** Regardless of delivery channel (SMS-DLT,
voice OTP if introduced), the mechanism must support per-channel rate
limiting, per-OTP revocability, audit-log emission per send + per attempt +
per consume, SIM-swap detection with helpdesk-mediated fallback (never silent
re-issue), and distinct OTP pools per intent class (step-up cannot share
value with concurrent login-OTP).

**ADR captures:** chosen primary OTP channel (committed: SMS-DLT-transactional);
fallback options (voice OTP only — no WhatsApp); cost/reach analysis at 4L scale;
SIM-swap mitigation specifics; DLT-PE/OE registration evidence + per-template
registration list.
```

---

**EDIT 2C-1 — Architecture §3.4 "Channels at v1" (replace lines 1605–1612)**

```
NEW:
**Channels at v1 — three-tier hierarchy:**
- **In-app push (FCM HTTP v1 + APNs via Firebase Admin SDK)** — universal; every
  notification category; per-Pariwar FCM project; per-member device tokens stored
  encrypted (Tier 1 PII).
- **WhatsApp Business (Meta Cloud API)** — **dual-gated**: fires only when both
  (a) per-Pariwar admin toggle ON (FR-72) and (b) per-member opt-in ACTIVE (see
  Member WA opt-in flow below). Scope: Meta UTILITY templates only — payment
  reminder, payout issued, claim accepted, expiry warning, membership lapse.
  Per-Pariwar WA Business number is admin-configurable, not hardcoded. Per-Pariwar
  template approval workflow; provider interface allows BSP substitution.
- **SMS (DLT-transactional / PE/OE)** — preserved fire conditions: (i) OTP
  delivery (§2.2); (ii) step-up OTP (§2.2); (iii) per-member transactional
  fallback when both WA gates ON and WA delivery returns failure after the
  committed retry window; plus the per-Pariwar cycle-open SMS bridge below for
  degraded-push + disabled-WA conditions. Not a bulk-alert channel.
- **Telegram mirror (Bot API)** — fire-and-forget; announcements-only;
  per-Pariwar channel.
```

---

**EDIT 2C-2 — Architecture §3.4 NEW SUBSECTIONS (insert after line 1701, before §3.5)**

```
NEW:
**Member WA opt-in flow.** Members self-declare WhatsApp availability during
onboarding:
- After mobile-OTP verification, member is offered: **"Do you have WhatsApp? Get
  notified on WhatsApp?"**
- **"Yes" branch:** app opens WhatsApp via deeplink to the Pariwar's WA Business
  number with a pre-filled message: **"Hello, I would like to get notifications
  on WhatsApp."** Member must tap send to complete opt-in.
- **Inbound message handling:** WA webhook (§3.11) matches the inbound WA number
  to member-mobile-on-file (assumption: same number; mismatch logged + surfaced
  for member confirmation). On match: WA opt-in state set to ACTIVE + opt-in
  timestamp recorded in audit log + Meta 24h customer-service window opened.
- **"No" branch** (or member doesn't send the message during onboarding): opt-in
  remains INACTIVE. Settings surface presents a retry CTA: "Want WhatsApp
  notifications? Tap here to enable."
- **Opt-in withdrawal:** member disables from app settings (audit-logged) or
  sends STOP message to the Pariwar's WA Business number (handled by inbound
  webhook; audit-logged).
- **Per-Pariwar WA Business number** stored in Pariwar config (Pariwar Admin UI;
  default NULL — WA disabled at Pariwar until configured); changes are trustee
  authority + audit-logged.
- **Opt-in origination requirement.** WA opt-in state may only transition to
  ACTIVE via a **user-initiated interaction** (the user-sent WhatsApp message
  above) or an **explicit affirmative consent capture** in-app (recorded with
  timestamp + the UI context). Passive defaults, pre-checked boxes, bundled
  consent, or inference from other settings are not valid opt-in origins. This
  protects against compliance drift under Meta policy and DPDPA consent
  semantics.
- **Fallback driven by WA-Cloud-API undelivered status,** not pre-send presence
  detection.

**In-app-engagement cost optimization (per-Pariwar, FR-58C-flag-gated).**
- Per-Pariwar admin toggle (separate from WA admin-toggle FR-72): when ON,
  dispatcher suppresses WA send if the member acted on the same notification's
  in-app surface within the optimization staleness window (default 6 hours;
  tunable in Category 5 Observability).
- **Time-critical templates always send through both channels** regardless of
  the optimization toggle:
  - Payment reminder within 48 hours of cycle close.
  - Expiry warning within 7 days of expiry.
  - Payout issued.
- Cost-suppression decisions emit audit lines + per-Pariwar observability
  metrics.
- Optimization is independent of per-member opt-in: a member with opt-in ACTIVE
  may still see suppressed WA sends under the optimization rule.

**Per-member fallback SMS dispatch.** When both WA gates are ACTIVE (Pariwar
admin + member opt-in) and WA delivery returns undelivered after the committed
retry window (3 attempts × exponential backoff), the dispatcher fires a
DLT-transactional SMS containing the equivalent template payload. Fallback
fires per message, not per cohort. Members without active WA opt-in receive
only in-app push for non-OTP notifications — they do not receive transactional-
fallback SMS.
```

---

**EDIT 2C-3 — Architecture §3.4 Power-saver fallback (replace lines 1620–1624)**

```
NEW:
**Power-saver awareness (UX P0-2):** push delivery success ≠ push visibility.
Members on power-saver-enabled Android devices may not see pushes. Mitigation:
- In-app banner on next open showing missed alerts.
- **Cycle-open SMS bridge (Pariwar-degraded-mode fallback):** for cycle-open
  and other time-critical templates, when per-Pariwar push delivery rate falls
  below threshold AND the Pariwar WA admin-toggle is OFF, dispatcher fires a
  per-Pariwar SMS bridge to members. This is distinct from per-member WA-failure
  fallback (above) and from bulk-alert SMS (banned per RA-29) — it is a narrow
  degraded-mode safety net for time-critical communications. Trigger thresholds
  in Category 5 Observability.
```

---

**EDIT 2D — PRD addendum RA-29 (line 47)**

```
OLD:
| RA-29 | **SMS as alert channel** (TSCT R3, brainstorm Theme 8 v1-S original) |
In-app push (primary) + WhatsApp Business (admin-toggleable) + Telegram mirror —
**SMS dropped** | TRAI bulk-SMS approval friction + per-SMS cost at 4L-member scale +
no SMS-specific feature the other channels don't already cover. SMS was demoted from
v1-S, then killed during drafting; logged here for traceability. |

NEW:
| RA-29 | **SMS as bulk-alert channel** (TSCT R3, brainstorm Theme 8 v1-S original) |
**Three-tier channel model:** in-app push (universal) + WhatsApp Business (dual-gated:
Pariwar admin toggle + member self-declared opt-in) + SMS (preserved surfaces: OTP,
step-up OTP, per-member transactional fallback, Pariwar-degraded-mode cycle-open
bridge) + Telegram mirror (non-canonical). **Bulk-alert SMS dropped**; **OTP-SMS,
step-up-OTP-SMS, and transactional-fallback-SMS preserved.** | TRAI bulk-SMS DLT
approval friction + per-SMS cost at 4L scale + no SMS-specific feature the other
alert channels don't cover. Transactional OTP-SMS, step-up-OTP-SMS, and fallback-SMS
use the separate DLT-transactional pathway (PE/OE), evaluated independently. DLT-
transactional registration committed as operational prerequisite (see architecture
§2.2 + §3.4). |
```

---

**EDIT 2E — PRD lines 1018 + 1181**

Line 1018:

```
OLD:
- SMS — dropped. Killed because of cost and TRAI dependency.

NEW:
- **Bulk-alert SMS — dropped.** Killed because of TRAI bulk-DLT friction + per-SMS
  cost at 4L scale. **SMS preserved as:**
  - **Canonical OTP channel** via DLT-transactional (PE/OE) headers
    (architecture §2.2).
  - **Step-up OTP** for high-trust operations (nominee change, bank change,
    claim filing, trust-payout authorization, role grants, Niyamavali amendment,
    disaster-window declaration, etc.) — see architecture §2.2 for full list.
  - **Per-member transactional fallback** when both WhatsApp gates (Pariwar
    admin toggle + member opt-in) are ON and WA delivery fails (architecture
    §3.4).
  - **Pariwar-degraded-mode cycle-open bridge** when push delivery is degraded
    and WA admin-toggle is OFF (architecture §3.4).
```

Line 1181:

```
OLD:
- TRAI compliance (de-scoped since SMS dropped — but in-app notification rules may
  still apply).

NEW:
- **TRAI compliance — partial.** Bulk-DLT compliance de-scoped (no bulk-alert
  SMS). **DLT-transactional (PE/OE) registration required** for OTP-SMS,
  step-up-OTP-SMS, transactional-fallback-SMS, and degraded-mode cycle-open-bridge
  SMS — committed as operational prerequisite (architecture §2.2, §3.4). In-app
  notification rules may apply where notification content overlaps with regulated
  categories.
```

---

### Item 3 — Account State Machine Member Lifecycle

**Defect:** Architecture Cross-Cutting #12 commits "Account State Machine as first-class architectural primitive — formal transition table; 'account state' atomically computed across claim / member / pool / alert state" — but the formal transition table is nowhere in the document. PRD FR-1A specifies `active_in_grace` + `lapsed_unpaid` member states with eligibility consequences; architecture omits both.

**Resolution:** New §1.14 enumerates the **member lifecycle state primitive** (PRD owns policy attached to each state; architecture owns the lifecycle structure + event emission). Cross-Cutting #12 updated to reference §1.14. Composed Account State (member + claim + pool + alert → frozen-* end states named in §3.4) flagged as separate architectural workload in §Gap Analysis.

---

**EDIT 3A — NEW §1.14 "Member Lifecycle State Model"**

Insert after §1.13, before "Decisions deferred" in Category 1.

```
#### 1.14 Member Lifecycle State Model

**Why this section exists.** Cross-Cutting #12 commits a formal transition table
for the Account State Machine. The Account State is computed atomically across
claim / member / pool / alert state primitives; this section commits the
**member lifecycle state model**. Composition rules for the broader Account
State (member + claim + pool + alert → Account State, including the frozen-*
end states named in §3.4) are the subject of a separate architectural
workload — flagged in §Gap Analysis.

**Canonical home:** `packages/domain/member/state.ts` — single source of truth.

**Source-of-truth principle.** Member state is **derived from event history**.
Persisted state is an optimization only — the authoritative state is what the
event log replays to. This aligns with Cross-Cutting #4 (Determinism & replay):
any persisted member-state row can be reconstructed by replaying the member's
audit-log events. Persisted state is materialized for read efficiency and
cache invalidation hooks; it is not the source of truth.

**States and transitions** (PRD-load-bearing; FR provenance noted):

| State | Enter from | Enter trigger | Exit trigger | FR |
|---|---|---|---|---|
| `pending-fee` | (signup begun) | UPI Intent created, payment not confirmed | Payment confirmed → `lock-in` | FR-1 |
| `lock-in` | `pending-fee` | First-payment confirmed | Lock-in period elapses → `pending-valid` or `active` | FR-1, FR-3 |
| `pending-valid` | `lock-in` | Lock-in elapsed AND DigiLocker unverified | Trustee approves manual KYC → `active` | FR-2 |
| `active` | `lock-in` (DigiLocker verified) OR `pending-valid` OR `active_in_grace` (on renewal) OR `lapsed_unpaid` (on renewal) | KYC verified AND fee paid AND not withdrawn | `valid_through + 1 day` → `active_in_grace`; OR member-initiated withdrawal → `withdrawn` | FR-1, FR-1A, FR-2 |
| `active_in_grace` | `active` | `valid_through + 1 day` | Renewal payment → `active`; OR grace period elapsed → `lapsed_unpaid` | FR-1A |
| `lapsed_unpaid` | `active_in_grace` | Grace period elapsed (per FR-1A) | Renewal payment → `active` (no re-lock-in) | FR-1A |
| `withdrawn` | `active` (or sub-states) | Member-initiated withdrawal | Re-signup allowed after lock period → `pending-fee` | FR-6 |

**Policy consumers** — these systems read member-state to apply business policy
defined elsewhere (PRD, FRs). The states above name structural lifecycle
positions; the eligibility rules and cadences attached to each state live in
their governing FR / rule registry:
- **Validity service (FR-12A)** — canonical read path; exposes
  `vyawastha_shulk_status: { paid_through, days_until_lapse, in_renewal_grace,
  grace_remaining_days }` per FR-1A.
- **Pool eligibility** — Pool Engine (FR-14) reads member-state at snapshot
  time.
- **Claim eligibility** — claim filing reads member-state at filing time;
  eligibility policy in FR-1A.
- **Alert routing** — dispatcher (§3.4) reads member-state for suppression,
  routing, and reminder cadence (FR-1A schedule).

**Time-driven transitions (Cross-Cutting #14 — SIE).** The following
transitions fire on scheduled time, non-punitively:
- `lock-in` → `pending-valid` or `active` on lock-in expiry.
- `active` → `active_in_grace` on `valid_through + 1 day`.
- `active_in_grace` → `lapsed_unpaid` on grace expiry.
SIE driver lives in `apps/jobs/scheduler/`; transition emission is idempotent
and audit-logged.

**Cache invalidation invariant (Cross-Cutting #18, §1.10).** FR-12A validity-
service caches invalidate on any member-state transition. Transition emission
and cache-invalidation event are in the same transaction; consumers see a
consistent view.

**Claim-filing concurrency (Cross-Cutting #14 — non-punitive).** If a claim is
filed while the member is in `active_in_grace`, eligibility resolves against
member-state at filing time. A subsequent `active_in_grace` → `lapsed_unpaid`
transition does not retroactively invalidate a filed claim.

**Audit-log emission (Cross-Cutting #2).** Every member-state transition
emits a structured event with `from_state`, `to_state`, `trigger`, `actor`
(`member`, `system`, `trustee`), `timestamp`, and `pariwar_id`.
```

---

**EDIT 3B — Architecture Cross-Cutting #12 (lines 255–257)**

```
OLD:
12. **Account State Machine as first-class architectural primitive** — formal transition
    table; "account state" atomically computed across claim / member / pool / alert
    state.

NEW:
12. **Account State Machine as first-class architectural primitive** — Account State
    is atomically computed across claim / member / pool / alert state primitives.
    Member-state primitive enumerated in **§1.14** (renewal-grace states load-bearing
    for FR-12A validity service). Claim-state, pool-state, alert-state primitives and
    the composition rules producing the full Account State (including the frozen-*
    end states named in §3.4) are the subject of a focused follow-up architectural
    workload — flagged in §Gap Analysis.
```

---

**EDIT 3C — Architecture §Gap Analysis (add new entry)**

```
NEW:

**Composed Account State enumeration (deferred).** Cross-Cutting #12 commits
Account State as atomically computed across member / claim / pool / alert state
primitives. Member-state primitive is committed in §1.14. Claim-state, pool-
state, alert-state primitives + the composition rules + the full enumeration of
Account State end states (including §3.4's `claim-filed-frozen`,
`disbursed-frozen-readable`, `disabled-T+90`, `public-record-∞`) are a focused
follow-up workload. **Risk:** consumers of computed Account State (dispatcher
suppression §3.4, Module Shelf suppression §4.15, screen-mode parameters
Cross-Cutting #9) depend on a contract that is not fully enumerated; today
these consumers reference a partial state name list inline. **Mitigation:**
each consumer treats its current state-name list as authoritative until the
composition workload lands; new state names cannot be introduced without
enumerating them in the composition table.
```

---

### Item 5 — FR-12A Cache Invalidation Scope

**Defect:** PRD line 427 says "cache is purged on any Niyamavali amendment or member-state change"; architecture §1.10 narrows to per-cohort invalidation. Architecture optimized PRD without surfacing.

**Resolution:** Reframe PRD as freshness invariant (property); commit architectural correctness invariants for per-cohort optimization + conservative fallback.

---

**EDIT 5A — PRD FR-12A cache invalidation (line 427)**

```
OLD:
- Cache invalidation: validity status cached for at most 60 seconds; cache is purged
  on any Niyamavali amendment or member-state change.

NEW:
- **Cache freshness invariant:** validity status reflects any Niyamavali amendment
  or member-state change within at most 60 seconds. Implementation may **optimize
  invalidation scope provided the freshness invariant remains satisfied** (see
  architecture §1.10); architecture commits the correctness invariants — including
  a conservative all-members fallback when scope confidence is insufficient.
```

---

**EDIT 5B — Architecture §1.10 (replace "Stampede protection on mass invalidation" block, lines 928–935)**

```
NEW:
**Per-cohort invalidation with correctness invariants.**
- **Scope declaration is mandatory.** Every Niyamavali amendment declares its
  affected-member scope as part of the amendment record (e.g., `all_members` |
  `past_lockin` | `r7_subclause_C_active` | named cohort definition). Amendments
  cannot be committed without a scope declaration.
- **Correctness invariant.** The declared scope must include every member whose
  FR-12A output changes as a result of the amendment. Trustee-quorum amendment
  review (per FR-7) treats scope completeness as a review criterion.
- **Conservative fallback (all-members invalidation)** fires when (a) scope is
  declared `all_members`, (b) scope cross-references multiple rules where
  transitive effect is possible, or (c) **scope confidence is insufficient to
  guarantee completeness**.
- **Member-state-change invalidation** is always per-member, scoped to the
  affected member's cache key set; not subject to cohort-declaration rules.

**Stampede protection.**
- **Stale-while-revalidate** — readers don't block while a recompute is pending;
  last-known-good value is served with a `revalidating: true` flag. Returned
  values carry a freshness timestamp.
- **Bounded recomputation** — recompute fan-out is capped per unit time; excess
  invalidation requests queue against the cap rather than stampede the database.

Specific mechanisms (singleflight pattern, lease coordination, exact threshold
values, cohort-scope declaration schema) committed in an implementation ADR.
```

---

### Item 9 — Feature-Flag Tool Selection

**Defect:** Architecture references FR-58C feature flags as load-bearing (DigiLocker mandatory cutover, per-Pariwar capability rollout, staged migrations) but tool selection is deferred without a decision-by gate or capability bar.

**Resolution:** Add decision gate (canonical acceptance = DigiLocker-mandatory canary rollout per PRD A-4) + outcome-oriented capability bar in Deferred Decisions; add Gap Analysis observation with conditional escalation path.

---

**EDIT 9A — Architecture Deferred Decisions (replace line 182)**

```
NEW:
- **[P1] Feature-flag tool selection** — load-bearing dependency for DigiLocker-
  mandatory cutover (§2.8) and other FR-58C-gated migrations. **Decision gate:**
  selection must be operational before the first FR-58C-gated cohort rollout;
  canonical acceptance is the DigiLocker-mandatory canary rollout (per PRD A-4
  timeline: 6–12 months post-launch). Architecture commits Cross-Cutting #15
  properties + Test + flag governance lifecycle; the specific tool is committed
  in an ADR.

  **Selected implementation must demonstrate** (outcome-oriented; vendor-neutral):
  - **Deterministic evaluation** — same cohort + same flag identity + same
    version yields the same result; output is reproducible for replay (Cross-
    Cutting #4).
  - **Tenant isolation** — flag definitions and evaluations scoped by
    `pariwar_id`; cross-tenant leakage is structurally impossible (Cross-Cutting
    #1).
  - **Replay safety** — historical flag states are queryable for past
    evaluations; flag changes carry version + effective-at timestamps.
  - **Auditability** — every flag-state change emits a tamper-evident audit
    line (§1.5 hash chain); inventory enumerable + inspectable by Pariwar Admin
    and above; no concealed flags (Cross-Cutting #15).
  - **Offline resilience** — flag evaluation continues to work under provider
    outage with a documented fallback default per flag; the default is part of
    the flag's lifecycle metadata.
  - **Lifecycle accountability** — each flag carries a named owner +
    expected-retirement signal + dead-by date (per Test + flag governance).
  - **DPDPA-compatible posture** — any flag gating member-PII-touching surfaces
    honors India residency; flag evaluation does not require PII outbound.

  **Capability bars are acceptance criteria for future ADRs and are intentionally
  vendor-neutral.**
```

---

**EDIT 9B — Architecture §Gap Analysis (add new entry)**

```
NEW:

**Feature-flag tool selection (P1) — load-bearing dependency observation.**
Architecture references FR-58C feature flags as the gating mechanism for
DigiLocker-mandatory cutover (§2.8), progressive per-Pariwar capability rollout
(§3.13 capability registry), and staged migration of any future behavior
(Cross-Cutting #15). The specific tool is deferred per §Deferred Decisions
with a stated decision gate. **Observation:** if tool selection lags the first
FR-58C-gated rollout, DigiLocker-mandatory migration (PRD A-4) blocks or
requires ad-hoc gating that violates Cross-Cutting #15's visibility and
no-secret-flags properties. **Escalation path:** Gap Analysis findings may
elevate unresolved decisions into Launch Gate Risks (see §Launch Gate Risks
above) if this observation materializes into a slipping decision.
```

---

### Item 10 — Cloudflare ↔ DPDPA Edge/WAF

**Defect:** Step 2 names the Cloudflare-DPDPA compatibility question and self-hosted-WAF pivot path; multiple downstream sections (§2.1, §2.11, §3.11, §5.8) proceed as if Cloudflare is decided. Pivot path is mentioned once and never elaborated.

**Resolution:** Strengthen Critical External Dependencies entry; new §5.8a commits property bar + pivot disposition + substitution boundaries; §5.8 made vendor-neutral; Launch Gate Risks entry strengthened to P0 decision framing.

---

**EDIT 10A — Architecture Critical External Dependencies (replace lines 201–203)**

```
NEW:
- **[P0] Edge / WAF surface — Cloudflare ↔ India-PII residency.** Cloudflare is
  the v1 default; DPDPA compatibility per legal review remains open. This is an
  open architectural surface with a committed pivot path. Architecture commits
  the property requirements (§5.8a Edge / WAF capability bar); the specific
  provider is committed in an ADR after legal review. **Pivot readiness:**
  Cloudflare-dependent sections (§2.1, §2.11, §3.11, §5.8) must identify
  substitution boundaries and avoid irreversible coupling; substitution points
  enumerated in §5.8a.
```

---

**EDIT 10B — NEW §5.8a (insert after §5.8, before §5.9)**

```
#### 5.8a Edge / WAF capability bar + pivot disposition

Edge / WAF selection is contingent on legal review of Cloudflare-DPDPA
compatibility. Architecture commits the property bar; the specific provider is
committed in an ADR after legal review.

**Selected implementation must demonstrate** (outcome-oriented; vendor-neutral):
- **Rate limiting** — per-IP and per-session, configurable per endpoint, with
  named thresholds (§2.11 commits the layered structure; specific values in
  Category 5 Observability).
- **Bot management + CAPTCHA-style challenge** — automated traffic classification
  with configurable response (allow / challenge / block); challenge on named
  endpoints per FR-88 (signup, claim filing, helpdesk forms).
- **Ingress signature verification** — verifies inbound traffic origin before
  passing to backend (§3.11 webhook persist + ack assumes verified ingress).
- **Edge-only ingress capability** — backend services not directly reachable
  from the public internet; mechanism varies per provider (§5.8 commits the
  property, not the mechanism).
- **DPDPA-compatible posture** — edge processing and storage of member data must
  remain compatible with the selected DPDPA posture and legal interpretation at
  launch.
- **Observable edge metrics** — request rate, error rate, challenge rate, bot
  classification rate queryable from the architecture's observability stack
  (Category 5).

**Pivot disposition** — if legal review finds Cloudflare incompatible with
DPDPA, the replacement implementation is selected by ADR and must satisfy the
capability bar above. Target deployment region is GCP `asia-south1`.

**Substitution points** — architecture references requiring clean substitution
boundaries (no irreversible coupling):
- §2.1 (External scraper threat actor) — bot management + challenge equivalents.
- §2.11 (Rate limiting Layer 1) — IP-level rate limits.
- §3.11 (Webhook ingress) — ingress signature verification.
- §5.8 (Network topology) — edge-only ingress + break-glass bypass.

**Capability bars are acceptance criteria for future ADRs and are intentionally
vendor-neutral.**
```

---

**EDIT 10C — Architecture §5.8 (lines 2773 + 2784–2788)**

Line 2773:

```
OLD:
- **Cloudflare front-line** (per Step 2 §4.13) — Bot Management + Turnstile + WAF
  rules; DPDPA compatibility per legal review remains open (Step 2 Critical External
  Dependency).

NEW:
- **Edge / WAF front-line** (per §5.8a capability bar) — v1 default: Cloudflare
  (Bot Management + Turnstile + WAF Rules); pivot to self-hosted WAF if legal
  review finds Cloudflare incompatible with DPDPA. Rate-limiting layer (§2.11),
  ingress signature verification (§3.11), and edge-only ingress (below) maintain
  clean substitution boundaries.
```

Lines 2784–2788:

```
OLD:
**Edge-only ingress (default) + break-glass bypass.** Backend services default to
edge-only ingress — traffic arrives via Cloudflare, not directly to Cloud Run / GKE.
The mechanism (Cloudflare Tunnel, signed-token verification, or other) is committed
in an ADR; the *property* is that backend services are not directly reachable from
the public internet under normal operation.

NEW:
**Edge-only ingress (default) + break-glass bypass.** Backend services default to
edge-only ingress — traffic arrives via the selected edge / WAF (Cloudflare or
self-hosted, per §5.8a), not directly to Cloud Run / GKE. The mechanism
(Cloudflare Tunnel, signed-token verification, mTLS, or other) is committed in
an ADR contingent on edge selection; the *property* is that backend services
are not directly reachable from the public internet under normal operation.
**Break-glass access must be time-bounded and audit-logged** — activation
requires explicit operator action with a stated expiry; every direct-ingress
request emits an audit line (Cross-Cutting #2); auto-revert at expiry unless
explicitly renewed with re-justification.
```

---

**EDIT 10D — Architecture §Launch Gate Risks (line 4222)**

```
OLD:
| Cloudflare ↔ India-PII residency review | Trustee Panel | Legal Counsel (review), BigDev (pivot path) |

NEW:
| **[P0] Edge / WAF DPDPA-compatibility decision** (Cloudflare-incompatible → pivot to self-hosted WAF per §5.8a) | Trustee Panel | Legal Counsel (review), BigDev (pivot design) |
```

---

### Item 11 — Helpline / Helpdesk Subsystem Separation

**Defect:** Architecture §3.5 names "Helpline Operator console" but covers only telephony/CTI. Helpdesk (FR-52 ticketing) has backend, admin UI, and contracts modules already in the directory structure — but no architectural narrative explains the subsystem, its routing, or its integration points. Requirements-to-structure mapping (line 4127) conflates them into one row.

**Resolution:** Scope demarcation in §3.5; NEW §3.5a gives architectural identity to helpdesk; mapping table fixed.

---

**EDIT 11A — Architecture §3.5 (insert immediately after the heading at line 1703)**

```
NEW:
**Scope demarcation.** This section covers telephony / CTI only — inbound call
routing, outbound dialing, call recording, screen-pop. **The helpdesk ticketing
subsystem (FR-52) is a distinct capability** with its own backend module, admin
UI, and member-facing UI — committed in §3.5a below. The Helpline Operator role
(FR-46) is one scope that receives helpdesk ticket assignments per FR-52; the
role spans both subsystems but the subsystems themselves are independent.
```

---

**EDIT 11B — NEW §3.5a (insert after §3.5, before §3.6)**

```
#### 3.5a Helpdesk ticketing subsystem (FR-52)

**Decision:** Helpdesk is a first-class subsystem distinct from telephony.
PRD FR-52 commits the capability (members open tickets; routed by category +
scope to admin roles). Architecture commits the structural shape; routing-policy
specifics (category-to-scope mapping rules) are rule-registry-driven, not
hardcoded.

**Backend module:** `apps/api/modules/helpdesk/`. Owns:
- Ticket lifecycle primitives (create, assign, transition, reopen, close).
- Category-based routing logic against the routing-policy registry.
- Scope-based assignment via RBAC scope dimensions (§2.6, FR-45).
- Audit-log emission per state transition (Cross-Cutting #2).

**Admin UI module:** `apps/admin/modules/helpdesk/`. Owns:
- Ticket queue per scope (Pariwar / district / block / role).
- Ticket detail view + reply composition.
- Bulk operations on tickets (per FR-49).
- Scope-filtered search + saved filters.

**Member-facing UI:** member app surfaces (native + responsive web). Members see
their own tickets + status, append replies, and receive helpdesk-reply push
notifications (per channel hierarchy §3.4).

**Contracts:** `packages/contracts/helpdesk/`. Owns the API contracts shared by
backend + admin UI + member UI; type tests assert contract-domain alignment
(per §1.3 discipline).

**Ticket state primitive.** The state set and transitions are committed in PRD
FR-52. Architecture commits: (a) ticket state is derived from event history per
Cross-Cutting #4 (Determinism & replay) — persisted state is an optimization,
not the source of truth; (b) every state transition emits a structured audit
event per Cross-Cutting #2; (c) state changes are queryable for past points in
time via event replay.

**Routing policy (rule-registry-driven, not hardcoded):**
- Category-to-scope mapping (e.g., `category=kyc-trouble → scope=district-admin`)
  lives in the per-Pariwar rule registry alongside Niyamavali (FR-7) and the
  per-Pariwar capability registry (§3.13).
- Per-Pariwar overrides allowed; default routing-policy ships with v1.
- Routing changes are audit-logged + versioned.

**Integration points** (other admin modules that read/write helpdesk):
- **Helpline (§3.5):** Helpline Operator can create a helpdesk ticket from a
  live call (call metadata as ticket attachment); a helpdesk ticket can trigger
  an outbound call from helpline.
- **Claim (claim modules):** `claim-status` category tickets cross-link to
  the claim record; resolution may update claim state where authorized by role.
- **Reconciliation (§3.6):** `UTR-mismatch` category tickets cross-link to the
  reconciliation queue; can attach the relevant bank-statement line.
- **Module Marketplace (§3.7):** `partner-module-issue` category tickets
  cross-link to the partner integration handler.
- **Validity service (FR-12A):** `profile-update` category tickets read
  member-state for context.

**SLA policy** lives in operations policy + the routing-policy registry, not
architecture. Architecture commits that SLA budgets per category are queryable,
breach signals are surfaced to the assignee's queue, and breach events emit
audit lines.

**Form ingress** (member-side ticket submission) flows through the standard
API path with rate-limiting + bot-management gates (§2.11, §5.8a); helpdesk
form surfaces are named in the FR-88 protected-surface list.

**Lifecycle dispatch suppression (§3.4 cross-reference):** tickets owned by
members in frozen Account States may remain open in the assignee queue; member-
class notifications about those tickets are suppressed per §3.4 dispatch-
suppression policy.
```

---

**EDIT 11C — Architecture Requirements-to-structure mapping (line 4127)**

```
OLD:
| Helpline / Grievance | `apps/admin/modules/helpline/` |

NEW:
| Helpline (telephony / CTI, Persona #7) | `apps/admin/modules/helpline/` + `apps/api/src/telephony/` |
| Helpdesk / ticketing (FR-52) | `apps/api/modules/helpdesk/` + `apps/admin/modules/helpdesk/` + `packages/contracts/helpdesk/` |
```

---

### Item 12 — FR-77 Login-Walled Fragment Rendering

**Defect:** PRD FR-77 commits Sahyog Vivran with public path + login-walled bank-details fragment; architecture has separate `apps/public/` (Astro) and `apps/mobile/` (Expo) but never commits where the login-walled fragment renders.

**Resolution:** Composition contract committed — cache-safe public SSR shell + registry-declared authenticated fragments + auth boundary at API. Outcome-oriented (specific framework — Astro islands or equivalent — committed in ADR).

---

**EDIT 12A — Architecture Member-Responsive Web Deferral section (insert after line 432)**

```
NEW:
**Cross-surface rendering policy — public pages with login-walled fragments.**

Some public pages serve both non-members and authenticated members at the same
URL, with member-only fragments rendered alongside public content (e.g., FR-77
Sahyog Vivran shows public story + verifiers + contributor count to everyone;
nominee bank details only to logged-in members during a live pool).

**Architecture commits the composition contract** (outcome-oriented; vendor-
neutral):
- The public page is composed of a **cache-safe public SSR shell** plus
  **registry-declared authenticated fragments** that hydrate client-side.
- The SSR shell renders only public content (per FR-74 Public-vs-Private
  matrix); the SSR output contains no PII, no member-state, and no
  auth-derived branching.
- Authenticated fragments hydrate after page load. Non-authenticated visitors
  see a public-fallback state baked into the SSR output (e.g., "log in to see
  contribution details").
- The **auth boundary lives at the API**
  (`apps/api/modules/public-pages/`), not at the page or the edge —
  authenticated fragment requests cross the boundary the same way other
  authenticated API calls do (§2.4 session model). No special-case auth
  surface is introduced at the public page layer.

**Cache-safe public SSR guarantee.** Public SSR output is cacheable at the
CDN / edge under standard public-cache semantics — it contains no member-
conditional content, no session-derived branching, no PII. The cache-safety
guarantee is enforced structurally (through type system, build-time check, or
equivalent mechanism committed in an ADR), not through documented discipline.
Member-conditional content lives exclusively in authenticated fragments that
cross the auth boundary at the API.

**Why this pattern:**
- Single URL serves both audiences; SEO continuity preserved for public
  content.
- Public SSR stays minimal-JS for the non-member view; only authenticated
  fragments ship hydration JS.
- Member-facing payment flow remains canonical in `apps/mobile/` (My Pool
  card); the public page's bank-detail fragment is a secondary view for
  members on a laptop or non-app device.
- Cache-safe SSR means the public page is CDN-cacheable without risk of
  leaking PII across visitors.

**Registry-declared fragments (v1).** Every authenticated fragment on a
public page is declared in a fragments registry. v1 ships with:
- **FR-77 Sahyog Vivran:** nominee bank account + IFSC fields, payment
  status, UPI Intent CTA (deeplinks to `apps/mobile/`).

**Migration boundary for `apps/member-web/` split** (existing triggers
above): when `apps/member-web/` ships, registry-declared fragments may
migrate to that workspace without changing the API auth boundary or the
public SSR shell's cache-safety guarantee.

**Capability bars are acceptance criteria for future ADRs and are
intentionally vendor-neutral.**
```

---

### Item 15 — FR-20 Pool-Spawn Capacity Envelope

**Defect:** PRD FR-20 commits 60s p95 pool spawn at N=50 / M=4L; architecture has saga pattern + worker partitioning but no capacity envelope substantiation, and the 60s budget is missing from the §5.12 NFR table.

**Resolution:** Capacity-bound mechanism committed in §5.11; NFR table row added; pre-launch measured-validation gate surfaced via Gap Analysis.

---

**EDIT 15A — Architecture §5.11 (insert after Resolves line 2917, before §5.12)**

```
NEW:
**Pool spawn capacity envelope (FR-20 NFR substantiation).**

PRD FR-20 commits pool spawn for N=50 claims and M=4L members < 60s p95.
Architecture commits the capacity-bound mechanism that targets this envelope:

- **Decomposition.** Pool spawn at cycle-freeze is a saga (§1.4): the parent
  job spawns N child jobs, one per pool. Child jobs are independent — no
  inter-pool serialization. pg-boss Class A queue dispatches children
  concurrently.

- **Per-child saga shape.** Each child job:
  - Reads the members-at-freeze snapshot (immutable snapshot evaluation per
    §1.6).
  - Computes the deterministic assignment (per FR-14 hash + member set).
  - Persists assignment rows through a **bulk-write primitive capable of
    sustaining the required pool-spawn throughput envelope**; the per-cycle
    assignment table is partitioned per §1.1.
  - Inserts the pool row + emits the `pool.spawned` event.
  - Emits an audit line per Cross-Cutting #2.

- **Concurrency property.** Child jobs perform immutable snapshot evaluation
  with bounded write contention: snapshot reads do not conflict, and writes
  land in per-cycle partition slices with no inter-pool serialization. No
  shared mutable state across child jobs during spawn.

- **Capacity decomposition.** Decomposition is performed from PRD envelope
  assumptions (N, M, per-cycle structure); specific decomposition values
  (worker count K, batch size, partition strategy) are operational tuning
  parameters, committed in operations policy + tuned via capacity-planning
  indicators §5.6.

- **Launch readiness gate.** Launch readiness requires measured evidence
  that the committed envelope satisfies the PRD pool-spawn SLO under
  representative simulated load. Capacity assumptions remain provisional
  until validated.

**Capacity bars are acceptance criteria for capacity-planning ADRs and are
intentionally vendor-neutral.**
```

---

**EDIT 15B — Architecture §5.12 NFR budgets table (insert new row after line 2935)**

```
NEW:
| Pool spawn (§5.11, FR-20) | Pool Engine SLO | Per PRD envelope; evidence via load validation pre-launch (platform-owned) |
```

---

**EDIT 15C — Architecture §Gap Analysis (add new entry)**

```
NEW:
**FR-20 pool-spawn capacity envelope — provisional until validated.**
Architecture commits the capacity-bound mechanism (§5.11 saga decomposition +
bulk-write primitive + per-cycle partition isolation + immutable snapshot
evaluation) that targets the PRD pool-spawn envelope. **Observation:**
capacity assumption remains provisional until validated under representative
load. If pre-launch measurement reveals the envelope does not hold, the
spawn-saga decomposition or the bulk-write mechanism may require revision.
**Escalation path:** Gap Analysis findings may elevate the unresolved
capacity-validation outcome into a Launch Gate Risk alongside the entries in
§Launch Gate Risks above.
```

---

### Item 17 — P0 Launch Gates Inheritance

**Defect:** PRD §12 Phase 0 lists only legal/operational prerequisites; architecture's P0-1 through P0-5 validation experiments + Cloudflare/DPDPA gate + FR-20 capacity gate are nowhere in PRD's rollout phases. Sprint planning reading PRD §12 would silently under-scope.

**Resolution:** PRD §12 Phase 0 inherits architecture's gate inventory by reference (cross-reference, not duplication). Architecture §Launch Gate Risks made explicit about Phase 1 gating + non-binary disposition.

---

**EDIT 17A — PRD §12 Phase 0 (add new bullet after line 1462)**

```
NEW:
- **Architectural launch-blocker gates** — all entries in architecture §Launch
  Gate Risks must reach closure or explicit disposition before Phase 1
  transition. The list includes the P0-x validation experiments and decision
  / validation gates surfaced via architecture's Gap Analysis. **Substrate-
  conditional implementation commitments must not be frozen until P0-5
  closes; exploration, prototyping, and validation work may proceed.**
  Architecture remains the source of truth for gate definitions and closure
  criteria; PRD references the gate inventory but does not duplicate it.
```

---

**EDIT 17B — Architecture §Launch Gate Risks (line 4216–4217)**

```
OLD:
#### Launch Gate Risks (Owner / Support)

NEW:
#### Launch Gate Risks (Owner / Support)

**Phase 1 transition requires closure or explicit disposition of each listed
gate.** Each gate is named here with owner and support; PRD §12 Phase 0
references this inventory as a prerequisite category. Disposition may be
"closed," "accepted risk," "deferred per named criteria," or "reframed" —
binary closure is not required.
```

---

## 5. Implementation Handoff

### Change scope classification

**Moderate.** All 10 reconciliations are documentation-level (no implementation rework), but they cascade into:
- One new backend module narrative (§3.5a Helpdesk) — module already exists in directory structure; needs structural narrative.
- One new architectural commitment (§1.14 Member Lifecycle State Model + member self-declared WA opt-in flow + step-up OTP set) — these become epic input.
- Multiple capability bars (§5.8a Edge/WAF, §5.11 Pool spawn, Feature-flag tool, IAM isolation) that become ADR acceptance criteria.

### Handoff recipients

| Recipient | Deliverable | Action |
|---|---|---|
| **BigDev (sole engineer)** | This proposal + all 32 edits | Apply edits to `architecture.md`, `prd.md`, `addendum.md` in a single PR (or two if PRD/architecture separation is preferred). Verify edits against existing surrounding text. |
| **bmad-create-epics-and-stories** (next workflow) | Reconciled docs | Run AFTER edits land. Inherits cleanly without retroactive epic rework. |
| **Future ADR authors** | Capability bars committed in this proposal | Five capability bars become acceptance criteria for future ADRs: (1) IAM isolation §2.10a; (2) Edge/WAF §5.8a; (3) Feature-flag tool §Deferred Decisions; (4) Pool-spawn capacity §5.11; (5) Public-page composition §Member-Responsive Web Deferral. |

### Success criteria

- [ ] All 32 edits applied to PRD + architecture + addendum
- [ ] Diff review by BigDev confirms no inadvertent text loss
- [ ] No new "AWS" references in architecture (Item 1 cleanup verified)
- [ ] All cross-references resolve: §1.14, §2.10a, §3.5a, §5.8a, §5.11 capacity envelope
- [ ] PRD §12 Phase 0 explicitly inherits architecture gates
- [ ] §Gap Analysis carries the three new conditional-escalation observations (Items 3, 9, 15)
- [ ] Launch Gate Risks table updated (Items 10D, 17B)
- [ ] `bmad-create-epics-and-stories` run AFTER edit application, not before

### Sequencing recommendation

1. **Apply edits in a single PR per doc** — minimizes diff-review fatigue.
2. **Verify against this proposal** — each OLD block in this doc is verbatim from the current source; if OLD text doesn't match, the doc has drifted since 2026-05-27 and edits need re-checking.
3. **Run `bmad-create-epics-and-stories`** against the reconciled docs.
4. **First epic that should benefit immediately:** member identity / auth (§2.2 step-up OTP + session model is now precise enough for stories).
5. **ADR backlog generated from this proposal** (low priority, can wait for first relevant epic):
   - ADR — Cloud provider final selection (already implied by §5.1; ratify formally)
   - ADR — IAM isolation mechanism (§2.10a)
   - ADR — Edge/WAF selection contingent on legal review (§5.8a)
   - ADR — Feature-flag tool selection (§Deferred Decisions)
   - ADR — OTP fraud-policy thresholds (§2.2 force-re-OTP signals)
   - ADR — Public-page composition framework (§Member-Responsive Web Deferral)
   - ADR — Pool-spawn bulk-write primitive (§5.11)

### Out of scope (deferred to IR — Implementation Readiness check post-epics)

Eight defects from the original audit remain unresolved here, deferred to IR:

- **Item 4** — Rejoin-lock identity tuple (eHRMS retention through soft-delete/RTBF for FR-6 dual-identity rejoin lock)
- **Item 6** — FR-100 forward-compat back-prove of historical Vyawastha Shulk state (architectural slot named, load-bearing data commitment missing)
- **Item 7** — FR-14 Pool Engine determinism hash-input-invariance constraint (§1.6 snapshot migration policy)
- **Item 8** — FR-43A internal appeal flow (architected as thread, not substance — multi-stage state machine + SLA tracker + separation-of-duties)
- **Item 13** — FR-13 culture-rooted pool-name list storage surface (Niyamavali registry vs branding bundle vs separate admin list)
- **Item 14** — FR-69 tone-guide / FR-94 lawyer-reviewed T&C enforcement architecture (commit gates)
- **Item 16** — Per-tenant JSONB custom-field hard limits (§1.7) imposing constraints PRD FR-54 does not authorize
- **Item 18** — TLS 1.3+ launch-blocker NFR restatement (Step 2 commits property; architecture never pins TLS version at edge/internal hops)

---

## Appendix A — Discipline patterns surfaced during this run

Three TWT documentation discipline boundaries were sharpened during the workflow run; each is saved to project memory for future reference:

1. **Architecture vs ADR boundary** — Architecture commits properties / capabilities / outcomes (vendor-neutral); ADRs commit cloud controls / vendor features / specific mechanisms. Capability bars are acceptance criteria for future ADRs and are intentionally vendor-neutral.

2. **Architecture vs PRD boundary** — Architecture commits state / transitions / events / structural semantics; PRD commits policy / eligibility / cadence / consequences. Architecture must not duplicate PRD policy. The "Policy consumers:" list pattern is the canonical shape — architecture enumerates *who reads this state*, not *what they do with it*.

3. **Gap Analysis is observational** — Gap Analysis records observations and conditional escalation paths; it does not directly prescribe sprint planning or override architecture. When a Gap Analysis entry needs to express "this could become a launch gate," frame it as: "Gap Analysis findings may elevate unresolved decisions into Launch Gate Risks." Conditional and one-way.

Operational principles also surfaced:
- **Use relative-to-fact triggers** (e.g., `valid_through + 1 day`), not calendar offsets (e.g., "Day +366"), to avoid baking in date-model assumptions.
- **Event-sourcing posture for domain state** — "state is derived from event history; persisted state is an optimization only."
- **Non-binary gate disposition** — gates close as "closed," "accepted risk," "deferred per named criteria," or "reframed."

---

**End of Sprint Change Proposal.**
