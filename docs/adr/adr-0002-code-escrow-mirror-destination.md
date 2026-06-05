# ADR-0002: Code-escrow mirror destination — GitLab.com under trustee-owned foundation account + SSH deploy key credential model + branch protection enforced + annual rotation

> **Status:** ratified
> **Date:** 2026-06-05
> **Author:** Solo Builder (BigDev), transcribing trustee answers from `_bmad-output/implementation-artifacts/phase-0-trustee-questionnaire.md` Q3.1 + Q3.2 + Q3.3 + Q3.5 + Q3.6
> **Ratifying trustees:** Dhiraj Rahul (Trustee 1), Kalpana Bharti (Trustee 2)
> **Supersedes:** (none)
> **Superseded by:** (none)

## Context

Architecture §5.4 commits the **property** "Source-code host: GitHub primary; escrow mirror to trustee-controlled location per Step 2 §9.1.1" + AR-67 commits code-escrow with auto-mirror on every release-branch push. This ADR records the **control mechanism** Solo Builder + Trustee Panel selected: the specific destination platform, the credential model that wires the GitHub Actions workflow to the destination, the branch-protection posture at the mirror, and the credential rotation cadence. Per [[feedback_architecture_vs_adr_boundary]], architecture commits the property; ADR commits the controls.

Decision-driving conditions:

- **10-minute replication SLA** per Story 0.3 AC-1: wall-clock time from `pushed` event on GitHub to corresponding ref appearance at mirror. The destination must support API/git access reliably within this budget.
- **Geographic resilience** per Story 0.3 OQ #7: the mirror destination must be in a different region/cloud than the primary GitHub host + GCP `asia-south1` to survive regional incidents.
- **§2.10a-adjacent surface separation** per Story 0.3 Task 4: the mirror destination must NOT host any other trust data (no audit-mirror; no production data; no secrets). Mirror compromise must not transitively grant production access.
- **Trustee-administrative-control** per Story 0.3 §"Trustee-administrative-control attestation": the destination must support trustee admin (no sole-Solo-Builder admin) with ≥1 trustee admin minimum.
- **Branch protection capability** per Q3.5: the destination must support no-force-push enforcement, signed-commits requirement, and ≥1-trustee approval for write operations.
- **Rotation cadence integration** per architecture §5.9: the credential rotating to the mirror destination must align with the broader secret-rotation discipline.

Decision deadline: Story 0.3 Task 7 — `_AWAITING EXTERNAL ACTION_` gate for Tasks 8 (secret wiring), Task 9 (first push + read-access verification), Task 10 (restoration drill), Task 11 (bus-factor switch-to-mirror exercise). Resolved at 2026-06-05 Trustee Panel ratification per `.decision-log.md` Decision 2026-06-05-019 + Decision 2026-06-05-034.

## Decision

**The Trust mirrors the primary GitHub repository to a GitLab.com project under a trustee-owned foundation account, using an SSH deploy key as the GitHub Actions secret `MIRROR_PUSH_CREDENTIAL`, with branch protection enforced at GitLab and annual credential rotation.**

Specific commitments:

