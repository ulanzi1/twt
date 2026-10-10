---
baseline_commit: a05ce150
---

<!--
⭐ PINNED 2026-10-10 (`bmad-create-story 6.30`) to `a05ce150` on `story/6-27-peer-mesh-sending-replies-and-date-of-death` (= `main`
`5946e411` + 6.27's story commit — the sprint row `6-30` exists only there until 6.27's branch merges). Every `file:NNN` is AS OF
`a05ce150` (code identical to `main` `5946e411`), derived by three read-only research passes (the mobile app's link readiness; the
public site, hosting and config; the governance trail + current platform rules, fetched 2026-10-10) and spot-checked by the author.
⚠ Before Task 1: `git diff --name-only a05ce150..HEAD -- packages apps infra scripts` — re-read any cited file in that list.

STATUS: `ready-for-dev`. ⛔ NO CODE until Task 0.3's author-commit (AL1–AL16, answered by BigDev at Task 0.2) is committed ALONE
([[feedback_governance_commits_precede_implementation]]).
⭐ §0 gate (template `trustee-panel-routing-note-TEMPLATE.md`): ⛔ no Panel question. Every AL strips to "the code should do X" — how a
link opens the app, where two public files live, what a fallback page says (it names ⛔ no one and shows ⛔ nothing about anyone). What
the TEXT says and whether members are texted at all is 6.27's Q1 — ⛔ not re-asked here. ⚠ It BECOMES the Panel's if the fallback page shows
ANYTHING about a member, a death or a claim (Trap 1), or a link is used to reach anyone the Panel has ⛔ not ruled may be texted.
⚠ Two calls here are BigDev's / the Trust's, ⛔ not the Panel's and ⛔ not the author's: the production app IDENTITY (name, bundle id, package —
PRD OQ-1, deferred-work D-13; an Android package can ⛔ never change after the first Play upload) and whose Apple / Play accounts are used.
⇒ this story builds everything with them as CONFIG and records them as go-live conditions (AL1); it ⛔ never invents them.

GLYPH REGISTER, ADDRESSING RULE: as 6.27 — `⛔` sits ONLY on a negation word · `⭐` = key fact / action · `⚠` = hazard. ⛔ No `file:NNN`
into `.decision-log.md`, `deferred-work.md` or `sprint-status.yaml`. `file:NNN` is used ONLY for code / config, as of `a05ce150`.
LETTERS: `AL` = this story's build decisions (PROPOSED); `F` = FOUND facts; 6.27's `PM` cited as such. `AL` is used by ⛔ no earlier story
(grepped 2026-10-10).
-->

# Story 6.30: A Link in a Text Opens the App at the Right Screen — App Links, Universal Links, Two Public Files, a Plain Fallback Page, and the Login That Keeps Its Place `[PRIMITIVE]`

Status: ready-for-dev

> ⭐⭐ **WHAT THIS STORY IS, IN ONE PARAGRAPH.** Story 6.27's text to the five neighbours carries a link that should open the question
> screen in the TWT app (BigDev, 2026-10-10: *"separate story"*). Today ⛔ no link can open the app: it still carries the P0 prototype's
> identity, reads ⛔ no incoming URL, has ⛔ no Android App Links or iOS Universal Links, ⛔ no verification file is hosted, the public
> site's hosting rule reaches only `/p/*`, and the login wall throws away the screen a member asked for. This story builds the
> **plumbing**: ONE shared list of app-link paths; the app's link settings generated from config; the two `/.well-known/` files served by
> the public site; a plain fallback page for a phone without the app; the login that returns to the requested screen; a dignified
> "not found"; the hosting and edge rules; ONE base-URL setting (`APP_LINKS_BASE_URL`); and the go-live record. ⭐ Its first and only
> consumer is 6.27's `/peer-request` (PM21). ⛔ Nothing here sends a text.

