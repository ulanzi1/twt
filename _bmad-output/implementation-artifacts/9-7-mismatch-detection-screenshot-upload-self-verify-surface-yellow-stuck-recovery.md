---
baseline_commit: 925874c4f93c8352371b75d0a1ad542609b1ed2e
---

# Story 9.7: Mismatch Detection + Screenshot Upload + `<SelfVerifySurface>` Yellow-Stuck Recovery

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As **Sushil, whose yellow pill hasn't flipped to green within the expected window**,
I want **to upload a payment screenshot when the matcher fails to confirm my UTR, and a self-verify recovery surface that explains why and offers a way out**,
so that **I have a path out of a yellow/red-stuck state without depending purely on automated matching — and I'm never stranded**.

---

> **Build-order reality (READ THIS FIRST — 9.7 is the member-facing RECOVERY CONSUMER of an already-live producer, plus a NEW upload transport. It is NOT the mismatch producer.)**
>
> The **mismatch DETECTION is already DONE and LIVE.** Story 9.4's matcher (`packages/domain/src/reconciliation/matcher.ts` → `apps/jobs/src/matcher/matcher-worker.ts`, cron `RECONCILIATION_MATCH` 6×/day) already emits `contribution.reconciliation-mismatch` on the alert stream for a **found-and-rejected** deposit (`wrong_pool` / `amount_mismatch`), with a `.strict()` payload carrying `{ poolId, memberId, alertId, utr, reason, bankStatementEntryId, detectedAt, matcherRun }` (`packages/domain/src/contribution/events.ts:182`). The **red-pill read model is DONE**: `deriveContributionStatus`' red arm + `listMemberContributionHistory` / `getMemberAttestedContribution` (`packages/domain/src/contribution/history.ts`) already resolve a member's pool to `red` on the exact `CONTRIBUTION_MISMATCH_EVENT_TYPE`. The **`<StatusPill status="red">`** DS component is DONE (Story 9.6). **Do NOT re-emit, re-derive, or re-render the mismatch — those are frozen and correct.** The epics.md 9.7 AC "the matcher emits a mismatch event when …" is a restatement of what 9.4 already ships; 9.7 does **not** touch the matcher's emission logic.
>
> **What does NOT yet exist — 9.7's actual job (four seams to close):**
> 1. **The member is NOT notified on mismatch.** FR-32 requires "member notified" on mismatch, and `contribution_mismatch` is **already a reserved `alert_category` + deep-link target** (`packages/contracts/src/alerts/alert.ts`, `deep-links/deep-link.ts:94` → `contributions/:pool_id`), but **8.8 never built the notification** — the matcher worker's mismatch branch (matcher-worker.ts:354-408) has **no push seam** (only the confirmed branch has `enqueueConfirmedNotify`, matcher-worker.ts:329-346). 9.7 wires the reserved category.
> 2. **The My Pool card cannot surface a mismatch.** `/api/v1/member/active-contribution` computes `myContribution: attested ? 'attested' : 'none'` (`apps/api/src/modules/member-pool/handlers.ts:538`) — a BINARY that has no red state, so today the card can never show the yellow→red flip or offer recovery.
> 3. **There is no screenshot-upload transport.** No storage port, no event, no endpoint for a member's PhonePe/GPay/Paytm screenshot. FR-32 makes this the ONE budgeted friction surface for the member.
> 4. **There is no `<SelfVerifySurface>`.** The UX-DR28 member recovery surface (status explanation + screenshot upload + helpline CTA) does not exist.

---

## Scope — what this story IS and IS NOT

| ✅ IN scope (build it) | ❌ OUT of scope (do NOT touch) |
|---|---|
| **The mismatch push notification (FR-32 "member notified").** Wire the RESERVED `contribution_mismatch` alert_category: a `buildContributionMismatchNotification` + `enqueueContributionMismatchNotification` seam in `apps/jobs/src/scheduler/contribution-notify(-triggers).ts` (mirror the 8.8 `contribution_confirmed` D6 pattern exactly), a new `QUEUE_NAMES.CONTRIBUTION_NOTIFY_MISMATCH`, the worker + `boot.ts` registration, and the **post-commit best-effort call from the matcher worker's mismatch branch** (mirror matcher-worker.ts:329-346's confirmed seam — a failed enqueue NEVER fails the committed mismatch). | **The mismatch PRODUCER** — `matchPool`, `appendReconciliationMismatch`, `EMITTABLE_MISMATCH_REASONS`, the matcher worker's classification/emission (Story 9.4, DONE/LIVE). 9.7 adds a best-effort push AFTER the commit; it does NOT change what/when the matcher emits. |
| **The screenshot upload transport.** A NEW `SelfVerifyScreenshotStorage` port (contracts) mirroring the 6.5 `ClaimDocumentStorage` SHAPE + its GCS/in-memory/local-fs adapters (platform-adapters); accepts **image OR PDF** (UX §11: photo-only mobile / file picker). A member API endpoint `POST /api/v1/member/self-verify/screenshot` (member session; scan→store→emit; AR-45-wrapped; dignified 4xx/503, never a 500) reusing the 9.3 upload-core discipline. Reuse the abstraction-first `StatementScanner` virus-scan seam. | **The Story 9.8 reconciliation review queue.** 9.7 ROUTES to it via a reserved event seam (no queue render, no trustee actions here) — the SAME discipline as 9.1's takeover-flag and 9.3's `manual_transcription_requested` feeding 9.8. Do NOT build a queue/admin surface. |
| **The `reconciliation.self-verify-screenshot-uploaded` event** (NEW `reconciliation.*` type — dodges the Story 8.10 `contribution.*` exactly-three fence, the 9.3 D6 precedent). Appended on the **alert stream** (Decision D2 — co-located with the mismatch verdict it responds to). Register in `reconciliation/events.ts` + the `@twt/events` registry. The 9.8 review-queue input; **does NOT auto-confirm or remap** (Story 7.6 facilitated-recovery invariant). | **The `contribution.*` vocabulary + the 8.10 fence.** 9.7 adds NO `contribution.*` type (a screenshot is not a contribution verdict). `no-ingest-path.test.ts` MUST stay green verbatim. Do NOT add a fourth `contribution.*` ingest door. |
| **The member self-verify READ** (`@twt/domain`, `reconciliation` or `contribution` namespace): "does THIS member have an unresolved mismatch on their live pool — what reason, and has a screenshot already been uploaded?" — powers the surface's default/uploaded/resolved states. Hard-scoped to the caller's own `memberId` (the FR-12A self-view discipline, history.ts D1). | **The frozen 5-state derivation** (`deriveContributionStatus`, `CONTRIBUTION_MISMATCH_EVENT_TYPE`, precedence). 9.7 READS the red arm; it adds no state and re-tunes no precedence. |
| **Extend the My Pool card read** — `myContribution` grows from `'attested' \| 'none'` to also carry a `mismatch` state (+ the machine reason-code) so `<ActiveContributionCard>` flips the pill to `<StatusPill status="red">` and links the recovery entry (Journey 1). | **A My-Pool-card redesign.** Extend the existing read + pill only; no layout rework. The confirmed-only meter stays confirmed-only (yellow/red never pollute it — the 8.3/8.4 invariant). |
| **The `<SelfVerifySurface>` mobile component** (`apps/mobile/components/self-verify/`): status explanation (empathy copy mapped from the machine reason-code, Pattern-4 — never "Error/Failed/Invalid") + screenshot-upload affordance (image+PDF picker) + `<CallHelplineCTA>` (Story 8.11); states default / uploaded / resolved; consumes `<StatusPill status="red">`; bilingual. Two entry points: (a) direct prompt on the red/mismatch card; (b) the FR-32 hidden **"Trouble with UTR?"** affordance in the yellow (still-verifying) state. | **`<ContributionTimeline>`** (UX §11 L1917) — a separate component, not this story. Do NOT build the full timeline; the SelfVerifySurface is the yellow-stuck recovery node only. |
| **Gates + i18n parity + friction-budget declaration** — the screenshot upload is a **budgeted friction surface** (payer = Sushil; protected subsystem = Reconciliation integrity); declare it in `friction-budget.md`. PII-scrape (no PII in object keys / event payloads / audit). `pnpm ci:local` green incl. the 8.10 fence. | **Auto-confirmation from a screenshot** (FR-32 / Story 7.6). A screenshot NEVER flips green and NEVER remaps a wrong-pool payment — only the Story 9.8 trustee path (or the automated matcher) confirms. This is a load-bearing invariant, tested. |

