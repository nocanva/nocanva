import { forwardRef, type CSSProperties } from "react";
import { brand, draftLayoutSchema, formats, posterLayoutSchema, templates, type BrandConfig, type PostPayload, type PosterLayout, type RendererKey } from "../lib/media";
import { ArtworkImage, Body, BrandHeader, CTA, Evidence, Eyebrow, Headline, Highlight, LogoFooter, Metric } from "./artwork-blocks";

type ArtworkTemplate = { id: string; version: number; rendererKey: RendererKey; layout?: PosterLayout };
type PostArtworkProps = { payload: PostPayload; mode?: "preview" | "export"; brandConfig?: BrandConfig; template?: ArtworkTemplate };

function headlineFit(text: string) {
  const length = Array.from(text.trim()).length;
  const longestToken = Math.max(0, ...text.trim().split(/\s+/).map((token) => Array.from(token).length));
  if (longestToken >= 22 || length >= 72) return .72;
  if (longestToken >= 18 || length >= 60) return .8;
  if (longestToken >= 15) return .8;
  if (length >= 50) return .86;
  if (longestToken >= 12 || length >= 44) return .92;
  if (length >= 38) return .95;
  return 1;
}

function MediaFrame({ image }: { image: NonNullable<PostPayload["content"]["image"]> }) {
  const imageStyle = {
    objectFit: image.fit,
    objectPosition: `${image.focalPoint.x * 100}% ${image.focalPoint.y * 100}%`,
    transform: `scale(${image.zoom})`,
    transformOrigin: `${image.focalPoint.x * 100}% ${image.focalPoint.y * 100}%`,
  } as CSSProperties;
  // The original immutable asset is required here; optimization would make render bytes provider-dependent.
  // eslint-disable-next-line @next/next/no-img-element
  return <figure className="post-media" data-render-region="media"><img alt={image.alt} crossOrigin="anonymous" src={`/api/assets/${image.assetId}/content`} style={imageStyle} /></figure>;
}

function BrandMark() {
  return (
    <svg className="bloom-mark" viewBox="0 0 64 64" fill="none" aria-hidden>
      <path d="M32 46 C 32 39, 32 34, 32 28" stroke="var(--brand-ink-deep)" strokeWidth="2.8" strokeLinecap="round" />
      <path d="M32 28 C 22 28, 18 22, 20 14 C 28 14, 32 22, 32 28 Z" fill="var(--brand-signal)" />
      <path d="M32 30 C 42 30, 46 24, 44 16 C 36 16, 32 24, 32 30 Z" fill="var(--brand-signal-bright)" />
      <circle cx="24" cy="53" r="1.9" fill="var(--brand-ink-deep)" />
      <circle cx="32" cy="55" r="1.9" fill="var(--brand-ink-deep)" />
      <circle cx="40" cy="53" r="1.9" fill="var(--brand-ink-deep)" />
    </svg>
  );
}

function BloomDecor() {
  return (
    <div className="bloom-decor" aria-hidden>
      <svg className="bloom-leaf bloom-leaf-a" viewBox="0 0 100 100" fill="none">
        <path d="M50 8 Q 18 40 29 78 Q 50 60 71 82 Q 82 46 50 8 Z" fill="var(--brand-signal-bright)" opacity="0.5" />
        <path d="M50 8 L 50 82" stroke="var(--brand-signal)" strokeWidth="1.6" />
        <path d="M50 34 L 33 28 M50 48 L 34 45 M50 60 L 36 60" stroke="var(--brand-signal)" strokeWidth="1.2" opacity="0.7" />
      </svg>
      <svg className="bloom-leaf bloom-leaf-b" viewBox="0 0 100 100" fill="none">
        <path d="M50 15 Q 25 35 35 70 Q 50 55 65 72 Q 75 45 50 15 Z" fill="var(--brand-signal)" opacity="0.32" />
      </svg>
      <svg className="bloom-sun" viewBox="0 0 100 100" fill="none">
        <circle cx="50" cy="50" r="34" fill="var(--brand-accent)" opacity="0.5" />
      </svg>
      <svg className="bloom-arc" viewBox="0 0 200 200" fill="none">
        <circle cx="100" cy="100" r="86" stroke="var(--brand-signal)" strokeWidth="1.4" opacity="0.35" />
        <circle cx="100" cy="100" r="64" stroke="var(--brand-signal)" strokeWidth="1.4" opacity="0.22" />
      </svg>
      <svg className="bloom-grain" viewBox="0 0 200 200" preserveAspectRatio="none">
        <filter id="bloom-noise">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7" />
          <feColorMatrix values="0 0 0 0 0.1 0 0 0 0 0.1 0 0 0 0 0.1 0 0 0 0.06 0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#bloom-noise)" />
      </svg>
    </div>
  );
}

