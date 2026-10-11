"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { getSupabaseBrowserClient } from "../../lib/supabase/client";
import "./settings.css";

export type SettingsProfile = {
  email: string;
  displayName: string;
  bio: string;
  phone: string;
  jobTitle: string;
  companyName: string;
};

export type SettingsPlan = {
  name: string;
  statusLabel: string;
  renewalLabel: string | null;
  isPaid: boolean;
};

type Section = "profile" | "preferences" | "billing" | "security" | "storage";
type StorageUsage = { photos_bytes: number; photos_count: number; assets_bytes: number; videos_bytes: number; videos_count: number };

type Props = {
  details: SettingsProfile;
  onChange: (details: SettingsProfile) => void;
  onSave: () => Promise<boolean>;
  saving: boolean;
  avatarUrl: string | null;
  hasUploadedAvatar: boolean;
  onAvatarUpload: (file: File) => Promise<void>;
  onAvatarRemove: () => Promise<void>;
  theme: "dark" | "light";
  onThemeChange: (theme: "dark" | "light") => void;
  savingTheme: boolean;
  credits: number;
  plan: SettingsPlan;
  onOpenPlans: () => void;
  onManageBilling: () => Promise<void>;
  workspaceId: string | null;
  authProviders: string[];
  onPasswordChange: (password: string) => Promise<boolean>;
  onClose: () => void;
  flash: (message: string) => void;
};

const sections: { id: Section; label: string; description: string }[] = [
  { id: "profile", label: "Profile", description: "Your photo, name and sign-in email." },
  { id: "preferences", label: "Preferences", description: "Appearance and language." },
  { id: "billing", label: "Plan & billing", description: "Your plan, credits and invoices." },
  { id: "security", label: "Security", description: "Your password and sign-in methods." },
  { id: "storage", label: "Storage", description: "Space used by your photos and videos." },
];

function SectionIcon({ section }: { section: Section }) {
  const paths: Record<Section, ReactNode> = {
    profile: <><circle cx="12" cy="8" r="3.2" /><path d="M5.5 19.5c.7-3.2 3-5.2 6.5-5.2s5.8 2 6.5 5.2" /></>,
    preferences: <><path d="M4 7h10M18 7h2M4 17h4M12 17h8" /><circle cx="16" cy="7" r="2" /><circle cx="10" cy="17" r="2" /></>,
    billing: <><rect x="3" y="5.5" width="18" height="13" rx="2.5" /><path d="M3 10h18M7 15h4" /></>,
    security: <><path d="M7 10V7.5a5 5 0 0 1 10 0V10" /><rect x="4.5" y="10" width="15" height="10.5" rx="2.5" /><path d="M12 14v3" /></>,
    storage: <><ellipse cx="12" cy="6" rx="7.5" ry="2.8" /><path d="M4.5 6v12c0 1.5 3.4 2.8 7.5 2.8s7.5-1.3 7.5-2.8V6M4.5 12c0 1.5 3.4 2.8 7.5 2.8s7.5-1.3 7.5-2.8" /></>,
  };
  return <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">{paths[section]}</svg>;
}

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(0, Math.round(bytes / 1024))} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(bytes < 10 * 1024 ** 2 ? 1 : 0)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
}

const providerNames: Record<string, string> = { email: "Email and password", google: "Google", apple: "Apple" };

