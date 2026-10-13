"use client";

import { useEffect } from "react";
import { captureTouch, clearTouches } from "../lib/attribution";
import { CONSENT_EVENT, analyticsAllowed, type Consent } from "../lib/consent";

// Records ad/referrer parameters on every landing, but only with marketing consent.
// Withdrawing consent deletes anything stored so far. Renders nothing.
export default function AttributionCapture() {
  useEffect(() => {
    if (analyticsAllowed()) captureTouch();
    const onConsent = (event: Event) => {
      if ((event as CustomEvent<Consent>).detail?.analytics && analyticsAllowed()) captureTouch();
      else clearTouches();
    };
    window.addEventListener(CONSENT_EVENT, onConsent);
    return () => window.removeEventListener(CONSENT_EVENT, onConsent);
  }, []);
  return null;
}
