# src/cross-tenant/

**Landing Story: 1.6** — Named cross-tenant operations helper per architecture
§1.2 line 737-740 + line 764-770.

The few legitimate cross-Pariwar operations (e.g., super-admin audit dashboards,
helpline triage routing) go through a single named helper that explicitly opts
out of RLS via `SET LOCAL row_security = off` — everywhere else RLS is in
force. Story 1.6 authors the substantive helper + its CI-enforced single
call-site discipline. Empty at Story 1.2.
