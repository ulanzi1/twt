# seed/dev/

Dev-environment seed data. Synthetic-only — per architecture §5.5 line
3113-3119 "No production PII in dev / staging" structural commitment.

Story 1.2 reserves the directory. Per-Story seed fragments land as the schemas
they populate materialize (Story 1.3 events, 1.6 RLS fixtures, 3.1+ members,
7.x pools, etc.). The seed-loading harness is downstream (Story 1.x TBD).
