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
    return headline.getBoundingClientRect().width < rootRect.width * .38 || lineValues.length > 5 || (text.includes(" ") && finalLine.length <= 3);
  }).length;
  return { outside, overflowing, collapsed, typographic };
}
