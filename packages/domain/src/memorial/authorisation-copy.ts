// The nominee's PERMISSION, given at Send — every version of its words, kept (Story 11b.4, AC4 / MA5;
// `#decision-2026-08-28-162` cl.3: *"FAMILY-OWNED MATERIAL IS AUTHORISED AT THE POINT OF SUBMISSION … in its own
// surface"*).
//
// A `memorial_submissions` row records `authorisation_copy_version` + `authorisation_locale`; this registry is what that
// id MEANS — the exact text shown immediately above Send. The server resolves the text (the client sends only the
// version it was shown and the locale), and REFUSES a version that is ⛔ not current (`409
// memorial.authorisation_outdated`) — ⚠ NEW behaviour: the member-terms echo is advisory only.
//
// ⛔ Never edit a version in place — a row must always be explicable by the text its version names. A change to the words
// mints a NEW version; a Hindi review that ACCEPTS the words flips that version's `hiReviewed`.
//
// ⭐ v1's basis (the doc-comment AC4 requires):
//   · `-391` Q2 A — WHERE it appears (the member's Sahyog Vivran page, which anyone with its link can read, as the Trust
//     approved it) and that a child is left out (the reviewer has ⛔ no ages, so the words promise what a reviewer can do);
//   · `-393` M2 — the honest notice: the nominee may later call the helpline to have it changed or taken down, and often a
//     small change is enough (⛔ never "cannot be taken down" — the rider is withdrawn; ⛔ no take-down button);
//   · `-395` item 3 / Consequence 1 — the notice is ADDRESSED TO THE NOMINEE (the reader at Send) and says plainly that the
//     NOMINEE asks for a take-down (else a relative who reads it and later calls is turned away, and the notice is no longer
//     honest).
// ⚠⭐ GO-LIVE GATED (launch-gate Row 41): the id carries `pending-hi-review` until a non-author Hindi review (AC14) accepts
// the words; the AC14 tone review checks M2 in both locales. The scope fence (`-160` cl.3 / cl.6): ⛔ no question about the
// member's name or the nominee's data — the permission covers the FAMILY's words and photo only.

/** The two languages the permission is shown in (the domain's own type — `packages/domain` has ⛔ `@twt/contracts`). */
export type MemorialAuthorisationLocale = 'hi' | 'en';

export interface MemorialAuthorisationVersion {
  readonly hi: string;
  readonly en: string;
  /** The Hindi was reviewed by a person (AC14) — false until a non-author reviewer accepts it. */
  readonly hiReviewed: boolean;
}

export const MEMORIAL_SUBMISSION_AUTHORISATION_VERSIONS: Readonly<Record<string, MemorialAuthorisationVersion>> = {
  // v1 — agent-drafted on `-391` Q2 A, `-393` M2 and `-395` item 3; ⛔ yet human-reviewed (AC14, Row 41).
  '2026-10-23.v1-pending-hi-review': {
    en:
      'When you press Send, you, as the nominee, give the Trust permission to show these words, and the photo if you added one, ' +
      "on this member's Sahyog Vivran page, which anyone with its link can read. The Trust will read them first. It may leave " +
      'out a sentence or the photo, and will tell you why, but it will never change your words. Please do not name any ' +
      "children; if the Trust finds a child's name, it will leave it out. If you, the nominee, ever want it changed or taken " +
      'down, you can call the helpline. Often a small change is enough.',
    hi:
      'भेजें दबाने पर आप, नॉमिनी के रूप में, ट्रस्ट को यह अनुमति देते हैं कि ये शब्द, और अगर आपने फ़ोटो जोड़ी है तो वह भी, इस सदस्य ' +
      'के सहयोग विवरण पेज पर दिखाए जाएँ, जिसे उसका लिंक रखने वाला कोई भी पढ़ सकता है। ट्रस्ट पहले इन्हें पढ़ेगा। वह कोई वाक्य या ' +
      'फ़ोटो छोड़ सकता है, और आपको इसका कारण बताएगा, पर आपके शब्द कभी नहीं बदलेगा। कृपया किसी बच्चे का नाम न लिखें; अगर ट्रस्ट को ' +
      'किसी बच्चे का नाम मिलता है, तो वह उसे छोड़ देगा। अगर आप, नॉमिनी, कभी इसमें बदलाव चाहें या इसे हटवाना चाहें, तो हेल्पलाइन पर ' +
      'फ़ोन कर सकते हैं। अक्सर एक छोटा-सा बदलाव काफ़ी होता है।',
    hiReviewed: false,
  },
};

/** The version every NEW submission must have been shown (and echo). */
export const MEMORIAL_SUBMISSION_AUTHORISATION_COPY_VERSION = '2026-10-23.v1-pending-hi-review';

/** The version a recorded id names — `undefined` for an id this registry does not know. */
export function memorialAuthorisationVersion(copyVersion: unknown): MemorialAuthorisationVersion | undefined {
  if (typeof copyVersion !== 'string') return undefined;
  return Object.prototype.hasOwnProperty.call(MEMORIAL_SUBMISSION_AUTHORISATION_VERSIONS, copyVersion)
    ? MEMORIAL_SUBMISSION_AUTHORISATION_VERSIONS[copyVersion]
    : undefined;
}

/** The CURRENT permission text, in BOTH locales (the member GET carries both — the app language may change before Send). */
export function currentMemorialAuthorisation(): {
  readonly copyVersion: string;
  readonly text: { readonly hi: string; readonly en: string };
} {
  const v = MEMORIAL_SUBMISSION_AUTHORISATION_VERSIONS[MEMORIAL_SUBMISSION_AUTHORISATION_COPY_VERSION]!;
  return { copyVersion: MEMORIAL_SUBMISSION_AUTHORISATION_COPY_VERSION, text: { hi: v.hi, en: v.en } };
}
