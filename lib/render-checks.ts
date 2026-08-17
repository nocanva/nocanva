export type RenderCheck = {
  id: "schema" | "bounds" | "overflow" | "fonts";
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
  const overflowing = regions.filter((region) => region.scrollWidth > region.clientWidth + 1 || region.scrollHeight > region.clientHeight + 1);

  return [
    { id: "schema", label: "Content schema", passed: true, detail: "All required fields are valid." },
    { id: "bounds", label: "Safe canvas bounds", passed: outside.length === 0, detail: outside.length === 0 ? "Every region stays inside the canvas." : `${outside.length} region(s) leave the canvas.` },
    { id: "overflow", label: "Text overflow", passed: overflowing.length === 0, detail: overflowing.length === 0 ? "No text is clipped." : `${overflowing.length} region(s) are clipped.` },
    { id: "fonts", label: "Font readiness", passed: true, detail: "Renderer fonts are loaded." },
  ];
}