---

## Acceptance Criteria

*(From epics.md §Story 9.7 L3265–3279, anchored on FR-32 [prd.md L612-619], FR-30 mismatch-notify [prd.md L601], UX-DR28 + UX §11 `<SelfVerifySurface>` [L1926-1933], Story 7.6 facilitated-recovery invariant.)*

**AC1 — The mismatch event flips the member's pill to red AND notifies the member (FR-32 "member notified").**
**Given** the Story 9.4 matcher has emitted `contribution.reconciliation-mismatch` for (member, pool) — LIVE today for `wrong_pool` / `amount_mismatch`
**When** the verdict commits
**Then** the member's `<StatusPill>` renders `red` (already true via history.ts + 9.6 — verify, do not rebuild), the `/api/v1/member/active-contribution` card exposes the `mismatch` state (+ reason) so `<ActiveContributionCard>` shows the red pill and the recovery entry, **and** a `contribution_mismatch` push notification is enqueued **post-commit, best-effort** from the matcher worker's mismatch branch (a failed enqueue never fails the committed verdict — the 8.8 confirmed-seam D6 posture), deep-linking to `contributions/:pool_id`.

**AC2 — The member sees `<SelfVerifySurface>` with empathy copy explaining the mismatch (UX-DR28 / UX §11).**
**When** a member with an unresolved mismatch opens the recovery surface (from the red card, the push deep-link, or the FR-32 hidden "Trouble with UTR?" affordance in a still-verifying yellow state)
**Then** the surface shows: a plain-language explanation of **why still pending** (mapped from the machine reason-code to dignified Pattern-4 copy, bilingual — never "Error/Invalid/Failed"), the screenshot-upload affordance, and an always-reachable `<CallHelplineCTA>` (Story 8.11); the surface's state is `default` (no upload yet) / `uploaded` (awaiting staff review) / `resolved` (advanced to green) per a member-scoped self-verify read.

**AC3 — Screenshot upload is mandatory ONLY here — hidden in the happy path (FR-32).**
**When** a member uploads a PhonePe/GPay/Paytm screenshot (image or PDF)
**Then** the upload is accepted ONLY for a pool where the member has an unresolved mismatch (or the explicit FR-32 "Trouble with UTR?" fallback) — there is **no happy-path screenshot door**; the bytes are virus-scanned then stored in the private `SelfVerifyScreenshotStorage` bucket (opaque non-PII key, signed-URL read only, Tier-1 at rest); a `reconciliation.self-verify-screenshot-uploaded` event is appended on the alert stream carrying the object key + mismatch reference; the upload **routes to the Story 9.8 reconciliation review queue** as a reserved seam; the endpoint is AR-45-resilient (dignified 4xx/503, never a 500).

**AC4 — The upload path is PURE EVIDENCE INTAKE: `record evidence → notify reviewer`, never `change reconciliation outcome` (load-bearing; Story 7.6 facilitated-recovery).**
**When** a self-verify screenshot is uploaded
**Then** the path stores the blob, appends `reconciliation.self-verify-screenshot-uploaded`, and notifies the Story 9.8 reviewer via the review-queue seam — and does **NOTHING** to the reconciliation outcome: it does **NOT** auto-confirm, does **NOT** un-confirm, does **NOT** silently remap a wrong-pool payment, and does **NOT** re-run the matcher; the member's status stays `red`/`mismatch` until the Story 9.8 trustee review confirms (`contribution.confirmed`) or the automated matcher later matches. **All reconciliation authority stays with the 9.4 matcher + the 9.8 trustee flow** (see Dev Notes "pure evidence intake"). A test asserts no code path in 9.7 emits `contribution.confirmed`, mutates the mismatch, or triggers a match as a side effect of an upload.

