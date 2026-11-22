# partner-boundary-invariant (Story 12.5, AC10)

**Partners are downstream consumers of explicitly consented leads — never a source of truth for any member's lifecycle, validity,
contribution or claim state** (Epic 12, Story 12.5's boundary AC; Decision `2026-11-21-483` QE15; ADR-0046).

## What it checks

| Rule | Where | What fails |
|---|---|---|
| (a) | `apps/api/tests/integration/partner-boundary.spec.ts` (live route registry) | A body-accepting route (POST / PUT / PATCH / DELETE) whose URL matches `/partner\|lead-outcome\|lead_outcome\|module-lead/i` and carries neither the admin nor the member session guard — an inbound partner path. |
| (b) | `pnpm partner-boundary:check` over `packages/domain/src`, `apps/api/src`, `apps/jobs/src` | The advisory value's names (`partner_reference`, `partnerReference`) as an identifier, a property or inside a string, outside the four files that may touch it: `schema/marketplace_lead_handoffs.ts`, `marketplace/lead-handoff.ts`, `scheduler/module-lead-handoff.ts`, `scheduler/partner-lead-client.ts`. And ANY mention inside `getLeadHandoffStatus` (the member-facing read never returns it). |
| (c) | the four transport files | A use of the `member` / `consent` / `claim` / `contribution` / `pool` / `validityCache` namespaces (or a value import from their modules) that is not one of the READS P0–P5 need: `member.memberExists`, `member.getCurrentMemberState`, `member.listAccountFrozenMemberIds`, `member.moderation.getCurrentMemberModerationOverlay`, `claim.isDeathReportStanding`, `consent.listConsentsForArtifact`, `consent.resolveConsentById`. In the jobs files the rule keys on the namespace (they import the `@twt/domain` barrel); in the two domain files on the relative path and the imported name. Type-only imports are not judged. |
| (d) | `scheduler/partner-lead-client.ts` | `JSON.parse(` or `.json(` — the partner's response body is never parsed; only the status and `X-Partner-Reference` are read. |
| (e) | everything under `apps/jobs/src` | A `createPartnerLeadClient(` call with an argument — production passes no test seam. |

Comments never match (AST-detected). The gate also FAILS when one of its listed files is missing, so a moved or renamed transport
file cannot shrink the scan in silence.

Added by the code review of 2026-11-22 (patch 8), so that no rule passes on nothing and the obvious ways around an import scan fail:

- **(a)** also judges the marketplace lead shape (`…/modules/:moduleId/lead…`), and pins the EXACT list of body-accepting
  `/webhooks/` routes: a new inbound webhook fails the spec until it is added there by name, with its reason.
- **(b)** `lead-handoff.ts` MUST hold a function declaration named `getLeadHandoffStatus`. A rename, or a rewrite as an arrow
  constant, fails instead of leaving the member-read leg with nothing to judge.
- **(c)** in the four transport files these fail too: an import of the domain barrel (`../index.js`), a detoured relative path
  (`./../consent/…`), a deep `@twt/domain/…` path, an authority package (`@twt/validity-service`), a dynamic `import(`, a
  `require(`, a re-export, and a raw-SQL `INSERT INTO` / `UPDATE` / `DELETE FROM` / `TRUNCATE` naming any table other than
  `marketplace_lead_handoffs`. And `lead-handoff.ts` must import EXACTLY the seven allow-listed reads: if the member-side reads
  move to a file this gate does not judge, or an allowance goes unused, the gate fails.
- **(e)** an import alias of `createPartnerLeadClient`, and `.call(` / `.apply(` / `.bind(` on it, are judged.

Added by the review of that fix (round 2, 2026-11-22):

- **(a)** the marketplace shape is any `…/modules/:moduleId/lead…` segment (`lead-status`, `leadback`, `leads`), and the pin holds
  every body-accepting route spelled `/webhooks/`, `/webhook/`, `/hooks/` or `/callback(s)` — which brought in the DigiLocker OAuth
  callback, now named there with its reason.
- **(b)** a read of EVERY column inside `getLeadHandoffStatus` fails too — `SELECT *`, `RETURNING *`, `t.*`, or the query builder's
  `.select()` / `.returning()` with no column list — because it returns the reference without naming it.
- **(c)** a relative specifier is RESOLVED against the importing file's directory, so `../../src/consent/write.js` is judged as
  `../consent/write.js` and `../../src/index.js` as the barrel; a directory import (`../consent`) counts as that directory; a relative
  import that leaves the file's own source root (`apps/jobs/src`, `packages/domain/src`) fails; and `MERGE INTO` is a write.
- **(e)** EVERY reference to the factory that is not the callee of a zero-argument call fails — a `const` alias, passing it
  (`Reflect.apply(createPartnerLeadClient, …)`), `(createPartnerLeadClient)(…)`, a shorthand property, a re-export. Its own definition,
  a type position and a property key are not references.

And by the review of THAT fix (round 3, 2026-11-22):

- **(b)** "every column" is judged on any SQL string in the body holding `SELECT` / `RETURNING` (any case): a `*` that is not a
  `count(*)`, or a whole-row value (`to_json(b)(h)`, `row_to_json(h)`); and the builder's `findFirst` / `findMany` /
  `getTableColumns(`. A string without the verb (a regex source with `.*`) is not judged.
- **(c)** a side-effect import (`import '…'`) that leaves the file's source root, or names an authority module or the domain barrel,
  fails.
- **(e)** a string-keyed access (`ns['createPartnerLeadClient']`) is a reference; a namespace import or an `export *` of the client
  module fails outright. An interface member, `createPartnerLeadClient!()` and `typeof import('…').createPartnerLeadClient` are not
  references.

## ⚠ The semantic limit

This gate proves the **absence of the patterns it names**. It does **NOT** prove that no future code path could launder partner data
into what TWT believes about a member — a new table, a new namespace, a value copied through an innocently named field, or an inbound
path that is session-guarded but fed by a partner's export would all pass it. Nor does it see, in the transport itself: a write made
through a helper in ANOTHER file (the scan reads four files, not their callees); SQL assembled from pieces, in lower-case keywords, or
through the query builder (rule (c)'s write check reads SQL strings only); what `getLeadHandoffStatus` CALLS, or a SQL constant it uses that is defined outside its body, or a composite row
(`SELECT h FROM … h`) (rule (b) judges the strings and calls IN its own body); a key to the factory BUILT at run time (rule (e) judges
names and string keys); an alias made by anything but an import inside a file the factory is passed to (rule (e) judges each file on its
own); a namespace of the `@twt/domain` barrel outside the six it names; an inbound route under a spelling rule (a) does not name, or a
GET carrying data in its query string; a response header other than
`X-Partner-Reference` read in the client (rule (d) looks for JSON parsing only); or a hand-built client passed to the sweep as
`deps.client` (that one is pinned by the sweep's own test on `boot.ts`'s text, ⛔ by this gate). A green run means "none of the named shapes", nothing
more ([[feedback_gate_scope_semantic_coverage]]).

The human half is the review question ADR-0046 sets for **every** future inbound integration (K-5's lead-outcome callback first):

> Does any value this partner sends change what TWT believes about a member's lifecycle, validity, contributions or claims? If yes,
> it is refused.

When a later story adds a file that may touch the advisory reference (an admin view — K-3), it extends `REFERENCE_ALLOWED_FILES` in
`lib.ts` **in that story**, with its own review — never by widening a pattern.

## Run

```sh
pnpm partner-boundary:test   # the planted violations (lib.test.ts)
pnpm partner-boundary:check  # the tree
```