> ⚠⚠ **SIX FACTS — read before anything else.**
> 1. ⭐ **The app's production identity is UNDECIDED** — `apps/mobile/app.json:3-23` is the prototype's (`"TWT P0-5 Prototype"`,
>    `twtp05`, `org.teacherswelfaretrust.p0prototype`); deferred-work D-13 says it *"must be updated to production values … before the
>    first EAS Build profile run or App Store / Play Store submission"*; the PRD's brand is a working title (OQ-1, *"decision blocking
>    before app-store listing"*); ⛔ no Apple Team ID and ⛔ no Play signing fingerprint is recorded anywhere. Both verification files are
>    KEYED by exactly these values ⇒ AL1: everything reads them from config; ⛔ no value is invented.
> 2. ⚠⚠ **The link's code must be a QUERY STRING, ⛔ not a path segment.** India's operators whitelist a URL's FIXED part; a dynamic URL is
>    registered ending in `?`, and *"dynamic paths before the query string are currently not supported"* (Tanla; MSG91, Fast2SMS say the
>    same; TRAI's whitelisting Direction in force since 1 Oct 2024 — a text with a non-whitelisted URL is REJECTED). ⇒ the link is
>    `https://<domain>/peer-request?c=<code>`, whitelisted as `https://<domain>/peer-request?` (AL3) — ⚠ 6.27 PM21 (b) as written
>    (`/peer-request/<code>`) is amended by 6.27 v1.3.
> 3. ⚠ **TRAI's 18 Nov 2025 Direction requires TYPED template variables** (`{#numeric#}`, `{#alphanumeric#}` ≤ 40 chars, `{#url#}`,
>    `{#urlott#}`, `{#cbn#}`, `{#email#}`); `{#url#}` and `{#cbn#}` are checked against the whitelist; an untyped template is rejected.
>    ⇒ 6.27's link is `{#url#}` and its helpline `{#cbn#}`. ⚠ ALL TWELVE templates already drafted in
>    `docs/launch-gate-inventory/dlt-template-requests-6-19.md` (6.19b, 6.19d, 6.24b — ⛔ none submitted) use the generic `{#var#}` for
>    every slot, the helpline included — a cross-story finding this story RECORDS (AL15), ⛔ never fixes.
> 4. ⚠⚠ **The login wall drops the target.** `apps/mobile/app/_layout.tsx:127-129` sends a member without a session to
>    `/(auth)/login`; after the OTP, `app/(auth)/otp.tsx:38-39` and the guard's `:130-131` both `router.replace('/(tabs)')`. Architecture
>    §4.7 item 1 requires *"re-auth flow preserves the deep-link target as the post-auth redirect"* ⇒ AL6.
> 5. ⚠ **The public site is reachable only under `/p/`.** `infra/dokploy/compose.yaml:56` routes ``PathPrefix(`/p/`)`` to the public
>    service while every Astro page sits at the root (`apps/public/src/pages/`) — `/.well-known/*` and `/peer-request` reach ⛔ no
>    service today ⇒ AL9. And the edge may challenge the verifiers (`infra/cloudflare/waf.tf` Rules 2–3 — a managed challenge is ⛔ not a
>    clean 200, so verification fails SILENTLY) ⇒ AL10.
> 6. ⚠ **One app per Pariwar is planned** (FR-61: *"N build configs, N store listings … its own signing key"*; ADR-0020 cl.4: *"each
>    Pariwar's public site is its own per-Pariwar build/domain"*). v1 ships Bihar only ⇒ AL2: the files list app identities from config
>    as a LIST (one today), ⛔ not hard-coded single app.

## Story

As **a member who has been sent a text with a link**,
I want **tapping the link to open the TWT app at the right screen — after logging in if I have to — or, without the app, a plain page
that tells me how to answer**,
so that **I can do what the text asks in a minute, and ⛔ no web page ever asks me to log in or shows me anything about anyone.**

## The rulings and records this story builds on

| Source | Key | Status |
|---|---|---|
| 6.27 v1.1 PM21 + BigDev 2026-10-10 | the text carries a link; *"separate story"* — 6.30 = the plumbing | author (proposed) + BigDev's call |
| Architecture §4.7 | deep-link landing: (1) re-auth preserves the target; (2) scope match; (3) revoked ⇒ *"this is no longer available to you"* + helpline, *"Never hard 404"* | architecture (binding) |
| Architecture §3.4 + `-255` F7 | members get ⛔ no ordinary SMS today — whether the five are texted is 6.27's Q1 | ⛔ not re-asked here |
| ADR-0022 | the public Astro shell: server-rendered, ⛔ no session, ⛔ no per-user branching | ratified |
| ADR-0010 (Row 3) | Cloudflare is the edge; its DPDPA clearance is scoped to the edge design *"as recorded"* | ratified — AL10 records whether a `/.well-known/*` skip is a material change |
| ADR-0011 §5 | dev wires, operator applies (Traefik / Cloudflare) | ratified |
| ADR-0013 | the PII-scrape gate over public pages | ratified — AL8 / AL11 |
| ADR-0020 cl.4 · FR-60 / FR-61 | per-Pariwar site / domain; separate app per Pariwar | ratified / PRD |
| deferred-work D-13 · PRD OQ-1 | the production identity is owed before the first store build | ⏳ BigDev / the Trust |
| deferred-work D8 · `deep-links/README.md:7` | the mobile deep-link HANDLER is absent; the `twt://` push grammar has ⛔ no consumer | open — AL13 |

## ⭐ THE INVARIANTS

1. **A link carries ⛔ no credential and ⛔ no personal data** — a fixed path and an opaque code; logging in happens ONLY in the app.
2. **⛔ No web page asks for a login, a number, an OTP or any data** — the fallback page is static words and (when they exist) store links.
3. **The fallback page ⛔ never reads, echoes or resolves the code** — ⛔ no API call, ⛔ no database read (the public-pages "two-route rule" and
   6.27 PM21 (d)'s ⛔-oracle both stay intact).
4. **ONE list of app-link paths** (`packages/contracts`) drives the app's link settings, the two verification files, the fallback pages
   and the senders' URL builder — ⛔ never a second copy anywhere.
5. **⛔ No invented identity** — bundle id, package, Team ID and fingerprints come from config; unset ⇒ the verification file is ⛔ not served
   (404), ⛔ never a guess.
6. **A link the app cannot place is ⛔ never a crash and ⛔ never a hard 404** — an unknown path lands on a dignified, bilingual "not found" with the
   helpline (§4.7 item 3).

## 📜 Policy meaning (AI-10-1)

**This story introduces ⛔ no predicate and changes ⛔ none that gates a member's access to a benefit.** It decides how a link opens a
screen; who may see the screen behind it is the consumer's (6.27 PM21 (d): the request's own member only). In the member's terms:
*"a link in a text from the Trust opens the app where it should; it never lets anyone else in, and it never asks you to log in on a web
page."* Niyamavali check: ⛔ not applicable (the Niyamavali does not speak to app links) — and it is ⛔ not ratified
([[feedback_niyamavali_rulebook_not_spec]]).

## ⭐ FOUND FACTS

**The app (`apps/mobile`):**
- **F1 — versions:** Expo `~55.0.28`, expo-router `~55.0.17`, expo-linking `~55.0.16`, react-native `0.83.6`, React `^19.2.0` (19.2.7),
  `@react-navigation/native` 7.2.5 (`package.json:24,38,45,47,54,56`); `main` = `expo-router/entry`; new architecture on;
  `experiments.typedRoutes: true` (`app.json:60-62`) ⇒ `router.replace` takes an `Href`, ⛔ not a plain string
  ([[project_mobile_android_emulator_setup]]).
- **F2 — CNG:** `android/` and `ios/` are gitignored (`apps/mobile/.gitignore`) ⇒ link settings go in app config, ⛔ not in native files.
  `app.json` has ⛔ no `ios.associatedDomains`, ⛔ no `android.intentFilters`, ⛔ no `owner`, ⛔ no `extra.eas.projectId`; ⛔ no `app.config.*` exists.
  `eas.json` has `development` / `preview` / `production` profiles, ⛔ no `env` blocks, an empty `submit.production` (`eas.json:4-32`).
- **F3 — the guard** (`app/_layout.tsx:110-133`): a `useEffect` over `useSegments()` — termination notice → `/(auth)/terminated`
  (`:115-126`); ⛔ no session and ⛔ not in `(auth)` → `/(auth)/login` (`:127-129`); session and in `(auth)` → `/(tabs)` (`:130-131`).
  `otp.tsx:38-39` hard-codes `/(tabs)`. ⛔ no `returnTo` / `next` anywhere (grep empty). `unstable_settings.initialRouteName: '(tabs)'`
  (`:36-39`) gives a cold-start link a back stack.
- **F4 — ⛔ no incoming-URL code**: ⛔ no `+native-intent.tsx`, ⛔ no `Linking.addEventListener` / `getInitialURL` / `useURL`; every `Linking` use is
  OUTBOUND (`lib/upi-intent.ts:72,83`, `CallHelplineCTA.tsx:23`, …). ⭐ expo-router consumes the launch / incoming URL by PATH natively once
  the OS hands it over — ⛔ no `linking` config is needed for a verified https link.
- **F5 — route collisions:** route GROUPS vanish from the URL ⇒ TEN `…/index.tsx` files already resolve to `/`, and two root-level
  dynamic routes (`(helpdesk)/[ticketId].tsx`, `(polls)/[surveyId].tsx`) catch ANY single segment. ⇒ an app-link path must be a REAL
  segment (`app/(peer-request)/peer-request.tsx` → `/peer-request`), ⛔ not a group-only file. `app/+not-found.tsx` is still the template
  (English *"Oops!"*).
- **F6 — one Pariwar per session**: the access JWT carries `pariwar_id` (`apps/api/src/plugins/jwt/index.ts:27-33`); the app stores ONE
  `pariwarId` (`lib/session.ts:20,29-59`); multi-Pariwar selection is ⛔ not implemented (`app/(auth)/otp.tsx:70-72`) ⇒ §4.7 item 2 (scope
  switch) has ⛔ no reachable case today — AL6 records it.
- **F7 — mobile tests** are pure-logic and source-scan only (`vitest.config.ts:10-15`, `tests/unit/**/*.test.ts`, node env; ⛔ no screen
  renderer; route-tree tests read the directory — `tests/unit/sahyog-vivran-entry.test.ts:160-165`) ⇒ a device proof is a go-live record
  (AL12), ⛔ not a CI test.

**The public site and hosting:**
- **F8 — `apps/public`**: Astro 6.4.8 + `@astrojs/node` 10.1.4 standalone, `output: 'server'` (`astro.config.mjs:16-33`); `site` =
  `PUBLIC_SITE_ORIGIN ?? 'https://twt.org'` (`:21` — a code default, ⛔ not a Trust domain); ⛔ no `public/` dir, ⛔ no middleware; each page sets
  its own `Cache-Control` (`404.astro:16`); robots by `<meta>` in `PublicShell.astro:60`.
- **F9 — why the files must be ENDPOINTS, ⛔ not static:** Astro routes `.well-known` despite its dot (`node_modules/astro/dist/core/routing/
  create-manifest.js:95`); a static or PRERENDERED file goes through `send`, whose `mime.lookup('apple-app-site-association')` is
  `application/octet-stream` (verified) — Apple requires `application/json`.
- **F10 — the "two-route rule"** (`apps/api/src/modules/public-pages/routes.ts:43-50`) governs unauthenticated API GETs in `apps/api`;
  a page making ⛔ no API call does ⛔ not touch it. A fallback page that RESOLVED the code would (a fourth route + an oracle).
- **F11 — the PII-scrape gate** (`packages/contracts/scripts/check-pii-scrape.ts`) fails CI for an undeclared `.astro` page (both
  directions `:124-133`), indexing (`:136`), cache policy (`:149`, fail-closed); matrix
  `packages/contracts/public-pages/public-vs-private-matrix.yaml` (`/404` entry `:302-310` is the template). ⚠ It collects ONLY `.astro`
  files (`:69-88`) ⇒ the two `.ts` endpoints are invisible to it ([[feedback_gate_scope_semantic_coverage]]) ⇒ AL8.
- **F12 — hosting:** GitHub Actions → Artifact Registry → Dokploy (`.github/workflows/deploy-prod.yml:57-70`); Traefik rules
  `compose.yaml:31,37,56` (`/api/v1`, `/admin`, `/p/`); the `public` service has ⛔ no `environment:` block (`DATABASE_URL`,
  `PUBLIC_API_ORIGIN` read but ⛔ not wired); `ADMIN_APP_ORIGIN` is also absent from the jobs block (`:44-47`).
- **F13 — the edge:** `infra/cloudflare/zone.tf:14-18` (SSL strict, always HTTPS — fine), `:23` `browser_check = "on"`; `waf.tf:50-66`
  challenge / block on bot score when `enable_bot_management` (default false, `:33`). ⛔ No domain committed (`zone_name` ⛔ no default,
  `variables.tf:25-26`). Logpush records `ClientRequestPath` (`observability.tf:21`) ⇒ the code lands in edge logs (AL4).

**Config and governance:**
- **F14 — the base-URL precedent is `ADMIN_APP_ORIGIN`** (6.25, `-299` RE7): an env var read at boot (`apps/jobs/src/boot.ts:630`),
  validated EVERY run by `resolveAdminAppOrigin` (`apps/jobs/src/scheduler/staff-email-config.ts:103-121` — `https:` only, ⛔
  credentials / path / query / fragment, raw value === origin, else `null`), `null` ⇒ hold `config:admin_app_origin_invalid`
  (`claim-suspicion-staff-emails.ts:101,275,382-385`); documented `apps/jobs/README.md:128`. ⚠ A Secret Manager key named
  `app_links.base_url` would hit the recorded dotted-secret-id defect (deferred-work: *"GCP secret ids do not allow (`[A-Za-z0-9_-]`);
  INVALID_ARGUMENT is not NOT_FOUND"*) ⇒ a permanent `'fault'` hold ⇒ AL5.
- **F15 — the push grammar** `packages/contracts/src/deep-links/deep-link.ts` (`twt://p/<pariwarId>/<resource>[/<id>]`, closed
  `DeepLinkResource`, `:33-138`) has producers (`packages/channels/src/render.ts:29,134-137`) and ⛔ no consumer; the app's scheme is
  `twtp05` ⇒ AL13.
- **F16 — ⛔ no rule forbids a link in a member text**; today's texts are link-free by drafting only (`-295` RB1 etc.). The only "⛔ no deep
  link" rule is the termination notice's (`2026-08-10-097`, Story 10.19) — ⛔ not touched.

## ⚖️ Build decisions AL1–AL16 (PROPOSED — answered by BigDev at Task 0.2, committed by ONE author-commit at Task 0.3)

- **AL1 — identity is config, ⛔ not invented.** `apps/mobile/app.json` → `app.config.ts` (static base + a function of the EAS build
  profile and env): `name`, `slug`, `scheme`, `ios.bundleIdentifier`, `android.package` keep TODAY's prototype values in `development` /
  `preview`; `production` reads `APP_IDENTITY_*` env (via `eas.json` `env` blocks) and FAILS THE BUILD when unset (⛔ never a silent prototype
  production build). This story ⛔ never chooses the production identity (D-13 / OQ-1 — BigDev / the Trust; an Android package can ⛔ never
  change after the first Play upload). ⚠ Changing the identity later orphans the Firebase app registered under `…p0prototype`
  (`docs/native-stack-validation/task-10-execution-runbook.md:49`) — recorded on the roster row (AL12).
- **AL2 — ONE app-link path list.** NEW `packages/contracts/src/app-links/` (barrel-exported): `APP_LINK_PATHS = { peerRequest:
  '/peer-request' } as const` (closed; a new path = a deliberate grammar change, the `DeepLinkResource` discipline); `APP_LINK_CODE_PARAM =
  'c'`; `buildAppLinkUrl(baseUrl, key, code)` → `<base><path>?c=<code>` (the code `[A-Za-z0-9]{12}` asserted, URI-safe by construction);
  `parseAppLinkCode(params)`; the pure builders of the two verification-file bodies from a LIST of app identities (`{ iosAppId:
  '<TEAMID>.<bundleId>' }`, `{ androidPackage, sha256Fingerprints[] }`) and `APP_LINK_PATHS` (AASA `components` = `{"/": path, "?": {"c":
  "?*"}}` per path; assetlinks = one `handle_all_urls` statement per package). ⭐ Consumed by 6.27 (the sender's `{link}`, the app route),
  the app config (intent-filter `pathPrefix`es), the public site (the files, the fallback pages). ⛔ No second copy (Invariant 4).
- **AL3 — the URL shape: `https://<domain>/peer-request?c=<code>`** — fixed host, fixed path, the code ONLY in the query (F-fact 2;
  whitelisted as `https://<domain>/peer-request?`); ⛔ no shortener (RBI's 2025 circular discourages unbranded shorteners; a redirect hop also
  breaks link interception); ⛔ no redirect anywhere on the path.
- **AL4 — the code in logs.** App code ⛔ never logs it (6.27 PM21 (e)); the edge and Traefik access logs DO record the path + query (F13) —
  RECORDED as a known residual, ⛔ not claimed absent. The code is ⛔ not a credential (PM21 (a)/(d)), so the residual exposes ⛔ nobody's data.
- **AL5 — `APP_LINKS_BASE_URL` is an ENV VAR in `apps/jobs`** (the `ADMIN_APP_ORIGIN` shape, F14): read at boot, passed as a dep,
  validated EVERY run by a NEW `resolveAppLinksBaseUrl` beside `resolveAdminAppOrigin` (`https:` only, an ORIGIN — ⛔ no path / query /
  credentials / fragment); invalid / unset ⇒ `null` ⇒ the consumer's sweep holds `config:app_links_base_url_invalid` and alarms; ⛔ no code
  default (unlike the two `twt.org` defaults, F8). Documented in `apps/jobs/README.md`; added to the jobs block of `compose.yaml`. ⚠
  SUPERSEDES 6.27 PM21 (b)'s *"read like the template ids (Secret Manager)"* — 6.27 v1.3 carries the change (PM21 is ⛔ not yet committed, so
  ⛔ no decision is superseded).
- **AL6 — the login keeps its place** (§4.7 item 1). The root guard (`_layout.tsx:127-129`), when it sends a member without a session to
  login, records the requested `Href` (path + params) in MEMORY (a module-level holder, ⛔ not MMKV / SecureStore — a link target ⛔ never outlives the
  app process); after a successful login (`otp.tsx:38-39`) and in the guard's own `:130-131` branch, replace to it IF it is an
  `APP_LINK_PATHS` path (an allowlist — ⛔ not an arbitrary path), else `/(tabs)`; it is consumed once. The termination branch (`:115-126`)
  WINS over any target. §4.7 item 2 (scope switch): ⛔ not reachable — one Pariwar per session (F6); the consumer's resolver 404s a foreign code
  (PM21 (d)) — RECORDED. §4.7 item 3: the consumer's screen.
- **AL7 — the app's link settings** (in `app.config.ts`, production profile only, from `APP_LINKS_HOST`): `android.intentFilters` =
  `[{ action: 'VIEW', autoVerify: true, data: APP_LINK_PATHS.map(p => ({ scheme: 'https', host, pathPrefix: p })), category:
  ['BROWSABLE', 'DEFAULT'] }]`; `ios.associatedDomains = ['applinks:<host>']`. Unset host in production ⇒ ⛔ no link settings (the app still
  builds; links open the browser → the fallback page). `development` MAY set `applinks:<host>?mode=developer` (Apple-CDN bypass) — ⛔ never in
  production.
- **AL8 — the two verification files** = server-rendered Astro endpoints `apps/public/src/pages/.well-known/apple-app-site-association.ts`
  and `assetlinks.json.ts` (⛔ no `prerender` — F9), `GET` only, `200` + `Content-Type: application/json` + `Cache-Control: public,
  max-age=3600`, bodies from AL2's builders over env `APP_LINKS_IOS_APP_IDS` (comma list of `<TEAMID>.<bundleId>`) and
  `APP_LINKS_ANDROID_APPS` (a JSON list `[{ package, sha256: [...] }]`, validated by a zod schema); unset / invalid ⇒ **404** (⛔ never a body
  that verifies the wrong app). ⚠ The PII-scrape gate cannot see `.ts` endpoints (F11) ⇒ the handlers get their own tests (content type,
  body shape, 404 when unset, ⛔ no member data) AND the gap is recorded as a deferred-work item (gate scope) — ⛔ not widening the gate here
  (ADR-0013's gate is its own change).
- **AL9 — hosting** (dev wires, operator applies — ADR-0011 §5): `compose.yaml` gains Traefik rules sending ``PathPrefix(`/.well-known/`)``
  and every `APP_LINK_PATHS` prefix to the `public` service, plus its missing `environment:` block (F12) and `APP_LINKS_BASE_URL` in
  the jobs block; `infra/dokploy/README.md` documents them. ⚠ The as-built `/p/` rule vs root-level pages mismatch (F12) is RECORDED, ⛔
  re-architected here.
- **AL10 — the edge**: `infra/cloudflare/waf.tf` gains a SKIP for `/.well-known/*` from bot management and the browser check (verifiers
  are bots; a challenge is ⛔ not a 200). ⚠ ADR-0010's DPDPA clearance (Row 3) is scoped to the edge design *"as recorded"* — a narrow skip for
  two public, data-free files is our reading of ⛔ not material; RECORDED in the roster row's notes for the operator to confirm, ⛔ not assumed
  silently.
- **AL11 — the fallback page** `apps/public/src/pages/peer-request.astro` (one per `APP_LINK_PATHS` entry; a lockstep test proves each path
  has a page): `PublicShell` with `branding={null}`, `noindex`, `Cache-Control: public, max-age=300` (the body ⛔ never varies), `Referrer-Policy:
  no-referrer` (a store-link click ⛔ never leaks the code); ⛔ never reads `Astro.url.searchParams`; en + hi words: *"Please open the TWT app to
  answer. Don't have the app? Install it, then open the link in your text again — or call the helpline number in your text."*; store
  buttons ONLY when env `APP_STORE_URL_ANDROID` / `APP_STORE_URL_IOS` are set (⛔ no dead link). ⛔ No helpline number on the page (apps/public
  has ⛔ no helpline source; the text carries it — ⛔ never a second source). Matrix entry: `route: /peer-request`, `fields: []`, `noindex`, its cache
  policy. Friction budget: a page with ⛔ no scoped style adds ~0.
- **AL12 — the go-live record**: ONE new decision-authored roster row (next free number after 6.27's Rows 27 / 28; expected **Row 29**)
  `app-links-live`, closing on ALL of: (a) the production app identity decided and in `APP_IDENTITY_*` (D-13 / OQ-1); (b) the Trust's
  domain set in `APP_LINKS_BASE_URL`, `APP_LINKS_HOST`, `PUBLIC_SITE_ORIGIN`, `EXPO_PUBLIC_PUBLIC_SITE_ORIGIN` (ONE fact, four settings —
  documented, ⛔ not extracted, [[feedback_no_premature_package]]); (c) Apple Team ID + the Play App Signing (and upload-key) fingerprints in
  the env; (d) both files verified (`adb shell pm get-app-links <pkg>` shows `verified`; Apple's CDN
  `https://app-site-association.cdn-apple.com/a/v1/<domain>` returns the file); (e) a DEVICE PROOF on Android and iOS: a link opens the
  screen (logged in, and logged out → login → the screen) and, without the app, the fallback page; (f) the URL's fixed part whitelisted
  with the SMS operator(s) (one DLT-sheet line); (g) the Traefik and Cloudflare changes applied (AL9 / AL10 — incl. the operator's
  confirmation on Row 3). 6.27's Row 27 (e) points at this row.
- **AL13 — the `twt://` push grammar is ⛔ not touched** — push stays inert (⛔ no device token is registered — 6.27 FIVE FACTS #1); the scheme
  mismatch (`twtp05` vs `twt`) and D8 stay open; AL1's `scheme` reads config so a later push story can set `twt` — RECORDED.
- **AL14 — a dignified "not found"**: `app/+not-found.tsx` becomes bilingual (en + hi), says the page could not be opened, offers *"Go to
  home"* and the shared `CallHelplineCTA` (§4.7 *"Never hard 404"*); ⛔ no crash on an unknown link path. Hindi agent-authored (`$comment`
  marker; human review rides 6.27's Row 28 — ⛔ not a new row).
- **AL15 — RECORD, ⛔ not fix: the typed-variable rule** (F-fact 3): a deferred-work item naming all twelve drafted templates and the code
  that pins them (`claim-correction-sms-templates.ts`, `suspicion-notice-sms-templates.ts` and their lockstep tests); ⚠ the templates must
  be retagged BEFORE BigDev submits them — a backlog row is PROPOSED to BigDev (Task 0.2), ⛔ not minted silently.
- **AL16 — ⛔ No app-link path collides with an existing route** — a source-scan test over `apps/mobile/app/` proves each `APP_LINK_PATHS`
  entry is served by exactly ONE route file whose URL path equals it (group segments stripped), and that ⛔ no other file claims it (F5).

## Acceptance Criteria

1. **AC1 — governance first.** ⛔ No code before the AL1–AL16 author-commit lands alone; the epics.md `### Story 6.30` entry, the roster
   row (AL12) and the DLT-sheet whitelisting line follow it.
2. **AC2 — one path list** (AL2): `APP_LINK_PATHS`, `buildAppLinkUrl`, `parseAppLinkCode` and the two body builders exist in contracts with
   unit tests (URL form `<origin>/peer-request?c=<12 base62>`; a malformed code refused; AASA `components` and assetlinks statements for 1
   and for 2 app identities; ⛔ no duplicate paths).
3. **AC3 — the app config** (AL1 / AL7): `app.config.ts` yields today's prototype config byte-equivalent for `development` / `preview`
   (snapshot test of the resolved config); `production` without `APP_IDENTITY_*` THROWS; with `APP_LINKS_HOST` set it carries one
   `autoVerify` https intent filter per path and `applinks:<host>`; without it, ⛔ no link settings.
4. **AC4 — the login keeps its place** (AL6): a member without a session opening `/peer-request?c=…` is sent to login and, after the OTP,
   lands on `/peer-request?c=…`; a non-allowlisted target lands on `/(tabs)`; the termination notice wins; the target is consumed once
   (pure-logic tests of the holder + a source-scan pin that both replace sites use it).
5. **AC5 — the two files** (AL8): each endpoint returns `200`, `application/json`, the builder's exact body for configured identities;
   `404` when unconfigured or invalid; ⛔ no redirect; ⛔ no `prerender`; ⛔ no member data (tests on the handlers); the gate-scope gap recorded.
6. **AC6 — the fallback page** (AL11): `/peer-request` (with or without `?c=`) renders the static words in both locales, `noindex`,
   `no-referrer`, its `Cache-Control`; ⛔ never reads the query, ⛔ no API call, ⛔ no store buttons unless configured; declared in the matrix — the
   PII-scrape gate passes.
7. **AC7 — ⛔ no collision, ⛔ no crash** (AL14 / AL16): the route-map test passes for every `APP_LINK_PATHS` entry; `+not-found` is bilingual
   with the helpline CTA.
8. **AC8 — hosting and edge wired** (AL9 / AL10): the Traefik rules, the `public` service env, `APP_LINKS_BASE_URL` in the jobs block and
   the Cloudflare skip are in `infra/` with their README lines; `terraform validate` passes; ⛔ not applied by this story.
9. **AC9 — the base URL** (AL5): `resolveAppLinksBaseUrl` accepts exactly an https origin and returns `null` otherwise (table test incl.
   `http:`, a path, a query, credentials, a trailing slash, blank); wired at boot as a dep for 6.27's sweep.
10. **AC10 — the records**: the roster row (AL12), the DLT-sheet line (AL12 (f)), the deferred-work items (AL8's gate scope, AL15's typed
    variables, AL13's scheme / D8 note, D-13 pointed at the row), 6.27's Row 27 (e) pointer; `pnpm ci:local` green.

## Tasks / Subtasks

- [ ] **Task 0 — governance FIRST (AC1).** ⛔ No code.
  - [ ] 0.1 Re-check `git diff --name-only a05ce150..HEAD -- packages apps infra scripts`; re-read any cited file that moved.
  - [ ] 0.2 Put AL1–AL16 to BigDev (short option summaries — the 6.24b / 6.29 form), incl. AL15's proposed row; record the answers here.
  - [ ] 0.3 ONE author-commit recording them, committed ALONE ([[project_decision_log_writes_user_inserted]] — stage in the scratchpad,
        try the insert first).
  - [ ] 0.4 epics.md `### Story 6.30` (after 6.29; a dated source line, ⛔ never a merge fence); roster row (AL12); DLT-sheet line for the
        URL whitelisting; sprint ledger line ([[project_sprint_status_safe_prepend]]).
- [ ] **Task 1 — contracts `app-links` (AC2).** `packages/contracts/src/app-links/{index.ts,paths.ts,verification.ts,README.md}`; barrel
      export; unit tests; ⛔ no import of `@twt/domain` ([[project_contracts_domain_bundle_boundary]]); run vitest — contracts tests are outside
      tsc ([[project_contracts_tests_outside_tsc]]).
- [ ] **Task 2 — mobile config (AC3).** `app.json` → `app.config.ts` (+ `eas.json` `env` per profile); the resolved-config snapshot test;
      `expo config --type public` checked for each profile in the Dev Agent Record; ⛔ no native dirs committed.
- [ ] **Task 3 — the login keeps its place (AC4).** `lib/link-target.ts` (the in-memory holder + allowlist over `APP_LINK_PATHS`); the
      guard and `otp.tsx` changes typed as `Href`; tests.
- [ ] **Task 4 — not found + the route-map test (AC7).** `+not-found.tsx` bilingual + `CallHelplineCTA`; mobile i18n keys en + hi
      (`$comment`); the AL16 source-scan test.
- [ ] **Task 5 — the two endpoints (AC5).** `apps/public/src/pages/.well-known/*.ts`; env parsing (zod); handler tests.
- [ ] **Task 6 — the fallback page (AC6).** `apps/public/src/pages/peer-request.astro`; public i18n en + hi; matrix entry; a lockstep test
      that every `APP_LINK_PATHS` entry has a page AND a matrix entry; `pnpm` PII-scrape gate run.
- [ ] **Task 7 — the base URL (AC9).** `resolveAppLinksBaseUrl` in `apps/jobs/src/scheduler/` (beside `staff-email-config.ts`); boot
      wiring; README row; table test.
- [ ] **Task 8 — infra (AC8).** `infra/dokploy/compose.yaml` + README; `infra/cloudflare/waf.tf` skip + README; `terraform fmt -check` /
      `validate`.
- [ ] **Task 9 — records and close (AC10).** Deferred-work items (AL8, AL13, AL15; D-13 → the row); 6.27's Row 27 (e) pointer (if 6.27's
      Task 0.6 has landed — else a note in 6.27's file); this file's Change Log + File List; `pnpm ci:local` green — run it, paste the summary.

## Dev Notes

### ⚠ TRAPS
1. **The fallback page shows ⛔ nothing about anyone** — ⛔ no name, ⛔ no claim, ⛔ no Pariwar branding, ⛔ no code echo, ⛔ no "your request is …". A
   page that resolved the code would be an oracle AND a fourth public API route (F10).
2. **⛔ Never prerender the `.well-known` endpoints, ⛔ never put them in `public/`** — octet-stream (F9); Apple silently ignores the file.
3. **⛔ Never invent the identity.** ⛔ Never `org.teacherswelfaretrust.twt` "or equivalent" from D-13's prose — it is an example, ⛔ not a decision.
4. **⛔ Never persist the link target.** In memory only, consumed once, allowlisted — a stored target could replay a stale request after a
   different member logs in on the same phone.
5. **A route GROUP is ⛔ not a URL segment** (F5) — `app/(peer-request)/[code].tsx` would be `/:code`, a third root-level catch-all.
6. **Query string, ⛔ not path** (SIX FACTS #2) — a path-segment code ⛔ cannot be whitelisted.
7. **The edge challenge fails verification SILENTLY** (F13) — prove the skip on a real request (`curl -A` a non-browser UA) in the device
   proof (AL12 (d)).
8. **Android ≤ 11 needs EVERY host in a filter to verify; Android 15+ re-verifies and changes can take up to 7 days; Apple's CDN lags ~24 h**
   — the device proof is done AFTER the files have been live a day, and recorded with dates.
9. **`typedRoutes`** — `router.replace` rejects a plain string; build the `Href` from `APP_LINK_PATHS` + params.
10. **Markdown emphasis closes a JSDoc** — grep `\*\*/` after doc-block edits ([[project_markdown_emphasis_closes_jsdoc]]); **Prettier is
    ⛔ not enforced** — hand-format ([[project_prettier_not_enforced]]).

### Reuse map
| Need | Reuse |
|---|---|
| base-URL validation + hold | `resolveAdminAppOrigin` (`apps/jobs/src/scheduler/staff-email-config.ts:103-121`) |
| public page shell / 404 shape | `PublicShell.astro`, `404.astro`, the matrix `/404` entry |
| helpline CTA | `components/common/CallHelplineCTA.tsx` |
| closed-enum grammar discipline | `packages/contracts/src/deep-links/deep-link.ts` |
| route-tree source scan | `apps/mobile/tests/unit/sahyog-vivran-entry.test.ts:160-165` |
| roster row format | `inventory-roster.md` Rows 22–26 |

### Testing standards
Contracts: vitest unit (builders, parser, bodies). Mobile: pure-logic + source-scan (node vitest, `tests/unit/**/*.test.ts`); the
resolved-config snapshot. Public: endpoint handler tests (status, content type, body, 404); the PII-scrape gate; the page/matrix lockstep.
Jobs: the validator table. Infra: `terraform fmt -check` + `validate`. ⛔ No device behaviour in CI — it is AL12 (e). `pnpm ci:local` before
review.

### Project structure notes
NEW: `packages/contracts/src/app-links/`; `apps/mobile/app.config.ts` (replaces `app.json`), `apps/mobile/lib/link-target.ts`;
`apps/public/src/pages/.well-known/{apple-app-site-association,assetlinks.json}.ts`, `apps/public/src/pages/peer-request.astro`.
UPDATE: `apps/mobile/app/_layout.tsx`, `app/(auth)/otp.tsx`, `app/+not-found.tsx`, `eas.json`; `apps/jobs/src/boot.ts`,
`apps/jobs/README.md`; `infra/dokploy/compose.yaml` + README; `infra/cloudflare/waf.tf` + README; the PII matrix.
⚠ 6.27 builds `app/(peer-request)/peer-request.tsx` (its PM11 / PM21 (c), v1.3) — ⛔ not this story; AL16's test pins it once it exists.

### Sequencing with 6.27 and 6.31
⭐ 6.30 is ⛔ not blocked by any Panel question; 6.27 is. ⇒ **6.30 lands FIRST**; 6.27's sender and app route CONSUME `APP_LINK_PATHS` /
`buildAppLinkUrl` / `APP_LINKS_BASE_URL`. ⚠ If 6.27 reaches its Task 2 before 6.30 is `done`, 6.27 STOPS and asks — ⛔ never re-creates the
list ([[feedback_circular_deferral_between_sibling_stories]]: siblings must ⛔ never defer to each other). 6.31 (the WhatsApp reminder) reuses the same
link — ⛔ no new path.

### Previous story intelligence
- **6.25**: `ADMIN_APP_ORIGIN` — the env + per-run validator + hold pattern this story copies (AL5).
- **6.27** (v1.2/1.3): the consumer; its Trap 1–3 fences hold for anything a link opens.
- **11b.3 / 11b.1**: the public-pages two-route rule and the PII-scrape matrix — every public page is declared.

### Git intelligence
`a05ce150` 6.27 created (branch `story/6-27-…`) · `5946e411` 6.29 code review · `36eb7b46` 6.29 build — house order: decision entry →
records → build → review; REBASE-merge ([[project_story_automator_ops]]). This story's branch `story/6-30-app-links-open-the-app-from-a-text`
is STACKED on 6.27's (the row lives there) — rebase onto `main` once 6.27's story commit merges.

### Latest tech information (fetched 2026-10-10 — re-check at Task 0.1)
- **Android App Links** (developer.android.com, `verify-android-applinks`): `assetlinks.json` over HTTPS, `application/json`, ⛔
  redirects; with Play App Signing the GOOGLE signing-key fingerprint is required (Play Console → App signing → "Digital Asset Links JSON");
  add the upload / EAS key for sideloaded preview builds; Android 12+ verifies per host and, on failure, opens the browser (⛔ no chooser);
  `adb shell pm verify-app-links --re-verify <pkg>`, `pm get-app-links <pkg>`.
- **iOS Universal Links** (Apple *Supporting associated domains*; Expo `linking/ios-universal-links`): AASA at
  `/.well-known/apple-app-site-association`, ⛔ no extension, `application/json`, ⛔ no redirects, < 128 KB; `applinks.details[].appIDs` +
  `components` (`/`, `?`, `#`, `exclude`); fetched via Apple's CDN (~24 h lag) at install / update; `ios.associatedDomains:
  ['applinks:<host>']`; needs a paid Apple Developer Program account (the Team ID).
- **Expo Router (SDK 55)**: a verified https link routes by PATH; groups ⛔ never appear in URLs; query params arrive via
  `useLocalSearchParams()`; `+native-intent.tsx`'s `redirectSystemPath` can rewrite legacy URLs (⛔ not needed here); `Stack.Protected`
  redirects to sign-in but does ⛔ not keep the target — AL6 builds it.
- **India SMS**: TRAI URL / APK / OTT whitelisting (in force 1 Oct 2024; non-whitelisted ⇒ rejected); dynamic part only after `?`;
  subdomains whitelisted separately; TRAI 18 Nov 2025 typed variables (`{#url#}`, `{#cbn#}`, …); ⚠ the DLT category (Transactional vs
  Service Implicit) is to be confirmed with the provider.

### References
- Architecture §4.7 (routing; deep-link landing checks), §3.4; ADR-0010, -0011, -0013, -0020 cl.4, -0022; PRD OQ-1, FR-60, FR-61.
- Story 6.27 (PM11, PM16, PM21 — v1.3); Story 6.25 (RE7); deferred-work D-13, D8, the dotted-secret-id item.
- `docs/launch-gate-inventory/inventory-roster.md`, `dlt-template-requests-6-19.md`; `packages/contracts/src/deep-links/`.

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List
- 2026-10-10 — created by `bmad-create-story 6.30` (Opus 5.5): ultimate context engine analysis completed — comprehensive developer guide
  created. Three read-only research passes at `a05ce150` (+ platform rules fetched 2026-10-10); AL1–AL16 PROPOSED; ⛔ no Panel question.

### File List

## Change Log
| Date | Version | Change |
|---|---|---|
| 2026-10-10 | 1.0 | Created (`bmad-create-story 6.30`); pinned `a05ce150`; AL1–AL16 proposed. |
