// Concrete & Canopy style reminder: use quiet editorial framing, visible marks, charcoal/limestone contrast, and calm conversion cues.
import { useEffect, useState, type FormEvent } from "react";
import { ArrowUpRight, Menu, MessageCircle, X } from "lucide-react";
import { Link, useLocation } from "wouter";
import { assets, navItems, whatsappMessage, officeHours } from "@/data/site";
import { subscribeNewsletter } from "@/lib/api-client";

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className={`brand-lockup group ${compact ? "brand-lockup--compact" : ""}`} aria-label="AJIYA Urban Rise home">
      <span className="brand-image-wrap"><img src={assets.mark} alt="AJIYA Urban Rise Ltd logo" className="brand-image" /></span>
      {!compact && <span className="brand-copy"><span>AJIYA</span><small>URBAN RISE</small></span>}
    </Link>
  );
}

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [location] = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 34);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => setOpen(false), [location]);

  return (
    <header className={`site-header ${scrolled || location !== "/" ? "site-header--scrolled" : ""}`}>
      <div className="container flex h-[76px] items-center justify-between">
        <Brand />
        <nav className="hidden items-center gap-7 lg:flex" aria-label="Primary navigation">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className="nav-link">
              {item.label}
            </Link>
          ))}
          <Link href="/contact" className="button button--dark button--small">
            Make an enquiry <ArrowUpRight size={15} strokeWidth={1.7} />
          </Link>
        </nav>
        <button className="mobile-menu-button lg:hidden" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-label={open ? "Close menu" : "Open menu"}>
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>
      <div className={`mobile-menu lg:hidden ${open ? "mobile-menu--open" : ""}`} aria-hidden={!open}>
        <div className="container flex flex-col gap-1 pb-6 pt-2">
          {navItems.map((item, index) => (
            <Link key={item.href} href={item.href} className="mobile-nav-link" style={{ transitionDelay: `${index * 30}ms` }}>
              <span>0{index + 1}</span>{item.label}<ArrowUpRight size={17} />
            </Link>
          ))}
          <Link href="/contact" className="button button--dark mt-4 justify-center">Talk to an expert <ArrowUpRight size={16} /></Link>
        </div>
      </div>
    </header>
  );
}

function NewsletterSignup() {
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [email, setEmail] = useState("");
  const [companyWebsite, setCompanyWebsite] = useState(""); // honeypot
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const subscriberName = email.trim().split("@")[0].replace(/[._-]+/g, " ");

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setStatus("submitting");
    setErrorMessage(null);
    const result = await subscribeNewsletter({ email, companyWebsite });
    if (result.ok) {
      setStatus("success");
      setShowToast(true);
    } else {
      setStatus("error");
      setErrorMessage(result.error.message);
    }
  };

  return <div className="newsletter-strip"><div><p className="eyebrow text-limestone/45">Stay in the loop</p><h2>News and insight straight to your inbox.</h2><p>We don’t spam.</p></div>{status === "success" ? <div className="newsletter-success"><span className="newsletter-success-check">✓</span><div><strong>You’re on the list.</strong><span>We’ll be in touch when there is something worth sharing.</span></div></div> : <form className="newsletter-form" onSubmit={submit} noValidate><label><span className="sr-only">Email address</span><input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Your email address" /></label><label className="sr-only" style={{ position: "absolute", left: "-9999px" }}>Company website<input tabIndex={-1} autoComplete="off" value={companyWebsite} onChange={(event) => setCompanyWebsite(event.target.value)} /></label><button className="button button--cream" type="submit" disabled={status === "submitting"}>{status === "submitting" ? "Subscribing…" : "Subscribe"} <ArrowUpRight size={15} /></button>{status === "error" && errorMessage && <p className="form-error mt-2" role="alert">{errorMessage}</p>}</form>}{showToast && <div className="newsletter-toast" role="status" aria-live="polite"><div className="newsletter-toast-icon">✓</div><div><span className="eyebrow">AJIYA / NOTES</span><strong>Thank you{subscriberName ? `, ${subscriberName}` : ""}.</strong><p>You’re now connected to the ideas, places, and opportunities shaping what’s next.</p></div><button type="button" onClick={() => setShowToast(false)} aria-label="Close thank-you message">×</button></div>}</div>;
}

