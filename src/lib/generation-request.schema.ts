import { z } from "zod";

const InlineImageSchema = z
  .string()
  .refine(
    (value) => /^data:image\/[a-z0-9.+-]+;base64,[a-z0-9+/=\s]+$/i.test(value),
    "Invalid inline image data URL",
  );

const SecureImageUrlSchema = z
  .string()
  .url()
  .refine((value) => {
    try {
      return new URL(value).protocol === "https:";
    } catch {
      return false;
    }
  }, "Image URL must use HTTPS");

export const ImageSourceSchema = z.union([InlineImageSchema, SecureImageUrlSchema]);

const BriefSchema = z.object({
  palette: z.array(z.string()),
  materials: z.array(z.string()),
  furnitureStyle: z.string(),
  lightingMood: z.string().optional().default(""),
  vibe: z.string(),
});

export const GenerationRequestSchema = z.object({
  room: ImageSourceSchema,
  inspo: z.array(ImageSourceSchema).default([]),
  brief: BriefSchema,
  keepChange: z.object({
    walls: z.enum(["keep", "change"]),
    flooring: z.enum(["keep", "change"]),
    furniture: z.enum(["keep", "change"]),
    decor: z.enum(["keep", "change"]),
  }),
  notes: z.string().optional().default(""),
});

export type GenerationRequest = z.infer<typeof GenerationRequestSchema>;
