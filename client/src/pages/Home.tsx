// Concrete & Canopy style reminder: build with editorial asymmetry, calm material contrast, clear hierarchy, and conversion without pressure.
import { FormEvent, useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowRight, ArrowUpRight, Building2, Check, Compass, Handshake, Landmark, Layers3, MapPin, ShieldCheck } from "lucide-react";
import { Link } from "wouter";
import { assets, philosophy, trustReasons, areasCovered, officeHours, faqs } from "@/data/site";
import { PageShell } from "@/components/SiteChrome";
import { CmsState } from "@/components/CmsState";
import { useCmsResource } from "@/hooks/useCmsResource";
import { submitEnquiry } from "@/lib/api-client";
import { initials, filterProperties } from "@/lib/format";
import { mergeRefs } from "@/lib/utils";
import { gsap, useGSAP, motionConditions } from "@/lib/motion";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { useSpotlightRef, useSpotlightGroup } from "@/hooks/useSpotlight";
import { enquiryInterestOptions } from "@shared/enquiry";
import {
  getInsightBySlug,
  getInsights,
  getProjectBySlug,
  getProjects,
  getProperties,
  getPropertyBySlug,
  getServiceBySlug,
  getServices,
  getTeamMembers,
  resolveMediaUrl,
  type Insight,
  type Project,
  type Property,
  type Service,
  type TeamMember,
} from "@/lib/cms-client";

// TODO: swap for the real production domain before launch (also used in .env.example / index.html).
const SITE_ORIGIN = "https://ajiyaurbanrise.com";

/** Turns "some-slug" into "Some Slug" for the auto-generated breadcrumb labels below. */
function titleCaseSlug(segment: string): string {
  return segment.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

interface SeoProps {
  title: string;
  description: string;
  /** Relative ("/images/x.jpg") or absolute (CMS media) URL. Falls back to the brand hero image. */
  image?: string;
  type?: "website" | "article";
  /** Extra Article-only fields — only meaningful when type="article". */
  article?: { publishedTime?: string; author?: string };
}

/**
 * Updates the document per navigation: title, meta description, OG/Twitter tags (including
 * canonical URL and a page image), and two JSON-LD blocks — an auto-generated BreadcrumbList
 * from the current path, and (for type="article") an Article schema.
 *
 * Same honest limit as before: this reaches the browser tab and JS-executing crawlers (e.g.
 * Googlebot), but NOT most social-preview crawlers (Facebook, WhatsApp, Twitter/X, LinkedIn) —
 * those fetch raw HTML without running JavaScript, so they only ever see the static baseline
 * tags in index.html. Real per-page social previews need server-side rendering or a
 * prerendering step; still out of scope for this pass.
 */
function Seo({ title, description, image, type = "website", article }: SeoProps) {
  useEffect(() => {
    const fullTitle = `${title} — AJIYA Urban Rise`;
    document.title = fullTitle;

    const path = window.location.pathname;
    const canonicalUrl = `${SITE_ORIGIN}${path === "/" ? "" : path}`;
    const absoluteImage = !image ? `${SITE_ORIGIN}/images/ajiya-hero-fallback.jpg` : image.startsWith("http") ? image : `${SITE_ORIGIN}${image}`;

    const setMeta = (attr: "name" | "property", key: string, content: string) => {
      let el = document.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, key);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };
    setMeta("name", "description", description);
    setMeta("property", "og:title", fullTitle);
    setMeta("property", "og:description", description);
    setMeta("property", "og:type", type);
    setMeta("property", "og:url", canonicalUrl);
    setMeta("property", "og:image", absoluteImage);
    setMeta("name", "twitter:title", fullTitle);
    setMeta("name", "twitter:description", description);
    setMeta("name", "twitter:image", absoluteImage);

    let canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", canonicalUrl);

    const setJsonLd = (id: string, data: object | null) => {
      let script = document.getElementById(id) as HTMLScriptElement | null;
      if (!data) {
        script?.remove();
        return;
      }
      if (!script) {
        script = document.createElement("script");
        script.id = id;
        script.type = "application/ld+json";
        document.head.appendChild(script);
      }
      script.textContent = JSON.stringify(data);
    };

    const segments = path.split("/").filter(Boolean);
    setJsonLd("ld-breadcrumb", {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: SITE_ORIGIN },
        ...segments.map((segment, index) => ({
          "@type": "ListItem",
          position: index + 2,
          name: index === segments.length - 1 ? title : titleCaseSlug(segment),
          item: `${SITE_ORIGIN}/${segments.slice(0, index + 1).join("/")}`,
        })),
      ],
    });

    setJsonLd(
      "ld-article",
      type === "article"
        ? {
            "@context": "https://schema.org",
            "@type": "Article",
            headline: title,
            description,
            image: absoluteImage,
            url: canonicalUrl,
            datePublished: article?.publishedTime,
            author: article?.author ? { "@type": "Person", name: article.author } : { "@type": "Organization", name: "AJIYA Urban Rise" },
            publisher: { "@type": "Organization", name: "AJIYA Urban Rise", logo: { "@type": "ImageObject", url: `${SITE_ORIGIN}/images/ajiya-logo.webp` } },
          }
        : null
    );
  }, [title, description, image, type, article?.publishedTime, article?.author]);
  return null;
}

export function SectionHeading({ eyebrow, title, copy, light = false }: { eyebrow: string; title: string; copy?: string; light?: boolean }) {
  return (
    <div className={`section-heading ${light ? "section-heading--light" : ""}`}>
      <div className="flex items-center gap-3"><span className="section-rule" /> <span className="eyebrow">{eyebrow}</span></div>
      <h2>{title}</h2>
      {copy && <p>{copy}</p>}
    </div>
  );
}

/**
 * A small custom brand mark (three ascending bars, echoing "Urban Rise") for signature spots
 * only — the hero eyebrow, for now. Deliberately not a replacement for lucide-react, which
 * stays as-is for ordinary UI icons (arrows, pins, checks); this is a one-off accent, not the
 * start of a parallel icon system.
 */
function RiseMark({ className }: { className?: string }) {
  return <svg viewBox="0 0 18 14" width="14" height="11" fill="none" className={className} aria-hidden="true"><rect x="0" y="9" width="3" height="5" fill="currentColor" /><rect x="7.5" y="5" width="3" height="9" fill="currentColor" /><rect x="15" y="0" width="3" height="14" fill="currentColor" /></svg>;
}

function ArrowLink({ href, children, light = false }: { href: string; children: React.ReactNode; light?: boolean }) {
  return <Link href={href} className={`arrow-link ${light ? "arrow-link--light" : ""}`}>{children}<ArrowUpRight size={16} strokeWidth={1.7} /></Link>;
}

function ImageFrame({ src, alt, className = "", eager = false }: { src: string; alt: string; className?: string; eager?: boolean }) {
  return <div className={`image-frame ${className}`}><img src={src} alt={alt} loading={eager ? "eager" : "lazy"} /></div>;
}

function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setVisible(true);
        observer.disconnect();
      }
    }, { threshold: 0.18, rootMargin: "0px 0px -8% 0px" });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return [ref, visible] as const;
}

function BrochureCta({ compact = false }: { compact?: boolean }) {
  return <a href={assets.brochure} download="ajiya-urban-rise-brochure.pdf" className={`brochure-cta ${compact ? "brochure-cta--compact" : ""}`}><span className="brochure-cta-mark">↓</span><span><small>Download the brochure</small><strong>AJIYA Urban Rise / Phase 1</strong></span><ArrowUpRight size={16} /></a>;
}

function TeamSection() {
  const state = useCmsResource(() => getTeamMembers(), []);
  const gridRef = useScrollReveal<HTMLDivElement>(".team-card", [state.status]);
  return <section className="section-pad bg-stone"><div className="container"><div className="grid gap-10 lg:grid-cols-[0.7fr_1.3fr] lg:items-end"><SectionHeading eyebrow="The people behind the work" title="Meet the team shaping what’s next." copy="A connected group of people bringing leadership, development, advisory, and delivery into the same conversation." /><BrochureCta compact /></div><div className="team-grid mt-14" ref={gridRef}><CmsState state={state} emptyMessage="Team profiles are being finalized. Reach out and we'll connect you with the right person directly.">{(members) => members.map((member, index) => <div className={`team-card ${member.verified ? "team-card--featured" : ""}`} key={member.documentId}><div className="team-index">0{index + 1}</div><div className="team-avatar">{member.photo?.url ? <img src={resolveMediaUrl(member.photo.url)} alt={member.photo.alternativeText || member.name} /> : initials(member.name)}</div><div className="mt-auto"><p className="eyebrow text-charcoal/45">{member.role}</p><h3>{member.name}</h3><p className="mt-3 text-sm leading-6 text-charcoal/60">{member.note}</p>{!member.verified && <span className="team-note">Profile details to be confirmed</span>}</div></div>)}</CmsState></div></div></section>;
}

