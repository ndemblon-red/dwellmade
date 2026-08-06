import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AppHeader } from "@/components/AppHeader";
import { StripeEmbeddedCheckout } from "@/components/StripeEmbeddedCheckout";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { deleteMyAccount } from "@/utils/account.functions";


const NEAR_BLACK = "#1A1A2E";
const CREAM = "#F5F0E8";
const MUSTARD = "#F0A500";
const MUTED_CREAM = "rgba(245,240,232,0.7)";
const serif = { fontFamily: "'Instrument Serif', serif" };

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { title: "Checkout — dwellmade" },
      {
        name: "description",
        content: "Complete your dwellmade subscription: 50 AI room designs a month for £15.",
      },
      { property: "og:title", content: "Checkout — dwellmade" },
      {
        property: "og:description",
        content: "Complete your dwellmade subscription: 50 AI room designs a month for £15.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CheckoutPage,
});

function CheckoutPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [checking, setChecking] = useState(true);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const runDeleteAccount = useServerFn(deleteMyAccount);

  const handleDelete = async () => {
    setDeleting(true);
    setDeleteError(null);
    try {
      const result = await runDeleteAccount({});
      if ("error" in result) {
        setDeleteError(result.error);
        setDeleting(false);
        return;
      }
      await supabase.auth.signOut();
      navigate({ to: "/" });
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : String(err));
      setDeleting(false);
    }
  };


  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate({ to: "/auth", search: { next: "checkout" } });
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("user_profiles")
        .select("plan_active, comp")
        .eq("id", user.id)
        .maybeSingle();
      if (cancelled) return;
      if (data?.plan_active || data?.comp) {
        navigate({ to: "/projects" });
        return;
      }
      setChecking(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user, loading, navigate]);

  return (
    <div className="min-h-screen bg-canvas text-ink font-sans">
      <PaymentTestModeBanner />
      <AppHeader />
      <main className="max-w-lg mx-auto px-6 py-14">
        <div
          className="p-6 sm:p-8"
          style={{ backgroundColor: NEAR_BLACK, color: CREAM, borderRadius: 4 }}
        >
          <div className="text-[10px] font-semibold tracking-[0.22em]" style={{ color: MUSTARD }}>
            SECURE CHECKOUT
          </div>
          <h1 style={serif} className="mt-3 text-4xl leading-[1.05]">
            Complete your subscription
          </h1>
          <p className="mt-3 text-sm" style={{ color: MUTED_CREAM }}>
            dwellmade Basic — £15 a month for 50 generations. Cancel anytime.
          </p>

          <div className="mt-6 -mx-2 sm:-mx-4">
            {loading || checking ? (
              <div className="px-4 py-6 text-xs" style={{ color: MUTED_CREAM }}>
                Preparing secure checkout…
              </div>
            ) : (
              <StripeEmbeddedCheckout
                priceId="dwellmade_basic_monthly"
                quantity={1}
                returnUrl={`${typeof window !== "undefined" ? window.location.origin : ""}/projects?checkout=success`}
              />
            )}
          </div>

          <div className="mt-5 text-center text-[11px]" style={{ color: MUTED_CREAM }}>
            <Link to="/terms" className="underline underline-offset-4">
              Terms
            </Link>{" "}
            ·{" "}
            <Link to="/privacy" className="underline underline-offset-4">
              Privacy
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
