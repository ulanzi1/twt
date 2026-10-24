// Story 6.36b (AC13) — the `known_people` namespace through the REAL `t()` (⛔ a hand-built labels fixture — the 11a.2
// unregistered-namespace defect, [[feedback_stub_must_call_not_transcribe]]):
//   · registered (both locales) and member-facing (Hindi parity enforced);
//   · every key resolves in en AND hi with its parameters supplied, leaving ⛔ stray brace;
//   · the ruled words verbatim: `-307` §2 item 3 (iii)'s request, `-309`'s note (BigDev's words) with the Trust's name a
//     PARAMETER (⛔ a name written into the copy — the legal name is pending), the two "will see" notices (6.36a SW14).

import { describe, expect, it } from 'vitest';

import { KNOWN_NAMESPACES, classifyNamespace, getCatalog, t } from '../src/index.js';

const NS = 'known_people';
const PARAMS: Record<string, Record<string, string | number>> = {
  'list.free_slots': { count: 2 },
  'action.remove_a11y': { name: 'Meena K.' },
  'note.find_body': { trust_name: 'Example Trust' },
  'find.select_hint': { count: 3 },
  'find.selected_a11y': { name: 'Meena K.' },
  'find.not_selected_a11y': { name: 'Meena K.' },
  'invite.action_a11y': { name: 'Meena K.' },
  'invite.message': { trust_name: 'Example Trust' },
  'request.question': { name: 'Asha D.' },
  'request.will_see': { name: 'Asha D.' },
  'request.accepted': { name: 'Asha D.' },
  'request.withdraw_notice': { name: 'Asha D.' },
  'done.accepted': { name: 'Asha D.' },
  'done.declined': { name: 'Asha D.' },
  'done.removed': { name: 'Asha D.' },
  'done.withdrawn': { name: 'Asha D.' },
  // review round 2 (P2, P11) — the found-count line and the answer buttons that name the person
  'find.matches_count': { count: 2 },
  'find.too_many': { count: 1 },
  'request.yes_a11y': { name: 'Asha D.' },
  'request.no_a11y': { name: 'Asha D.' },
  'request.withdraw_a11y': { name: 'Asha D.' },
};

