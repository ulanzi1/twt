# Story 0.2: Credential Escrow Established with Trustee Quorum Open

Status: in-progress

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

### Task progress

- Tasks 1, 2, 3, 4, 5 — author-committed (artifacts in repo; see Dev Agent Record → File List). The `[CONTINUITY]` entry in `.decision-log.md` records framework status as "Author-committed; awaiting trustee sign-off."
- Tasks 6, 7, 8, 9 — awaiting external action (Trustee Panel + Solo Builder mechanism + custodial selection; trustee execution of sealings, dry-run, bus-factor table-top). Status flips to `review` only when at least Tasks 6 + 7 + 8 close per the AC text. AC-3 full closure is multi-Story-deferred per the closure-language precision discipline.

## Story

As a Trustee Panel,
I want production credentials (prod DB, Cloudflare admin, Dokploy admin, partner integrations, payment intent / banking, DigiLocker integration, DPDPA breach-reporting tooling) sealed in escrow openable only by trustee-quorum action,
So that the trust can recover access to every production-affecting system if Solo Builder is unreachable for > 7 days, without violating the audit independence invariant that protects the same systems' tamper-evidence story.

## Acceptance Criteria

1. **AC-1 — Credential inventory authored, envelopes sealed with ≥2-trustee quorum, location documented and known to all trustees**

   **Given** the seven PRD §9.1.1 credential domains (prod DB access, Cloudflare admin, Dokploy admin, partner integrations, payment intent / banking, DigiLocker integration, DPDPA breach-reporting tooling) and the AR-67 commitment to credential escrow with ≥2-trustee sealed envelopes
   **When** Solo Builder authors the credential inventory and constructs the escrow framework
   **Then** `docs/escrow/` exists per architecture §Workspace Layout (line 4172) with the artifacts listed in Project Structure Notes
   **And** `docs/escrow/credential-inventory.md` enumerates every PRD §9.1.1 credential domain with a row recording: domain name, owning system, current availability status (`sealable-now` | `pending-system-availability` | `deferred-with-ADR`), envelope reference (sealed envelope's escrow ID, or the future Story that instantiates the credential), trustee quorum class, last-seal date, and re-seal trigger
   **And** every credential envelope ever sealed is sealed such that opening requires ≥2-trustee quorum — the sealing-mechanism choice itself is ADR territory (per [[feedback_architecture_vs_adr_boundary]] — the architecture commits the *property*, not the cryptographic / physical control)
   **And** the **escrow location** is documented as a property (custodial posture: trustee-held + non-Solo-Builder custodial location; geographic separation between custodial copies if multiple exist) and the specific custodial choice is recorded in `.decision-log.md` as a `[CONTINUITY]` decision; the location is known to all trustees via the credential-inventory document — not via verbal handoff
   **And** the **§2.10a audit independence invariant is preserved**: audit-mirror credentials (the `twt-audit-mirror` GCP project service-account chain per architecture §2.10 / §5.9) are sealed in a **structurally distinct envelope class** — not openable by the same quorum action that opens prod-credential envelopes. The mechanism for structural distinctness (separate physical envelope held by a disjoint trustee subset; separate key share scheme; separate ADR-named control) is deferred to ADR; the *property* — "compromise of the prod-envelope quorum must not transitively grant audit-mirror access" — is committed here. See [[feedback_architecture_vs_adr_boundary]].
   **And** **closure precision** (per [[feedback_closure_language_precision]]): each inventory row is one of three states — **Closed by [seal]** (envelope sealed; ID recorded), **Resolved via explicit deferral** (system does not yet exist at v0.2 time; the owning Story is named; the re-evaluation trigger is the owning Story's closure), or **Not addressed** (in scope but neither sealed nor explicitly deferred — this state should not occur and triggers an open question). Never collapse "deferred" with "closed."

2. **AC-2 — Dry-run quorum-open + re-seal succeeds for each envelope class (amended per Story 0.2 code-review Decision 4)**

   **Given** the sealed-envelope framework from AC-1 and at least one non-production credential available for the rehearsal per envelope class (the candidate sets: for `prod-credential` — a staging-environment Cloudflare API token, OR the GitHub Actions WIF impersonation binding for the staging deploy workflow, OR an equivalent staging-only credential; for `audit-mirror-credential` — a staging audit-mirror service account once Story 1.10 + Story 0.6 close per Decision 3; for `high-sensitivity-tier-credential` — a test KEK in the structurally separate GCP project, OR a sandbox partner JWT signing key, OR an equivalent high-sensitivity rehearsal credential)
   **When** the Trustee Panel executes the documented quorum-open procedure on the chosen rehearsal credential and re-seals after retrieval, **once per envelope_class**
   **Then** each open-then-re-seal cycle completes; the credential is retrievable to the trustees in usable form (it can authenticate to the staging target); the re-sealed envelope passes the verification check defined in the sealing procedure (envelope integrity hash matches, or physical seal-tape integrity verified, per the ADR-recorded mechanism)
   **And** each dry-run event is logged in `docs/escrow/escrow-ledger.md` "Dry-run log" with: rehearsal date, executing trustees (≥2 per envelope_class quorum), credential class, envelope_class, open-step verification, re-seal-step verification, any gaps discovered
   **And** any gap discovered (procedure ambiguity, mechanism failure, verification check insufficient) triggers a procedure revision; the revision is itself a `.decision-log.md` `[CONTINUITY]` entry citing the gap, and that envelope_class's dry-run is **provisionally closed** until a successful re-execution against the revised procedure
   **And** the rehearsal credentials are **not rotated** as a consequence of the dry-run unless the dry-run reveals exposure (architecture §5.9 rotation policy governs ordinary rotation; dry-run alone does not constitute exposure)
   **And** **provisional closure** of AC-2 is acceptable when at least one envelope_class is rehearsed (typically `prod-credential` first under the hybrid pre-ADR sealing rule); **full closure** requires all three envelope classes rehearsed — which requires the credential-escrow-mechanism ADR + Story 1.10 + Story 0.6 to close before the `audit-mirror-credential` and `high-sensitivity-tier-credential` rehearsals can execute. Closure-language precision per `[[feedback_closure_language_precision]]`: "Provisionally closed via `prod-credential` rehearsal dated YYYY-MM-DD; full closure deferred to ADR + Stories 1.10 + 0.6 + per-class rehearsals" is the correct phrasing during the partial-closure window

3. **AC-3 — Bus-factor table-top scenario: trustees access every then-extant production system without Solo Builder consultation**

   **Given** Solo Builder is silent for the duration of the table-top exercise (no questions answered; no consultation; no observation feedback — the bus-factor simulation discipline from Story 0.1 AC-4 applies here equivalently)
   **And** the set of production systems in scope is limited to those that **exist at table-top time** (envelopes in the inventory marked `sealable-now` and actually sealed); systems whose credentials are `pending-system-availability` are explicitly out of scope for this exercise and are deferred to a future table-top after the owning Story closes
   **When** the Trustee Panel executes the quorum-open procedure for every in-scope envelope
   **Then** for each in-scope system, the trustees obtain credentials and use them to verify access to that production surface (sign in to Cloudflare admin; authenticate to the production database via the documented connection path; etc.) — verification is the access test, not just envelope retrieval
   **And** every access is logged in `docs/escrow/escrow-ledger.md` with executing trustees, date, system accessed, verification outcome (success | gap | deferred-out-of-scope)
   **And** the table-top is **provisionally closed** if at least one in-scope envelope opens successfully and the procedure does not require Solo Builder input; **fully closed** only when every PRD §9.1.1 credential domain has at least one successful table-top access — which requires every owning Story (3.3b for DigiLocker, 7.6/7.7 for payment intent, etc.) to close first. Closure-language precision per [[feedback_closure_language_precision]]: "Provisionally closed via partial-scope table-top; full closure deferred to inventory completion across Stories 1.x / 3.x / 7.x / 8.x" is the correct phrasing when only a subset is in scope.
   **And** if Solo Builder is consulted during the exercise (silently observable as a question raised), that is the gap to log — the procedure is insufficient, not the trustees

## Tasks / Subtasks

- [x] **Task 1 — Establish escrow scaffolding under `docs/escrow/`** (AC: 1)
  - [x] Create `docs/escrow/` directory at repo root (per architecture §Workspace Layout line 4172). Verified non-existent via `ls /Users/dev/Developer/projects/TWT/docs/escrow/` before creating (returned `No such file or directory`); created via `Write` tool's auto-parent-directory behavior.
  - [x] Author `docs/escrow/README.md` describing: framework lifecycle (inventory → sealable → sealed → re-sealed-post-rotation → quorum-opened → re-sealed-post-open), property/control/policy three-way discipline applied to escrow (per [[feedback_architecture_vs_adr_boundary]]), §2.10a audit independence invariant as envelope-class separation constraint (Task 4 contribution), relationship to ADRs / runbooks / `.decision-log.md`, sign-off lifecycle, credential-domain inventory summary, open ADR slots, related escrow surfaces owned elsewhere (code escrow Story 0.3; DR runbook PDF §5.7; KT pack Story 0.5; backup engineer contract Story 0.6; legal counsel Story 0.13), review cadence, file index.
  - [x] Create `docs/escrow/_envelope-template.md` — per-credential envelope content schema with `envelope_id`, `envelope_class` (load-bearing for §2.10a, populated by Task 4), `credential_class`, `system_identity`, `credential_payload`, `sealing_date`, `sealing_trustees`, `intended_quorum_class`, `re_seal_trigger_conditions`, `last_rotation_reference`, `custodial_location_reference`, `verification_check_signature`. Explicit "envelope contents NOT in the schema" section names what lives elsewhere; high-sensitivity-tier + audit-mirror caveats documented.
  - [x] Create `docs/escrow/credential-inventory.md` scaffold (populated by Task 2) with the inventory schema (Credential class, PRD §9.1.1 domain, Owning Story, Envelope class, Availability status, Envelope reference, Re-seal trigger, Last-seal date, Notes columns).
  - [x] Create `docs/escrow/escrow-ledger.md` — trustee event-record with sections: Framework-commit record (Story 0.2 framework-commit row dated 2026-05-29 inserted), Sealing log, Dry-run log, Bus-factor table-top log (with closure-language-precision callout per [[feedback_closure_language_precision]]), Periodic re-attestation log, Procedure-revision log. Mirrors `docs/runbooks/operational-readiness-ledger.md` pattern from Story 0.1.
  - [x] Create `docs/escrow/sealing-procedure.md` — five-section runbook authored using the `docs/runbooks/_template.md` schema verbatim (Task 3 contribution; Task 4 contributes the §2.10a separation guardrail in the Prerequisites section).
  - [x] Cross-link from `.decision-log.md` — Task 5 appended Decision 2026-05-29-002 referencing all five new framework documents and the scaffolding commit. Append-only; the Story 0.1 entry (Decision 2026-05-29-001) was NOT modified.

- [x] **Task 2 — Populate the credential inventory with all seven PRD §9.1.1 domains** (AC: 1)
  - [x] **Domain 1 — Prod DB access:** two rows — `cloud-sql-service-account-prod` (Owning Story 1.2; `prod-credential`; `pending-system-availability`; re-seal trigger architecture §5.9 "Database credentials" rotation cadence) + `cloud-sql-iam-recovery-grant` (companion IAM-grant recovery row that complements the service-account row under bus-factor scenario per architecture §2.10 sole-engineer credential restrictions).
  - [x] **Domain 2 — Cloudflare admin:** `cloudflare-account-admin` (Owning use by Story 0.3 mirror + Story 1.13 edge protection; `prod-credential`; `sealable-now` pending Task-7-time confirmation with Solo Builder; includes account admin API token + 2FA recovery codes per architecture §5.8a; substrate-pivot note for the Cloudflare-DPDPA compatibility deferral per §5.8a).
  - [x] **Domain 3 — Dokploy admin:** `dokploy-substrate-admin` (Owning Story 1.15 for full provisioning; `prod-credential`; status `sealable-now` if provisioned else `pending-system-availability`, confirm during Task 7; K8s migration path per FR-62 noted — envelope is re-sealed when Dokploy is succeeded by K8s).
  - [x] **Domain 4 — Partner integrations:** `partner-integration-{partner}-credentials` per-partner row category (Owning Stories 12.1 + 12.5; `prod-credential` per partner, partner JWT signing keys MAY be `high-sensitivity-tier-credential`; `deferred-with-ADR` until first partner contract; closure-language precision invoked — deferral rationale recorded, not collapsed to `sealed`).
  - [x] **Domain 5 — Payment intent / banking:** three rows — `trust-bank-operational-access` (pre-existing at trust formation per PRD §11; `prod-credential`; `sealable-now` pending Task-7 confirmation; references Story 9.9 dual-account workaround); `upi-intent-reference-signing-key` (Owning Story 7.7; `high-sensitivity-tier-credential` per §5.9 — signing key; `pending-system-availability`); `bank-statement-intake-transport-credentials` (Owning Story 9.2; `prod-credential` per bank per 5-bank parser allowlist; `pending-system-availability`).
  - [x] **Domain 6 — DigiLocker integration:** two rows — `digilocker-oauth-client` (Owning Story 3.3b gated by 3.3a; `prod-credential`; `pending-system-availability`; includes client_id + client_secret + redirect URI allowlist per architecture §2.8) + `digilocker-issuer-cert-pinning-recovery` (companion certificate-revocation-recovery row per §2.8 "Key compromise procedure").
  - [x] **Domain 7 — DPDPA breach-reporting tooling:** three rows — `dpo-breach-reporting-portal` (Owning Story 14.3 gated by Story 0.13 legal counsel; `prod-credential`; `pending-system-availability` — DPO not appointed at Story 0.2 closure per PRD §11 OQ-7); `incident-response-tooling-credentials` (paging SaaS; `prod-credential`; `pending-system-availability` since no paging SaaS provisioned at v0.2 time per architecture §5.10 operations-ADR deferral); `dpo-contact-path` (DPO identity + escalation tree + replacement procedure).
  - [x] **Re-seal trigger columns populated per row** with the architectural source of the rotation event (§5.9 Database credentials; §5.9 Partner JWT signing keys; §5.9 KEK rotation; §2.8 DigiLocker key compromise procedure; operations policy cadence; bank-policy cadence; per partner contract; per DPDPA authority requirements). Trigger column is the rotation-driven re-seal anchor.
  - [x] **High-sensitivity tier separator section added** ("Out-of-scope-for-§9.1.1 architecturally-adjacent envelope classes") covering: `kek-root-tier-1-envelope-encryption` (Story 1.5; `high-sensitivity-tier-credential`); `hmac-root-tier-2-blind-index` (Story 1.5); `audit-mirror-write-service-account` (Story 1.10; `audit-mirror-credential` — the load-bearing §2.10a row); `audit-mirror-read-service-account` (Story 1.10; `audit-mirror-credential`); `partner-jwt-signing-key-{partner}` (per-partner; `high-sensitivity-tier-credential`); `telephony-recording-storage-credentials` (Epic 10 Story 10.3; `high-sensitivity-tier-credential`); `backup-engineer-access-credentials` (Story 0.6; `prod-credential` read-only default per §5.10); `dr-runbook-pdf-custody` (Story 0.4 + §5.7; `prod-credential` — honoring the architectural cross-reference that DR runbook PDFs are sealed under this same framework).
  - [x] Inventory status summary populated: at Story 0.2 closure, 0 rows sealed; 1-3 `sealable-now` (Cloudflare admin definite; Dokploy admin + trust bank operational confirm during Task 7); 14 `pending-system-availability`; 2 `deferred-with-ADR` (partner credentials + partner JWT signing keys); ~19 total rows tracked. Closure-language precision callout per [[feedback_closure_language_precision]] inline.

- [x] **Task 3 — Author the sealing-procedure runbook** (AC: 1, 2)
  - [x] Used `docs/runbooks/_template.md` five-section schema verbatim. Status header records draft + Trustee Panel owner + Solo Builder source-of-truth + bus-factor backup engineer per §5.10; architectural authority citations per architecture §Workspace Layout / §2.10a / §2.10 / §5.9 / §5.7 / §5.10 + PRD §9.1.1 + AR-67.
  - [x] **§1 Prerequisites** populated: sealing mechanism ADR-recorded, custodial location ADR-recorded, envelope-class assignment verified against `credential-inventory.md` (the §2.10a enforcement point), ≥2 trustees present, source-of-truth retrieval ready, audit-log baseline verified, inventory row availability is `sealable-now`, high-sensitivity tier two-person approval per §5.9 (when applicable), **§2.10a separation guardrail check** explicitly enumerated (Task 4 contribution).
  - [x] **§2 Step-by-step procedure** in 7 sub-steps: (2.1) verify envelope does not already exist; (2.2) retrieve credential from source-of-truth (with cloud / non-cloud / recovery-path-only variants); (2.3) construct envelope per `_envelope-template.md`; (2.4) apply sealing mechanism (tagged `[deferred ADR — placeholder procedure]` with candidate mechanism list per architecture §5.9 high-sensitivity discipline); (2.5) record seal in `escrow-ledger.md` (with atomic inventory-row update); (2.6) transmit to custodial location (tagged `[deferred ADR — placeholder procedure]` for transmission-security commitments); (2.7) emit audit line + `.decision-log.md` entry per Story 0.1 schema.
  - [x] **§3 Rollback procedure** per architecture §1.8 forward-only analogy: return credential to source-of-truth (destroy any buffer / printed paper); rotate via `docs/runbooks/secret-rotation.md` if exposure cannot be ruled out; record rollback in `escrow-ledger.md` with outcome=`gap`; author `.decision-log.md` `[CONTINUITY]` entry; do NOT mark inventory row `sealed` until re-sealing succeeds (closure-language precision per [[feedback_closure_language_precision]] — failed seal is "Not addressed (rolled back)", not "Closed by [seal]").
  - [x] **§4 Verification checks** as deterministic pass/fail signals: envelope integrity check (`verification_check_signature` match), custodial-location receipt confirmation, escrow-ledger row with ≥2-trustee attestation, atomic inventory update, `.decision-log.md` entry committed, audit line emitted, **§2.10a separation invariant still holds**, high-sensitivity §5.9 two-person operational approval recorded when applicable.
  - [x] **§5 Contact escalation list** with role names: Trustee Panel chair on rota; Solo Builder (NOT for bus-factor scenario); backup engineer per Story 0.6 (read-only default + per-action trustee approval for write per §5.10); trustee escalation for §2.10a-touching steps; legal counsel escalation for DPDPA / partner-contract terms (per Story 0.13).
  - [x] Changelog row recorded for initial author-commit dated 2026-05-29.

- [x] **Task 4 — Document the §2.10a audit independence invariant as a hard envelope-class constraint** (AC: 1)
  - [x] In `docs/escrow/README.md`, dedicated "Audit independence invariant — envelope-class separation" section authored: cites architecture §2.10a verbatim, explains why naive single-envelope-class escrow violates the invariant (coercion-of-two-trustees scenario), names the three envelope classes (`prod-credential` / `audit-mirror-credential` / `high-sensitivity-tier-credential`), enumerates four candidate separation mechanisms (disjoint trustee subsets / separate sealing mechanisms / separate custodial paths / hybrid) marked as ADR territory per [[feedback_architecture_vs_adr_boundary]], states the trustee headcount constraint for the disjoint-subset mechanism (PRD §11 ≥3 minimum; 2-of-3 disjoint requires ≥4).
  - [x] In `docs/escrow/_envelope-template.md`, `envelope_class` field added as load-bearing field with allowed-values enumeration and the structural-invariant note that mismatched assignments MUST abort sealing; high-sensitivity-tier + audit-mirror caveat sections added to the envelope template per architecture §5.9 + §2.10.
  - [x] In `docs/escrow/credential-inventory.md`, `Envelope class` column populated across all 19 rows: the audit-mirror write + read service-account rows get `audit-mirror-credential`; KEK roots + HMAC roots + partner JWT signing keys + telephony recording-storage get `high-sensitivity-tier-credential`; all other rows get `prod-credential`. Inventory header explicitly names this column as "the structural anchor for the §2.10a invariant."
  - [x] In `docs/escrow/sealing-procedure.md`, Prerequisites §1 contains the explicit guardrail: "Verify that the proposed sealing custody arrangement preserves envelope-class separation per `README.md` §'Audit independence invariant — envelope-class separation'. A sealing operation that violates separation MUST be aborted." The guardrail names the specific failure modes (audit-mirror credential sealed under prod custodial path; sealing trustees from the wrong subset).
  - [x] Invariant noted as **load-bearing**: documented in README + envelope template + inventory + sealing-procedure that if the chosen sealing mechanism cannot express the separation, the mechanism is wrong (not the invariant). The invariant is non-negotiable.

- [x] **Task 5 — Initialize the `[CONTINUITY]` `.decision-log.md` entry for the Story 0.2 framework commitment** (AC: 1)
  - [x] Appended new entry **at the top** of the "## Decisions" section (reverse-chronological per the file's header comment) — Decision 2026-05-29-002. Story 0.1's Decision 2026-05-29-001 was NOT modified; template + decision-type index were NOT modified.
  - [x] Entry title verbatim: `Decision 2026-05-29-002: Credential escrow framework scaffolding committed; sealing-mechanism + custodial-location selection pending`.
  - [x] Entry contents per Story 0.1 load-bearing template: Decision type = `Story 0.2 — Credential Escrow`; Status = `Author-committed; awaiting trustee sign-off`; Author = Solo Builder (BigDev); Ratifying trustees = pending. Context describes Story 0.2 scope + Tasks 1-5 author-commit vs Tasks 6-9 awaiting external action.
  - [x] Decision (numbered 1-8) commits: (1) `docs/escrow/` canonical location per architecture §Workspace Layout line 4172; (2) five framework documents as governance instruments; (3) envelope-class separation per §2.10a as load-bearing structural invariant; (4) sealing mechanism deferred to ADR; (5) custodial location deferred to ADR; (6) `docs/adr/` directory scaffolding scope open follow-up; (7) inventory enumerates 19 rows across 7 PRD §9.1.1 domains + 7 architecturally-adjacent envelope classes with per-row closure-language-precision availability states; (8) framework ready for Tasks 6-9 with provisional-vs-full closure language precision.
  - [x] Open follow-ups list trustee mechanism + custodial selections (superseding entries), ADR scaffolding decision, credential-escrow-mechanism ADR authoring (replaces `[deferred ADR]` tags), Trustee Panel ≥2-trustee sign-off on the framework-commit row in `escrow-ledger.md`, Tasks 7-9 execution paths, Story 0.3 mirror coverage update, trustee-headcount confirmation for disjoint-subset mechanism per Story 0.2 Open Question #6.
  - [x] References point to story file, all five framework documents, Decision 2026-05-29-001, architecture §Workspace Layout / §2.10a / §2.10 / §5.9 / §5.7, PRD §9.1.1, AR-67.

- [ ] **Task 6 — Trustee selection of sealing mechanism + custodial location** (AC: 1) — _AWAITING EXTERNAL ACTION (Trustee Panel + Solo Builder)_
  - [ ] Trustee Panel + Solo Builder select the sealing mechanism. Candidate mechanism options (the Trustee Panel decision is the authority; this list is informational for the decision conversation only): (a) physical sealed envelopes in a bank safe deposit box held jointly by ≥2 trustees; (b) cryptographic sealing via GPG-encrypted-to-N-recipients with N selected such that ≥2 trustees plus an emergency-recovery share threshold; (c) Shamir's Secret Sharing with M-of-N share distribution to trustees + custodial backup; (d) a password manager's emergency-kit feature (e.g., 1Password Emergency Kit with multi-party recovery); (e) hybrid (physical envelope holding decryption keys for a software vault). Each candidate has different operational characteristics for rotation cadence, dry-run repeatability, geographic resilience, and §2.10a separability — the ADR records the choice's rationale against these criteria.
  - [ ] Trustee Panel + Solo Builder select the custodial location(s). Candidate options (Trustee Panel authority): trustee residences (with security + geographic-distribution constraints); bank safe deposit boxes (≥2, geographically separated); notary/lawyer-held escrow (potentially the same legal counsel engaged under Story 0.13); hybrid. The choice MUST preserve the §2.10a property: audit-mirror credentials must be in a structurally distinct custodial path.
  - [ ] Both selections are recorded as a new `.decision-log.md` `[CONTINUITY]` entry that **supersedes** the Task-5 entry's "pending" status on those two fields (per the Story 0.1 schema: supersession is recorded as a new entry referencing the prior; the prior entry is not modified). The new entry status is `Trustee-ratified`.
  - [ ] An ADR is created in `docs/adr/` capturing the mechanism + custodial choice with rationale against the §2.10a property, the rotation/re-seal interface, and the dry-run repeatability constraint. The ADR is referenced from the README + sealing-procedure runbook, replacing the `[deferred ADR — placeholder procedure]` tags.

- [ ] **Task 7 — Initial sealing of `sealable-now` envelopes from the inventory** (AC: 1) — _AWAITING EXTERNAL ACTION (Trustee Panel + Solo Builder; requires Task 6 closure first)_
  - [ ] For every credential-inventory row marked `sealable-now` after Task 2 (likely a small set at Story 0.2 time — possibly just Cloudflare admin, possibly Dokploy admin if provisioned, possibly trust bank operational credentials), execute the sealing procedure from Task 3 using the trustee-selected mechanism from Task 6.
  - [ ] For each sealed envelope, record a row in `docs/escrow/escrow-ledger.md`: envelope ID, credential class, envelope-class (`prod-credential` | `audit-mirror-credential` | `high-sensitivity-tier-credential`), sealing date, ≥2-trustee signing, custodial location.
  - [ ] Update the corresponding `credential-inventory.md` row: status flips from `sealable-now` to `sealed`; envelope reference column populated with the ledger row ID; last-seal date populated.
  - [ ] Audit-mirror credentials envelope MUST be sealed under the structurally distinct custodial path per the §2.10a invariant; if the Task-6 trustee selection does not yet implement the separation mechanism (e.g., custodial path is selected for prod but not yet for audit-mirror), the audit-mirror envelope is NOT sealed under the prod path as a shortcut — it is marked `pending-separation-mechanism` and the gap is escalated as a `.decision-log.md` `[CONTINUITY]` entry.

- [ ] **Task 8 — Dry-run quorum-open + re-seal on a non-load-bearing credential** (AC: 2) — _AWAITING EXTERNAL ACTION (Trustee Panel; requires at least one `sealable-now` envelope sealed under Task 7)_
  - [ ] Select the rehearsal credential. Strong default: a staging-environment Cloudflare API token (the staging Cloudflare environment per architecture §5.5 environment topology is non-load-bearing for production member impact; an exposure during dry-run does not affect production members). Alternative if the staging Cloudflare token does not exist yet: the GitHub Actions WIF impersonation binding scoped to the staging deploy workflow (per architecture §5.4 WIF claim restrictions: dev/staging looser; rotation is also part of normal WIF lifecycle).
  - [ ] Avoid using as the rehearsal credential anything in the high-sensitivity tier (per architecture §5.9 — KEK roots, partner JWT signing keys, telephony recording-storage credentials, audit-mirror credentials). These have two-person operational rotation discipline and are NOT appropriate for first-time dry-run.
  - [ ] Execute the quorum-open procedure as documented in `docs/escrow/sealing-procedure.md` Step-by-step procedure run in reverse, then re-seal per the documented procedure.
  - [ ] Verify the rehearsal credential authenticates to its staging target post-open. Verify the re-sealed envelope passes the Verification checks. Log the dry-run in `docs/escrow/escrow-ledger.md` with: rehearsal date, executing trustees (≥2), credential class, open-step verification result, re-seal-step verification result, gaps discovered.
  - [ ] Any gap (procedure ambiguity, mechanism failure, verification check insufficient) triggers procedure revision per AC-2 — fix the procedure, record the revision as a `.decision-log.md` `[CONTINUITY]` entry citing the gap, re-execute the dry-run against the revised procedure. The dry-run is **provisionally closed** until a successful re-execution; the original failed attempt is preserved in the ledger.

- [ ] **Task 9 — Bus-factor table-top scenario execution** (AC: 3) — _AWAITING EXTERNAL ACTION (Trustee Panel under bus-factor simulation discipline; Solo Builder silent throughout)_

### Review Findings

Findings from three parallel adversarial review layers (Blind Hunter, Edge Case Hunter, Acceptance Auditor) executed via `bmad-code-review` on 2026-05-29. Triage: 6 decision-needed / 21 patch / 13 deferred / 11 dismissed-as-noise.

**decision-needed (resolve before patching):**

- [x] [Review][Decision] **Sealing-procedure §1 contradiction with Task 7 execution** — `sealing-procedure.md` §1 Prerequisites says "sealing operations cannot proceed until the Trustee Panel + Solo Builder select the mechanism and the ADR lands." But Task 7 expects sealings under `_AWAITING EXTERNAL ACTION_`. Either the placeholder procedure is sufficient (in which case §1 is wrong), or sealings cannot happen pre-ADR (in which case Task 7 is unrealizable). Resolve: does the framework permit interim sealings under a `.decision-log.md`-only mechanism commitment, or strict ADR-only? [Blind Hunter]
- [x] [Review][Decision] **Audit-mirror pre-ADR sealing bypass via retrospective trustee-name grouping** — `_envelope-template.md` `intended_quorum_class` permits trustees-by-name before the ADR exists, with the ADR "retrospectively grouping them into the named subset." This treats §2.10a as a labeling exercise. Resolve: should pre-ADR sealing of `audit-mirror-credential` envelopes be explicitly FORBIDDEN (preserving §2.10a structurally), while `prod-credential` pre-ADR sealing is acceptable? [Blind Hunter]
- [x] [Review][Decision] **Audit-mirror credential transits through Solo Builder during sealing** — `sealing-procedure.md` §2.2 has Solo Builder retrieve the audit-mirror credential from Secret Manager (Solo Builder thus holds plaintext at retrieval time) before audit-mirror trustees seal it. §2.10a is structurally defeated by the sealing procedure itself. Resolve: structural fix needed (e.g., audit-mirror credentials retrieved by a non-Solo-Builder principal — Story 0.6 backup engineer? non-Solo-Builder IAM grant created by Story 1.10?). Not patchable from inside Story 0.2 without trustee + Story 0.6/1.10 decisions. [Blind Hunter]
- [x] [Review][Decision] **Dry-run scope expansion** — AC-2 requires one dry-run on a non-load-bearing credential. High-sensitivity-tier rehearsals (KEK-root recovery, audit-mirror disjoint-subset coordination) never happen pre-bus-factor. Resolve: should AC-2 be amended to require at least one dry-run per `envelope_class`? [Blind Hunter] [`escrow-ledger.md`]
- [x] [Review][Decision] **Disjoint-subset trustee headcount math imprecise** — `README.md:60` says "a 2-of-3 prod quorum disjoint from a 2-of-3 audit-mirror quorum requires ≥4 trustees." Strict disjoint 2-of-3 + 2-of-3 needs ≥6 unique trustees, not 4. The ≥4 framing may be interpreting "disjoint" as "shared trustees allowed under constraints" — but that's not what disjoint means. Spec Dev Notes (Open Question #6) carries the same imprecision. Resolve: clarify "disjoint" — strict (≥6 needed) or constrained-overlap (≥4 with rules)? [Blind Hunter + Acceptance Auditor]
- [x] [Review][Decision] **Decision-type index doesn't enumerate Story 0.2** — `.decision-log.md` index lines 9-16 lists Story 0.1, 0.6, 0.12, 0.13, 0.14, 0.15 — not Story 0.2. Adding it would patch the omission but Story 0.2 Dev Notes "Scope discipline" said "do not modify the decision-type index" — tension between two spec commitments. Resolve: amend the spec to permit the index addition, OR leave per scope discipline and accept the documentation inconsistency? [Acceptance Auditor]

**patch (unambiguous fixes):**

- [x] [Review][Patch] **Add explicit anti-commit warning to envelope template** [`_envelope-template.md`] — README forbids committing payloads but template instructs constructors to populate verbatim secrets. Add a top-of-file warning: "THIS IS A SCHEMA. DO NOT FILL IN-PLACE. Construction happens at the custodial location."
- [x] [Review][Patch] **Recount inventory rows (claimed 19, actual 21)** [`credential-inventory.md` "Inventory status summary" + `.decision-log.md` Decision 002 item 7] — counted: 13 PRD §9.1.1 rows + 8 architecturally-adjacent rows = 21. Update summary breakdown (1-3 sealable-now + ~16 pending + 2 deferred + 0 sealed = 19-21).
- [x] [Review][Patch] **Add `sealed` to inventory schema allowed-values legend** [`credential-inventory.md:15`] — legend lists three states but sealing-procedure §2.5 commits transition to `sealed`. Add `sealed` to the schema declaration.
- [x] [Review][Patch] **Add `pending-rotation-completion` to inventory schema** [`credential-inventory.md:15` + alignment with `sealing-procedure.md` §3.5] — sealing-procedure invents this state but inventory doesn't list it.
- [x] [Review][Patch] **Add fallback re-attestation cadence pre-operations-policy** [`README.md` "Review cadence"] — inventory rows reference "operations policy cadence" but ops policy doesn't exist. Add default: "Until operations policy is authored, default to quarterly re-attestation per envelope."
- [x] [Review][Patch] **Add minimum custodial transmission constraints pre-ADR** [`sealing-procedure.md` §2.6] — currently fully deferred. Add baseline: "Until the credential-escrow-mechanism ADR lands, transmission MUST NOT use email, SMS, messaging apps, or any unencrypted channel. In-person physical transfer or trustee-controlled offline encrypted media only."
- [x] [Review][Patch] **Force rotation when plaintext exposure during failed sealing cannot be objectively ruled out** [`sealing-procedure.md` §3.2] — current language relies on trustee judgment. Add forcing rule: "If the credential was in plaintext outside the source-of-truth at any point during the failed sealing, rotation is REQUIRED — no operator-judgment override."
- [x] [Review][Patch] **Split escalation list normal-vs-bus-factor** [`sealing-procedure.md` §5] — current list has Solo Builder + backup engineer as fallbacks but under bus-factor scenario both roles may be inactive. Restructure as two state-specific routes.
- [x] [Review][Patch] **Add trustee-membership-change as re-seal trigger** [`_envelope-template.md` `re_seal_trigger_conditions`] — currently silent on subset-membership change. Add: "Trustee membership change affecting the envelope's quorum subset (resignation, removal, addition with disjointness implication)."
- [x] [Review][Patch] **Add sealing-trustee custody compromise as re-seal trigger** [`_envelope-template.md` `re_seal_trigger_conditions`] — currently lists credential/mechanism/custodial-location compromise but NOT trustee-key compromise. Add: "Detected compromise of any sealing trustee's custody (share/key) — even if credential payload is unchanged."
- [x] [Review][Patch] **Add ledger-vs-inventory reconciliation procedure** [`README.md` "Sign-off lifecycle"] — currently silent. Add: "If `credential-inventory.md` and `escrow-ledger.md` disagree, the LEDGER is authoritative; inventory is corrected to match. Drift triggers a `.decision-log.md` `[CONTINUITY]` entry."
- [x] [Review][Patch] **Add custodial-location circular-dependency check** [`sealing-procedure.md` §1 Prerequisites] — add: "Verify that custodial location access does not require any credential in the inventory (e.g., legal-counsel custody requiring DPO portal credentials that are themselves escrowed)."
- [x] [Review][Patch] **Add explicit prior-envelope invalidation step to re-seal path** [`sealing-procedure.md` re-seal intro + new §2.0 for re-seal path] — re-seal procedure must invalidate the prior envelope to prevent two-valid-envelopes-for-the-same-credential state.
- [x] [Review][Patch] **Add audit-emission-failure rollback path** [`sealing-procedure.md` §3] — currently §3 only covers failure "midway." Add: "If §2.7 audit emission fails AFTER §2.5 commit, treat as P0 framework violation; ledger row records `outcome=gap`; framework-level review triggered."
- [x] [Review][Patch] **Single-human-on-both-subsets prohibition** [`README.md` "Audit independence invariant"] — currently silent. Add: "single human trustees MUST NOT be on both the prod-class and audit-mirror-class subsets simultaneously; the ADR enforces disjointness as a structural property of subset membership, not merely a procedural convention."
- [x] [Review][Patch] **Add table-top scope-freeze rule** [`escrow-ledger.md` "Bus-factor table-top log"] — add: "Table-top scope is frozen at start-date; mid-exercise inventory state changes do not retroactively expand or contract scope."
- [x] [Review][Patch] **Periodic re-attestation must include credential-authentication check** [`escrow-ledger.md` "Periodic re-attestation log"] — currently silent on what re-attestation verifies. Add: "Re-attestation includes: (a) envelope-existence-at-custody check, (b) non-mutating credential-authenticates-to-system check, (c) envelope-class assignment unchanged."
- [x] [Review][Patch] **Add mechanism-level revision path** [`README.md` "Open ADR slots" + `sealing-procedure.md`] — currently only procedure-level revision is documented. Add: "If dry-run or operational use reveals a mechanism-level flaw, the credential-escrow-mechanism ADR is superseded; ALL envelopes are re-sealed under the new ADR; prior envelopes are physically destroyed / cryptographically invalidated per the prior ADR's destruction procedure."
- [x] [Review][Patch] **Substrate pivot triggers inventory row re-evaluation** [`credential-inventory.md` "Re-evaluation cadence"] — Cloudflare row Notes mentions re-evaluation but no procedure binds it. Add: "Substrate pivot (e.g., Cloudflare → self-hosted WAF per architecture §5.8a) MUST trigger affected inventory rows' re-evaluation within N business days of the pivot decision; recorded in the periodic re-attestation log."
- [x] [Review][Patch] **Inventory row-addition authority** [`README.md` "Sign-off lifecycle" table] — per-partner / per-bank row additions currently unilateral. Add new event type: "Inventory row addition (per-partner / per-bank expansion) requires ≥1 trustee acknowledgment and a `.decision-log.md` `[CONTINUITY]` entry."
- [x] [Review][Patch] **Enumerate forbidden lifecycle transitions** [`README.md` "Framework lifecycle"] — six states named but no transition matrix. Add at minimum a forbidden-transitions list (e.g., `inventory` → `quorum-opened` skipping sealing; `sealed` → `inventory` rollback to non-existence).

**defer (real but out of scope or systemic):**

- [x] [Review][Defer] Atomic three-way commit unenforceable [`sealing-procedure.md` §2.5] — CI tooling deferred to Story 1.16a; ledger-authoritative reconciliation patch (above) is the framework-level mitigation
- [x] [Review][Defer] Ledger has no chain/sig integrity protection — inherited from Story 0.1 ledger pattern; systemic, not Story 0.2 scope
- [x] [Review][Defer] No tooling for cross-reference link checking [`credential-inventory.md` owning-Story citations] — CI gate deferred to Story 1.16a
- [x] [Review][Defer] Time-bounded provisional closure for AC-3 — belongs in operations policy
- [x] [Review][Defer] Concurrent `.decision-log.md` Decision-number appends collide — cross-Story `.decision-log.md` schema discipline; would amend Story 0.1's schema
- [x] [Review][Defer] High-sensitivity operational signers vs sealing trustees alignment [`sealing-procedure.md` §1 + `_envelope-template.md` high-sensitivity caveats] — ADR territory per [[feedback_architecture_vs_adr_boundary]]
- [x] [Review][Defer] Redundant-custody sync drift [`README.md` candidate mechanisms 3+4] — ADR territory; sync discipline is the ADR's responsibility
- [x] [Review][Defer] Task 8 dry-run rehearsal credential availability fallback — Task 8 is `_AWAITING EXTERNAL ACTION_`; execution-time concern
- [x] [Review][Defer] `.decision-log.md` supersession enforcement convention-only — inherited from Story 0.1 schema
- [x] [Review][Defer] Status vocab drift (`Ratified` vs `Trustee-ratified`) — `.decision-log.md` file template was Story 0.1's; patching template is a Story 0.1 amendment
- [x] [Review][Defer] Audit-line emission citations interpretive (§1.5 + §2.10 vs literal commitment) — architectural cross-check before trustee sign-off; not a clean patch
- [x] [Review][Defer] Trust-bank operational pre-existence cite is light [`credential-inventory.md:52`] — row hedges correctly with "confirm with Trustee Panel during Task 7"
- [x] [Review][Defer] `docs/adr/` directory does not exist — Open Follow-up #6 in `.decision-log.md` Decision 002; cross-Story coordination needed
  - [ ] Coordinate with the Trustee Panel to schedule the table-top exercise. **Solo Builder is silent for the duration** of the exercise per the bus-factor simulation discipline (same as Story 0.1 AC-4). If Solo Builder must answer a question during the exercise, the procedure is insufficient — the gap is logged, the exercise concludes with that gap as the dominant outcome, and a procedure revision + re-execution is scheduled.
  - [ ] For every credential-inventory row currently marked `sealed`, trustees execute the quorum-open procedure and use the retrieved credential to access the corresponding production surface. Verification is the access test (sign in to Cloudflare admin; authenticate to prod DB connection path; etc.) — not just envelope retrieval. Each access logged in the escrow-ledger with verification outcome.
  - [ ] For every credential-inventory row marked `pending-system-availability` or `deferred-with-ADR`, the exercise records the row as **out-of-scope-for-this-table-top**. Per AC-3 closure language, the table-top is **provisionally closed** if at least one in-scope envelope opens successfully; **fully closed** only when every PRD §9.1.1 row has had at least one successful table-top access — which requires every owning Story (1.2, 3.3b, 7.7, 9.2, 12.x, 14.3, etc.) to close first. Phrase the provisional closure in the escrow-ledger explicitly: "Provisionally closed via partial-scope table-top dated YYYY-MM-DD; full closure deferred to inventory completion across Stories X, Y, Z" (per [[feedback_closure_language_precision]]).
  - [ ] Any gap discovered (Solo Builder consulted; envelope opens but credential is unusable; access path documentation insufficient) triggers an AC-2-style procedure revision; the revision is itself a `.decision-log.md` `[CONTINUITY]` entry; the in-scope row is re-executed against the revised procedure before being marked successful.

## Dev Notes

### Scope discipline — what this story is and is not

This story is **governance + framework + (eventually) trustee-executed sealing**, not feature implementation or code. No application code is written; no app/package boundary is touched; no CI gate is added. The dev agent's job is to:

- Author the framework documents under `docs/escrow/` that future credential-sealing operations will follow (Tasks 1-5).
- Append a `[CONTINUITY]` entry to `.decision-log.md` per the Story 0.1 schema, recording the framework commitment.
- Mark the inventory rows with their correct availability status per the architectural source-of-truth (NOT seal credentials Solo Builder doesn't yet have).
- **Leave Tasks 6-9 explicitly unchecked + tagged `_AWAITING EXTERNAL ACTION_`**, the same way Story 0.1 Tasks 4 and 5 were tagged. The dev agent cannot select a sealing mechanism (that's a Trustee Panel decision under their authority), cannot perform a sealing (which requires the selected mechanism + ≥2 physical trustee presence), cannot execute a dry-run, and cannot execute a bus-factor table-top.

### What this story does NOT modify

- **No changes to `docs/runbooks/`.** The escrow framework is structurally adjacent to the runbook framework — same template, same ledger pattern — but lives in `docs/escrow/`. Do not edit Story 0.1's runbooks except where the sealing-procedure runbook explicitly cross-references `docs/runbooks/secret-rotation.md` (a forward reference is acceptable; modifying the secret-rotation runbook itself requires re-sign per Story 0.1 AC-3 protocol).
- **No changes to Story 0.1's `.decision-log.md` entry.** Append-only.
- **No changes to architecture, PRD, or epics docs.** If a divergence is observed (e.g., the §2.10a property cannot be expressed in any of the candidate sealing mechanisms), record it as an Open Question at the end of this story; do not patch architecture from a Story.

### `.decision-log.md` schema is load-bearing — follow Story 0.1's template exactly

Story 0.1 established the `.decision-log.md` schema as load-bearing for downstream stories (see Story 0.1 Dev Notes "`.decision-log.md` initialization"). Story 0.2 is one of the first downstream consumers. The template must be followed verbatim:

- Title format: `Decision YYYY-MM-DD-NNN: <title>`
- Fields: Decision type, Status, Author, Ratifying trustees, Context, Decision (numbered if multi-commit), Open follow-ups, References
- Status values: `Author-committed; awaiting trustee sign-off` | `Trustee-ratified` | `Reversed by Decision YYYY-MM-DD-NNN`
- Decision-type tag for Story 0.2: `Story 0.2 — Credential Escrow` (matches the index entry pattern from Story 0.1)
- Append at the **top** of the existing decisions section (reverse-chronological order per the file's header comment).

If the dev agent discovers the template is insufficient (missing field, ambiguous status), the change is itself a `.decision-log.md` `[GOV]` entry proposing the schema amendment — not a silent rewrite. This protects the file's stability per Story 0.1.

### Property / control / policy discipline applied to escrow

This is a direct application of [[feedback_architecture_vs_adr_boundary]] to a new domain. Apply the three-way split throughout:

| Layer | What it commits | Where it lives in Story 0.2 |
|---|---|---|
| **Property** (architecture-equivalent) | ≥2-trustee quorum; sealed envelopes; documented location; §2.10a audit independence preserved; envelope-class separation; AR-67 framework commitment | `docs/escrow/README.md` "Property commitments" section; AC text in this story |
| **Control** (ADR territory) | Specific sealing mechanism (Shamir vs GPG-N vs physical seal); specific custodial location (bank safe deposit vs notary vs trustee residences); specific cryptographic toolchain | `docs/adr/<NNN>-credential-escrow-mechanism.md` (created in Task 6); referenced from README + sealing-procedure |
| **Policy** (operations policy) | Re-seal cadence on credential rotation; periodic re-attestation cadence; dry-run cadence; access-test scope at table-top exercises | Operations policy doc (not yet authored at v0.2 time; the policy reference is forward-looking) |

The runbooks Story 0.1 produced follow this same three-way discipline; Story 0.2 inherits the pattern. Do not invent control choices in the escrow framework documents — cite the ADR; mark `[deferred ADR — placeholder procedure]` if absent.

### §2.10a audit independence invariant — the non-negotiable constraint

The single most important architectural constraint on Story 0.2 is the §2.10a invariant: compromise of production application credentials must not permit modification of audit-mirror data; compromise of audit-read credentials must not permit access to production data; sole-engineer operational credentials must not transitively grant audit-write authority; separation controls must survive routine IAM mistakes.

A naive escrow framework — "all credentials sealed in one envelope, ≥2 trustees can open" — **violates** this invariant. The ≥2-trustee quorum that opens prod credentials would also be sufficient to open audit-mirror credentials, which means coercion or collusion of two trustees gives an attacker both prod access and audit-mirror access, defeating the entire audit independence story.

The Story 0.2 framework MUST be designed so the invariant holds **structurally**, not by policy promise. Options (Trustee Panel ADR decision):

1. **Disjoint trustee subsets** — the ≥2-quorum for prod envelopes is from one named subset; the ≥2-quorum for audit-mirror envelopes is from a structurally disjoint subset. Coercion of two trustees from the prod subset does not grant audit-mirror access because the audit-mirror subset is different.
2. **Separate sealing mechanisms** — prod envelopes use mechanism A; audit-mirror envelopes use mechanism B; the mechanisms do not share recovery shares.
3. **Separate custodial paths** — prod envelopes live at custodial location L1; audit-mirror envelopes live at L2; access to L2 requires a separately-keyed access path.
4. **Hybrid** — combinations of the above.

The dev agent does NOT pick the mechanism; that's the Trustee Panel ADR. But the dev agent MUST ensure the framework documents express the invariant clearly enough that the trustees can see when a candidate mechanism violates it. The `envelope_class` field in the envelope template + inventory is the structural anchor; the README §"Audit independence invariant" is the explanation; the sealing-procedure prerequisites guardrail is the enforcement point.

### Closure-language precision applied per inventory row

Per [[feedback_closure_language_precision]], the credential inventory rows must distinguish three states with precision:

- **`sealed`** — envelope produced, ledger row exists, ≥2-trustee attestation recorded. This is the "Closed by [seal]" state.
- **`pending-system-availability`** — the credential does not yet exist because the owning system is not yet built. The owning Story is named; the re-evaluation trigger is the owning Story's closure. This is the "Resolved via explicit deferral" state — the rationale is recorded (the system doesn't exist) and the revisit trigger is stated. The escrow envelope IS expected to exist eventually, just not now.
- **`deferred-with-ADR`** — the credential domain has no current concrete instances and won't until a contractual or regulatory event (e.g., partner integrations, where each partner gets a separately-managed envelope per Module Marketplace). The ADR records the deferral rationale and the future-event trigger.

**Never collapse `pending-system-availability` with `sealed`.** Doing so would let a reader believe the escrow is complete when in fact it is structurally incomplete — exactly the kind of audit drift the closure-language precision feedback is meant to prevent.

### Cross-Story dependency map (read before Tasks 6-9)

Story 0.2 has unusually high cross-story coupling because the "production credentials" it escrows are owned by many downstream Stories. The dependency direction is **Story 0.2 produces the framework** that those Stories' credentials are sealed under; the framework is usable from day one and is incrementally populated as the credentials come into existence.

| Credential domain (PRD §9.1.1) | Owning Story (introduces the credential) | Re-seal trigger | Story 0.2 framework status |
|---|---|---|---|
| Prod DB access (Cloud SQL service-account) | 1.2 (cloud-sql-postgres-drizzle-migration-tooling) | architecture §5.9 DB credentials rotation | Framework ready; envelope `pending-system-availability` until 1.2 closes |
| KEK roots (high-sensitivity tier) | 1.5 (cloud-kms-hsm-google-tink-envelope-encryption-pii-tiers) | annual or suspected-compromise per §5.9 | Framework ready; envelope `pending-system-availability` |
| Cloudflare admin | Pre-existing if Solo Builder has provisioned for 0.3 mirror destination + 1.13 edge protection | operations policy cadence | Likely `sealable-now`; confirm with Solo Builder during execution |
| Dokploy admin | Pre-existing if provisioned for substrate; full provisioning at 1.15 | operations policy cadence | `sealable-now` if provisioned; otherwise `pending-system-availability` |
| Partner integrations | Each partner adds its own (Epic 12 Module Marketplace) | per partner contract | `deferred-with-ADR` until first partner |
| Payment intent / banking (UPI Intent signing) | 7.7 (idempotent-payment-reference-amount-lock-at-upi-intent) | per architecture §5.9 | Framework ready; envelope `pending-system-availability` |
| Payment intent / banking (trust bank operational) | Pre-existing at trust formation per PRD §11 | bank-policy cadence | Likely `sealable-now`; confirm with Trustee Panel |
| Bank statement intake transport | 9.2 (bank-statement-intake-transport-5-bank-parser-allowlist) | per architecture §3.6 | Framework ready; envelope `pending-system-availability` |
| DigiLocker integration | 3.3b (digilocker-kyc-flow-in-signup-manual-fallback) | partner contract terms | Framework ready; envelope `pending-system-availability` |
| DPDPA breach-reporting tooling (portal) | 14.3 (dpo-breach-reporting-operational-readiness) gated by 0.13 (legal counsel) | DPO appointment + operations policy | Framework ready; envelope `pending-system-availability` |
| Backup engineer access | 0.6 (backup-engineer-contracted-with-trustee-authorization) — read-only by default per architecture §5.10 | per architecture §5.10 credential rotation cadence | Framework ready; envelope `pending-system-availability` |
| Audit-mirror credentials (high-sensitivity tier; structurally separate envelope class) | Architecture §2.10 already commits; Story 1.10 (tamper-evident-audit-log) provisions the operational chain | per architecture §5.9 | Framework ready; envelope `pending-system-availability` until 1.10 lands |

**Path through bus-factor table-top closure.** AC-3 full closure requires every row above to reach `sealed`. That spans Epic 1 (Stories 1.2, 1.5, 1.10, 1.13, 1.15), Epic 3 (3.3b), Epic 7 (7.7), Epic 9 (9.2), Epic 12 (each partner), Epic 14 (14.3), plus Epic 0 internal (0.6). The provisional closure path per AC-3 is the practical one at Story 0.2 closure time.

### Self-sufficiency execution guardrails (Tasks 8 + 9)

**Bus-factor simulation discipline** (inherited from Story 0.1 AC-4): Solo Builder is silent for the duration of dry-run + table-top. Do not answer questions. If a question is asked, that is the gap to log — the procedure is insufficient.

**Dry-run target selection** (Task 8): the rehearsal credential MUST be one whose compromise during dry-run cannot impact production. The Story 0.1 self-sufficiency-test guardrails analog — staging environment for runbook execution — is the right model here. Specifically AVOID for the dry-run: prod DB credentials, KEK roots, audit-mirror credentials, partner JWT signing keys, telephony credentials, any production-impacting credential. PREFER for the dry-run: staging Cloudflare API token, staging WIF binding, staging Dokploy API token if the staging surface has one.

**Table-top scope discipline** (Task 9): in-scope is exactly the set of envelopes marked `sealed` at table-top time. Out-of-scope is the rest. Do not "pretend-open" a `pending-system-availability` envelope — that defeats the verification step (the access test) and inflates the closure status.

### Cross-Story Dependency Note (read before Tasks 6-9)

Task 6 introduces an ADR for sealing mechanism + custodial location. The ADR is the **first ADR this project writes** (verify before assuming — `docs/adr/` does not yet exist per the current repo state; Story 0.2 Task 6 may need to scaffold the ADR directory + template + index simultaneously). If the ADR directory and template are not yet scaffolded:

- The dev agent can scaffold `docs/adr/` at Task 6 time **only with explicit Trustee Panel + Solo Builder agreement** that ADR scaffolding is in scope for Story 0.2 (similar to how Story 0.1 scaffolded `.decision-log.md` as a side-effect — but with the user's consent in-session).
- Alternative: defer ADR scaffolding to Story 0.15 (architectural launch-gate inventory) or a dedicated bootstrap story; record the deferral in the `.decision-log.md` Story 0.2 entry's Open Follow-ups.

If `docs/adr/` is scaffolded under Story 0.2, the schema must support `superseded-by` and `supersedes` cross-references per [[feedback_closure_language_precision]] — ADRs that change their mind are recorded as new ADRs that supersede prior ones; the prior ADR is not modified in place.

### `docs/escrow/` is on the trustee-accessible storage surface

Per AC-1, escrow location is documented. The escrow framework documents themselves (README, inventory, ledger, envelope template, sealing procedure) live in the primary git repo at `docs/escrow/` — they are **inventory and governance**, not credentials. The credentials themselves live at the custodial location selected in Task 6 and are NOT committed to the git repo in plaintext or any reversible form. The repo holds pointers, attestations, and procedure; the custodial location holds the actual sealed envelopes.

The trustee-accessible-repo property (inherited from Story 0.1 — primary git repo for v1; mirror coverage extends when Story 0.3 closes) applies to the framework documents, not to the credential payloads.

### Previous Story Intelligence (Story 0.1)

Story 0.1 was the first story in Epic 0 and the project. Lessons from Story 0.1 that apply directly to Story 0.2:

- **Closure-language precision** is a recurring discipline; Story 0.1 added explicit closure-state vocabulary to AC-2, AC-3, AC-4 (provisionally closed via X; full closure flips when Y) — Story 0.2 follows the same pattern in AC-1 (inventory row states), AC-2 (dry-run provisional close + revision protocol), AC-3 (table-top scope discipline).
- **External-action tasks** (trustee sign-off, non-Solo-Builder executor) are explicitly tagged `_AWAITING EXTERNAL ACTION_` and the story status stays at `in-progress` until they close. Story 0.2 has the same pattern: Tasks 1-5 are Solo-Builder-author-committable; Tasks 6-9 require trustee + (in some cases) non-Solo-Builder engineer participation.
- **`.decision-log.md` schema is load-bearing** — follow Story 0.1's template verbatim; do not silently rewrite.
- **Cross-Story dependency notes** are valuable for explaining provisional vs full closure paths — Story 0.2 has similar dependencies (1.2, 1.5, 1.10, 3.3b, 7.7, 9.2, 12.x, 14.3, 0.6).
- **Property-vs-control-vs-policy three-way discipline** is the user's strongest documentation discipline — Story 0.2 applies it to escrow.

### Git Intelligence

Recent repo state (post Story 0.1 implementation): `docs/runbooks/` exists with the seven Phase-0 runbooks + README + ledger + template. `.decision-log.md` exists at repo root with one entry (Decision 2026-05-29-001) recording Story 0.1 scaffolding. `docs/adr/` does NOT exist (verify at execution time). `docs/escrow/` does NOT exist (verify at execution time — that's the Task 1 expectation). The mainline code surface is still un-touched by any application story.

### Testing Standards

There are no automated tests for this story. The validation surface is:

1. Trustee sign-off on the framework (no AC explicitly mandates this, but inheriting Story 0.1's pattern, it is good discipline; if the framework requires trustee review, that review is recorded in the escrow-ledger as a separate event from the per-envelope sign-offs).
2. Dry-run quorum-open + re-seal succeeds (AC-2) — recorded in the escrow-ledger, human-executed under trustee + Solo Builder presence (Solo Builder presence allowed for the dry-run because dry-run is the *learning event*; bus-factor simulation discipline applies in full only to the table-top per AC-3).
3. Bus-factor table-top accesses every then-extant production system without Solo Builder consultation (AC-3) — recorded in the escrow-ledger, human-executed under bus-factor simulation discipline.

If a future automation surfaces (e.g., a CI lint that asserts every `docs/escrow/credential-inventory.md` row has a valid status + envelope-class + owning-story reference; or that escrow-ledger rows match envelope IDs in the inventory), it would belong in Story 1.16a (friction-budget PR CI gate) or a follow-on governance story — not in 0.2.

### Latest Tech Information

No external libraries are introduced. The escrow framework describes operations on existing/planned trustee-held custodial infrastructure (sealed envelopes; cryptographic sealing toolchain TBD by ADR). The dev agent should NOT research "latest versions" of GPG, Shamir's Secret Sharing implementations, password-manager emergency-kit features, etc. — that's the Trustee Panel's selection (Task 6, ADR territory). The framework documents are property-driven and survive mechanism choice.

If the Trustee Panel selects a cryptographic mechanism in Task 6 (e.g., GPG with specific key length, Shamir's with a specific share threshold), the ADR records the specific mechanism with its version + threat-model justification. Story 0.2 itself stays mechanism-neutral.

### Project Structure Notes

- New directory created by Task 1: `docs/escrow/` at repo root, per architecture §Workspace Layout line 4172 (the directory is named in the architecture but does not yet exist in the repo). Verify before creating to avoid clobber.
- New files (paths relative to repo root):
  - `docs/escrow/README.md` (Tasks 1, 4 contribute)
  - `docs/escrow/_envelope-template.md` (Task 1, with `envelope_class` field added in Task 4)
  - `docs/escrow/credential-inventory.md` (Task 1 scaffold, Task 2 populates, Task 4 adds `envelope_class` column)
  - `docs/escrow/escrow-ledger.md` (Task 1; populated over time by Tasks 7-9 and downstream stories)
  - `docs/escrow/sealing-procedure.md` (Task 3, with Task 4 invariant guardrail)
- Modified files:
  - `.decision-log.md` (Task 5 appends a new entry; do not modify existing Story 0.1 entry)
  - `_bmad-output/implementation-artifacts/sprint-status.yaml` (`0-2-credential-escrow-established-with-trustee-quorum-open` flips `backlog` → `ready-for-dev` by `bmad-create-story`; will flip to `in-progress` when dev-story begins)
- Files NOT modified by this story: `docs/runbooks/*` (forward references only); architecture, PRD, epics docs; any application code.
- The §5.15 broader runbook inventory ownership tracked in `docs/runbooks/README.md` is unaffected by Story 0.2 — escrow is a separate surface from runbooks, even though both follow the same five-section template for procedure documents and the same ledger pattern for trustee attestation.

### References

- [Source: epics.md#Epic 0: Pre-launch Operational Continuity & Phase-0 Launch Gates] — Epic objectives, deliverables, AR-67 commitment
- [Source: epics.md#Story 0.2: Credential Escrow Established with Trustee Quorum Open] — original user story and BDD acceptance criteria
- [Source: prds/prd-TWT-2026-05-22/prd.md#9.1.1 Solo-build operational continuity (bus-factor mitigation)] — canonical PRD source for credential-escrow scope, the seven credential domains, and the AR-67 ratification
- [Source: architecture.md#Workspace Layout (Day 1) line 4172] — `docs/escrow/` canonical directory commitment
- [Source: architecture.md#§2.10a Isolation Commitment — preserving audit independence] — the load-bearing structural invariant on envelope-class separation
- [Source: architecture.md#§2.10 Audit log access controls] — audit-mirror credential separability prerequisite for §2.10a
- [Source: architecture.md#§5.9 Secret management + rotation] — high-sensitivity tier definition (KEK roots, partner JWTs, telephony, audit-mirror); rotation policy that drives re-seal triggers; two-person approval discipline
- [Source: architecture.md#§5.2 GCP service map (canonical)] — Secret Manager as source-of-truth for the operational credentials being escrowed; KMS for the KEK roots
- [Source: architecture.md#§5.7 Backup + Disaster Recovery — DR runbook accessibility] — confirms the credential-escrow envelope pattern is already used at the architecture layer for DR runbook PDF custody, validating the same pattern for software credentials
- [Source: architecture.md#§5.10 Operations — Backup engineer access posture] — read-only default + per-action approval discipline; informs how Story 0.6 backup engineer interacts with the escrow framework
- [Source: architecture.md#§5.15 Operational runbook inventory] — review cadence pattern that the escrow inventory inherits
- [Source: epics.md#AR-67] — solo-build operational continuity AR commitment
- [Source: implementation-artifacts/0-1-operational-runbooks-authored-trustee-signed.md] — sibling story with the runbook + ledger pattern Story 0.2 mirrors for escrow; the `.decision-log.md` schema initialized there is reused verbatim
- [Source: docs/runbooks/README.md] — the runbook governance framework whose five-section template is reused by Story 0.2's sealing-procedure runbook
- [Source: docs/runbooks/operational-readiness-ledger.md] — the ledger pattern Story 0.2's escrow-ledger mirrors
- [Source: docs/runbooks/secret-rotation.md] — the runbook whose execution triggers re-seal events tracked in Story 0.2's escrow-ledger
- [Source: .decision-log.md] — the trustee-canonical decisions log Story 0.2 appends to under the load-bearing schema established by Story 0.1
- Auto-memory: [[feedback_architecture_vs_adr_boundary]] — property vs control discipline applied throughout
- Auto-memory: [[feedback_architecture_vs_prd_boundary]] — structural vs policy discipline applied to credential-inventory schema
- Auto-memory: [[feedback_closure_language_precision]] — three-state closure vocabulary applied to inventory rows + AC-2 dry-run revision protocol + AC-3 provisional/full closure framing
- Auto-memory: [[feedback_gap_analysis_observational]] — Open Questions at end of story are observational + propose escalation paths; they do not prescribe action

## Dev Agent Record

### Agent Model Used

claude-opus-4-7 (Claude Code CLI; bmad-dev-story skill)

### Debug Log References

None — this story produces governance documentation artifacts only; no automated build or test surface was exercised. Structural verification of the sealing-procedure runbook against the five-section template was performed via `grep -E "^## [1-5]\. " docs/escrow/sealing-procedure.md`; returned the expected five-section sequence (Prerequisites, Step-by-step procedure, Rollback procedure, Verification checks, Contact escalation list), matching the `docs/runbooks/_template.md` schema Story 0.1 established. Directory existence verification was performed via `ls /Users/dev/Developer/projects/TWT/docs/escrow/` before scaffolding (returned `No such file or directory`, confirming Task 1's "verify before creating to avoid clobber" prerequisite); post-scaffolding `ls` confirmed all five framework files present (`README.md`, `_envelope-template.md`, `credential-inventory.md`, `escrow-ledger.md`, `sealing-procedure.md`).

### Completion Notes List

**Implementation scope handled in this session (Tasks 1-5, all author-committable):**

- Created `docs/escrow/` framework directory at repo root per architecture §Workspace Layout (line 4172). Verified non-existent before creating to avoid clobber, matching the discipline Story 0.1 established for `docs/runbooks/`.
- Authored five framework documents totaling the governance instruments for credential escrow: `README.md` (framework lifecycle + property/control/policy three-way discipline + §2.10a invariant explanation + sign-off lifecycle + credential-domain summary + open ADR slots + related escrow surfaces owned elsewhere + review cadence + file index); `_envelope-template.md` (sealed-envelope content schema with the load-bearing `envelope_class` field + high-sensitivity-tier / audit-mirror caveats); `credential-inventory.md` (19 rows across the seven PRD §9.1.1 domains + seven architecturally-adjacent envelope classes with per-row availability status per [[feedback_closure_language_precision]]); `escrow-ledger.md` (trustee event-record with Framework-commit row + Sealing log + Dry-run log + Bus-factor table-top log + Periodic re-attestation log + Procedure-revision log sections); `sealing-procedure.md` (five-section runbook reusing `docs/runbooks/_template.md` verbatim, with `[deferred ADR — placeholder procedure]` tags at every mechanism-specific step).
- Appended Decision 2026-05-29-002 to `.decision-log.md` per the Story 0.1 load-bearing schema (entry inserted at top of "## Decisions" section per reverse-chronological convention; Decision 2026-05-29-001 NOT modified; template + decision-type index NOT modified). The entry records the framework-commit step with status `Author-committed; awaiting trustee sign-off`, the eight numbered commitments, and the open follow-ups listing trustee mechanism + custodial selections, ADR scaffolding scope decision, framework-commit ratification, Tasks 7-9 execution, Story 0.3 mirror coverage update, and trustee-headcount confirmation for the disjoint-subset mechanism.
- Property/control/policy three-way discipline preserved throughout: framework documents cite architectural commitments as properties; defer cloud-control choices (sealing mechanism, custodial location, cryptographic toolchain, verification check implementation) to the credential-escrow-mechanism ADR; defer cadence (re-seal cadence, periodic re-attestation cadence, dry-run cadence) to operations policy. This matches user feedback memory on the architecture-vs-PRD-vs-ADR three-way boundary.
- **§2.10a audit independence invariant honored as a load-bearing structural constraint** at every layer: the `envelope_class` field in the envelope template; the `Envelope class` column in the credential inventory; the dedicated "Audit independence invariant — envelope-class separation" section in the README; the explicit guardrail check in `sealing-procedure.md` Prerequisites §1; the invariant statement in the `.decision-log.md` entry. The framework is structured so a sealing operation that violates §2.10a MUST be aborted at the prerequisites check — the invariant is non-negotiable.
- Cross-references to architecture §5.15 broader runbook inventory honored: the sealing-procedure runbook uses the same five-section template as Story 0.1; the escrow-ledger mirrors the operational-readiness-ledger pattern. The two frameworks (runbooks under Story 0.1 + escrow under Story 0.2) are structurally parallel surfaces with the same trustee-attestation discipline.
- Related-escrow surfaces captured in the README "Related escrow surfaces owned elsewhere" section: code escrow (Story 0.3), DR runbook PDF custody (architecture §5.7 + Story 0.4), knowledge-transfer pack (Story 0.5; non-escrowed by design — KT pack is readable, not sealed), backup engineer contract (Story 0.6; legal-counsel-custodied per Story 0.13), legal counsel engagement (Story 0.13). The inventory has a row for `dr-runbook-pdf-custody` that explicitly honors the architectural cross-reference at §5.7 (DR runbook PDFs sealed under the same framework).

**Tasks 6, 7, 8, 9 — explicitly awaiting external action:**

- **Task 6 (Trustee Panel + Solo Builder selection of sealing mechanism + custodial location):** the LLM dev agent cannot fulfill mechanism + custodial selection — those are Trustee Panel + Solo Builder decisions. The `.decision-log.md` entry's Open Follow-ups names the selection as the supersession trigger; the credential-escrow-mechanism ADR will replace the `[deferred ADR — placeholder procedure]` tags in `sealing-procedure.md` when authored. `docs/adr/` directory scaffolding is itself an open follow-up (whether Story 0.2 scaffolds it at Task 6 time with explicit Solo Builder + Trustee Panel agreement, or defers to Story 0.15 or a dedicated bootstrap story).
- **Task 7 (Initial sealing of `sealable-now` envelopes):** the LLM dev agent cannot execute trustee sealings. The inventory rows are prepared; envelope IDs reserved; the sealing-procedure runbook is authored. Tasks 6 must close before Task 7 can execute (mechanism + custodial selection are prerequisites per `sealing-procedure.md` §1).
- **Task 8 (Dry-run quorum-open + re-seal):** the LLM dev agent cannot execute a trustee dry-run. The procedure is in place; the rehearsal credential candidates are named in the story file Dev Notes "Self-sufficiency execution guardrails" section.
- **Task 9 (Bus-factor table-top):** the LLM dev agent cannot execute a Trustee Panel exercise under bus-factor simulation discipline (Solo Builder silent). The procedure is in place; the closure-language precision framing (provisional via partial-scope vs full closure deferred to inventory completion across Stories 1.2 / 1.5 / 1.10 / 3.3b / 7.7 / 9.2 / 12.x / 14.3 / 0.6 / 0.4) is committed in the AC text + ledger template.

**Closure language (per [[feedback_closure_language_precision]]):**

- Tasks 1, 2, 3, 4, 5 are **closed by edit** (artifacts produced and present in the repo; `.decision-log.md` entry committed).
- Tasks 6, 7, 8, 9 are **not addressed** in this session — explicitly **awaiting external action**, not "resolved via deferral" (no rationale was rendered for deferral; the tasks are structurally Trustee Panel + Solo Builder execution, not Solo Builder author-commitable).
- The credential-inventory rows themselves carry per-row closure-language precision: 0 `sealed`; ~1-3 `sealable-now` (ready for Task 7); 14 `pending-system-availability` (resolved via explicit deferral with owning-Story re-evaluation triggers stated); 2 `deferred-with-ADR` (resolved via explicit deferral with contractual-event re-evaluation triggers stated).

**Story status:** `in-progress` in both the story file and `_bmad-output/implementation-artifacts/sprint-status.yaml`. Status will flip to `review` only after Tasks 6 + 7 + 8 close per the AC text. AC-3 full closure is multi-Story-deferred per the closure-language precision discipline; provisional closure under Task 9 is acceptable for Story 0.2's status flip.

### File List

New files (paths relative to repo root):

- `docs/escrow/README.md`
- `docs/escrow/_envelope-template.md`
- `docs/escrow/credential-inventory.md`
- `docs/escrow/escrow-ledger.md`
- `docs/escrow/sealing-procedure.md`

Modified files (paths relative to repo root):

- `.decision-log.md` — Decision 2026-05-29-002 appended at top of "## Decisions" section. Decision 2026-05-29-001 was NOT modified; template + decision-type index were NOT modified. Append-only per the Story 0.1 load-bearing schema. (Subsequent code-review pass added the `[GOV]` schema-amendment follow-up bullet to Decision 002's Open Follow-ups.)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — `0-2-credential-escrow-established-with-trustee-quorum-open` flipped `ready-for-dev` → `in-progress` (by `bmad-dev-story`). Epic-0 status unchanged (already `in-progress` from Story 0.1). The earlier `bmad-create-story` invocation had already flipped this row `backlog` → `ready-for-dev` + added a top-of-file note line; both edits preserved.
- `_bmad-output/implementation-artifacts/0-2-credential-escrow-established-with-trustee-quorum-open.md` — Tasks 1-5 checked; Tasks 6-9 unchecked with refined `_AWAITING EXTERNAL ACTION (...)_` tags; this Dev Agent Record populated; AC-2 amended per code-review Decision 4 (≥1 dry-run per envelope_class; provisional/full closure framing); Review Findings section added with 6 resolved decisions + 21 + 5 applied patches + 13 deferred. Status remains `in-progress`.

Files modified during the code-review patch pass (in addition to the originals above):

- `docs/escrow/README.md` — §"Audit independence invariant" rewritten with hybrid pre-ADR sealing rule, single-human-on-both-subsets prohibition, ADR-deferred disjointness math; §"Framework lifecycle" extended with allowed/forbidden transition matrix; §"Sign-off lifecycle" added ledger-vs-inventory reconciliation procedure + inventory row-addition authority; §"Open ADR slots" added mechanism-level revision path; §"Review cadence" added fallback cadence pre-operations-policy.
- `docs/escrow/_envelope-template.md` — top-of-file anti-commit warning added; `re_seal_trigger_conditions` extended with trustee-membership-change + sealing-trustee custody compromise.
- `docs/escrow/credential-inventory.md` — schema legend extended with `sealed` + `pending-separation-mechanism` + `pending-rotation-completion`; audit-mirror + high-sensitivity rows updated to reflect pre-ADR sealing forbidden + Story 1.10 + Story 0.6 multi-blocker on audit-mirror rows; row count corrected (21, not 19); §"Re-evaluation cadence" added substrate-pivot trigger.
- `docs/escrow/escrow-ledger.md` — "Dry-run log" rewritten to track per-envelope_class rehearsals with provisional/full closure framing; "Bus-factor table-top log" added scope-freeze rule; "Periodic re-attestation log" added five-check list (existence-at-custody + non-mutating credential-authenticates + envelope-class unchanged + cross-references resolved + ledger-vs-inventory drift).
- `docs/escrow/sealing-procedure.md` — §1 Prerequisites rewritten to express hybrid pre-ADR sealing rule + audit-mirror structural-fix verification (Story 1.10 + Story 0.6) + custodial-location circular-dependency check; re-seal intro rewritten with explicit prior-envelope invalidation step; §2.6 added minimum custodial transmission constraints pre-ADR (no email/SMS/messaging apps); §3 Rollback added forced-rotation rule (no operator-judgment override) + audit-emission-failure path; §5 Contact escalation list split into normal-operation (§5.1) and bus-factor (§5.2) routes.
- `_bmad-output/implementation-artifacts/deferred-work.md` — created; 13 deferred items recorded under "## Deferred from: code review of 0-2-credential-escrow-established-with-trustee-quorum-open (2026-05-29)".

### Change Log

| Date | Author | Summary |
|---|---|---|
| 2026-05-29 | Solo Builder (claude-opus-4-7 via `bmad-create-story`) | Story file created with comprehensive context for Tasks 1-9; status `ready-for-dev`. |
| 2026-05-29 | Solo Builder (claude-opus-4-7 via `bmad-dev-story`) | Tasks 1-5 author-committed: `docs/escrow/` framework scaffolding (README + envelope template + credential inventory + escrow ledger + sealing procedure) + `.decision-log.md` Decision 2026-05-29-002 entry. Tasks 6-9 awaiting external action (Trustee Panel + Solo Builder mechanism + custodial selection; trustee execution of sealings, dry-run, bus-factor table-top). Status flipped `ready-for-dev` → `in-progress`. |
| 2026-05-29 | Solo Builder (claude-opus-4-7 via `bmad-code-review`) | Three-layer adversarial review (Blind Hunter + Edge Case Hunter + Acceptance Auditor) on Tasks 1-5 output. 51 findings triaged: 6 decision-needed (resolved via user choice — hybrid pre-ADR sealing; defer audit-mirror to structural fix; expand AC-2 to per-envelope-class rehearsal; defer disjoint math to ADR; defer index amendment to `[GOV]` entry); 21 patches applied + 5 patches from decision resolutions (26 total) across README + envelope-template + credential-inventory + escrow-ledger + sealing-procedure + `.decision-log.md` + story file AC-2; 13 deferred to `deferred-work.md`; 11 dismissed as positive-confirmation noise. Notable structural changes: AC-2 amended to require ≥1 dry-run per envelope_class; `pending-separation-mechanism` and `pending-rotation-completion` added to inventory schema; pre-ADR sealing forbidden for `audit-mirror-credential` + `high-sensitivity-tier-credential`; audit-mirror sealings additionally blocked on Story 1.10 + Story 0.6 closure (Solo Builder credential-exposure §2.10a fix); ledger-vs-inventory reconciliation procedure committed (ledger authoritative); forbidden lifecycle transitions enumerated; mechanism-level revision path committed; minimum custodial transmission constraints (no email/SMS/messaging apps) hold pre-ADR. Tasks 6-9 still `_AWAITING EXTERNAL ACTION_`; story status remains `in-progress`. |

---

## Open Questions for Future Resolution

Save these for end-of-implementation review with Solo Builder + Trustee Panel:

1. **Sealing mechanism selection** — the ADR scope per Task 6 will need a structured comparison of mechanism candidates against the §2.10a separability property, the rotation/re-seal interface complexity, the dry-run repeatability requirement, and the geographic-resilience property. Trustee Panel + Solo Builder joint decision. Gap Analysis observes the selection has not yet been made; the escalation path is into Architectural Launch-Gate Inventory (Story 0.15) if the selection slips past Phase-0 closure.
2. **Custodial location selection** — same status as #1; same escalation path.
3. **ADR directory scaffolding scope** — does Story 0.2 scaffold `docs/adr/` (analog to Story 0.1 scaffolding `.decision-log.md`)? Or does ADR scaffolding belong in a dedicated bootstrap story or in Story 0.15? In-session agreement required during dev-story execution.
4. **Audit-mirror envelope class realization** — at Story 0.2 framework time, the audit-mirror credential does not yet exist (Story 1.10 lands the tamper-evident audit-log chain). The envelope-class structural-distinctness mechanism may or may not be testable until 1.10 closes. Confirm with Trustee Panel that the framework's deferral of audit-mirror envelope instantiation is acceptable.
5. **High-sensitivity tier escrow alignment** — architecture §5.9 commits two-person Terraform-mediated approval for operational rotation of high-sensitivity tier credentials. The escrow framework's ≥2-trustee quorum-open is analogous but not identical (different actors: operational engineers vs trustees). Confirm with the Trustee Panel whether the two pathways need explicit reconciliation in the ADR, or whether the escrow framework treats them as independent surfaces.
6. **Trustee disjoint-subset feasibility** — if the §2.10a separation mechanism selected is "disjoint trustee subsets," the Trust must have enough trustees to support disjoint subsets at the chosen quorum level (e.g., 2-of-3 for prod and 2-of-3 for audit-mirror with no shared trustees requires ≥4 trustees; 2-of-3 with one shared requires ≥3). PRD §11 commits "Trustee Panel (≥ 3 trustees, statutory minimum)" — confirm trustee headcount supports the chosen separation mechanism, or fall back to a different separation control (separate sealing mechanism or separate custodial path).
7. **Dry-run rehearsal credential availability** — Task 8 names candidate rehearsal credentials (staging Cloudflare API token, staging WIF binding). Confirm at execution time that at least one such credential exists; if none, defer Task 8 until one does (an explicit deferral entry per [[feedback_closure_language_precision]]).
8. **Bus-factor table-top scope evolution** — AC-3 full closure depends on every owning Story closing. The trustee panel may want a scheduled cadence for partial-scope table-tops as new envelopes get sealed (e.g., a partial table-top after each major Story closure that adds a sealable envelope). Belongs in operations policy; observed here.
