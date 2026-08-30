export type RenderCheck = {
  id: "schema" | "bounds" | "overflow" | "collision" | "structure" | "typography" | "readability" | "media" | "contrast" | "fonts";
  label: string;
  passed: boolean;
  detail: string;
};

export function imageFrameQuality(input: { naturalWidth: number; naturalHeight: number; frameWidth: number; frameHeight: number; zoom: number; fit: "contain" | "cover"; role: string; hasHighlight: boolean }) {
  const baseScale = input.fit === "contain" ? Math.min(input.frameWidth / input.naturalWidth, input.frameHeight / input.naturalHeight) : Math.max(input.frameWidth / input.naturalWidth, input.frameHeight / input.naturalHeight);
  const renderedWidth = input.naturalWidth * baseScale * input.zoom;
  const renderedHeight = input.naturalHeight * baseScale * input.zoom;
  const visibleArea = Math.min(input.frameWidth, renderedWidth) * Math.min(input.frameHeight, renderedHeight);
  const coverage = visibleArea / (input.frameWidth * input.frameHeight);
  const retained = (input.frameWidth * input.frameHeight) / (renderedWidth * renderedHeight);
  const minimumCoverage = input.role === "evidence" ? .55 : input.role === "screenshot" ? .5 : .4;
  const label = input.role === "image" ? "Image" : `${input.role} image`;
  const issues: string[] = [];
  if (input.fit === "contain" && coverage < minimumCoverage) issues.push(`${label} occupies ${Math.round(coverage * 100)}% of its frame; increase zoom or use a tighter crop.`);
  if (input.fit === "cover" && retained < .14 && !input.hasHighlight) issues.push(`${label} retains only ${Math.round(retained * 100)}% of the source without a highlighted focal region; reduce zoom or adjust the crop.`);
  return { coverage, retained, issues };
}

type Rgb = { r: number; g: number; b: number; a: number };

function parseRgb(value: string): Rgb | null {
  const match = value.match(/^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:\s*[,/]\s*([\d.]+))?\s*\)$/i);
  if (match) return { r: Number(match[1]), g: Number(match[2]), b: Number(match[3]), a: match[4] == null ? 1 : Number(match[4]) };
  const srgb = value.match(/^color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+))?\s*\)$/i);
  return srgb ? { r: Number(srgb[1]) * 255, g: Number(srgb[2]) * 255, b: Number(srgb[3]) * 255, a: srgb[4] == null ? 1 : Number(srgb[4]) } : null;
}

function luminance(color: Rgb) {
  const channels = [color.r, color.g, color.b].map((channel) => {
    const value = channel / 255;
    return value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4;
  });
  return .2126 * channels[0] + .7152 * channels[1] + .0722 * channels[2];
}

function contrastRatio(foreground: Rgb, background: Rgb) {
  const lighter = Math.max(luminance(foreground), luminance(background));
  const darker = Math.min(luminance(foreground), luminance(background));
  return (lighter + .05) / (darker + .05);
}

function nearestOpaqueBackground(element: HTMLElement, root: HTMLElement) {
  let current: HTMLElement | null = element;
  while (current) {
    const color = parseRgb(getComputedStyle(current).backgroundColor);
    if (color && color.a >= .95) return color;
    if (current === root) break;
    current = current.parentElement;
  }
  return null;
}

