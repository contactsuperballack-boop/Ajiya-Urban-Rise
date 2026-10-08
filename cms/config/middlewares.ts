export default ({ env }: { env: any }) => [
  'strapi::logger',
  'strapi::errors',
  {
    name: 'strapi::security',
    config: {
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          'connect-src': ["'self'", 'https:'],
          'img-src': ["'self'", 'data:', 'blob:', 'market-assets.strapi.io'],
          'media-src': ["'self'", 'data:', 'blob:', 'market-assets.strapi.io'],
          upgradeInsecureRequests: null,
        },
      },
    },
  },
  {
    name: 'strapi::cors',
    config: {
      // Same allowlist model as the main app's server/cors.ts — never '*'. Set
      // CMS_ALLOWED_ORIGINS to the actual AJIYA frontend origin(s) in every environment.
      origin: env.array('CMS_ALLOWED_ORIGINS', ['http://localhost:5173']),
    },
  },
  'strapi::poweredBy',
  'strapi::query',
  'strapi::body',
  'strapi::session',
  'strapi::favicon',
  'strapi::public',
];
