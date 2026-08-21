import { z } from "zod";
import { compositionIdSchema, compositions, type CompositionId } from "./compositions.ts";

const slugSchema = z.string().trim().min(2).max(48).regex(/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/, "Use a lowercase kebab-case ID.");
const hexColorSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Use a six-digit hex color.");

export const brandConfigSchema = z.object({
  id: slugSchema,
  name: z.string().trim().min(1).max(60),
  tagline: z.string().trim().min(1).max(80),
  website: z.string().trim().min(1).max(100),
  colors: z.object({ paper: hexColorSchema, ink: hexColorSchema, signal: hexColorSchema, muted: hexColorSchema, accent: hexColorSchema.optional() }),
  safeArea: z.number().int().min(40).max(140),
  logo: z.object({ wordmark: z.string().trim().min(1).max(80), mark: z.string().trim().min(1).max(12) }).optional(),
  typography: z.object({ display: z.string().trim().min(1), body: z.string().trim().min(1), mono: z.string().trim().min(1) }).optional(),
  spacing: z.object({ unit: z.number().int().min(2).max(16), contentGap: z.number().int().min(16).max(120) }).optional(),
  radii: z.object({ card: z.number().int().min(0).max(80), image: z.number().int().min(0).max(80), pill: z.number().int().min(0).max(999) }).optional(),
  backgroundStyles: z.array(z.string().trim().min(1)).min(1).max(12).optional(),
  imageTreatment: z.object({ contrast: z.enum(["natural", "high", "muted"]), overlay: z.enum(["none", "ink", "signal"]), captionStyle: z.enum(["plain", "label", "receipt"]), grain: z.boolean() }).optional(),
  screenshotTreatment: z.object({ frame: z.enum(["none", "browser", "device"]), shadow: z.enum(["none", "soft", "hard"]), perspective: z.enum(["flat", "tilted"]), background: z.enum(["paper", "ink", "signal"]), }).optional(),
  evidenceTreatment: z.object({ highlightColor: hexColorSchema, lineStyle: z.enum(["solid", "marker", "underline"]), sourceLabel: z.enum(["inline", "tab", "footer"]) }).optional(),
  logoRules: z.object({ position: z.enum(["header", "footer"]), minimumClearSpace: z.number().int().min(8).max(120), monochromeOnly: z.boolean() }).optional(),
  safeAreas: z.object({ top: z.number().int().min(20).max(180), right: z.number().int().min(20).max(180), bottom: z.number().int().min(20).max(180), left: z.number().int().min(20).max(180) }).optional(),
});

export type BrandConfig = z.infer<typeof brandConfigSchema>;

export const brand: BrandConfig = {
  id: "blindspot",
  name: "Blindspot",
  tagline: "LOOK CLOSER.",
  website: "blindspot.media",
  colors: { paper: "#efede6", ink: "#171714", signal: "#e4402d", muted: "#5f5d55" },
  safeArea: 64,
  logo: { wordmark: "Blindspot", mark: "B." },
  typography: { display: "Source Serif 4", body: "DM Sans", mono: "DM Sans" },
  spacing: { unit: 8, contentGap: 48 },
  radii: { card: 8, image: 6, pill: 999 },
  backgroundStyles: ["paper", "ink", "paper_grid", "signal_wash", "image_full_bleed"],
  imageTreatment: { contrast: "high", overlay: "ink", captionStyle: "receipt", grain: true },
  screenshotTreatment: { frame: "browser", shadow: "hard", perspective: "tilted", background: "ink" },
  evidenceTreatment: { highlightColor: "#e4402d", lineStyle: "marker", sourceLabel: "tab" },
  logoRules: { position: "footer", minimumClearSpace: 32, monochromeOnly: true },
  safeAreas: { top: 64, right: 64, bottom: 64, left: 64 },
};

export const templates = {
  statement: { id: "statement", name: "Editorial statement", description: "One strong idea with a sharp supporting line.", version: 1 },
  signal: { id: "signal", name: "Signal card", description: "A numbered claim for a recurring evidence series.", version: 1 },
  bloom: { id: "bloom", name: "Bloom card", description: "An illustrated card with a serif headline, leaf motifs and a channel footer.", version: 1 },
  claim: { id: "claim", name: compositions.claim.name, description: compositions.claim.purpose, version: 3 },
  "real-but": { id: "real-but", name: compositions.real_but.name, description: compositions.real_but.purpose, version: 3 },
  receipt: { id: "receipt", name: compositions.receipt.name, description: compositions.receipt.purpose, version: 3 },
  "whats-missing": { id: "whats-missing", name: compositions.whats_missing.name, description: compositions.whats_missing.purpose, version: 3 },
  product: { id: "product", name: compositions.product.name, description: compositions.product.purpose, version: 3 },
  explainer: { id: "explainer", name: compositions.explainer.name, description: compositions.explainer.purpose, version: 3 },
} as const;

