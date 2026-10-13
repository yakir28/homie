"use client";

import { useEffect, useRef, useState } from "react";
import { OPEN_SETTINGS_EVENT, hasGlobalPrivacyControl, readConsent, saveConsent } from "../lib/consent";
import "./cookie-consent.css";

// Site-wide cookie banner + preferences dialog. Mounted once in the root layout.
export default function CookieConsent() {
  const [bannerOpen, setBannerOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [gpc, setGpc] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const signal = hasGlobalPrivacyControl();
    const stored = readConsent();
    // A Global Privacy Control signal is itself the visitor's choice, so we don't ask.
    const timer = window.setTimeout(() => {
      setGpc(signal);
      setAnalytics(stored?.analytics === true && !signal);
      if (!stored && !signal) setBannerOpen(true);
    }, 0);
    const openSettings = () => {
      setAnalytics(readConsent()?.analytics === true && !hasGlobalPrivacyControl());
      setSettingsOpen(true);
    };
    window.addEventListener(OPEN_SETTINGS_EVENT, openSettings);
    return () => { window.clearTimeout(timer); window.removeEventListener(OPEN_SETTINGS_EVENT, openSettings); };
  }, []);

  useEffect(() => {
    const node = dialog.current;
    if (settingsOpen && node && !node.open) node.showModal();
  }, [settingsOpen]);

  function decide(allowAnalytics: boolean) {
    saveConsent(allowAnalytics && !gpc);
    setAnalytics(allowAnalytics && !gpc);
    setBannerOpen(false);
    closeSettings();
  }

  function closeSettings() {
    dialog.current?.close();
    setSettingsOpen(false);
  }

  return (
    <>
      {bannerOpen && !settingsOpen && (
        <section className="cc-banner" aria-label="Cookie consent">
          <p>
            We use essential storage to keep you signed in. With your permission, we also remember which ad or link brought you here, so we can improve our marketing.{" "}
            <a href="/cookies">Cookie Policy</a>
          </p>
          <div className="cc-actions">
            <button type="button" className="cc-button primary" onClick={() => decide(true)}>Accept all</button>
            <button type="button" className="cc-button" onClick={() => decide(false)}>Essential only</button>
            <button type="button" className="cc-link" onClick={() => setSettingsOpen(true)}>Customize</button>
          </div>
        </section>
      )}

      {settingsOpen && (
        <dialog ref={dialog} className="cc-dialog" aria-labelledby="cc-title" onCancel={(event) => { event.preventDefault(); closeSettings(); }}>
          <header>
            <h2 id="cc-title">Cookie preferences</h2>
            <button type="button" className="cc-close" aria-label="Close cookie preferences" onClick={closeSettings}>×</button>
          </header>
          <p className="cc-intro">Choose what Homie may store on this device. You can change this any time from <b>Cookie settings</b> in the footer.</p>

          <div className="cc-category">
            <div>
              <strong>Essential</strong>
              <small>Keeps you signed in, secures checkout and remembers this choice. The site can’t work without it.</small>
            </div>
            <span className="cc-always">Always on</span>
          </div>

          <div className="cc-category">
            <div>
              <strong>Analytics &amp; marketing</strong>
              <small>Remembers the campaign, ad or link that brought you to Homie (UTM tags and click IDs), so we can see which ads work. We don’t use ad pixels or sell this data.</small>
              {gpc && <small className="cc-gpc">Your browser sends a Global Privacy Control signal, so this stays off.</small>}
            </div>
            <label className="cc-switch">
              <input type="checkbox" checked={analytics} disabled={gpc} onChange={(event) => setAnalytics(event.target.checked)} />
              <span aria-hidden="true" />
              <span className="cc-sr">Allow analytics and marketing storage</span>
            </label>
          </div>

          <footer>
            <a href="/cookies">Read the Cookie Policy</a>
            <div className="cc-actions">
              <button type="button" className="cc-button" onClick={() => decide(false)}>Essential only</button>
              <button type="button" className="cc-button primary" onClick={() => decide(analytics)}>Save choices</button>
            </div>
          </footer>
        </dialog>
      )}
    </>
  );
}

