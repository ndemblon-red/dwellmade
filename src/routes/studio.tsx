import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { AppHeader } from "@/components/AppHeader";
import { AnonymousBanner, Workspace } from "./index";

export const Route = createFileRoute("/studio")({ component: StudioPage });

function StudioPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (user) navigate({ to: "/projects", replace: true });
  }, [user, navigate]);
  if (loading || user) {
    return (
      <div className="min-h-screen bg-canvas">
        <AppHeader />
      </div>
    );
  }
  return (
    <div>
      <AppHeader />
      <AnonymousBanner />
      <Workspace />
    </div>
  );
}
