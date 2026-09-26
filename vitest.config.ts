import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    pool: "threads",
    poolOptions: {
      threads: {
        singleThread: true
      }
    },
    coverage: {
      reporter: ["text", "html"]
    },
    globals: true,
    include: ["tests/**/*.test.ts"]
  }
});
