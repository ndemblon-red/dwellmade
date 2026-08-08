import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AppHeader } from "@/components/AppHeader";
import { useAuth } from "@/hooks/use-auth";
import { useGenerationUsage } from "@/hooks/use-generation-usage";
import { supabase } from "@/integrations/supabase/client";
import { deleteMyAccount } from "@/utils/account.functions";
import { createPortalSession } from "@/utils/payments.functions";
import { getStripeEnvironment } from "@/lib/stripe";

const NEAR_BLACK = "#1A1A2E";
const CREAM = "#F5F0E8";
const MUSTARD = "#F0A500";
const MUTED_CREAM = "rgba(245,240,232,0.7)";
const serif = { fontFamily: "'Instrument Serif', serif" };

type Profile = {
  plan: string;
  plan_active: boolean;
  comp: boolean | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean | null;
  billing_period_start: string | null;
};

export const Route = createFileRoute("/_authenticated/account")({
  head: () => ({
    meta: [
      { title: "Your account — dwellmade" },
      {
        name: "description",
        content:
          "Manage your dwellmade account: email, password, subscription and monthly generation allowance.",
      },
      { property: "og:title", content: "Your account — dwellmade" },
      {
        property: "og:description",
        content:
          "Manage your dwellmade account: email, password, subscription and monthly generation allowance.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AccountPage,
});

function fmt(date: string | null | undefined): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section
      className="p-6 sm:p-8"
      style={{ backgroundColor: NEAR_BLACK, color: CREAM, borderRadius: 4 }}
    >
      <div className="text-[10px] font-semibold tracking-[0.22em]" style={{ color: MUSTARD }}>
        {title.toUpperCase()}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2 py-2 text-sm">
      <span style={{ color: MUTED_CREAM }}>{label}</span>
      <span className="text-right">{value}</span>
    </div>
  );
}

function AccountPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { usage } = useGenerationUsage();
  const [profile, setProfile] = useState<Profile | null>(null);

  const [resetState, setResetState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [resetError, setResetError] = useState<string | null>(null);

  const [portalBusy, setPortalBusy] = useState(false);
  const [portalError, setPortalError] = useState<string | null>(null);
  const runPortal = useServerFn(createPortalSession);

  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const runDeleteAccount = useServerFn(deleteMyAccount);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("user_profiles")
        .select(
          "plan, plan_active, comp, current_period_end, cancel_at_period_end, billing_period_start",
        )
        .eq("id", user.id)
        .maybeSingle();
      if (!cancelled) setProfile((data as Profile) ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const provider = (user?.app_metadata?.provider as string | undefined) ?? "email";
  const isGoogle = provider === "google";
  const subscribed = Boolean(profile?.plan_active) || Boolean(profile?.comp);

  const resetsAt = (() => {
    if (profile?.billing_period_start) {
      const d = new Date(profile.billing_period_start);
      while (d.getTime() <= Date.now()) d.setMonth(d.getMonth() + 1);
      return d.toISOString();
    }
    return profile?.current_period_end ?? null;
  })();

  const sendReset = async () => {
    if (!user?.email) return;
    setResetState("sending");
    setResetError(null);
    const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      setResetError(error.message);
      setResetState("error");
      return;
    }
    setResetState("sent");
  };

  const openPortal = async () => {
    setPortalBusy(true);
    setPortalError(null);
    try {
      const result = await runPortal({
        data: {
          environment: getStripeEnvironment(),
          returnUrl: `${window.location.origin}/account`,
        },
      });
      if ("error" in result) {
        setPortalError(result.error);
        return;
      }
      window.open(result.url, "_blank");
    } catch (err) {
      setPortalError(err instanceof Error ? err.message : String(err));
    } finally {
      setPortalBusy(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    setDeleteError(null);
    try {
      const result = await runDeleteAccount({});
      if ("error" in result) {
        setDeleteError(result.error);
        setDeleting(false);
        return;
      }
      await supabase.auth.signOut();
      navigate({ to: "/" });
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : String(err));
      setDeleting(false);
    }
  };

  const linkish =
    "underline underline-offset-4 disabled:opacity-50 hover:opacity-80 min-h-11 inline-flex items-center";

  return (
    <div className="min-h-screen bg-canvas text-ink font-sans">
      <AppHeader />
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        <h1 style={serif} className="text-4xl leading-[1.05]">
          Your <span className="italic">account</span>
        </h1>
        <p className="text-sm text-muted-ink mt-1">
          Your details, password and subscription in one place.
        </p>

        <div className="mt-8 space-y-4">
          <Section title="Your details">
            <Row label="Email" value={loading ? "…" : (user?.email ?? "—")} />
            <Row label="Sign-in method" value={isGoogle ? "Google" : "Email and password"} />
            <Row label="Member since" value={fmt(user?.created_at)} />
          </Section>

          <Section title="Password">
            {isGoogle ? (
              <p className="text-sm" style={{ color: MUTED_CREAM }}>
                You sign in with Google, so there is no dwellmade password to change.
              </p>
            ) : (
              <>
                <p className="text-sm" style={{ color: MUTED_CREAM }}>
                  We&rsquo;ll email you a secure link to set a new password.
                </p>
                <div className="mt-4">
                  {resetState === "sent" ? (
                    <p className="text-sm">Reset link sent to {user?.email}. Check your inbox.</p>
                  ) : (
                    <button
                      type="button"
                      onClick={sendReset}
                      disabled={resetState === "sending"}
                      className="min-h-11 px-4 py-2.5 text-sm font-medium disabled:opacity-50"
                      style={{ backgroundColor: MUSTARD, color: NEAR_BLACK, borderRadius: 4 }}
                    >
                      {resetState === "sending" ? "Sending…" : "Send password reset link"}
                    </button>
                  )}
                  {resetError && (
                    <p className="mt-2 text-sm" style={{ color: "#E87FA3" }}>
                      {resetError}
                    </p>
                  )}
                </div>
              </>
            )}
          </Section>

          <Section title="Subscription">
            {profile === null ? (
              <p className="text-sm" style={{ color: MUTED_CREAM }}>
                Loading…
              </p>
            ) : subscribed ? (
              <>
                <Row
                  label="Plan"
                  value={
                    profile.comp
                      ? "Complimentary access · 50 generations a month"
                      : "dwellmade Basic — £15/month · 50 generations"
                  }
                />
                <Row
                  label="Usage this month"
                  value={
                    usage
                      ? `${usage.used} of ${usage.limit} generations used${
                          resetsAt ? ` · resets ${fmt(resetsAt)}` : ""
                        }`
                      : "…"
                  }
                />
                {profile.cancel_at_period_end && (
                  <Row
                    label="Cancelling"
                    value={`Your access ends on ${fmt(profile.current_period_end)}`}
                  />
                )}
                <div className="mt-4">
                  <button
                    type="button"
                    onClick={openPortal}
                    disabled={portalBusy || Boolean(profile.comp)}
                    className="min-h-11 px-4 py-2.5 text-sm font-medium disabled:opacity-50"
                    style={{ backgroundColor: MUSTARD, color: NEAR_BLACK, borderRadius: 4 }}
                  >
                    {portalBusy ? "Opening…" : "Manage subscription"}
                  </button>
                  <p className="mt-2 text-[11px]" style={{ color: MUTED_CREAM }}>
                    Opens in a new tab — cancel, change your card, or download invoices.
                  </p>
                  {portalError && (
                    <p className="mt-2 text-sm" style={{ color: "#E87FA3" }}>
                      {portalError}
                    </p>
                  )}
                </div>
              </>
            ) : (
              <>
                <p className="text-sm" style={{ color: MUTED_CREAM }}>
                  You don&rsquo;t have an active subscription.
                </p>
                <Link
                  to="/checkout"
                  className="mt-4 inline-flex min-h-11 items-center px-4 py-2.5 text-sm font-medium"
                  style={{ backgroundColor: MUSTARD, color: NEAR_BLACK, borderRadius: 4 }}
                >
                  Subscribe
                </Link>
              </>
            )}
          </Section>

          <Section title="Danger zone">
            <p className="text-sm" style={{ color: MUTED_CREAM }}>
              Deleting your account removes your projects, rooms and designs permanently.
            </p>
            <div className="mt-4 text-sm">
              {confirmingDelete ? (
                <span>
                  This will permanently delete your account.{" "}
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={deleting}
                    className={linkish}
                  >
                    {deleting ? "Deleting…" : "Delete account"}
                  </button>{" "}
                  ·{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmingDelete(false);
                      setDeleteError(null);
                    }}
                    disabled={deleting}
                    className={linkish}
                  >
                    Go back
                  </button>
                  {deleteError && <span className="block mt-2">{deleteError}</span>}
                </span>
              ) : (
                <button type="button" onClick={() => setConfirmingDelete(true)} className={linkish}>
                  Delete my account
                </button>
              )}
            </div>
          </Section>
        </div>
      </main>
    </div>
  );
}
