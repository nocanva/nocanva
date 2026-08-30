"use client";

import { useRef, useState } from "react";
import { toPng } from "html-to-image";
import { useRouter } from "next/navigation";
import { Archive, ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Check, Download, Plus, RotateCcw, Save, ScanSearch, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { carouselUpdateInputSchema, formats, type PostContent } from "../../../lib/media";
import type { CarouselRecord, CarouselRenderRecord, CarouselRevisionRecord } from "../../../lib/server/carousel-repository";
import type { BrandRecord, TemplateRecord } from "../../../lib/server/media-repository";
import type { WorkspaceAsset } from "../../../lib/server/asset-repository";
import { inspectRenderNode } from "../../../lib/render-checks";
import { carouselSequenceRole } from "../../../lib/compositions";
import { PostArtwork } from "../../post-artwork";
import { AppShell } from "../../workspace-shell";
import { WorkflowProgress } from "../../workflow-progress";

export function CarouselWorkspace({ initialCarousel, initialRevisions, initialAssets, initialRender, brand, template }: { initialCarousel: CarouselRecord; initialRevisions: CarouselRevisionRecord[]; initialAssets: WorkspaceAsset[]; initialRender: CarouselRenderRecord | null; brand: BrandRecord; template: TemplateRecord }) {
  const router = useRouter();
  const [carousel, setCarousel] = useState(initialCarousel);
  const [format, setFormat] = useState(initialCarousel.format);
  const [slides, setSlides] = useState<PostContent[]>(initialCarousel.slides);
  const [activeSlide, setActiveSlide] = useState(0);
  const [prompt, setPrompt] = useState(initialCarousel.prompt ?? "");
  const [notice, setNotice] = useState("Carousel is ready");
  const [busy, setBusy] = useState(false);
  const [revisions, setRevisions] = useState(initialRevisions);
  const [assets, setAssets] = useState(initialAssets);
  const [renderRecord, setRenderRecord] = useState(initialRender);
  const exportRefs = useRef<Array<HTMLElement | null>>([]);
  const updateInput = { expectedRevision: carousel.currentRevision, brandId: carousel.brandId, templateId: carousel.templateId, format, slides, prompt };
  const valid = carouselUpdateInputSchema.safeParse(updateInput).success;
  const current = slides[activeSlide] ?? slides[0];
  const currentRender = renderRecord?.carouselRevisionId === carousel.revisionId ? renderRecord : null;
  const hasChanges = JSON.stringify({ format, slides, prompt }) !== JSON.stringify({ format: carousel.format, slides: carousel.slides, prompt: carousel.prompt ?? "" });

  async function request(path: string, init: RequestInit) {
    const response = await fetch(path, init);
    const data = await response.json() as { carousel?: CarouselRecord; render?: CarouselRenderRecord; error?: string };
    if (!response.ok) throw new Error(data.error ?? "NoCanva could not complete the request.");
    if (data.carousel) setCarousel(data.carousel);
    return data;
  }

  function updateSlide(field: keyof PostContent, value: string) {
    setSlides((items) => items.map((slide, index) => index === activeSlide ? { ...slide, [field]: value } : slide));
  }

  function updateCurrent(values: Partial<PostContent>) {
    setSlides((items) => items.map((slide, index) => index === activeSlide ? { ...slide, ...values } : slide));
  }

  async function uploadImage(file: File | undefined) {
    if (!file) return;
    if (file.size > 750 * 1024) return setNotice("Compress the image below 750 KB before upload.");
    setBusy(true);
    try {
      const form = new FormData(); form.set("name", file.name); form.set("image", file);
      const response = await fetch("/api/assets", { method: "POST", body: form });
      const data = await response.json() as { asset?: WorkspaceAsset; error?: string };
      if (!response.ok || !data.asset) throw new Error(data.error ?? "Image upload failed.");
      setAssets((items) => [data.asset!, ...items.filter((asset) => asset.id !== data.asset!.id)]);
      updateCurrent({ image: { assetId: data.asset.id, alt: "", fit: "cover", focalPoint: { x: .5, y: .5 }, zoom: 1 } });
      setNotice(`Image added to slide ${activeSlide + 1}. Save the carousel to create a revision.`);
    } catch (error) { setNotice(error instanceof Error ? error.message : "Image upload failed."); }
    finally { setBusy(false); }
  }

  function addSlide() {
    if (slides.length >= 7) return;
    setSlides((items) => [...items, { eyebrow: `SLIDE ${items.length + 1}`, headline: "Continue the story", support: "Add the next verified point in the narrative." }]);
    setActiveSlide(slides.length);
  }

  function removeSlide() {
    if (slides.length <= 3) return;
    setSlides((items) => items.filter((_, index) => index !== activeSlide));
    setActiveSlide((index) => Math.max(0, Math.min(index, slides.length - 2)));
  }

  function moveSlide(direction: -1 | 1) {
    const target = activeSlide + direction;
    if (target < 0 || target >= slides.length) return;
    setSlides((items) => {
      const next = [...items];
      [next[activeSlide], next[target]] = [next[target], next[activeSlide]];
      return next;
    });
    setActiveSlide(target);
  }

  async function save() {
    if (!valid) return setNotice("Fix every structured slide before saving.");
    setBusy(true);
    try {
      await request(`/api/carousels/${carousel.id}`, { method: "PUT", headers: { "content-type": "application/json", "x-nocanva-created-by": "human:workspace" }, body: JSON.stringify(updateInput) });
      setNotice("Saved as a new revision. Previous review and approval no longer apply.");
      const historyResponse = await fetch(`/api/carousels/${carousel.id}/revisions`);
      if (historyResponse.ok) setRevisions((await historyResponse.json() as { revisions: CarouselRevisionRecord[] }).revisions);
      router.refresh();
    } catch (error) { setNotice(error instanceof Error ? error.message : "Save failed."); }
    finally { setBusy(false); }
  }

  async function review() {
    if (exportRefs.current.length < slides.length || exportRefs.current.some((node) => !node)) return setNotice("Every slide must be available before review.");
    setBusy(true);
    try {
      const dimensions = formats[format];
      const checks = [];
      const pngs: Blob[] = [];
      for (let index = 0; index < slides.length; index += 1) {
        const node = exportRefs.current[index];
        if (!node) throw new Error(`Slide ${index + 1} is unavailable.`);
        checks.push(await inspectRenderNode(node));
        const dataUrl = await toPng(node, { width: dimensions.width, height: dimensions.height, canvasWidth: dimensions.width, canvasHeight: dimensions.height, pixelRatio: 1, cacheBust: false, backgroundColor: brand.config.colors.paper });
        pngs.push(await fetch(dataUrl).then((response) => response.blob()));
      }
      const form = new FormData();
      form.set("expectedRevision", String(carousel.currentRevision));
      form.set("reviewer", "human:workspace");
      form.set("checks", JSON.stringify(checks));
      pngs.forEach((png, index) => form.set(`slide-${index}`, new File([png], `slide-${String(index + 1).padStart(2, "0")}.png`, { type: "image/png" })));
      await request(`/api/carousels/${carousel.id}/review`, { method: "POST", body: form });
      setNotice(checks.every((slide) => slide.every((check) => check.passed)) ? "Mechanical review passed. Visually inspect every slide before approval." : "At least one slide needs layout changes.");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Review failed."); }
    finally { setBusy(false); }
  }

  async function approve(decision: "approved" | "rejected") {
    setBusy(true);
    try {
      await request(`/api/carousels/${carousel.id}/approval`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ expectedRevision: carousel.currentRevision, actor: "human:workspace", decision }) });
      setNotice(decision === "approved" ? "The exact reviewed slide set is approved." : "Changes requested.");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Decision failed."); }
    finally { setBusy(false); }
  }

  async function render() {
    if (carousel.status !== "approved" && carousel.status !== "rendered") return;
    if (currentRender) {
      window.location.href = `/carousel-renders/${currentRender.id}`;
      return;
    }
    setBusy(true);
    try {
      const data = await request(`/api/carousels/${carousel.id}/render`, { method: "POST", headers: { "x-nocanva-created-by": "human:workspace" } });
      if (data.render) {
        setRenderRecord(data.render);
        window.location.href = `/carousel-renders/${data.render.id}`;
      }
    } catch (error) { setNotice(error instanceof Error ? error.message : "Render failed."); setBusy(false); }
  }

  async function archive() {
    setBusy(true);
    try {
      await request(`/api/carousels/${carousel.id}/archive`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ archived: !carousel.archivedAt }) });
      setNotice(carousel.archivedAt ? "Carousel restored." : "Carousel archived without deleting its history.");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Archive failed."); }
    finally { setBusy(false); }
  }

  if (!current) return null;
  const payload = { brandId: carousel.brandId, templateId: carousel.templateId, format, content: current };
  return <AppShell><section className="draft-workspace page-frame">
    <div className="draft-workspace-heading"><div><div className="workspace-title-meta"><p className="kicker">Stable carousel · revision {carousel.currentRevision}</p><Badge variant="outline" className={hasChanges ? "change-badge dirty" : "change-badge"}>{hasChanges ? "Unsaved changes" : "Revision saved"}</Badge></div><h1>{slides[0].headline}</h1><p className="workspace-notice" aria-live="polite">{notice}</p></div><span className={`draft-status ${carousel.status}`}>{carousel.archivedAt ? "archived" : carousel.status.replace("_", " ")}</span></div>
    <WorkflowProgress status={carousel.status} archived={Boolean(carousel.archivedAt)} />
    <div className="draft-workspace-grid"><section className="draft-form panel">
      <div className="carousel-editor-heading"><div><span className="section-overline">Story sequence</span><strong>{slides.length} slides</strong></div><Button disabled={slides.length >= 7} onClick={addSlide} size="sm" variant="outline" type="button"><Plus />Add slide</Button></div>
      <div className="carousel-tabs" aria-label="Carousel slides">{slides.map((slide, index) => <button aria-label={`Edit slide ${index + 1}: ${slide.headline}`} className={index === activeSlide ? "active" : ""} key={index} onClick={() => setActiveSlide(index)} type="button"><span>{String(index + 1).padStart(2, "0")}</span><strong>{slide.headline}</strong><small>{carouselSequenceRole(index, slides.length)} · {(slide.visualDirection ?? "editorial").replace("_", " ")}</small></button>)}</div>
      <div className="carousel-slide-actions"><Button aria-label="Move slide earlier" disabled={activeSlide === 0} onClick={() => moveSlide(-1)} size="icon-sm" variant="outline" type="button"><ArrowUp /></Button><Button aria-label="Move slide later" disabled={activeSlide === slides.length - 1} onClick={() => moveSlide(1)} size="icon-sm" variant="outline" type="button"><ArrowDown /></Button><span>Slide {activeSlide + 1} selected</span><Button disabled={slides.length <= 3} onClick={removeSlide} size="sm" variant="ghost" type="button"><Trash2 />Remove</Button></div>
      <label className="field"><span>Eyebrow <small>{current.eyebrow.length}/28</small></span><input maxLength={28} value={current.eyebrow} onChange={(event) => updateSlide("eyebrow", event.target.value)} /></label>
      <label className="field"><span>Headline <small>{current.headline.length}/84</small></span><textarea maxLength={84} rows={3} value={current.headline} onChange={(event) => updateSlide("headline", event.target.value)} /></label>
      <label className="field"><span>Supporting copy <small>{current.support.length}/150</small></span><textarea maxLength={150} rows={4} value={current.support} onChange={(event) => updateSlide("support", event.target.value)} /></label>
      <fieldset className="image-editor"><legend>Slide image</legend>
        <label className="image-upload"><span>Upload PNG or JPEG · max 750 KB</span><input accept="image/png,image/jpeg" disabled={busy} onChange={(event) => uploadImage(event.target.files?.[0])} type="file" /></label>
        {assets.length > 0 && <label className="field"><span>Workspace image</span><select value={current.image?.assetId ?? ""} onChange={(event) => updateCurrent({ image: event.target.value ? { assetId: event.target.value, alt: "", fit: "cover", focalPoint: { x: .5, y: .5 }, zoom: 1 } : undefined })}><option value="">No image</option>{assets.map((asset) => <option key={asset.id} value={asset.id}>{asset.name} · {asset.width}×{asset.height}</option>)}</select></label>}
        {current.image && <div className="crop-controls">
          <label><span>Fit</span><select value={current.image.fit} onChange={(event) => updateCurrent({ image: { ...current.image!, fit: event.target.value === "contain" ? "contain" : "cover" } })}><option value="cover">Fill frame</option><option value="contain">Fit whole image</option></select></label>
          <label><span>Horizontal focus</span><input max="1" min="0" step="0.01" type="range" value={current.image.focalPoint.x} onChange={(event) => updateCurrent({ image: { ...current.image!, focalPoint: { ...current.image!.focalPoint, x: Number(event.target.value) } } })} /></label>
          <label><span>Vertical focus</span><input max="1" min="0" step="0.01" type="range" value={current.image.focalPoint.y} onChange={(event) => updateCurrent({ image: { ...current.image!, focalPoint: { ...current.image!.focalPoint, y: Number(event.target.value) } } })} /></label>
          <label><span>Zoom · {current.image.zoom.toFixed(2)}×</span><input max="3" min="1" step="0.05" type="range" value={current.image.zoom} onChange={(event) => updateCurrent({ image: { ...current.image!, zoom: Number(event.target.value) } })} /></label>
          <label className="field"><span>Alt text</span><input maxLength={160} value={current.image.alt} onChange={(event) => updateCurrent({ image: { ...current.image!, alt: event.target.value } })} /></label>
          <button onClick={() => updateCurrent({ image: undefined })} type="button">Remove from slide</button>
        </div>}
      </fieldset>
      <label className="field"><span>Source prompt</span><textarea maxLength={500} rows={3} value={prompt} onChange={(event) => setPrompt(event.target.value)} /></label>
      <div className="format-switch" aria-label="Carousel format"><button className={format === "portrait" ? "active" : ""} onClick={() => setFormat("portrait")} type="button">4:5 portrait</button><button className={format === "square" ? "active" : ""} onClick={() => setFormat("square")} type="button">1:1 square</button></div>
      <Button className="workspace-save-button" disabled={busy || !valid || !hasChanges || Boolean(carousel.archivedAt)} onClick={save} size="lg" type="button"><Save />{busy ? "Working…" : hasChanges ? "Save carousel revision" : "Revision saved"}</Button>
      <dl className="draft-meta"><div><dt>Brand</dt><dd>{carousel.brandName}</dd></div><div><dt>Template</dt><dd>{carousel.templateName} v{carousel.templateVersion}</dd></div><div><dt>Slides</dt><dd>{slides.length}</dd></div><div><dt>Approval</dt><dd>{carousel.approvalPolicy === "human_required" ? "Human required" : "Agent allowed"}</dd></div></dl>
      <div className="revision-history"><p className="section-label">Revision history</p>{revisions.map((revision) => <div key={revision.id}><strong>v{revision.revision}</strong><span>{revision.slides.length} slides · {revision.createdBy}</span><time>{new Date(revision.createdAt).toISOString().replace("T", " ").slice(0, 16)} UTC</time></div>)}</div>
    </section><aside className="draft-preview-panel">
      <div className="carousel-preview-label"><Button aria-label="Previous slide" disabled={activeSlide === 0} onClick={() => setActiveSlide((value) => value - 1)} size="icon-sm" variant="outline"><ArrowLeft /></Button><span>Slide {activeSlide + 1} of {slides.length}</span><strong>{(current.visualDirection ?? "editorial").replace("_", " ")} · template v{carousel.templateVersion}</strong><Button aria-label="Next slide" disabled={activeSlide === slides.length - 1} onClick={() => setActiveSlide((value) => value + 1)} size="icon-sm" variant="outline"><ArrowRight /></Button></div>
      <div className="canvas-stage"><PostArtwork payload={payload} brandConfig={brand.config} template={template} sequence={{ index: activeSlide, total: slides.length }} /></div>
      {slides.map((content, index) => <div className="export-surface" aria-hidden="true" key={index}><PostArtwork ref={(node) => { exportRefs.current[index] = node; }} payload={{ brandId: carousel.brandId, templateId: carousel.templateId, format, content }} brandConfig={brand.config} template={template} mode="export" sequence={{ index, total: slides.length }} /></div>)}
      <div className="workflow-action-card"><div><span className="section-overline">Next action</span><strong>{carousel.status === "draft" ? "Review the complete story" : carousel.status === "in_review" ? "Approve every slide together" : carousel.status === "approved" ? "Export the slide set" : "Carousel export is ready"}</strong><small>{carousel.status === "draft" ? "All slides are checked and reviewed as one pinned revision." : carousel.status === "in_review" ? "Approval applies to this exact ordered set—not individual slides." : carousel.status === "approved" ? "Create immutable PNGs and a single ZIP download." : "Open the export to inspect or download every slide."}</small></div><div className="workflow-primary-actions">{carousel.status === "draft" && <Button disabled={busy || Boolean(carousel.archivedAt) || !valid || hasChanges} onClick={review} type="button"><ScanSearch />Review every slide</Button>}{carousel.status === "in_review" && <><Button disabled={busy} onClick={() => approve("approved")} type="button"><Check />Approve reviewed set</Button><Button disabled={busy} onClick={() => approve("rejected")} variant="outline" type="button"><RotateCcw />Request changes</Button></>}{currentRender ? <><Button nativeButton={false} render={<a href={`/carousel-renders/${currentRender.id}`} />}><ArrowRight />Open exported PNGs</Button><Button nativeButton={false} render={<a download href={currentRender.zipUrl} />} variant="outline"><Download />Download all PNGs (.zip)</Button></> : carousel.status === "approved" ? <Button disabled={busy} onClick={render} type="button"><Download />Render carousel + ZIP</Button> : null}</div><div className="workflow-secondary-actions"><Button disabled={busy} onClick={archive} size="sm" variant="ghost" type="button">{carousel.archivedAt ? <RotateCcw /> : <Archive />}{carousel.archivedAt ? "Restore carousel" : "Archive"}</Button></div>{hasChanges && carousel.status === "draft" ? <p className="action-hint">Save the reordered or edited slides before review.</p> : null}</div>
    </aside></div>
  </section></AppShell>;
}
