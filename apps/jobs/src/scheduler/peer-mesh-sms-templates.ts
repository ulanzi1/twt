// The PEER MESH REQUEST SMS TEMPLATE REGISTRY — Story 6.27c (Task 1.2; AC2, AC8; `2026-10-10-303` Q1 A, amended by
// `2026-10-10-304` Q6 A; `2026-10-10-311` PM3, PM16, PM22). A SIBLING of 6.24b's `suspicion-notice-sms-templates.ts` —
// ⛔ never a fourth message there.
//
// The once-ever text to each of the five neighbours chosen for a reported death, × `hi` / `en` (two DLT templates —
// 13–14 of `docs/launch-gate-inventory/dlt-template-requests-6-19.md`). The en words are the Panel's, verbatim; the
// routing note's "TWT:" prefix is dropped (the DLT header names the sender — PM3's author reading).
//
// ⭐ THE D33 CARVE-OUT (as 6.24b's): this text NAMES THE MEMBER (`{member}`) because the ruled text does. `{member}` is
// MODE-RESOLVED (`-181`, `resolveMemberFacingDeceasedName`), ⛔ never hard-coded; an erased / unresolvable name, or one
// longer than the slot (`fitsDltAlphanumeric`), ⇒ `no_target`, ⛔ never a blank, ⛔ never a truncated name (RB5, R9).
// ⛔ No deadline word (S4 / T6 — RB16); ⛔ no claim, money, family, nominee, claimant or reporter.
// ⚠ A missing template id or helpline number fails CLOSED in the shared core (`claim-dlt-sms-send.ts`) — the sweep and
// the child check the config FIRST so a gap never uses up a once-ever slot (RB12).
//
// ⭐ Story 6.34 (TV4 / TV11 / TV13): registered TYPED from the start — `{member}` alphanumeric (≤ 40 — ⚠ whether the
// operator counts Devanagari by code point and admits spaces is Row 30 (d)'s open question), `{link}` url (≤ 120), the
// helpline cbn (≤ 14). THREE variables — the sheet records the justification (the link IS the request: without it the
// neighbour cannot answer). The marker is the ONE vocabulary's (`@twt/channels`), re-exported for the lockstep test.

import { DLT_TYPE_MAX_LENGTH, DLT_VAR, type DltSlot } from '@twt/channels';
import { t, type Locale } from '@twt/i18n';

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

/** The three variables of the request. */
export interface PeerMeshRequestSmsVars {
  readonly member: string;
  readonly link: string;
  readonly helpline: string;
}

/** The DLT variable token — the form the registered text carries in each slot (the ONE vocabulary's, re-exported). */
export { DLT_VAR };

const MEMBER: DltSlot = { name: 'member', type: 'alphanumeric', maxLength: DLT_TYPE_MAX_LENGTH.alphanumeric, label: 'deceased member name' };
const LINK: DltSlot = { name: 'link', type: 'url', maxLength: DLT_TYPE_MAX_LENGTH.url, label: 'app link to the questions' };
const HELPLINE: DltSlot = { name: 'helpline', type: 'cbn', maxLength: 14, label: 'helpline number' };

/** TV4 — the declared variables, in the order of the Panel's words (both locales). */
const SLOTS: readonly DltSlot[] = [MEMBER, LINK, HELPLINE];

/**
 * R9 — the ONE predicate for whether a value fits the `{member}` slot: its CODE-POINT count is at most the alphanumeric
 * ceiling. Devanagari is in the BMP, so code points = UTF-16 units = what `checkDltTemplateShape` counts. ⚠ If Row 30
 * (d) answers a different limit or unit, this function and the ceiling change in ONE place. ⛔ Never truncate a name.
 */
export function fitsDltAlphanumeric(value: string): boolean {
  return [...value].length <= MEMBER.maxLength;
}

/**
 * The ONE predicate for whether a rendered link fits the `{link}` slot (the url ceiling) — 6.27c review F6: the config check
 * holds an `APP_LINKS_BASE_URL` whose link cannot fit, BEFORE a once-ever slot is begun. Code points, as `fitsDltAlphanumeric`
 * (a link is ASCII, so = UTF-16 units).
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
// `2026-10-17-344`) — ⛔ not yet human-reviewed (go-live gate Row 28).
export const PEER_MESH_REQUEST_SMS_TEMPLATES: Readonly<Record<PeerMeshRequestSmsLocale, PeerMeshRequestSmsTemplate>> = {
  hi: entry(
    'hi',
    'हमें बताया गया है कि {#var#} का निधन हो गया है। यदि आप उन्हें जानते थे, तो कृपया कुछ छोटे प्रश्नों के उत्तर दें: {#var#} — या हेल्पलाइन {#var#} पर कॉल करें।',
  ),
  en: entry(
    'en',
    'We have been told that {#var#} has died. If you knew them, please answer a few short questions: {#var#} — or call the helpline {#var#}.',
  ),
};

/** Render the request body through the REAL `t()` — the text the gateway byte-matches. A missing param THROWS. */
export function renderPeerMeshRequest(locale: PeerMeshRequestSmsLocale, vars: PeerMeshRequestSmsVars): string {
  const template = PEER_MESH_REQUEST_SMS_TEMPLATES[locale];
  return t(template.copyKey, { member: vars.member, link: vars.link, helpline: vars.helpline }, { locale, namespace: 'claim' });
}
