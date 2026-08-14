---
baseline_commit: 19fa6445b065122400d4cd4ee0f3761d78d316c1
---

# Story 10.21: Off-Portal DPDPA Access `[SURFACE]`

Status: ready-for-dev

> ⛔ **THIS STORY IS A RELEASE GATE, AND THE GATE IS NOT THE FLIP.** Epics: *"must land before the first
> termination is permitted."* Concretely: the `termination_access_block` feature flag ships **DEFAULT OFF**
> and its enablement is **Trustee-Panel-exclusive**, through a formal `.decision-log.md` entry, and is
> **additionally gated on this story landing.** ⚠ **Cite this correctly.** Decision `2026-08-10-097`
> clause 6 (`.decision-log.md:837`) reads *permissively* in its own words — *"the login block ships behind
> a DEFAULT-OFF flag, and **the flip is authorised once Story 10.21 lands**"* — so a dev agent who opens
> clause 6 to check this banner reads a sentence that appears to contradict it. The **stricter** posture is
> the ratified one and lives elsewhere: `097` **clause 12 bullet 4** (`.decision-log.md:964` — *"Clause 6
> does not authorise the flip … The flip requires Story 10.21 to have landed, and remains a separate
> act"*), the `097` Follow-ups, and Decision **`2026-08-10-098` clause 2** (`.decision-log.md:753`).
> ⛔ Cite those, not clause 6 alone.
>
> ⛔ **This story does NOT flip the flag.** Landing it *discharges the gate*; the flip remains an
> unauthorised act until the Panel rules ([[feedback_closure_language_precision]] — "discharges the gate on"
> is not "authorises"). ⚠ **Whether the gate is discharged is itself Escalation 2's question, and this
> story does not answer it** — the Panel rules whether three mechanized rights plus a recorded correction
> process discharge it, or whether all four must be mechanized first. What this story CAN state without
> pre-empting that ruling: landing **AC1–AC4 and AC7–AC15**, plus AC5's **off-portal-build half** (defined
> in AC5), delivers the entire un-blocked scope — ⛔ **with two carve-outs**: AC5's export-content half
> (Escalations 7 + 8) and **AC11's `consumed`-status arm** (Escalation 9).
>
> SUPERSEDED 2026-08-14 BY DECISION `2026-08-14-109` — THE PANEL RULED ALL EIGHT ESCALATIONS.
> The carve-outs above are **discharged**: AC11's `consumed` arm is ruled (clause 6) and was already
> correct; AC5's export-**content** half **transferred** to a named successor story (clause 9), so it
> leaves this story rather than blocking it; and **AC-R3 closed with no code** (clause 7).
> THE GATE IS NOT DISCHARGED, AND THIS BANNER STILL DOES NOT DISCHARGE IT. Clause 2 ruled that
> three mechanized rights **plus a recorded helpdesk-ticket correction process** are sufficient — which
> makes the gate **DISCHARGEABLE**, not discharged. The correction process (**AC-R2**) and member-direct
> delivery (**AC-R1**) are now un-blocked but **NOT YET BUILT**. ⭐ AC-R1's fallback half was re-blocked
> by `2026-08-14-112` and **un-blocked again by `2026-08-14-113`**, which ratified **option (i)**: a
> three-part gate (member request · unsuccessful OTP attempt · staff attestation) with the terminology
> **mandated** as `primary_delivery_not_completed`. ⛔ **ZERO BLOCKS REMAIN — and that still is NOT
> "done": AC-R1 and AC-R2 are UNBUILT.** ⚠ One narrow question stays open (whether element 2 should
> also require `attempts = 0`); it does **not** block. And the
> gate stays **OPEN** until a ratified `.decision-log.md` entry says otherwise — the **flip** remains
> a separate Panel-exclusive act, and `109` clause 2 expressly does not authorise it. ⛔ Do not read a green
> suite as a discharged gate, and ⛔ do not let this banner answer Escalation 2 — an earlier draft did
> exactly that while forbidding it elsewhere in the same document. ⚠ `deferred-work.md:195` reads *"that flip is Story 10.21's and remains gated"* —
> that line is **loose phrasing from the 10.20 section**; the authoritative record is the 10.19 section
> (`deferred-work.md:4043-4047`) and Decision `097` clause 6. **Follow the 10.19 record.** Do not add a
> flag flip, a default change, or a seed change to this story.
>
> **Depends on:** Story 10.19 (`done`) — the block this story makes survivable; Story 10.1–10.4 (`done`) —
> the helpdesk substrate AC3 requires reuse of; Story 3.11 / 3.12 (`done`) — the export + erasure engines.
> **Gates:** Story 10.22 (its appeal must be reachable off-portal *"reusing Story 10.21's route"*).

## Story

As a terminated member with no portal account,
I want an identity-verified route to my statutory data rights,
so that ending membership does not silently end rights the DPDPA guarantees.

---

## 🎯 The gap, stated exactly

Niyamavali **§8.4** is already amended and ratified (landed in Story 10.19):

> *"**Statutory rights survive termination.** Termination ends authenticated member access. Any statutory
> rights of access, correction, portability or erasure shall be exercised through an **identity-verified
> administrative process designated by the Trust**."* — `docs/legal/niyamavali.md:188`

And the termination notice **already promises the route, in shipped copy, in both locales**:

```
packages/i18n/locales/en/common.json:341
  "moderation.notice.terminated.body":
    "… To obtain your records or exercise your rights over your data, please call our helpline."
```

**No such process exists.** Every DPDPA surface the system has is member-session-gated:

| Right | Surface today | Reachable by a terminated member? |
|---|---|---|
| Access / portability | `POST/GET /api/v1/member/data-export/*` (`data-export/routes.ts`) | ❌ `requireMemberSession`; ⚠ **step-up gates only the GET download (`:60-67`) — the POST request is session-only (`:32-41`)**, and neither carries a lifecycle check. See AC12 |
| Erasure | `POST /api/v1/member/rtbf` (`rtbf/routes.ts`) | ❌ session + step-up, **and** see Finding 1 |
| Correction | — | ❌ **no endpoint exists on any surface** (Finding 3) |

This story builds the process. It is the copy-truth obligation of a sentence already shipped.

---

## The findings that shape this story

⛔ **Read all nine before writing code.** Findings 1, 2, 3, 5 and 9 each invalidate the obvious
implementation. Two of them (2 and 5) mean the *reuse* the epic AC prescribes is not available in the
shape it names. **Finding 9 is the one that lets every AC go green while the story ships a DPDPA
violation** — read it twice.

### ⭐ Finding 1 — the erasure right is STRUCTURALLY UNREACHABLE for a terminated member, and not because of auth

Even with a session handed to them, a terminated member **cannot** exercise erasure:

```
apps/api/src/modules/rtbf/handlers.ts  (assertAnonymizable)
  RTBF is legal ONLY from `state = withdrawn`.
  · `anonymized`      → 409 rtbf.already_anonymized
  · any other state   → 409 rtbf.invalid_state

packages/domain/src/member/state.ts:118
  case 'member.rtbf_anonymized':
    if (state === 'withdrawn') return 'anonymized';
    return state;                       // ← identity no-op for every other state
```

**Termination is an OVERLAY, not a lifecycle state** — the ratified rule from 10.19/10.20. A terminated
member's `members.state` is whatever it already was.

⚠ **And that is ANY of the nine `MEMBER_LIFECYCLE_STATES`, not the three an earlier draft named.**
`nextModerationStatus` (`moderation/status.ts:36-55`) is a pure function of `ModerationStatus ×
ModerationAction` and carries **no lifecycle-state precondition whatsoever**; `overlay.ts:3-6` states the
orthogonality outright — *"A member can be (e.g.) `active` AND `suspended` simultaneously; both are
queryable independently."* So a member can be terminated while `pending-kyc`, `pending-fee`,
`pending-valid` or `lock-in` exactly as readily as while `active`. ⛔ **An arm widened to only
`active | active-in-grace | lapsed-unpaid` leaves the phantom-anonymization hole open for four states** —
it would reproduce, inside this story's own fix, the defect the finding exists to close. See AC7. So:

- the API guard rejects with `409 rtbf.invalid_state`; and
- even bypassing the guard, the reducer returns **identity** — you would scrub the PII and append an event
  that never moved the state. `handlers.ts` names this exact outcome: *"prevents a PHANTOM anonymization."*

⛔ **Do NOT introduce a `terminated` lifecycle state.** That is the rejected model the whole 10.16–10.23
correct-course exists to prevent ([[project_moderation_model_correct_course]]).

⭐ **Recommended shape — the WS-D pattern, verbatim.** Story 10.20 WS-D ratified: *"a dwell/notice
precondition is added in `nextModerationStatus`'s **caller** — a new precondition, **not a new state**."*
Apply the same shape here:

1. `reduce`'s `member.rtbf_anonymized` arm accepts **every `MEMBER_LIFECYCLE_STATES` label except
   `anonymized`** → `anonymized` (eight `from` states), and all eight transitions are added to the
   documentation matrix at `state.ts:155`. ⛔ The set is **derived from the enum, never hand-listed** —
   see AC7's totality test.
2. The **legality** — *"withdrawn, OR the moderation overlay reads `terminated`"* — is enforced in the
   **caller** (the new admin handler and the existing member handler), never in the reducer. The reducer
   cannot see the overlay and must not learn to.

⚠ This widens what an appended `member.rtbf_anonymized` event *means*, so it is a `member-state-invariant`
gate concern: run `pnpm member-state:test && pnpm member-state:check`.

### ⭐ Finding 2 — the artifact this story delivers is HOLLOW. Two of its seven files are empty placeholders whose owner expired.

```
packages/domain/src/data-export/assemble.ts:378-379
  [EXPORT_FILENAMES.CONTRIBUTION]: emptySection('Epic 8'),
  [EXPORT_FILENAMES.CLAIM]:        emptySection('Epic 6'),

  → { records: [], _status: 'no_source_system_at_this_epic', _wired_by: 'Epic 8' }
```

**Epic 6, Epic 8 and Epic 9 are all `done` with retrospectives.** The deferral named an **EPIC**, and epics
carry no acceptance criteria — so no story owned it. This is the **second instance of the exact class**
recorded in [[project_r7_fact_producer_unbuilt]] (*"a deferral naming an EPIC expires unowned"*), and it is
being found the same way the first one was: by a later story tripping over it.

⛔ **This matters more here than anywhere else.** FR-95 names contribution history explicitly
(*"Includes member profile, contribution history, attribution chain, Contribution Notes (PDFs)"*), and after
the flip this export is the **only** route a terminated member has to their own record. Shipping the release
gate on an export that returns `records: []` for the member's entire contribution life would deliver a
gesture, not a right — and it would do so silently, exactly like the `_wired_by` marker did.

⭐ **In scope (AC5) — ⚠ SUPERSEDED 2026-08-14: this work TRANSFERRED OUT of Story 10.21 to a named
successor story (Decision `2026-08-14-109` clause 9), with the claimant-only predicate ruled at clause 5.
It is no longer blocked and no longer this story's. The paragraph below is retained as the historical
statement of the problem.** ⛔ Formerly blocked on Escalations 7 + 8: wiring `contribution_history.json` and
`claim_history.json` from the sources that now exist is this story's, but cannot start — the section
contracts structurally reject any record (Escalation 7) and the claim subject predicate is undefined
(Escalation 8). ⚠ Finding 2 stands; only its remedy is blocked. **Not in scope, but must be RECORDED with a named re-trigger** (never another epic name): the
Contribution-Note PDFs FR-95 also names (Story 8.7 renders them; they are generated artifacts, not records),
and the member's helpdesk tickets (10.1–10.4) which are member-authored data absent from the export.

### ⭐ Finding 3 — the CORRECTION right has NO mechanism ANYWHERE, on any surface

```
$ grep -rn "r\.\(patch\|put\)(" apps/api/src/modules
  channel-config · news-blog · banners · rules · custom-fields · claims.ground-inspection
```

Not one member-profile write path — not member-facing, not admin-facing. Correction is unmechanized for
**every** member, not merely for terminated ones. So AC1's *"delivers access, correction, portability and
erasure"* cannot be satisfied by reuse for this one right, and satisfying it by building a general admin
member-profile editor is a **much larger act** than this story owns (its own RBAC surface, its own PII
write-audit posture, its own correction-vs-falsification governance question).

⛔ **Do not silently narrow this to three rights.** Scaling scope down is not the dev agent's call. Build
what AC6 specifies, raise **Escalation 2**, and state the disposition in the story rather than letting a
green suite imply a fourth right that does not exist.

### ⭐ Finding 4 — delivery: the artifact is Tier-1, one-time, 24h, and gated on the session termination removes