function BloomUnderline() {
  return (
    <svg className="bloom-underline" viewBox="0 0 300 12" fill="none" preserveAspectRatio="none" aria-hidden>
      <path d="M2 8 C 60 2, 120 11, 180 5 C 226 1, 268 6, 298 4" stroke="var(--brand-signal)" strokeWidth="4" strokeLinecap="round" opacity="0.55" />
    </svg>
  );
}

function WhatsAppGlyph() {
  return (
    <svg className="bloom-wa" viewBox="0 0 32 32" fill="currentColor" aria-hidden>
      <path d="M16 .4C7.4.4.4 7.4.4 16c0 2.9.8 5.6 2.1 7.9L.3 31.6l7.9-2.1c2.3 1.3 4.9 2 7.8 2 8.6 0 15.6-7 15.6-15.6C31.6 7.4 24.6.4 16 .4zm0 28.5c-2.6 0-5-.7-7.1-2l-.5-.3-5 1.3 1.3-4.9-.3-.5c-1.4-2.2-2.2-4.8-2.2-7.5C2.2 8.4 8.4 2.2 16 2.2S29.8 8.4 29.8 16 23.6 28.9 16 28.9z" />
    </svg>
  );
}

function BloomArtwork({ brandConfig, content }: { brandConfig: BrandConfig; content: PostPayload["content"] }) {
  return (
    <>
      <BloomDecor />
      <header data-render-region="brand-header">
        <span className="bloom-brand"><BrandMark />{brandConfig.name}</span>
        <span className="bloom-channel"><WhatsAppGlyph />{brandConfig.tagline}</span>
      </header>
      {content.image && <MediaFrame image={content.image} />}
      <div className="post-content" data-render-region="content">
        <p className="post-eyebrow"><i className="bloom-dot" />{content.eyebrow}</p>
        <h2 data-render-region="headline">{content.headline}<BloomUnderline /></h2>
        <p className="post-support" data-render-region="support">{content.support}</p>
      </div>
      <footer data-render-region="brand-footer">
        <span>{brandConfig.website}</span>
        <span className="bloom-cta">
          Send “hi” on WhatsApp
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden><path d="M5 12h14M13 5l7 7-7 7" /></svg>
        </span>
      </footer>
    </>
  );
}

function ChatArtwork({ brandConfig, content }: { brandConfig: BrandConfig; content: PostPayload["content"] }) {
  const messages = content.steps ?? [content.support, "Share a photo or voice note", "Get one calm next step"];
  return <><div className="chat-botanical" aria-hidden><i /><i /><i /></div><BrandHeader brand={brandConfig} label="Plant help that lives in WhatsApp" /><section className="chat-layout" data-render-region="content"><div className="chat-copy"><Eyebrow>{content.eyebrow}</Eyebrow><Headline>{content.headline}</Headline><div className="chat-proof"><strong>1 tap</strong><span>to ask Sprout</span></div></div><div className="chat-phone" aria-label="Example conversation"><div className="chat-contact"><span>{brandConfig.logo?.mark ?? "🌱"}</span><strong>{brandConfig.name}</strong><small>online · replies in seconds</small></div><div className="chat-day">TODAY</div><div className="chat-messages">{messages.map((message, index) => <p className={index % 2 ? "chat-reply" : "chat-question"} key={`${index}-${message}`}>{message}<small>{index ? "9:42" : "9:41"}</small></p>)}</div><div className="chat-input">Message <b>➤</b></div></div><div className="chat-note"><Body>{content.support}</Body><span>NO APP · NO SIGNUP</span></div></section><LogoFooter brand={brandConfig} index="TEXT / PHOTO / VOICE" /></>;
}

