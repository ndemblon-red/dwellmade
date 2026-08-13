import { describe, expect, it, vi, beforeEach } from "vitest";

const rpc = vi.fn();
const getUser = vi.fn();

vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: { rpc, auth: { getUser } },
}));

const { checkAndIncrement } = await import("./generation-gate.server");

const ANON_FP = "a".repeat(64);

function anonRequest(withCookie = true) {
  return new Request("https://dwellmade.co.uk/api/generate", {
    method: "POST",
    headers: withCookie
      ? { cookie: `dm_fp=${ANON_FP}`, "user-agent": "vitest" }
      : { "user-agent": "vitest" },
  });
}

function paidRequest() {
  return new Request("https://dwellmade.co.uk/api/generate", {
    method: "POST",
    headers: { authorization: "Bearer test-token" },
  });
}

beforeEach(() => {
  rpc.mockReset();
  getUser.mockReset();
  getUser.mockResolvedValue({ data: { user: null } });
});

describe("anonymous generation gate", () => {
  it("allows a visitor who is under the 3-generation allowance", async () => {
    rpc.mockResolvedValue({ data: { allowed: true, used: 2, limit: 3 }, error: null });

    const result = await checkAndIncrement(anonRequest());

    expect(rpc).toHaveBeenCalledWith("consume_anonymous_generation", {
      _fingerprint: ANON_FP,
      _limit: 3,
    });
    expect(result).toMatchObject({ ok: true, kind: "anonymous", used: 2, limit: 3 });
  });

  it("blocks a visitor who has already used 3 generations", async () => {
    rpc.mockResolvedValue({ data: { allowed: false, used: 3, limit: 3 }, error: null });

    const result = await checkAndIncrement(anonRequest());

    expect(result).toMatchObject({
      ok: false,
      status: 402,
      code: "limit_reached",
      kind: "anonymous",
      used: 3,
      limit: 3,
    });
  });

  it("issues a fingerprint cookie when the visitor has none", async () => {
    rpc.mockResolvedValue({ data: { allowed: true, used: 1, limit: 3 }, error: null });

    const result = await checkAndIncrement(anonRequest(false));

    if (result.ok !== true) throw new Error("expected the generation to be allowed");
    expect(result.setCookie).toMatch(/^dm_fp=[0-9a-f]{64};/);
    expect(result.setCookie).toContain("HttpOnly");
  });
});

describe("paid generation gate", () => {
  beforeEach(() => {
    getUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
  });

  it("allows a subscriber who has used 50 of 50 slots on this request", async () => {
    rpc.mockResolvedValue({
      data: { allowed: true, kind: "paid", used: 50, limit: 50 },
      error: null,
    });

    const result = await checkAndIncrement(paidRequest());

    expect(rpc).toHaveBeenCalledWith("consume_generation", { _user_id: "user-1", _limit: 50 });
    expect(result).toMatchObject({ ok: true, kind: "paid", used: 50, limit: 50 });
  });

  it("blocks a subscriber who is already at the monthly limit", async () => {
    rpc.mockResolvedValue({
      data: { allowed: false, code: "limit_reached", kind: "paid", used: 51, limit: 50 },
      error: null,
    });

    const result = await checkAndIncrement(paidRequest());

    expect(result).toMatchObject({
      ok: false,
      status: 402,
      code: "limit_reached",
      kind: "paid",
      used: 51,
      limit: 50,
    });
  });

  it("blocks a signed-in user whose plan is not active", async () => {
    rpc.mockResolvedValue({
      data: { allowed: false, code: "upgrade_required", kind: "free", used: 0, limit: 50 },
      error: null,
    });

    const result = await checkAndIncrement(paidRequest());

    expect(result).toMatchObject({
      ok: false,
      status: 402,
      code: "upgrade_required",
      kind: "free",
    });
  });
});
