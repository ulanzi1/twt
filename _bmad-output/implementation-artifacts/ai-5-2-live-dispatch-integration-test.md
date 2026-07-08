---
baseline_commit: 74dd4eee7eb370d289ebb430635fe97bf72c4076
---

# AI-5-2 — Controlled end-to-end live-dispatch integration test before Epic 6

**Source:** Epic 5 retrospective (`epic-5-retro-2026-07-08.md`, §7 + §8) — confirmed BigDev 2026-07-08.
**Type:** Technical (integration test). Live-DB (:5433), deterministic (no real timers). **Critical path before Epic 6's first live-dispatch caller.**
**Status:** done

> **Retro ask (verbatim, §7 AI-5-2):** *"Add a controlled end-to-end live-dispatch integration test before Epic 6 wires the first live caller — fan one alert across `CANONICAL_CHANNEL_LADDER` with fixtures for the external providers, assert the fallback cascade (push→WA→SMS) fires per AR-19, and assert the two audit lines (one dispatch + one per channel). Gives nine stories of primitives their first real-path exercise in a controlled test, not in the `claim_status_change` hot path (H-7)."*

---

## 1. Context — the risk this de-risks (H-7)

Epic 5 shipped **nine stories of channel primitives with zero live `dispatch` call site** ([[project_channels_no_live_dispatch_yet]]). Every provider, policy wrapper, and seam is unit- and DB-tested in isolation, but *"does one alert actually fan across the ladder with fallback + two audit lines end-to-end"* has never run (retro **H-7**). Epic 6's `claim_status_change` is slated to be the **first-ever live caller** — meaning the first real-path exercise of the entire dispatcher/ladder/cascade/audit/HMAC stack would otherwise happen in the highest-stakes flow (₹50L/decision), far from where the primitives were built.

AI-5-2 moves that first exercise into a **controlled integration test** — so any interlock defect surfaces here, not in the claim hot path.

## 2. The load-bearing reconciliation — surface it, do NOT silently invent a composition

The retro phrases this as **one flow** ("fan across the ladder … *and* the fallback cascade fires … *and* the two audit lines"). The frozen code has **two separate primitives that do not, today, compose into that one flow** — and closing that gap is Epic 6's job, not this test's:

| Primitive | What it does | Audit? | Cascade/fallback? |
|---|---|---|---|
| `dispatch(alert, deps)` (`src/dispatch.ts`) | Fans out to **every enabled channel independently** in canonical order; writes **1 `alert.dispatch` line + 1 `alert.channel_send` line per channel that reached `send`** | ✅ writes both audit lines (real path) | ❌ **no cascade** — each channel attempted independently; a `rejected` push does **not** trigger WA |
| `runChannelCascade(send, config)` (`src/cascade.ts`) | The **AR-19 fallback ladder**: push (1 + up-to-3 backoff-spaced retries) → WA → SMS, **stop at first `sent`**; SMS terminal; Telegram never in the ladder | ❌ **writes no audit** (drives a bare `CascadeSender` seam) | ✅ this *is* the fallback |

So **"the fallback cascade fires" ⇒ `runChannelCascade`**, and **"the two audit lines" ⇒ the `dispatch`/audit path** — two different primitives. A single production flow that both cascades *and* writes the audit lines is **not shipped**; it is exactly the composition Epic 6's live caller will build.

**The two traps AI-5-2 must avoid** (both violate the Epic-5 discipline):
1. **Do NOT modify `dispatch` to cascade** — `dispatch`/`cascade`/`provider`/`CANONICAL_CHANNEL_LADDER`/`render`/`audit` are **frozen byte-for-byte across all 8 post-5.1 stories** ([[project_channels_no_live_dispatch_yet]]; retro W-1). This story changes **zero production source**.
2. **Do NOT add a production live-dispatch call site** — Epic 6 remains the first live caller (retro §6, §10). AI-5-2 is a **test-only harness** that *composes the shipped primitives into the Epic-6 shape to prove they interlock*. It **models** the seam Epic 6 will productionize; it does not commit it.

