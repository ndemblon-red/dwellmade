import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { AppHeader } from "@/components/AppHeader";
import { AnonymousBanner, Workspace } from "./index";

const STUDIO_TITLE = "Studio — design your room | dwellmade";
const STUDIO_DESCRIPTION =
  "Upload a photo of your room, collect inspiration, build your aesthetic brief and generate a redesign of your own space in the dwellmade studio.";

export const Route = createFileRoute("/studio")({
  head: () => ({
    meta: [
      { title: STUDIO_TITLE },
      { name: "description", content: STUDIO_DESCRIPTION },
      { property: "og:title", content: STUDIO_TITLE },
      { property: "og:description", content: STUDIO_DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://dwellmade.co.uk/studio" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://dwellmade.co.uk/studio" }],
  }),
  component: StudioPage,
});

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
