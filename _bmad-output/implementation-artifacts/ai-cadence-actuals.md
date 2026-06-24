# AI Cadence Actuals

> **🗄️ RETIRED — 2026-06-24 · Decision 2026-06-24-063 · ADR-0025.** This instrument is retired (instrumentation-only). The 80 hr/wk NET **re-attestation obligation is released**: per-story focused-NET-hours proved **non-capturable in a solo + AI workflow**, so the re-attestation cannot be satisfied with trustworthy data. The `cadence-check` CI gate has been **removed**. **No backfill** — Epic 0/1/2 remain recorded UN-ATTESTED below; the honest record is preserved, not reconstructed. The Epic-0 `ceiling_ratio = 1.497` no-trigger finding (Decision 2026-06-04-016) **STANDS** as ratified; `reconciliation-decision-framework.md §1` is unchanged. See `docs/adr/ADR-0025-retire-ai-cadence-instrument.md`.

Instruments the 80 hr/wk NET assumption that underlies `ceiling_ratio = 1.497` (the ratio that
cleared the 1.5× reconciliation trigger by 0.003 / 0.2%). Epic 2 is the first instrumented
measurement cycle. At each epic close, re-attest the assumption against these actuals and cite
this file in the retrospective.

**Un-attested status going in:** Epic 1 closed with this file absent (A-5). The 80 hr/wk NET
assumption has never been measured. The gap is recorded openly — see Epic 1 retro §10 (AI-1).

---

## Assumption Under Test

| Parameter | Value | Source |
|---|---|---|
| AI-cadence week (NET focused hours) | **80 hr/wk** | estimation-methodology.md §2; Decision 2026-06-04-016 |
| AI-cadence month | 80 × 52/12 = **346 hr/month** | floored from 346.67 (rounds against ceiling) |
| `ceiling_ratio` at Epic 0 close | **1.497** | estimation-worksheet.md §8; ratio-1.497 sign-off |
| Trigger threshold | 1.5 (strict `>`) | reconciliation-decision-framework.md §1 |
| Month-3 re-attestation commitment | Committed at Epic 0 close | estimation-worksheet.md §9 |

**What "NET focused hours" means:** active AI-assisted coding/design/review time — excludes
standups, overhead, waiting, and time when the AI session is idle. A 4-hour work session with
2 hours of active AI output counts as 2 NET hours.

---

## Measurement Protocol

Record per-story after each story is marked `done`:

- **Start**: first active session date for that story
- **End**: date story marked `done` (sprint-status flip)
- **Est. Net Hours**: honest estimate of focused AI session time for that story
- **Sessions**: number of distinct AI work sessions
- **Notes**: anomalies, context switches, blocked days, unusual efficiency

At each epic close: sum `Est. Net Hours` across stories, compute the implied weekly rate
(total ÷ elapsed calendar weeks), compare to the 80 hr/wk assumption, and record the finding
in the retrospective. Re-attest or escalate per reconciliation-decision-framework.md §1.

---

## Epic 2 — Niyamavali Publishing & Public Trust Identity

**Epic 2 opened**: 2026-06-20  
**Epic 2 closed**: TBD

| Story | Start | End | Est. Net Hours | Sessions | Notes |
|---|---|---|---|---|---|
| _(measurement cycle opened — no stories started yet)_ | 2026-06-20 | — | — | — | First instrumented cycle. Fill in each row when story is marked done. |

**Epic 2 total net hours**: TBD  
**Elapsed calendar weeks**: TBD  
**Implied weekly rate**: TBD hr/wk  
**Assumption met (≥80 hr/wk)?**: TBD — re-attest at Epic 2 retrospective and cite this file  
**Escalation trigger**: if implied rate < 80 hr/wk by >10%, reopen reconciliation-decision-framework.md §1 ceiling-ratio check

---

## Prior Epics

| Epic | Net Hours | Implied Rate | Assumption Met? | Note |
|---|---|---|---|---|
| Epic 0 (pre-launch ops) | UN-ATTESTED | — | ❌ Not measured | A-5 — file never created. Recorded as open program risk at Epic 1 retro. |
| Epic 1 (substrate) | UN-ATTESTED | — | ❌ Not measured | A-5 — file never created. Recorded as open program risk at Epic 1 retro. |

---

## References

- estimation-methodology.md §2 — methodology definition (80 hr/wk NET basis)
- estimation-worksheet.md §8–§9 — `ceiling_ratio = 1.497` + Month-3 re-attestation commitment
- reconciliation-decision-framework.md §1 — trigger threshold (> 1.5)
- `.decision-log.md` Decision 2026-06-04-016 — 80 hr/wk cadence override sign-off
- Epic 1 retrospective AI-1 — `_bmad-output/implementation-artifacts/epic-1-retro-2026-06-20.md`
- `scripts/cadence-check/check.ts` — **REMOVED 2026-06-24** (gate retired per ADR-0025 / Decision 2026-06-24-063; previously enforced this file's existence + currency)