This reconciliation is itself the deliverable's integrity — record it in the Dev Agent Record per [[feedback_closure_language_precision]] + the honesty discipline that held five epics (retro W-5). If Epic 6 later wires the composition differently, this test still proves the primitives interlock on the real path.

## 3. Second reconciliation — the shipped fixtures always `accept`; the fallback needs reject doubles

The shipped log-only fixtures (`createFixturePushProvider`, `createFixtureWhatsappProvider`, `createFixtureSmsProvider`, `createFixtureTelegramProvider`) **unconditionally return `status: 'accepted'`** (they exist so the stack boots with zero external config). There is **no "fail" knob**. A cascade driven by them delivers on **push** and never falls through — it cannot exercise AR-19.

So **"fixtures for the external providers" (retro) = deterministic in-test `ChannelProvider` doubles** standing in for FCM/Meta/gateway (no real network), **not** necessarily the shipped log-only fixtures. Author two minimal reject doubles conforming to the **frozen `ChannelProvider` contract** (`src/provider.ts`): push → `rejected`, whatsapp → `rejected`. For the SMS accept rung you MAY **reuse the shipped `createFixtureSmsProvider()`** (already returns `accepted`) — reuse over reinvention.

**Item 5 — the reject double MUST carry an in-file rationale comment** so a future dev does not "simplify" it back to a shipped fixture and silently kill the fallback coverage:

```ts
// WHY REJECT DOUBLES EXIST — DO NOT replace with the shipped createFixture*Provider().
// The shipped log-only fixtures (fixture-push/-whatsapp/-sms) ALWAYS return status:'accepted'
// (they exist so the stack boots with zero external config — src/providers/fixture-*.ts). A cascade
// driven by them delivers on PUSH and never falls through, so it cannot exercise AR-19 at all. These
// doubles force a non-accept outcome on push+WA precisely so the fallback ladder advances to SMS.
// They conform to the FROZEN ChannelProvider contract (src/provider.ts) — no production source is touched.
function rejectingProvider(id: ProviderId, channel: Channel): ChannelProvider {
  return {
    id, channel, scope: 'global',
    send: (_rendered, _target) => Promise.resolve({
      channel, provider: id, status: 'rejected', providerMessageId: null,
      detail: 'test double: forced reject (simulated FCM/Meta unavailable)',
    }),
    getStatus: (m) => Promise.resolve({ providerMessageId: m, state: 'failed' }),
  };
}
```

**Item 2 — ONE shared outcome-mapping helper (no duplicated switch).** Tests (1) and (3) both turn a `SendResult` into a `ChannelSendOutcome`. There is **no exported helper to reuse** — `dispatch`'s `sendStatusToOutcome` is module-private in `src/dispatch.ts`, and exporting it would be a production-source change this test-only story forbids (§6). So define **exactly one** test-local helper and use it in both tests; if Epic 6 ever adds a `SendResult.status`, only this one place changes:

```ts
// The SINGLE honest status→outcome mapping for the whole spec. MIRRORS dispatch.ts's private
// `sendStatusToOutcome` (the canonical source) — never claim 'sent' for a non-accepted send. If a new
// SendResult.status is added, update BOTH here and dispatch.ts's mapping. Used by Test (1) and Test (3).
function toOutcome(result: SendResult): ChannelSendOutcome {
  const outcome =
    result.status === 'accepted' ? 'sent'
    : result.status === 'rejected' ? 'rejected'
    : 'not_implemented';
  return { outcome, detail: result.detail };
}
```

## 4. Use the Epic-6 category, not a generic announcement (highest-fidelity de-risk)

Epic 6's first live caller fires **`claim_status_change`** (retro §6 signal 1; epics.md L2117/L2140/L2195). Drive the test with the **`claimStatusChange()` fixture** already in `tests/fixtures.ts` — its per-member category is **NOT Telegram-eligible** (`isCategoryEligible('telegram','claim_status_change') === false`, dispatch.ts L48–52), so Telegram correctly records `skipped_ineligible` and never enters the ladder. This mirrors exactly what Epic 6 will send, so the exercise's fidelity is maximal. (Contrast: the existing `dispatch-audit.spec.ts` uses `alert_published`, an all-accept announcement — AI-5-2 covers the real claim shape and non-accept outcomes it never touched.)

