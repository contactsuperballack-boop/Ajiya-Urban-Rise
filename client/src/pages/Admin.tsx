import { Fragment, useCallback, useEffect, useMemo, useState, type FormEvent } from "react";

/**
 * Internal lead-management view. Not part of the public site: no header/footer, noindex,
 * and it only ever talks to /api/admin/* which is gated by a shared password (see
 * server/adminAuth.ts). Credentials are held in memory only — never localStorage — so a
 * refresh logs you out; that's deliberate for a shared-password tool.
 */

const STATUSES = ["NEW", "CONTACTED", "QUALIFIED", "VIEWING", "NEGOTIATING", "CONVERTED", "LOST"] as const;
type Status = (typeof STATUSES)[number];

interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  interest: string;
  message: string;
  sourcePage?: string;
  relatedProjectSlug?: string;
  relatedPropertySlug?: string;
  requestType: "enquiry" | "site_visit";
  preferredVisitDate?: string;
  preferredVisitTime?: string;
  submittedAt: string;
  status: Status;
}
interface Subscriber { id: string; email: string; subscribedAt: string; status: string }

class AuthError extends Error {}

async function adminFetch<T>(path: string, auth: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api/admin${path}`, {
    ...init,
    headers: { ...(init?.headers ?? {}), Authorization: auth, ...(init?.body ? { "Content-Type": "application/json" } : {}) },
  });
  if (res.status === 401 || res.status === 429) {
    const body = await res.json().catch(() => ({}));
    throw new AuthError(body.error ?? "Not authorised.");
  }
  if (res.status === 404) throw new Error("The admin area isn't enabled on this server (ADMIN_USERNAME/ADMIN_PASSWORD not set).");
  if (!res.ok) throw new Error("Request failed. Please try again.");
  return res.json();
}

function csvEscape(value: unknown): string {
  let text = String(value ?? "");
  // Neutralise spreadsheet formula injection: a lead could type =HYPERLINK(...) as their name.
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

function downloadCsv(filename: string, rows: string[][]) {
  const blob = new Blob([rows.map((r) => r.map(csvEscape).join(",")).join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

const fmt = (iso: string) => new Date(iso).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
const waLink = (phone: string) => `https://wa.me/${phone.replace(/[^\d]/g, "").replace(/^0/, "234")}`;

function Login({ onLogin }: { onLogin: (auth: string) => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true); setError(null);
    // UTF-8-safe base64 (btoa alone throws on non-Latin1 characters in a password).
    const auth = "Basic " + btoa(String.fromCharCode(...new TextEncoder().encode(`${username}:${password}`)));
    try {
      await adminFetch("/session", auth);
      onLogin(auth);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in.");
    } finally { setBusy(false); }
  };

  return (
    <main className="admin-shell admin-login">
      <form onSubmit={submit} className="enquiry-form">
        <p className="eyebrow text-canopy">AJIYA internal</p>
        <h1 className="font-display text-3xl">Lead management</h1>
        <div className="form-grid mt-8">
          <label>Username<input autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} required /></label>
          <label>Password<input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required /></label>
        </div>
        {error && <p className="form-error mt-4" role="alert">{error}</p>}
        <button className="button button--dark mt-7" type="submit" disabled={busy}>{busy ? "Checking…" : "Sign in"}</button>
      </form>
    </main>
  );
}

