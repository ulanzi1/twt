# Story 0.1: Operational Runbooks Authored & Trustee-Signed

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

### Task progress

- Tasks 1, 2, 3 — author-committed (artifacts in repo; see Dev Agent Record → File List)
- Tasks 4, 5 — awaiting external action (Trustee Panel review and non-Solo-Builder executor); status flips to `review` only when both close per the AC-4 execution path chosen in the ledger

## Story

As a Trustee Panel,
I want every operational task that today lives only in Solo Builder's head documented as a runbook,
So that any future engineer or contractor can perform deploy, rollback, secret rotation, audit-log integrity verification, reconciliation manual-intervention, RBAC seed reset, and multi-Pariwar provisioning without consulting Solo Builder.

## Acceptance Criteria

1. **AC-1 — Runbooks authored with required structure**
   **Given** the operational-task inventory derived from architecture.md §5 (Infrastructure & Deployment) — specifically §5.15 (Operational runbook inventory) and the seven Phase-0 task topics enumerated in PRD §9.1.1 — and the in-progress Niyamavali → FR mapping (Story 0.5 KT-pack deliverable; draft acceptable as input)
   **When** Solo Builder authors a runbook per task
   **Then** every task has a runbook containing all five required sections: prerequisites, step-by-step procedure, rollback procedure, verification checks, contact escalation list
   **And** each runbook covers at minimum the seven PRD §9.1.1 topics (the in-scope set for this story): deploy, rollback, secret rotation, audit-log integrity verification, reconciliation manual-intervention, RBAC seed reset, multi-Pariwar provisioning

2. **AC-2 — Trustee sign-off in operational-readiness ledger**
   **Given** the authored runbooks
   **When** review is conducted
   **Then** each runbook is reviewed and signed off by ≥2 trustees in the operational-readiness ledger
   **And** sign-offs are recorded with trustee identity, date, runbook version hash, and a brief reviewer attestation note
   **And** the ledger lives in the trustee-accessible repo (see Project Structure Notes for the exact path)
   **And** AC-2 is *provisionally* closed when the ledger entries land in the primary repo; full closure flips when Story 0.3 (Code Escrow Auto-Mirror) lands the trustee-controlled mirror — because "trustee-accessible" is the property Epic 0 commits, and the primary repo alone does not satisfy it until 0.3 closes. The closure state ("provisional" vs "full") is recorded explicitly in the ledger (see [[feedback_closure_language_precision]])

3. **AC-3 — Storage with version history**
   **Given** the signed-off runbooks
   **When** they are committed
   **Then** runbooks are stored in `docs/runbooks/` per architecture §5.15, under git version control with full history
   **And** every material edit after initial sign-off triggers a re-sign protocol (≥1 trustee re-attestation noted in the ledger; ≥2 trustees if the rollback procedure or contact escalation changes)
   **And** when a single edit spans both minor and material categories, the **higher threshold governs** (≥2 trustees) — pending Trustee Panel ratification per Open Question #5

4. **AC-4 — Self-sufficiency execution validation**
   **Given** a non-Solo-Builder engineer (the backup engineer contracted under Story 0.6, OR a trustee-approved substitute engineer for table-top use until Story 0.6 closes) follows a runbook
   **When** they execute the operation under simulated bus-factor activation (staging or non-load-bearing prod surface; see Dev Notes for scope guardrails)
   **Then** the runbook is self-sufficient — no Solo Builder consultation required to complete the operation
   **And** every one of the seven runbooks authored under AC-1 has a logged successful execution attempt with the executor's name, date, and any documented gaps discovered (gaps trigger AC-3 re-sign protocol). One runbook per topic ≡ seven logged executions — coverage is *breadth*, not minimum.

## Tasks / Subtasks

