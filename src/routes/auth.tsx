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

function PaintCan() {
  return (
    <svg width="110" height="130" viewBox="0 0 110 130" fill="none" style={{ transform: "rotate(-8deg)" }}>
      {/* shadow body */}
      <rect x="18" y="42" width="78" height="72" rx="3" fill={MUSTARD_DARK} />
      {/* body */}
      <rect x="14" y="38" width="78" height="72" rx="3" fill={MUSTARD} />
      {/* lid rim */}
      <ellipse cx="53" cy="38" rx="39" ry="6" fill={MUSTARD_DARK} />
      <ellipse cx="53" cy="36" rx="39" ry="6" fill={MUSTARD} />
      {/* handle */}
      <path d="M20 44 Q53 18 86 44" stroke={MUSTARD_DARK} strokeWidth="3" fill="none" />
      {/* drips */}
      <path d="M30 110 Q30 122 33 126 Q36 122 36 110 Z" fill={MUSTARD} />
      <path d="M62 110 Q62 118 65 121 Q68 118 68 110 Z" fill={MUSTARD} />
    </svg>
  );
}

function PantoneFan() {
  const tones = ["#F4A8C2", "#E87FA3", "#D86A91", "#C45F83"];
  return (
    <svg width="160" height="120" viewBox="0 0 160 120" fill="none">
      {tones.map((c, i) => (
        <g key={i} transform={`rotate(${(i - 1.5) * 12} 80 110)`}>
          <rect x="70" y="14" width="22" height="88" rx="2" fill={PINK_DARK} />
          <rect x="68" y="12" width="22" height="84" rx="2" fill={c} />
        </g>
      ))}
      <circle cx="80" cy="110" r="5" fill={PINK_DARK} />
    </svg>
  );
}

function Sofa() {
  return (
    <svg width="240" height="140" viewBox="0 0 240 140" fill="none">
      {/* shadow */}
      <rect x="14" y="58" width="216" height="60" rx="14" fill={COBALT_DARK} />
      {/* base */}
      <rect x="10" y="54" width="216" height="56" rx="14" fill={COBALT} />
      {/* cushions */}
      <rect x="22" y="34" width="92" height="44" rx="8" fill={COBALT} />
      <rect x="122" y="34" width="92" height="44" rx="8" fill={COBALT} />
      <rect x="22" y="36" width="92" height="6" rx="3" fill={COBALT_DARK} />
      <rect x="122" y="36" width="92" height="6" rx="3" fill={COBALT_DARK} />
      {/* arms */}
      <rect x="0" y="40" width="22" height="70" rx="8" fill={COBALT_DARK} />
      <rect x="218" y="40" width="22" height="70" rx="8" fill={COBALT_DARK} />
      {/* legs */}
      <rect x="28" y="110" width="8" height="16" fill={COBALT_DARK} />
      <rect x="204" y="110" width="8" height="16" fill={COBALT_DARK} />
    </svg>
  );
}

function PaintRoller() {
  return (
    <svg width="90" height="200" viewBox="0 0 90 200" fill="none" style={{ transform: "rotate(12deg)" }}>
      {/* roller shadow */}
      <rect x="14" y="14" width="64" height="26" rx="6" fill={MUSTARD_DARK} />
      {/* roller */}
      <rect x="10" y="10" width="64" height="26" rx="6" fill={MUSTARD} />
      {/* frame */}
      <path d="M44 36 L44 60 L36 60 L36 90" stroke={MUSTARD_DARK} strokeWidth="4" fill="none" />
      {/* handle */}
      <rect x="30" y="88" width="14" height="100" rx="6" fill={MUSTARD_DARK} />
      <rect x="28" y="86" width="14" height="100" rx="6" fill={MUSTARD} />
      {/* grip cap */}
      <rect x="26" y="180" width="18" height="10" rx="4" fill={MUSTARD_DARK} />
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
