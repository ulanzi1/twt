// The MSG91 template PRE-FLIGHT — Story 6.37 (MG5, MG17; AC7; `2026-10-17-345`; ADR-0041).
//
// ⭐ Why it exists (F9): MSG91 answers a Flow send HTTP 200 `"type":"success"` even for a FAKE authkey — its errors
// arrive asynchronously. So a send's `success` proves ⛔ the account or the template, and a broken template would be
// recorded `accepted` and never arrive. The pre-flight READS each template the process will use from MSG91
// (`getTemplateVersions`) before a text is spent on it, and says whether it is usable.
//
// What it checks — the version marked default (`active_status` "1" — an INFERENCE from MSG91's "Mark default" panel
// option; Row 32 (d) records the meaning in writing). ⚠ Should MSG91 mark MORE than one version active, EVERY active
// version must pass (round 2 P4) — ⛔ "any one matches", which could pass a version MSG91 does ⛔ send:
//   · its text equals the registered text's gateway form (`##name##`), after canonicalisation (NFC, CRLF → LF,
//     trailing whitespace trimmed) — else `content_mismatch`;
//   · its `sms_type` is UNICODE when the TEXT needs it (⛔ the locale — T11) — else `sms_type_needs_unicode`; a GSM-7
//     text on a UNICODE template still delivers ⇒ a PASS carrying the logged note `sms_type_unicode_for_gsm7`;
//   · its `DLT_ID` is non-blank — else `dlt_id_missing`.
// An HTTP 401 ⇒ `auth`; MSG91's 200 `status:"error"` (a bad key and an unknown id look the same — F16) ⇒
// `auth_or_not_found`; a malformed id ⇒ `template_id_malformed` (⛔ call made); a network / timeout / 429 / 5xx — or any
// OTHER non-2xx or undocumented 2xx error body (⛔ a documented refusal, so ⛔ proof about a send — review F2; round 2
// P1) ⇒ a TRANSIENT, carrying the read's `cause` for the log (round 2 P5). EVERY version's `status` / `dlt_verified` /
// `dlt_reason` / `reject_reason` / `sender_id` is LOGGED, ⛔ gating.
// ⚠ It reads TEMPLATES: a send-side ACCOUNT fault (zero balance, SMS not enabled for the key, an unwhitelisted IP) is
// ⛔ visible to it (MG15).
//
// What a result MEANS on each path is the caller's (MG5): the suspicion / peer-mesh sweeps HOLD on any fault; the
// correction / closure / certificate paths end a row only on a PROVEN one and fail OPEN otherwise; the api refuses to
// start only on `auth*` / malformed. This file only reads and remembers.
//
// ── The memo ─────────────────────────────────────────────────────────────────────────────────────────────────
// Every jobs send runs in a pg-boss CHILD, so ONE process-level memo: concurrent misses share ONE call; a PASS is kept
// for `passTtlMs`, a definite FAULT for `faultTtlMs`, a TRANSIENT for `transientTtlMs` (`-346` decision 3 — 60 s, so an
// outage or a permanent read failure costs one read per template per minute, ⛔ one per send); on the re-check of an
// EXPIRED pass a transient answers that stale PASS — itself kept for the transient TTL — for at most ONE more pass TTL
// (then the transient itself).
//
// ⛔ The authkey, ⛔ the template's text, ⛔ a recipient in any log line (I6).

import { needsUnicode, toGatewayTemplate, type DltSlot } from '../dlt-variables.js';
import { isMsg91TemplateId, type Msg91ReadCause, type Msg91TemplateReader, type Msg91TemplateVersion } from './sms-app.js';

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
  | { readonly ok: false; readonly transient: true; readonly reason: 'transient'; readonly cause?: Msg91ReadCause | 'check_threw' };

