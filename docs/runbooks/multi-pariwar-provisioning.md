# Runbook: Multi-Pariwar Provisioning

> **Status:** signed-off — ≥2-trustee (Dhiraj Rahul + Kalpana Bharti) 2026-06-23 at git SHA `f247e6d` per `operational-readiness-ledger.md`; AS-BUILT (Story 1.15) sign-off discharges the ADR-0011 co-requisite (Decision 2026-06-21-050). Recorded as Decision 2026-06-23-060.
> **Owner role:** Infrastructure on-call (Solo Builder primary at v1; backup engineer per A-13) with Engineering Lead co-sign at provisioning trigger
> **Last material edit:** 2026-06-15 by Solo Builder (Story 1.15 AS-BUILT reconciliation)
> **Architectural authority:** architecture.md §1.2 (Multi-tenant isolation — Postgres RLS via `pariwar_id`), §2.5 (Multi-Pariwar active scope — URL path prefix), §5.14 (Per-Pariwar infrastructure isolation strategy), AR-25 (multi-Pariwar URL path scope), FR-59 (`pariwar_id` first-class + RLS), FR-60 (branding bundle), FR-61 (separate-app-per-Pariwar build), FR-62 (Dokploy auto-deploy + K8s migration path); epics.md Epic 1 Story 1.7 (Pariwar-Passport data model + branding bundle), Story 1.15 (Dokploy auto-deploy + multi-Pariwar provisioning), Story 7.2 (Pool naming — dual-identifier UX-DR72)

Multi-Pariwar provisioning is a Dokploy auto-deploy + branding-bundle swap, NOT a code fork. URL path scope is the active-Pariwar dimension. Per-Pariwar build profile is a `turbo.json` + `apps/mobile/eas.json` addition.

## 0. AS-BUILT reconciliation (Story 1.15)

Story 1.15 implemented the provisioning slice; the procedure below is reconciled to what shipped:

- **Surface = the admin Provisioning page** (`apps/admin` `/provisioning`, AC-4) → the API module `apps/api/src/modules/pariwar-provisioning/`. EXACTLY three controls: Add-Pariwar form, Trigger-Dokploy-build, provisioning-status view. NO Epic-10 controls.
- **Endpoints (AC-1), GLOBAL — NOT under `/p/:pariwarId/`:**
  - `POST /api/v1/provisioning/pariwars` — **mints the `pariwar_id` (UUID v4) server-side** (NOT pre-allocated by hand) + persists the Pariwar-Passport + emits `pariwar.provisioned`.
  - `POST /api/v1/provisioning/pariwars/:pariwarId/deploy` — invokes the deploy seam + emits `pariwar.deploy_triggered`.
  - `GET /api/v1/provisioning/pariwars` — the provisioning-status view (cross-readable passports + latest deploy status), forced-paginated.
- **Authorization = the GLOBAL `pariwar.provision` gate** (`requireGlobalPermission`, AC-1a). super_admin holds it at `global` scope; a Pariwar-scoped-only admin gets 403. (Note: there is no `national` scope — the canonical value is `global`; ADR-0008.)
- **The self-scoped provisioning write** (the chicken-and-egg): the handler self-scopes to the freshly-minted id (`openScopeTx(deps, newId)` → `upsertPariwarPassport` → commit) so the RLS `WITH CHECK` passes. RLS is exercised faithfully (no BYPASSRLS shortcut).
- **Deploy seam (AC-3)** = `deps.deployTrigger`, env-resolved (`DEPLOY_TRIGGER_MODE=fake|live`): the in-memory fake in dev/test, the live Dokploy-API client in staging/prod. The deploy-config reader emits the `/p/<pariwar_id>/` path-scope + branding reference from the Passport.
- **No new DB migration** for a new Pariwar (AC-8) — RLS-tagged rows inherit isolation (§2.2 below).
- **Branding swap is RUNTIME** (a Passport read via `getBrandingBundleCached`, 60s cache-aside), not a per-Pariwar rebuild — see `infra/dokploy/per-pariwar-profile.md`.
- **Cloudflare path-routing STAYS GATED** (D1-1.13, §5.8a DPDPA legal review, ADR-0010 OPEN): route straight to Dokploy; do NOT assert DPDPA compliance.

