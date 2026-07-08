# ADR-0026: DigiLocker signature-verification policy (cert staleness budget, key rotation, compromise procedure, offline-cache validity)

> **Status:** ratified
> **Date:** 2026-07-08 (date entered current status)
> **Author:** BigDev (Solo Builder)
> **Ratifying trustees:** Dhiraj Rahul (Trustee 1) + Kalpana Bharti (Trustee 2) — ratified at the 2026-07-08 Trustee Panel session; consent sheet `docs/knowledge-transfer/adr-ratification-consent-sheet-2026-07-08.md`; logged in `.decision-log.md` Decision 2026-07-08-065
> **Supersedes:** —
> **Superseded by:** —

## Context

This ADR is the **control mechanism** for the DigiLocker signature-verification *property*
the architecture commits but deliberately **delegates the numbers for** to an ADR (per
[[feedback_architecture_vs_adr_boundary]]):

- [architecture.md §2.8 L1608-1615] commits the property — "DigiLocker returns a PKI-signed
  XML (eAadhaar); verification at the application layer using the issuer's public
  certificate; certificates cached, refreshed via daily pg-boss job; refresh failure
  **alarms (not fail-closed) — last good certificate is used until refresh succeeds, with
  named staleness budget in Category 5 Observability**; signature-verification failure →
  `pending-valid` manual fallback, never silently accepted."
- [architecture.md §3.8 L2325-2331] commits the SHAPE of the budget — "Staleness budget
  **named in an ADR** with **two windows**: a within-budget window (cached cert trusted +
  staleness alarms fire) and a **hard limit** past which new KYC verifications **fail
  closed**." It explicitly names *an ADR* as the home for the values.
- [architecture.md §2.8 L1617-1621] commits the key-compromise property — "rotate KEK +
  reissue certificate cache; KYC entries verified against a known-compromised key are
  flagged for re-verification (trustee-action queue, FR-2); procedure rehearsed quarterly."
- [architecture.md §Deferred Decisions L174-176] catalogues this exact slot
  (`ADR-NNNN-digilocker-signature-policy [P0]`) with expected close trigger **"Story 3.3a
  (DigiLocker provider abstraction) closure"** — i.e. THIS story authors it.

This is **authoring the source of truth**, not back-filling un-captured evidence: the
architecture has *no* numbers to record; it forces the choice into an ADR, and this is that
ADR (distinct from [[feedback_record_unattested_no_backfill]], which forbids inventing
values for evidence that was *promised but never captured*). Story 3.3a wires the
**mechanism** (the two-window evaluation in
`apps/api/src/modules/kyc/providers/digilocker/staleness-policy.ts`); this ADR commits the
**values** the mechanism reads via named constants.

**Risks if undecided:** the provider cannot know when to trust a stale cached cert vs fail
closed — either it fails closed on the first refresh miss (blocking every signup the moment
a daily job hiccups) or it trusts an indefinitely-stale cert (a security hole). The
two-window budget threads that needle.

**Decision deadline:** Story 3.3a closure (this story).

## Decision

### 1. Two-window certificate staleness budget (the values the code reads)

The DigiLocker provider evaluates a cached issuer cert by **age since last successful
refresh** (`digilocker_public_certs.fetched_at`; the daily pg-boss refresh job bumps it on
every success — the cron registration is the 3.3b/ops seam, the function ships in 3.3a):

| Window | Age since `fetched_at` | Behaviour |
|---|---|---|
| **Fresh** | ≤ **7 days** | Cached cert trusted; no alarm. |
| **Within-budget** | > 7 days and ≤ **30 days** | Cached cert **trusted** + a **staleness alarm** fires to ops (Category 5). |
| **Past hard-limit** | > **30 days** | New verifications **fail closed** → `KycError(certificate_stale)` → (3.3b routes the member to `pending-valid` manual trustee fallback, FR-2). **Existing verified members are unaffected.** |

The committed values:

- **Within-budget window = 7 days** (`CERT_STALENESS_WITHIN_BUDGET_MS`). Rationale: the
  refresh job runs **daily**, so 7 consecutive failed refreshes (a full week) is a strong
  signal of a real operational problem worth alarming on — but not yet worth blocking new
  members, since a valid issuer cert changes rarely (years, not days).
