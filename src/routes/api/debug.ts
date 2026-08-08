// TODO: remove this route before any significant public launch
// Internal debug API for testing generation limits and subscription flows.
// All writes use the service role key and are gated on a hardcoded admin email.
import { createFileRoute } from "@tanstack/react-router";

export const DEBUG_ADMIN_EMAIL = "ndemblon@gmail.com";
const COOKIE = "dm_fp";

async function admin() {
  const m = await import("@/integrations/supabase/client.server");
  return m.supabaseAdmin;
}

function parseCookie(header: string | null, name: string): string | undefined {
  if (!header) return;
  for (const part of header.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (k === name) return rest.join("=");
  }
}

async function requireAdmin(request: Request): Promise<{ id: string; email: string } | null> {
  const supabaseAdmin = await admin();
  const auth = request.headers.get("authorization") || "";
  const token = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7) : "";
  if (!token) return null;
  const { data } = await supabaseAdmin.auth.getUser(token);
  const user = data?.user;
  if (!user?.email) return null;
  if (user.email.toLowerCase() !== DEBUG_ADMIN_EMAIL.toLowerCase()) return null;
  return { id: user.id, email: user.email };
}

async function readState(request: Request, user: { id: string; email: string }) {
  const supabaseAdmin = await admin();
  const fingerprint = parseCookie(request.headers.get("cookie"), COOKIE) ?? null;

  const { data: profile } = await supabaseAdmin
    .from("user_profiles")
    .select(
      "plan, plan_active, comp, generations_used_this_month, billing_period_start, stripe_subscription_id",
    )
    .eq("id", user.id)
    .maybeSingle();

  let anonymousCount: number | null = null;
  if (fingerprint) {
    const { data: row } = await supabaseAdmin
      .from("anonymous_generations")
      .select("count")
      .eq("fingerprint", fingerprint)
      .maybeSingle();
    anonymousCount = row?.count ?? 0;
  }

  const { data: webhooks } = await supabaseAdmin
    .from("webhook_log")
    .select("id, event_type, received_at, payload")
    .order("received_at", { ascending: false })
    .limit(5);

  return {
    user,
    profile: profile ?? null,
    fingerprint,
    anonymousCount,
    webhooks: webhooks ?? [],
  };
}

export const Route = createFileRoute("/api/debug")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const user = await requireAdmin(request);
        if (!user) return new Response("Forbidden", { status: 403 });
        return Response.json(await readState(request, user), {
          headers: { "Cache-Control": "no-store" },
        });
      },
      POST: async ({ request }) => {
        const user = await requireAdmin(request);
        if (!user) return new Response("Forbidden", { status: 403 });

        const supabaseAdmin = await admin();
        const body = (await request.json()) as { action?: string; value?: number };
        const fingerprint = parseCookie(request.headers.get("cookie"), COOKIE);

        try {
          switch (body.action) {
            case "set_count": {
              const value = Math.max(0, Math.min(50, Math.floor(Number(body.value ?? 0))));
              const { error } = await supabaseAdmin.from("user_profiles").upsert({
                id: user.id,
                generations_used_this_month: value,
                updated_at: new Date().toISOString(),
              });
              if (error) throw new Error(error.message);
              return Response.json({ ok: true, message: `Generation count set to ${value}.` });
            }
            case "reset_anonymous": {
              if (!fingerprint) throw new Error("No fingerprint cookie on this browser yet.");
              const { error } = await supabaseAdmin
                .from("anonymous_generations")
                .update({ count: 0 })
                .eq("fingerprint", fingerprint);
              if (error) throw new Error(error.message);
              return Response.json({ ok: true, message: "Anonymous count reset to 0." });
            }
            case "toggle_plan_active": {
              const { data: current } = await supabaseAdmin
                .from("user_profiles")
                .select("plan_active")
                .eq("id", user.id)
                .maybeSingle();
              const next = !(current?.plan_active ?? false);
              const { error } = await supabaseAdmin.from("user_profiles").upsert({
                id: user.id,
                plan_active: next,
                plan: next ? "paid" : "free",
                updated_at: new Date().toISOString(),
              });
              if (error) throw new Error(error.message);
              return Response.json({ ok: true, message: `plan_active is now ${next}.` });
            }
            default:
              return new Response("Unknown action", { status: 400 });
          }
        } catch (e) {
          return Response.json(
            { ok: false, message: e instanceof Error ? e.message : "Action failed" },
            { status: 500 },
          );
        }
      },
    },
  },
});
