"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { MagnifyingGlass, X, EnvelopeSimple, Prohibit, CheckCircle, ShieldCheck } from "@phosphor-icons/react";
import { getSupabaseBrowserClient } from "../../lib/supabase/client";

type AdminUser = {
  id: string; email: string | null; name: string | null; avatar_url: string | null;
  created_at: string; last_sign_in_at: string | null; email_confirmed: boolean;
  status: "active" | "suspended"; is_admin: boolean; workspace_id: number | null;
  plan: string | null; plan_name: string | null; subscription_status: string | null; billing_interval: string | null;
  credits: number; videos: number; videos_completed: number; videos_failed: number; listings: number;
  intro_bought: boolean; revenue_cents: number; source: string | null; campaign: string | null;
};
type Touch = Record<string, string>;
type Detail = {
  attribution: { first_touch: Touch; last_touch: Touch; recorded_at: string } | null;
  videos: { id: number; title: string; status: string; created_at: string; duration_seconds: number; credits: number; error: string | null }[];
  ledger: { created_at: string; amount: number; type: string; description: string | null }[];
  orders: { created_at: string; credits: number; net_cents: number; paid: boolean; refunded_credits: number }[];
  audit: { created_at: string; action: string; metadata: Record<string, unknown> | null }[];
};

const PLAN_LABEL: Record<string, string> = { "free-trial": "Free trial", "first-video": "First video", starter: "Starter", pro: "Pro", business: "Business" };
const PAID = new Set(["starter", "pro", "business"]);
const money = (cents: number) => `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: cents % 100 ? 2 : 0, maximumFractionDigits: 2 })}`;
const date = (iso: string | null) => (iso ? new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(iso)) : "—");
const dateTime = (iso: string) => new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(iso));
const initials = (u: AdminUser) => (u.name || u.email || "?").trim().split(/[\s@.]+/).map((p) => p[0]).join("").slice(0, 2).toUpperCase();
const VIDEO_STATUS: Record<string, string> = { awaiting_approval: "Ready", approved: "Approved", queued: "Queued", generating: "Generating", failed: "Failed", draft: "Draft" };

