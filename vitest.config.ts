import path from "node:path";
import { defineConfig } from "vitest/config";

/**
 * Deliberately separate from vite.config.ts rather than adding a `test` block there:
 * vite.config.ts sets `root: "client"` for the frontend build, and vitest inherits that
 * root by default — which would mean server/__tests__/ and shared/__tests__/ (both outside
 * client/) never get discovered. This config keeps the project root as the actual repo
 * root so tests across client/, server/, and shared/ are all found, while still reusing the
 * same @ and @shared aliases the app itself uses.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
    },
  },
  test: {
    environment: "node",
    include: [
      "client/src/**/*.test.ts",
      "server/**/*.test.ts",
      "shared/**/*.test.ts",
    ],
    // server/config.ts validates these at import time (see server/config.ts /
    // server/db.ts) — without them, any test that transitively imports the routes/stores
    // fails before it even runs. DATABASE_URL here does not need to be reachable for tests
    // that don't hit the DB; tests that do (leadStore/newsletterStore/route tests) still
    // need a real Postgres instance — see the note in those test files.
    env: {
      NODE_ENV: "test",
      VITE_CMS_URL: "http://localhost:1337",
      ALLOWED_ORIGINS: "http://localhost:5173",
      TRUST_PROXY: "false",
      DATABASE_URL: process.env.DATABASE_URL ?? "postgresql://test:test@localhost:5432/ajiya_test",
      DATABASE_SSL: "false",
    },
  },
});
