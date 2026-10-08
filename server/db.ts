import pg from "pg";
import { loadConfig } from "./config";

const { Pool } = pg;

const config = loadConfig();

if (!config.databaseUrl) {
  throw new Error("DATABASE_URL is required.");
}

export const db = new Pool({
  connectionString: config.databaseUrl,
  // Acceptable initial managed-Postgres compatibility measure. Provider-specific CA
  // verification (rather than rejectUnauthorized: false) is a follow-up, not the final
  // database TLS posture.
  ssl: config.databaseSsl ? { rejectUnauthorized: false } : false,
  max: config.databasePoolMax,
  idleTimeoutMillis: config.databaseIdleTimeoutMs,
  connectionTimeoutMillis: config.databaseConnectionTimeoutMs,
});

db.on("error", (error) => {
  console.error(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      level: "error",
      type: "database_pool_error",
      error: String(error),
    })
  );
});

export async function closeDatabase(): Promise<void> {
  await db.end();
}
