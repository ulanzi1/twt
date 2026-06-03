# Credential Escrow

This directory holds the **governance instruments** for the credential-escrow framework that discharges PRD §9.1.1 (Solo-build operational continuity — credential escrow) and AR-67 (Solo-build operational continuity commitment, including credential escrow with ≥2-trustee sealed envelopes).

**Authority:** architecture.md §Workspace Layout (line 4172) commits `docs/escrow/` as the canonical directory. PRD §9.1.1 commits the bus-factor mitigation rationale and enumerates the credential domains. Story 0.2 (epics.md) commits the framework + trustee-quorum-open + dry-run + bus-factor table-top gates.

**Critical scope distinction — what lives here vs at the custodial location:**

- **Lives here in the git repo:** the inventory of credential domains, the envelope template (schema), the sealing procedure, the ledger of trustee-attested events (sealings, dry-runs, table-tops, gaps), the README, and pointers to the custodial location.
- **Lives at the trustee-selected custodial location (NOT in the repo):** the sealed envelopes themselves — that is, the actual credentials in their sealed form. The repo holds pointers, attestations, and procedure; the custodial location holds the secrets.

**Never commit a credential payload to this directory in plaintext or any reversible form.** The repo is for governance; the custodial location is for credentials. A CI check covering this invariant is out of scope for Story 0.2; it is a candidate addition for Story 1.16b (PII-scrape PR CI gate) or a follow-on governance story.

## Framework lifecycle

A credential is escrowed by passing through these lifecycle states:

1. **Inventory** — the credential domain is recorded in `credential-inventory.md` with its owning system, availability status, and envelope-class.
2. **Sealable** — the credential physically/operationally exists and can be retrieved from its source-of-truth (Secret Manager per architecture §5.9, or the operational origin for non-cloud credentials such as bank account access).
3. **Sealed** — the credential has been retrieved, placed in a sealed envelope per the trustee-selected mechanism, transmitted to the custodial location, and the event is recorded in `escrow-ledger.md` with ≥2-trustee attestation.
4. **Re-sealed (post-rotation)** — the credential has been rotated per architecture §5.9 and `docs/runbooks/secret-rotation.md`; the prior sealed envelope is invalidated and a new envelope is sealed against the rotated credential. The escrow-ledger records the re-seal event.
5. **Quorum-opened** — under a documented scenario (recovery, dry-run, bus-factor table-top), ≥2 trustees execute the quorum-open procedure and retrieve the credential. Every quorum-open is recorded in the escrow-ledger with executing trustees, date, scenario, verification outcome.
6. **Re-sealed (post-open)** — after every quorum-open, the credential is re-sealed unless the open scenario constitutes a permanent transition (e.g., bus-factor activation with no expected Solo-Builder return — in which case the credential is rotated and re-escrowed under the new operational owner).

**Allowed transitions:** `inventory` → `sealable` → `sealed` → `re-sealed-post-rotation` (loops back to `sealed`); `sealed` → `quorum-opened` → `re-sealed-post-open` (loops back to `sealed`). `pending-system-availability` and `deferred-with-ADR` (per `credential-inventory.md` schema) are sub-states of `inventory` that gate the `sealable` transition.

**Forbidden transitions** (the framework MUST abort if attempted):

- `inventory` → `sealed` (skipping the `sealable` precondition + the sealing procedure)
- `inventory` → `quorum-opened` (opening an envelope that does not exist)
- `sealable` → `quorum-opened` (opening before sealing)
- `sealed` → `inventory` (rollback to non-existence — the sealing event is durable; "destroying" a sealed envelope is `re-sealed-post-rotation` with a destroyed-prior-envelope record, not a state regression)
- Any `pending-system-availability` → `sealed` without first passing through `sealable-now`
- Any `pending-separation-mechanism` → `sealed` for `audit-mirror-credential` or `high-sensitivity-tier-credential` before the credential-escrow-mechanism ADR lands (per "Audit independence invariant" pre-ADR sealing rule)