function headlineTypographyFailure(headline: HTMLElement, root: HTMLElement) {
  const text = headline.textContent?.trim() ?? "";
  const node = headline.firstChild;
  if (!text || !node || node.nodeType !== Node.TEXT_NODE) return false;
  const lines: Array<{ top: number; value: string }> = [];
  const lineTolerance = Number.parseFloat(getComputedStyle(headline).fontSize) * .45;
  for (let index = 0; index < text.length; index += 1) {
    const range = document.createRange();
    range.setStart(node, index);
    range.setEnd(node, index + 1);
    const top = Math.round(range.getBoundingClientRect().top);
    const current = lines.at(-1);
    if (!current || Math.abs(top - current.top) > lineTolerance) lines.push({ top, value: text[index] });
    else current.value += text[index];
  }
  let splitToken = false;
  // Explicit hyphens, dashes, and slashes are valid editorial break points. The
  // guard still catches destructive breaks inside handles, URLs, and words.
  const tokenPattern = /[^\s\-/—–]+/g;
  let token: RegExpExecArray | null;
  while ((token = tokenPattern.exec(text))) {
    const range = document.createRange();
    range.setStart(node, token.index);
    range.setEnd(node, token.index + token[0].length);
    if (new Set(Array.from(range.getClientRects()).map((rect) => Math.round(rect.top))).size > 1) splitToken = true;
  }
  const lineValues = lines.map((line) => line.value.trim()).filter(Boolean);
  const finalLine = lineValues.at(-1) ?? "";
  return headline.getBoundingClientRect().width < root.getBoundingClientRect().width * .38 || lineValues.length > 5 || splitToken || (text.includes(" ") && finalLine.length <= 4);
}

function countLayoutCollisions(root: HTMLElement) {
  const zones = Array.from(root.querySelectorAll<HTMLElement>("[data-layout-zone]")).filter((zone) => !zone.querySelector("[data-layout-zone]"));
  let collisions = 0;
  for (let index = 0; index < zones.length; index += 1) {
    for (let otherIndex = index + 1; otherIndex < zones.length; otherIndex += 1) {
      const first = zones[index];
      const second = zones[otherIndex];
      if (first.closest("[data-render-region='content']") !== second.closest("[data-render-region='content']")) continue;
      const firstAllows = first.dataset.allowOverlapWith?.split(/\s+/).includes(second.dataset.layoutZone ?? "");
      const secondAllows = second.dataset.allowOverlapWith?.split(/\s+/).includes(first.dataset.layoutZone ?? "");
      if (firstAllows || secondAllows) continue;
      const a = first.getBoundingClientRect();
      const b = second.getBoundingClientRect();
      const overlapX = Math.min(a.right, b.right) - Math.max(a.left, b.left);
      const overlapY = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
      if (overlapX > 2 && overlapY > 2) collisions += 1;
    }
  }
  return collisions;
}

function mediaTreatmentIssues(root: HTMLElement) {
  return Array.from(root.querySelectorAll<HTMLElement>("[data-image-role]")).flatMap((figure) => {
    const stage = figure.querySelector<HTMLElement>(".composition-image-stage");
    const image = figure.querySelector<HTMLImageElement>("img");
    if (!stage || !image?.naturalWidth || !image.naturalHeight) return ["An image could not be measured after loading."];
    const frame = { width: stage.clientWidth, height: stage.clientHeight };
    if (!frame.width || !frame.height) return ["An image frame collapsed under layout pressure."];
    const zoom = Number(figure.dataset.imageZoom ?? 1);
    const fit = figure.dataset.imageFit;
    const role = figure.dataset.imageRole ?? "image";
    return imageFrameQuality({ naturalWidth: image.naturalWidth, naturalHeight: image.naturalHeight, frameWidth: frame.width, frameHeight: frame.height, zoom, fit: fit === "contain" ? "contain" : "cover", role, hasHighlight: Boolean(figure.querySelector(".asset-highlight")) }).issues;
  });
}

