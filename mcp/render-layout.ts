export function inspectRenderLayout(root: Element) {
  const rootRect = root.getBoundingClientRect();
  const regions = Array.from(root.querySelectorAll<HTMLElement>("[data-render-region]"));
  const outside = regions.filter((region) => {
    const rect = region.getBoundingClientRect();
    return rect.left < rootRect.left - 1 || rect.top < rootRect.top - 1 || rect.right > rootRect.right + 1 || rect.bottom > rootRect.bottom + 1;
  }).length;
  const overflowing = regions.filter((region) => {
    const style = getComputedStyle(region);
    const clipsX = ["hidden", "clip"].includes(style.overflowX);
    const clipsY = ["hidden", "clip"].includes(style.overflowY);
    return (clipsX && region.scrollWidth > region.clientWidth + 1) || (clipsY && region.scrollHeight > region.clientHeight + 1);
  }).length;
  return { outside, overflowing };
}