1. **Mirror destination** — `gitlab.com` under a foundation-billed trustee-owned account. Account ownership: a Trust-foundation account (not personal trustee account) with ≥1 trustee as project owner + ≥1 trustee as project maintainer. The hosting region per GitLab.com SaaS = us-east (default GitLab.com region; verify at account provisioning time). The hosting region is structurally independent of GCP `asia-south1` and of GitHub's multi-region hosting per the geographic-resilience property.
2. **Credential model** — SSH deploy key, push-only scope. Generation: Solo Builder generates an ED25519 key pair via `ssh-keygen` at provisioning time. The private key is stored as the GitHub Actions secret `MIRROR_PUSH_CREDENTIAL` and is escrowed under `docs/escrow/credential-inventory.md` per ADR-0001 + Story 0.2 framework (the mirror-push credential is `envelope_class = prod-credential` per Story 0.2 inventory row addition). The public key is registered at the GitLab project per `access-grant-procedure` analog with push-only authority on the mirror branches.
3. **Branch protection at mirror** — enforced per Q3.5 ratification with **deploy-key exemption** for the mirror-push principal. GitLab project settings: no force-push on `main` + `release/*` branches; signed-commits required; ≥1 trustee approval for any direct write to protected branches **EXCEPT** the configured mirror-push deploy key (which is whitelisted to perform `git push --mirror` force-push semantics). Rationale: `git push --mirror` is force-push-equivalent — it rewrites destination refs to match source. Without the deploy-key exemption, the workflow's automated push would be blocked on every run, defeating the AR-67 + AC-1 10-minute SLA. The exemption is operationally safe because (a) the deploy key is push-only scope to the specific repository (not read or admin); (b) the deploy key is escrowed under `docs/escrow/credential-inventory.md` per ADR-0001 with annual rotation; (c) compromise of the deploy key only enables history rewrite at the mirror (does not enable reads of other GitLab projects or production access). The auto-mirror workflow's push from GitHub Actions is the sole permitted automated write path. Manual writes by trustees go through the standard branch-protection-gated path (no force-push; signed-commits; ≥1 trustee approval) — these are out-of-band relative to the mirror workflow and represent emergency intervention scenarios (e.g., trustee-mandated history correction post-incident).
4. **`MIRROR_PUSH_CREDENTIAL` rotation cadence** — annual per Q3.6 ratification. Rotation event: Solo Builder generates a new SSH key pair; updates the GitLab deploy key registration with the new public key; updates the GitHub Actions secret with the new private key; logs the rotation event in `code-escrow-ledger.md` "Workflow-secret-wiring log" + `escrow-ledger.md` (Story 0.2 cross-coupling) per the per-credential rotation log. The annual cadence aligns with architecture §5.9 secret-rotation discipline.
5. **Release-branch set** per Q3.4 ratification — workflow currently mirrors `main` (placeholder); will be amended at Story 1.1 closure to `main` + `release/*` patterns once the branching model lands. The amendment is a supersession ADR-row-update (no new ADR required for the branch-list amendment alone unless the branching model changes substantively).
6. **Workflow-failure alerting** per Q3.7 — deferred to Epic 1 Story 1.16x CI governance. This ADR does NOT commit a paging integration at Story 0.3 closure; the residual risk is acknowledged: silent mirror-workflow failures are detectable only at the next read-access verification cadence (operations-policy committed; recommended quarterly).
7. **Host-key pinning** per Story 0.3 OQ #9 SSH TOFU resolution — the workflow YAML stores a `KNOWN_HOSTS` GitHub Actions secret containing GitLab.com's published SSH host-key fingerprint; the workflow runs with `StrictHostKeyChecking=yes`. This closes the trust-on-first-use exposure window between Task 8 secret-wiring and Task 7 ADR landing.

## Alternatives considered