**AC5 — Accessibility + grief-context + friction-budget.**
**Then** the surface is screen-reader-accessible (explanation announced; upload + helpline are ≥56pt reachable targets; the red pill conveys state via text+icon+ARIA, not colour alone); the upload is declared in `friction-budget.md` as a budgeted surface (payer = member; protected = Reconciliation integrity); no PII in object keys, event payloads, or audit context (the mismatch payload's `utr` masking discipline — full UTR only where load-bearing, masked at the audit/log boundary).

---

## Tasks / Subtasks

- [x] **Task 1 — The `reconciliation.self-verify-screenshot-uploaded` event (AC3).** *(reconciliation/events.ts + the 9.3 D6 namespace precedent.)*
  - [x] Add `RECONCILIATION_SELF_VERIFY_SCREENSHOT_UPLOADED_EVENT_TYPE = 'reconciliation.self-verify-screenshot-uploaded'` to `packages/domain/src/reconciliation/events.ts`; add its `.strict()` Zod payload: `{ poolId (uuid), memberId (uuid), alertId (uuid), objectKey (min 1), mismatchReason (ContributionMismatchReasonSchema, nullable — a "Trouble with UTR?" fallback upload may have no live mismatch), contentType, uploadedAt (datetime) }`. Add to `RECONCILIATION_EVENT_TYPES` + the `RECONCILIATION_EVENT_PAYLOAD_SCHEMAS` `satisfies` map (exhaustive — a new type without a schema is a compile error).
  - [x] Register the type + schema in the `@twt/events` `EVENT_TYPE_REGISTRY` (`packages/events/src/registry.ts`) — the 9.3 reconciliation-event registration precedent.
  - [x] Confirm the Story 8.10 `no-ingest-path.test.ts` fence stays GREEN (this is a `reconciliation.*` type, not a `contribution.*` one — the fence counts `contribution.*` only, the 9.3 D6 verified-not-assumed note).

- [x] **Task 2 — The `SelfVerifyScreenshotStorage` port + adapters (AC3, Decision D1).** *(6.5 `ClaimDocumentStorage` shape; 9.3 D3 "new port, not reuse" precedent.)*
  - [x] `packages/contracts/src/reconciliation/self-verify-screenshot-storage.ts`: the port interface (`put(key, bytes, {contentType})` / `getBytes(key)` / `signedReadUrl(key, ttlSeconds)` / optional `delete(key)`), the accepted MIME set (image/jpeg, image/png, application/pdf — image+PDF per UX §11), and the byte cap (align to the 10 MiB claim-document cap — a screenshot is an image, larger than a CSV). Browser-safe `Uint8Array` bytes, NO `@twt/domain` import ([[project_contracts_domain_bundle_boundary]]). Export from `packages/contracts/src/reconciliation/index.ts`.
  - [x] `packages/platform-adapters/src/self-verify-screenshot-storage/{gcs,in-memory,local-fs}.ts` mirroring `claim-document-storage/` + `bank-statement-storage/`; export from `packages/platform-adapters/src/index.ts`. Own bucket (`SELF_VERIFY_SCREENSHOT_BUCKET`), own key namespace, private, Tier-1 encrypted at rest.
  - [x] Wire `deps.selfVerifyScreenshotStorage` in `apps/api/src/deps.ts` (GCS when the bucket env is set, else local-fs — the `claimDocumentStorage`/`bankStatementStorage` precedent) + `apps/api/src/context.ts` `AppDeps`.

- [x] **Task 3 — The member self-verify upload endpoint (AC3/AC4).** *(9.3 handlers.ts upload-core discipline: guard→scan→store→emit, AR-45, dignified errors.)*
  - [x] `POST /api/v1/member/self-verify/screenshot` (member session; `requireMemberSession`; a member step-up is likely NOT required — this is the member's own payment proof, not a Ravi-mode handover; confirm against the 8.4 attest endpoint's gate). Querystring/body carries the target `poolId` (validated against the member's live assigned pool) + optional `bank`/context; bytes ride multipart.
  - [x] **Mandatory-only-on-mismatch guard (AC3, FR-32):** accept the upload ONLY when the member has an unresolved mismatch for the resolved pool (Task 4 read) OR the request is the explicit "Trouble with UTR?" fallback; otherwise a dignified 4xx (there is no happy-path screenshot door).
  - [x] Reuse the upload-core shape from `apps/api/src/modules/reconciliation/handlers.ts` (multipart read → byte cap/emptiness → `StatementScanner` scan (AR-45) → `SelfVerifyScreenshotStorage.put` (AR-45) → emit `reconciliation.self-verify-screenshot-uploaded` on the ALERT stream via the SAVEPOINT-guarded append; best-effort blob cleanup on append failure). Emit an audit line (`member_self_verify.screenshot_uploaded`, the payment/ `emitAuthAudit` resident-sink discipline — [[project_anonymous_diagnostic_log_convention]]). **Pure evidence intake (AC4 contract): record → notify, never change the reconciliation outcome — no matcher enqueue, no auto-confirm, no remap, no status mutation.** This is a 9.8 review-queue input, not a verdict.
  - [x] Register the route in the API app + document the multipart route by hand (no `.openapi()` on multipart — the 6.5/9.3 precedent).

- [x] **Task 4 — The member self-verify READ (AC2) + My Pool card extension (AC1).**
  - [x] `@twt/domain`: a member-scoped read resolving "unresolved mismatch on the member's live pool?" → `{ mismatch: boolean, reason: ContributionMismatchReason | null, screenshotUploaded: boolean, status: 'default'|'uploaded'|'resolved' }`. Derive `resolved` from a LIVE `contribution.confirmed` (reuse `hasLiveConfirmation`); `uploaded` from a `reconciliation.self-verify-screenshot-uploaded` for (member, pool) with no later confirmation; `default` otherwise. Hard-scoped to the caller's own `memberId` (history.ts D1). Batched event reads (the history.ts batched-verdict precedent), NO per-row queries.
  - [x] Extend `apps/api/src/modules/member-pool/handlers.ts` `activeContribution`: change `myContribution` from `'attested' | 'none'` to also carry `'mismatch'` (+ the reason) by reading the member's red state (reuse `getMemberAttestedContribution`/the new read, scoped to the live pool). Update the `ActiveContributionCardResponse` contract (`@twt/contracts`) + the mobile consumer type. Keep the confirmed-only meter untouched (yellow/red never pollute it).
  - [x] A member endpoint feeding the `<SelfVerifySurface>` (either extend `/api/v1/member/active-contribution` or a dedicated `GET /api/v1/member/self-verify/:poolId` — Decision D5 recommends the dedicated read for the surface's full state; the card carries only the tone + reason for the entry point).

- [x] **Task 5 — The mismatch push notification (AC1, FR-32).** *(mirror the 8.8 `contribution_confirmed` D6 seam EXACTLY.)*
  - [x] `packages/queue/src/index.ts`: add `CONTRIBUTION_NOTIFY_MISMATCH: 'contribution.notify.mismatch'` to `QUEUE_NAMES` (the `CONTRIBUTION_NOTIFY_CONFIRMED` sibling).
  - [x] `apps/jobs/src/scheduler/contribution-notify(-triggers).ts`: a `buildContributionMismatchNotification` (alert_category `'contribution_mismatch'` — ALREADY reserved in the alert union + deep-link grammar; payload_data carries `pool_id` so the deep-link resolves to `contributions/:pool_id`) + template keys, mirroring `buildContributionConfirmedNotification`; the `CONTRIBUTION_NOTIFY_MISMATCH` worker + `boot.ts` `createQueue`/`work` registration; the `enqueueContributionMismatchNotification` pure-enqueue seam exported from `apps/jobs/src/index.ts` (the barrel, no pg-boss/GCS pulled in — the 8.8 confirmed-seam export precedent).
  - [x] **Payload-shape gotcha (verified against `alert.ts:129-133`) — resolve before wiring the builder:** the reserved `contribution_mismatch` alert's `payload_data` is `{pool_id, expected_paise, actual_paise}`, but `contribution.reconciliation-mismatch` carries `{reason, bankStatementEntryId, utr, ...}` with NO amount-comparison fields — and the `wrong_pool` reason has no expected/actual amounts to report at all. Extend the `AlertCategory`/`contribution_mismatch` payload_data Zod schema so `expected_paise`/`actual_paise` are **optional/nullable** (a small, additive contract change, NOT a redesign); do NOT fabricate amounts. `buildContributionMismatchNotification` populates them only when derivable and omits them otherwise, driving the notification body off `reason` (mapped to dignified copy, never the raw enum).
  - [x] Add bilingual mismatch-notification copy to i18n (the `contribution_confirmed` notification-copy precedent); tone-review register (Story 2.2) — dignified, actionable ("we couldn't match your payment yet — here's how to fix it"), never alarming.
  - [x] `apps/jobs/src/matcher/matcher-worker.ts`: in the mismatch branch (after the `appendReconciliationMismatch` commit + `recordResult`, ~L401), add the best-effort post-commit `deps.enqueueMismatchNotify?.(...)` call, IDENTICAL in posture to the confirmed seam (L329-346) — a failed enqueue logs + heals via the next tick, never fails the committed verdict. Thread `enqueueMismatchNotify` through the worker deps + `boot.ts` wiring.

- [x] **Task 6 — The `<SelfVerifySurface>` mobile component (AC2/AC5).** *(UX §11 L1926-1933; the `<ActiveContributionCard>`/9.6 `<StatusPill>` patterns.)*
  - [x] `apps/mobile/components/self-verify/SelfVerifySurface.tsx`: anatomy = status-explanation (empathy copy from `selfVerify.reason.<reason>` bilingual keys, Pattern-4) + `<StatusPill status="red">` + screenshot-upload affordance (image+PDF picker — `expo-image-picker`/`expo-document-picker`, whichever the app already uses; check existing pickers) + `<CallHelplineCTA>` (`apps/mobile/components/common/CallHelplineCTA.tsx`). States default / uploaded / resolved driven by the Task 4 read. ≥56pt targets; `accessibilityLiveRegion` on the state-change; Devanagari no-clip at 360px.
  - [x] Mount the two entry points: (a) the red `<ActiveContributionCard>` shows a "Fix this" affordance → the surface; (b) the FR-32 hidden **"Trouble with UTR?"** disclosure in the yellow (still-verifying) card state → the same surface (the "member explicitly chooses it / NEFT fallback" FR-32 path). The push deep-link (`contributions/:pool_id`) lands on the pool/card, which routes to the surface when `mismatch`.
  - [x] Bilingual copy in i18n (a `selfVerify.*` key set in the already-registered `common` or `contribution` namespace — do NOT add a new namespace [[the memberStatus/statusPill precedent]]); i18n en↔hi parity gate green.

- [x] **Task 7 — Tests + the load-bearing invariants (AC3/AC4).**
  - [x] Domain: the self-verify read (mismatch/uploaded/resolved derivation, member-scope isolation) — pure/DB-integration per the history.ts test style. The event schema `.strict()` round-trip + registry membership.
  - [x] **AC4 teeth (facilitated-recovery invariant):** a test asserting the upload path emits ONLY `reconciliation.self-verify-screenshot-uploaded` (never `contribution.confirmed`, never a remap) and that status stays `red` after an upload until a trustee/matcher confirmation lands.
  - [x] API: the endpoint's mandatory-only-on-mismatch guard (a no-mismatch upload is a dignified 4xx), the AR-45 outage → 503, the scan-quarantine → 4xx, the member-scope guard (cannot upload against another member's pool). Reuse the 9.3 reconciliation handler test harness.
  - [x] Jobs: the matcher worker's mismatch branch fires the best-effort notify and a notify failure does NOT fail the verdict (mirror the confirmed-seam test). The `contribution_mismatch` deep-link target test already exists (deep-link.ts) — confirm still green.
  - [x] Mobile: `<SelfVerifySurface>` renders the three states + label + a11y + icon (the 9.6 `status-pill-render.test.ts` harness pattern; do not stand up a new RN runner).
  - [x] `pnpm ci:local` (all jobs, `--concurrency=4`, DATABASE_URL on :5433 — [[project_ci_local_concurrency_oversubscription]], [[project_ci_actions_suspension_local_mirror]]): the 8.10 `no-ingest-path` fence GREEN verbatim; PII-scrape green (no PII in keys/payloads); friction-budget declared (no baseline auto-raise — [[project_friction_budget_baseline_ratchet]]); i18n parity; per-package `lint`/`typecheck` ([[project_eslint_config_per_package_cwd]]).
  - [x] `deferred-work.md`: record the Story 9.8 review-queue consumption of `reconciliation.self-verify-screenshot-uploaded` + the `resolved` re-green as forward seams; if the "yellow-stuck without a red flip" (no-deposit-after-window) entry is left to the 8.9 tail, note it explicitly (see Dev Notes "The yellow-stuck vs. red gap").

### Review Findings

*(bmad-code-review, 2026-07-27 — Blind Hunter ×2, Edge Case Hunter, Acceptance Auditor, adversarially reviewed against the diff vs. baseline `925874c`)*

- [x] [Review][Patch] Speculative dead `expected_paise`/`actual_paise` alert-payload plumbing has no producer that ever populates it — REMOVED from `ContributionMismatchPayloadData`/`buildContributionMismatchPayloadData` (contracts) and `ContributionMismatchNotifyPayload`/`buildContributionMismatchAlert`/the enqueue call site (jobs). The `Alert`/`alert.ts` variant's own `expected_paise`/`actual_paise` predate this story as a Story 5.1 reservation and were left untouched (BigDev decision, code review 2026-07-27) [apps/jobs/src/scheduler/contribution-notify-triggers.ts, packages/contracts/src/alerts/contribution-loop-templates.ts]
- [x] [Review][Patch] `fallback` query param's `z.coerce.boolean()` coerces ANY non-empty string (incl. literal `"false"`) to `true`, defeating the AC3 "no happy-path screenshot door" guard — FIXED: `z.enum(['true','false']).transform(...)` [packages/contracts/src/contributions/self-verify.ts]
- [x] [Review][Patch] Photo-upload and PDF/file-upload buttons in `<SelfVerifySurface>` share identical visible text AND identical `accessibilityLabel` — FIXED: distinct `upload_photo_cta`/`upload_file_cta` (+`_a11y`) keys, bilingual [apps/mobile/components/self-verify/SelfVerifySurface.tsx]
- [x] [Review][Patch] `GET /api/v1/member/self-verify/:poolId` has no live-pool ownership check, unlike the sibling `POST` endpoint — FIXED: resolves the member's own live pool and fail-softs to the neutral default on a mismatch (never a 404 leak, consistent with this read's own posture) [apps/api/src/modules/self-verify/handlers.ts]
- [x] [Review][Patch] Task 7's claimed "member-scope guard" test doesn't exist — FIXED: added a live-DB test seeding a member with an active live-pool assignment, uploading against a DIFFERENT `pool_id`, asserting `self_verify.pool_not_found`; verified passing [apps/api/tests/integration/self-verify/upload-core.spec.ts]
- [x] [Review][Patch] `contribution_mismatch` push-notification render fallback is a hardcoded English-only string — VERIFIED, no change: `render.ts` is an explicitly locale-free pure function by architecture (every category's heading is hardcoded English); the producer always resolves locale-correct `body` before this fallback fires [packages/channels/src/render.ts]
- [x] [Review][Patch] Unused i18n key `no_statement_entry.get_help` — REMOVED from both locales; verified `wrong_pool.get_help`/`amount_mismatch.get_help` are pre-existing unused siblings (not a 9.7 regression, left untouched) [packages/i18n/locales/{en,hi}/contribution.json]
- [x] [Review][Patch] Wholesale alphabetical re-sort of both `contribution.json` locale files — VERIFIED safe (scripted diff confirmed zero existing values changed, only new keys added); left as-is, reverting would be pure churn
- [x] [Review][Patch] Rejection-audit path hand-rolls `emitAuthAudit` instead of reusing `rejectAudit()` — FIXED: `rejectAudit()` generalized to a minimal `{memberId,pariwarId,poolId}` shape and reused [apps/api/src/modules/self-verify/handlers.ts]
- [x] [Review][Patch] MIME-type matching is brittle (case-sensitive, parameterized content-types) — FIXED: normalize (strip `;` suffix, lowercase) before the allowlist check [apps/api/src/modules/self-verify/handlers.ts]
- [x] [Review][Patch] Upload success response types `status` as the full enum — FIXED: narrowed to `z.literal('uploaded')` [packages/contracts/src/contributions/self-verify.ts]
- [x] [Review][Patch] Generic single upload-error message contradicting the differentiated-copy doc comment — FIXED: `uploadErrorKey()` maps `ApiError.code` → dedicated dignified copy (too_large/unsupported_type/quarantined/unavailable), mirroring the `upi_intent.*` precedent [apps/mobile/components/self-verify/SelfVerifySurface.tsx]
- [x] [Review][Patch] `local-fs.ts`'s content-type sidecar written but never read — VERIFIED, no change: exact mirror of the pre-existing `bank-statement-storage`/`claim-document-storage` local-fs adapters (9.7 was explicitly instructed to mirror them); not a 9.7-introduced defect [packages/platform-adapters/src/self-verify-screenshot-storage/local-fs.ts]
- [x] [Review][Patch] Virus-scan vs. storage outage share one audit event type — VERIFIED, no change: `context.dependency` (`'statement-scanner'` vs `'self-verify-screenshot-storage'`) already differentiates them in the audit line [apps/api/src/modules/self-verify/handlers.ts]
- [x] [Review][Patch] Mobile document-picker accepts a broader MIME set than the server allowlist — FIXED: the file/PDF picker now requests `application/pdf` only (photos go through the dedicated image picker) [apps/mobile/components/self-verify/SelfVerifySurface.tsx]
- [x] [Review][Patch] Multipart stream-read failures with an unmapped error code risk a raw 500 — FIXED: catch-all maps to a dignified `ServiceUnavailableError` (503) [apps/api/src/modules/self-verify/handlers.ts]
- [x] [Review][Patch] `self-verify-write.ts` retry-exhaustion throws a plain `Error` — FIXED: new `SelfVerifyAppendRetryExhaustedError`, mapped to a dignified 503 at the API boundary [packages/domain/src/reconciliation/self-verify-write.ts, apps/api/src/modules/self-verify/handlers.ts]
- [x] [Review][Patch] Orphaned blob on a double failure (append + cleanup) has no distinct audit trail — FIXED: a dedicated `orphaned_blob_cleanup_failed` audit line + error log [apps/api/src/modules/self-verify/handlers.ts]
- [x] [Review][Patch] `refetch()` failure after a successful upload overwrites the success with a false failure notice — FIXED: upload success/failure and the post-upload refetch are now independent try/catch blocks; a refetch hiccup is silently soft [apps/mobile/components/self-verify/SelfVerifySurface.tsx]
- [x] [Review][Patch] `<SelfVerifySurface>` compounds live regions with the card's own + the `<StatusPill>`'s when expanded inline — FIXED: the card's pill `live` prop is suppressed while the surface is expanded (the surface's own live region takes over), restoring the single-ambient baseline [apps/mobile/components/active-contribution/ActiveContributionCard.tsx]
- [x] [Review][Defer] TOCTOU: the mismatch-reason snapshot used to gate/label the upload is read once before the multipart/scan/store sequence, so it can go stale if the matcher concurrently resolves the mismatch — deferred, low impact (AC4 evidence-inertness holds regardless; verified by the domain test) [apps/api/src/modules/self-verify/handlers.ts]
- [x] [Review][Defer] No idempotency/dedup guard against duplicate upload submissions (network retry, double-tap) — creates duplicate blobs + duplicate Story 9.8 review-queue items — deferred, not a correctness violation, a data-hygiene enhancement [apps/api/src/modules/self-verify/handlers.ts]
- [x] [Review][Defer] The self-verify domain read's `.limit(500)` could theoretically be exceeded by a member/pool with an unusually high volume of events — deferred, consistent with an existing codebase-wide convention (the same forced-pagination-gate pattern used in history.ts), not unique to this diff [packages/domain/src/contribution/self-verify.ts]

---

## Dev Notes

### The upload path is PURE EVIDENCE INTAKE (load-bearing architectural contract — BigDev, 2026-07-27)

The screenshot upload path MUST implement exactly this flow:

```
upload evidence  →  record evidence  →  notify future reviewer
```

and MUST NOT, anywhere, be:

```
upload evidence  →  change reconciliation outcome
```

The upload **stores a blob, appends the `reconciliation.self-verify-screenshot-uploaded` event, and (via the review-queue seam) notifies the Story 9.8 reviewer — full stop.** It never confirms, never un-confirms, never remaps a wrong-pool payment, never re-runs the matcher, never mutates the member's `red`/`mismatch` status. **All reconciliation AUTHORITY stays with the existing 9.4 matcher and the forthcoming 9.8 trustee review** — 9.7 owns member RECOVERY (giving the member a path + surfacing evidence), not adjudication. This is the sharpened form of AC4 (Story 7.6 facilitated-recovery): read AC4 as this directional data-flow rule, not merely "no `contribution.confirmed` emission." The AC4 test is the teeth — it proves the upload path is evidence-only and outcome-inert.

### The producer/consumer split — 9.7 is the consumer + a new transport, NOT the mismatch producer

The single most important framing: **mismatch detection is already live.** Do not touch `matchPool` / `appendReconciliationMismatch` / the matcher worker's emission. 9.7 closes four consumer-side seams that Epic 8/9 left standing: the missing push, the binary My-Pool-card state, the absent screenshot transport, and the absent recovery surface. The epics.md 9.7 "the matcher emits …" prose describes 9.4's already-shipped behavior (the same drafting pattern as [[project_calendar_aware_tail_not_window_extension]] — follow the shipped source, not the prose).

### The yellow-stuck vs. red gap (READ — this shapes when the surface appears)

FR-30/PRD:601 says "48h after self-attestation without match → status flips to `mismatch`." **The LIVE matcher deliberately does NOT do this.** `EMITTABLE_MISMATCH_REASONS` (matcher-worker.ts:63) excludes `no_statement_entry` — a UTR with no in-window deposit stays **yellow** (pending), never a premature red; the "still no deposit after the window closes" determination is a **reconciliation-TAIL concern (Story 8.9)**, not yet wired (matcher-worker.ts:24-28, [[project_calendar_aware_tail_not_window_extension]]). Consequence for 9.7: today a member goes **red only via `wrong_pool` / `amount_mismatch`**. A plain "I paid but nothing's confirmed" member stays **yellow**. So `<SelfVerifySurface>` needs BOTH entries — the red-card "Fix this" prompt AND the FR-32 hidden **"Trouble with UTR?"** affordance in the yellow state (FR-32: "Upload UI is hidden under 'Trouble with UTR?' in the happy path" + "member explicitly chooses it (e.g. NEFT fallback)"). The yellow-past-window→red auto-flip is an 8.9-tail forward seam — do NOT try to add it here (that reopens the tail decision).

### Existing code you are MODIFYING — read before you touch (regression surface)

- **`apps/jobs/src/matcher/matcher-worker.ts` (Story 9.4, DONE/LIVE).** The confirmed branch (L276-352) has the **exact seam to mirror**: a best-effort, post-commit `deps.enqueueConfirmedNotify?.(...)` inside a try/catch that logs-and-heals (L329-346). Add the symmetric `enqueueMismatchNotify?.(...)` to the mismatch branch AFTER the `appendReconciliationMismatch` commit + `recordResult` (~L401). **Preserve:** the monotonic no-op guards (never red-after-green, L358), the (pool, member, reason) dedup key (L365), the per-verdict isolation (a failure never crashes the run). The notify is strictly additive and strictly best-effort.
- **`apps/api/src/modules/member-pool/handlers.ts` (Story 8.2/8.6, DONE).** `activeContribution` (L110) computes `myContribution: attested ? 'attested' : 'none'` (L538) and `resolveMemberLivePool` is shared with the contributor list + Yogdaan Bahi. **What changes:** `myContribution` gains a `mismatch` state (+ reason). **Preserve:** the confirmed-only meter (`progress.confirmedCount` — yellow/red MUST NOT reach it, epics.md:2939-2941), the shared per-pool identity resolver (D6), the FR-12A self-scope.
- **`apps/api/src/modules/reconciliation/handlers.ts` (Story 9.3, DONE).** The upload-core template: guard → multipart read → byte-cap/emptiness → `scannerCall.run(scan)` (AR-45) → `storageCall.run(put)` (AR-45) → SAVEPOINT-guarded event append → best-effort blob cleanup on append failure → dignified 4xx/503 (`mapStorageOutage`, never a 500). **Clone this shape** for the screenshot endpoint; do NOT re-invent the resilience/append/cleanup discipline. Note the [[project_domain_limit_clamp_and_savepoint_retry]] SAVEPOINT-retry requirement and the [[project_fastify_onsend_doublesend]] onSend gotcha if you touch response hooks.
- **`packages/domain/src/contribution/history.ts` (Story 8.6/9.5, DONE).** `getMemberAttestedContribution` (L181) is the single-row red/green/held/mismatch read — reuse its verdict-batching + `hasLiveConfirmation` chain for the Task 4 self-verify read; do NOT re-derive status.
- **`apps/mobile/components/active-contribution/ActiveContributionCard.tsx` (Story 8.4/9.6, DONE).** Already imports `<StatusPill>` (L36) and renders `<StatusPill status="yellow" size="default" live />` when `hasAttested` (L229). **What changes:** when the card's `myContribution === 'mismatch'`, render `<StatusPill status="red">` + the "Fix this" → `<SelfVerifySurface>` entry; and add the FR-32 "Trouble with UTR?" disclosure to the yellow state. **Preserve:** the "NEVER confirmed/success" semantics, the ≥56pt CTA, the single ambient live-region discipline (9.6 Completion Notes), the `<CallHelplineCTA>` already present in both states (L252).

### Decisions — proposed LOCKED (following precedent; confirm any you'd overturn)

- **D1 — Screenshot storage = a NEW `SelfVerifyScreenshotStorage` port, NOT a `ClaimDocumentStorage` reuse.** LOCKED. Follows 9.3's D3 ("new port + bucket, not a reuse") exactly: a self-verify payment screenshot is neither a claim-scoped document nor a bank statement; it gets its own bucket + key namespace + retention. Mirror the 6.5 `ClaimDocumentStorage` SHAPE (put/getBytes/signedReadUrl/delete) + reuse the abstraction-first `StatementScanner`. Accepts image + PDF (UX §11 "photo-only mobile / file picker"). *(Rejected: reuse `ClaimDocumentStorage` — conflates unrelated retention/scope; the 9.3 precedent already rejected the analogous reuse.)*
- **D2 — Event = `reconciliation.self-verify-screenshot-uploaded` on the ALERT stream.** LOCKED. `reconciliation.*` namespace dodges the 8.10 `contribution.*` fence (the 9.3 D6 precedent); the alert stream co-locates it with the mismatch verdict it responds to (the 9.4 D2 verdict-co-location). It is a Story 9.8 review-queue INPUT — a reserved seam, no live consumer in 9.7. *(Rejected: a `contribution.*` type — trips the fence; a new table — the 9.1/9.3 "metadata-is-an-event, minimize new schema" discipline.)*
- **D3 — Upload is mandatory-only-on-mismatch (no happy-path door), FR-32.** LOCKED. The endpoint guards on an unresolved mismatch (or the explicit "Trouble with UTR?" fallback). This IS the friction budget: friction only where it earns its place (PRD §"friction-as-resource").
- **D4 — Mismatch push = wire the RESERVED `contribution_mismatch` category, best-effort from the matcher worker.** LOCKED. The category + deep-link target already exist (5.1); only the notification builder + enqueue + worker + the matcher-branch call are missing. FR-30/FR-32 "member notified." Mirror the 8.8 confirmed seam's best-effort post-commit posture (never fail the verdict). *(This reconciles an 8.8 gap: 8.8 shipped only the confirmed seam. 9.7 owns the mismatch seam — flag Q2 if BigDev sees it as an 8.8 backfill instead.)*
- **D5 — My Pool card carries the mismatch tone + reason (the Journey-1 entry); the surface has its own detail read.** LOCKED. Extending `myContribution` keeps the card the single Journey-1 entry without a second round-trip; the `<SelfVerifySurface>` reads its full default/uploaded/resolved state from a dedicated member read. *(Rejected: overload `active-contribution` with the whole surface state — the card only needs the tone+reason for the entry.)*
- **D6 — `<SelfVerifySurface>` is mobile-only now (no admin/web variant).** LOCKED. The member-facing recovery surface is a mobile surface (Sushil); the trustee side is Story 9.8. [[feedback_no_premature_package]].
- **D7 — `<SelfVerifySurface>` is directly reachable from the red `<ActiveContributionCard>` (PROPOSED — confirm before Task 6).** The UX journey diagrams (ux-design-specification.md ~L1405) route the **red** mismatch state to `StaffCheck`, not to self-verify; the diagrams' self-verify entries are wired from the **yellow** "UTR not found after upload" branch and a donor-flagging path. AC2/Task 6 assume a direct red-card → self-verify entry — a reasonable synthesis of FR-32's two named paths (mismatch-flagged OR member-chosen), but not something the journey diagram states outright. **Confirm with BigDev before building Task 6's red-card "Fix this" affordance:** does a member with a red/mismatch pill get a direct self-serve entry, or should red route to `StaffCheck` (trustee-initiated) with self-verify staying reachable only via the yellow "Trouble with UTR?" disclosure and the push deep-link? *(If StaffCheck-only for red, Task 6's card affordance becomes a "trustee review pending" notice instead of a "Fix this" CTA, and AC2 is restated accordingly.)*

