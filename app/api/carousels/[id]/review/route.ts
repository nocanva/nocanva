import { reviewCarousel, type CarouselRecord } from "../../../../../lib/server/carousel-repository";
import { authorizeApi } from "../../../../../lib/server/request-auth";
import type { DraftCheck } from "../../../../../lib/server/media-repository";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authorization = await authorizeApi(request);
  if (!authorization.ok) return authorization.response;
  try {
    const { id } = await params;
    const form = await request.formData();
    const expectedRevision = Number(form.get("expectedRevision"));
    const reviewer = form.get("reviewer");
    const checksValue = form.get("checks");
    if (!Number.isInteger(expectedRevision) || typeof reviewer !== "string" || typeof checksValue !== "string") return Response.json({ error: "expectedRevision, reviewer, checks, and slide PNGs are required." }, { status: 400 });
    const checks = parseChecks(checksValue);
    const slides = checks.map((slideChecks, index) => {
      const png = form.get(`slide-${index}`);
      if (!(png instanceof File) || png.type !== "image/png" || png.size > 10 * 1024 * 1024) throw new Error(`Slide ${index + 1} must be an image/png file no larger than 10 MB.`);
      return { png, checks: slideChecks };
    });
    const resolved = await Promise.all(slides.map(async (slide) => ({ png: await slide.png.arrayBuffer(), checks: slide.checks })));
    const carousel: CarouselRecord = await reviewCarousel(id, { expectedRevision, reviewer: authorization.principal.kind === "local" ? reviewer : authorization.principal.actor, notes: typeof form.get("notes") === "string" ? String(form.get("notes")) : null, slides: resolved }, authorization.principal.workspaceId);
    return Response.json({ carousel, review: carousel.review });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to review carousel.";
    return Response.json({ error: message }, { status: message.startsWith("Revision conflict") ? 409 : 400 });
  }
}

function parseChecks(value: string): DraftCheck[][] {
  const parsed: unknown = JSON.parse(value);
  if (!Array.isArray(parsed) || parsed.length < 3 || parsed.length > 7) throw new Error("Checks must describe 3 to 7 slides.");
  return parsed.map((slide, slideIndex) => {
    if (!Array.isArray(slide) || !slide.length) throw new Error(`Slide ${slideIndex + 1} review checks are required.`);
    return slide.map((check) => {
      if (!check || typeof check !== "object" || typeof (check as DraftCheck).id !== "string" || typeof (check as DraftCheck).passed !== "boolean" || typeof (check as DraftCheck).detail !== "string") throw new Error(`Slide ${slideIndex + 1} has an invalid review check.`);
      return check as DraftCheck;
    });
  });
}
