# openapi/

PR-1 placeholder — substantive `v1.yaml` is generated from `packages/contracts/` at build time.

Per architecture §Generated artifacts deterministic + synchronized (architecture lines 3995-3999), the OpenAPI spec is a generated artifact (NOT hand-authored). The `.gitattributes` marks `openapi/v1.yaml` as `linguist-generated=true` so it collapses in PR review diff.

Substantive generation infrastructure lands in Story 1.4 (packages/contracts Zod + OpenAPI contract scaffolding).
