// Story 11b.4 — the memorial's DERIVED state and the pure decisions taken under the lock (MA9 / MA10 / MA13 / MA16, Trap 8,
// AC4, AC8, AC9). DB-free.

import { createHash } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import {
  MEMORIAL_REVIEW_REASONS,
  MEMORIAL_STATES,
  MEMORIAL_SUBMISSION_AUTHORISATION_COPY_VERSION,
  MEMORIAL_SUBMISSION_AUTHORISATION_VERSIONS,
  MEMORIAL_DRIVE_POOL_STATES,
  currentMemorialAuthorisation,
  decideFamilyWithdraw,
  decideMemorialSend,
  deriveEarlierApprovalWithdrawn,
  deriveMemorialStatus,
  latestApprovedIndex,
  memorialAuthorisationVersion,
  memorialVersionCarriesGuardianDeclaration,
  memorialCanSend,
  memorialCanWithdraw,
  memorialReviewTargetIndex,
  type MemorialChainLink,
  type MemorialReviewAction,
  type MemorialReviewReason,
  type MemorialWithdrawalActor,
} from '../../src/memorial/index.js';

/** The permission-text versions by id — v1 is SUPERSEDED by v2 (R1) but stays in the registry: a sent row names its version. */
const PERMISSION_V1 = '2026-10-23.v1-pending-hi-review';
const PERMISSION_V2 = '2026-10-24.v2-pending-hi-review';
const PERMISSION_V3 = '2026-10-25.v3-pending-hi-review';
const PERMISSION_V4 = '2026-10-31.v4-pending-hi-review';

let seq = 0;
function link(
  opts: {
    action?: MemorialReviewAction;
    withdrawnBy?: MemorialWithdrawalActor;
    reason?: MemorialReviewReason;
    photo?: boolean;
  } = {},
): MemorialChainLink {
  seq += 1;
  const submissionId = `00000000-0000-4000-8000-${String(seq).padStart(12, '0')}`;
  return {
    submission: {
      submissionId,
      photoObjectKey: opts.photo ? `memorial/${submissionId}.jpg` : null,
      photoMime: opts.photo ? 'image/jpeg' : null,
    } as MemorialChainLink['submission'],
    decision: opts.action ? ({ action: opts.action } as MemorialChainLink['decision']) : null,
    withdrawal: opts.withdrawnBy
      ? ({ withdrawnBy: opts.withdrawnBy, reasonCode: opts.withdrawnBy === 'trust' ? (opts.reason ?? 'identifies_a_child') : null } as MemorialChainLink['withdrawal'])
      : null,
  };
}

describe('deriveMemorialStatus — eight states (MA10; Story 11b.4a adds `taken_down`)', () => {
  it.each([
    [null, 'none'],
    [link(), 'with_the_trust'],
    [link({ action: 'approved' }), 'approved'],
    [link({ action: 'approved_with_omissions' }), 'approved_with_omissions'],
    [link({ action: 'not_approved' }), 'not_approved'],
    [link({ withdrawnBy: 'family' }), 'withdrawn'],
    [link({ action: 'approved', withdrawnBy: 'trust' }), 'approval_withdrawn'],
    // Story 11b.4a — the per-LINK mapping of a `helpline` withdrawal (the family's state is the CHAIN rule — Trap 18).
    [link({ action: 'approved', withdrawnBy: 'helpline' }), 'taken_down'],
    [link({ withdrawnBy: 'helpline' }), 'taken_down'],
  ] as const)('%# → %s', (latest, expected) => {
    expect(deriveMemorialStatus(latest)).toBe(expected);
  });

  it('covers every declared state exactly', () => {
    expect([...MEMORIAL_STATES]).toEqual([
      'none',
      'with_the_trust',
      'approved',
      'approved_with_omissions',
      'not_approved',
      'withdrawn',
      'approval_withdrawn',
      'taken_down',
    ]);
  });

  it('canSend is every state but a clean `approved` (MA13) — `taken_down` included (11b.4a MP9); canWithdraw only `with_the_trust` (MA9)', () => {
    for (const s of MEMORIAL_STATES) {
      expect(memorialCanSend(s)).toBe(s !== 'approved');
      expect(memorialCanWithdraw(s)).toBe(s === 'with_the_trust');
    }
  });

  it('the writing window is its OWN tuple: closed and settled (MA14)', () => {
    expect([...MEMORIAL_DRIVE_POOL_STATES]).toEqual(['closed', 'settled']);
  });
});

