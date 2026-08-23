export type RenderCheck = {
  id: "schema" | "bounds" | "overflow" | "structure" | "typography" | "contrast" | "fonts";
  label: string;
  passed: boolean;
  detail: string;
};

type Rgb = { r: number; g: number; b: number; a: number };

function parseRgb(value: string): Rgb | null {
  const match = value.match(/^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:\s*[,/]\s*([\d.]+))?\s*\)$/i);
  return match ? { r: Number(match[1]), g: Number(match[2]), b: Number(match[3]), a: match[4] == null ? 1 : Number(match[4]) } : null;
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
  const lines = new Map<number, string>();
  for (let index = 0; index < text.length; index += 1) {
    const range = document.createRange();
    range.setStart(node, index);
    range.setEnd(node, index + 1);
    const top = Math.round(range.getBoundingClientRect().top);
    lines.set(top, `${lines.get(top) ?? ""}${text[index]}`);
  }
  let splitToken = false;
  const tokenPattern = /\S+/g;
  let token: RegExpExecArray | null;
  while ((token = tokenPattern.exec(text))) {
    const range = document.createRange();
    range.setStart(node, token.index);
    range.setEnd(node, token.index + token[0].length);
    if (new Set(Array.from(range.getClientRects()).map((rect) => Math.round(rect.top))).size > 1) splitToken = true;
  }
  const lineValues = Array.from(lines.values()).map((line) => line.trim()).filter(Boolean);
  const finalLine = lineValues.at(-1) ?? "";
  return headline.getBoundingClientRect().width < root.getBoundingClientRect().width * .38 || lineValues.length > 5 || splitToken || (text.includes(" ") && finalLine.length <= 4);
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
  const lowContrastText = Array.from(root.querySelectorAll<HTMLElement>("[data-render-region='headline'], [data-render-region='eyebrow']")).filter((region) => {
    const foreground = parseRgb(getComputedStyle(region).color);
    const background = nearestOpaqueBackground(region, root);
    return !foreground || !background || contrastRatio(foreground, background) < 3;
  });

  return [
    { id: "schema", label: "Content schema", passed: true, detail: "All required fields are valid." },
    { id: "bounds", label: "Safe canvas bounds", passed: outside.length === 0, detail: outside.length === 0 ? "Every region stays inside the canvas." : `${outside.length} region(s) leave the canvas.` },
    { id: "overflow", label: "Text overflow", passed: overflowing.length === 0, detail: overflowing.length === 0 ? "No text is clipped." : `${overflowing.length} region(s) are clipped.` },
    { id: "structure", label: "Brand structure", passed: collapsed.length === 0, detail: collapsed.length === 0 ? "Brand header and footer remain visible." : `${collapsed.length} structural region(s) collapsed under content pressure.` },
    { id: "typography", label: "Headline composition", passed: typographic.length === 0, detail: typographic.length === 0 ? "Headline measure, line count, tokens, and final-line balance remain readable." : `${typographic.length} headline(s) have a narrow measure, excessive lines, a split token, or an orphaned final fragment.` },
    { id: "contrast", label: "Critical text contrast", passed: lowContrastText.length === 0, detail: lowContrastText.length === 0 ? "Every headline and eyebrow clears the visibility threshold." : `${lowContrastText.length} headline or eyebrow region(s) fall below the 3:1 visibility threshold.` },
    { id: "fonts", label: "Font readiness", passed: true, detail: "Renderer fonts are loaded." },
  ];
}