## 5. What to build — ONE new live-DB integration spec (zero production source change)

**File:** `packages/channels/tests/integration/live-dispatch-cascade.spec.ts`

- `describe.skipIf(!hasDatabase)` — the DB-free `pnpm test` still passes; it runs only when `DATABASE_URL` (twt-test-pg on **:5433**) is set, under `ci:local`'s `integration-tests` job (already `--filter=@twt/channels`, `scripts/ci-local.sh:65`). `.spec.ts` under `tests/integration/` is already globbed by `vitest.config.ts` and runs in the `forks` pool.
- **Reuse shipped exports** (index.ts) — invent nothing that exists: `dispatch`, `runChannelCascade`, `render`, `createAuditPort`, `createRenderedMessageHash`, `alertPayloadDigest`, `sha256Hex`, `CANONICAL_CHANNEL_LADDER`, `createFixtureSmsProvider`, types `ChannelProvider`/`Channel`/`ProviderId`/`SendTarget`/`SendResult`/`DispatchDeps`/`CascadeSender`/`ChannelSendOutcome`. From `@twt/domain`: `createDb`, `encryption` (fake KMS), `canonicalJsonStringify`, `schema`. Mirror the setup of `tests/integration/dispatch-audit.spec.ts` (fake KMS, `createDb(DATABASE_URL,{ssl:false,max:4})`, `afterAll` → `pool.end()`).
- **One `toOutcome` helper** (§3, item 2) shared by Tests (1) and (3). **One `hashRendered = createRenderedMessageHash({kms, hmacKeyRef})`** built once and reused everywhere a per-channel hash is produced or expected — so the test's expected HMAC is computed by the **same production helper the audit path uses** and can never drift from it (§ item 4).
- **Live-DB gotchas** ([[project_live_db_test_gotchas]], [[project_known_livedb_test_failures]]): `writeAuditEntry` **own-commits** into the global hash-chain, so rows accumulate — **assert membership, never absolute counts**. Key every assertion on the row's **unique per-alert `resourceLocator`** (`like(auditLogEntries.resourceLocator, `alert:${alertId}%`)`) with a **fresh `randomUUID()` `alert_id`/`pariwar_id` per test**. Use `createFakeKmsProvider` (as the existing spec) for the HMAC key.
- **Determinism:** inject the cascade's `sleep` seam with a **recorder** (see `tests/cascade.test.ts` `sleepRecorder()`) and a trivial `backoffMs` (e.g. `[1,1,1]`) — **no real timers** (the 30s/5m/30m default would hang CI). The `send` seam is deterministic (fixed provider doubles). Render is pure and already CI-gated.

### The three `it`s

**(1) AR-19 fallback fires push → WA → SMS and delivers on SMS.**
Build a `CascadeSender` that, per channel: `render(alert, channel)` → `provider.send(rendered, target)` on the channel's double (push=reject, wa=reject, sms=`createFixtureSmsProvider()`=accept) → `toOutcome(result)` (the single shared helper, §3 item 2). Have each double **record its `send`-call count** (a simple counter per provider). Run `runChannelCascade(send, { sleep, backoffMs:[1,1,1] })`. Assert:
- `delivered === true`, `deliveredChannel === 'sms'`; the trail shows push exhausted (1+3) → wa exhausted (1+3) → sms `sent` on attempt 0; `sms` is the terminal rung; **Telegram never appears** in the trail.
- **Item 3 — explicit "stop after SMS":** the SMS double's `send` was called **exactly once** (delivery halts the ladder immediately on the first `sent` — no retry burned on SMS), and the **last trail entry is `{channel:'sms', attempt:0, outcome:'sent'}` with no entry after it**. (SMS is terminal, so "stop after SMS" is proven by *no SMS retry* + *no trailing entry*, not by a nonexistent lower rung.)

This is the AR-19 fallback exercised over real provider doubles + real `render`.

