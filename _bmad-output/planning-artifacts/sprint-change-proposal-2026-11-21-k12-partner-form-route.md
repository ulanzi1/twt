# Sprint Change Proposal — 2026-11-21 — K-12: the partner's-own-form route (Epic 12)

**Workflow:** `bmad-correct-course`, incremental mode. **Requested by:** BigDev ("refer story 12.5"; trigger confirmed as K-12 only).
**Branch:** `correct-course/12-5-k12-partner-form-route`, its own worktree, cut from the Story 12.5 branch tip `8269daaf`
(`story/12-5-module-lead-handoff-transport-partners-as-downstream-consumers-invariant`, in progress in a peer session). Lands
AFTER 12.5, rebased onto its final tip.
**Decision:** `2026-11-21-485` (author-commit, ALONE, committed before this file). **Every proposal below: approved by BigDev ("a"), 1–6.**

> ⚠ **Correction recorded.** The first pass of this workflow read `main`, where row `12-5` looked like an untouched backlog row, and raised
> four "conflicts" (C7 signing scheme, C6/C8 partner-data basis, 12.3 ↔ 12.5 sequencing, endpoint/key on the partner entity). BigDev
> corrected it: 12.5 is in progress on its own branch. All four are SETTLED there — C7 by `-483` QE3 (A) (HMAC per module; supersedes the
> architecture's partner-JWT text for the transport, `-483` (S1)); C6/C8 by `-484` (Trustee-ratified, Q1 C, Q2–Q7 A; counsel's leg (b) of
> Row 54 still open); sequencing by `-483` QE17 / QE18 and BigDev's "Build 12.5 now"; the endpoint / key by `-483` QE3 (A), Resolved via
> explicit deferral. That first pass and its Proposal 1 (asymmetric JWT) are WITHDRAWN and form no part of this proposal.

---

## 1. Issue summary

**Trigger:** `deferred-work.md` 12.5's **K-12**, trigger MET by Decision `2026-11-21-484` Q1 C (Trustee-ratified, DR + KB), as put:
*"Both — each offer works one way or the other."* — option B's promise: *"The Trust sends nothing — the member opens the partner's own
form from the app and fills it in; the partner checks the member's number in its own way. The form opens in the phone's own browser, not
inside the Trust's app, so the Trust cannot see what the member types. The Trust passes the partner only a code saying which offer the
visit came from, and nothing about the member."*

**Problem:** the second route has ⛔ story, ⛔ design and ⛔ code. K-12 says Story 12.5 can do none of it and that the correct-course comes
**before Story 12.3 and before go-live**. It owes five things: (1) a per-module marker for which way an offer works; (2) ⚠ the send path
refusing a partner's-own-form offer (else a 12.3 bug breaks *"The Trust sends nothing"* silently); (3) partner-reported step totals or
progress are INBOUND partner data (advisory only, K-5); (4) the parts `-484` "does NOT cover" — which offers go which way and who
chooses, member-by-member progress, step totals, the second set of member wording; (5) its own go-live row.

**Evidence (traced at `8269daaf`, ⛔ from decision text):**
- `0193_marketplace-modules.sql`: `lead_handoff_url` and `lead_handoff_signing_key_secret_name` are NOT NULL on every module; the
  whole-row trigger makes the manifest immutable; there is ⛔ route column.
- `lead-handoff.ts` `recordLeadHandoff`: checks consent type / subject / revocation / artifact; ⛔ check of the offer's kind. S4
  (`readLeadHandoffModule`) reads state and archive reason; ⛔ kind.
- 12.1 QE5 / `deferred-work.md`: *"An external-URL CTA (FR-64 `target_url_or_form`) is Not addressed"*.
- PRD FR-64 (`target_url_or_form`) and FR-65 ("CTA (external partner URL or in-app form)") already contemplate the route ⇒ ⛔ PRD change.
- The mobile app already opens the system browser with `Linking.openURL` (helpdesk, renewal UPI, settings).

**Three design traps found while tracing (each fenced in Story 12.5b):**
1. **The offer code must be fixed per offer.** A per-visit or per-member token would let the partner join a visit to the Trust's record of
   who opened it — passing something about the member, which Q1 B's text forbids.
