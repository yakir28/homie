"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowLeft, ArrowCounterClockwise, CheckCircle, LockKey } from "@phosphor-icons/react";
import AuthFrame from "../AuthFrame";
import { readRecoveryTokens, validateNewPassword } from "../../lib/password-recovery";
import "../password-recovery.css";

export default function ResetPassword() {
  const [stage, setStage] = useState<"checking" | "invalid" | "ready" | "success">("checking");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const client = useRef<SupabaseClient | null>(null);
  const initialization = useRef<Promise<boolean> | null>(null);

  useEffect(() => {
    let active = true;
    // Keep recovery credentials in memory only, separate from any signed-in account.
    // Reuse initialization during React's effect replay after clearing the URL.
    initialization.current ??= (async () => {
      const tokens = readRecoveryTokens(window.location.hash);
      window.history.replaceState(null, "", window.location.pathname);
      if (!tokens) return false;
      try {
        client.current = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
          auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storageKey: "homie-password-recovery" },
        });
        const { data, error } = await client.current.auth.setSession(tokens);
        return !error && Boolean(data.session);
      } catch {
        return false;
      }
    })();
    void initialization.current.then((valid) => { if (active) setStage(valid ? "ready" : "invalid"); });
    return () => { active = false; };
  }, []);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || stage !== "ready" || !client.current) return;
    const validation = validateNewPassword(password, confirmation);
    if (validation) { setError(validation); return; }
    setBusy(true);
    setError("");
    try {
      const { error } = await client.current.auth.updateUser({ password });
      if (error) {
        if (error.status === 401 || error.status === 403 || error.code === "session_not_found" || error.code === "refresh_token_not_found") { setStage("invalid"); return; }
        setError(error.code === "same_password" ? "Choose a password different from your current password." : error.code === "weak_password" ? "Choose a stronger password with a mix of letters, numbers and symbols." : "We couldn’t update your password. Please try again.");
        return;
      }
      setPassword("");
      setConfirmation("");
      setStage("success");
      // End the temporary recovery session. A cleanup failure must not hide success.
      await client.current.auth.signOut({ scope: "local" }).catch(() => {});
      client.current = null;
    } catch {
      setError("We couldn’t connect. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return <AuthFrame eyebrow="A fresh start">
    <p className="eyebrow">ACCOUNT RECOVERY</p>
    <div className="recovery-symbol" aria-hidden="true">{stage === "success" ? <CheckCircle size={28} weight="regular" /> : stage === "invalid" ? <ArrowCounterClockwise size={28} weight="regular" /> : <LockKey size={28} weight="regular" />}</div>
    {stage === "checking" ? <><h2>Checking your <i>link</i></h2><p className="recovery-description" role="status">Just a moment while we verify your reset link.</p></> :
      stage === "invalid" ? <><h2>Let’s try <i>again</i></h2><p className="recovery-description" role="alert">This reset link is invalid or has expired. Request a new link and open the latest email to continue.</p><a className="auth-submit recovery-action" href="/forgot-password">Get a new reset link</a><a className="recovery-back" href="/login"><ArrowLeft size={15} aria-hidden="true" />Back to log in</a></> :
      stage === "success" ? <><h2>Password <i>updated</i></h2><p className="recovery-description" role="status">You’re all set. Log in with your new password to get back to your workspace.</p><a className="auth-submit recovery-action" href="/login">Back to log in</a></> : <>
        <h2>Set a new <i>password</i></h2>
        <p className="recovery-description">Choose a new password for your Homie account.</p>
        <form className="auth-fields" onSubmit={save} aria-busy={busy}>
          <label htmlFor="new-password">New password</label>
          <input id="new-password" type={visible ? "text" : "password"} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={8} disabled={busy} aria-describedby="password-hint" />
          <p id="password-hint" className="recovery-hint">Use at least 8 characters. A mix of letters, numbers and symbols is best.</p>
          <label htmlFor="confirm-password">Confirm new password</label>
          <input id="confirm-password" type={visible ? "text" : "password"} autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} required minLength={8} disabled={busy} />
          <label className="recovery-show"><input type="checkbox" checked={visible} onChange={(event) => setVisible(event.target.checked)} />Show passwords</label>
          {error && <p className="recovery-error" role="alert">{error}</p>}
          <button className="auth-submit" disabled={busy}>{busy ? "Updating password…" : "Update password"}</button>
        </form>
        <a className="recovery-back" href="/login"><ArrowLeft size={15} aria-hidden="true" />Back to log in</a>
      </>}
  </AuthFrame>;
}
