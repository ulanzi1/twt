---
baseline_commit: 1cce7e5a
---

<!--
⭐ PIN (v1.7–v1.8, 2026-10-10): `1cce7e5a` on `main` — the rebase twin of the original pin `a05ce150` (identical tree `0678c287`; PR #268
REBASE-merged the 6.27 / 6.30 governance branch at `9990cffa`). Every `file:NNN` below is AS OF `1cce7e5a`; `git diff --name-only
1cce7e5a..34b9bab6 -- packages apps infra scripts .github` is EMPTY (re-derived 2026-10-10 by the round-7 / round-8 validates at `34b9bab6` / `d2d6b9a0` — a
PERISHABLE fact: re-run it before Task 1). The 39-line PR #268 SHA map lives in this file as of `34b9bab6` (`git show 34b9bab6:<this path>`);
the three branch SHAs this file still cites map as `a05ce150` → `1cce7e5a`, `21e89ed6` (`-312`) → `b3a9476b` and `877e5864` → `cf5adf67`.

STATUS: `ready-for-dev`. ✅ AL1–AL16 committed by `2026-10-10-312` (`b3a9476b`) and CORRECTED by `2026-10-10-315` (`a3253ec0`, C1–C8 —
AL1, AL2, AL6, AL7, AL9, AL10, AL11, AL12, AL16) its erratum `2026-10-10-316` (`a2b994b7`, E1–E3) and the reading `2026-10-10-317` (`44830033`, R1–R3); the AL block below
is that committed text ONLY — build detail is in Dev Notes → Build notes N1–N20. 6.30 may be built from Task 0.1 / 0.4 on
([[feedback_governance_commits_precede_implementation]]). The re-validate rule (`-316` Consequence 2 — rounds until one finds ⛔ no BLOCKER /
HIGH) is DISCHARGED: round 9 found none (`-317` R3).
⭐ §0 gate (template `trustee-panel-routing-note-TEMPLATE.md`): ⛔ no Panel question. Every AL strips to "the code should do X". What the
TEXT says and who is texted is RULED — `2026-10-10-303` Q1 A (the five are texted, naming the member, with the link and the helpline, plus
one WhatsApp reminder at 48 h; Hindi / English by the Panel's rider, narrowed by `2026-10-10-305` §2 item 2 to the Pariwar's default
language until row 6-35 — CONFIRMED by the Panel, `2026-10-10-310` CF1 A) and `2026-10-10-304` Q6 A (*"a few short questions"*). ⚠ It
BECOMES the Panel's if the fallback page shows ANYTHING about a member, a death or a claim (Trap 1), or a link is used to reach anyone the
Panel has ⛔ not ruled may be texted.
⚠ Two calls are BigDev's / the Trust's, ⛔ not the author's: the production app IDENTITY (name, bundle id, package — PRD OQ-1, deferred-work
D-13; an Android package can ⛔ never change after the first Play upload) and whose Apple / Play / Expo accounts are used. ⇒ this story
builds everything with them as CONFIG and records them on Row 29 (a); it ⛔ never invents them (BigDev chose ⛔ no separate sprint row).

GLYPH REGISTER: `⛔` sits ONLY on a negation word · `⭐` = key fact / action · `⚠` = hazard. ⛔ No `file:NNN` into `.decision-log.md`,
`deferred-work.md` or `sprint-status.yaml`. LETTERS: `AL` = this story's build decisions (COMMITTED, `-312` + `-315` + `-316`); `C1`–`C8` = `-315`'s
corrections; `E1`–`E3` = `-316`'s; `R1`–`R3` = `-317`'s; `N1`–`N20` = build notes (⛔ not decisions); `F` = FOUND facts; 6.27's `PM` cited as such.
-->

# Story 6.30: A Link in a Text Opens the App at the Right Screen — App Links, Universal Links, Two Public Files, a Plain Fallback Page, and the Login That Keeps Its Place `[PRIMITIVE]`

Status: in-progress

> ⭐⭐ **WHAT THIS STORY IS, IN ONE PARAGRAPH.** Story 6.27's text to the five neighbours carries a link that should open the question
> screen in the TWT app (BigDev, 2026-10-10: *"separate story"*; ratified with the text in `-303` Q1 A). Today ⛔ no link can open the
> app: it still carries the P0 prototype's identity, reads ⛔ no incoming URL, has ⛔ no Android App Links or iOS Universal Links, ⛔ no
> verification file is hosted, the public site's hosting rule reaches only `/p/*`, and the login wall throws away the screen a member
> asked for. This story builds the **plumbing**: ONE shared list of app-link paths (a JSON data file); the app's link settings generated
> from config; a THIN app route shell for `/peer-request` that 6.27a fills; the two `/.well-known/` files served by the public site; a
> plain bilingual fallback page for a phone without the app; the login that returns to the requested screen (incl. after an expired
> login); a dignified "not found"; the hosting and edge rules; ONE base-URL validator (`APP_LINKS_BASE_URL`); and the go-live record
> (Row 29). ⭐ Its first and only consumer is 6.27's `/peer-request` (PM21). ⛔ Nothing here sends a text.

> ⚠⚠ **SIX FACTS — read before anything else.**
> 1. ⭐ **The app's production identity is UNDECIDED** — `apps/mobile/app.json:3-23` is the prototype's (`"TWT P0-5 Prototype"`,
>    `twtp05`, `org.teacherswelfaretrust.p0prototype`); D-13 says it *"must be updated to production values … before the first EAS Build
>    profile run or App Store / Play Store submission"*; the PRD's brand is a working title (OQ-1); ⛔ no Apple Team ID, ⛔ no Play signing
>    fingerprint, ⛔ no EAS project is recorded anywhere. Both verification files are KEYED by these values ⇒ AL1: all from config.
> 2. ⚠⚠ **The link's code must be a QUERY STRING, ⛔ not a path segment.** India's operators whitelist a URL's FIXED part; a dynamic URL is
>    registered ending in `?`, and *"dynamic paths before the query string are currently not supported"* (Tanla; MSG91, Fast2SMS the same;
>    TRAI's whitelisting Direction in force since 1 Oct 2024 — a text with a non-whitelisted URL is REJECTED) ⇒ the link is
>    `https://<domain>/peer-request?c=<code>`, whitelisted as `https://<domain>/peer-request?` (AL3; 6.27a v2.9 PM21).
> 3. ⚠ **TRAI's 18 Nov 2025 Direction requires TYPED template variables** (`{#numeric#}`, `{#url#}`, `{#cbn#}`, …) — the untyped `{#var#}`
>    in the OTP template, five `sms-dlt-registry.ts` entries and twelve drafted templates belongs to row `6-34-sms-templates-typed-variables`
>    (BigDev) ⇒ AL15 is a POINTER only; 6.30 retags ⛔ nothing. A rejected OTP template means ⛔ nobody can log in, so ⛔ no link works.
> 4. ⚠⚠ **The login wall drops the target — and an EXPIRED login never even reaches it.** `apps/mobile/app/_layout.tsx:127-129` sends a
>    member without a session to `/(auth)/login`; after the OTP, `otp.tsx:38-39` and the guard's `:130-131` both `router.replace('/(tabs)')`.
>    And a refresh refused with a 4xx clears the stored tokens (`lib/session.ts:150-176`) but only a TERMINATION resets the in-app session
>    (`lib/session-context.tsx:58-66`, whose comment says so) ⇒ a member whose 90-day refresh token died sees an error, ⛔ never the login, in that session (the next cold start does reach login).
>    Architecture §4.7 item 1: *"re-auth flow preserves the deep-link target as the post-auth redirect"* ⇒ AL6 (C3).
> 5. ⚠ **The public site is reachable only under `/p/`.** `infra/dokploy/compose.yaml:56` routes ``PathPrefix(`/p/`)`` while every Astro
>    page sits at the root ⇒ `/.well-known/…`, `/peer-request` AND the page's stylesheets (`/_astro/*.css`) reach ⛔ no service today ⇒ AL9.
>    The edge may challenge the verifiers (BIC + security level ALWAYS on; `waf.tf` Rules 1–3 when bot management is on); a challenge is
>    ⛔ not a clean 200 ⇒ verification fails SILENTLY ⇒ AL10.
> 6. ⚠ **One app per Pariwar is planned** (FR-61; ADR-0020 cl.4). v1 ships Bihar only ⇒ AL2 / AL8 list app identities as a LIST (one
>    today); ⚠ ONE app per host per path (two apps verified for one host + path give an Android chooser and undefined iOS behaviour) ⇒ at
>    the SECOND Pariwar, the base URL / host becomes per-Pariwar.

## Story

As **a member who has been sent a text with a link**,
I want **tapping the link to open the TWT app at the right screen — after logging in if I have to — or, without the app, a plain page
that tells me how to answer**,
so that **I can do what the message asks in a minute, and ⛔ no web page ever asks me to log in or shows me anything about anyone.**

## The rulings and records this story builds on

| Source | Key | Status |
|---|---|---|
| `2026-10-10-303` Q1 A | each of the five is texted, naming the member, with **the link** and the helpline, plus one WhatsApp reminder at 48 h (row 6-31 — the SAME link); Hindi / English by the Panel's rider | ⭐ Trustee-ratified |
| `2026-10-10-304` Q6 A | the text says *"a few short questions"* | ⭐ Trustee-ratified — ⛔ no change to this story's fallback copy |
| BigDev 2026-10-10 | the plumbing is a *"separate story"* (this one) | BigDev's call (the sprint-status row `6-30` comment) |
| `2026-10-10-305` | §2 item 1 — 6.27 SPLITS (6.27a / b / c / d); §2 item 2 — the Pariwar's default language until row 6-35; §2 item 5 — rows 6-34 and 6-35, ⛔ no identity row; §4 — roster Rows 27 / 28 / 29 RESERVED | author-commit; its §3 confirm ✅ ruled by `-310` |
| `2026-10-10-310` | CF1 A — the language narrowing confirmed | ⭐ Trustee-ratified |
| `2026-10-10-311` | 6.27's PM1–PM25 — PM11 (the code, the card), PM16 (Rows 27 / 28 — Row 27 (e) → Row 29; Row 28 covers 6.30's fallback page, `+not-found` and the shell placeholder), PM21 (the link seam) as written; PM2 adds the in-app alert (the home card + the notice strip) | author-commit — 6.27a v2.9 (PM11 / PM16 / PM21 unchanged since v2.5) |
| `2026-10-10-312` | AL1–AL16 as written | author-commit |
| **`2026-10-10-315`** | C1–C8 — corrections to AL1, AL2, AL6, AL7, AL9, AL10, AL11, AL12, AL16 (the round-7 validate) | author-commit — governs where it differs from `-312` |
| **`2026-10-10-316`** | E1–E3 — erratum to `-315`: the EAS project id is one literal for every variant; the edge skip's scope worded in full; C1 also corrects AL7 (the round-8 re-validate) | author-commit — governs where it differs from `-315` |
| **`2026-10-10-317`** | R1–R3 — a reading on `-316`: E1's reason corrected; three residuals RECORDED, accepted (AL6 / AL11); Consequence 2 recognised and discharged (the round-9 re-validate) | author-commit |
| Architecture §4.7 | deep-link landing: (1) re-auth preserves the target; (2) scope match; (3) revoked ⇒ *"this is no longer available to you"* + helpline, *"Never hard 404"* | architecture (binding) |
| Architecture §3.4 + `-255` F7 | members got ⛔ no ordinary SMS before `-303` — `-303` Q1 A is the widening for the five | ruled |
| ADR-0022 | the public Astro shell: server-rendered, ⛔ no session, ⛔ no per-user branching | ratified |
| ADR-0010 (Row 3) | Cloudflare is the edge; DPDPA clearance scoped to the edge design *"as recorded"*; Row 3's owner = Trustee Panel, support Legal Counsel | ratified — `-315` C6 |
| ADR-0011 §5 | dev wires, operator applies (Traefik / Cloudflare) | ratified |
| ADR-0013 | the PII-scrape gate over public pages | ratified — AL8 / AL11 |
| ADR-0020 cl.4 · FR-60 / FR-61 | per-Pariwar site / domain; separate app per Pariwar | ratified / PRD |
| deferred-work D-13 · PRD OQ-1 | the production identity is owed before the first store build | ⏳ BigDev / the Trust — Row 29 (a) |
| deferred-work D8 · `deep-links/README.md:7` | the mobile deep-link HANDLER is absent; the `twt://` push grammar has ⛔ no consumer | open — AL13 |

## ⭐ THE INVARIANTS