2. **"Not inside the Trust's app" = `Linking.openURL`.** An in-app browser tab (`expo-web-browser` — Custom Tabs / SFSafariViewController)
   presents as part of the app; choosing it would REINTERPRET the ratified text.
3. **A `partner_form` offer must ⛔ call `submitModuleLead`.** That writes the permanent member↔offer link (12.1 C8), which `-484` Q5 A
   ruled for the sending route only. So such offers have ⛔ places (`slot_capacity` NULL) and ⛔ lead event.

## 2. Impact analysis

| Area | Impact |
|---|---|
| Epic 12 | One new story, **12.5b**, after 12.5 and BEFORE 12.3. ⛔ story removed, ⛔ renumbered, ⛔ rolled back. |
| Story 12.1 (done) | Manifest v2 gains `lead_route` + `partner_form_url`; 0193's two NOT NULLs relaxed under a route-pairing CHECK — built by 12.5b (C10's path). |
| Story 12.2 (done) | Wizard step (f) asks the route — built by 12.5b; WHO may choose waits on the Panel (R1). |
| Story 12.3 (backlog) | Two kinds of card; ⛔ consent / seal / lead for `partner_form`; the C9 re-check still runs before the link is handed out; must not be built before 12.5b lands. |
| Story 12.4 (backlog) | Suppression covers both kinds, incl. the link; a standing death report hides `partner_form` offers too (narrow side; R4 asked). |
| Story 12.5 (in progress) | ⛔ change to its scope; 12.5b adds the guard to 12.5's commands and S4 after 12.5 lands. |
| Story 12.6 (backlog) | ⛔ change (a `partner_form` offer has ⛔ places, so only `valid_until` can archive it). |
| PRD | ⛔ change (FR-64 / FR-65 already cover it). |
| Architecture | §3.7 — one dated annotation (a second route). |
| UX | Second card kind; the member wording is the Panel's (R5). |
| Governance | `-485` (author-commit); a new routing note (R1–R5, WRITTEN, ⛔ sent); roster **Row 55** `partner-form-route-live`. |
| MVP | Unchanged. Go-live of the second route gated; ⛔ merge blocked. |

## 3. Recommended approach

**Hybrid — direct adjustment plus routing.** Add Story 12.5b (every edge it builds only NARROWS what leaves the Trust ⇒ the author's under
§0, recorded in `-485`); route the parts `-484` did not rule to the Panel in a new note, without blocking the build; gate go-live by its
own roster row. Effort: medium (one migration, guards in four places, a wizard step, an opener, per-offer counters). Risk: low. Timeline:
12.3 waits for 12.5b. Rollback: not viable (12.1 / 12.2 stand). MVP review: not needed.

## 4. Detailed change proposals (all approved)

### 4.1 `epics.md` — NEW Story 12.5b (inserted after Story 12.5, before 12.6)