## 1. Prerequisites

- **First Pariwar (Bihar) operational.** The architectural commitments rely on the first Pariwar's substrate being stable; second-Pariwar provisioning is also a migration trigger for Dokploy → Kubernetes per A-12 (FR-62). Confirm migration trigger has been evaluated; provision may run on Dokploy v1 still, with K8s migration as a follow-on per A-12.
- **Pariwar-Passport authored.** Story 1.7 commits the Pariwar-Passport data model + branding bundle. The new Pariwar's Passport is authored and reviewed before provisioning starts. Required fields: Pariwar identifier, jurisdiction, branding bundle (logo, color tokens per design system per Story 1.17), trustee panel composition, contact addresses, RBAC role grants for the new Pariwar's initial admins.
- **`pariwar_id` allocation.** Per architecture §1.2 and FR-59, `pariwar_id` is first-class. Allocate a new `pariwar_id` (UUID; operations policy commits the allocation procedure). Confirm uniqueness against existing IDs.
- **URL path scope assignment.** Per architecture §2.5 and AR-25, the URL path prefix is the active-Pariwar dimension. Assign the new Pariwar's path prefix (e.g., `/p/<short-name>/`) avoiding collision with existing Pariwars.
- **Build profile authored.** Per architecture §Workspace Layout R-5, per-Pariwar build profile lives in `turbo.json` + `apps/mobile/eas.json`. The new Pariwar's profile is a profile addition, not a convention change.
- **CI gates green.** Provisioning involves CI runs across multiple workspaces. All CI gates (including the cross-Pariwar adversarial read test per architecture §5.4) must be green for the commit deploying the provisioning.
- **Trustee authorization.** A new Pariwar is a trustee-ratified action. Authorization recorded in `.decision-log.md` before provisioning begins.
- **Legal counsel review (Phase-0).** Per Story 0.13, legal counsel has concurrent-review scope; the new Pariwar's trust-posture copy, DPDPA consent flow, and procedural fairness specs are reviewed before public-facing surfaces go live.

## 2. Step-by-step procedure

### 2.1 Author the Pariwar-Passport

1. **Open the Pariwar-Passport data model** per Story 1.7. Fill required fields per the Passport schema:
   - `pariwar_id`: new UUID.
   - Pariwar identifier (short-name + display-name; dual-identifier per UX-DR72 / Story 7.2).
   - Jurisdiction (state-level; affects DPDPA scoping, legal counsel context).
   - Branding bundle: logo asset paths, color tokens that compose with the design system (Story 1.17 — tokens / typography / vocabulary / numeral hardening).
   - Initial trustee panel composition (names, roles, contact).
   - Initial admin user IDs and role grants per architecture §2.6 + FR-46 (12 seeded roles).
   - Per-Pariwar custom fields: **nothing to do at Passport time** — see step 2.2.3 below. Custom fields
     are authored at runtime through the admin console, not declared on the Passport (Story 10.12).

2. **Trustee review of Passport.** ≥2 trustees from the existing Pariwar review the new Passport. Authorization recorded in `.decision-log.md`.

3. **Commit Passport to repo.** The Passport is a code-reviewed artifact; commit triggers CI.

### 2.2 Database setup

1. **Schema migrations: none new for provisioning.** Per architecture §1.2, RLS is enforced via `pariwar_id`; new rows tagged with the new ID inherit isolation automatically. There is no new schema for a new Pariwar. **AS-BUILT (Story 1.15, AC-8):** confirmed — the provisioning write is a single `pariwar_passport` row INSERT via the **self-scoped write** (`openScopeTx(deps, newId)` → `upsertPariwarPassport`), authorized by the GLOBAL `pariwar.provision` gate. RLS is the data boundary; the permission gate is the action boundary (§2.6 "RLS then authz").

