# AJIYA Urban Rise — Production Readiness Report

Prepared as the closing deliverable of the Phase 1 production engineering upgrade. Covers
five sprints: cleanup & security, content architecture (CMS), real enquiry processing,
performance, and testing/accessibility/CI-CD. **Updated in a later pass** to reflect the
Postgres migration, production-config hardening, and the real Strapi CMS scaffold — see
section 8 for what changed and section 9/10 for the current deployment checklist.

**Critical honesty note, upfront:** this work was done in a sandboxed environment with no
network access — `pnpm install` could never be run, no dependency was ever actually
installed, and no test suite, dev server, or build was ever actually executed end-to-end.
Every file here was hand-verified as thoroughly as that constraint allows: structural
TypeScript checks against the project's real `tsconfig.json` settings (using hand-built type
stubs where real packages weren't available), real image processing via a locally-available
tool, real WCAG contrast math, and — for the highest-risk hand-written logic (the concurrent
file-write queues) — genuine executed dry-runs outside the test framework, including a
15-way concurrency stress test that empirically validated a race-condition fix. But
**`pnpm install && pnpm check && pnpm lint && pnpm test && pnpm build` has never actually
been run.** That is the real, non-negotiable first step before anything below is trusted.

---

## 1. Engineering audit summary

The original scaffold was a Manus-platform-generated marketing site: a React 19 + Vite
front end and a bare Express static server, with every page's content, contact form, and
newsletter signup hardcoded and functionally simulated (the "success" states were pure UI —
nothing was ever sent anywhere). The audit found:

- **A live secrets leak**: `.project-config.json` shipped with a plaintext JWT secret, an API
  key, and a git remote URL with an embedded access token.
- **Fake functionality**: contact form and newsletter signup always "succeeded" regardless
  of input; nothing was validated, persisted, or sent to anyone.
- **Broken assets in production**: images, favicon, and the brochure PDF were served through
  a Manus-platform-only dev proxy (`/manus-storage/...`) with no equivalent in the shipped
  Express server — all would 404 outside the Manus dev environment.
- **A 4.5MB hero image and a 1.9MB logo**, unoptimized, loaded on every page.
- **Zero tests**, despite `vitest` being an installed dependency.
- **53 unused shadcn UI component files** and 45 unused npm packages — a large fraction of
  the project's total dependency tree was dead weight, confirmed by tracing real usage (not
  just import counts, which were initially misleading due to shadcn files importing each
  other).
- **The error-boundary fallback screen — the exact UI a visitor sees when something breaks —
  was itself broken**: it referenced CSS design tokens that don't exist anywhere in this
  project's actual stylesheet, and displayed raw JS stack traces to end users.
- **A real WCAG AA contrast failure** in production: verified team members' role and bio
  text rendered at approximately 1.2:1 contrast (verified via calculation, not estimated) due
  to a Tailwind opacity utility silently overriding an inherited light-text color on a
  dark-background card variant.

## 2. All changes made

**Sprint 0 — cleanup & security**
- Removed the leaked secrets file, Manus dev-runtime/watermark/debug-collector plugins, and
  all dead OAuth scaffolding.
- Fixed broken image/favicon/brochure paths to point at real local files.

**Sprint 2 — content architecture**
- Designed and implemented 5 Strapi content types (Project, Property, Service, Insight,
  Team Member) with draft/publish workflow and public-read-only permissions.
- Wrote an idempotent migration script moving all hardcoded content into the CMS shape.
- Built a typed fetch client (`client/src/lib/cms-client.ts`) and a generic
  `useCmsResource` + `CmsState` pattern giving every dynamic page genuine
  loading/empty/error/not-found handling — then actually wired it into every page (Home,
  Projects, Project detail, Properties, Services, Service detail, Insights, Article detail,
  About), not just the first one demonstrated.

**Sprint 1 — real enquiry processing**
- Shared zod validation schema used by both client and server (`shared/enquiry.ts`).
- Rate limiting, honeypot bot filtering, server-side persistence, webhook notification, and
  only-on-real-success responses for both the contact form and the newsletter signup.
- Security headers (CSP, X-Frame-Options, Referrer-Policy, Permissions-Policy, conditional
  HSTS), a same-origin CORS guard, and a generic error handler that never leaks internals.

**Sprint 3 — performance**
- Actually compressed the real image assets (sharp was available in this environment): the
  4.5MB hero became a responsive WebP set (20KB–232KB across 5 breakpoints); the 1.9MB logo
  became a 26KB WebP.
- Fixed a reduced-motion bug where a blanket `!important` rule was silently defeating a
  loading spinner's intended "slow, don't freeze" behavior.
- Removed 53 unused shadcn UI files, 3 orphaned hooks, and 45 unused npm packages after
  tracing genuine application-level usage.
- Implemented real route-level code splitting via `React.lazy`.

**Sprint 4 — testing & accessibility**
- Unit tests for validation, rate limiting, and extracted pure functions.
- Real HTTP integration tests for both API routes (an actual Express instance on a real
  port, hit with native `fetch`).
