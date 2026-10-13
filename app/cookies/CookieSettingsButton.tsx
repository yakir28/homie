"use client";

import { openCookieSettings } from "../../lib/consent";

export default function CookieSettingsButton() {
  return <button type="button" className="cc-button primary" onClick={openCookieSettings}>Open cookie settings</button>;
}
