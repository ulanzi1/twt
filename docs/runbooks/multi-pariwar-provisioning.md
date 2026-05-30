# Runbook: Multi-Pariwar Provisioning

> **Status:** draft (author-committed; awaiting ≥2-trustee sign-off per ledger)
> **Owner role:** Infrastructure on-call (Solo Builder primary at v1; backup engineer per A-13) with Engineering Lead co-sign at provisioning trigger
> **Last material edit:** 2026-05-29 by Solo Builder (initial)
> **Architectural authority:** architecture.md §1.2 (Multi-tenant isolation — Postgres RLS via `pariwar_id`), §2.5 (Multi-Pariwar active scope — URL path prefix), §5.14 (Per-Pariwar infrastructure isolation strategy), AR-25 (multi-Pariwar URL path scope), FR-59 (`pariwar_id` first-class + RLS), FR-60 (branding bundle), FR-61 (separate-app-per-Pariwar build), FR-62 (Dokploy auto-deploy + K8s migration path); epics.md Epic 1 Story 1.7 (Pariwar-Passport data model + branding bundle), Story 1.15 (Dokploy auto-deploy + multi-Pariwar provisioning), Story 7.2 (Pool naming — dual-identifier UX-DR72)

Multi-Pariwar provisioning is a Dokploy auto-deploy + branding-bundle swap, NOT a code fork. URL path scope is the active-Pariwar dimension. Per-Pariwar build profile is a `turbo.json` + `apps/mobile/eas.json` addition.

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
   - Per-Pariwar custom fields if any (per Story 10.12 JSONB; per-Pariwar JSON Schema per architecture §1.7).

2. **Trustee review of Passport.** ≥2 trustees from the existing Pariwar review the new Passport. Authorization recorded in `.decision-log.md`.

3. **Commit Passport to repo.** The Passport is a code-reviewed artifact; commit triggers CI.

### 2.2 Database setup

1. **Schema migrations: none new for provisioning.** Per architecture §1.2, RLS is enforced via `pariwar_id`; new rows tagged with the new ID inherit isolation automatically. There is no new schema for a new Pariwar.

2. **Initial data seeding for the new Pariwar:**
   - Apply the RBAC seed script (per `rbac-seed-reset.md` §2.4) scoped to the new `pariwar_id`. This seeds the 12 canonical roles for the new Pariwar.
   - Apply initial admin role grants per Passport.
   - Seed the Niyamavali rule registry (per architecture §1.10 reference, Story 2.3) with the canonical Niyamavali version applicable to the new Pariwar's jurisdiction. The Niyamavali may be the same as Bihar's at v1 or jurisdiction-specific per legal counsel review (Story 0.13).
   - Seed any per-Pariwar custom-field schema (per Story 10.12).

3. **Verify per-Pariwar RLS isolation.** Run the architectural CI gate (architecture §5.4 cross-Pariwar adversarial read test). Confirm queries from one Pariwar cannot read the other's rows.

### 2.3 URL path scope + edge

1. **Configure Cloudflare routing** (per architecture §1.13 / Story 1.13). The new path prefix routes to the same backend; the backend dispatches per `pariwar_id` derived from the path prefix per architecture §2.5.

2. **Bot Management + Turnstile** apply to all Pariwars uniformly (Story 1.13). No per-Pariwar bypass.

3. **Rate limiting + login wall + forced pagination + honeypot/noindex** (Story 1.14, FR-89-92) apply uniformly; per-Pariwar config goes through Story 5.3-equivalent abstraction if rate-limit thresholds differ per jurisdiction.

### 2.4 Apps and per-Pariwar build profile

1. **Per-Pariwar build profile** in `turbo.json` + `apps/mobile/eas.json` per architecture §Workspace Layout R-5. The Bihar profile is the v1 reference; the new Pariwar adds a profile, not a code branch.

2. **Trigger Dokploy auto-deploy** per FR-62 / Story 1.15. The deploy workflow applies the per-Pariwar build profile + branding bundle swap (FR-60) for each deployable workspace (`apps/admin`, `apps/member`, public Astro shell per Story 2.5).

3. **Verify image SHAs.** Each deployable workspace gets a Pariwar-specific image built from the per-Pariwar profile + branding bundle. Image SHAs differ per Pariwar; confirm SHAs against expected.

4. **Per-Pariwar communication channels** (per architecture §3.4 / Story 5.3, 5.4 WhatsApp + Telegram + SMS provider abstraction): provision provider accounts per Pariwar; configure abstraction's per-Pariwar config (FR-100 Phase-2 forward-compat hooks per architecture §1.13).

### 2.5 Verify provisioning end-to-end

1. **Multi-Pariwar provisioning walkthrough** per Epic 1 demoable closure beat C1 (epics.md line 972). Demonstrate:
   - Second Pariwar provisioning via the FR-61/FR-62 Dokploy auto-deploy flow with FR-60 branding-bundle swap.
   - Second Pariwar serves traffic on its own URL path scope (AR-25).
   - Independent rule set (Niyamavali version + per-Pariwar custom-fields).

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
