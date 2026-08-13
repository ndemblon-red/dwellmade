import { Link } from "@tanstack/react-router";
import { useStripeCheckout } from "@/hooks/useStripeCheckout";
import { useAuth } from "@/hooks/use-auth";

const NEAR_BLACK = "#1A1A2E";
const CREAM = "#F5F0E8";
const MUSTARD = "#F0A500";
const MUTED_CREAM = "rgba(245,240,232,0.7)";
const serif = { fontFamily: "'Instrument Serif', serif" };
const dmSans = { fontFamily: "'DM Sans', ui-sans-serif, system-ui, sans-serif" };

export type UpgradeModalProps = {
  open: boolean;
  onClose: () => void;
  reason: "anonymous_used_free" | "free_account" | "paid_limit_reached";
  resetsAt?: string;
  used?: number;
  limit?: number;
};

function formatResetDate(iso?: string): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "long" });
}

export function UpgradeModal({ open, onClose, reason, resetsAt, used, limit }: UpgradeModalProps) {
  const {
    openCheckout,
    closeCheckout,
    isOpen: checkoutOpen,
    checkoutElement,
  } = useStripeCheckout();
  const { user, loading } = useAuth();

  if (!open) return null;

  const eyebrow = {
    anonymous_used_free: "YOU'VE USED YOUR 3 FREE GENERATIONS",
    free_account: "YOUR FREE VISITOR ALLOWANCE HAS ENDED",
    paid_limit_reached: "YOU'VE REACHED YOUR MONTHLY LIMIT",
  }[reason];
  const description =
    reason === "free_account"
      ? "Your free generations are available before signup and don't reset when you create an account. Subscribe for 50 generations a month."
      : "Subscribe to dwellmade for 50 generations a month — enough to redesign every room in your home.";

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
      onClick={() => {
        closeCheckout();
        onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md p-8 sm:p-10"
        style={{
          backgroundColor: NEAR_BLACK,
          color: CREAM,
          borderRadius: 4,
          ...dmSans,
        }}
      >
        <button
          onClick={() => {
            closeCheckout();
            onClose();
          }}
          aria-label="Close"
          className="absolute right-2 top-2 size-11 grid place-items-center text-lg"
          style={{ color: MUTED_CREAM }}
        >
          ✕
        </button>

        {checkoutOpen ? (
          <div className="mt-2">
            <div className="text-[10px] font-semibold tracking-[0.22em]" style={{ color: MUSTARD }}>
              SECURE CHECKOUT
            </div>
            <h2 style={serif} className="mt-3 text-3xl leading-[1.05]">
              Complete your subscription
            </h2>
            <div className="mt-4 -mx-4 sm:-mx-6">{checkoutElement}</div>
          </div>
        ) : (
          <>
            <div className="text-[10px] font-semibold tracking-[0.22em]" style={{ color: MUSTARD }}>
              {eyebrow}
            </div>

            <h2 style={serif} className="mt-3 text-4xl leading-[1.05]">
              Ready to make it yours?
            </h2>

            <p className="mt-4 text-sm leading-relaxed" style={{ color: MUTED_CREAM }}>
              {description}
            </p>

            <div className="mt-6">
              <div style={serif} className="text-5xl leading-none">
                £15{" "}
                <span className="text-2xl" style={{ color: MUTED_CREAM }}>
                  / month
                </span>
              </div>
              <div className="mt-1 text-xs" style={{ color: MUTED_CREAM }}>
                Cancel anytime.
              </div>
            </div>

            {user ? (
              <button
                onClick={() =>
                  openCheckout({
                    priceId: "dwellmade_basic_monthly",
                    quantity: 1,
                    returnUrl: `${window.location.origin}/projects?checkout=success`,
                  })
                }
                className="mt-7 w-full py-3.5 text-sm font-semibold"
                style={{ backgroundColor: MUSTARD, color: NEAR_BLACK, borderRadius: 4 }}
              >
                Subscribe now
              </button>
            ) : (
              <Link
                to="/auth"
                search={{ next: "checkout" as const }}
                className="mt-7 block w-full py-3.5 text-center text-sm font-semibold"
                style={{
                  backgroundColor: MUSTARD,
                  color: NEAR_BLACK,
                  borderRadius: 4,
                  opacity: loading ? 0.7 : 1,
                }}
              >
                Create an account & subscribe
              </Link>
            )}

            {!user ? (
              <p className="mt-3 text-center text-[11px]" style={{ color: MUTED_CREAM }}>
                Takes a moment — you'll go straight to payment afterwards.
              </p>
            ) : null}

            <div className="mt-4 text-center text-xs" style={{ color: MUTED_CREAM }}>
              Already subscribed?{" "}
              <Link
                to="/auth"
                search={{ next: undefined }}
                className="underline underline-offset-4"
                style={{ color: CREAM }}
              >
                Sign in
              </Link>
            </div>

            <div className="mt-3 text-center text-[11px]" style={{ color: MUTED_CREAM }}>
              <Link to="/terms" className="underline underline-offset-4">
                Terms
              </Link>{" "}
              ·{" "}
              <Link to="/privacy" className="underline underline-offset-4">
                Privacy
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
