# Degradation Policy Framework

**Status:** Author-committed 2026-05-29 by Solo Builder (BigDev) per Story 0.4; awaiting ≥2-trustee sign-off (Story 0.4 Task 7), first table-top exercise execution (Task 8), and Story 0.13 legal-counsel return for comms-template ratification (Task 9).

**Authority:** architecture.md Cross-Cutting #20 ("Solo-build operational continuity — … degradation policy") + Cross-Cutting #9 ("Staff-fallback at every node") + §3.4 (three-tier channel hierarchy) + §5.7 (DR runbook posture) + §5.10 (Solo Builder on-call + backup engineer A-13) + §5.15 (operational runbook inventory). PRD §9.1.1 paragraph 4 ("Degradation policy — if the Solo Builder is unavailable for > 7 days, what does the trust do? Documented per surface … Communications template prepared"). AR-67. Epics §Epic 0 Story 0.4 (`per-surface-degradation-policy-authored`, `[CONTINUITY]`).

**Never silently flip a PENDING LEGAL REVIEW marker on any comms template.** The marker is load-bearing — it carries the structural commitment that the template content remains provisional until Story 0.13 returns a counsel ratification logged in `degradation-policy-ledger.md` "Legal-counsel revision log". A silent unflipping is a framework violation that defeats AR-67's legal-readiness posture.

---

## 1. Why `docs/degradation-policy/` is a new top-level surface (not nested under `docs/runbooks/`)

