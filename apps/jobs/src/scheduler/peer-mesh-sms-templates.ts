// The PEER MESH REQUEST SMS TEMPLATE REGISTRY — Story 6.27c (Task 1.2; AC2, AC8; `2026-10-10-303` Q1 A, amended by
// `2026-10-10-304` Q6 A; `2026-10-10-311` PM3, PM16, PM22). A SIBLING of 6.24b's `suspicion-notice-sms-templates.ts` —
// ⛔ never a fourth message there.
//
// The once-ever text to each of the five neighbours chosen for a reported death, × `hi` / `en` (two DLT templates —
// 13–14 of `docs/launch-gate-inventory/dlt-template-requests-6-19.md`). The en words are the Panel's — `-379` Q2 A's *"…[link],
// or call us."* (⛔ helpline number; the dash a comma), with *"a few questions"* for *"a few short questions"* (BigDev's words,
// ratified by `2026-10-22-381` PQ1 A). The routing note's "TWT:" prefix is dropped (the DLT header names the sender — PM3's
// author reading).
//
// ⭐ THE D33 CARVE-OUT (as 6.24b's): this text NAMES THE MEMBER because the ruled text does. The name is MODE-RESOLVED (`-181`,
// `resolveMemberFacingDeceasedName`), ⛔ never hard-coded; an erased / unresolvable name ⇒ `no_target`, ⛔ never a blank, ⛔ never
// a truncated name (RB5, R9). ⭐ Story 6.37e rework (`2026-10-22-379` Q1 A): the name is sent WHOLE up to 60, shortened only above
// 60 by the Panel's rule (`sms-member-name.ts`); `no_target:name_too_long` only for one that STILL does not fit.
// ⛔ No deadline word (S4 / T6 — RB16); ⛔ no claim, money, family, nominee, claimant or reporter.
// ⚠ A missing template id or helpline number fails CLOSED in the shared core (`claim-dlt-sms-send.ts`) — the sweep and
// the child check the config FIRST so a gap never uses up a once-ever slot (RB12). The helpline is still REQUIRED although the
// text no longer prints it (it says "call us" — `-380` decision 6).
//
// ⭐ Story 6.34 (TV4 / TV11 / TV13): registered TYPED from the start — the name in TWO alphanumeric boxes side by side,
// `{member1}{member2}` (≤ 30 each, `sms-member-boxes.ts` — Story 6.37e rework; ⚠ 30 vs 40, whether the operator counts
// Devanagari by code point and admits spaces are Row 30 (d)'s open question), `{link}` url (≤ 120). THREE variables — the sheet
// records the justification (the name needs two boxes; the link IS the request: without it the neighbour cannot answer). The
// marker is the ONE vocabulary's (`@twt/channels`), re-exported for the lockstep test.

import { DLT_TYPE_MAX_LENGTH, DLT_VAR, type DltSlot } from '@twt/channels';
import { t, type Locale } from '@twt/i18n';

import { MEMBER_BOX_SLOTS } from './sms-member-boxes.js';

export type PeerMeshRequestSmsLocale = Extract<Locale, 'hi' | 'en'>;

export const PEER_MESH_REQUEST_SMS_LOCALES = ['hi', 'en'] as const satisfies readonly PeerMeshRequestSmsLocale[];

export interface PeerMeshRequestSmsTemplate {
  /** The `claim.json` key (namespace `claim`). */
  readonly copyKey: string;
  /** The config / Secret-Manager NAME of the TRAI-assigned DLT template id (resolved at send time). */
  readonly dltTemplateIdConfigKey: string;
  /** The content registered with TRAI, each variable written `{#var#}`, in the order of the Panel's words. */
  readonly registeredText: string;
  /** The declared variables, in text order (Story 6.34 TV4) — the type BigDev selects for each `{#var#}`. */
  readonly slots: readonly DltSlot[];
}

/** The three variables of the request — the name's two boxes and the link. */
export interface PeerMeshRequestSmsVars {
  readonly member1: string;
  readonly member2: string;
  readonly link: string;
}

/** The DLT variable token — the form the registered text carries in each slot (the ONE vocabulary's, re-exported). */
export { DLT_VAR };

const LINK: DltSlot = { name: 'link', type: 'url', maxLength: DLT_TYPE_MAX_LENGTH.url, label: 'app link to the questions' };

/** TV4 — the declared variables, in the order of the Panel's words (both locales). */
const SLOTS: readonly DltSlot[] = [...MEMBER_BOX_SLOTS, LINK];

/**
 * The ONE predicate for whether a rendered link fits the `{link}` slot (the url ceiling) — 6.27c review F6: the config check
 * holds an `APP_LINKS_BASE_URL` whose link cannot fit, BEFORE a once-ever slot is begun. Code points, as the name's fit
 * (`sms-member-name.ts`; a link is ASCII, so = UTF-16 units).
 */
export function fitsDltUrl(value: string): boolean {
  return [...value].length <= LINK.maxLength;
}

/** The Secret Manager name of the request's DLT template id (RB4) — for the Pariwar's locale (PM22). */
export function peerMeshRequestDltConfigKey(locale: PeerMeshRequestSmsLocale): string {
  return `sms.dlt.template_id.peer_mesh.request.${locale}`;
}

const entry = (locale: PeerMeshRequestSmsLocale, registeredText: string): PeerMeshRequestSmsTemplate => ({
  copyKey: 'peer_mesh_sms.request',
  dltTemplateIdConfigKey: peerMeshRequestDltConfigKey(locale),
  registeredText,
  slots: SLOTS,
});

// ⚠ The Hindi is the `-303` routing block's Hindi draft with "दो" (two) replaced by "कुछ" (a few) — `-304` Q6 A; Trap 19's "two" is
// gone, but it is ⛔ an independent translation (6.27c review round 2 P15; PM3's "never copied" clause superseded by
// `2026-10-17-344`) — ⛔ not yet human-reviewed (go-live gate Row 28). Story 6.37e rework: the second name box; the dash and the
// helpline clause become *", या हमें कॉल करें"* (as the English); "छोटे" dropped with the English's "short" (`-381` PQ1 A).
export const PEER_MESH_REQUEST_SMS_TEMPLATES: Readonly<Record<PeerMeshRequestSmsLocale, PeerMeshRequestSmsTemplate>> = {
  hi: entry(
    'hi',
    'हमें बताया गया है कि {#var#}{#var#} का निधन हो गया है। यदि आप उन्हें जानते थे, तो कृपया कुछ प्रश्नों के उत्तर दें: {#var#}, या हमें कॉल करें।',
  ),
  en: entry(
    'en',
    'We have been told that {#var#}{#var#} has died. If you knew them, please answer a few questions: {#var#}, or call us.',
  ),
};

/** Render the request body through the REAL `t()` — the text the gateway byte-matches. A missing param THROWS. */
export function renderPeerMeshRequest(locale: PeerMeshRequestSmsLocale, vars: PeerMeshRequestSmsVars): string {
  const template = PEER_MESH_REQUEST_SMS_TEMPLATES[locale];
  return t(template.copyKey, { member1: vars.member1, member2: vars.member2, link: vars.link }, { locale, namespace: 'claim' });
}