function Dashboard({ auth, onSignOut }: { auth: string; onSignOut: () => void }) {
  const [tab, setTab] = useState<"leads" | "subscribers">("leads");
  const [leads, setLeads] = useState<Lead[] | null>(null);
  const [subscribers, setSubscribers] = useState<Subscriber[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<"all" | "enquiry" | "site_visit">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | Status>("all");
  const [open, setOpen] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [l, s] = await Promise.all([
        adminFetch<{ leads: Lead[] }>("/leads", auth),
        adminFetch<{ subscribers: Subscriber[] }>("/subscribers", auth),
      ]);
      setLeads(l.leads); setSubscribers(s.subscribers);
    } catch (err) {
      if (err instanceof AuthError) return onSignOut();
      setError(err instanceof Error ? err.message : "Could not load data.");
    }
  }, [auth, onSignOut]);

  useEffect(() => { void load(); }, [load]);

  const setStatus = async (id: string, status: Status) => {
    const previous = leads;
    setLeads((cur) => cur?.map((l) => (l.id === id ? { ...l, status } : l)) ?? cur); // optimistic
    try {
      await adminFetch(`/leads/${id}`, auth, { method: "PATCH", body: JSON.stringify({ status }) });
    } catch (err) {
      setLeads(previous); // roll back so the screen never shows a status that didn't save
      if (err instanceof AuthError) return onSignOut();
      setError("Could not save that status change — it has been reverted.");
    }
  };

  const shown = useMemo(
    () => (leads ?? []).filter((l) => (typeFilter === "all" || l.requestType === typeFilter) && (statusFilter === "all" || l.status === statusFilter)),
    [leads, typeFilter, statusFilter],
  );
  const newCount = (leads ?? []).filter((l) => l.status === "NEW").length;
  const visitCount = (leads ?? []).filter((l) => l.requestType === "site_visit" && l.status === "NEW").length;

  return (
    <main className="admin-shell">
      <header className="admin-header">
        <div><p className="eyebrow text-canopy">AJIYA internal</p><h1 className="font-display text-3xl">Lead management</h1></div>
        <div className="flex gap-2"><button className="filter-button" onClick={() => void load()} type="button">Refresh</button><button className="filter-button" onClick={onSignOut} type="button">Sign out</button></div>
      </header>

      {error && <p className="form-error" role="alert">{error}</p>}

      <div className="admin-stats">
        <div><strong>{leads?.length ?? "—"}</strong><span>Total leads</span></div>
        <div><strong>{newCount}</strong><span>New (unactioned)</span></div>
        <div><strong>{visitCount}</strong><span>New site-visit requests</span></div>
        <div><strong>{subscribers?.length ?? "—"}</strong><span>Newsletter subscribers</span></div>
      </div>

      <div className="mt-8 flex flex-wrap gap-2" role="tablist">
        <button role="tab" aria-selected={tab === "leads"} className={`filter-button ${tab === "leads" ? "is-active" : ""}`} onClick={() => setTab("leads")} type="button">Leads &amp; visit requests</button>
        <button role="tab" aria-selected={tab === "subscribers"} className={`filter-button ${tab === "subscribers" ? "is-active" : ""}`} onClick={() => setTab("subscribers")} type="button">Subscribers</button>
      </div>

      {tab === "leads" && (
        <>
          <div className="admin-toolbar">
            <select aria-label="Filter by type" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as typeof typeFilter)}><option value="all">All types</option><option value="enquiry">Enquiries</option><option value="site_visit">Site visits</option></select>
            <select aria-label="Filter by status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}><option value="all">All statuses</option>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select>
            <button className="filter-button ml-auto" type="button" disabled={!shown.length} onClick={() => downloadCsv("ajiya-leads.csv", [["Submitted", "Type", "Visit date", "Visit time", "Name", "Email", "Phone", "Interest", "Project", "Property", "Source page", "Status", "Message"], ...shown.map((l) => [l.submittedAt, l.requestType, l.preferredVisitDate ?? "", l.preferredVisitTime ?? "", l.name, l.email, l.phone, l.interest, l.relatedProjectSlug ?? "", l.relatedPropertySlug ?? "", l.sourcePage ?? "", l.status, l.message])])}>Export CSV ({shown.length})</button>
          </div>
          {leads === null ? <p className="mt-6 text-sm">Loading…</p> : shown.length === 0 ? <p className="mt-6 text-sm text-charcoal/60">No leads match these filters.</p> : (
            <div className="admin-table-wrap"><table className="admin-table">
              <thead><tr><th>Received</th><th>Type</th><th>Contact</th><th>Interest / context</th><th>Status</th></tr></thead>
              <tbody>{shown.map((l) => (
                <Fragment key={l.id}>
                  <tr className={l.status === "NEW" ? "is-new" : undefined}>
                    <td>{fmt(l.submittedAt)}</td>
                    <td>{l.requestType === "site_visit" ? <span className="admin-badge admin-badge--visit">Site visit<br /><small>{l.preferredVisitDate} · {l.preferredVisitTime}</small></span> : <span className="admin-badge">Enquiry</span>}</td>
                    <td><strong>{l.name}</strong><br /><a href={`mailto:${l.email}`}>{l.email}</a><br /><a href={`tel:${l.phone}`}>{l.phone}</a> · <a href={waLink(l.phone)} target="_blank" rel="noreferrer">WhatsApp</a></td>
                    <td>{l.interest}{(l.relatedProjectSlug || l.relatedPropertySlug) && <><br /><small>{[l.relatedProjectSlug && `project: ${l.relatedProjectSlug}`, l.relatedPropertySlug && `property: ${l.relatedPropertySlug}`].filter(Boolean).join(" · ")}</small></>}{l.sourcePage && <><br /><small>from {l.sourcePage}</small></>}<br /><button type="button" className="admin-link" onClick={() => setOpen(open === l.id ? null : l.id)}>{open === l.id ? "Hide message" : "Show message"}</button></td>
                    <td><select aria-label={`Status for ${l.name}`} value={l.status} onChange={(e) => void setStatus(l.id, e.target.value as Status)}>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select></td>
                  </tr>
                  {open === l.id && <tr className="admin-message-row"><td colSpan={5}>{l.message}</td></tr>}
                </Fragment>
              ))}</tbody>
            </table></div>
          )}
        </>
      )}

      {tab === "subscribers" && (
        <>
          <div className="admin-toolbar"><button className="filter-button ml-auto" type="button" disabled={!subscribers?.length} onClick={() => downloadCsv("ajiya-subscribers.csv", [["Subscribed", "Email", "Status"], ...(subscribers ?? []).map((s) => [s.subscribedAt, s.email, s.status])])}>Export CSV ({subscribers?.length ?? 0})</button></div>
          {subscribers === null ? <p className="mt-6 text-sm">Loading…</p> : subscribers.length === 0 ? <p className="mt-6 text-sm text-charcoal/60">No subscribers yet.</p> : (
            <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Subscribed</th><th>Email</th><th>Status</th></tr></thead><tbody>{subscribers.map((s) => <tr key={s.id}><td>{fmt(s.subscribedAt)}</td><td>{s.email}</td><td>{s.status}</td></tr>)}</tbody></table></div>
          )}
        </>
      )}
    </main>
  );
}

export default function AdminPage() {
  const [auth, setAuth] = useState<string | null>(null);
  useEffect(() => {
    const meta = document.createElement("meta");
    meta.name = "robots"; meta.content = "noindex, nofollow";
    document.head.appendChild(meta);
    const previous = document.title;
    document.title = "Lead management — AJIYA internal";
    return () => { meta.remove(); document.title = previous; };
  }, []);
  return auth ? <Dashboard auth={auth} onSignOut={() => setAuth(null)} /> : <Login onLogin={setAuth} />;
}
