// Concrete & Canopy style reminder: keep content structured, editorial, and opportunity-led; avoid dense marketplace language.
//
// Sprint 2 migration note: `services`, `serviceDetails`, `projects`, `curatedProperties`,
// `propertyCategories`, `insights`, and `teamMembers` used to live here as hardcoded arrays.
// That content now comes from the CMS — see client/src/lib/cms-client.ts and cms/SETUP.md.
// What remains below is page chrome/structure that isn't editorial content and wasn't part
// of the five CMS content types by design.

export const assets = {
  // Local brand assets, optimized (see cms/../ Sprint 3 notes): hero is served responsively
  // via the .brand-hero-bg CSS class (client/src/index.css) — this path exists mainly as an
  // identity check in PageHero, not for direct rendering. Fallback JPEG covers browsers
  // without WebP support.
  hero: "/images/ajiya-hero-1920.webp",
  heroFallback: "/images/ajiya-hero-fallback.jpg",
  // Real AJIYA Urban Rise project renders (provided by the client) — replacing the Unsplash
  // stock that was here before. Cropped/optimized from source files; the two originals had
  // a social-post caption and profile-photo overlay baked in and a WhatsApp-style vignette
  // frame respectively — both were cropped back to the clean underlying render/photo rather
  // than discarded. Full-resolution/CMS versions of these live in cms/scripts/placeholder-images/.
  signature: "/images/ajiya-signature-estate.jpg",
  urban: "/images/ajiya-urban-rise.jpg",
  opportunity: "/images/ajiya-opportunity.jpg",
  mark: "/images/ajiya-logo.webp",
  instagram: "https://www.instagram.com/ajiyaurbanrise/",
  brochure: "/ajiya-urban-rise-brochure.pdf",
};

export const navItems = [
  { label: "About", href: "/about" },
  { label: "Services", href: "/services" },
  { label: "Projects", href: "/projects" },
  { label: "Properties", href: "/properties" },
  { label: "Invest", href: "/invest" },
  { label: "Insights", href: "/insights" },
];

export const trustReasons = [
  { index: "01", title: "Abuja rooted", copy: "We understand the city we are helping shape and the opportunities inside its growth." },
  { index: "02", title: "One connected view", copy: "Development, sales, investment, management, and construction work better when they speak to each other." },
  { index: "03", title: "Clarity first", copy: "We make space for practical questions, so buyers and investors can move with better context." },
  { index: "04", title: "Built for the long view", copy: "We care about the value a place can create after the first conversation." },
];

export const philosophy = [
  { label: "Land", copy: "Begin with possibility." },
  { label: "Development", copy: "Shape it with intention." },
  { label: "Community", copy: "Make room for people." },
  { label: "Legacy", copy: "Let value endure." },
];

export const whatsappMessage = (context = "AJIYA Urban Rise") =>
  `https://wa.me/2349033734656?text=${encodeURIComponent(`Hello, I am interested in learning more about ${context}.`)}`;

// Static coverage signal for the Properties page — not tied to specific listings, just the
// areas AJIYA is active in/around. Edit this list directly; it isn't CMS-driven.
export const areasCovered = [
  "Asokoro",
  "Gwarinpa",
  "Maitama",
  "Katampe",
  "Katampe Extension",
  "Jahi",
  "Life Camp",
  "Kubwa",
  "Idu",
  "Lugbe",
  "Gudu",
];

// Shown on the Contact page. Edit directly if hours change — not CMS-driven.
export const officeHours = [
  { days: "Monday – Friday", hours: "09:00 – 17:00" },
  { days: "Saturday", hours: "09:00 – 15:00" },
  { days: "Sunday", hours: "Closed" },
];

// FAQ page content. These questions were supplied directly; the answers were drafted as
// general, honest guidance (not AJIYA-specific guarantees or figures) since no answers were
// given — review and personalize before treating this as final official copy, especially the
// two about valuation/pricing.
export const faqs = [
  {
    question: "Is now a good time to buy or sell?",
    answer:
      "It depends more on your own circumstances and goals than on timing the market perfectly — your budget, your timeline, and what you're trying to achieve matter more than waiting for a theoretically ideal moment. The most useful next step is usually a direct conversation about your specific situation, not a generic yes or no.",
  },
  {
    question: "How is the housing market right now in my area?",
    answer:
      "Market conditions vary by district, even within Abuja, and change over time — so rather than give a generic answer here, the most accurate picture comes from a direct conversation with our team about the specific area you're interested in.",
  },
  {
    question: "What are the steps involved in selling my house?",
    answer:
      "In general: an initial valuation and consultation, preparing the property and its documentation, bringing it to the right buyers, negotiating offers, then handling the legal transfer and closing. We can walk you through what each step looks like for your specific property.",
  },
  {
    question: "How do you determine how much my home is worth?",
    answer:
      "A combination of factors: location, size and condition, comparable recent sales nearby, current demand, and the state of the property's documentation and title. We talk through all of these with you directly rather than relying on a single automated number.",
  },
  {
    question: "What price can I expect to get in the current market?",
    answer:
      "This depends on your specific property and current conditions in its area, so it isn't something we'd want to guess at generically. A proper valuation and conversation with our team will give you a realistic, specific answer.",
  },
  {
    question: "Does choosing the right team really make a difference?",
    answer:
      "Yes — the right team affects how well a property is presented and marketed, how negotiations are handled, how carefully documentation and title are checked, and ultimately how smoothly (and safely) a transaction closes. That's the connected view AJIYA Urban Rise takes across development, sales, investment, management, and construction.",
  },
];