2. **Initial data seeding for the new Pariwar:**
   - Apply the RBAC seed script (per `rbac-seed-reset.md` §2.4) scoped to the new `pariwar_id`. This seeds the 12 canonical roles for the new Pariwar.
   - Apply initial admin role grants per Passport.
   - Seed the Niyamavali rule registry (per architecture §1.10 reference, Story 2.3) with the canonical Niyamavali version applicable to the new Pariwar's jurisdiction. The Niyamavali may be the same as Bihar's at v1 or jurisdiction-specific per legal counsel review (Story 0.13).
   - **No custom-field seed.** A new Pariwar starts with zero custom fields by design (Story 10.12 — there is no code-resident default set and no sentinel row). If it needs one, it is authored at runtime; see step 3 below.

3. **Per-Pariwar custom fields (Story 10.12) — AS-BUILT, and deliberately NOT a provisioning step.**

   A new Pariwar starts with **zero custom fields**, and that is a complete, correct state: there is no
   default set, no sentinel row and no seed to run. Versions start at 1 when the Pariwar publishes its
   first definition. If the Pariwar needs none, nothing here ever runs.

   When it does need one:

   1. Grant `pariwar.manage_custom_fields` — it ships on the `pariwar_admin` seeded role, so the
      standard role grants in step 1 above already carry it. `auditor` gets the read key
      (`pariwar.view_custom_fields`) but never the write: an auditor must be able to see what a tenant
      collects without being able to change it.
   2. The Pariwar admin opens **`/p/<pariwarId>/custom-fields`** in the admin console and publishes a
      definition: a lowercase snake_case key, **both** an English and a Hindi label (required — members
      read Hindi first, and a label cannot be corrected once values exist under it), one of the seven
      fixed types, and `pii_tier: 3`.
   3. **No migration, no release, no DDL.** That is the whole point of FR-54. In particular, ticking
      "often searched" (`indexed: true`) **records a request and creates nothing** — a functional index
      is a drizzle-kit migration a human authors, scoped to that one `pariwar_id`, and listed in
      `packages/domain/src/per-pariwar/<id>/index-inventory.ts`. A tenant admin issues no DDL, ever.

   **What the Pariwar CANNOT author, and what to tell them when they hit it:**

   - A key that names a frozen governance control (`payout_destination*`, `benefit_mechanism`,
     `is_valid`, `is_assignable`, `moderation_status`, `state*`, `pariwar_id`, `member_id`, `lock_in*`,
     `fixed_amount*`, `audit_*`, `consent_*`). The refusal names the control. This is not negotiable at
     the operator level — it takes an ADR or a Sprint Change Proposal.
   - Anything at PII tier 1 or 2, or a key/label shaped like an identifier (`aadhaar`, `pan`, `mobile`,
     `ifsc`, `upi`…). `members` is a certified PII-free table. This is a **missing substrate, not a
     rejected requirement** — say so; the refusal message does.
   - More than 32 live fields per Pariwar. Retiring one makes room; retirement keeps everything members
     have already entered and only stops new entries.
   - Custom fields on **claims or pools** — v1 hosts on members only (a recorded, gated deferral).

4. **Verify per-Pariwar RLS isolation.** Run the architectural CI gate (architecture §5.4 cross-Pariwar adversarial read test). Confirm queries from one Pariwar cannot read the other's rows.

### 2.3 URL path scope + edge

1. **Configure routing.** The new path prefix routes to the same backend; the backend dispatches per `pariwar_id` derived from the path prefix per architecture §2.5. **AS-BUILT (Story 1.15):** route **straight to Dokploy** (Traefik `PathPrefix(\`/p/\`)` in `infra/dokploy/compose.yaml`). **Cloudflare path-routing STAYS GATED** on the §5.8a DPDPA legal review (D1-1.13, ADR-0010 OPEN) — do NOT enable the Cloudflare path-route or assert DPDPA compliance until the gate clears.

2. **Bot Management + Turnstile** apply to all Pariwars uniformly (Story 1.13). No per-Pariwar bypass.

3. **Rate limiting + login wall + forced pagination + honeypot/noindex** (Story 1.14, FR-89-92) apply uniformly; per-Pariwar config goes through Story 5.3-equivalent abstraction if rate-limit thresholds differ per jurisdiction.

### 2.4 Apps and per-Pariwar build profile