```
### Story 12.5b: Partner's-Own-Form Route — Offer Route Marker + Send Guard + Outbound Link `[PRIMITIVE]`

As Solo Builder carrying out Decision 2026-11-21-484 Q1 C ("Both — each offer works one way or the other"),
I want each offer to carry which way a member's interest reaches the partner, and the "partner's own form"
way to send nothing about the member,
So that "The Trust sends nothing … only a code saying which offer the visit came from, and nothing about the
member" holds by construction, not by 12.3 getting it right.

**Acceptance Criteria:**

**Given** `-484` Q1 C + Story 12.1 manifest + Story 12.5 transport (`-483`)
**When** the route marker is added
**Then** the manifest carries `lead_route` (`trust_sends | partner_form`), set at authoring and immutable
(manifest schema v2); a `partner_form` offer carries `partner_form_url` and NO handoff URL, signing-key name or
`slot_capacity` (a CHECK pairs each route with its columns; 12.5b relaxes 0193's two NOT NULLs, C10's path)
**And** `partner_form_url` is `https`, ⛔ IP / localhost, ⛔ fragment; it may carry a FIXED query the partner
supplied (the offer code); the Trust appends nothing; ⛔ per-member or per-visit token anywhere in it

**Given** the send guard (K-12 item 2 — load-bearing)
**When** anything tries to pass a member on for a `partner_form` offer
**Then** `submitModuleLead`, `sealLeadMemberFields` and `recordLeadHandoff` refuse it with a typed error, and the
12.5 sweep's S4 cancels any row of one with its own cancel word — so a 12.3 bug fails loudly, ⛔ sends quietly
**And** a test proves no member field, `member_id` or lead id reaches a `partner_form` offer's URL

**Given** the member opening the partner's form
**Then** the app opens `partner_form_url` with `Linking.openURL` — the phone's own browser; ⛔ embedded web view,
⛔ in-app browser tab (`expo-web-browser`) — "not inside the Trust's app" as ratified
**And** the Trust counts per offer only (card shown / opened / went to partner / came back) — ⛔ member id on any
count; a per-member "opened" record is ⛔ built unless the Panel rules it (routing note R2)
**And** ⛔ inbound path for partner step totals or progress (12.5 K-5: advisory only; routing note R3)

**Given** Story 12.2's wizard
**Then** step (f) asks the route, and shows the partner-form URL field for `partner_form`, and the handoff URL +
signing key for `trust_sends`; WHO may choose the route is the Panel's (routing note R1) — go-live waits on it

**And** ⛔ go-live until its own roster row closes (`partner-form-route-live`, Row 55); merge ≠ go-live
```

*Rationale:* discharges K-12 items (1)–(3) and fences (4)–(5). Exact names (columns, cancel word, counter table) are 12.5b's create-story's.

### 4.2 `epics.md` — Story 12.3, NEW dated blockquote after "INHERITED FROM 12.2" (the AC is NOT edited)

```
> ⭐ **2026-11-21 — CORRECT-COURSE (K-12; `-484` Q1 C; Decision `2026-11-21-485`): TWO KINDS OF OFFER.**
> The AC's "tapping a module opens a brief interest form with explicit consent … emits `module.lead_submitted`"
> now holds for `lead_route = trust_sends` ONLY. These bind this story:
> - **⛔ Build before Story 12.5b lands.** 12.5b's guard is what makes a `partner_form` offer refuse a lead; 12.3 is
>   the first caller of `submitModuleLead` / `recordLeadHandoff`.
> - **`partner_form` card:** ⛔ consent form, ⛔ `recordConsent`, ⛔ `submitModuleLead`, ⛔ seal. The CTA opens the
>   offer's `partner_form_url` through 12.5b's opener (the phone's own browser). It shows ⛔ place count (those
>   offers have none) and ⛔ delivery status (nothing is delivered).
> - **The member sees which way an offer works before going on** (`-484` Q1 C, as put: *"the member sees which
>   before going on"*). The wording for `partner_form` is the second set of member wording — owed to the Panel
>   (12.5b's routing note); ⛔ invented here.
> - **The C9 re-check still runs** for a `partner_form` tap (scope, eligibility, member state, 12.4's suppression)
>   before the link is handed out — a shelf filter is ⛔ an authorization, and a frozen member must not get the
>   link either.
> - **Counts only:** 12.3 emits 12.5b's per-offer counters; ⛔ member id on them.
```

### 4.3 `epics.md` — Story 12.4, NEW dated blockquote after "INHERITED FROM 12.1" (the AC is NOT edited)

```
> ⭐ **2026-11-21 — CORRECT-COURSE (K-12; `-484` Q1 C, Q7 A; Decision `2026-11-21-485`).**
> - **Suppression covers BOTH kinds of offer.** A `partner_form` offer's card and its link are as absent as a
>   `trust_sends` card — (a)–(e) above apply to the link too: ⛔ rendered, ⛔ prefetched, ⛔ cached.
> - **A standing death report hides `partner_form` offers too, also after the freeze lifts** — built on the narrow
>   side, like 12.5's P5 (`-483` QE26). Q7 A was ruled for the sending route; the note said that under B it remains
>   *"only as 'the offers are not shown'"*. Whether Q7 A reaches the second route is ⛔ ruled — asked in 12.5b's
>   routing note, ⛔ blocking.
> - The C9 re-check that 12.3 runs before handing out a `partner_form` link includes this suppression.
```

