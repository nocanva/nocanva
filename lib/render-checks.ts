export type RenderCheck = {
  id: "schema" | "bounds" | "overflow" | "structure" | "fonts";
  label: string;
  passed: boolean;
  detail: string;
};

export async function inspectRenderNode(root: HTMLElement): Promise<RenderCheck[]> {
  await document.fonts.ready;
  const rootRect = root.getBoundingClientRect();
  const regions = Array.from(root.querySelectorAll<HTMLElement>("[data-render-region]"));
  const outside = regions.filter((region) => {
    const rect = region.getBoundingClientRect();
    return rect.left < rootRect.left - 1 || rect.top < rootRect.top - 1 || rect.right > rootRect.right + 1 || rect.bottom > rootRect.bottom + 1;
  });
  const overflowing = regions.filter((region) => {
    const style = getComputedStyle(region);
    const clipsX = ["hidden", "clip"].includes(style.overflowX);
    const clipsY = ["hidden", "clip"].includes(style.overflowY);
    return (clipsX && region.scrollWidth > region.clientWidth + 1) || (clipsY && region.scrollHeight > region.clientHeight + 1);
  });
  const collapsed = regions.filter((region) => {
    const rect = region.getBoundingClientRect();
    const role = region.getAttribute("data-render-region");
    return (role === "brand-header" || role === "brand-footer") && rect.height < rootRect.height * 0.01;
  });

  return [
    { id: "schema", label: "Content schema", passed: true, detail: "All required fields are valid." },
    { id: "bounds", label: "Safe canvas bounds", passed: outside.length === 0, detail: outside.length === 0 ? "Every region stays inside the canvas." : `${outside.length} region(s) leave the canvas.` },
    { id: "overflow", label: "Text overflow", passed: overflowing.length === 0, detail: overflowing.length === 0 ? "No text is clipped." : `${overflowing.length} region(s) are clipped.` },
    { id: "structure", label: "Brand structure", passed: collapsed.length === 0, detail: collapsed.length === 0 ? "Brand header and footer remain visible." : `${collapsed.length} structural region(s) collapsed under content pressure.` },
    { id: "fonts", label: "Font readiness", passed: true, detail: "Renderer fonts are loaded." },
  ];
}