1. **A link carries ⛔ no credential and ⛔ no personal data** — a fixed path and an opaque code; logging in happens ONLY in the app.
2. **⛔ No web page asks for a login, a number, an OTP or any data** — the fallback page is static words and (when they exist) store links.
3. **The fallback page ⛔ never reads, echoes or resolves the code** — ⛔ no API call, ⛔ no database read, ⛔ no language toggle that
   rebuilds links from the request URL (`PublicShell`'s toggle copies every query parameter); a test proves the rendered body ⛔ never
   contains the `c` value (the public-pages "two-route rule" and 6.27 PM21 (d) — ⛔ never an oracle — both stay intact).
4. **ONE list of app-link paths** — a JSON DATA file (`packages/contracts/src/app-links/app-link-paths.json`) that drives the app's link
   settings, the two verification files, the fallback pages, the route-map test and the senders' URL builder — ⛔ never a second copy (the
   app config CANNOT import TypeScript from `@twt/contracts` — F2b).
5. **⛔ No invented identity** — bundle id, package, Team ID, fingerprints and the EAS project come from config; unset ⇒ the verification file
   is ⛔ not served (404) and a production build THROWS — ⛔ never a guess.
6. **A link the app cannot place is ⛔ never a crash and ⛔ never a hard 404** — a path with ⛔ no route of its own lands on a dignified,
   bilingual "not found" with the helpline (§4.7 item 3). ⚠ Precisely: a MULTI-segment unknown path reaches `+not-found`; a ONE-segment
   path is caught by the two root-level catch-alls that exist today (`(helpdesk)/[ticketId].tsx`, `(polls)/[surveyId].tsx`) — which is WHY
   every app-link path ships with its own real route (AL16) and the Android filter matches EXACT paths only (AL7).

## 📜 Policy meaning (AI-10-1)

**This story introduces ⛔ no predicate and changes ⛔ none that gates a member's access to a benefit.** It decides how a link opens a
screen; who may see the screen behind it is the consumer's (6.27 PM21 (d): the request's own member only). AL6 (C3) makes an expired login
send the member to the login screen instead of an error — it gates ⛔ nothing new. In the member's terms: *"a link in a message from the
Trust opens the app where it should; it never lets anyone else in, and it never asks you to log in on a web page."* Niyamavali check: ⛔ not
applicable (the Niyamavali does not speak to app links) — and it is ⛔ not ratified ([[feedback_niyamavali_rulebook_not_spec]]).

## ⭐ FOUND FACTS

**The app (`apps/mobile`):**
- **F1 — versions:** Expo `~55.0.28`, expo-router `~55.0.17`, expo-linking `~55.0.16`, react-native `0.83.6`, React `^19.2.0`,
  `@react-navigation/native` `^7.0.0` (`package.json:24,38,45,47,54,56`); `main` = `expo-router/entry`; new architecture on;
  `experiments.typedRoutes: true` (`app.json:60-62`) ⇒ `router.replace` takes an `Href`. ⚠ The typed-route types (`.expo/types`) are ⛔ not
  committed ⇒ a typed `Href` to `/peer-request` fails local typecheck until the route file exists (AL16 ships it).
- **F2 — CNG:** `android/` and `ios/` are gitignored (`apps/mobile/.gitignore:47-48`) ⇒ link settings go in app config. `app.json` has ⛔ no
  `ios.associatedDomains`, ⛔ no `android.intentFilters`, ⛔ no `owner`, ⛔ no `extra.eas.projectId`; ⛔ no `app.config.*` exists. `eas.json`
  has `development` / `preview` / `production` profiles, ⛔ no `env` blocks, an empty `submit.production` (`eas.json:4-32`). ⚠ Local
  untracked `android/` / `ios/` dirs keep stale native config until `expo prebuild --clean`. ⭐ Nothing in tests / scripts / workflows reads
  `app.json` (the only hit is a comment at `lib/push-notifications.ts:108`) ⇒ replacing it is safe.
- **F2b — the app config cannot import the contracts barrel**: Expo SDK 55 loads `app.config.ts` through `@expo/require-utils` — ONLY the
  config file is transpiled (to CommonJS); its imports use plain Node resolution, and `@twt/contracts`' ESM barrel fails
  `ERR_MODULE_NOT_FOUND`. A `require()` of a JSON file works, and `require('@twt/contracts/src/app-links/app-link-paths.json')` resolves
  from `apps/mobile`. ⚠ A vitest run of the config resolves through Vite and would PASS, hiding a `.ts` import ⇒ AC3's `expo config` run.
