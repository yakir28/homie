"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { SquaresFour, ChartBar, Megaphone, Wallet, SlidersHorizontal, ArrowSquareOut, CaretDoubleLeft, CaretDoubleRight, ArrowsClockwise, Users, CurrencyDollar, FilmStrip, CreditCard, UserCircle, CalendarBlank } from "@phosphor-icons/react";
import HomieLogo from "../HomieLogo";
import { getSupabaseBrowserClient } from "../../lib/supabase/client";
import UsersSection from "./UsersSection";
import "./admin.css";

type Campaign = {
  source: string; campaign: string; signups: number; intro_purchases: number; completed_videos: number;
  subscriptions: number; revenue_cents: number; spend_cents: number; impressions: number | null; clicks: number | null;
};
type Day = { day: string; signups: number; intro_purchases: number; revenue_cents: number; spend_cents: number };
type SpendRow = { id: number; day: string; campaign: string; adset: string; ad: string; amount_cents: number; impressions: number | null; clicks: number | null };
type Stats = {
  totals: { signups: number; intro_purchases: number; completed_videos: number; subscriptions: number; cohort_revenue_cents: number };
  revenue_in_range_cents: number; spend_cents: number; active_subscriptions: number; mrr_cents: number;
  generation: { videos: number; seconds: number; est_cost_cents: number };
  campaigns: Campaign[]; daily: Day[]; spend_rows: SpendRow[];
};
type SpendInput = { spend_date: string; campaign: string; adset: string; ad: string; amount: string; impressions: string; clicks: string };

const META_URL_PARAMS = "utm_source=meta&utm_medium=paid&utm_campaign={{campaign.name}}&utm_term={{adset.name}}&utm_content={{ad.name}}";

const isoDay = (date: Date) => date.toISOString().slice(0, 10);
const daysAgo = (n: number) => { const d = new Date(); d.setUTCDate(d.getUTCDate() - n); return isoDay(d); };
const money = (cents: number) => `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: cents % 100 ? 2 : 0, maximumFractionDigits: 2 })}`;
const ratio = (a: number, b: number) => (b > 0 ? a / b : null);
const pct = (value: number | null) => (value === null ? "—" : `${(value * 100).toFixed(value < 0.1 ? 1 : 0)}%`);
const perUnit = (cents: number, count: number) => (count > 0 && cents > 0 ? money(Math.round(cents / count)) : "—");
const roas = (revenue: number, spend: number) => (spend > 0 ? `${(revenue / spend).toFixed(2)}x` : "—");

// Minimal RFC 4180 CSV parser (quoted fields, escaped quotes, CRLF).
function parseCsv(text: string): string[][] {
  const rows: string[][] = []; let row: string[] = []; let field = ""; let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field); field = "";
      if (row.some((cell) => cell.trim())) rows.push(row);
      row = [];
    } else field += c;
  }
  row.push(field);
  if (row.some((cell) => cell.trim())) rows.push(row);
  return rows;
}

// Reads a Meta Ads Manager export (broken down by day) into spend rows.
function metaCsvToRows(text: string): { rows: SpendInput[]; error?: string } {
  const [header, ...body] = parseCsv(text.replace(/^\uFEFF/, ""));
  if (!header) return { rows: [], error: "The file is empty." };
  const col = (...names: string[]) => header.findIndex((h) => names.some((n) => h.trim().toLowerCase().startsWith(n)));
  const day = col("day", "reporting starts", "date");
  const campaign = col("campaign name", "campaign");
  const adset = col("ad set name", "ad set");
  const ad = col("ad name");
  const spent = col("amount spent", "spend", "cost");
  const impressions = col("impressions");
  const clicks = col("link clicks", "clicks (all)", "clicks");
  if (day < 0 || campaign < 0 || spent < 0) return { rows: [], error: "Couldn’t find the Day, Campaign name and Amount spent columns. Export from Ads Manager with a daily breakdown." };
  const number = (value: string | undefined) => (value ?? "").replace(/[^0-9.-]/g, "");
  const rows = body.map((cells) => ({
    spend_date: (cells[day] ?? "").trim().slice(0, 10),
    campaign: (cells[campaign] ?? "").trim(),
    adset: adset >= 0 ? (cells[adset] ?? "").trim() : "",
    ad: ad >= 0 ? (cells[ad] ?? "").trim() : "",
    amount: number(cells[spent]) || "0",
    impressions: impressions >= 0 ? number(cells[impressions]) : "",
    clicks: clicks >= 0 ? number(cells[clicks]) : "",
  })).filter((row) => /^\d{4}-\d{2}-\d{2}$/.test(row.spend_date) && row.campaign);
  if (!rows.length) return { rows, error: "No rows with a date (YYYY-MM-DD) and campaign name were found." };
  return { rows };
}

