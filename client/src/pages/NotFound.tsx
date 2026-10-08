// Concrete & Canopy style reminder: fallback states stay calm, branded, and editorial rather than feeling like an unrelated system screen.
import { ArrowUpRight } from "lucide-react";
import { Link } from "wouter";
import { PageShell } from "@/components/SiteChrome";

export default function NotFound() {
  return <PageShell><section className="article-hero article-hero--short min-h-[68vh] flex items-center"><div className="container"><span className="eyebrow text-canopy">AJIYA Urban Rise</span><h1>This page took<br /><em>a different route.</em></h1><p>The place you are looking for is not here, but the next conversation can still begin.</p><Link href="/" className="button button--dark mt-8">Return home <ArrowUpRight size={16} /></Link></div></section></PageShell>;
}