function useServicesList() {
  return useCmsResource(() => getServices(), []);
}

function ServiceRowList() {
  const state = useServicesList();
  const listRef = useScrollReveal<HTMLDivElement>(".service-row", [state.status]);
  const spotlightRef = useSpotlightGroup<HTMLDivElement>(".service-row", [state.status]);
  return <div className="service-list mt-14" ref={mergeRefs(listRef, spotlightRef)}><CmsState state={state} emptyMessage="Our service pages are being updated. Get in touch to learn more.">{(list) => list.map((service) => <Link href={`/services/${service.slug}`} key={service.documentId} className="service-row group"><span className="service-index">{service.index}</span><span className="service-name">{service.title}</span><span className="service-cue">{service.cue}</span><ArrowUpRight className="service-icon" size={20} /></Link>)}</CmsState></div>;
}

function ServiceCapabilityGrid() {
  const state = useServicesList();
  const gridRef = useScrollReveal<HTMLDivElement>("a", [state.status]);
  return <div className="mt-12 grid gap-px bg-charcoal/10 sm:grid-cols-2 lg:grid-cols-5" ref={gridRef}><CmsState state={state} emptyMessage="Our services are being updated.">{(list) => list.map((service) => <Link href={`/services/${service.slug}`} className="bg-stone p-6 transition-colors hover:bg-limestone" key={service.documentId}><span className="eyebrow text-charcoal/40">{service.index}</span><h3 className="mt-14 font-display text-xl leading-tight">{service.title}</h3><ArrowUpRight className="mt-8 text-canopy" size={18} /></Link>)}</CmsState></div>;
}

function ServiceDetailList() {
  const state = useServicesList();
  return <div className="service-detail-list"><CmsState state={state} emptyMessage="Our services are being updated. Get in touch to learn more.">{(list) => list.map((service) => <Link href={`/services/${service.slug}`} className="service-detail-row" key={service.documentId}><span className="service-index">{service.index}</span><div><h2>{service.title}</h2><p>{service.shortDescription}</p></div><span className="service-detail-arrow"><ArrowUpRight size={20} /></span></Link>)}</CmsState></div>;
}