function LookupArtwork({ brandConfig, content }: { brandConfig: BrandConfig; content: PostPayload["content"] }) {
  const query = content.quote ?? "9876543210";
  const facts = content.steps ?? ["Community reports", "Reviewed before publishing", "Not a fraud verdict"];
  return <><BrandHeader brand={brandConfig} label="India’s community fraud register" /><section className="lookup-layout" data-render-region="content"><div className="lookup-copy"><span className="lookup-warning">CHECK BEFORE YOU PAY</span><Eyebrow>{content.eyebrow}</Eyebrow><Headline>{content.headline}</Headline><Body>{content.support}</Body></div><div className="lookup-console"><div className="lookup-console-top"><i /><span>SCAMDB LOOKUP</span><b>PUBLIC</b></div><span className="lookup-label">PHONE NUMBER OR UPI ID</span><div className="lookup-search"><strong>{query}</strong><b>SEARCH</b></div><div className="lookup-result"><small>COMMUNITY SIGNAL</small><strong>{content.highlight ?? "Read the reports before acting."}</strong><ul>{facts.map((fact, index) => <li key={fact}><b>{String(index + 1).padStart(2, "0")}</b>{fact}</li>)}</ul></div><p>Not confirmation of fraud. Verify before acting.</p></div><div className="lookup-stamp">SEARCH<br />READ<br />DECIDE</div></section><LogoFooter brand={brandConfig} index="SEARCH / READ / REPORT" /></>;
}

function BreakdownArtwork({ brandConfig, content }: { brandConfig: BrandConfig; content: PostPayload["content"] }) {
  const rows = (content.steps ?? ["India — 82%", "Tax — 5%", "Abroad — 13%"]).map((row) => {
    const match = row.match(/^(.*?)\s*[—:]\s*(\d{1,3})%$/);
    return { label: match?.[1]?.trim() ?? row, value: Math.min(Number(match?.[2] ?? 0), 100) };
  });
  return <><BrandHeader brand={brandConfig} label="Every rupee traced" /><section className="breakdown-layout" data-render-region="content"><div className="breakdown-copy"><Eyebrow>{content.eyebrow}</Eyebrow><Headline>{content.headline}</Headline></div><div className="breakdown-pack" aria-label={content.quote ?? "Product pack"}><small>PACKAGED BISCUITS</small><strong>{content.quote ?? "PARLE-G · 55G"}</strong><span>MRP</span><b>₹4</b></div><div className="breakdown-score"><strong>{content.metric ?? `${rows[0]?.value ?? 0}%`}</strong><span>{content.metricLabel ?? "Indian value capture"}</span></div><div className="breakdown-bars">{rows.map((row, index) => <div key={`${row.label}-${row.value}`}><span><b>{row.label}</b><strong>{row.value}%</strong></span><i><em style={{ width: `${row.value}%` }} /></i><small>{index === 0 ? "STAYS IN INDIA" : index === 1 ? "TAX" : "FLOWS ABROAD"}</small></div>)}</div><div className="breakdown-note"><Body>{content.support}</Body><span>1002 PRODUCTS · 44 CATEGORIES</span></div></section><LogoFooter brand={brandConfig} index="SOURCE / METHOD / VALUE" /></>;
}

function StandardHeader({ brandConfig, dimensions }: { brandConfig: BrandConfig; dimensions: { width: number; height: number } }) {
  return <header data-render-region="brand-header"><span className="post-logo">{brandConfig.name.toUpperCase()}<span>●</span></span><span className="post-format">{dimensions.width} × {dimensions.height}</span></header>;
}

function StandardFooter({ brandConfig }: { brandConfig: BrandConfig }) {
  return <footer data-render-region="brand-footer"><span>{brandConfig.tagline}</span><span>{brandConfig.website}</span></footer>;
}

