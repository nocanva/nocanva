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
  const headlines = Array.from(root.querySelectorAll<HTMLElement>("[data-render-region='headline']"));
  const typographic = headlines.filter((headline) => {
    const text = headline.textContent?.trim() ?? "";
    if (!text) return false;
    const node = headline.firstChild;
    if (!node || node.nodeType !== Node.TEXT_NODE) return false;
    const lines: Array<{ top: number; value: string }> = [];
    const lineTolerance = Number.parseFloat(getComputedStyle(headline).fontSize) * .45;
    for (let index = 0; index < text.length; index += 1) {
      const range = document.createRange();
      range.setStart(node, index);
      range.setEnd(node, index + 1);
      const rect = range.getBoundingClientRect();
      const top = Math.round(rect.top);
      const current = lines.at(-1);
      if (!current || Math.abs(top - current.top) > lineTolerance) lines.push({ top, value: text[index] });
      else current.value += text[index];
    }
    const lineValues = lines.map((line) => line.value.trim()).filter(Boolean);
    const finalLine = lineValues.at(-1) ?? "";
    let splitToken = false;
    const tokenPattern = /[^\s\-/—–]+/g;
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
  const media = Array.from(root.querySelectorAll<HTMLElement>("[data-image-role]")).flatMap((figure) => {
    const stage = figure.querySelector<HTMLElement>(".composition-image-stage");
    const image = figure.querySelector<HTMLImageElement>("img");
    if (!stage || !image?.naturalWidth || !image.naturalHeight) return ["An image could not be measured after loading."];
    const frame = { width: stage.clientWidth, height: stage.clientHeight };
    if (!frame.width || !frame.height) return ["An image frame collapsed under layout pressure."];
    const zoom = Number(figure.dataset.imageZoom ?? 1);
    const fit = figure.dataset.imageFit;
    const role = figure.dataset.imageRole ?? "image";
    const baseScale = fit === "contain" ? Math.min(frame.width / image.naturalWidth, frame.height / image.naturalHeight) : Math.max(frame.width / image.naturalWidth, frame.height / image.naturalHeight);
    const renderedWidth = image.naturalWidth * baseScale * zoom;
    const renderedHeight = image.naturalHeight * baseScale * zoom;
    const visibleArea = Math.min(frame.width, renderedWidth) * Math.min(frame.height, renderedHeight);
    const coverage = visibleArea / (frame.width * frame.height);
    const retained = (frame.width * frame.height) / (renderedWidth * renderedHeight);
    const minimumCoverage = role === "evidence" ? .55 : role === "screenshot" ? .5 : .4;
    const label = role === "image" ? "Image" : `${role} image`;
    const issues: string[] = [];
    if (fit === "contain" && coverage < minimumCoverage) issues.push(`${label} occupies ${Math.round(coverage * 100)}% of its frame; increase zoom or use a tighter crop.`);
    if (fit === "cover" && retained < .14 && !figure.querySelector(".asset-highlight")) issues.push(`${label} retains only ${Math.round(retained * 100)}% of the source without a highlighted focal region; reduce zoom or adjust the crop.`);
    return issues;
  });
  const contrast = Array.from(root.querySelectorAll<HTMLElement>("[data-render-region='headline'], [data-render-region='eyebrow'], [data-render-region='support']")).filter((region) => {
    const rect = region.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0 || getComputedStyle(region).visibility === "hidden") return false;
    const foregroundValue = getComputedStyle(region).color;
    const foregroundRgb = foregroundValue.match(/^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:\s*[,/]\s*([\d.]+))?\s*\)$/i);
    const foregroundSrgb = foregroundValue.match(/^color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+))?\s*\)$/i);
    const foreground = foregroundRgb
      ? { channels: [Number(foregroundRgb[1]), Number(foregroundRgb[2]), Number(foregroundRgb[3])], alpha: foregroundRgb[4] == null ? 1 : Number(foregroundRgb[4]) }
      : foregroundSrgb ? { channels: [Number(foregroundSrgb[1]) * 255, Number(foregroundSrgb[2]) * 255, Number(foregroundSrgb[3]) * 255], alpha: foregroundSrgb[4] == null ? 1 : Number(foregroundSrgb[4]) } : null;
    let current: HTMLElement | null = region;
    let background: { channels: number[]; alpha: number } | null = null;
    while (current) {
      const backgroundValue = getComputedStyle(current).backgroundColor;
      const backgroundRgb = backgroundValue.match(/^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:\s*[,/]\s*([\d.]+))?\s*\)$/i);
      const backgroundSrgb = backgroundValue.match(/^color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+))?\s*\)$/i);
      const candidate = backgroundRgb
        ? { channels: [Number(backgroundRgb[1]), Number(backgroundRgb[2]), Number(backgroundRgb[3])], alpha: backgroundRgb[4] == null ? 1 : Number(backgroundRgb[4]) }
        : backgroundSrgb ? { channels: [Number(backgroundSrgb[1]) * 255, Number(backgroundSrgb[2]) * 255, Number(backgroundSrgb[3]) * 255], alpha: backgroundSrgb[4] == null ? 1 : Number(backgroundSrgb[4]) } : null;
      if (candidate && candidate.alpha >= .95) { background = candidate; break; }
      if (current === root) break;
      current = current.parentElement;
    }
    if (!foreground || !background) return true;
    const values = [foreground, background].map((color) => {
      const channels = color.channels.map((channel) => {
        const value = channel / 255;
        return value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4;
      });
      return .2126 * channels[0] + .7152 * channels[1] + .0722 * channels[2];
    });
    const lighter = Math.max(values[0], values[1]);
    const darker = Math.min(values[0], values[1]);
    return (lighter + .05) / (darker + .05) < 3;
  }).length;
  return { outside, overflowing, collisions, collapsed, typographic, undersized, media, contrast };
}