function Home() {
  const heroSectionRef = useRef<HTMLElement>(null);
  const heroMediaRef = useRef<HTMLDivElement>(null);
  const quoteSectionRef = useRef<HTMLDivElement>(null);
  const quoteMarkRef = useRef<HTMLSpanElement>(null);
  const quoteTextRef = useRef<HTMLParagraphElement>(null);
  const quoteLineRef = useRef<HTMLSpanElement>(null);
  const philosophyGridRef = useScrollReveal<HTMLDivElement>(".philosophy-step", []);
  const investmentStepsRef = useScrollReveal<HTMLDivElement>(".investment-step", []);
  const whyGridRef = useScrollReveal<HTMLDivElement>(".why-item", []);

  useGSAP(() => {
    const mm = gsap.matchMedia();

    mm.add(motionConditions, (context) => {
      const { isMobile, reduceMotion } = context.conditions as { isMobile: boolean; reduceMotion: boolean };

      // Hero parallax: the background media drifts down slower than scroll speed as the
      // hero scrolls past, giving it depth. This is a plain scroll-scrubbed transform (no
      // pin), which is safe on mobile too — only reduced motion gets the static fallback.
      if (heroMediaRef.current) {
        if (reduceMotion) {
          gsap.set(heroMediaRef.current, { scale: 1.03, y: 0 });
        } else {
          gsap.set(heroMediaRef.current, { scale: 1.06 });
          gsap.to(heroMediaRef.current, {
            y: "16%",
            ease: "none",
            scrollTrigger: {
              trigger: heroSectionRef.current,
              start: "top top",
              end: "bottom top",
              scrub: true,
            },
          });
        }
      }

      // Pinned quote: briefly holds the quote panel in view while the mark, copy, and
      // underline draw in, then releases. Pin is desktop-only — scroll-jacking via
      // position:fixed is the one pattern in this whole motion layer that's genuinely
      // unreliable on mobile Safari (see REDESIGN_SPRINT_PLAN.md), so mobile gets a plain,
      // non-pinned fade-in instead of nothing. Reduced motion skips both — the quote is still
      // fully readable either way, just without the choreography.
      if (quoteSectionRef.current && quoteMarkRef.current && quoteTextRef.current && quoteLineRef.current) {
        if (reduceMotion) {
          // no-op: leave the quote in its natural, fully-visible state
        } else if (isMobile) {
          gsap.from([quoteMarkRef.current, quoteTextRef.current, quoteLineRef.current], {
            autoAlpha: 0,
            y: 20,
            duration: 0.7,
            ease: "power2.out",
            stagger: 0.12,
            scrollTrigger: { trigger: quoteSectionRef.current, start: "top 80%" },
          });
        } else {
          gsap.timeline({
            scrollTrigger: {
              trigger: quoteSectionRef.current,
              start: "top top",
              end: "+=70%",
              scrub: 1,
              pin: true,
            },
          })
            .from(quoteMarkRef.current, { autoAlpha: 0, y: 32, duration: 1 })
            .from(quoteTextRef.current, { autoAlpha: 0, y: 24, duration: 1 }, "<0.1")
            .from(quoteLineRef.current, { scaleX: 0, transformOrigin: "left center", duration: 1 }, "<0.1");
        }
      }
    });

    // matchMedia's own revert (triggered by useGSAP's cleanup calling ctx.revert(), which
    // reverts everything created inside this scope, matchMedia included) handles teardown —
    // no separate cleanup needed here.
  }, []);

  return <PageShell context="AJIYA Urban Rise"><Seo title="Creating Opportunities. Building Lasting Value." description="AJIYA Urban Rise is an Abuja-based real-estate development, investment, property sales, management, and construction company." image={assets.heroFallback} />
    <section className="hero-section" ref={heroSectionRef}>
      <div className="hero-media brand-hero-bg" ref={heroMediaRef} />
      <div className="hero-overlay" />
      <div className="container relative z-10 flex min-h-[calc(100svh-76px)] flex-col justify-end pb-14 pt-36 md:pb-20 lg:min-h-[calc(100svh-76px)]">
        <div className="max-w-3xl animate-rise">
          <p className="eyebrow inline-flex items-center gap-2 text-limestone/70"><RiseMark />Property, place, possibility</p>
          <h1 className="hero-title">Creating opportunities.<br /><em>Building lasting value.</em></h1>
          <p className="hero-copy">AJIYA Urban Rise is shaping a more considered future for property and urban growth in Nigeria — one conversation, one place, one lasting opportunity at a time.</p>
          <div className="mt-8 flex flex-wrap gap-3"><Link href="/projects" className="button button--cream">Explore our projects <ArrowUpRight size={16} /></Link><Link href="/contact" className="button button--ghost-light">Talk to an expert <ArrowRight size={16} /></Link></div><BrochureCta />
        </div>
        <div className="mt-16 flex items-end justify-between border-t border-limestone/25 pt-5 text-[0.66rem] uppercase tracking-[0.2em] text-limestone/55"><span>Abuja · Nigeria</span><a href="#about" className="inline-flex items-center gap-2 transition-colors hover:text-limestone">Scroll to explore <ArrowDown size={14} /></a><span className="hidden sm:inline">Est. for what’s next</span></div>
      </div>
    </section>

    <section id="about" className="section-pad bg-limestone">
      <div className="container grid gap-14 lg:grid-cols-[0.8fr_1.1fr] lg:gap-24">
        <div className="relative"><div className="vertical-label">01 / ABOUT AJIYA</div><div className="about-image-wrap"><ImageFrame src={assets.opportunity} alt="Professionals reviewing a site plan on an emerging Abuja property site" className="about-image" /><div className="about-stamp">Land<br /><span>to</span><br />legacy</div></div></div>
        <div className="flex flex-col justify-center"><SectionHeading eyebrow="A better beginning" title="Building more than properties." copy="AJIYA exists to make the path from opportunity to value feel clearer. We bring together development, sales, investment, management, and construction to create places that work for the people and futures inside them." /><div className="mt-10 grid gap-4 border-t border-charcoal/15 pt-6 sm:grid-cols-2"><div><p className="eyebrow text-charcoal/45">Our mission</p><p className="mt-3 max-w-sm text-[0.95rem] leading-7 text-charcoal/70">To become a leading real-estate company in Nigeria by providing affordable homes and valuable land investments.</p></div><div><p className="eyebrow text-charcoal/45">Our philosophy</p><p className="mt-3 font-display text-2xl leading-tight text-charcoal">Creating opportunities.<br />Building lasting value.<br />Leaving a legacy.</p></div></div><ArrowLink href="/about" >Discover our story</ArrowLink></div>
      </div>
      <div className="container mt-16 border-t border-charcoal/15 pt-8"><div className="grid gap-0 md:grid-cols-4" ref={philosophyGridRef}>{philosophy.map((item, index) => <div key={item.label} className="philosophy-step"><span className="eyebrow text-charcoal/40">0{index + 1}</span><h3>{item.label}</h3><p>{item.copy}</p>{index < philosophy.length - 1 && <ArrowDown className="philosophy-arrow md:hidden" size={18} />}</div>)}</div></div>
    </section>

    <section className="section-pad section-pad--tight bg-stone">
      <div className="container"><SectionHeading eyebrow="How we help" title="One perspective. Five ways forward." copy="From the first question to the finished place, our work is connected by a belief in clear thinking and lasting value." /><ServiceRowList /></div>
    </section>

    <section className="section-pad bg-charcoal text-limestone">
      <div className="container"><div className="flex flex-col justify-between gap-8 md:flex-row md:items-end"><SectionHeading light eyebrow="Selected developments" title="Places with a point of view." copy="Explore the developments that express AJIYA’s belief in opportunity, community, and the future of Abuja." /><ArrowLink href="/projects" light>View all projects</ArrowLink></div><FeaturedProjects /></div>
    </section>

    <section className="section-pad bg-limestone overflow-hidden"><div className="container grid gap-12 lg:grid-cols-[1fr_1.1fr] lg:gap-24"><div className="lg:pt-12"><SectionHeading eyebrow="A view of urban growth" title="The future is not a skyline. It is a place people can belong to." copy="We see real estate as more than an asset class. It is opportunity, security, growth, community, and a foundation for legacy." /><div className="mt-10 grid grid-cols-2 gap-px bg-charcoal/10 border border-charcoal/10">{["Opportunity", "Security", "Growth", "Community"].map((item, i) => <div key={item} className="bg-limestone px-4 py-5 sm:px-6"><span className="eyebrow text-charcoal/40">0{i + 1}</span><p className="mt-3 font-display text-xl">{item}</p></div>)}</div></div><div className="urban-quote" ref={quoteSectionRef}><span className="urban-quote-mark" ref={quoteMarkRef}>“</span><p ref={quoteTextRef}>When the place is right, the next chapter feels possible.</p><span className="urban-quote-line" ref={quoteLineRef} /></div></div></section>

    <section className="section-pad bg-canopy text-limestone"><div className="container grid gap-12 lg:grid-cols-[0.75fr_1fr] lg:gap-24"><div><p className="eyebrow text-limestone/60">Invest with AJIYA</p><h2 className="display-title mt-5">Think beyond today.<br /><em>Build toward value.</em></h2><p className="mt-7 max-w-md text-[0.96rem] leading-7 text-limestone/70">We help investors see the property opportunity inside a location, a development, and the work that makes a future more valuable.</p><ArrowLink href="/invest" light>Explore investment opportunities</ArrowLink></div><div className="investment-panel"><div className="investment-number">01</div><div className="investment-track"><span className="investment-dot active" /><span className="investment-line" /><span className="investment-dot" /><span className="investment-line" /><span className="investment-dot" /><span className="investment-line" /><span className="investment-dot" /></div><div className="investment-steps" ref={investmentStepsRef}><div className="investment-step"><strong>Discover</strong><span>See the opportunity</span></div><div className="investment-step"><strong>Evaluate</strong><span>Understand the context</span></div><div className="investment-step"><strong>Invest</strong><span>Take a considered step</span></div><div className="investment-step"><strong>Build value</strong><span>Stay with the horizon</span></div></div></div></div></section>

    <section className="section-pad section-pad--tight bg-stone"><div className="container"><div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-end"><SectionHeading eyebrow="Why choose us" title="Grounded enough to listen. Ambitious enough to build." copy="Our promise is not about making the loudest claim. It is about doing the work that makes opportunity feel more certain." /><div className="why-grid" ref={whyGridRef}>{trustReasons.map(({ index, title, copy }) => <div className="why-item" key={title}><span className="why-index">{index}</span><h3>{title}</h3><p>{copy}</p></div>)}</div></div></div></section>

    <section className="section-pad bg-limestone"><div className="container"><div className="flex flex-col justify-between gap-8 md:flex-row md:items-end"><SectionHeading eyebrow="Notes from the field" title="A considered view of what’s next." copy="Perspectives on property, investment, construction, and the places we are helping shape." /><ArrowLink href="/insights">Explore all insights</ArrowLink></div></div><RecentInsights /></section>

    <section className="final-cta"><div className="final-cta-image brand-hero-bg" /><div className="final-cta-overlay" /><div className="container relative z-10 py-20 md:py-28"><p className="eyebrow text-limestone/65">Make the next step yours</p><h2 className="display-title mt-5 max-w-2xl text-limestone">Your next opportunity<br /><em>could start here.</em></h2><p className="mt-6 max-w-md text-[0.98rem] leading-7 text-limestone/65">Tell us what you are exploring. We’ll help you understand where the conversation can begin.</p><div className="mt-8 flex flex-wrap gap-3"><Link href="/contact" className="button button--cream">Talk to an expert <ArrowUpRight size={16} /></Link><a href="tel:+2349033734656" className="button button--ghost-light">Call AJIYA <ArrowRight size={16} /></a></div></div></section>
  </PageShell>;
}

function PageHero({ eyebrow, title, copy, image }: { eyebrow: string; title: React.ReactNode; copy: string; image?: string }) {
  const isDefaultBrandHero = !image || image === assets.hero;
  return <section className="page-hero"><div className={`page-hero-image ${isDefaultBrandHero ? "brand-hero-bg" : ""}`} style={isDefaultBrandHero ? undefined : { backgroundImage: `url(${image})` }} /><div className="page-hero-overlay" /><div className="container relative z-10 flex min-h-[480px] items-end pb-14 pt-40 md:min-h-[560px] md:pb-20"><div className="max-w-3xl"><p className="eyebrow text-limestone/70">{eyebrow}</p><h1 className="page-title">{title}</h1><p className="page-hero-copy">{copy}</p></div></div></section>;
}

function AboutPage() {
  const trioRef = useScrollReveal<HTMLDivElement>(":scope > div", []);
  return <PageShell><Seo title="About AJIYA" description="Discover the story, mission, and philosophy behind AJIYA Urban Rise Ltd." /><PageHero eyebrow="About AJIYA" title={<>Building opportunities<br /><em>for tomorrow.</em></>} copy="A property and urban development company rooted in Abuja, with a wider view of Nigeria’s future." /><section className="section-pad bg-limestone"><div className="container grid gap-14 lg:grid-cols-[0.7fr_1.2fr] lg:gap-24"><div className="vertical-label">02 / OUR STORY</div><div><SectionHeading eyebrow="The reason we are here" title="Property can be a beginning." copy="AJIYA Urban Rise was created around a simple conviction: the right property opportunity can give people more than a physical address. It can create confidence, security, and a sense of what might come next." /><div className="mt-12 grid gap-8 border-t border-charcoal/15 pt-8 md:grid-cols-3" ref={trioRef}><div><p className="eyebrow">Mission</p><p className="mt-3 text-sm leading-6 text-charcoal/65">To become a leading real-estate company in Nigeria by providing affordable homes and valuable land investments.</p></div><div><p className="eyebrow">Vision</p><p className="mt-3 text-sm leading-6 text-charcoal/65">To help shape places where urban growth creates meaningful opportunity for more people.</p></div><div><p className="eyebrow">Philosophy</p><p className="mt-3 text-sm leading-6 text-charcoal/65">Creating opportunities. Building lasting value. Leaving a legacy.</p></div></div></div></div></section><section className="section-pad bg-stone"><div className="container"><SectionHeading eyebrow="What we do" title="A connected point of view." copy="Five capabilities, brought together by one way of thinking." /><ServiceCapabilityGrid /></div></section><section className="section-pad bg-charcoal text-limestone"><div className="container grid gap-12 lg:grid-cols-[0.8fr_1fr] lg:gap-24"><div><p className="eyebrow text-limestone/50">The future we are building toward</p><h2 className="display-title mt-5">More considered.<br /><em>More possible.</em></h2></div><p className="max-w-xl text-lg leading-8 text-limestone/65">As Nigeria’s cities evolve, we want to be known for the quality of the opportunity we create: places that feel rooted, useful, and ready for the people who will shape their next chapter.</p></div></section><TeamSection /></PageShell>;
}