describe('earlierApprovalWithdrawn (MA16)', () => {
  it('null for an empty or one-version chain', () => {
    expect(deriveEarlierApprovalWithdrawn([])).toBeNull();
    expect(deriveEarlierApprovalWithdrawn([link({ action: 'approved', withdrawnBy: 'trust' })])).toBeNull();
  });

  it('the Trust withdrew an older approval and a newer version is with the Trust → its reason', () => {
    const chain = [link({ action: 'approved', withdrawnBy: 'trust', reason: 'against_the_law' }), link()];
    expect(deriveEarlierApprovalWithdrawn(chain)).toEqual({ reasonCode: 'against_the_law' });
  });

  it('null once a NEWER version was approved', () => {
    const chain = [link({ action: 'approved', withdrawnBy: 'trust' }), link({ action: 'approved' }), link()];
    expect(deriveEarlierApprovalWithdrawn(chain)).toBeNull();
  });

  it('null when the latest itself is `approval_withdrawn` (its own state says so)', () => {
    const chain = [link({ action: 'approved', withdrawnBy: 'trust' }), link({ action: 'approved', withdrawnBy: 'trust' })];
    expect(deriveEarlierApprovalWithdrawn(chain)).toBeNull();
  });

  it('carries the NEWEST such withdrawal', () => {
    const chain = [
      link({ action: 'approved', withdrawnBy: 'trust', reason: 'against_the_law' }),
      link({ action: 'not_approved' }),
      link({ action: 'approved_with_omissions', withdrawnBy: 'trust', reason: 'attacks_someone_named' }),
      link({ action: 'not_approved' }),
    ];
    expect(deriveEarlierApprovalWithdrawn(chain)).toEqual({ reasonCode: 'attacks_someone_named' });
  });

  it('a FAMILY withdrawal is never reported', () => {
    expect(deriveEarlierApprovalWithdrawn([link({ withdrawnBy: 'family' }), link()])).toBeNull();
  });
});

describe('decideMemorialSend (AC7 order under the lock)', () => {
  const current = { authorisationCopyVersion: MEMORIAL_SUBMISSION_AUTHORISATION_COPY_VERSION, keepPreviousPhoto: false };

  it('the first version supersedes nothing', () => {
    expect(decideMemorialSend([], current)).toEqual({ ok: true, supersedesSubmissionId: null, keptPhoto: null });
  });

  it('a Send while one is with the Trust supersedes it (MA9)', () => {
    const head = link();
    expect(decideMemorialSend([head], current)).toMatchObject({ ok: true, supersedesSubmissionId: head.submission.submissionId });
  });

  it('refuses after a clean approval (MA13) BEFORE checking the version', () => {
    expect(decideMemorialSend([link({ action: 'approved' })], { ...current, authorisationCopyVersion: 'old' })).toEqual({
      ok: false,
      refusal: 'already_reviewed',
    });
  });

  it('allows after withdrawn / not approved / with omissions / approval withdrawn', () => {
    for (const l of [
      link({ withdrawnBy: 'family' }),
      link({ action: 'not_approved' }),
      link({ action: 'approved_with_omissions' }),
      link({ action: 'approved', withdrawnBy: 'trust' }),
    ]) {
      expect(decideMemorialSend([l], current).ok).toBe(true);
    }
  });

  it('refuses a stale permission version (AC4 — new behaviour)', () => {
    expect(decideMemorialSend([], { ...current, authorisationCopyVersion: '2026-01-01.v0' })).toEqual({
      ok: false,
      refusal: 'authorisation_outdated',
    });
  });

  it('refuses the SUPERSEDED v1, v2 and v3 ids — a phone that still shows one must read v4 first (R1; Story 11b.5a KL7)', () => {
    for (const old of [PERMISSION_V1, PERMISSION_V2, PERMISSION_V3]) {
      expect(decideMemorialSend([], { ...current, authorisationCopyVersion: old }), old).toEqual({
        ok: false,
        refusal: 'authorisation_outdated',
      });
    }
    expect(decideMemorialSend([], { ...current, authorisationCopyVersion: PERMISSION_V4 }).ok).toBe(true);
    // The id v1 carried is still a KNOWN id (a row sent under it names it) — only the current one is accepted.
    expect(memorialAuthorisationVersion(PERMISSION_V1)).toBeDefined();
    expect(PERMISSION_V1).not.toBe(MEMORIAL_SUBMISSION_AUTHORISATION_COPY_VERSION);
  });

  it('keepPreviousPhoto reads the HEAD\'s photo; ⛔ a head with no photo → no_previous_photo (MA8)', () => {
    const withPhoto = link({ photo: true, action: 'not_approved' });
    const decision = decideMemorialSend([withPhoto], { ...current, keepPreviousPhoto: true });
    expect(decision).toEqual({
      ok: true,
      supersedesSubmissionId: withPhoto.submission.submissionId,
      keptPhoto: { objectKey: withPhoto.submission.photoObjectKey, mime: 'image/jpeg' },
    });
    expect(decideMemorialSend([link({ action: 'not_approved' })], { ...current, keepPreviousPhoto: true })).toEqual({
      ok: false,
      refusal: 'no_previous_photo',
    });
    expect(decideMemorialSend([], { ...current, keepPreviousPhoto: true })).toEqual({ ok: false, refusal: 'no_previous_photo' });
  });
});

