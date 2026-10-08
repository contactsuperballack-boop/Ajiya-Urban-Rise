import path from 'path';

export default ({ env }: { env: any }) => {
  const client = env('DATABASE_CLIENT', 'sqlite');

  const connections: Record<string, any> = {
    postgres: {
      connection: {
        connectionString: env('DATABASE_URL'),
        host: env('DATABASE_HOST', 'localhost'),
        port: env.int('DATABASE_PORT', 5432),
        database: env('DATABASE_NAME', 'ajiya_cms'),
        user: env('DATABASE_USERNAME', 'strapi'),
        password: env('DATABASE_PASSWORD', 'strapi'),
        ssl: env.bool('DATABASE_SSL', false) && {
          // Same acceptable-for-now, not-final-TLS-posture tradeoff as the main app's
          // server/db.ts — provider-specific CA verification is a follow-up.
          rejectUnauthorized: env.bool('DATABASE_SSL_REJECT_UNAUTHORIZED', false),
        },
        schema: env('DATABASE_SCHEMA', 'public'),
      },
      pool: {
        min: env.int('DATABASE_POOL_MIN', 2),
        max: env.int('DATABASE_POOL_MAX', 10),
      },
    },
    sqlite: {
      connection: {
        // Local dev only — see cms/SETUP.md. Never use SQLite in staging/production; besides
        // the concurrency ceiling, it lives on the same ephemeral container filesystem the
        // rest of this audit moved the main app's leads/subscribers away from.
        filename: path.join(__dirname, '..', env('DATABASE_FILENAME', '.tmp/data.db')),
      },
      useNullAsDefault: true,
    },
  };

  return {
    connection: {
      client,
      ...connections[client],
      acquireConnectionTimeout: env.int('DATABASE_CONNECTION_TIMEOUT', 60000),
    },
  };
};
