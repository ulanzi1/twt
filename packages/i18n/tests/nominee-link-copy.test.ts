// Story 6.36e (AC5, NE6) — the `nominee_link` namespace through the REAL `t()` (⛔ a hand-built labels fixture —
// [[feedback_stub_must_call_not_transcribe]]):
//   · registered (both locales — `catalog.ts`) and classified member-facing (`classification.json` — Hindi parity enforced);
//   · every key resolves in en AND hi with its parameters supplied, leaving ⛔ stray brace; a parameterised key THROWS
//     without its parameter;
//   · the English quoted in the story (NE6 / AC5) is FINAL — pinned verbatim;
//   · the Trust's name is a PARAMETER (⛔ written — the legal name is pending).

import { describe, expect, it } from 'vitest';

import { KNOWN_NAMESPACES, classifyNamespace, getCatalog, t } from '../src/index.js';

const NS = 'nominee_link';
const PARAMS: Record<string, Record<string, string | number>> = {
  'form.marked': { name: 'Meena K.' },
  'form.will_ask': { name: 'Meena K.' },
  'label.confirmed': { name: 'Meena K.' },
  'edit.question': { name: 'Meena K.' },
  'note.body': { trust_name: 'Example Trust' },
  'find.matches_count': { count: 2 },
  'find.pick_a11y': { name: 'Meena K.' },
  'request.question': { name: 'Asha D.' },
  'request.will_see': { name: 'Asha D.' },
};