- **Codeberg (community-run Gitea)** — Rejected because: (a) smaller infrastructure scale increases availability-incident risk vs GitLab.com SaaS; (b) community-funding model adds long-term-viability uncertainty for a Trust durability surface; (c) auth-model uses platform-native OAuth flows that are less mature for the GitHub-Actions-secret credential model. Reconsider if: GitLab.com pricing or policy changes substantively (e.g., removes free tier for non-OSS projects).
- **Self-hosted Gitea on trustee-controlled VPS (e.g., Hetzner)** — Rejected because: (a) introduces operational overhead — Gitea must be installed, patched, monitored by Solo Builder or backup engineer; this competes with the bus-factor-mitigation property the mirror is supposed to discharge; (b) host operations are themselves a single point of failure for the mirror (Gitea downtime = mirror unavailable); (c) operational cost (VPS + storage + ops time) exceeds GitLab.com SaaS over multi-year horizons. Reconsider if: Trust operational scale grows to where dedicated operations capacity is available + self-hosted control is desired for sovereignty reasons.
- **Bitbucket under foundation account** — Rejected because: (a) less common in the OSS community, so trustees + backup engineer may have less platform fluency at activation time; (b) Atlassian's pricing model and platform-policy direction have higher uncertainty for long-horizon Trust use; (c) no clear advantage over GitLab.com on the load-bearing properties (geographic resilience, branch-protection, deploy-key model, SaaS reliability). Reconsider if: GitLab.com policy or pricing direction changes adversely.
- **Dual-mirror (e.g., GitLab.com + Codeberg simultaneously)** — Deferred (not rejected). Hedges destination-platform risk at the cost of double secret-wiring + double workflow steps + per-destination branch-protection configuration. The added complexity at Phase-0 launch outweighs the platform-redundancy benefit at current scale. Reconsider if: GitLab.com experiences a sustained incident in the first 12 months of operation, OR if Trust regulatory posture shifts to require multi-jurisdictional code custody.
- **OAuth token credential model (vs SSH deploy key)** — Rejected because: (a) OAuth tokens at most platforms include broader scopes than `repo:write` push-only — the deploy key naturally constrains to push-only on the specific repository; (b) token rotation interface at GitLab.com is less predictable than deploy-key rotation (token-expiry policies have changed historically); (c) the deploy-key model is the GitHub-Actions-secret idiom for cross-platform git push and is the documented vendor recommendation. Reconsider if: GitLab.com deprecates SSH deploy keys.
- **Platform-native push-mirror feature (e.g., GitLab built-in mirror-from-GitHub)** — Rejected because: (a) GitLab's built-in mirror feature uses pull-from-primary semantics, which may not satisfy Story 0.3 AC-1 "push-to-mirror" requirement (the SLA measures from GitHub `pushed` event timestamp, which is unobservable from a pull-from-primary configuration); (b) the platform-native feature uses platform-managed credentials, which are outside the escrow framework's `MIRROR_PUSH_CREDENTIAL` discipline; (c) less control over retry/failure-handling semantics than the explicit workflow approach. Reconsider if: GitLab adds a push-from-GitHub built-in feature with the SLA semantics Story 0.3 needs.
- **Workload identity federation (WIF) analog** — Rejected because: WIF is uncommon at mirror destinations; most platforms (including GitLab.com) do not support GitHub Actions OIDC token exchange. Reconsider if: GitLab.com adds OIDC trust integration with GitHub Actions.
- **No branch protection at mirror (write-trusting-on-credential)** — Rejected because: a leaked `MIRROR_PUSH_CREDENTIAL` could rewrite mirror history, breaking the AR-67 mirror-integrity property. Branch protection provides a structural backstop against credential leak. The added Task 7 ADR complexity is acceptable for the protection value.
- **Quarterly rotation cadence (vs annual)** — Considered and de-prioritized: quarterly rotation increases operational burden (4× per year ratification + escrow updates + deploy-key re-registration) without proportional security gain; the deploy-key threat surface is bounded (push-only to a public-ish OSS mirror destination). Annual cadence matches architecture §5.9 baseline for non-high-sensitivity credentials. Reconsider if: post-launch incident analysis surfaces a credential-compromise pattern.

## Consequences

### Operational

- **Runbook obligation** — `docs/escrow/code-escrow/mirror-procedure.md` is the canonical operational runbook for the mirror workflow. Pre-ADR `[deferred ADR — placeholder procedure]` tags in §2 Step-by-step procedure are replaced with citations to this ADR at the same commit landing this ADR. The workflow YAML inline-comment header at `.github/workflows/code-escrow-mirror.yml` is similarly updated.
- **Account provisioning** — Solo Builder + Trustee Panel coordinate the GitLab.com foundation account creation: account name, trustee admin assignments (≥1 trustee owner + ≥1 trustee maintainer), project creation (private; matches GitHub primary repo name pattern), branch protection configuration **with deploy-key whitelist exemption per body item 3** (GitLab settings: Project → Settings → Repository → Protected branches → Allowed to force push → add deploy-key principal), SSH deploy key registration with push-only authority. The provisioning event is logged in `code-escrow-ledger.md` "Mirror destination ratification log".
- **Deploy-key exemption verification at provisioning** — after branch protection + deploy-key whitelist setup, the first workflow run (Task 9) MUST be observed for successful push to confirm the exemption is correctly applied. If the first push is rejected by branch protection (despite the whitelist), the provisioning event is incomplete; Solo Builder + ≥1 trustee re-verify GitLab settings before declaring Task 9 closure. Closes the Story 0.3 deferred-work item "§3.5 mirror-side branch-protection blocks `--mirror` semantics" + "§3.2 mirror destination ref-deletion blocked by mirror-side policy" per resolution at this ADR.
- **Annual rotation cadence** introduces a calendar obligation: each year on the rotation anniversary date (first rotation due 2027-06-05), Solo Builder + ≥1 trustee execute the rotation procedure. Calendar reminder per Trust operations cadence per `monthly-review-cadence-protocol.md` (Story 0.15) covers the trigger.
- **Restoration drill** per Story 0.3 Task 10 uses this mirror as the source. Drill executor (Solo Builder provisionally per Q3.8; backup engineer per Story 0.6 for full closure) clones from `gitlab.com/<trust-foundation>/<repo>.git`, verifies HEAD SHA, builds + deploys to a non-production target per `restoration-procedure.md`.

