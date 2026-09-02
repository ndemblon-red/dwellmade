import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const InputSchema = z.object({
  styles: z.array(z.string()).min(1).max(8),
  currentVibe: z.string().default(""),
});

function buildVibePrompt(styles: string[], currentVibe: string): string {
  const labels = ["dominant", "accent", "hint"];
  const ranked = styles
    .map((s, i) => `${i + 1}. ${s} (${labels[i] ?? "minor influence"})`)
    .join(", ");
  return [
    "A user is designing a room with the following blended style influences, ranked by importance:",
    ranked,
    "",
    `Their current vibe description is: "${currentVibe}"`,
    "",
    'Write a single evocative sentence describing the overall feeling of this blended aesthetic — how the styles work together, what the room should feel like. Be specific and atmospheric, not generic. Do not use the word "blended". Write in second person ("your space", "your room"). Maximum 25 words.',
  ].join("\n");
}

/** Regenerates the brief vibe sentence for a ranked style blend. */
export const regenerateVibe = createServerFn({ method: "POST" })
  .validator((d: unknown) => InputSchema.parse(d))
  .handler(async ({ data }): Promise<{ vibe: string }> => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "user", content: buildVibePrompt(data.styles, data.currentVibe) },
        ],
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Vibe regeneration failed: ${res.status} ${text}`);
    }

    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const vibe = (json.choices?.[0]?.message?.content ?? "").trim().replace(/^["“]|["”]$/g, "");
    if (!vibe) throw new Error("Empty vibe response");
    return { vibe };
  });
