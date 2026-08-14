import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Link, useRouter } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { signOutSession } from "@/lib/auth-actions";

const NEAR_BLACK = "#1A1A2E";
const MUSTARD = "#F0A500";
const PINK = "#E87FA3";
const CREAM = "#F5F0E8";
const MUTED_CREAM = "rgba(245,240,232,0.7)";

function Wordmark() {
  return (
    <span
      className="leading-none tracking-tight lowercase"
      style={{ fontFamily: "'Instrument Serif', serif", fontSize: "32px" }}
    >
      <span className="italic" style={{ color: MUSTARD }}>
        dwell
      </span>
      <span style={{ color: PINK }}>made</span>
    </span>
  );
}

export function UserMenu({ email, onSignOut }: { email: string; onSignOut: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const initial = (email[0] ?? "?").toUpperCase();

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Account menu"
        className="flex size-11 items-center justify-center rounded-full"
        style={{
          backgroundColor: "rgba(245, 240, 232, 0.15)",
          color: CREAM,
          fontSize: 12,
        }}
      >
        {initial}
      </button>
      {open && (
        <div
          className="absolute right-0 mt-2 min-w-[140px] z-50"
          style={{
            backgroundColor: NEAR_BLACK,
            border: "1px solid rgba(245,240,232,0.1)",
            borderRadius: 4,
            padding: "8px 0",
          }}
        >
          <div
            className="px-4 pb-2 text-[11px] normal-case tracking-normal truncate"
            style={{ color: MUTED_CREAM, maxWidth: 220 }}
          >
            {email}
          </div>
          <Link
            to="/account"
            onClick={() => setOpen(false)}
            className="min-h-11 w-full flex items-center normal-case tracking-normal"
            style={{
              color: CREAM,
              fontSize: 13,
              padding: "8px 16px",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(245,240,232,0.08)")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
          >
            Account
          </Link>
          <button
            onClick={() => {
              setOpen(false);
              onSignOut();
            }}
            className="min-h-11 w-full text-left normal-case tracking-normal"
            style={{
              color: CREAM,
              fontSize: 13,
              padding: "8px 16px",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(245,240,232,0.08)")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
          >
            Sign out
          </button>
          <div
            className="my-2"
            style={{ borderTop: "1px solid rgba(245,240,232,0.1)" }}
          />
          <Link
            to="/privacy"
            onClick={() => setOpen(false)}
            className="block normal-case tracking-normal"
            style={{
              color: MUTED_CREAM,
              fontSize: 12,
              padding: "6px 16px",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(245,240,232,0.08)")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
          >
            Privacy
          </Link>
          <Link
            to="/terms"
            onClick={() => setOpen(false)}
            className="block normal-case tracking-normal"
            style={{
              color: MUTED_CREAM,
              fontSize: 12,
              padding: "6px 16px",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(245,240,232,0.08)")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
          >
            Terms
          </Link>
          <a
            href="mailto:dwellmade.app@gmail.com"
            onClick={() => setOpen(false)}
            className="block normal-case tracking-normal"
            style={{
              color: MUTED_CREAM,
              fontSize: 12,
              padding: "6px 16px",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(245,240,232,0.08)")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
          >
            Contact
          </a>
        </div>
      )}
    </div>
  );
}

export function AppHeader() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

  const signOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await signOutSession();
    await router.navigate({ to: "/auth", replace: true });
  };

  return (
    <header style={{ backgroundColor: NEAR_BLACK }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
        <Link to={user ? "/projects" : "/"}>
          <Wordmark />
        </Link>
        <div className="text-[10px] uppercase tracking-[0.22em]" style={{ color: MUTED_CREAM }}>
          {loading ? null : user ? (
            <UserMenu email={user.email ?? ""} onSignOut={signOut} />
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
