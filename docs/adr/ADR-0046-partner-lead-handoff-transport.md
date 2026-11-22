# ADR-0046: The partner lead-handoff transport — one HMAC-signed HTTPS POST per consented lead, at least once, outbound only; partners are downstream consumers, never a source of member truth

> **Status:** drafted
> **Date:** 2026-11-21 (date entered current status)
> **Author:** BigDev (Solo Builder)
> **Ratifying trustees:** —
> **Supersedes:** — (⛔ a whole ADR. For THE LEAD TRANSPORT ONLY it supersedes architecture §3.7's "signed JWT (asymmetric …)" and §5.9's partner-JWT signing-key and secret-separation sentences — by Decision `2026-11-21-483` QE3 (A), each annotated in place, ⛔ rewritten)
> **Superseded by:** —

## Context

- **The commitment.** Epic 12, Story 12.5's acceptance criteria: a webhook to the module's `lead_handoff_url` with a *"signed payload
  (HMAC-SHA-256 with module's signing key from Secret Manager), member-consented data only (consent-checked via Story 2.7 at the moment
  of handoff — revocation between submission and handoff cancels the delivery), TWT attribution header (`X-TWT-Attribution:
  pariwar=<id>, module=<id>, lead_id=<uuid>`)"*; idempotent, retried on transient failure with exponential backoff, a permanent failure
  *"flagged for partner-relationship review"*; *"every handoff is audit-logged … with full payload reference + delivery status"*. And
  its load-bearing invariant: partners are **downstream consumers**, never state co-owners (quoted in full below).
- **The architecture disagrees on the scheme.** §3.7 says *"partner authentication via signed JWT (asymmetric — partner holds TWT's
  public key for verification)"* and §5.9 keeps *"Partner JWT signing keys"* in a separate high-sensitivity project. Story 12.1
  stores one Secret Manager NAME per MODULE (`lead_handoff_signing_key_secret_name`, immutable — ADR-0044); 12.2 validates its shape only
  (`2026-11-01-433` QE11). This was 12.1's carried item C7.
- **The governance came first.** The build decisions QE1–QE26 are Decision `2026-11-21-483` (author-commit, alone). Sending a member's
  details to a partner at all — which details, how long the Trust keeps them, the no-sale line — is the Trustee Panel's, on counsel's
  advice: RULED `2026-11-21-484` (Trustee-ratified, DR + KB) Q1 C … Q7 A, every built answer as put. Counsel's return, the privacy-policy
  edit before publication and the rest of roster **Row 54** (`partner-lead-handoff-live`) gate GO-LIVE, ⛔ the merge.
- **Nothing reaches a partner from 12.5 alone.** The seam (`sealLeadMemberFields`, `recordLeadHandoff`) has NO production caller until
  Story 12.3's lead route; the sweep claims nothing while there are no rows.
