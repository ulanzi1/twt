// The WhatsApp CODE's message shape — Story 5.13 (Task 3; AC7; WC1, WC4). DB-free; a fake `fetch` (⛔ network).
//   · `{ authenticationCode }` builds Meta's AUTHENTICATION (copy-code) template body EXACTLY: the code as the body's `{{1}}` AND as
//     the button parameter (`sub_type: 'url'`, `index: '0'`).
//   · a blank, non-string or > 15-character code throws `WhatsappTemplateParamError` BEFORE fetch (⛔ a call), its message ⛔ the code.
//   · the two existing shapes (`bodyParam`, `bodyParams`) are BYTE-unchanged (their whole request body pinned as a string).
//   · `waTemplateConfigKey` / `TEMPLATE_NAME_FORM` — moved here (WC4), the new `wa_opt_in.code` purpose.

import { describe, expect, it } from 'vitest';

import {
  assertWhatsappAuthenticationCode,
  createWhatsappAppCache,
  TEMPLATE_NAME_FORM,
  waTemplateConfigKey,
  WhatsappSendError,
  WhatsappTemplateParamError,
  WHATSAPP_MAX_AUTHENTICATION_CODE_LENGTH,
  type FetchInit,
  type FetchLike,
} from '../src/index.js';

const CONFIG = { phoneNumberId: '123456', accessToken: 'sys-user-token', graphApiVersion: 'v21.0' };
const BASE = { to: '919999999999', templateName: 'wa_opt_in_code_hi', languageCode: 'hi' };

function recorder(): { fetchImpl: FetchLike; calls: { url: string; init: FetchInit }[] } {
  const calls: { url: string; init: FetchInit }[] = [];
  const fetchImpl: FetchLike = (url, init) => {
    calls.push({ url, init });
    return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ messages: [{ id: 'wamid.CODE' }] }) });
  };
  return { fetchImpl, calls };
}

describe('AC7 — the authentication-template request', () => {
  it('`{ authenticationCode }` builds EXACTLY the copy-code template body (body {{1}} + the url button parameter, both the code)', async () => {
    const { fetchImpl, calls } = recorder();
    const handle = createWhatsappAppCache(fetchImpl).messagingFor('pariwar-a', CONFIG);
    expect(await handle.send({ ...BASE, authenticationCode: '482913' }, { timeoutMs: 10_000 })).toBe('wamid.CODE');
    expect(calls).toHaveLength(1);
    expect(calls[0]!.url).toBe('https://graph.facebook.com/v21.0/123456/messages');
    expect(JSON.parse(calls[0]!.init.body)).toEqual({
      messaging_product: 'whatsapp',
      to: '919999999999',
      type: 'template',
      template: {
        name: 'wa_opt_in_code_hi',
        language: { code: 'hi' },
        components: [
          { type: 'body', parameters: [{ type: 'text', text: '482913' }] },
          { type: 'button', sub_type: 'url', index: '0', parameters: [{ type: 'text', text: '482913' }] },
        ],
      },
    });
  });

  it('a blank, non-string or over-long code throws `WhatsappTemplateParamError` BEFORE fetch — ⛔ a call, ⛔ the code in the message', async () => {
    const { fetchImpl, calls } = recorder();
    const handle = createWhatsappAppCache(fetchImpl).messagingFor('pariwar-a', CONFIG);
    for (const code of ['', '   ', '1'.repeat(WHATSAPP_MAX_AUTHENTICATION_CODE_LENGTH + 1)]) {
      const err = await handle.send({ ...BASE, authenticationCode: code }).catch((e: unknown) => e);
      expect(err).toBeInstanceOf(WhatsappTemplateParamError);
      expect(err).not.toBeInstanceOf(WhatsappSendError);
    }
    const leaked = (await handle.send({ ...BASE, authenticationCode: '9876543210987654' }).catch((e: unknown) => e)) as Error;
    expect(leaked.message).not.toContain('9876543210987654');
    expect(calls).toHaveLength(0);
    expect(() => assertWhatsappAuthenticationCode(482913)).toThrow(WhatsappTemplateParamError);
    expect(() => assertWhatsappAuthenticationCode('1'.repeat(WHATSAPP_MAX_AUTHENTICATION_CODE_LENGTH))).not.toThrow();
  });

  it('the two existing shapes are BYTE-unchanged (the whole request body, as a string)', async () => {
    const { fetchImpl, calls } = recorder();
    const handle = createWhatsappAppCache(fetchImpl).messagingFor('pariwar-a', CONFIG);
    await handle.send({ to: '919999999999', templateName: 't_en', languageCode: 'en', bodyParam: 'hello' });
    await handle.send({ to: '919999999999', templateName: 't_en', languageCode: 'en', bodyParams: ['a', 'b'] });
    expect(calls.map((c) => c.init.body)).toEqual([
      '{"messaging_product":"whatsapp","to":"919999999999","type":"template","template":{"name":"t_en","language":{"code":"en"},"components":[{"type":"body","parameters":[{"type":"text","text":"hello"}]}]}}',
      '{"messaging_product":"whatsapp","to":"919999999999","type":"template","template":{"name":"t_en","language":{"code":"en"},"components":[{"type":"body","parameters":[{"type":"text","text":"a"},{"type":"text","text":"b"}]}]}}',
    ]);
  });
});

describe('WC4 — the template-name key family (moved to @twt/channels)', () => {
  it('`wa_opt_in.code` keys by purpose, locale and the lower-cased Pariwar id; the name form is the ONE regex', () => {
    expect(waTemplateConfigKey('wa_opt_in.code', 'hi', 'AAAA1111-2222-3333-4444-555566667777')).toBe(
      'wa.template.wa_opt_in.code.hi.aaaa1111-2222-3333-4444-555566667777',
    );
    expect(waTemplateConfigKey('wa_opt_in.code', 'en', 'p')).toBe('wa.template.wa_opt_in.code.en.p');
    expect(TEMPLATE_NAME_FORM.test('wa_opt_in_code_hi')).toBe(true);
    expect(TEMPLATE_NAME_FORM.test('test-secret::wa.template.wa_opt_in.code.hi.p')).toBe(false);
  });
});