function TerminalArtwork({ brandConfig, content, dimensions }: { brandConfig: BrandConfig; content: PostPayload["content"]; dimensions: { width: number; height: number } }) {
  const rows = content.steps ?? ["PASS quality 0.891", "PASS grounding 0.942", "WARN refusal drifted −0.04"];
  return (
    <>
      <StandardHeader brandConfig={brandConfig} dimensions={dimensions} />
      {content.image && <MediaFrame image={content.image} />}
      <div className="terminal-window" data-render-region="content">
        <div className="terminal-bar" aria-hidden><span /><span /><span /><b>~/prompt</b></div>
        <div className="terminal-body">
          <p className="post-eyebrow"><i>$</i> {content.eyebrow}</p>
          <h2 data-render-region="headline">{content.headline}</h2>
          <div className="terminal-command"><i>$</i><code>promptry run rag-regression --compare prod</code></div>
          <div className="terminal-results">{rows.map((row) => { const [status, ...rest] = row.split(" "); return <div className={`terminal-result ${status.toLowerCase()}`} key={row}><b>{status}</b><span>{rest.join(" ")}</span></div>; })}</div>
          <div className="terminal-summary"><span><small>OVERALL SCORE</small><strong>{content.metric ?? "0.913"}</strong></span><b>PASS</b></div>
          <div className="terminal-output"><i aria-hidden>›</i><p className="post-support" data-render-region="support">{content.support}</p></div>
        </div>
      </div>
      <StandardFooter brandConfig={brandConfig} />
    </>
  );
}

function SplitArtwork({ brandConfig, content, dimensions }: { brandConfig: BrandConfig; content: PostPayload["content"]; dimensions: { width: number; height: number } }) {
  return (
    <>
      <StandardHeader brandConfig={brandConfig} dimensions={dimensions} />
      {content.image && <MediaFrame image={content.image} />}
      <div className="split-layout" data-render-region="content">
        <aside aria-hidden><span>02</span><i /></aside>
        <section>
          <p className="post-eyebrow">{content.eyebrow}</p>
          <h2 data-render-region="headline">{content.headline}</h2>
          <div className="split-support"><span aria-hidden>→</span><p className="post-support" data-render-region="support">{content.support}</p></div>
        </section>
      </div>
      <StandardFooter brandConfig={brandConfig} />
    </>
  );
}

function LedgerArtwork({ brandConfig, content, dimensions }: { brandConfig: BrandConfig; content: PostPayload["content"]; dimensions: { width: number; height: number } }) {
  return (
    <>
      <StandardHeader brandConfig={brandConfig} dimensions={dimensions} />
      {content.image && <MediaFrame image={content.image} />}
      <div className="ledger-layout" data-render-region="content">
        <p className="post-eyebrow">{content.eyebrow}</p>
        <h2 data-render-region="headline">{content.headline}</h2>
        <div className="ledger-steps" aria-hidden>
          <span><b>01</b><i /></span><span><b>02</b><i /></span><span><b>03</b><i /></span>
        </div>
        <p className="post-support" data-render-region="support">{content.support}</p>
      </div>
      <StandardFooter brandConfig={brandConfig} />
    </>
  );
}

function LayoutArtwork({ brandConfig, content, dimensions, layout }: { brandConfig: BrandConfig; content: PostPayload["content"]; dimensions: (typeof formats)[PostPayload["format"]]; layout: PosterLayout }) {
  const index = content.eyebrow.match(/\d+/)?.[0] ?? "01";
  const showIndex = layout.showIndex || layout.family === "signal";
  const signature = layout.signature === "none" ? null : <div className={`layout-signature ${layout.signature}`} aria-hidden />;

  return (
    <>
      <header data-render-region="brand-header">
        <span className="layout-brand">{brandConfig.name.toUpperCase()}<b>●</b></span>
        <span className="post-format">{dimensions.width} × {dimensions.height}</span>
      </header>
      {content.image && layout.mediaPosition !== "none" && <MediaFrame image={content.image} />}
      <div className="post-content" data-render-region="content">
        <p className="post-eyebrow">{content.eyebrow}</p>
        {showIndex && <span className={`layout-index ${layout.indexPlacement}`} aria-hidden>{index}</span>}
        <h2 data-render-region="headline">{content.headline}</h2>
        {signature}
        <p className="post-support" data-render-region="support">{content.support}</p>
      </div>
      <footer data-render-region="brand-footer"><span>{brandConfig.tagline}</span><span>{brandConfig.website}</span></footer>
    </>
  );
}