function ServicesPage() {
  return <PageShell><Seo title="Our Services" description="Explore AJIYA Urban Rise’s real-estate development, sales, investment, management, and construction services." image={assets.signature} /><PageHero eyebrow="Our services" title={<>One connected view<br /><em>of real estate.</em></>} copy="Development, sales, investment, management, and construction — brought together to make the next step clearer." image={assets.signature} /><section className="section-pad bg-limestone"><div className="container"><ServiceDetailList /></div></section><section className="section-pad section-pad--tight bg-canopy text-limestone"><div className="container flex flex-col justify-between gap-8 md:flex-row md:items-end"><div><p className="eyebrow text-limestone/60">Need a sounding board?</p><h2 className="display-title mt-4">Bring us the<br /><em>opportunity.</em></h2></div><Link href="/contact" className="button button--cream">Talk to our team <ArrowUpRight size={16} /></Link></div></section></PageShell>;
}

function ServiceDetailPage({ slug }: { slug: string }) {
  const state = useCmsResource(() => getServiceBySlug(slug), [slug]);
  const title = state.status === "success" ? state.data.title : "Service";
  const introText = state.status === "success" ? state.data.intro : "AJIYA Urban Rise service.";
  const heroImage = slug === "sales" || slug === "investment" ? assets.opportunity : assets.signature;
  return <PageShell context={title !== "Service" ? title : undefined}><Seo title={title} description={introText} image={heroImage} /><CmsState state={state} notFoundLabel="Service not found" notFoundMessage="We couldn't find this service. It may have been renamed — see our full services list.">{(service) => <><PageHero eyebrow="Our services" title={service.title} copy={service.intro} image={heroImage} /><section className="section-pad bg-limestone"><div className="container grid gap-14 lg:grid-cols-[0.7fr_1.2fr] lg:gap-24"><div className="vertical-label">03 / THE APPROACH</div><div><SectionHeading eyebrow="How we think about it" title={service.intro} copy={service.body} /><div className="mt-12 grid gap-3 sm:grid-cols-3">{service.points.map((point, index) => <div className="feature-tile" key={point}><span className="eyebrow text-charcoal/40">0{index + 1}</span><p>{point}</p></div>)}</div></div></div></section><section className="section-pad bg-charcoal text-limestone"><div className="container flex flex-col justify-between gap-8 md:flex-row md:items-center"><div><p className="eyebrow text-limestone/50">Ready to talk it through?</p><h2 className="display-title mt-4">Start with a<br /><em>conversation.</em></h2></div><Link href={`/contact?interest=${encodeURIComponent(service.title)}&service=${slug}`} className="button button--cream">Talk to our team <ArrowUpRight size={16} /></Link></div></section></>}</CmsState></PageShell>;
}

/** "Construction" reads as a fairly technical/internal term — shown to visitors as "In Progress" instead, matching how the business actually talks about active projects. Other statuses pass through unchanged. */
function projectStatusLabel(status: Project["status"]) {
  return status === "Construction" ? "In Progress" : status;
}

function ProjectCard({ project, featured = false, offset = false, delay = 0 }: { project: Project; featured?: boolean; offset?: boolean; delay?: number }) {
  const [ref, visible] = useReveal();
  const spotlightRef = useSpotlightRef<HTMLAnchorElement>();
  return <div ref={ref} style={{ transitionDelay: `${delay}ms` }} className={`project-reveal ${visible ? "is-visible" : ""}`}><Link ref={spotlightRef} href={`/projects/${project.slug}`} className={`project-card ${featured ? "project-card--large" : offset ? "project-card--offset" : "project-card--medium"}`}><ImageFrame src={resolveMediaUrl(project.heroImage?.url) || assets.urban} alt={project.heroImage?.alternativeText || project.name} className="project-card-image" /><div className="project-card-overlay" /><span className="project-card-glow" aria-hidden="true" /><span className="project-status-badge">{projectStatusLabel(project.status)}</span><div className="project-card-content"><span className="eyebrow text-limestone/60">{project.number} / {project.type}</span><h3>{project.name}</h3><p className="mt-2 flex items-center gap-1.5 text-xs text-limestone/60"><MapPin size={12} />{project.location}</p><p className="mt-3 max-w-md text-sm leading-6 text-limestone/68">{project.description}</p><span className="project-card-link">Explore project <ArrowUpRight size={16} /></span></div></Link></div>;
}

function FeaturedProjects() {
  const state = useCmsResource(() => getProjects(), []);
  return (
    <div className="project-grid mt-14">
      <CmsState state={state} emptyMessage="Our current developments are being updated. Get in touch to hear about what's coming next.">
        {(projectList) => projectList.slice(0, 2).map((project, index) => (
          <ProjectCard key={project.documentId} project={project} featured={index === 0} offset={index === 1} delay={index * 110} />
        ))}
      </CmsState>
    </div>
  );
}

function RecentInsights() {
  const state = useCmsResource(() => getInsights(), []);
  const sectionRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  // Horizontal scroll: pins the section and translates the card track by exactly the
  // amount it overflows the viewport, computed from the real rendered DOM rather than a
  // guessed card count — so this keeps working whether the CMS has 3 insights or 30.
  // Deferred until the CMS data has actually rendered (deps: [state.status]) since the track
  // has zero width before then. Skipped on mobile/reduced-motion — see the matching CSS
  // fallback (native swipe + scroll-snap) in index.css.
  useGSAP(() => {
    if (state.status !== "success") return;
    const mm = gsap.matchMedia();
    mm.add(motionConditions, (context) => {
      const { isMobile, reduceMotion } = context.conditions as { isMobile: boolean; reduceMotion: boolean };
      const section = sectionRef.current;
      const track = trackRef.current;
      if (isMobile || reduceMotion || !section || !track) return;

      const distance = track.scrollWidth - section.offsetWidth;
      if (distance <= 0) return; // track already fits — nothing to scroll, no pin needed

      gsap.to(track, {
        // Function-based values (not the closure-captured `distance` constant above, which is
        // only used for the initial "is there even anything to scroll" guard) — combined with
        // invalidateOnRefresh, these re-measure the real DOM on every ScrollTrigger.refresh()
        // (window resize, orientation change), so a browser resize doesn't leave the tween
        // animating to a stale, pre-resize distance.
        x: () => -(track.scrollWidth - section.offsetWidth),
        ease: "none",
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: () => `+=${track.scrollWidth - section.offsetWidth}`,
          scrub: 1,
          pin: true,
          invalidateOnRefresh: true,
        },
      });
    });
  }, [state.status]);

  return (
    <div className="insight-scroll-section mt-14" ref={sectionRef}>
      <div className="insight-grid" ref={trackRef}>
        <CmsState state={state} emptyMessage="New perspectives are being prepared. Check back soon.">
          {(list) => [
            ...list.slice(0, 3).map((item) => (
              <Link href={`/insights/${item.slug}`} className="insight-card" key={item.documentId}>
                <div className="insight-card-top"><span className="eyebrow">{item.category}</span><ArrowUpRight size={18} /></div>
                <h3>{item.title}</h3>
                <p>{item.excerpt}</p>
                <div className="insight-meta"><span>{new Date(item.publishDate).toLocaleDateString("en-GB", { month: "short", year: "numeric" })}</span><span>{item.readTime}</span></div>
              </Link>
            )),
            <Link href="/insights" className="insight-card insight-card--cta" key="view-all">
              <span className="eyebrow text-limestone/60">Keep reading</span>
              <h3 className="font-display text-2xl">Explore every insight</h3>
              <span className="arrow-link arrow-link--light">View all insights <ArrowUpRight size={16} /></span>
            </Link>,
          ]}
        </CmsState>
      </div>
    </div>
  );
}