1. **Per-Pariwar build profile** in `turbo.json` + `apps/mobile/eas.json` per architecture §Workspace Layout R-5. The Bihar profile is the v1 reference; the new Pariwar adds a profile, not a code branch.

2. **Trigger Dokploy auto-deploy** per FR-62 / Story 1.15. **AS-BUILT:** the admin "Trigger Dokploy build" action → `POST /api/v1/provisioning/pariwars/:pariwarId/deploy` → the env-resolved `DeployTrigger` (`DEPLOY_TRIGGER_MODE=live` in staging/prod) POSTs the Dokploy deploy API; `.github/workflows/deploy-{staging,prod}.yml` build + push the per-app images (`api`/`admin`/`jobs`/`public`) to Artifact Registry first. The **branding-bundle swap is RUNTIME** (a Passport read), not a per-app rebuild (`infra/dokploy/per-pariwar-profile.md`); a per-Pariwar bespoke build is only needed at the §5.3 migration trigger.

3. **Verify image SHAs.** Each deployable workspace gets a Pariwar-specific image built from the per-Pariwar profile + branding bundle. Image SHAs differ per Pariwar; confirm SHAs against expected.

4. **Per-Pariwar communication channels** (per architecture §3.4 / Story 5.3, 5.4 WhatsApp + Telegram + SMS provider abstraction): provision provider accounts per Pariwar; configure abstraction's per-Pariwar config (FR-100 Phase-2 forward-compat hooks per architecture §1.13).

### 2.5 Verify provisioning end-to-end

1. **Multi-Pariwar provisioning walkthrough** per Epic 1 demoable closure beat C1 (epics.md line 972). Demonstrate:
   - Second Pariwar provisioning via the FR-61/FR-62 Dokploy auto-deploy flow with FR-60 branding-bundle swap.
   - Second Pariwar serves traffic on its own URL path scope (AR-25).
   - Independent rule set (Niyamavali version + per-Pariwar custom-fields).

   **AS-BUILT (Story 1.15, AC-7):** the **in-story proof is the dev/FAKE end-to-end** (the `apps/api` `pariwar-provisioning.spec.ts` integration test: Add-Pariwar → `POST provisioning/pariwars` → `POST .../deploy` [fake `DeployTrigger`] → status view reflects the new Pariwar + its `/p/<id>/` scope). The **live path is wired** (`DEPLOY_TRIGGER_MODE=live` → Dokploy API) and is the operator's **staging walkthrough** ahead of prod. The **live on-stage 2nd-Pariwar demo (real traffic on its own `/p/<id>/` URL) is a TRACKED FOLLOW-ON** (`.decision-log.md` + deferred-work, owner BigDev), to run once the operator confirms staging green — explicitly NOT a merge gate.

2. **Trustee-facing audit-log integrity check** per Epic 1 demoable closure beat C11 — both Pariwars' audit chains intact.

3. **Cross-Pariwar adversarial read test** passes (architecture §5.4 CI gate; any leak is P0).

### 2.6 Record provisioning

1. **Append decision entry to `.decision-log.md`** (per the template) documenting the new Pariwar's provisioning: `pariwar_id`, jurisdiction, URL path prefix, branding bundle SHA, image SHAs per deployable workspace, trustee authorization references.

2. **Update Pariwar inventory** (operations policy commits the inventory location). Capture: Pariwar list, per-Pariwar URL paths, per-Pariwar trustee panel, per-Pariwar legal-counsel review status.

3. **Migration trigger evaluation** per A-12 (FR-62): if second-Pariwar provisioning is the trigger for Dokploy → Kubernetes migration, record the trigger event and route to the migration runbook (out of Story 0.1 scope; owned by future story).

## 3. Rollback procedure

Provisioning is largely additive (new rows tagged with new `pariwar_id`); rollback considerations:

1. **Remove the new Pariwar's URL path routing.** Pull the Cloudflare configuration changes; the new Pariwar's path prefix returns 404 / unavailable banner.

2. **Disable the new Pariwar's data access.** Architecturally, `pariwar_id` is first-class with RLS; setting the Pariwar to an inactive state in the Passport prevents application access. Do NOT delete the rows — they may contain trust-relevant data even pre-launch.

