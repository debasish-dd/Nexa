import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    setupFiles: ["./tests/setup.ts"],
    // Neon wakes up slowly after idling, so the first query can take a while.
    testTimeout: 30_000,
    hookTimeout: 30_000,
    // All test files share one database, so run them one at a time.
    fileParallelism: false,
  },
});