### i18n, tone, and copy

Empathy copy maps the machine reason-code (`wrong_pool` / `amount_mismatch` / `no_statement_entry` / …) to dignified Pattern-4 explanations, bilingual, tone-reviewed (Story 2.2) — never "Error/Invalid/Failed", never blaming the member ("we couldn't match it yet" not "your payment failed"). Put `selfVerify.*` in the already-registered `common` (or `contribution`) namespace — do NOT add a new namespace (the `memberStatus.*`/`statusPill.*` precedent ripples `catalog.ts`+`classification.ts` otherwise). Mismatch-notification copy follows the `contribution_confirmed` notification-copy shape.

### Testing standards

- Domain: vitest; DB-integration for the read (the history.ts spec style) on `twt-test-pg` :5433 ([[project_live_db_test_gotchas]] — never regenerate an applied migration; assert membership not counts).
- API/jobs: reuse the 9.3 reconciliation handler harness + the 8.8 confirmed-seam job test. The AC4 facilitated-recovery test is load-bearing ([[feedback_gate_scope_semantic_coverage]] — meaningful teeth: prove the upload path cannot green a contribution).
- Merge gate: `pnpm ci:local` green (GitHub Actions suspended — [[project_ci_actions_suspension_local_mirror]]). Watch the known live-DB flakes ([[project_known_livedb_test_failures]]) — confirm innocence in isolation.
- Emulator: build `@twt/mobile` on the Pixel_9 AVD ([[project_mobile_android_emulator_setup]]) and eyeball the red card + `<SelfVerifySurface>` (red pill AA contrast, Devanagari no-clip, upload picker, helpline CTA). The red state IS reachable in live data (unlike held/grey) — spot-check against a real `wrong_pool`/`amount_mismatch` if a data-populated pool is reachable; record honestly what was/wasn't eyeballed ([[feedback_record_unattested_no_backfill]]).