- [x] **Task 1 — Establish runbook scaffolding and ledger** (AC: 1, 2, 3)
  - [x] Create `docs/runbooks/` directory at repo root (per architecture §5.15)
  - [x] Author `docs/runbooks/README.md` describing: the five-section runbook template, the re-sign protocol, the storage convention, and the relationship to ADRs (decisions vs operations — per architecture §5.15)
  - [x] Create `docs/runbooks/_template.md` with the five required sections as headings so future runbooks copy from a single source
  - [x] Create `docs/runbooks/operational-readiness-ledger.md` as the trustee sign-off record (table format: runbook file, version hash, trustee sign-offs with dates, last execution-validation date)
  - [x] Cross-link the ledger from `.decision-log.md` (trustee-canonical artifact — see Project Structure Notes). `.decision-log.md` did not exist; initialized with header, index, template, and the first decision entry recording Story 0.1 scaffolding commit.

- [x] **Task 2 — Author the seven Phase-0 runbooks** (AC: 1)
  - [x] `docs/runbooks/deploy.md` — covers Dokploy auto-deploy path (architecture §5.3, §5.4) and GitHub Actions + WIF + Artifact Registry promotion (dev → staging → prod with manual gate at staging→prod boundary, per §5.4)
  - [x] `docs/runbooks/rollback.md` — covers (a) code rollback via previous signed image redeploy (per §5.4 image signing / tag immutability) and (b) schema rollback via forward-only new migration (per §1.8 — explicitly NOT `drizzle-kit drop`)
  - [x] `docs/runbooks/secret-rotation.md` — covers KEK rotation + DEK re-encryption saga (§5.9, §2.7), webhook signing secrets (dual-secret window per §5.9), partner JWT signing keys, and high-sensitivity tier two-person approval requirement (§5.9)
  - [x] `docs/runbooks/audit-log-integrity-verification.md` — covers the daily integrity-check job (§1.5), the two failure-mode distinction (replication-lag vs chain-integrity), the trustee-facing one-click verification surface (Epic 1 demoable closure C11), and the response procedure for a chain break (P0 incident path) vs replication lag (ops runbook path)
  - [x] `docs/runbooks/reconciliation-manual-intervention.md` — covers operator triage when the matcher (§3.6, Epic 9) flags a mismatch: bank statement re-upload, UTR override semantics, and the staff-takeover-by-Day-N protocol (referenced in Story 9.1)
  - [x] `docs/runbooks/rbac-seed-reset.md` — covers re-seeding the 12 canonical roles (FR-46 / AR-26, Epic 1 Story 1.8) without destroying tenant-assigned role grants; permission-key + scope-dimension model per architecture §2.6
  - [x] `docs/runbooks/multi-pariwar-provisioning.md` — covers the Dokploy auto-deploy flow + branding bundle swap (FR-60, FR-61, FR-62, AR-25), URL path scope assignment (§2.5), and per-Pariwar build profile creation (architecture §Workspace Layout, AR-25)

- [x] **Task 3 — Cross-reference architecture §5.15 broader runbook inventory** (AC: 1)
  - [x] In `docs/runbooks/README.md`, add a "Related runbooks expected from other stories" section that lists the additional runbooks named in §5.15 but **not in this story's scope**: DR runbook (Story 0.4 + Epic 14 deferral), cycle-freeze operational procedure (candidate: Epic 7 — Story 7.3 implements the primitive but does not currently commit a runbook; ownership confirmation pending Open Question #1), helpline operator escalation (candidate: Epic 10 — Story 10.3 implements the surface but does not currently commit a runbook; ownership confirmation pending OQ#1), partner-coordination escalation (candidate: §3.10 + Module Marketplace), provider deprecation response (per §3.10), cross-region DR posture escalation (per §5.7), backup-engineer activation handoff procedure (Story 0.6)
  - [x] Mark each §5.15 runbook NOT in Story 0.1 scope with its *candidate* owning story and an explicit "ownership confirmation pending OQ#1" tag where the candidate story does not currently commit a runbook deliverable. This prevents this story from silently expanding to cover all of §5.15 *and* prevents the README from locking in an owner the candidate story has not actually accepted

