# Code Escrow

This directory holds the **governance instruments** for the code-escrow framework that discharges PRD §9.1.1 (Solo-build operational continuity — code escrow) and AR-67 (Solo-build operational continuity commitment, including code escrow with auto-mirror to a trustee-controlled location on every release-branch push).

**Authority:** architecture.md §5.4 (CI/CD pipeline) commits "Source-code host: GitHub primary; escrow mirror to trustee-controlled location per Step 2 §9.1.1." PRD §9.1.1 commits the bus-factor mitigation rationale + the 30-day takeover property ("sufficient documentation for a contracted external engineer to take over within 30 days. Mirror is updated automatically on every release-branch push"). Story 0.3 (epics.md) commits the framework + ratification gates + restoration drill + bus-factor switch-to-mirror exercise.

**Critical scope distinction — what the mirror IS and what it is NOT:**

- **The mirror IS** a source-code survival surface — full git history, refs, tags, LFS pointers — replicated to a trustee-controlled location so the codebase survives if Solo Builder's primary repo access is lost.
- **The mirror IS NOT** a deployment substrate (Dokploy / Cloud Run own that per architecture §5.3), a secret store (GCP Secret Manager + GitHub Actions secrets own that per §5.9), a container registry (Artifact Registry owns that per §5.4), or an audit-mirror (`twt-audit-mirror-prod` owns that per §2.10 / §5.2 — see "Surface separation" below).

**Never commit secret values, credential payloads, or production data to this directory in plaintext or any reversible form.** The repo is for governance; secret values live in GitHub Actions secrets + GCP Secret Manager. A CI check covering this invariant is out of scope for Story 0.3 — see Story 1.16b (PII-scrape PR CI gate) for the future enforcement surface.

## Framework lifecycle

A code-escrow mirror passes through these lifecycle states:

1. **Mirror-destination-inventoried** — a candidate destination is recorded in `mirror-destination-inventory.md` with availability status `pending-ADR`.
2. **ADR-ratified** — the Trustee Panel + Solo Builder select the destination + credential model; the credential-escrow-mirror-destination ADR is authored in `docs/adr/`; the inventory row flips to `provisioned-pending-wire`.
3. **Provisioned** — the destination exists at the chosen platform with trustee-administrative-control; access credentials (deploy key, OAuth token, etc.) are generated.
4. **Wired** — the GitHub Actions secret(s) (`MIRROR_PUSH_CREDENTIAL`, `MIRROR_DESTINATION_URL`) are populated; the mirror workflow is operational; the inventory row flips to `wired-pending-verification`.
5. **Verified** — at least one release-branch push has replicated successfully AND ≥2 trustees have independently verified read-access from the mirror; the inventory row flips to `verified`.
6. **Restoration-drilled** — a trustee-authorized engineer has executed the restoration-procedure runbook end-to-end against the mirror (clone + build + deploy to non-prod); the inventory row flips to `restoration-drill-passed`.
7. **Bus-factor-table-topped** — a non-Solo-Builder engineer has executed the switch-to-mirror exercise under bus-factor silence per AC-2; the exercise outcome is recorded in `code-escrow-ledger.md` "Bus-factor switch-to-mirror log."

**Allowed transitions:** `mirror-destination-inventoried` → `ADR-ratified` → `provisioned` → `wired` → `verified` → `restoration-drilled` → `bus-factor-table-topped`. Re-verification on each cadence cycle loops back to `verified` with a new ledger row.

**Forbidden transitions** (the framework MUST abort if attempted):