**(2) `dispatch` writes an honest dispatch line + a per-channel send line with a PII-safe HMAC (live DB), with non-accept outcomes.**
Call `dispatch(claimStatusChange-with-fresh-ids, deps)` where `deps.providers` = a registry with the **same doubles** (push reject, wa reject, sms accept), all three channels **targeted** (`resolveDelivery` returns push/whatsapp/sms targets; Telegram target may be present but is category-ineligible), `hashRendered = createRenderedMessageHash({kms, hmacKeyRef})`, `audit = createAuditPort(pool)`. Assert on rows filtered by `alert:${alertId}%`, ordered by `seq`:
- Exactly **one `alert.dispatch`** line; its `resourceLocator` `channels=…` segment is **honest** — contains `push:rejected`, `whatsapp:rejected`, `sms:sent`, `telegram:skipped_ineligible` (proves `dispatch` records suppressed/failed channels, not a sent-only filter). Its `requestPayloadHash === alertPayloadDigest(alert)`.
- **Three `alert.channel_send`** lines (push, whatsapp, sms — each reached `send`; `responseStatus` 400/400/202 respectively). **Item 4 — future-proof the HMAC assertion:** compute the expected hash via the **same production helper the audit path uses** — `await hashRendered(render(alert,'sms'), pariwarId)` where `hashRendered = createRenderedMessageHash({kms, hmacKeyRef})` (the very function passed to `deps.hashRendered`) — **not** a hand-inlined `encryption.blindIndex('alert_rendered', …)`. So if the HMAC construction (algorithm, domain-separation label, context binding) ever changes, the expected value tracks it automatically and the test can't silently diverge from production. Then assert the stored `sms` line's `requestPayloadHash` **equals that helper-computed value**, matches `/^[0-9a-f]{64}$/`, and is **NOT** `sha256Hex(canonicalJsonStringify(render(alert,'sms')))` (the load-bearing AI-4-3(c) property: a keyed HMAC, never a brute-forceable raw sha256 of member-facing content). This gives the shipped `dispatch` audit path its **first real-path exercise with non-accept outcomes** — the existing spec only ever saw all-accept.

**(3) The composed Epic-6-shaped PROTOTYPE HARNESS — cascade + audit interlock end-to-end (live DB).**
This is the H-7 headline: prove the two primitives **compose** into the shape Epic 6 will build. A `CascadeSender` that, per attempt: `render` → `provider.send` (the doubles) → `toOutcome` (the shared helper) → **writes the per-channel `alert.channel_send` audit line** via the real `createAuditPort(pool)` + `hashRendered` (PII-safe HMAC). Before running the cascade, write **one `alert.dispatch` line** (`requestPayloadHash = alertPayloadDigest(alert)`, `resourceLocator: alert:${alertId};…`) via the same audit port — modeling the top-level dispatch line. Run the cascade to SMS. Assert: cascade `deliveredChannel === 'sms'`, the same **"stop after SMS"** property as Test (1) (SMS sent exactly once; no attempt after it), **and** the audit rows for this alert include **one `alert.dispatch`** + **`alert.channel_send`** lines for `push`, `whatsapp`, `sms` (membership by unique `alertId`, PII-safe HMAC on each).

**Item 1 — this test MUST be unmistakably marked as a prototype harness, not a production seam**, so no future dev mistakes it for the committed Epic-6 composition:
- Name the `it` explicitly, e.g. `it('[PROTOTYPE HARNESS — models the Epic-6 live-dispatch seam, not production] cascade + audit interlock end-to-end', …)`.
- Open the block with a banner comment stating: *this harness composes shipped primitives to prove they interlock; it MODELS — does not commit — the composition Epic 6's first live caller will build; it is test-only; it touches no frozen primitive and adds no production live-dispatch call site; if Epic 6 wires the composition differently, this test still validates the primitives, not the seam.*
- Record the same in the Dev Agent Record per [[feedback_closure_language_precision]].

> If BigDev prefers a leaner scope, Tests **(1)+(2)** alone satisfy the retro's literal "cascade fires + two audit lines" via honest per-primitive coverage; Test **(3)** is the higher-value composed-interlock prototype that directly answers H-7. Recommended: ship all three (see §9).

## 6. Constraints / guardrails (do NOT violate)

