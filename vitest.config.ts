import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["tests/**/*.test.ts"],
    exclude: ["node_modules", "cdk.out"],
    setupFiles: [],
    testTimeout: 30_000,
  },
  esbuild: {
    target: "esnext",
  },
});
