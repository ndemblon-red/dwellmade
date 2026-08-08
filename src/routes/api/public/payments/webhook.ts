import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { type StripeEnv, verifyWebhook } from "@/lib/stripe.server";

let _supabase: ReturnType<typeof createClient<Database>> | null = null;
function getSupabase() {
  if (!_supabase) {
    _supabase = createClient<Database>(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
  }
  return _supabase;
}

type StripePrice = {
  lookup_key?: string | null;
  metadata?: Record<string, string> | null;
  id?: string;
  product?: string | { id?: string };
};

type StripeSubscriptionItem = {
  price?: StripePrice;
  current_period_start?: number;
  current_period_end?: number;
};

type StripeSubscription = {
  id: string;
  metadata?: { userId?: string } | null;
  customer: string | { id?: string };
  status: string;
  items?: { data?: StripeSubscriptionItem[] };
  current_period_start?: number;
  current_period_end?: number;
  cancel_at_period_end?: boolean;
};

type StripeCheckoutSession = {
  id: string;
  payment_status?: string;
  mode?: string;
  subscription?: string | { id?: string };
};

function getPriceId(price: StripePrice | undefined): string {
  return price?.lookup_key || price?.metadata?.lovable_external_id || price?.id || "";
}

function getCustomerId(customer: string | { id?: string }): string {
  return typeof customer === "string" ? customer : customer.id || "";
}

async function upsertUserProfileFromSubscription(subscription: StripeSubscription, env: StripeEnv) {
  const userId = subscription.metadata?.userId;
  if (!userId) {
    console.error("No userId in subscription metadata", subscription.id);
    return;
  }

  const item = subscription.items?.data?.[0];
  const priceId = getPriceId(item?.price);
  const productId =
    typeof item?.price?.product === "string" ? item.price.product : item?.price?.product?.id || "";
  const periodStart = item?.current_period_start ?? subscription.current_period_start;
  const periodEnd = item?.current_period_end ?? subscription.current_period_end;

  const { error: subscriptionError } = await getSupabase()
    .from("subscriptions")
    .upsert(
      {
        user_id: userId,
        stripe_subscription_id: subscription.id,
        stripe_customer_id: getCustomerId(subscription.customer),
        product_id: productId,
        price_id: priceId,
        status: subscription.status,
        current_period_start: periodStart ? new Date(periodStart * 1000).toISOString() : null,
        current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
        cancel_at_period_end: subscription.cancel_at_period_end || false,
        environment: env,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "stripe_subscription_id" },
    );
  if (subscriptionError) {
    throw new Error(`Failed to save subscription ${subscription.id}: ${subscriptionError.message}`);
  }

  if (subscription.status === "active" || subscription.status === "trialing") {
    const periodStartIso = periodStart ? new Date(periodStart * 1000).toISOString() : null;

    // Reset the monthly allowance when the billing period rolls over (renewal).
    const { data: existing } = await getSupabase()
      .from("user_profiles")
      .select("billing_period_start")
      .eq("id", userId)
      .maybeSingle();
    const periodChanged = !!periodStartIso && existing?.billing_period_start !== periodStartIso;

    const { error: profileError } = await getSupabase()
      .from("user_profiles")
      .upsert({
        id: userId,
        plan: "paid",
        plan_active: true,
        stripe_customer_id: getCustomerId(subscription.customer),
        stripe_subscription_id: subscription.id,
        current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
        cancel_at_period_end: subscription.cancel_at_period_end || false,
        ...(periodStartIso ? { billing_period_start: periodStartIso } : {}),
        ...(periodChanged ? { generations_used_this_month: 0 } : {}),
        updated_at: new Date().toISOString(),
      });
    if (profileError) {
      throw new Error(`Failed to activate profile ${userId}: ${profileError.message}`);
    }
  } else if (
    subscription.status === "canceled" ||
    subscription.status === "unpaid" ||
    subscription.status === "incomplete_expired"
  ) {
    const { error: profileError } = await getSupabase()
      .from("user_profiles")
      .upsert({
        id: userId,
        plan_active: false,
        cancel_at_period_end: subscription.cancel_at_period_end || false,
        updated_at: new Date().toISOString(),
      });
    if (profileError) {
      throw new Error(`Failed to deactivate profile ${userId}: ${profileError.message}`);
    }
  }
}

async function handleSubscriptionDeleted(subscription: StripeSubscription, env: StripeEnv) {
  const { error: subscriptionError } = await getSupabase()
    .from("subscriptions")
    .update({
      status: "canceled",
      cancel_at_period_end: false,
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_subscription_id", subscription.id)
    .eq("environment", env);
  if (subscriptionError) {
    throw new Error(
      `Failed to cancel subscription ${subscription.id}: ${subscriptionError.message}`,
    );
  }

  const userId = subscription.metadata?.userId;
  if (userId) {
    const { error: profileError } = await getSupabase().from("user_profiles").upsert({
      id: userId,
      plan_active: false,
      cancel_at_period_end: false,
      updated_at: new Date().toISOString(),
    });
    if (profileError) {
      throw new Error(`Failed to deactivate profile ${userId}: ${profileError.message}`);
    }
  }
}

async function handleWebhook(req: Request, env: StripeEnv) {
  const event = await verifyWebhook(req, env);

  // TODO: remove this route's debug logging before any significant public launch
  try {
    await getSupabase()
      .from("webhook_log")
      .insert({ event_type: event.type, payload: JSON.parse(JSON.stringify(event)) });
  } catch (e) {
    console.error("webhook_log insert failed", e);
  }

  switch (event.type) {
    case "customer.subscription.created":
      await upsertUserProfileFromSubscription(event.data.object as StripeSubscription, env);
      break;
    case "customer.subscription.updated":
      await upsertUserProfileFromSubscription(event.data.object as StripeSubscription, env);
      break;
    case "customer.subscription.deleted":
      await handleSubscriptionDeleted(event.data.object as StripeSubscription, env);
      break;
    case "checkout.session.completed": {
      const session = event.data.object as StripeCheckoutSession;
      if (session.payment_status !== "unpaid" && session.mode === "subscription") {
        const subscriptionId =
          typeof session.subscription === "string"
            ? session.subscription
            : session.subscription?.id;
        if (subscriptionId) {
          const stripe = (await import("@/lib/stripe.server")).createStripeClient(env);
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          await upsertUserProfileFromSubscription(subscription as StripeSubscription, env);
        }
      }
      break;
    }
    case "checkout.session.async_payment_succeeded": {
      const session = event.data.object as StripeCheckoutSession;
      if (session.mode === "subscription") {
        const subscriptionId =
          typeof session.subscription === "string"
            ? session.subscription
            : session.subscription?.id;
        if (subscriptionId) {
          const stripe = (await import("@/lib/stripe.server")).createStripeClient(env);
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          await upsertUserProfileFromSubscription(subscription as StripeSubscription, env);
        }
      }
      break;
    }
    default:
      console.log("Unhandled event:", event.type);
  }
}

export const Route = createFileRoute("/api/public/payments/webhook")({
  server: {
    handlers: {
      GET: async () => new Response("Method not allowed", { status: 405 }),
      POST: async ({ request }) => {
        const rawEnv = new URL(request.url).searchParams.get("env");
        if (rawEnv !== "sandbox" && rawEnv !== "live") {
          console.error("Webhook received with invalid or missing env query parameter:", rawEnv);
          return Response.json({ received: true, ignored: "invalid env" });
        }
        const env: StripeEnv = rawEnv;
        try {
          await handleWebhook(request, env);
          return Response.json({ received: true });
        } catch (e) {
          console.error("Webhook error:", e);
          return new Response("Webhook error", { status: 400 });
        }
      },
    },
  },
});