- **Zero production source change.** Do not touch `dispatch.ts`, `cascade.ts`, `provider.ts`, `render.ts`, `audit.ts`, `CANONICAL_CHANNEL_LADDER`, or any `src/**` file. If a test needs a behavior, build it in the test tree. Any temptation to "just add a cascade path to dispatch" is Epic 6, and is forbidden here ([[project_channels_no_live_dispatch_yet]]).
- **No production live-dispatch call site.** Nothing under `apps/**` or `src/**` gains a `dispatch(`/`runChannelCascade(` caller. Epic 6 remains the first live caller.
- **No real timers.** Inject the `sleep` recorder + a trivial `backoffMs`. The default 30s/5m/30m schedule must never run in CI.
- **Membership, not counts** ([[project_live_db_test_gotchas]]). Fresh UUIDs per test; filter every assertion by the unique per-alert `resourceLocator`. Never assert an absolute `audit_log_entries` row count.
- **Honest outcome mapping.** The test's status→`ChannelSendOutcome` mapping must mirror `dispatch`'s `sendStatusToOutcome` (never label a `rejected`/`not_implemented` send as `sent`) — the honesty the primitive guarantees must not be undermined by the harness.
- **`skipIf(!hasDatabase)`** so `pnpm test` (no Docker) stays green; the live assertions run only under `ci:local` + `DATABASE_URL` on :5433.

## 7. Tasks

- [x] Author `packages/channels/tests/integration/live-dispatch-cascade.spec.ts` with the beforeAll/afterAll live-DB harness mirrored from `dispatch-audit.spec.ts` (fake KMS, `createDb`, `pool.end()`), `describe.skipIf(!hasDatabase)`.
- [x] Add the test-local `rejectingProvider(id, channel)` double **with the item-5 "WHY REJECT DOUBLES EXIST" rationale comment** (§3); reuse `createFixtureSmsProvider()` for the SMS accept rung; give each double a `send`-call counter. Build the mixed-outcome provider registry + the `sleepRecorder` (mirror `tests/cascade.test.ts`).
- [x] Add the **single shared `toOutcome(result)` helper** (§3 item 2) used by Tests (1) and (3), with its "mirrors dispatch's private `sendStatusToOutcome`" comment. Build **one `hashRendered = createRenderedMessageHash({kms, hmacKeyRef})`** reused for every produced/expected hash (item 4).
- [x] **Test (1)** — AR-19 fallback push→WA→SMS delivers on SMS; trail ordering + retry bound + Telegram-independence; **item-3 "stop after SMS"** (SMS `send` called exactly once; last trail entry is `sms:sent` with none after); injected backoff, no real timers.
- [x] **Test (2)** — live-DB `dispatch` with non-accept outcomes: one honest `alert.dispatch` line (`push:rejected,whatsapp:rejected,sms:sent,telegram:skipped_ineligible`, payload digest), three `alert.channel_send` lines (400/400/202), SMS line hash **computed via the shared `hashRendered` helper** (item 4, future-proof) — equals stored, matches `/^[0-9a-f]{64}$/`, ≠ raw sha256; all keyed by unique `alertId`.
- [x] **Test (3)** — composed Epic-6-shaped **prototype harness**: cascade whose sender writes per-channel `alert.channel_send` lines via the real audit port/`hashRendered` + a top `alert.dispatch` line; assert delivered-on-SMS + "stop after SMS" **and** the audit lines landed. **Item 1 — mark it unmistakably as a prototype:** the `it` name carries `[PROTOTYPE HARNESS — models the Epic-6 live-dispatch seam, not production]` + the in-file banner comment (§5).
- [x] **Verify:** `DATABASE_URL=… pnpm --filter @twt/channels test` green against twt-test-pg (:5433); confirm `pnpm test` (no DB) still passes via `skipIf`; run `DATABASE_URL=… pnpm ci:local` and confirm the `integration-tests` job stays green ([[project_ci_actions_suspension_local_mirror]]). Confirm **`git diff --stat` touches only the new spec file** (zero production source change) — the story's core invariant.

### Review Findings