### 4.4 Records — `deferred-work.md` and `architecture.md` (dated lines only; ⛔ "Closed by" before code)

```
deferred-work.md — under 12.5's K-12 (after its "trigger MET" sub-lines):
  - 2026-11-21 — OWNER ASSIGNED by the correct-course (`sprint-change-proposal-2026-11-21-k12-partner-form-route.md`;
    Decision `2026-11-21-485`): items (1), (2) and (3)'s ⛔-build → **Story 12.5b** (`12-5b-partner-own-form-route`),
    sequenced after 12.5 and BEFORE 12.3; item (4) → the routing note `2026-11-21-12-5b-partner-form-route` (WRITTEN,
    ⛔ sent); item (5) → roster row `partner-form-route-live`. The sentence above "⛔ owner yet, ⛔ run" stands as
    history. ⛔ built.

deferred-work.md — under 12.1's "An external-URL CTA (FR-64 `target_url_or_form`) is Not addressed":
  - 2026-11-21 — trigger MET in substance by Decision `2026-11-21-484` Q1 C (Trustee-ratified: some offers send the
    member to the partner's own form) — by a ruling, ⛔ a partner contract as the trigger read. Owner: **Story 12.5b**
    (`partner_form_url` on a `partner_form` offer). ⛔ built.

architecture.md — new annotation after §3.7's existing 2026-11-21 annotation:
> ⚠ **ANNOTATION 2026-11-21 (correct-course K-12, `2026-11-21-485` — author-commit, carrying out `-484` Q1 C,
> Trustee-ratified) — a SECOND ROUTE.** An offer is `trust_sends` (everything above, as amended by `-483` (S1)) or
> `partner_form`: ⛔ envelope, ⛔ signature, ⛔ delivery, ⛔ retry, ⛔ circuit breaker; the member opens the partner's
> form in the phone's own browser and the Trust passes only a fixed per-offer code in the partner-supplied URL.
> "Member UX state: lead status" applies to `trust_sends` only. Built by Story 12.5b. ⭐ Annotated, ⛔ not rewritten.
```

### 4.5 NEW routing note — `trustee-panel-routing-note-2026-11-21-12-5b-partner-form-route.md` (WRITTEN, ⛔ sent)

Questions as approved (full note in the 12.5 note's format: §0, the one fact, options with costs, our reading, Told, evidence):

- **R1 — Which offers use the partner's own form, and who decides?** A: the publishing admin, offer by offer, on the publish record ·
  B: the Trustee Panel, offer by offer · **C (our reading):** a rule — any offer touching health always uses the partner's own form; for
  the rest, the publishing admin chooses (a health-camp lead may imply health data, 12.1 C8 (a)).
- **R2 — Does the Trust keep a record that a named member opened a partner's form?** **A (our reading):** no — per-offer counts only ·
  B: yes, permanently (like Q5 A) · C: yes, removed after N days. Cost of A: the helpline cannot see it; drop-off known only as totals.
- **R3 — What may a partner tell the Trust about its form?** A: nothing · **B (our reading):** totals per offer only, advisory (BigDev's
  "where users drop", with no name in it; totals below a floor, suggested 5, not shown) · C: member by member (needs a basis; counsel).
- **R4 — Once a death is reported, are partner's-own-form offers hidden too, and stay hidden after settlement?** **A (our reading;
  built so):** yes, as Q7 A · B: only while the claim is open.
- **R5 — The member wording**, draft for approval: *"This offer opens [partner]'s own page in your phone's browser. You fill in your
  details there, under [partner]'s terms. The Trust does not send anything about you."* (Liability wording stays with counsel, Q10.)
