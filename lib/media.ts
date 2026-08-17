import { z } from "zod";

export const brand = {
  id: "blindspot",
  name: "Blindspot",
  tagline: "LOOK CLOSER.",
  website: "blindspot.media",
  colors: { paper: "#efede6", ink: "#171714", signal: "#e4402d", muted: "#5f5d55" },
  safeArea: 64,
} as const;

export const templates = {
  statement: { id: "statement", name: "Editorial statement", description: "One strong idea with a sharp supporting line.", version: 1 },
  signal: { id: "signal", name: "Signal card", description: "A numbered claim for a recurring evidence series.", version: 1 },
} as const;

export const formats = {
  portrait: { id: "portrait", label: "4:5", width: 1080, height: 1350 },
  square: { id: "square", label: "1:1", width: 1080, height: 1080 },
} as const;

export const postPayloadSchema = z.object({
  brandId: z.literal("blindspot"),
  templateId: z.enum(["statement", "signal"]),
  format: z.enum(["portrait", "square"]),
  content: z.object({
    eyebrow: z.string().trim().min(1, "Eyebrow is required").max(28),
    headline: z.string().trim().min(1, "Headline is required").max(84),
    support: z.string().trim().min(1, "Supporting copy is required").max(150),
  }),
});

export type PostPayload = z.infer<typeof postPayloadSchema>;
export type TemplateId = PostPayload["templateId"];
export type FormatId = PostPayload["format"];

export const defaultPostPayload: PostPayload = {
  brandId: "blindspot",
  templateId: "statement",
  format: "portrait",
  content: {
    eyebrow: "MEDIA LITERACY / 01",
    headline: "A screenshot is a claim, not proof.",
    support: "Without a source, timestamp, and surrounding context, an image only proves that pixels exist.",
  },
};

export function parsePostPayload(value: unknown): PostPayload {
  return postPayloadSchema.parse(value);
}

export function renderFilename(payload: PostPayload): string {
  const title = payload.content.headline.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48);
  return `blindspot-${title || "post"}-${payload.format}.png`;
}
