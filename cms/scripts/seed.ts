/**
 * AJIYA content migration — seeds Project, Property, Service, Insight, and Team Member
 * entries from the old hardcoded client/src/data/site.ts into Strapi.
 *
 * cms/ is now a real Strapi v5 project (see cms/package.json) rather than fragments to be
 * copied into a separately-scaffolded one, so this runs in place:
 *
 *   cd cms
 *   pnpm install
 *   pnpm exec ts-node --transpile-only scripts/seed.ts --dry-run   # validate only, no DB/Strapi boot
 *   pnpm exec ts-node --transpile-only scripts/seed.ts             # actually seed
 *
 * --dry-run runs the exact same structural/referential validation as
 * `node scripts/validate-seed-data.js` (missing fields, bad enum values, malformed slugs,
 * a properties[].projectSlug that doesn't match any project, missing placeholder images) but
 * does NOT boot Strapi or touch the database — use it in CI or before ever pointing this at
 * a real instance. Still not a substitute for the real run: things a static check can't
 * catch (a stale documentId after schema changes, a plugin misconfiguration, an upload
 * provider failure) will only surface once this actually talks to Strapi.
 *
 * Idempotent on a real run: skips any entry whose slug already exists, so it's safe to run
 * again after fixing an error partway through.
 */

import fs from 'node:fs';
import path from 'node:path';
// Plain CJS module, shared with the standalone `validate-seed-data.js` CLI (Node's CJS/ESM
// interop resolves this named import via static analysis of `module.exports`) — not worth
// a second copy of the same validation logic in TypeScript.
// @ts-ignore -- no type declarations for this plain-JS helper module.
import { validateSeedData } from './lib/validate-seed-data.js';

const DATA_PATH = path.join(__dirname, 'seed-data.json');
const PLACEHOLDER_IMAGE_DIR = path.join(__dirname, 'placeholder-images');
const SCHEMAS_DIR = path.join(__dirname, '..', 'src', 'api');

function loadSchema(apiName: string) {
  return JSON.parse(fs.readFileSync(path.join(SCHEMAS_DIR, apiName, 'content-types', apiName, 'schema.json'), 'utf-8'));
}

/** Same checks as validate-seed-data.js's CLI — kept here so `--dry-run` needs no extra file. */
function runDryRun(data: SeedData): void {
  const projectSlugs = new Set(data.projects.map((p) => p.slug));
  const placeholderExists = (filename?: string) =>
    !filename || fs.existsSync(path.join(PLACEHOLDER_IMAGE_DIR, filename));

  const collections = [
    { type: 'services', entries: data.services, schema: loadSchema('service') },
    {
      type: 'projects',
      entries: data.projects,
      schema: loadSchema('project'),
      extra: (entry: any) =>
        placeholderExists(entry.heroImagePlaceholder)
          ? []
          : [`warn:placeholder image "${entry.heroImagePlaceholder}" not found in scripts/placeholder-images/`],
    },
    {
      type: 'properties',
      entries: data.properties,
      schema: loadSchema('property'),
      extra: (entry: any) => {
        const messages: string[] = [];
        if (!placeholderExists(entry.imagePlaceholder)) {
          messages.push(`warn:placeholder image "${entry.imagePlaceholder}" not found in scripts/placeholder-images/`);
        }
        if (entry.projectSlug && !projectSlugs.has(entry.projectSlug)) {
          messages.push(`"projectSlug" = "${entry.projectSlug}" does not match any project slug in seed-data.json`);
        }
        return messages;
      },
    },
    {
      type: 'insights',
      entries: data.insights,
      schema: loadSchema('insight'),
      extra: (entry: any) =>
        placeholderExists(entry.coverImagePlaceholder)
          ? []
          : entry.coverImagePlaceholder
            ? [`warn:placeholder image "${entry.coverImagePlaceholder}" not found in scripts/placeholder-images/`]
            : [],
    },
    {
      type: 'teamMembers',
      entries: data.teamMembers,
      schema: loadSchema('team-member'),
      extra: (entry: any) =>
        placeholderExists(entry.photoPlaceholder)
          ? []
          : [`warn:placeholder image "${entry.photoPlaceholder}" not found in scripts/placeholder-images/`],
    },
  ];

  const { errors, warnings } = validateSeedData(collections);

  console.log(`[dry-run] Validated ${collections.reduce((n, c) => n + c.entries.length, 0)} entries. No Strapi boot, no DB writes.\n`);
  warnings.forEach((w) => console.log(`  ! ${w}`));
  errors.forEach((e) => console.log(`  x ${e}`));

  if (errors.length > 0) {
    console.log(`\n[dry-run] FAIL — ${errors.length} error(s). Fix seed-data.json before running for real.`);
    process.exitCode = 1;
    return;
  }
  console.log(`\n[dry-run] PASS — safe to run without --dry-run against a real Strapi instance.`);
}