function ClaimArtwork({ brandConfig, content }: { brandConfig: BrandConfig; content: PostPayload["content"] }) {
  return <><BrandHeader brand={brandConfig} label="Verified context" /><section className="claim-layout" data-render-region="content"><Eyebrow>{content.eyebrow}</Eyebrow><Headline>{content.headline}</Headline><div className="claim-detail" data-layout-zone="support"><Highlight>{content.highlight}</Highlight><Body>{content.support}</Body></div></section><LogoFooter brand={brandConfig} /></>;
}

function RealButArtwork({ brandConfig, content }: { brandConfig: BrandConfig; content: PostPayload["content"] }) {
  return <><BrandHeader brand={brandConfig} label="Context check" /><section className="real-but-layout" data-render-region="content">{content.image && <ArtworkImage image={content.image} />}<div className="real-but-copy" data-layout-zone="copy"><Eyebrow>{content.eyebrow}</Eyebrow><Headline>{content.headline}</Headline><div className="real-but-detail" data-layout-zone="support"><Body>{content.support}</Body><Highlight>{content.highlight}</Highlight></div></div></section><LogoFooter brand={brandConfig} index="REAL ≠ ACCURATE" /></>;
}

function ReceiptArtwork({ brandConfig, content }: { brandConfig: BrandConfig; content: PostPayload["content"] }) {
  return <><BrandHeader brand={brandConfig} label="Evidence receipt" /><section className="receipt-layout" data-render-region="content"><div className="receipt-lead" data-layout-zone="lead"><Eyebrow>{content.eyebrow}</Eyebrow><Headline>{content.headline}</Headline></div><div className="receipt-proof" data-layout-zone="proof">{content.image && <ArtworkImage image={{ ...content.image, frame: content.image.frame ?? "browser" }} role="evidence" />}<Evidence evidence={content.evidence} /></div><div className="receipt-conclusion" data-layout-zone="support"><Highlight>{content.highlight}</Highlight><Body>{content.support}</Body></div></section><LogoFooter brand={brandConfig} index="PRIMARY SOURCE" /></>;
}

function WhatsMissingArtwork({ brandConfig, content }: { brandConfig: BrandConfig; content: PostPayload["content"] }) {
  const hasSource = Boolean(content.image || content.evidence || content.cta);
  return <><BrandHeader brand={brandConfig} label="What’s missing?" /><section className={`missing-layout${content.image ? " has-source-image" : ""}`} data-render-region="content"><span className="missing-index" aria-hidden>?</span><div className="missing-question" data-layout-zone="question"><Eyebrow>{content.eyebrow}</Eyebrow><Headline>{content.headline}</Headline></div><div className="missing-answer" data-layout-zone="support"><span>Missing context</span><Body>{content.support}</Body><Highlight>{content.highlight}</Highlight></div>{hasSource && <div className={`missing-source${content.image ? " has-image" : ""}`} data-layout-zone="source">{content.image ? <ArtworkImage image={content.image} role="evidence" /> : <Evidence evidence={content.evidence} />}<CTA>{content.cta}</CTA></div>}</section><LogoFooter brand={brandConfig} index="FIND THE GAP" /></>;
}

function ProductArtwork({ brandConfig, content }: { brandConfig: BrandConfig; content: PostPayload["content"] }) {
  return <><BrandHeader brand={brandConfig} label="Product update" /><section className="product-layout" data-render-region="content"><div className="product-copy" data-layout-zone="copy"><Eyebrow>{content.eyebrow}</Eyebrow><Headline>{content.headline}</Headline><div className="product-detail" data-layout-zone="support"><Body>{content.support}</Body><CTA>{content.cta}</CTA></div></div>{content.image && <ArtworkImage image={{ ...content.image, frame: content.image.frame ?? "browser" }} role="screenshot" />}</section><LogoFooter brand={brandConfig} index="PRODUCT / CONTEXT" /></>;
}