- **Hard limit = 30 days** (`CERT_STALENESS_HARD_LIMIT_MS`). Rationale: a month of
  continuous refresh failure means the cache can no longer be trusted to reflect a
  rotation/revocation; failing *new* verifications closed (manual fallback, not data loss)
  is the safe posture. 30 days also comfortably exceeds any plausible transient
  DigiLocker/UIDAI outage or our own deploy freeze.

These are the ONLY two staleness numbers in the code; they live here, and the provider
reads them via the named constants citing this ADR. Changing them is an amendment to this
ADR, not a code edit.

### 2. Signature-verification mechanics (never silently accept — AC7)

- The eAadhaar enveloped **XMLDSig** is verified at the application layer against the
  **cached issuer certificate** — NEVER a certificate embedded in the response's `KeyInfo`
  (the provider pins to the cached cert; the embedded cert is ignored). Verification covers
  both the `SignedInfo` signature and every reference digest (tamper detection).
- Allowed signature algorithms: **rsa-sha256** (and rsa-sha512); weaker/legacy algorithms
  (e.g. rsa-sha1) are rejected.
- Any verification failure — no signature, wrong key, tampered payload, disallowed
  algorithm — normalizes to `KycError(verification_failed | signature_invalid)`. The
  provider **never** returns a partial/unverified profile.

### 3. Key-rotation cadence

- The cached cert set is refreshed **daily** (the operational refresh; the 3.3b/ops cron).
- A scheduled **review of the trust anchor + KEK** is performed **at least every 365 days**
  (annual), and on any issuer-published rotation. Routine UIDAI/DigiLocker cert rotations
  are absorbed automatically by the daily refresh (a new cert upserts on its `key_id`); the
  annual review is the human checkpoint that the refresh source + allowlist are still
  correct.

### 4. Key-compromise / re-verification procedure

On a known or suspected issuer-key compromise:

1. **Deactivate** the compromised cert in the cache (`deactivateDigiLockerCert` →
   `is_active = false`; the row is preserved for audit, never deleted) so the verifier
   stops trusting it immediately.
2. **Rotate the KEK + reissue the certificate cache** (architecture §2.8) — force a refresh
   to pull the replacement issuer cert.
3. **Flag for re-verification**: KYC entries verified against the compromised key are
   enqueued for re-verification on the trustee-action queue (FR-2). (The enqueue mechanism
   is a 3.3b/Epic-3 consumer concern; this ADR commits the *procedure*.)
4. The procedure is **rehearsed quarterly** (architecture §2.8); incident response is owned
   by Category 5.

### 5. Offline-cache validity semantics

