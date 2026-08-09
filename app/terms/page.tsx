import type { Metadata } from "next";
import HomieLogo from "../HomieLogo";
import styles from "../legal.module.css";

export const metadata: Metadata = {
  title: "Terms of Service — Homie",
  description: "The terms that govern your use of Homie's AI home tour video platform.",
};

const EFFECTIVE_DATE = "August 9, 2026";
const SUPPORT_EMAIL = "supportbyhomie@gmail.com";

const toc = [
  ["acceptance", "1. Acceptance of these Terms"],
  ["the-service", "2. The Service"],
  ["accounts", "3. Accounts & eligibility"],
  ["listing-data", "4. Zillow & third-party listing data"],
  ["your-content", "5. Your content & license to Homie"],
  ["ai-content", "6. AI-generated videos"],
  ["credits-billing", "7. Credits, billing & subscriptions"],
  ["acceptable-use", "8. Acceptable use"],
  ["fair-housing", "9. Fair housing & advertising compliance"],
  ["ip", "10. Homie's intellectual property"],
  ["termination", "11. Suspension & termination"],
  ["disclaimers", "12. Disclaimers"],
  ["liability", "13. Limitation of liability"],
  ["indemnification", "14. Indemnification"],
  ["governing-law", "15. Governing law & disputes"],
  ["changes", "16. Changes to these Terms"],
  ["contact", "17. Contact us"],
];

