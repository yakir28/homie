"use client";

import { useEffect } from "react";
import "./app-loading.css";

export default function AppLoading({ error, complete = false, onExited }: { error?: string; complete?: boolean; onExited?: () => void }) {
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, []);

  useEffect(() => {
    if (!complete || error || !onExited) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timer = window.setTimeout(onExited, reducedMotion ? 100 : 1000);
    return () => window.clearTimeout(timer);
  }, [complete, error, onExited]);
  return (
    <div className={`homie-loading-screen${complete && !error ? " is-complete" : ""}`} aria-busy={!complete && !error}>
      <div className="homie-loading-content">
        <div className="homie-loading-logo" aria-hidden="true">
          <img src="/brand/transparent/homie-mark-charcoal.png" alt="" width={64} height={77} />

        </div>
        {error ? <div className="homie-loading-error">
          <p role="alert">{error}</p>
          <button type="button" onClick={() => window.location.reload()}>Try again</button>
        </div> : <>
          <div className="homie-loading-bar" role="progressbar" aria-label={complete ? "Ready" : "Loading Homie"} aria-valuenow={complete ? 100 : undefined} aria-valuemin={complete ? 0 : undefined} aria-valuemax={complete ? 100 : undefined}><span /></div>
          <span className="homie-loading-sr" role="status">{complete ? "Ready" : "Loading Homie…"}</span>
        </>}
      </div>
    </div>
  );
}