A cached cert is usable for verification only while **all** hold: `is_active = true`, the
current instant is within the X.509 validity window (`not_before ≤ now < not_after`), and
the staleness age is **not past the hard limit** (decision 1). The X.509 `not_after` (hard
cert expiry) and the staleness hard-limit are independent gates — whichever trips first
stops trust. A refresh failure does NOT fail closed inside the within-budget window (the
architecture's "not fail-closed on refresh failure" — last good cert is used, with alarms).

### 6. Callback redirect_uri allowlist (§2.8)

The OAuth `redirect_uri` is validated against a **server-side per-environment allowlist**;
a mismatch is rejected at the auth boundary (`provider_unavailable`) before any user
round-trip, and allowlist changes are audit-logged.

## Alternatives considered

- **Single staleness threshold (fail closed immediately on any refresh miss).** Rejected —
  a single daily-job hiccup would block every new signup, contradicting architecture §2.8's
  explicit "not fail-closed on refresh failure / last good cert used with a staleness
  budget." The two-window design is the architecture-mandated shape.
- **Trust the cert embedded in the eAadhaar `KeyInfo`.** Rejected — the response is
  attacker-influenceable; trusting an embedded cert defeats PKI verification. Pinning to the
  cached issuer cert is the only safe posture (AC7).
- **Hardcode the budget numbers in the provider.** Rejected — architecture §3.8 L2326
  explicitly names *an ADR* as the home for the values; hardcoding would hide a P0 security
  parameter from review. The code reads named constants that cite this ADR.
- **Longer hard limit (e.g. 90 days).** Deferred, not rejected — if operational data shows
  legitimate multi-week refresh gaps are common, revisit via an amendment to this ADR. 30
  days is the conservative launch value.

## Consequences

- **Operational** — Creates two Category-5 obligations: (a) a **staleness alarm** route for
  the within-budget window (7–30 days since last refresh), and (b) the **quarterly
  key-compromise rehearsal** + the **annual trust-anchor review**. The daily refresh job
  (3.3b/ops) must bump `fetched_at` on every success for the budget to mean anything.
- **Security** — Pins verification to the cached issuer cert (no embedded-cert trust); fails
  closed past the hard limit; deactivation + re-verification on compromise. Adds a
  vendor-trust dependency on UIDAI/DigiLocker issuer certs (architecture §2.1 threat model).
- **Performance** — Negligible: the staleness check is an in-memory date comparison; the
  signature verify is a single XMLDSig validation within the NFR-27 8s p95 budget.
- **Failure modes accepted** — Past the 30-day hard limit, NEW verifications fail closed and
  members route to manual trustee fallback (`pending-valid`, FR-2); already-verified members
  are unaffected. A genuine >30-day DigiLocker outage degrades new-signup KYC to manual —
  an accepted, alarmed degradation, not data loss.
- **Migration / pivot path** — The values are amendable here (trigger: operational data on
  refresh-gap frequency, or a trustee security review). If DigiLocker is swapped for an
  aggregator (architecture §3.8 substitution path), the same two-window budget applies to
  the new provider's cert cache — this ADR's policy is provider-neutral.

## References

- [Source: architecture.md §2.8, lines 1602-1634] — OAuth+PKCE, signature-verification policy, key-compromise, callback allowlist, SDK pinning + provenance (the property this ADR controls).
- [Source: architecture.md §3.8, lines 2310-2331] — provider-interface location, `digilocker_public_certs`, aggregator substitution path, the two-window staleness budget shape ("named in an ADR").
- [Source: architecture.md §Deferred Decisions, lines 174-176] — the `ADR-NNNN-digilocker-signature-policy [P0]` slot + close trigger "Story 3.3a closure".
- [Source: architecture.md §AR-43 (line 319) / freeze row 13 (line 530)] — the provider-interface freeze this ADR's signature policy sits behind.
- [Source: epics.md, Story 3.3a] — the owning Story (this ADR's write-trigger); AC7.
- [Source: `apps/api/src/modules/kyc/providers/digilocker/staleness-policy.ts`] — the named constants (`CERT_STALENESS_WITHIN_BUDGET_MS` = 7d, `CERT_STALENESS_HARD_LIMIT_MS` = 30d) reading these committed values + `evaluateCertStaleness`.
- [Source: `apps/api/src/modules/kyc/providers/digilocker/signature.ts`] — the cached-cert-pinned XMLDSig verifier (decision 2).
- [Source: `docs/knowledge-transfer/adr-index.md`, Section A] — the live index row for this ADR (Story 3.3a flips it `slot-reserved-pre-write` → `drafted`).
- Memory: [[feedback_architecture_vs_adr_boundary]] — discipline anchor (architecture commits the property; this ADR commits the control).
- Memory: [[feedback_record_unattested_no_backfill]] — authoring-source-of-truth vs back-fill distinction (this ADR is the former).

---

## Changelog

| Date | Status flip | Author | Notes |
|---|---|---|---|
| 2026-06-25 | (initial draft) | BigDev (Solo Builder) | Authored at Story 3.3a closure (the slot's write-trigger). Commits the two-window staleness budget (7d / 30d), key-rotation cadence (annual review + daily refresh), key-compromise + re-verification procedure, offline-cache validity, and the redirect_uri allowlist. Ratification is a later Trustee-Panel event — lands `drafted`, un-attested-pending. |
| 2026-07-08 | drafted → ratified | Dhiraj Rahul + Kalpana Bharti | Ratified at the 2026-07-08 Trustee Panel session (consent sheet `adr-ratification-consent-sheet-2026-07-08.md`, flagged trustee-judgment weight given the P0 KYC fail-closed thresholds); Decision 2026-07-08-065. |
