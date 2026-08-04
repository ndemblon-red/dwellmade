import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";

const searchSchema = z.object({
  token_hash: z.string().optional(),
  type: z.string().optional(),
  email: z.string().optional(),
});

export const Route = createFileRoute("/auth_/confirm")({
  validateSearch: searchSchema,
  component: ConfirmPage,
});

type Status = "verifying" | "success" | "error";

function ConfirmPage() {
  const navigate = useNavigate();
  const { token_hash, type, email } = useSearch({ from: "/auth_/confirm" });
  const [status, setStatus] = useState<Status>("verifying");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [resendBusy, setResendBusy] = useState(false);
  const [resendMsg, setResendMsg] = useState<string | null>(null);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    (async () => {
      // Case 1: PKCE / OTP flow — token_hash + type in query string.
      if (token_hash && type) {
        const { error } = await supabase.auth.verifyOtp({
          token_hash,
          type: type as "signup" | "email" | "recovery" | "invite" | "email_change",
        });
        if (error) {
          setStatus("error");
          setErrorMsg(error.message);
          return;
        }
        setStatus("success");
        setTimeout(() => navigate({ to: "/projects" }), 600);
        return;
      }

      // Case 2: Implicit flow — Supabase /verify redirected here with tokens
      // in the URL hash (#access_token=...). supabase-js auto-consumes the
      // hash on load and sets the session. Poll briefly for it.
      for (let i = 0; i < 20; i++) {
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          setStatus("success");
          setTimeout(() => navigate({ to: "/projects" }), 600);
          return;
        }
        await new Promise((r) => setTimeout(r, 150));
      }

      setStatus("error");
      setErrorMsg("Missing or expired verification token.");
    })();
  }, [token_hash, type, navigate]);

  const resend = async () => {
    if (!email) {
      setResendMsg("No email on file — please sign up again.");
      return;
    }
    setResendBusy(true);
    setResendMsg(null);
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/confirm` },
    });
    setResendBusy(false);
    setResendMsg(error ? error.message : "Sent. Check your inbox.");
  };

  return (
    <div className="min-h-screen bg-canvas text-ink font-sans">
      <AppHeader />
      <main className="max-w-md mx-auto px-6 py-16">
        {status === "verifying" && (
          <>
            <h1 className="font-serif text-4xl mb-2">
              Verifying your <span className="italic">email</span>
            </h1>
            <p className="text-sm text-muted-ink">One moment…</p>
          </>
        )}

        {status === "success" && (
          <>
            <h1 className="font-serif text-4xl mb-2">
              Email <span className="italic">confirmed</span>
            </h1>
            <p className="text-sm text-muted-ink">Taking you to your projects…</p>
          </>
        )}

        {status === "error" && (
          <>
            <h1 className="font-serif text-4xl mb-2">
              Link <span className="italic">expired</span>
            </h1>
            <p className="text-sm text-muted-ink mb-6">
              {errorMsg ?? "This verification link is invalid or has expired."}
            </p>
            <div className="space-y-3">
              <button
                onClick={resend}
                disabled={resendBusy || !email}
                className="w-full bg-ink text-paper py-3 rounded-md text-sm font-medium hover:bg-accent disabled:opacity-50"
              >
                {resendBusy ? "Sending…" : "Resend verification email"}
              </button>
              {resendMsg ? <p className="text-xs text-muted-ink">{resendMsg}</p> : null}
              <Link
                to="/auth"
                className="block text-center text-xs underline underline-offset-4 text-muted-ink hover:text-ink"
              >
                Back to sign in
              </Link>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