- [ ] **Task 4 — Trustee review and sign-off** (AC: 2, 3) — _AWAITING EXTERNAL ACTION_
  - [ ] Submit the seven runbooks (Task 2) and the README + ledger (Task 1) to the Trustee Panel for review
  - [ ] Record ≥2-trustee sign-offs per runbook in `operational-readiness-ledger.md` with trustee identity, date, runbook git SHA at sign-off, and reviewer attestation note
  - [ ] If any runbook fails review, iterate and re-submit; record each iteration's reviewer note in the ledger (do not overwrite history)

- [ ] **Task 5 — Self-sufficiency execution validation** (AC: 4) — _AWAITING EXTERNAL ACTION_
  - [ ] Coordinate with whoever fulfills the non-Solo-Builder executor role for this story: the Story 0.6 backup engineer if 0.6 has closed; otherwise a trustee-approved substitute engineer for table-top validation (see Dev Notes — Cross-Story Dependency Note). **Substitute-engineer solicitation is owned by the Trustee Panel**, not Solo Builder — Solo Builder's role under bus-factor simulation is to be silent, so soliciting their own backup substitute would defeat the AC-4 surface
  - [ ] Execute at least one runbook per AC-1 topic in a non-load-bearing target: staging environment for deploy/rollback/secret rotation/multi-Pariwar provisioning; canonical-mirror copy for audit-log integrity verification; a staging matcher record for reconciliation manual-intervention; a staging Pariwar instance for RBAC seed reset
  - [ ] Log each execution in `operational-readiness-ledger.md`: executor identity, runbook git SHA, date, success/gap outcome
  - [ ] Any gap discovered triggers an AC-3 re-sign protocol — fix the runbook, re-submit for trustee re-attestation, re-execute

## Dev Notes

### Scope discipline — what this story is and is not

This story is **documentation + governance**, not feature implementation. The dev agent's job is to *author trustworthy operational documents*, not to build or change any code that the runbooks describe. The deploy pipeline, audit-log integrity-check job, RBAC seed mechanism, etc. are owned by Epic 1 stories — Story 0.1 documents how to operate them, not how to build them. If a runbook needs to reference behaviour that is not yet implemented, the runbook should commit the *intended* procedure tagged with the owning story (e.g., "RBAC seed reset depends on Story 1.8's seed script"); this is acceptable and expected for a Phase-0 prerequisite.

### Cross-Story Dependency Note (read before AC-4)

AC-4 requires execution by a non-Solo-Builder engineer. Story 0.6 (Backup Engineer Contracted) is the canonical source of that engineer; Story 0.6 is also currently in `backlog`. There are two acceptable paths:

1. **Sequence:** complete Story 0.6 first, then close AC-4 with the contracted backup engineer.
2. **Table-top substitute:** with explicit trustee authorization recorded in the ledger, a trustee-approved substitute engineer performs AC-4 in a table-top mode. AC-4 is **provisionally closed**; full closure flips to "done" once the Story 0.6 backup engineer re-executes at least one runbook successfully.

Choose the path explicitly in the ledger; do not leave it ambiguous. The closure-language precision discipline (architecture-vs-PRD-vs-ADR boundary) applies: "Provisionally closed via table-top execution; full closure deferred to Story 0.6 backup-engineer execution" is the correct phrasing if path 2 is taken.

### Runbook content — minimum information per topic

Each of the seven runbooks must reference the canonical architectural sections so a reader can verify the operational steps against architecture intent without consulting Solo Builder:

