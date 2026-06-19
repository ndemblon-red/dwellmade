export const TAGGING_SYSTEM_PROMPT = `You analyze interior design inspiration images and extract structured aesthetic attributes. Return ONLY a JSON object matching this shape exactly:
{
  "palette": ["#RRGGBB", ...]  // 3-5 dominant hex colors
  "materials": [string, ...]   // 2-5 short material/finish nouns (e.g. "oak", "brass", "linen", "lime wash")
  "furnitureStyle": string     // short phrase, e.g. "mid-century lounge", "japandi low-slung"
  "lightingMood": string       // short phrase, e.g. "warm golden hour", "diffuse north light"
  "vibe": string               // one sentence describing the overall feeling
}
No prose, no markdown fences, just the raw JSON object.`;

export const TAGGING_USER_MESSAGE = "Analyze this inspiration image.";