- [x] [Review][Patch] `toOutcome` hand-mirrors `dispatch.ts`'s private `sendStatusToOutcome` with only a comment as a sync guard, and silently maps any unrecognized future `SendResult.status` to `not_implemented` instead of failing loudly [packages/channels/tests/integration/live-dispatch-cascade.spec.ts:129-140] — fixed: converted to a `switch` with a `never`-typed default case that throws on any unrecognized status.
- [x] [Review][Patch] Non-null assertions on `.find()` results (`pushLine!`/`waLine!`/`smsLine!` in Test 2, `smsLine!` in Test 3) throw an unclear `TypeError` instead of a clear assertion failure if an expected audit row is ever missing [packages/channels/tests/integration/live-dispatch-cascade.spec.ts:272-280,358-361] — fixed: added explicit `expect(...).toBeDefined()` checks (with named messages) before dereferencing.
- [x] [Review][Patch] Dead guard `if (!hasDatabase) return;` inside `beforeAll` is unreachable (the enclosing `describe.skipIf(!hasDatabase)` already prevents `beforeAll` from running when `hasDatabase` is false); `pool`/`db` are typed as always-defined (`pg.Pool`, `Db`) though only assigned conditionally [packages/channels/tests/integration/live-dispatch-cascade.spec.ts:158-166] — fixed: removed the dead guard; assignment in `beforeAll` is now unconditional, matching the always-defined types.
- [x] [Review][Defer] Unbounded accumulation in the shared global `audit_log_entries` table with no cleanup across CI runs [packages/channels/tests/integration/live-dispatch-cascade.spec.ts] — deferred, pre-existing pattern inherited from the established live-DB test convention (`dispatch-audit.spec.ts` and [[project_live_db_test_gotchas]]), not introduced by this diff

## 8. Done when

- A new live-DB integration spec exercises, on real provider doubles (no network) and the live audit DB (:5433): **(a)** the AR-19 fallback cascade push→WA→SMS delivering on SMS, deterministic (no real timers); **(b)** `dispatch`'s honest audit emission with **non-accept** outcomes (one dispatch line recording every channel's true outcome + a per-channel send line carrying the PII-safe HMAC, not raw sha256); and **(c)** the composed cascade+audit interlock the Epic-6 live caller will build.
- **`git diff` touches only the new test file** — zero production source change; no frozen primitive modified; no production live-dispatch call site added.
- `pnpm test` (DB-free) stays green via `skipIf`; `pnpm ci:local` with `DATABASE_URL` on :5433 runs the new spec green in `integration-tests`.
- The Dev Agent Record records the load-bearing reconciliation (§2): the harness **models, does not commit,** the Epic-6 live-dispatch seam; `dispatch`-independent-fan-out vs `runChannelCascade`-fallback are distinct semantics; Epic 6 remains the first live caller. Recorded per [[feedback_closure_language_precision]].
- **BigDev's five tightenings are all satisfied:** (1) Test (3) is unmistakably named + bannered as a prototype harness; (2) exactly **one** `toOutcome` helper (no duplicated switch) shared by Tests (1)/(3), mirroring the private `sendStatusToOutcome`; (3) an explicit "stop after SMS" assertion (SMS sent exactly once, no trailing attempt); (4) the HMAC assertion computes its expected value through the **same production `createRenderedMessageHash` helper** so it can't drift; (5) the reject double carries an in-file rationale comment explaining why it must not be simplified back to a shipped fixture.
- Lands **before Epic 6's first live-dispatch caller** — so nine stories of primitives get their first real-path exercise here, not in the `claim_status_change` hot path (H-7).

## 9. Open decisions for BigDev (save-for-end)

1. **Scope — three tests or two?** Recommended: **all three** — (1)+(2) give honest per-primitive coverage the retro literally names; (3) is the composed-interlock prototype that directly answers H-7 (the actual concentrated risk). If you'd rather keep the test tree free of any harness that *models* the unbuilt Epic-6 composition, drop (3) and let Epic 6's first story build + test the composition — (1)+(2) still satisfy the §7 ask. *(Recommend: ship all three.)*
2. **Category — `claim_status_change` (recommended) vs `alert_published`.** `claim_status_change` is exactly Epic 6's first live send (Telegram `skipped_ineligible`, highest fidelity). `alert_published` would additionally exercise the Telegram side-channel eligibility, but is not the Epic-6 shape. *(Recommend: `claim_status_change`; optionally add a single `alert_published` assertion if you want the Telegram-eligible path covered too.)*