3. **Decommission the per-Pariwar build profile** by reverting the `turbo.json` / `apps/mobile/eas.json` additions. Re-deploy without the new profile.

4. **Roll back communications-channel provider provisioning** by decommissioning the per-Pariwar provider accounts.

5. **Record rollback in `.decision-log.md`** with the rationale, trustee authorization for the rollback, and the disposition of the new Pariwar's seeded data.

### Forbidden actions

- ❌ Deleting `pariwar_id`-tagged rows during rollback. The data may be needed for forensic or trust-account reconciliation. Inactive ≠ deleted.
- ❌ Re-using a `pariwar_id`. Once allocated, a `pariwar_id` is permanent; rollback marks it inactive, never re-allocates.
- ❌ Cross-Pariwar data migration during provisioning or rollback. Architecture §1.2 RLS commitment: data does not cross `pariwar_id` boundaries. Any cross-Pariwar action is a trustee-ratified, separately-runbooked operation.
- ❌ Bypassing the cross-Pariwar adversarial read test. The test is a P0 gate.
- ❌ Provisioning a Pariwar without legal counsel review per Story 0.13.

## 4. Verification checks

- [ ] **`pariwar_id` allocated and unique.** Query confirms no collision.
- [ ] **URL path scope assigned and routes correctly.** Test request to `/p/<short-name>/` returns the new Pariwar's surface.
- [ ] **Branding bundle applied.** Admin and member surfaces for the new Pariwar render with the new logo + color tokens.
- [ ] **RBAC seeded for new Pariwar.** Catalog query confirms 12 canonical roles present for new `pariwar_id`.
- [ ] **Initial admin grants applied.** Test login with initial admin user; access via passkey + step-up OTP per Story 1.9.
- [ ] **Niyamavali seeded.** Public Niyamavali surface (Story 2.5) renders the new Pariwar's version.
- [ ] **Cross-Pariwar adversarial read test passes.** No leakage between Pariwars (architecture §5.4 CI gate).
- [ ] **Audit chain intact for both Pariwars.** Integrity-check job emits clean verdicts for both.
- [ ] **Build profile present in `turbo.json` + `apps/mobile/eas.json`.** Profile is a profile addition, not a convention change.
- [ ] **Communication channels configured per Pariwar.** Provider abstraction config (Story 5.3) shows per-Pariwar provider IDs.
- [ ] **Migration trigger evaluated.** A-12 (FR-62) trigger evaluation outcome recorded.
- [ ] **Trustee authorization in `.decision-log.md`.** Entry present with required fields.
- [ ] **Legal counsel review status recorded.** Per Story 0.13.

## 5. Contact escalation list

- **Primary (provisioning execution):** Infrastructure on-call.
- **Co-signer (provisioning is a trust-ratified action):** Engineering Lead AND ≥1 trustee from the existing Pariwar.
- **Pariwar-Passport authoring:** Solo Builder + trustee chair on rota of the new Pariwar.
- **Cross-Pariwar isolation violation (P0; RLS leak):** Trustee Panel chair on rota AND Audit-mirror integrity-check on-call.
- **Migration trigger fire (A-12 FR-62):** Engineering Lead AND Trustee Panel chair on rota; routes to the Kubernetes migration runbook (out of Story 0.1 scope).
- **Legal counsel review gap:** Legal counsel contact per Story 0.13 engagement letter; Trustee Panel chair on rota.

---

## Changelog

| Date | git SHA | Author | Material edit? | Re-sign required? | Ledger entry |
|---|---|---|---|---|---|
| 2026-05-29 | _initial_ | Solo Builder | initial | yes (≥2 trustees) | _pending_ |
| 2026-06-15 | _Story 1.15_ | Solo Builder | **yes — AS-BUILT reconciliation** (§0 added; server-minted `pariwar_id` + the GLOBAL `pariwar.provision` gate + self-scoped write + env-resolved `DeployTrigger`; Cloudflare path-routing GATED → straight-to-Dokploy) | **yes (≥2 trustees)** | _pending_ |
