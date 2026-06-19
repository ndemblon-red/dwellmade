import { Link, useRouter } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

const NEAR_BLACK = "#1A1A2E";
const MUSTARD = "#F0A500";
const PINK = "#E87FA3";
const MUTED_CREAM = "rgba(245,240,232,0.7)";

function Wordmark() {
  return (
    <span
      className="text-2xl leading-none tracking-tight lowercase"
      style={{ fontFamily: "'Instrument Serif', serif" }}
    >
      <span className="italic" style={{ color: MUSTARD }}>dwell</span>
      <span style={{ color: PINK }}>made</span>
    </span>
  );
}

export function AppHeader() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const signOut = async () => {
    await supabase.auth.signOut();
    router.navigate({ to: "/" });
  };

  return (
    <header style={{ backgroundColor: NEAR_BLACK }}>
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link to={user ? "/projects" : "/"}>
          <Wordmark />
        </Link>
        <div className="text-[10px] uppercase tracking-[0.22em]" style={{ color: MUTED_CREAM }}>
          {loading ? null : user ? (
            <div className="flex items-center gap-5">
              <Link to="/projects" className="hover:opacity-100 opacity-80">
                Projects
              </Link>
              <span className="hidden sm:inline normal-case tracking-normal text-[11px]">
                {user.email}
              </span>
              <button onClick={signOut} className="underline underline-offset-4 hover:opacity-100 opacity-80">
                Sign out
              </button>
            </div>
          ) : (
            <Link to="/auth" className="hover:opacity-100 opacity-80">
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
