import type { Metadata } from "next";
import Link from "next/link";
import HomieLogo from "../HomieLogo";
import CookieSettingsButton from "./CookieSettingsButton";
import styles from "../legal.module.css";

export const metadata: Metadata = {
  title: "Cookie Policy — Homie",
  description: "The cookies and browser storage Homie uses, why, and how to control them.",
};

const EFFECTIVE_DATE = "October 12, 2026";
const SUPPORT_EMAIL = "supportbyhomie@gmail.com";

// Keep this table in sync with every localStorage/sessionStorage/cookie key in the app.
const essential = [
  ["sb-…-auth-token", "Homie (local storage)", "Keeps you signed in to your Homie account and refreshes your session.", "Until you sign out"],
  ["sb-…-auth-token-code-verifier", "Homie (local storage)", "Secures the Google sign-in handshake.", "A few minutes"],
  ["homie_cookie_consent", "Homie (local storage)", "Remembers your cookie choices so we don’t ask on every visit.", "Until you change it or clear site data"],
  ["Payment cookies", "Polar (polar.sh)", "Set by our payment processor on its own checkout pages to process payments and prevent fraud.", "Set by Polar"],
  ["Sign-in cookies", "Google (accounts.google.com)", "Set by Google on its own pages if you choose “Log in with Google”.", "Set by Google"],
  ["Security cookies", "Cloudflare", "May be set by our hosting provider to protect the site from abuse and bots.", "Up to 30 minutes"],
];
const functional = [
  ["homie-acquisition", "Homie (session storage)", "Remembers the offer you arrived from (for example the $1 first video) during sign-up.", "Until you close the tab"],
  ["homie_trial_popup_dismissed_at", "Homie (local storage)", "Stops the first-video offer from reappearing for 7 days after you close it.", "Until you clear site data"],
  ["homie:onboarding:v2:*", "Homie (local storage)", "Remembers that you finished the in-app tour.", "Until you clear site data"],
  ["homie-director-v1:*", "Homie (local storage)", "Keeps your Director conversation drafts on this device.", "Until you clear site data"],
];
const marketing = [
  ["homie-attribution-first", "Homie (local storage)", "The first ad, campaign or website that brought you to Homie (UTM tags, Meta/Google/TikTok click IDs, referring page).", "Until you sign up or withdraw consent"],
  ["homie-attribution-last", "Homie (local storage)", "The most recent campaign or link you used before signing up.", "Until you sign up or withdraw consent"],
];

function Table({ rows }: { rows: string[][] }) {
  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead><tr><th>Name</th><th>Set by</th><th>Purpose</th><th>Duration</th></tr></thead>
        <tbody>{rows.map(([name, by, purpose, duration]) => <tr key={name}><td><code>{name}</code></td><td>{by}</td><td>{purpose}</td><td>{duration}</td></tr>)}</tbody>
      </table>
    </div>
  );
}

export default function CookiesPage() {
  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <Link className={styles.brand} href="/" aria-label="Homie home"><HomieLogo /></Link>
        <Link className={styles.back} href="/">← Back to Homie</Link>
      </header>

      <main className={styles.article}>
        <p className={styles.eyebrow}>Legal · Cookie Policy</p>
        <h1>Cookie Policy</h1>
        <p className={styles.updated}>Effective date: {EFFECTIVE_DATE}</p>

        <section id="overview">
          <h2>1. What this policy covers</h2>
          <p>
            Homie uses a small number of cookies and similar browser storage (local storage and session storage) on
            try-homie.com and in the Homie app. This policy lists each one, why we use it and how long it lasts. It
            should be read together with our <a href="/privacy">Privacy Policy</a>.
          </p>
          <p>
            We do <strong>not</strong> use advertising pixels or third-party analytics trackers, and we do not sell or
            share the information described here with advertisers.
          </p>
        </section>

        <section id="essential">
          <h2>2. Essential</h2>
          <p>Required to sign you in, secure payments and remember your choices. These are always on, because the service cannot work without them.</p>
          <Table rows={essential} />
        </section>

        <section id="functional">
          <h2>3. Functional</h2>
          <p>Remember settings you choose so the product behaves the way you left it. They stay on this device and are never used for advertising.</p>
          <Table rows={functional} />
        </section>

        <section id="marketing">
          <h2>4. Analytics &amp; marketing (only with your consent)</h2>
          <p>
            If you choose <strong>Accept all</strong>, or switch on <em>Analytics &amp; marketing</em> in Cookie settings,
            Homie remembers which ad, campaign or website brought you here. When you create an account, this is saved
            with your account so we can measure which of our own campaigns work. If you decline or later withdraw
            consent, nothing is stored and anything already stored on this device is deleted.
          </p>
          <Table rows={marketing} />
          <p>
            We honour the <strong>Global Privacy Control</strong> signal: if your browser sends it, this category stays
            off and we don’t ask.
          </p>
        </section>

        <section id="third-party">
          <h2>5. Third-party services</h2>
          <p>
            Some providers set their own cookies when you use them directly: Polar on its checkout pages, and Google
            when you sign in with Google. Our pages also load fonts from Google Fonts, which receives your IP address
            to deliver the font files but does not set cookies. These providers’ own privacy policies apply to that
            processing.
          </p>
        </section>

        <section id="control">
          <h2>6. Your choices</h2>
          <p>You can change your choice at any time:</p>
          <p><CookieSettingsButton /></p>
          <p>
            You can also delete cookies and site data in your browser settings. Blocking essential storage will sign
            you out and may stop parts of Homie from working.
          </p>
        </section>

        <section id="contact">
          <h2>7. Contact us</h2>
          <div className={styles.contact}>
            <span>Questions about cookies or your data</span>
            <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
          </div>
          <p className={styles.crosslink}><a href="/privacy">Read our Privacy Policy →</a></p>
        </section>

        <p className={styles.disclaimer}>
          This page is provided for general informational purposes and does not constitute legal advice.
          Homie recommends reviewing this policy with your own counsel before relying on it for compliance purposes.
        </p>
      </main>
    </div>
  );
}
