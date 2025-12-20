import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    setupFiles: ["./tests/utils/setup.ts"],
    testTimeout: 10000,
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html", "lcov"],
      exclude: [
        "node_modules/",
        "dist/",
        "coverage/",
        "**/*.config.ts",
        "**/index.ts",
        "e2e/",
        "tests/utils/",
      ],
      thresholds: {
        global: {
          branches: 70,
          functions: 70,
          lines: 70,
          statements: 70,
        },
      },
    },
    include: [
      "tests/unit/**/*.test.ts",
      "tests/integration/**/*.test.ts",
      "tests/acceptance/**/*.test.ts",
    ],
    exclude: [
      "tests/e2e/**",
      "node_modules/**",
    ],
    reporters: process.env.CI ? ["verbose", "junit"] : ["verbose"],
    outputFile: process.env.CI ? "test-results.xml" : undefined,
  },
});
