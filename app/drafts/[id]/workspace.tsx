"use client";

import { useRef, useState } from "react";
import { toPng } from "html-to-image";
import { useRouter } from "next/navigation";
import { Archive, Check, Download, ImagePlus, RotateCcw, Save, ScanSearch } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { draftLayoutSchema, formats, postPayloadSchema, type DraftLayout, type PostContent } from "../../../lib/media";
import { compositionFromTemplateId } from "../../../lib/compositions";
import type { BrandRecord, DraftRecord, DraftRevisionRecord, TemplateRecord } from "../../../lib/server/media-repository";
import type { WorkspaceAsset } from "../../../lib/server/asset-repository";
import { inspectRenderNode } from "../../../lib/render-checks";
import { PostArtwork } from "../../post-artwork";
import { AppShell } from "../../workspace-shell";
import { WorkflowProgress } from "../../workflow-progress";
import { PuckCompositionEditor } from "./puck-composition-editor";

export function DraftWorkspace({ initialDraft, initialRevisions, initialAssets, brand, template }: { initialDraft: DraftRecord; initialRevisions: DraftRevisionRecord[]; initialAssets: WorkspaceAsset[]; brand: BrandRecord; template: TemplateRecord }) {
  const router = useRouter();
  const [draft, setDraft] = useState(initialDraft);
  const [format, setFormat] = useState(initialDraft.payload.format);
  const [eyebrow, setEyebrow] = useState(initialDraft.payload.content.eyebrow);
  const [headline, setHeadline] = useState(initialDraft.payload.content.headline);
  const [support, setSupport] = useState(initialDraft.payload.content.support);
  const [prompt, setPrompt] = useState(initialDraft.prompt ?? "");
  const [notice, setNotice] = useState("Draft is ready");
  const [busy, setBusy] = useState(false);
  const [revisions, setRevisions] = useState(initialRevisions);
  const [assets, setAssets] = useState(initialAssets);
  const [image, setImage] = useState<PostContent["image"]>(initialDraft.payload.content.image);
  const [compositionContent, setCompositionContent] = useState<PostContent>(initialDraft.payload.content);
  const [layout, setLayout] = useState<DraftLayout>(draftLayoutSchema.parse(initialDraft.payload.layout ?? {}));
  const exportRef = useRef<HTMLElement>(null);
  const compositionId = initialDraft.payload.compositionId ?? compositionFromTemplateId(draft.templateId);
  const content = { ...compositionContent, eyebrow, headline, support, ...(image ? { image } : { image: undefined }) };
  const payload = { brandId: draft.brandId, templateId: draft.templateId, ...(compositionId ? { compositionId } : {}), format, content, layout };
  const valid = postPayloadSchema.safeParse(payload).success;
  const savedPayload = { ...draft.payload, layout: draftLayoutSchema.parse(draft.payload.layout ?? {}) };
  const hasChanges = JSON.stringify({ payload, prompt }) !== JSON.stringify({ payload: savedPayload, prompt: draft.prompt ?? "" });

  async function request(path: string, init: RequestInit) {
    const response = await fetch(path, init);
    const data = await response.json() as { draft?: DraftRecord; render?: { id: string }; error?: string };
    if (!response.ok) throw new Error(data.error ?? "NoCanva could not complete the request.");
    if (data.draft) setDraft(data.draft);
    return data;
  }

  async function save(valueOverride?: { content: PostContent; layout: DraftLayout }) {
    const payloadToSave = valueOverride ? { ...payload, ...valueOverride } : payload;
    if (!postPayloadSchema.safeParse(payloadToSave).success) return setNotice("Fix the structured content before saving.");
    setBusy(true);
    try {
      await request(`/api/drafts/${draft.id}`, { method: "PUT", headers: { "content-type": "application/json", "x-nocanva-created-by": "human:workspace" }, body: JSON.stringify({ expectedRevision: draft.currentRevision, payload: payloadToSave, prompt }) });
      setNotice("Saved as a new revision. Previous approval was cleared.");
      const historyResponse = await fetch(`/api/drafts/${draft.id}/revisions`);
      if (historyResponse.ok) setRevisions((await historyResponse.json() as { revisions: DraftRevisionRecord[] }).revisions);
      router.refresh();
    } catch (error) { setNotice(error instanceof Error ? error.message : "Save failed."); }
    finally { setBusy(false); }
  }

  async function uploadImage(file: File | undefined) {
    if (!file) return;
    if (file.size > 750 * 1024) return setNotice("Compress the image below 750 KB before upload.");
    setBusy(true);
    try {
      const form = new FormData();
      form.set("name", file.name);
      form.set("image", file);
      const response = await fetch("/api/assets", { method: "POST", body: form });
      const data = await response.json() as { asset?: WorkspaceAsset; error?: string };
      if (!response.ok || !data.asset) throw new Error(data.error ?? "Image upload failed.");
      setAssets((current) => [data.asset!, ...current.filter((asset) => asset.id !== data.asset!.id)]);
      setImage({ assetId: data.asset.id, alt: "", fit: "cover", focalPoint: { x: 0.5, y: 0.5 }, zoom: 1 });
      setNotice("Image uploaded. Adjust the crop, then save a new revision.");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Image upload failed."); }
    finally { setBusy(false); }
  }

  async function review() {
    if (!exportRef.current) return;
    setBusy(true);
    try {
      const checks = await inspectRenderNode(exportRef.current);
      const dimensions = formats[format];
      const dataUrl = await toPng(exportRef.current, { width: dimensions.width, height: dimensions.height, canvasWidth: dimensions.width, canvasHeight: dimensions.height, pixelRatio: 1, cacheBust: false, backgroundColor: brand.config.colors.paper });
      const png = await fetch(dataUrl).then((response) => response.blob());
      const form = new FormData();
      form.set("expectedRevision", String(draft.currentRevision));
      form.set("reviewer", "human:workspace");
      form.set("checks", JSON.stringify(checks));
      form.set("png", new File([png], `nocanva-draft-${draft.id}.png`, { type: "image/png" }));
      await request(`/api/drafts/${draft.id}/review`, { method: "POST", body: form });
      setNotice(checks.every((check) => check.passed) ? "Mechanical review passed. Visually inspect the preview before approval." : "Mechanical review needs changes.");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Review failed."); }
    finally { setBusy(false); }
  }

  async function approve(decision: "approved" | "rejected") {
    setBusy(true);
    try {
      await request(`/api/drafts/${draft.id}/approval`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ expectedRevision: draft.currentRevision, actor: "human:workspace", decision }) });
      setNotice(decision === "approved" ? "Current revision approved." : "Changes requested.");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Decision failed."); }
    finally { setBusy(false); }
  }

  async function render() {
    if (draft.status !== "approved") return;
    setBusy(true);
    try {
      const form = new FormData();
      form.set("payload", JSON.stringify(payload));
      form.set("draftRevisionId", draft.revisionId);
      form.set("templateVersionId", draft.templateVersionId);
      const data = await request("/api/renders", { method: "POST", headers: { "x-nocanva-created-by": "human:workspace" }, body: form });
      if (data.render) window.location.href = `/renders/${data.render.id}`;
    } catch (error) { setNotice(error instanceof Error ? error.message : "Render failed."); setBusy(false); }
  }

  async function archive() {
    setBusy(true);
    try {
      await request(`/api/drafts/${draft.id}/archive`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ archived: !draft.archivedAt }) });
      setNotice(draft.archivedAt ? "Draft restored." : "Draft archived without deleting history.");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Archive failed."); }
    finally { setBusy(false); }
  }

  return <AppShell><section className="draft-workspace page-frame">
    <div className="draft-workspace-heading"><div><div className="workspace-title-meta"><p className="kicker">Stable draft · revision {draft.currentRevision}</p><Badge variant="outline" className={hasChanges ? "change-badge dirty" : "change-badge"}>{hasChanges ? "Unsaved changes" : "Revision saved"}</Badge></div><h1>{headline}</h1><p className="workspace-notice" aria-live="polite">{notice}</p></div><span className={`draft-status ${draft.status}`}>{draft.archivedAt ? "archived" : draft.status.replace("_", " ")}</span></div>
    <WorkflowProgress status={draft.status} archived={Boolean(draft.archivedAt)} />
    <div className={compositionId ? "draft-workspace-grid composition-editor-active" : "draft-workspace-grid"}><section className="draft-form panel">
      {compositionId ? <PuckCompositionEditor content={content} layout={layout} compositionId={compositionId} payloadBase={{ brandId: draft.brandId, templateId: draft.templateId, format }} brandConfig={brand.config} template={template} disabled={busy || Boolean(draft.archivedAt)} onChange={(next) => { setCompositionContent(next.content); setLayout(next.layout); setEyebrow(next.content.eyebrow); setHeadline(next.content.headline); setSupport(next.content.support); }} onPublish={(next) => { setCompositionContent(next.content); setLayout(next.layout); setEyebrow(next.content.eyebrow); setHeadline(next.content.headline); setSupport(next.content.support); void save(next); }} /> : <>
      <label className="field"><span>Eyebrow <small>{eyebrow.length}/28</small></span><input maxLength={28} value={eyebrow} onChange={(event) => setEyebrow(event.target.value)} /></label>
      <label className="field"><span>Headline <small>{headline.length}/84</small></span><textarea maxLength={84} rows={3} value={headline} onChange={(event) => setHeadline(event.target.value)} /></label>
      <label className="field"><span>Supporting copy <small>{support.length}/150</small></span><textarea maxLength={150} rows={4} value={support} onChange={(event) => setSupport(event.target.value)} /></label></>}
      <label className="field"><span>Source prompt</span><textarea maxLength={500} rows={3} value={prompt} onChange={(event) => setPrompt(event.target.value)} /></label>
      <fieldset className="image-editor"><legend>Image</legend>
        <label className="image-upload"><span>Upload PNG or JPEG · max 750 KB</span><input accept="image/png,image/jpeg" disabled={busy} onChange={(event) => uploadImage(event.target.files?.[0])} type="file" /></label>
        {assets.length > 0 && <label className="field"><span>Workspace image</span><select value={image?.assetId ?? ""} onChange={(event) => setImage(event.target.value ? { assetId: event.target.value, alt: "", fit: "cover", focalPoint: { x: .5, y: .5 }, zoom: 1 } : undefined)}><option value="">No image</option>{assets.map((asset) => <option key={asset.id} value={asset.id}>{asset.name} · {asset.width}×{asset.height}</option>)}</select></label>}
        {image && <div className="crop-controls">
          <label><span>Fit</span><select value={image.fit} onChange={(event) => setImage({ ...image, fit: event.target.value === "contain" ? "contain" : "cover" })}><option value="cover">Fill frame</option><option value="contain">Fit whole image</option></select></label>
          <label><span>Horizontal focus</span><input max="1" min="0" step="0.01" type="range" value={image.focalPoint.x} onChange={(event) => setImage({ ...image, focalPoint: { ...image.focalPoint, x: Number(event.target.value) } })} /></label>
          <label><span>Vertical focus</span><input max="1" min="0" step="0.01" type="range" value={image.focalPoint.y} onChange={(event) => setImage({ ...image, focalPoint: { ...image.focalPoint, y: Number(event.target.value) } })} /></label>
          <label><span>Zoom · {image.zoom.toFixed(2)}×</span><input max="3" min="1" step="0.05" type="range" value={image.zoom} onChange={(event) => setImage({ ...image, zoom: Number(event.target.value) })} /></label>
          <label className="field"><span>Alt text</span><input maxLength={160} value={image.alt} onChange={(event) => setImage({ ...image, alt: event.target.value })} /></label>
          <button onClick={() => setImage(undefined)} type="button">Remove image</button>
        </div>}
      </fieldset>
      <div className="format-switch" aria-label="Draft format"><button className={format === "portrait" ? "active" : ""} onClick={() => setFormat("portrait")} type="button">4:5 portrait</button><button className={format === "square" ? "active" : ""} onClick={() => setFormat("square")} type="button">1:1 square</button></div>
      <Button className="workspace-save-button" disabled={busy || !valid || !hasChanges || Boolean(draft.archivedAt)} onClick={() => save()} size="lg" type="button"><Save />{busy ? "Working…" : hasChanges ? "Save as new revision" : "Revision saved"}</Button>
      <dl className="draft-meta"><div><dt>Brand</dt><dd>{draft.brandName}</dd></div><div><dt>Direction</dt><dd>{(content.visualDirection ?? "editorial").replace("_", " ")}</dd></div><div><dt>Template</dt><dd>{draft.templateName} v{draft.templateVersion}</dd></div><div><dt>Created by</dt><dd>{draft.revisionCreatedBy}</dd></div><div><dt>Approval</dt><dd>{draft.approvalPolicy === "human_required" ? "Human required" : "Agent allowed"}</dd></div></dl>
      <div className="revision-history"><p className="section-label">Revision history</p>{revisions.map((revision) => <div key={revision.id}><strong>v{revision.revision}</strong><span>{revision.createdBy}</span><time>{new Date(revision.createdAt).toISOString().replace("T", " ").slice(0, 16)} UTC</time></div>)}</div>
    </section><aside className="draft-preview-panel">
      <div className="canvas-stage"><PostArtwork payload={payload} brandConfig={brand.config} template={template} /></div>
      <div className="export-surface" aria-hidden="true"><PostArtwork ref={exportRef} payload={payload} brandConfig={brand.config} template={template} mode="export" /></div>
      <div className="workflow-action-card"><div><span className="section-overline">Next action</span><strong>{draft.status === "draft" ? "Review this revision" : draft.status === "in_review" ? "Make the human decision" : draft.status === "approved" ? "Create the final PNG" : "Export is ready"}</strong><small>{draft.status === "draft" ? "Mechanical checks verify dimensions, bounds, overflow and deterministic output." : draft.status === "in_review" ? "Inspect the artwork—not only the checks—before approving." : draft.status === "approved" ? "The exported asset will stay pinned to this exact revision." : "Open Exports to download or inspect the immutable file."}</small></div><div className="workflow-primary-actions">{draft.status === "draft" && <Button disabled={busy || Boolean(draft.archivedAt) || hasChanges} onClick={review} type="button"><ScanSearch />Run review</Button>}{draft.status === "in_review" && <><Button disabled={busy} onClick={() => approve("approved")} type="button"><Check />Approve revision</Button><Button disabled={busy} onClick={() => approve("rejected")} variant="outline" type="button"><RotateCcw />Request changes</Button></>}{draft.status === "approved" && <Button disabled={busy} onClick={render} type="button"><Download />Render approved PNG</Button>}</div><div className="workflow-secondary-actions"><Button disabled={busy} onClick={archive} size="sm" variant="ghost" type="button">{draft.archivedAt ? <RotateCcw /> : <Archive />}{draft.archivedAt ? "Restore draft" : "Archive"}</Button>{image ? <span><ImagePlus /> Image attached</span> : null}</div>{hasChanges && draft.status === "draft" ? <p className="action-hint">Save the current changes before running review.</p> : null}</div>
    </aside></div>
  </section></AppShell>;
}
