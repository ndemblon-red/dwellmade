// Server-only generation gate. Enforces tier limits for authenticated and anonymous users.
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const ANON_LIMIT = 3;
const PAID_LIMIT = 50;
const COOKIE = "dm_fp";

export type GateOk =
  | { ok: true; setCookie?: string; kind: "anonymous"; used: number; limit: number }
  | { ok: true; setCookie?: string; kind: "paid"; used: number; limit: number };

export type GateBlock = {
  ok: false;
  status: number;
  code: "limit_reached" | "upgrade_required";
  kind: "anonymous" | "paid" | "free";
  used: number;
  limit: number;
  setCookie?: string;
};

export type GateResult = GateOk | GateBlock;

function parseCookie(header: string | null, name: string): string | undefined {
  if (!header) return;
  for (const part of header.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (k === name) return rest.join("=");
  }
}

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function getIp(request: Request): string {
  return (
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-real-ip") ||
    (request.headers.get("x-forwarded-for") || "").split(",")[0].trim() ||
    "0.0.0.0"
  );
}

async function getUserFromBearer(request: Request): Promise<{ id: string } | null> {
  const auth = request.headers.get("authorization") || "";
  const token = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7) : "";
  if (!token) return null;
  try {
    const { data } = await supabaseAdmin.auth.getUser(token);
    return data.user ? { id: data.user.id } : null;
  } catch {
    return null;
  }
}

/**
 * Check and increment generation usage. Returns gate result.
 * Caller must NOT call upstream model if ok=false.
 * If ok=true and setCookie is set, attach it to the eventual response headers.
 */
export async function checkAndIncrement(request: Request): Promise<GateResult> {
  const user = await getUserFromBearer(request);

  if (user) {
    // Lazy-ensure a profile row.
    const { data: profile } = await supabaseAdmin
      .from("user_profiles")
      .select("plan, plan_active, generations_used_this_month, billing_period_start")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile) {
      await supabaseAdmin.from("user_profiles").insert({ id: user.id });
    }

    const plan = profile?.plan ?? "free";
    const planActive = profile?.plan_active ?? false;
    const used = profile?.generations_used_this_month ?? 0;

    if (!planActive || plan !== "paid") {
      return {
        ok: false,
        status: 402,
        code: "upgrade_required",
        kind: "free",
        used,
        limit: PAID_LIMIT,
      };
    }

    if (used >= PAID_LIMIT) {
      return {
        ok: false,
        status: 402,
        code: "limit_reached",
        kind: "paid",
        used,
        limit: PAID_LIMIT,
      };
    }

    await supabaseAdmin
      .from("user_profiles")
      .update({ generations_used_this_month: used + 1 })
      .eq("id", user.id);

    return { ok: true, kind: "paid", used: used + 1, limit: PAID_LIMIT };
  }

  // Anonymous path
  let fp = parseCookie(request.headers.get("cookie"), COOKIE);
  let setCookie: string | undefined;
  if (!fp) {
    const ip = getIp(request);
    const ua = request.headers.get("user-agent") || "";
    fp = await sha256Hex(`${ip}::${ua}::dwellmade-fp`);
    setCookie = `${COOKIE}=${fp}; Path=/; Max-Age=${60 * 60 * 24 * 365}; HttpOnly; SameSite=Lax; Secure`;
  }

  const { data: row } = await supabaseAdmin
    .from("anonymous_generations")
    .select("count")
    .eq("fingerprint", fp)
    .maybeSingle();

  const count = row?.count ?? 0;
  if (count >= ANON_LIMIT) {
    return {
      ok: false,
      status: 402,
      code: "limit_reached",
      kind: "anonymous",
      used: count,
      limit: ANON_LIMIT,
      setCookie,
    };
  }

  if (!row) {
    await supabaseAdmin
      .from("anonymous_generations")
      .insert({ fingerprint: fp, count: 1, last_used_at: new Date().toISOString() });
  } else {
    await supabaseAdmin
      .from("anonymous_generations")
      .update({ count: count + 1, last_used_at: new Date().toISOString() })
      .eq("fingerprint", fp);
  }

  return { ok: true, kind: "anonymous", used: count + 1, limit: ANON_LIMIT, setCookie };
}

/**
 * Read-only usage lookup (no increment). Used by the /api/usage endpoint.
 */
export async function readUsage(
  request: Request,
): Promise<{ kind: "anonymous" | "paid" | "free"; used: number; limit: number; setCookie?: string }> {
  const user = await getUserFromBearer(request);
  if (user) {
    const { data: profile } = await supabaseAdmin
      .from("user_profiles")
      .select("plan, plan_active, generations_used_this_month")
      .eq("id", user.id)
      .maybeSingle();
    const plan = profile?.plan ?? "free";
    const planActive = profile?.plan_active ?? false;
    const used = profile?.generations_used_this_month ?? 0;
    if (planActive && plan === "paid") {
      return { kind: "paid", used, limit: PAID_LIMIT };
    }
    return { kind: "free", used, limit: PAID_LIMIT };
  }

  let fp = parseCookie(request.headers.get("cookie"), COOKIE);
  let setCookie: string | undefined;
  if (!fp) {
    const ip = getIp(request);
    const ua = request.headers.get("user-agent") || "";
    fp = await sha256Hex(`${ip}::${ua}::dwellmade-fp`);
    setCookie = `${COOKIE}=${fp}; Path=/; Max-Age=${60 * 60 * 24 * 365}; HttpOnly; SameSite=Lax; Secure`;
  }
  const { data: row } = await supabaseAdmin
    .from("anonymous_generations")
    .select("count")
    .eq("fingerprint", fp)
    .maybeSingle();
  return { kind: "anonymous", used: row?.count ?? 0, limit: ANON_LIMIT, setCookie };
}
