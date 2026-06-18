import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const InspoSchema = z.object({
  dataUrl: z.string().startsWith("data:"),
  influence: z.number().min(0).max(100),
  enabled: z.object({
    palette: z.boolean(),
    materials: z.boolean(),
    furnitureStyle: z.boolean(),
    lightingMood: z.boolean(),
  }),
  aspects: z
    .object({
      palette: z.array(z.string()),
      materials: z.array(z.string()),
      furnitureStyle: z.string(),
      lightingMood: z.string(),
      vibe: z.string(),
    })
    .optional(),
});

const BodySchema = z.object({
  room: z.string().startsWith("data:"),
  inspo: z.array(InspoSchema).min(1),
  keepChange: z.object({
    walls: z.enum(["keep", "change"]),
    flooring: z.enum(["keep", "change"]),
    furniture: z.enum(["keep", "change"]),
    decor: z.enum(["keep", "change"]),
  }),
  notes: z.string().optional().default(""),
});

function buildPrompt(payload: z.infer<typeof BodySchema>): string {
  const active = payload.inspo.filter((i) => i.influence > 0 && i.aspects);
  const weightLabel = (w: number) =>
    w >= 75 ? "dominant" : w >= 40 ? "strong" : "subtle";

  const directives = active.map((i, idx) => {
    const a = i.aspects!;
    const parts: string[] = [];
    if (i.enabled.palette && a.palette.length)
      parts.push(`palette ${a.palette.join(", ")}`);
    if (i.enabled.materials && a.materials.length)
      parts.push(`materials ${a.materials.join(", ")}`);
    if (i.enabled.furnitureStyle) parts.push(`furniture in ${a.furnitureStyle} style`);
    if (i.enabled.lightingMood) parts.push(`${a.lightingMood} lighting`);
    return `Reference ${idx + 1} (${weightLabel(i.influence)}, ${i.influence}% weight): ${parts.join("; ")}. Vibe: ${a.vibe}`;
  });

  const kc = payload.keepChange;
  const constraints: string[] = [];
  constraints.push(
    kc.walls === "keep"
      ? "Preserve wall placement and openings exactly."
      : "Walls may be re-finished (paint, paneling, wallpaper) but keep their position.",
  );
  constraints.push(
    kc.flooring === "keep"
      ? "Keep the existing flooring."
      : "Flooring may be re-imagined to suit the new aesthetic.",
  );
  constraints.push(
    kc.furniture === "keep"
      ? "Preserve the major furniture pieces (sofa, bed, large case goods) in their current positions; only re-style upholstery and finishes where natural."
      : "Major furniture may be replaced with pieces matching the inspiration.",
  );
  constraints.push(
    kc.decor === "keep"
      ? "Keep existing decor and accessories."
      : "Decor, art, textiles, lighting fixtures, and accessories should be reimagined.",
  );

  return [
    "Redesign the room shown in the first image, blending in influences from the additional reference images.",
    "Maintain the exact room geometry, camera angle, perspective, and window placement of the source room.",
    "",
    "Inspiration directives:",
    ...directives,
    "",
    "Constraints:",
    ...constraints,
    payload.notes ? `\nAdditional notes from the user: ${payload.notes}` : "",
    "",
    "Output a single photorealistic interior photograph of the same room, redesigned. No text overlays, no annotations.",
  ]
    .filter(Boolean)
    .join("\n");
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

        // Gemini image preview accepts multiple image_url inputs in the messages content.
        const content: Array<
          { type: "text"; text: string } | { type: "image_url"; image_url: { url: string } }
        > = [
          { type: "text", text: prompt },
          { type: "image_url", image_url: { url: payload.room } },
        ];
        for (const i of payload.inspo) {
          content.push({ type: "image_url", image_url: { url: i.dataUrl } });
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