- E2E tests for all three directive-specified critical journeys.
- Fixed an ARIA spec violation (`aria-hidden` on a container with a focusable descendant) in
  both honeypot fields.
- Computed real WCAG contrast ratios and fixed two genuine failures (see audit summary
  above); flagged a broader sitewide "eyebrow" label opacity pattern as a design decision
  rather than unilaterally rewriting it.

**Sprint 5 — CI/CD & monitoring**
- ESLint flat config added (none existed before).
- GitHub Actions CI workflow: typecheck, lint, unit/integration tests, build, dependency
  audit, then a separate E2E job.
- Docker-based deploy workflow with staging auto-deploy and production gated behind a
  GitHub Environment approval step.
- `/api/health` endpoint for uptime monitoring and the Docker healthcheck.
- Provider-agnostic error monitoring on both client and server, with a distinct, louder
  "failed enquiry" alert path (a lost lead is worse than a generic error).
- Rewrote `ErrorBoundary` to use real design tokens, hide stack traces in production, and
  actually report caught errors (it previously did neither).

## 3. Security improvements

- Removed a live secrets leak (rotate the exposed keys — deleting the file doesn't
  invalidate them).
- Real server-side validation on every public input (never trusts client-side validation
  alone).
- Rate limiting (5 enquiries / 10 min / IP) and honeypot bot filtering.
- CSP, X-Frame-Options, Referrer-Policy, Permissions-Policy, conditional HSTS.
- Same-origin CORS guard on the API.
- Generic error responses — no stack traces, file paths, or internals ever reach the client
  (verified by re-checking `ErrorBoundary` specifically, since it was the one place that
  previously did leak a stack trace).
- Dependency audit as a CI gate.

## 4. Performance improvements

- Hero image: ~220x smaller at the size mobile visitors actually download (4.5MB → ~20KB).
- Logo: 1.9MB → 26KB.
- 45 unused npm packages removed — real install-time and audit-surface reduction.
- Route-level code splitting.
- Native lazy-loading confirmed already correct on all images.
- Reduced-motion support audited and a real bug in it fixed.

## 5. Regression risks

- **Content migration risk**: the CMS migration script has never been run against a live
  Strapi instance. First real run should be treated as a dry run — verify every entry in the
  admin panel before trusting it.
- **Image path changes**: every image reference changed (Manus proxy → local paths → CMS
  media). A full visual QA pass across every page is warranted.
- **Dependency removal**: 45 packages were removed based on careful usage tracing, but this
  was never verified with an actual build. `pnpm build` after `pnpm install` is the real
  check — if anything was missed, it will fail loudly and immediately, not silently.
- **New required env var**: `VITE_CMS_URL` must be set for the front end to reach the CMS at
  all in any environment other than local dev against `localhost:1337`.
- **Enquiry/newsletter data model change**: property "request information" links now pass a
  specific property slug instead of just a category — this is a deliberate improvement (see
  Sprint 1), but anything downstream expecting the old category-only format would need
  updating (nothing currently does, but noted for completeness).

## 6. Tests added

- Unit: enquiry/newsletter schema validation (11 cases), rate limiter (4 cases), leadStore
  and newsletterStore concurrency (7 cases combined, including a 20-way and a 15-way
  concurrent-write stress test), `resolveMediaUrl` (4 cases), `initials`/`filterProperties`
  (11 cases).
- Integration: enquiry API route (5 cases: valid submission, invalid input, missing fields,
  honeypot, rate-limit trip), newsletter API route (4 cases).
- E2E: all three directive-specified journeys (Home→Projects→Project detail→Enquiry;
  Properties→Request info→Success; Services→Service detail→Contact), plus invalid-submission
  and not-found/empty-state coverage for each.

## 7. Tests passed

**Executed and genuinely verified, right now, in this environment:**
- The leadStore/newsletterStore concurrency dry-runs (plain Node, no framework) — passed,
  including the 15-way race-condition stress test.
- The image compression (sharp) — passed, file sizes independently confirmed.
- WCAG contrast calculations — computed via real OKLCH→sRGB conversion math, cross-checked
  against actual JSX/CSS to confirm which combinations are genuinely rendered.
- Structural TypeScript checks on every touched file, against the project's real
  `tsconfig.json` compiler options.

**Written but never executed** (no installed dependencies, no network access):
- The vitest suite itself (`pnpm test`).
- The Playwright E2E suite (`pnpm test:e2e`) — no browser binaries available to install.
- `pnpm build`, `pnpm lint`, `pnpm check` as actual command invocations (the underlying
  logic was checked structurally, but the commands themselves were never run).
- The GitHub Actions workflows — YAML-validated for syntax, never run in real GitHub
  Actions.

## 8. Remaining limitations

