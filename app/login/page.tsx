"use client";

import { Suspense, useEffect, useState, type FormEvent } from "react";
import { getSupabaseBrowserClient } from "../../lib/supabase/client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import AuthFrame from "../AuthFrame";

export default function Login() {
  return <Suspense fallback={<main className="auth-page">Loading account options…</main>}><LoginForm /></Suspense>;
}

function LoginForm() {
  const searchParams = useSearchParams();
  const [chosenMode, setMode] = useState<"login" | "signup" | null>(null);
  const mode = chosenMode ?? (searchParams.get("mode") === "signup" ? "signup" : "login");
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    if (query.get("source") === "side-hustle") {
      try { sessionStorage.setItem("homie-acquisition", JSON.stringify({ source: "side-hustle", offer: "first-video" })); } catch { /* Signup remains available when storage is blocked. */ }
    }
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    const supabase = getSupabaseBrowserClient();
    const result = mode === "login"
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/app` } });
    setLoading(false);
    if (result.error) return setMessage(result.error.message);
    if (mode === "signup" && !result.data.session) return setMessage("Check your email to confirm your account.");
    window.location.assign("/app");
  }

  async function oauth(provider: "google") {
    setLoading(true);
    setMessage("");
    const { error } = await getSupabaseBrowserClient().auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/app` },
    });
    if (error) {
      setLoading(false);
      setMessage(error.message);
    }
  }

  return (
    <AuthFrame eyebrow={mode === "login" ? "Welcome back" : "Your first video for $1"}>
          <p className="eyebrow">{mode === "login" ? (
            <>NO ACCOUNT? <button onClick={() => setMode("signup")}>GET STARTED</button></>
          ) : (
            <>HAVE AN ACCOUNT? <button onClick={() => setMode("login")}>LOG IN</button></>
          )}</p>
          <h2>{mode === "login" ? <>Welcome <i>back</i></> : <>Create your <i>account</i></>}</h2>

          <form className="auth-fields" onSubmit={submit}>
            <input type="email" placeholder="Email address" aria-label="Email address" value={email} onChange={(event) => setEmail(event.target.value)} required />
            <div className="auth-password">
              <input type={showPassword ? "text" : "password"} placeholder="Password" aria-label="Password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={6} required />
              <button type="button" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword((v) => !v)}>
                {showPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
            <button className="auth-submit" type="submit" disabled={loading}>{loading ? "Please wait…" : mode === "login" ? "Log in" : "Create account"}</button>
          </form>

          {message && <p className="auth-message" role="status">{message}</p>}

          <div className="auth-divider"><span>or</span></div>

          <button className="auth-oauth" onClick={() => oauth("google")} disabled={loading}><GoogleIcon />Log in with Google</button>
          <button className="auth-oauth auth-oauth-soon" disabled><AppleIcon />Log in with Apple <span className="auth-soon-badge">Soon</span></button>

          {mode === "login" && <Link className="auth-forgot" href="/forgot-password">Forgot your password?</Link>}

          <p className="auth-legal">By continuing, you agree to our <Link href="/terms">Terms</Link> · <Link href="/privacy">Privacy</Link></p>
    </AuthFrame>
  );
}

function EyeIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" /><circle cx="12" cy="12" r="3" /></svg>;
}

function EyeOffIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17.9 17.9A10.4 10.4 0 0 1 12 20c-7 0-11-8-11-8a18.4 18.4 0 0 1 5.1-5.9M9.9 4.2A9.4 9.4 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.3 3.3" /><path d="M14.1 14.1a3 3 0 1 1-4.2-4.2" /><line x1="1" y1="1" x2="23" y2="23" /></svg>;
}

function GoogleIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24"><path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.7-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.8z" /><path fill="#34A853" d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.9-3c-1.1.7-2.4 1.2-4 1.2-3.1 0-5.7-2.1-6.6-4.9H1.4v3.1C3.4 21.3 7.4 24 12 24z" /><path fill="#FBBC05" d="M5.4 14.4c-.2-.7-.4-1.5-.4-2.4s.1-1.6.4-2.4V6.5H1.4A12 12 0 0 0 0 12c0 1.9.5 3.8 1.4 5.5l4-3.1z" /><path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4C17.9 1.2 15.2 0 12 0 7.4 0 3.4 2.7 1.4 6.5l4 3.1C6.3 6.9 8.9 4.8 12 4.8z" /></svg>;
}

function AppleIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M16.5 1c.1 1.2-.4 2.4-1.1 3.3-.7.9-1.9 1.6-3 1.5-.1-1.1.4-2.3 1.1-3.1C14.2 1.7 15.4 1.1 16.5 1zM20.8 17.3c-.5 1.1-.8 1.6-1.4 2.6-.9 1.4-2.2 3.1-3.8 3.1-1.4 0-1.8-.9-3.7-.9s-2.4.9-3.7.9c-1.6 0-2.8-1.5-3.7-2.9C1.9 17.4.9 14 2.3 11.6c.9-1.6 2.6-2.6 4.3-2.6 1.4 0 2.6.9 3.5.9.8 0 2.4-1.2 4-1 .7 0 2.6.3 3.9 2.1-.1.1-2.3 1.4-2.3 4 0 3.1 2.7 4.2 3.1 4.3z" /></svg>;
}
