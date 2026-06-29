import { createFileRoute } from "@tanstack/react-router";
import { readUsage } from "@/lib/generation-gate.server";

export const Route = createFileRoute("/api/usage")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const usage = await readUsage(request);
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        };
        if (usage.setCookie) headers["Set-Cookie"] = usage.setCookie;
        return new Response(
          JSON.stringify({ kind: usage.kind, used: usage.used, limit: usage.limit }),
          { status: 200, headers },
        );
      },
    },
  },
});