### Project Structure Notes

- **New:** `packages/contracts/src/reconciliation/self-verify-screenshot-storage.ts`; `packages/platform-adapters/src/self-verify-screenshot-storage/{gcs,in-memory,local-fs}.ts`; the self-verify domain read (`packages/domain/src/reconciliation/` or `contribution/`); `apps/api/src/modules/…/self-verify` route+handler; `apps/mobile/components/self-verify/SelfVerifySurface.tsx` (+ test); the mismatch-notify worker/seam in `apps/jobs`.
- **Modified:** `packages/domain/src/reconciliation/events.ts` (+ index); `packages/events/src/registry.ts`; `packages/contracts/src/reconciliation/index.ts` + the `ActiveContributionCardResponse` contract; `packages/platform-adapters/src/index.ts`; `packages/queue/src/index.ts` (`QUEUE_NAMES`); `apps/api/src/{deps,context}.ts` + `member-pool/handlers.ts`; `apps/jobs/src/{index,boot}.ts` + `scheduler/contribution-notify(-triggers).ts` + `matcher/matcher-worker.ts`; `apps/mobile/components/active-contribution/ActiveContributionCard.tsx`; i18n `common`/`contribution.json` (both locales); `friction-budget.md`; `deferred-work.md`.
- **No ADR needed** — reconciliation namespace + verdict co-location + storage-port pattern are already recorded (9.3 D6, 9.4 D2, 6.5); 9.7 is consumer wiring + a new transport instance of decided patterns.

