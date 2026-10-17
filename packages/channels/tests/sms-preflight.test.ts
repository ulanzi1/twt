// The MSG91 template pre-flight + its process memo — Story 6.37 (AC7; MG5). DB-FREE; a fake template reader or a fake
// `fetch` — ⛔ a network call (I7, T1). Response shapes are MSG91's documented `getTemplateVersions` ones
// (https://docs.msg91.com/sms/module.json — the body's `data[]`; F16).

import { describe, expect, it, vi } from 'vitest';

import {
  checkMsg91Template,
  createMsg91PreflightMemo,
  createSmsAppClient,
  DLT_VAR,
  type DltSlot,
  type Msg91PreflightEntry,
  type Msg91PreflightObservation,
  type Msg91PreflightResult,
  type Msg91TemplateRead,
  type Msg91TemplateReader,
  type Msg91TemplateVersion,
  type SmsFetchLike,
  type SmsFetchResponse,
} from '../src/index.js';

const ID = '64b0c0ffee0123456789abcd';
const cbn: DltSlot = { name: 'helpline', type: 'cbn', maxLength: 14, label: 'helpline' };
const ref: DltSlot = { name: 'reference', type: 'alphanumeric', maxLength: 8, label: 'reference' };
const GSM: Msg91PreflightEntry = { text: `Claim ${DLT_VAR}: please call the helpline on ${DLT_VAR}.`, slots: [ref, cbn] };
const GSM_FORM = 'Claim ##reference##: please call the helpline on ##helpline##.';
/** Template 14's shape — English, but the em dash makes it Unicode (T11). */
const DASH: Msg91PreflightEntry = { text: `Answer here: ${DLT_VAR} — or call ${DLT_VAR}.`, slots: [ref, cbn] };
const DASH_FORM = 'Answer here: ##reference## — or call ##helpline##.';
const HINDI: Msg91PreflightEntry = { text: `दावा ${DLT_VAR}: हेल्पलाइन ${DLT_VAR} पर कॉल करें।`, slots: [ref, cbn] };
const HINDI_FORM = 'दावा ##reference##: हेल्पलाइन ##helpline## पर कॉल करें।';

function version(over: Partial<Msg91TemplateVersion> = {}): Msg91TemplateVersion {
  return {
    templateData: GSM_FORM,
    dltId: '1107161234567890123',
    senderId: 'TWTPLT',
    status: '1',
    activeStatus: '1',
    smsType: 'NORMAL',
    dltVerified: '10',
    dltReason: null,
    rejectReason: null,
    ...over,
  };
}

function reader(read: Msg91TemplateRead): Msg91TemplateReader & { calls: number } {
  const r = {
    calls: 0,
    readTemplateVersions() {
      r.calls += 1;
      return Promise.resolve(read);
    },
  };
  return r;
}

const versions = (...v: Msg91TemplateVersion[]): Msg91TemplateRead => ({ kind: 'versions', versions: v });