function DailyChart({ days }: { days: Day[] }) {
  const max = Math.max(1, ...days.map((d) => Math.max(d.spend_cents, d.revenue_cents)));
  const maxSignups = Math.max(1, ...days.map((d) => d.signups));
  const w = 100 / Math.max(1, days.length);
  return (
    <figure className="adm-chart" aria-label="Daily spend, revenue and signups">
      <svg viewBox="0 0 100 40" preserveAspectRatio="none" role="img">
        {days.map((d, i) => (
          <g key={d.day}>
            <rect x={i * w + w * 0.12} width={w * 0.36} y={40 - (d.spend_cents / max) * 36} height={(d.spend_cents / max) * 36} className="spend"><title>{`${d.day} · spend ${money(d.spend_cents)}`}</title></rect>
            <rect x={i * w + w * 0.52} width={w * 0.36} y={40 - (d.revenue_cents / max) * 36} height={(d.revenue_cents / max) * 36} className="revenue"><title>{`${d.day} · revenue ${money(d.revenue_cents)}`}</title></rect>
          </g>
        ))}
        <polyline className="signups" fill="none" vectorEffect="non-scaling-stroke"
          points={days.map((d, i) => `${i * w + w / 2},${40 - (d.signups / maxSignups) * 36}`).join(" ")} />
      </svg>
      <figcaption>
        <span><i className="spend" />Ad spend</span><span><i className="revenue" />Revenue</span><span><i className="signups" />Signups (scaled)</span>
        <span className="adm-chart-range">{days[0]?.day} → {days.at(-1)?.day}</span>
      </figcaption>
    </figure>
  );
}

