import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    // Tests hit a real remote Postgres instance (see tests/inventory.test.ts) — the
    // default 5s timeout is too tight for that network round-trip.
    testTimeout: 20000,
  },
});
