/**
 * Automates the one manual step SETUP.md previously asked a human to do in the admin panel:
 * "enable find/findOne for all five content types under the Public role". Runs on every
 * boot, is idempotent (checks for an existing permission row before creating one), and only
 * ever grants `find`/`findOne` — `create`/`update`/`delete` are deliberately never touched
 * here, so content changes still only happen through the admin panel or an authenticated
 * token.
 */

const PUBLIC_READABLE_CONTENT_TYPES = ['project', 'property', 'service', 'insight', 'team-member'];
const PUBLIC_ACTIONS = ['find', 'findOne'];

async function grantPublicReadPermissions(strapi: any): Promise<void> {
  const publicRole = await strapi.query('plugin::users-permissions.role').findOne({ where: { type: 'public' } });
  if (!publicRole) {
    strapi.log.warn('[bootstrap] Public role not found — skipping automatic permission setup.');
    return;
  }

  for (const contentType of PUBLIC_READABLE_CONTENT_TYPES) {
    for (const action of PUBLIC_ACTIONS) {
      const actionId = `api::${contentType}.${contentType}.${action}`;
      const existing = await strapi.query('plugin::users-permissions.permission').findOne({
        where: { action: actionId, role: publicRole.id },
      });
      if (existing) continue;

      await strapi.query('plugin::users-permissions.permission').create({
        data: { action: actionId, role: publicRole.id },
      });
      strapi.log.info(`[bootstrap] Granted public "${action}" on "${contentType}"`);
    }
  }
}

export default {
  register(/* { strapi }: { strapi: any } */) {},

  async bootstrap({ strapi }: { strapi: any }) {
    await grantPublicReadPermissions(strapi);
  },
};