## Dev Agent Record

### Agent Model Used

claude-opus-4-8 (Claude Code, bmad-dev-story workflow).

### Implementation plan / key decisions

- **The load-bearing reconciliation (§2), recorded per [[feedback_closure_language_precision]]:** the retro's single-flow phrasing ("fan across the ladder AND the fallback fires AND the two audit lines") maps onto **two distinct frozen primitives that do not compose today** — `dispatch` (independent fan-out + the two audit lines, **no cascade**) and `runChannelCascade` (the AR-19 fallback ladder, **no audit**). This story does **not** invent that composition into production: it is a **test-only harness** that composes the shipped primitives to prove they interlock. Test (3) **models — does not commit** — the seam Epic 6's first live caller (`claim_status_change`) will build; if Epic 6 wires it differently, this test still validates the primitives, not the seam. **Epic 6 remains the first live caller** (retro §6/§10).
- **Zero production source change** — the single deliverable is one new `.spec.ts`. `git status` shows only the new spec + this story md; `git diff --stat` touches no `src/**`/`apps/**` file. No frozen primitive modified; no production live-dispatch call site added ([[project_channels_no_live_dispatch_yet]]).
- **Shipped fixtures always `accept` → reject doubles (§3).** `createFixture*Provider` unconditionally return `accepted`, so a cascade over them delivers on push and never exercises AR-19. Authored two minimal `rejectingProvider(id, channel)` doubles (push→`rejected`, WA→`rejected`) conforming to the frozen `ChannelProvider` contract, each carrying the **item-5 "WHY REJECT DOUBLES EXIST" rationale comment**. **Reused `createFixtureSmsProvider()`** for the SMS accept rung (reuse over reinvention).
- **Category = `claim_status_change`** (§4) via the `claimStatusChange()` fixture shape with **fresh `randomUUID()` ids per test** (so every audit row is uniquely keyable by `alert:${alertId}%`). Exactly Epic 6's first live send → Telegram is category-**ineligible** → records `skipped_ineligible` and never cascades (maximal fidelity to the Epic-6 shape).
- **BigDev's five tightenings, all satisfied:** (1) Test (3) is named `[PROTOTYPE HARNESS — models the Epic-6 live-dispatch seam, not production]` + carries the in-file banner comment; (2) exactly **one** shared `toOutcome` helper (no duplicated switch) used by Tests (1)/(3), commented as mirroring dispatch's private `sendStatusToOutcome`; (3) explicit **"stop after SMS"** assertion — SMS `send` called exactly once + last trail entry is `sms:sent` with none after; (4) the HMAC assertion computes its expected value through the **same production `createRenderedMessageHash` helper** (`hashRendered`) so it cannot drift; (5) the reject double carries its in-file rationale comment.
- **Live-DB discipline** ([[project_live_db_test_gotchas]]): `writeAuditEntry` own-commits into the global hash-chain, so assertions are **membership by unique per-alert `resourceLocator`**, never absolute row counts. **No real timers** — the cascade `sleep` seam is a recorder + `backoffMs:[1,1,1]`.

### Debug Log References

- Two fix-ups during authoring: (a) Test (3) sender initially read `doubles[channel].provider.send` where `doubles` is `Record<Channel, ChannelProvider>` (TS2339) → corrected to `doubles[channel].send`; (b) `rejectingProvider`'s `send(_rendered, _target)` tripped `no-unused-vars` (the config does not honour `_`-prefix for args) → dropped the params (`send: () => …`). Both green after.

### Completion Notes List

