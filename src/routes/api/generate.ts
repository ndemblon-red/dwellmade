import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const BriefSchema = z.object({
  palette: z.array(z.string()),
  materials: z.array(z.string()),
  furnitureStyle: z.string(),
  vibe: z.string(),
});

const BodySchema = z.object({
  room: z.string().startsWith("data:"),
  inspo: z.array(z.string().startsWith("data:")).default([]),
  brief: BriefSchema,
  keepChange: z.object({
    walls: z.enum(["keep", "change"]),
    flooring: z.enum(["keep", "change"]),
    furniture: z.enum(["keep", "change"]),
    decor: z.enum(["keep", "change"]),
  }),
  notes: z.string().optional().default(""),
});

function buildPrompt(payload: z.infer<typeof BodySchema>): string {
  const { brief, keepChange, notes } = payload;

  const keepList: string[] = [];
  const changeList: string[] = [];
  const labels: Record<keyof typeof keepChange, string> = {
    walls: "walls & surfaces",
    flooring: "flooring",
    furniture: "major furniture",
    decor: "decor & lighting",
  };
  (Object.keys(keepChange) as Array<keyof typeof keepChange>).forEach((k) => {
    (keepChange[k] === "keep" ? keepList : changeList).push(labels[k]);
  });

  const paletteStr =
    brief.palette.length > 0 ? brief.palette.join(", ") : "(no palette set)";
  const materialsStr =
    brief.materials.length > 0 ? brief.materials.join(", ") : "(no materials set)";
  const styleStr = brief.furnitureStyle || "(no style set)";
  const vibeStr = brief.vibe || "(no vibe set)";

  const lines = [
    `Redesign this room applying: palette [${paletteStr}], materials [${materialsStr}], furniture style [${styleStr}], vibe [${vibeStr}], keeping [${keepList.join(", ") || "nothing"}] unchanged${changeList.length ? `, while reimagining [${changeList.join(", ")}]` : ""}.`,
    "Maintain the exact room geometry, camera angle, perspective, and window placement of the source room.",
    "Use the additional reference images only as visual anchors for the brief above — do not blend their geometry into the room.",
    notes ? `Additional notes from the user: ${notes}` : "",
    "Output a single photorealistic interior photograph of the same room, redesigned. No text overlays, no annotations.",
  ].filter(Boolean);

  return lines.join("\n");
}

export const Route = createFileRoute("/api/generate")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        let payload: z.infer<typeof BodySchema>;
        try {
          const raw = await request.json();
          payload = BodySchema.parse(raw);
        } catch (e) {
          return new Response(
            JSON.stringify({ error: e instanceof Error ? e.message : "Invalid body" }),
            { status: 400, headers: { "Content-Type": "application/json" } },
          );
        }

        const prompt = buildPrompt(payload);

        const content: Array<
          | { type: "text"; text: string }
          | { type: "image_url"; image_url: { url: string } }
        > = [
          { type: "text", text: prompt },
          { type: "image_url", image_url: { url: payload.room } },
        ];
        for (const url of payload.inspo) {
          content.push({ type: "image_url", image_url: { url } });
        }

        const upstreamBody = {
          model: "google/gemini-3.1-flash-image-preview",
          messages: [{ role: "user", content }],
          modalities: ["image", "text"],
          stream: true,
        };

        const upstream = await fetch(
          "https://ai.gateway.lovable.dev/v1/images/generations",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${key}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(upstreamBody),
          },
        );

        if (!upstream.ok || !upstream.body) {
          const text = await upstream.text().catch(() => "");
          return new Response(text || "Upstream error", { status: upstream.status });
        }

        return new Response(upstream.body, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
          },
        });
      },
    },
  },
});
