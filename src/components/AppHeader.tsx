import { Link, useRouter } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export function AppHeader() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const signOut = async () => {
    await supabase.auth.signOut();
    router.navigate({ to: "/" });
  };

  return (
    <header className="border-b border-zinc-950/5 bg-canvas">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link
          to={user ? "/projects" : "/"}
          className="font-serif text-2xl leading-none"
        >
          Studio <span className="italic">Syn</span>
        </Link>
        <div className="text-xs">
          {loading ? null : user ? (
            <div className="flex items-center gap-4">
              <Link
                to="/projects"
                className="text-muted-ink hover:text-ink uppercase tracking-widest text-[10px]"
              >
                Projects
              </Link>
              <span className="text-muted-ink hidden sm:inline">
                {user.email}
              </span>
              <button
                onClick={signOut}
                className="uppercase tracking-widest text-[10px] underline underline-offset-4 text-muted-ink hover:text-ink"
              >
                Sign out
              </button>
            </div>
          ) : (
            <Link
              to="/auth"
              className="uppercase tracking-widest text-[10px] bg-ink text-paper px-3 py-2 rounded-md hover:bg-accent"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
