# Per-Pariwar build profile + branding-bundle-swap recipe (Story 1.15, AC-5)

The v1 architecture serves **every Pariwar from one multi-tenant deployment** under
its `/p/<pariwar_id>/` path-scope (architecture §2.5 + AR-25). There is **no separate
image build per Pariwar** in v1 — branding is resolved at request time from the
Pariwar-Passport. This file documents the profile + the swap recipe so the operator
(and a future §5.3 migration to per-Pariwar builds) has the AS-BUILT reference.

## The descriptor the deploy reader emits (AC-3)

`apps/api/src/modules/pariwar-provisioning/deploy-config.ts` reads the target
Pariwar's Passport (cross-readable; no scope) and emits:

```json
{
  "pariwarId": "<uuid-v4>",
  "pathScope": "/p/<uuid-v4>/",
  "branding": {
    "logo_url": "https://…",
    "logo_url_dark": "https://…",
    "primary_color": "#0A3D62",
    "secondary_color": "#FFFFFF",
    "accent_color": "#F5A623"
  }
}
```

The live `DeployTrigger` (`DEPLOY_TRIGGER_MODE=live`) POSTs this to the Dokploy deploy
API. The GitHub Actions workflows (`deploy-{staging,prod}.yml`) POST `{ environment,
imageTag }` for a full redeploy; the in-app trigger POSTs the per-Pariwar descriptor
for a branding-scoped refresh.

## Branding-bundle-swap recipe (runtime, no rebuild)

1. **Provision** the Pariwar (`POST /api/v1/provisioning/pariwars`) → mints the
   `pariwar_id`, persists the Passport (incl. the `branding_bundle`).
2. The `public` app renders chrome for `/p/<pariwar_id>/…` by reading the Passport
   branding via `getBrandingBundleCached` (60s cache-aside, §1.10) — the swap is a
   **DB read**, not a deploy. A trustee branding edit (`upsertPariwarPassport`)
   invalidates the cache so the new palette is live within the 60s ceiling.
3. **Trigger a Dokploy build** (`POST .../:pariwarId/deploy`) only when a code/image
   change must land — NOT for a branding change (that is already live via the read).

## When a Pariwar needs a BESPOKE build (the §5.3 migration trigger)

A 2nd Pariwar that needs its **own** build (not just branding — e.g. a divergent
feature set) is the architecture's Dokploy→Cloud Run/GKE migration trigger (§5.3,
alongside ≥70% host utilization). At that point the deploy matrix in
`deploy-{staging,prod}.yml` gains a `pariwar` dimension and this profile becomes a
per-Pariwar image tag. v1 does NOT cross that trigger — the SM-1 2nd-Pariwar demo
runs on the shared multi-tenant deployment + path-scope.