- **Told — not asked:** the offer code is the same for every member of an offer; these offers have ⛔ places and ⛔ delivery status;
  Q3–Q6 do not apply; Q2 A still binds (a take-up commission needs the partner to report take-ups — R3's totals).
- **At stake:** nothing blocks building or merging 12.5b; go-live of the second route waits on R1–R5 (Row 55).

### 4.6 Decision, roster, sprint status, commit order

- **Decision `2026-11-21-485` — AUTHOR-COMMIT (BigDev), ALONE, FIRST.** Records the author edges of 4.1–4.4 (route marker; send guard in
  `submitModuleLead` / seal / `recordLeadHandoff` / S4; fixed per-offer code; `Linking.openURL`; per-offer counts only; ⛔ inbound path;
  ⛔ places / ⛔ lead event for `partner_form`; death report hides them, narrow side, R4 asked). Quotes `-484` Q1 C verbatim; AMENDS
  `-427` QE5's "⛔ external-URL CTA (Not addressed)" by name; supersedes ⛔ ratified text; carries ⛔ Panel choice (R1–R5 routed).
- **Roster Row 55 `partner-form-route-live`** — no `partner_form` offer is published to members until (a) the Panel rules R1–R5, (b) the
  member wording is approved (R5), (c) the partner agreement carries Q2 A (⛔ per-lead payment) and, if R3 B / C, what the partner
  reports, (d) Story 12.5b done. Owners: Trustee Panel (a, b); BigDev (c); 12.5b (d). Merge ≠ go-live. Row 54 stays the sending route's.
- **`sprint-status.yaml`** — new row `12-5b-partner-own-form-route: backlog`, placed after `12-5` (above `12-6`), with a comment line
  that it lands BEFORE 12.3; ledger `2026-11-21ap`, prepended safely, YAML parsed after. Epic 12 stays in-progress.
- **Commit order** on `correct-course/12-5-k12-partner-form-route`: (1) governance — `-485` ALONE; (2) records — the routing note + Row
  55; (3) correct-course — this file + `epics.md` (12.5b, 12.3 / 12.4 notes) + `architecture.md` §3.7 annotation + `deferred-work.md`
  dated lines + `sprint-status.yaml` row and ledger. Then rebase onto 12.5's final tip; land after 12.5 by fast-forward. ⛔ push until
  BigDev says.

## 5. Implementation handoff

**Scope: Moderate** — backlog reorganisation (one new story, a sequencing constraint on 12.3) plus governance routing.

| Who | Does |
|---|---|
| This session (Developer, correct-course) | The three commits in 4.6 on its own branch; rebase onto 12.5's final tip. |
| BigDev | Sends the routing note when ready; records the Panel's answers (a new decision); drafts the partner-agreement clause (Row 55 (c)). |
| Trustee Panel | Rules R1–R5. |
| `bmad-create-story 12.5b` (after 12.5 lands) | Re-traces at its pin; names columns / cancel word / counters; its §0 table; ASKs where needed. |
| Story 12.3's create-story | Reads 4.2; must not start its build before 12.5b lands. |

**Success criteria:** `-485` committed alone and first; the routing note written and not marked sent; Row 55 open; `epics.md` carries
12.5b and the 12.3 / 12.4 notes; K-12 and the external-URL item carry dated owner lines; `sprint-status.yaml` parses and lists
`12-5b-partner-own-form-route: backlog`; ⛔ "Closed by" line anywhere; ⛔ code.

---

## Addendum 2026-11-22 — the Panel ruled the routing note (Decision `2026-11-22-486`)

The proposal above is kept as approved. The Panel (DR + KB) answered R1 A, R2 C (90 days), R3 B, R4 A and amended R5. Two of those
differ from what the proposal assumed, and `-486` supersedes the matching sentences of `-485` by quotation:
- **R2 C:** Story 12.5b BUILDS a per-member record of a visit (removed after 90 days; erasure and export reach it) — §4.1's "a per-member
  "opened" record is ⛔ built unless the Panel rules it" is now ruled.
- **R3 B:** partner totals per offer may come in (advisory; below 5 not shown) — §4.1's "⛔ inbound path" holds for anything but totals.
- **R1 A:** the publishing admin chooses the route (§4.1's wizard step). **R4 A:** confirmed. **R5:** the member sees only *"You are
  being directed to [partner]'s page, where [partner] may ask for your contact information."*; the Hindi through tone review.

Roster Row 55 (a) and (b) are MET; (c) and (d) remain. A dated note under Story 12.5b in `epics.md` carries the ruling.