- `mirror-destination-inventoried` → `wired` (skipping the ADR + provisioning preconditions)
- `provisioned` → `verified` (skipping the wired + first-successful-push preconditions)
- `wired` → `restoration-drilled` (skipping the ≥2-trustee read-access verification)
- Any state → `bus-factor-table-topped` without going through `verified` first (the exercise needs a known-good mirror state to compare against)
- `wired` reverting to `provisioned` without recording a credential-rotation event in the ledger (a wire revert is a credential-rotation; record it explicitly per architecture §5.9)
- Sealing the mirror destination under sole Solo Builder administrative control (defeats AR-67's trustee-controlled requirement — see "Surface separation" §"Trustee-administrative-control attestation" below)

**Allowed via mechanism-revision** (per §"Open ADR slots" mechanism-revision path — distinct from the linear lifecycle):

- `wired` | `verified` | `restoration-drilled` | `bus-factor-table-topped` → `superseded`, when the superseding row has been authored at `pending-ADR` AND the supersession is recorded as a `.decision-log.md` `[CONTINUITY]` entry citing the prior ADR + the flaw + the migration plan. The old row's history is preserved; only the status flips. This is the ONLY allowed exit to `superseded`.
- New row at `pending-ADR` immediately after a supersession (recursive entry to the lifecycle for the replacement destination).

A transition attempt that violates either matrix is a P0 framework violation; raise the gap as a `.decision-log.md` `[CONTINUITY]` entry per `mirror-procedure.md` §1 Prerequisites discipline.

## Property / control / policy three-way discipline

The code-escrow framework follows the same property-vs-control-vs-policy boundary the credential-escrow framework uses (see `../README.md` §"Property / control / policy three-way discipline" — Story 0.2's parent file) and the runbooks use (see `../../runbooks/README.md`):

| Layer | What it commits | Where it lives |
|---|---|---|
| **Property** (architecture-equivalent) | Mirror exists; trustee-controlled (administered by ≥1 trustee, not Solo Builder); auto-updated on every release-branch push; 10-minute SLA; full git history (refs + tags + LFS); read-access verified by ≥2 trustees; restoration drill demonstrates code accessibility; bus-factor switch-to-mirror demonstrates continuity-of-development; AR-67 + PRD §9.1.1 + architecture §5.4 framework commitment | This README; the AC text of Story 0.3; the workflow YAML's structure (`on: push`, `git push --mirror`, `timeout-minutes: 8`); the inventory's `Trustee-administrative-control attestation` column |
| **Control** (ADR territory) | Specific mirror destination (GitLab.com vs Codeberg vs Gitea-self-hosted vs Bitbucket vs hybrid); specific credential model (deploy key vs OAuth token vs platform-native push-mirror); specific replication mechanism (workflow-push vs platform-pull-mirror); specific branch-protection rules at the mirror | `docs/adr/<NNN>-code-escrow-mirror-destination.md` (created when Trustee Panel + Solo Builder select the destination — see "Open ADR slots" below). The mirror workflow's destination step is tagged `[deferred ADR — placeholder procedure]` until the ADR lands |
| **Policy** (operations policy) | ≥2-trustee read-access re-verification cadence; restoration drill cadence; mirror-push credential rotation cadence (interlocks with architecture §5.9); mirror-destination renewal/review cadence | Operations policy doc (forward reference; not yet authored at Story 0.3 closure time — same posture as Story 0.1 + 0.2 policy-layer commitments) |

When a procedure step requires a decision that is currently deferred to an ADR not yet authored, the step is tagged `[deferred ADR — placeholder procedure]` and the ADR backlog tracks closure. See `mirror-procedure.md` and `restoration-procedure.md` for examples.

## Release-branch set

"Release branch" per Story 0.3 AC-1 + AR-67 is **the set of branches whose push triggers a mirror operation**, not necessarily the same set as the strictest WIF binding for prod deploys per architecture §5.4 ("only the production-release branch + production-deploy workflow file"). The two sets are related but distinct: the **mirror set is at least as broad** as the prod-deploy set so the mirror also captures pre-prod release-candidate work, trunk merges, and any branch whose code-survival is in scope for bus-factor mitigation.

**Current commitment (Story 0.3 author-commit time):** the release-branch set is `{main}` as the default placeholder. The placeholder is explicit; the workflow YAML's `on: push: branches:` list cites Story 1.1 (turborepo-monorepo-bootstrap) as the alignment point. When Story 1.1 commits the canonical branching model:

- If Story 1.1 commits `main` as the trunk + `release/*` as prod cuts, this set MUST expand to `{main, release/*}` — trunk work must be mirrored (so bus-factor recovery includes in-flight WIP) AND release candidates must be mirrored (so the trust holds every prod-eligible cut).
- If Story 1.1 commits a different model (e.g., trunk-based development with prod cuts on tags), the set adapts accordingly; the `on:` clause may need to add a `tags:` filter.

The amendment is a `.decision-log.md` `[CONTINUITY]` entry citing Story 1.1 closure as the trigger; the workflow YAML's branch list is updated under that entry's authority. **The property** committed here is "every release-branch push triggers a mirror within 10 minutes." **The control** (which branches are release branches) is committed by Story 1.1 + architecture §5.4. **The policy** (how the mirror behaves under retries, partial pushes, force-pushes) is committed by `mirror-procedure.md`. Do not inline a control choice in the README beyond the placeholder.

## Surface separation — what the mirror MUST NOT carry

The mirror is a **source-code survival surface**, not a deployment or secret-storage or audit-mirror surface. Specifically the mirror MUST NOT receive:

- **(a) GCP service-account keys or any secret values.** Per architecture §5.4 (Workload Identity Federation) + §5.9 (Secret Manager), secrets live in GCP Secret Manager + GitHub Actions secrets — never in the repo. The mirror replicates the source tree as-is; the source tree contains no secret values; therefore the mirror also contains no secret values. If a secret accidentally lands in the repo (e.g., via a misconfigured `.env` commit), the mirror inherits that exposure — escalate per `docs/runbooks/secret-rotation.md` immediately.
- **(b) Container images or Artifact Registry artifacts.** Those live in `asia-south1` Artifact Registry per architecture §5.4 + §5.2. The mirror's scope is source code only — a rebuild from mirror source is part of the restoration drill (see `restoration-procedure.md`).
- **(c) Audit-mirror data or any production data.** Per architecture §2.10a — the audit-mirror lives in `twt-audit-mirror-prod` with its own credentials and its own structural separation. The code-mirror is a separate surface with separate credentials and serves a different invariant (code survival, not audit independence). **The two MUST NOT be conflated.**

### LFS object payloads are NOT mirrored

`git push --mirror` propagates LFS **pointer files** (the small text blobs in the git tree). It does NOT propagate the underlying **LFS object payloads** (the actual binary content stored at an LFS server). The workflow does NOT call `git lfs push --all` — adding LFS object replication would require a destination platform with LFS server support and would expand the Task 7 ADR's scope.

**Restoration implications:**

- A clone from the mirror retrieves LFS pointers but cannot resolve them to binary content unless a separately-maintained LFS source is available.
- The restoration drill (`restoration-procedure.md` §2.4) builds from the cloned tree; any workspace whose build depends on LFS-tracked binaries (large fixtures, sample assets, packaged binaries) will fail at build time with "object not found."
- Out-of-band LFS recovery (a trustee-held LFS clone; a separately-escrowed snapshot of the LFS store) is required to discharge the 30-day takeover property for LFS-dependent workspaces.

**Property commitment:** the framework currently assumes the trust's workspaces are **substantially LFS-free**. If LFS becomes a real dependency, Story 1.x (typically Story 1.1 turborepo bootstrap if LFS is decided early) explicitly adds an LFS-handling commitment — either to expand this workflow with `git lfs push --all`, or to commit a separate LFS-escrow surface. Until then the gap is acknowledged here, not silently absorbed.

### Force-push semantics — residual risk at primary

`git push --mirror` is force-push-equivalent at the mirror — a force-push at primary propagates to the mirror without prompt. This is intentional (the mirror is a faithful copy, not an independent fork). Two compounding properties:

1. **Force-push at primary destroys mirror history.** A hostile or accidental force-push that rewrites primary `main` propagates to mirror within ~minutes, overwriting whatever the mirror previously held. This is an AR-67-acknowledged property; the mitigation is primary-side branch protection (Story 1.1 + Story 1.16x territory).
2. **`cancel-in-progress: true` AMPLIFIES the force-push destruction.** Per the workflow's concurrency policy, an in-flight push that's mid-`--mirror` is cancelled by a newer push. If the older push was mirroring history H and the newer is a force-push of history H', cancellation means H never reaches the mirror — refs or tags that lived only in H are lost. Concurrency introduces no new failure mode (force-push already destroys; this just amplifies), but the trust should understand that "force-push at primary" is a P0 incident not just a documentation note.

**Mitigations** (mostly forward-deferred):

- **Primary-side branch protection** (Story 1.1) — `main` and any release branches MUST require pull requests, prevent force-push, require signed commits.
- **Out-of-band trustee-held clones** as a data-loss baseline — the AC-2 data-loss check explicitly cites this.
- **Periodic re-verification of mirror HEAD vs ledger artifact** — drift detection catches divergence post-event.
- **Workflow-failure paging** (Story 0.3 Open Question #4) — silent SLA breaches go unnoticed without monitoring; a force-push event followed by a long quiet window should page.

### Structural property — mirror compromise does not transitively grant production access

Compromise of the mirror destination MUST NOT permit:

- **(i) Read of production audit-mirror data** — the audit-mirror credentials are sealed under Story 0.2's framework with envelope-class `audit-mirror-credential` and are structurally separated from `prod-credential` (per §2.10a). The mirror has no access to the audit-mirror.
- **(ii) Write to the production application** — the prod-deploy WIF binding (architecture §5.4) is scoped to the **primary** GitHub repo + production-release branch + production-deploy workflow file. The mirror destination is **not** in the WIF trust binding. A malicious push to the mirror cannot mint a prod-deploy token; the mirror is unable to trigger a production deploy by construction.
- **(iii) Access to the high-sensitivity-tier credentials per §5.9** — KEK roots, partner JWT signing keys, telephony recording-storage credentials live in a separate GCP project per §5.9 high-sensitivity tier. The mirror destination has no IAM grants into that tier.

This is a structural property, not a policy promise. The mirror-destination ADR (Task 7) MUST preserve all three points; a candidate destination that weakens any of them is unacceptable.

### Trustee-administrative-control attestation

AR-67 commits "code escrow — repo mirrored to ≥1 trustee-controlled location." The structural anchor for "trustee-controlled" is the `Trustee-administrative-control attestation` column in `mirror-destination-inventory.md` — each row names the trustee(s) who hold owner-account credentials at the destination platform. **The mirror destination MUST NOT be administered by Solo Builder alone.** Sole-Solo-Builder admin defeats the bus-factor mitigation — a single Solo Builder compromise would also compromise the mirror, leaving the trust with no recovery surface.

The minimum is ≥1 trustee administrator; the recommended posture (subject to Task 7 ADR) is ≥2 trustees with multi-factor + recovery codes held in the credential-escrow envelope under Story 0.2's framework.

## Surface relationship to credential escrow (Story 0.2)

The code-mirror destination's credentials themselves are escrowed under Story 0.2's framework. The relationship:

- The **mirror destination admin credentials** (the trustees' owner-account credentials at GitLab.com / Codeberg / Gitea-self-hosted / etc.) are added to `docs/escrow/credential-inventory.md` as a new row when Task 7's destination ADR ratifies (envelope_class: `prod-credential`; owning Story: 0.3).
- The **mirror push credential** (the GitHub Actions secret value — deploy key private half, OAuth token, etc.) is added to `docs/escrow/credential-inventory.md` as a separate row at Task 8 wire-up (envelope_class: `prod-credential`; owning Story: 0.3; re-seal trigger: rotation per §5.9). The secret VALUE lives at the custodial location per Story 0.2's framework; the secret NAME (the GitHub Actions reference) lives in the workflow YAML in this repo.
- The **DR runbook PDF custody** (architecture §5.7) is already sealed under Story 0.2's framework. The mirror is the *git surface* for the runbook source-markdown; the PDF custody is a separate envelope.

This avoids surface duplication — Story 0.3 owns the *mirror pipeline*; Story 0.2 owns the *credential envelopes that the pipeline depends on*. The two frameworks compose; they do not overlap.

## Relationship to ADRs, runbooks, and `.decision-log.md`

- **ADRs (`docs/adr/`)** — record the *control* choice (mirror destination platform, credential model, replication mechanism, branch-protection rules at the mirror, verification check implementation). At Story 0.3 closure time, the ADR directory may not yet exist (per Story 0.2 Decision 002 Open Follow-up #6); when it is scaffolded (Story 0.3 Task 7 with Trustee Panel consent, OR Story 0.15, OR a dedicated bootstrap story), the code-escrow-mirror-destination ADR replaces the `[deferred ADR — placeholder procedure]` tags in `mirror-procedure.md` and the workflow YAML's destination step.
- **Runbooks (`../../runbooks/`)** — record operational procedures. `mirror-procedure.md` and `restoration-procedure.md` in *this* directory use the same five-section template as `docs/runbooks/_template.md`. The `secret-rotation.md` runbook in `docs/runbooks/` is the **upstream trigger** for mirror-push-credential re-seal events: every rotation of the mirror-push credential triggers a re-seal of the corresponding Story 0.2 envelope. Cross-link in both directions.
- **`.decision-log.md`** — records trustee-ratified operational decisions per the schema established by Story 0.1. The Story 0.3 framework-commit, the trustee mirror-destination ratification, the trustee credential-model ratification, the GitHub Actions secret-wiring event, the ≥2-trustee read-access verifications, the restoration drill outcome, the bus-factor switch-to-mirror outcome, and any procedure revisions are recorded here as `[CONTINUITY]` entries. The schema is **load-bearing** for downstream stories — never silently rewrite it; schema amendments propose via `[GOV]` entries per Story 0.1 + 0.2 discipline.

## Sign-off lifecycle

Each event in the code-escrow lifecycle requires trustee attestation, recorded in `code-escrow-ledger.md` as a row. The sign-off thresholds:

| Event | Trustees required | Where recorded |
|---|---|---|
| Framework commit (Story 0.3 scaffolding) | ≥2 trustee sign-off (analogous to Story 0.1 AC-2 for runbooks; Story 0.2 framework-commit) | `code-escrow-ledger.md` framework-commit row + `.decision-log.md` entry |
| Mirror destination ratification | ≥2 trustee ratification | `.decision-log.md` `[CONTINUITY]` entry + code-escrow-mirror-destination ADR |
| Mirror credential model ratification | ≥2 trustee ratification | `.decision-log.md` `[CONTINUITY]` entry + the same ADR (or separate ADR per Task 7 decomposition) |
| GitHub Actions secret wiring | ≥1 trustee acknowledgment (the wiring action is Solo Builder; the attestation is trustee) | `code-escrow-ledger.md` workflow-secret-wiring row + Story 0.2 credential-inventory row addition |
| Mirror-workflow run (per release-branch push) | None at run time; ledger reconciliation appends rows from workflow artifacts | `code-escrow-ledger.md` mirror-workflow run record |
| Read-access verification (≥2 trustees per destination) | ≥2 trustees per destination per verification cycle | `code-escrow-ledger.md` read-access verification row |
| Restoration drill | ≥1 trustee witnesses the drill; the executor is a trustee-authorized engineer (preferably the Story 0.6 backup engineer; otherwise the Story 0.1 AC-4 substitute model applies) | `code-escrow-ledger.md` restoration drill row |
| Bus-factor switch-to-mirror exercise | ≥1 trustee schedules the exercise; the executor is non-Solo-Builder under bus-factor silence (Story 0.6 backup engineer; or substitute) | `code-escrow-ledger.md` bus-factor switch-to-mirror row |
| Procedure revision (after a gap) | ≥1 trustee acknowledgment for minor; ≥2 for material | `.decision-log.md` `[CONTINUITY]` entry citing the gap |
| Periodic re-verification | ≥1 trustee per destination per cadence (cadence is operations policy) | `code-escrow-ledger.md` periodic-re-verification row |

The code-escrow-ledger is the **sole source of truth for trustee-attested code-escrow events.** A claim of trustee attestation that is not recorded in the ledger is not durable; the ledger is to code escrow what `escrow-ledger.md` is to credential escrow (per Story 0.2) and what `operational-readiness-ledger.md` is to runbooks (per Story 0.1).

**Ledger-vs-inventory reconciliation.** If `mirror-destination-inventory.md` and `code-escrow-ledger.md` disagree on the state of a destination (e.g., inventory says `verified` but ledger has no matching read-access verification rows), the **ledger is authoritative**; the inventory is corrected to match. Drift triggers a `.decision-log.md` `[CONTINUITY]` entry citing the discrepancy + the reconciliation action.

**Ledger-vs-workflow reconciliation.** The mirror workflow appends mirror-workflow run records to the ledger via the build artifact `mirror-push-record-<run-id>.json` (Task 2 mechanism). If a workflow run completed at GitHub Actions but the ledger has no corresponding row (artifact missing; reconciliation procedure not yet run), the workflow run record is **provisionally trusted** based on the GitHub Actions run history; the ledger is updated when the next reconciliation runs. Persistent reconciliation drift triggers a `.decision-log.md` `[CONTINUITY]` entry — the gap is a framework-level issue, not a procedure issue.

## Open ADR slots

The following ADRs are referenced by the code-escrow framework but not yet authored. Until each ADR lands, the corresponding procedure step is tagged `[deferred ADR — placeholder procedure]` in `mirror-procedure.md`:

| ADR slot | What it commits | Authoring trigger |
|---|---|---|
| Code-escrow mirror destination + credential model | Mirror destination platform (GitLab.com / Codeberg / Gitea / Bitbucket / hybrid); credential model (deploy key / OAuth token / platform-native); replication mechanism (workflow-push / platform-pull); branch-protection rules at the mirror | Trustee Panel + Solo Builder selection (Story 0.3 Task 7 — `_AWAITING EXTERNAL ACTION_` at Story 0.3 closure) |

**ADR directory scaffolding** (`docs/adr/`) is NOT scaffolded by Story 0.3 author-commit. Story 0.2 Decision 002 Open Follow-up #6 carries the open scaffolding question; Story 0.3 inherits the same posture. Scaffolding may happen under Task 7 with explicit Solo Builder + Trustee Panel agreement (similar to how Story 0.1 scaffolded `.decision-log.md` and Story 0.2 scaffolded `docs/escrow/`), OR be deferred to Story 0.15 (architectural launch-gate inventory) or a dedicated bootstrap story.

**Mechanism-level revision path.** If a restoration drill, ≥2-trustee read-access verification, or bus-factor switch-to-mirror exercise reveals that the chosen destination or credential model is structurally flawed (the platform's push-mirror SLA cannot meet 10 minutes; the credential model lacks rotation hooks compatible with §5.9; the destination's owner-account credentials cannot be held by trustees per AR-67), the code-escrow-mirror-destination ADR is **superseded** by a new ADR. The supersession triggers:

1. The mirror workflow's secret references and destination URL are updated under a `.decision-log.md` `[CONTINUITY]` entry citing the prior ADR + the flaw + the migration plan.
2. The old destination is left in place during the migration (do not de-provision until the new destination has ≥2-trustee verified read-access + a successful restoration drill).
3. The old mirror-push credential is rotated and re-sealed under Story 0.2's framework; the new destination's credentials are sealed under the same framework.
4. The inventory rows are updated: the old row's status flips to `superseded` with a cross-link to the new row; the new row starts at `pending-ADR` (recursive entry point) and walks through the lifecycle.

This path is distinct from procedure revisions (which fix `mirror-procedure.md` or `restoration-procedure.md` without invalidating the destination itself). Mechanism revision is the deeper change; procedure revision is the shallow fix.

## Related code-survival surfaces owned elsewhere

The code-escrow Story 0.3 owns is one of several "code survival + continuity" surfaces. Each lives in its own document with its own authority; this section lists the others so readers know where to look.

| Surface | Owning Story / authority | Location |
|---|---|---|
| **Credential escrow** (the credentials the code-mirror destination uses) | Story 0.2 | `docs/escrow/README.md` + sibling files; mirror-push credential row added at Story 0.3 Task 8 |
| **DR runbook PDF custody** (architecture §5.7) | Architecture §5.7 + Story 0.4 (degradation policy) | DR runbook source-markdown lives in `docs/runbooks/` once authored; the runbook PDF custody is sealed under Story 0.2's credential-escrow framework |
| **Knowledge-transfer pack** (AR-67 + PRD §9.1.1 paragraph 5 — ADRs, Niyamavali → FR mapping, deployment topology, on-call playbook, dependency inventory + comprehension questionnaire) | Story 0.5 | **Author-committed 2026-05-30 at `docs/knowledge-transfer/`** — README + ADR-index (64 deferred-ADR slots) + Niyamavali → FR mapping (14 clause rows + 20 FR inverse-lookup rows + verbatim §1.14 Account State Machine extract) + deployment-topology (8 sections + ASCII schematic) + on-call-playbook (5-section meta-playbook covering 13 incident classes) + third-party-dependency-inventory (30 rows across 7 sections) + comprehension-questionnaire (30 questions / 5 sections) + answer-key + kt-pack-ledger. Also `docs/adr/` scaffolded (README + `_adr-template.md`) per Decision 2026-05-29-003 Open Follow-up #6 closure. Stored in the trustee-accessible repo (which inherits this story's mirror coverage); not sealed (intended to be readable, not escrowed). Joint-discharger of the 30-day takeover property per Story 0.3 + Story 0.4 + Story 0.5 + Story 0.6 anchor in `docs/knowledge-transfer/kt-pack-ledger.md` Comprehension administration log header |
| **Backup engineer contract + retainer** (AR-67 + A-13) | Story 0.6 | Contract documents stored with the legal counsel engaged under Story 0.13; the backup engineer's access credentials are escrowed via Story 0.2's framework and the backup engineer's clone of the primary repo is itself a *de facto* code-survival surface (any out-of-band trustee-held clone is part of the data-loss-check baseline per AC-2) |
| **Degradation policy comms templates** (per Story 0.4) | Story 0.4 | **Author-committed 2026-05-29 at `docs/degradation-policy/`** — README + surface-inventory + `comms-templates/` (5 channel files: push, WhatsApp, SMS, email, public-page banner; all carry the PENDING LEGAL REVIEW marker until Story 0.13 returns per-template) + degradation-policy-ledger + table-top-exercise runbook. The framework references *this* (code-escrow) framework for the code-survival posture under the "Solo Builder unavailable >7 days" scenario via the 30-day takeover joint-discharge anchor in `docs/degradation-policy/degradation-policy-ledger.md` Table-top exercise log header |
| **Operational runbooks** (deploy, rollback, secret-rotation, audit-log-integrity-verification, reconciliation-manual-intervention, RBAC-seed-reset, multi-pariwar-provisioning) | Story 0.1 | `docs/runbooks/` — already authored; mirror coverage inherited from this story per `docs/runbooks/operational-readiness-ledger.md` "Mirror coverage" section |

The Story 0.3 framework is the **source-code-mirror surface** only; it does not cover the other code-survival surfaces above except by cross-reference. The other surfaces own their own governance; Story 0.3 references them where they affect the mirror's data-loss baseline (e.g., the backup engineer's local clone is part of the AC-2 data-loss check baseline).

## Review cadence

Per architecture §5.15, the runbook inventory is reviewed at the same cadence as the threat-actor inventory (§2.1) and the data-class retention matrix (§2.12). The code-escrow inventory inherits this cadence by symmetry — mirror destinations change as platforms evolve (governance pivots, platform shutdowns, ToS changes), and credentials rotate per §5.9. The review confirms:

- Every mirror destination still has trustee-administrative-control attestation that names extant trustees (no broken attestations after trustee panel changes).
- Every wired secret's rotation date is within the rotation cadence for the credential class (drift indicates a missed rotation).
- Every restoration drill row is within the drill cadence (drift indicates a missed drill).
- Read-access verifications are not stale relative to the destination's last-change event.

Specific cadence (monthly, quarterly, etc.) belongs in operations policy, not in this README.

**Fallback cadence pre-operations-policy.** Until operations policy is authored, the framework defaults to: **quarterly** ≥2-trustee read-access re-verification; **annual** restoration drill; **on-rotation-event** mirror-push credential re-seal (per architecture §5.9); **post-platform-incident** review of the destination's trustee-administrative-control attestation. The fallback values are not architectural commitments — they are placeholders to prevent the framework from sitting unwatched while operations policy is unwritten.

## File index

- `mirror-destination-inventory.md` — the canonical list of mirror destinations, credential models, availability status, owning Story, trustee-administrative-control attestation, re-verification triggers.
- `code-escrow-ledger.md` — trustee event-record (framework-commit, mirror-destination ratification, secret-wiring, mirror-workflow run records, read-access verification, restoration drill, bus-factor switch-to-mirror, procedure revisions). **Sole source of truth for trustee-attested code-escrow events.**
- `mirror-procedure.md` — five-section runbook for the mirror operation (when the workflow fires; failure modes; rollback; verification checks; escalation).
- `restoration-procedure.md` — five-section runbook for both the planned restoration drill (AC-1 Restoration drill) and the under-bus-factor switch-to-mirror exercise (AC-2).