`data_exports.artifact_ciphertext` is `piiColumn(1, 'data_export')` — *the whole ZIP* as a Tier-1 envelope
ciphertext, decrypted only inside the step-up-gated member download handler. There is no signed-URL path
(architecture §2.12 says *"download via short-lived signed URL"*; Story 3.11 shipped an encrypted-at-rest
stream instead — a pre-existing, already-accepted architecture variance, **not** this story's to reconcile).

Two candidate deliveries, and the choice is **not** the dev agent's:

- **(a) Staff-mediated.** The fulfiller downloads under `member.data_rights` + admin step-up + audit and
  hands the ZIP over through the administrative process. ⚠ This is the first path on which a **staff actor**
  obtains a member's assembled, decrypted Tier-1 export.
- **(b) Member-verified grant.** A one-time, OTP-verified download grant to the registered mobile — the
  member proves possession without a session being issued. Better PII posture; a **new auth primitive**;
  and it fails for a member who no longer controls the registered mobile.

⛔ **NEITHER IS BUILT UNTIL THE PANEL RULES.** An earlier draft of this story asserted that (a) *"is
required as the fallback under either ruling"* and therefore built it. **That assertion was unfounded** —
it is precisely one of the things being asked. If the Panel rules that a staff actor must never obtain a
member's decrypted Tier-1 export, (a) is not a fallback, it is **forbidden**; and a story that builds it
anyway has made the PII-posture decision by implementation. See the ruling-gated section below.

⭐ **There is NO stranded-member window, so the correct sequence costs nothing.** The
`termination_access_block` flag is DEFAULT OFF **and its flip is itself gated on this story**. No member
can be terminated-with-access-ended before this story lands. There is therefore no interval in which a
member needs a route and has none, and no urgency argument for pre-building a delivery model ahead of its
ruling. ⛔ Do not reintroduce one.

### ⭐ Finding 5 — the "new category" route is a TRAP, and the golden-hash guard's own remedy is part of it

The obvious design — add a `data-rights` helpdesk category — is **rejected**, for three compounding reasons:

1. **A golden hash fences the default policy.** `packages/domain/tests/helpdesk/default-policy-hash.test.ts`
   pins `sha256(canonicalJson(DEFAULT_ROUTING_POLICY))`. Any rule change fails it.
2. ⛔ **The guard's prescribed remedy is itself a defect.** It says *"bump `DEFAULT_ROUTING_POLICY_VERSION`,
   then update `EXPECTED_HASH`."* But per-Pariwar overrides **start at 2** (`registry.ts:12-13`), and
   `routingPolicyDocumentForVersion` resolves `version === DEFAULT_ROUTING_POLICY_VERSION` to the code
   constant. Bumping 1 → 2 would (i) make every already-published version-2 **override** resolve to the
   **default document**, and (ii) make every historical ticket pinned at version **1** resolve to `null`
   — i.e. **un-replayable**. The guard protects the right invariant and recommends the wrong cure.
3. **A new category SILENTLY MIS-ROUTES under every existing override.** ⚠ **An earlier draft of this
   finding said ticket creation *fails*. That was wrong** — verified at `19fa644` during story validation,
   and the error is worth stating because the true behaviour is the *worse* of the two. `resolveRoute` has
   a **Phase-2 fallthrough**: when no category rule matches, it falls through to the `other` /
   `sub_category: null` catch-all (`routing.ts:108-111`), and `validateRoutingPolicyRules` **requires**
   that catch-all in every published policy (`registry.ts:209-210` — *"rules must include an 'other' /
   sub_category:null catch-all rule"*). `RoutingUnresolvedError` (`routing.ts:113`) is therefore reachable
   only for a policy carrying neither, which the validator makes unreachable for anything published
   through the registry. So a category minted today is absent from every override authored before today
   and its tickets land on **that Pariwar's generic `other` desk** — the `other` rule's role, scope and
   SLA — with **no error anywhere**. A statutory data-rights request routed to the general queue, silently,
   under the wrong SLA. A loud failure would at least be visible.

⭐ **Recommended, and what AC2 specifies: reuse category `other` with `sub_category: 'dpdpa-data-rights'`.**
Subcategories are *"a registry-driven free token"* (`contracts/helpdesk/category.ts`), the `other` rule
carries `sub_category: null` (the catch-all-within-category arm, so it matches), it is present in the
default policy, and **nothing in `DEFAULT_ROUTING_POLICY` changes** — zero hash break, zero enum migration,
zero replay risk. A Pariwar wanting compliance-owner routing publishes an **override**, which is precisely
the mechanism the versioned registry exists for.

⭐ **Reason 3, corrected, makes this design STRONGER than it first looks.** The `other` / `sub_category:
null` rule is not merely present in the default by convention — it is **validator-enforced in every
published policy** (`registry.ts:209-210`). So `category: 'other'` + a subcategory token is guaranteed to
resolve for **every** Pariwar, override or not, with no coverage assumption to verify per-tenant. And
`HelpdeskSubcategory` is `z.string().min(1).max(64)` with **no allow-list**
(`contracts/helpdesk/category.ts:48`), so `'dpdpa-data-rights'` (17 chars) needs no registration, no
migration and no policy edit. ⚠ The flip side, and the reason AC2 pins the token to a single exported
constant: because the token is free and the catch-all matches anything, a **typo also routes cleanly** to
the same desk and nothing complains.

⚠ The default-policy versioning defect (reason 2) is **real and now known**. It must not expire unowned →
**Escalation 4**.

### ⭐ Finding 6 — an OPEN QUESTION recorded in the export core is now DUE, and this story is its named consumer

```
packages/domain/src/data-export/assemble.ts:27-45   (header, verbatim)
  ⚠ DELIBERATELY NOT EXPORTED: the Story 10.10 moderation rationale …
  → OPEN QUESTION for PM/legal … Whoever answers it should also decide whether `actor_display`
    rides along, since naming the acting trustee to a terminated member is its own decision.
```

The question was recorded against a hypothetical. This story is that hypothetical: it is the DPDPA access
right, exercised by exactly the terminated member the note names. ⚠ The column is now
`decision_note_ciphertext` (renamed by migration 0099, Story 10.20) — **the header comment is stale on the
name** and 10.20 added three further Tier-1 columns (`escalation_inadequacy`, `escalation_proportionality`,
`immediate_termination_reason`) that inherit the same undecided question. → **Escalation 3**.

⛔ Do **not** resolve this by adding the fields to the export. Do **not** resolve it by staying silent.
Record the disposition; correct the stale column name in the header either way.

### ⭐ Finding 7 — §8.4a's "Statutory rights" row is the only row in the table with NO disposition

`docs/legal/niyamavali.md:192-218`. The mechanization-status note under §8.4a states *"Each row is
dispositioned individually"* and then disposes four rows — escalation justification, prior sanction, notice
and opportunity, portal access. The **"Statutory rights (DPDPA)"** row (*"Survive, exercised through an
identity-verified administrative process"*) is **not among them**. It has been asserting an unbuilt process.

The instrument's own rule is: *"A row is moved out of this list only once the enforcing mechanism and its
test are in place."* This story lands that mechanism → AC8 requires the disposition be **stated**, not left
inferable.

### ⭐ Finding 8 — the notice that names the route is IN-APP-ONLY, and that is NOT this story's to fix

Recorded so the dev agent does not chase it. Post-flip, the terminated member's one notice is delivered to a
surface they can no longer authenticate into (`deferred-work.md:4061-4068`, Q3 option (b), Decision `097`
clause 3 — *ruled against the author's recommendation*). Its re-trigger is a per-alert
`CostOptimizationInput` exemption field that does not exist. ⛔ Out of scope. Do not add a channel, do not
touch `moderation-notify.ts`'s category or `time_critical` pin.

### ⭐ Finding 9 — ERASURE DOES NOT REACH THE EXPORT THIS STORY BUILDS, and the guard that was supposed to is inoperative

⚠ **This story is the first to exercise both rights on the same member, off the same ticket. That is what
makes a latent 3.11/3.12 seam defect load-bearing.**

`anonymizeMember` (`member/anonymize.ts`) updates `member_identities`, `member_kyc_profiles`,
`member_addresses`, `member_nominees`, `member_medical_disclosures`, `member_withdrawals`,
`member_moderation_actions` and `member_moderation_grounds`. It does **not** touch `data_exports` — and
`data_exports.artifact_ciphertext` is `piiColumn(1, 'data_export')`, i.e. **the member's entire assembled
dossier as one Tier-1 envelope ciphertext**.

⛔ **The mechanism 3.11 documented for exactly this does not fire.** The schema and the migration both
claim the FK covers it:

```
packages/domain/migrations/0033_data-exports.sql:40
  -- FK → members.member_id (ON DELETE CASCADE: RTBF row-deletes the member, Story 3.12).

packages/domain/src/schema/data_exports.ts:19
  NO direct DELETE — RTBF removal (Story 3.12) is via the member FK cascade.
```

**Story 3.12 shipped a SOFT delete.** `anonymize.ts` says so in its own header — *"an RTBF is a SOFT
delete (the `members` row is retained)"* — and performs **zero** `delete()` calls. The `members` row is
never deleted, so `ON DELETE CASCADE` **never fires**, and the only stated RTBF mechanism for
`data_exports` has been inert since 3.11 landed. 3.11 was written against an assumption 3.12 then
contradicted; nothing detected it because no story until this one built an export for a member it also
erases.

⚠ **What actually protects the artifact today is a TTL, not the erasure.**
`DATA_EXPORT_VACUUM` (`apps/jobs/src/data-export.ts:241-244`) zeroes `artifact_ciphertext` **only for
`consumed` / `expired` rows**, on an hourly cron (`'15 * * * *'`), and `expires_at = now +
DOWNLOAD_WINDOW_MS` = **24h**. So a `ready`, unconsumed export survives an erasure for up to **~25 hours**,
in full, decryptable.

⛔ **AC5 makes this the NORMAL path, not an edge case.** AC5 deliberately builds the artifact and leaves it
**undelivered** (delivery is AC-R1, blocked). So the expected intermediate state of this story is exactly:
a `ready` row, unconsumed, holding the complete dossier — and AC7 then erases the member around it.

⚠ **And AC7's own test cannot catch it.** *"every Tier-1 column `anonymizeMember` covers reads the
sentinel"* tests the coverage set against itself. A table outside the set is invisible to it **by
construction**. → **AC11**, and → **Escalation 6** for the inoperative-cascade defect, which is broader
than this story.

### ⭐ Finding 10 — `routed_to_role` IS INERT, and the request has no operational recipient when the action requires TRUSTEE authority

⚠ **Traced 2026-08-14 against `b860523`. This finding decides nothing — it supplies the facts Escalation 10
is posed on.** ⛔ **Do not read it as authorising a routing change.**

**(a) `routed_to_role` is a FILTER, not a gate.** It is written once at creation
(`helpdesk/project.ts:227`), stored `notNull` (`schema/helpdesk_tickets.ts:148`), and read in exactly one
place: an **optional, caller-supplied** `routed_to_role` query parameter on the queue read
(`helpdesk/read.ts:71,90`; `apps/api/.../helpdesk/handlers.ts:346`). ⛔ **No transition, no detail read and
no permission check consults it.** Every `helpdesk.respond` holder in the Pariwar can see, pick up, reply
to and resolve **any** ticket in that Pariwar regardless of where it routed. So routing is **advisory —
SLA attribution and a "my queue" convenience — and carries no authority whatsoever.**

**(b) The `other` catch-all routes to a role AC3 forbids from executing.** `DEFAULT_ROUTING_POLICY`'s
`other` rule (`registry.ts:62`) targets **`helpline_operator`** at `dimension: 'pariwar'`. AC2 routes every
DPDPA request through that rule. AC3 grants `member.data_rights` to `pariwar_admin` **only** and ⛔ **not**
`helpline_operator`. ⚠ **This was already found and left undispositioned** — the final validation pass
recorded it as **F6**, *"the role half is described in Finding 5 and dispositioned nowhere"*, and triaged
it non-blocking. Escalation 10 **absorbs F6's role half**; the SLA half stays dispositioned as AC2 states
it (*"carried knowingly"*).

**(c) ⛔ "Trustee" is NOT `state_trustee`, and this is settled — do not re-open it.** `state_trustee`
(`roles.ts:362-369`) holds `claim.approve`, `member.suspend` (⚠ DEPRECATED, successor `member.moderate`),
`member.view_validity`, `niyamavali.review`, `tc.approve` at **`scopeCeiling: 'state'`**. It holds
**neither** `helpdesk.respond` **nor** `helpdesk.create`, and a `state` ceiling can **never** satisfy a
`pariwar`-dimension check — `scopeWithinCeiling` is a pure numeric compare over `CEILING_RANK`
(`rbac/scope.ts:132-137`; `CEILING_RANK` at `:73-76`; `pariwar:1 >= state:2` is false) with **no resolver
parameter**, so no geo-tree resolver would lift it — ⚠ the `trustee_panel` bundle comment cites
`scope.ts:113-118` for this, which is **stale** (that range is a comment block); the §RANK-ORDER note at
`:89-91` carries the canonical explanation ([[project_rbac_geo_scope_containment]]). Niyamavali **§8.7** settles the naming
independently, in ratified text: *"The Trustee Panel is **not** the 'State Trustee panel' of Part 9 …
a **trust-wide governing body, not a geographic office**"* (Decision `2026-08-10-096` clause 9).

**(d) ⭐ `trustee_panel` IS a real seeded role — and it holds NO helpdesk permission at all.** The
thirteenth bundle (`roles.ts:583-627`, Story 10.18, Decision `2026-08-10-096` clause 4), `scopeCeiling:
'pariwar'` — so unlike `state_trustee` it **could** satisfy a pariwar-dimension check. But its permissions
are exactly **`member.moderate` + `member.restore_terminated`**. ⛔ **It cannot see the queue, cannot open a
ticket, cannot reply and cannot resolve.** ⚠ It is also absent from every helpdesk module: `grep
trustee_panel` across `packages/domain/src`, `apps/api/src` and `packages/contracts/src` returns only
`rbac/{roles,permissions,scope}.ts` and `member-moderation/routes.ts:43`. **The Panel has governance
authority and NO operational queue.**

**(e) The registry would accept a `trustee_panel` target, and the result would fail SILENTLY.**
`validateRoutingPolicyRules` checks `target_role` only for **non-empty and ≤ length**
(`registry.ts:184-189`) — ⛔ it is **not** constrained to the seeded role catalog. So a Pariwar may publish
an override routing `other`/`dpdpa-data-rights` to `trustee_panel`, or to a **typo**, and it validates. Per
(a) the ticket would then display a destination no one can act on, with **no error anywhere** — the same
silent-misroute class Finding 5 exists to close, arriving through a different door.

**⇒ The gap.** A destination that can *execute* exists (`pariwar_admin`: holds `helpdesk.respond` at
`roles.ts:327` **and** AC3's `member.data_rights`, at a `pariwar` ceiling). What does **not** exist is any
answer to: **when the requested right requires *Trustee* authority, who receives and who executes?** ⚠ And
whether any DPDPA right requires it is itself undecided — off-portal **erasure of a terminated member** sits
directly adjacent to Panel-exclusive territory (`member.restore_terminated` is `trustee_panel`-exclusive
precisely because §8.4 makes restoration-from-termination a Panel act), yet AC3 assigns its execution to
`pariwar_admin`, expressly **Trustee-Lite** (`roles.ts:104,108,113`), while AC3 simultaneously pins the
emitted event to `actor: 'trustee'`. ⚠ **That pin is NOT a defect** — `memberActorSchema` is
`z.enum(['member','system','trustee'])` (`member/audit-shape.ts:19`) with no finer label, and the in-family
precedent is `moderation/write.ts:315`. It is a **coarse** staff-actor label, and it is recorded here only
so no reader mistakes it for a Panel attribution. → **Escalation 10 / D10**.

---

## In scope / out of scope

**In scope, un-blocked — build this now**
- The off-portal intake: an operator files a `data-rights` request as a helpdesk ticket through the
  **existing** Story 10.1 create route. No new intake surface, no public form.
- One new permission key + admin step-up context for **fulfilment** (separated from intake).
- **Building** the access/portability artifact off-session (reuse of the 3.11 `DATA_EXPORT_BUILD` job) plus
  the provenance columns — ruling-independent, because the artifact is built the same way under **either**
  delivery model.
- Fulfilment of **erasure** (reuse of `anonymizeMember`, with the Finding-1 legality precondition).
- **Extending erasure's reach to `data_exports`** (Finding 9, AC11) — ruling-independent: whatever the
  Panel rules about *delivery*, an erased member's dossier must not survive the erasure.
- ⛔ ~~Wiring `contribution_history` + `claim_history` into the export (Finding 2).~~ **MOVED — blocked on
  Escalations 7 + 8.** ⚠ This strikes **only this bullet**. The "Building the access/portability artifact
  off-session" bullet above it stands — that is AC5's **off-portal-build half** (defined in AC5), which is
  un-blocked.
- Subject-scoped reads keyed **member-scoped**, never artifact-scoped (AC4).

**In scope, RULING-GATED — blocked, not deferred**
⚠ These are this story's, and the release gate is not discharged without them. They are blocked on a
ratified `.decision-log.md` entry, not descoped. See *"Ruling-gated acceptance criteria"*.
ALL THREE RULED 2026-08-14 (Decision `2026-08-14-109`). They are no longer ruling-gated.
- **Delivery** (AC-R1) — ✅ **UN-BLOCKED IN FULL** (`109` cl.1 + `110` + `111` + `112` + `113`).
  **Primary:** member-direct, a one-time OTP-verified grant. **Fallback:** the `113` option-(i)
  **three-part gate** — the member's explicit request **AND** an unsuccessful OTP attempt (both
  machine-enforced, fail-closed) **AND** a staff attestation (recorded, ⛔ not machine-verifiable).
  ⛔ Terminology **mandated**: `primary_delivery_not_completed`, never `mobile_lost` /
  `mobile_unreachable`. Primary plus exception, never two co-equal routes.
- **Correction** (AC-R2) — ruled: a **recorded helpdesk-ticket process** suffices (clause 2).
  Un-blocked to build. No general member-profile editor.
- **The trustee-authority recipient** (AC-R3) — **CLOSED, no code** (clauses 7-8): no DPDPA action
  inherently requires Panel authority; where Trustee authority applies for another reason, the Trustee
  decides and an authorised administrator executes.

**Out of scope — named, so absence is not read as oversight**
- ⛔ The `termination_access_block` flip (Panel-exclusive; see the banner).
- ⛔ A public / unauthenticated data-request form (a new anti-abuse + enumeration surface; D5 promises *"a
  process, not a portal"*).
- ⛔ A `dpo` role. FR-99 activates *"at the MeitY threshold"*, DPO appointment is **OQ-7, open**, and
  minting a role bundle for an unconstituted body is precisely the defect Story 10.18 exists to teach
  ([[project_helpdesk_operator_surface_103]] — an inert capability). Route to `pariwar_admin`; name the DPO
  as the future holder in a comment.
- ⛔ Contribution-Note PDFs and helpdesk tickets in the export (record with a named re-trigger, AC5).
- ⛔ The in-app-only notice reach (Finding 8).

---

## Acceptance Criteria

⚠ **AC1 carries the epic's minted text VERBATIM** (`epics.md:4045-4056` — three Given/Then blocks plus the
release-gate line, verified byte-identical). Do not edit minted AC text to chase line numbers or findings
([[feedback_supersede_never_reinterpret]]). ⚠ **AC2–AC15 are this story's own authorship**, not minted —
an earlier draft claimed AC1–AC4 were minted, which would have wrongly frozen AC2's and AC3's heavy
prescription against correction. ⚠ **AC12–AC15 discharge load-bearing-invariant families** and are
stated after AC11 with their provenance. AC-R1/AC-R2/AC-R3 are ruling-gated and stated after AC15.

ALL THREE RULING-GATED ACs WERE RULED on 2026-08-14 (Decision `2026-08-14-109`). `AC-R1`
(delivery - **member-direct**) and `AC-R2` (correction - **a recorded helpdesk-ticket process**) are
**un-blocked and buildable**; `AC-R3` **closed with a disposition and no code**. They are stated after
AC15 with their rulings. AC6 remains deliberately empty and points at AC-R2.
Sub-question **1(ii)** was answered by `2026-08-14-110`, **narrowed** by `2026-08-14-112` to require
**BOTH** conditions, and its enforcement **settled** by `2026-08-14-113` (option (i), plus a mandated
terminology). ⛔ **ZERO BLOCKS REMAIN — and that is still NOT "done": AC-R1 and AC-R2 are UNBUILT.**
⚠ One narrow non-blocking question stays open (`attempts = 0`). **Read that section before planning
any task.**

### AC1 — The route (minted, verbatim)

**Given** Niyamavali Part 10 guarantees access, correction, portability and erasure, and Story 3.11's export
is a **member-portal** feature
**When** a terminated member exercises a statutory right
**Then** an **identity-verified helpline/helpdesk route** delivers access, correction, portability and
erasure without a standing authenticated surface

**Given** the D5 principle promises a **process, not a portal**
**Then** the route is administrative and identity-verified; it does not reinstate authenticated access

**Given** Epic 10's helpdesk subsystem
**Then** the route reuses the Story 10.1 substrate rather than inventing a parallel intake
**And** subject-scoped reads are **member-scoped**, not artifact-scoped

**Release gate:** must land before the first termination is permitted.

### AC2 — Intake reuses the 10.1 create primitive UNCHANGED, and `DEFAULT_ROUTING_POLICY` is byte-identical

**Given** Finding 5
**Then** a data-rights request is filed through the **existing** `POST /api/v1/p/:pariwarId/helpdesk/tickets`
with `created_via: 'helpline_call'`, `subject_member_id: <the member>`, `category: 'other'`,
`sub_category: 'dpdpa-data-rights'` — **no new intake route, no new category, no enum migration**
**And** `DEFAULT_ROUTING_POLICY` is **unchanged** and `default-policy-hash.test.ts` passes with its
`EXPECTED_HASH` **untouched** — a diff on that constant or that hash is a failed AC, not a rebase artifact
**And** the subcategory token is a single exported constant (`DPDPA_DATA_RIGHTS_SUBCATEGORY`) consumed by
the handler, the operator UI and the tests — never a repeated string literal
**And** ⚠ **that is MECHANIZED, not merely stated.** A source-scan test asserts the literal
`'dpdpa-data-rights'` appears in exactly **one** module (the constant's own), **excluding the scanning
test's own file** — ⚠ the test must contain the literal as its search needle, so an un-excluded scan
fails on itself. Build the needle by concatenation or read it from the imported constant, and assert the
handler and the operator surface both import the symbol rather than re-declaring it. ⛔ An un-mechanized naming convention decays
([[feedback_mechanization_split_commitment]]), and this one decays **silently**: reason 3 of Finding 5
establishes that the `other` catch-all matches **anything**, so a typo'd token routes cleanly to the same
desk and nothing anywhere complains. The convention has no natural failure signal — so it needs a gate or
it has nothing
**And** ⚠ **the `other` rule's SLA is inherited KNOWINGLY, not endorsed.** Routing here lands the request
on `sla_first_response_hours: 24` / `sla_resolution_business_days: 5` (`registry.ts:62`). ⭐ **RULED 2026-08-14 (Decision `2026-08-14-109` clause 4): the statutory horizon is
**48h first response / 5 business days**. The shipped 24h/5 is **STRICTER and therefore already
compliant** — ⛔ **no code change, and `DEFAULT_ROUTING_POLICY` is NOT edited.** ⛔ Do **not** loosen
24h to 48h to "match" the ruling: that would relax a commitment the Trust already meets. The
disposition moves from *"carried knowingly, pending the ruling"* to *"ratified at 48h/5; the shipped
24h/5 exceeds it."* ⚠ Historical context — **Escalation 5
declared that number legally unverified** — so this story ships a concrete SLA commitment for statutory
requests while stating that the correct one is unknown. ⛔ Do not invent a different number to look
compliant, and ⛔ do not let the escalation read as un-actioned: the disposition is *"carried knowingly,
pending the ruling"*, stated in the story record. If the Panel rules a shorter horizon, the fix is a
per-Pariwar **override** — the mechanism already exists and costs no code
**And** identity verification is the **Story 6.3 anchor, unchanged**: the operator's own authority plus a
verbal read-back, with `lookup_method` recorded in the **audit context only, never in a domain payload**
(`claims.helpline.handlers.ts:118-120`)

### AC3 — Fulfilment is a NEW capability, separated from intake

**Given** filing a request and executing it on a member with no session are different authorities
**Then** a new permission key **`member.data_rights`** is minted (`PERMISSION_CATALOG_VERSION` **32 → 33**),
granted to `pariwar_admin` **only** — ⛔ **not** `helpline_operator`, who files but does not execute
**And** ⚠ **`super_admin` is NOT written into the grant list — it auto-derives.** Every prior key states
this convention verbatim (`roles.ts:127,132,139,146` — *"super_admin auto-derives"* / *"+ super_admin
(auto)"*). An explicit entry would deviate from every precedent in the catalog; an earlier draft's
*"granted to `pariwar_admin` + `super_admin` **only**"* misread it
**And** ⛔ `district_admin` is **not** granted — a district-ceiling grant cannot satisfy a `pariwar`
dimension check, the ruling already recorded for `HELPDESK_RESPOND` (`roles.ts:139-140`,
[[project_rbac_geo_scope_containment]]). Not an oversight; do not "fix" it
**And** every fulfilment route sits behind `[requireAdminSession, scopeResolutionHook,
requirePermissionHook(deps, 'member.data_rights', { dimension: 'pariwar' }),
requireStepUp(deps, DATA_RIGHTS_STEP_UP_CONTEXT)]` — a **DISTINCT** step-up context, so no other elevation
satisfies it and vice-versa
**And** ⚠ **there is no step-up context registry to register into.** `requireStepUp(deps, actionContext:
string)` (`step-up/gate.ts:16`) compares a bare string by equality, and the contract is
`z.string().min(1).max(128)` with **no allow-list** (`contracts/src/auth/step-up.ts:14`). ⛔ Task 2 must
not go hunting for a registry to add a label to — the distinctness AC3 claims comes from string
inequality, which holds but is **unguarded**
**And** therefore the context is a **single exported constant** `DATA_RIGHTS_STEP_UP_CONTEXT`, shared by
the route, the client's OTP-request call and the tests — ⛔ never a repeated literal. Same discipline AC2
imposes on the subcategory token, for the same reason: a typo in the **route** fails closed (tolerable),
but a typo in the **OTP-request** path yields an elevation that can never satisfy the gate, and nothing
catches it unless both sides import the one symbol
**And** ⛔ **no `dpo` role is minted** (see out-of-scope); the future-holder note is a comment, not a bundle
**And** ⚠ **the acting admin is attributed from `users.display_name`, snapshotted server-side at action
time** ([[project_admin_display_name_attribution]]) — ⛔ never email-derived, and a **missing display name
BLOCKS the action** with a typed error. This story's whole subject is a staff actor exercising a member's
statutory rights; an unattributable act on that surface is not acceptable
**And** ⚠ **every fulfilment route carries an `Idempotency-Key` header**, the Story 10.2 member-route
posture ([[project_helpdesk_member_surface_102]]). ⛔ Off-portal **erasure is irreversible and
operator-initiated** — a double-submit or a retried request must not append a second
`member.rtbf_anonymized`. A redelivery test proves exactly one write, one event, and an idempotent no-op
on the replay
**And** every fulfilment call carries the originating `helpdesk_ticket_id` and writes an
`audit.withCompensatingAudit` line (ADR-0030, the 10.1 posture — **not** a bare `writeAuditEntry`)
**And** ⚠ **that provenance also rides the EVENT, not only the audit row.** The `member.rtbf_anonymized`
event appended by an off-portal erasure carries the acting `helpdesk_ticket_id` in its payload, so a
replay of `events_log` distinguishes an operator-executed erasure from a member self-service one. ⛔
Audit-only provenance breaks the two-authority rule this story endorses in Dev Notes (*event = timeline
authority, row = metadata authority*) — and AC7 makes the event **more** ambiguous, not less, by
legalising it from eight `from` states instead of one
**And** ⚠ **this WIDENS A DELIBERATELY FROZEN CONTRACT, and the story says so rather than letting the dev
agent discover it.** `RtbfAnonymizedPayloadSchema` is `z.object({ ...auditShape }).strict()`
(`member/events.ts:89`), `auditShape` is exactly four fields (`member/audit-shape.ts:36-41`), the posture
is R1-rationalised in the handler (*"The frozen auditShape-only `.strict()` payload cannot carry any
cleared PII (R1)"* — `rtbf/handlers.ts:106`). ⚠ **And NO test pins this schema today** —
`grep RtbfAnonymizedPayloadSchema` returns three hits, **all in source** (`member/events.ts:89`, `:344`,
and `packages/events/src/registry.ts:104`, which binds it into the events registry). ⛔ The sibling
`tests/member/withdrawal.test.ts:92` describe block (*"frozen payload schemas are auditShape-only +
strict (R1)"*) exercises **only** `WithdrawalCompletedPayloadSchema` / `WithdrawalRequestedPayloadSchema`
— schemas this story does **not** widen. An earlier draft told the dev agent to "update" it, which is
both inexecutable and points at the wrong `.strict()` contract to relax
**And** ⛔ therefore the widening is **narrow and justified in a comment at the schema**: a
`helpdesk_ticket_id` **UUID** is not cleared PII and does not breach R1, which is why this specific field
is admissible where a free-text field would not be
**And** ⭐ **`helpdesk_ticket_id` is OPTIONAL — decided 2026-08-14, and the shape is not novel.** The
member self-service path emits **four** fields (`rtbf/handlers.ts:112-117`) and
`member/project.ts:78` parses the payload **before insert**, so a **required** fifth field would break
every member RTBF at runtime. ⚠ **The precedent is twenty lines above the schema being changed:**
`KycCompletedPayloadSchema` (`member/events.ts:41-43`) is already
`z.object({ ...auditShape, kyc_reference: z.string().min(1).optional() }).strict()` — an auditShape
extension with an optional field, in this same module. Follow it exactly:
`helpdesk_ticket_id: z.string().uuid().optional()`, `.strict()` retained
**And** ⛔ **the off-portal event's `actor` and `trigger` are PINNED — ⛔ do not copy the member
exemplar.** `rtbf/handlers.ts:112-117` hardcodes `actor: 'member'`, `trigger: 'rtbf_request'`; copied
verbatim it writes a **false actor attribution** on the very event AC7 is making more ambiguous — the
identical defect AC7 catches for `from_state`, one field over. The off-portal path writes
**`actor: 'trustee'`** (`memberActorSchema` is `z.enum(['member','system','trustee'])`,
`member/audit-shape.ts:19`; `trustee` is the shipped value for staff-initiated member events —
`member/moderation/write.ts:315` and `member/moderation/grounds.ts:245` write it on **`member.*`** events
for staff-initiated acts — the **in-family** precedent; and `pariwar_admin` is Trustee-Lite,
`roles.ts:104,108,113`) and **`trigger: 'member_data_rights.rtbf_fulfilled'`**
**And** ⚠ **the trigger token follows the MEMBER family's dotted-namespace convention for staff-initiated
acts** — `member_moderation.${action}` (`moderation/write.ts:314`) and
`'member_moderation.ground_appended'` (`grounds.ts:245`). ⛔ **Not** an `admin_`-prefixed token: an earlier
draft used `admin_off_portal_rtbf` and justified it as *"the convention for admin-initiated member
events"* — **that convention does not exist in this family.** All three `admin_`-prefixed triggers
(`admin_schedule_` / `admin_reschedule_` / `admin_complete_ground_inspection`) live in
`claim/ground-inspection-persist.ts:447,581,766` and ride **`claim.*`** events. The value was chosen from
the wrong family's convention, so correcting the justification alone would have left the token behind
**And** ⚠ **`actor` is therefore what already distinguishes operator from member** — `helpdesk_ticket_id`
adds *which request*, not *who acted*. ⛔ Do not read the ticket id as the sole provenance carrier
**And** ⛔ **BECAUSE the field is optional, the SCHEMA can no longer enforce the provenance — the CALLER
must.** An off-portal erasure that omits the ticket id validates **cleanly** and becomes indistinguishable
from a member self-service one, silently degrading the exact guarantee this clause exists to create.
⛔ The off-portal fulfilment handler therefore **requires** it and fails closed without it — the same
caller-side-precondition shape AC7 uses for erasure legality and AC12 for the terminal guard. ⚠ The
optionality is a **contract** accommodation for the member path, **not** a licence for the off-portal path
to omit it
**And** therefore a **NEW pinning test is AUTHORED** for `RtbfAnonymizedPayloadSchema` — in
`packages/domain/tests/member/`, mirroring the `withdrawal.test.ts:92` shape — asserting **BOTH** shapes
**exactly**: the **four-field** member payload parses, and the **five-field** off-portal payload parses.
⛔ Never relaxed to "at least these fields" (⚠ `.strict()` is what carries that — the optionality must not
become `.passthrough()`), and ⛔ never satisfied by editing the withdrawal test
**And** the test also asserts a free-text field is still **rejected**, and that the **off-portal route**
rejects a request that would append without a ticket id — the caller-side half the schema cannot cover
**And** ⚠ the widening also crosses a package boundary: `packages/events/src/registry.ts:104` binds this
schema into the events registry, so `@twt/events` is in the blast radius
([[project_type_only_import_cycle_trap]] — verify consuming packages build, not just `@twt/domain`)

### AC4 — Subject-scoped reads are MEMBER-scoped, not artifact-scoped, and it is PROVEN

**Given** the minted clause, and [[project_consent_subject_key_convention]]
**Then** every fulfilment read keys on `member_id`. ⛔ No read may be keyed by `ticket_id`, by
`data_export_id`, or by any other artifact
**And** a test PROVES it: a member with **two** data-rights tickets gets **one** complete subject view — the
**assembled export plaintext** and the erasure reach are **identical** whichever ticket initiated them. A
second ticket must not partition, filter or re-scope the subject's data
**And** ⚠ the comparison is made on the **assembled section plaintext, before encryption**, over the
**data sections only** — `manifest.json` is excluded wholesale. ⛔ Do **not** exclude "generation-time
fields" and call it done: the manifest also carries **`exportId`** (`assemble.ts:355`), which is a **row
identity** and differs between the two builds by construction, not a generation-time value. And the field
is **`generatedAt`**, camelCase (`assemble.ts:358`, `ManifestSection.generatedAt` at
`contracts/data-export/data-export.ts:238`) — **not** `generated_at`
**And** ⛔ Do **not** compare `artifact_ciphertext` bytes: it is an envelope ciphertext
(`piiColumn(1, 'data_export')`), so two encryptions of identical plaintext differ by construction. ⚠ Two
earlier drafts got this wrong in the same direction — first *"byte-identical"*, then a
`generated_at`-only exclusion — each of which would have failed on a **correct** implementation and
forced the dev agent to quietly restate this AC's central proof rather than satisfy it
**And** the ticket linkage is **provenance only** — it records *which request* caused the act, never *what
the act may see*

### AC5 — Access + portability: the off-portal build ✅ `[content half TRANSFERRED OUT — Decision 2026-08-14-109 clauses 5 + 9]`

⭐ **RULED 2026-08-14 — the export-CONTENT half LEAVES THIS STORY.** Decision `2026-08-14-109`
clause 9 (Row 8) assigns the export-content data contract to **a separate successor story**, which
owns: replacing the two structurally-empty section contracts, defining the record shapes, and
implementing the **claimant-only** predicate ruled at clause 5 (Row 5).
⛔ **TRANSFERRED, NOT ABANDONED** — it must be recorded in `deferred-work.md` with a **named**
successor story and a non-epic re-trigger. ⚠ **The successor story is still UNNAMED**; an unnamed
successor is precisely how a deferral expires unowned ([[project_r7_fact_producer_unbuilt]]).
⭐ **Escalations 7 and 8 are therefore DISCHARGED for this story** — 8 by ruling (claimant-only), 7 by
transfer of ownership. ⛔ "Discharged by transfer" is not "done": the work exists and has a new owner
([[feedback_closure_language_precision]]).
✅ **What remains in AC5 here is the off-portal-build half, which already landed.**

⭐ **DEFINITION — "AC5's off-portal-build half" (the ONE definition; every other mention points here).**
It is everything in AC5's **second** Given/Then block plus the schema work it needs:
migration `0103` (the three columns) · the `requested_via` **CHECK** · the `helpdesk_ticket_id` **FK** ·
`data-exports-policy-regression.spec.ts` · the **`DATA_EXPORT_BUILD` enqueue route** (Task 7a) ·
the one-time / 24h / `consumed_at` semantics for the off-portal row · the `23505` → **typed 409**
collision rule · the built-but-undeliverable-**inert** test · the `deferred-work.md` FR-95 gap record ·
the `assemble.ts:28` stale-name correction (Finding 6).
⛔ **It is NOT just "the provenance columns."** An earlier draft enumerated it that way in five separate
places and every one of them omitted the enqueue route — which Task 7a explicitly orders. ⛔ Do not
re-enumerate this list anywhere; reference the definition.

**Given** Finding 2
**Then** `assemble.ts`'s `contribution_history.json` and `claim_history.json` are wired to real reads, the
`emptySection('Epic 8')` / `emptySection('Epic 6')` calls are removed, and `EXPORT_SCHEMA_VERSION` bumps
1 → 2
**And** ⚠ **the schema bump is NOT a one-constant edit.** `ManifestSection.schemaVersion` is
`z.literal(1)` inside a `.strict()` object (`contracts/data-export/data-export.ts:239`) and the build job
validates every section on **every** export — `contracts.ManifestSection` is bound at
`apps/jobs/src/data-export.ts:75` and the `schemaFor.parse(section)` call is at **`:143`**. ⛔
Bumping `EXPORT_SCHEMA_VERSION` without bumping the literal makes **every export build fail**
**And** ⚠ **three shipped assertions must be REWRITTEN, and they are named here because AC10 demands a
green suite against a pre-edit baseline** — a dev agent hitting these with no stated authority will either
stall or quietly weaken them:
`packages/domain/tests/integration/data-export/data-export.spec.ts:134` (`_wired_by: 'Epic 8'`), `:139`
(`_wired_by: 'Epic 6'`) and `:150` (`expect(manifest.schemaVersion).toBe(1)`). ⛔ Rewrite to assert the
new truth; do not delete
**And** ⛔ **AC5 CANNOT be completed until Escalation 7 is ruled** — the two section contracts
structurally forbid non-empty records. See the escalation; do not work around it
**And** ⚠ **v2 is PROVISIONAL and the story says so.** Escalation 3 asks whether
`decision_note_ciphertext`, 10.20's three further Tier-1 moderation columns and `actor_display` are owed
to the data principal — a question about **what this export contains**. A ruling of *"owed"* bumps the
schema to 3 immediately. ⛔ Do not present v2 as the settled shape of the artifact, and ⛔ do not
pre-empt Escalation 3 by adding or omitting those fields on the dev agent's judgement (Finding 6 already
forbids both). Record v2 as *"complete with respect to FR-95's named contents, open with respect to
Escalation 3"*
**And** a test proves a member with contributions and a claim gets **non-empty** `records` in both files —
asserted on **presence of the rows**, not on absence of an error (the 10.28 discipline: the failure this
removes is SILENT)
**And** the two remaining FR-95 gaps are **recorded in `deferred-work.md` with a named re-trigger that is
NOT an epic**: Contribution-Note PDFs (8.7) and the member's helpdesk tickets

**Given** the export must be BUILT for an off-portal subject under **either** delivery model
**Then** a fulfilment route enqueues the **existing** `DATA_EXPORT_BUILD` job for the subject member — ⛔ do
not write a second assembler
**And** `data_exports` gains `requested_via` (`'member_portal' | 'off_portal_admin'`, NOT NULL DEFAULT
`'member_portal'`), `requested_by_actor_id` (nullable) and `helpdesk_ticket_id` (nullable); the member
self-service path keeps writing `'member_portal'` and its existing behaviour is **unchanged**
**And** ⚠ **the app-layer shape is MIRRORED at the DB level.** `requested_via` carries a **CHECK
constraint** over the two-value union and `helpdesk_ticket_id` carries an **FK** to `helpdesk_tickets`.
⛔ The existing `status` / `failed_reason` columns are deliberately app-layer-enum-only (`data_exports.ts:22-24`
records that posture), so a reviewer will read the new columns as following suit — they do **not**.
`requested_via` gates a **PII-disclosure path**, not a display value: an unconstrained column lets a
mis-set `'member_portal'` disguise an off-portal build in every audit query that filters on it
**And** ⚠ **`data_exports` has NO policy-regression spec** — 23 tables have one under
`packages/domain/tests/integration/rls/`, and the table this story extends is not among them. This story
adds `data-exports-policy-regression.spec.ts` (⚠ **hyphens** — all 23 existing specs use
`<table>-policy-regression.spec.ts`; zero use underscores) asserting RLS
positive/negative/fail-closed/FORCE, the new
FK, and the CHECK **directly at the migration level**, never inferred through a route test
**And** ⛔ a **genuine cross-Pariwar** case is proven at the policy layer, not only at the route: an
operator scoped to Pariwar A cannot cause a `data_exports` row for a member of Pariwar B, and the
`WITH CHECK (pariwar_id = current_setting('app.pariwar_id'))` write policy (`0033:52`) is what refuses it.
AC4's cross-tenant assertion is a **route**-level test and cannot witness this
**And** the existing one-time / 24h / `consumed_at` semantics apply to the off-portal row too — an
off-portal export is not a standing download
**And** ⚠ **the `data_exports_one_pending_per_member` partial unique index (`0033:61`) makes a collision
REACHABLE**: an off-portal enqueue for a member who already has a pending self-service export raises
`23505`. ⛔ The rule is stated, not left to the dev agent: **refuse with a typed 409 naming the existing
pending export** — do not silently reuse the member's row (it carries `requested_via: 'member_portal'`
and would misattribute the request), and do not cancel it (a member's in-flight request is not the
operator's to discard). ⚠ `23505` arrives on `err.cause.code`
([[project_domain_limit_clamp_and_savepoint_retry]])
**And** ⛔ **NO DOWNLOAD/HANDOVER PATH IS BUILT HERE.** Building the artifact is ruling-independent;
*delivering* it is not. The delivery arm is **AC-R1** and is blocked on Escalation 1. An off-portal
`data_exports` row with no delivery path is the correct intermediate state, and a test asserts that a
built-but-undeliverable row is reachable and inert

### AC6 — Correction: RULING-GATED, see AC-R2

⛔ Deliberately empty. Correction was drafted here as *"record the request, use an existing admin write
path where one exists, otherwise resolve with an explicit unmechanized outcome"* — but **that is the answer
to Escalation 2, not an acceptance criterion.** Whether that disposition discharges the release gate, or
whether all four rights must be mechanized first, is the Panel's to rule. The AC number is retained rather
than renumbered so no cross-reference in the epic, the escalations or a later story silently re-points.
Its content lives in **AC-R2** below.

### AC7 — Erasure: the precondition lives in the CALLER

**Given** Finding 1 and Story 10.20's ratified WS-D shape
**Then** `reduce`'s `member.rtbf_anonymized` arm accepts **every `MEMBER_LIFECYCLE_STATES` label except
`anonymized`** → `anonymized` — `pending-kyc` | `pending-fee` | `pending-valid` | `lock-in` | `active` |
`active-in-grace` | `lapsed-unpaid` | `withdrawn`, **eight** `from` states — and the **seven new**
transitions are added to the documentation matrix (the `withdrawn` row already exists at `state.ts:155`;
do not duplicate it)
**And** ⚠ **`packages/domain/tests/member/state.test.ts:118` asserts the EXACT OPPOSITE** —
`expect(memberStateMachine.step('active', ev('member.rtbf_anonymized'))).toBe('active')`, under the
comment *"rtbf from a non-withdrawn state"*. It is a deliberate, shipped invariant assertion. ⛔ Rewrite
it to the new truth **and say so in the Dev Agent Record** — silently deleting a pinned invariant is the
defect [[feedback_closure_language_precision]] names
**And** ⛔ the accepted set is **derived from the enum, not hand-listed**: a test iterates
`MEMBER_LIFECYCLE_STATES` and asserts `reduce(s, 'member.rtbf_anonymized') === 'anonymized'` for every
`s !== 'anonymized'`, so a tenth lifecycle label minted by a later story **fails this test** instead of
silently reopening the phantom-anonymization hole for the state it adds
**And** the legality — *"`withdrawn`, OR `getCurrentMemberModerationOverlay(...).status === 'terminated'`"*
— is enforced in the **caller**. ⛔ The reducer must not learn to read the overlay
**And** the overlay read uses `getCurrentMemberModerationOverlay` (**unbounded**), ⛔ **never** the
`at`-bounded `getMemberModerationOverlay` — `overlay.ts:132-149` records exactly why: the app clock and the
DB clock are different clock domains, and a legality check bounded at `deps.clock()` can silently skip the
very event it is checking for
**And** ⛔ **`from_state` must be the member's REAL replayed state, not a constant.**
`rtbf/handlers.ts:113` hardcodes `from_state: 'withdrawn'`. The moment Task 6's guard admits a terminated
`active` member, that line appends an event asserting `withdrawn` about a member who was `active` — a
**false audit record**, on the one event this AC is simultaneously making more ambiguous. Read the state
and write what you read
**And** a test proves the previously-impossible case end-to-end: a **terminated** member (lifecycle state
`active`) is erased, `members.state` becomes `anonymized`, **the appended event's `from_state` reads
`active`** (⛔ not `withdrawn`), and every Tier-1 column `anonymizeMember` covers — including 10.20's four
moderation columns — reads the sentinel
**And** `pnpm member-state:test && pnpm member-state:check` is green

### AC8 — The instrument stops asserting an unbuilt process

**Given** Finding 7 and §8.4a's own rule (*"a row is moved out only once the enforcing mechanism and its
test are in place"*)
**Then** the §8.4a mechanization-status note gains an explicit **"Statutory rights (DPDPA)"** disposition
stating what is now mechanized and what is not (correction, per AC6)
**And** ⛔ the disposition claims **only** what has a test. A disclosure running ahead of its mechanism is
the same defect as one trailing it — the note says so itself
**And** ⚠ **the split is TWO governance commits, not one.** The `.decision-log.md` entry — the findings,
the escalations, the AC2 category ruling, the AC-R split — lands **FIRST**, `governance:`-prefixed, before
any code ([[feedback_governance_commits_precede_implementation]]). But the **§8.4a disposition edit lands
LAST**, in or after the `story(10.21):` commit
**And** ⛔ **this is not a relaxation of the convention, it is the convention applied correctly.** The
convention orders **decisions** before implementation; the §8.4a row is not a decision, it is a **claim
about what the tree enforces**. Committed first, it asserts a mechanism that does not exist at that
commit — the *exact* defect §8.4a's own rule names (*"a disclosure that runs ahead of its mechanism is the
same defect as one that trails it"*). An earlier draft required both in the first commit and so mandated
the very defect AC8 exists to remove
**And** ⛔ **no §8.4 text is re-read or reinterpreted** — it is already ratified and already correct; this
story mechanizes it ([[feedback_supersede_never_reinterpret]])

### AC9 — Copy truth, both locales, and the tone gate

**Given** `moderation.notice.terminated.body` already promises *"call our helpline"* in `en` and `hi`
**Then** that promise is now true, and the operator-facing surface names the route in vocabulary the tone
gate accepts
**And** `pnpm i18n:check` and `pnpm microcopy:test && pnpm microcopy:check` are green — ⛔ any new
member-facing string needs **both** locales in the same commit
**And** ⛔ the notice body itself is **not** re-worded (Finding 8; the flag-selected body is already true in
both flag states — Decision `097` clause 12, a debt deliberately avoided)

### AC10 — Suite + gates green, against a real baseline

**Then** `pnpm ci:local` is green with `DATABASE_URL` set, and the run is compared against a **baseline
captured before the first edit** — [[project_known_livedb_test_failures]] #3 (renewal-lifecycle) is still
open and is **not** this story's
**And** ⛔ **never regenerate an applied migration** (`42P07`) and ⛔ **never `DROP SCHEMA`** (`42P01`)
([[project_live_db_test_gotchas]])
**And** the friction-budget diff is COMMITTED history — AC-4 passes vacuously until you commit
([[project_friction_budget_baseline_ratchet]])

### AC11 — Erasure reaches the export artifact ✅ `[consumed-row arm RULED — Decision 2026-08-14-109 clause 6]`

**Given** Finding 9 — `anonymizeMember` does not touch `data_exports`, and the `ON DELETE CASCADE` that
3.11 documented as the RTBF mechanism never fires because 3.12 is a soft delete
**Then** `anonymizeMember` additionally zeroes `artifact_ciphertext` (→ NULL) for **every** `data_exports`
row of the member, in the **same transaction** as the rest of the erasure, and flips `pending` and `ready`
rows to `expired`
**And** ⭐ **RULED 2026-08-14: the `consumed` row RETAINS its status** (Decision `2026-08-14-109`
clause 6) — the record that the member **actually downloaded** their export is a fulfilment/audit fact
the Trust keeps, and erasure does not reach it. ✅ **This is exactly what already ships**, so the arm
un-blocks as **already-correct with no code change**; the test asserting `status === 'consumed'` after
erasure now rests on a ratified basis instead of a pending one.
**And** ⚠ **the `consumed` row's STATUS is left untouched** (as ruled). The zeroing applies to
it (uncontroversial — the vacuum already does exactly that); the **status flip** does not, because
overwriting `consumed` destroys the record that the member actually downloaded their export — a fact this
same AC promises to keep two clauses below. ⛔ An earlier draft said "every row" and contradicted itself
**And** ⛔ the metadata row is **retained**, not deleted — same posture as the vacuum
(*"drop the PII payload, keep the metadata row for audit"*), so the erasure remains a soft delete and the
audit trail survives
**And** a test proves the case AC5 makes normal: a member with a **`ready`, unconsumed, unexpired**
off-portal export is erased, and `artifact_ciphertext` reads NULL **immediately** — ⛔ not "after the
vacuum runs", not "within 24h". A TTL is not an erasure
**And** ⛔ **the test must be able to fail.** Assert on the `data_exports` row directly. AC7's
sentinel-sweep assertion iterates `anonymizeMember`'s own coverage set and is structurally blind to a
table outside it — reusing that shape here would reproduce the defect as its own proof
**And** ⚠ **the `pending` case is the LOAD-BEARING one, and the reason must be stated or it will be
skipped.** A `pending` row holds no ciphertext, so "zero the ciphertext" reads as a no-op on it — but the
build job writes `status: 'ready'` **and the fresh ciphertext** under `WHERE status = 'pending'`
(`apps/jobs/src/data-export.ts:165-179`, the WHERE at `:177`). ⛔ **Flipping `pending` → `expired` is what stops an in-flight
`DATA_EXPORT_BUILD` from RESURRECTING the dossier after the erasure commits.** The status flip is not
hygiene; it is the guard
**And** a test proves that specific race: enqueue a build, erase the member before the worker writes, then
let the worker run — `artifact_ciphertext` stays NULL. ⚠ A test that merely asserts a `pending` row's
ciphertext is NULL **passes vacuously** and proves nothing
**And** the same test covers a `consumed` row, so no status is left unhandled

---

## Load-bearing-invariant acceptance criteria (AC12–AC15)

⚠ **Provenance: these four come from an audit of the planned diff against
`_bmad/custom/load-bearing-invariant-checklist.md`, run after AC1–AC11 were written.** Each names the
family it discharges, so a later audit can map back. ⛔ They are **not** lower-priority than AC1–AC11 — a
REAL GAP on a touched family carries the same severity ladder as an acceptance-criteria violation.

### AC12 — The terminal state blocks the export path — BOTH callers `[family 1]`

**Given** ⚠ **two premises an earlier draft of this AC got WRONG, corrected here because the wrong version
would have stopped the next reader from looking:**
**(a)** `assertAnonymizable` is **not** the only terminal guard. **Five** `TERMINAL_STATES` guards ship
today — `nominee.handlers.ts:40`, `member-terms.handlers.ts:39`, `medical.handlers.ts:62`,
`vyawastha-shulk/handlers.ts:43`, `life-events/handlers.ts:42` — each `new Set(['withdrawn',
'anonymized'])` returning a 409 `<module>.member_terminal`. `termination-block-seam.ts:113` names them as a
family. **There is an established convention and this AC follows it.**
**(b)** an `anonymized` member **CAN** hold a live session. `requireMemberSession`
(`auth/shared/member-session-guard.ts:27-45`) is a **stateless JWT verify** — no DB read, no state check;
the access TTL is **15 minutes** (`config.ts:377`); and `anonymizeMember` revokes **nothing** (zero
refresh-token / elevation / session writes in `member/anonymize.ts`). Login and refresh *do* block
(`termination-block-seam.ts:191-192`), so no **new** session mints — but an existing token survives
erasure for the rest of its TTL

**Then** ⛔ **the member self-service enqueue path is therefore reachable TODAY, and this is a shipped
defect, not a new one.** `POST /api/v1/member/data-export` is **session-only** — step-up gates the
*download*, not the *request* (`data-export/routes.ts:32-41`) — and `data-export/handlers.ts` contains
**no lifecycle check whatsoever**, while `assemble.ts:146-150` reads `members` by id with no state
predicate. An erased member can enqueue a fresh dossier row within their token window
**Then** the terminal guard is added to **BOTH** callers — the existing member enqueue handler **and** the
new off-portal enqueue route — following the shipped convention: a `TERMINAL_STATES` set and a 409
**`data_export.member_terminal`** (⛔ **not** a `rtbf.already_anonymized`-shaped code on a non-RTBF route)
**And** ⛔ **one caller is not enough.** Family 1 requires terminal states to block dependent mutations on
**EVERY** path; guarding only the new route would leave the older, already-reachable one open and record a
false reason for doing so
**And** a test proves both: enqueue for an erased member on **each** path → 409, and **no `data_exports`
row is created**
**And** ⛔ the guard goes in the **callers**, never in `assemble.ts` — the assembler is shared and must not
learn lifecycle rules (the AC7/WS-D shape)
**And** ⚠ **the wider defect is NOT this story's and must not be absorbed silently:** RTBF revokes no
session, so for up to 15 minutes after erasure an erased member can reach **any** session-only route. The
five `TERMINAL_STATES` guards cover most surfaces; the gap is session revocation itself. ⛔ Record it in
`deferred-work.md` with a **named successor story** as re-trigger (⛔ never an epic), scoped as *"RTBF
must revoke live member sessions"*. This AC closes only the `data_exports` surface

### AC13 — Concurrent erasure is serialized and proven on TWO CONNECTIONS `[family 2]`

**Given** AC3's `Idempotency-Key` dedupes **same-key** retries (`idempotency/keyed-store.ts:129` locks on
the *key*, so different keys are genuinely unserialized) and AC11's race test covers **worker-vs-erasure**
— both genuine, neither sufficient
**And** `scope-tx.ts:37` issues a bare `BEGIN` — **READ COMMITTED**, no serialization
**Then** ⚠ **an existing backstop CLAIMS to cover this and is INERT — name it, do not mistake it for prior
art.** `rtbf/handlers.ts:136-148` catches `err.code === '23505'` and maps it to the clean 409. But
`projectMemberState` converts the violation into `MemberStreamConcurrencyError`
(`member/project.ts:104-107`), and that class carries **no `code` property**
(`member/errors.ts:107-118`) — so the branch **never matches**. ⛔ And under READ COMMITTED the loser
usually never reaches 23505 at all: it blocks on the winner's row locks inside `anonymizeMember`, then
`projectMemberState` re-reads the stream head (`project.ts:85-89`) **after** the winner commits, computes
a valid `nextVersion`, and appends a **SECOND `member.rtbf_anonymized` event**, returning 200. The live
failure mode is a **duplicate event**, not a 23505
**Then** concurrent erasure of the same member is serialized by a **transaction-scoped**
`pg_advisory_xact_lock`, taken in the caller **before** the legality read, covering **both** entry paths
(member self-service and off-portal) — ⛔ a lock on one path only is not serialization
**And** the key is **namespace-prefixed**, following `claim/appeal-persist.ts:126-131` (*"A DISTINCT
namespace prefix … so the four never collide"*): derive it from `` `member.rtbf:${pariwarId}:${memberId}` ``.
⛔ **A bare `hashtext(member_id)` collides with `auth/member/member-auth.service.ts:54`'s device-binding
lock** — a different subsystem, same key space
**And** ⛔ **use `pg_advisory_xact_lock`, not `pg_advisory_lock`.** Every domain precedent is
transaction-scoped (`keyed-store.ts:129`, `audit/write.ts:128`, `pool/spawn.ts:586`, the eight
`claim/*-persist.ts` sites). The one session-scoped precedent (`member-auth.service.ts:54`) needs a manual
`pg_advisory_unlock` on a dedicated client — copied onto a pooled client without the `finally`, it leaks
the lock for the connection's life
**And** a **live two-connection** test proves: **exactly one** write, **exactly one**
`member.rtbf_anonymized` event, and every loser rejected with the **existing typed 409**
`rtbf.already_anonymized`
**And** ⛔ **NOT "N−1 idempotent no-ops".** An earlier draft said that, which would have instructed the dev
agent to convert a **shipped, tested 409** into a 200 — `apps/api/tests/integration/rtbf/rtbf.spec.ts:203-212`
asserts exactly that 409, and AC12 above mirrors the same code. The invariant is *one write, one event,
losers rejected* — the rejection is the correct behaviour, not a defect
**And** ⛔ **the test must be able to fail, and two concurrent `app.inject` calls CANNOT.** Without a forced
interleave they serialize by chance and the loser 409s **with or without** the lock — the vacuity this AC
exists to prevent. Hold the winner's transaction open **past the loser's guard read**, and follow the
domain-level own-committing precedent — `packages/domain/tests/integration/claim/appeal-concurrency.spec.ts:26`
(*"Own-committing (NOT setupLiveDb): a real race needs REAL concurrent COMMITs on SEPARATE pool
clients"*), the shape shared by `r9-voting-`, `pool-stream-`, `alert-stream-` and
`utr-attestation-concurrency.spec.ts`. ⛔ A route-level spec cannot witness this

### AC14 — The widened reducer carries its DELIBERATE block `[family 9, by analogy]`

**Given** AC7 relocates erasure legality from the reducer to the callers and widens the reducer from
**one** accepted `from` state to **eight**, justified at length **in this story and nowhere in the code**
**And** ⚠ **the family label is an honest stretch:** family 9 covers *"any bypass of a normal
tenant/role/scope check"*, and a reducer widening is not that. The obligation is kept because the
**mechanism** is identical — a guard deliberately weakened in one place and re-established in another,
with nothing in the code saying so
**Then** the `member.rtbf_anonymized` arm carries a **DELIBERATE** doc block in the shape of the one
existing exemplar, `apps/jobs/src/shepherd-fallback-resolver.ts:14-25` — a headed
`── DELIBERATE: … ──` rule, the rationale, and a re-examination trigger
**And** it states: that the breadth is intentional; that the legality precondition lives in the callers
(naming **both**) and **why** the reducer must not read the moderation overlay; and the trigger — *"if a
caller is added that appends `member.rtbf_anonymized`, it must carry the overlay precondition and the
AC13 advisory lock, or this arm is wrong"*
**And** ⚠ this AC has **no gate and no test** — it is a comment, and by AC2's own standard an un-mechanized
convention decays. It is accepted as the weakest of AC12–AC15 rather than dressed up as more

### AC15 — The policy-regression spec pins the partial-unique PREDICATE `[family 5]`

**Given** AC5's typed-409 collision rule is **behaviourally dependent** on
`data_exports_one_pending_per_member` (`0033:61`, `... ON data_exports (member_id) WHERE status =
'pending'`), and the index name appears in **exactly one file tree-wide** — the migration. Nothing asserts
it. The nearest existing coverage (`apps/api/tests/integration/data-export/data-export.spec.ts:118-134`)
asserts **sequential** idempotency, which exercises `findActiveExport`'s app-layer read, not the index
**Then** `data-exports-policy-regression.spec.ts` asserts the index directly, in **TWO separate `it()`
blocks**:
· **(a)** a second `pending` row for the same member raises `23505`
· **(b)** a member already holding a **`ready` / `consumed` / `expired`** row **can still** take a new
`pending` row
**And** ⛔ **(b) is what pins the `WHERE status = 'pending'` PREDICATE, and an earlier draft got it
wrong.** That draft's negative case was *"a `pending` row for a different member does not raise"* — which
pins only the **key column**: a plain `UNIQUE (member_id)` would pass it, while forbidding a member from
ever taking a second export and breaking the shipped flow. The tree states this precedent in terms —
`member-moderation-grounds-policy-regression.spec.ts:262`: *"Without this the (g) assertion would pass on
a PLAIN unique index too."*
**And** ⛔ **(a) and (b) must not share an `it()`.** The RLS harness wraps each test in `BEGIN/ROLLBACK`
(`policy-regression.spec.ts:8-11`); after the `23505` the transaction is aborted, so a following `INSERT`
fails with **`25P02`** regardless of the index. The precedent splits them for exactly this reason
**And** ⚠ the index is **pre-existing, not new** — asserted here because **this story makes it
load-bearing**. ⛔ "It already existed" is not coverage
**And** ⚠ this AC rides an artifact enumerated in AC5's **off-portal-build half**; if that half is ever
deferred, AC15 loses its home. Re-home it rather than dropping it

---

## ⛔ Ruling-gated acceptance criteria — DO NOT START THESE

**The governance sequence is: Panel ruling → `.decision-log.md` entry → implementation of the permitted
model → tests → release gate.** ⛔ The implementation agent does **not** choose the PII delivery posture,
does **not** decide what discharges the release gate, and does **not** decide who holds Trustee authority
over a statutory right. All three are governance acts, and an AC that pre-empts its
own escalation is the un-gated re-commitment that decays ([[feedback_record_unattested_no_backfill]]).

**Precondition for ALL THREE:** a ratified `.decision-log.md` entry answering the escalation, cited **by
decision id** in the AC when it is written. ⛔ Absent that entry, the correct dev-agent action is to **stop, report
the block, and ship AC1–AC4, AC7–AC15 (⛔ **minus AC11's `consumed`-status arm**, Escalation 9) and AC5's
off-portal-build half** (defined in AC5), leaving the release gate
explicitly OPEN. That is a complete,
honest delivery of the un-blocked scope — not a partial failure.

### AC-R1 — Delivery of the export artifact ✅ `[UN-BLOCKED IN FULL — Decisions 109 cl.1 + 110 + 111 + 112 + 113]`

✅ **UN-BLOCKED IN FULL.** Decision `2026-08-14-113` ratified **option (i)** and answered the
enforcement question `112` raised. Both halves are buildable.

**PRIMARY — member-direct** (`109` clause 1). A **one-time, OTP-verified download grant to the
registered mobile**: the member proves possession, and ⛔ **no session is issued**.

**FALLBACK — staff-mediated, NARROW** (`110` clause 1 option (c); trigger refined by `111` clause 2).
A staff actor obtains the assembled, decrypted export and hands it over through the administrative
process.

⭐ **ELIGIBILITY REQUIRES BOTH CONDITIONS — NEITHER SUBSTITUTES FOR THE OTHER** (`112` clause 1):
| # | Condition |
|---|---|
| **(1)** | An **explicit request by the member** for staff mediation (`111` cl.2, stands) |
| **(2)** | The member **no longer controls the registered mobile**, making the primary OTP route **unavailable** |

⛔ **Staff may NOT initiate and may NOT unilaterally select the fallback.**
⚠ **SUPERSEDED:** `111`'s recorded *reading* — that condition (2) was merely the paradigm reason inside
the justification rather than a real second condition — is **rejected** by `112` clause 1. It was
flagged as the wider of two readings with a correction re-trigger *before AC-R1 ships*; the correction
was taken. ⛔ `111` clause 2 itself **stands unchanged** and is now **one of two** conditions.

⛔ **TWO SEPARATE FACTS, DIFFERENT AUTHORS, BOTH RECORDED — do not collapse them into one field**
(`111` clause 3):
| Fact | Author | Role |
|---|---|---|
| The member **explicitly requested** staff mediation | **the member** (captured at intake) | the **TRIGGER** — without it there is no fallback |
| **Why the exception was permitted** | **the staff actor** | the **JUSTIFICATION** — internal operational/audit record |

⛔ A single staff-authored "reason" field would silently absorb the member's trigger into a staff
assertion — precisely the substitution `111` clause 2 forecloses.

⛔ **PRIMARY PLUS EXCEPTION — NOT TWO CO-EQUAL ROUTES.** The fallback must read as an exception at
every layer: in the code, in the operator UI, and in the audit record. ⛔ It must not be offered to an
operator as an equivalent choice, and must not be reachable merely because it is quicker than an OTP.

**Then** ⭐ **the justification is MECHANIZED, not conventional** — the fallback path is
**structurally incapable** of proceeding without one (fail-closed, the caller-side shape AC7 uses for
erasure legality and AC12 for the terminal guard). ⚠ An un-mechanized recording requirement decays
**silently** here: the export would still be delivered and only the justification would be missing
**And** ⛔ **the justification NEVER rides an event payload.** It is free text about a member; every
member event payload is `.strict()` auditShape-only precisely so it structurally cannot carry free
text (R1) — which is why AC3's widening admitted exactly ONE opaque UUID. It lives in a **Tier-1
encrypted column**, following `member_moderation_actions.decision_note_ciphertext`. ⛔ Not
`.passthrough()`, and ⛔ not an audit context field either
**And** ⭐ **the new Tier-1 column is added to `anonymizeMember`'s coverage set IN THE SAME CHANGE
THAT CREATES IT.** ⚠ **This is the highest-risk item in this AC.** A new Tier-1 column landing in a
table absent from the erasure's coverage set is **exactly** how the moderation rationale survived an
erasure (10.10), and **exactly** the class Finding 9 / AC11 exist to close. ⛔ A justification column
that survives an erasure is a PII-retention defect created by the very control meant to add safety.
The `rtbf-anonymize.test.ts` count assertion (**9 tables / 10 statements**) is what catches it — it
must move **upward** in the same commit
**And** ⭐ **the justification is WITHHELD from the member export — RULED, not inferred**
(`111` clause 1): it is an **internal operational / audit record**, not member-facing content. ✅ This
was already the built posture as the conservative default, so **no behaviour changes — only its status
does**, from *author's reading* to *ratified*
**And** ⚠ **the member's TRIGGER is a different artifact from the staff JUSTIFICATION**, and `111`
clause 1 is silent on it — the request is the member's **own act** on their own helpdesk ticket. ⛔ Do
**not** infer an export requirement either way; nothing is added to the export on this basis (`111`
*Open follow-ups*)
**And** ⭐ **RULED — option (i): a THREE-PART GATE** (`113` clause 1). ⛔ All three required; none substitutes
for another:
| # | Element | Author | Enforcement |
|---|---|---|---|
| **1** | the member's **explicit request** | the **member**, at intake | ⛔ machine-enforced, **fails closed** |
| **2** | an **unsuccessful OTP attempt** on the primary route | the **system**, observed | ⛔ machine-enforced, **fails closed** |
| **3** | the **attestation** that the member no longer controls the registered mobile | the **staff actor** | recorded in the internal justification; ⛔ **NOT** machine-verifiable and ⛔ **not claimed to be** |

⭐ **What element 2 buys:** the fallback is **unreachable until the primary has genuinely been tried
and failed** — a real narrowing, and exactly *"mechanized only to the extent necessary"* (`112` cl.3).

**And** ⛔ **THE TERMINOLOGY IS MANDATED — `primary_delivery_not_completed`. ⛔ NEVER `mobile_lost`,
⛔ NEVER `mobile_unreachable`** (`113` clause 2). This binds the **predicate, the column/field, the
error code and the audit action**. ⚠ **It is not style — it is the control that stops element 2 from
becoming a claim it cannot support.** The check observes that an OTP was issued and the route did not
complete; it does **not** observe the handset. A field named `mobile_lost` asserts to every future
reader that the system **established** what it merely **inferred** — and the inference is wrong for any
member who was asleep, busy, or ignored the message. ✅ **MECHANIZED:** a source-scan gate
(`packages/contracts/tests/delivery-terminology-gate.test.ts`) forbids the banned terms tree-wide,
⛔ with revert-sanity proven
**And** ⚠ **the predicate is `consumed_at IS NULL AND expires_at < now()`** over `member_auth_otps` —
an OTP **issued** for the member-direct grant that **expired unconsumed**. ⛔ **`attempts` is
deliberately NOT in the predicate** — see the open question below
**And** ⚠ ⛔ **OPEN, and it narrows eligibility if answered "yes": should element 2 additionally require
`attempts = 0`?** A non-zero attempt count means somebody **received the message and entered a wrong
code** — evidence the member **DOES** control the mobile, cutting directly against element 3. ⛔ Not
built, because it narrows beyond what was ruled and `112` cl.3 forbids inventing mechanism. ⚠ **The
asymmetry matters:** wrong permissively admits a fallback that should have been refused; wrong
restrictively denies a member a statutory route. *Re-trigger:* before AC-R1 ships (`113` *Open
follow-ups*)

⚠ **Retained for context — why element 3 cannot be machine-verified** (`112` clause 4):
· ⛔ **No delivery receipt.** `channels/src/providers/sms-dlt.ts` says so itself — *"The gateway gives
NO synchronous delivery receipt at accept time (no DLR seam in v1)."* `status: 'accepted'` means the
**gateway** accepted it, not that a handset received it.
· ⛔ **No mobile-change history.** `member_identities` has no history table and there is **no**
`member.mobile_changed` event, so a number lapsing or being ported away is unobservable.
· ⚠ **The one real observable is a PROXY:** `member_auth_otps` can show *an OTP was issued and never
consumed* (`consumed_at IS NULL AND expires_at < now()`). ⛔ **That proves the PRIMARY ROUTE DID NOT
COMPLETE — it does NOT prove the member lost the mobile.** It is satisfied identically by a member who
was asleep, busy, or ignored the message.
⛔ **Do NOT implement the proxy as if it verified condition (2)** — that is a claimed protection that
does not exist, the same class as this story's inert `23505` catch, its inert `ON DELETE CASCADE`
comment, and the vacuous `pii-scrape` gate. ⛔ And do **not** invent a broader eligibility mechanism
(`112` clause 3)

**Given** the rulings at Decision `2026-08-14-109` clause 1 and Decision `2026-08-14-110`
**Then** the permitted delivery model — and **only** that model — is implemented over AC5's built artifact
**And** if staff-mediated delivery is permitted in any form, it carries `member.data_rights` + the
`data_rights` step-up + `withCompensatingAudit` + the ticket linkage + whatever additional condition the
ruling imposes (a recorded justification, a second-actor authorisation, a narrower grant set)
**And** ⛔ the model the ruling did **not** permit is not built "for later" and not left behind a flag —
a dormant staff-decrypt path is the same capability, merely unlit

### AC-R2 — Correction ✅ `[RULED — Decision 2026-08-14-109 clause 2]`

⭐ **RULED 2026-08-14: three mechanized rights PLUS a recorded, staff-executed correction process
carried on a HELPDESK TICKET are sufficient to discharge the release gate.**
⛔ **No general admin member-profile editor is built** — the ruling authorises a *recorded process*,
not a write surface. The larger act (its own RBAC surface, its own PII write-audit posture, its own
correction-vs-falsification question) is expressly not authorised here.
⚠ **This ruling makes the gate DISCHARGEABLE. It does not discharge it, and it does not authorise the
flip.** `termination_access_block` remains a separate, Panel-exclusive act requiring its own
`.decision-log.md` entry (`2026-08-10-097` clause 12 bullet 4; `2026-08-10-098` clause 2).

**Given** the ruling at Decision `2026-08-14-109` clause 2
**Then** correction is mechanized as a **recorded process on the existing helpdesk substrate**
**And** ⛔ **no general member-profile editor is built unless the ruling requires one** — it carries its own
RBAC surface, its own PII write-audit posture, and its own correction-vs-falsification governance question,
none of which this story has analysed
**And** whatever ships, the §8.4a disposition (AC8) and `deferred-work.md` state **only** what has a test

### AC-R3 — The trustee-authority recipient ✅ `[RULED — Decision 2026-08-14-109 clauses 7–8; CLOSED, NO CODE]`

⭐ **RULED 2026-08-14 — 7(i): NO DPDPA action inherently requires Trustee Panel authority.** Not
access, not portability, not correction, and **not erasure of a terminated member**; its adjacency to
the Panel-exclusive `member.restore_terminated` does not carry exclusivity across.
⭐ **7(ii): where Trustee authority is required for some other governance reason — the Trustee
DECIDES and an authorised administrator EXECUTES.** Authority attaches to the **decision**, never the
**execution**. This ratifies the shape already shipped: `pariwar_admin` (Trustee-Lite) executes.
✅ **THIS AC CLOSES WITH A DISPOSITION AND NO CODE CHANGES.** ⛔ `member.data_rights` is **not**
granted to `trustee_panel`; the `roles.test.ts` holder assertion stands, and its recorded rationale
changes from *"pending a ruling"* to ***"ruled: not required"*** (Decision `2026-08-14-109` clause 7).
⚠ **The Finding-10 warning survives the ruling:** if any future requirement says a Trustee decision
must precede an act, it must be enforced by a **permission grant and/or a caller precondition** —
⛔ **never by a routing rule**, because `routed_to_role` is an advisory filter no authorization path
reads and the registry does not constrain a target to a real role.

**Given** the ruling at Decision `2026-08-14-109` clauses 7–8
**Then** the ruling's answer to *"which off-portal DPDPA actions, if any, require **Trustee** authority"* is
implemented **exactly as ruled** — and if the answer is *"none"*, that is recorded as a disposition and
**no code changes**
**And** if some action does require Trustee authority, the ruling's named **operational recipient** is
mechanized: a grant change (e.g. `member.data_rights` added to the `trustee_panel` bundle, catalog version
bumped), a caller-side authority precondition on that action, or both — ⛔ whichever the ruling names, and
⛔ **nothing it does not name**
**And** ⛔ **the intake/route half is NOT re-decided by this AC.** AC2's `other` /
`sub_category: 'dpdpa-data-rights'` routing stands; ⛔ do **not** mint a category, do **not** touch
`DEFAULT_ROUTING_POLICY`, and do **not** publish a per-Pariwar override as part of this story — Finding 5
reasons 1–3 and AC2 are unaffected by this escalation
**And** ⚠ **if the ruling names a routed destination, `routed_to_role` must NOT be relied on to enforce it.**
Finding 10(a) establishes it is an advisory filter that **no** authorization path reads; enforcement lives in
the permission grant and the caller precondition, exactly where AC3 already puts it
**And** ⛔ **the Helpdesk Operator boundary is NOT re-opened by this AC** — AC3 already rules
`helpline_operator` files but does **not** execute, and Escalation 10 asks a question *above* that boundary,
never beneath it

---

## Tasks / Subtasks

⚠ **This list was REBUILT from the ACs, not patched.** Every AC was walked and every artifact it requires
was assigned a checkbox. The coverage matrix below is the audit surface — ⛔ if you change an AC, update
this matrix and the task it points to, or the next validation finds the drift
([[feedback_spec_edits_must_propagate_to_tasks]]).

### Coverage matrix — every AC → its task(s)

| AC | Required artifacts | Task(s) |
|---|---|---|
| **AC1** (minted) | no direct artifact — satisfied *by* AC2 (intake), AC3 (capability), AC4 (member-scoping) | 3, 7a, 9 |
| **AC2** | `DPDPA_DATA_RIGHTS_SUBCATEGORY`; operator UI + handler import it; single-literal gate; `DEFAULT_ROUTING_POLICY` **untouched**; SLA disposition in the record | 3, 8, 9, 10 |
| **AC3** | `permissions.ts` (+`:441-442` scope note); `roles.ts`; `permissions.test.ts:54,56`; `roles.test.ts`; `DATA_RIGHTS_STEP_UP_CONTEXT`; preHandler chain; `display_name` attribution; `Idempotency-Key`; `withCompensatingAudit`; **`member/events.ts:89` payload widening** (`helpdesk_ticket_id` **optional**) + caller-side presence check on the off-portal route; new pinning test (**both** shapes); pinned `actor`/`trigger`; `@twt/events` blast radius | 2, **3**, **3b**, 7a, **8**, 9 |
| **AC4** | member-keyed reads; two-ticket identity proof (plaintext, `manifest.json` excluded wholesale) | 7a, 9 |
| **AC5** ⛔*split* | ⛔*blocked:* `assemble.ts` wiring, `EXPORT_SCHEMA_VERSION`, `data-export.ts:239` literal, `data-export.spec.ts:134,139,150`. ✅*un-blocked:* **AC5's "off-portal-build half"** — ⛔ see the ONE definition in AC5; this row deliberately does **not** re-enumerate it | 4, 5, 7a, 9 |
| **AC6** | ⛔ **nothing** — deliberately empty, content is AC-R2 | — |
| **AC7** | `state.ts` arm + 7 matrix rows; `state.test.ts:118` **rewrite**; totality test; caller legality (both callers); **`rtbf/handlers.ts:113` `from_state`**; end-to-end test; `member-state:test/check` | 6, 7a, 9, 10 |
| **AC8** | `.decision-log.md` entry **first**; **`docs/legal/niyamavali.md` §8.4a disposition LAST** | 0, **10** |
| **AC9** | operator strings both locales; `i18n:check`, `microcopy:test/check`; notice body **untouched** | 8, 10 |
| **AC10** | baseline **before first edit**; `pnpm ci:local`; no migration regen / no `DROP SCHEMA`; friction budget on committed history | 1, 10 |
| **AC11** | `anonymize.ts` zero (all statuses) + `expired` flip (`pending`/`ready` only — ⛔ `consumed` status BLOCKED on Esc. 9), same tx; retain metadata; ready/pending/consumed tests; stale cascade comments | 6b, 9 |
| **AC12** `[family 1]` | `TERMINAL_STATES` + 409 `data_export.member_terminal` on **BOTH** enqueue callers (member self-service **and** off-portal, ⛔ never in `assemble.ts`); no-row-created test on each; the session-revocation residual recorded in `deferred-work.md` | 5, 7a, 9 |
| **AC13** `[family 2]` | `pg_advisory_xact_lock` on a **namespaced** `member.rtbf:` key in **both** erasure callers; live two-connection **domain** spec with a forced interleave | 6, 7a, 9 |
| **AC14** `[family 9]` | DELIBERATE doc block on the `member.rtbf_anonymized` reducer arm + re-examination trigger | 6 |
| **AC15** `[family 5]` | partial-unique assertion in `data-exports-policy-regression.spec.ts` | 9 |
| **AC-R1** | ✅ **UN-BLOCKED IN FULL** (`113`, option (i)) — member-direct primary + three-part fallback gate (member request · unsuccessful OTP · staff attestation); terminology `primary_delivery_not_completed` MANDATED and gate-enforced | 7b |
| **AC-R2** | ✅ RULED (`109` cl.2) — recorded helpdesk-ticket correction process | 7c |
| **AC-R3** | ✅ RULED + CLOSED (`109` cl.7-8) — no code changes | — |

---

- [ ] **Task 0 — Governance first** (AC8)
  - [x] ✅ **LANDED 2026-08-14 — `Decision 2026-08-14-106`.** The `.decision-log.md` entry records the
        nine findings, the nine escalations (⛔ **raised, none answered**), the AC2 category ruling, the
        AC-R1/AC-R2 split, the `helpdesk_ticket_id` optionality and the pinned `actor`/`trigger`.
        Committed `governance(10.21):`-prefixed **before** any code. ⛔ **Do not re-author it** — cite
        `2026-08-14-106` and append a *new* entry if something changes
        ([[feedback_supersede_never_reinterpret]]).
  - [ ] ⛔ **The §8.4a disposition edit does NOT ride this commit** — it is **Task 10**, landing in or after
        the `story(10.21):` commit (AC8). A disposition committed ahead of its mechanism asserts a
        compliance the tree does not have.
  - [ ] ⛔ **Raise Escalations 1, 2, 7, 8, 9 and 10 and STOP on them.** 7 + 8 block AC5's export content;
        1 + 2 block AC-R1/AC-R2 (Tasks 7b/7c); 9 blocks **only** AC11's `consumed` arm (Task 6b's second
        checkbox) — the `pending` and `ready` arms are settled and ship; **10** blocks AC-R3 (Task 7d).
        Everything else here is un-blocked — do that work, then report
        the block. ⛔ Do **not** pick a delivery model to keep moving.
  - [x] ✅ **LANDED 2026-08-14 — `Decision 2026-08-14-107`** (Escalation 10, ⛔ **raised, not answered**).
        Escalation 10 is **absent from `106`**, which was committed before Finding 10's trace ran; ⛔ `106`
        is **NOT edited** ([[feedback_supersede_never_reinterpret]]) and `107` is **additive**, superseding
        nothing. `107` records the three sub-questions **CLOSED on evidence** (⛔ not put to the Panel) and
        raises Escalation 10 as the Panel's. Committed `governance(10.21):`-prefixed **before** any code
        ([[feedback_governance_commits_precede_implementation]]). ⛔ **Do not re-author it** — cite
        `2026-08-14-107` and append a *new* entry if something changes.
- [ ] **Task 1 — Read before writing + baseline** (all ACs, AC10)
  - [ ] Read fully, at `19fa644`: `packages/domain/src/helpdesk/{registry,routing}.ts`,
        `packages/domain/src/member/{state,anonymize,events,audit-shape}.ts`,
        `packages/domain/src/member/moderation/overlay.ts`, `packages/domain/src/member/project.ts`,
        `packages/domain/src/data-export/assemble.ts`, `packages/domain/src/schema/data_exports.ts`,
        `packages/contracts/src/data-export/data-export.ts`, `packages/events/src/registry.ts`,
        `apps/api/src/modules/{data-export,rtbf,helpdesk,step-up}/*.ts`,
        `apps/api/src/modules/claims/claims.helpline.{routes,handlers}.ts`, `apps/jobs/src/data-export.ts`.
  - [ ] ⚠ Capture the `pnpm ci:local` baseline **before the first edit** (AC10) — it is worthless after.
- [ ] **Task 2 — RBAC** (AC3)
  - [ ] Mint `member.data_rights`; `PERMISSION_CATALOG_VERSION` 32 → 33; key count 41 → 42; grant to
        `pariwar_admin` **only**. ⛔ **Do NOT write `super_admin` into the grant list** — it auto-derives
        (`roles.ts:242` is `permissions: PERMISSION_CATALOG.keys`). ⛔ No new role. ⛔ Not `district_admin`
        (AC3 records why — do not "fix" it).
  - [ ] ⚠ **Supersede the Story 6.17 scope note at `packages/domain/src/rbac/permissions.ts:441-442`** —
        it reads *"⛔ `PERMISSION_CATALOG.keys` stays at 41 … if that number moves in this story, a key was
        minted and the story exceeded its scope."* That was 6.17's scope bound, not a standing invariant.
        ⛔ Do not silently overwrite it: supersede it in place, naming 10.21
        ([[feedback_supersede_never_reinterpret]]).
  - [ ] Update `packages/domain/tests/rbac/permissions.test.ts:54` (32 → 33) and `:56`
        (`toHaveLength(41)` → `42`), extending the curated per-story ledger comment at `:54`.
  - [ ] Add the `member.data_rights` holder assertion to `packages/domain/tests/rbac/roles.test.ts`.
        ⚠ **21** such `expect(holders).toEqual([...])` assertions exist today (⛔ an earlier draft claimed
        "every catalog key carries one" — it does not, 21 against 42 keys; and it cited `:389`, which is a
        comment — the nearby assertion is `:392`). Expected holders: `pariwar_admin` + `super_admin`
        (the latter via auto-derivation — assert what the resolver returns, not the grant list).
- [ ] **Task 3 — Contracts (`@twt/contracts`)** (AC2/AC3/AC5)
  - [ ] `DPDPA_DATA_RIGHTS_SUBCATEGORY` **and `DATA_RIGHTS_STEP_UP_CONTEXT`** — both here, because
        `apps/admin` (the OTP-request caller) cannot import `apps/api`. ⚠ The precedent is *literal
        triplication* (`CLAIM_FILE_STEP_UP_CONTEXT` at `reconciliation/routes.ts:42`,
        `claims.convergence.routes.ts:39`, `claims.helpline.routes.ts:53`) — this story does **not**
        refactor those; it declines to add a fourth.
  - [ ] The fulfilment request/response DTOs (`.strict()`, snake_case wire).
  - [ ] ⛔ **Nothing for AC6** — it is empty and its content is the BLOCKED AC-R2.
  - [ ] ⛔ Contracts must not import `@twt/domain`'s pg-touching namespaces
        ([[project_contracts_domain_bundle_boundary]]).
- [ ] **Task 3b — Event payload schema** (AC3) ⚠ **NEW — no task ordered this before; AC3 requires it.**
  - [ ] Widen `RtbfAnonymizedPayloadSchema` (`packages/domain/src/member/events.ts:89`) to carry
        `helpdesk_ticket_id`, with the R1 justification in a comment at the schema (a UUID is not cleared
        PII — AC3).
  - [ ] ✅ **DECIDED 2026-08-14 — `helpdesk_ticket_id` is OPTIONAL. This subtask is UN-BLOCKED.**
        `helpdesk_ticket_id: z.string().uuid().optional()`, `.strict()` retained — following
        `KycCompletedPayloadSchema` (`member/events.ts:41-43`), the same-module precedent for extending
        `auditShape` with an optional field. ⛔ **Required** would break every member self-service RTBF at
        runtime (four-field payload at `rtbf/handlers.ts:112-117`, parsed before insert at
        `member/project.ts:78`). ⛔ Do **not** reach for `.passthrough()` — `.strict()` is what keeps the
        "no free text" guarantee.
  - [ ] ⚠ **The optionality moves the provenance guarantee to the CALLER (AC3).** An off-portal erasure
        that omits the ticket id now validates cleanly and is indistinguishable from a member one.
        The **off-portal fulfilment handler requires it and fails closed without it** — same caller-side
        shape as AC7's legality and AC12's terminal guard.
  - [ ] Author the **NEW** pinning test in `packages/domain/tests/member/` (⛔ **do not edit
        `withdrawal.test.ts:92`** — it pins the *withdrawal* schemas, which this story does not widen;
        nothing pins the RTBF payload today). Assert the shape(s) **exactly** + still-rejects-free-text.
  - [ ] ⚠ Verify `@twt/events` still builds — `packages/events/src/registry.ts:104` binds this schema
        ([[project_type_only_import_cycle_trap]]: verify **consuming** packages, not just `@twt/domain`).
- [ ] **Task 4 — Migration** (AC5, un-blocked half)
  - [ ] `0103_data-exports-off-portal.sql`, hand-authored: `requested_via` / `requested_by_actor_id` /
        `helpdesk_ticket_id`, **plus the `requested_via` CHECK and the `helpdesk_ticket_id` FK**.
        ⚠ `data_exports` carries a **table-level** `GRANT SELECT, INSERT, UPDATE` (`0033:46`), so new
        columns **are** covered — differs from 0099's column-level grants, needs **no** re-grant.
        ⛔ Do not regenerate; do not `DROP SCHEMA`.
  - [ ] ⛔ **No enum migration.** If you are writing `ALTER TYPE helpdesk_category`, re-read Finding 5.
- [ ] **Task 5 — Export** (AC5) ✅ **CONTENT HALF TRANSFERRED OUT — Decision `2026-08-14-109` clause 9.**
      ⛔ It is **not blocked** and **not this story's**: a named successor story owns the export-content
      data contract (record shapes + the **claimant-only** predicate ruled at clause 5 + honouring the
      withholding ruled at clause 3). ⚠ **That successor story is still UNNAMED** — recorded in
      `deferred-work.md` with an immediate re-trigger. The un-blocked items below remain Task 5's.
  - [ ] ⛔ **BLOCKED:** wiring `contribution_history` + `claim_history`, deleting the two `emptySection`
        calls, bumping `EXPORT_SCHEMA_VERSION`, and bumping `ManifestSection.schemaVersion`
        (`contracts/data-export/data-export.ts:239`). The section contracts reject any record
        (Escalation 7); the claim subject predicate is undefined (Escalation 8).
  - [ ] ✅ **Un-blocked:** record the two remaining FR-95 gaps (Contribution-Note PDFs 8.7, the member's
        helpdesk tickets) in `deferred-work.md` with a named **non-epic** re-trigger.
  - [ ] ✅ **Un-blocked (AC12):** record the **session-revocation residual** — *"RTBF must revoke live
        member sessions"* — in `deferred-work.md` with a **named successor story** re-trigger (⛔ never an
        epic). ⚠ A shipped defect wider than this story: `anonymizeMember` revokes nothing and
        `requireMemberSession` is a stateless JWT verify, so an erased member reaches any session-only
        route for the remainder of a 15-minute TTL. AC12 closes only the `data_exports` surface.
  - [ ] ✅ **Un-blocked (Finding 6, and its ONLY home — do not lose it with the blocked work):** correct
        the stale column name at `assemble.ts:28` (⚠ **`:28`, not `:26`** — `:26` is a bare `//`) — it still says
        `member_moderation_actions.rationale_ciphertext`, renamed to `decision_note_ciphertext` by
        migration 0099 (`schema/member_moderation_actions.ts:92,96`). Finding 6 requires this
        *"either way"*, independent of Escalation 3's disposition.
- [ ] **Task 6 — Erasure legality** (AC7)
  - [ ] Widen the `member.rtbf_anonymized` reducer arm to **every `MEMBER_LIFECYCLE_STATES` label but
        `anonymized`** (eight `from` states) + add the **seven new** matrix rows (⛔ the `withdrawn` row
        already exists at `state.ts:155` — do not duplicate).
  - [ ] ⚠ **Rewrite `packages/domain/tests/member/state.test.ts:118`** — it asserts
        `step('active', rtbf) === 'active'`, the **exact opposite** of AC7. ⛔ Rewrite to the new truth and
        record it in the Dev Agent Record; do not silently delete a pinned invariant.
  - [ ] Add the **enum-derived totality test** over `MEMBER_LIFECYCLE_STATES` (AC7).
  - [ ] Put the legality precondition in the **callers** (⛔ never the reducer), using
        `getCurrentMemberModerationOverlay` (**unbounded**) — ⛔ never the `at`-bounded variant
        (`overlay.ts:132-149` records why). Extend the **existing member RTBF handler's** guard to the
        same predicate so the two paths cannot diverge.
  - [ ] **AC14** — add the **DELIBERATE** doc block to the `member.rtbf_anonymized` arm in `state.ts`:
        breadth is intentional; legality lives in the callers (name both); why the reducer must not read
        the overlay; and the re-examination trigger (*"a new caller appending this event must carry the
        overlay precondition or this arm is wrong"*).
  - [ ] **AC13** — take a **`pg_advisory_xact_lock`** on a key derived from
        `` `member.rtbf:${pariwarId}:${memberId}` `` before the legality read in the **existing member RTBF
        handler** (the off-portal half is Task 7a). ⛔ Namespaced — a bare `hashtext(memberId)` collides
        with `member-auth.service.ts:54`'s device-binding lock. ⛔ **`_xact_`, not `pg_advisory_lock`.**
        ⛔ A lock on one path only is not serialization.
  - [ ] **AC13** — the existing 23505 catch at `rtbf/handlers.ts:136-148` is **INERT**
        (`MemberStreamConcurrencyError` has no `code`, `errors.ts:107-118`) and under READ COMMITTED the
        loser appends a **duplicate event** instead. ⛔ Do not read it as prior art. Either fix it or
        delete it — ⛔ do not leave a comment claiming a protection that does not exist.
  - [ ] ⚠ **Fix `apps/api/src/modules/rtbf/handlers.ts:113`** — `from_state: 'withdrawn'` is hardcoded.
        Read the member's real replayed state and write what you read. ⛔ Left as-is, the moment the guard
        admits a terminated `active` member this line writes a **false audit record** (AC7).
- [ ] **Task 6b — Erasure REACH** (AC11)
  - [ ] Extend `anonymizeMember` to zero `artifact_ciphertext` (→ NULL) and flip status → `expired` for
        the member's `data_exports` rows, **in the same tx**. ⛔ Retain the metadata rows.
  - [x] ✅ **RULED — Decision `2026-08-14-109` clause 6: the `consumed` row RETAINS its status.** The shipped behaviour is already exactly this, so this arm closes with **no code change**; the test asserting `status === 'consumed'` after erasure now rests on a ratified basis. The historical framing below is retained for context.
        AC11 says "every row" flips to `expired` **and** that the metadata row is retained *"so the audit
        trail survives"*; overwriting a `consumed` row's status destroys the record that the member
        actually downloaded their export. That is a **retention** question owed to the Panel, not a coding
        preference. ✅ **Un-blocked and ship now:** the `pending` flip (load-bearing — it stops an
        in-flight build resurrecting the dossier) and the `ready` flip, plus zeroing
        `artifact_ciphertext` on **all** statuses including `consumed` (uncontroversial — the vacuum
        already does exactly that). ⛔ Leave only the `consumed` **status** untouched pending the ruling.
  - [ ] Correct the two stale comments that claim a cascade protection which never fires:
        `packages/domain/migrations/0033_data-exports.sql:40` and
        `packages/domain/src/schema/data_exports.ts:19`.
  - [ ] Raise **Escalation 6** (the wider inert-cascade class) — owner: a named successor story, ⛔ never
        an epic.
- [ ] **Task 7a — Fulfilment routes + handlers, UN-BLOCKED half** (AC3/AC4/AC5/AC7)
  - [ ] `apps/api/src/modules/member-data-rights/` — the AC3 preHandler chain
        (`requireAdminSession, scopeResolutionHook, requirePermissionHook(… 'member.data_rights',
        { dimension: 'pariwar' }), requireStepUp(deps, DATA_RIGHTS_STEP_UP_CONTEXT)`).
  - [ ] The **export-build enqueue** route: enqueues the existing `DATA_EXPORT_BUILD` job (⛔ do not write
        a second assembler); writes `requested_via: 'off_portal_admin'` + actor + ticket id; enqueue
        **after commit**, with compensation on enqueue failure (`data-export/handlers.ts` is the
        exemplar). ⛔ **NO download/handover path** — that is AC-R1.
  - [ ] The **erasure** route (AC7's caller-side legality).
  - [ ] **AC12** — a `TERMINAL_STATES` set + 409 **`data_export.member_terminal`** on the off-portal
        enqueue route, creating **no** `data_exports` row. Follow the five shipped precedents
        (`nominee.handlers.ts:40`, `member-terms:39`, `medical:62`, `vyawastha-shulk:43`,
        `life-events:42`) — ⛔ not an `rtbf.already_anonymized`-shaped code on a non-RTBF route.
  - [ ] **AC12** — ⚠ **the SAME guard on the EXISTING member enqueue handler**
        (`apps/api/src/modules/data-export/handlers.ts`, which has no lifecycle check today). ⛔ Guarding
        only the new route leaves the already-reachable one open. ⚠ Verify no shipped export spec seeds a
        terminal member on the enqueue path before assuming this is additive.
  - [ ] **AC13** — `pg_advisory_xact_lock` on the namespaced `member.rtbf:` key before the legality read
        in the **off-portal erasure handler** (member-side half is Task 6).
  - [ ] **AC3** — the off-portal erasure handler writes **`actor: 'trustee'`** and
        **`trigger: 'member_data_rights.rtbf_fulfilled'`** on the appended `member.rtbf_anonymized`
        (⚠ the member family's dotted namespace, per `moderation/write.ts:314` — ⛔ **not** an `admin_`
        prefix, which is the `claim.*` family's). ⛔ Do **not**
        copy `rtbf/handlers.ts:112-117`'s `actor: 'member'` / `trigger: 'rtbf_request'` — that is the
        member exemplar and copying it writes a false actor attribution.
  - [ ] **AC3** — the off-portal erasure handler **requires** `helpdesk_ticket_id` and fails closed
        without it. ⚠ The payload schema makes it `.optional()` for the member path's sake, so the
        schema **cannot** enforce this — an off-portal erasure missing the id would validate cleanly and
        become indistinguishable from a member self-service one.
  - [ ] `23505` on `data_exports_one_pending_per_member` → **typed 409 naming the existing pending
        export**. ⛔ Do not reuse the member's row; ⛔ do not cancel it. ⚠ `23505` is on `err.cause.code`.
  - [ ] `Idempotency-Key` on **every** fulfilment route (AC3) — erasure is irreversible.
  - [ ] `users.display_name` attribution snapshotted server-side; ⛔ a missing name **blocks** the action
        with a typed error (AC3).
  - [ ] `withCompensatingAudit` + the originating `helpdesk_ticket_id` on every fulfilment call
        (ADR-0030 — ⛔ not a bare `writeAuditEntry`).
  - [ ] ⛔ **Every fulfilment read keys on `member_id`** — never `ticket_id`, never `data_export_id` (AC4).
  - [ ] Regenerate `openapi/v1.yaml` (the EXPECTED diff).
- [ ] **Task 7b — Delivery** (AC-R1) ✅ **UN-BLOCKED IN FULL — `2026-08-14-113` ratified option (i).**
      Both halves may proceed. ⛔ Build the fallback as the **three-part gate** below, and ⛔ name
      everything `primary_delivery_not_completed` — the terminology gate will fail the build otherwise.
  - [ ] **PRIMARY — member-direct.** A one-time, OTP-verified download grant to the registered mobile;
        the member proves possession and ⛔ **no session is issued**.
  - [ ] **FALLBACK — the THREE-PART GATE** (`113` cl.1), ⛔ all three required, none substituting:
        **(1)** the member's **explicit request** — machine-enforced, fails closed;
        **(2)** an **unsuccessful OTP attempt** (`consumed_at IS NULL AND expires_at < now()` over
        `member_auth_otps`) — machine-enforced, fails closed;
        **(3)** the staff **attestation** — recorded in the internal justification, ⛔ NOT
        machine-verifiable and ⛔ not claimed to be.
        ⛔ Staff may not initiate or unilaterally select it. Must read as an **exception** in code, UI
        and audit — never an equivalent choice.
  - [ ] ⛔ **RECORD TWO SEPARATE FACTS, DIFFERENT AUTHORS — do not collapse into one field** (`111`
        cl.3): (1) **the member explicitly requested** staff mediation — the TRIGGER, captured at
        intake, member-authored; (2) **why the exception was permitted** — the JUSTIFICATION,
        staff-authored. A single staff "reason" field would absorb the member's trigger into a staff
        assertion.
  - [ ] ⛔ **NAME IT `primary_delivery_not_completed` — predicate, column/field, error code AND audit
        action** (`113` cl.2). ⛔ **NEVER `mobile_lost`, NEVER `mobile_unreachable`.** The check
        verifies the ROUTE, not the handset; the other names assert what the system never established.
        ✅ Enforced by `packages/contracts/tests/delivery-terminology-gate.test.ts` — it will fail the
        build, tree-wide, on either banned term.
  - [ ] ⚠ **`attempts` is NOT in the predicate**, and whether it should be (`attempts = 0`) is an OPEN
        question — a non-zero count is evidence the member DOES control the mobile. ⛔ Do not add it
        unilaterally (`113` *Open follow-ups*).
  - [ ] ⛔ **The justification is MECHANIZED and fail-closed** — the fallback cannot proceed without
        one. ⛔ Free text about a member ⇒ a **Tier-1 encrypted column**, ⛔ NEVER an event payload.
  - [ ] ⭐ **Add that column to `anonymizeMember`'s coverage set IN THE SAME COMMIT**, and move
        `rtbf-anonymize.test.ts`'s count assertion (9 tables / 10 statements) **upward**. ⛔ Skipping
        this creates a Tier-1 column that survives an erasure — the exact 10.10 / Finding-9 class.
  - [ ] ✅ Keep the justification **withheld** from the export — **RULED** (`111` cl.1), an internal
        operational/audit record. Already the built posture; the status moved from reading to ruling.
        ⛔ Its counterpart — the member's own **request** — is a different artifact and `111` cl.1 is
        silent on it; add nothing to the export on that basis.
- [ ] **Task 7c — Correction** (AC-R2) ✅ **UN-BLOCKED — Decision `2026-08-14-109` clause 2.**
      Build a **recorded, staff-executed correction process on the existing helpdesk substrate**.
      ⛔ **No general admin member-profile editor** — the ruling authorises a recorded *process*, not a
      write surface.
- [x] ✅ **Task 7d — Trustee-authority recipient** (AC-R3) — **CLOSED 2026-08-14 with NO CODE**
      (Decision `2026-08-14-109` clauses 7-8). No DPDPA action inherently requires Panel authority;
      where Trustee authority applies for another reason, the Trustee **decides** and an authorised
      administrator **executes**. ⛔ `member.data_rights` is still **not** granted to `trustee_panel`,
      `routed_to_role` is still **not** an authorization check, and no routing rule was added — the
      ruling confirms the shipped shape rather than changing it. ⛔ Update the `roles.test.ts` rationale
      from *"pending a ruling"* to *"ruled: not required"*, citing the decision id.
- [ ] **Task 8 — Operator surface** (AC2/AC9)
  - [ ] The subcategory in the operator ticket-filing surface + the fulfilment action in the helpdesk
        detail page (`apps/admin/src/modules/helpdesk/` — ⚠ verify the module before editing; sibling
        admin modules are easy to misattribute, [[feedback_story_validate_footguns]]).
  - [ ] Both surfaces **import** `DPDPA_DATA_RIGHTS_SUBCATEGORY` and `DATA_RIGHTS_STEP_UP_CONTEXT` — ⛔
        never re-declare either literal (AC2/AC3).
  - [ ] `i18n-en.ts` + **both** locale files in the same commit (AC9). ⛔ Do **not** re-word
        `moderation.notice.terminated.body` (Finding 8).
- [ ] **Task 9 — Tests** (AC2/AC3/AC4/AC5/AC7/AC11)
  - [ ] `apps/api/tests/integration/member-data-rights/*.spec.ts`:
        · AC4 two-ticket identity proof — **assembled plaintext**, `manifest.json` excluded **wholesale**
        (⛔ not "`generated_at` excluded": the field is `generatedAt`, and `exportId` is a row identity
        that differs between builds; ⛔ never a ciphertext byte compare)
        · AC7 terminated-member erasure end-to-end, asserting the event's `from_state` reads **`active`**
        · AC11 ready-row zeroing, asserted on the `data_exports` row **directly**
        · AC3 redelivery/idempotency: exactly one write, one event, idempotent no-op on replay
        · AC5 `23505` → typed 409 collision; built-but-undeliverable row reachable and **inert**
        · AC3 missing-`display_name` blocks the action
        · **genuine** cross-Pariwar denial (a second real Pariwar — the Story 1.19 finding)
        · **AC12** enqueue for an erased member → 409 `data_export.member_terminal` **and no
          `data_exports` row created** — proven on **BOTH** paths (member self-service + off-portal)
        · **AC3** per-route **permission denial** (an actor without `member.data_rights` → 403) and
          **step-up denial** (no fresh `DATA_RIGHTS_STEP_UP_CONTEXT` elevation → 403
          `auth.step_up_required`), on **each** new mutation route. ⚠ This **proves AC3's existing
          preHandler-chain requirement** — it adds nothing to it. It is mandatory because **no automatic
          guard covers it**: `login-wall.spec.ts` walks the route table for the *session* gate only, and
          `getCollectedRoutes` has no other consumer. The convention is a per-route assertion
          (`claims/appeal.spec.ts:381,426`).
        · ⓘ **OPTIONAL, defense-in-depth — NOT mandatory coverage.** Tampered / expired / absent-token and
          non-human/system-actor denial per route. ⚠ **Covered by construction:** `requireAdminSession`'s
          own rejection behaviour is tested where the guard is tested, and
          `apps/api/tests/integration/login-wall.spec.ts` proves *"authenticated ⇒ guarded"* across the
          **real route table** — a new non-allowlisted route that forgets the preHandler **fails CI, not
          prod**. Re-asserting it per route is duplication. ⛔ Do not treat its absence as a gap.
  - [ ] **AC13** — ⚠ a **live two-connection** erasure race as an **own-committing DOMAIN spec** under
        `packages/domain/tests/integration/`, following `claim/appeal-concurrency.spec.ts:26` (*"a real
        race needs REAL concurrent COMMITs on SEPARATE pool clients"*). Assert **exactly one** write,
        **exactly one** `member.rtbf_anonymized` event, losers rejected with the existing typed 409.
        ⛔ **Force the interleave** — hold the winner's tx open past the loser's guard read. Two
        concurrent `app.inject` calls serialize by chance and pass **with or without** the lock. ⛔ A
        route-level spec cannot witness this.
  - [ ] `packages/domain/tests/member/state.test.ts` — the AC7 enum-derived totality test **and** the
        `:118` rewrite (Task 6).
  - [ ] `packages/domain/tests/member/` — the **NEW** `RtbfAnonymizedPayloadSchema` pinning test
        (Task 3b, un-blocked): asserts **BOTH** the 4-field member payload and the 5-field off-portal
        payload parse **exactly**, and that free text is still rejected. ⛔ Not one shape only.
  - [ ] The AC3 caller-side assertions: the **off-portal** route rejects an erasure with no
        `helpdesk_ticket_id` (the half `.optional()` cannot enforce); and the appended event carries
        **`actor: 'trustee'`** + **`trigger: 'member_data_rights.rtbf_fulfilled'`**, ⛔ not the member exemplar's
        `'member'` / `'rtbf_request'`.
  - [ ] `packages/domain/tests/integration/rls/data-exports-policy-regression.spec.ts` — **NEW**; the
        table has none today (23 table specs exist, `data_exports` is not among them). RLS
        positive/negative/fail-closed/FORCE + the new FK + the `requested_via` CHECK, asserted at the
        **migration level**, plus the cross-Pariwar `WITH CHECK` refusal AC4's route test cannot witness.
        · **AC15** the `data_exports_one_pending_per_member` **partial unique** (`0033:61`) in **TWO
        separate `it()` blocks**: **(a)** a second `pending` row for the same member raises `23505`;
        **(b)** a member holding a `ready`/`consumed`/`expired` row **can still** take a new `pending` row.
        ⛔ (b) pins the **predicate** — a "different member" case would pass on a plain `UNIQUE
        (member_id)` too (`member-moderation-grounds-policy-regression.spec.ts:262`). ⛔ Not one `it()` —
        after the 23505 the harness tx is aborted and the next INSERT fails with `25P02`.
  - [ ] The AC2 single-literal gate (⚠ excluding the scanning test's own file) and the AC3
        `DATA_RIGHTS_STEP_UP_CONTEXT` shared-symbol assertion.
  - [ ] `packages/domain/tests/rbac/permissions.test.ts:54,56` + `roles.test.ts` holder assertion (Task 2).
  - [ ] ⚠ Must pass **UNTOUCHED**: `packages/domain/tests/helpdesk/default-policy-hash.test.ts` (a diff on
        `EXPECTED_HASH` is a failed AC2, not a rebase artifact) and
        `packages/contracts/tests/helpdesk.test.ts` (the tuple sync-guard).
  - [ ] ⛔ **BLOCKED (Escalations 7 + 8):** the AC5 non-empty presence assertions, and the
        `packages/domain/tests/integration/data-export/data-export.spec.ts:134,139,150` rewrites. Do not
        author or touch them.
  - [ ] ⚠ Live-DB specs: suite-level `{ timeout: 20000 }`; test DB `twt-test-pg` on **:5433**; set
        `DATABASE_URL` for a **single pass only** ([[project_ci_local_double_run_pollution]]).
- [ ] **Task 10 — Instrument, gates + record** (AC8/AC9/AC10)
  - [ ] ⚠ **The §8.4a disposition edit — `docs/legal/niyamavali.md`** (AC8). ⚠ **No task ordered this
        before.** Add the explicit **"Statutory rights (DPDPA)"** disposition to the mechanization-status
        note, claiming **only** what has a test. ⛔ Lands in or **after** the `story(10.21):` commit, never
        in Task 0's governance commit. ⛔ No §8.4 text is re-read or reinterpreted.
  - [ ] `pnpm member-state:test && pnpm member-state:check` (AC7).
  - [ ] `pnpm i18n:check && pnpm microcopy:test && pnpm microcopy:check` (AC9).
  - [ ] `pnpm ci:local` with `DATABASE_URL`, compared against the Task 1 baseline (AC10).
        ⚠ [[project_known_livedb_test_failures]] #3 (renewal-lifecycle) is still open and is **not** this
        story's. ⛔ Never regenerate an applied migration (`42P07`); ⛔ never `DROP SCHEMA` (`42P01`).
  - [ ] The AC2 SLA disposition (*"carried knowingly, pending Escalation 5"*) stated in the story record.
  - [ ] `deferred-work.md` section; the Dev Agent Record below; ⚠ the friction-budget diff is **committed**
        history — AC-4 passes vacuously until you commit ([[project_friction_budget_baseline_ratchet]]).

---

## Escalations owed (raise them; do not silently absorb)

⛔ **None of these may name an EPIC as its owner or re-trigger** ([[project_r7_fact_producer_unbuilt]]).

1. **Delivery of the export artifact — Finding 4. BLOCKS AC-R1.** ⚠ Posed as **three** questions, because
   the binary "(a) or (b)" form is what let an earlier draft assume its own answer:
   **(i)** Is staff-mediated delivery — a staff actor obtaining a member's assembled, decrypted Tier-1
   export — permitted **at all**?
   **(ii)** If the OTP-verified member grant is required as the primary, is staff-mediated permitted as a
   **fallback** for a member who no longer controls the registered mobile, and under what conditions
   (step-up alone, a recorded justification, a second-actor authorisation)?
   **(iii)** If staff-mediated is permitted at all, is it permitted as the **v1 primary**?
   ⛔ **Nothing in this story presumes (ii) is "yes".** That presumption was the defect.
   ⭐ **The Panel should know the sequencing is free:** the flag is DEFAULT OFF and its flip is gated on
   this story, so **no member can be stranded without a route while this is decided** (Finding 4).
   *Owner:* Trustee Panel. *Re-trigger:* immediate — it blocks AC-R1 and therefore the release gate.
2. **Correction — Finding 3. BLOCKS AC-R2.** The right is unmechanized for **all** members, not only
   terminated ones. **What discharges the release gate?** — three mechanized rights plus a recorded,
   staff-executed correction process, or all four mechanized first? ⛔ This question is **prior to** any
   acceptance criterion, which is why AC6 is empty: the disposition an earlier draft wrote into AC6 was
   this escalation's *answer*, presented as a requirement. *Owner:* Trustee Panel. *Re-trigger:* immediate —
   it blocks AC-R2 and is a stated input to the release-gate question.
3. **Moderation-record disclosure — Finding 6.** Is `decision_note` (and 10.20's three further Tier-1
   moderation columns, and `actor_display`) owed to the data principal under the access right?
   *Owner:* Trustee Panel + Legal Counsel. ⚠ Counsel is **not engaged** — every field in
   `docs/legal-counsel-engagement/` is `<PENDING>`; record the answer as **un-attested** if it arrives on
   Panel attestation alone ([[feedback_record_unattested_no_backfill]]). *Re-trigger:* before AC5's
   `EXPORT_SCHEMA_VERSION` is bumped again — the ruling decides the export's **contents**, so it is due at
   the next change to the artifact's shape, ⛔ not at a later epic.
4. **The default-policy versioning defect — Finding 5, reason 2.** `default-policy-hash.test.ts` prescribes
   a remedy (`bump DEFAULT_ROUTING_POLICY_VERSION`) that would misresolve every version-2 override and make
   every version-1 ticket un-replayable. *Owner:* a named successor story. *Re-trigger:* the first story
   that needs to change the default routing policy's rules. ⛔ Do not fix it here — this story's design
   avoids needing to.
5. **The statutory response horizon.** The registry SLA for `other` is 24h first-response / 5 business days
   resolution. Whether that satisfies the DPDPA's statutory response window is a **legal** question this
   story does not answer and must not invent a number for. *Owner:* Trustee Panel + Legal Counsel.
   *Re-trigger:* the first data-rights ticket to breach the `other` SLA in production, or the first
   per-Pariwar routing override authored for `dpdpa-data-rights` — whichever comes first.

6. **The inoperative RTBF cascade on `data_exports` — Finding 9.** `0033:40` and
   `schema/data_exports.ts:19` both state that RTBF removal happens via `ON DELETE CASCADE` on the member
   FK. Story 3.12 shipped RTBF as a **soft** delete, so the cascade has never fired and the documented
   mechanism has been inert since 3.11. AC11 closes it **for `data_exports`**. ⚠ **The class is wider:**
   every table carrying `ON DELETE CASCADE` to `members.member_id` and relying on it for RTBF has the same
   inert guard. *Owner:* a named successor story — ⛔ **not an epic**
   ([[project_r7_fact_producer_unbuilt]]). *Re-trigger:* immediate; scope is an audit of every
   `members` FK cascade against `anonymizeMember`'s coverage set, plus a correction of the two stale
   comments (which currently assert a protection that does not exist).
7. ⛔ **The export section contracts structurally forbid the records AC5 must write. BLOCKS AC5.**
   ```
   packages/contracts/src/data-export/data-export.ts:61-68
     EmptyExportSection = z.object({
       records: z.array(z.never()),                              ← rejects ANY record
       _status: z.literal('no_source_system_at_this_epic'),
       _wired_by: z.string(),
     }).strict();
   :75-77  ContributionHistorySection = EmptyExportSection.extend({ _wired_by: z.literal('Epic 8') })
   :85-87  ClaimHistorySection        = EmptyExportSection.extend({ _wired_by: z.literal('Epic 6') })
   apps/jobs/src/data-export.ts:73-74  — bound into SECTION_SCHEMAS; .parse() runs at :143
   ```
   `records: z.array(z.never())` accepts **only** the empty array, and `_status` is pinned to the literal
   `'no_source_system_at_this_epic'`. AC5's *"wired to real reads, the `emptySection` calls are removed"*
   is therefore **impossible** without replacing both section contracts with real record shapes — and the
   failure surfaces at **job runtime**, not at typecheck, which is precisely the silent-failure class
   Finding 2 exists to prevent.
   ⚠ **This is not a fix the dev agent may improvise.** The contracts encode a deliberate design
   (`:70-73`, `:80-83` — *"Named alias so the Epic 8 swap-in is one targeted type change here"*), so the
   swap-in was anticipated; what was **never specified** is the record shape. Defining
   `contribution_history` and `claim_history` record schemas is a **data-contract decision** with PII
   consequences (they land decrypted in a ZIP that AC-R1 may hand to a staff actor), and it interacts
   with Escalation 3 and Escalation 8.
   ⛔ **Nothing in this story chooses those shapes.** *Owner:* a named successor story **or** this story
   re-scoped by ruling — the Panel/PO decides which. *Re-trigger:* immediate; AC5 cannot start.

8. ⛔ **`claim_history.json` has NO subject predicate, and the obvious joins leak a THIRD PARTY'S PII.
   BLOCKS AC5's claim arm.**
   Claims are about a **deceased** member. The requesting member appears across `claims`,
   `claim_nominee_bank_accounts`, `claim_verifier_decisions`, `claim_r9_votes`,
   `claim_shepherd_assignments`, `claim_ground_inspections` and `member_pool_assignments` in at least six
   distinct roles — claimant, nominee, verifier, R9 voter, shepherd, ground inspector, assigned donor.
   AC5 requires only that *"a member with contributions and a claim gets **non-empty** `records`"*, an
   assertion satisfied by **any** of those joins — including ones that export **another member's**
   identity, nominee bank details, or medical disclosure into a decrypted export.
   ⚠ **FR-95 does not name claim history at all** — it names *"member profile, contribution history,
   attribution chain, Contribution Notes (PDFs)"* (`prd.md:1233`). So the content scope of
   `claim_history.json` is unspecified from **every** direction: not by FR-95, not by the epic, not by the
   contract (Escalation 7), and not by this story.
   ⛔ **This story does not decide what a member is owed about a claim they participated in, nor in which
   role.** That is a DPDPA data-subject-scope question with a direct third-party-PII consequence.
   *Owner:* Trustee Panel + Legal Counsel (⚠ counsel un-engaged — record as un-attested if it arrives on
   Panel attestation alone, [[feedback_record_unattested_no_backfill]]). *Re-trigger:* immediate; it
   blocks AC5's claim arm and must be answered before Escalation 7's record shapes can be defined.

9. ⛔ **AC11's `consumed`-row treatment destroys an audit fact AC11 itself promises to keep. BLOCKS AC11's
   `consumed` arm only.**
   AC11 requires `anonymizeMember` to flip **every** `data_exports` row of the member to `expired`, and in
   the same breath requires the metadata row be retained *"so the audit trail survives"*. Those two clauses
   conflict on exactly one status: overwriting a **`consumed`** row's status erases the record that the
   member **actually downloaded their export** — a fact about a completed statutory-access fulfilment.
   ⚠ The other two statuses are settled and are **not** blocked: `pending` is load-bearing (the flip is
   what stops an in-flight `DATA_EXPORT_BUILD` resurrecting the dossier after the erasure commits) and
   `ready` plainly needs both the zeroing and the flip.
   ⛔ **The question is a retention question, not a coding preference:** does DPDPA erasure reach the
   *metadata of a fulfilled access request*, or is that record part of the audit trail the Trust must
   keep? Zeroing `artifact_ciphertext` on a `consumed` row is uncontroversial (the vacuum already does it);
   **changing its status is the contested act.**
   ⛔ Nothing in this story decides it. *Owner:* Trustee Panel + Legal Counsel (⚠ counsel un-engaged —
   record as un-attested if it arrives on Panel attestation alone,
   [[feedback_record_unattested_no_backfill]]). *Re-trigger:* immediate; it blocks AC11's `consumed` arm
   and Task 6b's second checkbox. ⚠ Found by the third validation pass, not by drafting.

10. ⛔ **An off-portal DPDPA request whose action requires TRUSTEE authority has NO operational recipient.
    BLOCKS AC-R3.** ⚠ Posed as **three** questions, because a binary "route it to the Panel or not" form
    would smuggle in its own answer — the same defect Escalation 1 was re-posed to avoid.

    ⭐ **What the existing model DOES answer — stated first, so the Panel is not asked a settled question**
    (evidence in Finding 10):
    · **"Trustee" is not `state_trustee`.** Ratified in §8.7's own text (Decision `2026-08-10-096` clause 9)
     and structurally impossible besides — a `state` ceiling can never satisfy a `pariwar`-dimension check.
    · **The Helpdesk Operator may intake/verify/route but may NOT execute.** AC3 already rules it:
     `member.data_rights` → `pariwar_admin` **only**, ⛔ not `helpline_operator`. ⛔ **This half of the
     question is CLOSED and is not re-opened here** ([[feedback_closure_language_precision]]).
    · **The routing mechanism is adequate and needs no change.** Per-Pariwar versioned overrides +
     a free-token `sub_category` already express any destination; AC2 changes nothing in the default.

    ⛔ **What it does NOT answer — the actual escalation:**
    **(i)** Does **any** off-portal DPDPA action require **Trustee Panel** authority — specifically
    **erasure of a terminated member**, which sits adjacent to the Panel-exclusive
    `member.restore_terminated` (§8.4, Decision `2026-08-10-097` clause 1)? If **none** does, say so and
    AC-R3 closes with a disposition and no code.
    **(ii)** If some action does, **who is the operational recipient?** ⚠ The Panel has **governance
    authority and no operational queue**: `trustee_panel` holds `member.moderate` +
    `member.restore_terminated` and ⛔ **no helpdesk permission at all** (`roles.ts:583-627`), so it cannot
    today see, open, reply to or resolve a ticket. The options are (a) grant the Panel role the fulfilment
    capability, (b) keep execution with `pariwar_admin` as **Trustee-Lite** and require a recorded Panel
    authorisation as a caller precondition, or (c) rule that Trustee authority attaches to the *decision*
    and never to the *execution*. ⛔ **This story does not choose.**
    **(iii)** If a **routed** destination is named, the Panel should know it carries **no enforcement**:
    `routed_to_role` is an advisory filter no authorization path reads (Finding 10(a)), and
    `validateRoutingPolicyRules` does not constrain `target_role` to the seeded catalog
    (`registry.ts:184-189`) — so a Panel-named destination that is only *routed* would be **silently
    inert**. Enforcement must land in a grant and/or a caller precondition.

    ⚠ **This ABSORBS the `F6` role half** that the final validation pass recorded as *"dispositioned
    nowhere"*: AC2 routes every DPDPA request to the `other` catch-all → `helpline_operator`
    (`registry.ts:62`), whom AC3 forbids from executing. ⚠ The **SLA** half is separately dispositioned
    (*"carried knowingly"*, AC2 / Escalation 5) and is **not** re-opened.

    ⭐ **The Panel should know the sequencing is free**, exactly as for Escalation 1: `termination_access_block`
    is DEFAULT OFF and its flip is gated on this story, so **no member can be terminated-with-access-ended
    while this is decided** — the off-portal arm is unreachable in production until after the flip.
    ⚠ **Consequence, stated plainly:** this escalation does **not** block the un-blocked scope's code, but it
    **is a release-gate input** — the gate must not be treated as discharged while it is open.
    *Owner:* Trustee Panel. *Re-trigger:* immediate; it blocks AC-R3 and is due **before the
    `termination_access_block` flip**, ⛔ never at a later epic. ⚠ Found by a focused routing trace on
    2026-08-14, after `Decision 2026-08-14-106` was committed — so it is **absent from that entry** and is
    raised instead by **`Decision 2026-08-14-107`**, which is additive and edits `106` in no way.

⚠ **Escalations 7, 8 and 9 are BLOCKING and were found by post-authoring validation passes, not by the
original drafting. Escalation 10 was found later still, by a focused routing trace.** ⛔ The correct dev-agent action is now: ship AC1–AC4, AC7–AC15 **and AC5's
off-portal-build half** (defined in AC5) **and AC11's `pending`/`ready` arms**, hold **AC5's
export-content half** and **AC11's `consumed`-status arm**, and report all **six** blocks
(Escalations 1, 2, 7, 8, 9, 10).
⭐ **SUPERSEDED 2026-08-14 — Decision `2026-08-14-109` RULED ALL EIGHT PANEL ESCALATIONS. ZERO BLOCKS
REMAIN.** Disposition, by escalation: **1** ruled (member-direct delivery) · **2** ruled (recorded
helpdesk-ticket correction discharges the gate) · **3** ruled (deliberative material withheld) ·
**5** ruled (48h/5 — the shipped 24h/5 already exceeds it, no code change) · **8** ruled
(claimant-only) · **9** ruled (`consumed` retains its status — already shipped) · **10** ruled + closed
(no DPDPA action inherently requires Panel authority) · **7** discharged **by transfer of ownership**
to a named successor story. ⛔ **4** and **6** were never Panel items and remain owned by named
successor stories — they are **not** discharged by this ruling.
⭐ **RESOLVED 2026-08-14 — `Decision 2026-08-14-113` ratified option (i) and un-blocked AC-R1 in full.**
The fallback ships as a **three-part gate** (member request · unsuccessful OTP attempt · staff
attestation), with the terminology **mandated** as `primary_delivery_not_completed` and enforced by a
source-scan gate. ⛔ **Current state: ZERO open blocks — and the story is STILL NOT DONE.** AC-R1 and
AC-R2 are un-blocked but **UNBUILT**, and the release gate is **OPEN**. ⚠ One narrow **non-blocking**
question stays open: whether element 2 should also require `attempts = 0`. ⚠ **AC5's off-portal-build half is independent of Escalations 7 and 8**
and may land — it is the export **content** wiring and the schema bump that are blocked. State the split
explicitly; do not report AC5 as "done".
⚠ **Escalation 10 is different in kind from the other five blocks:** it blocks **AC-R3 only** and takes no
un-blocked AC away, so it changes none of the arithmetic above — but it **is a release-gate input**, so a
completion report must not read the gate as dischargeable while it is open.

⚠ **The standing Trustee Panel obligation queue stood at NINE after Story 10.20** (`deferred-work.md:168`).
State the new count by **enumeration**, not by arithmetic on that number, and state it as a count — not as
progress. ⚠ **Not all ten above are Panel obligations, and the breakdown is stated here so no one does
arithmetic on it:**
· **Panel (or Panel + Counsel):** 1, 2, 3, 5, 8, 9, 10 — **seven** — ⭐ **ALL SEVEN RULED 2026-08-14
  (Decision `2026-08-14-109`), four of them (3, 5, 8, 9) recorded `un-attested` because counsel is
  unengaged.** ⚠ They leave the standing queue as *ruled*, not as *withdrawn*; and the counsel
  re-presentation of those four is a NEW obligation, not a discharged one.
· **A named successor story, NOT the Panel:** 4, 6 — **two**
· **Ambiguous by construction:** 7 — its owner is *"a named successor story **or** this story re-scoped by
  ruling — the Panel/PO decides which"*, so it enters the queue only if the Panel takes it.
⛔ An earlier draft ended this note with *"do not add six"* — which was a leftover from the six-escalation
era and, worse, **six was then the correct Panel count**, so the instruction forbade the right answer.
⚠ The Panel count is now **seven** (Escalation 10); ⛔ do not read the move from six to seven as progress. ⛔ Do not
add any of these numbers to the standing NINE: state the new queue by **enumeration**, and state it as a
count, not as progress.

---

## Dev Notes

### The one-line summary of why this story is hard

Three of its four rights look like reuse and are not: **erasure** is blocked by a lifecycle guard that
predates the overlay model (Finding 1), **portability** reuses an assembler that returns empty arrays for
the member's whole contribution life (Finding 2), and **correction** has nothing to reuse at all
(Finding 3). Only **access** is close to a genuine reuse.

### Files being modified (read each fully before editing)

| File | Today | This story |
|---|---|---|
| `packages/domain/src/member/state.ts:117-120,155` | `rtbf_anonymized` legal only from `withdrawn`; no DELIBERATE block | **+7** `from` states (8 total), **+7** matrix rows (the `withdrawn` row already exists at `:155`); **+ the AC14 DELIBERATE block** |
| `packages/domain/tests/member/state.test.ts:118` | asserts `step('active', rtbf) === 'active'` | ⛔ **asserts the OPPOSITE of AC7** — must be rewritten, not deleted silently |
| `packages/domain/src/member/events.ts:89` | `RtbfAnonymizedPayloadSchema` frozen `.strict()` auditShape-only | + `helpdesk_ticket_id` (AC3) — ⚠ departs from a stated R1 rationale |
| `packages/contracts/src/data-export/data-export.ts:61-87,239` | `records: z.array(z.never())`, `_wired_by` literals, `schemaVersion: z.literal(1)` | ⛔ **blocks AC5 — see Escalation 7** |
| `apps/api/src/modules/rtbf/handlers.ts:113` | `from_state: 'withdrawn'` hardcoded | must carry the member's REAL replayed state (AC7) |
| `apps/api/src/modules/rtbf/handlers.ts:136-148` | an **INERT** 23505 catch (`MemberStreamConcurrencyError` has no `code`); loser appends a duplicate event | + `pg_advisory_xact_lock` on a namespaced `member.rtbf:` key; fix or delete the dead catch (AC13) |
| `apps/api/src/modules/data-export/handlers.ts` | ⚠ **no lifecycle guard at all — and reachable by an erased member for the token TTL** | `TERMINAL_STATES` + 409 `data_export.member_terminal` (AC12) — ⛔ this is the SHIPPED member path, not only the new one |
| `packages/domain/src/data-export/assemble.ts:378-379` | two `emptySection` placeholders | ⛔ **BLOCKED (Esc. 7+8)** — real reads + `EXPORT_SCHEMA_VERSION` 1→2. ✅ Un-blocked: the `:28` stale `rationale` name fix (Task 5) |
| `packages/domain/src/schema/data_exports.ts` | member-request-only; header claims FK-cascade RTBF | +3 provenance columns; stale cascade comment corrected |
| `packages/domain/src/member/anonymize.ts` | 8 tables; `data_exports` NOT among them | + zero `artifact_ciphertext` / `expired` flip (AC11) |
| `packages/domain/src/rbac/permissions.ts:446` | `PERMISSION_CATALOG_VERSION = 32` | → 33, +`member.data_rights` |
| `packages/domain/src/rbac/roles.ts` | 13 roles | **unchanged role set**; **one** bundle (`pariwar_admin`) gains the key — `super_admin` auto-derives from the catalog (`roles.ts:242`) |
| `apps/api/src/modules/rtbf/handlers.ts` | `assertAnonymizable` permits `{withdrawn}` | + the terminated-overlay arm |
| `docs/legal/niyamavali.md:192-218` | §8.4a row un-dispositioned | + the statutory-rights disposition |
| `apps/admin/src/modules/helpdesk/` | queue + detail + operator | + the data-rights subcategory & action |

⚠ **Line anchors were re-derived at `19fa644`. They drift.** Verify before trusting one; ⛔ never edit a
minted AC's anchors to chase them.

### Patterns to follow (and the ones that will bite)

- **Scope-tx discipline.** `requireMemberSession` / `requireAdminSession` do **not** open a scope tx.
  Admin fulfilment routes ride `scopeResolutionHook`'s `request.scopeTx`; the enqueue happens **after
  commit** so the worker sees the committed row, with compensation on enqueue failure
  (`data-export/handlers.ts` is the exemplar, including its 23505 re-read).
- **`withCompensatingAudit`, not `writeAuditEntry`** (ADR-0030) — `helpdesk/handlers.ts:240` is the shape.
- **PII discipline (R1).** Audit context carries `export_id` / `member_id` / `status` / byte size and
  **nothing else**. ⛔ Never a field value, never the ZIP, never a decrypted string. ⛔ **Do NOT rely on the `pii-scrape` CI gate — it is VACUOUS.** `packages/contracts/scripts/check-pii-scrape.ts:38-40`'s `loadSnapshots()` is `return [];`, and the file's own header says it is *"self-green by construction … the engine evaluates nothing → pass."* It catches **nothing** — contract leaks included — and stays inert until the live-render spec lands at Story 2.5/11a.2. ⚠ An earlier draft of this note claimed it *"will catch a contract leak but not a log line"*; that was false, and leaving it would have been the very defect AC13 orders fixed elsewhere (*"do not leave a comment claiming a protection that does not exist"*). ⛔ PII discipline here rests on review and the R1 rules above, not on a gate.
- **Fastify:** set body-independent headers **in the handler**, not an async `onSend`
  ([[project_fastify_onsend_doublesend]]).
- **Own-committing writers ⇒ assert membership, not counts** in live-DB tests
  ([[project_live_db_test_gotchas]]).
- **The type-only → value import trap** ([[project_type_only_import_cycle_trap]]): a `type`-only import
  promoted to a value import can materialize a module-init cycle that breaks *consuming* packages at
  runtime while typecheck, lint and the local suite stay green. Relevant here because domain, contracts and
  two apps all move.
- ⚠ **`helpdesk-state-invariant` IS in `ci.yml`** (line 567) — an older note in memory said otherwise. Both
  it and `member-state-invariant` run locally via `pnpm ci:local`.

### What "identity-verified" means here, concretely

The Story 6.3 anchor, unchanged: *"There is NO nominee handover-OTP on this path (unlike the member-app
flow) — operator authority + the verbal identity read-back is the trust anchor."*
(`claims.helpline.routes.ts:15`). `lookup_method` is **audit metadata, not a domain fact** — it rides the
audit context and never the event payload. Do not invent a verification primitive; do not weaken this one.

### Testing standards

- Live-DB integration specs under `apps/api/tests/integration/member-data-rights/`; suite-level
  `{ timeout: 20000 }` for DB-heavy suites. Test DB `twt-test-pg` on **:5433**.
- ⛔ Set `DATABASE_URL` for a single pass only — a globally-set `DATABASE_URL` runs integration specs
  **twice**, polluting count assertions ([[project_ci_local_double_run_pollution]]).
- Cross-tenant denial must be a **genuine** cross-tenant test (a second real Pariwar), not a same-tenant
  assertion wearing the name — the Story 1.19 review finding.
- Determinism/property suites are CPU-contention-sensitive; `--concurrency=4` is already set
  ([[project_ci_local_concurrency_oversubscription]]).

### Story key

`10-21-off-portal-dpdpa-access` · Epic 10 · `[SURFACE]` · release gate on enabling termination.

### References

- [Source: `_bmad-output/planning-artifacts/epics.md:4037-4056`] — Story 10.21, minted ACs
- [Source: `_bmad-output/planning-artifacts/sprint-change-proposal-2026-08-04.md:367-380,156,627`] — D5 req. 1; the release-gate framing
- [Source: `_bmad-output/planning-artifacts/prds/prd-TWT-2026-05-22/prd.md:1231-1244`] — FR-95 / FR-96 + the terminated-member carve-out
- [Source: `_bmad-output/planning-artifacts/architecture.md:1737-1760`] — §2.12 DPDPA control surfaces
- [Source: `docs/legal/niyamavali.md:186-218,295-301`] — §8.4, §8.4a, Part 10
- [Source: `_bmad-output/implementation-artifacts/deferred-work.md:4043-4100`] — the 10.19 record; the Q6 flip gate
- [Source: `_bmad-output/implementation-artifacts/moderation-model-decision-brief.md:358,791`] — D5
- [Source: `packages/domain/src/data-export/assemble.ts:27-45,378-379`] — the placeholders + the open question
- [Source: `packages/domain/tests/helpdesk/default-policy-hash.test.ts`] — the golden-hash fence
- Memory: [[project_moderation_model_correct_course]], [[project_moderation_record_model_substrate]],
  [[project_helpdesk_primitive_substrate]], [[project_helpdesk_operator_surface_103]],
  [[project_consent_subject_key_convention]], [[project_r7_fact_producer_unbuilt]],
  [[feedback_governance_commits_precede_implementation]], [[feedback_closure_language_precision]],
  [[feedback_supersede_never_reinterpret]], [[feedback_record_unattested_no_backfill]]

---

## Dev Agent Record

### Agent Model Used

claude-opus-5 (2026-08-14).

### Completion status — ⛔ UN-BLOCKED SCOPE ONLY. The release gate is OPEN.

⛔ **This story is NOT done, and must not be reported as done.** Sprint status is `in-progress`.
**Landed:** AC1–AC4, AC7–AC15, AC5's **off-portal-build half**, AC11's **`pending`/`ready`** arms.
**Held, nothing decided:** AC5's export-**content** half (Escalations 7 + 8), AC11's **`consumed`-status**
arm (Escalation 9), **AC-R1** (Escalation 1), **AC-R2** (Escalation 2), **AC-R3** (Escalation 10).
⛔ No escalation was answered and no decision id fills any AC-R placeholder.

### Debug Log References

### Debug Log References

### Completion Notes List

- **Governance committed FIRST, three entries, before any code** ([[feedback_governance_commits_precede_implementation]]): `2026-08-14-106` (pre-existing), **`2026-08-14-107`** (Escalation 10 / D10 raised), **`2026-08-14-108`** (the §8.4a disposition, landing LAST per §8.4a's own rule).
- **Escalation 10 was found by a focused routing trace, not by the spec.** `trustee_panel` IS a seeded role at a `pariwar` ceiling (so it *could* satisfy the check) but holds **no helpdesk capability at all**; `routed_to_role` is **inert** (written once, read only as an optional queue filter, consulted by no authorization path); and `validateRoutingPolicyRules` does **not** constrain `target_role` to the seeded catalog. Three adjacent sub-questions were recorded **CLOSED on evidence** rather than put to the Panel.
- **Two shipped defects closed, both pre-existing:** AC12 (an erased member could rebuild their dossier within their ~15-min token TTL — RTBF revokes no session and the enqueue route had no lifecycle check) and AC13 (the 23505 catch was **inert**; the real failure mode under READ COMMITTED was a **duplicate event**, now serialized by a namespaced `pg_advisory_xact_lock` on **both** callers).
- **Unnamed collateral, found by running the suite:** `tests/member/rtbf-anonymize.test.ts` asserted `anonymizeMember` touches exactly **8** tables. Now **9 tables / 10 statements** — rewritten to the new truth, not weakened. ⚠ The spec named `state.test.ts:118` as collateral but not this.
- **AC2's single-literal gate had a REAL false positive** — a substring scan matched the audit action `'member_data_rights.rtbf_fulfilled'` against the step-up context `'member_data_rights'` as a prefix, failing a *correct* implementation. Now quote-delimited, with a regression assertion. ⛔ A gate that cries wolf teaches the next reader to weaken it.
- **Revert-sanity verified on two gates** (both fail when the thing they protect is removed, then pass again): the single-literal scan (planted duplicate) and the two-connection race (lock removed).
- **Three DB-level mechanisms adopted rather than worked around** while writing tests: `events_log` is append-only and `members.state` is projector-only (both trigger-enforced, so fixtures drive the real `projectMemberState`), and cleanup uses the shipped `session_replication_role = 'replica'` idiom.
- **A fixture bug that mimicked a missing guard:** the first AC12 route test seeded a `members` row with the state set and got 200, because the guard replays the **event stream**. The guard was correct; the fixture was not. The helper now says so.
- ⚠ **AC10 baseline caveat, recorded openly** ([[feedback_record_unattested_no_backfill]]): the documented `DATABASE_URL=… pnpm ci:local` invocation returns **RED before any edit** — the DATABASE_URL-global double-run pollution plus a vitest `resolveId` starvation that kills `tsc` with zero TS errors. Both suspect specs were verified green in isolation. Verification therefore used `pnpm ci:local` (30/30, identical to the pre-edit baseline) **plus** a single-pass live-DB run.
- ⚠ **`docs/legal/` is gitignored**, so the §8.4a working-tree edit is untracked; `2026-08-14-108` reproduces the added bullet verbatim in both locales, which is the durable record.
- ⚠ **Migration `0033` was edited (comment-only)** as Task 6b orders. Drizzle applies by timestamp, not hash, so this is hash drift with no re-apply; `db:migrate` verified a clean no-op.

**Verified:** `pnpm ci:local` **30/30 green**; single-pass live-DB **@twt/domain 2771 passed / 241 files**, **@twt/api 956 passed / 115 files**, exit 0; `i18n:check`, `microcopy:test` 230/230 + `microcopy:check`, `member-state:test` 9/9 + `member-state:check`, `schema:test` 27/27, `domain-invariants:test` 7/7, `friction:test` 32/32.

### File List

**Domain** — `rbac/{permissions,roles}.ts`; `member/{events,state,anonymize,index}.ts`; **NEW** `member/rtbf-legality.ts`; `data-export/{assemble,store}.ts`; `schema/data_exports.ts`; **NEW** `migrations/0103_data-exports-off-portal.sql` + `migrations/meta/_journal.json`; `migrations/0033_data-exports.sql` (comment-only).
**Contracts** — **NEW** `member-data-rights/{member-data-rights,index}.ts`; `index.ts`.
**API** — **NEW** `modules/member-data-rights/{handlers,routes,index}.ts`; `modules/{rtbf,data-export}/handlers.ts`; `server.ts`.
**Admin** — `modules/helpdesk/{HelpdeskOperatorShell,HelpdeskDetailShell,HelpdeskDetailPage,i18n-en}.tsx|ts`; `api/{client,hooks}.ts`.
**Tests** — **NEW** `domain/tests/member/rtbf-payload.test.ts`, `domain/tests/integration/rls/data-exports-policy-regression.spec.ts`, `domain/tests/integration/member/rtbf-concurrency.spec.ts`, `contracts/tests/member-data-rights-single-literal.test.ts`; updated `domain/tests/member/{state,rtbf-anonymize}.test.ts`, `domain/tests/rbac/{permissions,roles}.test.ts`, `domain/tests/integration/member/rtbf-anonymize.spec.ts`, `api/tests/integration/data-export/data-export.spec.ts`.
**Governance** — `.decision-log.md` (`107`, `108`); `deferred-work.md`; `sprint-status.yaml`; `docs/legal/niyamavali{,.hi}.md` (untracked).

---

## Change Log

| Date | Change |
|---|---|
| 2026-08-13 | Story created at baseline `19fa644`; eight findings, ten ACs, five escalations. Status → ready-for-dev. |
| 2026-08-13 | ⚠ **Validation pass (`bmad-create-story validate 10.21`) at `19fa644` — one finding was factually wrong.** All other anchors re-verified against the tree and hold: the AC1 minted text is byte-identical to `epics.md`; Findings 1, 2, 3, 4, 6, 7 confirmed at their cited lines; the §8.4a "Statutory rights (DPDPA)" row is confirmed absent from the four dispositions; `PERMISSION_CATALOG_VERSION = 32`, `EXPORT_SCHEMA_VERSION = 1`, next migration `0103`, `data_exports` table-level GRANT at `0033:46`, `helpdesk-state-invariant` at `ci.yml:567`, the i18n key at `common.json:341` in both locales, and the `getCurrentMemberModerationOverlay` clock-domain rationale all verified. **Finding 5 reason 3 was wrong** — it claimed a newly-minted category is *unrouted* and that ticket creation *fails*. `resolveRoute` in fact has a Phase-2 fallthrough to the `other` catch-all (`routing.ts:108-111`), which `validateRoutingPolicyRules` **requires** of every published policy (`registry.ts:209-210`, present since Story 10.1's `f130468`). The real behaviour is a **silent mis-route to the generic `other` desk**, which is worse than the failure claimed. Reason 3 rewritten; the reject-a-new-category conclusion is unchanged and still stands on reasons 1 and 2, both re-verified. The correction also **strengthens AC2**: the `other` catch-all is validator-enforced, so `category: 'other'` + a free subcategory token is guaranteed to resolve for every Pariwar. `[[project_helpdesk_default_policy_version_trap]]` (the source of the error) and the sprint-status ledger entry corrected to match. |
| 2026-08-13 | ⚠ **Corrected a governance-sequence defect in the draft.** Two ACs pre-empted their own escalations: AC5's delivery arm asserted staff-mediated delivery *"is required as the fallback under either ruling"* and built it, and AC6 specified the correction disposition Escalation 2 exists to decide. Both would have let the implementation agent settle a PII-posture question and a release-gate-discharge question by writing code. Delivery and correction are now **AC-R1 / AC-R2**, blocked on a ratified `.decision-log.md` entry cited by decision id; AC5 keeps only the ruling-independent build + provenance columns; AC6 is deliberately empty and points at AC-R2; Escalation 1 is re-posed as three questions rather than a binary. Recorded: the flag being DEFAULT OFF and its flip gated on this story means **no member can be stranded while the rulings are taken**, so the correct sequence costs nothing. |
| 2026-08-14 | ⚠ **Adversarial spec review at `19fa644` — two CRITICAL and four HIGH findings applied.** **(C1)** AC7's accepted-state set was **wrong, not merely narrow**: `MEMBER_LIFECYCLE_STATES` has **nine** labels and `nextModerationStatus` (`status.ts:36-55`) carries **no lifecycle precondition at all**, so termination is legal from any state. Widening the reducer to `active | active-in-grace | lapsed-unpaid` would have left the phantom-anonymization hole open for `pending-kyc`, `pending-fee`, `pending-valid` and `lock-in` — reproducing, inside the fix, the defect Finding 1 exists to close. AC7 now accepts **every label but `anonymized`** (eight `from` states) and the set is **derived from the enum** by a totality test, so a tenth label fails the test instead of silently reopening the hole. **(C2, new Finding 9 + new AC11 + new Escalation 6)** `anonymizeMember` does **not** touch `data_exports`, whose `artifact_ciphertext` is the member's whole dossier as a Tier-1 envelope. The mechanism 3.11 documented for exactly this — `ON DELETE CASCADE` on the member FK (`0033:40`, `schema/data_exports.ts:19`) — **has never fired**, because 3.12 shipped RTBF as a *soft* delete that retains the `members` row. Residual protection is a **TTL, not an erasure**: the vacuum zeroes only `consumed`/`expired` rows, hourly, against a 24h window ⇒ ~25h of full decryptable retention *after* erasure. AC5 makes this the **normal** path (build the artifact, leave it undelivered pending AC-R1), and AC7's sentinel-sweep test is **structurally blind** to it. AC11 zeroes the artifact in the erasure tx; Escalation 6 owns the wider inert-cascade class (owner: a named successor story, **not** an epic). **(H1)** AC8 required the §8.4a disposition in the *first* governance commit — mandating the "disclosure ahead of its mechanism" defect §8.4a's own rule names. Split into two governance commits: decisions first, the disposition **last**. **(H2)** The banner said "AC1–AC4" where the ruling-gated section said "AC1–AC5"; AC5 restored. **(H3)** The banner **answered Escalation 2** ("the gate is discharged only when the two RULING-GATED ACs have landed") — the exact pre-emption the 2026-08-13 entry removed from AC5/AC6 and left standing here; the banner now defers to the ruling. **(H4)** AC4's "byte-identical" is **not constructible** — the artifact is an envelope ciphertext, so two encryptions of identical plaintext differ by design and the AC would fail on a *correct* implementation; restated at the assembled-plaintext level with `generated_at` excluded by name. Findings 8→9, escalations 5→6, ACs 10→11 (+ AC-R1/AC-R2); no existing AC renumbered. |
| 2026-08-14 | **Adversarial spec review — MEDIUM + LOW findings applied.** **(M1)** Task 2 told the dev agent to "register the `data_rights` step-up context" — **there is no registry**: `requireStepUp(deps, actionContext: string)` (`gate.ts:16`) compares a bare string and the contract is `z.string().min(1).max(128)` with no allow-list. AC3 now says so explicitly and pins the context to a shared `DATA_RIGHTS_STEP_UP_CONTEXT` constant — the discipline AC2 already imposed on the subcategory token, omitted here despite the identical failure mode (a typo in the OTP-request path yields an elevation that can never satisfy the gate). **(M2)** Escalation 5 declared the statutory response horizon legally unverified, then AC2 silently routed every request onto `other`'s 24h/5-business-day SLA (`registry.ts:62`) with nothing blocking. Now stated as *carried knowingly, pending the ruling*, with the per-Pariwar override named as the zero-code fix. **(M3)** Escalation 3 asks what the export must **contain**, which makes `EXPORT_SCHEMA_VERSION` v2 provisional; AC5 no longer presents v2 as settled. **(M4)** The three new `data_exports` columns had **no DB-level backstop**: `requested_via` now carries a CHECK and `helpdesk_ticket_id` an FK — ⚠ deliberately *unlike* the app-layer-enum posture of `status`/`failed_reason`, because `requested_via` gates a PII-disclosure path rather than a display value. And `data_exports` has **no policy-regression spec** while 23 tables under `tests/integration/rls/` do — one is now required, asserting RLS/FK/CHECK at the migration level, plus a genuine cross-Pariwar write-policy refusal that AC4's route-level test cannot witness. **(M5)** Fulfilment provenance rode the **audit row only**; `helpdesk_ticket_id` now also rides the `member.rtbf_anonymized` payload, restoring the two-authority rule the story endorses in Dev Notes — material because AC7 legalises that event from eight `from` states instead of one. **(M6)** AC2's *"never a repeated string literal"* was an un-mechanized convention guarding a failure mode Finding 5 proves is **silent** (the `other` catch-all matches anything, so a typo routes cleanly); now a test asserts the literal lives in exactly one module. **(L1)** Task 0's decision-log scope updated to nine findings / six escalations and now explicitly includes the AC-R split. **(L2)** AC3 said the key is *"granted to `pariwar_admin` + `super_admin`"* — **`super_admin` auto-derives** and is never written into a grant list (`roles.ts:127,132,139,146`); the explicit entry is removed and `district_admin`'s exclusion is recorded as the already-ruled containment result, not an oversight. |
| 2026-08-14 | ⚠ **Independent cold-context validation pass — 10 BLOCKING issues found, all mechanical ones fixed, two raised as escalations.** The validator re-derived ~66 claims from the tree: the substantive facts held (Findings 1–9 all verified true at `19fa644`), but **four ACs were not constructible and three Tasks contradicted the ACs above them.** **Propagation failures (B1–B3):** the prior pass edited AC2/AC3/AC7 but left Task 2 still ordering *"grant to `pariwar_admin` + `super_admin`"* and *"register the `data_rights` step-up context"* — both forbidden by AC3 with a ⛔ — Task 3 still ordering the AC6 contract shape (AC6 is empty; its content is the BLOCKED AC-R2), and the Dev Notes table still prescribing the *"+3 `from` states"* widening the same change log calls *"wrong, not merely narrow"*. The Tasks list is what a dev agent works from; ACs alone are not the document. **Non-constructible ACs:** AC4's fix went one level down but not to the bottom — the field is `generatedAt` not `generated_at`, and `exportId` differs between builds and is a **row identity**, not a generation-time value, so `manifest.json` is now excluded wholesale (B7). AC2's single-literal gate failed on itself, since a source-scan test must contain its own needle (B6). **Unnamed collateral (G1, G3–G6, G12):** AC5's schema bump breaks `ManifestSection.schemaVersion: z.literal(1)` which the job parses on every build; AC5 and AC7 each break shipped assertions the story never named (`data-export.spec.ts:133,138,150`; `state.test.ts:118`, which asserts the **exact opposite** of AC7); AC3's event provenance widens `RtbfAnonymizedPayloadSchema` — a frozen `.strict()` auditShape-only contract with an explicit R1 rationale and a pinning test at `withdrawal.test.ts:92`; and `permissions.test.ts:54,56` pins both numbers AC3 moves. **AC7's own footgun (G6):** `rtbf/handlers.ts:113` hardcodes `from_state: 'withdrawn'`, so the moment Task 6's guard admits a terminated `active` member the event asserts a **false audit record** — on the one event AC7 makes more ambiguous. Now required to read the real replayed state. **Added:** AC3 idempotency + `users.display_name` attribution (G9, G13), AC5's `one_pending_per_member` 23505 collision rule (G11), AC11's `pending`-case mechanism — the status flip is what stops an in-flight build from **resurrecting the dossier after erasure commits**, and a test that merely asserts a pending row's ciphertext is NULL passes vacuously (G10). Re-triggers added to Escalations 2, 3, 5 (B8). **Citation corrected:** the banner cited `097` clause 6, whose literal text (*"the flip is authorised once Story 10.21 lands"*, `.decision-log.md:837`) reads the **opposite** way; the stricter posture is `097` clause 12 bullet 4 (`:964`) and `098` clause 2 (`:753`). Six stale line anchors corrected. **AC preamble was false:** only AC1 is minted verbatim, not AC1–AC4 (B4). |
| 2026-08-14 | ⛔ **Escalations 7 and 8 raised — BLOCKING, and no substantive decision taken on either.** **(7)** The export section contracts *structurally forbid* the records AC5 must write: `records: z.array(z.never())` plus `_status: z.literal('no_source_system_at_this_epic')` (`contracts/data-export/data-export.ts:61-87`), contract-validated by the job on every build. AC5's *"wired to real reads"* is impossible without replacing both section contracts — and the record **shapes were never specified**, which is a data-contract decision with PII consequences, not an improvisation. **(8)** `claim_history.json` has **no subject predicate**. Claims are about a *deceased* member; the requesting member appears in at least six roles across seven tables, and AC5's *"non-empty records"* assertion is satisfied by any join — including ones exporting **another member's** identity, nominee bank details or medical disclosure into a decrypted ZIP that AC-R1 may hand to a staff actor. ⚠ FR-95 never names claim history (`prd.md:1233`), so its scope is unspecified from every direction. ⛔ Per the standing rule that a story does not settle a governance question by writing code, **neither is decided here.** AC5's export-content half and Task 5's wiring are now marked BLOCKED; AC5's provenance-column half (migration, three columns, CHECK, FK, policy-regression spec) is independent and remains shippable. Un-blocked scope is now **AC1–AC4, AC7–AC11 + AC5's provenance half**, with four open blocks (Escalations 1, 2, 7, 8). |
| 2026-08-14 | ⚠ **Second cold validation — three BLOCKING propagation defects fixed, plus five cheap ones.** The validator confirmed the factual base (all nine Findings, every governance citation including the `097` clause-6-vs-clause-12 split) and confirmed the story decides nothing it declares open — but found the **same failure mode for the third consecutive pass: the ACs were corrected and the Tasks list was not.** **(C-1)** The Escalation 7/8 block never propagated: `In scope, un-blocked — build this now` still advertised the wiring, Finding 2's in-scope line was unqualified, and Task 9 ordered both the AC5 non-empty assertions and the `data-export.spec.ts` rewrites with no ⛔ while Task 5 carried one. All four sites now marked BLOCKED. **(C-3)** AC3 and Task 9 told the dev agent to *"update"* `withdrawal.test.ts:92` as the frozen-payload pin — but that describe block exercises **only** `WithdrawalCompletedPayloadSchema` / `WithdrawalRequestedPayloadSchema`, schemas this story does not widen, and `grep RtbfAnonymizedPayloadSchema` returns three hits **all in source** (`events.ts:89`, `:344`, `packages/events/src/registry.ts:104`). The instruction was inexecutable AND pointed at the wrong `.strict()` contract to relax. Now: **author a new pinning test**, ⛔ do not edit the withdrawal test — plus the newly-noted `@twt/events` blast radius via the registry binding. **(C-5)** Task 9 still said `generated_at` excluded, contradicting AC4's `generatedAt` + `manifest.json`-excluded-wholesale; a test built from Task 9 would fail a correct implementation — the third recurrence of that specific defect. **Also fixed:** `"hold AC5 entirely"` contradicted its own next sentence (C-2); `"not all six above"` → eight (C-4); three stale anchors introduced by the prior correction pass (`data-export.spec.ts:133→134`, `:138→139`, `data-export.ts:174-180→165-179`); Task 3's header still read `(AC2/AC5/AC6)`; AC1's preamble said four Given/Then blocks where `epics.md` has three plus a release-gate line. **Added (C-6):** `roles.test.ts` holder assertion — every catalog key carries one and the story had never named the file. |
| 2026-08-14 | ⭐ **TASKS LIST REBUILT FROM THE ACs — method change, not another patch.** Four consecutive passes had fixed ACs and left the Tasks list drifting, so the list was regenerated by walking AC1→AC11 + AC-R1/AC-R2, enumerating every artifact each AC requires, and assigning each one a checkbox. A **coverage matrix** now heads the section (AC → required artifacts → task numbers) as a mechanical audit surface. **Three requirements had NO task at all**, each named in an AC and in the Dev Notes table but ordered by nothing: **(A2)** the `RtbfAnonymizedPayloadSchema` widening AC3 requires (`member/events.ts:89`) — now **Task 3b**, new; **(A3)** the `rtbf/handlers.ts:113` `from_state` fix AC7 calls a *"false audit record"* — now in Task 6; **(A4)** the `docs/legal/niyamavali.md` §8.4a disposition AC8 requires — now in Task 10, which previously listed only `ci:local`, `deferred-work.md` and the Dev Agent Record. **(C1, carried as an OPEN QUESTION, not decided):** AC3's *"five-field payload **exactly** … never relaxed"* has not been reconciled with the member self-service path, which emits **four** fields (`rtbf/handlers.ts:112-117`) through `project.ts:78`'s parse-before-insert. Making the field required would silently break every member RTBF at runtime in a `.strict()` schema also bound into `@twt/events`. Task 3b states this as a hard blocker on that subtask with the evidence, and ⛔ forbids resolving it by `.passthrough()` or a permissive test — the call itself is escalated, not taken. **(A5/A6) Root cause fixed, not just the symptom:** "AC5's shippable half" had been re-enumerated in **five** places and all five omitted the `DATA_EXPORT_BUILD` enqueue route that Task 7a orders. There is now **one** canonical definition in AC5 — renamed the **"off-portal-build half"** — and the other four sites reference it. ⛔ Re-enumerating it anywhere is now explicitly forbidden. **Also:** the `assemble.ts` Dev Notes row now carries ⛔ BLOCKED matching its sibling contracts row (A1); Finding 6's stale-`rationale_ciphertext` correction was orphaned inside blocked Task 5 and now has an explicit un-blocked home; Task 2's *"every catalog key carries a holder assertion"* was **false** (21 assertions, not 42) and cited `:389`, a comment — corrected to 21 and `:392`; Story 6.17's *"keys stays at 41"* scope note (`permissions.ts:441-442`) is now explicitly **superseded** rather than silently overwritten; actor-boundary denial tests added to Task 9 as a load-bearing-invariant family-3 obligation **no AC states**. |
| 2026-08-14 | ⚠ **Third cold validation — seven mechanical defects fixed, one new BLOCKING question escalated as Escalation 9.** The validator confirmed the Tasks rebuild **worked**: the orphan class that recurred for four passes is gone (no AC requirement unordered, all task cross-references resolve, every Dev Notes row has a task and both blocked rows are marked), and the five divergent "off-portal-build half" enumerations have genuinely collapsed to one canonical definition. Of ~60 citations re-derived, only two anchors were wrong. **Fixed: (D-1)** the stale-`rationale_ciphertext` anchor was `assemble.ts:26` in **three** places — the correct line is **`:28`** (`:26` is a bare `//`). This guarded the one un-blocked artifact Finding 6 requires "either way", the very thing Task 5 was restructured to stop losing. **(D-2)** the *"not all eight above are Panel obligations … do not add six"* note was unexecutable: stale from the six-escalation era, and **six is the correct Panel count**, so it forbade the right answer — replaced with an explicit per-escalation breakdown (Panel: 1, 2, 3, 5, 8, 9; successor story: 4, 6; ambiguous by construction: 7). **(D-4)** `roles.ts:243` → **`:242`** (`:243` is `scopeCeiling`), in Task 2 and the Dev Notes table. **(D-5)** `data_exports-policy-regression.spec.ts` → **hyphens**; all 23 existing specs use `<table>-policy-regression.spec.ts` and none use underscores. **(D-6)** the coverage matrix's AC5 row re-enumerated the "off-portal-build half" — the exact construct the definition forbids — now a reference. **(D-7)** `data-export.ts:75` is the `SECTION_SCHEMAS` **binding**; the `.parse()` call is at **`:143`**. **(D-8)** a "verbatim" quote had capitalised `TERMINATED` where the source reads lowercase. **NEW — Escalation 9 (D-3), raised not decided:** AC11 required **every** `data_exports` row to flip to `expired` while simultaneously promising the metadata row is retained *"so the audit trail survives"*. Those conflict on exactly one status: flipping a **`consumed`** row erases the record that the member **actually downloaded their export** — a completed statutory-access fulfilment. `pending` (load-bearing: it stops an in-flight build resurrecting the dossier) and `ready` are settled and ship. The **zeroing** applies to `consumed` too (the vacuum already does it); only the **status change** is contested. That is a retention question owed to the Panel, so AC11 now carves it out, Task 6b is marked BLOCKED on that arm alone, and the dev agent is ⛔ forbidden from resolving it. Un-blocked scope: **AC1–AC4, AC7–AC11 (minus AC11's `consumed` status arm) + AC5's off-portal-build half**, with **five** open blocks (1, 2, 7, 8, 9). ⚠ **Coverage gap in this validation, recorded openly:** the validator did **not** read `_bmad/custom/load-bearing-invariant-checklist.md`, so its family-level GAP analysis is **UN-ATTESTED** ([[feedback_record_unattested_no_backfill]]). This diff adds two privileged mutation routes, widens a frozen event contract, adds an RLS surface and adds a Tier-1 write path — families 2, 3, 4 and 5 are plausibly implicated and have **not** been assessed by anyone. |
| 2026-08-14 | ⭐ **Load-bearing-invariant checklist run against the story — 4 REAL GAPs found, all four given ACs (AC12–AC15).** The previous validation pass had explicitly NOT run this lens and recorded the omission as un-attested; this closes it. Nine of ten families are touched (7, aggregate correctness, is not — no workload or count aggregates). **AC12 `[family 1]` — the highest-value finding: a previously UNREACHABLE gap that this story makes REACHABLE.** `assertAnonymizable` (`rtbf/handlers.ts:70-81`) is the **only** terminal guard in the system and it sits on the erasure route; `data-export/handlers.ts` has **no lifecycle check whatsoever** and `assemble.ts:148-149` reads `members` by id regardless of state. That was self-guarding only because an `anonymized` member cannot hold a session — and AC5's off-portal enqueue route **removes the session requirement**. Nothing stopped a fresh dossier row being created for a member AC11 had just erased, re-opening the artifact class AC11 exists to close. The blast radius is bounded (sentinels, not live PII), which is exactly why it would have survived review. **AC13 `[family 2]`** — `Idempotency-Key` dedupes same-key retries and AC11's race test covers worker-vs-erasure, but a **true two-connection** erasure race was unproven: two requests with different keys, both admitted before either commits, both reach `anonymizeMember`, and `assertAnonymizable` reads state *before* the write. Now requires a pg advisory lock on `member_id` in **both** callers and a live two-connection proof — with an explicit ⛔ that a sequential double-call is not a race and passes vacuously. **AC14 `[family 9]`** — AC7 relocates erasure legality from the reducer to the callers and widens the arm from one accepted `from` state to eight; that is justified at length **in the story and nowhere in the code**. Now requires a DELIBERATE doc block on the arm naming both callers, why the reducer must not read the overlay, and a re-examination trigger. **AC15 `[family 5]`** — the checklist names partial-uniques explicitly; AC5's typed-409 rule is behaviourally dependent on `data_exports_one_pending_per_member` (`0033:61`) and nothing in the tree asserts it. Pre-existing ≠ covered when a story makes it load-bearing. **Families verified adequately covered:** 3 (cross-Pariwar covered twice — route-level and policy-level; ⚠ actor-boundary denial is covered by a Task 9 test with **no AC behind it**, self-declared and structurally weak), 4, 6 (its core concern **is** Escalation 8 — correctly escalated rather than faked), 8, and 10, which is the strongest family in the document. **Propagated in the same pass** (the failure mode of four earlier passes): 4 coverage-matrix rows, task assignments in Tasks 6/7a/9, two Dev Notes rows, and all six AC-range sites (`AC7–AC11` → `AC7–AC15`, `AC2–AC11` → `AC2–AC15`, the AC-R pointer `after AC10`/`after AC11` → `after AC15`). |
| 2026-08-14 | ⚠ **Cold validation of AC12–AC15 — two of the four rested on FALSE premises about the tree; all seven fixes applied.** The four *gaps* were all real and none invented, but the writing carried the predicted error rate. **AC12 premise (a) WRONG:** `assertAnonymizable` is **not** the only terminal guard — **five** `TERMINAL_STATES` guards ship today (`nominee.handlers.ts:40`, `member-terms:39`, `medical:62`, `vyawastha-shulk:43`, `life-events:42`), each returning 409 `<module>.member_terminal`, and `termination-block-seam.ts:113` names them as a family. AC12 had invented a code shape instead of following the convention. **AC12 premise (b/d) WRONG, and the gap is WORSE than the AC claimed:** an `anonymized` member **can** hold a live session — `requireMemberSession` (`member-session-guard.ts:27-45`) is a **stateless JWT verify** with no DB read, the access TTL is **15 minutes** (`config.ts:377`), `anonymizeMember` revokes **nothing**, and `POST /api/v1/member/data-export` is **session-only** (step-up gates the download, `routes.ts:32-41`). So the member self-service enqueue path is reachable by an erased member **today** — this is a **shipped defect**, not one this story introduces, and AC12 had scoped its guard to the off-portal caller *because of* the false premise while writing that false reason into the AC. AC12 now guards **BOTH** callers via the shipped convention, and the wider residual (*"RTBF must revoke live member sessions"* — an erased member reaches **any** session-only route for the TTL) is recorded in `deferred-work.md` with a named successor story, ⛔ not absorbed. The story's own gap table also mis-stated the POST route as step-up-gated; corrected. **AC13 — a live instruction to weaken shipped behaviour (the C1 class, committed inside the warning against it):** *"N−1 idempotent no-ops"* contradicts `rtbf.spec.ts:203-212`, which asserts the 409 `rtbf.already_anonymized` that AC12 two ACs earlier calls the correct shape. Restated as *one write, one event, losers rejected with the existing 409*. **AC13 also missed an inert backstop it supersedes:** `rtbf/handlers.ts:136-148` catches `err.code === '23505'`, but `projectMemberState` throws `MemberStreamConcurrencyError`, which has **no `code`** (`errors.ts:107-118`) — the branch never matches; and under READ COMMITTED (`scope-tx.ts:37`, bare `BEGIN`) the loser typically appends a **duplicate event** and returns 200 rather than colliding. Now named, with an order to fix or delete the dead catch. **AC13 under-specified the lock:** convention is `pg_advisory_xact_lock` with a namespace-prefixed key (`appeal-persist.ts:126-131`); a bare `hashtext(member_id)` collides with `member-auth.service.ts:54`'s device-binding lock, and the one session-scoped precedent leaks the lock if copied onto a pooled client. **AC13's test could pass vacuously** — two `app.inject` calls serialize by chance; now requires a forced interleave and an own-committing **domain** spec per `appeal-concurrency.spec.ts:26`. **AC15's negative case pinned the key column, not the predicate** — a plain `UNIQUE (member_id)` passed both assertions; replaced with the `ready`/`consumed`/`expired`-coexists case per `member-moderation-grounds-policy-regression.spec.ts:262`, split into two `it()` blocks (one `it()` hits `25P02` after the 23505 aborts the harness tx). **AC14 sound in full**, now citing its exemplar (`shepherd-fallback-resolver.ts:14-25`) and honestly labelled `[family 9, by analogy]` — a reducer widening is not a tenant/role bypass, and the AC says so rather than dressing up the fit. ⭐ **The propagation pass landed completely on the first attempt** — the validator confirmed all 4 matrix rows, Tasks 6/7a/9, 2 Dev Notes rows and all 6 AC-range sites, with no orphaned requirement. First time in this story's history. |
| 2026-08-14 | ⭐ **DECISION — `helpdesk_ticket_id` is OPTIONAL on `RtbfAnonymizedPayloadSchema`. Task 3b is UN-BLOCKED**, and with it the last non-governance blocker on the story's un-blocked scope. **Rationale:** the member self-service path emits a **four**-field payload (`rtbf/handlers.ts:112-117`) and `member/project.ts:78` parses before insert, so a **required** fifth field would break every member RTBF at runtime — in a `.strict()` schema also bound into `@twt/events` (`registry.ts:104`), with AC7 routing *more* traffic through that append. ⚠ **The shape turns out not to be novel at all:** `KycCompletedPayloadSchema` (`member/events.ts:41-43`) is already `z.object({ ...auditShape, kyc_reference: z.string().min(1).optional() }).strict()` — an `auditShape` extension carrying an optional field, in the **same module, twenty lines above** the schema being changed. The AC now follows that precedent explicitly rather than treating the widening as unprecedented. ⛔ `.strict()` is retained and `.passthrough()` is forbidden — strictness, not requiredness, is what carries the "no free text / no cleared PII" R1 guarantee. ⚠ **The consequence, and the reason this is not merely a one-word edit:** optionality moves the provenance guarantee **out of the schema and into the caller**. An off-portal erasure that omits the ticket id now validates **cleanly** and becomes indistinguishable from a member self-service one — silently destroying the exact replay-distinguishability AC3 added the field to create. So the **off-portal fulfilment handler requires it and fails closed without it** (Task 7a), the same caller-side-precondition shape AC7 uses for erasure legality and AC12 for the terminal guard, and the pinning test now asserts **BOTH** shapes exactly — the 4-field member payload and the 5-field off-portal payload — plus a route-level assertion that the off-portal path rejects an erasure with no ticket id. ⛔ Asserting one shape only would let the other regress unnoticed. Propagated to AC3, Task 3b, Task 7a, Task 9 and the coverage matrix's AC3 row in the same pass. |
| 2026-08-14 | ⚠ **Final pre-dev verification pass — F1 and F2 applied; no other AC change.** The pass ran `_bmad/custom/load-bearing-invariant-checklist.md` (⚠ the requested `lklist.md` does not exist — the only checklist in that directory was used, flagged not silently substituted) and a cold validation. **F1 (MEDIUM) — the off-portal event's `actor` and `trigger` were unspecified**, while the exemplar the dev agent is sent to copy hardcodes `actor: 'member'` / `trigger: 'rtbf_request'` (`rtbf/handlers.ts:112-117`). Copied verbatim that writes a **false actor attribution** on the very event AC7 is making more ambiguous — the identical defect AC7 catches for `from_state`, one field over. Now pinned to **`actor: 'trustee'`** (`memberActorSchema` = `z.enum(['member','system','trustee'])`, `audit-shape.ts:19`; `trustee` is the shipped staff-initiated value at `claims.cycle-freeze.handlers.ts:255,345` and `claims.appeal.handlers.ts:365,398,441,495`; `pariwar_admin` is Trustee-Lite per `roles.ts:104,108,113`) and **`trigger: 'admin_off_portal_rtbf'`** (following the shipped `admin_`-prefix convention: `admin_schedule_/reschedule_/complete_ground_inspection`). ⚠ Also records the consequence: **`actor` is what already distinguishes operator from member** — `helpdesk_ticket_id` adds *which request*, not *who acted* — so AC3's original rationale was mildly over-claimed. Propagated to AC3, Task 7a and Task 9 in the same pass. **F2 (MEDIUM)** — the coverage matrix's AC3 row pointed at `2, 3b, 7a, 9` while **Task 3** declares `DATA_RIGHTS_STEP_UP_CONTEXT` and **Task 8** requires both admin surfaces to import it; the artifacts were ordered, only the audit pointer was incomplete. Now `2, 3, 3b, 7a, 8, 9`. ⚠ **Reported and NOT actioned, per instruction** — none blocking, none contradicting an AC or task: **F3** Dev Notes claims the `pii-scrape` CI gate catches contract leaks; it is vacuous by construction (`check-pii-scrape.ts:34-40`, `loadSnapshots()` returns `[]`) — the same shape as the inert 23505 catch AC13 orders fixed. **F5** the new `helpdesk_ticket_id` FK is tenancy-blind (PostgreSQL RI bypasses RLS), a provenance-integrity hole not an access hole, bounded by AC4's provenance-only linkage. **F6** the `other` rule routes to `helpline_operator`, whom AC3 explicitly denies `member.data_rights` — the SLA half is dispositioned "carried knowingly", the role half is described in Finding 5 and dispositioned nowhere. **F8** the `23505` guidance is one-sided (`err.cause.code`) where the domain convention checks both direct and cause. Plus five ±1 anchor drifts, none misleading. ⚠ **Label correction (family 10 honesty):** the optional actor-boundary arm was labelled "covered by construction"; the accurate label is **not constructible in this system** — there is no machine-auth ingress to the admin surface, so no system actor can hold a session to be denied. The disposition is unaffected. |
| 2026-08-14 | ⚠ **Final cold re-validation — verdict READY FOR DEV (un-blocked scope). F1/F2 confirmed correct and fully propagated; one NEW contradiction found and fixed.** F1's values verified against the tree: `memberActorSchema` has **no `operator`** label (`audit-shape.ts:19`), so `'trustee'` is the only staff value; `trigger` is `z.string().min(1)` (`:39`) so the token cannot fail validation; `actor: 'trustee'` passes the write-time parse; and **no consumer keys on `payload.actor` or `payload.trigger`** for member events, so nothing breaks. All three F1 sites (AC3, Task 7a, Task 9) pin both values and forbid copying the member exemplar — a grep for `actor: 'member'` / `rtbf_request` returns only those sites, always as the thing *not* to copy. F2's six task pointers all verified to order a real AC3 artifact, with none ordered by an unlisted task. **NEW, and fixed because it contradicts an AC/task:** the banner and the ruling-gated precondition both said landing **AC7–AC15** delivers the un-blocked scope, carving out only AC5's content half — while AC11's own heading, Task 6b and Escalation 9 all mark AC11's **`consumed`-status arm** BLOCKED. Two of four scope statements over-claimed; the escalation trailer already had it right. Both now carry the carve-out. ⚠ Low risk of wrong *code* (AC11 and Task 6b are ⛔-marked) but a real risk of a wrong **completion report** — the same class F2 fixed for the matrix. Also corrected: the Dev Notes table still said the stale-`rationale` fix is at `assemble.ts:26` where Task 5 correctly says **`:28`**. **Confirmed:** 17 AC headings ↔ 17 matrix rows, identical set and order; every AC requirement has a task; Escalations 1, 2, 7, 8, 9 unresolved with no decision id anywhere and AC-R1/AC-R2 still unfilled placeholders; the release gate is unambiguously **OPEN**. **Triaged NON-BLOCKING, reported not actioned:** F3 (`pii-scrape` vacuous — `check-pii-scrape.ts:38-40` returns `[]`; no AC depends on it, but it is a false protection claim in a Tier-1 PII story, the same shape AC13 orders fixed elsewhere), F5 (FK tenancy-blind; a composite-FK precedent exists at `0084:101-102` — adopting it is a design choice, not a correction), F6 (`other` routes to `helpline_operator` who cannot fulfil, but `pariwar_admin` holds `helpdesk.respond` at `roles.ts:327` and can; an SLA-clock gap, not an AC contradiction), F8 (one-sided `23505` guidance, self-correcting because AC5/Task 9 order a live collision test), and six ±1 anchor drifts, none load-bearing. ⚠ **Two precision items reported and NOT actioned per instruction:** AC3's `admin_`-prefix justification says the convention is for *"admin-initiated member events"* — the three cited triggers (`ground-inspection-persist.ts:447,581,766`) ride **`claim.*`** events, and the member family uses a dotted namespace instead (`member_moderation.${action}`, `moderation/write.ts:314`); the *value* is unaffected but the stated convention does not exist in the family named. And the stronger in-family `actor: 'trustee'` precedent (`moderation/write.ts:315`, `grounds.ts:245`) is uncited. ⚠ **Method caveat recorded:** the story file is untracked, so "nothing else changed" is verified by internal consistency and tree-grounding, not by a diff. |
| 2026-08-14 | ⚠ **Two precision fixes — and the first one turned out to require changing the VALUE, not just the justification.** **(1) AC3's trigger token.** The justification claimed an `admin_`-prefix convention *"for admin-initiated member events"*. Verified false: all three `admin_`-prefixed triggers live in `claim/ground-inspection-persist.ts:447,581,766` and ride **`claim.*`** events. The **member** family's convention for staff-initiated acts is a **dotted namespace** — `member_moderation.${action}` (`moderation/write.ts:314`) and `'member_moderation.ground_appended'` (`grounds.ts:245`). Since the token had been chosen *from* the wrong family's convention, correcting only the prose would have left the value stranded behind a justification that no longer supported it. Token changed **`admin_off_portal_rtbf` → `member_data_rights.rtbf_fulfilled`**, propagated to AC3, Task 7a and Task 9; the superseded token is retained in AC3 only as the ⛔ do-not-use note. ⚠ Zero risk: `trigger` is `z.string().min(1)` (`audit-shape.ts:39`) and no consumer keys on it. The `actor: 'trustee'` justification now cites the **in-family** precedent (`member/moderation/write.ts:315`, `grounds.ts:245` — both on `member.*` events) rather than the cross-enum `claim.*` handlers, whose `claimActorSchema` (`claim/events.ts:36`) also offers an `operator` label the member enum does not have. Value unchanged and still correct. **(2) The `pii-scrape` claim.** Dev Notes asserted the gate *"will catch a contract leak but not a log line"* — false: `check-pii-scrape.ts:38-40`'s `loadSnapshots()` returns `[]` and the file's own header calls it *"self-green by construction … the engine evaluates nothing → pass."* It catches nothing and stays inert until Story 2.5/11a.2. Replaced with an explicit ⛔ that the gate is vacuous and that PII discipline rests on review and the R1 rules, not on a gate. ⚠ This was the same defect AC13 orders the dev agent to fix in the codebase (*"do not leave a comment claiming a protection that does not exist"*) — the story had been applying that rule outward and exempting itself. ⚠ **Self-caught during application:** the first edit left the false clause dangling as an orphaned tail after the replacement; removed. Post-fix state re-confirmed mechanically: 17 ACs ↔ 17 matrix rows, four scope statements carrying the AC11 `consumed` carve-out, zero decision ids answering any escalation, release gate **OPEN**. |
| 2026-08-14 | ⛔ **Escalation 10 / D10 raised — the trustee-authority recipient. BLOCKING for AC-R3; a release-gate input; NO substantive decision taken.** A focused routing trace at `b860523` asked where an off-portal DPDPA request goes operationally when the requested action requires **Trustee** authority. **Three things the existing model DOES answer, evidenced and recorded so the Panel is not asked a settled question:** (i) *“Trustee” is not `state_trustee`* — §8.7's ratified text says so outright (*“The Trustee Panel is **not** the ‘State Trustee panel’ of Part 9”*, Decision `2026-08-10-096` clause 9), and it is structurally impossible besides: `state_trustee` (`roles.ts:362-369`) sits at `scopeCeiling: 'state'`, holds neither `helpdesk.respond` nor `helpdesk.create`, and `scopeWithinCeiling` (`rbac/scope.ts:113-118`) is a pure numeric compare with **no resolver parameter**, so `pariwar:1 >= state:2` is false under every resolver. (ii) *The Helpdesk Operator may intake/verify/route but not execute* — AC3 already rules `member.data_rights` → `pariwar_admin` **only**, ⛔ not `helpline_operator`; that half is **CLOSED** and is explicitly **not** re-opened ([[feedback_closure_language_precision]]). (iii) *The routing mechanism needs no change* — per-Pariwar versioned overrides plus a free-token `sub_category` already express any destination. **What it does NOT answer, and why a new escalation is genuinely owed rather than a redundant one:** the Trustee Panel has **governance authority and no operational queue.** `trustee_panel` **is** a real seeded role (13th bundle, `roles.ts:583-627`, `scopeCeiling: 'pariwar'` — so unlike `state_trustee` it *could* satisfy a pariwar check), but its permissions are exactly `member.moderate` + `member.restore_terminated`: it cannot see the queue, open a ticket, reply or resolve, and `grep trustee_panel` across `packages/domain/src`, `apps/api/src` and `packages/contracts/src` returns **no helpdesk module at all**. Meanwhile AC2 routes every DPDPA request to the `other` catch-all → **`helpline_operator`** (`registry.ts:62`), the one role AC3 forbids from executing. **And `routed_to_role` is INERT** (new **Finding 10**): written once at creation (`helpdesk/project.ts:227`) and read **only** as an optional caller-supplied queue filter (`helpdesk/read.ts:71,90`; `handlers.ts:346`) — ⛔ no transition, no detail read and no permission check consults it, so every `helpdesk.respond` holder in the Pariwar can act on any ticket regardless of routing. Compounding it, `validateRoutingPolicyRules` constrains `target_role` only to *non-empty and ≤ length* (`registry.ts:184-189`), **not** to the seeded catalog — so an override naming `trustee_panel`, or a typo, validates and then fails **silently**, the Finding-5 misroute class through a different door. **This ABSORBS the `F6` role half** the final validation pass recorded as *“dispositioned nowhere”*; F6's SLA half stays dispositioned *“carried knowingly”* and is untouched. ⛔ **Nothing is decided here** — posed as three questions (does any action require Panel authority, notably erasure of a terminated member, adjacent to the Panel-exclusive `member.restore_terminated`; if so who is the operational recipient; and the warning that a merely-*routed* destination carries no enforcement). **Added:** Finding 10, **AC-R3** (`[BLOCKED on Escalation 10]`), **Task 7d** (blocked), a coverage-matrix row, and the in-scope ruling-gated bullet. **Propagated in the same pass** ([[feedback_spec_edits_must_propagate_to_tasks]]): the banner's release-gate sentence, *“TWO ACs ARE RULING-GATED”* → **THREE**, *“Precondition for BOTH”* → **ALL THREE**, the governance-sequence preamble, Task 0's raise-list (→ 1, 2, 7, 8, 9, **10**), the escalation trailer (**five** → **six** open blocks; Panel count **six** → **seven**, ⛔ stated as a count, not progress). ⚠ **The banner's AC arithmetic is deliberately UNCHANGED** — AC-R3 was never inside *“AC1–AC4 and AC7–AC15”*, so Escalation 10 removes no un-blocked scope; it constrains the **gate**, not the build. ⚠ **Task 0 is REOPENED and now BLOCKS:** Escalation 10 is absent from `Decision 2026-08-14-106` (committed before this trace), and ⛔ that entry must **not** be edited in place ([[feedback_supersede_never_reinterpret]]) — a **new**, separately-committed `governance(10.21):` entry raising it is owed **before any code lands** ([[feedback_governance_commits_precede_implementation]]). ⚠ **Method caveat:** this pass ran a targeted trace of the routing, RBAC and helpdesk surfaces plus the §8.7 governance record; it was **not** a full re-validation of the story's other ~66 claims, which stand on the prior passes. |
| 2026-08-14 | ⛔ **`Decision 2026-08-14-107` committed — Escalation 10 is now GOVERNED, and still unanswered.** The follow-on governance entry raising Escalation 10 landed, `governance(10.21):`-prefixed, **before any code** ([[feedback_governance_commits_precede_implementation]]). ⛔ **`Decision 2026-08-14-106` is NOT edited** — Escalation 10 post-dates it, and `107` is **additive, superseding nothing** ([[feedback_supersede_never_reinterpret]]). `107` records **three sub-questions CLOSED on evidence and deliberately NOT put to the Panel** — (1a) *“Trustee” is not `state_trustee`*, closed twice over and independently: by §8.7's ratified text (Decision `2026-08-10-096` clause 9) **and** by structure (`state_trustee` at `scopeCeiling: 'state'` holds neither helpdesk key, and `scopeWithinCeiling` is a pure numeric compare with no resolver parameter); (1b) *the Operator may intake/verify/route but not execute*, already ruled by AC3; (1c) *the routing mechanism needs no change*. It then records four findings — `routed_to_role` is **inert**, `target_role` is **not catalog-constrained**, the Panel has **governance authority and no operational queue**, and the request routes to the one role forbidden from executing it (absorbing **F6**'s role half) — plus one **non-defect** kept from being misread: the `actor: 'trustee'` pin is a coarse three-label enum, ⛔ not a Panel attribution. **Task 0 flipped to complete.** ⚠ **Anchor drift caught and corrected in BOTH files during the pre-commit verification:** the `trustee_panel` bundle comment cites `scope.ts:113-118` for `scopeWithinCeiling`, and that range is a **comment block** — the function is at **`:132-137`**, `CEILING_RANK` at **`:73-76`**, and the §RANK-ORDER canonical note at **`:89-91`**. Finding 10 and `107` now carry the correct anchors and flag the stale one in place. ⚠ **Recorded, not actioned:** `106`'s **title** says *“five escalations are RAISED AND LEFT OPEN”* while its own *Open follow-ups* enumerate **nine** — an internal inconsistency in a committed entry. ⛔ Not corrected here: `106` is not edited, and a title correction is its own record-correction act (the `2026-08-12-101` shape). |
| 2026-08-14 | ⭐ **TRUSTEE PANEL RULED ALL EIGHT ESCALATIONS — `Decision 2026-08-14-109`. ZERO BLOCKS REMAIN; the story is still NOT done.** Rulings: **(1)** delivery is **MEMBER-DIRECT** — a one-time OTP-verified grant to the registered mobile, no session issued; ⛔ the staff-mediated model is **not built, not flagged, not left dormant**. **(2)** three mechanized rights **plus a recorded helpdesk-ticket correction process** discharge the release gate — ⛔ no general member-profile editor. **(3)** deliberative moderation material is **WITHHELD** (decision note, 10.20's three further Tier-1 columns, `actor_display`); the member still learns the outcome + reason-code label. **(4)** the statutory horizon is **48h/5 business days**. **(5)** claim history is **CLAIMANT-ONLY**. **(6)** a `consumed` export **RETAINS** its status. **(7i)** **no** DPDPA action inherently requires Panel authority. **(7ii)** the **Trustee decides, an authorised administrator executes**. **(8)** the export-content contract passes to **a separate successor story**. ⭐ **THREE RULINGS REQUIRED NO CODE, and that is recorded rather than turned into work:** Row 4 — the shipped `other` desk is **24h/5, STRICTER** than the ratified 48h/5, so it already complies; ⛔ `DEFAULT_ROUTING_POLICY` untouched, golden hash intact, and ⛔ **do not loosen 24h to 48h to "match" the ruling**. Row 6 — retaining `consumed` is exactly what ships, so AC11's carved-out arm closes as **already-correct** and its test gains a ratified basis. Row 7 — **AC-R3 closes with a disposition and no code**; `trustee_panel` is still not granted `member.data_rights`, and the `roles.test.ts` rationale moves from *"pending a ruling"* to *"ruled: not required"*, with the test now instructing that a future grant **contradicts a ratified ruling**. **AC5's content half TRANSFERRED OUT** (clause 9) — ⛔ *transferred, not abandoned*: recorded in `deferred-work.md` with the full successor scope, and ⚠ **the successor story is still UNNAMED**, which is exactly the class that produced `emptySection('Epic 8')`. `assemble.ts`'s Story-10.10 OPEN QUESTION is **CLOSED BY RULING** — its omission is now correct *by ruling*, not merely undecided, and the header says so. ⛔ **ONE SUB-QUESTION WAS NOT ANSWERED AND IS NOT INFERRED:** Row **1(ii)** — is staff-mediated delivery permitted as a **fallback** for a member who no longer controls the registered mobile? Member-direct delivery is an OTP grant **to that mobile**, and Finding 4 records that it **fails for exactly that member** — the population this story exists to serve. Carried as an OPEN follow-up owned by the Panel, ⛔ **gating SHIP of AC-R1**, with no fallback built pending an answer. ⚠ **Row 2 makes the gate DISCHARGEABLE, not discharged** — the flip remains a separate Panel-exclusive act. ⚠ **Attestation caveat:** the consent sheet's initials block is **not yet countersigned**; rulings recorded as reported, and no clause may be cited as counter-signed until it is. ⚠ **Counsel unengaged**, so Rows 3/4/5/6 are recorded **`un-attested`** with re-presentation owed at first engagement. **Propagated in the same pass** ([[feedback_spec_edits_must_propagate_to_tasks]]): AC-R1/R2/R3, AC2's SLA disposition, AC5, AC11, the banner, the in-scope ruling-gated block, the *THREE ACs ARE RULING-GATED* preamble, the escalation trailer, the Panel-queue breakdown, 3 coverage-matrix rows, Tasks 5/6b/7b/7c/7d, `deferred-work.md`, `roles.test.ts`, `assemble.ts`, and §8.4a in **both** locales. ⛔ Verified afterwards: **zero** live `BLOCKED on Escalation` markers outside the Change Log, and 18 AC headings ↔ 18 matrix rows. |
| 2026-08-14 | ⭐ **SUB-QUESTION 1(ii) ANSWERED — `Decision 2026-08-14-110`. NOTHING ON THIS STORY REMAINS UN-RULED.** The Panel ruled option **(c)**: staff-mediated delivery **IS** permitted as a **NARROW FALLBACK** where the member no longer controls the registered mobile, conditioned on a **RECORDED JUSTIFICATION**. This was the one gap `109` recorded openly and refused to infer — and it mattered, because member-direct delivery is an OTP grant **to** that mobile and **Finding 4** records it fails for exactly that member, who is the population this story exists to serve. Left unanswered, the story would have delivered a statutory right a subset of terminated members structurally could not exercise. ⭐ **The delivery model is now PRIMARY + NARROW EXCEPTION, ⛔ not two co-equal routes** — the fallback must read as an exception in code, UI and audit, and ⛔ must not be reachable merely because it is quicker than waiting for an OTP. **AC-R1 is un-blocked to BUILD AND SHIP.** ⛔ **FOUR IMPLEMENTATION CONSTRAINTS, recorded because three of them are traps:** **(a)** the justification is **MECHANIZED and fail-closed** — the fallback is structurally incapable of proceeding without one; an un-mechanized requirement decays **silently** here, since the export would still be delivered and only the record would be missing. **(b)** it is **free text about a member**, so it rides a **Tier-1 encrypted column** (the `decision_note_ciphertext` precedent) and ⛔ **NEVER an event payload** — member payloads are `.strict()` auditShape-only precisely so they cannot carry free text (R1), which is why AC3's widening admitted exactly ONE opaque UUID. ⛔ Not `.passthrough()`, not an audit context field. **(c) ⭐ THE HIGHEST-RISK ITEM: the new Tier-1 column MUST be added to `anonymizeMember`'s coverage set IN THE SAME COMMIT that creates it.** A new Tier-1 column landing in a table outside that set is **exactly** how the moderation rationale survived an erasure (10.10) and **exactly** the class Finding 9 / AC11 exist to close — so a justification column added as a *safety control* would itself become a **PII-retention defect**. `rtbf-anonymize.test.ts`'s count assertion (**9 tables / 10 statements**) is the mechanism that catches it and must move **upward**. **(d)** its **export status is the AUTHOR'S READING, not a ruling**: `109` clause 3 withholds internal deliberative material and enumerates four artifacts, but this one did not exist when that row was ruled. Built **withheld** (the conservative default, matching its enumerated siblings) and recorded in `110` as an open question for the next session or first counsel engagement. **Propagated in the same pass** ([[feedback_spec_edits_must_propagate_to_tasks]]): AC-R1, Task 7b (now four sub-checkboxes), the in-scope ruling-gated bullet, the AC preamble, the banner, the escalation trailer, the coverage-matrix AC-R1 row, and the consent sheet's Row 1 + session header. ⛔ Verified afterwards: **zero** stale "unanswered" references outside the Change Log. ⚠ `109` is **not edited** — it stands as committed, including its record that 1(ii) was open at the time; `110` **completes** it and supersedes nothing ([[feedback_supersede_never_reinterpret]]). |
| 2026-08-14 | ⭐ **`Decision 2026-08-14-111` — the fallback-justification disclosure question is CLOSED BY RULING, and the Panel additionally established the fallback's TRIGGER.** **(1) Withheld, ruled.** The staff-mediated fallback justification is an **internal operational / audit record** and is **withheld** from the member export. ✅ This **confirms** the reading `110` clause 3(d) recorded — the code was already built to it as the conservative default, so **no behaviour changes; only its status does**, from *author's reading* to *ratified*. `110`'s open follow-up is **Closed by ruling**, not by edit ([[feedback_closure_language_precision]]). **(2) ⭐ THE CONSEQUENTIAL HALF, ruled of the Panel's own motion: the TRIGGER for the fallback is the MEMBER'S OWN EXPLICIT REQUEST for staff mediation.** ⛔ **This makes the fallback MEMBER-INITIATED, not operator-assessed** — an operator **cannot** unilaterally route a member onto the staff-mediated path, however well-intentioned; absent the member's request there is no exception to permit. ⚠ **That is a materially STRONGER control than the shape `110` described**, and it **REFINES `110` clause 2**, which phrased availability as an operator-assessed circumstance (*"the member no longer controls the registered mobile"*). ⛔ `110` is **NOT edited** — it stands as committed, and the refinement is **stated openly** rather than absorbed by re-reading it ([[feedback_supersede_never_reinterpret]]). **(3) TWO SEPARATE FACTS, DIFFERENT AUTHORS, BOTH RECORDED — ⛔ not collapsible into one field:** the **member's explicit request** (member-authored, captured at intake — the TRIGGER, without which there is no fallback) and **why the exception was permitted** (staff-authored — the JUSTIFICATION, internal per clause 1). ⛔ A single staff-authored "reason" field would **silently absorb the member's trigger into a staff assertion**, which is exactly the substitution the trigger ruling forecloses. **(4) ⚠ TWO READINGS RECORDED, NOT INFERRED.** *(a)* Does the lost-mobile circumstance remain a **hard precondition**, or is it the paradigm reason recorded in the justification? The author's reading is the latter — the ruling says the justification records *why the exception was permitted*, which is where that circumstance lives. ⛔ **No machine-checkable lost-mobile precondition is built, because none was ruled** — and ⚠ **this is the WIDER of the two readings**: it admits any member who explicitly asks and whose request is permitted, not only one who lost the mobile, which widens how often a staff actor holds a member's assembled, **decrypted** Tier-1 export — the posture `109` clause 1 was careful about. ⛔ **If the Panel intended the narrower shape, that is the item to correct**, re-trigger **before AC-R1 ships**. *(b)* Is the member's **trigger** — as distinct from the staff justification — disclosable in the export? Clause 1 withholds the *justification* and is **silent** on the request, which is the member's **own act** on their own ticket. ⛔ Nothing added to the export on that basis. **Propagated in the same pass** ([[feedback_spec_edits_must_propagate_to_tasks]]): AC-R1's heading, FALLBACK block, withheld clause and new no-precondition clause; Task 7b's fallback + two-facts + no-precondition + withheld checkboxes; the coverage-matrix AC-R1 row. |
| 2026-08-14 | ⛔ **`Decision 2026-08-14-112` — the NARROWER fallback eligibility is CONFIRMED, and AC-R1's fallback half is RE-BLOCKED on a question the ruling itself directed me to raise.** **(1) Eligibility requires BOTH conditions, neither substituting for the other:** an **explicit request by the member** for staff mediation **AND** the member **no longer controlling the registered mobile**, making the primary OTP route unavailable. ⛔ Staff may not initiate or unilaterally select the fallback. ⚠ This **supersedes the READING** recorded at `111` *Open follow-ups* item (a) — the wider shape (request alone suffices) is **rejected**. It was flagged there as the wider of two readings with a correction re-trigger *before AC-R1 ships*; the correction was taken. ⛔ `111` clause 2 itself **stands unchanged** and is now **one of two** conditions; `110` and `111` are **not edited** ([[feedback_supersede_never_reinterpret]]). **(2) ⛔ THE RULING DIRECTED THAT THE MECHANIZATION PROBLEM BE RAISED RATHER THAN SILENTLY WEAKENED — SO IT IS RAISED, AND IT BLOCKS.** A trace of the tree establishes there is **no reliable machine-verifiable "lost mobile" signal**: · **no delivery receipt** — `channels/src/providers/sms-dlt.ts` says so in its own words, *"The gateway gives NO synchronous delivery receipt at accept time (no DLR seam in v1)"*, so `status: 'accepted'` means the **gateway** took the message, not that a handset got it; · **no mobile-change history** — `member_identities` has no history table and there is **no `member.mobile_changed` event**, so a number lapsing or being ported away is unobservable; · **the one real observable is a PROXY** — `member_auth_otps` can show *an OTP was issued and never consumed* (`consumed_at IS NULL AND expires_at < now()`), which proves **the primary route did not complete** and ⛔ **NOT** that the member lost the mobile: it is satisfied identically by a member who was asleep, busy, or ignored the message. ⛔ **Implementing that proxy as if it verified condition (2) would be a claimed protection that does not exist** — the same class as this story's own inert `23505` catch, its inert `ON DELETE CASCADE` comment, and the vacuous `pii-scrape` gate. **(3) THREE OPTIONS ARE LIVE and each changes what ships — ⛔ none is chosen here:** (i) mechanize the *attempted-and-did-not-complete* proxy as a hard precondition + carry "lost mobile" as a recorded staff attestation; (ii) build a **stronger positive signal** first (a DLR seam, or a mobile-change/unreachable event) — net-new engineering in `@twt/channels` and the identity surface; (iii) **attestation-only**, no machine precondition — ⚠ the weakest, and closest to the shape clause 1 just rejected. **(4) ⚠ AC-R1's FALLBACK HALF IS BLOCKED AGAIN, and that is recorded plainly rather than worked around.** `110` un-blocked AC-R1; `112` re-blocks its fallback half. ⛔ That is **not governance churn** — it is the ruling correctly refusing to let an **unverifiable** condition ship as though it were verified. ✅ **AC-R1's PRIMARY (member-direct) half is unaffected and remains buildable**, as does AC-R2. **Propagated in the same pass** ([[feedback_spec_edits_must_propagate_to_tasks]]): AC-R1's heading, its settled-in-full claim, the FALLBACK eligibility block and the no-precondition clause; Task 7b's header + fallback + enforcement checkboxes; the coverage-matrix AC-R1 row; the banner, the in-scope ruling-gated bullet, the AC preamble and the escalation trailer — all four of which had claimed *"nothing remains un-ruled"* and were **false the moment this ruling landed**. ⛔ Verified afterwards: **one** open block, stated consistently at every site. |
| 2026-08-14 | ⭐ **`Decision 2026-08-14-113` — OPTION (i) RATIFIED; AC-R1 UN-BLOCKED IN FULL; the code terminology is MANDATED.** **(1) A THREE-PART GATE on the fallback**, ⛔ all three required and none substituting: **(1)** the member's **explicit request** — machine-enforced, fails closed; **(2)** an **unsuccessful OTP attempt** on the primary route — machine-enforced, fails closed; **(3)** the staff **attestation** that the member no longer controls the registered mobile — recorded in the internal justification, ⛔ **not machine-verifiable and not claimed to be**. ⭐ What element 2 buys is real: the fallback is **unreachable until the primary has genuinely been tried and failed** — exactly *"mechanized only to the extent necessary"* (`112` cl.3). **(2) ⛔ TERMINOLOGY MANDATED — `primary_delivery_not_completed`; ⛔ NEVER `mobile_lost`, ⛔ NEVER `mobile_unreachable`** — binding the predicate, the column/field, the error code AND the audit action. ⚠ **This is not style; it is the control that stops element 2 from becoming a claim it cannot support.** The check observes that an OTP was issued and the route did not complete; it does **not** observe the handset — there is no DLR seam and no mobile-change history. A field named `mobile_lost` would assert to every future reader, reviewer, operator and auditor that the system **established** what it merely **inferred**, and the inference is simply wrong for a member who was asleep, busy, or ignored the message. ⚠ This story has already had to correct **three** artifacts that named a protection they did not deliver (the inert `23505` catch, the inert `ON DELETE CASCADE` comment, the vacuous `pii-scrape` gate) — ⛔ the mandate exists so a fourth is not created **deliberately**. ✅ **MECHANIZED, not left as a convention:** `packages/contracts/tests/delivery-terminology-gate.test.ts` scans `contracts`/`domain`/`api`/`admin`/`jobs` for the banned terms in both snake_case and camelCase and fails the build tree-wide. ⚠ It builds its needles by **concatenation** and **excludes itself** by name — a terminology gate necessarily contains the terms it bans, so an un-excluded scan fails on itself and looks like a real violation. ⛔ **REVERT-SANITY PROVEN:** a planted `mobile_lost` in `domain/src/helpdesk/routing.ts` failed the gate with an actionable message naming the file; reverted; green. **(3) ⚠ THE PREDICATE IS `consumed_at IS NULL AND expires_at < now()`** over `member_auth_otps` — an OTP **issued** for the member-direct grant that **expired unconsumed**. ⛔ **`attempts` is deliberately NOT in it**, and whether it should be is recorded as an OPEN, **non-blocking** question: a **non-zero** attempt count means somebody **received the message and entered a wrong code**, which is evidence the member **DOES** control the mobile and cuts directly **against** element 3. ⛔ Not added, because it narrows eligibility beyond what was ruled and `112` cl.3 forbids inventing mechanism. ⚠ **The asymmetry is stated so whoever answers sees it:** wrong permissively admits a fallback that should have been refused; wrong restrictively **denies a member a statutory route**. **Propagated in the same pass**: AC-R1's heading + blocked banner + eligibility block + terminology/predicate clauses; Task 7b's header, fallback gate, terminology and `attempts` checkboxes; the coverage-matrix AC-R1 row; and the banner / in-scope bullet / AC preamble / escalation trailer, **all four of which said AC-R1's fallback was blocked** and were false the moment this ruling landed. ⛔ **ZERO blocks now — and the story is STILL NOT DONE: AC-R1 and AC-R2 are UNBUILT and the release gate is OPEN.** |
