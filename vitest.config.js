import { defineConfig } from 'vitest/config';
// Edge functions use Deno npm: specifiers; map them to the installed Node packages for tests.
export default defineConfig({ resolve: { alias: { 'npm:decimal.js@10': 'decimal.js' } }, test: { include: ['tests/**/*.test.{js,ts}'], testTimeout: 30000, hookTimeout: 60000, fileParallelism: false } });
