# ADR-0025 — Retire the AI-Cadence Instrument (Instrumentation-Only)

**Status:** `ratified` — 2026-06-24, Decision 2026-06-24-063 (Trustee Panel: Dhiraj Rahul + Kalpana Bharti)
**Author:** BigDev (Solo Builder)
**Supersedes:** the ongoing AI-cadence **re-attestation obligation** (Epic-0-close commitment; `estimation-worksheet.md §9`; AI-1 from the Epic 1 retrospective). Does **NOT** supersede the Epic-0 `ceiling_ratio = 1.497` no-trigger finding (Decision 2026-06-04-016), which stands as ratified.
**Drives:** Epic 2 retrospective action item AI-2-1.

---

## Context

The AI-cadence instrument (`ai-cadence-actuals.md` + the `cadence-check` CI gate) was stood up per Epic 1 retrospective AI-1 to instrument the **80 hr/wk NET** assumption that underlies `ceiling_ratio = 1.497` — the ratio that cleared the reconciliation-decision trigger (`max(floor_ratio, ceiling_ratio) > 1.5`) by 0.003. Epic 2 was designated the first instrumented measurement cycle, with a re-attestation due at epic close.

The Epic 2 retrospective found that, while the file existed and the gate was green, the per-story measurement rows were **never populated** — the gate asserts file **existence + currency**, not **population** (a green checkmark over an empty table). Investigating why surfaced a root cause, not a discipline lapse:

> **The instrument proved non-capturable in a solo + AI workflow. Therefore the re-attestation obligation cannot be satisfied with trustworthy data.**

Per-story "focused NET hours" is not reliably measurable when a single builder works in interleaved AI-assisted sessions: session wall-time ≠ net output, idle/context-switch time is not cleanly separable, and any number entered would be an estimate dressed as a measurement. Continuing to carry the obligation would either (a) keep a perpetually-empty gate, or (b) invite backfilled numbers that violate the project's record-un-attested-no-backfill discipline.

## Decision

1. **Retire the AI-cadence instrument — instrumentation only.** Remove the `cadence-check` CI gate (`scripts/cadence-check/check.ts`, the `cadence:check` script, the `ci.yml` job, the `ci-local.sh` registration) and archive `ai-cadence-actuals.md` as `RETIRED` in place.
2. **Release the re-attestation obligation.** The Epic-0-close commitment to re-attest the 80 hr/wk NET assumption against per-story actuals at each epic close is released, because it cannot be satisfied with trustworthy data in this workflow.
3. **No backfill.** Epic 0, 1, and 2 remain recorded **UN-ATTESTED** in the archived file. The honest gap is preserved, not reconstructed (record-un-attested-no-backfill discipline).
4. **The `ceiling_ratio = 1.497` no-trigger finding STANDS.** This retirement is instrumentation-only. The Epic-0 finding (Decision 2026-06-04-016) remains the ratified basis-of-record; `reconciliation-decision-framework.md §1` and its 1.5× trigger are unchanged. What is retired is the *ongoing empirical re-attestation* of the assumption behind that finding — not the finding, and not the reconciliation framework.

## Scope boundary (what this ADR does NOT do)

- It does **not** supersede or re-open the 1.497 ceiling-ratio finding.
- It does **not** amend `reconciliation-decision-framework.md §1` (the 1.5× trigger and the more-protective-governs rule remain in force for any future explicit reconciliation event).
- It does **not** retire any other gate.

## Consequences

- `pnpm ci:local` now mirrors **14** static jobs (+ `integration-tests`), down from 15. `ADR-0017`'s mirror table and `gate-inventory.md` updated accordingly.
- The 80 hr/wk NET assumption is now **accepted as un-re-attested** — an acknowledged, recorded residual: if real cadence ever diverged enough to push `ceiling_ratio` past 1.5, there is no longer an instrument to detect it. Accepted as a deliberate trade against measuring something that cannot be measured honestly.
- Removes a recurring "phantom obligation" that decayed across Epics 0–2 (the A-5 / AI-1 lineage).

## References

- `docs/spec-to-cadence-reconciliation/{estimation-methodology,estimation-worksheet,reconciliation-decision-framework}.md`
- `.decision-log.md` Decision 2026-06-04-016 (80 hr/wk cadence sign-off) · Decision 2026-06-24-063 (this retirement)
- `_bmad-output/implementation-artifacts/epic-1-retro-2026-06-20.md` (AI-1) · `epic-2-retro-2026-06-24.md` (AI-2-1, H-1)
- `_bmad-output/implementation-artifacts/ai-cadence-actuals.md` (archived RETIRED)