A transition attempt that violates this matrix is a P0 framework violation; raise the gap as a `.decision-log.md` `[CONTINUITY]` entry per `sealing-procedure.md` §1 Prerequisites discipline.

## Property / control / policy three-way discipline

The escrow framework follows the same property-vs-control-vs-policy boundary the runbooks use (see `docs/runbooks/README.md` §"Property / control / policy discipline"):

| Layer | What it commits | Where it lives |
|---|---|---|
| **Property** (architecture-equivalent) | ≥2-trustee quorum; sealed envelopes; documented location; §2.10a audit independence preserved; envelope-class separation; AR-67 framework commitment | This README; the AC text of Story 0.2; the `envelope_class` field of `_envelope-template.md` |
| **Control** (ADR territory) | Specific sealing mechanism (cryptographic toolchain, share scheme, physical seal); specific custodial location (bank safe deposit, notary, trustee residences); specific verification check implementation | `docs/adr/<NNN>-credential-escrow-mechanism.md` (created when Trustee Panel selects the mechanism — see "Open ADR slots" below) |
| **Policy** (operations policy) | Re-seal cadence on rotation; periodic re-attestation cadence; dry-run cadence; access-test scope at table-tops; bus-factor activation criteria | Operations policy doc (forward reference; not yet authored at Story 0.2 closure time) |

When a procedure step requires a decision that is currently deferred to an ADR not yet authored, the step is tagged `[deferred ADR — placeholder procedure]` and the ADR backlog tracks closure. See `sealing-procedure.md` for examples.

## Audit independence invariant — envelope-class separation

Architecture §2.10a commits the following load-bearing property:

> Compromise of production application credentials must not permit modification of audit-mirror data. Compromise of audit-read credentials must not permit access to production data. Sole-engineer operational credentials must not transitively grant audit-write authority. Separation controls must survive routine IAM mistakes and be periodically verified.

A naive escrow framework — "all credentials sealed in one envelope class, ≥2 trustees can open any of them" — **violates** this invariant. The ≥2-trustee quorum that opens prod credentials would also be sufficient to open audit-mirror credentials, so coercion or collusion of two trustees grants an attacker both prod access and audit-mirror access. The entire audit independence story collapses.

The escrow framework therefore requires **envelope-class separation as a structural property**, not as a policy promise. Every sealed envelope is tagged with an `envelope_class`:

- `prod-credential` — production application credentials (prod DB, Cloudflare admin, Dokploy admin, payment intent, DigiLocker integration, etc.). Quorum-open authority: prod-class trustee subset.
- `audit-mirror-credential` — credentials granting access to the audit-mirror project (`twt-audit-mirror` per architecture §2.10 / §5.9). Quorum-open authority: audit-class trustee subset, **structurally disjoint** from the prod-class subset by the mechanism the ADR records.
- `high-sensitivity-tier-credential` — KEK roots, partner JWT signing keys, telephony recording-storage credentials per architecture §5.9 high-sensitivity tier. Operational rotation requires two-person Terraform-mediated approval per §5.9; escrow recovery requires ≥2-trustee quorum aligned to the high-sensitivity discipline.

**The mechanism for structural distinctness across envelope classes is ADR territory.** Candidate mechanisms (the Trustee Panel + Solo Builder decision recorded in the credential-escrow-mechanism ADR — see Open ADR slots below):

1. **Disjoint trustee subsets** — the ≥2-quorum for `prod-credential` is from one named subset; the ≥2-quorum for `audit-mirror-credential` is from a disjoint subset. Coercion of two trustees from the prod subset does not grant audit-mirror access because the audit-mirror subset is different.
2. **Separate sealing mechanisms** — `prod-credential` envelopes use mechanism A; `audit-mirror-credential` envelopes use mechanism B; the mechanisms do not share recovery shares.
3. **Separate custodial paths** — `prod-credential` envelopes live at custodial location L1; `audit-mirror-credential` envelopes live at L2; access to L2 requires a separately-keyed access path.
4. **Hybrid** — combinations of the above.

