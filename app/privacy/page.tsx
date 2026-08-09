import type { Metadata } from "next";
import HomieLogo from "../HomieLogo";
import styles from "../legal.module.css";

export const metadata: Metadata = {
  title: "Privacy Policy — Homie",
  description: "How Homie collects, uses, and protects your information.",
};

const EFFECTIVE_DATE = "August 9, 2026";
const SUPPORT_EMAIL = "supportbyhomie@gmail.com";

const toc = [
  ["overview", "1. Overview"],
  ["information-we-collect", "2. Information we collect"],
  ["how-we-use", "3. How we use information"],
  ["processing", "4. AI processing & service providers"],
  ["cookies", "5. Cookies & similar technologies"],
  ["sharing", "6. How we share information"],
  ["retention", "7. Data retention"],
  ["security", "8. Security"],
  ["your-rights", "9. Your rights & choices"],
  ["children", "10. Children's privacy"],
  ["international", "11. International data transfers"],
  ["changes", "12. Changes to this policy"],
  ["contact", "13. Contact us"],
];

export default function PrivacyPage() {
  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <a className={styles.brand} href="/" aria-label="Homie home"><HomieLogo /></a>
        <a className={styles.back} href="/">← Back to Homie</a>
      </header>

      <main className={styles.article}>
        <p className={styles.eyebrow}>Legal · Privacy Policy</p>
        <h1>Privacy Policy</h1>
        <p className={styles.updated}>Effective date: {EFFECTIVE_DATE}</p>

        <nav className={styles.toc} aria-label="Table of contents">
          <p>On this page</p>
          <ol>
            {toc.map(([id, label]) => (
              <li key={id}><a href={`#${id}`}>{label}</a></li>
            ))}
          </ol>
        </nav>

        <section id="overview">
          <h2>1. Overview</h2>
          <p>
            This Privacy Policy explains how Homie (&quot;we,&quot; &quot;us&quot;) collects, uses, shares, and protects
            information when you use our AI home-tour video platform (the &quot;Service&quot;). By using the
            Service, you agree to the collection and use of information as described here.
          </p>
        </section>

        <section id="information-we-collect">
          <h2>2. Information we collect</h2>
          <p><strong>Account information.</strong> When you sign up, we collect your email address and, if you
            sign in with Google or Apple, basic profile information from that provider (such as your name
            and profile photo).</p>
          <p><strong>Listing content.</strong> Property addresses, listing details, and photos you upload
            directly or import from Zillow or other third-party sources.</p>
          <p><strong>Generated content.</strong> The videos, thumbnails, and generation settings (such as the
            template and prompts used) produced through the Service.</p>
          <p><strong>Brand assets.</strong> Logos, colors, and contact details you save to apply your brand to
            generated videos.</p>
          <p><strong>Payment information.</strong> If you subscribe to a paid plan, our payment processor
            collects your billing details directly; we do not store full card numbers on our servers.</p>
          <p><strong>Usage & device data.</strong> Log data, device and browser type, pages viewed, and
            actions taken in the product, collected automatically as you use the Service.</p>
        </section>

        <section id="how-we-use">
          <h2>3. How we use information</h2>
          <p>We use the information we collect to:</p>
          <ul>
            <li>Provide, operate, and maintain the Service, including generating your videos;</li>
            <li>Authenticate your account and keep it secure;</li>
            <li>Process payments and manage subscriptions and credits;</li>
            <li>Communicate with you about your account, generations, and support requests;</li>
            <li>Monitor, debug, and improve the reliability and quality of the Service; and</li>
            <li>Comply with legal obligations and enforce our Terms of Service.</li>
          </ul>
        </section>

        <section id="processing">
          <h2>4. AI processing & service providers</h2>
          <p>
            To generate a video, we send your listing photos and the prompt associated with your chosen
            template to third-party AI generation providers. Those providers process this content solely
            to return the generated video, thumbnail, and related output to Homie.
          </p>
          <p>We also rely on the following categories of service providers to operate Homie:</p>
          <ul>
            <li><strong>Database & authentication</strong> — to store your account, listings, and app data, and to manage sign-in;</li>
            <li><strong>Cloud storage</strong> — to store and serve your uploaded photos and generated videos;</li>
            <li><strong>AI generation providers</strong> — to turn your photos and prompts into videos and images;</li>
            <li><strong>Listing data providers</strong> — to import property details and photos when you connect a listing from Zillow or a similar source; and</li>
            <li><strong>Payment processing</strong> — to handle subscription billing.</li>
          </ul>
          <p>
            These providers are only permitted to use your information to perform services on our behalf
            and are bound by confidentiality and data-protection obligations.
          </p>
        </section>

        <section id="cookies">
          <h2>5. Cookies & similar technologies</h2>
          <p>
            We use cookies for two purposes: <strong>essential cookies</strong> that keep you signed in and
            keep the Service functioning, and <strong>analytics cookies</strong> that help us understand how
            the Service is used so we can improve it. Essential cookies cannot be turned off, since the
            Service cannot function without them.
          </p>
          <p>
            When you first visit our marketing site, a cookie banner lets you accept or dismiss
            non-essential cookies; your choice is remembered on that device so we don&apos;t ask again. You
            can clear this preference at any time by clearing your browser&apos;s site data.
          </p>
        </section>

        <section id="sharing">
          <h2>6. How we share information</h2>
          <p>We do not sell your personal information. We share information only:</p>
          <ul>
            <li>With the service providers described in Section 4, to operate the Service;</li>
            <li>With other members of your workspace or team, if you use a shared team workspace;</li>
            <li>If required to comply with law, legal process, or a governmental request;</li>
            <li>To protect the rights, property, or safety of Homie, our users, or the public; or</li>
            <li>In connection with a merger, acquisition, or sale of assets, subject to this Policy continuing to apply to your information.</li>
          </ul>
        </section>

        <section id="retention">
          <h2>7. Data retention</h2>
          <p>
            We retain your account information, listing content, and generated videos for as long as
            your account is active, or as needed to provide the Service. If you delete your account, we
            delete or anonymize your personal information within a reasonable period, except where we
            must retain it to comply with legal obligations, resolve disputes, or enforce our agreements.
          </p>
        </section>

        <section id="security">
          <h2>8. Security</h2>
          <p>
            We use industry-standard technical and organizational measures — including encryption in
            transit, access controls, and row-level security on our database — to protect your
            information. No method of transmission or storage is completely secure, and we cannot
            guarantee absolute security.
          </p>
        </section>

        <section id="your-rights">
          <h2>9. Your rights & choices</h2>
          <p>Depending on where you live, you may have the right to:</p>
          <ul>
            <li>Access, correct, or delete the personal information we hold about you;</li>
            <li>Export a copy of your data;</li>
            <li>Object to or restrict certain processing, including analytics cookies; and</li>
            <li>Withdraw consent where processing is based on consent.</li>
          </ul>
          <p>
            You can manage most account information directly in your Homie settings. To exercise any of
            these rights, contact us at <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>, and we
            will respond within a reasonable time.
          </p>
        </section>

        <section id="children">
          <h2>10. Children&apos;s privacy</h2>
          <p>
            Homie is intended for real estate professionals and is not directed to children. We do not
            knowingly collect personal information from anyone under 18. If you believe a child has
            provided us with personal information, contact us and we will delete it.
          </p>
        </section>

        <section id="international">
          <h2>11. International data transfers</h2>
          <p>
            We and our service providers may process and store information in countries other than your
            own. Where required, we rely on appropriate safeguards to ensure your information receives an
            adequate level of protection wherever it is processed.
          </p>
        </section>

        <section id="changes">
          <h2>12. Changes to this policy</h2>
          <p>
            We may update this Privacy Policy from time to time. If we make material changes, we will
            provide reasonable notice, such as an in-product notice or an email to your registered
            address, before the changes take effect.
          </p>
        </section>

        <section id="contact">
          <h2>13. Contact us</h2>
          <div className={styles.contact}>
            <span>Questions about this policy or your data</span>
            <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
          </div>
          <p className={styles.crosslink}><a href="/terms">Read our Terms of Service →</a></p>
        </section>

        <p className={styles.disclaimer}>
          This page is provided for general informational purposes and does not constitute legal advice.
          Homie recommends reviewing this policy with your own counsel before relying on it for
          compliance purposes.
        </p>
      </main>
    </div>
  );
}