### References

- [Source: epics.md#Story-9.7 L3265-3279] — the mismatch→notify→red-pill→SelfVerifySurface→screenshot→review-queue flow; the L3276 event-name reconciliation note (`contribution.reconciliation-mismatch` is canonical).
- [Source: prd.md#FR-32 L612-619] — screenshot mandatory-only-on-mismatch, hidden under "Trouble with UTR?", routes to the FR-50 review queue; #FR-30 L601 — "member notified"; §friction-as-resource L566.
- [Source: ux-design-specification.md#§11 `<SelfVerifySurface>` L1926-1933] — purpose/anatomy (explanation + screenshot + `<CallHelplineCTA>`)/states (default/uploaded/resolved)/variants (photo-only mobile / file picker)/a11y; L269 friction-budget (payer = Sushil, protected = Reconciliation); L1398-1403, L1543 the yellow-verify/self-verify journey branches.
- [Source: packages/domain/src/reconciliation/{matcher,matcher-write,events}.ts] — the LIVE mismatch producer + the `reconciliation.*` namespace (9.3 D6) + the alert-stream append (9.4 D2). DO NOT MODIFY the producer.
- [Source: packages/domain/src/contribution/{events.ts:159-196, history.ts:75, read.ts}] — the mismatch payload/reason vocabulary + the red-pill read model + `hasLiveConfirmation`. READ, reuse; do not re-derive.
- [Source: apps/jobs/src/matcher/matcher-worker.ts:63-66,276-408] — `EMITTABLE_MISMATCH_REASONS` (why no `no_statement_entry` red today) + the confirmed-notify D6 seam to mirror for mismatch.
- [Source: apps/jobs/src/scheduler/contribution-notify-triggers.ts + apps/jobs/src/index.ts:56-63] — the 8.8 `contribution_confirmed` notification builder + `enqueueContributionConfirmedNotification` barrel seam to mirror; QUEUE_NAMES at packages/queue/src/index.ts:236.
- [Source: packages/contracts/src/alerts/alert.ts + deep-links/deep-link.ts:93-99] — the RESERVED `contribution_mismatch` alert_category + its `contributions/:pool_id` deep-link target.
- [Source: apps/api/src/modules/reconciliation/{handlers,routes,resilience}.ts] — the 9.3 dual-surface upload-core (scan→store→emit, AR-45, dignified 4xx/503) to clone for the screenshot endpoint.
- [Source: packages/contracts/src/claims/documents.ts + reconciliation/statement-storage.ts + packages/platform-adapters/src/{claim-document-storage,bank-statement-storage}/] — the storage-port + GCS/in-memory/local-fs adapter precedents for `SelfVerifyScreenshotStorage`.
- [Source: apps/api/src/modules/member-pool/handlers.ts:110,507-540] — the My Pool card `activeContribution` read + `myContribution` binary to extend; the confirmed-only-meter invariant.
- [Source: apps/mobile/components/{active-contribution/ActiveContributionCard.tsx, common/CallHelplineCTA.tsx, status-pill/StatusPill.tsx}] — the mobile card, the 8.11 helpline CTA, the 9.6 `<StatusPill>` to consume.
- Memory: [[project_channels_no_live_dispatch_yet]], [[project_reconciliation_transport_substrate]], [[project_nominee_console_substrate]], [[project_contribution_event_name_contract]], [[project_claim_document_storage_port]], [[project_calendar_aware_tail_not_window_extension]], [[project_anonymous_diagnostic_log_convention]], [[project_domain_limit_clamp_and_savepoint_retry]], [[project_friction_budget_baseline_ratchet]], [[project_ci_actions_suspension_local_mirror]], [[project_mobile_android_emulator_setup]], [[feedback_gate_scope_semantic_coverage]], [[feedback_record_unattested_no_backfill]].

## Dev Agent Record

### Agent Model Used

claude-opus-4-8 (Claude Code, `bmad-dev-story` workflow).

### Debug Log References

- `pnpm ci:local` (DATABASE_URL on :5433, `--concurrency=4`) — **28/28 jobs green** on the final run, incl. the Story 8.10 `no-ingest-path` fence, `pii-scrape`, `friction-budget`, `i18n-parity`, `domain-invariants`, `alert-state-invariant`, determinism, and the DB-gated integration suites.
- First ci:local run flagged 4 jobs (lint / test / domain-invariants / integration-tests); all resolved: (1) `.limit(MAX_SELF_VERIFY_ROWS)` → integer literal `500` (the forced-pagination gate flags a named-const ref — history.ts convention); (2) two unused-import lint errors in new test files; (3) the My Pool card's new self-verify read made resilient (a read failure degrades to "no mismatch shown", never blanks the whole card) — which also fixed the `active-contribution-card` / `contribution-history` unit tests whose barrel mock spreads the real `contribution` namespace.
- Targeted suites confirmed in isolation: domain `self-verify-events` (8) + `self-verify-read` DB-integration (3, incl. AC4 evidence-inertness); contracts `contributions` (59); api `self-verify/upload-core` DB-integration (7); jobs `reconciliation-match` (16) + `contribution-notify-triggers` (46, incl. 6 new mismatch tests); mobile `self-verify-surface-render` source-scan (12); channels `render`/`dispatch`/`sms`/`determinism` (61) + contracts `alerts`/`deep-links` (17) unaffected by the alert-schema/render change.

### Completion Notes List

**Producer/consumer framing held.** 9.7 shipped the four consumer-side seams (push, red card state, screenshot transport, recovery surface); the 9.4 matcher's emission/classification (`matchPool`, `appendReconciliationMismatch`, `EMITTABLE_MISMATCH_REASONS`) was NOT touched. The mismatch push is strictly additive + best-effort post-commit (mirrors the 8.8 confirmed seam D6 posture exactly).

**Decisions confirmed by BigDev at kickoff:** D7 → **direct red-card "Fix this" entry** (Task 6 built as written — the red `<ActiveContributionCard>` flips to `<StatusPill status="red">` + a direct self-serve entry, alongside the yellow "Trouble with UTR?" disclosure); Q2 → **9.7 owns the mismatch push** (D4 as locked; framed as reconciling the 8.8 gap, not deferred).

**AC4 (pure evidence intake) — the load-bearing invariant — has real teeth:** the domain `self-verify-read.spec.ts` AC4 test proves an upload appends ONLY `reconciliation.self-verify-screenshot-uploaded` (asserted `count(contribution.confirmed) === 0` after two uploads) and the member stays `red`/`mismatch` until a subsequent trustee/matcher `contribution.confirmed` flips them to `resolved`; the api `upload-core.spec.ts` re-asserts the event-stream contains only the evidence event; the matcher-write monotonic fence stayed green (the self-verify writer lives in its OWN `reconciliation/self-verify-write.ts`, so matcher-write still exports exactly the two verdict emitters).

**8.10 fence stayed green verbatim** — the new event is `reconciliation.self-verify-screenshot-uploaded` (a `reconciliation.*` type, the 9.3 D6 precedent), never a fourth `contribution.*` ingest door.

**Alert payload change (Task 5, small + additive):** `contribution_mismatch` `expected_paise`/`actual_paise` made OPTIONAL (the verdict carries no amount comparison; `wrong_pool` has no amounts) + an optional producer-resolved `body` (dignified line). The `@twt/channels` render arm was updated from the pre-9.7 alarming/impossible `"expected X, recorded Y"` line to a dignified `"Payment update"` + the resolved body — no render determinism/replay test asserted the old line, so the frozen render contract stayed green.

**Copy reuse:** the `contribution` catalog already carried dignified `wrong_pool.*`/`amount_mismatch.*` reason copy — the surface reuses it and adds `no_statement_entry.*` (the yellow-fallback context) + a `selfVerify.*` chrome set + `notify.mismatch.*` push copy, all bilingual (en↔hi parity gate green). No new i18n namespace (reused `contribution`, the memberStatus/statusPill precedent).

**Card contract additions:** `myContribution` grew `'none' | 'attested'` → `+ 'mismatch'`; added `mismatchReason` (null unless mismatch) + `poolId` (needed so the recovery entry can reach `GET/POST /member/self-verify/:poolId` — same pool id already in the deep-link grammar, member's own pool, not PII). The confirmed-only meter invariant is untouched (contract + mobile source-scan both assert no yellow/red count reaches `progress`).

**Storage:** a NEW `SelfVerifyScreenshotStorage` port + bucket (`SELF_VERIFY_SCREENSHOT_BUCKET`) + gcs/in-memory/local-fs adapters (Decision D1, the 9.3 D3 precedent); image+PDF MIME allowlist; 10 MiB cap; the 9.3 `StatementScanner` virus-scan seam REUSED (no new scanner). Object keys opaque + non-PII; the event payload carries ids + a machine reason-code + contentType + a timestamp only.

**Emulator spot-check DONE (2026-07-27, post-review)** — the deferred device spot-check above was closed out on the Pixel_9 AVD (fixture-mocked API, a mismatch state) rather than left un-attested:
- Mismatch pill contrast: `status-mismatch` `#8a4b1f` on the pill background measures ≈6.76:1 (WCAG AA-normal-text is 4.5:1) — comfortably passes; confirmed the warm-umber (not warm-red) design intent (Story 9.6 `spec.ts`) reads correctly on-device.
- Devanagari no-clip: the `wrong_pool` explanation wraps cleanly across 4 lines at device width, no glyph clipping.
- Photo/PDF button distinguishability (the code-review a11y fix): verified live in the on-device accessibility tree — distinct visible text AND distinct `accessibilityLabel` for each button.
- **New bug found BY running it, not visible to the source-scan harness:** `app/(tabs)/index.tsx` (the My Pool home tab) had no `ScrollView` — a bare `flex={1}` `YStack`. Harmless before 9.7 (nothing was tall enough to overflow); with `<SelfVerifySurface>` expanded inline, total content exceeded one screen and the tail content (the second upload button, the surface's own `<CallHelplineCTA>`) rendered COMPRESSED to near-zero height (observed: an 11px-tall button; the helpline CTA didn't render at all) — a live violation of AC5's "always-reachable helpline" + the ≥56pt touch-target requirement. **Fixed:** wrapped the tab's content in a `ScrollView` (the standard fix, matching the `(contribution)/pay.tsx` precedent). Re-verified on-device: both buttons render at full height and the helpline CTA is reachable via scroll. `pnpm --filter @twt/mobile test`/`lint`/`typecheck` all still green after the fix.

### File List

**New**

- `packages/contracts/src/reconciliation/self-verify-screenshot-storage.ts` — the `SelfVerifyScreenshotStorage` port + MIME/byte-cap constants (Task 2)
- `packages/contracts/src/contributions/self-verify.ts` — the mismatch reason-code enum (domain-lockstep), the `<SelfVerifySurface>` read DTO, the upload request/response shapes (Task 4/6)
- `packages/platform-adapters/src/self-verify-screenshot-storage/{gcs,in-memory,local-fs}.ts` — the storage adapters (Task 2)
- `packages/domain/src/contribution/self-verify.ts` — `resolveMemberSelfVerifyState` (the member-scoped recovery read) (Task 4)
- `packages/domain/src/reconciliation/self-verify-write.ts` — `appendSelfVerifyScreenshotUploaded` (alert-stream evidence append) (Task 3)
- `apps/api/src/modules/self-verify/{handlers,routes,index}.ts` — the upload transport + the `<SelfVerifySurface>` read endpoint (Task 3/4)
- `apps/mobile/components/self-verify/SelfVerifySurface.tsx` + `useSelfVerifyQuery.ts` — the recovery surface + its read hook (Task 6)
- `packages/domain/tests/reconciliation/self-verify-events.test.ts`; `packages/domain/tests/integration/reconciliation/self-verify-read.spec.ts`; `apps/api/tests/integration/self-verify/upload-core.spec.ts`; `apps/mobile/tests/unit/self-verify-surface-render.test.ts` — the tests (Task 7)

**Modified**

- `packages/domain/src/reconciliation/events.ts` (+`index.ts`) — the new event type + `.strict()` payload + exhaustive map (Task 1)
- `packages/domain/src/contribution/index.ts` — export the self-verify read (Task 4)
- `packages/events/src/registry.ts` (+`tests/smoke.test.ts`) — registry entry + membership test (Task 1)
- `packages/contracts/src/reconciliation/index.ts`; `.../contributions/index.ts`; `.../contributions/active-contribution-card.ts` (+ `poolId` + `mismatchReason`); `.../contributions/upi-intent.ts` (`MyContributionStatus` + `mismatch`); `.../alerts/alert.ts` (`contribution_mismatch` optional amounts + `body`); `.../alerts/contribution-loop-templates.ts` (mismatch payload builder + template keys); `tests/contributions.test.ts` (Tasks 4/5)
- `packages/platform-adapters/src/index.ts` — adapter exports (Task 2)
- `packages/queue/src/index.ts` — `CONTRIBUTION_NOTIFY_MISMATCH` queue name (Task 5)
- `packages/channels/src/render.ts` — the dignified `contribution_mismatch` render arm (Task 5)
- `packages/api-client/src/index.ts` — `memberSelfVerifyState` + `memberUploadSelfVerifyScreenshot` (Task 6)
- `apps/api/src/{context,deps,server}.ts` — `selfVerifyScreenshotStorage` dep + wiring + module registration; `src/audit/audit-sink.ts` (3 audit types); `src/modules/member-pool/handlers.ts` (card mismatch state + `poolId`, resilient); `tests/integration/_setup.ts` (test dep) (Tasks 2/3/4)
- `apps/jobs/src/scheduler/contribution-notify-triggers.ts` (builder + enqueue + worker + registration); `src/matcher/matcher-worker.ts` (`enqueueMismatchNotify` dep + best-effort call); `src/{boot,index}.ts` (wiring + barrel export); `tests/{reconciliation-match,contribution-notify-triggers}.test.ts` (Task 5)
- `apps/mobile/components/active-contribution/ActiveContributionCard.tsx` — the two recovery entry points (Task 6)
- `packages/i18n/locales/{en,hi}/contribution.json` — `selfVerify.*` + `no_statement_entry.*` + `notify.mismatch.*` copy (Tasks 5/6)
- `friction-budget.md` (Story 9.7 disposition — seed row REALIZED); `_bmad-output/implementation-artifacts/deferred-work.md` (9.7 forward seams) (Task 7)

### Change Log

- 2026-07-27 — Story 9.7 implemented via `bmad-dev-story` (Opus 4.8). Four consumer seams closed: the FR-32 mismatch push (reserved `contribution_mismatch` category wired best-effort from the 9.4 matcher's mismatch branch), the My Pool card red `mismatch` state (+ `mismatchReason` + `poolId`), the `SelfVerifyScreenshotStorage` port/adapters + the member screenshot-upload endpoint (`reconciliation.self-verify-screenshot-uploaded` evidence event, pure intake — AC4), and the `<SelfVerifySurface>` mobile recovery surface (two entry points: red-card "Fix this" per D7 + the yellow "Trouble with UTR?" fallback). BigDev confirmed D7 (direct red entry) + Q2 (9.7 owns the push) at kickoff. `pnpm ci:local` 28/28 green. Status → review.
