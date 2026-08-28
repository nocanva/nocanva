export function inspectRenderLayout(root: Element) {
  const rootRect = root.getBoundingClientRect();
  const regions = Array.from(root.querySelectorAll<HTMLElement>("[data-render-region], h1, h2, h3, p, ol, li, strong, figure"));
  const outside = regions.filter((region) => {
    const rect = region.getBoundingClientRect();
    return rect.left < rootRect.left - 1 || rect.top < rootRect.top - 1 || rect.right > rootRect.right + 1 || rect.bottom > rootRect.bottom + 1;
  }).length;
  const overflowing = regions.filter((region) => {
    if (region.getAttribute("data-render-region") === "media") return false;
    const style = getComputedStyle(region);
    const clipsX = ["hidden", "clip"].includes(style.overflowX);
    const clipsY = ["hidden", "clip"].includes(style.overflowY);
    return (region.scrollWidth > region.clientWidth + 1 && (clipsX || region.matches("h1,h2,h3,p,li"))) || (clipsY && region.scrollHeight > region.clientHeight + 1);
  }).length;
  const collapsed = regions.filter((region) => {
    const rect = region.getBoundingClientRect();
    const role = region.getAttribute("data-render-region");
    return (role === "brand-header" || role === "brand-footer") && rect.height < rootRect.height * 0.01;
  }).length;
  const zones = Array.from(root.querySelectorAll<HTMLElement>("[data-layout-zone]")).filter((zone) => !zone.querySelector("[data-layout-zone]"));
  let collisions = 0;
  for (let index = 0; index < zones.length; index += 1) {
    for (let otherIndex = index + 1; otherIndex < zones.length; otherIndex += 1) {
      const first = zones[index];
      const second = zones[otherIndex];
      if (first.closest("[data-render-region='content']") !== second.closest("[data-render-region='content']")) continue;
      const a = first.getBoundingClientRect();
      const b = second.getBoundingClientRect();
      const overlapX = Math.min(a.right, b.right) - Math.max(a.left, b.left);
      const overlapY = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
      if (overlapX > 2 && overlapY > 2) collisions += 1;
    }
  }
  const headlines = Array.from(root.querySelectorAll<HTMLElement>("[data-render-region='headline']"));
  const typographic = headlines.filter((headline) => {
    const text = headline.textContent?.trim() ?? "";
    if (!text) return false;
    const node = headline.firstChild;
    if (!node || node.nodeType !== Node.TEXT_NODE) return false;
    const lines = new Map<number, string>();
    for (let index = 0; index < text.length; index += 1) {
      const range = document.createRange();
      range.setStart(node, index);
      range.setEnd(node, index + 1);
      const rect = range.getBoundingClientRect();
      const top = Math.round(rect.top);
      lines.set(top, `${lines.get(top) ?? ""}${text[index]}`);
    }
    const lineValues = Array.from(lines.values()).map((line) => line.trim()).filter(Boolean);
    const finalLine = lineValues.at(-1) ?? "";
    let splitToken = false;
    const tokenPattern = /\S+/g;
    let token: RegExpExecArray | null;
    while ((token = tokenPattern.exec(text))) {
      const range = document.createRange();
      range.setStart(node, token.index);
      range.setEnd(node, token.index + token[0].length);
      if (new Set(Array.from(range.getClientRects()).map((rect) => Math.round(rect.top))).size > 1) splitToken = true;
    }
    return headline.getBoundingClientRect().width < rootRect.width * .38 || lineValues.length > 5 || splitToken || (text.includes(" ") && finalLine.length <= 4);
  }).length;
  const minimumBodySize = rootRect.width * (21 / 1080);
  const minimumUtilitySize = rootRect.width * (18 / 1080);
  const undersized = Array.from(root.querySelectorAll<HTMLElement>([
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
  }).length;
  const contrast = Array.from(root.querySelectorAll<HTMLElement>("[data-render-region='headline'], [data-render-region='eyebrow']")).filter((region) => {
    const foregroundMatch = getComputedStyle(region).color.match(/^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:\s*[,/]\s*([\d.]+))?\s*\)$/i);
    let current: HTMLElement | null = region;
    let backgroundMatch: RegExpMatchArray | null = null;
    while (current) {
      const candidate = getComputedStyle(current).backgroundColor.match(/^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:\s*[,/]\s*([\d.]+))?\s*\)$/i);
      if (candidate && (candidate[4] == null || Number(candidate[4]) >= .95)) { backgroundMatch = candidate; break; }
      if (current === root) break;
      current = current.parentElement;
    }
    if (!foregroundMatch || !backgroundMatch) return true;
    const values = [foregroundMatch, backgroundMatch].map((match) => {
      const channels = [Number(match[1]), Number(match[2]), Number(match[3])].map((channel) => {
        const value = channel / 255;
        return value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4;
      });
      return .2126 * channels[0] + .7152 * channels[1] + .0722 * channels[2];
    });
    const lighter = Math.max(values[0], values[1]);
    const darker = Math.min(values[0], values[1]);
    return (lighter + .05) / (darker + .05) < 3;
  }).length;
  return { outside, overflowing, collisions, collapsed, typographic, undersized, contrast };
}
