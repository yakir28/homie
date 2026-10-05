"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowLeft, EnvelopeSimple, Key } from "@phosphor-icons/react";
import AuthFrame from "../AuthFrame";
import { getSupabaseBrowserClient } from "../../lib/supabase/client";
import "../password-recovery.css";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [sentTo, setSentTo] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [cooldown, setCooldown] = useState(0);
  useEffect(() => {
    if (!cooldown) return;
    const timer = window.setTimeout(() => setCooldown((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || cooldown) return;
    setBusy(true);
    setError("");
    const address = (sentTo || email).trim();
    try {
      const { error } = await getSupabaseBrowserClient().auth.resetPasswordForEmail(address, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) {
        setError(error.status === 429 ? "Too many requests. Please wait a few minutes and try again." : "We couldn’t send the link. Please try again shortly.");
        return;
      }
      setSentTo(address);
      setCooldown(60);
    } catch {
      setError("We couldn’t connect. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return <AuthFrame eyebrow="Let’s get you back in">
    <p className="eyebrow">ACCOUNT RECOVERY</p>
    <div className="recovery-symbol" aria-hidden="true">{sentTo ? <EnvelopeSimple size={28} weight="regular" /> : <Key size={28} weight="regular" />}</div>
    <h2>{sentTo ? <>Check your <i>inbox</i></> : <>Forgot your <i>password?</i></>}</h2>
    <p className="recovery-description" role={sentTo ? "status" : undefined}>{sentTo ? <>If an account exists for <strong>{sentTo}</strong>, you’ll receive a password reset link. Check your spam folder too.</> : "Enter the email address you used to sign up. We’ll send you a link to reset your password."}</p>
    <form className="auth-fields" onSubmit={send} aria-busy={busy}>
      {!sentTo && <><label htmlFor="recovery-email">Email address</label><input id="recovery-email" type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} required disabled={busy} /></>}
      {error && <p className="recovery-error" role="alert">{error}</p>}
      <button className="auth-submit" disabled={busy || cooldown > 0}>{busy ? "Sending…" : cooldown ? `Resend in ${cooldown}s` : sentTo ? "Resend reset link" : "Send reset link"}</button>
    </form>
    {sentTo && <button className="recovery-text-button" onClick={() => { setSentTo(""); setError(""); }} disabled={busy}>Use a different email</button>}
    <Link className="recovery-back" href="/login"><ArrowLeft size={15} aria-hidden="true" />Back to log in</Link>
  </AuthFrame>;
}