function ExplainerArtwork({ brandConfig, content }: { brandConfig: BrandConfig; content: PostPayload["content"] }) {
  if (!content.steps) {
    const index = content.eyebrow.match(/\d+/)?.[0]?.padStart(2, "0") ?? "01";
    return <><BrandHeader brand={brandConfig} label="Practical guide" /><section className="explainer-slide-layout" data-render-region="content"><div className="explainer-slide-intro" data-layout-zone="intro"><Eyebrow>{content.eyebrow}</Eyebrow><Headline>{content.headline}</Headline></div><div className="explainer-slide-action" data-layout-zone="support"><strong aria-hidden>{index}</strong><Body>{content.support}</Body></div><div className="explainer-slide-footer" data-layout-zone="footer"><Highlight>{content.highlight}</Highlight><CTA>{content.cta}</CTA></div></section><LogoFooter brand={brandConfig} index="SAVE / VERIFY / SHARE" /></>;
  }

  return <><BrandHeader brand={brandConfig} label="Practical guide" /><section className="explainer-layout" data-render-region="content"><div className="explainer-intro" data-layout-zone="intro"><Eyebrow>{content.eyebrow}</Eyebrow><Headline>{content.headline}</Headline><Body>{content.support}</Body></div><ol data-layout-zone="steps">{content.steps.map((step, index) => <li data-render-region="step" key={`${index}-${step}`}><b>{String(index + 1).padStart(2, "0")}</b><span>{step}</span></li>)}</ol><div className="explainer-action" data-layout-zone="support"><Metric value={content.metric} label={content.metricLabel} /><CTA>{content.cta}</CTA></div></section><LogoFooter brand={brandConfig} index="SAVE / VERIFY / SHARE" /></>;
}