function ProjectsPage() {
  const state = useCmsResource(() => getProjects(), []);
  return <PageShell><Seo title="Our Projects" description="Explore AJIYA Urban Rise’s featured residential and masterplanned development projects in Abuja." image={assets.urban} /><PageHero eyebrow="Our projects" title={<>Places with a<br /><em>point of view.</em></>} copy="Development stories shaped by a belief that the future of a place starts with the quality of the opportunity inside it." image={assets.urban} /><section className="section-pad bg-charcoal text-limestone"><div className="container"><div className="max-w-xl"><SectionHeading light eyebrow="The portfolio" title="Not just a project list." copy="Each development is an expression of how AJIYA thinks about land, community, and the work of building lasting value." /></div><div className="mt-14 grid gap-8 lg:grid-cols-2"><CmsState state={state} emptyMessage="New developments are being prepared. Get in touch to hear about what's coming next.">{(projectList) => projectList.map((project, index) => <ProjectCard key={project.documentId} project={project} delay={index * 110} />)}</CmsState></div></div></section></PageShell>;
}

function ProjectDetail({ project }: { project: Project }) {
  const heroUrl = resolveMediaUrl(project.heroImage?.url) || assets.urban;
  const hasUnits = Array.isArray(project.units) && project.units.length > 0;
  const hasGallery = Array.isArray(project.gallery) && project.gallery.length > 0;
  const hasLandmarks = Array.isArray(project.landmarks) && project.landmarks.length > 0;
  return <><PageHero eyebrow={`${project.number ?? ""} / ${projectStatusLabel(project.status)}`} title={project.name} copy={`${project.location} · ${project.type}`} image={heroUrl} /><section className="section-pad bg-limestone"><div className="container grid gap-14 lg:grid-cols-[0.7fr_1.2fr] lg:gap-24"><div className="vertical-label">PROJECT STORY</div><div><SectionHeading eyebrow={project.eyebrow ?? "A place to begin"} title="A place to begin the next chapter." copy={project.description} /><div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><div className="feature-tile"><MapPin size={18} className="text-canopy" /><span>Location</span><strong>{project.location}</strong></div><div className="feature-tile"><Building2 size={18} className="text-canopy" /><span>Development</span><strong>{project.type}</strong></div><div className="feature-tile"><Layers3 size={18} className="text-canopy" /><span>Status</span><strong>{projectStatusLabel(project.status)}</strong></div>{project.documentationStatus && <div className="feature-tile"><ShieldCheck size={18} className="text-canopy" /><span>Documentation</span><strong>{project.documentationStatus}</strong></div>}{project.deliveryTimeline && <div className="feature-tile"><Compass size={18} className="text-canopy" /><span>Delivery</span><strong>{project.deliveryTimeline}</strong></div>}</div>{hasLandmarks && <div className="mt-8 border-t border-charcoal/15 pt-6"><p className="eyebrow">Nearby</p><ul className="mt-4 grid gap-2 text-sm text-charcoal/70 sm:grid-cols-2">{project.landmarks!.map((landmark) => <li key={landmark} className="flex items-start gap-2"><MapPin size={14} className="mt-1 shrink-0 text-canopy" />{landmark}</li>)}</ul></div>}</div></div></section>{hasUnits && <section className="section-pad section-pad--tight bg-charcoal text-limestone"><div className="container"><SectionHeading light eyebrow="Available unit types" title="What's on offer, and at what price." copy="Indicative pricing for discovery — confirm current availability and terms with the AJIYA team." /><div className="mt-10 overflow-x-auto"><table className="unit-price-table"><thead><tr><th>Unit type</th><th>Size</th><th>Price</th></tr></thead><tbody>{project.units!.map((unit) => <tr key={unit.type}><td>{unit.type}</td><td>{unit.size ?? "—"}</td><td>{unit.price}</td></tr>)}</tbody></table></div></div></section>}<section className="section-pad section-pad--tight bg-stone"><div className="container"><div className="flex items-center justify-between"><SectionHeading eyebrow="Development highlights" title="From plan to place." /><span className="eyebrow text-charcoal/40">{project.number} / 04</span></div><div className="mt-12 grid gap-px bg-charcoal/10 md:grid-cols-4">{["Location context", "Community vision", "Infrastructure", "Long-term value"].map((item, index) => <div key={item} className="bg-stone p-6"><span className="eyebrow text-charcoal/40">0{index + 1}</span><h3 className="mt-12 font-display text-xl">{item}</h3><p className="mt-3 text-sm leading-6 text-charcoal/60">A considered part of the development story, shaped by what the place and its people need next.</p></div>)}</div></div></section><section className="section-pad bg-limestone"><div className="container grid gap-8 md:grid-cols-[1.35fr_0.65fr]"><ImageFrame src={heroUrl} alt={project.heroImage?.alternativeText || project.name} className="project-gallery-main" /><div className="flex flex-col justify-between border-t border-charcoal/15 pt-5 md:border-l md:border-t-0 md:pl-8 md:pt-0"><div><p className="eyebrow">Project progress</p><div className="progress-list mt-7">{["Planning", "Development", "Construction", "Completion"].map((item) => <div className={`progress-item ${item === project.status || (item === "Completion" && project.status === "Completed") ? "is-active" : ""}`} key={item}><span>{item === "Construction" ? "In Progress" : item}</span><i /></div>)}</div></div><a href="#enquire" className="button button--dark mt-10">Request information <ArrowUpRight size={16} /></a></div></div>{hasGallery && <div className="container mt-4"><div className="project-gallery-strip">{project.gallery.map((image) => <ImageFrame key={image.url} src={resolveMediaUrl(image.url)} alt={image.alternativeText || project.name} className="project-gallery-thumb" />)}</div></div>}</section><section id="enquire" className="section-pad section-pad--tight bg-stone"><div className="container max-w-2xl"><SectionHeading eyebrow="Take the next step" title={`Interested in ${project.name}?`} copy="Request current availability, or book a site visit — our team will confirm directly." /><div className="mt-10"><EnquiryPanel label={project.name} projectSlug={project.slug} /></div></div></section></>;
}

function ProjectPage({ id }: { id: string }) {
  const state = useCmsResource(() => getProjectBySlug(id), [id]);
  const title = state.status === "success" ? state.data.name : "Project";
  const description = state.status === "success" ? state.data.description : "AJIYA Urban Rise development.";
  return <PageShell context={title !== "Project" ? title : undefined}><Seo title={title} description={description} image={state.status === "success" ? resolveMediaUrl(state.data.heroImage?.url) : undefined} /><CmsState state={state} notFoundLabel="Project not found" notFoundMessage="We couldn't find this project. It may have been renamed or is no longer listed.">{(project) => <ProjectDetail project={project} />}</CmsState></PageShell>;
}

function PropertyDetail({ property }: { property: Property }) {
  const imageUrl = resolveMediaUrl(property.image?.url) || assets.opportunity;
  const hasGallery = Array.isArray(property.gallery) && property.gallery.length > 0;
  return <><PageHero eyebrow={property.category} title={property.name} copy={`${property.location} · From ₦${property.priceGuide}m*`} image={imageUrl} /><section className="section-pad bg-limestone"><div className="container grid gap-14 lg:grid-cols-[0.7fr_1.2fr] lg:gap-24"><div className="vertical-label">PROPERTY DETAIL</div><div><SectionHeading eyebrow="A closer look" title={property.name} copy={property.description} /><div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-3"><div className="feature-tile"><MapPin size={18} className="text-canopy" /><span>Location</span><strong>{property.location}</strong></div><div className="feature-tile"><Landmark size={18} className="text-canopy" /><span>Price guide</span><strong>From ₦{property.priceGuide}m*</strong></div><div className="feature-tile"><Check size={18} className="text-canopy" /><span>Availability</span><strong>{property.availabilityStatus ?? "Available"}</strong></div>{property.size && <div className="feature-tile"><Layers3 size={18} className="text-canopy" /><span>Size</span><strong>{property.size}</strong></div>}{typeof property.bedrooms === "number" && <div className="feature-tile"><Building2 size={18} className="text-canopy" /><span>Bedrooms</span><strong>{property.bedrooms}</strong></div>}{property.documentationStatus && <div className="feature-tile"><ShieldCheck size={18} className="text-canopy" /><span>Documentation</span><strong>{property.documentationStatus}</strong></div>}</div>{property.features?.length > 0 && <div className="mt-8 flex flex-wrap gap-2">{property.features.map((feature) => <span key={feature} className="property-feature-pill">{feature}</span>)}</div>}{property.paymentInfo && <div className="mt-8 border-t border-charcoal/15 pt-6"><p className="eyebrow">Payment information</p><p className="mt-3 text-sm leading-6 text-charcoal/65">{property.paymentInfo}</p></div>}{property.project && <div className="mt-8 border-t border-charcoal/15 pt-6"><p className="eyebrow">Part of</p><Link href={`/projects/${property.project.slug}`} className="arrow-link mt-3">{property.project.name} <ArrowUpRight size={16} /></Link></div>}{hasGallery && <div className="project-gallery-strip mt-10">{property.gallery!.map((image) => <ImageFrame key={image.url} src={resolveMediaUrl(image.url)} alt={image.alternativeText || property.name} className="project-gallery-thumb" />)}</div>}</div></div></section><section className="section-pad section-pad--tight bg-stone"><div className="container max-w-2xl"><SectionHeading eyebrow="Take the next step" title="Request current availability." copy="Indicative pricing only — our team will confirm current terms, availability, and documentation directly." /><div className="mt-10"><EnquiryPanel label={property.name} propertySlug={property.slug} projectSlug={property.project?.slug} /></div></div></section></>;
}

