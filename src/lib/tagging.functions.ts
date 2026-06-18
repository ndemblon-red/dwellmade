import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const InputSchema = z.object({
  dataUrl: z.string().startsWith("data:"),
});

const AspectsSchema = z.object({
  palette: z.array(z.string()).min(3).max(6),
  materials: z.array(z.string()).max(6),
  furnitureStyle: z.string(),
  lightingMood: z.string(),
  vibe: z.string(),
});

export type TaggingResult = z.infer<typeof AspectsSchema>;

export const tagInspoImage = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => InputSchema.parse(d))
  .handler(async ({ data }): Promise<TaggingResult> => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");

    const systemPrompt = `You analyze interior design inspiration images and extract structured aesthetic attributes. Return ONLY a JSON object matching this shape exactly:
{
  "palette": ["#RRGGBB", ...]  // 3-5 dominant hex colors
  "materials": [string, ...]   // 2-5 short material/finish nouns (e.g. "oak", "brass", "linen", "lime wash")
  "furnitureStyle": string     // short phrase, e.g. "mid-century lounge", "japandi low-slung"
  "lightingMood": string       // short phrase, e.g. "warm golden hour", "diffuse north light"
  "vibe": string               // one sentence describing the overall feeling
}
No prose, no markdown fences, just the raw JSON object.`;

    const body = {
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: [
            { type: "text", text: "Analyze this inspiration image." },
            { type: "image_url", image_url: { url: data.dataUrl } },
          ],
        },
      ],
      response_format: { type: "json_object" },
    };

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Tagging failed: ${res.status} ${text}`);
    }

    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = json.choices?.[0]?.message?.content ?? "";
    // Strip code fences if any
    const cleaned = content
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```\s*$/i, "")
      .trim();

    let parsed: unknown;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      throw new Error("Tagging returned non-JSON content");
    }
    return AspectsSchema.parse(parsed);
  });
