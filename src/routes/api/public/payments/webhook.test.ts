import { describe, expect, it, vi, beforeEach } from "vitest";

const verifyWebhook = vi.fn();
const retrieve = vi.fn();
const createStripeClient = vi.fn(() => ({ subscriptions: { retrieve } }));

vi.mock("@/lib/stripe.server", () => ({ verifyWebhook, createStripeClient }));

// Minimal Supabase query-builder stub: records every table write.
const inserts: Array<{ table: string; row: unknown }> = [];
const upserts: Array<{ table: string; row: unknown }> = [];

function tableStub(table: string) {
  const builder: Record<string, unknown> = {
    insert: (row: unknown) => {
      inserts.push({ table, row });
      return Promise.resolve({ error: null });
    },
    upsert: (row: unknown) => {
      upserts.push({ table, row });
      return Promise.resolve({ error: null });
    },
    select: () => builder,
    eq: () => builder,
    maybeSingle: () => Promise.resolve({ data: null, error: null }),
  };
  return builder;
}

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({ from: (table: string) => tableStub(table) }),
}));

const { handleWebhook } = await import("./webhook");

const SUB = {
  id: "sub_123",
  metadata: { userId: "user-1" },
  customer: "cus_123",
  status: "active",
  cancel_at_period_end: false,
  items: {
    data: [
      {
        price: { lookup_key: "dwellmade_basic_monthly", product: "prod_123" },
        current_period_start: 1_760_000_000,
        current_period_end: 1_762_678_400,
      },
    ],
  },
};

beforeEach(() => {
  inserts.length = 0;
  upserts.length = 0;
  verifyWebhook.mockReset();
  retrieve.mockReset();
  process.env.SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role";
});

describe("checkout.session.completed", () => {
  it("activates the plan on the user profile", async () => {
    verifyWebhook.mockResolvedValue({
      type: "checkout.session.completed",
      data: { object: { id: "cs_1", mode: "subscription", payment_status: "paid", subscription: "sub_123" } },
    });
    retrieve.mockResolvedValue(SUB);

    await handleWebhook(new Request("https://dwellmade.co.uk/api/public/payments/webhook"), "live");

    const profile = upserts.find((u) => u.table === "user_profiles")?.row as Record<string, unknown>;
    expect(profile).toBeDefined();
    expect(profile.id).toBe("user-1");
    expect(profile.plan).toBe("paid");
    expect(profile.plan_active).toBe(true);
    expect(profile.stripe_subscription_id).toBe("sub_123");
    expect(profile.stripe_customer_id).toBe("cus_123");
  });

  it("ignores an unpaid checkout session", async () => {
    verifyWebhook.mockResolvedValue({
      type: "checkout.session.completed",
      data: { object: { id: "cs_2", mode: "subscription", payment_status: "unpaid", subscription: "sub_123" } },
    });

    await handleWebhook(new Request("https://dwellmade.co.uk/api/public/payments/webhook"), "live");

    expect(retrieve).not.toHaveBeenCalled();
    expect(upserts.some((u) => u.table === "user_profiles")).toBe(false);
  });
});