function PropertyPage({ slug }: { slug: string }) {
  const state = useCmsResource(() => getPropertyBySlug(slug), [slug]);
  const title = state.status === "success" ? state.data.name : "Property";
  const description = state.status === "success" ? state.data.description : "AJIYA Urban Rise property opportunity.";
  return <PageShell context={title !== "Property" ? title : undefined}><Seo title={title} description={description} image={state.status === "success" ? resolveMediaUrl(state.data.image?.url) : undefined} /><CmsState state={state} notFoundLabel="Property not found" notFoundMessage="We couldn't find this listing. It may have been renamed or is no longer available.">{(property) => <PropertyDetail property={property} />}</CmsState></PageShell>;
}

/** Static trust/coverage signal — not tied to actual listings, just areas AJIYA is active in/around. */
function LocationsCoverage() {
  const gridRef = useScrollReveal<HTMLDivElement>(".location-pill", []);
  return <div className="locations-coverage"><p className="eyebrow">Where we're active</p><h2 className="mt-3 font-display text-2xl">Across Abuja's growing districts.</h2><div className="location-pill-grid mt-8" ref={gridRef}>{areasCovered.map((area) => <span className="location-pill" key={area}>{area}</span>)}</div></div>;
}

function PropertiesPage() {
  const [active, setActive] = useState("All");
  const [query, setQuery] = useState("");
  const [maxBudget, setMaxBudget] = useState(100);
  const state = useCmsResource(() => getProperties(), []);
  // Reveals on first load only — deliberately not re-triggered on every filter keystroke/click,
  // since re-running a scroll reveal each time the filtered subset changes would need each
  // filter action to also replay an entrance animation, which reads as flickery rather than
  // premium. Filtering swaps the underlying cards in at normal opacity (no animation) instead
  // of a broken/invisible state.
  const gridRef = useScrollReveal<HTMLDivElement>(".property-card", [state.status]);

  const filterList = (list: Property[]) => filterProperties(list, { category: active, query, maxBudget });

  return <PageShell><Seo title="Curated Properties" description="Explore curated land, residential, and commercial property opportunities from AJIYA Urban Rise." image={assets.opportunity} /><PageHero eyebrow="Properties" title={<>Curated opportunity,<br /><em>not endless inventory.</em></>} copy="A focused view of property conversations across land, residential, and commercial opportunity in Abuja." image={assets.opportunity} /><section className="section-pad bg-limestone"><div className="container"><div className="property-search-panel"><div><span className="eyebrow text-canopy">Search the opportunity</span><h2>Find a conversation that fits.</h2></div><label className="property-search-input"><span className="sr-only">Search by feature or location</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by feature, location, or opportunity" /></label><div className="price-slider"><div className="price-slider-header"><span className="eyebrow">Price range</span><strong>{maxBudget === 100 ? "Any budget" : `Up to ₦${maxBudget}m`}</strong></div><input aria-label="Maximum indicative budget" type="range" min="5" max="100" step="5" value={maxBudget} onChange={(event) => setMaxBudget(Number(event.target.value))} /><div className="price-slider-scale"><span>₦5m</span><span>₦100m+</span></div></div><div className="filter-row"><span className="eyebrow">Browse by type</span><div className="flex flex-wrap gap-2">{["All", "Land", "Residential", "Commercial", "Investment"].map((item) => <button key={item} className={`filter-button ${active === item ? "is-active" : ""}`} onClick={() => setActive(item)}>{item}</button>)}</div></div></div><CmsState state={state} emptyMessage="New listings are being prepared. Get in touch to hear about what's coming next.">{(list) => {
    const filtered = filterList(list);
    return <><div className="property-grid mt-12" ref={gridRef}>{filtered.map((item) => <Link href={`/properties/${item.slug}`} className="property-card" key={item.documentId}><ImageFrame src={resolveMediaUrl(item.image?.url) || assets.opportunity} alt={item.image?.alternativeText || item.name} className="property-card-image" /><div className="p-6 md:p-7"><div className="flex items-center justify-between"><span className="eyebrow text-canopy">{item.category}</span><span className="eyebrow text-charcoal/40">From ₦{item.priceGuide}m*</span></div><h2 className="mt-7 font-display text-3xl">{item.name}</h2><p className="mt-3 text-sm leading-6 text-charcoal/65">{item.description}</p><div className="property-feature-list">{item.features.map((feature) => <span key={feature}>{feature}</span>)}</div><div className="mt-6 flex items-center gap-2 text-xs text-charcoal/50"><MapPin size={14} />{item.location}</div><span className="arrow-link">View details <ArrowUpRight size={16} /></span></div></Link>)}</div><p className="property-disclaimer">*Indicative starting bands for discovery only. Confirm current availability and terms with the AJIYA team.</p>{filtered.length === 0 && <div className="property-empty"><span className="eyebrow">No exact match yet</span><p>Try another feature or start a direct conversation with the AJIYA team.</p><Link href="/contact" className="button button--dark mt-5">Talk to the team <ArrowUpRight size={16} /></Link></div>}<LocationsCoverage /></>;
  }}</CmsState></div></section></PageShell>;
}

function InvestPage() {
  return <PageShell context="AJIYA investment opportunities"><Seo title="Invest With AJIYA" description="Explore AJIYA Urban Rise’s long-term perspective on real-estate and land investment." image={assets.urban} /><PageHero eyebrow="Invest with AJIYA" title={<>Build wealth through<br /><em>real estate.</em></>} copy="A patient, informed view of land and property opportunity — grounded in location, potential, and the work behind value." image={assets.urban} /><section className="section-pad bg-limestone"><div className="container grid gap-14 lg:grid-cols-[0.72fr_1.2fr] lg:gap-24"><div className="vertical-label">04 / WHY REAL ESTATE</div><div><SectionHeading eyebrow="The long view" title="Value lives in context." copy="Property is not only about what exists today. It is also about what a place is becoming, how it connects to people and infrastructure, and how carefully the opportunity is understood." /><div className="mt-12 grid gap-3 sm:grid-cols-3"><div className="feature-tile"><Compass size={19} className="text-canopy" /><span>Location</span><strong>Read the place</strong></div><div className="feature-tile"><Layers3 size={19} className="text-canopy" /><span>Potential</span><strong>See what can grow</strong></div><div className="feature-tile"><Handshake size={19} className="text-canopy" /><span>Clarity</span><strong>Know the next step</strong></div></div></div></div></section><section className="section-pad bg-canopy text-limestone"><div className="container"><div className="max-w-2xl"><SectionHeading light eyebrow="The AJIYA approach" title="A considered path into opportunity." copy="We keep the conversation grounded, so each decision can be made with a clearer view of the place and the horizon." /></div><div className="investment-journey mt-14">{["Discover", "Evaluate", "Invest", "Build long-term value"].map((step, index) => <div key={step} className="journey-step"><span>0{index + 1}</span><h3>{step}</h3><p>{["Find the story inside the location.", "Understand the opportunity and the work.", "Take a step that fits your horizon.", "Stay connected to the value being built."][index]}</p>{index < 3 && <ArrowRight className="journey-arrow" size={18} />}</div>)}</div></div></section><section className="section-pad bg-stone"><div className="container flex flex-col justify-between gap-8 md:flex-row md:items-center"><div><p className="eyebrow">Continue the conversation</p><h2 className="display-title mt-4">Speak with the<br /><em>investment team.</em></h2></div><Link href="/contact?interest=investment" className="button button--dark">Start a conversation <ArrowUpRight size={16} /></Link></div></section></PageShell>;
}

