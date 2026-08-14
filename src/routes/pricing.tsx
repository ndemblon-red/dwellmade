import { createFileRoute, Link } from "@tanstack/react-router";
import {
  CREAM,
  MUSTARD,
  NEAR_BLACK,
  SiteFooter,
  SiteNav,
  dmSans,
  serif,
} from "@/components/LegalPage";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — dwellmade interior design generations" },
      {
        name: "description",
        content:
          "dwellmade costs £15 a month for 50 AI room designs. Try 3 free generations before you sign up. Cancel anytime.",
      },
      { property: "og:title", content: "Pricing — dwellmade" },
      {
        property: "og:description",
        content:
          "£15 a month for 50 room designs. 3 free generations before signup. Cancel anytime.",
      },
      { property: "og:type", content: "product" },
      { property: "og:url", content: "https://dwellmade.co.uk/pricing" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://dwellmade.co.uk/pricing" }],
  }),
  component: PricingPage,
});

const INCLUDED = [
  "50 room generations every month",
  "Unlimited projects and rooms",
  "Inspiration boards with automatic colour, material and mood tagging",
  "Your own aesthetic brief per room, reusable across designs",
  "Full-resolution downloads of every design you generate",
  "Your projects saved and revisitable whenever you like",
];

function PricingPage() {
  return (
    <div style={{ backgroundColor: CREAM, color: NEAR_BLACK, ...dmSans }}>
      <SiteNav />
      <main className="max-w-3xl mx-auto px-6 sm:px-8 py-14 sm:py-20">
        <div className="text-[10px] font-semibold tracking-[0.22em]" style={{ color: MUSTARD }}>
          PRICING
        </div>
        <h1 style={serif} className="mt-3 text-5xl sm:text-6xl leading-[1.02]">
          One plan. Every room.
        </h1>
        <p className="mt-5 text-base leading-relaxed" style={{ opacity: 0.8 }}>
          Try dwellmade with 3 free generations before you sign up — no card needed. When you're
          ready to redesign the whole house, there's a single subscription.
        </p>

        <div
          className="mt-10 p-8 sm:p-10"
          style={{ backgroundColor: NEAR_BLACK, color: CREAM, borderRadius: 4 }}
        >
          <div className="text-[10px] font-semibold tracking-[0.22em]" style={{ color: MUSTARD }}>
            DWELLMADE SUBSCRIPTION
          </div>
          <div style={serif} className="mt-3 text-6xl leading-none">
            £15{" "}
            <span className="text-2xl" style={{ opacity: 0.7 }}>
              / month
            </span>
          </div>
          <div className="mt-2 text-sm" style={{ opacity: 0.7 }}>
            50 generations a month. Cancel anytime.
          </div>

          <ul className="mt-7 space-y-3 text-sm" style={{ opacity: 0.9 }}>
            {INCLUDED.map((item) => (
              <li key={item} className="flex gap-3">
                <span style={{ color: MUSTARD }}>—</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>

          <Link
            to="/auth"
            search={{ next: "checkout" as const }}
            className="mt-8 block w-full py-3.5 text-center text-sm font-semibold"
            style={{ backgroundColor: MUSTARD, color: NEAR_BLACK, borderRadius: 4 }}
          >
            Subscribe
          </Link>
        </div>

        <section className="mt-12">
          <h2 style={serif} className="text-3xl leading-tight">
            The free allowance
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed" style={{ opacity: 0.85 }}>
            Every visitor gets 3 generations in their browser before signing up. Creating an account
            doesn't add more free generations — it saves your work and lets you subscribe.
          </p>
        </section>

        <section className="mt-10">
          <h2 style={serif} className="text-3xl leading-tight">
            Billing and cancellation
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed" style={{ opacity: 0.85 }}>
            The subscription renews monthly until you cancel. You can cancel at any time and keep
            access until the end of the period you've already paid for. We don't refund part-used
            months. Full details are in the{" "}
            <Link to="/terms" className="underline underline-offset-4">
              terms
            </Link>
            .
          </p>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
