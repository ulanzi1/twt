---
baseline_commit: a05ce150
---

<!--
⭐ PINNED 2026-10-10 (`bmad-create-story 6.30`) to `a05ce150` on `story/6-27-peer-mesh-sending-replies-and-date-of-death` (= `main`
`5946e411` + 6.27's story commit — the sprint row `6-30` exists only there until 6.27's branch merges). Every `file:NNN` is AS OF
`a05ce150` (code identical to `main` `5946e411`), derived by three read-only research passes (the mobile app's link readiness; the
public site, hosting and config; the governance trail + current platform rules, fetched 2026-10-10) and spot-checked by the author.
⭐ v1.1 (2026-10-10): a fresh-context VALIDATE (four read-only reviewers at `877e5864` — `git diff --name-only a05ce150..877e5864 --
packages apps infra scripts` is EMPTY, so every cited line still holds) found 1 BLOCKER, 3 HIGH, 9 MEDIUM, 8 LOW; all applied below.
⚠ Before Task 1: `git diff --name-only a05ce150..HEAD -- packages apps infra scripts` — re-read any cited file in that list.

STATUS: `ready-for-dev`. ⛔ NO CODE until Task 0.3's author-commit (AL1–AL16, answered by BigDev at Task 0.2) is committed ALONE
([[feedback_governance_commits_precede_implementation]]).
⭐ §0 gate (template `trustee-panel-routing-note-TEMPLATE.md`): ⛔ no Panel question. Every AL strips to "the code should do X" — how a
link opens the app, where two public files live, what a fallback page says (it names ⛔ no one and shows ⛔ nothing about anyone). What
the TEXT says and whether members are texted at all is RULED — `2026-10-10-303` Q1 A (the five are texted, naming the member, with the
link and the helpline, plus one WhatsApp reminder at 48 h, in each member's preferred language — the `-303` rider — ⚠ narrowed for a
time by `2026-10-10-305` §2 item 2 to the Pariwar's default language until row 6-35's switch exists; the Panel CONFIRMED it — `2026-10-10-310` CF1 A) and
`2026-10-10-304` (the questions; *"a few short questions"*). ⚠ It BECOMES the Panel's if the fallback page shows ANYTHING about a
member, a death or a claim (Trap 1), or a link is used to reach anyone the Panel has ⛔ not ruled may be texted.
⚠ Two calls here are BigDev's / the Trust's, ⛔ not the Panel's and ⛔ not the author's: the production app IDENTITY (name, bundle id,
package — PRD OQ-1, deferred-work D-13; an Android package can ⛔ never change after the first Play upload) and whose Apple / Play
accounts are used. ⇒ this story builds everything with them as CONFIG and records them as go-live conditions on its roster row (AL1,
AL12 (a)); it ⛔ never invents them. ⭐ BigDev (2026-10-10) chose ⛔ no separate sprint row for the identity — it stays a BigDev decision
owed before the first production build, carried on Row 29 (a).

GLYPH REGISTER, ADDRESSING RULE: as 6.27 — `⛔` sits ONLY on a negation word · `⭐` = key fact / action · `⚠` = hazard. ⛔ No `file:NNN`
into `.decision-log.md`, `deferred-work.md` or `sprint-status.yaml`. `file:NNN` is used ONLY for code / config, as of `a05ce150`.
LETTERS: `AL` = this story's build decisions (PROPOSED); `F` = FOUND facts; 6.27's `PM` cited as such. `AL` is used by ⛔ no earlier story
(grepped 2026-10-10). `V-` = the v1.1 validate's finding ids (B1, H1–H3, M1–M9, L1–L8).
-->

# Story 6.30: A Link in a Text Opens the App at the Right Screen — App Links, Universal Links, Two Public Files, a Plain Fallback Page, and the Login That Keeps Its Place `[PRIMITIVE]`

Status: ready-for-dev

> ⭐⭐ **WHAT THIS STORY IS, IN ONE PARAGRAPH.** Story 6.27's text to the five neighbours carries a link that should open the question
> screen in the TWT app (BigDev, 2026-10-10: *"separate story"*; ratified with the text in `-303` Q1 A). Today ⛔ no link can open the
> app: it still carries the P0 prototype's identity, reads ⛔ no incoming URL, has ⛔ no Android App Links or iOS Universal Links, ⛔ no
> verification file is hosted, the public site's hosting rule reaches only `/p/*`, and the login wall throws away the screen a member
> asked for. This story builds the **plumbing**: ONE shared list of app-link paths (a JSON data file, so the app config can load it);
> the app's link settings generated from config; a THIN app route shell for `/peer-request` that 6.27a fills; the two `/.well-known/`
> files served by the public site; a plain bilingual fallback page for a phone without the app; the login that returns to the requested
> screen; a dignified "not found"; the hosting and edge rules scoped to exact paths; ONE base-URL validator (`APP_LINKS_BASE_URL`); and
> the go-live record (Row 29). ⭐ Its first and only consumer is 6.27's `/peer-request` (PM21). ⛔ Nothing here sends a text.

