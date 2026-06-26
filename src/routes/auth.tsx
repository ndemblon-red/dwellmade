import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
const NEAR_BLACK = "#1A1A2E";
const MUSTARD = "#F0A500";
const MUSTARD_DARK = "#C47F00";
const PINK = "#E87FA3";
const PINK_DARK = "#C45F83";
const COBALT = "#2B35AF";
const COBALT_DARK = "#1E2680";

function AuthHeader() {
  return (
    <header style={{ backgroundColor: NEAR_BLACK }}>
      <div className="max-w-7xl mx-auto px-8 py-4 flex items-center">
        <Link to="/">
          <span
            className="leading-none tracking-tight lowercase"
            style={{ fontFamily: "'Instrument Serif', serif", fontSize: "32px" }}
          >
            <span className="italic" style={{ color: MUSTARD }}>dwell</span>
            <span style={{ color: PINK }}>made</span>
          </span>
        </Link>
      </div>
    </header>
  );
}

const stroke = {
  stroke: NEAR_BLACK,
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function PaintCan({ color = MUSTARD, rotate = -8 }: { color?: string; rotate?: number }) {
  return (
    <svg width="110" height="130" viewBox="0 0 110 130" fill="none" style={{ transform: `rotate(${rotate}deg)` }}>
      {/* body */}
      <rect x="14" y="38" width="78" height="72" rx="3" fill={color} {...stroke} />
      {/* lid */}
      <ellipse cx="53" cy="36" rx="39" ry="6" fill={color} {...stroke} />
      {/* handle */}
      <path d="M20 44 Q53 18 86 44" fill="none" {...stroke} />
      {/* label band */}
      <line x1="14" y1="74" x2="92" y2="74" {...stroke} />
      {/* drips */}
      <path d="M30 110 Q30 122 33 126 Q36 122 36 110 Z" fill={color} {...stroke} />
      <path d="M62 110 Q62 118 65 121 Q68 118 68 110 Z" fill={color} {...stroke} />
    </svg>
  );
}

function Plant() {
  return (
    <svg width="180" height="220" viewBox="0 0 180 220" fill="none">
      {/* pot */}
      <path d="M40 140 L140 140 L128 210 L52 210 Z" fill={COBALT} {...stroke} />
      <rect x="36" y="130" width="108" height="14" rx="2" fill={COBALT} {...stroke} />
      {/* stems */}
      <path d="M90 138 Q88 100 70 70" fill="none" {...stroke} />
      <path d="M90 138 Q92 100 110 60" fill="none" {...stroke} />
      <path d="M90 138 Q90 110 90 80" fill="none" {...stroke} />
      {/* leaves */}
      <path d="M70 70 Q40 60 38 30 Q60 28 72 56 Z" fill={COBALT} {...stroke} />
      <path d="M110 60 Q140 50 144 22 Q120 22 110 48 Z" fill={COBALT} {...stroke} />
      <path d="M90 80 Q70 50 82 20 Q104 36 96 70 Z" fill={COBALT} {...stroke} />
      <path d="M90 80 Q112 60 130 70 Q120 92 96 88 Z" fill={COBALT} {...stroke} />
    </svg>
  );
}

function PaintRoller() {
  return (
    <svg width="90" height="200" viewBox="0 0 90 200" fill="none" style={{ transform: "rotate(12deg)" }}>
      {/* roller */}
      <rect x="10" y="10" width="64" height="26" rx="6" fill={MUSTARD} {...stroke} />
      {/* frame */}
      <path d="M44 36 L44 60 L36 60 L36 90" fill="none" {...stroke} />
      {/* handle */}
      <rect x="28" y="86" width="14" height="100" rx="6" fill={MUSTARD} {...stroke} />
      {/* grip cap */}
      <rect x="26" y="180" width="18" height="10" rx="4" fill={MUSTARD_DARK} {...stroke} />
    </svg>
  );
}

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
        <AuthHeader />
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
    <div className="min-h-screen bg-canvas text-ink font-sans relative overflow-hidden">
      <AuthHeader />

      {/* Decorative illustrated objects */}
      <div aria-hidden className="pointer-events-none absolute inset-0 hidden md:block">
        <div className="absolute" style={{ top: "110px", left: "6%" }}>
          <PaintCan />
        </div>
        <div className="absolute" style={{ top: "100px", right: "6%" }}>
          <PantoneFan />
        </div>
        <div className="absolute" style={{ bottom: "-30px", left: "-40px" }}>
          <Sofa />
        </div>
        <div className="absolute" style={{ bottom: "-20px", right: "4%" }}>
          <PaintRoller />
        </div>
        {/* colour chip dots */}
        <span className="absolute rounded-full" style={{ top: "260px", left: "28%", width: "16px", height: "16px", background: MUSTARD }} />
        <span className="absolute rounded-full" style={{ top: "320px", right: "26%", width: "18px", height: "18px", background: PINK }} />
        <span className="absolute rounded-full" style={{ bottom: "180px", left: "30%", width: "14px", height: "14px", background: COBALT }} />
        <span className="absolute rounded-full" style={{ bottom: "240px", right: "30%", width: "16px", height: "16px", background: MUSTARD }} />
      </div>

      <main className="max-w-md mx-auto px-6 py-16 relative z-10">
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
          {mode === "signin" ? "New to dwellmade?" : "Already have an account?"}{" "}
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
