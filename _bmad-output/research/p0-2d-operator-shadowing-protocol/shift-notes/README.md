# Shift Notes — P0-2d Operator Shadowing

> **Per-shift note destination.** This directory will hold pseudonymized per-shift notes authored by the researcher within 24 hours of each shift per `per-shift-note-schema.md`.

## Filename convention

```
operator-1-shift-1.md
operator-1-shift-2.md
operator-1-shift-3.md   # if needed for ≥4-hour minimum
operator-1a-shift-1.md  # if substitute operator engaged
operator-1a-shift-2.md
```

## Pseudonymization invariants

All per-shift notes filed here MUST satisfy:

- No operator real identity
- No host-helpline real institutional identity
- No caller identity (NEVER recorded under any circumstance)
- No caller-personal-content (NEVER recorded)
- All identifier fields use pseudonyms (`Operator-1`, `HostHelpline-1`)
- Demographic context at non-identifying granularity only (per ethics-protocol §4)

## Authoring window

Per ethics-protocol §3 + shadowing-protocol §7:
- Per-shift note authored **within 24 hours** of shift end
- Filed in this directory
- Pseudonymization verified at filing
- Per-shift divergence-flags reviewed against `assumption-inventory.md`; flagged rows propagate to Task 9 synthesis authoring

## Retention policy

Per ethics-protocol §6:
- Per-shift notes retained for **6 months** in this directory
- After 6 months, archived in `shift-notes/archived/` subdirectory (NOT destroyed)
- Operator OR host-helpline may request immediate destruction

## Author-commit state

At Task 5 author-commit, this directory is empty (no per-shift notes yet authored). Per-shift notes are filed at Task 8 _AWAITING EXTERNAL ACTION_ post-shadowing-conduct.

## Cross-link

- `../per-shift-note-schema.md` — note shape definition
- `../ethics-protocol.md` §6 Post-synthesis data handling — retention policy
- `../shadowing-protocol.md` §7 Post-shift — authoring discipline
- `archived/README.md` — 6-month archive destination