describe('nominee_link copy (real t())', () => {
  // `2026-10-24-401` (BigDev): no member-facing line says — or implies — that the Trust asks members about a death. The lines that did
  // (`form.why` on the declarer's form, `request.consequence*` on the marked member's screen) described how the five are chosen,
  // which a group could use to steer it. They are deleted; this pins that nothing like them comes back, in either language.
  it('⭐ ⛔ no string of the namespace mentions a death or being asked about one (en + hi) — and the three removed keys are gone', () => {
    const death = {
      en: /\b(death|dies|died|dead|deceased|passed away|passing|vouch)\b|asked about/i,
      hi: /मृत्यु|निधन|देहांत|मौत|मृतक|स्वर्गवास|गुज़र|गुजर/,
    }
    for (const locale of ['en', 'hi'] as const) {
      const catalog = getCatalog(locale, NS) as Record<string, unknown>
      for (const [key, value] of Object.entries(catalog)) {
        if (typeof value !== 'string') continue
        expect(value, `${locale}:${key}`).not.toMatch(death[locale])
      }
      for (const removed of ['form.why', 'request.consequence', 'request.consequence_no_name']) {
        expect(Object.keys(catalog), `${locale}:${removed}`).not.toContain(removed)
      }
    }
  })

  it('is registered and member-facing', () => {
    expect(KNOWN_NAMESPACES).toContain(NS);
    expect(getCatalog('en', NS)).toBeDefined();
    expect(getCatalog('hi', NS)).toBeDefined();
    expect(classifyNamespace(NS)).toBe('member-facing');
  });

  it('every key resolves in en AND hi with its parameters — ⛔ a stray brace, ⛔ an empty string', () => {
    const keys = Object.keys(getCatalog('en', NS)!).filter((k) => !k.startsWith('$comment'));
    expect(keys.length).toBeGreaterThan(50);
    expect(Object.keys(getCatalog('hi', NS)!).filter((k) => !k.startsWith('$comment')).sort()).toEqual([...keys].sort());
    for (const locale of ['en', 'hi'] as const) {
      for (const key of keys) {
        const out = t(key, PARAMS[key], { locale, namespace: NS });
        expect(out.trim(), `${locale}:${key}`).not.toBe('');
        expect(out, `${locale}:${key}`).not.toMatch(/[{}]/);
      }
    }
  });

  it('every parameterised key THROWS without its parameter', () => {
    for (const key of Object.keys(PARAMS)) expect(() => t(key, undefined, { locale: 'en', namespace: NS })).toThrow();
  });

  it('the story\'s English, verbatim (NE6 / AC5 — FINAL)', () => {
    const en = (key: string) => t(key, PARAMS[key], { locale: 'en', namespace: NS });
    expect(en('form.find')).toBe('Is this nominee a TWT member? Find them in your contacts');
    expect(en('request.question')).toBe('Asha D. has named you as their nominee in TWT and marked you as a member. Is that you?');
    expect(en('request.will_see')).toBe('Asha D. will see your answer.');
    expect(en('request.yes')).toBe("Yes, that's me");
    expect(en('request.no')).toBe("No, that's not me");
    expect(en('label.asked')).toBe('Waiting for their answer'); // ⛔ "Asked" — it begged "asked what?"
    expect(en('label.confirmed')).toBe('Confirmed — Meena K.');
    expect(en('label.not_me')).toBe('Said it is not them');
    expect(en('label.not_me_note')).toBe('The mark still counts until you remove it or pick again.');
    expect(en('edit.question')).toBe('Is this still Meena K.?');
    expect(en('edit.keep')).toBe('Keep the mark');
    expect(en('edit.remove')).toBe('Remove it');
    expect(en('form.remove')).toBe('Remove mark');
    expect(en('find.no_matches')).toBe('None of your contacts is a member — the number you gave above is still checked.');
  });

  it('the entry disclosure does ⛔ say "nobody is told" of a flow in which the marked member IS told (`-396` Q2 A; code review 2026-10-24)', () => {
    for (const locale of ['en', 'hi'] as const) {
      for (const key of ['note.body', 'note.body_no_name']) {
        const out = t(key, key === 'note.body' ? PARAMS['note.body'] : undefined, { locale, namespace: NS });
        // the check itself tells nobody …
        expect(out, `${locale}:${key}`).toMatch(locale === 'en' ? /nobody is told that you checked/ : /आपने जाँच की है यह किसी को नहीं बताया जाता/);
        // … and the flow's consequence is said in the same breath: they are asked in the app and see the declarer's name
        expect(out, `${locale}:${key}`).toMatch(locale === 'en' ? /they will see your name and be asked in the app to confirm that it is them/ : /वे आपका नाम देखेंगे और ऐप में उनसे पुष्टि करने के लिए कहा जाएगा कि यह वही हैं/);
        expect(out, `${locale}:${key}`).not.toMatch(locale === 'en' ? /nobody is told\.$/ : /किसी को बताया नहीं जाता।$/);
      }
    }
    // the declarer is told BEFORE saving, per mark, and the marked member is told what a "yes" shows
    // … and says so honestly for a member who has ALREADY answered THIS mark (a carry — nobody is asked again), ⛔ more: a member
    // whose earlier mark ENDED is asked again, so the line must not promise "unless they have already answered" in general
    expect(t('form.will_ask', PARAMS['form.will_ask'], { locale: 'en', namespace: NS })).toBe(
      'When you save, Meena K. will see your name in the app and be asked to confirm it is them. A member who has already answered this same mark is not asked to confirm again.',
    );
    expect(t('form.will_ask_no_name', undefined, { locale: 'en', namespace: NS })).toContain('A member who has already answered this same mark is not asked to confirm again.');
    // Hindi carries the SAME qualifier (a clause that names "this same mark" — ⛔ the old blanket "if they have answered before")
    for (const key of ['form.will_ask', 'form.will_ask_no_name']) {
      const hi = t(key, key === 'form.will_ask' ? PARAMS['form.will_ask'] : undefined, { locale: 'hi', namespace: NS });
      expect(hi, key).toContain('इसी चिह्न का जवाब पहले दे दिया है');
      expect(hi, key).not.toContain('अगर वे पहले जवाब नहीं दे चुके हैं');
    }
    // the entry note says the act the flow performs: the NOMINEE is marked as a member (⛔ "mark someone as your nominee")
    expect(t('note.body', PARAMS['note.body'], { locale: 'en', namespace: NS })).toContain('If you then mark your nominee as a member, they will see your name and be asked in the app to confirm that it is them.');
    expect(t('note.body_no_name', undefined, { locale: 'en', namespace: NS })).not.toContain('mark someone as your nominee')
    expect(t('note.body_no_name', undefined, { locale: 'en', namespace: NS })).toContain('If you then mark your nominee as a member, they will see your name and be asked in the app to confirm that it is them.')
    // Hindi names the same act (the NOMINEE is marked as a member), ⛔ "mark someone as your nominee"
    for (const key of ['note.body', 'note.body_no_name']) {
      const hi = t(key, key === 'note.body' ? PARAMS['note.body'] : undefined, { locale: 'hi', namespace: NS })
      expect(hi, key).toContain('अपने नामित व्यक्ति को सदस्य के रूप में चिह्नित करते हैं')
      expect(hi, key).not.toContain('किसी को अपना नामित व्यक्ति चिह्नित करते हैं')
    }
    // the answers screen's "changed" line says the reload is UNDER WAY (the row's own line is `request.closed`)
    expect(t('request.changed', undefined, { locale: 'en', namespace: NS })).toBe('This request has changed. The list is being reloaded.')
    expect(t('request.changed', undefined, { locale: 'hi', namespace: NS })).toBe('यह अनुरोध बदल गया है। सूची फिर से लोड की जा रही है।');
    expect(t('request.name_note', undefined, { locale: 'en', namespace: NS })).toBe('If you say yes, they will also see your name as the Trust has it.');
  });

  it('the empty state names the right act (named as a nominee AND marked as a member) — ⛔ "marked you as a member" alone', () => {
    expect(t('request.empty', undefined, { locale: 'en', namespace: NS })).toBe('No member has named you as a nominee and marked you as a member.');
  });

  it('a single contact reads in the singular (`find.matches_count_one` — ⛔ "1 of your contacts are members")', () => {
    expect(t('find.matches_count_one', undefined, { locale: 'en', namespace: NS })).toBe('1 of your contacts is a TWT member.');
    expect(t('find.matches_count', { count: 2 }, { locale: 'en', namespace: NS })).toBe('2 of your contacts are TWT members.');
    // BigDev's Hindi review (2026-10-24): "TWT के सदस्य" — the contact is a member of TWT, ⛔ just "a member"
    expect(t('find.matches_count_one', undefined, { locale: 'hi', namespace: NS })).toBe('आपका 1 संपर्क TWT का सदस्य है।');
    expect(t('find.matches_count', { count: 2 }, { locale: 'hi', namespace: NS })).toBe('आपके 2 संपर्क TWT के सदस्य हैं।');
  });

  it('WCAG 2.5.3 — the pick button\'s accessible name BEGINS with its visible text (the saved name)', () => {
    for (const locale of ['en', 'hi'] as const) expect(t('find.pick_a11y', { name: 'Meena K.' }, { locale, namespace: NS }).startsWith('Meena K.')).toBe(true);
  });

  it('⛔ the Trust\'s name is written in the copy — it is a parameter; the find notice names ITS purpose (⛔ 6.36b\'s colleagues)', () => {
    for (const locale of ['en', 'hi'] as const) {
      const json = JSON.stringify(getCatalog(locale, NS));
      expect(json).toContain('{trust_name}');
      expect(json).not.toMatch(/Welfare Trust|Shikshak Parivar|शिक्षक परिवार/);
    }
    expect(t('note.body', PARAMS['note.body'], { locale: 'en', namespace: NS })).toContain('to check whether your nominee is a TWT member'.replace(/^to/, 'To'));
    expect(t('note.body', PARAMS['note.body'], { locale: 'en', namespace: NS })).not.toMatch(/colleague/i);
  });
});
