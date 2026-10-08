#!/usr/bin/env node
'use strict';

/**
 * Standalone, offline test of the CMS migration data — run this before ever pointing
 * seed.ts at a live Strapi instance:
 *
 *   node cms/scripts/validate-seed-data.js
 *
 * Checks, purely against the JSON files on disk (no Strapi, no database, no network):
 *   - every field required by the actual schema.json is present
 *   - enum fields only use values the schema actually allows
 *   - string/text fields respect maxLength
 *   - slugs are well-formed and unique within their content type
 *   - every property.projectSlug points at a project that actually exists in the seed data
 *   - every referenced placeholder image file actually exists on disk
 *
 * Exits 0 with no errors, 1 if any errors were found. Warnings are informational only.
 */

const fs = require("node:fs");
const path = require("node:path");
const { validateSeedData } = require("./lib/validate-seed-data");

const CMS_ROOT = path.join(__dirname, "..");
const DATA_PATH = path.join(__dirname, "seed-data.json");
const PLACEHOLDER_DIR = path.join(__dirname, "placeholder-images");

function loadSchema(apiName) {
  const schemaPath = path.join(CMS_ROOT, "src", "api", apiName, "content-types", apiName, "schema.json");
  return JSON.parse(fs.readFileSync(schemaPath, "utf-8"));
}

function placeholderCheck(filenameField) {
  return (entry) => {
    const filename = entry[filenameField];
    if (!filename) return [];
    const exists = fs.existsSync(path.join(PLACEHOLDER_DIR, filename));
    return exists ? [] : [`warn:placeholder image "${filename}" (referenced by "${filenameField}") not found in cms/scripts/placeholder-images/ — seed.ts will skip the media and log a warning, entry will still be created`];
  };
}

function run() {
  if (!fs.existsSync(DATA_PATH)) {
    console.error(`seed-data.json not found at ${DATA_PATH}`);
    process.exit(1);
  }

  /** @type {any} */
  const data = JSON.parse(fs.readFileSync(DATA_PATH, "utf-8"));
  const projectSlugs = new Set((data.projects || []).map((p) => p.slug));

  const collections = [
    { type: "services", entries: data.services || [], schema: loadSchema("service") },
    {
      type: "projects",
      entries: data.projects || [],
      schema: loadSchema("project"),
      extra: placeholderCheck("heroImagePlaceholder"),
    },
    {
      type: "properties",
      entries: data.properties || [],
      schema: loadSchema("property"),
      extra: (entry) => {
        const messages = placeholderCheck("imagePlaceholder")(entry);
        if (entry.projectSlug && !projectSlugs.has(entry.projectSlug)) {
          messages.push(
            `"projectSlug" = "${entry.projectSlug}" does not match any project slug in seed-data.json — this property would be created with no project link`
          );
        }
        return messages;
      },
    },
    {
      type: "insights",
      entries: data.insights || [],
      schema: loadSchema("insight"),
      extra: placeholderCheck("coverImagePlaceholder"),
    },
    {
      type: "teamMembers",
      entries: data.teamMembers || [],
      schema: loadSchema("team-member"),
      extra: placeholderCheck("photoPlaceholder"),
    },
  ];

  const { errors, warnings } = validateSeedData(collections);

  const totalEntries = collections.reduce((sum, c) => sum + c.entries.length, 0);
  console.log(`Validated ${totalEntries} entries across ${collections.length} content types.\n`);

  if (warnings.length > 0) {
    console.log(`${warnings.length} warning(s):`);
    warnings.forEach((w) => console.log(`  ! ${w}`));
    console.log("");
  }

  if (errors.length > 0) {
    console.log(`${errors.length} error(s):`);
    errors.forEach((e) => console.log(`  x ${e}`));
    console.log("\nFAIL — fix the above before running seed.ts against a live Strapi instance.");
    process.exit(1);
  }

  console.log("PASS — seed-data.json is structurally valid against the current schemas.");
  if (warnings.length > 0) {
    console.log("Warnings above won't block the seed script, but review them first.");
  }
}

run();