- ~~Lead/subscriber persistence is a stopgap (JSONL on local disk).~~ **Resolved in a later
  pass**: `server/leadStore.ts`/`server/newsletterStore.ts` now persist to PostgreSQL (see
  `migrations/001_create_leads_and_subscribers.sql`, `server/db.ts`). CSP, CORS, trust-proxy
  handling, and environment validation were hardened in the same pass (`server/config.ts`,
  `server/cors.ts`, hardened `server/security.ts`/`server/monitoring.ts`/`server/index.ts`).
  `cms/` was also turned into a real, runnable Strapi v5 project with an executable,
  offline-tested migration script (`cms/scripts/seed.ts` + `validate-seed-data.js`) — see
  `cms/SETUP.md`. None of this has been run with real network access either (same caveat as
  everything else in this document) — the *code* is done and offline-verified where
  possible; installing dependencies and booting real services is still outstanding.
- **No real error-tracking or notification provider is connected.** Both monitoring modules
  and the lead-notification webhook fall back to console logging / an optional generic
  webhook. A real Sentry-equivalent and a real Slack/email integration are follow-up work,
  not done here.
- **Properties have no dedicated detail page** — only expanded cards on the listing page.
  The directive's Journey 2 ("Properties → Detail → Request information") was written
  against this reality with a note explaining the gap, rather than pretending a detail page
  exists.
- **The deploy workflow's actual deployment steps are placeholders.** This repository never
  specified an actual hosting target, so `deploy.yml` builds and pushes a real Docker image
  to GHCR but the "deploy this image somewhere" steps are explicitly marked TODO.
- **The sitewide "eyebrow" label contrast pattern** (flagged in Sprint 4) remains unresolved
  — a design decision, not a code fix, and intentionally not made unilaterally.
- **Insights article body rendering is plain-paragraph-per-blank-line**, not a real
  markdown/rich-text renderer, since no such library was available to install. Fine for
  today's content; revisit if editors start using richer formatting in Strapi's rich-text
  field.
- Real photography still needed — `signature`/`urban`/`opportunity` are Unsplash
  placeholders, flagged with a `TODO` in `data/site.ts` since before this engagement began.

## 9. Production deployment instructions

1. **Rotate the leaked secrets** referenced in section 3 — do this before anything else,
   independent of the rest of this list.
2. Provision a PostgreSQL database and run `migrations/001_create_leads_and_subscribers.sql`
   against it.
3. `pnpm install` — the real first verification step. If this fails, stop and fix before
   proceeding.
4. `pnpm check && pnpm lint && pnpm test` — must all pass.
5. Stand up Strapi per `cms/SETUP.md` (now a real project — `cd cms && pnpm install`), run
   `node scripts/validate-seed-data.js` before the seed script, run the seed script itself,
   verify content in the admin panel, and swap placeholder images for real photography.
6. Set required environment variables for the main app (see `.env.example`): `DATABASE_URL`,
   `DATABASE_SSL=true`, `VITE_CMS_URL`, `ALLOWED_ORIGINS` (plural — a comma-separated exact
   allowlist, not a single optional origin), `TRUST_PROXY` (a hop count, never `true`),
   `ENQUIRY_WEBHOOK_URL` (recommended), `MONITORING_WEBHOOK_URL` (recommended). Set the CMS's
   own variables per `cms/.env.example`.
7. `pnpm build`, then smoke-test locally with `pnpm start`.
8. `pnpm exec playwright install --with-deps chromium && pnpm test:e2e` against the local
   build.
9. Push to a GitHub repo, configure the `staging` and `production` GitHub Environments
   (the latter with required reviewers), and let `.github/workflows/deploy.yml` build and
   push the Docker image.
10. Fill in the deploy workflow's TODO steps for the actual hosting target. No data volume
    is needed for the main app anymore — leads/subscribers live in Postgres — but the CMS's
    uploaded media still needs either a persistent volume or, better, a cloud upload
    provider (see `cms/SETUP.md` Step 5) before it holds real content.
11. Point external uptime monitors at `/api/health` (liveness) and `/api/health/ready`
    (readiness — checks the database).

## 10. Go / No-Go recommendation

**No-Go for production traffic today.** Not because the engineering is incomplete — five
sprints of real, substantive work are behind this — but because of one honest,
unavoidable fact: **none of it has actually been run.** `pnpm install` has never executed in
this environment. That is not a formality; it is the line between "carefully reviewed code"
and "verified working software."

**Go, conditional on:**
1. `pnpm install && pnpm check && pnpm lint && pnpm test && pnpm build` all passing for
   real, with any issues that surface fixed — for both the main app and `cms/`.
2. The E2E suite passing against a real running instance with seeded CMS content.
3. Secrets rotated.
4. The Postgres migration actually applied and the seed script actually run against a live
   Strapi instance — both are now written and offline-tested (see section 8), but "the code
   is correct" and "it ran successfully against real infrastructure" are still two different
   claims until the second one happens.
5. A real photography pass replacing the three remaining Unsplash placeholders.

None of these are large — this is a "run it for real and fix what breaks" gap, not a
redesign. But it is a gap, and the honest recommendation is to close it before calling this
production-ready.
