// The MSG91 template PRE-FLIGHT — Story 6.37 (MG5, MG17; AC7; `2026-10-17-345`; ADR-0041).
//
// ⭐ Why it exists (F9): MSG91 answers a Flow send HTTP 200 `"type":"success"` even for a FAKE authkey — its errors
// arrive asynchronously. So a send's `success` proves ⛔ the account or the template, and a broken template would be
// recorded `accepted` and never arrive. The pre-flight READS each template the process will use from MSG91
// (`getTemplateVersions`) before a text is spent on it, and says whether it is usable.
//
// What it checks — the version marked default (`active_status` "1" — an INFERENCE from MSG91's "Mark default" panel
// option; Row 32 (d) records the meaning in writing):
//   · its text equals the registered text's gateway form (`##name##`), after canonicalisation (NFC, CRLF → LF,
//     trailing whitespace trimmed) — else `content_mismatch`;
//   · its `sms_type` is UNICODE when the TEXT needs it (⛔ the locale — T11) — else `sms_type_needs_unicode`; a GSM-7
//     text on a UNICODE template still delivers ⇒ a PASS carrying the logged note `sms_type_unicode_for_gsm7`;
//   · its `DLT_ID` is non-blank — else `dlt_id_missing`.
// An HTTP 401 ⇒ `auth`; MSG91's 200 `status:"error"` (a bad key and an unknown id look the same — F16) ⇒
// `auth_or_not_found`; a malformed id ⇒ `template_id_malformed` (⛔ call made); a network / timeout / 429 / 5xx — or any
// OTHER non-2xx (⛔ a documented refusal, so ⛔ proof about a send — review F2) ⇒ a TRANSIENT. `status` / `dlt_verified` / `dlt_reason` / `reject_reason` / `sender_id` are LOGGED, ⛔ gating.
// ⚠ It reads TEMPLATES: a send-side ACCOUNT fault (zero balance, SMS not enabled for the key, an unwhitelisted IP) is
// ⛔ visible to it (MG15).
//
// What a result MEANS on each path is the caller's (MG5): the suspicion / peer-mesh sweeps HOLD on any fault; the
// correction / closure / certificate paths end a row only on a PROVEN one and fail OPEN otherwise; the api refuses to
// start only on `auth*` / malformed. This file only reads and remembers.
//
// ── The memo ─────────────────────────────────────────────────────────────────────────────────────────────────
// Every jobs send runs in a pg-boss CHILD, so ONE process-level memo: concurrent misses share ONE call; a PASS is kept
// for `passTtlMs`, a definite FAULT for `faultTtlMs`; a TRANSIENT is ⛔ kept — on the re-check of an EXPIRED pass it
// answers that stale PASS for at most ONE more pass TTL (then the transient itself).
//
// ⛔ The authkey, ⛔ the template's text, ⛔ a recipient in any log line (I6).

import { needsUnicode, toGatewayTemplate, type DltSlot } from '../dlt-variables.js';
import { isMsg91TemplateId, type Msg91TemplateReader, type Msg91TemplateVersion } from './sms-app.js';

/** One registered template, as its registry declares it — the text with its markers, and its slots. */
export interface Msg91PreflightEntry {
  readonly text: string;
  readonly slots: readonly DltSlot[];
}

/** Why a template is ⛔ usable (MG5). */
export type Msg91PreflightFault =
  | 'auth'
  | 'auth_or_not_found'
  | 'content_mismatch'
  | 'sms_type_needs_unicode'
  | 'dlt_id_missing'
  | 'template_id_malformed';

/** An observation on a PASS — logged, ⛔ a fault anywhere. */
export type Msg91PreflightNote = 'sms_type_unicode_for_gsm7';

/** What the pre-flight found. */
export type Msg91PreflightResult =
  | { readonly ok: true; readonly notes: readonly Msg91PreflightNote[]; readonly stale?: boolean }
  | { readonly ok: false; readonly transient: false; readonly reason: Msg91PreflightFault }
  | { readonly ok: false; readonly transient: true; readonly reason: 'transient' };

/** The informational fields of the version checked (or of every version, when none matched) — ⛔ its text. */
export interface Msg91PreflightObservation {
  readonly result: 'pass' | Msg91PreflightFault | 'transient';
  readonly versions: number;
  readonly notes: readonly Msg91PreflightNote[];
  readonly checked: ReadonlyArray<
    Pick<Msg91TemplateVersion, 'activeStatus' | 'senderId' | 'status' | 'smsType' | 'dltVerified' | 'dltReason' | 'rejectReason'>
  >;
}

export interface Msg91PreflightOptions {
  /** Receives one observation per check — ⛔ the authkey, ⛔ the text (I6). */
  readonly log?: (observation: Msg91PreflightObservation) => void;
}

/** The canonical form both texts are compared in (MG5). */
function canonical(text: string): string {
  return text
    .normalize('NFC')
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+$/gm, '')
    .replace(/\s+$/u, '');
}

/** `"1"` / `1` / ` 1 ` alike (F16 — MSG91 writes some fields as strings, others as numbers). */
function isOne(v: string | null): boolean {
  return v !== null && v.trim() === '1';
}

function observed(v: Msg91TemplateVersion): Msg91PreflightObservation['checked'][number] {
  return {
    activeStatus: v.activeStatus,
    senderId: v.senderId,
    status: v.status,
    smsType: v.smsType,
    dltVerified: v.dltVerified,
    dltReason: v.dltReason,
    rejectReason: v.rejectReason,
  };
}

