import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { AppHeader } from "@/components/AppHeader";
import { supabase } from "@/integrations/supabase/client";

const NEAR_BLACK = "#1A1A2E";
const CREAM = "#F5F0E8";
const MUSTARD = "#F0A500";
const PINK = "#E87FA3";
const MUTED_CREAM = "rgba(245,240,232,0.7)";
const serif = { fontFamily: "'Instrument Serif', serif" };

const searchSchema = z.object({
  token_hash: z.string().optional(),
  type: z.string().optional(),
});

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Set a new password — dwellmade" },
      {
        name: "description",
        content: "Choose a new password for your dwellmade account.",
      },
      { property: "og:title", content: "Set a new password — dwellmade" },
      {
        property: "og:description",
        content: "Choose a new password for your dwellmade account.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResetPasswordPage,
});

type Status = "checking" | "ready" | "invalid" | "done";

function ResetPasswordPage() {
  const navigate = useNavigate();
  const { token_hash, type } = useSearch({ from: "/reset-password" });
  const [status, setStatus] = useState<Status>("checking");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    (async () => {
      if (token_hash) {
        const { error: verifyError } = await supabase.auth.verifyOtp({
          token_hash,
          type: (type as "recovery") ?? "recovery",
        });
        if (verifyError) {
          setError(verifyError.message);
          setStatus("invalid");
          return;
        }
        setStatus("ready");
        return;
      }
      // Implicit flow: tokens arrive in the URL hash and supabase-js consumes them.
      for (let i = 0; i < 20; i++) {
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          setStatus("ready");
          return;
        }
        await new Promise((r) => setTimeout(r, 150));
      }
      setError("This reset link is invalid or has expired.");
      setStatus("invalid");
    })();
  }, [token_hash, type]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Use at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setBusy(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setStatus("done");
    setTimeout(() => navigate({ to: "/projects" }), 900);
  };

  const inputStyle = {
    backgroundColor: "rgba(245,240,232,0.08)",
    color: CREAM,
    border: "1px solid rgba(245,240,232,0.2)",
    borderRadius: 4,
  };

  return (
    <div className="min-h-screen bg-canvas text-ink font-sans">
      <AppHeader />
      <main className="max-w-md mx-auto px-4 sm:px-6 py-14">
        <div
          className="p-6 sm:p-8"
          style={{ backgroundColor: NEAR_BLACK, color: CREAM, borderRadius: 4 }}
        >
          <div className="text-[10px] font-semibold tracking-[0.22em]" style={{ color: MUSTARD }}>
            PASSWORD RESET
          </div>
          <h1 style={serif} className="mt-3 text-4xl leading-[1.05]">
            Set a new <span className="italic">password</span>
          </h1>

          {status === "checking" && (
            <p className="mt-4 text-sm" style={{ color: MUTED_CREAM }}>
              Checking your reset link…
            </p>
          )}

          {status === "invalid" && (
            <p className="mt-4 text-sm" style={{ color: PINK }}>
              {error ?? "This reset link is invalid or has expired."}
            </p>
          )}

          {status === "done" && (
            <p className="mt-4 text-sm" style={{ color: MUTED_CREAM }}>
              Password updated. Taking you to your projects…
            </p>
          )}

          {status === "ready" && (
            <form onSubmit={submit} className="mt-5 space-y-3">
              <input
                type="password"
                autoComplete="new-password"
                placeholder="New password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full min-h-11 px-3 py-2.5 text-sm outline-none"
                style={inputStyle}
              />
              <input
                type="password"
                autoComplete="new-password"
                placeholder="Confirm new password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="w-full min-h-11 px-3 py-2.5 text-sm outline-none"
                style={inputStyle}
              />
              {error && (
                <p className="text-sm" style={{ color: PINK }}>
                  {error}
                </p>
              )}
              <button
                type="submit"
                disabled={busy}
                className="w-full min-h-11 px-4 py-2.5 text-sm font-medium disabled:opacity-50"
                style={{ backgroundColor: MUSTARD, color: NEAR_BLACK, borderRadius: 4 }}
              >
                {busy ? "Saving…" : "Update password"}
              </button>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