function InsightsList({ insights }: { insights: Insight[] }) {
  const featured = insights.find((item) => item.featured) ?? insights[0];
  const rest = insights.filter((item) => item.documentId !== featured.documentId);
  return <><div className="insight-feature"><div><span className="eyebrow">Featured perspective · {featured.category}</span><h2>{featured.title}</h2><p>{featured.excerpt}</p><Link href={`/insights/${featured.slug}`} className="button button--dark">Read perspective <ArrowUpRight size={16} /></Link></div><div className="insight-feature-index">01</div></div><div className="mt-14 grid gap-0 border-t border-charcoal/15">{rest.map((item, index) => <Link href={`/insights/${item.slug}`} className="article-row" key={item.documentId}><span className="eyebrow">0{index + 2}</span><div><span className="eyebrow text-canopy">{item.category}</span><h3>{item.title}</h3><p>{item.excerpt}</p></div><ArrowUpRight size={19} /></Link>)}</div></>;
}

function InsightsPage() {
  const state = useCmsResource(() => getInsights(), []);
  return <PageShell><Seo title="Insights" description="Perspectives from AJIYA Urban Rise on property, investment, land, construction, and urban growth." image={assets.opportunity} /><PageHero eyebrow="Insights" title={<>A considered view of<br /><em>what’s next.</em></>} copy="Perspectives on the places, decisions, and long horizons that shape real-estate opportunity." image={assets.opportunity} /><section className="section-pad bg-limestone"><div className="container"><CmsState state={state} emptyMessage="New perspectives are being prepared. Check back soon.">{(insights) => <InsightsList insights={insights} />}</CmsState></div></section></PageShell>;
}

/**
 * Converts a YouTube/Vimeo share link into a privacy-friendly embed URL. Only these two
 * hosts are ever embedded (also enforced by the server CSP's frame-src) — any other URL
 * returns null and simply renders no player, rather than iframing arbitrary content.
 */
function toEmbedUrl(raw?: string): string | null {
  if (!raw) return null;
  try {
    const url = new URL(raw);
    const host = url.hostname.replace(/^www\./, "");
    if (host === "youtu.be") return `https://www.youtube-nocookie.com/embed/${url.pathname.slice(1)}`;
    if (host === "youtube.com" || host === "m.youtube.com") {
      const id = url.pathname.startsWith("/embed/") ? url.pathname.split("/")[2] : url.searchParams.get("v");
      return id ? `https://www.youtube-nocookie.com/embed/${id}` : null;
    }
    if (host === "vimeo.com") {
      const id = url.pathname.split("/").filter(Boolean)[0];
      return id && /^\d+$/.test(id) ? `https://player.vimeo.com/video/${id}` : null;
    }
    if (host === "player.vimeo.com") return url.toString();
  } catch {
    return null;
  }
  return null;
}

function VideoEmbed({ url, title }: { url?: string; title: string }) {
  const src = toEmbedUrl(url);
  if (!src) return null;
  return <div className="video-embed"><iframe src={src} title={title} loading="lazy" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" /></div>;
}

function ArticlePage({ id }: { id: string }) {
  const state = useCmsResource(() => getInsightBySlug(id), [id]);
  const title = state.status === "success" ? state.data.title : "Insight";
  const excerpt = state.status === "success" ? state.data.excerpt : "AJIYA Urban Rise perspective.";
  return <PageShell><Seo title={title} description={excerpt} type="article" image={state.status === "success" ? resolveMediaUrl(state.data.coverImage?.url) : undefined} article={state.status === "success" ? { publishedTime: state.data.publishDate, author: state.data.author } : undefined} /><CmsState state={state} notFoundLabel="Article not found" notFoundMessage="We couldn't find this article. It may have been unpublished — see our full list of insights.">{(article) => <><section className="article-hero"><div className="container"><span className="eyebrow text-canopy">{article.category}{article.readTime ? ` · ${article.readTime}` : ""}</span><h1>{article.title}</h1><p>{article.excerpt}</p></div></section><article className="section-pad bg-limestone"><div className="container grid gap-12 lg:grid-cols-[0.65fr_1.1fr] lg:gap-24"><div className="vertical-label">AJIYA / INSIGHTS</div><div className="prose-ajiya"><VideoEmbed url={article.videoUrl} title={article.title} />{article.body.split("\n\n").map((paragraph, index) => <p className={index === 0 ? "lead" : undefined} key={index}>{paragraph}</p>)}<Link href="/contact" className="button button--dark mt-6">Talk to AJIYA <ArrowUpRight size={16} /></Link></div></div></article></>}</CmsState></PageShell>;
}

/**
 * Availability enquiry + site-visit request in one place, as tabs — used on project and
 * property detail pages so the conversion point lives where the buying decision happens,
 * pre-tagged with the right project/property for lead attribution.
 */
function EnquiryPanel({ label, projectSlug, propertySlug }: { label: string; projectSlug?: string; propertySlug?: string }) {
  const [tab, setTab] = useState<"enquiry" | "visit">("enquiry");
  return <div className="enquiry-panel"><div className="flex flex-wrap gap-2" role="tablist" aria-label="Choose how to get in touch"><button role="tab" aria-selected={tab === "enquiry"} className={`filter-button ${tab === "enquiry" ? "is-active" : ""}`} onClick={() => setTab("enquiry")} type="button">Request availability</button><button role="tab" aria-selected={tab === "visit"} className={`filter-button ${tab === "visit" ? "is-active" : ""}`} onClick={() => setTab("visit")} type="button">Book a site visit</button></div><div className="mt-8" role="tabpanel" key={tab}><ContactForm mode={tab} interestLabel={label} projectSlug={projectSlug} propertySlug={propertySlug} /></div></div>;
}

