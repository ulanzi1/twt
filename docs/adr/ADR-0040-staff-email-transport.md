# ADR-0040: Staff email transport (AWS SES v2 `ap-south-1` and Zoho ZeptoMail, one selected by config) and two new identity-data read paths for it — an amendment of ADR-0009 §5's "sole query path"

> **Status:** drafted
> **Date:** 2026-10-09 (date entered current status)
> **Author:** BigDev (Solo Builder)
> **Ratifying trustees:** — (populated at `ratified`)
> **Supersedes:** — (⛔ a whole-ADR supersession: this ADR AMENDS one clause of ADR-0009 §5 in its body — the ADR-0004 in-body amendment form; ADR-0009 stays `ratified`)
> **Superseded by:** —

## Context

This ADR records a **vendor / cloud-control decision** and **a change to a ratified identity-data control**, both forced by a
Trustee-ratified ruling the stack could not otherwise build.

- **The ruling.** [`-262`](../../.decision-log.md#decision-2026-09-28-262) FQ3 A (Trustee-ratified): *"THE PARIWAR ADMIN IS SENT AN
  EMAIL saying 'a claim was refused on suspicion of a nominee change — open the list' — ⛔ no names and no note in it; those stay in the
  console. It goes to every Pariwar Admin of that Pariwar."* Story 6.25 builds it; its build decisions are
  [`-299`](../../.decision-log.md#decision-2026-10-09-299) (RE1–RE17).
- **⛔ No email transport exists** (Story 6.25 F1): no workspace carries a mail SDK; `@twt/channels` is push / WhatsApp / SMS / Telegram
  only; the admin password-reset "email" is a stub log. `docs/degradation-policy/comms-templates/email-channel.md` (`drafted`) has
  waited since 2026-05-29 on *"email-provider selection (operations-policy ADR …)"* — this is that ADR, for the staff email only.
- **The admin email is Tier-1 ciphertext only** (`admin_credentials.email_ciphertext`, `piiColumn(1,'admin_email')`, NOT NULL) plus a
  Tier-2 blind index; *"NEVER a plaintext email column"*. ⛔ No production code decrypts it today (`decryptEmail` has one caller — a
  fake-KMS unit test; the API selects the ciphertext at login and never decrypts it) ⇒ the staff email's child is the **first
  production decrypt of an admin email** (F16).
- **ADR-0009 §5 (ratified, [`-059`](../../.decision-log.md#decision-2026-06-21-059))** says of the WHOLE identity family (`users`,
  `admin_credentials`, `webauthn_credentials`, `recovery_codes`, `admin_sessions`, `step_up_otps`): *"The confidentiality of identity
  data rests on three other controls: the narrow apps/api auth repo as the sole query path, crypto-at-rest (…), and table-level
  GRANTs."* Emailing every Pariwar Admin needs to READ who they are (`role_grants`, `users.status`, whether `admin_credentials` exists)
  and each one's address ciphertext — from `apps/jobs`, which cannot import `apps/api`. ⇒ **FQ3 A cannot be built without new read
  paths** — a FOUND conflict between two ratified texts, resolved here by a new ADR, ⛔ by re-reading ADR-0009.
- **FOUND drift — recorded, ⛔ regularised silently (F3).** The "sole query path" is ALREADY not literally true of `users`: three
  domain modules query it directly — `packages/domain/src/claim/admin-directory.ts` (`listAdminsByRole`),
  `packages/domain/src/claim/shepherd-assign-persist.ts`, `packages/domain/src/pool/fixed-amount-panel.ts` — and ⛔ no ADR records
  them. `admin_credentials` itself IS still queried only by `apps/api/src/modules/auth/admin/admin-auth.repo.ts` (plus one test;
  `scripts/provision-admin.ts` reaches it through that repo). This ADR names those three readers as found; it does ⛔ not decide
  whether they stay (that is a separate question for the next ADR-0009 review).
- **GRANTs and roles (F17).** The identity tables are GRANTed to `twt_app` only (`0005_admin-identity-auth.sql`). `apps/jobs` connects
  via `SERVICE_DATABASE_URL` — in production a BYPASSRLS login that is a member of `twt_service` (0007's DD-3) — and its scoped
  transactions `SET LOCAL ROLE twt_app`. ⚠ ⛔ No committed file says which role the production jobs login holds or what it may
  SELECT; in dev/CI it is the superuser `twt_dev_app`. ADR-0009 records a graduation trigger to a dedicated `twt_auth` role.
- **Residency (F12).** Architecture Project Context lines 49 / 100: *"Data residency: PII in India…"*; *"PII residency in India per
  DPDPA posture; final scope per counsel."* A staff address handed to an email provider is Tier-1 PII to a processor. ADR-0027 /
  ADR-0028 (the provider-ADR precedent) are silent on residency. ⇒ "an India-region provider" is OUR reading of a posture line, ⛔ a
  ratified constraint; and delivery necessarily hands the address to each admin's OWN mailbox provider, wherever it is hosted.
- **Deadline:** none for the build (nothing is in production); this ADR's ratification is roster **Row 24 (a)** — a go-live gate.

## Decision

**Staff email is sent by a provider-agnostic port in `apps/jobs` with TWO real adapters — AWS SES v2 in `ap-south-1` and Zoho
ZeptoMail — exactly one selected per environment by `STAFF_EMAIL_PROVIDER`; and ADR-0009 §5's "sole query path" is AMENDED to admit
exactly two further read paths (Q1, Q2) for it.**

> **Amendment — ADR-0040 (Story 6.25, `-299`, 2026-10-09) of ADR-0009 §5's identity-data controls, effective when this ADR is
> ratified:** besides the apps/api auth repo, identity data may be read by exactly these two query sites, both in
> `packages/domain/src/claim/suspicion-staff-email.ts` (or a sibling module named in Story 6.25's File List), both fenced by an
> exact-allowlist source test:
> - **Q1 — the recipient eligibility fragment.** Reads `role_grants` (`pariwar_admin`, Pariwar-wide, created at or before the refusal's
>   chain start), `users.status = 'active'` and `EXISTS (SELECT 1 FROM admin_credentials …)`. It projects ⛔ identity column — only
>   the `user_id` it already holds from `role_grants`. It runs cross-tenant on the jobs BYPASSRLS pool (the sweep's selector) and on a
>   Pariwar-scoped `twt_app` transaction (the child's locked re-check).
> - **Q2 — `readAdminEmailCiphertext(db, userId)`.** Selects ONLY `email_ciphertext` for ONE `user_id`, called only by the staff-email
>   child AFTER its claiming transaction commits; the decrypt happens in `apps/jobs` (the jobs KMS deps hold the same admin KEK by value)
>   and the plaintext exists only in that child's memory until the provider call.
> The other two controls stand unchanged: crypto-at-rest, and table-level GRANTs. ⛔ No other new path is admitted; a third is a new ADR.

Load-bearing details:

- **The decrypt helper is relocated, ⛔ copied.** `ADMIN_EMAIL_FIELD_CLASS`, the admin email's envelope context and `decryptAdminEmail`
  move into `packages/domain/src/encryption/admin-email.ts` (the 8.8 / 6.19b relocation precedent); `apps/api` re-exports / delegates —
  byte-identical, proved by the unedited `auth-primitives.test.ts` plus an encrypt⇒decrypt cross-check. The barrel makes it importable
  anywhere ⇒ its callers are allowlisted by the same source fence.
- **Providers.** **(A) AWS SES v2, `ap-south-1` (Mumbai)**, REST JSON signed with SigV4 by `aws4fetch` 1.0.20 (a static IAM access key
  in Secret Manager for v1; GCP→AWS web-identity federation is the recorded alternative — §Alternatives), built with **`retries: 0`**:
  SES has ⛔ idempotency token and AWS documents that a timed-out or 5xx SendEmail may already have been accepted, so `aws4fetch`'s
  default (up to 10 retries on 5xx / 429) could send a second email unseen — the only retry is pg-boss's, on a recorded row.
  **(B) Zoho ZeptoMail** — renamed *Zoho CPaaS* on 2026-09-23 — `POST {host}/v1.1/email`, `Authorization: Zoho-enczapikey <token>`, host
  default `https://cpaas.zoho.in` (the India data centre; the account's region is fixed by its sign-up domain — verified at
  provisioning, Row 24 (b)). ZeptoMail has ⛔ pre-flight endpoint usable with the send key (recorded no-op). Each adapter's request
  shape, error-name classification table (transient / held / `rejected`), pre-flight and tracking-off settings are recorded in
  `-299` §3, Story 6.25's Task 0.2 record (re-verified against the providers' current docs on 2026-10-09) and the adapter's module header.
  BigDev chose to build BOTH (`-299` §3) so that go-live picks ONE by config — **this ADR, when ratified, records which provider is
  enabled in production** (the Panel's choice; ⭐ recommended: SES, the documented India region); the other stays built and unset.
- **Plain text only, UTF-8, tracking OFF.** ⛔ HTML (⛔ tracking pixel, ⛔ link rewriting). SES: ⛔ configuration set unless one is
  configured, ⛔ OPEN/CLICK event destination on it or on any default configuration set of the sender identity, and VDM engagement metrics OFF at the set and the account (the per-message
  `ConfigurationOverrides.Tracking` override is ⛔ used — it needs IAM `ses:ApplyTrackingConfigurationOverrides`, else the send fails).
  ZeptoMail: the Mail Agent's email-tracking toggle off and `track_opens` / `track_clicks` false on every send.
- **Classification by error NAME, ⛔ by HTTP status alone** — SES returns a paused account, the sandbox and an unverified MAIL FROM
  domain as 400s; a status-based `4xx ⇒ rejected` would permanently spend once-ever rows during a fault fixed the next day. Account /
  config faults and ANY unrecognised name are HELD (the row stays `attempting`, alarmed once per distinct fault), ⛔ final.
- **Fail-closed config.** Unset ⇒ every email held, ⛔ a row written, one alarm per sweep. A SET but unresolvable secret name HOLDS
  (⛔ fails boot — `apps/jobs` also runs the money jobs). The sweep runs a provider pre-flight (SES `GetAccount`: `SendingEnabled` and
  `ProductionAccessEnabled`) and holds on any failure.
- **The DB role (F17).** Q1's selector runs on the jobs service login (BYPASSRLS); Q1's re-check and Q2 run under `SET LOCAL ROLE twt_app`
  (whose GRANTs on the identity tables already exist). ⇒ GRANTs **cannot** tell `apps/api` and `apps/jobs` apart today: both reach the
  identity tables as `twt_app`, and the jobs login's own privileges are uncommitted. ⭐ This ADR does ⛔ not graduate to `twt_auth`; it
  records that Q1 / Q2 make ADR-0009's graduation trigger MORE relevant (a second app now reads `admin_credentials`) and requires, at
  Row 24 (b), that the production jobs login's privileges be stated and able to make Q1's and Q2's reads (Q1's selector directly;
  the re-check and Q2 through `SET LOCAL ROLE twt_app`).

## Alternatives considered

- **ONE adapter (SES only)** — the story's recommendation; ⛔ chosen by BigDev, who asked for both so the go-live choice is a config
  switch. Cost of both: a second adapter and its tests to keep; recorded.
- **`@aws-sdk/client-sesv2`** — current and maintained, but ~2 MB plus `@smithy/*`, and its own transport defeats the injectable-`fetch`
  test seam. Rejected for `aws4fetch` (zero deps; ⚠ unpublished since 2024-08 — revisit if SigV4 changes or a CVE lands).
- **SendGrid / Postmark / Mailgun** — ⛔ India region ⇒ conflicts with the residency READING unless counsel clears it. Deferred, ⛔
  rejected: revisit if counsel clears a non-India processor.
- **A `@twt/channels` email provider, or a `packages/email`** — rejected for now: ⛔ second consumer exists (the password-reset link,
  the enrollment link and the degraded-posture email are unbuilt) — [[feedback_no_premature_package]]. Trigger: the second consumer.
- **Wiring the API's KMS `auditHook` into jobs** — rejected here: `apps/jobs` cannot import it, and it would start auditing EVERY jobs
  decrypt through the global chain lock. ⇒ the child's decrypt writes ⛔ KMS audit line (as every jobs decrypt today) — recorded.
- **GCP→AWS web-identity federation instead of a static key** — the stronger credential (no long-lived secret). Deferred to
  provisioning (Row 24 (b)); the adapter takes credentials from config, so the switch is config + a token-exchange helper.
- **Reusing `listAdminsByRole`** — rejected: it drops a Pariwar Admin with a blank display name and caps at 50 (F4), which would narrow
  *"every Pariwar Admin"* silently.

## Consequences

- **Operational.** Row 24 (`staff-email-transport`) carries the provisioning: SPF / DKIM / DMARC on the sender domain; the secrets; the
  provider out of its sandbox (SES production access); IAM `ses:SendEmail` + `ses:GetAccount`; tracking verifiably off; a MONITORED
  `STAFF_EMAIL_FROM` / Return-Path (`accepted` ⛔ means delivered; bounces are ⛔ ingested); the jobs login's DB privileges stated.
  Rotating a credential needs a process restart (resolved once at boot, the SMS precedent).
- **Security.** A vendor-trust dependency (the ESP) for the staff address and the message; the message itself names ⛔ no one. Two new
  identity-data read paths, fenced in code. The first production decrypt of an admin email happens in `apps/jobs`, with ⛔ KMS audit
  line (recorded).
- **Residency.** ⛔ ESP keeps a delivered email in India — the admin's own mailbox provider receives it ⇒ counsel clears delivery
  either way (Row 24 (c)).
- **Failure modes accepted.** `accepted` is ⛔ delivery; an ambiguous failure — a timeout, a dropped connection, an SES 5xx / 408 or a
  ZeptoMail 5xx (`-299` RE5-bis) — may produce a second email (recorded `may_have_sent`, alarmed); every loss is visible only through an alarm that reaches no one until `onAlarm` is wired (Row 24 (e) = Row 22 (d)).
- **Migration / pivot.** A provider change is a config switch between the two built adapters, or a new adapter behind the same port; a
  third identity read path, or a move to `twt_auth`, is a new ADR.

## References

- [Source: `.decision-log.md`, Decision 2026-09-28-262 FQ3 A] — the ruling (Trustee-ratified)
- [Source: `.decision-log.md`, Decision 2026-09-28-261 D2 B; 2026-09-21-239 (a)] — the obligation it builds
- [Source: `.decision-log.md`, Decision 2026-10-09-299] — Story 6.25's build decisions (RE6, RE7, RE8)
- [Source: `docs/adr/ADR-0009-admin-authentication.md` §5] — the amended clause; its `twt_auth` graduation trigger
- [Source: `docs/adr/ADR-0004-canonical-json.md`] — the in-body amendment form
- [Source: `docs/adr/ADR-0027-push-provider-selection.md`, `ADR-0028-whatsapp-provider-selection.md`] — provider-ADR shape
- [Source: `docs/degradation-policy/comms-templates/email-channel.md`] — the provider-ADR placeholder (`drafted`)
- [Source: architecture.md Project Context, lines 49 / 100] — the residency posture
- [Source: epics.md, Story 6.25] — owning Story
- [Source: `docs/launch-gate-inventory/inventory-roster.md`, Row 24] — the go-live gate
- [Source: `docs/knowledge-transfer/adr-index.md`] — the live index row