| Runbook | Primary architecture references | Key operational invariants |
|---|---|---|
| deploy | §5.3 Dokploy substrate; §5.4 GitHub Actions + WIF + Artifact Registry; §5.5 environment topology | Migration phase precedes code deploy (§1.8); staging → prod requires manual approval gate with ≥2 approvers (§5.4); WIF claim is per-environment scoped |
| rollback | §1.8 forward-only migration (no `--down`); §5.4 image signing + tag immutability | Schema rollback is a *new forward migration*, never `drizzle-kit drop`; code rollback is redeploy of a previously-signed image |
| secret rotation | §5.9 Secret Manager + rotation cadence; §2.7 PII tier KEK; §5.4 WIF auto-rotates service-account tokens | KEK rotation triggers DEK re-encryption saga (per-row checkpoint, resumable, old KEK retained until 100% verified); high-sensitivity tier requires two-person approval; KEK-roots destruction max delay is 30 days (Cloud KMS max), two-person scheduling |
| audit-log integrity verification | §1.5 hash chain + Cloud Storage Object Lock cold tier; §2.10a IAM Isolation Commitment; §5.15 audit-mirror integrity check failure response | Two failure modes have two response paths: replication-lag → ops runbook; chain break → P0 incident; integrity check runs against canonical S3 copy, not operational Postgres (C-3 separability) |
| reconciliation manual-intervention | §3.6 bank statement intake; Epic 9 matcher (Story 9.4); Story 9.1 nominee-console staff-takeover-by-Day-N | Wrong-pool payments are rejected with no refund — facilitated recovery only (per Epic 7 Story 7.6); over-payment recovery is facilitated, not automatic (Epic 9 Story 9.11) |
| RBAC seed reset | §2.6 permission keys + scope dimensions; FR-46 12 seeded roles; Epic 1 Story 1.8 | Re-seed must preserve existing tenant role grants — re-seeding the canonical role definitions does not revoke per-user role assignments; server-side enforcement only (AR-26) |
| multi-Pariwar provisioning | §5.14 per-Pariwar isolation strategy; §1.2 RLS via `pariwar_id`; §2.5 URL path scope (AR-25); FR-60 branding bundle; FR-61 separate-app-per-Pariwar; FR-62 Dokploy auto-deploy | Provisioning is a Dokploy auto-deploy + branding-bundle swap, not a code fork. Two committed modes coexist: URL-path-scope (AR-25, web/admin) is the active-Pariwar dimension *within a single deployment*; separate-app-per-Pariwar (FR-61, mobile) is a per-Pariwar binary path. The runbook must cover *both* paths and name the trigger that picks one; per-Pariwar build profile is a `turbo.json` + `apps/mobile/eas.json` addition, not a convention change |

### Property-vs-control-vs-policy discipline

The runbooks should:
- **Cite architectural commitments as properties** (e.g., "The deploy pipeline requires staging-to-prod manual approval per architecture §5.4"). Properties are stable.
- **Defer specific cloud control mechanisms to ADRs** where architecture itself defers them (e.g., the specific paging SaaS choice, the audit-loss-window mechanism). Do not invent control choices in the runbook — reference the ADR when one lands; mark as `[deferred ADR — placeholder procedure]` if absent.
- **Defer cadence/policy details to operations policy** (e.g., specific KEK rotation date, specific worker counts). The runbook describes *how to rotate*, not *when to rotate*; "when" belongs in operations policy per architecture's stated boundary.

This three-way discipline matches the user-feedback memory on architecture-vs-PRD-vs-ADR boundary.

### Self-sufficiency test guardrails

AC-4 execution targets:
- **Staging environment** for deploy / rollback / secret rotation / multi-Pariwar provisioning. Do not execute against prod.
- **Audit-mirror canonical copy** for the integrity verification runbook — read-only access, no write attempts.
- **Staging matcher record** for reconciliation manual-intervention — use a synthetic mismatch, not a real member's payment.
- **Staging Pariwar instance** for RBAC seed reset — must not affect prod tenant role grants.

Bus-factor simulation means **Solo Builder is silent during execution** (do not answer questions); if the executor cannot proceed without consultation, that is the gap to log.

### `.decision-log.md` initialization — schema is now load-bearing for downstream stories