- ✅ New live-DB integration spec `packages/channels/tests/integration/live-dispatch-cascade.spec.ts` — 3 `it`s, all green against twt-test-pg (:5433): (1) AR-19 fallback push→WA→SMS delivering on SMS deterministically; (2) `dispatch` honest audit emission with **non-accept** outcomes (one dispatch line recording every channel's true outcome incl. `telegram:skipped_ineligible`; three `alert.channel_send` lines 400/400/202; SMS line a PII-safe keyed HMAC ≠ raw sha256); (3) the composed cascade+audit **prototype harness** (H-7 headline).
- ✅ `pnpm --filter @twt/channels test` (DB-free) → the 3 new tests **skip** via `describe.skipIf(!hasDatabase)`; full suite 168 passed | 4 skipped. With `DATABASE_URL` on :5433 → **172 passed (15 files)**, the new spec's 3 tests green.
- ✅ `typecheck` (`tsc --noEmit`) + `lint` (`eslint .`) green for `@twt/channels`.
- ✅ **Core invariant confirmed:** `git status`/`git diff --stat` show only the new spec + this story md — **zero production source change**; no `src/**`/`apps/**` touched.
- ⚠️ Full `integration-tests` turbo command (all 8 DB-backed packages, `--concurrency=4`): 15/16 tasks green; a single **unrelated** `@twt/jobs` timeout (`member-renewal-lifecycle.test.ts`, "Test timed out in 5000ms") under concurrent load. **Confirmed innocent** — the spec passes 35/35 in isolation; this is the known concurrency-oversubscription flake ([[project_ci_local_concurrency_oversubscription]], [[project_known_livedb_test_failures]]), not a regression from this test-only, `@twt/channels`-only change (`@twt/channels` was green in every run).

### File List

- `packages/channels/tests/integration/live-dispatch-cascade.spec.ts` — NEW (the only file this story adds).
- `_bmad-output/implementation-artifacts/ai-5-2-live-dispatch-integration-test.md` — this record.

### Change Log

- 2026-07-08 — Created AI-5-2 story (create-story). Ready-for-dev.
- 2026-07-08 — Applied BigDev's five pre-implementation tightenings: (1) Test (3) named + bannered as a prototype harness; (2) single shared `toOutcome` helper (no duplicated switch); (3) explicit "stop after SMS" assertion; (4) future-proof HMAC via the shared `createRenderedMessageHash`; (5) in-file rationale comment on the reject doubles. Confirmed both recommendations (three tests, `claim_status_change`).
- 2026-07-08 — Implemented (bmad-dev-story): authored the single new live-DB integration spec `packages/channels/tests/integration/live-dispatch-cascade.spec.ts` (all three tests). Green against twt-test-pg (:5433) — 172 passed; DB-free `pnpm test` stays green via `skipIf`; `typecheck`+`lint` green; **zero production source change** confirmed (`git diff --stat` touches only the new spec). All five BigDev tightenings realized in code. Status → review.

## 10. References

- `epic-5-retro-2026-07-08.md` §6 (Epic 6 signals), §7 (AI-5-2 confirmed), §8/§10 (critical path), H-7/I-3.
- `epics.md` L283 (AR-19 definition), L2071/L2117/L2140/L2192-2195 (AR-19 fallback ladder + example backoff 30s/5m/30m), Epic 6 dependency on the channel dispatcher.
- `packages/channels/src/dispatch.ts` (frozen fan-out + audit; `sendStatusToOutcome`, `CANONICAL_CHANNEL_LADDER`, category eligibility), `src/cascade.ts` (AR-19 fallback primitive), `src/provider.ts` (frozen `ChannelProvider` contract), `src/audit.ts` (`createAuditPort`/`createRenderedMessageHash`/`alertPayloadDigest`, AI-4-3(c)/(d)), `src/providers/fixture-*.ts` (always-`accept`).
- Existing patterns to mirror: `tests/integration/dispatch-audit.spec.ts` (live-DB harness + HMAC recompute), `tests/cascade.test.ts` (`sleepRecorder`/`scriptedSender` determinism), `tests/fixtures.ts` (`claimStatusChange()`), `scripts/ci-local.sh:65` (`integration-tests` job), `packages/channels/vitest.config.ts` (`.spec.ts`/`forks` wiring).
- Memory: [[project_channels_no_live_dispatch_yet]], [[project_live_db_test_gotchas]], [[project_known_livedb_test_failures]], [[project_ci_actions_suspension_local_mirror]], [[project_ci_local_concurrency_oversubscription]], [[feedback_closure_language_precision]].