- **`-484` Q1 C allows a second route** (the member fills in the partner's own form; "the Trust sends nothing"). This ADR is about the
  FIRST route only; the second is 12.5's K-12, owed to a correct-course before 12.3.

## Decision

### 1. The record and the sweep (QE4, QE6, QE13)

ONE row per lead in `marketplace_lead_handoffs` (migration 0215) — the outbox and the delivery record in one — written by
`recordLeadHandoff` in 12.3's lead transaction, beside `module.lead_submitted`. A per-minute jobs sweep
(`apps/jobs/src/scheduler/module-lead-handoff.ts`) is the only sender. The row's writes are QE6's table W1–W13 (record, claim, delivered,
release, exhausted, hold, hold expired, permanent, cancel, lapse, erasure, purge, requeue) and W14 (the waiting cancel, added by Decision
`2026-11-22-487` (2)); a guard trigger refuses every other edge, a
DELETE, an identity change and any change to the fields other than present → absent. Every settle is compare-and-set on the claim token.
⭐ *Dated 2026-11-22 — Story 12.5b (author-commit `2026-11-22-489` QE4, QE5; `-484` Q1 C):* an offer that uses the partner's OWN page
(`lead_route = 'partner_form'`) **never has a handoff row**: `submitModuleLead`, the projector, `sealLeadMemberFields` and
`recordLeadHandoff` refuse it (`ModuleLeadRouteRefusedError`), and migration `0216`'s BEFORE INSERT trigger
`marketplace_lead_handoffs_route_guard` refuses the row in the database whatever the commands do. Should one exist anyway, the sweep
decides it FIRST — S4 and the waiting pass cancel it `cancelled:partner_form_route` at once (⛔ secret, DNS, member read, decrypt, audit
line or request) and raise ONE `module_lead_handoff_route_refused` alarm; the claim COALESCEs the missing URL's authority so such a row is
never stranded. The same tick also removes the partner-form visit records more than 90 days old (W15, LAST — `-486` R2 C).

**Delivery is AT LEAST ONCE.** A timeout or a dropped connection after the request was written is retried. The partner dedupes on
`Idempotency-Key: <lead_id>` — THE dedupe key. Retries follow `1 min, 5 min, 30 min, 2 h, 6 h, 24 h` (7 attempts, ≈ 32.6 h); the 7th
transient outcome is final (`failed_delivery:retries_exhausted`). 401 / 403 / 404 and an address refusal are COUNTED TRANSIENT (setup
faults get the window to be mended, with a `module_lead_handoff_setup_fault` alarm); every other 4xx and every 3xx are permanent at once.
A fault that DEFINITELY sent nothing (the secret, KMS, the audit line, the database, DNS) is a HOLD: the attempt is given back, retried in
a minute, final after 24 h of unbroken holds. A key the key service REJECTS is a KMS hold that ends the tick, ⛔ a final failure
(`-487` (1)): the rejection cannot tell a wrong key reference, which rejects every row, from one bad row. Sealed fields that will not parse
or authenticate, or that fail the schema, are a permanent failure (`failed_delivery:fields_unreadable`). Every `failed_delivery` raises
ONE `module_lead_handoff_failed` alarm — the epic's "flagged for partner-relationship review". A staff requeue (`requeueLeadHandoff`,
W13) is the one edge out of `failed_delivery`, while the fields are kept; it has no caller until an admin view exists (K-3).

**The member's side decides first, on every attempt.** Before any request the sweep re-checks, in one committed scope transaction: P0 the
read is sound; P1 the consent for THIS lead stands (read through `consent_artifact_ref = lead_id`, revoked rows included — ⛔ by subject);
P2 not erased; P3 still a member (not `withdrawn`, not `terminated`; a suspended member is still one); P4 not account-frozen; P5 no
standing death report (stays stopped after a claim settles — `-484` Q7 A). A P1–P5 failure CANCELS, finally, with the fields dropped at
once. A P0 failure cancels NOTHING: an unsound read (or a consent read that returns a full page) is a `db` HOLD — nothing is sent, the
attempt is given back, the row comes back in a minute — and a member-side read that throws is a `db` hold that ends the tick.
A lead whose offer the Trust withdrew (`trustee_archived`) is cancelled too; an offer that simply ended is delivered. ⚠ A change that
lands after that commit is not honoured for the request in flight (a sent lead cannot be recalled); `-484` Q6 A makes the follow-up a
staff duty (K-13).