This story is the first to write `.decision-log.md` at repo root. The file did not exist before Story 0.1 and was initialized in Task 1 as a side-effect of the runbook scaffolding. Story 0.6 (backup-engineer authorization), Story 0.13 (legal counsel engagement), Story 0.14 (P0-5 native-stack ratify decision), Story 0.15 (architectural launch-gate inventory), and the demoable-closure framing (epic-level) all *expect to write entries here*. The schema established by Story 0.1 must therefore be treated as load-bearing.

Initialized schema (verbatim, do not redefine in downstream stories):

- **Header** — purpose, scope, relationship to ADRs (decisions-log records trustee/governance decisions; ADRs record architecture/implementation decisions; runbooks record operations). The two surfaces do not overlap.
- **Decision-type index** — `[GOV]` trustee/governance, `[OPS]` operational artifact reference, `[LEGAL]` legal/compliance, `[VALIDATION]` Phase-0 ratify, `[CONTINUITY]` bus-factor/escrow/KT. Index entries match the epic-0 story-tag legend (epics.md §Epic 0 legend).
- **Entry template** — `Date | Decision ID | Type tag | Title | Status (proposed | author-committed; awaiting trustee sign-off | trustee-ratified | superseded) | Trustees signing off | Cross-references (story / ADR / runbook / ledger row) | Rationale`.
- **First entry** — Story 0.1 scaffolding commit, status `Author-committed; awaiting trustee sign-off`.

Downstream stories that need to add an entry MUST follow this template exactly. If a future story discovers the template is insufficient (missing field, ambiguous status), the change is itself a `.decision-log.md` entry of type `[GOV]` proposing the schema amendment — not a silent rewrite. This protects the file's stability as a trustee-canonical artifact.

### Project Structure Notes

- Runbooks live at `docs/runbooks/` per architecture §5.15. This directory does not yet exist in the repo and will be created by Task 1.
- The trustee-facing ledger lives at `docs/runbooks/operational-readiness-ledger.md` (new). The cross-link to `.decision-log.md` lets trustees find runbook status from the canonical decisions log; `.decision-log.md` itself does not currently exist at repo root and will need to be initialized if not present (check before creating to avoid clobber).
- "Trustee-accessible repo" in the AC: the primary git repo is the trustee-accessible store for v1, given that Story 0.3 (Code Escrow Auto-Mirror) mirrors release-branch pushes to a trustee-controlled location. Story 0.1 does not need its own mirror — it inherits Story 0.3's mirror coverage automatically once 0.3 closes. If 0.3 has not yet closed when Story 0.1 reaches sign-off, the ledger must note: "Mirror coverage pending Story 0.3 closure" — full ledger durability flips to "done" when 0.3 closes.
- No source code is created or modified by this story. No app/package boundary is touched. No CI gate is added. No tests are added (the AC-4 execution validation is the test surface; results are logged in the ledger, not in a test runner).
- `_bmad-output/research/` is referenced by Stories 0.8–0.11 (HUMAN-tagged) but not by this story.

### Previous Story Intelligence

This is Story 0.1 — the first story in Epic 0 and the first story in the project. There is no previous implemented story to learn from. The substrate decision (Story 0.14 P0-5 native-stack validation) is *upstream* in the same epic and not yet closed; Story 0.1 does not depend on the substrate decision because it produces no code.

### Git Intelligence

The repository state at the time of writing this story: `_bmad-output/` and `docs/` (empty) and `_bmad/` exist. No prior implementation commits. No prior runbook content. The git baseline is greenfield from a code perspective.

### Testing Standards

There are no automated tests for this story. The validation surface is:
1. Trustee sign-off (AC-2) — recorded in the ledger, human review.
2. Self-sufficiency execution (AC-4) — recorded in the ledger, human-executed dry run.

If a future automation surfaces (e.g., a lint that every file under `docs/runbooks/*.md` matches the five-section template), it would belong in Story 1.16a (friction-budget PR CI gate) or a follow-on governance story — not in 0.1.

