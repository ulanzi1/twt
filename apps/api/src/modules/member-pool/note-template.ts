// The Yogdaan Pratigya (Contribution Note) HTML template — Story 8.7 (Task 3; AC1/AC3/AC4/AC5).
//
// A PURE function of `ContributionNoteFacts` → a fully self-contained HTML document (all CSS + the
// Devanagari face inlined). The renderer port turns it into a tagged PDF; this file owns everything a
// reviewer would call "the artifact".
//
// ── The artifact's identity (AC1) ──────────────────────────────────────────────────────────────────
// The document is a **Yogdaan Pratigya / Contribution Note** — a record of a trust relationship
// between colleagues, not a transactional document. The `microcopy.yaml` `vocabulary` register lists
// the transactional nouns that are PROHIBITED on every member-visible surface, with this artifact's
// name as their canonical replacement; this file is inside the gate's `scope.code_globs` precisely so
// that prohibition has teeth over the template source, not only over the locale strings
// (`scripts/microcopy/contribution-note.test.ts` proves it with a planted violation + revert-sanity).
// The prohibition also binds the filename, the `Content-Disposition`, and the route path — see
// `contribution-note.ts`.
//
// ── The load-bearing invariant: the honesty is PRINTED ON THE ARTIFACT (AC3 / D3) ──────────────────
// The Yogdaan Bahi is a private self-view, but a PDF escapes that boundary the moment Sushil forwards
// it on WhatsApp. So three elements — and ONLY these three — vary with `facts.status`, which is the
// output of the ONE `deriveContributionStatus` function (`packages/domain/src/contribution/history.ts`):
//   · the status block copy;
//   · the UTR, rendered ONLY when green (structurally impossible otherwise — the contract refuses to
//     construct a non-green facts object carrying one);
//   · the *सत्यापित* warm-red verification stamp, reserved for green.
// A yellow Note that said "received, thank you" would be a forgery the platform authored itself.
//
// ── Register (D7 / UX §7) ──────────────────────────────────────────────────────────────────────────
// Bihar govt-scheme certificate: watermark, ruled provenance block, conservative palette, dense
// layout. Hindi-primary headings with an English gloss beneath (the member may need to show this to a
// non-Hindi reader; the parity gate governs KEY coverage, and both locales carry full copy).
// Operational values — date, amount, cycle, payment reference, UTR — render Gregorian + Latin; names
// render Devanagari. ONE accent per surface (UX :1094): the warm-red is spent on the verification
// stamp when the Note is green, so a non-green Note carries NO warm-red element at all.
//
// ── Colour discipline ──────────────────────────────────────────────────────────────────────────────
// Every non-tenant colour comes from `@twt/tokens` semantic roles (FM-14 #2 — no magic-number colour
// literals). The only literal colours in the output are the Pariwar's OWN brand values, which are
// tenant DATA carried on the facts object, not styling decisions made here.

import { color, font } from '@twt/tokens';
import type { ContributionNoteFacts } from '@twt/contracts';
import { t } from '@twt/i18n';

import { NOTE_FONT_FAMILY, devanagariFontDataUris } from './note-assets.js';

/** The i18n namespace this artifact's copy lives under (`packages/i18n/locales/{hi,en}/contribution.json`). */
export const NOTE_I18N_NAMESPACE = 'contribution';
const NS = NOTE_I18N_NAMESPACE;

/** Hindi-primary resolution. */
const hi = (key: string): string => t(key, undefined, { namespace: NS, locale: 'hi' });
/** The English gloss beneath it. */
const en = (key: string): string => t(key, undefined, { namespace: NS, locale: 'en' });

/**
 * Escape text for HTML interpolation. EVERY interpolated value goes through this: the facts carry
 * member-influenced strings (names decrypted from KYC, a member-pasted UTR), and this document is
 * loaded into a real browser engine.
 */
