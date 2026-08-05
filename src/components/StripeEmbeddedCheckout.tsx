import { useEffect, useState } from "react";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { useServerFn } from "@tanstack/react-start";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import { createCheckoutSession } from "@/utils/payments.functions";

interface StripeEmbeddedCheckoutProps {
  priceId: string;
  quantity?: number;
  returnUrl?: string;
}

export function StripeEmbeddedCheckout({
  priceId,
  quantity,
  returnUrl,
}: StripeEmbeddedCheckoutProps) {
  const fetchCheckout = useServerFn(createCheckoutSession);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const result = await fetchCheckout({
          data: {
            priceId,
            quantity,
            returnUrl: returnUrl || `${window.location.origin}/projects?checkout=success`,
            environment: getStripeEnvironment(),
          },
        });
        if (cancelled) return;
        if ("error" in result) {
          setError(result.error);
          return;
        }
        if (!result.clientSecret) {
          setError("Stripe did not return a client secret.");
          return;
        }
        setClientSecret(result.clientSecret);
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : String(err);
        setError(
          /unauthor|401/i.test(message)
            ? "You need to be signed in to subscribe. Please sign in and try again."
            : message,
        );
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [priceId, quantity, returnUrl]);

  if (error) {
    return (
      <div className="w-full px-4 py-6 text-sm" style={{ color: "#F5F0E8" }}>
        <p className="font-medium">We couldn't start the checkout.</p>
        <p className="mt-2 text-xs" style={{ color: "rgba(245,240,232,0.7)" }}>
          {error}
        </p>
      </div>
    );
  }

  if (!clientSecret) {
    return (
      <div className="w-full px-4 py-6 text-xs" style={{ color: "rgba(245,240,232,0.7)" }}>
        Preparing secure checkout…
      </div>
    );
  }

  return (
    <div id="checkout" className="w-full">
      <EmbeddedCheckoutProvider stripe={getStripe()} options={{ clientSecret }}>
        <EmbeddedCheckout />
      </EmbeddedCheckoutProvider>
    </div>
  );
}