- **F2c — EAS CLI evaluates the config LOCALLY before upload** (eas-cli `src/build/evaluateConfigWithEnvVarsAsync.ts`): first with ONLY the
  profile's `eas.json` `env` (to find `projectId`), then with `eas.json` `env` + EAS server variables — to choose credentials and, for iOS,
  to sync the App ID's capabilities from the entitlements. `EAS_BUILD_PROFILE` is set ONLY on the build worker (`packages/worker/src/
  env.ts`) ⇒ a config keyed on it resolves the PROTOTYPE locally ⇒ AL1 keys on `APP_VARIANT` (C1). eas-cli also refuses a `slug` that
  differs from the EAS project's (`getProjectIdAsync.ts`); `owner` is ⛔ not needed on SDK ≥ 53. `expo-updates` is ⛔ not installed
  (⛔ no `eas update`).
- **F3 — the guard** (`app/_layout.tsx:110-133`, in `RootLayoutNav`): a `useEffect` over `useSegments()` (deps `:133`) — termination notice
  → `/(auth)/terminated` (`:115-126`); ⛔ no session and ⛔ not in `(auth)` → `/(auth)/login` (`:127-129`); session and in `(auth)` →
  `/(tabs)` (`:130-131`). `useSegments()` carries ⛔ no query and keeps group names (`['(peer-request)','peer-request']`) ⇒ the target is
  read with `usePathname()` + `useGlobalSearchParams()`. `otp.tsx:38-39` (`await signIn(res); router.replace('/(tabs)')`) and the guard's
  `:130-131` BOTH fire on one login; the signup branch is `otp.tsx:46-48`. ⛔ No `returnTo` / `next` anywhere. `unstable_settings.
  initialRouteName: '(tabs)'` (`:36-39`) gives a cold-start link a back stack. The root `<Stack>` declares most groups with `headerShown:
  false` (`:138-238`; `(claim)`, `(membership)`, `(polls)`, `(signup)` are undeclared).
- **F3b — sign-out and termination** (`lib/session-context.tsx`): `signOut()` `:80-90` (its only caller `app/(withdrawal)/index.tsx:99`);
  the termination handler `:58-66` (`setSession(null)` + notice); `signIn` `:68-78`. `lib/session.ts:92-98` holds the module-level
  termination-handler slot; `:150-176` the 4xx refresh branch (`clearSession()`, then the termination callback ONLY for
  `auth.member_terminated`). Refresh TTL 90 days (`apps/api/src/config.ts:388`).
- **F4 — ⛔ no incoming-URL code**: ⛔ no `+native-intent.tsx`, ⛔ no `Linking.addEventListener` / `getInitialURL` / `useURL`; every
  `Linking` use is OUTBOUND. ⭐ expo-router consumes the launch / incoming URL by PATH (+ query) natively once the OS hands it over
  (`extractPathFromURL`) — ⛔ no `linking` config is needed for a verified https link.
- **F5 — route collisions:** route GROUPS vanish from the URL ⇒ TEN `…/index.tsx` resolve to `/`, and same-path pairs exist (`/medical`,
  `/nominees`, `/payment` — `(life-events)` / `(signup)` / `(renewal)`); two root-level dynamic routes (`(helpdesk)/[ticketId].tsx`,
  `(polls)/[surveyId].tsx`) catch ANY single segment (the two other dynamic routes are nested: `/drive/[driveToken]`, `/note/[id]`; ⛔ no
  catch-all). A STATIC segment beats a dynamic one (`expo-router/build/fork/getStateFromPath-forks.js:252-258`) ⇒ `app/(peer-request)/
  peer-request.tsx` → `/peer-request` wins. `app/+not-found.tsx` is still the template (English *"Oops!"*).
- **F6 — one Pariwar per session**: the access JWT carries `pariwar_id` (`apps/api/src/plugins/jwt/index.ts:27-33`); the app stores ONE
  `pariwarId` (`lib/session.ts:20,29-59`); multi-Pariwar selection is ⛔ not implemented (`otp.tsx:70-72`) ⇒ §4.7 item 2 has ⛔ no reachable
  case today.
- **F7 — mobile tests** are pure-logic and source-scan only (`vitest.config.ts:10-15`, `tests/unit/**/*.test.ts`, node env; ⛔ no screen
  renderer; route-tree tests read the directory — `tests/unit/sahyog-vivran-entry.test.ts:160-165`) ⇒ a device proof is a go-live record
  (AL12 (e)), ⛔ not a CI test. ⚠ Pins the dev must keep green: `tests/unit/terminated-during-refresh.test.ts:56-61` (the literal
  `router.replace('/(auth)/login')` AFTER the `terminationNotice) {` check), `terminated-during-refresh.test.ts:47` (`setSession(null)` within 120 characters of the termination
  handler's opening), `terminated-surface.test.ts:63-70` (⛔ no `summary` in
  `otp.tsx`), `banner-host-render.test.ts:219-222` (⛔ no `BannerHost` in the root layout).
- **F7b — the helpline CTA** `components/common/CallHelplineCTA.tsx` needs ⛔ no session or query; its number is
  `process.env.EXPO_PUBLIC_HELPLINE_TEL ?? '+911800000000'` (`:27`) ⇒ a production build without the env dials the placeholder (Row 29 (a)).

**The public site and hosting:**
- **F8 — `apps/public`**: Astro 6.4.8 + `@astrojs/node` 10.1.4 standalone, `output: 'server'` (`astro.config.mjs:16-33`); `site` =
  `PUBLIC_SITE_ORIGIN ?? 'https://twt.org'` (`:21` — a code default, ⛔ not a Trust domain); `build.inlineStylesheets: 'never'` (`:26`) ⇒
  every page links `/_astro/<name>.<hash>.css`; ⛔ no `public/` dir, ⛔ no middleware; default `trailingSlash: 'ignore'` (⛔ no redirect);
  each page sets its own `Cache-Control` (`404.astro:16`); robots by `<meta>` in `PublicShell.astro:60`. ⛔ No `zod` dependency.
- **F8b — `PublicShell`** (`PublicShell.astro`): Props `:17-25` = `locale`, `title`, `description?`, `trustName` (REQUIRED — rendered in
  `<title>` `:50/58`, header `:132`, footer `:148`), `branding: BrandingBundle | null` (`null` works — `404.astro:19`), `noindex?`;
  `<html lang>` takes ONE locale (`:54`). Its language toggle builds links from `new URL(Astro.url)` and keeps every query parameter
  (`withLang` `:32-36`, anchors `:135-140`) ⇒ under `/peer-request?c=X` it would render `href="/peer-request?c=X&lang=hi"`. `withLang` is the
  ONLY `Astro.url` read (⛔ no canonical / og:url echo). ⛔ No prop hides the toggle today.
- **F9 — the files must be ENDPOINTS, ⛔ not static:** Astro routes `.well-known` despite its dot (`node_modules/astro/dist/core/routing/
  create-manifest.js:95`; `assetlinks.json.ts` → segment `assetlinks.json`); a static or PRERENDERED file goes through `send`, whose
  `mime.lookup('apple-app-site-association')` is `application/octet-stream` — Apple requires `application/json`. ⚠ An endpoint returning
  404 with a null body is REROUTED to `404.astro` in production (`astro/dist/core/routing/handler.js:154-165` — HTML, `max-age=60`); still a
  404, which is all a verifier needs; a direct `GET()` call in a test sees the endpoint's own response.
- **F10 — the "two-route rule"** (`apps/api/src/modules/public-pages/routes.ts:43-50`) governs unauthenticated API GETs; a page making ⛔ no
  API call does ⛔ not touch it. A fallback page that RESOLVED the code would (a fourth route + an oracle).
- **F11 — the PII-scrape gate** (`packages/contracts/scripts/check-pii-scrape.ts`) fails CI for an undeclared `.astro` page (`:124-133`),
  indexing (`:136`), cache policy (`:149`); matrix `packages/contracts/public-pages/public-vs-private-matrix.yaml` (`/404` entry `:301-309`
  — `noindex`, `edge_cacheable`, `fields: []` — the template). ⭐ Its indexing leg accepts `noindex` ONLY from a page that renders
  `<PublicShell` (`packages/contracts/src/public-pages/gate.ts:157, 203-216`) ⇒ the fallback page MUST render `PublicShell`. ⚠ It collects
  ONLY `.astro` files (`check-pii-scrape.ts:69-88`) ⇒ the two `.ts` endpoints are invisible to it ([[feedback_gate_scope_semantic_coverage]]).
- **F11b — `apps/public` tests** (`apps/public/vitest.config.ts`, plain vitest, ⛔ no Astro plugin): `.astro` files are ⛔ not unit-tested
  here (`tests/authenticated-fragment.test.ts:3-5` — *"house convention puts display logic in pure `.ts`"*); display logic lives in pure
  `src/lib/*-render.ts` modules with their own tests (`sahyog-render.test.ts`, `niyamavali-render.test.ts`), `.astro` files are pinned by
  source scans. A `.ts` endpoint's `GET` can be imported and called directly.
- **F12 — hosting:** GitHub Actions → Artifact Registry → Dokploy (`.github/workflows/deploy-prod.yml:57-70`); Traefik rules
  `compose.yaml:31,37,56` (`/api/v1`, `/admin`, `/p/` — each router carries only a `rule` label; ⛔ no `Host()`, ⛔ no catch-all, ⛔ no overlap
  with the new rules); the `public` service has ⛔ no `environment:` block (`DATABASE_URL`, `PUBLIC_API_ORIGIN` read but ⛔ not wired);
  `ADMIN_APP_ORIGIN` is also absent from the jobs block (`:44-47`). Traefik `Path()` matches the path only (⛔ not the query).
- **F13 — the edge:** `infra/cloudflare/zone.tf:14-18` (SSL strict, always HTTPS), `:23` `browser_check = "on"` + the zone security level —
  ALWAYS on. `waf.tf:29-39`: `cloudflare_ruleset.waf_custom` — `count = var.enable_bot_management ? 1 : 0` (`:33`; the variable defaults
  false, `variables.tf:49-53`), `kind = "zone"`, `phase = "http_request_firewall_custom"` — the zone's ENTRY-POINT ruleset for that phase,
  and Cloudflare allows ONE per phase per zone; Rules 1–3 `:41-66`; `outputs.tf:32` indexes `waf_custom[0]`; provider v4.52 (skip
  `products` incl. `bic`, `securityLevel`; `phases` incl. `http_request_sbfm` — Super Bot Fight Mode IS skippable; Free-plan Bot Fight Mode
  is ⛔ not). ⛔ No domain committed (`variables.tf:25-26`). Logpush records `ClientRequestPath` (`observability.tf:21`) — the path WITHOUT
  the query (`ClientRequestURI` carries it). ⛔ No Cloudflare cache rules (HTML / `.json` are ⛔ not edge-cached by default). ⚠ `terraform
  fmt -check -recursive infra/cloudflare` FAILS at HEAD on `waf.tf:23` (`enable_js` alignment) ⇒ Task 8 fixes it; and `terraform validate` FAILS at HEAD (provider resolves to 4.52.9 under `>= 4.40, < 5.0` — `versions.tf:18`):
  `waf.tf:18` `account_id` is ⛔ not an argument of `cloudflare_bot_management` ⇒ Task 8 removes it (N11). ⛔ No CI step runs terraform.

**Config, CI and governance:**
- **F14 — the base-URL precedent is `ADMIN_APP_ORIGIN`** (6.25, `-299` RE7): an env var read at boot (`apps/jobs/src/boot.ts:630`),
  validated EVERY run by `resolveAdminAppOrigin` (`apps/jobs/src/scheduler/staff-email-config.ts:102-121` — `https:` only, ⛔ no
  credentials / path / query / fragment; a trailing `/` stripped; case and `:443` normalised; a non-default port kept; unset / blank /
  not-a-URL ⇒ `null`), `null` ⇒ hold `config:admin_app_origin_invalid` (`claim-suspicion-staff-emails.ts:46,101,275,382-385`); documented
  `apps/jobs/README.md:128`; tested `apps/jobs/tests/staff-email-client.test.ts:32,321-334` (imports the name). ⚠ A Secret Manager key named
  `app_links.base_url` would risk the recorded dotted-secret-id defect (deferred-work, marked UNVERIFIED there: *"GCP secret ids do not allow
  (`[A-Za-z0-9_-]`); INVALID_ARGUMENT is not NOT_FOUND"*) ⇒ AL5 uses an env var.
- **F15 — the push grammar** `packages/contracts/src/deep-links/deep-link.ts` (`twt://p/<pariwarId>/<resource>[/<id>]`, closed
  `DeepLinkResource`, `:33-138`) has producers (`packages/channels/src/render.ts:29,134-137`) and ⛔ no consumer; the app's scheme is
  `twtp05` ⇒ AL13.
- **F16 — ⛔ no rule forbids a link in a member text**; `-303` Q1 A RATIFIES one in the five neighbours' text. The only "⛔ no deep link" rule
  is the termination notice's (`2026-08-10-097`, Story 10.19) — ⛔ not touched.
- **F17 — CI mirror:** `scripts/ci-local.sh:3-13` mirrors `.github/workflows/ci.yml` job for job ⇒ a new check goes in BOTH.
- **F18 — the friction budget:** `scripts/friction-budget/lib.ts:453` `MEMBER_FACING_PREFIXES = ['apps/mobile/', 'apps/public/']` ⇒ this
  story's changes in BOTH apps trigger `friction-budget.md`'s AC-4, satisfied by a NEW declaration row or a NEW per-story disposition block
  (`**Story 6.30 disposition (…):**`, the shape at `friction-budget.md:56` / `:83`) — touching the file is ⛔ not enough.
- **F19 — copy homes:** both apps read `packages/i18n/locales/{en,hi}/<ns>.json`. Mobile `useT()` defaults to `common` (which
  `CallHelplineCTA` uses); `common.json` is in `microcopy.yaml` `copy_globs` and `scripts/microcopy/common.test.ts` scans every value incl.
  `$comment.*`. A NEW namespace must be registered in `packages/i18n/src/catalog.ts:29-77` (`packages/i18n/tests/catalog-registration.test.ts`
  fails otherwise) and added to `copy_globs`; Hindi parity is enforced (`locales/classification.json` defaults to member-facing). The mobile
  app always renders Hindi until row 6-35 ⇒ "bilingual" on mobile = en + hi keys; on the fallback page = both languages ON the page.
- **F20 — contracts:** `tsconfig.base.json` — `module: ESNext`, `moduleResolution: Bundler`, `resolveJsonModule: true` (`:13`) ⇒ a JSON
  import needs ⛔ no import attributes; precedent `packages/i18n/src/catalog.ts` (bundled by Metro and by Astro's Vite — `@twt/contracts` is
  in Astro's `ssr.noExternal`). A JSON import widens to `string` ⇒ the `'/peer-request'` literal type is declared by hand and held to the
  JSON by the lockstep test. `@twt/contracts` is already a dependency of `apps/public` and `apps/mobile`; contracts has `zod`.

## ⚖️ Build decisions AL1–AL16 (COMMITTED — `2026-10-10-312`, corrected by `2026-10-10-315` C1–C8, `2026-10-10-316` E1–E3 and `2026-10-10-317` R1–R2)

> ⭐ This block is the committed text ONLY — `-312`'s wording with `-315` / `-316`'s corrections folded in (each marked). How to build it —
> file names, test shapes, formats — is in **Dev Notes → Build notes N1–N20** (implementation detail, ⛔ not decisions).

- **AL1 — identity is config, ⛔ not invented** (corrected by `-315` C1 and `-316` E1). `apps/mobile/app.json` → `app.config.ts` (a static
  base + a function of the build variant and env). ⭐ The variant is `APP_VARIANT`, set in each `eas.json` build profile's `env`
  (`development` / `preview` / `production`) — ⛔ never `EAS_BUILD_PROFILE` (F2c). `name`, `scheme`, `ios.bundleIdentifier`,
  `android.package` keep TODAY's prototype values for `development` / `preview` AND when `APP_VARIANT` is unset (local `expo start`, `expo
  prebuild`, `expo export --platform web` / `build:web`, `eas update` without a profile env) — so nothing local changes; ONLY `APP_VARIANT=production` reads `APP_IDENTITY_*` env and FAILS THE
  BUILD when unset (⛔ never a silent prototype production build). The `APP_IDENTITY_*` values sit in the production profile's `eas.json`
  `env` (public values — the CLI's first local evaluation sees ONLY `eas.json` `env`). `slug` is ONE value for every variant (eas-cli refuses
  a slug ≠ the EAS project's). ⭐ `extra.eas.projectId` is ONE public literal in the static base for EVERY variant, written when BigDev
  creates the EAS project (Row 29 (a)), absent until then, and EXCLUDED from AC3's fixture comparison (`-316` E1; its reason per `-317` R1 —
  every `eas build` evaluates the config with its OWN profile's env, so development / preview builds would lack a production-only id;
  `eas submit` and `eas env:*` evaluate with the shell env alone); the Expo account it belongs to is BigDev's call (`-315` C1). `eas submit` runs with `APP_VARIANT=production` and the `APP_IDENTITY_*`
  values exported (a README line, a Row 29 note); `submit.production.ascAppId` is set at Row 29. This story ⛔ never chooses the production
  identity (D-13 / OQ-1 — BigDev / the Trust; an Android package can ⛔ never change after the first Play upload) — owed before the first
  production build, carried on Row 29 (a). ⚠ Changing the identity later orphans the Firebase app registered under `…p0prototype`
  (`docs/native-stack-validation/task-10-execution-runbook.md:49`) — recorded on Row 29.
- **AL2 — ONE app-link path list, as DATA** (detail corrected by `-315` C2). NEW `packages/contracts/src/app-links/app-link-paths.json` —
  `{ "peerRequest": "/peer-request" }` (closed; a new path = a deliberate grammar change, the `DeepLinkResource` discipline).
  `app.config.ts` loads it with `require('@twt/contracts/src/app-links/app-link-paths.json')` — by PACKAGE name, ⛔ never `../../packages/…`
  (Node loads JSON natively — ⛔ never a `.ts` import from contracts in the app config, ⛔ never reliance on Node type-stripping: the EAS image's Node version is ⛔ not
  pinned). The TypeScript module `packages/contracts/src/app-links/` (barrel-exported) imports the same JSON via `resolveJsonModule` and
  exports `APP_LINK_PATHS` (typed `as const`
  view), `APP_LINK_CODE_PARAM = 'c'`, `APP_LINK_CODE_PATTERN` (`[A-Za-z0-9]{12}` — for 6.27c's generator and route), `buildAppLinkUrl(baseUrl,
  key, code)` → `<base><path>?c=<code>` (the code asserted, URI-safe by construction), `parseAppLinkCode(params)`, and the pure builders of the
  two verification-file bodies from a LIST of app identities (`{ iosAppId: '<TEAMID>.<bundleId>' }`, `{ androidPackage, sha256Fingerprints[]
  }`) and the paths (AASA `components` = `{"/": path}` per path, ⛔ no `"?"` component — iOS, like Android, opens the app with or without `c`;
  assetlinks = one `handle_all_urls` statement per package). A lockstep test proves the JSON, the TS view, the app config's resolved intent
  filters and the AASA components list the SAME paths — in `apps/mobile` (contracts cannot import the app config). ⭐ Consumed by 6.27c (the
  sender's `{link}`), 6.27a (the route body), the app config (AL7), the public site (AL8 / AL11), AL16. ⛔ No second copy (Invariant 4).
- **AL3 — the URL shape: `https://<domain>/peer-request?c=<code>`** — fixed host, fixed path, the code ONLY in the query (SIX FACTS #2;
  whitelisted as `https://<domain>/peer-request?`); ⛔ no shortener (RBI's 2025 circular discourages unbranded shorteners — re-check at
  Task 0.1; a redirect hop also breaks link interception); ⛔ no redirect anywhere on the path.
- **AL4 — the code in logs.** App code ⛔ never logs it (6.27 PM21 (e)). The configured Cloudflare Logpush records `ClientRequestPath`, which
  EXCLUDES the query ⇒ the code is ⛔ not in the edge logs as configured; ⭐ rule: ⛔ never add `ClientRequestURI` to `logpull_options` (a
  README line beside `observability.tf`). Residuals RECORDED, ⛔ not claimed absent: Traefik access logs record path + query IF they are
  switched on; link-preview fetchers (Google Messages, WhatsApp) may fetch the URL. The code is ⛔ not a credential (PM21 (a)/(d)) and the
  fallback page shows ⛔ nothing for it, so each residual exposes ⛔ nobody's data.
- **AL5 — `APP_LINKS_BASE_URL` is an ENV VAR in `apps/jobs`** (the `ADMIN_APP_ORIGIN` shape, F14), and the VALIDATOR is shared, ⛔ never
  copied: `resolveAdminAppOrigin` is renamed / generalised to ONE `resolveHttpsOrigin(raw)` in `apps/jobs/src/scheduler/` (its existing
  callers and tests keep passing unchanged — a pure rename + re-export), used for both; `https:` only, an ORIGIN — ⛔ no path / query /
  credentials / fragment; ⭐ a trailing `/` is ACCEPTED and stripped (the precedent's behaviour, kept); invalid / unset ⇒ `null`. ⭐ OWNERSHIP:
  6.30 owns the validator, its table test, the `apps/jobs/README.md` row and the `compose.yaml` jobs-block line; **6.27c owns the boot read
  and the dep** (in the `boot.ts:630` inline shape) and its sweep's hold `config:app_links_base_url_invalid` — that sweep does ⛔ not exist when 6.30 lands. ⛔ No code default (unlike the two
  `twt.org` defaults, F8). (Supersedes 6.27 PM21 (b)'s first *"read like the template ids (Secret Manager)"* — 6.27 v1.3 carries it; PM21
  was ⛔ not yet committed at `-312`, so ⛔ no decision was superseded; `-311` has since committed PM21 with the env var.)
- **AL6 — the login keeps its place** (§4.7 item 1; corrected by `-315` C3). (i) EVERY refresh refused with a 4xx resets the in-app session
  the way the termination handler does, so the guard sends the member to login from the link's screen (F3b). (ii) The root guard
  (`_layout.tsx:127-129`), when it sends a member without a session to login, records the requested target in MEMORY (a module-level holder in
  `lib/link-target.ts`, ⛔ not MMKV / SecureStore — a link target ⛔ never outlives the app process), read from `usePathname()` +
  `useGlobalSearchParams()` (`useSegments()` carries ⛔ no query): ONLY an `APP_LINK_PATHS` path (an allowlist — ⛔ not an arbitrary path) and
  ONLY its `c`, after `parseAppLinkCode` (⛔ no other parameter is carried). (iii) ONE consumer: `otp.tsx`'s full-session branch takes the
  target BEFORE `await signIn(…)` and replaces to it (an `Href` built from `APP_LINK_PATHS` + `c`), else `/(tabs)`; it is consumed once; the guard's
  own post-login branch (`:130-131`) stays `/(tabs)` and ⛔ never reads the holder. (iv) The holder is cleared on the signup branch BEFORE
  `signIn`, on sign-out (`signOut()`), and on both termination paths. The termination branch (`:115-126`) WINS over any target. ⚠ RECORDED,
  accepted: if the process dies during the OTP step the target is lost — the member still finds the request on the home screen (6.27a's
  card) and in the message. ⚠ RECORDED, accepted (`-317` R2 (a) / (b)): if `signIn` throws after `otp.tsx` has taken the target, the target
  is lost (the OTP error shows; the request is on the home screen); a link arriving while the member is on `/(auth)/otp` replaces the OTP
  screen with login (a fresh OTP may hit the rate limit); a missing or malformed `c` gives ⛔ no target ⇒ `/(tabs)`. §4.7 item 2 (scope switch): ⛔ not reachable — one Pariwar per session (F6); the consumer's resolver 404s a
  foreign code (PM21 (d)) — RECORDED. §4.7 item 3: the consumer's screen (AL16).
- **AL7 — the app's link settings** (in `app.config.ts`, `APP_VARIANT=production` only — `-315` C1 / `-316` E3 — from `APP_LINKS_HOST`):
  `android.intentFilters` = `[{ action: 'VIEW', autoVerify: true, data: <each path>.map(p => ({ scheme: 'https', host, path: p })),
  category: ['BROWSABLE', 'DEFAULT'] }]` — ⭐ **`path` (EXACT), ⛔ never `pathPrefix`** (a prefix `/peer-request` also matches
  `/peer-requests` and `/peer-request-x`; the AASA `"/": "/peer-request"` is exact — both platforms match the same path set);
  `ios.associatedDomains = ['applinks:<host>']`. Unset host in production ⇒ ⛔ no link settings (the app still builds; links open the browser
  → the fallback page). `development` MAY set `applinks:<host>?mode=developer` (Apple-CDN bypass) — ⛔ never in production; that entry is
  EXCLUDED from AC3's byte-equivalence snapshot. ⚠ `preview` gets ⛔ no link settings ⇒ the device proof (AL12 (e)) needs a
  PRODUCTION-SIGNED build.
- **AL8 — the two verification files** = server-rendered Astro endpoints `apps/public/src/pages/.well-known/apple-app-site-association.ts`
  and `assetlinks.json.ts` (⛔ no `prerender` — F9), `GET` only, `200` + `Content-Type: application/json` + `Cache-Control: public,
  max-age=3600`, bodies from AL2's builders over env read at REQUEST time via `process.env` (⛔ not `import.meta.env`; any build-time variable
  declared in `turbo.json` `globalEnv`): `APP_LINKS_IOS_APP_IDS` (comma list of `<TEAMID>.<bundleId>`) and `APP_LINKS_ANDROID_APPS` (a JSON
  list `[{ package, sha256: [...] }]`, validated by a zod schema); unset / invalid ⇒ **404** (⛔ never a body that verifies the wrong app).
  ⚠ The PII-scrape gate cannot see `.ts` endpoints (F11) ⇒ the handlers get their own tests (content type, body shape, 404 when unset, ⛔ no
  member data) AND the gap is recorded as a deferred-work item (gate scope) — ⛔ not widening the gate here (ADR-0013's gate is its own
  change).
- **AL9 — hosting** (dev wires, operator applies — ADR-0011 §5; corrected by `-315` C4): `compose.yaml` gains ONE Traefik router for the
  `public` service, scoped to EXACT page paths — ``Path(`/.well-known/apple-app-site-association`) || Path(`/.well-known/assetlinks.json`) || Path(`/peer-request`) ||
  PathPrefix(`/_astro/`)`` (one `Path(...)` per `APP_LINK_PATHS` entry; ``PathPrefix(`/_astro/`)`` = the site's hashed static assets — public,
  data-free, ⛔ never a page; ⛔ never ``PathPrefix(`/.well-known/`)`` — that would send ACME and future well-known paths to Astro; ⛔ never
  ``PathPrefix(`/peer-request`)`` — a plain string prefix); the `public` service gains ONLY the app-link variables (`APP_LINKS_IOS_APP_IDS`,
  `APP_LINKS_ANDROID_APPS`, `APP_STORE_URL_ANDROID`, `APP_STORE_URL_IOS`, `APP_DISPLAY_NAME`) — ⛔ not its whole missing `environment:` block
  (`DATABASE_URL` / `PUBLIC_API_ORIGIN` are outside this story, RECORDED as a deferred-work item); `APP_LINKS_BASE_URL` in the jobs block
  (AL5); `infra/dokploy/README.md` documents them. ⚠ The as-built `/p/` rule vs root-level pages mismatch (F12) is RECORDED, ⛔ not
  re-architected here.
- **AL10 — the edge** (corrected by `-315` C5 / C6 and `-316` E2): `cloudflare_ruleset.waf_custom` exists UNCONDITIONALLY; its FIRST rule is
  the skip — `action_parameters { ruleset = "current"; products = ["bic", "securityLevel"]; phases = ["http_request_sbfm"] }` — for EXACTLY
  the two `.well-known` paths (`http.request.uri.path in {"/.well-known/apple-app-site-association" "/.well-known/assetlinks.json"}`); ⛔ never
  `/peer-request` (a human page — normal edge rules apply); Rules 1–3 are added only when `enable_bot_management` is on (a `dynamic "rules"`
  block); `outputs.tf`'s `waf_custom[0]` follows. Free-plan Bot Fight Mode cannot be skipped — the operator records whether it is on.
  ⚠ ADR-0010's DPDPA clearance (Row 3 — owner Trustee Panel, support Legal Counsel) is scoped to the edge design *"as recorded"*: the author's
  reading, recorded WITH its ground on Row 29 — the skip passes over Browser Integrity Check, the zone security level and Super Bot Fight
  Mode (and Rules 1–3 when bot management is on) for two public, data-free files; Cloudflare processes the same data on the same edge with or
  without it ⇒ ⛔ not material. If that reading is ever questioned, it goes to Row 3's owners — ⛔ never settled by the operator.
- **AL11 — the fallback page** `apps/public/src/pages/peer-request.astro` (one per `APP_LINK_PATHS` entry; a lockstep test proves each path
  has a page AND a matrix entry; corrected by `-315` C7). ⭐ It renders `PublicShell` (the PII-scrape gate accepts `noindex` only from a
  `PublicShell` page — F11) with a NEW prop that hides its language toggle (`withLang()` ⛔ never called under it); `branding={null}`;
  `trustName` = a neutral page title from the copy (⛔ never a Trust name — the legal name is pending); `<html lang="hi">` with the English
  block marked `lang="en"`; BOTH languages on ONE page, Hindi first, ⛔ no language toggle; `noindex`; `Cache-Control: public, max-age=300`
  (the body ⛔ never varies ⇒ ⛔ no `Vary`); `Referrer-Policy: no-referrer` (a store-link click ⛔ never leaks the code); ⛔ never reads
  `Astro.url` or its search params. Words — en: *"Please open the app to answer. The request is also on your app's home screen. Don't have the
  app? Install it, then open the link in your message again — or call the helpline number in your message."* + the hi equivalent; ⭐ the app
  is ⛔ never named by a hard-coded brand (OQ-1 may change it) — the name, if shown, comes from ONE env value (`APP_DISPLAY_NAME`, set beside
  `APP_IDENTITY_*`), else the words say "the app"; *"your message"*, ⛔ not *"your text"* (6-31's WhatsApp reminder carries the same link).
  Store buttons ONLY when env `APP_STORE_URL_ANDROID` / `APP_STORE_URL_IOS` are set (⛔ no dead link). ⛔ No helpline number on the page
  (apps/public has ⛔ no helpline source; the message carries it — ⛔ never a second source). A handler test asserts the response body ⛔ never
  contains the `c` value (Invariant 3 — realised as N12). Matrix entry: `route: /peer-request`, `fields: []`, `noindex`, `edge_cacheable`.
  Friction budget: a page with ⛔ no scoped style adds ~0. ⚠ RECORDED, accepted (`-317` R2 (c)): the home-screen line is inaccurate after
  the request has closed or for a forwarded recipient — it discloses ⛔ nothing.
- **AL12 — the go-live record** (roster numbers RESERVED by `2026-10-10-305` §4; (g) / (h) corrected by `-315` C6): **Row 27** and **Row 28**
  belong to 6.27 (Row 28's Hindi review explicitly INCLUDES 6.30's fallback page, `+not-found` AND AL16's route-shell placeholder); **Row
  29** = 6.30 `app-links-live`; whichever story's Task 0 lands first writes its OWN row at its reserved number (a gap in the roster is
  expected and noted). Row 29 closes on ALL of: (a) the production app identity decided by BigDev and in `APP_IDENTITY_*` + `APP_DISPLAY_NAME`
  (D-13 / OQ-1 — ⛔ no sprint row), with the values `-315` Consequence 2 owes — its `APP_EAS_PROJECT_ID` REPLACED by the literal of `-316` E1 (where each lives — N19); (b) the Trust's domain set
  in `APP_LINKS_BASE_URL`, `APP_LINKS_HOST`, `PUBLIC_SITE_ORIGIN`, `EXPO_PUBLIC_PUBLIC_SITE_ORIGIN` (ONE fact, four settings — documented, ⛔ not
  extracted, [[feedback_no_premature_package]]); (c) Apple Team ID + the Play App Signing (and upload-key) fingerprints in the env; (d) both
  files verified (`adb shell pm get-app-links <pkg>` shows `verified`; Apple's CDN `https://app-site-association.cdn-apple.com/a/v1/<domain>`
  returns the file); (e) a DEVICE PROOF on a PRODUCTION-SIGNED build, Android and iOS: a link opens the screen (logged in, and logged out →
  login → the screen) and, without the app, the fallback page — done AFTER the files have been live a day, recorded with dates (Trap 8);
  (f) the URL's fixed part whitelisted with the SMS operator(s) (one DLT-sheet line); (g) the Traefik and Cloudflare changes APPLIED by the
  operator (AL9 / AL10); (h) the Hindi of the fallback page, `+not-found` AND the route-shell placeholder reviewed by a person (via Row 28).
  6.27's Row 27 (e) points at this row.
- **AL13 — the `twt://` push grammar is ⛔ not touched** — push stays inert (⛔ no device token is registered — 6.27a SEVEN FACTS #1); the
  scheme mismatch (`twtp05` vs `twt`) and D8 stay open; AL1's `scheme` reads config so a later push story can set `twt` — RECORDED.
- **AL14 — a dignified "not found"**: `app/+not-found.tsx` becomes bilingual (en + hi), says the page could not be opened, offers *"Go to
  home"* and the shared `CallHelplineCTA` (§4.7 *"Never hard 404"*); ⛔ no crash on an unknown multi-segment path (Invariant 6 states the
  one-segment limit). Hindi agent-authored (`$comment` marker; human review = Row 28 — AL12 (h)).
- **AL15 — a POINTER, ⛔ not a task: the typed-variable rule** (SIX FACTS #3) belongs to row `6-34-sms-templates-typed-variables` (BigDev,
  2026-10-10) — the OTP template, the five `sms-dlt-registry.ts` entries, the twelve drafted templates, `otp-sms-template.test.ts` and the
  two claim-template lockstep tests (paths — N20). 6.30 retags ⛔ nothing; it records the dependency: a rejected OTP template blocks every
  login, so Row 29 (e)'s logged-out leg ⛔ cannot pass until row 6-34's OTP retag is approved by the operator.
- **AL16 — the route shell and the STRICT route-map test** (corrected by `-315` C8). ⭐ **6.30 OWNS**
  `apps/mobile/app/(peer-request)/peer-request.tsx` — a THIN shell that PARSES `c` (`useLocalSearchParams`, through `parseAppLinkCode`) and
  renders a CONSUMER SLOT; until 6.27a fills it the slot shows a bilingual placeholder (*"Your requests appear on your home screen."* +
  `CallHelplineCTA`), ⛔ no API call, ⛔ no data (its Hindi is reviewed under Row 28). The root `<Stack>` gains `<Stack.Screen
  name="(peer-request)" options={{ headerShown: false }} />` (the house pattern). ⭐ **The split, stated ONCE (and the same in 6.27a PM11 /
  PM21):** 6.30 parses `c` in the shell and owns the login-return (AL6); **6.27a fills the slot** — the list, the questionnaire, the
  not-openable copy (*"This request could not be opened"* + `CallHelplineCTA`) and *"⛔ no API call before the session has loaded"*; **6.27c
  wires the parsed `c` to the by-link resolver** (route + call), its 404 reusing 6.27a's not-openable state — ⛔ never a second route file.
  ⭐ The test, over `apps/mobile/app/`: (i) FAILS when an `APP_LINK_PATHS` entry has ⛔ no route (it accepts `peer-request.tsx` or
  `peer-request/index.tsx`, group segments stripped, `_layout` ignored); (ii) FAILS when two files claim the same `APP_LINK_PATHS` path (⛔ not
  tree-wide — same-path pairs exist elsewhere, F5); (iii) PINS the set of ROOT-LEVEL dynamic routes to exactly the two that exist today
  (`(helpdesk)/[ticketId]`, `(polls)/[surveyId]`) — so ⛔ no story adds a third root catch-all. ⚠ Recorded for 6.27a: its questionnaire pages
  and Thank-you are IN-SCREEN state, or real NESTED segments under `/peer-request/…`, ⛔ never a `(peer-request)/[x].tsx` (a third root
  catch-all — Trap 5 generalised).

## Acceptance Criteria

1. **AC1 — governance first.** ⛔ No code before the AL author-commits (`-312`, `-315`, `-316`, `-317`) — all ✅ landed alone; Task 0.4's records (epics.md
   `### Story 6.30`, Row 29, the DLT-sheet section, the sprint-row annotation) follow them.
2. **AC2 — one path list, as data** (AL2): `app-link-paths.json`, `APP_LINK_PATHS`, `APP_LINK_CODE_PARAM`, `APP_LINK_CODE_PATTERN`,
   `buildAppLinkUrl`, `parseAppLinkCode`, the AL8 env schemas and the two body builders exist with unit tests in
   `packages/contracts/tests/app-links.test.ts`: URL form `<origin>/peer-request?c=<12 base62>`; a malformed code refused; a base with a path
   or a trailing `/` refused; `parseAppLinkCode` → `null` for missing / malformed / array `c`; AASA `components` (`{"/": path}`, ⛔ no `"?"`)
   and assetlinks statements for 1 and for 2 app identities; ⛔ no duplicate paths; the JSON ↔ TS-view lockstep; the schemas reject a bad
   Team ID / bundle id / fingerprint.
3. **AC3 — the app config loads and resolves** (AL1 / AL7): BEFORE `app.json` is removed, its resolved public config is captured as a
   committed fixture (`apps/mobile/tests/fixtures/app-config-prototype.json`, from `npx expo config --type public --json`). `npx expo config
   --type public` RUNS clean for `APP_VARIANT` unset / `development` / `preview` / `production` (with fixture `APP_IDENTITY_*` +
   `APP_LINKS_HOST`) — a job in BOTH `.github/workflows/ci.yml` and `scripts/ci-local.sh` (F17), ⛔ not only a vitest snapshot; unset /
   `development` / `preview` equal the fixture (the `?mode=developer` entry excluded); `production` without `APP_IDENTITY_*` exits NON-ZERO;
   with `APP_LINKS_HOST` it carries one `autoVerify` https intent filter with an EXACT `path` per entry and `applinks:<host>`; without it, ⛔ no
   link settings; `extra.eas.projectId`, when present, is the same literal in every variant and is EXCLUDED from the fixture comparison
   (`-316` E1). A test reads `eas.json` and asserts each build
   profile's `env.APP_VARIANT` equals the profile name. The four-way lockstep (JSON ↔ TS view ↔ resolved intent filters ↔ AASA components)
   passes in `apps/mobile/tests/unit/app-links-lockstep.test.ts`.
4. **AC4 — the login keeps its place** (AL6): pure-logic tests of `lib/link-target.ts` (`apps/mobile/tests/unit/link-target.test.ts`) for
   every N7 case, consume-once, and the clears; source-scan pins that (i) the guard records via `usePathname` + `useGlobalSearchParams`
   and keeps the literal `router.replace('/(auth)/login')` after the termination check; (ii) `otp.tsx`'s full-session branch takes the target
   BEFORE `signIn` and is the ONLY site that consumes it (the guard's `(tabs)` branch ⛔ never reads the holder); (iii) the signup branch
   clears BEFORE `signIn`, and `signOut()` and both termination paths clear; (iv) `lib/session.ts`'s 4xx branch calls the dead-refresh
   handler for EVERY 4xx, after the termination callback (N5), and `session-context.tsx` registers `setSession(null)` for it. The existing
   pins (F7) stay green.
5. **AC5 — the two files** (AL8): each endpoint's `GET` (called directly — `apps/public/tests/well-known-endpoints.test.ts`) returns `200`,
   `application/json`, `Cache-Control: public, max-age=3600` and the builder's exact body for configured identities; `404` when unconfigured
   or invalid; env read per request (a test changes the env between two calls); ⛔ no redirect; ⛔ no `prerender` export (source scan); ⛔ no
   member data; the gate-scope gap recorded.
6. **AC6 — the fallback page** (AL11): `peer-request-render.ts` tests (`apps/public/tests/peer-request-page.test.ts`) prove both languages,
   ⛔ no hard-coded brand (with and without `APP_DISPLAY_NAME`), ⛔ no store buttons unless configured, and ⛔ no `c` value in its output for a
   distinctive code; source scans prove `peer-request.astro` renders `<PublicShell` with `hideLanguageToggle`, `noindex`, `branding={null}`,
   sets `no-referrer` and its `Cache-Control` and ⛔ no `Vary`, and never reads `Astro.url` / `Astro.request` / `searchParams` / `fetch`; a
   scan proves `PublicShell` ⛔ never calls `withLang` under `hideLanguageToggle`; declared in the matrix; the PII-scrape gate passes; a REAL-`t()` test resolves every new `app-links` key in en and hi (the
   `catalog.ts:18-27` ask — ⛔ never a stub).
7. **AC7 — the route exists, ⛔ no collision, ⛔ no crash** (AL14 / AL16): the strict route-map test
   (`apps/mobile/tests/unit/app-link-route-map.test.ts`) passes ((i)–(iii)); the `(peer-request)` `Stack.Screen` with `headerShown: false`
   exists; the shell renders its slot / placeholder for any `c` (source scan: ⛔ no API import); `+not-found` uses en + hi keys and
   `CallHelplineCTA` (`not-found-copy.test.ts`); i18n parity + `microcopy:test` + `microcopy:check` green; a REAL-`t()` test resolves every new `common.json` key in en and hi.
8. **AC8 — hosting and edge wired** (AL9 / AL10): the Traefik router (the exact paths + ``PathPrefix(`/_astro/`)``), the `public` service's
   app-link variables, `APP_LINKS_BASE_URL` in the jobs block, the unconditional `waf_custom` with the skip FIRST (bic + securityLevel +
   `http_request_sbfm`, exactly the two files) and Rules 1–3 dynamic, `outputs.tf` updated, and the "⛔ never `ClientRequestURI`" README line
   are in `infra/`; `terraform fmt -check -recursive infra/cloudflare` passes (incl. the `waf.tf:23` fix); `terraform validate` (needs
   `terraform init`, a network call — ⛔ not in CI) passes after N11's `waf.tf:18` fix, run once, its output recorded in the Dev Agent Record
   (validate does ⛔ not evaluate `count` / `dynamic` values — a `terraform plan` per bot-management setting is the operator's, at Row 29 (g));
   ⛔ not applied by this story.
9. **AC9 — the shared validator** (AL5): `resolveHttpsOrigin` accepts exactly an https origin — `https://x` and `https://x/` ⇒ `https://x`;
   case and `:443` normalised — and returns `null` for `http:`, a path, a query, credentials, a fragment, blank and a non-URL (table test,
   `apps/jobs/tests/https-origin.test.ts`); `resolveAdminAppOrigin` is an alias and every existing caller and test passes unchanged; the
   README row and compose line exist. ⛔ No boot wiring here (6.27c's).
10. **AC10 — the records**: Row 29 (AL12, with its notes) at its reserved number; the DLT sheet's URL-whitelisting section; the deferred-work
    items (AL8's gate scope, AL9's un-wired `public` env, AL13's scheme / D8 note and the `parseDeepLink` item staying with push, the 429-on-refresh
    note (N5), D-13 pointed at Row 29); the AL15 pointers; the Rows 27 / 28 check (Task 9); the note to 6.27c (`APP_LINK_CODE_PATTERN`) and the `deep-links/README.md` line
    (N16); a `**Story 6.30 disposition (…):**` block in `friction-budget.md` (F18) —
    the friction-budget gate passes; `pnpm ci:local` green.

## Tasks / Subtasks

> ⚠ **Shared checkout:** other sessions may work in the main TWT checkout — build on branch `story/6-30-app-links-open-the-app-from-a-text`
> (it exists, from `main` `34b9bab6` + `-315` / `-316` / `-317` and this file) in its own worktree; ⛔ never `git switch` the shared checkout
> ([[feedback_shared_tree_branch_switch]]).

- [x] **Task 0 — governance FIRST (AC1).** ⛔ No code.
  - [x] 0.1 Re-check `git diff --name-only 1cce7e5a..HEAD -- packages apps infra scripts .github turbo.json`; re-read any cited file that
        moved. Re-check the platform claims with the SMS provider / docs: `{#alphanumeric#}` ≤ 40 chars, the 18 Nov 2025 Direction date,
        RBI's 2025 circular on shorteners, Android 15+ re-verification timing, F2c (eas-cli's local config evaluation).
  - [x] 0.2 Put AL1–AL16 to BigDev — ✅ answered in session 2026-10-10: all OK (AL13 after a plain-language explanation).
  - [x] 0.3 ✅ `2026-10-10-312` (`b3a9476b`; branch twin `21e89ed6`), committed ALONE.
  - [x] 0.3b ✅ `2026-10-10-315` (`a3253ec0`) — C1–C8, committed ALONE (BigDev, in session: *"All"*, *"Yes, record it"*).
  - [x] 0.3c ✅ `2026-10-10-316` (`a2b994b7`) — E1–E3, the erratum to `-315`, committed ALONE (BigDev, in session — a short form shown first;
        the additions are named in `-316`'s Status: *"Yes, insert it"*).
  - [x] 0.3d ✅ `2026-10-10-317` (`44830033`) — R1–R3, a reading on `-316` (E1's reason; three residuals accepted; Consequence 2
        recognised and discharged), committed ALONE (BigDev, in session, its text shown first).
  - [x] 0.4 epics.md `### Story 6.30` (after 6.29; a dated source line, ⛔ never a merge fence); Row 29 in
        `docs/launch-gate-inventory/inventory-roster.md` (AL12 — closure (a)–(h) AND its notes (N15, N19), at its RESERVED number, a note that Rows
        27 / 28 belong to 6.27); a NEW `## URL whitelisting (Story 6.30, -312 AL3)` section in
        `docs/launch-gate-inventory/dlt-template-requests-6-19.md` (`https://<domain>/peer-request?`; subdomains separately; the DLT category
        to be confirmed with the provider); a DATED annotation under the sprint-status row `6-30` (⛔ never a rewrite: the base URL is env
        `APP_LINKS_BASE_URL`, ⛔ not `app_links.base_url`; 6.30 owns the path list and the route shell; the story file exists); a sprint ledger
        line ([[project_sprint_status_safe_prepend]]).
- [ ] **Task 1 — contracts `app-links` (AC2).** `packages/contracts/src/app-links/{app-link-paths.json,index.ts,paths.ts,verification.ts,
      README.md}`; barrel export in `packages/contracts/src/index.ts`; `packages/contracts/tests/app-links.test.ts`; ⛔ no import of
      `@twt/domain` ([[project_contracts_domain_bundle_boundary]]); run vitest — contracts tests are outside tsc
      ([[project_contracts_tests_outside_tsc]]); `deep-links/README.md` gains the separate-grammar line (AL13); N2, N3, N16.
- [ ] **Task 2 — mobile config (AC3).** FIRST capture the prototype fixture; `app.json` → `app.config.ts` (`APP_VARIANT`; `require()` of the
      JSON by package name; production-only `APP_IDENTITY_*` throw and link settings; ⛔ no `extra.eas.projectId` until the EAS project exists — `-316` E1);
      `eas.json` `env` per profile (`APP_VARIANT` only today — N1; N9); `apps/mobile/tests/unit/app-config.test.ts` (variants, the `eas.json` lockstep) and
      `app-links-lockstep.test.ts`; the `expo-config` job in `ci.yml` AND `scripts/ci-local.sh`; a note in `apps/mobile/README.md` on
      `APP_VARIANT`, `eas submit` with `APP_VARIANT=production` + `APP_IDENTITY_*` exported (`-316` E1) and `expo prebuild --clean`; ⛔ no native dirs committed.
- [ ] **Task 3 — the login keeps its place (AC4).** `lib/link-target.ts`; `lib/session.ts` (the dead-refresh handler slot) +
      `lib/session-context.tsx` (register `setSession(null)`; clear on `signOut()` and termination); `app/_layout.tsx` (capture via
      `usePathname` + `useGlobalSearchParams`); `app/(auth)/otp.tsx` (take before `signIn`, the ONE consumer; the signup clear before
      `signIn`; the terminated-branch clear at `:89-113`) — typed as `Href`; N5–N8; `tests/unit/link-target.test.ts` + the pins.
- [ ] **Task 4 — the route shell, not found + the route-map test (AC7).** `app/(peer-request)/peer-request.tsx` +
      `components/peer-request/PeerRequestSlot.tsx` (placeholder — N17); the root `Stack.Screen`; `+not-found.tsx`; en + hi keys in
      `packages/i18n/locales/{en,hi}/common.json` (`$comment`; avoid the microcopy-banned words, even in comments);
      `tests/unit/{app-link-route-map,not-found-copy}.test.ts`.
- [ ] **Task 5 — the two endpoints (AC5).** `apps/public/src/pages/.well-known/{apple-app-site-association,assetlinks.json}.ts` (env inside
      `GET`, AL2's schemas — N3, N4); `apps/public/tests/well-known-endpoints.test.ts`.
- [ ] **Task 6 — the fallback page (AC6).** `apps/public/src/lib/peer-request-render.ts`; `apps/public/src/pages/peer-request.astro`;
      `PublicShell.astro`'s `hideLanguageToggle` prop; the `app-links` namespace (`packages/i18n/locales/{en,hi}/app-links.json`,
      `catalog.ts`, `microcopy.yaml` `copy_globs`); the matrix entry; the page/matrix lockstep (`apps/public/tests/app-link-pages-lockstep.test.ts`); `apps/public/tests/peer-request-page.test.ts`
      (N12, N13);
      the PII-scrape gate run.
- [ ] **Task 7 — the shared validator (AC9).** `resolveHttpsOrigin` + the `resolveAdminAppOrigin` alias in `staff-email-config.ts`;
      `apps/jobs/tests/https-origin.test.ts`; README row; ⛔ no boot wiring (6.27c); N18.
- [ ] **Task 8 — infra (AC8).** `infra/dokploy/compose.yaml` (the router incl. `/_astro/` — N10, the app-link variables, the jobs-block line) +
      `infra/dokploy/README.md`; `infra/cloudflare/waf.tf` (unconditional, the skip first, Rules 1–3 dynamic; N11) + `outputs.tf` +
      `infra/cloudflare/README.md` (the `ClientRequestURI` line; its `waf_custom` description `:83-91`) + `.terraform-plan-expectations.md`
      (the default plan's `waf_custom` now holds only the skip); `terraform fmt -check -recursive`; `terraform validate` run
      once, output recorded.
- [ ] **Task 9 — records and close (AC10).** Deferred-work items (AL8's gate scope; AL9's env; AL13 incl. the `parseDeepLink` item staying
      with push; the 429-on-refresh note — N5; D-13 → Row 29); the AL15 pointers (Row 29's notes + an annotation under the sprint row `6-34`); the `friction-budget.md`
      disposition block (both apps; is *"install the app, then open the link again"* a declared `forced` cost? — decide and declare);
      Rows 27 / 28: if 6.27a's Task 0.6 has landed, CHECK that Row 27 (e) names Row 29 and Row 28 names the fallback page, `+not-found` and
      the shell placeholder — else a note in `6-27-peer-mesh-sending-replies-and-date-of-death.md`; a note to 6.27c that it consumes
      `APP_LINK_CODE_PATTERN`; this file's Change Log + File List; `pnpm ci:local` green — run it, paste the summary.

## Dev Notes

### ⚠ TRAPS
1. **The fallback page shows ⛔ nothing about anyone** — ⛔ no name, ⛔ no claim, ⛔ no Pariwar branding, ⛔ no code echo (incl. through
   `PublicShell`'s toggle links), ⛔ no "your request is …". A page that resolved the code would be an oracle AND a fourth public API route.
2. **⛔ Never prerender the `.well-known` endpoints, ⛔ never put them in `public/`** — octet-stream (F9); Apple silently ignores the file.
3. **⛔ Never invent the identity.** ⛔ Never `org.teacherswelfaretrust.twt` "or equivalent" from D-13's prose — it is an example, ⛔ not a
   decision. ⛔ Never placeholder `APP_IDENTITY_*` values in `eas.json`.
4. **⛔ Never persist the link target.** In memory only, consumed once, allowlisted, `c` only — a stored target could replay a stale request
   after a different member logs in on the same phone.
5. **A route GROUP is ⛔ not a URL segment** (F5) — ANY `app/(group)/[x].tsx` is `/:x`, a third root-level catch-all (AL16 (iii) refuses it).
6. **Query string, ⛔ not path** — a path-segment code ⛔ cannot be whitelisted.
7. **The edge challenge fails verification SILENTLY** (F13) — prove the skip on a real request (`curl -A` a non-browser UA) in the device
   proof (AL12 (d)); BIC and the security level are zone-wide and ALWAYS on.
8. **Android ≤ 11 needs EVERY host in a filter to verify; Android 15+ re-verifies and changes can take up to 7 days (re-check); Apple's CDN
   lags ~24 h** — the device proof is done AFTER the files have been live a day, and recorded with dates.
9. **`typedRoutes`** — `router.replace` rejects a plain string; build the `Href` from `APP_LINK_PATHS` + params; the types exist only once
   the route file does (F1).
10. **⛔ Never import TypeScript from `@twt/contracts` in `app.config.ts`** (F2b) — `require()` the JSON by package name; the `expo config`
    run is the proof.
11. **⛔ Never key the variant on `EAS_BUILD_PROFILE`** (F2c) — the local EAS CLI never sees it; `APP_VARIANT` from `eas.json` `env`.
12. **Two post-login navigations, ONE consumer** (AL6 (iii), N6) — a second consume-once site turns every login into a race.
13. **A second Cloudflare entry-point ruleset in the same phase fails at APPLY** (F13) — the skip lives INSIDE `waf_custom`;
    `terraform validate` cannot see it.
14. **Markdown emphasis closes a JSDoc** — grep `\*\*/` after doc-block edits ([[project_markdown_emphasis_closes_jsdoc]]); **Prettier is
    ⛔ not enforced** — hand-format ([[project_prettier_not_enforced]]).

### Build notes N1–N20 (implementation detail under the ALs — ⛔ not decisions)
- **N1 (AL1)** — the env names: `APP_IDENTITY_NAME`, `APP_IDENTITY_SCHEME`, `APP_IDENTITY_IOS_BUNDLE_ID`, `APP_IDENTITY_ANDROID_PACKAGE`.
  Today `eas.json` production `env` holds `APP_VARIANT` only — ⛔ never placeholder identity values.
- **N2 (AL2)** — `APP_LINK_CODE_PATTERN = /^[A-Za-z0-9]{12}$/` (PM21 (a)); `buildAppLinkUrl` takes a BARE https origin
  (`resolveHttpsOrigin`'s result) and refuses a base with a path or a trailing `/`; `parseAppLinkCode` returns `null` for a missing,
  malformed or repeated (`string[]`) `c`; a JSON import widens to `string`, so `APP_LINK_PATHS`' literal type is declared by hand and held to
  the JSON by the lockstep (F20).
- **N3 (AL8)** — the env schemas live in contracts `app-links/verification.ts` (zod `.strict()`; `apps/public` has ⛔ no `zod` dependency):
  TEAMID = 10 upper-case alphanumerics, `.`, a bundle id; each SHA-256 fingerprint = 32 colon-separated upper-case hex pairs — the input is UPPER-CASED before validation (a lower-case paste from a
  tool must ⛔ not become a silent 404); invalid ⇒ 404.
- **N4 (AL8)** — env is read INSIDE `GET` (⛔ not at module load — `directory.server.ts:44` reads at load); in production a null-body 404 is
  served as the site's HTML 404 (F9) — still a 404; tests call `GET` directly.
- **N5 (AL6 (i))** — a dead-refresh handler slot in `lib/session.ts` beside `setTerminatedDuringRefreshHandler`, called for EVERY 4xx AFTER
  the termination callback in the same synchronous run (React batches both `setSession(null)` calls; the termination notice wins);
  `session-context.tsx` registers `setSession(null)` for it. Keep F7's pins green, incl. `terminated-during-refresh.test.ts:47`
  (`setSession(null)` within 120 characters of the termination handler's opening). ⚠ "Every 4xx" includes a 429 from the per-IP refresh
  limit (`member-auth.routes.ts:52,87` — plausible behind carrier CGNAT), which ALREADY clears the tokens today (`session.ts:151`) — ⛔ not a
  regression, but "a 4xx means the token is dead" is false for 429: recorded as a deferred-work item and a Row 29 note (Task 9, N15).
- **N6 (AL6 (iii))** — why one consumer suffices: the guard's post-login branch can fire only while `segments[0] === '(auth)'`, i.e. before
  `otp.tsx`'s replace commits ⇒ `otp.tsx`'s replace lands last. The `signIn`-throws residual is RECORDED, accepted in AL6 (`-317` R2 (a)).
- **N7 (AL6 (ii))** — the cases: an allowlisted path with a valid single `c` (other parameters dropped) ⇒ `/peer-request?c=<code>`; a
  missing, malformed or repeated `c`, or a non-allowlisted path ⇒ ⛔ no target ⇒ `/(tabs)`. (The OTP-screen and missing-`c` cases are RECORDED,
  accepted in AL6 — `-317` R2 (b).) The literal `router.replace('/(auth)/login')` stays.
- **N8 (AL6 (iv))** — the clear sites: `otp.tsx:46-48` (before `signIn(full)`), `session-context.tsx` `signOut()` `:80-90`, the termination
  handler `session-context.tsx:58-66`, `otp.tsx`'s terminated branch `:89-113`.
- **N9 (AL7)** — `APP_LINKS_HOST` is a public value in the production profile's `eas.json` `env`. If `development` uses `?mode=developer`,
  `APP_LINKS_IOS_APP_IDS` must also list the development (prototype) app id, or it cannot verify — and that would put TWO apps on one host and path in the production file (SIX FACTS #6) ⇒ leave it unset.
- **N10 (AL9)** — the new router copies the existing routers' label shape (a `rule` label only).
- **N11 (AL10)** — `waf.tf:30-32`'s comment updated; never applied ⇒ ⛔ no state move (if the operator HAS applied it, Terraform moves `[0]` to the
  no-key address on its own when `count` is removed — an explicit `moved` block is optional); `waf.tf:18` — `account_id` removed from
  `cloudflare_bot_management` (provider 4.52.9 rejects it: `terraform validate` FAILS at HEAD); `waf.tf:23` — the `fmt` alignment fix; run `terraform fmt` AFTER the edits (removing `:18` misaligns `:19`).
- **N12 (AL11)** — the "handler test" is realised the house way (⛔ no `.astro` harness exists — F11b): a pure
  `apps/public/src/lib/peer-request-render.ts` (the copy model + store buttons from env) with a test proving ⛔ no `c` in its output for a
  distinctive code, plus source scans of `peer-request.astro` (⛔ no `Astro.url` / `Astro.request` / `searchParams` / `fetch`) and of
  `PublicShell.astro` (`withLang` ⛔ never called under the prop).
- **N13 (AL11)** — the prop is `hideLanguageToggle`; `title` and `trustName` come from the SAME copy key (`PublicShell` dedupes only when
  equal — `:50`); `Referrer-Policy` via `Astro.response.headers`; the copy lives in a NEW `packages/i18n` namespace `app-links` (en + hi;
  registered in `catalog.ts`, added to `copy_globs` — F19).
- **N14 (AL11)** — the home-screen line is true once 6.27a's card ships (PM11 — before any text, since 6.27c sends last; `-311` PM2 adds
  the notice strip); the closed / forwarded inaccuracy is RECORDED, accepted in AL11 (`-317` R2 (c)).
- **N15 (AL12)** — Row 29's NOTES: AL1's Firebase orphan and the `eas submit` export; AL10's Row 3 reading with its ground and Row 3's owners;
  whether Free-plan Bot Fight Mode is on; AL15's dependency; the 429-on-refresh note (N5); the device proof (e) also covers an EXPIRED login → login → the screen (AL6 (i))
  and a STYLED fallback page (AL9).
- **N16 (AL13)** — the deferred-work item on `parseDeepLink`'s resource / id pairings stays with the push story (6.30 wires https app links,
  ⛔ not the `twt://` parser); `deep-links/README.md` gains a line that `app-links/` is a separate grammar.
- **N17 (AL14 / AL16)** — mobile keys in `packages/i18n/locales/{en,hi}/common.json` (`$comment`; avoid the microcopy-banned words, even in
  comments). The slot is a 6.30 implementation detail — `apps/mobile/components/peer-request/PeerRequestSlot.tsx`; 6.27a fills the shell
  (its PM11) and may replace or remove that component — ⛔ no new seam.
- **N18 (AL5)** — `resolveHttpsOrigin` in `staff-email-config.ts` with `export const resolveAdminAppOrigin = resolveHttpsOrigin`; behaviour
  exactly F14's (case and `:443` normalised).
- **N19 (AL12 (a))** — where each owed value lives: `APP_IDENTITY_*`, `APP_LINKS_HOST`, `EXPO_PUBLIC_HELPLINE_TEL` → `eas.json` production
  `env`; the EAS project id → a literal in `app.config.ts`'s static base; `ascAppId` → `eas.json` `submit.production`; `APP_DISPLAY_NAME`,
  `APP_LINKS_IOS_APP_IDS`, `APP_LINKS_ANDROID_APPS`, `APP_STORE_URL_*` → the `public` service's env (`compose.yaml` / Dokploy);
  `APP_LINKS_BASE_URL` → the jobs block. (AL11's *"`APP_DISPLAY_NAME`, set beside `APP_IDENTITY_*`"* means DECIDED together —
  the two live in different places.)
- **N20 (AL15)** — the paths: `packages/channels/src/otp-sms-template.ts:47`, `sms-dlt-registry.ts:60-80`; tests
  `packages/channels/tests/otp-sms-template.test.ts`, `apps/jobs/tests/claim-correction-sms-templates.test.ts`,
  `apps/jobs/tests/suspicion-notice-sms-templates.test.ts`.

### Reuse map
| Need | Reuse |
|---|---|
| base-URL validation | `resolveAdminAppOrigin` (`apps/jobs/src/scheduler/staff-email-config.ts:102-121`) — renamed / generalised, ⛔ never copied |
| public page shell / 404 shape | `PublicShell.astro` (+ `hideLanguageToggle`), `404.astro`, the matrix `/404` entry |
| pure render module + its test | `apps/public/src/lib/*-render.ts` + `apps/public/tests/*-render.test.ts` |
| helpline CTA | `components/common/CallHelplineCTA.tsx` |
| the termination-handler slot (for the dead-refresh slot) | `lib/session.ts:92-98` + `lib/session-context.tsx:58-66` |
| closed-enum grammar discipline | `packages/contracts/src/deep-links/deep-link.ts` |
| JSON import in a package | `packages/i18n/src/catalog.ts` |
| route-tree source scan | `apps/mobile/tests/unit/sahyog-vivran-entry.test.ts:160-165` |
| runtime env in Astro | `apps/public/src/lib/directory.server.ts:44` (⚠ read at MODULE LOAD there — AL8 reads inside `GET`) |
| per-story friction disposition | `friction-budget.md:56` / `:83` |
| roster row format | `inventory-roster.md` Rows 22–26 |

### Testing standards
Contracts: `packages/contracts/tests/app-links.test.ts` (builders, parser, schemas, bodies, JSON ↔ TS). Mobile (node vitest,
`tests/unit/**/*.test.ts`): `app-config`, `app-links-lockstep`, `link-target`, `app-link-route-map`, `not-found-copy`; the `expo config` job
in `ci.yml` + `ci-local.sh`. Public: `well-known-endpoints` (direct `GET` calls), `peer-request-page` (render module + source scans); the
PII-scrape gate; the page/matrix lockstep (`app-link-pages-lockstep`). Jobs: `https-origin` table. i18n: parity, `microcopy:test`, `microcopy:check`, catalog
registration. Friction budget: the gate. Infra: `terraform fmt -check`; `validate` run once (after N11), recorded. ⛔ No
device behaviour in CI — it is AL12 (e). `pnpm ci:local` before review.

### Project structure notes
NEW: `packages/contracts/src/app-links/` (incl. `app-link-paths.json`); `apps/mobile/app.config.ts`, `apps/mobile/tests/fixtures/
app-config-prototype.json`, `apps/mobile/lib/link-target.ts`, `apps/mobile/app/(peer-request)/peer-request.tsx`, `apps/mobile/components/
peer-request/PeerRequestSlot.tsx`; `apps/public/src/pages/.well-known/{apple-app-site-association,assetlinks.json}.ts`,
`apps/public/src/pages/peer-request.astro`, `apps/public/src/lib/peer-request-render.ts`; `packages/i18n/locales/{en,hi}/app-links.json`;
the test files above.
DELETE: `apps/mobile/app.json` (after the fixture is captured).
UPDATE: `packages/contracts/src/index.ts`, `packages/contracts/src/deep-links/README.md`; `apps/mobile/app/_layout.tsx`, `app/(auth)/otp.tsx`,
`app/+not-found.tsx`, `lib/session.ts`, `lib/session-context.tsx`, `eas.json`, `apps/mobile/README.md`; `packages/i18n/locales/{en,hi}/
common.json`, `packages/i18n/src/catalog.ts`, `microcopy.yaml`; `apps/public/src/layouts/PublicShell.astro`; the PII matrix;
`apps/jobs/src/scheduler/staff-email-config.ts`, `apps/jobs/README.md`; `infra/dokploy/compose.yaml` + README; `infra/cloudflare/waf.tf`,
`outputs.tf`, README, `.terraform-plan-expectations.md`; `.github/workflows/ci.yml`, `scripts/ci-local.sh`; `friction-budget.md`; `docs/launch-gate-inventory/
{inventory-roster,dlt-template-requests-6-19}.md`; `_bmad-output/implementation-artifacts/deferred-work.md`, `sprint-status.yaml`;
`_bmad-output/planning-artifacts/epics.md`; via Task 9, `6-27-peer-mesh-sending-replies-and-date-of-death.md` (if Rows 27 / 28 have ⛔ not
landed) and `6-27c-peer-mesh-sending-texts-and-links.md` (the `APP_LINK_CODE_PATTERN` note).
⭐ 6.27a FILLS the shell (its PM11 — it may replace or remove `PeerRequestSlot.tsx`, a 6.30 implementation detail, N17); 6.27c wires the
parsed `c` (PM21 (c), (d)) — ⛔ never a second route file.

### Sequencing with 6.27 (a / b / c / d), 6.31 and 6.34
⭐ 6.30 is ⛔ not blocked by any Panel question. 6.27a is buildable since `-311` (6.27a's Task 0.3 / 0.4 done). ⇒ ⭐ **6.30 lands before
6.27c** — 6.27c is the ONLY part that consumes `buildAppLinkUrl` / `APP_LINK_CODE_PATTERN` / `resolveHttpsOrigin` / the `APP_LINKS_BASE_URL`
read and the ONLY part that wires the parsed `c` to the resolver; 6.27a consumes only the route shell (AL16), so 6.27a and 6.30 may proceed in
either order as long as the shell is MERGED before 6.27a's Task 5 (its mobile screens) (`-312` Consequence 1). ⚠ If a 6.27 part reaches a
task that needs a 6.30 artefact before 6.30 is `done`, that part STOPS and asks — ⛔ never re-creates it
([[feedback_circular_deferral_between_sibling_stories]]). 6.31 (the WhatsApp reminder) reuses the same link — ⛔ no new path. Row 6-34 is
independent, but Row 29 (e)'s logged-out legs wait for its OTP retag (AL15).

### Previous story intelligence
- **6.25**: `ADMIN_APP_ORIGIN` — the env + per-run validator + hold pattern; its validator is now SHARED (AL5).
- **6.27a** (v2.9, the record for 6.27a–d; PM11 / PM16 / PM21 committed by `-311`): the consumer; its Trap 1–3 fences hold for anything a
  link opens; 6.27a owns the not-openable copy and "⛔ no API call without a session" (the route renders once while the session is loading);
  6.27c owns the resolver call and reuses that copy for its 404. ⚠ 6.27c's body still says PM1 is "⛔ never replaced" while `-311` replaced
  it — 6.27c's to fix, ⛔ not 6.30's.
- **11b.3 / 11b.1**: the public-pages two-route rule and the PII-scrape matrix — every public page is declared.

### Git intelligence
PR #268 REBASE-merged the 6.27 / 6.30 governance branch (`9990cffa`); `34b9bab6` added the SHA map. This story's branch
`story/6-30-app-links-open-the-app-from-a-text` starts at `34b9bab6` and carries `-315` (`a3253ec0`), `-316` (`a2b994b7`), `-317` (`44830033`) and v1.7–v1.9. House order: decision entry →
records → build → review; REBASE-merge ([[project_story_automator_ops]]). ⚠ `-313` / `-314` belong to 6.34 on its unmerged branch — the
decision numbers will interleave on merge.

### Latest tech information (fetched 2026-10-10 — re-check at Task 0.1)
- **Android App Links**: `assetlinks.json` over HTTPS, `application/json`, ⛔ no redirects; with Play App Signing the GOOGLE signing-key
  fingerprint is required (Play Console → App signing → "Digital Asset Links JSON"); add the upload / EAS key for sideloaded builds; Android
  12+ verifies per host and, on failure, opens the browser; `adb shell pm verify-app-links --re-verify <pkg>`, `pm get-app-links <pkg>`;
  intent-filter `data` supports exact `path`; the query is ⛔ not matched.
- **iOS Universal Links** (Apple *Supporting associated domains*): AASA at `/.well-known/apple-app-site-association`, ⛔ no extension,
  `application/json`, ⛔ no redirects, < 128 KB; `applinks.details[].appIDs` + `components` (`/`, `?`, `#`, `exclude`; a URL matches when it
  matches ALL given components); fetched via Apple's CDN (~24 h lag) at install / update; needs a paid Apple Developer Program account.
- **Expo / EAS (SDK 55)**: `app.config.ts` via `@expo/require-utils` (F2b); EAS CLI resolves the config locally with the profile's
  `eas.json` `env` (+ EAS server variables on the second pass; *secret*-visibility variables are ⛔ not readable outside EAS servers) and
  ⛔ without `EAS_BUILD_PROFILE` (F2c); a verified https link routes by PATH; groups ⛔ never appear in URLs; query params arrive via
  `useLocalSearchParams()` (leaf) / `useGlobalSearchParams()` (root); `Stack.Protected` does ⛔ not keep the target — AL6 builds it.
- **Cloudflare**: one zone entry-point ruleset per phase; a custom-rule `skip` takes `ruleset = "current"`, `products` (`bic`,
  `securityLevel`, …) and `phases` (`http_request_sbfm` skips Super Bot Fight Mode; Free-plan Bot Fight Mode cannot be skipped);
  `http_requests.ClientRequestPath` excludes the query, `ClientRequestURI` includes it.
- **India SMS**: TRAI URL / APK / OTT whitelisting (in force 1 Oct 2024; non-whitelisted ⇒ rejected); dynamic part only after `?`; subdomains
  whitelisted separately; TRAI 18 Nov 2025 typed variables — row 6-34; ⚠ the DLT category is to be confirmed with the provider.

### References
- Architecture §4.7, §3.4; ADR-0010, -0011, -0013, -0020 cl.4, -0022; PRD OQ-1, FR-60, FR-61.
- `2026-10-10-303` (Q1 A), `-304` (Q6 A), `-305` (§2 items 1, 2, 5; §4), `-310` (CF1 A), `-311` (PM11 / PM16 / PM21; PM2), `-312` (AL1–AL16),
  `-315` (C1–C8), `-316` (E1–E3), `-317` (R1–R3); the confirm note `trustee-panel-routing-note-2026-10-10-6-27-confirms.md` (ruled by `-310`).
- Story 6.27a v2.9 (PM11, PM16, PM21) and the cut files 6.27b / 6.27c / 6.27d; Story 6.25 (RE7); deferred-work D-13, D8, the dotted-secret-id
  item, the `parseDeepLink` item; row 6-34.
- `docs/launch-gate-inventory/inventory-roster.md` (Row 3; Rows 22–26), `dlt-template-requests-6-19.md`; `packages/contracts/src/deep-links/`;
  `packages/channels/src/otp-sms-template.ts`, `sms-dlt-registry.ts`; `friction-budget.md`.

## Dev Agent Record

### Agent Model Used

Claude Opus 5.5 (1M context) — `bmad-dev-story 6.30`, 2026-10-10, in the worktree `TWT-6-30` on the story branch.

### Debug Log References
- **Task 0.1 (2026-10-10):** `git diff --name-only 1cce7e5a..HEAD -- packages apps infra scripts .github turbo.json` at `4dd469c2` — EMPTY
  (every cite as of the pin holds). Platform claims re-checked (read-only web research): `{#alphanumeric#}` ≤ 40 chars — CONFIRMED
  (secondary sources citing Annexure I); the 18 Nov 2025 typed-variable Direction — CONFIRMED (six tags; 10 days new / 60 days existing);
  URL whitelisting in force 1 Oct 2024, a dynamic URL registered ending in `?` — CONFIRMED (MSG91 FAQ: *"Mandatory to end in question mark"*);
  RBI/2024-25/105 (17 Jan 2025) — CONFIRMED and STRONGER than "discourages": *"Prohibit the use of URL shortening services that do not
  clearly indicate the sender's identity"* (AL3's ⛔ no shortener is unaffected); Android 15+ periodic re-verification, up to seven days —
  CONFIRMED (Android 14 and lower: only at install / update); F2c — CONFIRMED (Expo docs: the built-in variables *"are not available when
  evaluating app.config.js locally"*; eas-cli `evaluateConfigWithEnvVarsAsync` passes `{ ...serverEnvVars, ...buildProfile.env }`).

### Completion Notes List
- 2026-10-10 — created by `bmad-create-story 6.30` (Opus 5.5): ultimate context engine analysis completed — comprehensive developer guide
  created. Three read-only research passes at `a05ce150` (+ platform rules fetched 2026-10-10); AL1–AL16 PROPOSED; ⛔ no Panel question.
- 2026-10-10 — v1.1 after a fresh-context validate (four read-only reviewers at `877e5864`; code unchanged since `a05ce150`): 1 BLOCKER,
  3 HIGH, 9 MEDIUM, 8 LOW — all applied; ⛔ no AL added or removed.
- 2026-10-10 — v1.7 after the round-7 fresh-context validate (four read-only reviewers at `34b9bab6`; code unchanged since `1cce7e5a`):
  2 BLOCKER, 4 HIGH, 13 MEDIUM, 15 LOW — all applied (BigDev: *"All"*); the AL-text corrections committed first as `-315` (`a3253ec0`).
- 2026-10-10 — v1.8 after the round-8 fresh-context re-validate of v1.7 and `-315` (one read-only reviewer at `d2d6b9a0`): 0 BLOCKER,
  2 HIGH, 3 MEDIUM, 15 LOW — every one the round-7 pass's own; all applied; `-315`'s errors corrected first as `-316` (`a2b994b7`).
- 2026-10-10 — v1.9 after the round-9 fresh-context re-validate (one read-only reviewer at `1f78762e`): 0 BLOCKER, 0 HIGH — the
  re-validate rule is discharged; its 3 MEDIUM / 12 LOW applied, the three needing a record committed first as `-317` (`44830033`).

### File List

## Change Log
| Date | Version | Change |
|---|---|---|
| 2026-10-10 | 1.9 | Round-9 re-validate (0 BLOCKER / 0 HIGH — the rounds END) + `2026-10-10-317` (R1–R3). **Medium:** AL1's projectId reason corrected (R1 — every `eas build` carries its OWN profile env; `eas submit` / `eas env:*` the shell env); the three residuals RECORDED, accepted in AL6 / AL11 (R2) and N6 / N7 / N14 point there; Task 0.3c says what BigDev was shown (a short form) and 0.3d records `-317`. **Low:** `-312` clauses restored to the AL block (AL1 `eas update`; C1's Expo account; AL2 Node pin + `resolveJsonModule`; AL5's sweep / `twt.org` / PM21 (b) note; AL6 consumed once; AL9 exact page paths); AL12 (a) — Consequence 2's `APP_EAS_PROJECT_ID` replaced by E1's literal; F3 `:138-238`; `-316` / `-317` in AC1, References, Git intelligence, the shared-checkout note; Tasks tagged N2 / N3 / N4 / N9 / N10 / N16 / N18; N11 — `terraform fmt` after the edits, the `moved` block optional; Task 8 + Project structure gain `.terraform-plan-expectations.md` and the README's `waf_custom` text; N3 upper-cases fingerprints; N5 — the 429-on-refresh note (deferred-work, Row 29); N19 — "beside" = decided together; N9 — two apps on one host refused; AC6 / AC7 — a REAL-`t()` leg for the new keys. |
| 2026-10-10 | 1.8 | Round-8 re-validate (the round-7 pass's own defects) + `2026-10-10-316` (E1–E3). ⚠ This row's stated REASON for E1 was partly WRONG (corrected by `-317` R1 in 1.9) — kept as the record. **High:** `extra.eas.projectId` is one literal for every variant, ⛔ never production-only (E1 — `eas submit` / `eas env` / every `eas build` read the config without the profile env), excluded from AC3's comparison; the `PeerRequestSlot` file is a 6.30 implementation detail 6.27a may replace — ⛔ never an attribution to 6.27a's PM11 (⛔ no seam moves). **Medium:** the AL block cut back to the committed text (`-312` + C1–C8 + E1–E3) — the build detail moved to Dev Notes → Build notes N1–N20 (incl. `-312`'s *"any build-time variable declared in `turbo.json` `globalEnv`"* restored to AL8); `terraform validate` FAILS at HEAD (`waf.tf:18` `account_id`) — F13 + N11 + AC8 (validate once; a plan per setting is the operator's); Row 29 (a)'s homes per value (N19). **Low:** cites (F13 Rules 1–3 `:41-66`; `session.ts:150-176`; `gate.ts:203-216`; `catalog.ts:29-77`; the root Stack declares MOST groups); the `:47` pin; AL6's one-consumer reason + the `signIn`-throws residual (N6); the dead-refresh call order (N5); the `?mode=developer` caveat (N9); `title` = `trustName` (N13); AC10 and Project structure gain the 6.27 / 6.27c notes and the lockstep file; the third branch SHA; the edge-skip scope (E2); *"in that session"*. |
| 2026-10-10 | 1.7 | ⭐ Round-7 validate + `2026-10-10-315` (C1–C8). ⚠ Two items in this row were WRONG and are kept as the record — *"`extra.eas.projectId` production-only from env"* (withdrawn by `-316` E1) and the slot file attributed to 6.27a (corrected in 1.8). **Blockers:** AL1 keys the variant on `APP_VARIANT` from `eas.json` `env` (⛔ never `EAS_BUILD_PROFILE`, which is unset when EAS CLI evaluates the config locally — F2c), `APP_IDENTITY_*` in the production profile's `eas.json` `env`, `slug` constant, `extra.eas.projectId` production-only from env; AL10 = ONE always-present `waf_custom` with the skip first (+ `http_request_sbfm`), Rules 1–3 dynamic, `outputs.tf`, the `waf.tf:23` fmt fix. **High:** AL6 — every refused refresh resets the in-app session; capture via `usePathname` + `useGlobalSearchParams`; ONE consumer (`otp.tsx`, before `signIn`); clears on signup / sign-out / termination; the cases ruled. AL9 routes `/_astro/`; AL11 renders `PublicShell` + `hideLanguageToggle` (the gate needs it), neutral `trustName`, `lang` blocks, `edge_cacheable`; AC6 = a pure render module + source scans (⛔ no `.astro` harness exists). **Medium / Low:** ci.yml + ci-local.sh; AL16 (ii) scoped to app-link paths + the `Stack.Screen`; i18n homes (`common.json`; a new `app-links` namespace); the friction-budget disposition (both apps) in AC10; the validator alias; Row 3's owners (C6); AASA without a `"?"` component; `APP_LINK_CODE_PATTERN`; the env schemas in contracts with format checks; `buildAppLinkUrl` takes a bare origin; `EXPO_PUBLIC_HELPLINE_TEL`; Row 29's notes, the DLT section, the sprint-row annotation, the Rows 27 / 28 check; the AL15 test paths; the `parseDeepLink` item; cite fixes (F8b, F13, F14, the Reuse map); test and file paths; the pin re-expressed (`1cce7e5a`); stale statuses (the rulings table, "PROPOSED", the stacked branch, 6.27a v2.9); the SHA map moved to git history and the `V-` ids dropped. |
| 2026-10-10 | 1.6 | ⭐ AL1–AL16 COMMITTED as `2026-10-10-312` (`21e89ed6`), all as written; Tasks 0.2 / 0.3 done; buildable. |
| 2026-10-10 | 1.5 | `2026-10-10-310`: the confirm note is ruled (CF1–CF5) — the language narrowing is Panel-confirmed (CF1 A). |
| 2026-10-10 | 1.4 | Round 4: version pointers to 6.27a v2.5 (⛔ no change to PM11 / PM21). |
| 2026-10-10 | 1.3 | Round-3 validate: the *"separate story"* quote re-cited to the sprint-status row `6-30` comment (⛔ never `-305`'s occasion); two glyph-register breaches (the symbol glued to "echo" and to "oracle") rewritten as *"the no-echo test"* and *"⛔ never an oracle"*. |
| 2026-10-10 | 1.2 | Round-2 validate: the §0 language line now reads `-303`'s rider NARROWED by `2026-10-10-305` §2 item 2 (CF1 owed) — ⛔ never "ruled by `-303`"; a `-305` row in the rulings table (§2 items 1 / 2 / 5, §4) and the BigDev calls / AL12's reservation re-attributed to it; `-305` and the confirm note in References; the `?c=` split stated ONCE (6.30 parses `c`; 6.27a fills the slot + the not-openable copy; 6.27c wires the resolver) — AL16, Sequencing, Previous story intelligence; "Task 6" → 6.27a's Task 5 (the shell MERGED first); Row 28 covers the route-shell placeholder; stale 6.27 refs (v1.9 → 6.27a v2.5; FIVE → SEVEN FACTS). |
| 2026-10-10 | 1.1 | Validate applied (V-B1, V-H1–H3, V-M1–M9, V-L1–L8 — the v1.1 finding ids, kept here as the record) + BigDev's answers. **B1:** the path list is a JSON data file loaded by `app.config.ts` via `require()` (the config cannot import the contracts TS barrel); AC3 runs `expo config` per profile in `ci:local`. **H1:** the fallback page shows both languages with ⛔ no toggle (the shell's toggle echoed `?c=`); a no-echo test; ⛔ no `Vary`. **H2:** 6.30 OWNS a thin route shell for `/peer-request` that 6.27a fills; AL16 strict + pins the two root catch-alls. **H3:** the untyped OTP and registry templates added; AL15 becomes a pointer to row `6-34-sms-templates-typed-variables`. **M1:** Android exact `path`. **M2:** one shared `resolveHttpsOrigin`; 6.27c owns the boot read; trailing `/` accepted. **M3:** an unconditional first-ordered edge skip (bic + securityLevel), exact paths; SBFM caveat. **M4:** F13 / AL4 corrected (`ClientRequestPath` has ⛔ no query). **M5:** `EAS_BUILD_PROFILE`; local / web / update behaviour; `projectId` by hand; production-signed device proof. **M6:** 6.27a owns the resolver-404 copy and "⛔ no call without a session". **M7:** Rows 27 / 28 (6.27) and 29 (6.30) reserved; Row 29 (h) Hindi via Row 28. **M8:** governance current (`-303` / `-304`; 6.27's four-part split; 6.30 before 6.27c). **M9:** ⛔ no hard-coded brand; "your message"; the home-screen line. **L1–L8:** one app per host per path; the `public` env narrowed; `process.env` at request time; `terraform validate` recorded; the link-target holder cleared and `c`-only; typed-route types; platform claims re-checked at Task 0.1. |
| 2026-10-10 | 1.0 | Created (`bmad-create-story 6.30`); pinned `a05ce150`; AL1–AL16 proposed. |
