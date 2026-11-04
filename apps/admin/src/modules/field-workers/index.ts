// The field-worker console — Story 13.1a (Task 9; AD11). Three pages: register a worker, the workers awaiting approval, and find a
// worker and show their code. ⛔ `field-worker-dispatch/` — the architecture reserves that name for the dispatch surface (13.3).

export { ApprovalsPage } from './ApprovalsPage.js';
export { CodeReveal, CODE_VISIBLE_MS } from './CodeReveal.js';
export { FindWorkerPage } from './FindWorkerPage.js';
export { RegisterFieldWorkerPage } from './RegisterFieldWorkerPage.js';
export { WorkerDetail } from './WorkerDetail.js';
export { codeUnavailableText, fieldWorkerGuidance, spellDigits } from './derive.js';
export { FIELD_WORKER_EN_KEYS, resolveEn as fieldWorkersEn } from './i18n-en.js';
