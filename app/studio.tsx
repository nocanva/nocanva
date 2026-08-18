"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toPng } from "html-to-image";
import Link from "next/link";
import { PostArtwork } from "./post-artwork";
import {
  formats,
  postPayloadSchema,
  renderFilename,
  templates,
  type FormatId,
  type PostPayload,
  type TemplateId,
} from "../lib/media";
import { inspectRenderNode, type RenderCheck } from "../lib/render-checks";
import { WorkspaceHeader } from "./workspace-header";

type ClientRender = { id: string; templateName: string; createdAt: number; payload: PostPayload };

export function Studio() {
  const [template, setTemplate] = useState<TemplateId>("statement");
  const [format, setFormat] = useState<FormatId>("portrait");
  const [eyebrow, setEyebrow] = useState("MEDIA LITERACY / 01");
  const [headline, setHeadline] = useState("A screenshot is a claim, not proof.");
  const [support, setSupport] = useState(
    "Without a source, timestamp, and surrounding context, an image only proves that pixels exist.",
  );
  const [notice, setNotice] = useState("Preview is ready");
  const [isRendering, setIsRendering] = useState(false);
  const [checks, setChecks] = useState<RenderCheck[]>([]);
  const [recentRenders, setRecentRenders] = useState<ClientRender[]>([]);
  const [parentRenderId, setParentRenderId] = useState<string | null>(null);
  const exportRef = useRef<HTMLElement>(null);

  const payload: PostPayload = {
    brandId: "blindspot",
    templateId: template,
    format,
    content: { eyebrow, headline, support },
  };
  const validation = postPayloadSchema.safeParse(payload);

  const headlineState = useMemo(() => {
    if (headline.length > 84) return "Too long for this template";
    if (headline.length > 68) return "Close to the layout limit";
    return "Fits comfortably";
  }, [headline]);

  useEffect(() => {
    void refreshHistory();
    const rerenderId = new URLSearchParams(window.location.search).get("rerender");
    if (!rerenderId) return;
    void fetch(`/api/renders/${encodeURIComponent(rerenderId)}`)
      .then((response) => response.ok ? response.json() : Promise.reject(new Error("Render not found")))
      .then((value) => {
        const { render } = value as { render: ClientRender };
        if (!(render.payload.templateId in templates)) {
          setNotice("This agent-created template can be rerendered through MCP");
          return;
        }
        setTemplate(render.payload.templateId as TemplateId); setFormat(render.payload.format); setEyebrow(render.payload.content.eyebrow);
        setHeadline(render.payload.content.headline); setSupport(render.payload.content.support); setParentRenderId(render.id);
        setNotice(`Loaded iteration of ${render.id.slice(0, 8)}…`);
      })
      .catch(() => setNotice("Could not load the requested render"));
  }, []);

  async function refreshHistory() {
    try {
      const response = await fetch("/api/renders");
      if (!response.ok) return;
      const data = await response.json() as { renders: ClientRender[] };
      setRecentRenders(data.renders.slice(0, 3));
    } catch {
      // The editor remains usable if history is temporarily unavailable.
    }
  }

  function resetContent() {
    setEyebrow("MEDIA LITERACY / 01");
    setHeadline("A screenshot is a claim, not proof.");
    setSupport(
      "Without a source, timestamp, and surrounding context, an image only proves that pixels exist.",
    );
    setParentRenderId(null);
    setNotice("Content reset");
  }

  async function renderPng() {
    if (!validation.success) {
      setNotice(validation.error.issues[0]?.message ?? "Content is not ready");
      return;
    }
    if (!exportRef.current) return;

    setIsRendering(true);
    setNotice("Checking layout…");
    try {
      const nextChecks = await inspectRenderNode(exportRef.current);
      setChecks(nextChecks);
      if (nextChecks.some((check) => !check.passed)) {
        setNotice("Layout check failed — shorten the copy");
        return;
      }

      setNotice("Rendering 1080 px PNG…");
      const dimensions = formats[payload.format];
      const dataUrl = await toPng(exportRef.current, {
        width: dimensions.width,
        height: dimensions.height,
        canvasWidth: dimensions.width,
        canvasHeight: dimensions.height,
        pixelRatio: 1,
        cacheBust: false,
        backgroundColor: "#efede6",
      });
      setNotice("Saving immutable render…");
      const png = await fetch(dataUrl).then((response) => response.blob());
      const form = new FormData();
      form.set("payload", JSON.stringify(payload));
      form.set("png", new File([png], renderFilename(payload), { type: "image/png" }));
      if (parentRenderId) form.set("parentRenderId", parentRenderId);
      const savedResponse = await fetch("/api/renders", { method: "POST", body: form });
      const saved = await savedResponse.json() as { render?: ClientRender; error?: string };
      if (!savedResponse.ok || !saved.render) throw new Error(saved.error ?? "Could not save render");
      const link = document.createElement("a");
      link.download = renderFilename(payload);
      link.href = dataUrl;
      link.click();
      setParentRenderId(saved.render.id);
      setNotice(`Saved ${saved.render.id.slice(0, 8)}… · ${dimensions.width} × ${dimensions.height}`);
      await refreshHistory();
    } catch {
      setNotice("PNG render failed — please try again");
    } finally {
      setIsRendering(false);
    }
  }

  return (
    <main className="studio-shell">
      <WorkspaceHeader active="create" />

      <section className="workspace" id="create">
        <aside className="rail" aria-label="Workspace context">
          <div>
            <p className="section-label">Active brand</p>
            <button className="brand-card" type="button">
              <span className="brand-monogram">B.</span>
              <span><strong>Blindspot</strong><small>Investigative editorial</small></span>
              <span className="chevron">⌄</span>
            </button>
          </div>

          <div className="rail-section">
            <p className="section-label">Build status</p>
            <ol className="milestone-list">
              <li className="done"><span>01</span><div><strong>Brand foundation</strong><small>Complete</small></div></li>
              <li className="done"><span>02</span><div><strong>PNG renderer</strong><small>Complete</small></div></li>
              <li className="done"><span>03</span><div><strong>Durable workspace</strong><small>Complete</small></div></li>
              <li className="current"><span>04</span><div><strong>Agent workflow</strong><small>Local development</small></div></li>
            </ol>
          </div>

          <div className="brand-tokens">
            <p className="section-label">Brand tokens</p>
            <div className="swatches" aria-label="Blindspot brand colors">
              <i style={{ background: "#efede6" }} />
              <i style={{ background: "#171714" }} />
              <i style={{ background: "#e4402d" }} />
            </div>
            <p>DM Sans · Source Serif<br />48 px safe area · fixed logo</p>
          </div>
        </aside>

        <div className="editor-column">
          <div className="page-heading">
            <div>
              <p className="kicker">New post</p>
              <h1>Turn an idea into a branded frame.</h1>
              <p>Structured content in. Deterministic design out.</p>
            </div>
            <button className="secondary-button" onClick={resetContent} type="button">Reset</button>
          </div>

          <section className="panel" id="templates">
            <div className="panel-heading">
              <span className="step-number">01</span>
              <div><h2>Choose a template</h2><p>The template owns layout. Your copy fills the allowed fields.</p></div>
            </div>
            <div className="template-grid">
              {(Object.keys(templates) as TemplateId[]).map((id) => (
                <button
                  className={`template-option ${template === id ? "selected" : ""}`}
                  key={id}
                  onClick={() => setTemplate(id)}
                  type="button"
                  aria-pressed={template === id}
                >
                  <span className={`template-thumb ${id}`} aria-hidden="true">
                    <i /><b /><em />
                  </span>
                  <span><strong>{templates[id].name}</strong><small>{templates[id].description}</small></span>
                  <span className="radio" />
                </button>
              ))}
            </div>
          </section>

          <section className="panel content-panel">
            <div className="panel-heading">
              <span className="step-number">02</span>
              <div><h2>Shape the message</h2><p>Each field maps to a controlled region in the template.</p></div>
            </div>
            <label className="field">
              <span>Eyebrow <small>{eyebrow.length}/28</small></span>
              <input maxLength={28} value={eyebrow} onChange={(event) => setEyebrow(event.target.value)} />
            </label>
            <label className="field">
              <span>Headline <small className={headline.length > 84 ? "warning" : ""}>{headline.length}/84</small></span>
              <textarea maxLength={84} rows={3} value={headline} onChange={(event) => setHeadline(event.target.value)} />
              <em>{headlineState}</em>
            </label>
            <label className="field">
              <span>Supporting copy <small>{support.length}/150</small></span>
              <textarea maxLength={150} rows={4} value={support} onChange={(event) => setSupport(event.target.value)} />
            </label>
          </section>
        </div>

        <aside className="preview-column">
          <div className="preview-toolbar">
            <div>
              <p className="section-label">Live preview</p>
              <span>{notice}</span>
            </div>
            <div className="format-switch" aria-label="Post format">
              <button className={format === "portrait" ? "active" : ""} onClick={() => setFormat("portrait")} type="button">4:5</button>
              <button className={format === "square" ? "active" : ""} onClick={() => setFormat("square")} type="button">1:1</button>
            </div>
          </div>

          <div className="canvas-stage">
            <PostArtwork payload={payload} />
          </div>

          <div className="export-surface" aria-hidden="true">
            <PostArtwork ref={exportRef} payload={payload} mode="export" />
          </div>

          <div className="preview-meta">
            <div><span>Template</span><strong>{templates[template].name}</strong></div>
            <div><span>Brand rules</span><strong>{validation.success ? "Schema passed" : "Needs attention"}</strong></div>
          </div>
          <button className="primary-button" disabled={isRendering || !validation.success} onClick={renderPng} type="button">
            {isRendering ? "Rendering PNG…" : "Render & download PNG"}<span>↓</span>
          </button>
          <p className="export-note">Exports a checked, Instagram-ready 1080 px PNG.</p>
          {checks.length > 0 && (
            <div className="render-checks" aria-live="polite">
              {checks.map((check) => <span className={check.passed ? "passed" : "failed"} key={check.id}>{check.passed ? "✓" : "!"} {check.label}</span>)}
            </div>
          )}

          <section className="recent-renders" id="renders">
            <div className="recent-heading"><h2>Recent renders</h2><Link href="/renders">View all</Link></div>
            {recentRenders.length === 0 && <p className="empty-inline">Your first saved render will appear here.</p>}
            {recentRenders.map((render) => (
              <Link className="render-row" href={`/renders/${render.id}`} key={render.id}>
                <span className="render-mini"><i /></span>
                <span><strong>{render.payload.content.headline}</strong><small>{render.templateName} · {new Date(render.createdAt).toLocaleDateString()}</small></span>
                <em>{render.id.slice(0, 8)}</em>
              </Link>
            ))}
          </section>
        </aside>
      </section>
    </main>
  );
}
