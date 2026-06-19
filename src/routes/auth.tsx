import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { AppHeader } from "@/components/AppHeader";

const searchSchema = z.object({
  redirect: z.string().optional(),
});

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { redirect } = useSearch({ from: "/auth" });
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [resendBusy, setResendBusy] = useState(false);
  const [resendMsg, setResendMsg] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: redirect ?? "/projects" });
    });
  }, [navigate, redirect]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (mode === "signup") {
        const { data, error: err } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/confirm?email=${encodeURIComponent(email)}`,
          },
        });
        if (err) throw err;
        if (!data.session) {
          setPendingEmail(email);
          setBusy(false);
          return;
        }
      } else {
        const { error: err } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (err) throw err;
      }
      navigate({ to: redirect ?? "/projects" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Auth failed");
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    setBusy(true);
    setError(null);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin + (redirect ?? "/projects"),
    });
    if (result.error) {
      setError(
        result.error instanceof Error ? result.error.message : "Google sign-in failed",
      );
      setBusy(false);
      return;
    }
    if (result.redirected) return;
    navigate({ to: redirect ?? "/projects" });
  };

  const resend = async () => {
    if (!pendingEmail) return;
    setResendBusy(true);
    setResendMsg(null);
    const { error: err } = await supabase.auth.resend({
      type: "signup",
      email: pendingEmail,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/confirm?email=${encodeURIComponent(pendingEmail)}`,
      },
    });
    setResendBusy(false);
    setResendMsg(err ? err.message : "Sent. Check your inbox.");
  };

  if (pendingEmail) {
    return (
      <div className="min-h-screen bg-canvas text-ink font-sans">
        <AppHeader />
        <main className="max-w-md mx-auto px-6 py-16">
          <h1 className="font-serif text-4xl mb-2">
            Check your <span className="italic">inbox</span>
          </h1>
          <p className="text-sm text-muted-ink mb-2">
            We've sent a confirmation link to
          </p>
          <p className="text-sm text-ink mb-8 font-medium">{pendingEmail}</p>

          <div className="space-y-3">
            <button
              onClick={resend}
              disabled={resendBusy}
              className="w-full bg-paper ring-1 ring-black/10 rounded-md py-3 text-sm font-medium hover:ring-ink/40 disabled:opacity-50"
            >
              {resendBusy ? "Sending…" : "Resend email"}
            </button>
            {resendMsg ? (
              <p className="text-xs text-muted-ink">{resendMsg}</p>
            ) : null}
            <button
              onClick={() => {
                setPendingEmail(null);
                setResendMsg(null);
                setMode("signin");
              }}
              className="block w-full text-center text-xs underline underline-offset-4 text-muted-ink hover:text-ink"
            >
              Back
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas text-ink font-sans">
      <AppHeader />
      <main className="max-w-md mx-auto px-6 py-16">
        <h1 className="font-serif text-4xl mb-2">
          {mode === "signin" ? "Sign in" : (
            <>
              Create an <span className="italic">account</span>
            </>
          )}
        </h1>
        <p className="text-sm text-muted-ink mb-8">
          {mode === "signin"
            ? "Welcome back. Pick up where you left off."
            : "Save your projects, rooms, and generations."}
        </p>

        <button
          onClick={google}
          disabled={busy}
          className="w-full bg-paper ring-1 ring-black/10 rounded-md py-3 text-sm font-medium hover:ring-ink/40 disabled:opacity-50"
        >
          Continue with Google
        </button>

        <div className="flex items-center gap-3 my-6 text-[10px] uppercase tracking-widest text-muted-ink">
          <div className="h-px bg-zinc-950/10 flex-1" />
          or
          <div className="h-px bg-zinc-950/10 flex-1" />
        </div>

        <form onSubmit={submit} className="space-y-3">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="w-full bg-paper ring-1 ring-black/10 rounded-md px-3 py-2.5 text-sm focus:outline-none focus:ring-ink/40"
          />
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full bg-paper ring-1 ring-black/10 rounded-md px-3 py-2.5 text-sm focus:outline-none focus:ring-ink/40"
          />
          {error ? <p className="text-xs text-destructive">{error}</p> : null}
          <button
            type="submit"
            disabled={busy}
            className="w-full bg-ink text-paper py-3 rounded-md text-sm font-medium hover:bg-accent disabled:opacity-50"
          >
            {busy ? "…" : mode === "signin" ? "Sign in" : "Create account"}
          </button>
        </form>

        <p className="text-xs text-muted-ink mt-6 text-center">
          {mode === "signin" ? "New to Studio Syn?" : "Already have an account?"}{" "}
          <button
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            className="underline underline-offset-4 text-ink"
          >
            {mode === "signin" ? "Create an account" : "Sign in"}
          </button>
        </p>
      </main>
    </div>
  );
}
