"use client";

import { useRef, useState } from "react";
import { toPng } from "html-to-image";
import { useRouter } from "next/navigation";
import { formats, postPayloadSchema } from "../../../lib/media";
import type { BrandRecord, DraftRecord, DraftRevisionRecord, TemplateRecord } from "../../../lib/server/media-repository";
import { inspectRenderNode } from "../../../lib/render-checks";
import { PostArtwork } from "../../post-artwork";
import { WorkspaceHeader } from "../../workspace-header";

export function DraftWorkspace({ initialDraft, initialRevisions, brand, template }: { initialDraft: DraftRecord; initialRevisions: DraftRevisionRecord[]; brand: BrandRecord; template: TemplateRecord }) {
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
  const exportRef = useRef<HTMLElement>(null);
  const payload = { brandId: draft.brandId, templateId: draft.templateId, format, content: { eyebrow, headline, support } };
  const valid = postPayloadSchema.safeParse(payload).success;

  async function request(path: string, init: RequestInit) {
    const response = await fetch(path, init);
    const data = await response.json() as { draft?: DraftRecord; render?: { id: string }; error?: string };
    if (!response.ok) throw new Error(data.error ?? "NoCanva could not complete the request.");
    if (data.draft) setDraft(data.draft);
    return data;
  }

  async function save() {
    if (!valid) return setNotice("Fix the structured content before saving.");
    setBusy(true);
    try {
      await request(`/api/drafts/${draft.id}`, { method: "PUT", headers: { "content-type": "application/json", "x-nocanva-created-by": "human:workspace" }, body: JSON.stringify({ expectedRevision: draft.currentRevision, payload, prompt }) });
      setNotice("Saved as a new revision. Previous approval was cleared.");
      const historyResponse = await fetch(`/api/drafts/${draft.id}/revisions`);
      if (historyResponse.ok) setRevisions((await historyResponse.json() as { revisions: DraftRevisionRecord[] }).revisions);
      router.refresh();
    } catch (error) { setNotice(error instanceof Error ? error.message : "Save failed."); }
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

  return <main className="studio-shell"><WorkspaceHeader active="drafts" /><section className="draft-workspace">
    <div className="draft-workspace-heading"><div><p className="kicker">Stable draft · revision {draft.currentRevision}</p><h1>{headline}</h1><p>{notice}</p></div><span className={`draft-status ${draft.status}`}>{draft.archivedAt ? "archived" : draft.status.replace("_", " ")}</span></div>
    <div className="draft-workspace-grid"><section className="draft-form panel">
      <label className="field"><span>Eyebrow <small>{eyebrow.length}/28</small></span><input maxLength={28} value={eyebrow} onChange={(event) => setEyebrow(event.target.value)} /></label>
      <label className="field"><span>Headline <small>{headline.length}/84</small></span><textarea maxLength={84} rows={3} value={headline} onChange={(event) => setHeadline(event.target.value)} /></label>
      <label className="field"><span>Supporting copy <small>{support.length}/150</small></span><textarea maxLength={150} rows={4} value={support} onChange={(event) => setSupport(event.target.value)} /></label>
      <label className="field"><span>Source prompt</span><textarea maxLength={500} rows={3} value={prompt} onChange={(event) => setPrompt(event.target.value)} /></label>
      <div className="format-switch" aria-label="Draft format"><button className={format === "portrait" ? "active" : ""} onClick={() => setFormat("portrait")} type="button">4:5 portrait</button><button className={format === "square" ? "active" : ""} onClick={() => setFormat("square")} type="button">1:1 square</button></div>
      <button className="primary-button" disabled={busy || !valid || Boolean(draft.archivedAt)} onClick={save} type="button">Save new revision <span>→</span></button>
      <dl className="draft-meta"><div><dt>Brand</dt><dd>{draft.brandName}</dd></div><div><dt>Template</dt><dd>{draft.templateName} v{draft.templateVersion}</dd></div><div><dt>Created by</dt><dd>{draft.revisionCreatedBy}</dd></div><div><dt>Approval</dt><dd>{draft.approvalPolicy === "human_required" ? "Human required" : "Agent allowed"}</dd></div></dl>
      <div className="revision-history"><p className="section-label">Revision history</p>{revisions.map((revision) => <div key={revision.id}><strong>v{revision.revision}</strong><span>{revision.createdBy}</span><time>{new Date(revision.createdAt).toISOString().replace("T", " ").slice(0, 16)} UTC</time></div>)}</div>
    </section><aside className="draft-preview-panel">
      <div className="canvas-stage"><PostArtwork payload={payload} brandConfig={brand.config} template={template} /></div>
      <div className="export-surface" aria-hidden="true"><PostArtwork ref={exportRef} payload={payload} brandConfig={brand.config} template={template} mode="export" /></div>
      <div className="draft-actions"><button disabled={busy || Boolean(draft.archivedAt)} onClick={review} type="button">Run mechanical review</button><button disabled={busy || draft.status !== "in_review"} onClick={() => approve("approved")} type="button">Approve revision</button><button disabled={busy || draft.status !== "in_review"} onClick={() => approve("rejected")} type="button">Request changes</button><button disabled={busy || draft.status !== "approved"} onClick={render} type="button">Render approved PNG</button><button disabled={busy} onClick={archive} type="button">{draft.archivedAt ? "Restore draft" : "Archive draft"}</button></div>
    </aside></div>
  </section></main>;
}