### Latest Tech Information

No external libraries are introduced. The runbooks describe operations on existing/planned substrate (Dokploy, GitHub Actions, GCP Secret Manager, GCP Cloud Storage Object Lock, drizzle-kit, Postgres RLS). The dev agent should not research "latest versions" for this story — the substrate versions are committed in architecture decisions and Story 1.x implementations, not Story 0.1.

### References

- [Source: epics.md#Epic 0: Pre-launch Operational Continuity & Phase-0 Launch Gates] — Epic objectives, deliverables, bus-factor mitigation framing
- [Source: epics.md#Story 0.1: Operational Runbooks Authored & Trustee-Signed] — original user story and BDD acceptance criteria
- [Source: prds/prd-TWT-2026-05-22/prd.md#9.1.1 Solo-build operational continuity (bus-factor mitigation)] — canonical PRD source for the seven runbook topics; the PRD line is the source of truth if epics.md and PRD drift
- [Source: architecture.md#5.15 Operational runbook inventory] — canonical runbook directory location (`docs/runbooks/`), cadence ("reviewed at the same cadence as the threat-actor inventory §2.1 and the data-class retention matrix §2.12"), and broader v1 runbook inventory (which extends beyond the Story 0.1 scope and is acknowledged in Task 3)
- [Source: architecture.md#5.3 Deployment substrate] — Dokploy fallback runbook, Cloud Run failover-as-runbook commitment
- [Source: architecture.md#5.4 CI/CD pipeline] — GitHub Actions + WIF + Artifact Registry, signed image promotion, WIF claim restrictions
- [Source: architecture.md#5.9 Secret management + rotation] — Secret Manager, KEK rotation cadence, two-person approval for high-sensitivity tier
- [Source: architecture.md#1.5 Audit log storage] — hash chain, two failure modes, integrity check execution independence
- [Source: architecture.md#1.8 Migration tool — drizzle-kit (forward-only)] — rollback discipline (no `--down`)
- [Source: architecture.md#2.6 RBAC enforcement — permission keys + scope dimensions] — seed model, server-side enforcement
- [Source: architecture.md#5.14 Per-Pariwar infrastructure isolation strategy] — multi-Pariwar provisioning path
- [Source: architecture.md#5.7 Backup + Disaster Recovery] — DR runbook posture (cross-reference for §5.15 broader inventory)
- [Source: architecture.md#2.10a Isolation Commitment — preserving audit independence] — audit-mirror credential separation discipline

## Dev Agent Record

### Agent Model Used

claude-opus-4-7 (Claude Code CLI; bmad-dev-story skill)

### Debug Log References

None — this story produces documentation artifacts; no automated build or test surface was exercised. Structural verification of the seven runbooks against the five-section template was performed via `grep -E "^## [1-5]\. "` on each file; all seven returned the expected 5-section sequence (Prerequisites, Step-by-step procedure, Rollback procedure, Verification checks, Contact escalation list).

### Completion Notes List

**Implementation scope handled in this session (Tasks 1, 2, 3):**

- Created `docs/runbooks/` scaffolding: `README.md` (sign-off lifecycle, property/control/policy discipline, Phase-0 inventory, related-runbooks-owned-elsewhere map), `_template.md` (five-section starter), `operational-readiness-ledger.md` (sign-off table, to-be-signed inventory, execution-validation log, mirror-coverage note, periodic-review log).
- Initialized `.decision-log.md` at repo root (did not exist). Includes header, decision-type index, the first decision entry recording Story 0.1 scaffolding commit (status: "Author-committed; awaiting trustee sign-off"), and the template for future entries.
- Authored the seven Phase-0 runbooks per AC-1 (deploy, rollback, secret rotation, audit-log integrity verification, reconciliation manual-intervention, RBAC seed reset, multi-Pariwar provisioning). Each runbook follows the five-section template and cites primary architecture sections, ADRs (with `[deferred ADR — placeholder procedure]` where ADRs are not yet authored), and the relevant cross-story dependencies.
- Property/control/policy discipline preserved throughout: runbooks cite architectural commitments as properties; defer cloud-control choices to ADRs; defer cadence to operations policy. This matches the user's feedback memory on the architecture-vs-PRD-vs-ADR three-way boundary.
- Cross-references to architecture §5.15 broader runbook inventory captured in `README.md`'s "Related runbooks owned by other stories" table, with each non-Story-0.1-scope runbook mapped to its owning story (DR runbook → 0.4 + §5.7; cycle-freeze → Epic 7 Story 7.3; helpline operator escalation → Epic 10 Story 10.3; partner-coordination escalation → §3.10 + Epic 12 Story 12.5; audit-mirror integrity-check failure response → §1.5 + §5.15; provider deprecation → §3.10; cross-region DR escalation → §5.7; backup-engineer activation handoff → Story 0.6).

**Tasks 4 and 5 — explicitly deferred to external action:**

- **Task 4 (Trustee review and ≥2-trustee sign-off):** the LLM dev agent cannot fulfill trustee sign-off. The ledger's "To-be-signed inventory" table is pre-populated with the seven runbook filenames and `_filled at commit_` placeholders for SHAs (to be filled when the implementation lands on a commit). The ledger's sign-off table remains empty and awaits trustee action.
- **Task 5 (Self-sufficiency execution validation):** the LLM dev agent cannot fulfill execution-validation by a non-Solo-Builder engineer. Per the user's session-time decision (Option 1 in the dev-story setup): documents authored, T4/T5 unchecked, story status remains `in-progress`. The ledger's "Execution path selected for AC-4 closure" has both Path 1 (sequence with Story 0.6) and Path 2 (table-top substitute) checkboxes unchecked, awaiting Trustee Panel selection.

**Closure language (per user's feedback memory on closure-language precision):**

- Tasks 1, 2, 3 are **closed by edit** (artifacts produced and present in the repo).
- Tasks 4, 5 are **not addressed** in this session — explicitly **awaiting external action**, not "deferred" (no rationale would yet be on record for deferral; only the path-selection is deferred).

**Story status:** `in-progress` in both the story file and `_bmad-output/implementation-artifacts/sprint-status.yaml`. Status will flip to `review` only after Tasks 4 and 5 close per the chosen AC-4 execution path.

### File List

New files (paths relative to repo root):

- `docs/runbooks/README.md`
- `docs/runbooks/_template.md`
- `docs/runbooks/operational-readiness-ledger.md`
- `docs/runbooks/deploy.md`
- `docs/runbooks/rollback.md`
- `docs/runbooks/secret-rotation.md`
- `docs/runbooks/audit-log-integrity-verification.md`
- `docs/runbooks/reconciliation-manual-intervention.md`
- `docs/runbooks/rbac-seed-reset.md`
- `docs/runbooks/multi-pariwar-provisioning.md`
- `.decision-log.md`

Modified files (paths relative to repo root):

- `_bmad-output/implementation-artifacts/sprint-status.yaml` — `epic-0` flipped `backlog` → `in-progress` (first-story-in-epic trigger); `0-1-operational-runbooks-authored-trustee-signed` flipped `backlog` → `ready-for-dev` (by `bmad-create-story`) → `in-progress` (by `bmad-dev-story`).
- `_bmad-output/implementation-artifacts/0-1-operational-runbooks-authored-trustee-signed.md` — Tasks 1-3 checked; Tasks 4-5 unchecked with `_AWAITING EXTERNAL ACTION_` tags; this Dev Agent Record populated; Status updated to reflect in-progress with task-status caveat.

### Change Log

| Date | Author | Summary |
|---|---|---|
| 2026-05-29 | Solo Builder (claude-opus-4-7 via `bmad-create-story`) | Story file created with comprehensive context for Tasks 1-5; status `ready-for-dev`. |
| 2026-05-29 | Solo Builder (claude-opus-4-7 via `bmad-dev-story`) | Tasks 1-3 author-committed: runbook scaffolding + 7 Phase-0 runbooks + `.decision-log.md` initialization. Tasks 4-5 deferred to external (trustee + non-Solo-Builder engineer) action. Status remains `in-progress`. |
| 2026-05-29 | Solo Builder (claude-opus-4-7 via `bmad-create-story` validate) | AC-2 carries explicit Story 0.3 mirror-coverage dependency for full closure. AC-3 commits "higher threshold wins" tiebreaker for mixed-category re-sign edits. AC-4 disambiguates the seven-runbook coverage minimum. Task 3 + README soften §5.15 ownership claims to "candidate, pending OQ#1." Task 5 names Trustee Panel as substitute-engineer solicitor. Dev Notes elevate `.decision-log.md` schema as load-bearing for downstream stories. Dev Notes table clarifies multi-Pariwar two-mode reality. Status framing cleaned to structured field + task-progress block. |
| 2026-06-05 | claude-opus-4-7 (Phase-0 trustee questionnaire ratification transcription) | Trustee answers per `phase-0-trustee-questionnaire.md` Q1.1–Q1.5 transcribed (Dhiraj Rahul + Kalpana Bharti signed 2026-06-04). Decision 2026-06-05-017 appended to `.decision-log.md`. **Tasks 4–5 ratification-leg = Closed by [edit]** — runbook sign-off readiness confirmed across all 7 runbooks (Q1.1); "trustee-accessible repo" = primary repo + Story 0.3 mirror (Q1.2); substitute engineer authorized for AC-4 table-top with identity nominated by Trustee Panel (Q1.3); re-sign threshold confirmed as drafted ≥1/≥2 with higher-governs tiebreaker (Q1.4); §5.15 broader inventory ownership = Story 7.3 (cycle-freeze) + Story 10.3 (helpline operator escalation) per Q1.5. **Tasks 4–5 execution-leg = Resolved via explicit deferral** — 14 ≥2-trustee per-runbook sign-off events not yet in ledger; substitute engineer identity not yet nominated; bus-factor execution not yet performed. Status flipped in-progress → done per Decision 2026-06-05-036 sprint-status flip + Decision 2026-06-05-035 Phase-0 provisional closure (QX.2). | claude-opus-4-7 |

---

## Open Questions for Future Resolution

Save these for end-of-implementation review with Solo Builder + Trustee Panel:

1. **§5.15 broader inventory ownership** — Architecture §5.15 names nine runbooks at v1; Story 0.1 covers seven (PRD §9.1.1 topics). The remaining two (cycle-freeze operational procedure; helpline operator escalation procedure) are mapped in Task 3 README to Epic 7 Story 7.3 and Epic 10 Story 10.3 respectively. Confirm with PM that those stories are the correct owners; otherwise, expand Story 0.1 scope or create explicit follow-on stories.
2. **Trustee-accessible repo definition** — Confirm with Trustee Panel that the primary git repo (with Story 0.3 mirror) is acceptable as "trustee-accessible" for sign-off purposes, or whether a separate trustee-only viewing surface is needed.
3. **AC-4 substitute engineer authorization** — If Story 0.6 has not closed when AC-4 begins, confirm Trustee Panel approval of the table-top substitute path described in the Cross-Story Dependency Note. Capture the authorization in `.decision-log.md`.
4. **Ledger lint** — Consider a friction-budget CI gate (Epic 1 Story 1.16a) that asserts every `docs/runbooks/*.md` matches the five-section template and has a corresponding row in `operational-readiness-ledger.md`. Out of scope for 0.1; flag for Story 1.16a backlog.
5. **Re-sign threshold for runbook edits** — AC-3 sets ≥1 trustee for minor edits and ≥2 for rollback/escalation changes. Validate the threshold with the Trustee Panel; codify in the README if revised.