The ADR records the chosen mechanism with its rationale against the §2.10a property, the rotation/re-seal interface complexity, the dry-run repeatability requirement, and the geographic-resilience property. The sealing-procedure runbook references the ADR; the inventory's `envelope_class` column is the structural anchor that enforces the invariant at sealing time.

**Trustee headcount + disjointness constraints are ADR territory.** The Trustee Panel + Solo Builder commit a specific definition of "disjoint" (strict no-overlap; constrained-overlap with rules; or hybrid) and the implied headcount in the credential-escrow-mechanism ADR per [[feedback_architecture_vs_adr_boundary]]. PRD §11 commits ≥3 trustees as the statutory minimum; the ADR records whether that headcount supports the chosen separation mechanism or whether trustee headcount must expand. The framework documents do not commit a specific math interpretation; the ADR does.

**Single-human-on-both-subsets prohibition.** Whatever mechanism the ADR selects, a single human trustee MUST NOT be a member of both the prod-class and audit-mirror-class subsets simultaneously. The ADR enforces disjointness as a structural property of subset membership, not merely a procedural convention. A trustee whose ratification authority spans both subsets defeats §2.10a — coercion or compromise of that one human is equivalent to coercion of both quora.

**Pre-ADR sealing rule (hybrid).** Until the credential-escrow-mechanism ADR lands and `docs/adr/` is scaffolded, the framework permits interim sealings ONLY for envelopes of class `prod-credential`, provided the Trustee Panel ratifies an interim sealing mechanism + custodial location in a `.decision-log.md` `[CONTINUITY]` entry that explicitly carries the supersession lineage to the future ADR. Pre-ADR sealings of `audit-mirror-credential` and `high-sensitivity-tier-credential` envelopes are FORBIDDEN — those classes wait for the ADR. The forbid is structural: the sealing-procedure §1 Prerequisites enforces it; the inventory's affected rows are marked `pending-separation-mechanism` per `credential-inventory.md` schema. This rule preserves §2.10a + §5.9 even while permitting low-stakes envelopes to be sealed under the interim regime.

## Relationship to ADRs, runbooks, and `.decision-log.md`

The escrow framework intersects three governance surfaces that have already been established at Story 0.1 + 0.2 time. Each plays a distinct role:

- **ADRs (`docs/adr/`)** — record the *control* choice (sealing mechanism, custodial location, cryptographic toolchain, verification check implementation). At Story 0.2 closure time, the ADR directory may not yet exist (see "Open ADR slots" below); when it is scaffolded, the credential-escrow-mechanism ADR replaces the `[deferred ADR — placeholder procedure]` tags in the sealing-procedure runbook.
- **Runbooks (`docs/runbooks/`)** — record operational procedures. The sealing-procedure runbook in this directory (`docs/escrow/sealing-procedure.md`) uses the same five-section template as `docs/runbooks/`. The secret-rotation runbook (`docs/runbooks/secret-rotation.md`) is the **upstream trigger** for re-seal events: every rotation that yields a new credential payload triggers a re-seal of the corresponding envelope. The escrow framework records the re-seal; the runbook records the rotation.
- **`.decision-log.md`** — records trustee-ratified operational decisions per the schema established by Story 0.1. The escrow framework framework-commit, the trustee selection of sealing mechanism, the trustee selection of custodial location, and any procedure revisions following dry-run gaps are recorded here as `[CONTINUITY]` entries. The `.decision-log.md` schema is **load-bearing** for downstream stories — never silently rewrite it; if a schema amendment is needed, propose it as a `[GOV]` entry per Story 0.1's discipline.

## Sign-off lifecycle

