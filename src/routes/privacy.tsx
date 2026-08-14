import { createFileRoute, Link } from "@tanstack/react-router";
import { LegalPage, Section } from "@/components/LegalPage";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — dwellmade" },
      {
        name: "description",
        content:
          "How dwellmade collects, uses and protects your account details, room photos and generated designs, and how to exercise your UK GDPR rights.",
      },
      { property: "og:title", content: "Privacy Policy — dwellmade" },
      {
        property: "og:description",
        content: "What dwellmade collects, why, who processes it, and your data rights.",
      },
      { property: "og:type", content: "article" },
      { property: "og:url", content: "https://dwellmade.lovable.app/privacy" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://dwellmade.lovable.app/privacy" }],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="LEGAL"
      title="Privacy policy"
      intro="This policy explains what dwellmade collects when you use the service, why we collect it, who else handles it, and the control you have over it."
      updated="5 August 2026"
    >
      <Section title="Who controls your data">
        <p>
          dwellmade, based in the United Kingdom, is the data controller for the information
          described here. Contact us about anything in this policy at{" "}
          <a href="mailto:dwellmade.app@gmail.com" className="underline underline-offset-4">
            dwellmade.app@gmail.com
          </a>
          .
        </p>
      </Section>

      <Section title="What we collect">
        <p>
          <strong>Account details</strong> — your email address, and if you sign in with Google, the
          basic profile information Google returns. We don't store your password; authentication is
          handled by our hosting provider.
        </p>
        <p>
          <strong>Content you create</strong> — room photos, inspiration images, the aesthetic
          briefs derived from them, any notes you write, and the designs generated for you.
        </p>
        <p>
          <strong>Usage data</strong> — how many generations you've used in the current period, and
          for visitors who aren't signed in, a fingerprint value derived from your IP address and
          browser, stored in a cookie, so the 3 free generations can be counted.
        </p>
        <p>
          <strong>Technical logs</strong> — standard request and error logs produced by our hosting
          provider when the app runs.
        </p>
      </Section>

      <Section title="Why we use it, and on what basis">
        <p>
          To provide the service you asked for — creating accounts, storing projects, generating
          designs, sending account emails. Lawful basis: performance of a contract with you.
        </p>
        <p>
          To run the free allowance fairly and prevent abuse of generation limits. Lawful basis: our
          legitimate interest in protecting the service from misuse.
        </p>
        <p>
          To handle billing once paid subscriptions are live, and to keep the records we're required
          to keep. Lawful basis: contract and legal obligation.
        </p>
      </Section>

      <Section title="Who processes it for us">
        <p>
          <strong>Hosting, database and file storage</strong> — our managed cloud platform stores
          your account, projects and images.
        </p>
        <p>
          <strong>AI model provider</strong> — the room and inspiration images you submit, along
          with your brief, are sent to the AI provider that tags inspiration and generates designs.
          This is necessary to produce your results.
        </p>
        <p>
          <strong>Email delivery</strong> — account emails such as confirmation and password resets
          are sent from notify.dwellmade.co.uk through our email provider.
        </p>
        <p>
          <strong>Payments</strong> — when paid subscriptions launch, a payment provider will handle
          checkout and card details. We never see or store your card number.
        </p>
        <p>
          We don't sell your data and we don't use your photos to advertise to you or anyone else.
        </p>
      </Section>

      <Section title="How long we keep it">
        <p>
          Projects, rooms, uploads and designs stay until you delete them or close your account.
          Deleting a room or project removes its content from your account. Ask us to close your
          account and we'll delete your data, keeping only what we must for legal or accounting
          reasons. Anonymous generation counters are kept for up to a year.
        </p>
      </Section>

      <Section title="Cookies">
        <p>
          We use only what the app needs to work: a session cookie or token that keeps you signed
          in, and a <code>dm_fp</code> cookie that counts the 3 free generations for visitors who
          aren't signed in. We don't run third-party advertising or analytics cookies.
        </p>
      </Section>

      <Section title="International transfers">
        <p>
          Some of our providers process data outside the UK. Where that happens, the transfer is
          covered by the safeguards those providers offer, such as UK-approved standard contractual
          clauses.
        </p>
      </Section>

      <Section title="Your rights">
        <p>
          Under UK GDPR you can ask for a copy of your data, correct it, delete it, restrict or
          object to how we use it, or ask for it in a portable format. Email{" "}
          <a href="mailto:dwellmade.app@gmail.com" className="underline underline-offset-4">
            dwellmade.app@gmail.com
          </a>{" "}
          and we'll respond within one month.
        </p>
        <p>
          If you're unhappy with how we've handled your data you can complain to the Information
          Commissioner's Office at ico.org.uk. We'd appreciate the chance to put it right first.
        </p>
      </Section>

      <Section title="Changes">
        <p>
          We'll update this page when our practices change and revise the date at the top. Our{" "}
          <Link to="/terms" className="underline underline-offset-4">
            terms of service
          </Link>{" "}
          cover the rest of the agreement.
        </p>
      </Section>
    </LegalPage>
  );
}
