# AJIYA Content Layer — Strapi CMS

`cms/` is a real, runnable Strapi v5 (TypeScript) project — the five Phase 1 content types
(Project, Property, Service, Insight, Team Member), a bootstrap that auto-grants public
read access, environment-driven SQLite/Postgres config, and a content-migration script are
all wired in place. Nothing here needs to be copied into a separately-scaffolded project
anymore.

This sandbox has no network access, so `pnpm install` and an actual `pnpm develop` boot have
not been run here — do that first, on a machine with network access, before trusting this
in staging. Everything that *can* be verified without a network (schema JSON validity, the
migration data's structural/referential integrity) has been checked — see Step 4.

## 1. Install and boot

```bash
cd cms
pnpm install
cp .env.example .env
# Edit .env: generate real values for every secret (openssl rand -base64 32 works for most).
pnpm develop
```

Open `http://localhost:1337/admin` and create the first admin user. Confirm all five content
types (Project, Property, Service, Insight, Team Member) appear in the Content-Type Builder
with the fields listed in the table below.

## 2. Public read permissions — now automatic

`src/index.ts`'s `bootstrap()` hook grants the Public role `find`/`findOne` on all five
content types on every boot (idempotent — checks before creating, so it's safe on every
restart). `create`/`update`/`delete` are never touched — content changes still only happen
through the admin panel or an authenticated service token. Verify it worked under
**Settings → Users & Permissions → Roles → Public** if in doubt; it should already be checked.

## 3. Database

- **Local dev:** SQLite, the default (`DATABASE_CLIENT=sqlite` in `.env.example`) — zero setup.
- **Staging/production:** set `DATABASE_CLIENT=postgres` and the `DATABASE_*`/`DATABASE_URL`
  variables (see `config/database.ts`). Put the DB on the same private network as the Strapi
  service — never expose it publicly. This is a *separate* Postgres database from the main
  site's `leads`/`newsletter_subscribers` tables (see `../migrations/`) — don't share one
  instance's credentials across both without a good reason.

## 4. Migrate the existing hardcoded content

`scripts/seed.ts` migrates the content that used to live in `client/src/data/site.ts` (5
services, 2 projects, 4 curated properties, 3 insight articles, 4 team members) into Strapi.
It's idempotent — safe to re-run if it fails partway through, since it skips any entry whose
slug already exists.

**Test it before running it for real — no Strapi, database, or network needed:**

```bash
cd cms
node scripts/validate-seed-data.js
# or, equivalently, via the seed script itself:
pnpm exec ts-node --transpile-only scripts/seed.ts --dry-run
```

This checks `scripts/seed-data.json` against the actual `schema.json` files: every required
field present, enum values valid, slugs well-formed and unique, every `property.projectSlug`
resolves to a real project, and every referenced placeholder image exists on disk. It has
been run against the current `seed-data.json` in this repo — it passes, with warnings that
the placeholder images haven't been copied into `scripts/placeholder-images/` yet (expected;
see below).

Once that passes:

```bash
cp ../client/public/images/ajiya-hero-1920.webp scripts/placeholder-images/ajiya-hero.jpg
pnpm install
pnpm exec ts-node --transpile-only scripts/seed.ts
```

**Not yet run against a live instance** — read the console output carefully on first run and
check the admin panel afterward.

Every project/property in the migrated data currently points at the same placeholder hero
photo — none of this is real project photography. Swap these for real images via the admin
panel before this content goes live; the seed script's closing log message repeats this
reminder. One dead data export, `propertyCategories` in `site.ts`, was never referenced by
any page and was intentionally left out of the migration — safe to delete from `site.ts`.

## 5. Uploads and production storage

`config/plugins.ts` uses Strapi's local disk upload provider by default. That's fine for
development, but most hosting platforms give the container an **ephemeral filesystem** — the
same problem the main site's old JSONL lead store had before this audit moved it to
Postgres (see `../server/leadStore.ts`'s history). Uploaded media will be lost on every
redeploy unless this is swapped for a cloud provider
(`@strapi/provider-upload-aws-s3`, `@strapi/provider-upload-cloudinary`, etc.) before
production traffic — or the seed script — relies on it.

## Content types in this package

| Type | Purpose | Key relation |
|---|---|---|
| `project` | Signature Estate, Urban Rise Estate, future developments | has many `property` |
| `property` | Curated listings on the Properties page | optionally belongs to `project` |
| `service` | The five service lines (Development, Sales, Investment, Management, Construction) | none |
| `insight` | Articles for the Insights hub | none |
| `team-member` | About page team grid | none |

All five have `draftAndPublish` enabled — content editors can save drafts and only publish
when ready; the public API only ever returns published entries.

## Status

- ~~Define the five content types~~ — done
- ~~Migrate hardcoded content from `data/site.ts`~~ — done, seed data validated offline (Step 4)
- ~~Build a typed fetch client and wire it into every dynamic page~~ — done, via
  `client/src/lib/cms-client.ts` + `useCmsResource`/`CmsState` across Home, Projects, Project
  detail, Properties, Services, Service detail, Insights, Article detail, and About
- ~~Scaffold a real, deployable Strapi project~~ — done (this pass): `package.json`,
  `config/*.ts`, `src/index.ts` bootstrap, `.env.example`
- **Outstanding:** run `pnpm install` + `pnpm develop` against a live instance (needs network
  access this environment doesn't have) and actually execute the seed script; point the
  enquiry form's "related project/property" fields at real Strapi IDs once the CMS is live.