Each event in the escrow lifecycle requires trustee attestation, recorded in `escrow-ledger.md` as a row. The sign-off thresholds:

| Event | Trustees required | Where recorded |
|---|---|---|
| Framework commit (Story 0.2 scaffolding) | ≥2 trustee sign-off (analogous to Story 0.1 AC-2 for runbooks) | `escrow-ledger.md` framework-commit row + `.decision-log.md` entry |
| Sealing mechanism selection | ≥2 trustee ratification | `.decision-log.md` `[CONTINUITY]` entry + credential-escrow-mechanism ADR |
| Custodial location selection | ≥2 trustee ratification | `.decision-log.md` `[CONTINUITY]` entry + the same ADR |
| Per-envelope sealing | ≥2 trustees execute the sealing procedure | `escrow-ledger.md` sealing row |
| Re-seal (post-rotation) | ≥2 trustees execute the re-seal | `escrow-ledger.md` re-seal row |
| Quorum-open (dry-run) | ≥2 trustees (per the envelope's envelope_class quorum) | `escrow-ledger.md` dry-run row |
| Quorum-open (bus-factor table-top) | ≥2 trustees (per the envelope's envelope_class quorum) | `escrow-ledger.md` table-top row |
| Procedure revision (after a gap) | ≥1 trustee acknowledgment for minor; ≥2 for material | `.decision-log.md` `[CONTINUITY]` entry citing the gap |
| Periodic re-attestation | ≥1 trustee per envelope per cadence (cadence is operations policy) | `escrow-ledger.md` re-attestation row |
| Inventory row addition (per-partner or per-bank expansion) | ≥1 trustee acknowledgment | `.decision-log.md` `[CONTINUITY]` entry naming the new row + envelope_class assignment |

The escrow-ledger is the **sole source of truth for trustee-attested escrow events.** A claim of trustee attestation that is not recorded in the ledger is not durable; the ledger is to escrow what `operational-readiness-ledger.md` is to runbooks (per Story 0.1).

**Ledger-vs-inventory reconciliation.** If `credential-inventory.md` and `escrow-ledger.md` disagree on the state of an envelope (e.g., inventory says `sealed` but ledger has no matching sealing row, or vice versa), the **ledger is authoritative**; the inventory is corrected to match the ledger. Drift triggers a `.decision-log.md` `[CONTINUITY]` entry citing the discrepancy + the reconciliation action. Discovery of drift is itself a periodic-re-attestation finding (see "Review cadence" below).

## Credential-domain inventory (PRD §9.1.1 scope)

The full inventory lives in `credential-inventory.md`. The seven PRD §9.1.1 credential domains are:

| Domain | Owning Story (introduces credential) | Envelope class | Notes |
|---|---|---|---|
| Prod DB access (Cloud SQL service-account chain) | Story 1.2 | `prod-credential` | Database credentials per architecture §5.9; IAM authentication where Cloud SQL supports it |
| Cloudflare admin | Pre-existing for Story 0.3 mirror + Story 1.13 edge protection | `prod-credential` | Account admin token + 2FA recovery codes |
| Dokploy admin | Pre-existing if substrate provisioned; full provisioning at Story 1.15 | `prod-credential` | Substrate API tokens per architecture §5.3 |
| Partner integrations | Per-partner at Module Marketplace onboarding (Epic 12) | `prod-credential` per partner; KEKs / signing keys may be `high-sensitivity-tier-credential` | `deferred-with-ADR` until first partner |
| Payment intent / banking | Story 7.7 (UPI signing) + pre-existing trust bank access + Story 9.2 (bank statement intake transport) | mixed: bank operational = `prod-credential`; UPI signing = `high-sensitivity-tier-credential` | See inventory for per-row breakdown |
| DigiLocker integration | Story 3.3b | `prod-credential` | OAuth client_id + client_secret + redirect URI allowlist per architecture §2.8 |
| DPDPA breach-reporting tooling | Story 14.3 (gated by Story 0.13 legal counsel) | `prod-credential` | Portal access + DPO contact path + incident-response tooling |

**Additional envelope classes the framework tracks (beyond the seven PRD §9.1.1 domains, but architecturally adjacent):**

| Domain | Architectural anchor | Envelope class | Notes |
|---|---|---|---|
| KEK roots (Tier 1 envelope encryption KEK + Tier 2 HMAC keys per architecture §2.7) | Story 1.5 | `high-sensitivity-tier-credential` | Annual rotation per §5.9; two-person Terraform approval for destruction scheduling |
| Audit-mirror credentials (`twt-audit-mirror` GCP project service-account chain per architecture §2.10 / §5.9) | Story 1.10 | `audit-mirror-credential` | **Structurally separate** from `prod-credential` per §2.10a — this is the load-bearing case |
| Backup engineer access credentials | Story 0.6 | `prod-credential` (read-only by default per architecture §5.10) | Activated under bus-factor scenario; the escrow envelope holds activation-time credentials |
| Telephony recording-storage credentials | Epic 10 (helpline operator console per architecture §3.5) | `high-sensitivity-tier-credential` | High-sensitivity tier per §5.9 |

The full table with per-row availability status, owning Story, re-seal trigger, and envelope reference lives in `credential-inventory.md`.

## Open ADR slots

The following ADRs are referenced by the escrow framework but not yet authored. Until each ADR lands, the corresponding procedure step is tagged `[deferred ADR — placeholder procedure]` in `sealing-procedure.md`:

| ADR slot | What it commits | Authoring trigger |
|---|---|---|
| Credential escrow mechanism + custodial location | Sealing mechanism (cryptographic toolchain or physical seal); custodial location(s); envelope-class separation control mechanism; verification check implementation | Trustee Panel + Solo Builder selection (Story 0.2 Task 6 — `_AWAITING EXTERNAL ACTION_` at Story 0.2 closure) |

**ADR directory scaffolding** (`docs/adr/`) is NOT scaffolded by Story 0.2. Story 0.2's `.decision-log.md` entry flags this as an open follow-up: scaffolding may happen under Story 0.2 Task 6 with explicit Solo Builder + Trustee Panel agreement, OR be deferred to Story 0.15 (architectural launch-gate inventory) or a dedicated bootstrap story.

**Mechanism-level revision path.** If a dry-run, periodic re-attestation, or operational use reveals that the chosen sealing mechanism itself is flawed (CVE in the cryptographic toolchain; Shamir threshold mis-set; physical seal-tape forgeable; etc.), the credential-escrow-mechanism ADR is **superseded** by a new ADR. The supersession triggers:

1. ALL envelopes sealed under the prior ADR are re-sealed under the new ADR's mechanism. The re-seal log records the mechanism-supersession trigger as the `event type`.
2. Prior envelopes are destroyed (physical) or cryptographically invalidated (key destruction per the prior ADR's destruction procedure) — this is the only allowed `sealed` → non-`sealed` transition; record it as a re-seal-post-mechanism-supersession event in the ledger.
3. The supersession itself is a `.decision-log.md` `[CONTINUITY]` entry citing the prior ADR + the mechanism flaw + the migration plan.
4. The credential-inventory `Last-seal date` column is updated to the post-supersession re-seal date for every affected row.

This path is distinct from procedure revisions (which fix the sealing-procedure runbook without invalidating envelopes). Mechanism revision is the deeper invalidation; procedure revision is the shallow fix.

## Related escrow surfaces owned elsewhere

The credential escrow under Story 0.2 is one of several "escrow" surfaces the project commits. Each lives in its own document with its own authority; this section lists the others so readers know where to look.

| Surface | Owning Story | Location |
|---|---|---|
| **Code escrow** (repo mirror to trustee-controlled location auto-updated on every release-branch push per AR-67) | Story 0.3 | `docs/escrow/code-escrow/` — sub-directory with the framework `README.md`, `mirror-destination-inventory.md`, `code-escrow-ledger.md`, `mirror-procedure.md`, `restoration-procedure.md`. Pipeline lives at `.github/workflows/code-escrow-mirror.yml`. Cross-link from `docs/runbooks/operational-readiness-ledger.md` "Mirror coverage" |
| **DR runbook PDF custody** (per architecture §5.7 — DR runbook held as PDF in the credential-escrow envelope per PRD §9.1.1) | Architecture §5.7 + Story 0.4 (degradation policy) | The DR runbook itself lives in `docs/runbooks/` once authored; its custodial PDF copies are sealed under the same envelope framework defined here. Cross-reference: the DR runbook PDF gets a row in `credential-inventory.md` with envelope class `prod-credential` once Story 0.4 authors the DR runbook. |
| **Knowledge-transfer pack** (per AR-67 — ADRs, Niyamavali → FR mapping, deployment topology, on-call playbook, dependency inventory) | Story 0.5 | Stored in the trustee-accessible repo; not sealed (the KT pack is intended to be readable, not escrowed) |
| **Backup engineer contract + retainer** (per AR-67 + A-13) | Story 0.6 | Contract documents stored with the legal counsel engaged under Story 0.13; the backup engineer's access credentials are escrowed via Story 0.2 framework (envelope class `prod-credential`) |
| **Legal counsel engagement** (per AR-67 — PRD §9.1.1 credential-domain "DPDPA breach-reporting tooling" gated by counsel review + 5 AC-named scope items: trust-posture copy + DPDPA consent flow + denial-appeal procedural fairness + Account State Machine transition-table + dual-path claim authority-to-file evidentiary spec per UX §Phase-0 P0-4 + epics line 564 + 687) | Story 0.13 | Author-committed 2026-06-02 at `docs/legal-counsel-engagement/` per Decision 2026-06-02-013 — framework includes README + engagement-letter-template + review-scope-charter + review-artifact-roster + per-artifact-return-roster + counsel-roster + engagement-ledger. The escrow inventory `dpo-breach-reporting-portal` envelope (line 75) + `dpo-contact-path` envelope (line 77) are inventory rows `es-1` + `es-2` in `docs/legal-counsel-engagement/review-scope-charter.md` §3 — substantive envelope identification + access credentials committed at Story 0.13 Task 11 per-counsel-return event + Story 14.3 closure (cross-coupled with `review-artifact-roster.md` Row 17 priority-7 `dpo-breach-reporting-envelope-v1`). Trustee Panel scope ratification + counsel selection + engagement-letter signature + first-artifact submission + counsel returns pending Tasks 7-11 |
| **Degradation policy framework** (per Story 0.4 — per-surface stance + 5-channel comms templates + table-top exercise for the "Solo Builder unavailable >7 days" scenario per PRD §9.1.1 paragraph 4) | Story 0.4 | `docs/degradation-policy/` (top-level surface parallel to `docs/escrow/`, `docs/runbooks/`, `docs/adr/`). The comms templates carry PENDING LEGAL REVIEW markers until Story 0.13 returns per-template. Cross-links into the `dr-runbook-pdf-custody` row in `credential-inventory.md` + the `degradation-policy-ledger.md` trustee sign-off log. Story 0.4 author-commit dated 2026-05-29 |
| **Native-stack validation framework** (per Story 0.14 — ~2-week prototype on RN + Tamagui of three named patterns × three test devices × P1-P6 pass criteria; ratify-or-pivot decision per FM-2 tiered escalation) | Story 0.14 | `docs/native-stack-validation/` (top-level surface parallel to `docs/escrow/`, `docs/runbooks/`, `docs/adr/`). **No escrow envelope required** — devices are operational test artifacts (not credential-bearing); per `device-procurement-roster.md` `decommission_disposition` discipline, test devices retain or are returned to trustee post-experiment but do not enter the credential-escrow envelope inventory. Apple Developer Program account credentials (used for TestFlight enrollment; TestFlight enrollment procedure per `experiment-protocol.md` §5.3; ADP fee cross-coupling per `device-procurement-roster.md` Row 3 notes + §3) are personal-to-Solo-Builder and are NOT in scope of the trust's credential escrow inventory at v1; cross-coupling with Story 0.6 backup-engineer access-credentials inventory may surface this question at re-attestation time. Story 0.14 framework author-commit dated 2026-06-02 per Decision 2026-06-02-014 |
| **Architectural launch-gate inventory framework** (per Story 0.15 — 15-row inventory-roster covering 12 architecture §Launch Gate Risks verbatim + 3 Gap Analysis conditional-escalation candidates + 1 reserved; closure-criteria-rubric + target-date-rationale-template + monthly-review-cadence-protocol + escalation-protocol + engagement-ledger; trustee-side governance surface aggregating prior Phase-0 portfolios' closures + Trustee Panel direct activities for Trust formation + predicate-materialization tracking for Gap Analysis observations) | Story 0.15 | `docs/launch-gate-inventory/` (top-level surface parallel to `docs/escrow/`, `docs/runbooks/`, `docs/adr/`). **No escrow envelope required** — the inventory-roster is an operational-governance artifact (not credential-bearing); per-row `closure_evidence_link` resolves to existing surfaces (Decision-log entries, ADRs, runbooks, contracts, research artifacts) rather than holding sealed credentials. Trustee-side governance surface for Phase 1 launch readiness signal arming; ≥2-trustee inventory ratification + monthly review cadence + per-row closure events + final all-rows-closed-or-deferred sign-off + annual re-attestation cadence pending Tasks 8-11. Story 0.15 framework author-commit dated 2026-06-03 per Decision 2026-06-03-015 |

The Story 0.2 framework is the **credential-escrow surface** only; it does not cover the other escrow surfaces above except by cross-reference. The other surfaces own their own governance; Story 0.2's inventory references them where their credentials intersect (e.g., the backup engineer's access credentials get an inventory row even though Story 0.6 owns the contract itself).

## Review cadence

Per architecture §5.15, the runbook inventory is reviewed at the same cadence as the threat-actor inventory (§2.1) and the data-class retention matrix (§2.12). The escrow inventory inherits this cadence by symmetry — credentials change as systems come online and as rotation events occur. The review confirms:

- Every credential-inventory row still cites a currently-valid owning Story (no broken cross-references after Story renumbering).
- Every sealed envelope's last-seal date is within the rotation cadence for that credential class (drift indicates a missed re-seal).
- Every envelope-class assignment still preserves the §2.10a invariant (drift indicates a separation-mechanism failure to detect).
- Sign-offs in the escrow-ledger are not stale relative to the envelope's last-rotation event.

Specific cadence (monthly, quarterly, etc.) belongs in operations policy, not in this README.

**Fallback cadence pre-operations-policy.** Until operations policy is authored, the framework defaults to: **quarterly** re-attestation per envelope; **annual** review of envelope-class assignments against §2.10a; **on-rotation-event** re-seal triggers (per the credential's source-of-truth rotation). The fallback values are not architectural commitments — they are placeholders to prevent the framework from sitting unwatched while operations policy is unwritten. When operations policy lands, its values supersede these.

## File index

- `_envelope-template.md` — sealed-envelope content schema; copy this when constructing a new envelope (the construction itself happens at the custodial location, not in the repo).
- `credential-inventory.md` — the canonical list of credential domains, envelope classes, availability status, owning Stories, re-seal triggers, and envelope references.
- `escrow-ledger.md` — trustee event-record (sealings, re-seals, dry-runs, table-tops, gaps, procedure revisions). **Sole source of truth for trustee-attested escrow events.**
- `sealing-procedure.md` — five-section runbook for the sealing operation.
