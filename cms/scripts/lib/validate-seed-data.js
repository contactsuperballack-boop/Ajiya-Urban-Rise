'use strict';

/**
 * Validates cms/scripts/seed-data.json against the actual Strapi content-type schemas
 * (cms/src/api/*\/content-types/*\/schema.json) — without needing a running Strapi instance,
 * a database, or network access. This is what "test the migration" means in an environment
 * that can't boot the real CMS: catch bad data (missing required fields, invalid enum
 * values, over-length text, a `projectSlug` that doesn't match any project, a missing
 * placeholder image) before it ever reaches `pnpm exec ts-node scripts/seed.ts`.
 *
 * No dependencies — plain CommonJS so it runs under both a bare `node` invocation and
 * ts-node (via `require`) without adding a test-framework dependency to the CMS project.
 */

const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/**
 * @param {{type: string, entries: any[], schema: any, extra?: (entry: any, ctx: any) => string[]}[]} collections
 * @returns {{errors: string[], warnings: string[]}}
 */
function validateSeedData(collections) {
  const errors = [];
  const warnings = [];

  for (const { type, entries, schema, extra } of collections) {
    const attributes = schema.attributes || {};
    const seenSlugs = new Set();

    entries.forEach((entry, index) => {
      const label = `${type}[${index}]${entry && (entry.slug || entry.name) ? ` (${entry.slug || entry.name})` : ""}`;

      for (const [field, def] of Object.entries(attributes)) {
        // Media and relation fields aren't present as their final Strapi shape in the seed
        // JSON (they're pre-upload placeholders / pre-resolved slugs) — skip them here;
        // they're covered by the `extra` checks passed in per collection instead.
        if (def.type === "media" || def.type === "relation") continue;

        const value = entry ? entry[field] : undefined;
        const isMissing = value === undefined || value === null || value === "";

        if (def.required && isMissing) {
          errors.push(`${label}: missing required field "${field}"`);
          continue;
        }
        if (isMissing) continue;

        if (def.type === "enumeration" && !def.enum.includes(value)) {
          errors.push(`${label}: "${field}" = ${JSON.stringify(value)} is not one of [${def.enum.join(", ")}]`);
        }
        if (def.type === "uid") {
          if (!SLUG_PATTERN.test(value)) {
            errors.push(`${label}: "${field}" = "${value}" is not a valid slug (lowercase, digits, hyphens only)`);
          }
          if (seenSlugs.has(value)) {
            errors.push(`${label}: duplicate slug "${value}" within ${type}`);
          }
          seenSlugs.add(value);
        }
        if ((def.type === "string" || def.type === "text") && def.maxLength && String(value).length > def.maxLength) {
          errors.push(`${label}: "${field}" is ${String(value).length} chars, exceeds maxLength ${def.maxLength}`);
        }
        if (def.type === "decimal" && typeof value !== "number") {
          errors.push(`${label}: "${field}" must be a number, got ${typeof value}`);
        }
        if (def.type === "integer" && !Number.isInteger(value)) {
          errors.push(`${label}: "${field}" must be an integer, got ${JSON.stringify(value)}`);
        }
        if (def.type === "boolean" && typeof value !== "boolean") {
          errors.push(`${label}: "${field}" must be a boolean, got ${typeof value}`);
        }
        if (def.type === "date" && Number.isNaN(Date.parse(value))) {
          errors.push(`${label}: "${field}" = "${value}" is not a parseable date`);
        }
      }

      if (extra) {
        for (const message of extra(entry, { index, allEntries: entries })) {
          if (message.startsWith("warn:")) warnings.push(`${label}: ${message.slice(5)}`);
          else errors.push(`${label}: ${message}`);
        }
      }
    });
  }

  return { errors, warnings };
}

module.exports = { validateSeedData, SLUG_PATTERN };