/** Read one template from MSG91 and judge it against the registered text (MG5). Never throws. */
export async function checkMsg91Template(
  reader: Msg91TemplateReader,
  entry: Msg91PreflightEntry,
  templateId: string,
  options: Msg91PreflightOptions = {},
): Promise<Msg91PreflightResult> {
  const report = (result: Msg91PreflightObservation['result'], versions: readonly Msg91TemplateVersion[], notes: readonly Msg91PreflightNote[] = []) =>
    options.log?.({ result, versions: versions.length, notes, checked: versions.map(observed) });

  if (!isMsg91TemplateId(templateId)) {
    report('template_id_malformed', []);
    return { ok: false, transient: false, reason: 'template_id_malformed' };
  }
  const read = await reader.readTemplateVersions(templateId);
  if (read.kind === 'unavailable') {
    report('transient', []);
    return { ok: false, transient: true, reason: 'transient' };
  }
  if (read.kind === 'unauthorised' || read.kind === 'refused') {
    const reason = read.kind === 'unauthorised' ? 'auth' : 'auth_or_not_found';
    report(reason, []);
    return { ok: false, transient: false, reason };
  }

  const expected = canonical(toGatewayTemplate(entry.text, entry.slots));
  const active = read.versions.filter((v) => isOne(v.activeStatus));
  const match = active.find((v) => v.templateData !== null && canonical(v.templateData) === expected);
  if (match === undefined) {
    report('content_mismatch', read.versions);
    return { ok: false, transient: false, reason: 'content_mismatch' };
  }
  const smsType = (match.smsType ?? '').trim().toUpperCase();
  const notes: Msg91PreflightNote[] = [];
  if (needsUnicode(entry.text)) {
    if (smsType !== 'UNICODE') {
      report('sms_type_needs_unicode', [match]);
      return { ok: false, transient: false, reason: 'sms_type_needs_unicode' };
    }
  } else if (smsType === 'UNICODE') {
    notes.push('sms_type_unicode_for_gsm7');
  }
  if (match.dltId === null || match.dltId.trim() === '') {
    report('dlt_id_missing', [match]);
    return { ok: false, transient: false, reason: 'dlt_id_missing' };
  }
  report('pass', [match], notes);
  return { ok: true, notes };
}

/** The process-level memo (MG5). */
export interface Msg91PreflightMemo {
  /** The template's current verdict — a cached one, or a fresh read shared by every concurrent caller. Never throws. */
  get(entry: Msg91PreflightEntry, templateId: string): Promise<Msg91PreflightResult>;
}

export interface Msg91PreflightMemoOptions {
  /** One read of one template (production: `checkMsg91Template` over the real client). */
  readonly check: (entry: Msg91PreflightEntry, templateId: string) => Promise<Msg91PreflightResult>;
  /** Epoch milliseconds. */
  readonly clock: () => number;
  /** How long a PASS is reused (MG5: 1 h). */
  readonly passTtlMs: number;
  /** How long a definite FAULT is reused (MG5: 5 min). */
  readonly faultTtlMs: number;
}

/** MG5's TTLs (BigDev, 2026-10-17 — `-345`). */
export const MSG91_PREFLIGHT_PASS_TTL_MS = 60 * 60 * 1000;
export const MSG91_PREFLIGHT_FAULT_TTL_MS = 5 * 60 * 1000;

interface Cached {
  readonly result: Msg91PreflightResult;
  readonly expiresAt: number;
}

/** Build the ONE memo a process shares (MG5). */
export function createMsg91PreflightMemo(options: Msg91PreflightMemoOptions): Msg91PreflightMemo {
  const cached = new Map<string, Cached>();
  /** The last PASS per key and when it expired — the stale fallback for a transient re-check. */
  const lastPass = new Map<string, Cached>();
  const inFlight = new Map<string, Promise<Msg91PreflightResult>>();

  return {
    get(entry, templateId) {
      // Keyed by the id AND the text it must match — one id wrongly held under two keys is judged for each.
      const key = `${templateId}\u0000${entry.text}`;
      const hit = cached.get(key);
      if (hit !== undefined && options.clock() < hit.expiresAt) return Promise.resolve(hit.result);
      const pending = inFlight.get(key);
      if (pending !== undefined) return pending;

      const run = (async (): Promise<Msg91PreflightResult> => {
        let result: Msg91PreflightResult;
        try {
          result = await options.check(entry, templateId);
        } catch {
          result = { ok: false, transient: true, reason: 'transient' };
        }
        const now = options.clock();
        if (result.ok) {
          const fresh = { result, expiresAt: now + options.passTtlMs };
          cached.set(key, fresh);
          lastPass.set(key, fresh);
          return result;
        }
        if (!result.transient) {
          cached.set(key, { result, expiresAt: now + options.faultTtlMs });
          lastPass.delete(key);
          return result;
        }
        // A transient is ⛔ cached. An expired PASS answers for ONE more pass TTL past its expiry, then the transient.
        cached.delete(key);
        const prior = lastPass.get(key);
        if (prior !== undefined && prior.result.ok && now < prior.expiresAt + options.passTtlMs) {
          return { ok: true, notes: prior.result.notes, stale: true };
        }
        return result;
      })();
      inFlight.set(key, run);
      void run.finally(() => inFlight.delete(key));
      return run;
    },
  };
}