### Security

- **Threat-actor surface** per architecture §2.1 — adds GitLab.com as a vendor-trust dependency (SaaS provider with access to the mirror data). Mitigated by: (a) GitLab.com mirror carries source code only (no secrets, no PII, no audit data per Story 0.3 Task 4 surface separation); (b) branch protection prevents history rewrite even with credential compromise; (c) `MIRROR_PUSH_CREDENTIAL` is push-only scope, cannot read other GitLab projects.
- **Credential-leak failure mode** — a leaked `MIRROR_PUSH_CREDENTIAL` can push history to the mirror, but cannot rewrite protected branches (signed-commit + ≥1-trustee-approval gate). Incident response: rotate the credential per `secret-rotation.md` runbook + audit mirror history for unauthorized pushes.
- **Trust-on-first-use exposure** closed by the `KNOWN_HOSTS` secret + `StrictHostKeyChecking=yes` configuration per Story 0.3 OQ #9 + body item 7 above.
- **§2.10a invariant compliance** — mirror destination hosts ONLY source code; cannot transitively grant production access. Verified by: no GCP credentials at mirror; no audit-mirror data at mirror; no member PII in repo (enforced by FR-74 PII-scrape CI gate per Story 1.16b).

### Performance

- **10-minute SLA budget** — observed GitLab.com push latency from GitHub Actions runners (us-east-located) is typically <2 minutes per `git push --mirror` for repositories <500 MB. Budget is comfortable.
- **Workflow timeout** — `timeout-minutes: 8` per workflow YAML provides fast-failure within the SLA budget.

### Cost

- **GitLab.com SaaS** — Free tier for OSS projects + small foundations covers the Trust use case at Phase 0. Future cost (if Trust requires Premium tier features like advanced compliance reporting) ~$29/user/month per GitLab pricing; current need = $0/month.
- **No additional infrastructure cost** vs self-hosted alternatives.

### Failure modes accepted

- **GitLab.com outage** — during outage, mirror push fails; workflow records failure record per workflow YAML Step 4; next successful push catches up. Acceptable for an outage <24 hours; longer outages trigger the bus-factor switch-to-mirror exercise per AC-2 alternate-platform path (Codeberg fallback at supersession).
- **`MIRROR_PUSH_CREDENTIAL` compromise** — recovery via `secret-rotation.md` runbook + new key generation + GitLab deploy key re-registration. Incident-investigation surface: audit mirror history; verify no force-push or branch-protection bypass occurred; rotate downstream credentials if compromise context warrants.
- **GitLab.com policy change** — if GitLab.com changes its OSS / foundation pricing or its branch-protection capabilities, the supersession path activates (Codeberg or Bitbucket as alternatives).
- **Silent mirror-workflow failure** — Q3.7 deferred alerting to Epic 1 Story 1.16x. Until that wires, the residual risk is mitigated by: (a) per-quarter trustee read-access verification per `code-escrow-ledger.md` "Read-access verification log" + operations-policy; (b) Solo Builder ad-hoc workflow run inspection. The risk is non-zero but bounded by the quarterly verification frequency.

### Migration / pivot path

This ADR is reversible. Trigger conditions for migration to an alternative destination:

- **GitLab.com sustained outage** — incident >24 hours triggers Codeberg-fallback supersession ADR.
- **GitLab.com policy change adverse to Trust** (pricing, scope, branch-protection capability) — Trustee Panel evaluates alternatives; supersession ADR authors the new destination.
- **Trust scale exceeds GitLab.com SaaS capacity** (unlikely pre-launch; relevant post-Pariwar-multi-tenancy if mirror grows) — supersession ADR may select self-hosted Gitea + dedicated backup-engineer operations.
- **GitHub Actions deprecation of SSH deploy key model** — supersession ADR re-evaluates credential model (OAuth token, SaaS-platform-native credential).