function Avatar({ user }: { user: AdminUser }) {
  return <span className="adm-avatar">{user.avatar_url && /^https:\/\//.test(user.avatar_url) ? <img src={user.avatar_url} alt="" referrerPolicy="no-referrer" /> : initials(user)}</span>;
}

function TouchRows({ touch }: { touch: Touch }) {
  const rows = Object.entries(touch ?? {}).filter(([k]) => k !== "seen_at");
  if (!rows.length) return <p className="adm-sub">Direct visit — no campaign parameters.</p>;
  return <dl className="adm-kv">{rows.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>;
}

export default function UsersSection() {
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [plan, setPlan] = useState("all");
  const [status, setStatus] = useState("all");
  const [selected, setSelected] = useState<AdminUser | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [detailError, setDetailError] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    const { data, error: rpcError } = await getSupabaseBrowserClient().rpc("admin_list_users");
    if (rpcError) { setError(rpcError.message); return; }
    setError("");
    setUsers(data as AdminUser[]);
  }, []);

  useEffect(() => { void Promise.resolve().then(load); }, [load]);

  useEffect(() => {
    if (!selected) return;
    let cancelled = false;
    void getSupabaseBrowserClient().rpc("admin_user_detail", { target_user_id: selected.id }).then(({ data, error: rpcError }) => {
      if (cancelled) return;
      setDetailError(rpcError?.message ?? "");
      setDetail(rpcError ? null : (data as Detail));
    });
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setSelected(null); };
    window.addEventListener("keydown", onKey);
    return () => { cancelled = true; window.removeEventListener("keydown", onKey); };
  }, [selected]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (users ?? []).filter((u) =>
      (!q || [u.name, u.email, u.campaign, u.source].some((v) => v?.toLowerCase().includes(q))) &&
      (plan === "all" || (plan === "paid" ? PAID.has(u.plan ?? "") : plan === "intro" ? u.intro_bought : u.plan === plan)) &&
      (status === "all" || u.status === status));
  }, [users, query, plan, status]);

  const summary = useMemo(() => {
    const list = (users ?? []).filter((u) => !u.is_admin);
    return [
      { label: "Users", value: list.length },
      { label: "Paying", value: list.filter((u) => PAID.has(u.plan ?? "") && ["active", "past_due", "trialing"].includes(u.subscription_status ?? "")).length },
      { label: "Bought the $1 video", value: list.filter((u) => u.intro_bought).length },
      { label: "Created a video", value: list.filter((u) => u.videos_completed > 0).length },
      { label: "Suspended", value: list.filter((u) => u.status === "suspended").length },
    ];
  }, [users]);

  function open(user: AdminUser) {
    setDetail(null);
    setDetailError("");
    setNotice("");
    setSelected(user);
  }

  async function toggleStatus(user: AdminUser) {
    const next = user.status === "suspended" ? "active" : "suspended";
    const reason = next === "suspended" ? window.prompt(`Why are you suspending ${user.email ?? "this user"}? This is saved in the audit log.`) : "Reactivated from admin";
    if (next === "suspended" && !reason?.trim()) return;
    setBusy(true);
    const { error: rpcError } = await getSupabaseBrowserClient().rpc("crm_set_user_status", { target_user_id: user.id, next_status: next, reason });
    setBusy(false);
    if (rpcError) { setNotice(rpcError.message); return; }
    const updated = { ...user, status: next } as AdminUser;
    setUsers((list) => list?.map((u) => (u.id === user.id ? updated : u)) ?? null);
    setSelected(updated);
    setNotice(next === "suspended" ? "Account suspended. They can no longer create videos." : "Account reactivated.");
  }

  if (error) return <section className="adm-card"><h2>Couldn’t load users</h2><p className="adm-sub">{error}</p><button className="adm-button" onClick={() => void load()}>Try again</button></section>;
  if (!users) return <section className="adm-card"><p className="adm-sub">Loading users…</p></section>;

  return (
    <>
      <section className="adm-user-summary" aria-label="User totals">
        {summary.map((s) => <article key={s.label} className="adm-card"><small>{s.label}</small><strong>{s.value.toLocaleString()}</strong></article>)}
      </section>

      <section className="adm-card">
        <div className="adm-section-head">
          <label className="adm-search"><MagnifyingGlass size={18} aria-hidden="true" /><input type="search" placeholder="Search name, email or campaign" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search users" /></label>
          <div className="adm-filters">
            <select value={plan} onChange={(e) => setPlan(e.target.value)} aria-label="Filter by plan">
              <option value="all">All plans</option><option value="paid">Paying plans</option><option value="intro">Bought $1 video</option>
              <option value="free-trial">Free trial</option><option value="starter">Starter</option><option value="pro">Pro</option><option value="business">Business</option>
            </select>
            <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status">
              <option value="all">All statuses</option><option value="active">Active</option><option value="suspended">Suspended</option>
            </select>
          </div>
        </div>
        <p className="adm-sub">{filtered.length} of {users.length} users · admins are marked and excluded from the totals above.</p>
        <div className="adm-table-wrap">
          <table className="adm-table adm-users-table">
            <thead><tr><th>User</th><th>Signed up</th><th>Plan</th><th>Credits</th><th>Videos</th><th>Revenue</th><th>Source</th><th>Last sign-in</th><th>Status</th></tr></thead>
            <tbody>
              {filtered.length ? filtered.map((u) => (
                <tr key={u.id} className="adm-row-link" tabIndex={0} onClick={() => open(u)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(u); } }} aria-label={`Open ${u.email ?? u.name ?? "user"}`}>
                  <td><div className="adm-user-cell"><Avatar user={u} /><div><b>{u.name || u.email?.split("@")[0] || "Unnamed"}{u.is_admin && <span className="adm-badge admin">Admin</span>}</b><small>{u.email}</small></div></div></td>
                  <td>{date(u.created_at)}</td>
                  <td>{u.plan ? PLAN_LABEL[u.plan] ?? u.plan_name : "—"}{u.intro_bought && <small>$1 video bought</small>}</td>
                  <td>{u.credits.toLocaleString()}</td>
                  <td>{u.videos_completed}/{u.videos}{u.videos_failed > 0 && <small>{u.videos_failed} failed</small>}</td>
                  <td>{u.revenue_cents ? money(u.revenue_cents) : "—"}</td>
                  <td>{u.source ?? "—"}{u.campaign && <small>{u.campaign}</small>}</td>
                  <td>{date(u.last_sign_in_at)}</td>
                  <td><span className={`adm-badge ${u.status}`}>{u.status === "suspended" ? "Suspended" : "Active"}</span></td>
                </tr>
              )) : <tr><td colSpan={9} className="adm-empty">No users match these filters.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      {selected && <>
        <button className="adm-drawer-backdrop" aria-label="Close user details" tabIndex={-1} onClick={() => setSelected(null)} />
        <aside className="adm-drawer" role="dialog" aria-modal="true" aria-labelledby="adm-drawer-title">
          <header>
            <Avatar user={selected} />
            <div><h2 id="adm-drawer-title">{selected.name || selected.email}</h2><p>{selected.email}{selected.email_confirmed ? "" : " · email not confirmed"}</p></div>
            <button className="adm-icon-button" aria-label="Close user details" onClick={() => setSelected(null)}><X size={18} /></button>
          </header>

          <dl className="adm-kv adm-drawer-facts">
            <div><dt>Plan</dt><dd>{selected.plan ? PLAN_LABEL[selected.plan] ?? selected.plan_name : "—"}{selected.subscription_status ? ` · ${selected.subscription_status.replace("_", " ")}` : ""}{selected.billing_interval && PAID.has(selected.plan ?? "") ? ` · ${selected.billing_interval}` : ""}</dd></div>
            <div><dt>Credits</dt><dd>{selected.credits.toLocaleString()}</dd></div>
            <div><dt>Revenue</dt><dd>{money(selected.revenue_cents)}</dd></div>
            <div><dt>Homes</dt><dd>{selected.listings}</dd></div>
            <div><dt>Signed up</dt><dd>{date(selected.created_at)}</dd></div>
            <div><dt>Last sign-in</dt><dd>{date(selected.last_sign_in_at)}</dd></div>
          </dl>

          <div className="adm-drawer-actions">
            {selected.email && <a className="adm-button secondary" href={`mailto:${selected.email}`}><EnvelopeSimple size={18} />Email</a>}
            {!selected.is_admin && <button className={`adm-button ${selected.status === "suspended" ? "" : "danger"}`} disabled={busy} onClick={() => void toggleStatus(selected)}>
              {selected.status === "suspended" ? <><CheckCircle size={18} />Reactivate</> : <><Prohibit size={18} />Suspend</>}
            </button>}
            {selected.is_admin && <span className="adm-badge admin"><ShieldCheck size={14} />Administrator</span>}
          </div>
          {notice && <p className="adm-notice" role="status">{notice}</p>}

          {detailError ? <p className="adm-notice">{detailError}</p> : !detail ? <p className="adm-sub">Loading details…</p> : <>
            <section><h3>Where they came from</h3>
              {detail.attribution ? <><TouchRows touch={detail.attribution.last_touch} />{JSON.stringify(detail.attribution.first_touch) !== JSON.stringify(detail.attribution.last_touch) && <><p className="adm-sub">First visit</p><TouchRows touch={detail.attribution.first_touch} /></>}</>
                : <p className="adm-sub">No attribution recorded (signed up before tracking, or didn’t allow marketing cookies).</p>}
            </section>
            <section><h3>Videos</h3>
              {detail.videos.length ? <ul className="adm-list">{detail.videos.map((v) => <li key={v.id}><div><b>{v.title}</b><small>{dateTime(v.created_at)} · {v.duration_seconds}s · {v.credits} credits{v.error ? ` · ${v.error}` : ""}</small></div><span className={`adm-badge ${v.status}`}>{VIDEO_STATUS[v.status] ?? v.status}</span></li>)}</ul> : <p className="adm-sub">No videos yet.</p>}
            </section>
            <section><h3>Payments</h3>
              {detail.orders.length ? <ul className="adm-list">{detail.orders.map((o, i) => <li key={i}><div><b>{money(o.net_cents)} · {o.credits} credits</b><small>{dateTime(o.created_at)}{o.refunded_credits ? ` · ${o.refunded_credits} credits refunded` : ""}</small></div><span className={`adm-badge ${o.paid ? "active" : "pending"}`}>{o.paid ? "Paid" : "Pending"}</span></li>)}</ul> : <p className="adm-sub">No one-time purchases.</p>}
            </section>
            <section><h3>Credit history</h3>
              {detail.ledger.length ? <ul className="adm-list">{detail.ledger.map((l, i) => <li key={i}><div><b>{l.description || l.type}</b><small>{dateTime(l.created_at)} · {l.type}</small></div><span className={l.amount < 0 ? "adm-amount negative" : "adm-amount"}>{l.amount > 0 ? "+" : ""}{l.amount}</span></li>)}</ul> : <p className="adm-sub">No credit activity.</p>}
            </section>
            {detail.audit.length > 0 && <section><h3>Admin actions</h3>
              <ul className="adm-list">{detail.audit.map((a, i) => <li key={i}><div><b>{a.action.replaceAll("_", " ")}</b><small>{dateTime(a.created_at)}{typeof a.metadata?.reason === "string" ? ` · ${a.metadata.reason}` : ""}</small></div></li>)}</ul>
            </section>}
          </>}
        </aside>
      </>}
    </>
  );
}
