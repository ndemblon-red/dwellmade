// TODO: remove this route before any significant public launch
// Internal debug panel for testing generation limits and subscription flows.
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

const ADMIN_EMAIL = "bordain@gmail.com";
export const FORCE_UPGRADE_KEY = "dm_debug_force_upgrade";

type DebugState = {
  user: { id: string; email: string };
  profile: {
    plan: string;
    plan_active: boolean;
    comp: boolean | null;
    generations_used_this_month: number;
    billing_period_start: string | null;
    stripe_subscription_id: string | null;
  } | null;
  fingerprint: string | null;
  anonymousCount: number | null;
  webhooks: { id: string; event_type: string; received_at: string; payload: unknown }[];
};

export const Route = createFileRoute("/debug")({
  ssr: false,
  component: DebugPage,
});

async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function DebugPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [state, setState] = useState<DebugState | null>(null);
  const [status, setStatus] = useState<{ ok: boolean; message: string } | null>(null);
  const [countValue, setCountValue] = useState("0");
  const [forceUpgrade, setForceUpgrade] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user || (user.email ?? "").toLowerCase() !== ADMIN_EMAIL) {
      navigate({ to: "/", replace: true });
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    setForceUpgrade(localStorage.getItem(FORCE_UPGRADE_KEY) === "1");
  }, []);

  const load = useCallback(async () => {
    const res = await fetch("/api/debug", {
      headers: await authHeaders(),
      credentials: "include",
      cache: "no-store",
    });
    if (!res.ok) return;
    setState((await res.json()) as DebugState);
  }, []);

  useEffect(() => {
    if (user && (user.email ?? "").toLowerCase() === ADMIN_EMAIL) void load();
  }, [user, load]);

  useEffect(() => {
    if (state?.profile) setCountValue(String(state.profile.generations_used_this_month));
  }, [state?.profile]);

  const act = useCallback(
    async (action: string, value?: number) => {
      setStatus(null);
      try {
        const res = await fetch("/api/debug", {
          method: "POST",
          headers: { ...(await authHeaders()), "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ action, value }),
        });
        const json = (await res.json().catch(() => null)) as {
          ok?: boolean;
          message?: string;
        } | null;
        setStatus({
          ok: Boolean(res.ok && json?.ok),
          message: json?.message ?? (res.ok ? "Done." : `Failed (${res.status})`),
        });
        await load();
      } catch (e) {
        setStatus({ ok: false, message: e instanceof Error ? e.message : "Request failed" });
      }
    },
    [load],
  );

  if (loading || !user || (user.email ?? "").toLowerCase() !== ADMIN_EMAIL) return null;

  return (
    <div style={{ fontFamily: "monospace", padding: 0, background: "#fff", minHeight: "100vh" }}>
      <div
        style={{
          background: "#c00",
          color: "#fff",
          padding: "12px 16px",
          fontWeight: 700,
          letterSpacing: "0.05em",
        }}
      >
        DEBUG MODE — NOT FOR PUBLIC USE
      </div>

      <div style={{ padding: 16, maxWidth: 900, color: "#111" }}>
        {status ? (
          <p
            style={{
              padding: "8px 12px",
              marginBottom: 16,
              border: `1px solid ${status.ok ? "#0a0" : "#c00"}`,
              color: status.ok ? "#060" : "#900",
              background: status.ok ? "#f0fff0" : "#fff5f5",
            }}
          >
            {status.message}
          </p>
        ) : null}

        <h2>Session</h2>
        <pre style={{ whiteSpace: "pre-wrap" }}>
          {JSON.stringify({ id: user.id, email: user.email }, null, 2)}
        </pre>

        <h2>user_profiles</h2>
        <pre style={{ whiteSpace: "pre-wrap" }}>
          {JSON.stringify(state?.profile ?? "no row", null, 2)}
        </pre>

        <h2>Anonymous</h2>
        <pre style={{ whiteSpace: "pre-wrap" }}>
          {JSON.stringify(
            { fingerprint: state?.fingerprint, count: state?.anonymousCount },
            null,
            2,
          )}
        </pre>

        <h2>Actions</h2>
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
          <input
            type="number"
            min={0}
            max={50}
            value={countValue}
            onChange={(e) => setCountValue(e.target.value)}
            style={{ padding: 6, width: 100, border: "1px solid #999" }}
          />
          <button
            type="button"
            onClick={() => act("set_count", Number(countValue))}
            style={btn}
          >
            Set generation count
          </button>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
          <button type="button" onClick={() => act("reset_anonymous")} style={btn}>
            Reset anonymous count
          </button>
          <button type="button" onClick={() => act("toggle_plan_active")} style={btn}>
            Toggle plan_active
          </button>
          <button
            type="button"
            style={btn}
            onClick={() => {
              const next = !forceUpgrade;
              if (next) localStorage.setItem(FORCE_UPGRADE_KEY, "1");
              else localStorage.removeItem(FORCE_UPGRADE_KEY);
              setForceUpgrade(next);
              setStatus({
                ok: true,
                message: next
                  ? "Upgrade modal will be forced on the next generation attempt."
                  : "Forced upgrade modal disabled.",
              });
            }}
          >
            {forceUpgrade ? "Disable forced upgrade modal" : "Trigger upgrade modal"}
          </button>
          <button type="button" onClick={() => load()} style={btn}>
            Refresh
          </button>
        </div>

        <h2>Last 5 webhook events</h2>
        {state?.webhooks.length ? (
          <ul style={{ paddingLeft: 16 }}>
            {state.webhooks.map((w) => (
              <li key={w.id} style={{ marginBottom: 12 }}>
                <strong>{w.event_type}</strong> — {new Date(w.received_at).toLocaleString()}
                <pre
                  style={{
                    whiteSpace: "pre-wrap",
                    background: "#f4f4f4",
                    padding: 8,
                    maxHeight: 180,
                    overflow: "auto",
                  }}
                >
                  {JSON.stringify(w.payload, null, 2)}
                </pre>
              </li>
            ))}
          </ul>
        ) : (
          <p>No webhook events logged yet.</p>
        )}
      </div>
    </div>
  );
}

const btn: React.CSSProperties = {
  padding: "8px 12px",
  border: "1px solid #333",
  background: "#eee",
  cursor: "pointer",
};