function ContactForm({
  interestLabel,
  projectSlug,
  propertySlug,
  serviceSlug,
  mode = "enquiry",
}: {
  interestLabel?: string;
  projectSlug?: string;
  propertySlug?: string;
  serviceSlug?: string;
  /** "visit" turns this into a site-visit request: adds preferred date/time, optional message. */
  mode?: "enquiry" | "visit";
}) {
  const isVisit = mode === "visit";
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<string, string[]>>>({});
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    interest: enquiryInterestOptions[0] as string,
    message: "",
    preferredVisitDate: "",
    preferredVisitTime: "Morning",
    companyWebsite: "", // honeypot — real visitors never see or fill this
  });
  const update = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setStatus("submitting");
    setErrorMessage(null);
    setFieldErrors({});

    const { preferredVisitDate, preferredVisitTime, ...rest } = form;
    const result = await submitEnquiry({
      ...rest,
      ...(isVisit
        ? {
            requestType: "site_visit" as const,
            preferredVisitDate,
            preferredVisitTime: preferredVisitTime as "Morning" | "Afternoon",
            interest: interestLabel ?? "Site visit",
            // The message is optional in visit mode, but the shared schema requires one —
            // so a short default is filled in rather than making the visitor write a note.
            message: form.message.trim().length >= 10 ? form.message : `Site visit request for ${interestLabel ?? "AJIYA Urban Rise"}.`,
          }
        : {}),
      sourcePage: window.location.pathname,
      relatedProjectSlug: projectSlug,
      relatedPropertySlug: propertySlug,
    });

    if (result.ok) {
      setStatus("success");
    } else {
      setStatus("error");
      setErrorMessage(result.error.message);
      setFieldErrors(result.error.fieldErrors ?? {});
    }
  };

  if (status === "success") {
    return (
      <div className="form-success">
        <div className="success-icon"><Check size={20} /></div>
        <p className="eyebrow text-canopy">{isVisit ? "Visit request received" : "Enquiry received"}</p>
        <h2>Thank you, {form.name || "for reaching out"}.</h2>
        {isVisit
          ? <p>We have your request for <strong>{form.preferredVisitDate}</strong> ({form.preferredVisitTime.toLowerCase()}). This is a request, not a confirmed booking — our team will contact you to confirm the time.</p>
          : <p>We have your note and will follow up using the contact details you shared. Your enquiry context is: <strong>{form.interest}</strong>.</p>}
        <Link href="/" className="button button--dark">Return home <ArrowUpRight size={16} /></Link>
      </div>
    );
  }

  return (
    <form className="enquiry-form" onSubmit={submit} noValidate>
      {(interestLabel || serviceSlug) && (
        <p className="mb-5 text-xs font-semibold uppercase tracking-wide text-canopy">
          Regarding: {interestLabel ?? serviceSlug}
        </p>
      )}
      <div className="form-grid">
        <label>Full name<input required value={form.name} onChange={(event) => update("name", event.target.value)} placeholder="Your name" />{fieldErrors.name && <span className="form-error">{fieldErrors.name[0]}</span>}</label>
        <label>Email address<input required type="email" value={form.email} onChange={(event) => update("email", event.target.value)} placeholder="you@example.com" />{fieldErrors.email && <span className="form-error">{fieldErrors.email[0]}</span>}</label>
        <label>Phone number<input required value={form.phone} onChange={(event) => update("phone", event.target.value)} placeholder="+234" />{fieldErrors.phone && <span className="form-error">{fieldErrors.phone[0]}</span>}</label>
        {isVisit
          ? <><label>Preferred date<input required type="date" min={new Date().toISOString().slice(0, 10)} value={form.preferredVisitDate} onChange={(event) => update("preferredVisitDate", event.target.value)} />{fieldErrors.preferredVisitDate && <span className="form-error">{fieldErrors.preferredVisitDate[0]}</span>}</label>
            <label>Preferred time<select value={form.preferredVisitTime} onChange={(event) => update("preferredVisitTime", event.target.value)}><option>Morning</option><option>Afternoon</option></select></label></>
          : <label>What are you interested in?<select value={form.interest} onChange={(event) => update("interest", event.target.value)}>{enquiryInterestOptions.map((option) => <option key={option}>{option}</option>)}</select></label>}
      </div>
      <label className="mt-5 block">{isVisit ? "Anything we should know? (optional)" : "How can we help?"}<textarea required={!isVisit} value={form.message} onChange={(event) => update("message", event.target.value)} placeholder="Tell us a little about what you are exploring." rows={5} />{fieldErrors.message && <span className="form-error">{fieldErrors.message[0]}</span>}</label>
      {/* Honeypot — visually hidden off-screen and removed from tab order. Real visitors
          never see or reach it; a screen-reader user could technically encounter it via
          element-by-element browsing, but aria-hiding a focusable field is itself an ARIA
          violation (aria-hidden must not contain focusable descendants), so this relies on
          off-screen positioning + tabIndex alone, which is the standard valid pattern. */}
      <label className="sr-only" style={{ position: "absolute", left: "-9999px" }}>
        Company website<input tabIndex={-1} autoComplete="off" value={form.companyWebsite} onChange={(event) => update("companyWebsite", event.target.value)} />
      </label>
      {status === "error" && errorMessage && <p className="form-error mt-4" role="alert">{errorMessage}</p>}
      <div className="mt-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <p className="text-xs leading-5 text-charcoal/45">We only use your details to respond to this enquiry.</p>
        <button className="button button--dark" type="submit" disabled={status === "submitting"}>
          {status === "submitting" ? "Sending…" : isVisit ? "Request site visit" : "Send enquiry"} <ArrowUpRight size={16} />
        </button>
      </div>
    </form>
  );
}

function ContactPage() {
  const params = new URLSearchParams(window.location.search);
  const interestLabel = params.get("interest") ?? undefined;
  const projectSlug = params.get("project") ?? undefined;
  const propertySlug = params.get("property") ?? undefined;
  const serviceSlug = params.get("service") ?? undefined;
  return <PageShell context={interestLabel}><Seo title="Contact AJIYA" description="Start a conversation with AJIYA Urban Rise about property, investment, projects, construction, or management." image={assets.heroFallback} /><PageHero eyebrow="Contact" title={<>Let’s make the next<br /><em>step clearer.</em></>} copy="Tell us what you are exploring. Our team is ready to listen, share context, and help you understand where the conversation can begin." image={assets.hero} /><section className="section-pad bg-limestone"><div className="container grid gap-14 lg:grid-cols-[0.7fr_1.2fr] lg:gap-24"><div><SectionHeading eyebrow="Start a conversation" title="The right question is a good place to begin." copy="Choose the route that suits you, or send a note and we’ll come back with the right person." /><div className="mt-10 flex flex-col gap-6 border-t border-charcoal/15 pt-6"><a className="contact-line" href="tel:+2349033734656"><span>Call</span><strong>+234 903 373 4656</strong><ArrowUpRight size={17} /></a><a className="contact-line" href="mailto:hello@ajiyaurbanrise.com"><span>Email</span><strong>hello@ajiyaurbanrise.com</strong><ArrowUpRight size={17} /></a><a className="contact-line" href="https://wa.me/2349033734656?text=Hello%20AJIYA%2C%20I%20would%20like%20to%20learn%20more." target="_blank" rel="noreferrer"><span>WhatsApp</span><strong>Start a conversation</strong><ArrowUpRight size={17} /></a></div><div className="mt-12 border-t border-charcoal/15 pt-6"><p className="eyebrow">Visit our office</p><p className="mt-4 text-sm leading-6 text-charcoal/65">Suite 1021, Third Floor<br />Los Angeles Mall<br />Ahmadu Bello Way<br />Mabushi, Abuja, Nigeria</p><div className="mt-5 flex flex-col gap-1 text-sm text-charcoal/65">{officeHours.map((row) => <div key={row.days} className="flex justify-between gap-6"><span>{row.days}</span><strong className="font-medium text-charcoal/80">{row.hours}</strong></div>)}</div></div></div><ContactForm interestLabel={interestLabel} projectSlug={projectSlug} propertySlug={propertySlug} serviceSlug={serviceSlug} /></div></section></PageShell>;
}

function FaqPage() {
  useEffect(() => {
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.id = "ld-faq";
    script.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqs.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: { "@type": "Answer", text: item.answer },
      })),
    });
    document.head.appendChild(script);
    return () => script.remove();
  }, []);
  return <PageShell><Seo title="Frequently Asked Questions" description="Answers to common questions about buying, selling, and working with AJIYA Urban Rise." /><PageHero eyebrow="FAQ" title={<>Questions, answered<br /><em>plainly.</em></>} copy="If what you're looking for isn't here, our team is one conversation away." /><section className="section-pad bg-limestone"><div className="container max-w-3xl"><div className="faq-list">{faqs.map((item) => <details className="faq-item" key={item.question}><summary>{item.question}<ArrowUpRight className="faq-icon" size={18} /></summary><p>{item.answer}</p></details>)}</div><div className="mt-14 flex flex-wrap items-center justify-between gap-6 border-t border-charcoal/15 pt-8"><div><p className="eyebrow">Still have a question?</p><p className="mt-2 text-sm text-charcoal/65">Reach us Mon–Fri, 09:00–17:00, or Sat 09:00–15:00.</p></div><Link href="/contact" className="button button--dark">Talk to the team <ArrowUpRight size={16} /></Link></div></div></section></PageShell>;
}

function LegalPage({ kind }: { kind: "privacy" | "terms" }) {
  return <PageShell><Seo title={kind === "privacy" ? "Privacy Policy" : "Terms and Conditions"} description="AJIYA Urban Rise website information." /><section className="article-hero article-hero--short"><div className="container"><span className="eyebrow text-canopy">AJIYA Urban Rise</span><h1>{kind === "privacy" ? "Privacy policy" : "Terms and conditions"}</h1><p>Information about using the AJIYA Urban Rise website.</p></div></section><article className="section-pad bg-limestone"><div className="container max-w-3xl"><div className="prose-ajiya"><p className="lead">This page is a placeholder for the formal {kind === "privacy" ? "privacy policy" : "terms and conditions"} that will govern the website when the final legal copy is approved.</p><h2>In the meantime</h2><p>Please contact AJIYA Urban Rise directly with any questions about this website, the information presented here, or how an enquiry is handled.</p><Link href="/contact" className="button button--dark mt-6">Contact AJIYA <ArrowUpRight size={16} /></Link></div></div></article></PageShell>;
}

export { AboutPage, ArticlePage, ContactPage, FaqPage, Home, InvestPage, InsightsPage, LegalPage, ProjectPage, ProjectsPage, PropertiesPage, PropertyPage, ServiceDetailPage, ServicesPage };