**Every pending lead is re-checked every tick** (`-487` (2), W14; widened by `-488`). Before it claims anything, the sweep re-reads
P0–P5 and the offer's withdrawal for EVERY `due` row — one waiting out a retry, and one due now that the claim may not reach this tick
(its module's key held, its host in the tick's breaker, the tick ended by a global hold, the budget spent). It cancels the row at once
on a stop, so the Trust's copy goes within the sweep's minute (`-484` Q4 A's *"Removed at once if the send is stopped"*), ⛔ at the end
of a retry's backoff or at the row's turn. An unsound read there writes nothing; the row's own attempt holds it. The pass is paged,
under its own 10 s budget, and resumes from a cursor — ONE full cycle a pass: it runs from behind the cursor to the end, wraps to the
top and stops where it began, so a pass that stopped part-way still leaves the next tick re-checking every row. A throw in the pass ends
the PASS with one alarm, ⛔ the tick: the claim still runs (`-488` (2)). ⚠ Residuals, stated: (i) under a backlog larger than one
budget, one full cycle takes several ticks, so "within the minute" holds for a queue the pass covers in one budget; (ii) a lead whose
read ALWAYS throws ends every pass at itself — the cursor then sits on it, so the next cycle checks every other lead first and that
one last, with one `waiting_pass_failed` alarm a tick; its own attempt holds it (`db`) until the read is mended or the hold expires.

### 2. The signing scheme and rotation (QE3 (A))

**HMAC-SHA-256 with the module's secret** — the epic's wording:

```
X-TWT-Signature: t=<unix seconds>, v1=<lower-case hex HMAC-SHA-256(secret, "<t>." + body)>
```

Exactly ONE `v1`, signed with the secret's `latest` Secret Manager version, resolved per row by the module's NAME (cached per tick, ⛔
across ticks). **Rotation is the RECEIVER's dual-secret window:** ops add a new version; for the agreed window the partner accepts both
the old and the new secret; TWT signs with `latest` from its next tick (§5.9's "dual-secret window", by analogy — that sentence is about
provider webhooks). Several modules of one partner may name the same secret.

**The receiver guide** (what a partner must implement — and what the partner agreement names, Row 54 (e) / (f)):
1. Recompute `HMAC-SHA-256(secret, "<t>." + raw body bytes)` over the bytes AS RECEIVED (⛔ a re-serialised JSON) and compare to `v1`
   in CONSTANT TIME.
2. Refuse when `|now − t| > 5 minutes`.
3. Dedupe on `Idempotency-Key` and answer **2xx** to a replayed key (a 409 to a replay is recorded as a permanent failure).
4. Answer 2xx only once the lead is safely stored; 5xx / 408 / 429 for "try again". The body of any response is ignored.
5. Optionally return `X-Partner-Reference: <≤ 64 of A–Z a–z 0–9 _ . ->` — stored as an advisory reference, nothing more.

**Recorded costs and variances.** (i) No non-repudiation: the partner holds the key, so a signature cannot prove in a dispute that TWT
sent a lead; TWT's evidence is its own row, audit line and the partner's 2xx. (ii) **Variance from §3.7 / §5.9's partner JWT** —
superseded for this transport, annotated in place. (iii) **Variance from §5.9's high-sensitivity tier**: the secret lives in the PROD
project, because 12.1's NAME carries no project. `boot.ts` wires `resolveSmsDltConfig`, which calls `resolveChannelSecret` and then
`resolveSecretValue`; that reads `GOOGLE_CLOUD_PROJECT`, and a Secret Manager NOT_FOUND comes back as null. Outside production (no
`NODE_ENV=production`, no `GOOGLE_APPLICATION_CREDENTIALS`, no `DRIZZLE_FORCE_SECRET_MANAGER=1`), `resolveSecretValue` falls back to an
environment variable named after the secret: upper-cased, with each non-alphanumeric character turned into `_`. A leaked secret allows
forging a lead TO that partner; it opens no member data. (iv) The secret reaches the partner over a secure channel at onboarding (Row 54 (f)).
The reserved `ADR-NNNN-partner-jwt-signing-key-storage` slot is kept for a future asymmetric scheme.

### 3. The envelope v1 (QE5 (A), QE11 (A), QE12)

The body is the canonical JSON (sorted keys, RFC 8785) of:

```
{ envelope_version: 1, lead_id, nonce, module_id, pariwar_id, partner_id, submitted_at,
  member: { full_name, mobile, district, preferred_language },
  attribution: { source: 'twt', pariwar_id, module_id, lead_id } }
```

- `member` is EXACTLY the four fields the member confirmed on the form (`-484` Q3 A: *"The four, for every partner. The member sees all
  four on the form before agreeing."*) — the whole name, the `+91` mobile, the district or null, `hi` | `en`. ⛔ DOB, Aadhaar / PAN,
  membership state, contribution or claim data, nominee, health data, free text, or `member_id`.
- They are sealed BEFORE 12.3's transaction as ONE Tier-1 envelope (`module_lead_fields`, `rowKey = lead_id`) and decrypted inside ONE
  audit line per attempt. Dropped at once on a cancel or an erasure, and 30 days after delivery or a final failure (`-484` Q4 A; the
  number is counsel's to change).
- `nonce` (16 random bytes) keeps the audit line's body hash from being a guessable fingerprint; it is ⛔ the dedupe key.
- The bytes are IDENTICAL on every attempt (the time lives only in the signature header).
- **The envelope version IS the contract version in v1.** A partner needing more fields needs a new version AND a Panel ruling; a
  per-module allow-list or a per-partner contract record is K-4.

Headers sent: `Content-Type: application/json`, `X-TWT-Attribution: pariwar=<id>, module=<id>, lead_id=<uuid>` (the epic's form,
verbatim), `X-TWT-Signature`, `Idempotency-Key`. ⛔ Any other.

### 4. The send-time address policy (QE8 (A))

- The stored URL is re-parsed under 12.1's write rule (`url_refused`), and only the DEFAULT port is admitted — any explicit port is
  `port_refused`, with no lookup and no request (a partner on `:8443` must be re-authored — ADR-0044; 12.2's wizard does not yet refuse it,
  K-6; Row 54 (k)).
- The host is resolved (`dns.lookup`, all answers, 5 s); the WHOLE send is refused if ANY answer is non-public: IPv4's special-purpose
  ranges, and every IPv6 address outside `2000::/3` or inside `2001::/23`, `2001:db8::/32`, `2002::/16`, `3fff::/20`; an IPv4-mapped
  address is judged as its IPv4.
- The connection goes to the CHECKED address (closing DNS rebinding), with TLS verified against the HOSTNAME (`servername`), `agent:
  false`, ⛔ redirects (a 3xx is an outcome), and ONE 10 s wall-clock deadline over connect, write and response. The outcome is fixed by
  the status line; the body is drained up to 64 KiB and never parsed.
- Production egress is the architecture's named allow-list (Row 54 (h)).

### 5. Audit (QE14)

ONE `module.lead_handoff_fields_decrypted` line per attempt that decrypts (the decrypt is its `mutate` and nothing else), and ONE bare
`module.lead_handoff_attempted` line per REQUEST — locator `module_lead/<lead_id>/attempt/<n>`, `requestPayloadHash = sha256(body)` (the
epic's "full payload reference"), the HTTP status or `599` (timeout) / `598` (network). That line is written AFTER the response and
BEFORE the settle, with up to 3 tries. ⚠ **If all three fail, the sweep gives up on the row:** it writes nothing more, raises an alarm
and ends the tick. The row stays `attempting` and lapses at the end of its lease (W10). It is then sent again (at least once), or, if that
was its last attempt, it ends `failed_delivery:outcome_unknown`. So a request CAN be left with no attempted line; the alarm and the
lapse are its record.
⚠ **Variance from the epic's "every handoff is audit-logged … + delivery status":** the line exists per request; an outcome with no
request (a cancel, a refusal, an expired hold) is recorded on the row and alarmed when it fails, without a line of its own. ⛔ A member field or the URL in any line.

### 6. Variances from the architecture tree and the epic (recorded in `-483` QE20)

- The architecture tree's `apps/api/.../partner-leads/` and `packages/contracts/module-leads/`: there is ⛔ API surface in 12.5 — a
  jobs sweep sends (§3.7 "TWT API generates … → POSTs"), and the member lead route is 12.3's, in `apps/api/src/modules/marketplace/`.
- The epic's "via Story 1.12 keyed store": the row's primary key, status and claim token are the idempotency key; a second store entry
  would be a second record of one fact.
- §3.7's breaker ("opens after N consecutive failures; half-open after cooldown"): a PER-TICK breaker — after one transient failure,
  DNS hold or address refusal, that authority's other rows are not claimed this tick. No cross-tick state, no open-circuit view (K-10,
  K-3). §3.7's "dead-letter to the partner-coordination admin queue": an alarm, and K-3's future view.

### 7. ⭐ The partners-as-downstream-consumers invariant (the epic's load-bearing commitment)

**The rule, in the epic's words:** partner integrations *"consume explicitly consented lead-handoff events only"* and *"must NOT become
authoritative sources of member lifecycle, validity, contribution, or claim-state truth"*. The boundary, as the epic states it: *"(a)
partner webhooks are **outbound only** (TWT → partner) — no partner webhook endpoints inbound to TWT exist for membership state; (b) any
partner-provided data (e.g., lead-outcome confirmation, partner-account-status updates) is treated as **advisory information**, never
authoritative; (c) partner integrations cannot register inbound APIs that update member lifecycle state, validity status, contribution
status, or claim state"*.

**Explicitly prohibited integration patterns** (the epic, verbatim): *"(a) partner CRM bidirectional sync that updates TWT's member
records; (b) partner-driven membership state changes (e.g., "LIC system says member is no longer eligible — auto-suspend"); (c) partner
data overwriting TWT's canonical member fields; (d) partner systems becoming the source of truth for any TWT data"*.

**Acceptable integration patterns** (the epic, verbatim): *"outbound lead handoff (this story); partner-provided lead-outcome feedback
recorded as informational only (advisory, not authoritative); partner branding and module metadata consumed inbound at module-authoring
time only (Story 12.2 wizard)"*.

**The philosophy** (the epic, verbatim): *"TWT's canonical state authority is preserved; partner systems are CRM/sales consumers, not
membership co-owners; this prevents partner-driven state drift, CRM synchronization creep, and governance erosion"*.

**How 12.5 enforces it.** There is NO inbound partner path; the only partner-provided value TWT keeps is `partner_reference` (≤ 64 safe
characters from one response header), advisory, never returned to a member. The fence (`scripts/partner-boundary-invariant`, a CI job;
`apps/api/tests/integration/partner-boundary.spec.ts`): ⛔ unguarded partner-shaped body route; the reference's names in four files only
and never in the member-facing status read; the transport uses only the allow-listed member / consent / claim READS; the response body is
never parsed; production passes no test seam. ⚠ The fence proves the absence of the patterns it names — ⛔ that no future path could
launder partner data.

**⭐ THE REVIEW QUESTION — every future inbound integration must answer it, at its own create-story, under §0 (the first is K-5's
lead-outcome callback):**

> **Does any value this partner sends change what TWT believes about a member's lifecycle, validity, contributions or claims?**
> **If yes, it is refused.**

An inbound feature that passes it must also: be advisory in storage (a separate, partner-labelled record, ⛔ a column of a member,
contribution, claim, pool or validity table); persist then acknowledge (§3.11); authenticate the partner; and extend the fence in its own
story.

## Alternatives considered

- **(A2) Two `v1` signatures during a rotation.** Needs a new resolver for enabled versions, a `versions.list` grant and a rule for when
  the window ends — new capability for no gain over the receiver's window.
- **(B) The architecture's asymmetric JWS (Ed25519, `jti = lead_id`).** Gains non-repudiation and no shared secret; costs a way to give
  partners the public key and, per partner, moving the key to `marketplace_partners` — 12.1's C10, a migration on an immutable table's
  trigger chain. Kept as the reserved slot.
- **(C) Both, per module.** Two code paths and a manifest field.
- **At most once (the 13.1b twin's semantics).** Every timeout would end `outcome_unknown` and a partner outage of minutes would lose
  leads for good — a member's registered interest silently dropped.
- **Re-reading the member's record at send** instead of sealing what they confirmed: the partner would receive what the record says at
  send time, ⛔ what the member agreed to share.
- **Any port above 1023:** widens the reachable surface to arbitrary service ports on public hosts.
- **A static bearer token per partner** (`-429` Consequence 3): ⛔ built in v1 — a second NAME per module is a manifest column and a 12.2
  wizard field (K-9).

## Consequences

- **Positive.** A consented lead reaches the partner with provenance and can be deduplicated; a member's withdrawal, membership ending,
  erasure, reported death or the Trust's withdrawal of the offer stops a pending send; nothing a partner says changes member truth; the
  copy of the member's details is short-lived and erasable.
- **Negative / accepted.** No non-repudiation (§2). Up to 7 requests per pass reach a partner that does not dedupe (the agreement's
  dedupe clause is Row 54 (e)). A sent lead cannot be recalled. A cancel or a final failure does not give a member their place back on
  that offer (one registration per offer — `-427` Consequence 3), and a cancel on a death report is final even if the report proves false
  (`-484` Q7 A's accepted cost). A partner on a non-default port, or one that needs fewer fields or a bearer token, cannot be onboarded
  yet (K-6, K-4, K-9).
- **Go-live, ⛔ merge:** roster Row 54 (a) MET by `-484`; (b) counsel, (c) the policy edit, (d) consent copy and the withdraw act (12.3),
  (e) a signed partner agreement, (f) secrets provisioned, (g) the jobs login's grant, (h) egress, (i) 12.3 + 12.4, (j) someone owns the
  failure alarms, (k) no live module with an explicit port — all open.
- **Re-open when:** the first inbound partner feature (K-5); a partner asks for non-repudiation (B); a second envelope version (K-4).

## References

- `_bmad-output/planning-artifacts/epics.md` — Epic 12, Story 12.5 (the ACs and the invariant quoted above).
- `_bmad-output/planning-artifacts/architecture.md` — §3.7, §3.11, §3.12, §5.9, "Egress controls" (each partner-JWT sentence annotated
  "superseded for the lead transport by `-483` QE3").
- `.decision-log.md` — `2026-11-21-483` (QE1–QE26), `2026-11-21-484` (Q1 C, Q2 A … Q7 A), `2026-11-22-487` and `2026-11-22-488` (the code review's decisions),
  `2026-10-31-427`, `2026-10-31-429`, `2026-11-01-433`, `2026-10-30-423`.
- `_bmad-output/implementation-artifacts/12-5-module-lead-handoff-transport-partners-as-downstream-consumers-invariant.md` — the W table,
  S1–S10, P0–P5, the K items.
- [ADR-0044](ADR-0044-module-manifest-schema-versioning.md) — the immutable manifest that holds the URL and the secret NAME (cross-
  referenced, ⛔ edited: an accepted ADR is not annotated in place).
- [adr-0001](adr-0001-credential-escrow-mechanism.md) — credential escrow (the per-module secrets belong in its inventory — Row 54 (f)).
- `docs/launch-gate-inventory/inventory-roster.md` — Row 54 `partner-lead-handoff-live`.
- Code: `packages/domain/src/marketplace/{lead-handoff,lead-envelope,lead-member-fields}.ts`, `packages/domain/migrations/0214_…`,
  `0215_…`, `apps/jobs/src/scheduler/{module-lead-handoff,partner-lead-client}.ts`, `scripts/partner-boundary-invariant/`.

## Changelog

| Date | Status | Change |
|---|---|---|
| 2026-11-21 | drafted | Authored by Story 12.5 (Task 8) on the decisions of `-483` and the Panel's ruling `-484`. ⚠ `drafted`, ⛔ ratified — ⛔ trustee ratification is claimed, and none is a merge fence. Roster Row 54 does ⛔ list this ADR's ratification as a leg; whether it should is for the Panel when the first partner agreement is presented. |
| 2026-11-22 | drafted | Story 12.5 code review, patch 12: §1 says a P0 failure HOLDS (it said every failure cancels), and adds Decision `2026-11-22-487` — a rejected key is a KMS hold, and the waiting pass (W14); §2 (iii) names the resolver `boot.ts` wires and its non-production env fallback; §5 names S9's give-up (a request can be left with no attempted line). Still `drafted`; no decision changed. |
| 2026-11-22 | drafted | Story 12.5 code review, rounds 2 and 3: §1's re-check covers EVERY `due` lead, one full cycle a pass (it wraps to the top), and a throw in it ends only the pass (Decision `2026-11-22-488`); the residuals stated. Still `drafted`. |
| 2026-11-22 | drafted | Story 12.5b (`2026-11-22-489` QE17): a dated line at §1 — a `partner_form` offer never has a handoff row (the commands, the 0216 trigger); the sweep cancels one `partner_form_route` with an alarm; W15 purges the 90-day visit records. Still `drafted`; no 12.5 decision changed. |
