// Concrete & Canopy style reminder: route pages through one consistent shell so navigation, context, and conversion remain calm and legible.
import { lazy, Suspense, type ComponentType } from "react";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { Route, Switch, useRoute } from "wouter";
import NotFound from "./pages/NotFound";
import SplashScreen from "./components/SplashScreen";
import type * as HomeModule from "./pages/Home";

/**
 * Route-level code splitting: client/src/pages/Home.tsx holds every page component in one
 * module (a pre-existing architectural choice, not something restructured here — splitting
 * it into one file per page was judged too large/risky a change to make blind this pass).
 *
 * React.lazy() requires a module with a `default` export, but Home.tsx only has named
 * exports — so each page is wrapped individually via lazyNamed below, all pointing at the
 * same dynamic import() specifier. Vite/the browser module loader caches that import() call,
 * so this does NOT re-fetch the Home.tsx chunk once per page — it's fetched once, on first
 * navigation into any of these routes, deferred behind the initial app-shell paint rather
 * than blocking it. Splitting Home.tsx itself into per-page chunks (so visiting "/" doesn't
 * pull in Contact/Insights/etc. code too) is a legitimate further win, but a larger,
 * separate refactor — flagged here, not silently skipped.
 */
function lazyNamed<K extends keyof typeof HomeModule>(exportName: K) {
  return lazy(async () => {
    const module = await import("./pages/Home");
    return { default: module[exportName] as ComponentType<any> };
  });
}

const Home = lazyNamed("Home");
const AboutPage = lazyNamed("AboutPage");
const ServicesPage = lazyNamed("ServicesPage");
const ServiceDetailPage = lazyNamed("ServiceDetailPage");
const ProjectsPage = lazyNamed("ProjectsPage");
const ProjectPage = lazyNamed("ProjectPage");
const PropertiesPage = lazyNamed("PropertiesPage");
const PropertyPage = lazyNamed("PropertyPage");
const AdminPage = lazy(() => import("./pages/Admin"));
const FaqPage = lazyNamed("FaqPage");
const InvestPage = lazyNamed("InvestPage");
const InsightsPage = lazyNamed("InsightsPage");
const ArticlePage = lazyNamed("ArticlePage");
const ContactPage = lazyNamed("ContactPage");
const LegalPage = lazyNamed("LegalPage");

function RouteFallback() {
  return (
    <div className="cms-state" role="status" aria-live="polite" style={{ minHeight: "60vh" }}>
      <span className="cms-state-spinner" aria-hidden="true" />
      <span className="sr-only">Loading…</span>
    </div>
  );
}

function ServiceRoute() {
  const [, params] = useRoute("/services/:slug");
  return <ServiceDetailPage slug={params?.slug ?? "development"} />;
}

function ProjectRoute() {
  const [, params] = useRoute("/projects/:id");
  return <ProjectPage id={params?.id ?? "signature-estate"} />;
}

function PropertyRoute() {
  const [, params] = useRoute("/properties/:slug");
  return <PropertyPage slug={params?.slug ?? ""} />;
}

function ArticleRoute() {
  const [, params] = useRoute("/insights/:id");
  return <ArticlePage id={params?.id ?? "why-context-matters"} />;
}

function Router() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/about" component={AboutPage} />
        <Route path="/services" component={ServicesPage} />
        <Route path="/services/:slug" component={ServiceRoute} />
        <Route path="/projects" component={ProjectsPage} />
        <Route path="/projects/:id" component={ProjectRoute} />
        <Route path="/properties" component={PropertiesPage} />
        <Route path="/properties/:slug" component={PropertyRoute} />
        <Route path="/invest" component={InvestPage} />
        <Route path="/insights" component={InsightsPage} />
        <Route path="/insights/:id" component={ArticleRoute} />
        <Route path="/contact" component={ContactPage} />
        <Route path="/faq" component={FaqPage} />
        <Route path="/privacy" component={() => <LegalPage kind="privacy" />} />
        <Route path="/terms" component={() => <LegalPage kind="terms" />} />
        <Route path="/admin" component={AdminPage} />
        <Route path="/404" component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <SplashScreen />
        <Router />
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