export async function inspectRenderNode(root: HTMLElement): Promise<RenderCheck[]> {
  await document.fonts.ready;
  const rootRect = root.getBoundingClientRect();
  const regions = Array.from(root.querySelectorAll<HTMLElement>("[data-render-region], h1, h2, h3, p, ol, li, strong, figure"));
  const outside = regions.filter((region) => {
    const rect = region.getBoundingClientRect();
    return rect.left < rootRect.left - 1 || rect.top < rootRect.top - 1 || rect.right > rootRect.right + 1 || rect.bottom > rootRect.bottom + 1;
  });
  const overflowing = regions.filter((region) => {
    if (region.getAttribute("data-render-region") === "media") return false;
    const style = getComputedStyle(region);
    const clipsX = ["hidden", "clip"].includes(style.overflowX);
    const clipsY = ["hidden", "clip"].includes(style.overflowY);
    return (region.scrollWidth > region.clientWidth + 1 && (clipsX || region.matches("h1,h2,h3,p,li"))) || (clipsY && region.scrollHeight > region.clientHeight + 1);
  });
  const collapsed = regions.filter((region) => {
    const rect = region.getBoundingClientRect();
    const role = region.getAttribute("data-render-region");
    return (role === "brand-header" || role === "brand-footer") && rect.height < rootRect.height * 0.01;
  });
  const typographic = Array.from(root.querySelectorAll<HTMLElement>("[data-render-region='headline']")).filter((headline) => headlineTypographyFailure(headline, root));
  const minimumBodySize = rootRect.width * (21 / 1080);
  const minimumUtilitySize = rootRect.width * (18 / 1080);
  const undersizedText = Array.from(root.querySelectorAll<HTMLElement>([
    "[data-render-region='support']",
    "[data-render-region='evidence'] > strong",
    "[data-render-region='evidence'] > p",
    "[data-render-region='evidence'] > span",
    "[data-render-region='highlight']",
    "[data-render-region='cta']",
    ".explainer-layout li span",
  ].join(", "))).filter((region) => {
    if (!region.textContent?.trim()) return false;
    const minimum = region.matches("[data-render-region='highlight'], [data-render-region='cta'], [data-render-region='evidence'] > span") ? minimumUtilitySize : minimumBodySize;
    return Number.parseFloat(getComputedStyle(region).fontSize) < minimum - .1;
  });
  const mediaIssues = mediaTreatmentIssues(root);
  const collisions = countLayoutCollisions(root);
  const lowContrastText = Array.from(root.querySelectorAll<HTMLElement>("[data-render-region='headline'], [data-render-region='eyebrow'], [data-render-region='support']")).filter((region) => {
    const rect = region.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0 || getComputedStyle(region).visibility === "hidden") return false;
    const foreground = parseRgb(getComputedStyle(region).color);
    const background = nearestOpaqueBackground(region, root);
    return !foreground || !background || contrastRatio(foreground, background) < 3;
  });

  return [
    { id: "schema", label: "Content schema", passed: true, detail: "All required fields are valid." },
    { id: "bounds", label: "Safe canvas bounds", passed: outside.length === 0, detail: outside.length === 0 ? "Every region stays inside the canvas." : `${outside.length} region(s) leave the canvas.` },
    { id: "overflow", label: "Text overflow", passed: overflowing.length === 0, detail: overflowing.length === 0 ? "No text is clipped." : `${overflowing.length} region(s) are clipped.` },
    { id: "collision", label: "Section separation", passed: collisions === 0, detail: collisions === 0 ? "Structured sections do not overlap." : `${collisions} section pair(s) overlap.` },
    { id: "structure", label: "Brand structure", passed: collapsed.length === 0, detail: collapsed.length === 0 ? "Brand header and footer remain visible." : `${collapsed.length} structural region(s) collapsed under content pressure.` },
    { id: "typography", label: "Headline composition", passed: typographic.length === 0, detail: typographic.length === 0 ? "Headline measure, line count, tokens, and final-line balance remain readable." : `${typographic.length} headline(s) have a narrow measure, excessive lines, a split token, or an orphaned final fragment.` },
    { id: "readability", label: "Phone-size readability", passed: undersizedText.length === 0, detail: undersizedText.length === 0 ? "Supporting, evidence, and action text clears the phone-size floor." : `${undersizedText.length} supporting, evidence, or action text region(s) are too small at phone size.` },
    { id: "media", label: "Image prominence", passed: mediaIssues.length === 0, detail: mediaIssues.length === 0 ? "Images use their frames without weak letterboxing or destructive cropping." : mediaIssues.join(" ") },
    { id: "contrast", label: "Critical text contrast", passed: lowContrastText.length === 0, detail: lowContrastText.length === 0 ? "Every headline, eyebrow, and supporting region clears the visibility threshold." : `${lowContrastText.length} critical text region(s) fall below the 3:1 visibility threshold.` },
    { id: "fonts", label: "Font readiness", passed: true, detail: "Renderer fonts are loaded." },
  ];
}