describe('checkMsg91Template (6.37 AC7; MG5)', () => {
  it('⭐ the ACTIVE version matching the gateway form + NORMAL for a GSM-7 text + a DLT id ⇒ pass', async () => {
    expect(await checkMsg91Template(reader(versions(version())), GSM, ID)).toEqual({ ok: true, notes: [] });
  });

  it('passes a CRLF variant of a two-line text, and trailing spaces / a trailing newline', async () => {
    const twoLine = { ...GSM, text: GSM.text.replace(': ', ':\n') };
    const crlf = GSM_FORM.replace(': ', ':\r\n');
    expect((await checkMsg91Template(reader(versions(version({ templateData: crlf }))), twoLine, ID)).ok).toBe(true);
    for (const data of [`${GSM_FORM}   `, `${GSM_FORM}\n`]) {
      expect((await checkMsg91Template(reader(versions(version({ templateData: data }))), GSM, ID)).ok).toBe(true);
    }
  });

  it('passes a decomposed variant of a Hindi text (NFC on both sides)', async () => {
    // Round 2 P8 — a code point that DOES decompose: क़ (U+0958) vs क + ़ (U+0915 U+093C). The raw strings differ, so
    // the leg is red if `canonical()` drops its NFC.
    const nukta: Msg91PreflightEntry = { text: `\u0958लेम ${DLT_VAR}: हेल्पलाइन ${DLT_VAR} पर कॉल करें।`, slots: [ref, cbn] };
    const stored = '\u0915\u093Cलेम ##reference##: हेल्पलाइन ##helpline## पर कॉल करें।';
    expect(stored).not.toBe(nukta.text.replace(DLT_VAR, '##reference##').replace(DLT_VAR, '##helpline##'));
    const r = reader(versions(version({ templateData: stored, smsType: 'UNICODE' })));
    expect(await checkMsg91Template(r, nukta, ID)).toEqual({ ok: true, notes: [] });
    expect(await checkMsg91Template(reader(versions(version({ templateData: HINDI_FORM, smsType: 'UNICODE' }))), HINDI, ID)).toEqual({
      ok: true,
      notes: [],
    });
  });

  it('⭐ round 2 P4 — MORE than one active version: EVERY one must pass (⛔ "any one matches"); the log carries every version', async () => {
    const log = vi.fn<(o: Msg91PreflightObservation) => void>();
    const twoActive = versions(version(), version({ templateData: 'Claim ##reference##: other words ##helpline##.' }));
    expect(await checkMsg91Template(reader(twoActive), GSM, ID, { log })).toEqual({ ok: false, transient: false, reason: 'content_mismatch' });
    expect(await checkMsg91Template(reader(versions(version(), version({ dltId: '' }))), GSM, ID)).toMatchObject({ reason: 'dlt_id_missing' });
    expect(await checkMsg91Template(reader(versions(version(), version())), GSM, ID)).toEqual({ ok: true, notes: [] });
    // a PASS logs EVERY version MSG91 returned (MG5 — other versions are LOGGED), with the true count
    const passLog = vi.fn<(o: Msg91PreflightObservation) => void>();
    await checkMsg91Template(reader(versions(version({ activeStatus: '0', rejectReason: 'old' }), version())), GSM, ID, { log: passLog });
    expect(passLog.mock.calls[0]![0]).toMatchObject({ result: 'pass', versions: 2 });
    expect(passLog.mock.calls[0]![0].checked.map((c) => c.rejectReason)).toEqual(['old', null]);
  });

  it('⭐ T11 — template 14\'s shape (English + an em dash) expects UNICODE; a GSM-7 English text expects NORMAL', async () => {
    expect(await checkMsg91Template(reader(versions(version({ templateData: DASH_FORM, smsType: 'UNICODE' }))), DASH, ID)).toEqual({
      ok: true,
      notes: [],
    });
    expect(await checkMsg91Template(reader(versions(version({ templateData: DASH_FORM, smsType: 'NORMAL' }))), DASH, ID)).toEqual({
      ok: false,
      transient: false,
      reason: 'sms_type_needs_unicode',
    });
    expect(await checkMsg91Template(reader(versions(version({ templateData: HINDI_FORM, smsType: 'NORMAL' }))), HINDI, ID)).toMatchObject({
      reason: 'sms_type_needs_unicode',
    });
  });

  it('a GSM-7 text on a UNICODE template ⇒ PASS with `sms_type_unicode_for_gsm7` logged (⛔ a fault)', async () => {
    const log = vi.fn<(o: Msg91PreflightObservation) => void>();
    const r = await checkMsg91Template(reader(versions(version({ smsType: 'UNICODE' }))), GSM, ID, { log });
    expect(r).toEqual({ ok: true, notes: ['sms_type_unicode_for_gsm7'] });
    expect(log.mock.calls[0]![0]).toMatchObject({ result: 'pass', notes: ['sms_type_unicode_for_gsm7'] });
  });

  it.each<[string, Msg91TemplateRead, string]>([
    ['HTTP 401', { kind: 'unauthorised' }, 'auth'],
    ['HTTP 200 status:"error"', { kind: 'refused' }, 'auth_or_not_found'],
    ['⛔ version', versions(), 'content_mismatch'],
    ['a different text', versions(version({ templateData: 'Claim ##reference##: call ##helpline## now.' })), 'content_mismatch'],
    ['the old variable form', versions(version({ templateData: GSM.text })), 'content_mismatch'],
    ['a matching INACTIVE version only', versions(version({ activeStatus: '0' }), version({ activeStatus: '1', templateData: 'x' })), 'content_mismatch'],
    ['a blank DLT_ID', versions(version({ dltId: '  ' })), 'dlt_id_missing'],
    ['⛔ DLT_ID', versions(version({ dltId: null })), 'dlt_id_missing'],
  ])('%s ⇒ %s', async (_l, read, reason) => {
    expect(await checkMsg91Template(reader(read), GSM, ID)).toEqual({ ok: false, transient: false, reason });
  });

  it('a malformed id ⇒ template_id_malformed and ⛔ call made', async () => {
    const r = reader(versions(version()));
    for (const id of ['TPL-1', '1107161234567890123', '']) {
      expect(await checkMsg91Template(r, GSM, id)).toEqual({ ok: false, transient: false, reason: 'template_id_malformed' });
    }
    expect(r.calls).toBe(0);
  });

  it.each(['network', 'timeout', 'throttled', 'server', 'unparseable', 'unexpected_status', 'unexpected_body', 'config'] as const)(
    'an unavailable read (%s) ⇒ transient, the cause carried to the result AND the log (round 2 P5)',
    async (cause) => {
      const log = vi.fn<(o: Msg91PreflightObservation) => void>();
      expect(await checkMsg91Template(reader({ kind: 'unavailable', cause }), GSM, ID, { log })).toEqual({
        ok: false,
        transient: true,
        reason: 'transient',
        cause,
      });
      expect(log.mock.calls[0]![0]).toMatchObject({ result: 'transient', cause });
    },
  );

  it('`status` / `dlt_verified` / `dlt_reason` / `reject_reason` ⛔ change the result — logged only (dlt_verified "10" AND 0)', async () => {
    for (const over of [
      { status: '0', dltVerified: '10' },
      { status: '2', dltVerified: '0', dltReason: 'pending', rejectReason: 'some reason' },
    ]) {
      const log = vi.fn<(o: Msg91PreflightObservation) => void>();
      expect(await checkMsg91Template(reader(versions(version(over))), GSM, ID, { log })).toEqual({ ok: true, notes: [] });
      expect(log.mock.calls[0]![0].checked[0]).toMatchObject({ status: over.status, dltVerified: over.dltVerified });
    }
  });

  it('⭐ I6 — the observation carries ⛔ the template text and ⛔ the authkey', async () => {
    const log = vi.fn<(o: Msg91PreflightObservation) => void>();
    await checkMsg91Template(reader(versions(version({ templateData: 'mismatching text' }))), GSM, ID, { log });
    const line = JSON.stringify(log.mock.calls);
    expect(line).not.toContain('mismatching text');
    expect(line).not.toContain('##reference##');
    expect(line).toContain('TWTPLT');
  });
});