export const PostArtwork = forwardRef<HTMLElement, PostArtworkProps>(function PostArtwork(
  { payload, mode = "preview", brandConfig = brand, template },
  ref,
) {
  const dimensions = formats[payload.format];
  const { content } = payload;
  const resolvedTemplate: ArtworkTemplate = template ?? {
    id: payload.templateId,
    version: 1,
    rendererKey: payload.templateId === templates.signal.id ? "signal" : payload.templateId === templates.bloom.id ? "bloom" : "statement",
  };
  const resolvedLayout = posterLayoutSchema.parse(resolvedTemplate.layout ?? {});
  const draftLayout = draftLayoutSchema.parse(payload.layout ?? {});
  const layoutMediaPosition = !content.image
    ? "none"
    : resolvedLayout.mediaPosition === "auto"
      ? resolvedLayout.family === "signal" || resolvedLayout.family === "grid" ? "left" : "top"
      : resolvedLayout.mediaPosition;
  const resolvedBackgroundStyle = content.backgroundStyle ?? (
    resolvedTemplate.rendererKey === "real_but" || resolvedTemplate.rendererKey === "product" || resolvedTemplate.rendererKey === "explainer" ? "ink"
    : resolvedTemplate.rendererKey === "receipt" ? "paper_grid"
    : resolvedTemplate.rendererKey === "whats_missing" ? "signal_wash"
    : "paper"
  );
  const resolvedSurface = resolvedBackgroundStyle === "ink" || resolvedBackgroundStyle === "image_full_bleed"
    ? { backgroundColor: brandConfig.colors.ink, color: brandConfig.colors.paper }
    : resolvedBackgroundStyle === "signal_wash"
      ? { backgroundColor: brandConfig.colors.signal, color: brandConfig.colors.paper }
      : { backgroundColor: brandConfig.colors.paper, color: brandConfig.colors.ink };
  const safeArea = mode === "export" ? `${brandConfig.safeArea}px` : `${brandConfig.safeArea / 10.8}%`;
  const contentOffset = draftLayout.compositionPosition === "raised" ? (mode === "export" ? -36 : -14) : draftLayout.compositionPosition === "lowered" ? (mode === "export" ? 36 : 14) : 0;
  const supportOffset = draftLayout.supportPosition === "raised" ? (mode === "export" ? -36 : -14) : draftLayout.supportPosition === "lowered" ? (mode === "export" ? 36 : 14) : 0;
  const style = {
    ...resolvedSurface,
    padding: safeArea,
    "--brand-signal": brandConfig.colors.signal,
    "--brand-muted": brandConfig.colors.muted,
    "--brand-paper": brandConfig.colors.paper,
    "--brand-ink": brandConfig.colors.ink,
    "--brand-accent": brandConfig.colors.accent ?? brandConfig.colors.signal,
    "--brand-signal-bright": `color-mix(in srgb, ${brandConfig.colors.signal} 68%, #ffffff)`,
    "--brand-ink-deep": `color-mix(in srgb, ${brandConfig.colors.ink} 82%, ${brandConfig.colors.signal})`,
    "--brand-wash": `color-mix(in srgb, ${brandConfig.colors.signal} 14%, ${brandConfig.colors.paper})`,
    "--headline-fit": headlineFit(content.headline) * draftLayout.headlineScale,
    "--layout-headline-scale": resolvedLayout.headlineScale * draftLayout.headlineScale,
    "--layout-media-split": `${resolvedLayout.mediaSplit * 100}%`,
    "--draft-content-offset": `${contentOffset}px`,
    "--draft-support-offset": `${supportOffset}px`,
    "--missing-answer-gap": `${mode === "export" ? 24 : 8}px`,
  } as CSSProperties;

  return (
    <article
      ref={ref}
      className={`post-canvas ${mode} ${payload.format} ${resolvedTemplate.rendererKey} background-${resolvedBackgroundStyle} draft-density-${draftLayout.density} draft-headline-${draftLayout.headlineAlignment}${content.image ? " has-media" : ""}${resolvedTemplate.rendererKey === "layout" ? ` layout-renderer layout-family-${resolvedLayout.family} layout-media-${layoutMediaPosition} layout-align-${resolvedLayout.alignment} layout-density-${resolvedLayout.density} layout-focal-${resolvedLayout.focalRegion}` : ""}`}
      style={style}
      data-render-root
      data-template-version={`${resolvedTemplate.id}@${resolvedTemplate.version}`}
      aria-label={`Rendered ${brandConfig.name} post`}
    >
      {resolvedTemplate.rendererKey === "layout" ? <LayoutArtwork brandConfig={brandConfig} content={content} dimensions={dimensions} layout={resolvedLayout} />
      : resolvedTemplate.rendererKey === "bloom" ? <BloomArtwork brandConfig={brandConfig} content={content} />
      : resolvedTemplate.rendererKey === "chat" ? <ChatArtwork brandConfig={brandConfig} content={content} />
      : resolvedTemplate.rendererKey === "lookup" ? <LookupArtwork brandConfig={brandConfig} content={content} />
      : resolvedTemplate.rendererKey === "breakdown" ? <BreakdownArtwork brandConfig={brandConfig} content={content} />
      : resolvedTemplate.rendererKey === "claim" ? <ClaimArtwork brandConfig={brandConfig} content={content} />
      : resolvedTemplate.rendererKey === "real_but" ? <RealButArtwork brandConfig={brandConfig} content={content} />
      : resolvedTemplate.rendererKey === "receipt" ? <ReceiptArtwork brandConfig={brandConfig} content={content} />
      : resolvedTemplate.rendererKey === "whats_missing" ? <WhatsMissingArtwork brandConfig={brandConfig} content={content} />
      : resolvedTemplate.rendererKey === "product" ? <ProductArtwork brandConfig={brandConfig} content={content} />
      : resolvedTemplate.rendererKey === "explainer" ? <ExplainerArtwork brandConfig={brandConfig} content={content} />
      : resolvedTemplate.rendererKey === "terminal" ? <TerminalArtwork brandConfig={brandConfig} content={content} dimensions={dimensions} />
      : resolvedTemplate.rendererKey === "split" ? <SplitArtwork brandConfig={brandConfig} content={content} dimensions={dimensions} />
      : resolvedTemplate.rendererKey === "ledger" ? <LedgerArtwork brandConfig={brandConfig} content={content} dimensions={dimensions} />
      : (
        <>
          <StandardHeader brandConfig={brandConfig} dimensions={dimensions} />
          {content.image && <MediaFrame image={content.image} />}
          <div className="post-content" data-render-region="content">
            <p className="post-eyebrow">{content.eyebrow}</p>
            {resolvedTemplate.rendererKey === "signal" && <span className="signal-number">01</span>}
            <h2 data-render-region="headline">{content.headline}</h2>
            <div className="red-rule" />
            <p className="post-support" data-render-region="support">{content.support}</p>
          </div>
          <StandardFooter brandConfig={brandConfig} />
        </>
      )}
    </article>
  );
});