/** The informational fields of EVERY version MSG91 returned (round 2 P4) — ⛔ its text. */
export interface Msg91PreflightObservation {
  readonly result: 'pass' | Msg91PreflightFault | 'transient';
  /** Why a read gave ⛔ answer to rely on — on a `transient` only (round 2 P5). */
  readonly cause?: Msg91ReadCause;
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
    options.log?.({ result: 'transient', cause: read.cause, versions: 0, notes: [], checked: [] });
    return { ok: false, transient: true, reason: 'transient', cause: read.cause };
  }
  if (read.kind === 'unauthorised' || read.kind === 'refused') {
    const reason = read.kind === 'unauthorised' ? 'auth' : 'auth_or_not_found';
    report(reason, []);
    return { ok: false, transient: false, reason };
  }

  const expected = canonical(toGatewayTemplate(entry.text, entry.slots));
  const all = read.versions;
  // EVERY active version must pass (round 2 P4) — with one active version (MSG91's "Mark default") this is MG5 as written.
  const active = all.filter((v) => isOne(v.activeStatus));
  if (active.length === 0 || active.some((v) => v.templateData === null || canonical(v.templateData) !== expected)) {
    report('content_mismatch', all);
    return { ok: false, transient: false, reason: 'content_mismatch' };
  }
  const notes: Msg91PreflightNote[] = [];
  for (const version of active) {
    const smsType = (version.smsType ?? '').trim().toUpperCase();
    if (needsUnicode(entry.text)) {
      if (smsType !== 'UNICODE') {
        report('sms_type_needs_unicode', all);
        return { ok: false, transient: false, reason: 'sms_type_needs_unicode' };
      }
    } else if (smsType === 'UNICODE' && !notes.includes('sms_type_unicode_for_gsm7')) {
      notes.push('sms_type_unicode_for_gsm7');
    }
    if (version.dltId === null || version.dltId.trim() === '') {
      report('dlt_id_missing', all);
      return { ok: false, transient: false, reason: 'dlt_id_missing' };
    }
  }
  report('pass', all, notes);
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
  /** How long a TRANSIENT is reused (`-346` decision 3: 60 s). */
  readonly transientTtlMs: number;
}

/** MG5's TTLs (BigDev, 2026-10-17 — `-345`; the transient TTL `-346`). */
export const MSG91_PREFLIGHT_PASS_TTL_MS = 60 * 60 * 1000;
export const MSG91_PREFLIGHT_FAULT_TTL_MS = 5 * 60 * 1000;
export const MSG91_PREFLIGHT_TRANSIENT_TTL_MS = 60 * 1000;

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
      // Keyed by the id AND what it must match — the text AND its slot names (the `##name##` form depends on both —
      // round 2 P7) — so one id wrongly held under two keys is judged for each.
      const key = `${templateId}\u0000${entry.text}\u0000${entry.slots.map((slot) => slot.name).join('\u0001')}`;
      const hit = cached.get(key);
      if (hit !== undefined && options.clock() < hit.expiresAt) return Promise.resolve(hit.result);
      const pending = inFlight.get(key);
      if (pending !== undefined) return pending;

      const run = (async (): Promise<Msg91PreflightResult> => {
        let result: Msg91PreflightResult;
        try {
          result = await options.check(entry, templateId);
        } catch {
          result = { ok: false, transient: true, reason: 'transient', cause: 'check_threw' };
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
        // A transient is kept for the transient TTL (`-346`). An expired PASS answers for ONE more pass TTL past its
        // expiry (that stale answer kept for the transient TTL too, ⛔ past the stale window), then the transient.
        const prior = lastPass.get(key);
        const staleUntil = prior !== undefined ? prior.expiresAt + options.passTtlMs : 0;
        if (prior !== undefined && prior.result.ok && now < staleUntil) {
          const stale: Msg91PreflightResult = { ok: true, notes: prior.result.notes, stale: true };
          cached.set(key, { result: stale, expiresAt: Math.min(now + options.transientTtlMs, staleUntil) });
          return stale;
        }
        cached.set(key, { result, expiresAt: now + options.transientTtlMs });
        return result;
      })();
      inFlight.set(key, run);
      void run.finally(() => inFlight.delete(key));
      return run;
    },
  };
}
