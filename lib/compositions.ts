import { z } from "zod";

export const compositionIdSchema = z.enum(["claim", "real_but", "receipt", "whats_missing", "product", "explainer"]);
export type CompositionId = z.infer<typeof compositionIdSchema>;
export type CarouselSequenceRole = "hook" | "context" | "evidence" | "close";

export const compositionBlockSchema = z.enum(["Headline", "Eyebrow", "Body", "Image", "Screenshot", "Evidence", "Quote", "Metric", "Highlight", "LogoFooter", "CTA"]);
export type CompositionBlock = z.infer<typeof compositionBlockSchema>;

export type CompositionDefinition = {
  id: CompositionId;
  name: string;
  purpose: string;
  formats: Array<"portrait" | "square">;
  blocks: CompositionBlock[];
  requiredFields: string[];
  optionalFields: string[];
  assetRole: "none" | "image" | "screenshot" | "evidence";
  constraints: string[];
  defaults: { backgroundStyle: string; visualDensity: "low" | "medium" | "high"; imagePlacement: string };
};

export const compositions: Record<CompositionId, CompositionDefinition> = {
  claim: {
    id: "claim", name: "Claim", purpose: "A decisive, instantly understandable statement with minimal supporting copy.", formats: ["portrait", "square"],
    blocks: ["Eyebrow", "Headline", "Body", "Highlight", "LogoFooter"], requiredFields: ["eyebrow", "headline", "support"], optionalFields: ["highlight"], assetRole: "none",
    constraints: ["One claim only.", "Headline must name a concrete subject, event, source, or product fact.", "Avoid generic phrases such as better context, smarter media, or see what changed.", "Supporting copy should remain under two short sentences."],
    defaults: { backgroundStyle: "paper", visualDensity: "low", imagePlacement: "none" },
  },
  real_but: {
    id: "real_but", name: "Real, but…", purpose: "An image-dominant correction where the media is real but its date, location, identity, or context is wrong.", formats: ["portrait", "square"],
    blocks: ["Image", "Eyebrow", "Headline", "Highlight", "LogoFooter"], requiredFields: ["eyebrow", "headline", "support", "image"], optionalFields: ["highlight"], assetRole: "image",
    constraints: ["Image owns most of the canvas.", "Headline names exactly what is real and exactly which date, place, identity, or context is wrong.", "Crop must preserve the evidentiary subject."],
    defaults: { backgroundStyle: "ink", visualDensity: "low", imagePlacement: "full_bleed_top" },
  },
  receipt: {
    id: "receipt", name: "Receipt", purpose: "A source, screenshot, or evidence-led composition that makes the supporting proof visually central.", formats: ["portrait", "square"],
    blocks: ["Screenshot", "Evidence", "Eyebrow", "Headline", "Highlight", "LogoFooter"], requiredFields: ["eyebrow", "headline", "support", "image", "evidence"], optionalFields: ["highlight", "cta"], assetRole: "evidence",
    constraints: ["Evidence must be readable at phone size.", "The annotation may highlight but must not obscure the source.", "Source label must identify the primary source rather than say verified source generically."],
    defaults: { backgroundStyle: "paper_grid", visualDensity: "high", imagePlacement: "evidence_card" },
  },
  whats_missing: {
    id: "whats_missing", name: "What’s missing", purpose: "A carousel narrative: hook, missing context, and evidence-backed conclusion.", formats: ["portrait"],
    blocks: ["Eyebrow", "Headline", "Body", "Evidence", "Highlight", "CTA", "LogoFooter"], requiredFields: ["eyebrow", "headline", "support"], optionalFields: ["evidence", "highlight", "cta"], assetRole: "evidence",
    constraints: ["Use as a 3–5 slide story.", "The opening hook names the specific missing date, place, source, or omitted statement.", "Each slide advances one idea and the conclusion resolves the hook."],
    defaults: { backgroundStyle: "signal_wash", visualDensity: "medium", imagePlacement: "alternating" },
  },
  product: {
    id: "product", name: "Product", purpose: "A feature or update announcement with the real product screenshot as the hero.", formats: ["portrait", "square"],
    blocks: ["Screenshot", "Eyebrow", "Headline", "Body", "CTA", "LogoFooter"], requiredFields: ["eyebrow", "headline", "support", "image"], optionalFields: ["cta"], assetRole: "screenshot",
    constraints: ["Use a real Blindspot product screenshot, never a NoCanva placeholder.", "Name the exact changed behavior or feature.", "Highlight the precise interface region the viewer should inspect.", "Do not invent a generic CTA."],
    defaults: { backgroundStyle: "ink", visualDensity: "medium", imagePlacement: "device_stage" },
  },
  explainer: {
    id: "explainer", name: "Explainer", purpose: "A three-to-five-step educational carousel with deliberate narrative rhythm.", formats: ["portrait"],
    blocks: ["Eyebrow", "Headline", "Body", "Metric", "Highlight", "CTA", "LogoFooter"], requiredFields: ["eyebrow", "headline", "steps"], optionalFields: ["support", "metric", "metricLabel", "cta"], assetRole: "none",
    constraints: ["Use 3–5 concise steps.", "The hook promises one concrete skill or outcome.", "Each step begins with a meaningful verb or question.", "Do not use a decorative metric unless the number is sourced and useful."],
    defaults: { backgroundStyle: "ink", visualDensity: "medium", imagePlacement: "none" },
  },
};

