/**
 * Conventional Commits per architecture §Conventional Commits scope vocabulary
 * (architecture lines 3988-3993). Scopes include workspace names (api, mobile,
 * admin, public, jobs, packages/<name>) and module-level scopes (api/member,
 * admin/helpline). At PR-1 the scope-enum rule is permissive; downstream
 * stories may tighten as the scope vocabulary stabilizes.
 */
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'scope-enum': [0],
    'subject-case': [0],
    'header-max-length': [2, 'always', 120],
    'body-max-line-length': [0],
    'footer-max-line-length': [0],
  },
};
