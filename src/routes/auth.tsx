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

function PaintCan() {
  return (
    <svg width="130" height="150" viewBox="0 0 130 150" fill="none" style={{ transform: "rotate(-6deg)" }}>
      {/* lid disc (top ellipse) */}
      <ellipse cx="65" cy="22" rx="44" ry="8" fill={MUSTARD_DARK} {...stroke} />
      {/* can body */}
      <path d="M21 22 L21 118 Q21 126 30 128 L100 128 Q109 126 109 118 L109 22 Z" fill={MUSTARD} {...stroke} />
      {/* top rim line */}
      <ellipse cx="65" cy="22" rx="44" ry="8" fill="none" {...stroke} />
      {/* label rectangle */}
      <rect x="28" y="50" width="74" height="46" rx="2" fill="#F5F0E8" {...stroke} />
      {/* label inner lines */}
      <line x1="36" y1="62" x2="94" y2="62" {...stroke} />
      <rect x="36" y="70" width="58" height="18" rx="1" fill={MUSTARD} {...stroke} />
      {/* handle (wire bail) */}
      <path d="M22 26 Q65 -4 108 26" fill="none" {...stroke} />
      <circle cx="22" cy="26" r="3" fill={NEAR_BLACK} />
      <circle cx="108" cy="26" r="3" fill={NEAR_BLACK} />
      {/* drip down side */}
      <path d="M101 30 Q103 60 100 80 Q97 60 99 30 Z" fill={MUSTARD} {...stroke} />
    </svg>
  );
}

function PantoneFan() {
  const tones = ["#F4A8C2", "#EC91B3", "#E87FA3", "#C45F83"];
  return (
    <svg width="180" height="140" viewBox="0 0 180 140" fill="none">
      {tones.map((c, i) => (
        <g key={i} transform={`rotate(${(i - 1.5) * 14} 90 128)`}>
          <rect x="78" y="14" width="24" height="100" rx="2" fill={c} {...stroke} />
          <line x1="78" y1="34" x2="102" y2="34" {...stroke} />
        </g>
      ))}
      <circle cx="90" cy="128" r="7" fill={PINK_DARK} {...stroke} />
      <circle cx="90" cy="128" r="2" fill={NEAR_BLACK} />
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
          <PaintCan color={PINK} rotate={10} />
        </div>
        <div className="absolute" style={{ bottom: "-10px", left: "-20px" }}>
          <Plant />
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
