import { createFileRoute, Link } from "@tanstack/react-router";
import { LegalPage, Section } from "@/components/LegalPage";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — dwellmade" },
      {
        name: "description",
        content:
          "The terms that apply when you use dwellmade to generate interior design visualisations, including subscription, cancellation and acceptable use.",
      },
      { property: "og:title", content: "Terms of Service — dwellmade" },
      {
        property: "og:description",
        content: "Subscription, cancellation, acceptable use and liability terms for dwellmade.",
      },
      { property: "og:type", content: "article" },
      { property: "og:url", content: "https://dwellmade.co.uk/terms" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://dwellmade.co.uk/terms" }],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <LegalPage
      eyebrow="LEGAL"
      title="Terms of service"
      intro="These terms are the agreement between you and dwellmade when you use the site or the app. By creating an account or generating a design, you accept them."
      updated="5 August 2026"
    >
      <Section title="Who we are">
        <p>
          dwellmade is an interior design visualisation service operated from the United Kingdom.
          You can reach us at{" "}
          <a href="mailto:dwellmade.app@gmail.com" className="underline underline-offset-4">
            dwellmade.app@gmail.com
          </a>{" "}
          for anything to do with your account, billing or these terms.
        </p>
      </Section>

      <Section title="What the service does">
        <p>
          You upload a photo of a room and images that inspire you. dwellmade analyses the
          inspiration into an aesthetic brief — palette, materials, furniture style, lighting and
          mood — and uses an AI model to generate restyled images of your room. Projects, rooms,
          briefs and generated designs are saved to your account.
        </p>
      </Section>

      <Section title="Your account">
        <p>
          You must be at least 18 and give accurate details when you register. You're responsible
          for what happens under your account and for keeping your sign-in secure. One account is
          for one person; don't share access.
        </p>
      </Section>

      <Section title="What you upload">
        <p>
          You must have the right to upload every image you put into dwellmade. Don't upload photos
          of other people's property or copyrighted images you don't have permission to use, and
          don't upload anything unlawful, sexual, hateful or that identifies a person who hasn't
          agreed to it.
        </p>
        <p>
          Don't use the service to attempt to extract, misuse or attack the underlying AI models,
          and don't attempt to bypass the generation allowance.
        </p>
      </Section>

      <Section title="About the designs we generate">
        <p>
          Generated images are visualisations, not plans. They are not architectural, structural,
          electrical, safety or professional design advice, and they don't account for the real
          dimensions, services or condition of your room. Get a qualified professional before making
          structural or safety-related changes.
        </p>
        <p>
          AI output varies. Objects, proportions and materials may be rendered inaccurately, and two
          runs of the same brief will not produce the same image. We don't guarantee that any
          particular generation will meet your expectations.
        </p>
      </Section>

      <Section title="Who owns what">
        <p>
          You keep all rights in the photos you upload. You grant us the licence we need to store
          them and to send them to our AI provider so we can produce your designs.
        </p>
        <p>
          You may use the designs you generate — including commercially — for your own projects,
          subject to these terms. We keep all rights in the dwellmade platform, brand, site and
          software. AI output isn't unique: similar prompts by other users can produce similar
          images, so we can't promise exclusivity in a generated image.
        </p>
      </Section>

      <Section title="Subscription and billing">
        <p>
          The dwellmade subscription is £15 per month and includes 50 generations per monthly
          period. Unused generations don't roll over. Payment is taken in advance and renews
          automatically each month until cancelled. Prices include any applicable UK VAT.
        </p>
        <p>
          We may change the price. If we do, we'll tell you by email before it applies to you, and
          you can cancel before the change takes effect.
        </p>
      </Section>

      <Section title="Cancellation and refunds">
        <p>
          You can cancel at any time. Your subscription stays active until the end of the period
          you've already paid for, and you won't be charged again after that. We don't give refunds
          for part-used months or for generations you didn't use.
        </p>
        <p>
          Nothing here removes your statutory rights as a consumer. Because dwellmade is digital
          content supplied immediately, when you start generating within the 14-day cancellation
          period you're asking us to begin the service straight away and you accept that the
          statutory right to cancel that supply ends once it has begun.
        </p>
      </Section>

      <Section title="Suspension and ending the agreement">
        <p>
          We may suspend or close an account that breaks these terms, abuses the service, or puts
          other users or our providers at risk. You can close your account at any time by contacting
          us; closing it deletes your projects and designs.
        </p>
      </Section>

      <Section title="Availability and liability">
        <p>
          We work to keep dwellmade available, but the service is provided as-is. We don't promise
          uninterrupted access, and we may change or withdraw features.
        </p>
        <p>
          We don't exclude liability for death or personal injury caused by our negligence, for
          fraud, or for anything else that can't be excluded by law. Otherwise, we're not liable for
          indirect or consequential loss, or for decisions you make based on a generated design, and
          our total liability is limited to the amount you paid us in the 12 months before the
          claim.
        </p>
      </Section>

      <Section title="Changes to these terms">
        <p>
          We may update these terms. If a change materially affects you, we'll email you or show a
          notice in the app before it takes effect. Continuing to use dwellmade after that means you
          accept the updated terms.
        </p>
      </Section>

      <Section title="Governing law">
        <p>
          These terms are governed by the laws of England and Wales, and the courts of England and
          Wales have jurisdiction. Read our{" "}
          <Link to="/privacy" className="underline underline-offset-4">
            privacy policy
          </Link>{" "}
          for how we handle your data.
        </p>
      </Section>
    </LegalPage>
  );
}