> ⚠⚠ **SIX FACTS — read before anything else.**
> 1. ⭐ **The app's production identity is UNDECIDED** — `apps/mobile/app.json:3-23` is the prototype's (`"TWT P0-5 Prototype"`,
>    `twtp05`, `org.teacherswelfaretrust.p0prototype`); deferred-work D-13 says it *"must be updated to production values … before the
>    first EAS Build profile run or App Store / Play Store submission"*; the PRD's brand is a working title (OQ-1, *"decision blocking
>    before app-store listing"*); ⛔ no Apple Team ID and ⛔ no Play signing fingerprint is recorded anywhere. Both verification files are
>    KEYED by exactly these values ⇒ AL1: everything reads them from config; ⛔ no value is invented.
> 2. ⚠⚠ **The link's code must be a QUERY STRING, ⛔ not a path segment.** India's operators whitelist a URL's FIXED part; a dynamic URL is
>    registered ending in `?`, and *"dynamic paths before the query string are currently not supported"* (Tanla; MSG91, Fast2SMS say the
>    same; TRAI's whitelisting Direction in force since 1 Oct 2024 — a text with a non-whitelisted URL is REJECTED). ⇒ the link is
>    `https://<domain>/peer-request?c=<code>`, whitelisted as `https://<domain>/peer-request?` (AL3) — 6.27a (v2.5) PM21 carries this form.
> 3. ⚠ **TRAI's 18 Nov 2025 Direction requires TYPED template variables** (`{#numeric#}`, `{#alphanumeric#}` ≤ 40 chars, `{#url#}`,
>    `{#urlott#}`, `{#cbn#}`, `{#email#}`); `{#url#}` and `{#cbn#}` are checked against the whitelist; an untyped template is rejected.
>    ⇒ 6.27c's link is `{#url#}` and its helpline `{#cbn#}`. ⚠ The untyped `{#var#}` is ALSO in the login / step-up OTP template
>    (`packages/channels/src/otp-sms-template.ts:47` — should be `{#numeric#}`), in five whole-body `contentTemplate: '{#var#}'` entries of
>    `packages/channels/src/sms-dlt-registry.ts:60-80`, and in all twelve templates of
>    `docs/launch-gate-inventory/dlt-template-requests-6-19.md` (6.19b, 6.19d, 6.24b — ⛔ none submitted). A rejected OTP template means
>    ⛔ nobody can log in, so ⛔ no link works (AL6). ⭐ BigDev (2026-10-10) minted its OWN row — `6-34-sms-templates-typed-variables` —
>    ⇒ AL15 is a POINTER only; 6.30 retags ⛔ nothing (V-H3).
> 4. ⚠⚠ **The login wall drops the target.** `apps/mobile/app/_layout.tsx:127-129` sends a member without a session to
>    `/(auth)/login`; after the OTP, `app/(auth)/otp.tsx:38-39` and the guard's `:130-131` both `router.replace('/(tabs)')`. Architecture
>    §4.7 item 1 requires *"re-auth flow preserves the deep-link target as the post-auth redirect"* ⇒ AL6.
> 5. ⚠ **The public site is reachable only under `/p/`.** `infra/dokploy/compose.yaml:56` routes ``PathPrefix(`/p/`)`` to the public
>    service while every Astro page sits at the root (`apps/public/src/pages/`) — `/.well-known/…` and `/peer-request` reach ⛔ no
>    service today ⇒ AL9. And the edge may challenge the verifiers — Browser Integrity Check (`infra/cloudflare/zone.tf:23`) and the
>    zone security level are ALWAYS on, the `waf.tf` Rules 2–3 only when bot management is enabled; a challenge is ⛔ not a clean 200, so
>    verification fails SILENTLY ⇒ AL10.
> 6. ⚠ **One app per Pariwar is planned** (FR-61: *"N build configs, N store listings … its own signing key"*; ADR-0020 cl.4: *"each
>    Pariwar's public site is its own per-Pariwar build/domain"*). v1 ships Bihar only ⇒ AL2 / AL8: the files list app identities from
>    config as a LIST (one today), ⛔ not a hard-coded single app; ⚠ but ONE app per host per path (V-L1 — two apps verified for the same
>    host and path give an Android chooser and undefined iOS behaviour) ⇒ at the SECOND Pariwar, the base URL / host becomes per-Pariwar.

## Story

As **a member who has been sent a text with a link**,
I want **tapping the link to open the TWT app at the right screen — after logging in if I have to — or, without the app, a plain page
that tells me how to answer**,
so that **I can do what the message asks in a minute, and ⛔ no web page ever asks me to log in or shows me anything about anyone.**

## The rulings and records this story builds on

| Source | Key | Status |
|---|---|---|
| `2026-10-10-303` Q1 A | each of the five is texted, naming the member, with **the link** and the helpline, plus one WhatsApp reminder at 48 h (row 6-31 — the SAME link); Hindi / English by the Panel's rider | ⭐ Trustee-ratified — the link's substance is ruled |
| `2026-10-10-304` Q6 A | the text says *"a few short questions"* | ⭐ Trustee-ratified — ⛔ no change to this story's fallback copy |
| BigDev 2026-10-10 | the plumbing is a *"separate story"* (this one) | BigDev's call (recorded in the sprint-status row `6-30` comment, 2026-10-10 — ⛔ not in `-305`'s occasion) |
| **`2026-10-10-305`** | §2 item 1 — 6.27 SPLITS into four (6.27a answering, 6.27b warnings, 6.27c sending, 6.27d inspector); §2 item 2 — texts in the Pariwar's default language until row 6-35 (⚠ a temporary narrowing of `-303`'s rider ⇒ CF1 — ✅ confirmed by `2026-10-10-310`); §2 item 5 — rows 6-34 (typed templates) and 6-35, ⛔ no production-identity row (the identity stays BigDev's decision, carried on Row 29 (a)); §4 — roster Rows 27 / 28 / 29 RESERVED | author-commit (BigDev) — CF1–CF3 in the confirm note (⛔ not yet sent) |
| 6.27a v2.5 PM11 / PM21 | the link's code (6.27a's column), the resolver and the `?c=` wiring (6.27c), the shell's content (6.27a) | author (proposed) |
| Architecture §4.7 | deep-link landing: (1) re-auth preserves the target; (2) scope match; (3) revoked ⇒ *"this is no longer available to you"* + helpline, *"Never hard 404"* | architecture (binding) |
| Architecture §3.4 + `-255` F7 | members got ⛔ no ordinary SMS before `-303` — `-303` Q1 A is the widening for the five | ruled (`-303`) |
| ADR-0022 | the public Astro shell: server-rendered, ⛔ no session, ⛔ no per-user branching | ratified |
| ADR-0010 (Row 3) | Cloudflare is the edge; its DPDPA clearance is scoped to the edge design *"as recorded"* | ratified — AL10 records whether an exact-path skip is a material change |
| ADR-0011 §5 | dev wires, operator applies (Traefik / Cloudflare) | ratified |
| ADR-0013 | the PII-scrape gate over public pages | ratified — AL8 / AL11 |
| ADR-0020 cl.4 · FR-60 / FR-61 | per-Pariwar site / domain; separate app per Pariwar | ratified / PRD |
| deferred-work D-13 · PRD OQ-1 | the production identity is owed before the first store build | ⏳ BigDev / the Trust — Row 29 (a) |
| deferred-work D8 · `deep-links/README.md:7` | the mobile deep-link HANDLER is absent; the `twt://` push grammar has ⛔ no consumer | open — AL13 |

## ⭐ THE INVARIANTS