export const posterLayoutSchema = z.object({
  family: z.enum(["statement", "signal", "bloom", "split", "grid"]).default("statement"),
  mediaPosition: z.enum(["auto", "none", "top", "bottom", "left", "right", "full-bleed"]).default("auto"),
  alignment: z.enum(["left", "center", "right"]).default("left"),
  focalRegion: z.enum(["headline", "media", "content"]).default("headline"),
  density: z.enum(["airy", "balanced", "dense"]).default("balanced"),
  headlineScale: z.number().min(0.75).max(1.5).default(1),
  mediaSplit: z.number().min(0.25).max(0.75).default(0.46),
  showIndex: z.boolean().default(false),
  indexPlacement: z.enum(["rail", "inline", "corner"]).default("inline"),
  signature: z.enum(["rule", "rail", "underline", "wash", "none"]).default("rule"),
});
export type PosterLayout = z.infer<typeof posterLayoutSchema>;

export const formats = {
  portrait: { id: "portrait", label: "4:5", width: 1080, height: 1350 },
  square: { id: "square", label: "1:1", width: 1080, height: 1080 },
} as const;

export const rendererKeySchema = z.enum(["statement", "signal", "bloom", "chat", "lookup", "breakdown", "terminal", "split", "ledger", "claim", "real_but", "receipt", "whats_missing", "product", "explainer", "layout"]);
export type RendererKey = z.infer<typeof rendererKeySchema>;

export const templateInputSchema = z.object({
  id: slugSchema,
  brandId: slugSchema,
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().min(1).max(180),
  rendererKey: rendererKeySchema,
  layout: posterLayoutSchema.optional().describe("HTML/CSS layout parameters used by the generic layout renderer."),
});

export type TemplateInput = z.infer<typeof templateInputSchema>;

export const templateCreateSchema = templateInputSchema.superRefine((value, context) => {
  if (value.rendererKey === "layout" && !value.layout) {
    context.addIssue({ code: "custom", path: ["layout"], message: "The layout renderer requires a layout spec." });
  }
});

export const postImageSchema = z.object({
  assetId: z.string().uuid(),
  alt: z.string().trim().max(160).default(""),
  fit: z.enum(["cover", "contain"]).default("cover"),
  focalPoint: z.object({
    x: z.number().min(0).max(1),
    y: z.number().min(0).max(1),
  }).default({ x: 0.5, y: 0.5 }),
  zoom: z.number().min(1).max(3).default(1),
  frame: z.enum(["none", "browser", "device"]).optional(),
  blurRegions: z.array(z.object({ x: z.number().min(0).max(1), y: z.number().min(0).max(1), width: z.number().min(0.01).max(1), height: z.number().min(0.01).max(1), strength: z.number().min(2).max(30).default(12) })).max(8).optional(),
  highlightRegions: z.array(z.object({ x: z.number().min(0).max(1), y: z.number().min(0).max(1), width: z.number().min(0.01).max(1), height: z.number().min(0.01).max(1), label: z.string().trim().max(40).optional() })).max(8).optional(),
});

export const postContentSchema = z.object({
  eyebrow: z.string().trim().min(1, "Eyebrow is required").max(28),
  headline: z.string().trim().min(1, "Headline is required").max(84),
  support: z.string().trim().min(1, "Supporting copy is required").max(150),
  image: postImageSchema.optional(),
  highlight: z.string().trim().max(80).optional(),
  evidence: z.object({ source: z.string().trim().min(1).max(100), detail: z.string().trim().min(1).max(180) }).optional(),
  quote: z.string().trim().max(220).optional(),
  metric: z.string().trim().max(24).optional(),
  metricLabel: z.string().trim().max(50).optional(),
  steps: z.array(z.string().trim().min(1).max(90)).min(3).max(5).optional(),
  cta: z.string().trim().max(60).optional(),
  backgroundStyle: z.enum(["paper", "ink", "paper_grid", "signal_wash", "image_full_bleed"]).optional(),
});

export const postPayloadSchema = z.object({
  brandId: slugSchema,
  templateId: slugSchema,
  compositionId: compositionIdSchema.optional(),
  format: z.enum(["portrait", "square"]),
  content: postContentSchema,
});

export type PostPayload = z.infer<typeof postPayloadSchema>;
export type PostContent = z.infer<typeof postContentSchema>;
export type { CompositionId };
export type TemplateId = keyof typeof templates;
export type FormatId = PostPayload["format"];

export const draftStatusSchema = z.enum(["draft", "in_review", "approved", "rendered"]);
export type DraftStatus = z.infer<typeof draftStatusSchema>;

export const draftCreateInputSchema = z.object({
  payload: postPayloadSchema,
  prompt: z.string().trim().max(500).optional().nullable(),
});

export const draftUpdateInputSchema = draftCreateInputSchema.extend({
  expectedRevision: z.number().int().positive(),
});

export const draftDecisionSchema = z.enum(["approved", "rejected"]);

export const carouselCreateInputSchema = z.object({
  brandId: slugSchema,
  templateId: slugSchema,
  format: z.enum(["portrait", "square"]),
  slides: z.array(postContentSchema).min(3).max(7),
  prompt: z.string().trim().max(500).optional().nullable(),
});

export const carouselUpdateInputSchema = carouselCreateInputSchema.extend({ expectedRevision: z.number().int().positive() });
export type CarouselInput = z.infer<typeof carouselCreateInputSchema>;

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