describe('decideFamilyWithdraw (AC8)', () => {
  it('ok only for the latest, while with the Trust', () => {
    const a = link({ action: 'not_approved' });
    const b = link();
    expect(decideFamilyWithdraw([a, b], b.submission.submissionId)).toBe('ok');
    expect(decideFamilyWithdraw([a, b], a.submission.submissionId)).toBe('not_withdrawable');
    const c = link({ action: 'approved' });
    expect(decideFamilyWithdraw([c], c.submission.submissionId)).toBe('not_withdrawable');
    expect(decideFamilyWithdraw([a, b], '00000000-0000-4000-8000-ffffffffffff')).toBe('not_found');
  });
});

describe('memorialReviewTargetIndex — per-route refusal sets (Trap 8, AC9)', () => {
  it('decision: only an undecided, un-withdrawn HEAD', () => {
    const superseded = link();
    const head = link();
    const chain = [superseded, head];
    expect(memorialReviewTargetIndex(chain, head.submission.submissionId, 'decision')).toBe(1);
    expect(memorialReviewTargetIndex(chain, superseded.submission.submissionId, 'decision')).toBeNull();
    expect(memorialReviewTargetIndex([link({ action: 'approved' })], 'x', 'decision')).toBeNull();
    const decided = link({ action: 'approved' });
    expect(memorialReviewTargetIndex([decided], decided.submission.submissionId, 'decision')).toBeNull();
    const withdrawn = link({ withdrawnBy: 'family' });
    expect(memorialReviewTargetIndex([withdrawn], withdrawn.submission.submissionId, 'decision')).toBeNull();
  });

  it('withdraw-approval: the chain\'s latest approved, un-withdrawn version — even SUPERSEDED (MA16)', () => {
    const approved = link({ action: 'approved_with_omissions' });
    const newer = link();
    const chain = [approved, newer];
    expect(latestApprovedIndex(chain)).toBe(0);
    expect(memorialReviewTargetIndex(chain, approved.submission.submissionId, 'withdraw_approval')).toBe(0);
    expect(memorialReviewTargetIndex(chain, newer.submission.submissionId, 'withdraw_approval')).toBeNull();
    const gone = link({ action: 'approved', withdrawnBy: 'trust' });
    expect(memorialReviewTargetIndex([gone], gone.submission.submissionId, 'withdraw_approval')).toBeNull();
    const refused = link({ action: 'not_approved' });
    expect(memorialReviewTargetIndex([refused], refused.submission.submissionId, 'withdraw_approval')).toBeNull();
  });

  it('detail: every version of the chain is readable (the history view)', () => {
    const chain = [link({ action: 'approved', withdrawnBy: 'trust' }), link({ withdrawnBy: 'family' }), link()];
    for (const [i, l] of chain.entries()) {
      expect(memorialReviewTargetIndex(chain, l.submission.submissionId, 'detail')).toBe(i);
    }
    expect(memorialReviewTargetIndex(chain, 'unknown', 'detail')).toBeNull();
  });
});