/** A response with the given status and JSON body. */
function respond(status: number, body: unknown): SmsFetchResponse {
  return { ok: status >= 200 && status < 300, status, json: () => Promise.resolve(body) };
}

describe('readTemplateVersions — the MSG91 template read (6.37 MG5; F16)', () => {
  const config = { apiOrigin: 'https://control.msg91.com', authkey: 'k' };

  it('POSTs <origin>/api/v5/sms/getTemplateVersions {template_id} with the authkey; reads `data[]` type-tolerantly', async () => {
    const fetchImpl = vi.fn<SmsFetchLike>().mockResolvedValue(
      respond(200, {
        status: 'success',
        hasError: false,
        data: [
          {
            template_data: GSM_FORM,
            DLT_ID: 1107161234567890,
            sender_id: 'TWTPLT',
            status: '1',
            active_status: 1,
            sms_type: 'NORMAL',
            dlt_verified: 0,
          },
        ],
      }),
    );
    const read = await createSmsAppClient(config, fetchImpl).readTemplateVersions(ID);
    const [url, init] = fetchImpl.mock.calls[0]!;
    expect(url).toBe('https://control.msg91.com/api/v5/sms/getTemplateVersions');
    expect(init.headers['authkey']).toBe('k');
    expect(JSON.parse(init.body)).toEqual({ template_id: ID });
    expect(read).toEqual({
      kind: 'versions',
      versions: [
        {
          templateData: GSM_FORM,
          dltId: '1107161234567890',
          senderId: 'TWTPLT',
          status: '1',
          activeStatus: '1',
          smsType: 'NORMAL',
          dltVerified: '0',
          dltReason: null,
          rejectReason: null,
        },
      ],
    });
  });

  it.each<[string, () => Promise<SmsFetchResponse>, Msg91TemplateRead['kind']]>([
    ['HTTP 401 {status:"fail"}', () => Promise.resolve(respond(401, { status: 'fail', hasError: true, errors: 'Unauthorized', code: '401' })), 'unauthorised'],
    [
      'HTTP 200 {status:"error"} (a bad key OR an unknown id)',
      () => Promise.resolve(respond(200, { status: 'error', hasError: true, errors: 'Template content type could not be fetched' })),
      'refused',
    ],
    // Review F2 — only the DOCUMENTED refusals (HTTP 401; HTTP 200 status:"error") are definite; any other non-2xx — a
    // proxy's 404, a 405, a 408, an undocumented 403 — proves nothing about the send ⇒ unavailable.
    ['HTTP 404', () => Promise.resolve(respond(404, {})), 'unavailable'],
    ['HTTP 403', () => Promise.resolve(respond(403, {})), 'unavailable'],
    ['HTTP 405', () => Promise.resolve(respond(405, {})), 'unavailable'],
    ['HTTP 408', () => Promise.resolve(respond(408, {})), 'unavailable'],
    ['HTTP 400 {status:"error"}', () => Promise.resolve(respond(400, { status: 'error', hasError: true })), 'unavailable'],
    ['HTTP 429', () => Promise.resolve(respond(429, {})), 'unavailable'],
    ['HTTP 503', () => Promise.resolve(respond(503, {})), 'unavailable'],
    ['a network throw', () => Promise.reject(new Error('ECONNRESET')), 'unavailable'],
    ['a 200 with ⛔ data[]', () => Promise.resolve(respond(200, { status: 'success' })), 'unavailable'],
    // Round 2 P1 — only the DOCUMENTED 200 body is a refusal: `status:"fail"` is documented on the 401 only, and a bare
    // `hasError` is ⛔ documented at all ⇒ unavailable (⛔ auth_or_not_found — which refuses api boot and ends 6.19b/c/d rows).
    ['HTTP 200 {status:"fail"}', () => Promise.resolve(respond(200, { status: 'fail', hasError: true, errors: 'Unauthorized' })), 'unavailable'],
    ['HTTP 200 {hasError:true} only', () => Promise.resolve(respond(200, { hasError: true, data: [] })), 'unavailable'],
    ['HTTP 200 {hasError:"true"} only', () => Promise.resolve(respond(200, { hasError: 'true' })), 'unavailable'],
    ['HTTP 200 {status:"error"} with ⛔ errors text', () => Promise.resolve(respond(200, { status: 'error' })), 'refused'],
  ])('%s ⇒ %s', async (_l, answer, kind) => {
    const read = await createSmsAppClient(config, vi.fn<SmsFetchLike>(answer)).readTemplateVersions(ID);
    expect(read.kind).toBe(kind);
  });

  it('an abort of the bound ⇒ unavailable (timeout)', async () => {
    const controller = new AbortController();
    const fetchImpl = vi.fn<SmsFetchLike>(() => {
      controller.abort();
      return Promise.reject(new Error('aborted'));
    });
    const read = await createSmsAppClient(config, fetchImpl, { timeoutSignal: () => controller.signal }).readTemplateVersions(ID);
    expect(read).toEqual({ kind: 'unavailable', cause: 'timeout' });
  });

  it('F2 — an unexplained non-2xx is unavailable (`unexpected_status`), and the pre-flight calls it a TRANSIENT, ⛔ auth_or_not_found', async () => {
    const client = createSmsAppClient(config, vi.fn<SmsFetchLike>().mockResolvedValue(respond(404, {})));
    expect(await client.readTemplateVersions(ID)).toEqual({ kind: 'unavailable', cause: 'unexpected_status' });
    expect(await checkMsg91Template(client, GSM, ID)).toEqual({ ok: false, transient: true, reason: 'transient', cause: 'unexpected_status' });
  });

  it('round 2 P1 — a 200 `status:"fail"` body is `unexpected_body`, and the pre-flight calls it a TRANSIENT, ⛔ auth_or_not_found', async () => {
    const client = createSmsAppClient(config, vi.fn<SmsFetchLike>().mockResolvedValue(respond(200, { status: 'fail', hasError: true })));
    expect(await client.readTemplateVersions(ID)).toEqual({ kind: 'unavailable', cause: 'unexpected_body' });
    expect(await checkMsg91Template(client, GSM, ID)).toEqual({ ok: false, transient: true, reason: 'transient', cause: 'unexpected_body' });
  });

  it('round 2 P5 — a reader with ⛔ usable config is `unavailable` (config), ⛔ a 401: ⛔ call made', async () => {
    const fetchImpl = vi.fn<SmsFetchLike>();
    for (const bad of [{ ...config, authkey: ' ' }, { ...config, apiOrigin: 'https://control.msg91.com/send' }]) {
      expect(await createSmsAppClient(bad, fetchImpl).readTemplateVersions(ID)).toEqual({ kind: 'unavailable', cause: 'config' });
    }
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('round 2 P6 — the read ⛔ follows a redirect (the authkey header would follow it to another host)', async () => {
    const fetchImpl = vi.fn<SmsFetchLike>().mockRejectedValue(new TypeError('fetch failed: redirect mode is set to error'));
    expect(await createSmsAppClient(config, fetchImpl).readTemplateVersions(ID)).toEqual({ kind: 'unavailable', cause: 'network' });
    expect(fetchImpl.mock.calls[0]![1].redirect).toBe('error');
  });

  it('F1 — headers arrive, then the bound aborts while the body is read ⇒ unavailable (timeout), ⛔ unparseable', async () => {
    const controller = new AbortController();
    const fetchImpl = vi.fn<SmsFetchLike>().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => {
        controller.abort();
        return Promise.reject(controller.signal.reason);
      },
    });
    const read = await createSmsAppClient(config, fetchImpl, { timeoutSignal: () => controller.signal }).readTemplateVersions(ID);
    expect(read).toEqual({ kind: 'unavailable', cause: 'timeout' });
  });
});

