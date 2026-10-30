// The QUESTIONNAIRE CHAIN's admin module — Story 6.33 (`2026-10-10-304` Q7 / Q8; `2026-10-30-421`). The Pariwar Admin
// proposes, an approver (the Pariwar Admin as Trustee-Lite) approves or returns, the Super Admin makes a version live for one
// Pariwar or all, adds directly, reverts. Handlers talk to @twt/domain's `questionnaireVersions` namespace.

import type { FastifyInstance } from 'fastify';

import type { AppDeps } from '../../context.js';
import { registerQuestionnaireVersionRoutes } from './routes.js';

export {
  QUESTIONNAIRE_APPROVE_KEY,
  QUESTIONNAIRE_PROPOSE_KEY,
  QUESTIONNAIRE_PUBLISH_KEY,
  QUESTIONNAIRE_PUBLISH_STEP_UP_CONTEXT,
} from './handlers.js';

export function registerQuestionnaireVersionsModule(app: FastifyInstance, deps: AppDeps): void {
  registerQuestionnaireVersionRoutes(app, deps);
}