describe('MEMORIAL_SUBMISSION_AUTHORISATION_VERSIONS (AC4)', () => {
  it('every version has non-empty hi and en text and an explicit hiReviewed', () => {
    const entries = Object.entries(MEMORIAL_SUBMISSION_AUTHORISATION_VERSIONS);
    expect(entries.length).toBeGreaterThan(0);
    for (const [id, v] of entries) {
      expect(v.hi.trim().length, id).toBeGreaterThan(0);
      expect(v.en.trim().length, id).toBeGreaterThan(0);
      expect(typeof v.hiReviewed).toBe('boolean');
    }
  });

  it('the current id is v4 (Story 11b.5a): it carries the go-live marker and is unreviewed; v1–v3 are superseded but still resolve', () => {
    expect(MEMORIAL_SUBMISSION_AUTHORISATION_COPY_VERSION).toBe(PERMISSION_V4);
    expect(Object.keys(MEMORIAL_SUBMISSION_AUTHORISATION_VERSIONS)).toEqual([PERMISSION_V1, PERMISSION_V2, PERMISSION_V3, PERMISSION_V4]);
    expect(memorialAuthorisationVersion(PERMISSION_V4)?.hiReviewed).toBe(false);
    // v3's changed sentence is BigDev's own wording — its Hindi needs a reviewer who is not its author (AC14).
    expect(memorialAuthorisationVersion(PERMISSION_V3)?.hiReviewed).toBe(false);
    expect(memorialAuthorisationVersion(PERMISSION_V2)?.hiReviewed).toBe(false);
    // A row sent while v1 was current still names v1 — it must keep resolving to the words that row was shown.
    expect(memorialAuthorisationVersion(PERMISSION_V1)?.hiReviewed).toBe(false);
    expect(memorialAuthorisationVersion('nope')).toBeUndefined();
    expect(memorialAuthorisationVersion(42)).toBeUndefined();
    expect(currentMemorialAuthorisation().copyVersion).toBe(MEMORIAL_SUBMISSION_AUTHORISATION_COPY_VERSION);
    expect(currentMemorialAuthorisation().text).toEqual({
      hi: memorialAuthorisationVersion(PERMISSION_V4)!.hi,
      en: memorialAuthorisationVersion(PERMISSION_V4)!.en,
    });
  });

  it('an id carries the go-live marker for exactly as long as its Hindi is unreviewed, and the ids are well-formed', () => {
    for (const [id, v] of Object.entries(MEMORIAL_SUBMISSION_AUTHORISATION_VERSIONS)) {
      expect(id, id).toMatch(/^\d{4}-\d{2}-\d{2}\.v\d+(-pending-hi-review)?$/);
      expect(id.endsWith('-pending-hi-review'), id).toBe(!v.hiReviewed);
    }
  });

  it('v1 is word for word what a row sent under it was shown — a change to the words mints a NEW version (R1)', () => {
    const sha = (s: string): string => createHash('sha256').update(s, 'utf8').digest('hex');
    const v1 = memorialAuthorisationVersion(PERMISSION_V1)!;
    expect(sha(v1.en)).toBe('67dea01e43cb20d13b22f684f0ffb572840f33cde88ccd30719b3355dc632cc4');
    expect(sha(v1.hi)).toBe('f601534575c012dd2159d66abf1612d37291c5632e58f25351bf4e4584b56b17');
  });

  it('v2 is word for word what was committed (`19068923`) — the Hindi review minted v3 instead of editing it', () => {
    const sha = (s: string): string => createHash('sha256').update(s, 'utf8').digest('hex');
    const v2 = memorialAuthorisationVersion(PERMISSION_V2)!;
    expect(sha(v2.en)).toBe('472bb192d4af8efba33cf646a55e509cfff386362dae97901b82b46777a632b0');
    expect(sha(v2.hi)).toBe('1593d94499e50b7f0e1dbb55f2d9674d44b0fb5b18b1e1d02caa1dac064b9039');
  });

  // The Hindi review (BigDev, 2026-10-25) accepted v2 and changed ONE sentence, adjusted at BigDev's choice "1".
  describe('v3 is v2 with ONE sentence changed: the Trust reads the words before anyone else does', () => {
    const v2 = memorialAuthorisationVersion(PERMISSION_V2)!;
    const v3 = memorialAuthorisationVersion(PERMISSION_V3)!;
    it('en and hi: exactly that sentence replaced, nothing else', () => {
      expect(v3.en).toBe(v2.en.replace('The Trust will read them first.', 'The Trust will read them before anyone else does.'));
      expect(v3.hi).toBe(v2.hi.replace('ट्रस्ट पहले इन्हें पढ़ेगा।', 'किसी और के देखने से पहले ट्रस्ट इनका अवलोकन करेगा।'));
      expect(v3.en).not.toBe(v2.en);
      expect(v3.hi).not.toBe(v2.hi);
    });
    it('promises no single review and no contrast it does not have; the page stays THIS member\'s', () => {
      expect(v3.en).not.toMatch(/\bhowever\b|\bonce\b/i);
      expect(v3.hi).not.toMatch(/हालाँकि|एक बार/);
      expect(v3.hi).not.toMatch(/ ।/);
      expect(v3.hi).toContain('इस सदस्य के सहयोग विवरण पेज');
      expect(v3.en).toContain("this member's Sahyog Vivran page");
    });
  });

  // Story 11b.5a (KL7 / KL16) — v4 is v3 with EXACTLY the five marked sentences of Q-copy-3 changed (approved by BigDev
  // 2026-10-31; ④ re-approved). Each pair is [the v3 sentence, its v4 replacement]; anything else that differs fails.
  describe('v4 is v3 with exactly the marked changes: ① the list + both places, ② a name, ③ the declaration, ⑤B, ④', () => {
    const v3 = memorialAuthorisationVersion(PERMISSION_V3)!;
    const v4 = memorialAuthorisationVersion(PERMISSION_V4)!;
    const EN: readonly (readonly [string, string])[] = [
      [
        "When you press Send, you, as the nominee, give the Trust permission to show these words, and the photo if you added one, on this member's Sahyog Vivran page, which anyone with its link can read.",
        "When you press Send, you, as the nominee, give the Trust permission to show these words, the family list if you added one, and the photo if you added one, on this member's Sahyog Vivran page (which anyone with its link can read) and to members in the app.",
      ],
      [
        'It may leave out a sentence or the photo, and will tell you why, but it will never change your words.',
        'It may leave out a sentence, a name from the list, or the photo, and will tell you why, but it will never change your words or the names you wrote.',
      ],
      [
        "Please do not name any children; if the Trust finds a child's name, it will leave it out.",
        "By pressing Send you also confirm: for every child you have named or who is in the photo, you are their parent or lawful guardian, or you have their parent's or guardian's agreement; and every adult you have named has agreed to be named.",
      ],
      [
        "the helpline will not remove it at anyone else's request.",
        "the helpline will not remove it at anyone else's request — except that a person named in the family list may ask for their own name to be removed.",
      ],
      [
        'only if something in the words or the photo speaks against a person by name, says that someone did something wrong, may be against the law, or names or shows a child.',
        'only if something in the words, the list or the photo speaks against a person by name, says that someone did something wrong, may be against the law, or names or shows a child this confirmation does not cover.',
      ],
    ];
    const HI: readonly (readonly [string, string])[] = [
      [
        'भेजें दबाने पर आप, नॉमिनी के रूप में, ट्रस्ट को यह अनुमति देते हैं कि ये शब्द, और अगर आपने फ़ोटो जोड़ी है तो वह भी, इस सदस्य के सहयोग विवरण पेज पर दिखाए जाएँ, जिसे उसका लिंक रखने वाला कोई भी पढ़ सकता है।',
        "जब आप 'भेजें' (Send) दबाते हैं, तो नॉमिनी के तौर पर आप ट्रस्ट को यह अनुमति देते हैं कि वह इन शब्दों, परिवार की सूची (यदि आपने जोड़ी है), और फ़ोटो (यदि आपने जोड़ी है) को इस सदस्य के 'सहयोग विवरण' (Sahyog Vivran) पेज पर दिखाए। इस पेज को कोई भी व्यक्ति, जिसके पास इसका लिंक हो, देख सकता है; साथ ही, ऐप में मौजूद अन्य सदस्य भी इसे देख सकते हैं।",
      ],
      [
        'वह कोई वाक्य या फ़ोटो छोड़ सकता है, और आपको इसका कारण बताएगा, पर आपके शब्द कभी नहीं बदलेगा।',
        'वह कोई वाक्य, सूची का कोई नाम या फ़ोटो छोड़ सकता है, और आपको इसका कारण बताएगा, पर आपके शब्द या आपके लिखे नाम कभी नहीं बदलेगा।',
      ],
      [
        'कृपया किसी बच्चे का नाम न लिखें; अगर ट्रस्ट को किसी बच्चे का नाम मिलता है, तो वह उसे छोड़ देगा।',
        'भेजें दबाकर आप यह भी पुष्टि करते हैं: आपने जिस भी बच्चे का नाम लिखा है या जो फ़ोटो में है, उसके आप माता-पिता या कानूनी अभिभावक हैं, या आपने उसके माता-पिता या अभिभावक की सहमति ली है; और आपने जिस भी वयस्क का नाम लिखा है, उसने नाम लिखे जाने पर सहमति दी है।',
      ],
      [
        'किसी और के कहने पर हेल्पलाइन इसे नहीं हटाएगी।',
        'किसी और के कहने पर हेल्पलाइन इसे नहीं हटाएगी — सिवाय इसके कि परिवार की सूची में जिसका नाम है, वह अपना नाम हटवाने का अनुरोध कर सकता है।',
      ],
      [
        'जब शब्दों या फ़ोटो में किसी व्यक्ति के विरुद्ध उसका नाम लेकर कुछ कहा गया हो, यह कहा गया हो कि किसी ने कुछ गलत किया, कुछ ऐसा हो जो कानून के विरुद्ध हो सकता है, या किसी बच्चे का नाम हो या कोई बच्चा दिखता हो।',
        'जब शब्दों, सूची या फ़ोटो में किसी व्यक्ति के विरुद्ध उसका नाम लेकर कुछ कहा गया हो, यह कहा गया हो कि किसी ने कुछ गलत किया, कुछ ऐसा हो जो कानून के विरुद्ध हो सकता है, या किसी ऐसे बच्चे का नाम हो या वह दिखता हो जिसके लिए यह पुष्टि लागू नहीं होती।',
      ],
    ];
    const apply = (text: string, pairs: readonly (readonly [string, string])[]): string =>
      pairs.reduce((t, [from, to]) => {
        expect(t.split(from).length - 1, from).toBe(1);
        return t.replace(from, to);
      }, text);

    it('en and hi: exactly those five sentences replaced, nothing else', () => {
      expect(v4.en).toBe(apply(v3.en, EN));
      expect(v4.hi).toBe(apply(v3.hi, HI));
    });

    it('carries the guardian declaration (KL16) — v1–v3 do not; the flag, ⛔ the id, says so', () => {
      expect(v4.carriesGuardianDeclaration).toBe(true);
      for (const id of [PERMISSION_V1, PERMISSION_V2, PERMISSION_V3]) {
        expect(memorialAuthorisationVersion(id)!.carriesGuardianDeclaration, id).toBe(false);
        expect(memorialVersionCarriesGuardianDeclaration(id), id).toBe(false);
      }
      expect(memorialVersionCarriesGuardianDeclaration(PERMISSION_V4)).toBe(true);
      expect(memorialVersionCarriesGuardianDeclaration('2099-01-01.v9')).toBe(false); // an unknown id ⇒ false
      expect(memorialVersionCarriesGuardianDeclaration(undefined)).toBe(false);
    });

    it('names BOTH places (`-428` rider) and keeps M2 addressed to the nominee; ⛔ no "cannot"', () => {
      expect(v4.en).toMatch(/Sahyog Vivran page/);
      expect(v4.en).toMatch(/and to members in the app\./);
      expect(v4.en).toMatch(/you, the nominee, ever want it changed or taken down, you can call the helpline/);
      expect(v4.hi).toMatch(/आप, नॉमिनी, कभी इसमें बदलाव चाहें या इसे हटवाना चाहें, तो हेल्पलाइन/);
      expect(v4.en).not.toMatch(/\bcannot\b/i);
      expect(v4.hi).not.toMatch(/अभी\s*कर/);
    });

    // ④ — one phrase per `MEMORIAL_REVIEW_REASONS` code; the child ground narrowed to a child the confirmation does not cover.
    const GROUND_EN_V4: Readonly<Record<MemorialReviewReason, string>> = {
      attacks_someone_named: 'speaks against a person by name',
      accuses_someone_of_wrongdoing: 'says that someone did something wrong',
      against_the_law: 'may be against the law',
      identifies_a_child: 'names or shows a child this confirmation does not cover',
    };
    const GROUND_HI_V4: Readonly<Record<MemorialReviewReason, string>> = {
      attacks_someone_named: 'किसी व्यक्ति के विरुद्ध उसका नाम लेकर कुछ कहा गया हो',
      accuses_someone_of_wrongdoing: 'यह कहा गया हो कि किसी ने कुछ गलत किया',
      against_the_law: 'कुछ ऐसा हो जो कानून के विरुद्ध हो सकता है',
      identifies_a_child: 'किसी ऐसे बच्चे का नाम हो या वह दिखता हो जिसके लिए यह पुष्टि लागू नहीं होती',
    };
    it.each([
      ['en', GROUND_EN_V4, () => v4.en],
      ['hi', GROUND_HI_V4, () => v4.hi],
    ] as const)('%s: ④ names ONE phrase per reason — the map\'s keys ARE the reasons', (_locale, grounds, text) => {
      expect(Object.keys(grounds).sort()).toEqual([...MEMORIAL_REVIEW_REASONS].sort());
      for (const code of MEMORIAL_REVIEW_REASONS) expect(text().split(grounds[code]).length - 1, code).toBe(1);
    });
  });

  it.each([
    [PERMISSION_V1, 'v1'],
    [PERMISSION_V2, 'v2'],
    [PERMISSION_V3, 'v3'],
  ])('%s carries M2 addressed to the nominee in both locales (`-393` M2, `-395` item 3) and never says "cannot be taken down"', (id) => {
    const v = memorialAuthorisationVersion(id)!;
    expect(v.en).toMatch(/you, the nominee, ever want it changed or taken down, you can call the helpline/);
    expect(v.hi).toMatch(/आप, नॉमिनी, कभी इसमें बदलाव चाहें या इसे हटवाना चाहें, तो हेल्पलाइन/);
    expect(v.en).not.toMatch(/cannot be taken down/i);
    // `-391` Q2 A — where it appears, and children left out.
    expect(v.en).toMatch(/Sahyog Vivran page/);
    expect(v.en).toMatch(/child's name, it will leave it out/);
    // The fursat register (`microcopy.yaml` `fursat-pressure`): no Hindi imperative "अभी कर…".
    expect(v.hi).not.toMatch(/अभी\s*कर/);
  });

  // R1 (BigDev DECIDED B, 2026-10-24) — AC4 asks M2 to say PLAINLY that a take-down is asked for by the nominee; v1 addressed
  // the nominee but never said a request from anyone else is not acted on (`-395` item 3).
  describe('v2 says plainly that ONLY the nominee can ask for a take-down (R1)', () => {
    const v1 = memorialAuthorisationVersion(PERMISSION_V1)!;
    const v2 = memorialAuthorisationVersion(PERMISSION_V2)!;
    const NEW_EN = "Only the nominee can ask for it to be taken down; the helpline will not remove it at anyone else's request.";
    const NEW_HI = 'इसे हटवाने का अनुरोध केवल नॉमिनी ही कर सकते हैं; किसी और के कहने पर हेल्पलाइन इसे नहीं हटाएगी';
    // T1 (third review pass, BigDev DECIDED B, 2026-10-24) — added IN v2 (never shown, Hindi unreviewed; ⛔ no v3): the Trust
    // may still withdraw its OWN approval (MA16), on the four `MEMORIAL_REVIEW_REASONS` only (`-391` Confirm 2 A), worded
    // as the family's `reason.*` copy words them — else a relative's call that prompts the reviewer's own withdrawal reads
    // as the sentence above broken. V7 (third pass's fix-diff review) moved it AFTER the gentle close, so the close stays
    // beside the helpline / take-down sentences (AC4 M2) and never reads as a remedy for the Trust's grounds.
    const TRUST_EN =
      'The Trust itself may still withdraw its approval, but only if something in the words or the photo speaks against a ' +
      'person by name, says that someone did something wrong, may be against the law, or names or shows a child.';
    const TRUST_HI =
      'ट्रस्ट स्वयं फिर भी अपनी स्वीकृति वापस ले सकता है, पर केवल तब, जब शब्दों या फ़ोटो में किसी व्यक्ति के विरुद्ध उसका नाम ' +
      'लेकर कुछ कहा गया हो, यह कहा गया हो कि किसी ने कुछ गलत किया, कुछ ऐसा हो जो कानून के विरुद्ध हो सकता है, या किसी बच्चे ' +
      'का नाम हो या कोई बच्चा दिखता हो';

    it('both sentences are in both locales of v2 …', () => {
      expect(v2.en).toContain(NEW_EN);
      expect(v2.hi).toContain(NEW_HI + '।');
      expect(v2.en).toContain(TRUST_EN);
      expect(v2.hi).toContain(TRUST_HI + '।');
    });

    it('… and not in v1, whose words are unchanged', () => {
      expect(v1.en).not.toMatch(/Only the nominee/);
      expect(v1.hi).not.toContain('केवल नॉमिनी ही कर सकते हैं');
      expect(v1.en).not.toMatch(/withdraw its approval/);
      expect(v1.hi).not.toContain('स्वीकृति वापस');
    });

    it('v2 is v1 with the nominee-only sentence right after the helpline sentence and the Trust sentence AFTER the close — nothing else moved (V7)', () => {
      expect(v2.en).toBe(`${v1.en.replace('you can call the helpline. ', `you can call the helpline. ${NEW_EN} `)} ${TRUST_EN}`);
      const sentences = v1.hi.split('। ');
      expect(sentences.at(-2)).toMatch(/हेल्पलाइन पर/);
      expect(sentences.at(-1)).toBe('अक्सर एक छोटा-सा बदलाव काफ़ी होता है।');
      expect(v2.hi).toBe(`${[...sentences.slice(0, -1), NEW_HI, sentences.at(-1)!].join('। ')} ${TRUST_HI}।`);
    });

    // One phrase per MA16 ground, keyed by its `MEMORIAL_REVIEW_REASONS` code (`-391` Confirm 2 A: "these four, and no
    // others") — a fifth reason, or a renamed one, fails here until the Trust sentence is worded for it (V7).
    const GROUND_EN: Readonly<Record<MemorialReviewReason, string>> = {
      attacks_someone_named: 'speaks against a person by name',
      accuses_someone_of_wrongdoing: 'says that someone did something wrong',
      against_the_law: 'may be against the law',
      identifies_a_child: 'names or shows a child',
    };
    const GROUND_HI: Readonly<Record<MemorialReviewReason, string>> = {
      attacks_someone_named: 'किसी व्यक्ति के विरुद्ध उसका नाम लेकर कुछ कहा गया हो',
      accuses_someone_of_wrongdoing: 'यह कहा गया हो कि किसी ने कुछ गलत किया',
      against_the_law: 'कुछ ऐसा हो जो कानून के विरुद्ध हो सकता है',
      identifies_a_child: 'किसी बच्चे का नाम हो या कोई बच्चा दिखता हो',
    };

    it.each([
      ['en', GROUND_EN, () => v2.en, TRUST_EN],
      ['hi', GROUND_HI, () => v2.hi, TRUST_HI],
    ] as const)('%s: the Trust sentence names ONE phrase per `MEMORIAL_REVIEW_REASONS` code — the map\'s keys ARE the reasons', (_locale, grounds, text, trust) => {
      expect(Object.keys(grounds).sort()).toEqual([...MEMORIAL_REVIEW_REASONS].sort());
      for (const code of MEMORIAL_REVIEW_REASONS) {
        expect(trust, code).toContain(grounds[code]);
        expect(text(), code).toContain(grounds[code]);
      }
      // Each phrase only once: four grounds, none repeated.
      for (const phrase of Object.values(grounds)) expect(trust.split(phrase).length - 1, phrase).toBe(1);
    });

    it('the Trust sentence names MA16 grounds ONLY — no fifth (no family request, `-393`/MA18)', () => {
      expect(TRUST_EN).toMatch(/\bonly if\b/);
      expect(TRUST_EN).not.toMatch(/\b(ask|asks|asked|request)\b/i);
      expect(TRUST_HI).toContain('केवल तब');
      expect(TRUST_HI).not.toMatch(/अनुरोध|कहने पर/);
    });

    it('the gentle close follows the take-down sentences directly and the Trust sentence comes LAST (V7); no "cannot"', () => {
      expect(v2.en).toContain(`${NEW_EN} Often a small change is enough. ${TRUST_EN}`);
      expect(v2.en.endsWith(TRUST_EN)).toBe(true);
      expect(v2.en).not.toMatch(/\bcannot\b/i);
      expect(v2.hi).toContain(`${NEW_HI}। अक्सर एक छोटा-सा बदलाव काफ़ी होता है। ${TRUST_HI}।`);
      expect(v2.hi.endsWith(`${TRUST_HI}।`)).toBe(true);
    });
  });
});
