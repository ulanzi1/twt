import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    passWithNoTests: true,
    // The pg-boss smoke suite (Story 1.12) starts/stops a real boss against the
    // shared `pgboss` schema. Run files serially so concurrent suites don't race
    // on queue creation / maintenance against the same schema.
    fileParallelism: false,
  },
});