export function Footer() {
  return (
    <footer className="border-t border-charcoal/10 bg-charcoal text-limestone">
      <div className="container py-16 md:py-20"><NewsletterSignup />
        <div className="grid gap-12 lg:grid-cols-[1.2fr_0.7fr_0.7fr_1fr]">
          <div>
            <Brand />
            <p className="mt-7 max-w-sm text-[0.94rem] leading-7 text-limestone/60">
              Creating opportunities, building lasting value, and leaving a legacy across Nigeria’s evolving urban landscape.
            </p>
            <Link href="/contact" className="footer-cta mt-7">Start a conversation <ArrowUpRight size={16} /></Link>
          </div>
          <div>
            <p className="eyebrow text-limestone/40">Explore</p>
            <div className="mt-5 flex flex-col gap-3">
              {navItems.slice(0, 4).map((item) => <Link key={item.href} href={item.href} className="footer-link">{item.label}</Link>)}
            </div>
          </div>
          <div>
            <p className="eyebrow text-limestone/40">Connect</p>
            <div className="mt-5 flex flex-col gap-3">
              <a className="footer-link" href="tel:+2349033734656">+234 903 373 4656</a>
              <a className="footer-link" href="mailto:hello@ajiyaurbanrise.com">hello@ajiyaurbanrise.com</a>
              <a className="footer-link" href={whatsappMessage()} target="_blank" rel="noreferrer">WhatsApp</a><a className="footer-link" href={assets.instagram} target="_blank" rel="noreferrer">Instagram</a>
            </div>
          </div>
          <div>
            <p className="eyebrow text-limestone/40">Visit</p>
            <p className="mt-5 max-w-[15rem] text-sm leading-6 text-limestone/65">Suite 1021, Third Floor<br />Los Angeles Mall<br />Ahmadu Bello Way<br />Mabushi, Abuja, Nigeria</p><div className="mt-4 flex flex-col gap-1 text-xs text-limestone/50">{officeHours.map((row) => <div key={row.days} className="flex justify-between gap-4"><span>{row.days}</span><span>{row.hours}</span></div>)}</div>
          </div>
        </div>
        <div className="mt-14 flex flex-col justify-between gap-4 border-t border-limestone/10 pt-5 text-[0.7rem] uppercase tracking-[0.14em] text-limestone/35 sm:flex-row">
          <span>© {new Date().getFullYear()} AJIYA Urban Rise Ltd</span>
          <div className="flex gap-5"><Link href="/faq" className="hover:text-limestone transition-colors">FAQ</Link><Link href="/privacy" className="hover:text-limestone transition-colors">Privacy</Link><Link href="/terms" className="hover:text-limestone transition-colors">Terms</Link></div>
        </div>
      </div>
    </footer>
  );
}

export function WhatsAppFab({ context }: { context?: string }) {
  return (
    <a className="whatsapp-fab" href={whatsappMessage(context)} target="_blank" rel="noreferrer" aria-label="Chat with AJIYA Urban Rise on WhatsApp">
      <span className="whatsapp-fab-pulse" aria-hidden="true" />
      <MessageCircle size={19} strokeWidth={1.6} />
      <span className="whatsapp-fab-copy"><strong>Chat with AJIYA</strong><small>WhatsApp · +234 903 373 4656</small></span>
      <ArrowUpRight size={15} strokeWidth={1.7} />
    </a>
  );
}

export function PageShell({ children, context }: { children: React.ReactNode; context?: string }) {
  return <><Header /><main>{children}</main><WhatsAppFab context={context} /><Footer /></>;
}
