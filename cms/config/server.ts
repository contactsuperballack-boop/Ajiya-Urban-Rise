export default ({ env }: { env: any }) => ({
  host: env('HOST', '0.0.0.0'),
  port: env.int('PORT', 1337),
  app: {
    keys: env.array('APP_KEYS'),
  },
  webhooks: {
    populateRelations: env.bool('WEBHOOKS_POPULATE_RELATIONS', false),
  },
  // Required once this sits behind the same kind of reverse proxy/load balancer as the
  // main Express app (see ../server/config.ts's TRUST_PROXY) — otherwise Strapi-generated
  // absolute URLs (media, webhooks) can end up wrong behind TLS termination.
  url: env('CMS_PUBLIC_URL', undefined),
  proxy: env.bool('CMS_TRUST_PROXY', false),
});
