"use client";

import { useMemo, useState } from "react";

type TemplateId = "statement" | "signal";
type FormatId = "portrait" | "square";

const templates = {
  statement: {
    name: "Editorial statement",
    description: "One strong idea with a sharp supporting line.",
  },
  signal: {
    name: "Signal card",
    description: "A numbered claim for a recurring evidence series.",
  },
} as const;

const recentRenders = [
  { id: "R-018", title: "Screenshots aren’t evidence", template: "Editorial statement", time: "12 min ago" },
  { id: "R-017", title: "Context changes the story", template: "Signal card", time: "Yesterday" },
  { id: "R-016", title: "Receipts need provenance", template: "Editorial statement", time: "2 days ago" },
];

export function Studio() {
  const [template, setTemplate] = useState<TemplateId>("statement");
  const [format, setFormat] = useState<FormatId>("portrait");
  const [eyebrow, setEyebrow] = useState("MEDIA LITERACY / 01");
  const [headline, setHeadline] = useState("A screenshot is a claim, not proof.");
  const [support, setSupport] = useState(
    "Without a source, timestamp, and surrounding context, an image only proves that pixels exist.",
  );
  const [notice, setNotice] = useState("Preview is ready");

  const headlineState = useMemo(() => {
    if (headline.length > 84) return "Too long for this template";
    if (headline.length > 68) return "Close to the layout limit";
    return "Fits comfortably";
  }, [headline]);

  function resetContent() {
    setEyebrow("MEDIA LITERACY / 01");
    setHeadline("A screenshot is a claim, not proof.");
    setSupport(
      "Without a source, timestamp, and surrounding context, an image only proves that pixels exist.",
    );
    setNotice("Content reset");
  }

  function createDraft() {
    setNotice(`Draft preview prepared with ${templates[template].name}`);
  }

  return (
    <main className="studio-shell">
      <header className="topbar">
        <a className="wordmark" href="#top" aria-label="Framewise home">
          <span className="wordmark-mark">F</span>
          <span>Framewise</span>
          <span className="alpha-tag">ALPHA</span>
        </a>
        <nav className="primary-nav" aria-label="Primary navigation">
          <a className="nav-item active" href="#create">Create</a>
          <a className="nav-item" href="#templates">Templates</a>
          <a className="nav-item" href="#renders">Renders</a>
        </nav>
        <div className="topbar-actions">
          <span className="status-dot"><i />Local workspace</span>
          <button className="avatar" type="button" aria-label="Open workspace menu">RB</button>
        </div>
      </header>

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
              <li className="done"><span>01</span><div><strong>Brand foundation</strong><small>Active now</small></div></li>
              <li className="current"><span>02</span><div><strong>PNG renderer</strong><small>Up next</small></div></li>
              <li><span>03</span><div><strong>Render history</strong><small>Planned</small></div></li>
              <li><span>04</span><div><strong>Agent workflow</strong><small>Planned</small></div></li>
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
              <textarea maxLength={100} rows={3} value={headline} onChange={(event) => setHeadline(event.target.value)} />
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
            <article className={`post-canvas ${format} ${template}`} aria-label="Rendered Blindspot post preview">
              <header>
                <span className="post-logo">BLINDSPOT<span>●</span></span>
                <span className="post-format">{format === "portrait" ? "1080 × 1350" : "1080 × 1080"}</span>
              </header>
              <div className="post-content">
                <p className="post-eyebrow">{eyebrow || "UNTITLED SERIES"}</p>
                {template === "signal" && <span className="signal-number">01</span>}
                <h2>{headline || "Your headline appears here."}</h2>
                <div className="red-rule" />
                <p className="post-support">{support || "Add supporting context to complete this frame."}</p>
              </div>
              <footer><span>LOOK CLOSER.</span><span>blindspot.media</span></footer>
            </article>
          </div>

          <div className="preview-meta">
            <div><span>Template</span><strong>{templates[template].name}</strong></div>
            <div><span>Brand rules</span><strong>All checks passed</strong></div>
          </div>
          <button className="primary-button" onClick={createDraft} type="button">Prepare draft preview <span>→</span></button>
          <p className="export-note">PNG export arrives in milestone 2.</p>

          <section className="recent-renders" id="renders">
            <div className="recent-heading"><h2>Recent renders</h2><button type="button">View all</button></div>
            {recentRenders.map((render) => (
              <button className="render-row" key={render.id} type="button">
                <span className="render-mini"><i /></span>
                <span><strong>{render.title}</strong><small>{render.template} · {render.time}</small></span>
                <em>{render.id}</em>
              </button>
            ))}
          </section>
        </aside>
      </section>
    </main>
  );
}