export const visualReviewRubric = [
  "Is the hook understandable in under one second?",
  "Is there one clear visual hierarchy?",
  "Is all important text readable on a phone?",
  "Is there too much text?",
  "Is the image crop and focal point correct?",
  "Does it unmistakably feel like Blindspot?",
  "Does it look professionally designed?",
  "Is it too similar to recent posts?",
] as const;

export function carouselSequenceRole(index: number, total: number): CarouselSequenceRole {
  if (index <= 0) return "hook";
  if (index >= total - 1) return "close";
  if (index === total - 2 || index % 2 === 0) return "evidence";
  return "context";
}

export function carouselSequenceSurface(role: CarouselSequenceRole) {
  return role === "context" ? "paper" : role === "evidence" ? "ink" : "signal_wash";
}

function headlineOpening(headline: string) {
  return headline.toLowerCase().replace(/[^a-z0-9\s]/g, " ").trim().split(/\s+/).slice(0, 2).join(" ");
}

export function carouselStoryWarnings(slides: Array<{ headline: string; backgroundStyle?: string }>) {
  const warnings: string[] = [];
  const backgrounds = slides.map((slide, index) => slide.backgroundStyle ?? carouselSequenceSurface(carouselSequenceRole(index, slides.length)));
  if (new Set(backgrounds).size === 1) warnings.push("Every slide uses the same surface. Alternate at least one background treatment to create story rhythm.");
  const openings = slides.map((slide) => headlineOpening(slide.headline)).filter(Boolean);
  const repeatedOpenings = [...new Set(openings.filter((opening, index) => openings.indexOf(opening) !== index))];
  if (repeatedOpenings.length) warnings.push(`Slides repeat the same headline opening (${repeatedOpenings.join(", ")}). Reframe the hooks so each beat advances.`);
  return warnings;
}

export function compositionDiversityGuidance(recent: Array<{ compositionId?: string; backgroundStyle?: string; headline?: string }>) {
  const previousThree = recent.slice(0, 3);
  const counts = Object.fromEntries(Object.keys(compositions).map((id) => [id, recent.filter((item) => item.compositionId === id).length]));
  const minimum = Math.min(...Object.values(counts));
  return {
    avoidCompositionIds: [...new Set(previousThree.map((item) => item.compositionId).filter(Boolean))],
    avoidBackgroundStyles: recent.length >= 2 && recent.slice(0, 2).every((item) => item.backgroundStyle === recent[0]?.backgroundStyle) ? [recent[0]?.backgroundStyle].filter(Boolean) : [],
    avoidHeadlineOpenings: [...new Set(previousThree.map((item) => item.headline ? headlineOpening(item.headline) : "").filter(Boolean))],
    underusedCompositionIds: Object.entries(counts).filter(([, count]) => count === minimum).map(([id]) => id),
    instruction: "Choose by story purpose first. When more than one composition fits, prefer an underused option and avoid the recent surface and headline openings.",
  };
}

export function isCompositionId(value: string): value is CompositionId {
  return compositionIdSchema.safeParse(value).success;
}

export const compositionTemplateIds: Record<CompositionId, string> = {
  claim: "claim",
  real_but: "real-but",
  receipt: "receipt",
  whats_missing: "whats-missing",
  product: "product",
  explainer: "explainer",
};

export function compositionFromTemplateId(templateId: string): CompositionId | undefined {
  return (Object.entries(compositionTemplateIds) as Array<[CompositionId, string]>).find(([, id]) => id === templateId)?.[0];
}

export function recentCompositionWarnings(recent: Array<{ compositionId?: string; backgroundStyle?: string; headline?: string }>, candidate?: CompositionId) {
  const previousThree = recent.slice(0, 3);
  const warnings: string[] = [];
  if (candidate && previousThree.some((item) => item.compositionId === candidate)) warnings.push(`Composition ${candidate} appears in the previous three posts; choose another unless the story strongly requires it.`);
  const latestBackground = recent[0]?.backgroundStyle;
  if (latestBackground && recent.slice(0, 2).every((item) => item.backgroundStyle === latestBackground)) warnings.push(`The last two posts use ${latestBackground}; change the background treatment.`);
  const latestHeadline = recent[0]?.headline?.trim().toLowerCase();
  if (latestHeadline && recent.slice(1, 4).some((item) => item.headline?.trim().toLowerCase() === latestHeadline)) warnings.push("A recent post uses the same headline structure or exact headline; reframe the hook.");
  return warnings;
}

export function creativeContentWarnings(content: { headline: string; support: string; image?: { alt?: string }; evidence?: { source: string } }) {
  const warnings: string[] = [];
  const generic = /^(three checks\. better context\.?|see (the )?source behind the claim\.?|get better context\.?|look closer\.?)$/i;
  if (generic.test(content.headline.trim())) warnings.push("The headline is generic. Name the specific claim, event, source, date, location, feature, or contradiction.");
  if (/\b(better|smarter|powerful|seamless|game-changing)\b/i.test(content.headline) && !/\bthan\b/i.test(content.headline)) warnings.push("The headline uses an unqualified marketing adjective; replace it with a verifiable fact.");
  if (content.image && !content.image.alt?.trim()) warnings.push("The source image needs meaningful alt text describing what is shown.");
  if (content.evidence && /^(source|verified source|blindspot source check)$/i.test(content.evidence.source.trim())) warnings.push("Name the actual primary source instead of a generic evidence label.");
  if (content.support.trim().split(/\s+/).length > 28) warnings.push("Supporting copy is dense for a social card; keep only the context needed to understand the claim.");
  return warnings;
}