This directory sits alongside `docs/escrow/`, `docs/runbooks/`, and `docs/adr/` (the latter pending scaffold per Story 0.3 Decision 2026-05-29-003 Open Follow-up #6).

- The framework is broader than a single runbook — it includes the per-surface inventory, five channel-specific comms templates, a ledger, and a table-top-exercise runbook. Nesting under `docs/runbooks/` would compress the framework into a single-runbook framing that misrepresents the four-artifact shape.
- Architecture §5.15 enumerates DR runbook + cycle-freeze + reconciliation triage + helpline operator escalation + partner-coordination + audit-mirror integrity + cross-region DR + backup-engineer activation handoff as the runbook inventory — the degradation policy is structurally distinct from any single named runbook.
- The Story 0.2 + 0.3 precedent established framework-as-top-level-surface (`docs/escrow/`, `docs/escrow/code-escrow/`); Story 0.4's choice extends that pattern.

The choice is recorded in `.decision-log.md` Decision 2026-05-29-004 body item (1) so a future reviewer can find the rationale without consulting this README.

## 2. Framework lifecycle

A surface (per `surface-inventory.md`) and a comms template (per `comms-templates/<channel>.md`) each move through the following lifecycle states:

```
drafted
    ↓ (Story 0.4 Task 7 — ≥2-trustee sign-off; per-bundle OR per-surface)
reviewed-pending-legal-counsel
    ↓ (Story 0.13 — comms templates only; per template; counsel return logged in degradation-policy-ledger)
trustee-signed-off          ←→         legal-counsel-returned
                  ↓ (joint condition — both states reached for templates; trustee-only for inventory rows)
              fully-ratified

> **Note on ←→:** the bidirectional arrow indicates these are **co-required, parallel predecessors** for `fully-ratified` on comms templates — they may be reached in any order (trustee sign-off first OR counsel return first; no sequencing requirement). Both must be present before `fully-ratified`. For surface-inventory rows (which do not have a `legal-counsel-returned` state), `trustee-signed-off` flows directly to `fully-ratified`.
                  ↓ (Story 0.4 Task 8 — first table-top execution; gap list discharged; re-execution surfaces "no new gaps")
       table-top-exercised
                  ↓ (post-Story-0.5 + Story-0.6 closure + Story-0.13 returns + ≥6 months without remediation-triggering live incident)
              live
```

States are recorded per row in `surface-inventory.md` and per file in `comms-templates/`; transitions are recorded in `degradation-policy-ledger.md`.

**Forbidden transitions** (the framework prevents these structurally):

- Any state → `legal-counsel-returned` without a `degradation-policy-ledger.md` "Legal-counsel revision log" row citing the Story 0.13 counsel reviewer + the trustee co-sign + the supersession-schema marker.
- Any state → `fully-ratified` on a comms template without both `trustee-signed-off` AND `legal-counsel-returned` predecessors.
- Any state → `table-top-exercised` without at least one `degradation-policy-ledger.md` "Table-top exercise log" row recording the contributing execution.
- `live` is conditional on operations policy authoring; until operations policy lands, the highest accessible state is `table-top-exercised`.

**Allowed via mechanism-revision** (per the supersession schema inherited from Story 0.3): wired/verified/restoration-drilled/etc. → `superseded`, when the superseding row has been authored. Removal of rows is FORBIDDEN; supersession is the only allowed lifecycle exit.

## 3. Property / Control / Policy / Gap-analysis discipline

The framework applies a four-way split per [[feedback_architecture_vs_adr_boundary]] + [[feedback_architecture_vs_prd_boundary]] + [[feedback_gap_analysis_observational]]:

| Layer | What it commits | Where it lives in this framework |
|---|---|---|
| **Property** (architecture-equivalent) | Per-surface stance exists; classified across `live | gracefully-suspended | degraded-mode`; comms template exists per surface-degradation event; PENDING LEGAL REVIEW marker preserved; structural invariants per §4 below | This README §4; `surface-inventory.md` schema; AC text of Story 0.4 |
| **Policy** (PRD-equivalent) | What the trust does under degraded posture (member signups continue; claim processing continues; reconciliation runs; feature changes pause); per-surface degradation stance copy; comms-template body content | `surface-inventory.md` rows + `comms-templates/*.md` files |
| **Control** (ADR territory) | Specific paging integration when degraded posture activates; specific DLT-template registration per SMS comms template; specific Meta UTILITY template approval per WA comms template; specific operations-policy re-attestation cadence | §6 "Open ADR slots" below; cross-references to `docs/adr/` once that directory exists per Story 0.3 Decision 003 Open Follow-up #6 |
| **Gap analysis** (observational) | Inventory observes which surfaces lack a documented stance; comms-template authoring observes which channels lack a template; table-top exercise observes which decision points lack an unambiguous artifact answer | `degradation-policy-ledger.md` "Table-top exercise log" gap-list rows + the README's Open ADR slots |

The Story 0.2 + 0.3 escrow frameworks follow the three-way property/control/policy discipline; Story 0.4 extends to the **four-way** discipline by adding the observational gap-analysis layer per [[feedback_gap_analysis_observational]]. The gap-analysis layer does NOT prescribe sprint planning or override architecture — it observes incompleteness/risk and proposes conditional escalation paths.

## 4. Structural invariants — what the degradation policy MUST NOT violate

These invariants are load-bearing. A future revision that weakens any of them is a framework violation that requires a `.decision-log.md` `[GOV]` entry proposing the amendment — not a silent rewrite.

1. **No punitive auto-action** per UX Stance #5 — degraded posture does NOT introduce a "respond in N hours or be suspended" timer on any surface. Time-as-actor (SIE) is permitted only for non-punitive state transitions per the same Stance.

2. **No loop node ships without a named, funded, on-rota fallback handler** per UX Stance #6 — every `surface-inventory.md` row's `fallback_handler` column MUST cite a Story 0.7 (P0-1 fallback-handler ledger) entry once that Story closes. Pre-Story-0.7-closure, the column carries the placeholder `P0-1-pending` and the row is `drafted` status.

3. **No bulk-alert SMS** per PRD addendum RA-29 — the `comms-templates/sms-channel.md` template fires ONLY via the per-member transactional fallback (when both WA gates ACTIVE + WA delivery undelivered after retry per architecture §3.4) OR via the Pariwar-degraded-mode cycle-open SMS bridge (when per-Pariwar push delivery rate falls below threshold AND WA admin-toggle is OFF per §3.4). A fifth SMS fire-condition (bulk-alert) is not authorable under this framework.

4. **No module-promotion under frozen states** per UX Stance #1 ("Module Shelf grief-context exclusion") — comms templates exclude module-promotion language. The Account State Machine's frozen states (`claim-filed-frozen`, `disbursed-frozen-readable`, `disabled-T+90`, `public-record-∞`) structurally suppress the Module Shelf per architecture §1.7 + §3.4; the degradation comms must not undo that suppression by mentioning module shelves.

5. **No PII / member-state in the public-page banner** per architecture §5.8a "Cache-safe public SSR guarantee" — `comms-templates/public-page-banner.md` content is bounded to public material that the cache-safe SSR shell can render without leaking member-specific data across visitors.

6. **PENDING LEGAL REVIEW marker preservation** — every comms template carries the marker structurally (blockquote + bold + ALL-CAPS at the head of the file) until Story 0.13 returns counsel ratification. Silent removal is a framework violation; the only path to removal is a `degradation-policy-ledger.md` "Legal-counsel revision log" row + trustee co-sign + supersession-schema marker.

## 5. Channel-hierarchy invariant cross-check (architecture §3.4)

The SMS channel is the most-misused of the five — the table below clarifies which SMS fire-conditions exist and which are NOT degradation-policy surfaces:

| Fire-condition | Source | Is this a degradation-policy surface? | Notes |
|---|---|---|---|
| OTP-SMS (DLT-transactional) | architecture §2.2 | NO — degradation policy does NOT touch OTP-SMS | OTP delivery is its own channel; degraded posture does not change its operation |
| step-up-OTP-SMS | architecture §2.2 | NO | High-trust operation channel; degraded posture does not change its operation |
| per-member transactional fallback SMS | architecture §3.4 | YES — content authored in `comms-templates/sms-channel.md` | Fires per message when WA gates ACTIVE + WA undelivered after 3 retries; the degradation-policy SMS content is the body rendered when the trigger reason is "degradation posture activated" |
| Pariwar-degraded-mode cycle-open SMS bridge | architecture §3.4 | YES — same template body | Fires when per-Pariwar push delivery rate falls below threshold AND WA admin-toggle is OFF; same content surface |
| Bulk-alert SMS | banned per PRD addendum RA-29 | **N/A** — this surface does not exist | A fifth SMS fire-condition is not authorable under this framework |

The dispatcher (Story 5.1 + 5.6) routes; the degradation policy provides the content; the **invariant** is that the policy never authors a fifth SMS fire-condition.

**Telegram channel — deliberate exclusion:** Architecture §3.4 names Telegram alongside the tier-3 channels; Story 5.5 frames it as an announcements-only mirror (fire-and-forget broadcast, no targeted member dispatch). Telegram is **explicitly excluded** from the degradation-policy comms templates because it does not support the targeted-dispatch shape required by the five-template hierarchy. No sixth template is authored. If a future revision determines a broadcast-only Telegram posture is needed under degraded conditions, that is a Story 5.5 amendment and requires a procedure-revision log entry in `degradation-policy-ledger.md`.

**Zero-comms-path cohort — accepted architecture constraint:** Under this framework's degraded-posture channel ladder, a member who (a) does not open the app (so push never fires on next-open), AND (b) has no WhatsApp opt-in (so WA gate is INACTIVE), AND (c) is not in Sunita-mode (so the per-member transactional SMS fallback does not apply) receives **only the public-page banner** when visiting twt.org. For Bihar-government-teacher cohort members with intermittent 4G connectivity, this is a plausible at-scale failure mode. This limitation is an **explicit accepted design constraint** grounded in:

1. **RA-29**: bulk-alert SMS is banned; a broadcast "degraded-posture activation" SMS to all active-cycle members is not an available fire-condition.
2. **Architecture §3.4 SMS fire-condition exhaustiveness**: the four named SMS fire-conditions are the complete set; a fifth would require an ADR.
3. **Public-page banner as designed last-resort**: the cache-safe SSR banner (architecture §5.8a) is the architecture-committed fallback for members not reachable via the three-tier channel hierarchy.

This is not a framework gap that can be patched within Story 0.4 scope — it is an architectural property of the channel hierarchy. If a future revision determines a Pariwar-admin-gated "degraded-posture all-cycle-members SMS" should be added as a new fire-condition, that requires an ADR amending the RA-29 classification and architecture §3.4 SMS fire-condition list. The constraint is recorded here so it is a named, deliberate property, not a silent omission.

## 6. Account State Machine cross-check (architecture §3.4)

Degradation posture does NOT introduce new Account State Machine states. The architecture §3.4 frozen states (`claim-filed-frozen`, `disbursed-frozen-readable`, `disabled-T+90`, `public-record-∞`) remain authoritative.

The degradation policy operates **alongside** the Account State Machine, not as an extension of it:

- A member in a frozen state under a degraded posture sees their frozen-state render-mode (per §3.4 lifecycle-driven dispatch suppression) PLUS the public-page banner (if visiting a public surface).
- No degraded-posture-specific Account State override is introduced. A `degraded-frozen` state class does not exist and cannot be introduced by this framework.
- Frozen-state surfaces continue to suppress member-class push notifications per §3.4 — degraded posture does NOT override the suppression. The degradation framing reaches the member via the public-page banner (cache-safe SSR) and via the channels that remain in scope for their account state.

This invariant is structural: a future revision proposing a degraded-state class would require a `.decision-log.md` `[GOV]` entry amending the Account State Machine per the architecture three-doc discipline ([[feedback_architecture_vs_prd_boundary]]).

## 7. Sign-off lifecycle

Two ratification modes are permitted; the Trustee Panel chooses at execution time:

- **Per-bundle ratification** — the panel ratifies the surface-inventory + comms-templates + table-top-exercise runbook as a single unit. One `degradation-policy-ledger.md` "Trustee sign-off log" row covers all surfaces; one `.decision-log.md` Decision 005 supersession.
- **Per-surface ratification** — the panel ratifies each surface-inventory row individually. One ledger row per surface; one Decision 005 supersession per bundle of surfaces (the supersession can group surfaces ratified in the same session).

The chosen mode is recorded in the sign-off log row header. Mid-cycle mode changes are permitted (the panel may ratify the inventory per-surface and then close the comms-templates per-bundle); the ledger captures the mode actually used per session.

**Hindi copy ratification.** Comms templates are Hindi-primary per UX Cross-Cutting "i18n at the core". The trustee sign-off SHOULD include at least one Hindi-native trustee to ratify Hindi copy fidelity. If the panel lacks a Hindi-native trustee, the copy ratification is partial — Story 0.13 counsel review of the Hindi copy is doubly load-bearing in that case; surface the gap in the sign-off log row Notes column. (Open ADR slot — see §8.)

## 8. Open ADR slots

The following control choices are explicitly deferred to ADRs. Each `[deferred ADR — placeholder procedure]` tag in the runbook + templates resolves when the corresponding ADR lands.

- **Paging integration when degraded posture activates** — the structural invariant is "degraded posture is observable" but the mechanism (Cloud Monitoring alarm rule → paging surface per architecture §5.6 + §5.10) is not wired by Story 0.4. Forward-deferred to Story 5.x (dispatcher) or Story 1.16x (CI/observability). The framework defers in a way that does not block author-commit.
- **Operations-policy re-attestation cadence** — the README "Review cadence fallback" below commits quarterly re-attestation + annual table-top + per-counsel-return ratification + per-incident post-mortem. When operations policy is authored (no current Story owner), the fallback values are superseded by the policy.
- **DR runbook authoring scope** — architecture §5.7 commits a DR runbook posture; the `dr-runbook-pdf-custody` row in `docs/escrow/credential-inventory.md` cites Story 0.4 as a candidate owner. Story 0.4 explicitly does NOT author the DR runbook (scope discipline); whether a dedicated DR-runbook Story authors it OR a future amendment to Story 0.4 picks it up is a `.decision-log.md` decision pending.
- **Hindi-native trustee ratification path** — if the Trustee Panel lacks a Hindi-native trustee at sign-off time, the Hindi copy ratification is partial. A formal pairing rule (e.g., "if no Hindi-native trustee, a Story-0.13-engaged counsel review of the Hindi copy is mandatory before `fully-ratified`") would be committed in operations policy. Open ADR slot.
- **Public-page banner dismissal state at authenticated surfaces** — `comms-templates/public-page-banner.md` is dismissible at the visitor session-level (cookie / localStorage). If a member wants to dismiss the banner on the authenticated surfaces, that is a Story 2.5 / 11a.5 concern (the authenticated fragment registry); Story 0.4 does NOT prescribe member-side dismissal. The boundary is recorded so a future Story does not violate the cache-safe SSR property.
- **Comms-template renderer escaping CI test** — per architecture §3.4 "Channel-renderer escaping discipline", a fixture test asserts that a name containing markdown / template-syntax characters renders as inert text in each channel. Story 0.4 commits the **template + variable list**; the **renderer test** is a Story 5.x deliverable (Epic 5 alert dispatcher framework).
- **Sole-Solo-Builder admin attestation on degradation-policy artifacts** — analogous to the Story 0.3 trustee-administrative-control attestation gap on the mirror destination, the degradation-policy artifacts in the repo are administered by Solo Builder under git-author authority. CI enforcement of attestation is deferred to Story 1.16a friction-budget PR CI gate.

## 9. Review cadence (fallback pre-operations-policy)

Until operations policy is authored, the framework defaults to:

- **Quarterly** ≥1-trustee re-attestation of the surface inventory (surface drift surfaces new rows; superseded rows are confirmed superseded).
- **Annual** table-top exercise re-execution per `table-top-exercise.md`.
- **Per-Story-0.13-counsel-return** comms-template ratification (each return is its own ledger row + trustee co-sign).
- **On-incident** post-mortem with policy-revision trigger — a live degraded-posture activation triggers a within-30-days review of the framework against the incident's surface behavior.
- **On-rotation-event** for any credentials referenced in the framework (the DR runbook PDF custody re-seal per architecture §5.9 cadence; the framework itself holds no live credentials).

The fallback values are NOT architectural commitments — they are placeholders to prevent the framework from sitting unwatched while operations policy is unwritten.

## 10. Related continuity surfaces owned elsewhere

| Surface | Owning Story | Where it lives |
|---|---|---|
| Operational runbooks (deploy, rollback, secret rotation, audit-log integrity, reconciliation manual-intervention, RBAC seed reset, multi-Pariwar provisioning) | Story 0.1 | `docs/runbooks/` |
| Credential escrow (≥2-trustee quorum-open; seven credential domains) | Story 0.2 | `docs/escrow/` |
| Code escrow (mirror pipeline + restoration drill + bus-factor switch-to-mirror) | Story 0.3 | `docs/escrow/code-escrow/` |
| Knowledge-transfer pack (ADRs, Niyamavali→FR mapping, deployment topology, on-call playbook, dependency inventory) | Story 0.5 | Forward-deferred; stored in trustee-accessible repo when authored |
| Backup engineer contract + retainer (A-13) | Story 0.6 | Author-committed 2026-05-30 at `docs/backup-engineer/` per Decision 2026-05-30-006 — framework includes README + contract-template + scope-of-work + access-grant-procedure + onboarding-checklist + activation-procedure + engineer-roster + ledger. Substantive contract documents at legal counsel (Story 0.13 dependency for §6 NDA + §9 Insurance + §10 Termination + §11 Dispute resolution); access credentials sealed under Story 0.2 framework (`backup-engineer-access-credentials` envelope per `docs/escrow/credential-inventory.md` line 91) |
| Legal counsel concurrent-review engagement | Story 0.13 | Author-committed 2026-06-02 at `docs/legal-counsel-engagement/` per Decision 2026-06-02-013 — framework includes README + engagement-letter-template + review-scope-charter (5 AC-named scope items + 32-row cross-Story deferred-scope inventory + 13-row regulatory surface + 6-row pre-launch checkpoints) + review-artifact-roster (19 priority-ordered rows; priority-1 = Epic 2 T&C draft per AC-1 within-2-weeks-of-signing commitment) + per-artifact-return-roster + counsel-roster (shortlist criteria + single template row at `pending-trustee-selection`) + engagement-ledger. Comms-template per-template counsel return events log to `degradation-policy-ledger.md` Legal-counsel revision log (cross-coupled with `review-artifact-roster.md` Rows 6-10). Trustee Panel scope ratification + counsel selection + engagement-letter signature + first-artifact submission + counsel returns pending Tasks 7-11 |
| P0-1 fallback-handler ledger (per-loop-node funded on-rota staff fallback) | Story 0.7 | Author-committed 2026-05-30 at `docs/fallback-handler-ledger/` per Decision 2026-05-30-007 — framework includes README + ledger + loop-nodes/ × 8 + rota + operations-lead-commitment + backfill-log. Named per-loop-node role + funding + rota pending Tasks 8-10 (Trustee Panel + Operations Lead hire OR substitute-bench ratification + per-loop-node ratification + ≥2-trustee sign-off); synthetic SLA test pending Task 11 |
| DR runbook (cross-region replica activation per architecture §5.7) | Story 0.4 OR dedicated DR-runbook Story (Open ADR slot) | `docs/runbooks/dr-runbook.md` once authored |
| Native-stack validation framework (P0-5 prototype + ratify decision; F1-F5 fail-criteria response paths including SMS-bridge candidate per F3 push fail per UX spec line 834) | Story 0.14 | Author-committed 2026-06-02 at `docs/native-stack-validation/` per Decision 2026-06-02-014 — framework includes README + experiment-protocol + device-procurement-roster + measurement-template (54-cell matrix pre-staged with `_PENDING-MEASUREMENT_`) + pass-criteria-evaluation-framework + ratify-decision-template + pivot-evaluation-decision-tree + engagement-ledger. Cross-coupling with this framework: F3 push-notification fail-criterion response path includes SMS-bridge candidate per UX spec line 834 + `pivot-evaluation-decision-tree.md` §4; SMS-bridge surface intersects degradation-policy comms-templates SMS-channel (per `docs/degradation-policy/templates/sms-channel-template.md` or equivalent) at re-attestation time. Trustee Panel experiment-scope + device-procurement-budget ratification + Solo Builder three-device procurement + ~2-week prototype build + measurement collection + ratify-or-pivot decision + Trustee acknowledgement pending Tasks 7-11 |
| Architectural launch-gate inventory framework (15-row roster + closure-criteria-rubric + target-date-rationale-template + monthly-review-cadence-protocol + escalation-protocol + engagement-ledger; trustee-side governance surface aggregating prior Phase-0 portfolios' closures for Phase 1 launch readiness signal arming) | Story 0.15 | Author-committed 2026-06-03 at `docs/launch-gate-inventory/` per Decision 2026-06-03-015. Cross-coupling with this framework: degradation-policy comms-templates per-template ratification + table-top exercise + re-attestation lifecycle events do not surface as `inventory-roster.md` rows (degradation-policy is not in the architecture §Launch Gate Risks 12-row table), but per Story 0.4 trustee sign-off discipline the degradation-policy framework participates in the same monthly cadence + ≥2-trustee quorum + closure-language precision discipline that `monthly-review-cadence-protocol.md` + `closure-criteria-rubric.md` commit. Trustee Panel ≥2-trustee inventory ratification + first monthly trustee-panel review + per-row closure events + final all-rows-closed-or-deferred sign-off + Phase 1 launch readiness signal armed + annual re-attestation cadence operational pending Tasks 8-11 |

This framework holds the degradation-policy surface only; it does not cover the other continuity surfaces above except by cross-reference. Each surface owns its own governance.

## 11. 30-day takeover joint-discharge anchor

Per AR-67 + PRD §9.1.1: "Code escrow … with sufficient documentation for a contracted external engineer to take over within 30 days." The 30-day takeover property is jointly discharged by:

- Story 0.3 AC-1 (code accessibility — mirror auto-replicates within 10 min; restoration drill demonstrates code accessibility)
- Story 0.3 AC-2 (continuity-of-development — bus-factor switch-to-mirror exercise)
- Story 0.4 AC-1 (per-surface degradation stance + comms templates + trustee sign-off — the trust knows what the surfaces do under reduced bandwidth)
- Story 0.4 AC-2 (table-top exercise — the panel can execute the degraded posture without ad-hoc improvisation)
- Story 0.5 (KT pack — the external engineer reads to come up to speed on the architecture + Niyamavali + ops)
- Story 0.6 AC-1 (backup engineer contract framework + signed contract + named engineer + IAM grant + onboarding — author-committed 2026-05-30 at `docs/backup-engineer/` per Decision 2026-05-30-006; substantive engineer + signed contract pending Story 0.6 Tasks 8-11)
- Story 0.6 AC-2 (activation-scenario test — the contracted external engineer demonstrates non-production task execution within 48 hours; discharges Story 0.1 AC-4 path 1 per Story 0.6 Task 12)

No single one of those discharges the property in isolation. The closure of any one MUST NOT be conflated with the joint discharge.

The `degradation-policy-ledger.md` "Table-top exercise log" header carries the joint-discharge anchor for future closure rows. When all six conditions close, a follow-up `.decision-log.md` entry records the joint-discharge achievement.

**Story 0.7 disjoint-anchor distinction** (added per Story 0.7 Decision 2026-05-30-007 Task 7 cross-reference edit): Story 0.7 (P0-1 fallback-handler ledger) is the **parallel** loop-node-operational-responsiveness portfolio, distinct from the bus-factor-of-one mitigation portfolio enumerated above. Closure of Story 0.7 does **NOT** contribute to the 30-day-takeover joint discharge — the two portfolios have disjoint closure semantics per `docs/fallback-handler-ledger/README.md` §10. The bus-factor portfolio closes the property "the trust survives Solo Builder unavailability >7 days"; the Story 0.7 portfolio closes the property "every Phase-1 loop node has a named, funded, on-rota fallback handler reachable within SLA when automation fails". Both are required for Phase-1 launch readiness, but each is gating per its respective launch-gate property — neither substitutes for the other.

## 12. Comms-template content constraints

The constraints below are load-bearing in addition to the §4 structural invariants:

- **No module-promotion language** under any frozen state per UX Stance #1.
- **No PII / member-state in the public-page banner** per §5.8a — extends to: no member names, no claim references, no UTR numbers, no payment-status, no nominee details. The banner is structurally public.
- **No urgency theater** per UX Stance #5 — copy does NOT use "URGENT", "IMMEDIATE", "FINAL NOTICE", or equivalent escalation language. Degraded posture is honestly framed as "operating with reduced staff bandwidth"; resolution timeline is concrete (`{expected_return_date}`) but not panic-framed.
- **Warm-formal salutation system** per UX §Design Opportunities — *सम्मानित साथी* / "Respected colleague", never "user" or "customer".
- **Hindi primary, English secondary** per UX Cross-Cutting "i18n at the core" — every template renders Hindi as the dominant body with English as the secondary block; Devanagari typography per UX §6.

## 13. File index

| File | Purpose |
|---|---|
| `README.md` | This file — framework lifecycle, property/control/policy/gap-analysis discipline, structural invariants, channel-hierarchy + Account State Machine cross-check, sign-off lifecycle, Open ADR slots, review cadence, related continuity surfaces, 30-day joint discharge anchor |
| `surface-inventory.md` | Table of every member-facing + admin-facing surface with degradation stance, fallback handler, comms-template cite, status |
| `comms-templates/push-channel.md` | In-app push template (FCM/APNs per architecture §3.4) with PENDING LEGAL REVIEW marker |
| `comms-templates/whatsapp-channel.md` | WhatsApp Business UTILITY template with PENDING LEGAL REVIEW marker |
| `comms-templates/sms-channel.md` | DLT-transactional SMS template (per-member fallback + Pariwar-degraded-mode cycle-open bridge) with PENDING LEGAL REVIEW marker |
| `comms-templates/email-channel.md` | Email template (existing trust comms surface) with PENDING LEGAL REVIEW marker |
| `comms-templates/public-page-banner.md` | Cache-safe public-Astro-SSR banner template per architecture §5.8a with PENDING LEGAL REVIEW marker |
| `degradation-policy-ledger.md` | Trustee sign-off log, activation declaration log, legal-counsel revision log, table-top exercise log (with 30-day joint-discharge anchor), periodic re-attestation log, procedure-revision log |
| `table-top-exercise.md` | 5-section runbook (per `docs/runbooks/_template.md`) for the 7-day Solo-Builder-unavailable scenario walkthrough |

## 14. Degraded posture activation and deactivation ceremony

### 14.1 Declaration authority

≥2 trustees acting as a quorum declare degraded posture. No individual trustee may declare or lift degraded posture unilaterally.

### 14.2 Trigger condition

Degraded posture activates when the Solo Builder (BigDev) has been unreachable for **7 consecutive calendar days**.

### 14.3 Trigger test — contact-attempt log requirement

A trustee quorum may certify the trigger condition only after a documented contact-attempt log meeting all of the following criteria:

1. **Channels covered:** attempts logged for every registered continuity channel — primary mobile number (voice call), primary email, and WhatsApp.
2. **Temporal spread:** at least one attempt must occur on **multiple separate calendar days** within the 7-day window (a cluster of attempts on a single day does not satisfy this requirement).
3. **Log format:** each attempt entry records: date and time (IST), channel used, and outcome (no answer / bounced / seen-not-replied / etc.).
4. **Joint certification:** a minimum of two trustees review the completed log and jointly certify that the 7-day unreachable condition has been met. The certification is a named trustee attestation, not an automated signal.

### 14.4 Declaration recording

The Trustee secretary (or a designated trustee if the secretary is unavailable) records the activation declaration in:

1. **`degradation-policy-ledger.md` "Activation declaration log"** — the durable in-repository record; canonical reference. All other locations are derived from this entry.
2. **Trustee resolution register** — the external trustee governance record.
3. **Public status notice** — a member-visible notice consistent with the comms templates in `comms-templates/`.

### 14.5 Technical flag-set path

`[deferred ADR — placeholder procedure]` — the technical path for activating the per-surface feature flags (e.g., Story 5.x degraded-mode flag, Pariwar-admin toggle) is deferred to the Story 5.x dispatcher specification and operations policy. Until that ADR closes, trustees confirm the degraded-posture stance in the ledger and public notice; the technical flag changes require the backup engineer per Story 0.6 or developer involvement. This slot is tracked as an Open ADR item per §8.

### 14.6 Deactivation condition

Degraded posture ends when **both** conditions hold:

1. The triggering condition is no longer present — Solo Builder has returned and confirmed availability, or a successor arrangement per Story 0.6 is operational.
2. A trustee quorum (≥2 trustees) records an all-clear decision.

### 14.7 Deactivation SLA for public comms

Public communications activated during the degraded posture — banner, push, WhatsApp, SMS, email — MUST be updated or withdrawn within a **defined SLA after the all-clear decision**. The specific SLA value belongs in operations policy (not committed here). Until operations policy is authored, the expectation is best-effort same-day for the public-page banner and best-effort within one business day for channel comms.

### 14.8 Deactivation recording

The Trustee secretary (or designated trustee) updates the corresponding "Activation declaration log" row in `degradation-policy-ledger.md` with the `Deactivation date`, `All-clear trustees`, and `Comms-withdrawal SLA met` columns, and records the all-clear in the Trustee resolution register.

---

## Changelog

| Date | git SHA | Author | Material edit? | Re-sign required? | Ledger entry |
|---|---|---|---|---|---|
| 2026-05-29 | _initial commit_ | Solo Builder (BigDev) | initial framework commit | yes (≥2 trustees) per Story 0.4 Task 7 | `degradation-policy-ledger.md` Framework-commit record |