1. **A link carries ⛔ no credential and ⛔ no personal data** — a fixed path and an opaque code; logging in happens ONLY in the app.
2. **⛔ No web page asks for a login, a number, an OTP or any data** — the fallback page is static words and (when they exist) store links.
3. **The fallback page ⛔ never reads, echoes or resolves the code** — ⛔ no API call, ⛔ no database read, ⛔ no language toggle that
   rebuilds links from the request URL (V-H1 — `PublicShell`'s toggle copies every query parameter); a handler test proves the response
   body ⛔ never contains the `c` value (the public-pages "two-route rule" and 6.27 PM21 (d)'s rule — ⛔ never an oracle — both stay intact).
4. **ONE list of app-link paths** — a JSON DATA file (`packages/contracts/src/app-links/app-link-paths.json`) that drives the app's link
   settings, the two verification files, the fallback pages, the route-map test and the senders' URL builder — ⛔ never a second copy
   anywhere (V-B1: the app config CANNOT import TypeScript from `@twt/contracts`).
5. **⛔ No invented identity** — bundle id, package, Team ID and fingerprints come from config; unset ⇒ the verification file is ⛔ not served
   (404), ⛔ never a guess.
6. **A link the app cannot place is ⛔ never a crash and ⛔ never a hard 404** — a path with ⛔ no route of its own lands on a dignified,
   bilingual "not found" with the helpline (§4.7 item 3). ⚠ Precisely: a MULTI-segment unknown path reaches `+not-found`; a ONE-segment
   path is caught by the two root-level catch-alls that exist today (`(helpdesk)/[ticketId].tsx`, `(polls)/[surveyId].tsx` — V-M1) —
   which is WHY every app-link path ships with its own real route (AL16) and the Android filter matches EXACT paths only (AL7).

## 📜 Policy meaning (AI-10-1)

**This story introduces ⛔ no predicate and changes ⛔ none that gates a member's access to a benefit.** It decides how a link opens a
screen; who may see the screen behind it is the consumer's (6.27 PM21 (d): the request's own member only). In the member's terms:
*"a link in a message from the Trust opens the app where it should; it never lets anyone else in, and it never asks you to log in on a
web page."* Niyamavali check: ⛔ not applicable (the Niyamavali does not speak to app links) — and it is ⛔ not ratified
([[feedback_niyamavali_rulebook_not_spec]]).

## ⭐ FOUND FACTS

**The app (`apps/mobile`):**
- **F1 — versions:** Expo `~55.0.28`, expo-router `~55.0.17`, expo-linking `~55.0.16`, react-native `0.83.6`, React `^19.2.0` (19.2.7),
  `@react-navigation/native` `^7.0.0` (`package.json:24,38,45,47,54,56`); `main` = `expo-router/entry`; new architecture on;
  `experiments.typedRoutes: true` (`app.json:60-62`) ⇒ `router.replace` takes an `Href`, ⛔ not a plain string
  ([[project_mobile_android_emulator_setup]]). ⚠ The typed-route types (`.expo/types`) are ⛔ not committed ⇒ a typed `Href` to
  `/peer-request` fails local typecheck until the route file exists — AL16's shell ships it (V-L7).
- **F2 — CNG:** `android/` and `ios/` are gitignored (`apps/mobile/.gitignore:47-48`) ⇒ link settings go in app config, ⛔ not in native
  files. `app.json` has ⛔ no `ios.associatedDomains`, ⛔ no `android.intentFilters`, ⛔ no `owner`, ⛔ no `extra.eas.projectId`; ⛔ no
  `app.config.*` exists. `eas.json` has `development` / `preview` / `production` profiles, ⛔ no `env` blocks, an empty
  `submit.production` (`eas.json:4-32`). ⚠ Local untracked `apps/mobile/android/` and `ios/` dirs exist on developer machines — `expo
  run:*` keeps their stale native config until `expo prebuild --clean` (V-M5).
- **F2b — the app config cannot import the contracts barrel** (V-B1, verified): Expo SDK 55 loads `app.config.ts` through
  `@expo/require-utils` — ONLY the config file is transpiled; its imports use plain Node resolution. `@twt/contracts` has `main:
  ./src/index.ts` and an ESM barrel importing `./_common/index.js` …; `node -e "import('@twt/contracts')"` from `apps/mobile` (Node 22.22)
  fails `ERR_MODULE_NOT_FOUND …/contracts/src/_common/index.js` — and so would `expo start`, `expo prebuild`, `eas build`, `expo export`.
  ⚠ A vitest snapshot of the config resolves through Vite and would PASS, hiding it ⇒ AL2's JSON data file + AC3's `expo config` run.
- **F3 — the guard** (`app/_layout.tsx:110-133`): a `useEffect` over `useSegments()` — termination notice → `/(auth)/terminated`
  (`:115-126`); ⛔ no session and ⛔ not in `(auth)` → `/(auth)/login` (`:127-129`); session and in `(auth)` → `/(tabs)` (`:130-131`).
  `otp.tsx:38-39` hard-codes `/(tabs)`; the signup branch is `otp.tsx:48`. ⛔ No `returnTo` / `next` anywhere (grep empty).
  `unstable_settings.initialRouteName: '(tabs)'` (`:36-39`) gives a cold-start link a back stack.
- **F4 — ⛔ no incoming-URL code**: ⛔ no `+native-intent.tsx`, ⛔ no `Linking.addEventListener` / `getInitialURL` / `useURL`; every
  `Linking` use is OUTBOUND (`lib/upi-intent.ts:72,83`, `CallHelplineCTA.tsx:23`, …). ⭐ expo-router consumes the launch / incoming URL by
  PATH natively once the OS hands it over — ⛔ no `linking` config is needed for a verified https link.
- **F5 — route collisions:** route GROUPS vanish from the URL ⇒ TEN `…/index.tsx` files already resolve to `/`, and two root-level
  dynamic routes (`(helpdesk)/[ticketId].tsx`, `(polls)/[surveyId].tsx`) catch ANY single segment. ⇒ an app-link path must be a REAL
  segment (`app/(peer-request)/peer-request.tsx` → `/peer-request`), ⛔ not a group-only file. `app/+not-found.tsx` is still the template
  (English *"Oops!"*). ⚠ A link to a path with ⛔ no route of its own does ⛔ not reach `+not-found` — it opens a helpdesk or poll screen
  for "peer-request" (V-H2) ⇒ 6.30 ships the route shell (AL16).
- **F6 — one Pariwar per session**: the access JWT carries `pariwar_id` (`apps/api/src/plugins/jwt/index.ts:27-33`); the app stores ONE
  `pariwarId` (`lib/session.ts:20,29-59`); multi-Pariwar selection is ⛔ not implemented (`app/(auth)/otp.tsx:70-72`) ⇒ §4.7 item 2 (scope
  switch) has ⛔ no reachable case today — AL6 records it.
- **F7 — mobile tests** are pure-logic and source-scan only (`vitest.config.ts:10-15`, `tests/unit/**/*.test.ts`, node env; ⛔ no screen
  renderer; route-tree tests read the directory — `tests/unit/sahyog-vivran-entry.test.ts:160-165`) ⇒ a device proof is a go-live record
  (AL12 (e)), ⛔ not a CI test.

**The public site and hosting:**
- **F8 — `apps/public`**: Astro 6.4.8 + `@astrojs/node` 10.1.4 standalone, `output: 'server'` (`astro.config.mjs:16-33`); `site` =
  `PUBLIC_SITE_ORIGIN ?? 'https://twt.org'` (`:21` — a code default, ⛔ not a Trust domain); ⛔ no `public/` dir, ⛔ no middleware; each
  page sets its own `Cache-Control` (`404.astro:16`); robots by `<meta>` in `PublicShell.astro:60`. Server code reads runtime env via
  `process.env` (`directory.server.ts:44`).
- **F8b — `PublicShell`'s language toggle echoes the query** (V-H1): it builds its links from `new URL(Astro.url)` and keeps every query
  parameter (`PublicShell.astro:31-35, 135-138`) ⇒ under `/peer-request?c=X` it would render `href="/peer-request?c=X&lang=hi"` — the code
  in the page. Every existing page picks its locale from `?lang=` or Accept-Language and sets `Vary` ⇒ the fallback page uses ⛔ neither.
- **F9 — why the files must be ENDPOINTS, ⛔ not static:** Astro routes `.well-known` despite its dot (`node_modules/astro/dist/core/
  routing/create-manifest.js:95`); a static or PRERENDERED file goes through `send`, whose `mime.lookup('apple-app-site-association')` is
  `application/octet-stream` (verified) — Apple requires `application/json`.
- **F10 — the "two-route rule"** (`apps/api/src/modules/public-pages/routes.ts:43-50`) governs unauthenticated API GETs in `apps/api`;
  a page making ⛔ no API call does ⛔ not touch it. A fallback page that RESOLVED the code would (a fourth route + an oracle).
- **F11 — the PII-scrape gate** (`packages/contracts/scripts/check-pii-scrape.ts`) fails CI for an undeclared `.astro` page (both
  directions `:124-133`), indexing (`:136`), cache policy (`:149`, fail-closed); matrix
  `packages/contracts/public-pages/public-vs-private-matrix.yaml` (`/404` entry `:301-309` is the template). ⚠ It collects ONLY `.astro`
  files (`:69-88`) ⇒ the two `.ts` endpoints are invisible to it ([[feedback_gate_scope_semantic_coverage]]) ⇒ AL8.
- **F12 — hosting:** GitHub Actions → Artifact Registry → Dokploy (`.github/workflows/deploy-prod.yml:57-70`); Traefik rules
  `compose.yaml:31,37,56` (`/api/v1`, `/admin`, `/p/`); the `public` service has ⛔ no `environment:` block (`DATABASE_URL`,
  `PUBLIC_API_ORIGIN` read but ⛔ not wired); `ADMIN_APP_ORIGIN` is also absent from the jobs block (`:44-47`).
- **F13 — the edge:** `infra/cloudflare/zone.tf:14-18` (SSL strict, always HTTPS — fine), `:23` `browser_check = "on"` and the zone
  security level — both ALWAYS on; `waf.tf:50-66` challenge / block on bot score inside `cloudflare_ruleset.waf_custom`, which exists ONLY
  when `enable_bot_management` (default false, `:33`). ⛔ No domain committed (`zone_name` ⛔ no default, `variables.tf:25-26`). ⚠ **v1.1
  CORRECTION (V-M4):** Logpush records `ClientRequestPath` (`observability.tf:21`) — in Cloudflare's `http_requests` dataset that field is
  the path WITHOUT the query string (`ClientRequestURI` carries it) ⇒ with the code in `?c=`, the configured edge logs do ⛔ not record it.

**Config and governance:**
- **F14 — the base-URL precedent is `ADMIN_APP_ORIGIN`** (6.25, `-299` RE7): an env var read at boot (`apps/jobs/src/boot.ts:630`),
  validated EVERY run by `resolveAdminAppOrigin` (`apps/jobs/src/scheduler/staff-email-config.ts:103-121` — `https:` only, ⛔ no
  credentials / path / query / fragment; a trailing `/` is accepted and stripped; the result must equal the origin, else `null`), `null`
  ⇒ hold `config:admin_app_origin_invalid` (`claim-suspicion-staff-emails.ts:101,275,382-385`); documented `apps/jobs/README.md:128`.
  ⚠ A Secret Manager key named `app_links.base_url` would hit the recorded dotted-secret-id defect (deferred-work: *"GCP secret ids do not
  allow (`[A-Za-z0-9_-]`); INVALID_ARGUMENT is not NOT_FOUND"*) ⇒ a permanent `'fault'` hold ⇒ AL5.
- **F15 — the push grammar** `packages/contracts/src/deep-links/deep-link.ts` (`twt://p/<pariwarId>/<resource>[/<id>]`, closed
  `DeepLinkResource`, `:33-138`) has producers (`packages/channels/src/render.ts:29,134-137`) and ⛔ no consumer; the app's scheme is
  `twtp05` ⇒ AL13.
- **F16 — ⛔ no rule forbids a link in a member text**; today's texts are link-free by drafting only (`-295` RB1 etc.); `-303` Q1 A now
  RATIFIES a link in the five neighbours' text. The only "⛔ no deep link" rule is the termination notice's (`2026-08-10-097`, Story
  10.19) — ⛔ not touched.

## ⚖️ Build decisions AL1–AL16 (PROPOSED — answered by BigDev at Task 0.2, committed by ONE author-commit at Task 0.3)

- **AL1 — identity is config, ⛔ not invented.** `apps/mobile/app.json` → `app.config.ts` (static base + a function of the build profile
  and env). ⭐ The profile is read from `EAS_BUILD_PROFILE` (V-M5); `name`, `slug`, `scheme`, `ios.bundleIdentifier`, `android.package` keep
  TODAY's prototype values for `development` / `preview` AND when `EAS_BUILD_PROFILE` is unset (local `expo start`, local `expo prebuild`,
  `expo export --platform web` / `build:web`, `eas update` without a profile env) — so nothing local changes; ONLY `EAS_BUILD_PROFILE=production`
  reads `APP_IDENTITY_*` env (via `eas.json` `env` blocks) and FAILS THE BUILD when unset (⛔ never a silent prototype production build).
  `extra.eas.projectId` is added BY HAND (a dynamic config means `eas init` cannot write it). This story ⛔ never chooses the production
  identity (D-13 / OQ-1 — BigDev / the Trust; an Android package can ⛔ never change after the first Play upload) — owed before the
  first production build, carried on Row 29 (a). ⚠ Changing the identity later orphans the Firebase app registered under `…p0prototype`
  (`docs/native-stack-validation/task-10-execution-runbook.md:49`) — recorded on Row 29.
- **AL2 — ONE app-link path list, as DATA** (V-B1). NEW `packages/contracts/src/app-links/app-link-paths.json` — `{ "peerRequest":
  "/peer-request" }` (closed; a new path = a deliberate grammar change, the `DeepLinkResource` discipline). `app.config.ts` loads it with
  `require('../../packages/contracts/src/app-links/app-link-paths.json')` (Node loads JSON natively — ⛔ never a `.ts` import from contracts
  in the app config, ⛔ never reliance on Node type-stripping: the EAS image's Node version is ⛔ not pinned). The TypeScript module
  `packages/contracts/src/app-links/` (barrel-exported) imports the same JSON via `resolveJsonModule` and exports `APP_LINK_PATHS` (typed
  `as const` view), `APP_LINK_CODE_PARAM = 'c'`, `buildAppLinkUrl(baseUrl, key, code)` → `<base><path>?c=<code>` (the code
  `[A-Za-z0-9]{12}` asserted, URI-safe by construction), `parseAppLinkCode(params)`, and the pure builders of the two verification-file
  bodies from a LIST of app identities (`{ iosAppId: '<TEAMID>.<bundleId>' }`, `{ androidPackage, sha256Fingerprints[] }`) and the paths
  (AASA `components` = `{"/": path, "?": {"c": "?*"}}` per path; assetlinks = one `handle_all_urls` statement per package). A lockstep
  test proves the JSON, the TS view, the app config's resolved intent filters and the AASA components list the SAME paths. ⭐ Consumed by
  6.27c (the sender's `{link}`), 6.27a (the route body), the app config (AL7), the public site (AL8 / AL11), AL16. ⛔ No second copy
  (Invariant 4).
- **AL3 — the URL shape: `https://<domain>/peer-request?c=<code>`** — fixed host, fixed path, the code ONLY in the query (SIX FACTS #2;
  whitelisted as `https://<domain>/peer-request?`); ⛔ no shortener (RBI's 2025 circular discourages unbranded shorteners — re-check at
  Task 0.1, V-L8; a redirect hop also breaks link interception); ⛔ no redirect anywhere on the path.
- **AL4 — the code in logs** (corrected v1.1, V-M4). App code ⛔ never logs it (6.27 PM21 (e)). The configured Cloudflare Logpush
  records `ClientRequestPath`, which EXCLUDES the query ⇒ the code is ⛔ not in the edge logs as configured; ⭐ rule: ⛔ never add
  `ClientRequestURI` to `logpull_options` (a README line beside `observability.tf`). Residuals RECORDED, ⛔ not claimed absent: Traefik
  access logs record path + query IF they are switched on; link-preview fetchers (Google Messages, WhatsApp) may fetch the URL. The code
  is ⛔ not a credential (PM21 (a)/(d)) and the fallback page shows ⛔ nothing for it, so each residual exposes ⛔ nobody's data.
- **AL5 — `APP_LINKS_BASE_URL` is an ENV VAR in `apps/jobs`** (the `ADMIN_APP_ORIGIN` shape, F14), and the VALIDATOR is shared, ⛔ never
  copied (V-M2): `resolveAdminAppOrigin` is renamed / generalised to ONE `resolveHttpsOrigin(raw)` in `apps/jobs/src/scheduler/` (its
  existing callers and tests keep passing unchanged — a pure rename + re-export), used for both; `https:` only, an ORIGIN — ⛔ no path /
  query / credentials / fragment; ⭐ a trailing `/` is ACCEPTED and stripped (the precedent's behaviour, kept); invalid / unset ⇒ `null`.
  ⭐ OWNERSHIP: 6.30 owns the validator, its table test, the `apps/jobs/README.md` row and the `compose.yaml` jobs-block line;
  **6.27c owns the boot read and the dep** (in the `boot.ts:630` inline shape) and its sweep's hold `config:app_links_base_url_invalid` —
  that sweep does ⛔ not exist when 6.30 lands. ⛔ No code default (unlike the two `twt.org` defaults, F8). (Supersedes 6.27 PM21 (b)'s
  first *"read like the template ids (Secret Manager)"* — 6.27 v1.3 carries it; PM21 was ⛔ not yet committed, so ⛔ no decision is
  superseded.)
- **AL6 — the login keeps its place** (§4.7 item 1). The root guard (`_layout.tsx:127-129`), when it sends a member without a session to
  login, records the requested target in MEMORY (a module-level holder in `lib/link-target.ts`, ⛔ not MMKV / SecureStore — a link target
  ⛔ never outlives the app process): ONLY an `APP_LINK_PATHS` path (an allowlist — ⛔ not an arbitrary path) and ONLY its `c`, after
  `parseAppLinkCode` (⛔ no other parameter is carried — V-L5). After a successful login (`otp.tsx:38-39`) and in the guard's own `:130-131`
  branch, replace to it (an `Href` built from `APP_LINK_PATHS` + `c`), else `/(tabs)`; it is consumed once. The holder is CLEARED on the
  signup branch (`otp.tsx:48`) and on sign-out (V-L5). The termination branch (`:115-126`) WINS over any target. ⚠ RECORDED, accepted:
  if the process dies during the OTP step the target is lost — the member still finds the request on the home screen (6.27a's card) and
  in the message. §4.7 item 2 (scope switch): ⛔ not reachable — one Pariwar per session (F6); the consumer's resolver 404s a foreign code
  (PM21 (d)) — RECORDED. §4.7 item 3: the consumer's screen (AL16, V-M6).
- **AL7 — the app's link settings** (in `app.config.ts`, `EAS_BUILD_PROFILE=production` only, from `APP_LINKS_HOST`):
  `android.intentFilters` = `[{ action: 'VIEW', autoVerify: true, data: <each path>.map(p => ({ scheme: 'https', host, path: p })),
  category: ['BROWSABLE', 'DEFAULT'] }]` — ⭐ **`path` (EXACT), ⛔ never `pathPrefix`** (V-M1: a prefix `/peer-request` also matches
  `/peer-requests` and `/peer-request-x`; the AASA `"/": "/peer-request"` is exact — both platforms now match the same set);
  `ios.associatedDomains = ['applinks:<host>']`. Unset host in production ⇒ ⛔ no link settings (the app still builds; links open the
  browser → the fallback page). `development` MAY set `applinks:<host>?mode=developer` (Apple-CDN bypass) — ⛔ never in production; that
  entry is EXCLUDED from AC3's byte-equivalence snapshot (V-M5). ⚠ `preview` gets ⛔ no link settings ⇒ the device proof (AL12 (e)) needs
  a PRODUCTION-SIGNED build (V-M5).
- **AL8 — the two verification files** = server-rendered Astro endpoints `apps/public/src/pages/.well-known/apple-app-site-association.ts`
  and `assetlinks.json.ts` (⛔ no `prerender` — F9), `GET` only, `200` + `Content-Type: application/json` + `Cache-Control: public,
  max-age=3600`, bodies from AL2's builders over env read at REQUEST time via `process.env` (⛔ not `import.meta.env` — V-L3; any
  build-time variable declared in `turbo.json` `globalEnv`): `APP_LINKS_IOS_APP_IDS` (comma list of `<TEAMID>.<bundleId>`) and
  `APP_LINKS_ANDROID_APPS` (a JSON list `[{ package, sha256: [...] }]`, validated by a zod schema); unset / invalid ⇒ **404** (⛔ never a
  body that verifies the wrong app). ⚠ The PII-scrape gate cannot see `.ts` endpoints (F11) ⇒ the handlers get their own tests (content
  type, body shape, 404 when unset, ⛔ no member data) AND the gap is recorded as a deferred-work item (gate scope) — ⛔ not widening the
  gate here (ADR-0013's gate is its own change).
- **AL9 — hosting** (dev wires, operator applies — ADR-0011 §5): `compose.yaml` gains ONE Traefik router for the `public` service scoped
  to EXACT paths (V-M3) — ``Path(`/.well-known/apple-app-site-association`) || Path(`/.well-known/assetlinks.json`) ||
  Path(`/peer-request`)`` (one `Path(...)` per `APP_LINK_PATHS` entry; ⛔ never ``PathPrefix(`/.well-known/`)`` — that would send ACME
  and future well-known paths to Astro; ⛔ never ``PathPrefix(`/peer-request`)`` — a plain string prefix); the `public` service gains ONLY
  the app-link variables (`APP_LINKS_IOS_APP_IDS`, `APP_LINKS_ANDROID_APPS`, `APP_STORE_URL_ANDROID`, `APP_STORE_URL_IOS`, the brand-name
  variable of AL11) — ⛔ not its whole missing `environment:` block (V-L2: `DATABASE_URL` / `PUBLIC_API_ORIGIN` are outside this story,
  RECORDED as a deferred-work item); `APP_LINKS_BASE_URL` in the jobs block (AL5); `infra/dokploy/README.md` documents them. ⚠ The as-built
  `/p/` rule vs root-level pages mismatch (F12) is RECORDED, ⛔ not re-architected here.
- **AL10 — the edge** (V-M3): `infra/cloudflare/` gains a SKIP that exists UNCONDITIONALLY (⛔ not inside `cloudflare_ruleset.waf_custom`,
  which exists only with `enable_bot_management`), ORDERED FIRST, skipping the products `bic` (Browser Integrity Check — `zone.tf:23`) and
  `securityLevel`, AND — when bot management is enabled — Rules 1–3 of `waf.tf`, for EXACTLY the two `.well-known` paths
  (`http.request.uri.path in {"/.well-known/apple-app-site-association" "/.well-known/assetlinks.json"}`); ⛔ never `/peer-request` (a
  human page — normal edge rules apply). ⚠ SBFM caveat: on Pro / Business plans a WAF skip may ⛔ not exempt Super Bot Fight Mode — the
  operator confirms whether Apple's and Google's fetchers count as verified bots and records what happens if they do ⛔ not (AL12 (g)).
  ⚠ ADR-0010's DPDPA clearance (Row 3) is scoped to the edge design *"as recorded"* — a narrow skip for two public, data-free files is our
  reading of ⛔ not material; RECORDED in Row 29's notes for the operator to confirm, ⛔ not assumed silently.
- **AL11 — the fallback page** `apps/public/src/pages/peer-request.astro` (one per `APP_LINK_PATHS` entry; a lockstep test proves each path
  has a page AND a matrix entry). ⭐ v1.1 (V-H1): BOTH languages on ONE page, Hindi first, ⛔ no language toggle — `PublicShell` gains a
  prop that disables its toggle (or the page uses a minimal layout), `branding={null}`, `noindex`, `Cache-Control: public, max-age=300`
  (the body ⛔ never varies ⇒ ⛔ no `Vary`), `Referrer-Policy: no-referrer` (a store-link click ⛔ never leaks the code); ⛔ never reads
  `Astro.url` or its search params. Words (V-M9) — en: *"Please open the app to answer. The request is also on your app's home screen.
  Don't have the app? Install it, then open the link in your message again — or call the helpline number in your message."* + the hi
  equivalent; ⭐ the app is ⛔ never named by a hard-coded brand (OQ-1 may change it) — the name, if shown, comes from ONE env value
  (`APP_DISPLAY_NAME`, set beside `APP_IDENTITY_*`), else the words say "the app"; *"your message"*, ⛔ not *"your text"* (6-31's WhatsApp
  reminder carries the same link). Store buttons ONLY when env `APP_STORE_URL_ANDROID` / `APP_STORE_URL_IOS` are set (⛔ no dead link).
  ⛔ No helpline number on the page (apps/public has ⛔ no helpline source; the message carries it — ⛔ never a second source). A handler
  test asserts the response body ⛔ never contains the `c` value (Invariant 3). Matrix entry: `route: /peer-request`, `fields: []`,
  `noindex`, its cache policy. Friction budget: a page with ⛔ no scoped style adds ~0.
- **AL12 — the go-live record** (roster numbers RESERVED by `2026-10-10-305` §4; V-M7): **Row 27** and **Row 28** belong to 6.27 (Row 28's
  Hindi review explicitly INCLUDES 6.30's fallback page, `+not-found` AND AL16's route-shell placeholder); **Row 29** = 6.30 `app-links-live`; whichever story's Task 0 lands first
  writes its OWN row at its reserved number (a gap in the roster is expected and noted). Row 29 closes on ALL of: (a) the production app
  identity decided by BigDev and in `APP_IDENTITY_*` + `APP_DISPLAY_NAME` (D-13 / OQ-1 — ⛔ no sprint row); (b) the Trust's domain set in
  `APP_LINKS_BASE_URL`, `APP_LINKS_HOST`, `PUBLIC_SITE_ORIGIN`, `EXPO_PUBLIC_PUBLIC_SITE_ORIGIN` (ONE fact, four settings — documented,
  ⛔ not extracted, [[feedback_no_premature_package]]); (c) Apple Team ID + the Play App Signing (and upload-key) fingerprints in the env;
  (d) both files verified (`adb shell pm get-app-links <pkg>` shows `verified`; Apple's CDN
  `https://app-site-association.cdn-apple.com/a/v1/<domain>` returns the file); (e) a DEVICE PROOF on a PRODUCTION-SIGNED build, Android
  and iOS: a link opens the screen (logged in, and logged out → login → the screen) and, without the app, the fallback page — done AFTER
  the files have been live a day, recorded with dates (Trap 8); (f) the URL's fixed part whitelisted with the SMS operator(s) (one DLT-sheet
  line); (g) the Traefik and Cloudflare changes applied (AL9 / AL10 — incl. the SBFM answer and the operator's confirmation on Row 3);
  (h) the Hindi of the fallback page and `+not-found` reviewed by a person (via Row 28). 6.27's Row 27 (e) points at this row.
- **AL13 — the `twt://` push grammar is ⛔ not touched** — push stays inert (⛔ no device token is registered — 6.27a SEVEN FACTS #1); the
  scheme mismatch (`twtp05` vs `twt`) and D8 stay open; AL1's `scheme` reads config so a later push story can set `twt` — RECORDED.
- **AL14 — a dignified "not found"**: `app/+not-found.tsx` becomes bilingual (en + hi), says the page could not be opened, offers *"Go to
  home"* and the shared `CallHelplineCTA` (§4.7 *"Never hard 404"*); ⛔ no crash on an unknown multi-segment path (Invariant 6 states the
  one-segment limit). Hindi agent-authored (`$comment` marker; human review = Row 28 — AL12 (h)).
- **AL15 — a POINTER, ⛔ not a task: the typed-variable rule** (SIX FACTS #3) belongs to row `6-34-sms-templates-typed-variables` (BigDev,
  2026-10-10) — the OTP template, the five `sms-dlt-registry.ts` entries, the twelve drafted templates, `otp-sms-template.test.ts` and the
  two claim-template lockstep tests. 6.30 retags ⛔ nothing; it records the dependency: a rejected OTP template blocks every login, so
  Row 29 (e)'s logged-out leg ⛔ cannot pass until row 6-34's OTP retag is approved by the operator.
- **AL16 — the route shell and the STRICT route-map test** (V-H2, V-M1). ⭐ **6.30 OWNS** `apps/mobile/app/(peer-request)/peer-request.tsx`
  — a THIN shell that PARSES `c` (`useLocalSearchParams`, through `parseAppLinkCode`) and renders a CONSUMER SLOT; until 6.27a fills it the
  slot shows a bilingual placeholder (*"Your requests appear on your home screen."* + `CallHelplineCTA`), ⛔ no API call, ⛔ no data (its Hindi
  is reviewed under Row 28). ⭐ **The split, stated ONCE (and the same in 6.27a PM11 / PM21):** 6.30 parses `c` in the shell and owns the
  login-return (AL6); **6.27a fills the slot** — the list, the questionnaire, the not-openable copy (*"This request could not be opened"*
  + `CallHelplineCTA`) and *"⛔ no API call before the session has loaded"*; **6.27c wires the parsed `c` to the by-link resolver** (route
  + call), its 404 reusing 6.27a's not-openable state — ⛔ never a second route file. ⭐ The test,
  over `apps/mobile/app/`: (i) FAILS when an `APP_LINK_PATHS` entry has ⛔ no route (it accepts `peer-request.tsx` or
  `peer-request/index.tsx`, group segments stripped, `_layout` ignored); (ii) FAILS when two files claim the same path; (iii) PINS the set
  of ROOT-LEVEL dynamic routes to exactly the two that exist today (`(helpdesk)/[ticketId]`, `(polls)/[surveyId]`) — so ⛔ no story adds a
  third root catch-all. ⚠ Recorded for 6.27a: its questionnaire pages and Thank-you are IN-SCREEN state, or real NESTED segments under
  `/peer-request/…`, ⛔ never a `(peer-request)/[x].tsx` (a third root catch-all — Trap 5 generalised).

## Acceptance Criteria

1. **AC1 — governance first.** ⛔ No code before the AL1–AL16 author-commit lands alone; the epics.md `### Story 6.30` entry, Row 29
   (AL12) and the DLT-sheet whitelisting line follow it.
2. **AC2 — one path list, as data** (AL2): `app-link-paths.json`, `APP_LINK_PATHS`, `buildAppLinkUrl`, `parseAppLinkCode` and the two body
   builders exist with unit tests (URL form `<origin>/peer-request?c=<12 base62>`; a malformed code refused; AASA `components` and
   assetlinks statements for 1 and for 2 app identities; ⛔ no duplicate paths); the lockstep test (JSON ↔ TS view ↔ resolved app-config
   intent filters ↔ AASA components) passes.
3. **AC3 — the app config loads and resolves** (AL1 / AL7, V-B1, V-M5): `npx expo config --type public` RUNS clean for `development`,
   `preview` and `production` (with fixture env) — a `ci:local` step, ⛔ not only a vitest snapshot; `development` / `preview` / unset
   profile yield today's prototype config byte-equivalent (the `?mode=developer` entry excluded); `production` without `APP_IDENTITY_*`
   THROWS; with `APP_LINKS_HOST` set it carries one `autoVerify` https intent filter with an EXACT `path` per entry and `applinks:<host>`;
   without it, ⛔ no link settings.
4. **AC4 — the login keeps its place** (AL6): a member without a session opening `/peer-request?c=…` is sent to login and, after the OTP,
   lands on `/peer-request?c=…`; a non-allowlisted target, or any parameter other than a valid `c`, lands on `/(tabs)` (or is dropped);
   the termination notice wins; the target is consumed once; the signup branch and sign-out clear it (pure-logic tests of the holder + a
   source-scan pin that both replace sites and both clear sites use it).
5. **AC5 — the two files** (AL8): each endpoint returns `200`, `application/json`, the builder's exact body for configured identities;
   `404` when unconfigured or invalid; ⛔ no redirect; ⛔ no `prerender`; env read at request time; ⛔ no member data (tests on the
   handlers); the gate-scope gap recorded.
6. **AC6 — the fallback page** (AL11): `/peer-request` (with or without `?c=`) renders BOTH languages on one page, ⛔ no toggle, `noindex`,
   `no-referrer`, its `Cache-Control`, ⛔ no `Vary`; the response body ⛔ never contains the `c` value (handler test with a distinctive code);
   ⛔ never reads the URL, ⛔ no API call, ⛔ no hard-coded brand, ⛔ no store buttons unless configured; declared in the matrix — the
   PII-scrape gate passes.
7. **AC7 — the route exists, ⛔ no collision, ⛔ no crash** (AL14 / AL16): the strict route-map test passes (every path has exactly one
   route; root-level dynamic routes are exactly the two); the shell renders its placeholder for any `c`; `+not-found` is bilingual with
   the helpline CTA.
8. **AC8 — hosting and edge wired** (AL9 / AL10): the exact-path Traefik router, the `public` service's app-link variables,
   `APP_LINKS_BASE_URL` in the jobs block, the unconditional first-ordered Cloudflare skip (bic + securityLevel + Rules 1–3 when enabled,
   exactly the two files) and the "⛔ never `ClientRequestURI`" README line are in `infra/`; `terraform fmt -check` passes; `terraform
   validate` (needs `terraform init`, a network call — ⛔ not in CI) is run once and its output recorded in the Dev Agent Record (V-L4);
   ⛔ not applied by this story.
9. **AC9 — the shared validator** (AL5): `resolveHttpsOrigin` (the renamed `resolveAdminAppOrigin`) accepts exactly an https origin —
   `https://x` and `https://x/` both ⇒ `https://x` — and returns `null` for `http:`, a path, a query, credentials, a fragment, blank, and a
   non-URL (table test); every existing `resolveAdminAppOrigin` caller and test passes unchanged; the README row and compose line exist.
   ⛔ No boot wiring here (6.27c's).
10. **AC10 — the records**: Row 29 (AL12) at its reserved number; the DLT-sheet line (AL12 (f)); the deferred-work items (AL8's gate scope,
    AL9's un-wired `public` env, AL13's scheme / D8 note, D-13 pointed at Row 29); the pointers to row 6-34 (AL15) and to 6.27's Row 27 (e)
    and Row 28 (h); `pnpm ci:local` green.

## Tasks / Subtasks

- [ ] **Task 0 — governance FIRST (AC1).** ⛔ No code.
  - [ ] 0.1 Re-check `git diff --name-only a05ce150..HEAD -- packages apps infra scripts`; re-read any cited file that moved. Re-check the
        platform claims with the SMS provider / docs (V-L8): `{#alphanumeric#}` ≤ 40 chars, the 18 Nov 2025 Direction date, RBI's 2025
        circular on shorteners, Android 15+ re-verification timing.
  - [ ] 0.2 Put AL1–AL16 to BigDev (short option summaries — the 6.24b / 6.29 form); record the answers here.
  - [ ] 0.3 ONE author-commit recording them, committed ALONE ([[project_decision_log_writes_user_inserted]] — stage in the scratchpad,
        try the insert first).
  - [ ] 0.4 epics.md `### Story 6.30` (after 6.29; a dated source line, ⛔ never a merge fence); Row 29 (AL12, at its RESERVED number);
        DLT-sheet line for the URL whitelisting; sprint ledger line ([[project_sprint_status_safe_prepend]]).
- [ ] **Task 1 — contracts `app-links` (AC2).** `packages/contracts/src/app-links/{app-link-paths.json,index.ts,paths.ts,verification.ts,
      README.md}`; `resolveJsonModule` where needed; barrel export; unit tests + the lockstep test; ⛔ no import of `@twt/domain`
      ([[project_contracts_domain_bundle_boundary]]); run vitest — contracts tests are outside tsc ([[project_contracts_tests_outside_tsc]]).
- [ ] **Task 2 — mobile config (AC3).** `app.json` → `app.config.ts` (`EAS_BUILD_PROFILE`; `require()` of the JSON; `extra.eas.projectId` by
      hand) + `eas.json` `env` per profile; the resolved-config snapshot test; the `ci:local` step running `npx expo config --type public`
      per profile (fixture env); a note in `apps/mobile/README` on `expo prebuild --clean`; ⛔ no native dirs committed.
- [ ] **Task 3 — the login keeps its place (AC4).** `lib/link-target.ts` (the in-memory holder, the allowlist over `APP_LINK_PATHS`, `c`
      only via `parseAppLinkCode`); the guard and `otp.tsx` changes typed as `Href`; clears on the signup branch and sign-out; tests.
- [ ] **Task 4 — the route shell, not found + the route-map test (AC7).** `app/(peer-request)/peer-request.tsx` (the shell + consumer slot
      + placeholder); `+not-found.tsx` bilingual + `CallHelplineCTA`; mobile i18n keys en + hi (`$comment`); the strict AL16 test; the
      friction-budget attribution entry for `apps/mobile/` changes.
- [ ] **Task 5 — the two endpoints (AC5).** `apps/public/src/pages/.well-known/*.ts`; env parsing (zod, `process.env` at request time);
      handler tests.
- [ ] **Task 6 — the fallback page (AC6).** `apps/public/src/pages/peer-request.astro`; the toggle-off `PublicShell` prop (or minimal
      layout); public i18n en + hi; matrix entry; the page/matrix lockstep; the no-echo handler test; `pnpm` PII-scrape gate run.
- [ ] **Task 7 — the shared validator (AC9).** Rename / generalise `resolveAdminAppOrigin` → `resolveHttpsOrigin` (re-export the old name or
      update its callers — ⛔ never a second copy); table test; README row; ⛔ no boot wiring (6.27c).
- [ ] **Task 8 — infra (AC8).** `infra/dokploy/compose.yaml` (the exact-path router, the app-link variables, the jobs-block line) + README;
      `infra/cloudflare/` (the unconditional skip, ordered first) + the `ClientRequestURI` README line; `terraform fmt -check`; `terraform
      validate` run once, output recorded.
- [ ] **Task 9 — records and close (AC10).** Deferred-work items (AL8, AL9's env, AL13; D-13 → Row 29); the pointers (row 6-34; 6.27's Row
      27 (e) / Row 28 (h) — if 6.27's Task 0 has landed, else a note in 6.27's file); this file's Change Log + File List; `pnpm ci:local`
      green — run it, paste the summary.

## Dev Notes

### ⚠ TRAPS
1. **The fallback page shows ⛔ nothing about anyone** — ⛔ no name, ⛔ no claim, ⛔ no Pariwar branding, ⛔ no code echo (incl. through a
   reused layout's links — V-H1), ⛔ no "your request is …". A page that resolved the code would be an oracle AND a fourth public API
   route (F10).
2. **⛔ Never prerender the `.well-known` endpoints, ⛔ never put them in `public/`** — octet-stream (F9); Apple silently ignores the file.
3. **⛔ Never invent the identity.** ⛔ Never `org.teacherswelfaretrust.twt` "or equivalent" from D-13's prose — it is an example, ⛔ not a
   decision.
4. **⛔ Never persist the link target.** In memory only, consumed once, allowlisted, `c` only — a stored target could replay a stale
   request after a different member logs in on the same phone.
5. **A route GROUP is ⛔ not a URL segment** (F5) — ANY `app/(group)/[x].tsx` is `/:x`, a third root-level catch-all (AL16 (iii) refuses
   it); this applies to 6.27a's questionnaire pages and Thank-you too.
6. **Query string, ⛔ not path** (SIX FACTS #2) — a path-segment code ⛔ cannot be whitelisted.
7. **The edge challenge fails verification SILENTLY** (F13) — prove the skip on a real request (`curl -A` a non-browser UA) in the device
   proof (AL12 (d)); BIC and the security level are zone-wide and ALWAYS on.
8. **Android ≤ 11 needs EVERY host in a filter to verify; Android 15+ re-verifies and changes can take up to 7 days (re-check, V-L8); Apple's
   CDN lags ~24 h** — the device proof is done AFTER the files have been live a day, and recorded with dates.
9. **`typedRoutes`** — `router.replace` rejects a plain string; build the `Href` from `APP_LINK_PATHS` + params; the types exist only once
   the route file does (F1).
10. **⛔ Never import TypeScript from `@twt/contracts` in `app.config.ts`** (F2b) — `require()` the JSON; a vitest snapshot would pass and
    hide it; the `expo config` run is the proof.
11. **Markdown emphasis closes a JSDoc** — grep `\*\*/` after doc-block edits ([[project_markdown_emphasis_closes_jsdoc]]); **Prettier is
    ⛔ not enforced** — hand-format ([[project_prettier_not_enforced]]).

### Reuse map
| Need | Reuse |
|---|---|
| base-URL validation | `resolveAdminAppOrigin` (`apps/jobs/src/scheduler/staff-email-config.ts:103-121`) — renamed / generalised, ⛔ never copied |
| public page shell / 404 shape | `PublicShell.astro` (+ a toggle-off prop), `404.astro`, the matrix `/404` entry |
| helpline CTA | `components/common/CallHelplineCTA.tsx` |
| closed-enum grammar discipline | `packages/contracts/src/deep-links/deep-link.ts` |
| route-tree source scan | `apps/mobile/tests/unit/sahyog-vivran-entry.test.ts:160-165` |
| request-time env in Astro | `apps/public/src/lib/directory.server.ts:44` |
| roster row format | `inventory-roster.md` Rows 22–26 |

### Testing standards
Contracts: vitest unit (builders, parser, bodies) + the JSON ↔ TS ↔ app-config ↔ AASA lockstep. Mobile: pure-logic + source-scan (node
vitest, `tests/unit/**/*.test.ts`); the resolved-config snapshot; the strict route-map test; the `expo config --type public` run per
profile in `ci:local`. Public: endpoint handler tests (status, content type, body, 404, env at request time); the fallback page's no-echo
test; the PII-scrape gate; the page/matrix lockstep. Jobs: the shared validator's table. Infra: `terraform fmt -check`; `validate` run once,
recorded. ⛔ No device behaviour in CI — it is AL12 (e). `pnpm ci:local` before review.

### Project structure notes
NEW: `packages/contracts/src/app-links/` (incl. `app-link-paths.json`); `apps/mobile/app.config.ts` (replaces `app.json`),
`apps/mobile/lib/link-target.ts`, `apps/mobile/app/(peer-request)/peer-request.tsx` (the shell); `apps/public/src/pages/.well-known/
{apple-app-site-association,assetlinks.json}.ts`, `apps/public/src/pages/peer-request.astro`.
UPDATE: `apps/mobile/app/_layout.tsx`, `app/(auth)/otp.tsx`, `app/+not-found.tsx`, `eas.json`; `apps/public/src/layouts/PublicShell.astro`
(the toggle-off prop); `apps/jobs/src/scheduler/staff-email-config.ts` (the rename), `apps/jobs/README.md`; `infra/dokploy/compose.yaml` +
README; `infra/cloudflare/` + README; the PII matrix.
⭐ 6.27a FILLS `app/(peer-request)/peer-request.tsx`'s consumer slot (its PM11); 6.27c wires the parsed `c` (PM21 (c), (d)) — ⛔ never a
second route file.

### Sequencing with 6.27 (a / b / c / d), 6.31 and 6.34
⭐ 6.30 is ⛔ not blocked by any Panel question, and since `-303` / `-304` 6.27 is ⛔ not either — it is blocked only on BigDev's Task 0,
and it SPLITS into four parts (BigDev, 2026-10-10): **6.27a** (the neighbours answer + the District Admin sees — fills AL16's slot),
**6.27b** (the two warnings, the wait, approvers see answers), **6.27d** (the inspector's discrepancy check), **6.27c** (sending — LAST).
⇒ ⭐ **6.30 lands before 6.27c** — 6.27c is the ONLY part that consumes `buildAppLinkUrl` / `resolveHttpsOrigin` / the `APP_LINKS_BASE_URL`
read and the ONLY part that wires the parsed `c` to the resolver; 6.27a consumes only the route shell (AL16), so 6.27a and 6.30 may proceed
in either order as long as the shell is MERGED before 6.27a's Task 5 (its mobile screens). ⚠ If a 6.27 part reaches a task that needs a 6.30 artefact before 6.30 is `done`, that part STOPS and
asks — ⛔ never re-creates it ([[feedback_circular_deferral_between_sibling_stories]]: siblings must ⛔ never defer to each other). 6.31 (the
WhatsApp reminder, `-303` Q1 A) reuses the same link — ⛔ no new path. Row 6-34 (typed templates) is independent, but Row 29 (e)'s logged-out
leg waits for its OTP retag (AL15).

### Previous story intelligence
- **6.25**: `ADMIN_APP_ORIGIN` — the env + per-run validator + hold pattern; its validator is now SHARED (AL5).
- **6.27a** (v2.5, the record for 6.27a–d): the consumer; its Trap 1–3 fences hold for anything a link opens; 6.27a owns the
  not-openable copy and the rule "⛔ no API call without a session" (the route renders once while the session is loading — V-M6); 6.27c
  owns the resolver call and reuses that copy for its 404. 6.27c wires the PARSED `c` to the resolver.
- **11b.3 / 11b.1**: the public-pages two-route rule and the PII-scrape matrix — every public page is declared.

### Git intelligence
`a05ce150` 6.27 created (branch `story/6-27-…`) · `5946e411` 6.29 code review · `36eb7b46` 6.29 build — house order: decision entry →
records → build → review; REBASE-merge ([[project_story_automator_ops]]). This story's branch `story/6-30-app-links-open-the-app-from-a-text`
is STACKED on 6.27's (the row lives there) and now also carries 6.27's v1.3–v2.5 (6.27a–d) and the `-303` / `-304` / `-305` governance commits — rebase onto
`main` once those merge.

### Latest tech information (fetched 2026-10-10 — re-check at Task 0.1)
- **Android App Links** (developer.android.com, `verify-android-applinks`): `assetlinks.json` over HTTPS, `application/json`, ⛔ no
  redirects; with Play App Signing the GOOGLE signing-key fingerprint is required (Play Console → App signing → "Digital Asset Links
  JSON"); add the upload / EAS key for sideloaded builds; Android 12+ verifies per host and, on failure, opens the browser (⛔ no chooser);
  `adb shell pm verify-app-links --re-verify <pkg>`, `pm get-app-links <pkg>`; intent-filter `data` supports exact `path`.
- **iOS Universal Links** (Apple *Supporting associated domains*; Expo `linking/ios-universal-links`): AASA at
  `/.well-known/apple-app-site-association`, ⛔ no extension, `application/json`, ⛔ no redirects, < 128 KB; `applinks.details[].appIDs` +
  `components` (`/`, `?`, `#`, `exclude`); fetched via Apple's CDN (~24 h lag) at install / update; `ios.associatedDomains:
  ['applinks:<host>']`; needs a paid Apple Developer Program account (the Team ID).
- **Expo (SDK 55)**: `app.config.ts` is loaded via `@expo/require-utils` — only the config file is transpiled (F2b); a verified https link
  routes by PATH; groups ⛔ never appear in URLs; query params arrive via `useLocalSearchParams()`; `+native-intent.tsx`'s
  `redirectSystemPath` can rewrite legacy URLs (⛔ not needed here); `Stack.Protected` redirects to sign-in but does ⛔ not keep the target
  — AL6 builds it.
- **Cloudflare**: `http_requests.ClientRequestPath` excludes the query; `ClientRequestURI` includes it; BIC / security level are zone
  settings, skippable by a ruleset skip action (products `bic`, `securityLevel`); SBFM may ⛔ not be skippable on Pro / Business.
- **India SMS**: TRAI URL / APK / OTT whitelisting (in force 1 Oct 2024; non-whitelisted ⇒ rejected); dynamic part only after `?`;
  subdomains whitelisted separately; TRAI 18 Nov 2025 typed variables (`{#url#}`, `{#cbn#}`, …) — row 6-34; ⚠ the DLT category
  (Transactional vs Service Implicit) is to be confirmed with the provider.

### References
- Architecture §4.7 (routing; deep-link landing checks), §3.4; ADR-0010, -0011, -0013, -0020 cl.4, -0022; PRD OQ-1, FR-60, FR-61.
- `2026-10-10-303` (Q1 A + the language rider), `2026-10-10-304` (Q6 A), `2026-10-10-305` (§1 corrections; §2 items 1, 2, 5; §4 the
  reserved rows); the confirm note `trustee-panel-routing-note-2026-10-10-6-27-confirms.md` (CF1–CF5 — ✅ ruled by `2026-10-10-310`).
- Story 6.27a v2.5 (PM11, PM16, PM21 — the record for 6.27a–d) and the cut files 6.27b / 6.27c / 6.27d; Story 6.25 (RE7); deferred-work D-13, D8, the dotted-secret-id item;
  row 6-34 (typed templates).
- `docs/launch-gate-inventory/inventory-roster.md`, `dlt-template-requests-6-19.md`; `packages/contracts/src/deep-links/`;
  `packages/channels/src/otp-sms-template.ts`, `sms-dlt-registry.ts`.

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List
- 2026-10-10 — created by `bmad-create-story 6.30` (Opus 5.5): ultimate context engine analysis completed — comprehensive developer guide
  created. Three read-only research passes at `a05ce150` (+ platform rules fetched 2026-10-10); AL1–AL16 PROPOSED; ⛔ no Panel question.
- 2026-10-10 — v1.1 after a fresh-context validate (four read-only reviewers at `877e5864`; code unchanged since `a05ce150`): 1 BLOCKER,
  3 HIGH, 9 MEDIUM, 8 LOW — all applied; ⛔ no AL added or removed.

### File List

## Change Log
| Date | Version | Change |
|---|---|---|
| 2026-10-10 | 1.5 | `2026-10-10-310`: the confirm note is ruled (CF1–CF5) — the language narrowing is Panel-confirmed (CF1 A). |
| 2026-10-10 | 1.4 | Round 4: version pointers to 6.27a v2.5 (⛔ no change to PM11 / PM21). |
| 2026-10-10 | 1.3 | Round-3 validate: the *"separate story"* quote re-cited to the sprint-status row `6-30` comment (⛔ never `-305`'s occasion); two glyph-register breaches (the symbol glued to "echo" and to "oracle") rewritten as *"the no-echo test"* and *"⛔ never an oracle"*. |
| 2026-10-10 | 1.2 | Round-2 validate: the §0 language line now reads `-303`'s rider NARROWED by `2026-10-10-305` §2 item 2 (CF1 owed) — ⛔ never "ruled by `-303`"; a `-305` row in the rulings table (§2 items 1 / 2 / 5, §4) and the BigDev calls / AL12's reservation re-attributed to it; `-305` and the confirm note in References; the `?c=` split stated ONCE (6.30 parses `c`; 6.27a fills the slot + the not-openable copy; 6.27c wires the resolver) — AL16, Sequencing, Previous story intelligence; "Task 6" → 6.27a's Task 5 (the shell MERGED first); Row 28 covers the route-shell placeholder; stale 6.27 refs (v1.9 → 6.27a v2.5; FIVE → SEVEN FACTS). |
| 2026-10-10 | 1.1 | Validate applied (V-B1, V-H1–H3, V-M1–M9, V-L1–L8) + BigDev's answers. **B1:** the path list is a JSON data file loaded by `app.config.ts` via `require()` (the config cannot import the contracts TS barrel); AC3 runs `expo config` per profile in `ci:local`. **H1:** the fallback page shows both languages with ⛔ no toggle (the shell's toggle echoed `?c=`); a no-echo test; ⛔ no `Vary`. **H2:** 6.30 OWNS a thin route shell for `/peer-request` that 6.27a fills; AL16 strict + pins the two root catch-alls. **H3:** the untyped OTP and registry templates added; AL15 becomes a pointer to row `6-34-sms-templates-typed-variables`. **M1:** Android exact `path`. **M2:** one shared `resolveHttpsOrigin`; 6.27c owns the boot read; trailing `/` accepted. **M3:** an unconditional first-ordered edge skip (bic + securityLevel), exact paths; SBFM caveat. **M4:** F13 / AL4 corrected (`ClientRequestPath` has ⛔ no query). **M5:** `EAS_BUILD_PROFILE`; local / web / update behaviour; `projectId` by hand; production-signed device proof. **M6:** 6.27a owns the resolver-404 copy and "⛔ no call without a session". **M7:** Rows 27 / 28 (6.27) and 29 (6.30) reserved; Row 29 (h) Hindi via Row 28. **M8:** governance current (`-303` / `-304`; 6.27's four-part split; 6.30 before 6.27c). **M9:** ⛔ no hard-coded brand; "your message"; the home-screen line. **L1–L8:** one app per host per path; the `public` env narrowed; `process.env` at request time; `terraform validate` recorded; the link-target holder cleared and `c`-only; typed-route types; platform claims re-checked at Task 0.1. |
| 2026-10-10 | 1.0 | Created (`bmad-create-story 6.30`); pinned `a05ce150`; AL1–AL16 proposed. |