export default function AdminPage() {
  const [section, setSection] = useState("dashboard");
  const [collapsed, setCollapsed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [state, setState] = useState<"loading" | "denied" | "ready" | "error">("loading");
  const [error, setError] = useState("");
  const [from, setFrom] = useState(daysAgo(29));
  const [to, setTo] = useState(isoDay(new Date()));
  const [stats, setStats] = useState<Stats | null>(null);
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [sort, setSort] = useState<keyof Campaign>("spend_cents");

  const load = useCallback(async () => {
    const supabase = getSupabaseBrowserClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { window.location.replace("/login"); return; }
    const { data, error: rpcError } = await supabase.rpc("admin_marketing_stats", { from_date: from, to_date: to });
    if (rpcError) {
      if (/admin access/i.test(rpcError.message)) setState("denied");
      else { setError(rpcError.message); setState("error"); }
      return;
    }
    setStats(data as Stats);
    setState("ready");
  }, [from, to]);

  useEffect(() => {
    let cancelled = false;
    void Promise.resolve().then(() => { if (!cancelled) return load(); });
    return () => { cancelled = true; };
  }, [load]);

  async function saveRows(rows: SpendInput[], label: string) {
    setSaving(true); setNotice("");
    const { data, error: rpcError } = await getSupabaseBrowserClient().rpc("admin_upsert_ad_spend", { rows });
    setSaving(false);
    if (rpcError) return setNotice(`Couldn’t save: ${rpcError.message}`);
    setNotice(`${label}: ${data} ${data === 1 ? "row" : "rows"} saved.`);
    await load();
  }

  async function submitSpend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const row = Object.fromEntries(["spend_date", "campaign", "adset", "ad", "amount", "impressions", "clicks"].map((k) => [k, String(form.get(k) ?? "").trim()])) as SpendInput;
    if (!row.campaign || !row.amount) return setNotice("Campaign and amount are required.");
    await saveRows([row], "Spend");
    formElement.reset();
  }

  async function importCsv(file: File | undefined) {
    if (!file) return;
    const { rows, error: parseError } = metaCsvToRows(await file.text());
    if (parseError) return setNotice(parseError);
    await saveRows(rows, `Imported ${file.name}`);
  }

  async function deleteRow(id: number) {
    const { error: rpcError } = await getSupabaseBrowserClient().rpc("admin_delete_ad_spend", { target_id: id });
    if (rpcError) return setNotice(rpcError.message);
    await load();
  }

  const campaigns = useMemo(() => [...(stats?.campaigns ?? [])].sort((a, b) => Number(b[sort] ?? 0) - Number(a[sort] ?? 0)), [stats, sort]);

  if (state === "loading") return <main className="adm-shell adm-center"><p>Loading dashboard…</p></main>;
  if (state === "denied") return <main className="adm-shell adm-center"><h1>No access</h1><p>This page is only available to Homie admins.</p><Link href="/app">Back to Homie</Link></main>;
  if (state === "error" || !stats) return <main className="adm-shell adm-center"><h1>Couldn’t load the dashboard</h1><p>{error}</p><button className="adm-button" onClick={() => void load()}>Try again</button></main>;

  const t = stats.totals;
  const grossMargin = ratio(stats.revenue_in_range_cents - stats.generation.est_cost_cents, stats.revenue_in_range_cents);
  const funnel = [
    { label: "Signed up", value: t.signups },
    { label: "Bought the $1 video", value: t.intro_purchases },
    { label: "Completed a video", value: t.completed_videos },
    { label: "Subscribed", value: t.subscriptions },
  ];
  const kpis = [
    { label: "Revenue", value: money(stats.revenue_in_range_cents), hint: `ROAS ${roas(stats.revenue_in_range_cents, stats.spend_cents)}`, icon: CurrencyDollar, tone: "green" },
    { label: "New signups", value: t.signups.toLocaleString(), hint: `Cost per signup ${perUnit(stats.spend_cents, t.signups)}`, icon: Users, tone: "blue" },
    { label: "Active subscriptions", value: stats.active_subscriptions.toLocaleString(), hint: `MRR ${money(stats.mrr_cents)}`, icon: CreditCard, tone: "violet" },
    { label: "Videos generated", value: stats.generation.videos.toLocaleString(), hint: `${Math.round(stats.generation.seconds / 60)} minutes of video`, icon: FilmStrip, tone: "amber" },
  ];
  const navigation = [
    { id: "dashboard", label: "Dashboard", icon: SquaresFour },
    { id: "users", label: "Users", icon: Users },
    { id: "campaigns", label: "Campaigns", icon: Megaphone },
    { id: "spend", label: "Ad spend", icon: Wallet },
    { id: "tracking", label: "Tracking setup", icon: SlidersHorizontal },
  ];
  const pageTitle = navigation.find((item) => item.id === section)?.label ?? "Dashboard";
  const sortable: [keyof Campaign, string][] = [["spend_cents", "Spend"], ["signups", "Signups"], ["intro_purchases", "$1"], ["subscriptions", "Subs"], ["revenue_cents", "Revenue"]];

  return (
    <div className={`adm-workspace ${collapsed ? "is-collapsed" : ""}`}>
      <aside className="adm-sidebar" aria-label="Admin navigation">
        <Link href="/admin" className="adm-brand" aria-label="Homie admin"><HomieLogo /><span>Admin workspace</span></Link>
        <span className="adm-nav-label">WORKSPACE</span>
        <nav>{navigation.map(({ id, label, icon: Icon }) => <button key={id} title={label} aria-current={section === id ? "page" : undefined} className={section === id ? "active" : ""} onClick={() => setSection(id)}><Icon size={20} /><span>{label}</span></button>)}</nav>
        <div className="adm-sidebar-links"><span className="adm-nav-label">HOMIE</span><Link href="/app"><ArrowSquareOut size={20} /><span>Open app</span></Link><Link href="/"><ChartBar size={20} /><span>View website</span></Link></div>
        <div className="adm-sidebar-bottom"><div className="adm-account"><UserCircle size={32} /><div><b>Yakir</b><small>Administrator</small></div></div><button className="adm-collapse" onClick={() => setCollapsed(!collapsed)} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}>{collapsed ? <CaretDoubleRight size={18} /> : <CaretDoubleLeft size={18} />}<span>Collapse sidebar</span></button></div>
      </aside>
      <main className="adm-shell adm-content">
      <header className="adm-header">
        <div className="adm-title"><h1>{pageTitle}</h1><p>{section === "dashboard" ? "Welcome back. Here’s how Homie is doing." : section === "users" ? "Everyone who signed up, what they bought and what they made." : section === "campaigns" ? "See which campaigns turn interest into customers." : section === "spend" ? "Keep your marketing costs in one place." : "Connect your ads to the numbers that matter."}</p></div>
        <button className="adm-icon-button" disabled={refreshing} aria-label="Refresh dashboard" onClick={async () => { setRefreshing(true); try { await load(); } finally { setRefreshing(false); } }}><ArrowsClockwise size={20} className={refreshing ? "adm-spinning" : ""} /></button>
      </header>
      {section !== "users" && <div className="adm-toolbar"><span><CalendarBlank size={17} />Reporting period</span>
        <div className="adm-range" role="group" aria-label="Date range">
          {[7, 30, 90].map((n) => <button key={n} className={from === daysAgo(n - 1) && to === isoDay(new Date()) ? "active" : ""} onClick={() => { setFrom(daysAgo(n - 1)); setTo(isoDay(new Date())); }}>{n} days</button>)}
          <label><span className="sr">From</span><input type="date" value={from} max={to} onChange={(e) => e.target.value && setFrom(e.target.value)} /></label>
          <label><span className="sr">To</span><input type="date" value={to} min={from} onChange={(e) => e.target.value && setTo(e.target.value)} /></label>
        </div>
      </div>}

      {section === "users" && <UsersSection />}

      {section === "dashboard" && <>
      <section className="adm-kpis" aria-label="Key numbers">
        {kpis.map((k) => <article key={k.label} className="adm-card"><div className={`adm-metric-icon ${k.tone}`}><k.icon size={23} /></div><small>{k.label}</small><strong>{k.value}</strong><span>{k.hint}</span></article>)}
      </section>

      <section className="adm-grid adm-overview">
        <article className="adm-card adm-funnel">
          <h2>Conversion overview</h2>
          <p className="adm-sub">People who signed up in this range, and how far they got.</p>
          <ol>
            {funnel.map((step, i) => {
              const share = ratio(step.value, funnel[0].value);
              const fromPrev = i === 0 ? null : ratio(step.value, funnel[i - 1].value);
              return <li key={step.label}>
                <div className="adm-funnel-row"><span>{step.label}</span><b>{step.value.toLocaleString()}</b></div>
                <span className="adm-bar"><i style={{ width: `${Math.max(share ?? 0, step.value ? 0.02 : 0) * 100}%` }} /></span>
                {i > 0 && <small>{pct(fromPrev)} of previous step · {pct(share)} of signups</small>}
              </li>;
            })}
          </ol>
        </article>
        <article className="adm-card adm-daily"><h2>Revenue & acquisition</h2><p className="adm-sub">Spend and revenue per day, with signups.</p><DailyChart days={stats.daily} /></article>
      </section>

      <section className="adm-grid adm-bottom-grid">
        <article className="adm-card"><div className="adm-section-head"><h2>Top campaigns</h2><button className="adm-link" onClick={() => setSection("campaigns")}>View all</button></div>
          {[...stats.campaigns].sort((a,b) => b.revenue_cents - a.revenue_cents).slice(0,4).map((c,i) => <div className="adm-ranking" key={`${c.source}-${c.campaign}`}><span>{i+1}</span><div><b>{c.campaign}</b><small>{c.source} · {c.signups} signups</small></div><strong>{money(c.revenue_cents)}</strong></div>)}
          {!stats.campaigns.length && <p className="adm-empty">Your campaigns will appear here once there’s activity.</p>}
        </article>
        <article className="adm-card"><h2>Cost overview</h2><p className="adm-sub">For the selected reporting period.</p>
          <dl className="adm-costs"><div><dt>Advertising</dt><dd>{money(stats.spend_cents)}</dd></div><div><dt>Estimated generation cost</dt><dd>{money(stats.generation.est_cost_cents)}</dd></div><div><dt>Gross margin before ad spend</dt><dd>{pct(grossMargin)}</dd></div><div><dt>Intro purchases</dt><dd>{t.intro_purchases}</dd></div></dl>
        </article>
      </section>
      </>}
      {section === "campaigns" && <section className="adm-card">
        <div className="adm-section-head">
          <div><h2>Campaigns</h2><p className="adm-sub">Users are credited to the last campaign they clicked before signing up.</p></div>
          <div className="adm-sort" role="group" aria-label="Sort campaigns">{sortable.map(([key, label]) => <button key={key} className={sort === key ? "active" : ""} onClick={() => setSort(key)}>{label}</button>)}</div>
        </div>
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead><tr><th>Campaign</th><th>Spend</th><th>Clicks</th><th>CPC</th><th>Signups</th><th>Cost / signup</th><th>$1 buys</th><th>Cost / $1 buy</th><th>Subs</th><th>Revenue</th><th>ROAS</th></tr></thead>
            <tbody>
              {campaigns.length ? campaigns.map((c) => (
                <tr key={`${c.source}-${c.campaign}`}>
                  <td><b>{c.campaign}</b><small>{c.source}</small></td>
                  <td>{c.spend_cents ? money(c.spend_cents) : "—"}</td>
                  <td>{c.clicks?.toLocaleString() ?? "—"}{c.clicks && c.impressions ? <small>CTR {pct(ratio(c.clicks, c.impressions))}</small> : null}</td>
                  <td>{perUnit(c.spend_cents, c.clicks ?? 0)}</td>
                  <td>{c.signups}{c.clicks ? <small>{pct(ratio(c.signups, c.clicks))} of clicks</small> : null}</td>
                  <td>{perUnit(c.spend_cents, c.signups)}</td>
                  <td>{c.intro_purchases}</td>
                  <td>{perUnit(c.spend_cents, c.intro_purchases)}</td>
                  <td>{c.subscriptions}</td>
                  <td>{money(c.revenue_cents)}</td>
                  <td>{roas(c.revenue_cents, c.spend_cents)}</td>
                </tr>
              )) : <tr><td colSpan={11} className="adm-empty">No signups or spend in this range yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>}

      {(section === "spend" || section === "tracking") && <section className="adm-grid adm-tools">
        {section === "spend" && <article className="adm-card">
          <h2>Add ad spend</h2>
          <p className="adm-sub">Enter a day’s spend, or import a CSV from Meta Ads Manager (Reports → breakdown by Day → Export).</p>
          <form className="adm-form" onSubmit={(e) => void submitSpend(e)}>
            <label><span>Date</span><input name="spend_date" type="date" required defaultValue={isoDay(new Date())} /></label>
            <label><span>Amount (USD)</span><input name="amount" type="number" min="0" step="0.01" required placeholder="0.00" /></label>
            <label className="wide"><span>Campaign name</span><input name="campaign" required placeholder="Exactly as named in Meta" /></label>
            <label><span>Ad set</span><input name="adset" placeholder="Optional" /></label>
            <label><span>Ad</span><input name="ad" placeholder="Optional" /></label>
            <label><span>Impressions</span><input name="impressions" type="number" min="0" placeholder="Optional" /></label>
            <label><span>Link clicks</span><input name="clicks" type="number" min="0" placeholder="Optional" /></label>
            <div className="adm-form-actions wide">
              <button className="adm-button" disabled={saving}>{saving ? "Saving…" : "Save spend"}</button>
              <label className="adm-button secondary">Import Meta CSV<input type="file" accept=".csv,text/csv" hidden onChange={(e) => { void importCsv(e.target.files?.[0]); e.target.value = ""; }} /></label>
            </div>
          </form>
          {notice && <p className="adm-notice" role="status">{notice}</p>}
        </article>}
        {section === "tracking" && <article className="adm-card">
          <h2>Tracking setup</h2>
          <p className="adm-sub">Paste this into <b>URL parameters</b> on every Meta ad (Ad level → Destination → Tracking). Campaign names then match automatically.</p>
          <code className="adm-code">{META_URL_PARAMS}</code>
          <button className="adm-button secondary" onClick={() => { void navigator.clipboard?.writeText(META_URL_PARAMS); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>{copied ? "Copied" : "Copy parameters"}</button>
          <ul className="adm-tips">
            <li>Keep campaign names identical in Meta and in the spend you enter here.</li>
            <li>A signup is credited when the person signs up in the same browser they clicked the ad from.</li>
            <li>Admin accounts are excluded from every number on this page.</li>
          </ul>
        </article>}
      </section>}

      {section === "spend" && <section className="adm-card">
        <h2>Spend entries</h2>
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead><tr><th>Date</th><th>Campaign</th><th>Ad set</th><th>Ad</th><th>Spend</th><th>Impr.</th><th>Clicks</th><th /></tr></thead>
            <tbody>
              {stats.spend_rows.length ? stats.spend_rows.map((r) => (
                <tr key={r.id}><td>{r.day}</td><td>{r.campaign}</td><td>{r.adset || "—"}</td><td>{r.ad || "—"}</td><td>{money(r.amount_cents)}</td><td>{r.impressions?.toLocaleString() ?? "—"}</td><td>{r.clicks?.toLocaleString() ?? "—"}</td>
                  <td><button className="adm-link" onClick={() => void deleteRow(r.id)} aria-label={`Delete spend for ${r.campaign} on ${r.day}`}>Delete</button></td></tr>
              )) : <tr><td colSpan={8} className="adm-empty">No spend entered for this range.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>}
    </main>
    </div>
  );
}
