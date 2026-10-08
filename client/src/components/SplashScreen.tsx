import { useEffect, useState } from "react";

const SEEN_KEY = "ajiya-splash-seen";

/**
 * Brand loading screen: the AJIYA logo eases in with a drawing underline, holds briefly,
 * then fades out. Shown once per browser session (sessionStorage) so navigating back to the
 * site or refreshing mid-visit doesn't replay it. Deliberately time-based, not a fake
 * percentage counter — a progress number that isn't tied to real asset loading would be
 * misleading. Reduced-motion users get a static logo and a much shorter hold.
 */
export default function SplashScreen() {
  const [phase, setPhase] = useState<"show" | "exit" | "done">(() => {
    try {
      return sessionStorage.getItem(SEEN_KEY) ? "done" : "show";
    } catch {
      return "show"; // storage blocked (private mode) — just show it; worst case it replays
    }
  });

  useEffect(() => {
    if (phase === "done") return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const holdMs = reduce ? 500 : 1700;
    const exitTimer = window.setTimeout(() => setPhase("exit"), holdMs);
    const doneTimer = window.setTimeout(() => {
      setPhase("done");
      try { sessionStorage.setItem(SEEN_KEY, "1"); } catch { /* ignore */ }
    }, holdMs + 600);
    return () => { window.clearTimeout(exitTimer); window.clearTimeout(doneTimer); };
  }, [phase === "done"]);

  if (phase === "done") return null;
  return (
    <div className={`splash ${phase === "exit" ? "is-exiting" : ""}`} role="status" aria-live="polite">
      <div className="splash-inner">
        <img src="/images/ajiya-logo.webp" alt="AJIYA Urban Rise" className="splash-logo" />
        <span className="splash-line" aria-hidden="true" />
      </div>
      <span className="sr-only">Loading AJIYA Urban Rise</span>
    </div>
  );
}