export default function TermsPage() {
  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <a className={styles.brand} href="/" aria-label="Homie home"><HomieLogo /></a>
        <a className={styles.back} href="/">← Back to Homie</a>
      </header>

      <main className={styles.article}>
        <p className={styles.eyebrow}>Legal · Terms of Service</p>
        <h1>Terms of Service</h1>
        <p className={styles.updated}>Effective date: {EFFECTIVE_DATE}</p>

        <nav className={styles.toc} aria-label="Table of contents">
          <p>On this page</p>
          <ol>
            {toc.map(([id, label]) => (
              <li key={id}><a href={`#${id}`}>{label}</a></li>
            ))}
          </ol>
        </nav>

        <section id="acceptance">
          <h2>1. Acceptance of these Terms</h2>
          <p>
            These Terms of Service (&quot;Terms&quot;) govern your access to and use of Homie, an AI-powered
            platform that turns real estate listing photos into short property-tour videos (the
            &quot;Service&quot;). By creating an account or otherwise using the Service, you agree to be
            bound by these Terms. If you do not agree, do not use the Service.
          </p>
          <p>
            If you are using Homie on behalf of a brokerage, team, or other organization, you represent
            that you have the authority to bind that organization, and &quot;you&quot; refers to both you and
            that organization.
          </p>
        </section>

        <section id="the-service">
          <h2>2. The Service</h2>
          <p>
            Homie lets you connect a property listing, choose a curated AI video template, and generate a
            short vertical video from your listing photos. Every generated video enters an
            awaiting-approval state — nothing is published, downloaded, or shared until you explicitly
            approve it.
          </p>
          <p>
            We may add, change, or remove features, templates, or AI models at any time, and we may
            impose limits on certain features (for example, generation duration, resolution, or the
            number of videos you can create) without notice.
          </p>
        </section>

        <section id="accounts">
          <h2>3. Accounts & eligibility</h2>
          <p>
            You must be at least 18 years old and able to form a binding contract to create a Homie
            account. You are responsible for maintaining the confidentiality of your login credentials
            and for all activity that occurs under your account, whether you sign in with email and
            password or through a third-party provider such as Google or Apple.
          </p>
          <p>
            You agree to provide accurate account information and to keep it up to date. Notify us
            immediately at <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> if you suspect
            unauthorized use of your account.
          </p>
        </section>

        <section id="listing-data">
          <h2>4. Zillow & third-party listing data</h2>
          <p>
            Homie can import listing details and photos from Zillow and other third-party sources at
            your direction. You are responsible for ensuring you have the right to import and use that
            data, and for complying with the terms of the third-party source. We are not affiliated
            with, and do not warrant the accuracy or availability of, any third-party listing service.
          </p>
        </section>

        <section id="your-content">
          <h2>5. Your content & license to Homie</h2>
          <p>
            &quot;Your Content&quot; means the photos, listing details, brand assets, and other material you
            upload or import into Homie. You retain all ownership rights in Your Content. You grant
            Homie a worldwide, non-exclusive, royalty-free license to host, copy, process, and use Your
            Content solely to operate, provide, and improve the Service for you — including sending Your
            Content to the AI providers described in our <a href="/privacy#processing">Privacy Policy</a>{" "}
            in order to generate your videos.
          </p>
          <p>
            You represent that you own Your Content or have the necessary rights and permissions to
            upload it, and that Your Content does not infringe or violate the rights of any third party.
          </p>
        </section>

        <section id="ai-content">
          <h2>6. AI-generated videos</h2>
          <p>
            Videos produced by Homie are generated using third-party AI models based on the photos and
            prompts associated with your chosen template. AI-generated video is probabilistic: it may
            contain visual imperfections, inaccuracies, or details not present in your original photos.
          </p>
          <p>
            You are solely responsible for reviewing every generated video before you approve, publish,
            or share it, and for confirming it accurately represents the property and complies with any
            rules that apply to your listing, brokerage, or MLS. Homie makes no guarantee that a
            generated video will be accepted by any particular platform or listing service.
          </p>
        </section>

        <section id="credits-billing">
          <h2>7. Credits, billing & subscriptions</h2>
          <p>
            Access to generation features is metered using credits included with a free trial or a paid
            subscription plan. Credits are consumed when you generate a video and are non-refundable
            once used, except where required by law.
          </p>
          <p>
            Paid subscriptions renew automatically for successive billing periods until cancelled. You
            can cancel at any time from your account settings; cancellation takes effect at the end of
            the current billing period, and we do not provide prorated refunds for partial periods
            except where required by law. We may change our pricing or credit allowances, and we will
            provide reasonable notice before changes take effect for existing subscribers.
          </p>
        </section>

        <section id="acceptable-use">
          <h2>8. Acceptable use</h2>
          <p>You agree not to use Homie to:</p>
          <ul>
            <li>Upload content you do not have the right to use, or that infringes another person&apos;s intellectual property or privacy rights;</li>
            <li>Generate or publish videos that are false, misleading, or materially misrepresent a property;</li>
            <li>Upload or generate unlawful, defamatory, obscene, or discriminatory content;</li>
            <li>Attempt to reverse-engineer, scrape, or interfere with the Service or its underlying AI models;</li>
            <li>Use the Service to build a competing product, or resell access to the Service without our written consent; or</li>
            <li>Violate any applicable law, regulation, or third-party right, including real-estate advertising rules.</li>
          </ul>
          <p>We may suspend or remove content, or suspend or terminate accounts, that violate this section.</p>
        </section>

        <section id="fair-housing">
          <h2>9. Fair housing & advertising compliance</h2>
          <p>
            As a real estate professional, you remain solely responsible for ensuring that every listing,
            photo, and generated video you publish complies with applicable fair housing laws (including
            the U.S. Fair Housing Act and equivalent local rules), MLS rules, and advertising regulations.
            Homie is a production tool; it does not review your content for legal or regulatory
            compliance, and using the Service does not transfer that responsibility to Homie.
          </p>
        </section>

        <section id="ip">
          <h2>10. Homie&apos;s intellectual property</h2>
          <p>
            The Service, including its software, templates, designs, and branding, is owned by Homie and
            protected by intellectual property laws. Except for the limited license to use the Service as
            intended, these Terms do not grant you any rights to our trademarks, templates, or underlying
            technology.
          </p>
        </section>

        <section id="termination">
          <h2>11. Suspension & termination</h2>
          <p>
            You may stop using the Service and delete your account at any time. We may suspend or
            terminate your access if you violate these Terms, if required by law, or if we discontinue
            the Service, with notice where reasonably practicable. Sections that by their nature should
            survive termination — including ownership, disclaimers, limitation of liability, and
            indemnification — will survive.
          </p>
        </section>

        <section id="disclaimers">
          <h2>12. Disclaimers</h2>
          <p>
            The Service and all generated content are provided &quot;as is&quot; and &quot;as available,&quot; without
            warranties of any kind, whether express, implied, or statutory, including warranties of
            merchantability, fitness for a particular purpose, non-infringement, or that the Service or
            generated videos will be accurate, uninterrupted, or error-free.
          </p>
        </section>

        <section id="liability">
          <h2>13. Limitation of liability</h2>
          <p>
            To the maximum extent permitted by law, Homie will not be liable for any indirect,
            incidental, special, consequential, or punitive damages, or any loss of profits, revenue,
            data, or goodwill, arising from or related to your use of the Service. Our total liability
            for any claim arising out of these Terms or the Service will not exceed the amount you paid
            to Homie in the twelve months preceding the claim.
          </p>
        </section>

        <section id="indemnification">
          <h2>14. Indemnification</h2>
          <p>
            You agree to indemnify and hold Homie harmless from any claims, damages, or expenses
            (including reasonable legal fees) arising from Your Content, your use of the Service, or
            your violation of these Terms or applicable law.
          </p>
        </section>

        <section id="governing-law">
          <h2>15. Governing law & disputes</h2>
          <p>
            These Terms are governed by the laws applicable in the jurisdiction in which Homie operates,
            without regard to conflict-of-laws principles. Any dispute arising from these Terms or the
            Service will be resolved in the courts of competent jurisdiction in that location, unless
            otherwise required by applicable law.
          </p>
        </section>

        <section id="changes">
          <h2>16. Changes to these Terms</h2>
          <p>
            We may update these Terms from time to time. If we make material changes, we will provide
            reasonable notice, such as an in-product notice or an email to your registered address.
            Continued use of the Service after changes take effect constitutes acceptance of the updated
            Terms.
          </p>
        </section>

        <section id="contact">
          <h2>17. Contact us</h2>
          <div className={styles.contact}>
            <span>Questions about these Terms</span>
            <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
          </div>
          <p className={styles.crosslink}><a href="/privacy">Read our Privacy Policy →</a></p>
        </section>

        <p className={styles.disclaimer}>
          This page is provided for general informational purposes and does not constitute legal advice.
          Homie recommends reviewing these Terms with your own counsel before relying on them for
          compliance purposes.
        </p>
      </main>
    </div>
  );
}