type SeedData = {
  services: any[];
  projects: any[];
  properties: any[];
  insights: any[];
  teamMembers: any[];
};

async function alreadyExists(strapi: any, uid: string, slug: string) {
  const existing = await strapi.documents(uid).findFirst({ filters: { slug } });
  return !!existing;
}

/** Uploads a local placeholder image once and returns its Strapi file id, or null on failure. */
async function uploadPlaceholder(strapi: any, filename: string): Promise<number | null> {
  const filePath = path.join(PLACEHOLDER_IMAGE_DIR, filename);
  if (!fs.existsSync(filePath)) {
    console.warn(`  ! placeholder image not found: ${filePath} — skipping media for this entry`);
    return null;
  }
  try {
    const stats = fs.statSync(filePath);
    const uploadService = strapi.plugin('upload').service('upload');
    const [file] = await uploadService.upload({
      data: {},
      files: {
        path: filePath,
        name: filename,
        type: 'image/jpeg',
        size: stats.size,
      },
    });
    return file?.id ?? null;
  } catch (err) {
    console.warn(`  ! image upload failed for ${filename}:`, (err as Error).message);
    console.warn('    Add the image manually via the admin panel — this does not block the rest of the seed.');
    return null;
  }
}

async function seedServices(strapi: any, services: SeedData['services']) {
  console.log(`\nSeeding ${services.length} services...`);
  for (const s of services) {
    if (await alreadyExists(strapi, 'api::service.service', s.slug)) {
      console.log(`  - skip (exists): ${s.slug}`);
      continue;
    }
    await strapi.documents('api::service.service').create({
      data: {
        title: s.title,
        slug: s.slug,
        index: s.index,
        cue: s.cue,
        shortDescription: s.shortDescription,
        intro: s.intro,
        body: s.body,
        points: s.points,
        sortOrder: s.sortOrder,
        publishedAt: new Date().toISOString(),
      },
    });
    console.log(`  + created: ${s.slug}`);
  }
}

async function seedProjects(strapi: any, projects: SeedData['projects']) {
  console.log(`\nSeeding ${projects.length} projects...`);
  const slugToDocumentId: Record<string, string> = {};
  for (const p of projects) {
    if (await alreadyExists(strapi, 'api::project.project', p.slug)) {
      console.log(`  - skip (exists): ${p.slug}`);
      const existing = await strapi.documents('api::project.project').findFirst({ filters: { slug: p.slug } });
      slugToDocumentId[p.slug] = existing.documentId;
      continue;
    }
    const heroImageId = await uploadPlaceholder(strapi, p.heroImagePlaceholder);
    const created = await strapi.documents('api::project.project').create({
      data: {
        name: p.name,
        slug: p.slug,
        number: p.number,
        type: p.type,
        status: p.status,
        location: p.location,
        eyebrow: p.eyebrow,
        description: p.description,
        heroImage: heroImageId,
        sortOrder: p.sortOrder,
        seoDescription: p.seoDescription,
        documentationStatus: p.documentationStatus,
        units: p.units,
        publishedAt: new Date().toISOString(),
      },
    });
    slugToDocumentId[p.slug] = created.documentId;
    console.log(`  + created: ${p.slug}${heroImageId ? '' : ' (no hero image — add manually)'}`);
  }
  return slugToDocumentId;
}

