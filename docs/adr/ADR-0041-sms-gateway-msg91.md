# ADR-0041: SMS gateway — MSG91 Flow v5 behind the existing SMS seam (every text and both login codes), named template values, and a template pre-flight

> **Status:** drafted
> **Date:** 2026-10-17 (date entered current status)
> **Author:** BigDev (Solo Builder)
> **Ratifying trustees:** — (populated at `ratified`)
> **Supersedes:** —
> **Superseded by:** —

## Context

This ADR records a **vendor / cloud-control decision**: which SMS gateway carries the texts and login codes the platform already
composes, and how it is called. It is the SMS-provider ADR that [`-322`](../../.decision-log.md#decision-2026-10-12-322) recorded as owed
(*"row 6-37's create-story owes an SMS-provider ADR (ADR-0027 / -0028 / -0040 precedent)"*). The build decisions are
[`-345`](../../.decision-log.md#decision-2026-10-17-345) (MG1–MG17, Story 6.37); the vendor choice is
[`-314`](../../.decision-log.md#decision-2026-10-10-314) decision 1 (*"MSG91 is the SMS gateway "for now" — behind the existing SMS
seam, so a later vendor is another adapter"*).

- **The property it controls.** Architecture §2.2 commits SMS-DLT-transactional as the primary OTP channel; §3.4 commits the channel
  abstraction and the per-member fallback by DLT SMS. The texts' WORDS are fixed elsewhere (the registries and i18n, Story 6.34's typed
  slots); this ADR fixes only the transport.
- **⛔ No SMS can reach a real gateway today.** The shipped `packages/channels/src/providers/sms-app.ts` posts a generic
  `{sender, to, template_id, message}` with `Authorization: Bearer` and expects `messageId`. MSG91's Flow v5 takes an `authkey` header,
  MSG91's OWN template id and the template's NAMED variable values (`##name##`), ⛔ the finished text — against MSG91 every success would
  be classified `unknown`.
- **⭐ The deciding fact: MSG91 reports most errors ASYNCHRONOUSLY.** A Flow call with a fake authkey answered HTTP 200
  `{"type":"success"}` (Story 6.37 F9). `realTimeResponse` returns an error only on a SECOND identical call. Without a check of its own,
  a broken account or template would be recorded `accepted` — and on the correction chase, 6.19c D22's `reachedBySms` (the input of the
  Trustee-ratified [`-252`](../../.decision-log.md#decision-2026-09-27-252) closure-for-silence, *"accepted by the network"*) would count
  the family reached.
- **Deployment.** Dokploy compose with `restart: unless-stopped`; staging and production both run `NODE_ENV: production`. An api that
  refuses to start is a restart loop of EVERY route.
- **Residency.** Member names (in the claim texts) and mobile numbers pass through MSG91 as a processor. Architecture Project Context
  (*"PII residency in India per DPDPA posture; final scope per counsel"*) ⇒ "an India-region processor" is OUR reading of a posture
  line, ⛔ a ratified constraint — the ADR-0040 precedent.
- **Deadline:** none for the build (nothing is in production). Ratification is roster **Row 32 (a)** — a go-live gate, ⛔ a merge fence.

## Decision

**Every SMS — the correction / closure / certificate texts, the suspicion notices, the neighbours' request, and both login codes — is
sent through MSG91's Flow v5 API by a native-`fetch` client behind the existing `SmsMessagingHandle` seam, carrying each template's
NAMED values; and a read of each template from MSG91 (a "pre-flight") gates the send, because MSG91's own answer cannot.**

Load-bearing details:

- **The request.** `POST <origin>/api/v5/flow` (origin default `https://control.msg91.com`), headers `authkey`, `content-type` and
  `accept: application/json`; body `{template_id, short_url: "0", recipients: [{mobiles: "91XXXXXXXXXX", <name>: <value>, …}]}` — one
  recipient per call; ⛔ `realTimeResponse`; ⛔ `CRQID`; a 9 s client timeout. `short_url` is ALWAYS `"0"` (MSG91 would otherwise
  rewrite the app link). The number is `normalizeMobile(to)` without the `+`.
- **Acceptance.** `accepted` ⇔ HTTP 2xx AND `type: "success"` AND a request id (`message`). Errors are classified by MSG91's `code`
  (string or number; a blank code is ⛔ code) onto the EXISTING error classes — `auth` now means *"the gateway ACCOUNT refuses"* (key,
  balance, IP, route); a LISTED code keeps its class whatever the status, an UNLISTED one takes its HTTP status's class on a 401·403 /
  429 / 5xx (`-346`) — then, with ⛔ code, by HTTP status (401 / 403 `auth`, 429 `rate_limited`, 5xx `api_unavailable`), then by the two
  documented messages (MSG91's 401 *"Auth Key missing"* names its code `auth:authkey_missing`); anything else `unknown`. ⛔ New class,
  ⛔ migration. ⛔ A redirect is followed (the `authkey` header would follow it).
- **Template ids.** The existing `sms.dlt.template_id.*` secret keys hold MSG91's 24-hex template id; the DLT template id, the sender id
  and the Unicode type live ON MSG91's template. A value that is not 24-hex is refused locally.
- **Login codes.** Through Flow (templates 15 / 16, variable `otp`) — ⛔ SendOTP, ⛔ voice retry. The code is generated and verified by
  us, as today.
- **The pre-flight.** MSG91's `getTemplateVersions` is read for each template: the version MSG91 marks ACTIVE (`active_status` `"1"` —
  ⚠ an INFERENCE from the panel's *"Mark default"*: MSG91 returns the field but does ⛔ document its meaning; Row 32 (d) records its meaning in writing,
  `-345` S1; if more than one version is active, EVERY one must pass) must have a text equal to ours (after NFC / line-ending /
  trailing-space canonicalisation), its `sms_type` must be UNICODE exactly when the text needs it (template 14 (en) carries an em dash),
  and a DLT id must be present. Only MSG91's DOCUMENTED refusals are definite — HTTP 401, and the 200 `status:"error"` body (a bad key
  and an unknown id look the same); any other non-2xx or error-looking body is a TRANSIENT. In `apps/jobs` and `apps/api` the results
  are held in ONE memo per process (a pass 1 h, a fault 5 min, a transient 60 s — `-346`).
  - The sweeps that already HOLD (suspicion notices, the neighbours' request) hold the run on any fault — ⛔ slot used.
  - The correction / closure / certificate sweeps have ⛔ hold (adding one is the Panel's — `-322` §0): there ONLY a PROVEN fault (a
    malformed template id; the SEND key's own refusal) ends a row; every other reason, and every transient, is alarmed and the text is
    SENT.
  - The api refuses to start only on: a blank authkey; a blank or malformed OTP id; or the send key's refusal (`-345` MG5's list). Three
    CONFIG-LOAD faults outside that pre-flight list also stop it, each on its own basis: a read-key secret name that resolves blank
    (MG17 (b) — Story 6.37 Debug Log (i)); a `SMS_GATEWAY_API_URL` that is ⛔ a bare origin, at config load in every environment (MG10 —
    Debug Log (c); a blank value is the default); a secret NAME that is set but cannot be resolved (the pre-6.37 secret precedent).
    Anything else — one MSG91 id under both OTP keys included — starts with an error log; after boot the check is advisory, runs off
    the login request, and a non-pass is logged once per read.
  - The pre-flight uses the send authkey; if an SMS-only key may ⛔ read templates, an OPTIONAL read-only key
    (`SMS_GATEWAY_PREFLIGHT_KEY_SECRET_NAME`) is used instead (`-345` MG17).
- **One gateway, ⛔ provider switch.** The generic Bearer contract is REMOVED. `SMS_GATEWAY_API_URL` is the API origin;
  `SMS_GATEWAY_API_KEY_SECRET_NAME` holds the authkey; the sender-id settings retire. A later vendor is another adapter (`-314`).
- **Delivery reports are ⛔ consumed here** — they are row `6-37b-msg91-delivery-reports` (`-345` MG1).

## Alternatives considered

- **MSG91 SendOTP v5 for the login codes** — rejected: a second client and response shape (`request_id`), a template that must say
  `##OTP##` (breaking Story 6.34's lower-case slot names), only templates made in its own OTP section, and the same false `success` to a
  bad key. Its voice retry would need its own ADR (architecture §2.2). Revisit if the Row 30 (b) device proof shows Flow is too slow.
- **The legacy `sendhttp` API with `DLT_TE_ID`** — rejected: it sends the finished text, which DLT matching then scrubs, and it is the
  older surface.
- **The official npm `msg91` SDK (2.2.8)** — rejected: it calls the legacy `api.msg91.com` with `flow_id`, depends on axios ^0.27, and
  its source repository returns 404. Native `fetch` keeps zero new dependencies and the injectable-`fetch` test seam (the ADR-0028 /
  -0040 precedent).
- **A second gateway now (a selectable provider switch)** — rejected: ⛔ second gateway exists, and keeping the generic contract
  selectable is a footgun (it matches ⛔ real gateway). A later vendor is another adapter behind the same seam.
- **⛔ Pre-flight (trust MSG91's `success`)** — rejected: F9 — every account or template fault would be recorded `accepted`, widening
  `-252` cl.1's "accepted by the network" for template faults.

## Consequences

- **Operational.** Roster Row 32 (`sms-gateway-msg91-provisioned`) carries the provisioning: the authkey (its rule, IP security ON with the
  production — and staging — egress whitelisted, or a separate staging key); the PE-TM chain bound on SmartPing and the sender id mapped;
  each template created in MSG91 from the DLT sheet's MSG91 column with its DLT id, `smsType` from the TEXT, marked default, the panel's
  URL shortener off; the pre-flight green on the deployed api and jobs. Rotating the authkey needs a process restart (resolved once at
  boot — the existing SMS precedent). The compose file carries the secret-name lines — the send key and the optional read key — for
  api and jobs.
- **Security.** A vendor-trust dependency for member mobiles and the claim texts' names. MSG91 has ⛔ request signature on its delivery
  webhooks (static headers only) — row 6-37b's concern. ⛔ Secret, number or text is logged, alarmed or stored by the adapter.
- **Residency.** MSG91 processes member names and mobiles; counsel clears it as a processor (Row 32 (g)); its data-processing terms are on
  record (Row 32 (f)).
- **Performance / cost.** One MSG91 template read per template per TTL per process; one Flow call per text. A Hindi template, and
  template 14, are Unicode (more segments per text).
- **Failure modes accepted.**
  - `accepted` is ⛔ delivery.
  - The pre-flight reads TEMPLATES, ⛔ the account's ability to SEND: zero balance, SMS not enabled for the key, an unwhitelisted IP for
    sends and a blacklisted sender all still answer `success` ⇒ `accepted`. So do a DLT scrubbing failure, a template fault behind a
    fail-open send, and a template that breaks inside a cached pass. ⇒ the residual of `-323` R2, WIDENED to account causes, and kept
    from real families by Row 32 (i): ⛔ claim-text template id is provisioned until row 6-37b (delivery reports) is `done`
    (`-345` MG15).
  - MSG91 has ⛔ idempotency key — a retried `api_unavailable` can text a person twice (recorded, ⛔ hidden); code 311 (*"the first SMS
    will be delivered and the second will be rejected"*) is a may-have-sent final.
  - A false content mismatch (MSG91's stored text form is undocumented) holds the suspicion / peer-mesh runs and is alarm-only on the
    api — until Row 32 (e) records a real response.
  - Under the send-key arm (MG17 (a)), a template-read refusal is taken as PROOF the key cannot send — it refuses api boot and ends a
    correction / closure / certificate row. That rests on S3 (an SMS-only key MAY read templates), which MSG91's docs do ⛔ settle ⇒
    production uses that arm only once MSG91 confirms S3 in writing (Row 32 note (6.1)); until then, the separate read key.
  - Every alarm reaches the logs only until `onAlarm` is wired (Row 32 (h)).
- **Migration / pivot.** A new gateway is a new adapter behind `SmsMessagingHandle`, a new ADR superseding this one, and its own
  roster row; the registries, the typed slots and the send core are unchanged.

## References

- [Source: `.decision-log.md`, Decision 2026-10-10-314] — the vendor choice (MSG91 *"for now"*) and this row's charter
- [Source: `.decision-log.md`, Decision 2026-10-17-345] — Story 6.37's build decisions (MG1–MG17)
- [Source: `.decision-log.md`, Decision 2026-10-12-322] — §0 (the correction / closure / certificate paths), C1, C7, and the ADR owed
- [Source: `.decision-log.md`, Decision 2026-10-12-323] — R2 (the delivery-report residual)
- [Source: `.decision-log.md`, Decision 2026-09-27-252] — cl.1 *"accepted by the network"* (Trustee-ratified)
- [Source: architecture.md §2.2, §3.4] — the OTP channel and the channel abstraction
- [Source: epics.md, Story 6.37] — owning Story
- [Source: `docs/launch-gate-inventory/inventory-roster.md`, Rows 30, 32] — the go-live gates
- [Source: `docs/knowledge-transfer/adr-index.md`] — the live index row
- [Source: `docs/adr/ADR-0027-push-provider-selection.md`, `ADR-0028-whatsapp-provider-selection.md`, `ADR-0040-staff-email-transport.md`] — provider-ADR shape
- [Source: https://docs.msg91.com/sms/send-sms.md; https://docs.msg91.com/sms/module.json (Flow v5, `getTemplateVersions`)] — read 2026-10-17
- [Source: https://msg91.com/help/api/what-are-the-reason-for-error-codes-received-under-the-api-failed] — the error codes
- [Source: https://msg91.com/help/api/what-is-a-real-time-response-and-how-does-it-work-] — the asynchronous errors
- Memory: [[feedback_architecture_vs_adr_boundary]] — discipline anchor

---

## Changelog

| Date | Status flip | Author | Notes |
|---|---|---|---|
| 2026-10-17 | (initial draft) | BigDev (Solo Builder) | Authored under Story 6.37 Task 0.4 (Decision `2026-10-17-345` MG13) |
| 2026-10-17 | (draft — amended) | BigDev (Solo Builder) | Story 6.37 code review round 2 (P16; Decision `2026-10-17-346`): the classification order as built, the active-version inference (S1) stated, documented refusals only, the transient TTL, the api's full refusal list, both compose lines, the S3 dependency of the send-key arm |