function esc(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** The Gregorian `YYYY-MM-DD` operational date form (D7) — UTC, so a Note is viewer-timezone-stable. */
function gregorianDate(iso: string): string {
  return iso.slice(0, 10);
}

/** `₹1,234` — whole INR with Latin group separators (operational register, D7). */
function formatInr(amount: number): string {
  // en-IN gives the Indian lakh/crore grouping with LATIN digits; the A2 discipline forbids Devanagari
  // digits on operational surfaces, never Indian grouping.
  return `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

/** The family display form the card and the Yogdaan Bahi use — first name + last initial only. */
function familyDisplay(first: string, lastInitial: string): string {
  return lastInitial ? `${first} ${lastInitial}` : first;
}

/** The status block's ink, by tone. Warm-red is NOT among them — it is reserved for the stamp (UX :1094). */
const STATUS_INK: Record<ContributionNoteFacts['status'], string> = {
  green: color['status-confirmed'],
  yellow: color['status-pending'],
  red: color['status-mismatch'],
  grey: color['status-grey-takeover'],
  // held (Story 9.5) — a trustee-walked-back confirmation renders in its OWN subdued slate-indigo ink
  // (dignified, not alarming — the tone discipline of [[project_yogdaan_status_derivation_convention]]).
  // Story 9.6 gave `held` a dedicated `status-held` token, distinct from grey (grey = "on record", held =
  // "under review"). This PDF resolves the token's literal hex; the mobile <StatusPill> renders `held` via
  // Tamagui's `$purple` scale (no slate-indigo scale exists there) as a documented visual approximation of
  // the same intent — the two surfaces are aligned in MEANING, not backed by one literal color value.
  held: color['status-held'],
};

/** One labelled row of the artifact's fact table: Hindi label + English gloss + the value. */
function factRow(labelKey: string, value: string, opts?: { readonly operational?: boolean }): string {
  return `
      <tr>
        <th scope="row">
          <span class="label-hi">${esc(hi(labelKey))}</span>
          <span class="label-en">${esc(en(labelKey))}</span>
        </th>
        <td class="${opts?.operational ? 'value operational' : 'value'}">${esc(value)}</td>
      </tr>`;
}

/**
 * Render the Contribution Note as a self-contained HTML document.
 *
 * PURE: same facts in, same HTML out (AC7's byte-equivalent regenerability, modulo `generatedAt` —
 * the one field that legitimately differs between renders). No I/O beyond the cached font read, no
 * clock read, no DB access — the resolver has already established every fact.
 */
/**
 * The literal placeholder token AC4 mandates when no clean server-side helpline-number source exists
 * (never a fabricated number). Review finding (2026-07-25): no provisioned `HELPLINE_TEL` source
 * actually exists anywhere in this repo (no `.env.example` entry, no deploy config, no validation) —
 * printing a hardcoded default would have shipped exactly the fabrication AC4 forbids. Per-Pariwar
 * resolution via the Story-10.x helpdesk routing registry is a declared forward seam (deferred-work.md).
 */
const HELPLINE_PENDING_TOKEN = '[PENDING — Epic 10 per-Pariwar helpline resolution]';

/**
 * The Pariwar helpline number printed on the artifact's footer (Story 8.11, AC4), threaded in as a
 * plain string rather than added to `ContributionNoteFacts` (so no contract/schema change). No clean
 * server-side source exists today, so the caller (handlers.ts) passes `undefined` and the footer prints
 * the AC4-mandated `HELPLINE_PENDING_TOKEN` instead of a number. A PDF is not tappable — the footer
 * carries the printed NUMBER (or the pending token), and the tappable `<CallHelplineCTA>` lives on the
 * Contribution Note screen (mobile), which resolves its own number from `EXPO_PUBLIC_HELPLINE_TEL`.
 */
export function renderContributionNoteHtml(
  facts: ContributionNoteFacts,
  helpline?: string,
): string {
  const fonts = devanagariFontDataUris();
  const isGreen = facts.status === 'green';
  const statusInk = STATUS_INK[facts.status];
  const family = familyDisplay(facts.deceasedFirstName, facts.deceasedLastInitial);
  const member = familyDisplay(facts.memberFirstName, facts.memberLastInitial);
  const pool = facts.poolName ?? facts.poolLetterCode;

  // The Niyamavali provenance (AC4) — the version in force AT THE CONTRIBUTION INSTANT, or an HONEST
  // ABSENCE. The generator NEVER fabricates, back-dates, or defaults a version string: today the launch
  // tenant has no published contribution-discipline clause, so this legitimately renders "not yet
  // published" and starts citing a real version with zero code change once Epic 2 seeds the tenant.
  const niyamavaliValue =
    facts.niyamavali === null
      ? `${hi('note.niyamavali.absent')} · ${en('note.niyamavali.absent')}`
      : `v${facts.niyamavali.version} · ${facts.niyamavali.clauseVersionId}`;

  // Per-Pariwar branding (AC5). The logo is optional — an unset logo costs the Pariwar nothing else;
  // the resolver has already degraded each field to a TWT default independently.
  const logo =
    facts.branding.logoUrl === null
      ? ''
      : `<img class="brand-logo" src="${esc(facts.branding.logoUrl)}" alt="" />`;

  return `<!DOCTYPE html>
<html lang="hi">
<head>
<meta charset="utf-8" />
<title>${esc(hi('note.title'))} — ${esc(en('note.title'))}</title>
<style>
  @font-face {
    font-family: '${NOTE_FONT_FAMILY}';
    src: url('${fonts.regular}') format('truetype');
    font-weight: 400;
    font-style: normal;
  }
  @font-face {
    font-family: '${NOTE_FONT_FAMILY}';
    src: url('${fonts.bold}') format('truetype');
    font-weight: 700;
    font-style: normal;
  }
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    /* The vendored face covers BOTH Devanagari and the Latin/operational run, so there is no
       second-font fallback hole in a font-less container (D5). */
    font-family: '${NOTE_FONT_FAMILY}', ${font['body-ledger']};
    color: ${color['ink-primary']};
    background: ${color['surface-base']};
    font-size: 11pt;
    line-height: 1.5;
  }
  .sheet { position: relative; width: 210mm; min-height: 297mm; padding: 16mm 16mm 14mm; overflow: hidden; }
  /* The TWT watermark + the member-identifier watermark (AC5 / FR-33 [v1-S]). Behind the content,
     low-contrast, non-interactive; aria-hidden so a screen reader is not read decorative text. */
  .watermark {
    position: absolute; inset: 0; display: flex; flex-direction: column;
    align-items: center; justify-content: center; transform: rotate(-28deg);
    opacity: 0.06; pointer-events: none; z-index: 0;
  }
  .watermark .mark { font-size: 34pt; font-weight: 700; letter-spacing: 0.08em; white-space: nowrap; }
  .watermark .member-mark { font-size: 16pt; letter-spacing: 0.35em; margin-top: 6mm; }
  .content { position: relative; z-index: 1; }
  header { display: flex; align-items: flex-start; gap: 6mm; border-bottom: 2px solid ${color['rule-heavy']}; padding-bottom: 5mm; }
  .brand-logo { height: 16mm; width: auto; }
  .brand-names { flex: 1; }
  /* Not font['display-name'] (Tiro Devanagari Hindi) alone — that face is not vendored into this render
     container and has no network fallback (D5); the vendored face leads so it always wins. */
  .brand-hi { font-size: 15pt; font-weight: 700; font-family: '${NOTE_FONT_FAMILY}', ${font['display-name']}; }
  .brand-en { font-size: 9.5pt; color: ${color['status-grey-takeover']}; letter-spacing: 0.04em; }
  .brand-rule { height: 3px; width: 28mm; margin-top: 2mm; }
  .doc-title { text-align: center; margin: 8mm 0 2mm; }
  /* Vendored face leads (D5) — same rationale as .brand-hi above; this heading IS the artifact's own title. */
  .doc-title h1 { font-size: 21pt; margin: 0; font-weight: 700; font-family: '${NOTE_FONT_FAMILY}', ${font['display-name']}; letter-spacing: 0.02em; }
  .doc-title .gloss { font-size: 10.5pt; color: ${color['status-grey-takeover']}; letter-spacing: 0.06em; }
  .doc-subtitle { text-align: center; font-size: 10pt; color: ${color['status-grey-takeover']}; margin-bottom: 6mm; }
  .nature { border: 1px solid ${color['rule-hairline']}; background: ${color['surface-accent']}; padding: 4mm; font-size: 9.5pt; margin-bottom: 6mm; }
  .nature p { margin: 0 0 1.5mm; }
  .nature p:last-child { margin-bottom: 0; color: ${color['status-grey-takeover']}; }
  /* Visually hidden but PRESENT in the structure tree — a tagged PDF's table wants a caption so a
     screen reader announces what the following rows are, while the sheet does not repeat the
     subtitle it already carries above. Clipped rather than display:none, which would remove it. */
  .sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
  table.facts { width: 100%; border-collapse: collapse; margin-bottom: 6mm; }
  table.facts th, table.facts td { border-bottom: 1px solid ${color['rule-hairline']}; padding: 2.6mm 2mm; vertical-align: top; text-align: left; }
  table.facts th { width: 52mm; font-weight: 400; }
  .label-hi { display: block; font-weight: 700; font-size: 10.5pt; }
  .label-en { display: block; font-size: 8.5pt; color: ${color['status-grey-takeover']}; letter-spacing: 0.03em; }
  td.value { font-size: 12pt; }
  /* Operational values — Gregorian + Latin, tabular figures (D7 / UX :1121-1127). */
  td.value.operational { font-family: ${font['numeric-tabular']}; font-variant-numeric: tabular-nums; letter-spacing: 0.02em; }
  .status-block { display: flex; align-items: flex-start; gap: 5mm; border: 1px solid ${color['rule-hairline']}; padding: 4mm; margin-bottom: 6mm; }
  .status-text { flex: 1; }
  .status-title { font-size: 13pt; font-weight: 700; color: ${statusInk}; }
  .status-title .gloss { font-size: 9.5pt; font-weight: 400; color: ${color['status-grey-takeover']}; }
  .status-body { font-size: 10pt; margin-top: 1.5mm; }
  .status-body .gloss { display: block; font-size: 9pt; color: ${color['status-grey-takeover']}; margin-top: 1mm; }
  /* The verification stamp — the ONE warm-red element, and ONLY on a green Note (AC3 / UX :1094). */
  .stamp {
    flex: 0 0 auto; border: 2.5px solid ${color['stamp-mudra']}; color: ${color['stamp-mudra']};
    border-radius: 2mm; padding: 3mm 5mm; text-align: center; transform: rotate(-8deg);
    font-family: ${font['caption-stamp']};
  }
  .stamp .stamp-hi { font-size: 15pt; font-weight: 700; letter-spacing: 0.06em; }
  .stamp .stamp-en { font-size: 8pt; letter-spacing: 0.18em; text-transform: uppercase; }
  .provenance { border-top: 1px solid ${color['rule-hairline']}; padding-top: 4mm; font-size: 9pt; color: ${color['status-grey-takeover']}; }
  .provenance dl { display: grid; grid-template-columns: 46mm 1fr; gap: 1.2mm 3mm; margin: 0 0 3mm; }
  .provenance dt { font-weight: 700; }
  .provenance dd { margin: 0; font-family: ${font['numeric-tabular']}; word-break: break-all; }
  /* Vendored face leads (D5) — same rationale as .brand-hi above. */
  .tagline { text-align: center; font-size: 12pt; font-family: '${NOTE_FONT_FAMILY}', ${font['display-parichay']}; margin: 6mm 0 2mm; }
  .tagline .gloss { display: block; font-size: 8.5pt; color: ${color['status-grey-takeover']}; letter-spacing: 0.06em; }
  footer { border-top: 2px solid ${color['rule-heavy']}; margin-top: 5mm; padding-top: 3mm; font-size: 8.5pt; color: ${color['status-grey-takeover']}; text-align: center; }
  footer .footer-helpline { margin-top: 2mm; }
  footer .footer-helpline .tel { direction: ltr; unicode-bidi: embed; white-space: nowrap; }
</style>
</head>
<body>
<main class="sheet">
  <div class="watermark" aria-hidden="true">
    <div class="mark">${esc(hi('note.watermark'))}</div>
    <div class="member-mark">${esc(facts.memberRef)}</div>
  </div>

  <div class="content">
    <header>
      ${logo}
      <div class="brand-names">
        <div class="brand-hi">${esc(facts.branding.displayNameHi)}</div>
        <div class="brand-en">${esc(facts.branding.displayNameEn)}</div>
        <div class="brand-rule" style="background:${esc(facts.branding.primaryColor)}"></div>
      </div>
      <div class="brand-rule" style="background:${esc(facts.branding.secondaryColor)};height:16mm;width:3px"></div>
    </header>

    <div class="doc-title">
      <h1>${esc(hi('note.title'))}</h1>
      <div class="gloss">${esc(en('note.title'))}</div>
    </div>
    <div class="doc-subtitle">${esc(hi('note.subtitle'))} · ${esc(en('note.subtitle'))}</div>

    <section class="nature">
      <p>${esc(hi('note.nature'))}</p>
      <p>${esc(en('note.nature'))}</p>
    </section>

    <table class="facts">
      <caption class="sr-only">${esc(hi('note.subtitle'))} · ${esc(en('note.subtitle'))}</caption>
      <tbody>${factRow('note.label.member', member)}${factRow('note.label.member_ref', facts.memberRef, { operational: true })}${factRow('note.label.date', gregorianDate(facts.attestedAt), { operational: true })}${factRow('note.label.family', family)}${factRow('note.label.pool', `${pool} · ${facts.poolCanonicalIdentifier}`)}${factRow('note.label.cycle', facts.cycleRef, { operational: true })}${factRow('note.label.amount', formatInr(facts.amountInr), { operational: true })}${factRow('note.label.payment_ref', facts.paymentReference, { operational: true })}${
        // AC3: the UTR appears ONLY on a green Note. A non-green Note shows the payment reference above
        // — the member's own attempt — and asserts nothing about a settled payment.
        isGreen && facts.utr !== undefined ? factRow('note.label.utr', facts.utr, { operational: true }) : ''
      }
      </tbody>
    </table>

    <section class="status-block">
      <div class="status-text">
        <div class="status-title">
          ${esc(hi(`note.status.${facts.status}.title`))}
          <span class="gloss">· ${esc(en(`note.status.${facts.status}.title`))}</span>
        </div>
        <div class="status-body">
          ${esc(hi(`note.status.${facts.status}.body`))}
          <span class="gloss">${esc(en(`note.status.${facts.status}.body`))}</span>
        </div>
      </div>
      ${
        // AC3: the *सत्यापित* stamp is reserved for green. This is the mechanism that makes a forwarded
        // non-green Note safe — a reader sees an unstamped document with "verification pending" on it.
        isGreen
          ? `<div class="stamp">
        <div class="stamp-hi">${esc(hi('note.stamp.verified'))}</div>
        <div class="stamp-en">${esc(en('note.stamp.verified'))}</div>
      </div>`
          : ''
      }
    </section>

    <section class="provenance">
      <dl>
        <dt>${esc(hi('note.label.niyamavali'))} · ${esc(en('note.label.niyamavali'))}</dt>
        <dd>${esc(niyamavaliValue)}</dd>
        ${
          facts.niyamavali === null
            ? ''
            : `<dt>${esc(hi('note.label.clause'))} · ${esc(en('note.label.clause'))}</dt>
        <dd>${esc(facts.niyamavali.clauseId)}</dd>`
        }
        <dt>${esc(hi('note.label.record_id'))} · ${esc(en('note.label.record_id'))}</dt>
        <dd>${esc(facts.contributionId)}</dd>
        <dt>${esc(hi('note.label.generated'))} · ${esc(en('note.label.generated'))}</dt>
        <dd>${esc(facts.generatedAt)}</dd>
      </dl>
      <p>${esc(hi('note.provenance_note'))}</p>
      <p>${esc(en('note.provenance_note'))}</p>
    </section>

    <div class="tagline">
      ${esc(hi('note.tagline'))}
      <span class="gloss">${esc(en('note.tagline'))}</span>
    </div>

    <!-- Footer helpline line — Story 8.11 (AC4) filled the slot 8.7 reserved by name. A PDF escapes the
         self-view boundary the moment it is forwarded, so a bereaved member needs the number ON the
         artifact. It is PRINTED bilingual text (not a tel: link — a PDF is static) and dignified
         help-access — it asserts no status and is not a transactional acknowledgement (UX-DR55; the
         8.7 honesty rules hold). No clean server-side number source exists today (review finding,
         2026-07-25) — the helpline argument is undefined, so the AC4-mandated PENDING token prints
         instead of a fabricated number; Epic 10's per-Pariwar resolution replaces the token. -->
    <footer>
      <span>${esc(facts.branding.displayNameHi)} · ${esc(facts.branding.displayNameEn)}</span>
      <p class="footer-helpline">
        ${esc(hi('note.helpline'))} · <span class="gloss">${esc(en('note.helpline'))}</span>
        <span class="tel">${esc(helpline ?? HELPLINE_PENDING_TOKEN)}</span>
      </p>
    </footer>
  </div>
</main>
</body>
</html>`;
}