async function seedProperties(
  strapi: any,
  properties: SeedData['properties'],
  projectSlugToDocumentId: Record<string, string>
) {
  console.log(`\nSeeding ${properties.length} properties...`);
  for (const item of properties) {
    if (await alreadyExists(strapi, 'api::property.property', item.slug)) {
      console.log(`  - skip (exists): ${item.slug}`);
      continue;
    }
    const imageId = await uploadPlaceholder(strapi, item.imagePlaceholder);
    const projectDocumentId = item.projectSlug ? projectSlugToDocumentId[item.projectSlug] : undefined;
    await strapi.documents('api::property.property').create({
      data: {
        name: item.name,
        slug: item.slug,
        category: item.category,
        location: item.location,
        priceGuide: item.priceGuide,
        description: item.description,
        features: item.features,
        image: imageId,
        project: projectDocumentId,
        publishedAt: new Date().toISOString(),
      },
    });
    console.log(`  + created: ${item.slug}${imageId ? '' : ' (no image — add manually)'}`);
  }
}

async function seedInsights(strapi: any, insights: SeedData['insights']) {
  console.log(`\nSeeding ${insights.length} insights...`);
  for (const i of insights) {
    if (await alreadyExists(strapi, 'api::insight.insight', i.slug)) {
      console.log(`  - skip (exists): ${i.slug}`);
      continue;
    }
    const coverImageId = await uploadPlaceholder(strapi, i.coverImagePlaceholder);
    await strapi.documents('api::insight.insight').create({
      data: {
        title: i.title,
        slug: i.slug,
        category: i.category,
        excerpt: i.excerpt,
        body: i.body,
        readTime: i.readTime,
        publishDate: i.publishDate,
        author: i.author,
        featured: i.featured,
        coverImage: coverImageId,
        videoUrl: i.videoUrl,
        publishedAt: new Date().toISOString(),
      },
    });
    console.log(`  + created: ${i.slug}`);
  }
}

async function seedTeamMembers(strapi: any, teamMembers: SeedData['teamMembers']) {
  console.log(`\nSeeding ${teamMembers.length} team members...`);
  for (const t of teamMembers) {
    const existing = await strapi.documents('api::team-member.team-member').findFirst({
      filters: { name: t.name },
    });
    if (existing) {
      console.log(`  - skip (exists): ${t.name}`);
      continue;
    }
    const photoId = await uploadPlaceholder(strapi, t.photoPlaceholder);
    await strapi.documents('api::team-member.team-member').create({
      data: {
        name: t.name,
        role: t.role,
        note: t.note,
        photo: photoId,
        verified: t.verified,
        sortOrder: t.sortOrder,
        publishedAt: new Date().toISOString(),
      },
    });
    console.log(`  + created: ${t.name}${photoId ? '' : t.photoPlaceholder ? ' (photo upload failed — add manually)' : ''}`);
  }
}

async function run() {
  const raw = fs.readFileSync(DATA_PATH, 'utf-8');
  const data: SeedData = JSON.parse(raw);

  if (process.argv.includes('--dry-run')) {
    runDryRun(data);
    return;
  }

  // Strapi v5's documented standalone-script bootstrap: compileStrapi() reads the project's
  // TS source directly, so this does not require a prior `pnpm build` (the previous
  // `strapiFactory({ distDir: './dist' })` call would have failed on a fresh checkout with
  // no dist/ yet). The admin panel is not served — this only needs the application layer.
  const { compileStrapi, createStrapi } = await import('@strapi/strapi');
  const appContext = await compileStrapi();
  const app = await createStrapi(appContext).load();
  app.log.level = 'error';

  try {
    await seedServices(app, data.services);
    const projectSlugToDocumentId = await seedProjects(app, data.projects);
    await seedProperties(app, data.properties, projectSlugToDocumentId);
    await seedInsights(app, data.insights);
    await seedTeamMembers(app, data.teamMembers);
    console.log('\nSeed complete. Review entries in the admin panel — placeholder images and');
    console.log('property/investment content should be swapped for real photography and copy');
    console.log('before this data is relied on in production.');
  } catch (err) {
    console.error('\nSeed failed partway through:', err);
    console.error('Safe to re-run — already-created entries are skipped by slug.');
    process.exitCode = 1;
  } finally {
    await app.destroy();
    // Strapi keeps timers/connections open after load(); a standalone script needs an
    // explicit exit or the process hangs after the seed finishes.
    process.exit(process.exitCode ?? 0);
  }
}

run();