describe('createMsg91PreflightMemo (6.37 AC7; MG5)', () => {
  const PASS: Msg91PreflightResult = { ok: true, notes: [] };
  const FAULT: Msg91PreflightResult = { ok: false, transient: false, reason: 'content_mismatch' };
  const TRANSIENT: Msg91PreflightResult = { ok: false, transient: true, reason: 'transient' };

  function memoWith(answers: Msg91PreflightResult[]) {
    let now = 1_000_000;
    const check = vi.fn(() => Promise.resolve(answers.shift() ?? TRANSIENT));
    const memo = createMsg91PreflightMemo({ check, clock: () => now, passTtlMs: 3_600_000, faultTtlMs: 300_000, transientTtlMs: 60_000 });
    return { memo, check, advance: (ms: number) => (now += ms) };
  }

  it('a PASS is reused within its TTL, then re-read', async () => {
    const { memo, check, advance } = memoWith([PASS, PASS]);
    expect(await memo.get(GSM, ID)).toEqual(PASS);
    advance(3_599_999);
    expect(await memo.get(GSM, ID)).toEqual(PASS);
    expect(check).toHaveBeenCalledTimes(1);
    advance(1);
    await memo.get(GSM, ID);
    expect(check).toHaveBeenCalledTimes(2);
  });

  it('a FAULT is reused within its SHORT TTL, then re-read', async () => {
    const { memo, check, advance } = memoWith([FAULT, PASS]);
    expect(await memo.get(GSM, ID)).toEqual(FAULT);
    advance(299_999);
    expect(await memo.get(GSM, ID)).toEqual(FAULT);
    expect(check).toHaveBeenCalledTimes(1);
    advance(1);
    expect(await memo.get(GSM, ID)).toEqual(PASS);
    expect(check).toHaveBeenCalledTimes(2);
  });

  it('⭐ `-346` decision 3 — a TRANSIENT is reused for 60 s, then re-read', async () => {
    const { memo, check, advance } = memoWith([TRANSIENT, PASS]);
    expect(await memo.get(GSM, ID)).toEqual(TRANSIENT);
    advance(59_999);
    expect(await memo.get(GSM, ID)).toEqual(TRANSIENT);
    expect(check).toHaveBeenCalledTimes(1);
    advance(1);
    expect(await memo.get(GSM, ID)).toEqual(PASS);
    expect(check).toHaveBeenCalledTimes(2);
  });

  it('⭐ on an EXPIRED pass\'s re-check, a transient answers the stale PASS for ONE more TTL only — then the transient', async () => {
    const { memo, check, advance } = memoWith([PASS, TRANSIENT, TRANSIENT, TRANSIENT]);
    await memo.get(GSM, ID);
    advance(3_600_000); // expired
    expect(await memo.get(GSM, ID)).toEqual({ ok: true, notes: [], stale: true });
    advance(59_999); // the stale answer is itself kept for the transient TTL (`-346`) — ⛔ a re-read per send
    expect(await memo.get(GSM, ID)).toEqual({ ok: true, notes: [], stale: true });
    expect(check).toHaveBeenCalledTimes(2);
    advance(3_540_000); // still inside one more TTL past expiry — re-read, still stale
    expect(await memo.get(GSM, ID)).toEqual({ ok: true, notes: [], stale: true });
    expect(check).toHaveBeenCalledTimes(3);
    advance(1); // past it — the stale answer's own expiry never outlives the window
    expect(await memo.get(GSM, ID)).toEqual(TRANSIENT);
  });

  it('a FAULT after a pass discards the stale fallback', async () => {
    const { memo, advance } = memoWith([PASS, FAULT, TRANSIENT]);
    await memo.get(GSM, ID);
    advance(3_600_000);
    expect(await memo.get(GSM, ID)).toEqual(FAULT);
    advance(300_000);
    expect(await memo.get(GSM, ID)).toEqual(TRANSIENT);
  });

  it('round 2 P7 — keys by the slot NAMES too: one id and text under two slot namings is judged for each', async () => {
    const { memo, check } = memoWith([PASS, FAULT]);
    const renamed: Msg91PreflightEntry = { ...GSM, slots: [{ ...ref, name: 'ref' }, cbn] };
    expect(await memo.get(GSM, ID)).toEqual(PASS);
    expect(await memo.get(renamed, ID)).toEqual(FAULT);
    expect(check).toHaveBeenCalledTimes(2);
  });

  it('⭐ N concurrent misses ⇒ ONE call (counted), every caller the same verdict', async () => {
    let release: (r: Msg91PreflightResult) => void = () => undefined;
    const check = vi.fn(() => new Promise<Msg91PreflightResult>((resolve) => (release = resolve)));
    const memo = createMsg91PreflightMemo({ check, clock: () => 0, passTtlMs: 10, faultTtlMs: 5, transientTtlMs: 1 });
    const all = Promise.all(Array.from({ length: 25 }, () => memo.get(GSM, ID)));
    release(PASS);
    expect(await all).toEqual(Array.from({ length: 25 }, () => PASS));
    expect(check).toHaveBeenCalledTimes(1);
  });

  it('keys by id AND text — one id held under two templates is judged for each', async () => {
    const { memo, check } = memoWith([PASS, FAULT]);
    expect(await memo.get(GSM, ID)).toEqual(PASS);
    expect(await memo.get(DASH, ID)).toEqual(FAULT);
    expect(check).toHaveBeenCalledTimes(2);
  });

  it('a check that throws is a transient (⛔ an escape), kept for the transient TTL only', async () => {
    let now = 0;
    const check = vi.fn().mockRejectedValueOnce(new Error('bug')).mockResolvedValueOnce(PASS);
    const memo = createMsg91PreflightMemo({ check, clock: () => now, passTtlMs: 10, faultTtlMs: 5, transientTtlMs: 1 });
    expect(await memo.get(GSM, ID)).toEqual({ ...TRANSIENT, cause: 'check_threw' });
    now += 1;
    expect(await memo.get(GSM, ID)).toEqual(PASS);
  });
});
