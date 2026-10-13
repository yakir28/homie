"use client";
import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "../../lib/supabase/client";
import "./billing-confirmation.css";
export default function BillingConfirmation({ workspaceId }: { workspaceId: string | number | null }) {
  const [state, setState] = useState<"hidden" | "waiting" | "success" | "pending">("hidden");
  const [kind, setKind] = useState("credits");
  useEffect(() => {
    const url = new URL(window.location.href);
    const checkoutId = url.searchParams.get("checkout_id");
    if (url.searchParams.get("checkout") !== "success" || !workspaceId) return;
    if (!checkoutId) { setState("pending"); return; }
    let canceled = false;
    let timer: ReturnType<typeof setTimeout>;
    let attempts = 0;
    setState("waiting");
    async function check() {
      try {
        const { data: { session } } = await getSupabaseBrowserClient().auth.getSession();
        if (!session) throw new Error("Session unavailable");
        const response = await fetch("/api/billing/status", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` }, body: JSON.stringify({ workspaceId, checkoutId }) });
        const result = await response.json() as { confirmed?: boolean; kind?: string };
        if (canceled) return;
        if (response.ok && result.confirmed) { setKind(result.kind ?? "credits"); setState("success"); return; }
      } catch { /* A delayed webhook or temporary outage must never look like success. */ }
      if (canceled) return;
      if (++attempts >= 15) { setState("pending"); return; }
      timer = setTimeout(check, 2000);
    }
    void check();
    return () => { canceled = true; clearTimeout(timer); };
  }, [workspaceId]);
  function close() {
    const url = new URL(window.location.href); url.searchParams.delete("checkout"); url.searchParams.delete("checkout_id");
    window.location.replace(`${url.pathname}${url.search}${url.hash}`);
  }
  if (state === "hidden") return null;
  return <div className="billing-confirmation-backdrop"><section className="billing-confirmation" role="dialog" aria-modal="true" aria-labelledby="billing-confirmation-title" onKeyDown={(event) => { if (event.key === "Escape") close(); if (event.key === "Tab") event.preventDefault(); }}>
    <div role="status" aria-live="polite">
      {state === "success" ? <svg className="billing-success-check" viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="29"/><path d="m19 32 9 9 18-19"/></svg> : <div className="billing-confirmation-symbol" aria-hidden="true">{state === "waiting" ? "…" : "⏱"}</div>}
      <h2 id="billing-confirmation-title">{state === "success" ? kind === "subscription" ? "Your plan is active!" : "Your credits are ready!" : state === "waiting" ? "Confirming your payment…" : "Your payment is still being confirmed"}</h2>
      <p>{state === "success" ? "You're ready to create your next property video." : "Your balance updates after confirmation. You can safely close this window; please don't pay again."}</p>
    </div>
    <button autoFocus onClick={close}>{state === "success" ? "Let's create" : "Back to Homie"}</button>
  </section></div>;
}