describe('known_people copy (real t())', () => {
  it('is registered and member-facing', () => {
    expect(KNOWN_NAMESPACES).toContain(NS);
    expect(getCatalog('en', NS)).toBeDefined();
    expect(getCatalog('hi', NS)).toBeDefined();
    expect(classifyNamespace(NS)).toBe('member-facing');
  });

  it('every key resolves in en AND hi with its parameters — ⛔ a stray brace, ⛔ an empty string', () => {
    const keys = Object.keys(getCatalog('en', NS)!).filter((k) => !k.startsWith('$comment'));
    expect(keys.length).toBeGreaterThan(40);
    for (const locale of ['en', 'hi'] as const) {
      for (const key of keys) {
        const out = t(key, PARAMS[key], { locale, namespace: NS });
        expect(out.trim(), `${locale}:${key}`).not.toBe('');
        expect(out, `${locale}:${key}`).not.toMatch(/[{}]/);
      }
    }
  });

  it('every parameterised key THROWS without its parameter (so a screen that forgets one fails loudly)', () => {
    for (const key of Object.keys(PARAMS)) expect(() => t(key, undefined, { locale: 'en', namespace: NS })).toThrow();
  });

  it('the ruled words, verbatim', () => {
    const en = (key: string) => t(key, PARAMS[key], { locale: 'en', namespace: NS });
    expect(en('request.question')).toBe('Asha D. has named you as someone who knows them. Do you know him/her?');
    expect(en('request.will_see')).toBe('Asha D. will see your answer.');
    expect(en('request.withdraw_notice')).toBe('Asha D. will see that you withdrew.');
    expect(en('note.find_body')).toBe('We need access to find your colleagues already at Example Trust.');
    expect(en('note.not_kept')).toBe("Numbers of people who aren't members are not kept.");
    expect(en('find.checked_limit')).toBe('We checked 1,000 of your contacts.');
    expect(en('find.limited_access')).toBe('Only the contacts you shared are checked.');
    expect(en('invite.heading')).toBe('Not members yet — invite');
    expect(en('request.yes')).toBe('Yes, I know them');
  });

  it('WCAG 2.5.3 — each answer button\'s accessible name BEGINS with its visible text (en + hi), then names the person', () => {
    for (const locale of ['en', 'hi'] as const) {
      const tt = (key: string, params?: Record<string, string>) => t(key, params, { locale, namespace: NS });
      for (const [visible, a11y] of [['request.yes', 'request.yes_a11y'], ['request.no', 'request.no_a11y'], ['request.withdraw', 'request.withdraw_a11y']] as const) {
        const named = tt(a11y, { name: 'Asha D.' });
        expect(named.startsWith(tt(visible)), `${locale}:${a11y}`).toBe(true);
        expect(named).toContain('Asha D.');
      }
    }
  });

  it('⛔ the Trust\'s name is written in the copy — it is a parameter', () => {
    for (const locale of ['en', 'hi'] as const) {
      const json = JSON.stringify(getCatalog(locale, NS));
      expect(json).toContain('{trust_name}');
      expect(json).not.toMatch(/Welfare Trust|Shikshak Parivar|शिक्षक परिवार/);
    }
  });

  // `2026-10-24-402` (BigDev): the "people who know you" screen says WHAT each named person is asked and a GENERIC purpose — ⛔ the
  // order in which the Trust asks people (colleagues first, these people only when none can be), ⛔ "agree" with nothing said to agree to.
  it('⭐ the intro says what each named person is asked and states a generic purpose (en + hi), verbatim', () => {
    expect(t('intro', undefined, { locale: 'en', namespace: NS })).toBe(
      'Name up to three members who know you well. Each person will first be asked whether they know you. The Trust may contact them to check on your wellbeing if it cannot reach you directly.',
    );
    expect(t('intro', undefined, { locale: 'hi', namespace: NS })).toBe(
      'ऐसे तीन तक सदस्यों के नाम दें जो आपको अच्छी तरह जानते हैं। हर व्यक्ति से पहले पूछा जाएगा कि क्या वे आपको जानते हैं। अगर ट्रस्ट आपसे सीधे संपर्क न कर पाए, तो वह आपका हालचाल जानने के लिए उनसे संपर्क कर सकता है।',
    );
  });

  it('the two lines that said a named person "can no longer be asked" say "no longer available" (`2026-10-24-403`, en + hi)', () => {
    expect(t('card.replace_title', undefined, { locale: 'en', namespace: NS })).toBe('Someone who knows you is no longer available — add someone else.');
    expect(t('label.unavailable', undefined, { locale: 'en', namespace: NS })).toBe('No longer available');
    expect(t('card.replace_title', undefined, { locale: 'hi', namespace: NS })).toBe('आपको जानने वाला कोई व्यक्ति अब उपलब्ध नहीं है — किसी और को जोड़ें।');
    expect(t('label.unavailable', undefined, { locale: 'hi', namespace: NS })).toBe('अब उपलब्ध नहीं');
  });

  it('⭐ ⛔ no string of the namespace says that colleagues are asked first, that these people are the fallback, or that members are asked about a death (en + hi)', () => {
    const order = {
      en: /colleagues? can be asked|asks these people|if none of your colleagues|no longer be asked|\b(death|dies|died|dead|deceased|passed away|vouch)\b/i,
      hi: /सहकर्मी[^।]*पूछ|पूछा नहीं जा सकता|नहीं पूछा जा सकता|मृत्यु|निधन|देहांत|मौत|मृतक|स्वर्गवास/,
    };
    for (const locale of ['en', 'hi'] as const) {
      const catalog = getCatalog(locale, NS) as Record<string, unknown>;
      for (const [key, value] of Object.entries(catalog)) {
        if (typeof value !== 'string' || key.startsWith('$')) continue; // `$comment…` keys are developer notes, ⛔ shown to a member
        expect(value, `${locale}:${key}`).not.toMatch(order[locale]);
      }
    }
  });
});