export default function SettingsModal(props: Props) {
  const { details, onChange, onClose } = props;
  const [section, setSection] = useState<Section>("profile");
  const [savedDetails, setSavedDetails] = useState(details);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [openingPortal, setOpeningPortal] = useState(false);
  const [storage, setStorage] = useState<StorageUsage | null>(null);
  const [storageError, setStorageError] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const dirty = JSON.stringify(details) !== JSON.stringify(savedDetails);
  const initials = details.displayName.trim().split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "H";
  const passwordError = !passwordTouched ? "" : password.length < 8 ? "Use at least 8 characters." : confirmPassword && password !== confirmPassword ? "The passwords don’t match." : "";
  const hasPassword = props.authProviders.includes("email");
  const active = sections.find((item) => item.id === section)!;

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  useEffect(() => {
    if (section !== "storage" || !props.workspaceId) return;
    let cancelled = false;
    void getSupabaseBrowserClient().rpc("get_workspace_storage_usage", { target_workspace_id: Number(props.workspaceId) }).then(({ data, error }) => {
      if (cancelled) return;
      setStorageError(error?.message ?? "");
      if (error) return;
      const row = (Array.isArray(data) ? data[0] : data) as StorageUsage | undefined;
      setStorage(row ? { photos_bytes: Number(row.photos_bytes), photos_count: Number(row.photos_count), assets_bytes: Number(row.assets_bytes), videos_bytes: Number(row.videos_bytes), videos_count: Number(row.videos_count) } : null);
    });
    return () => { cancelled = true; };
  }, [section, props.workspaceId]);

  async function saveProfile() {
    if (await props.onSave()) setSavedDetails(details);
  }

  async function chooseAvatar(file: File | undefined) {
    if (!file) return;
    setUploadingAvatar(true);
    try { await props.onAvatarUpload(file); } catch (error) { props.flash(error instanceof Error ? error.message : "Could not upload the photo"); } finally {
      setUploadingAvatar(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  async function removeAvatar() {
    setUploadingAvatar(true);
    try { await props.onAvatarRemove(); } catch (error) { props.flash(error instanceof Error ? error.message : "Could not remove the photo"); } finally { setUploadingAvatar(false); }
  }

  async function submitPassword() {
    setPasswordTouched(true);
    if (password.length < 8 || password !== confirmPassword) return;
    setChangingPassword(true);
    const ok = await props.onPasswordChange(password);
    setChangingPassword(false);
    if (ok) { setPassword(""); setConfirmPassword(""); setPasswordTouched(false); }
  }

  async function manageBilling() {
    setOpeningPortal(true);
    try { await props.onManageBilling(); } finally { setOpeningPortal(false); }
  }

  const totalBytes = storage ? storage.photos_bytes + storage.assets_bytes + storage.videos_bytes : 0;
  const shares = storage && totalBytes ? [
    { label: "Videos", bytes: storage.videos_bytes, detail: `${storage.videos_count} ${storage.videos_count === 1 ? "video" : "videos"}`, tone: "videos" },
    { label: "Photos", bytes: storage.photos_bytes, detail: `${storage.photos_count} uploaded ${storage.photos_count === 1 ? "photo" : "photos"}`, tone: "photos" },
    { label: "Profile & brand", bytes: storage.assets_bytes, detail: "Profile photos", tone: "assets" },
  ] : [];

  return (
    <div className="ws-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="ws-modal" role="dialog" aria-modal="true" aria-labelledby="ws-title">
        <nav className="ws-nav" aria-label="Settings sections">
          <p className="ws-nav-title">Settings</p>
          {sections.map((item) => (
            <button key={item.id} type="button" className={section === item.id ? "active" : ""} aria-current={section === item.id ? "page" : undefined} onClick={() => setSection(item.id)}>
              <SectionIcon section={item.id} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="ws-content">
          <header className="ws-header">
            <div>
              <h2 id="ws-title">{active.label}</h2>
              <p>{active.description}</p>
            </div>
            <button type="button" className="ws-close" aria-label="Close settings" onClick={onClose}>×</button>
          </header>

          {section === "profile" && <div className="ws-body">
            <div className="ws-card ws-avatar-card">
              <span className="ws-avatar">{props.avatarUrl ? <img src={props.avatarUrl} alt="" referrerPolicy="no-referrer" /> : initials}</span>
              <div className="ws-card-copy">
                <strong>Profile photo</strong>
                <small>JPG, PNG or WebP, up to 5 MB.</small>
              </div>
              <div className="ws-row-actions">
                {props.hasUploadedAvatar && <button type="button" className="ws-button ghost" disabled={uploadingAvatar} onClick={() => void removeAvatar()}>Remove</button>}
                <button type="button" className="ws-button secondary" disabled={uploadingAvatar} onClick={() => fileInput.current?.click()}>{uploadingAvatar ? "Uploading…" : props.hasUploadedAvatar ? "Change photo" : "Upload photo"}</button>
              </div>
              <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(event) => void chooseAvatar(event.target.files?.[0])} />
            </div>

            <div className="ws-grid">
              <label className="ws-field ws-span">
                <span>Full name</span>
                <input value={details.displayName} onChange={(event) => onChange({ ...details, displayName: event.target.value })} placeholder="Your name" autoComplete="name" />
              </label>
              <label className="ws-field ws-span">
                <span>Email</span>
                <input value={details.email} readOnly aria-describedby="ws-email-note" />
                <small id="ws-email-note">Your sign-in email can’t be changed here.</small>
              </label>
            </div>
          </div>}

          {section === "preferences" && <div className="ws-body">
            <div className="ws-card ws-option">
              <div className="ws-card-copy">
                <strong>Appearance</strong>
                <small>{props.savingTheme ? "Saving…" : "Saved to your account on every device."}</small>
              </div>
              <div className="ws-segmented" role="radiogroup" aria-label="Appearance">
                {(["light", "dark"] as const).map((value) => <button key={value} type="button" role="radio" aria-checked={props.theme === value} className={props.theme === value ? "active" : ""} disabled={props.savingTheme} onClick={() => props.onThemeChange(value)}>{value === "light" ? "Light" : "Dark"}</button>)}
              </div>
            </div>
            <div className="ws-card ws-option">
              <div className="ws-card-copy">
                <strong>Language</strong>
                <small>Hebrew is on the way.</small>
              </div>
              <div className="ws-segmented" role="radiogroup" aria-label="Language">
                <button type="button" role="radio" aria-checked="true" className="active">English</button>
                <button type="button" role="radio" aria-checked="false" disabled>עברית <em>Soon</em></button>
              </div>
            </div>
          </div>}

          {section === "billing" && <div className="ws-body">
            <div className="ws-card ws-plan">
              <div className="ws-card-copy">
                <small>Current plan</small>
                <strong className="ws-plan-name">{props.plan.name}</strong>
                <span className="ws-pill">{props.plan.statusLabel}</span>
              </div>
              <div className="ws-plan-credits">
                <strong>{props.credits.toLocaleString()}</strong>
                <small>{props.credits === 1 ? "credit" : "credits"} available</small>
              </div>
            </div>
            {props.plan.renewalLabel && <p className="ws-note">{props.plan.renewalLabel}</p>}
            <div className="ws-card ws-option">
              <div className="ws-card-copy">
                <strong>{props.plan.isPaid ? "Change plan" : "Upgrade your plan"}</strong>
                <small>{props.plan.isPaid ? "Compare plans and switch whenever you like." : "Get more credits every month and access to every template."}</small>
              </div>
              <button type="button" className="ws-button primary" onClick={props.onOpenPlans}>See plans</button>
            </div>
            {props.plan.isPaid && <div className="ws-card ws-option">
              <div className="ws-card-copy">
                <strong>Payment method & invoices</strong>
                <small>Update your card, download invoices or cancel, in our secure billing portal.</small>
              </div>
              <button type="button" className="ws-button secondary" disabled={openingPortal} onClick={() => void manageBilling()}>{openingPortal ? "Opening…" : "Manage / cancel subscription"}</button>
            </div>}
          </div>}

          {section === "security" && <div className="ws-body">
            <form className="ws-card ws-password" onSubmit={(event) => { event.preventDefault(); void submitPassword(); }}>
              <div className="ws-card-copy">
                <strong>{hasPassword ? "Change password" : "Set a password"}</strong>
                <small>{hasPassword ? "Use at least 8 characters." : "Add a password so you can also sign in with your email."}</small>
              </div>
              <input type="email" value={props.details.email} autoComplete="username" readOnly hidden />
              <div className="ws-grid">
                <label className="ws-field">
                  <span>New password</span>
                  <input type="password" value={password} autoComplete="new-password" onChange={(event) => setPassword(event.target.value)} onBlur={() => password && setPasswordTouched(true)} aria-invalid={Boolean(passwordError) || undefined} />
                </label>
                <label className="ws-field">
                  <span>Confirm password</span>
                  <input type="password" value={confirmPassword} autoComplete="new-password" onChange={(event) => setConfirmPassword(event.target.value)} aria-invalid={Boolean(passwordError) || undefined} />
                </label>
              </div>
              <div className="ws-form-foot">
                <small className="ws-error" role="alert">{passwordError}</small>
                <button type="submit" className="ws-button primary" disabled={changingPassword || !password || !confirmPassword}>{changingPassword ? "Saving…" : hasPassword ? "Update password" : "Set password"}</button>
              </div>
            </form>
            <div className="ws-card">
              <div className="ws-card-copy">
                <strong>Sign-in methods</strong>
                <small>{details.email}</small>
              </div>
              <ul className="ws-providers">
                {(props.authProviders.length ? props.authProviders : ["email"]).map((provider) => <li key={provider}><span aria-hidden="true">✓</span>{providerNames[provider] ?? provider}</li>)}
              </ul>
            </div>
          </div>}

          {section === "storage" && <div className="ws-body">
            {storageError ? <p className="ws-error">Couldn’t load storage usage: {storageError}</p> : !storage ? <div className="ws-card ws-skeleton" aria-busy="true">Loading storage usage…</div> : <>
              <div className="ws-card ws-storage">
                <div className="ws-storage-total">
                  <strong>{formatBytes(totalBytes)}</strong>
                  <small>used across your workspace</small>
                </div>
                {totalBytes > 0 && <div className="ws-storage-bar" aria-hidden="true">
                  {shares.filter((share) => share.bytes > 0).map((share) => <i key={share.label} className={share.tone} style={{ flexGrow: share.bytes }} />)}
                </div>}
                <ul className="ws-storage-list">
                  {(shares.length ? shares : [
                    { label: "Videos", bytes: 0, detail: "No videos yet", tone: "videos" },
                    { label: "Photos", bytes: 0, detail: "No uploaded photos yet", tone: "photos" },
                  ]).map((share) => <li key={share.label}><span className={`dot ${share.tone}`} aria-hidden="true" /><div><strong>{share.label}</strong><small>{share.detail}</small></div><b>{formatBytes(share.bytes)}</b></li>)}
                </ul>
              </div>
              <p className="ws-note">Photos imported from Zillow or Airbnb are linked, not copied, so they don’t use storage. Deleting a video or a home frees its space.</p>
            </>}
          </div>}

          {section === "profile" && <footer className="ws-footer">
            <small>{dirty ? "You have unsaved changes." : "All changes saved."}</small>
            <button type="button" className="ws-button primary" disabled={!dirty || props.saving} onClick={() => void saveProfile()}>{props.saving ? "Saving…" : "Save changes"}</button>
          </footer>}
        </div>
      </section>
    </div>
  );
}