Pivot procedure: author successor ADR; flip this ADR's `Status:` to `superseded` + add `Superseded by: ADR-NNNN-<successor>` link; provision the new destination per the supersession ADR + dual-write window (push to both old and new for 1-2 mirror cycles) + cutover + decommission old destination after ≥2-trustee read-access verification at new destination.

## References

- [Source: `_bmad-output/planning-artifacts/architecture.md`, §5.4] — source-code host property + escrow-mirror property
- [Source: `_bmad-output/planning-artifacts/architecture.md`, §5.9 secret rotation] — credential-rotation cadence discipline this ADR aligns with
- [Source: `_bmad-output/planning-artifacts/architecture.md`, §2.10a audit independence invariant] — surface separation discipline this ADR's "mirror MUST NOT carry" commitment derives from
- [Source: `_bmad-output/planning-artifacts/architecture.md`, §5.6/§5.10] — operations + paging integration deferral context for Q3.7
- [Source: `_bmad-output/planning-artifacts/prd.md`, §9.1.1] — code-escrow property commitment + AR-67
- [Source: `_bmad-output/implementation-artifacts/0-3-code-escrow-auto-mirror-pipeline-live.md`] — owning Story (Story 0.3 Tasks 7-11)
- [Source: `_bmad-output/implementation-artifacts/phase-0-trustee-questionnaire.md`, Q3.1 + Q3.2 + Q3.3 + Q3.4 + Q3.5 + Q3.6 + Q3.7] — trustee ratification answers
- [Source: `.decision-log.md`, Decision 2026-06-05-019] — Story 0.3 Tasks 7-11 ratification entry citing this ADR
- [Source: `.decision-log.md`, Decision 2026-06-05-034] — QC.3 ADR-authoring-now ratification authorizing this ADR
- [Source: `docs/escrow/code-escrow/README.md`, §"Surface separation"] — framework README this ADR's control implements
- [Source: `docs/escrow/code-escrow/mirror-procedure.md`] — operational runbook citing this ADR
- [Source: `docs/escrow/code-escrow/restoration-procedure.md`] — restoration runbook citing this ADR
- [Source: `.github/workflows/code-escrow-mirror.yml`] — workflow YAML citing this ADR (header comment)
- [Source: `docs/knowledge-transfer/adr-index.md`] — live ADR index row (to be updated to `ratified` at the commit landing this ADR)
- [Source: GitLab.com SSH host keys: https://docs.gitlab.com/user/gitlab_com/#ssh-host-keys-fingerprints] — host-key fingerprint for `KNOWN_HOSTS` secret
- Memory: [[feedback_architecture_vs_adr_boundary]] — property/control discipline
- Memory: [[feedback_architecture_vs_prd_boundary]] — boundary discipline
- Memory: [[feedback_closure_language_precision]] — closure-language convention

---

## Changelog

| Date | Status flip | Author | Notes |
|---|---|---|---|
| 2026-06-05 | (initial draft) | Solo Builder (BigDev) | Authored at Story 0.3 Task 7 + QC.3 ratification per Decisions 2026-06-05-019 + 2026-06-05-034. |
| 2026-06-05 | drafted → under-trustee-review | Solo Builder | Presented to Trustee Panel as Q3.1 + Q3.2 + Q3.3 + Q3.5 + Q3.6 of phase-0-trustee-questionnaire.md. |
| 2026-06-05 | under-trustee-review → ratified | Dhiraj Rahul + Kalpana Bharti | Ratified at trustee panel session 2026-06-05; logged in `.decision-log.md` Decision 2026-06-05-019 + 2026-06-05-034. |
| 2026-06-05b | ratified (amendment in place) | Solo Builder (BigDev) | Amendment to body item 3 + Consequences §Operational adding deploy-key branch-protection exemption per Story 0.3 deferred-work `§3.5 mirror-side branch-protection blocks --mirror semantics` + `§3.2 mirror destination ref-deletion blocked by mirror-side policy` resolution. Logged in `.decision-log.md` Decision 2026-06-05-037. No supersession event; amendment closes a substantive gap in the original ratification without changing the chosen control set (destination, credential model, branch protection, rotation cadence all unchanged). |
