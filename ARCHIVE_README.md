# AJIYA Urban Rise Complete Website Scaffold

This archive contains the complete current AJIYA Urban Rise frontend scaffold, including React/Tailwind source, route-ready pages, configuration, design direction notes, Instagram/reference research, the downloadable brochure, brochure source, exact supplied logo source, available image assets, and shared project reference documents.

## Included website features

The client application includes the AJIYA brand homepage, About, Services, Service Detail, Projects, Project Detail, Properties, Invest, Insights, Article, Contact, legal placeholder, and 404 routes. It also includes feature-based property discovery with keyword, category, and indicative maximum price-range filtering; a downloadable Phase 1 brochure CTA; transparent testimonial-ready content that does not publish unapproved reviews; Meet the Team content with approval-needed placeholders; Why Choose Us positioning; an animated personalized newsletter thank-you popup; and a floating WhatsApp widget linked to +234 903 373 4656.

## Run locally

From the `ajiya-urban-rise/` directory, run `pnpm install` and then `pnpm dev`. Use `pnpm check` for TypeScript validation and `pnpm build` for a production bundle.

## Assets and content

The `assets/` directory contains the available local visual sources, including `ajiya-logo-original.JPG`, `ajiya-logo-transparent.png`, `ajiya-hero-reference.jpg`, and the downloadable `ajiya-urban-rise-brochure.pdf`. `brochure-source/` contains the Typst source and build manifest used to create the brochure. `project-reference/` contains the shared AJIYA briefs and specification documents.

The frontend references managed web asset paths for deployed media and uses editorial image URLs for current fallback imagery. Replace these with approved AJIYA project photography and final project facts as they become available. The newsletter and contact flows are frontend confirmation states only; connect them to an approved email platform, inbox, CRM, or backend before production lead capture.

Dependency folders, build output, Git metadata, and local development logs are intentionally excluded so this remains a portable source scaffold.
