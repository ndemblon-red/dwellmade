import { Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { UserMenu } from "@/components/AppHeader";
import { useRouter } from "@tanstack/react-router";

export const CREAM = "#F5F0E8";
export const MUSTARD = "#F0A500";
export const PINK = "#E87FA3";
export const NEAR_BLACK = "#1A1A2E";
export const MUTED_CREAM = "rgba(245,240,232,0.7)";

export const dmSans = { fontFamily: "'DM Sans', ui-sans-serif, system-ui, sans-serif" };
export const serif = { fontFamily: "'Instrument Serif', serif" };

export function Wordmark({ size = "text-2xl" }: { size?: string }) {
  return (
    <span style={serif} className={`${size} leading-none tracking-tight lowercase`}>
      <span className="italic" style={{ color: MUSTARD }}>
        dwell
      </span>
      <span style={{ color: PINK }}>made</span>
    </span>
  );
}

export function SiteNav() {
  const { user, loading } = useAuth();
  const queryClient = useQueryClient();
  const router = useRouter();

  const signOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    await router.navigate({ to: "/auth", replace: true });
  };

  return (
    <nav style={{ backgroundColor: NEAR_BLACK }}>
      <div className="max-w-7xl mx-auto px-6 sm:px-8 py-4 flex items-center justify-between">
        <Link to="/">
          <Wordmark size="text-[32px]" />
        </Link>
        {loading ? null : user ? (
          <UserMenu email={user.email ?? ""} onSignOut={signOut} />
        ) : (
          <Link
            to="/auth"
            className="transition-colors"
            style={{
              fontSize: "12px",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: MUTED_CREAM,
              ...dmSans,
            }}
          >
            Sign in
          </Link>
        )}
      </div>
    </nav>
  );
}

export function SiteFooter() {
  const linkStyle = {
    fontSize: "11px",
    letterSpacing: "0.18em",
    textTransform: "uppercase" as const,
    color: MUTED_CREAM,
    ...dmSans,
  };
  return (
    <footer style={{ backgroundColor: NEAR_BLACK }}>
      <div className="max-w-7xl mx-auto px-6 py-10 flex flex-wrap items-center justify-between gap-6">
        <Wordmark size="text-xl" />
        <nav className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <Link to="/pricing" style={linkStyle}>
            Pricing
          </Link>
          <Link to="/privacy" style={linkStyle}>
            Privacy
          </Link>
          <Link to="/terms" style={linkStyle}>
            Terms
          </Link>
          <a href="mailto:hello@dwellmade.co.uk" style={linkStyle}>
            hello@dwellmade.co.uk
          </a>
        </nav>
      </div>
      <div
        className="max-w-7xl mx-auto px-6 pb-6 text-[10px] uppercase tracking-[0.24em]"
        style={{ color: "rgba(245,240,232,0.4)", ...dmSans }}
      >
        © 2026 dwellmade · United Kingdom
      </div>
    </footer>
  );
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-10">
      <h2 style={serif} className="text-2xl sm:text-3xl leading-tight">
        {title}
      </h2>
      <div className="mt-3 space-y-3 text-[15px] leading-relaxed" style={{ opacity: 0.85 }}>
        {children}
      </div>
    </section>
  );
}

export function LegalPage({
  eyebrow,
  title,
  intro,
  updated,
  children,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  updated: string;
  children: ReactNode;
}) {
  return (
    <div style={{ backgroundColor: CREAM, color: NEAR_BLACK, ...dmSans }}>
      <SiteNav />
      <main className="max-w-3xl mx-auto px-6 sm:px-8 py-14 sm:py-20">
        <div className="text-[10px] font-semibold tracking-[0.22em]" style={{ color: MUSTARD }}>
          {eyebrow}
        </div>
        <h1 style={serif} className="mt-3 text-5xl sm:text-6xl leading-[1.02]">
          {title}
        </h1>
        <p className="mt-5 text-base leading-relaxed" style={{ opacity: 0.8 }}>
          {intro}
        </p>
        <div className="mt-3 text-xs uppercase tracking-[0.18em]" style={{ opacity: 0.5 }}>
          Last updated {updated}
        </div>
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
