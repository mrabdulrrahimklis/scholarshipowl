import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // The integration test hits a shared SQLite DB; keep suites serial.
    fileParallelism: false,
  },
});
