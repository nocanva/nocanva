import { forwardRef, type CSSProperties } from "react";
import { brand, formats, templates, type BrandConfig, type PostPayload, type RendererKey } from "../lib/media";
import { ArtworkImage, Body, BrandHeader, CTA, Evidence, Eyebrow, Headline, Highlight, LogoFooter, Metric } from "./artwork-blocks";

type ArtworkTemplate = { id: string; version: number; rendererKey: RendererKey };
type PostArtworkProps = { payload: PostPayload; mode?: "preview" | "export"; brandConfig?: BrandConfig; template?: ArtworkTemplate };

function MediaFrame({ image }: { image: NonNullable<PostPayload["content"]["image"]> }) {
  const imageStyle = {
    objectFit: image.fit,
    objectPosition: `${image.focalPoint.x * 100}% ${image.focalPoint.y * 100}%`,
    transform: `scale(${image.zoom})`,
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

function StandardHeader({ brandConfig, dimensions }: { brandConfig: BrandConfig; dimensions: { width: number; height: number } }) {
  return <header data-render-region="brand-header"><span className="post-logo">{brandConfig.name.toUpperCase()}<span>●</span></span><span className="post-format">{dimensions.width} × {dimensions.height}</span></header>;
}

function StandardFooter({ brandConfig }: { brandConfig: BrandConfig }) {
  return <footer data-render-region="brand-footer"><span>{brandConfig.tagline}</span><span>{brandConfig.website}</span></footer>;
}

function TerminalArtwork({ brandConfig, content, dimensions }: { brandConfig: BrandConfig; content: PostPayload["content"]; dimensions: { width: number; height: number } }) {
  return (
    <>
      <StandardHeader brandConfig={brandConfig} dimensions={dimensions} />
      {content.image && <MediaFrame image={content.image} />}
      <div className="terminal-window" data-render-region="content">
        <div className="terminal-bar" aria-hidden><span /><span /><span /><b>~/prompt</b></div>
        <div className="terminal-body">
          <p className="post-eyebrow"><i>$</i> {content.eyebrow}</p>
          <h2 data-render-region="headline">{content.headline}</h2>
          <div className="terminal-output"><i aria-hidden>›</i><p className="post-support" data-render-region="support">{content.support}</p></div>
          <span className="terminal-cursor" aria-hidden />
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

function ClaimArtwork({ brandConfig, content }: { brandConfig: BrandConfig; content: PostPayload["content"] }) {
  return <><BrandHeader brand={brandConfig} label="Verified context" /><section className="claim-layout" data-render-region="content"><Eyebrow>{content.eyebrow}</Eyebrow><Headline>{content.headline}</Headline><div className="claim-detail"><Highlight>{content.highlight}</Highlight><Body>{content.support}</Body></div></section><LogoFooter brand={brandConfig} /></>;
}

function RealButArtwork({ brandConfig, content }: { brandConfig: BrandConfig; content: PostPayload["content"] }) {
  return <><BrandHeader brand={brandConfig} label="Context check" /><section className="real-but-layout" data-render-region="content">{content.image && <ArtworkImage image={content.image} />}<div className="real-but-copy"><Eyebrow>{content.eyebrow}</Eyebrow><Headline>{content.headline}</Headline><div className="real-but-detail"><Body>{content.support}</Body><Highlight>{content.highlight}</Highlight></div></div></section><LogoFooter brand={brandConfig} index="REAL ≠ ACCURATE" /></>;
}

function ReceiptArtwork({ brandConfig, content }: { brandConfig: BrandConfig; content: PostPayload["content"] }) {
  return <><BrandHeader brand={brandConfig} label="Evidence receipt" /><section className="receipt-layout" data-render-region="content"><div className="receipt-lead"><Eyebrow>{content.eyebrow}</Eyebrow><Headline>{content.headline}</Headline></div><div className="receipt-proof">{content.image && <ArtworkImage image={{ ...content.image, frame: content.image.frame ?? "browser" }} role="evidence" />}<Evidence evidence={content.evidence} /></div><div className="receipt-conclusion"><Highlight>{content.highlight}</Highlight><Body>{content.support}</Body></div></section><LogoFooter brand={brandConfig} index="PRIMARY SOURCE" /></>;
}

function WhatsMissingArtwork({ brandConfig, content }: { brandConfig: BrandConfig; content: PostPayload["content"] }) {
  return <><BrandHeader brand={brandConfig} label="What’s missing?" /><section className="missing-layout" data-render-region="content"><span className="missing-index" aria-hidden>?</span><div className="missing-question"><Eyebrow>{content.eyebrow}</Eyebrow><Headline>{content.headline}</Headline></div><div className="missing-answer"><span>Missing context</span><Body>{content.support}</Body><Highlight>{content.highlight}</Highlight></div><div className="missing-source"><Evidence evidence={content.evidence} /><CTA>{content.cta}</CTA></div></section><LogoFooter brand={brandConfig} index="FIND THE GAP" /></>;
}

function ProductArtwork({ brandConfig, content }: { brandConfig: BrandConfig; content: PostPayload["content"] }) {
  return <><BrandHeader brand={brandConfig} label="Product update" /><section className="product-layout" data-render-region="content"><div className="product-copy"><Eyebrow>{content.eyebrow}</Eyebrow><Headline>{content.headline}</Headline><div className="product-detail"><Body>{content.support}</Body><CTA>{content.cta}</CTA></div></div>{content.image && <ArtworkImage image={{ ...content.image, frame: content.image.frame ?? "browser" }} role="screenshot" />}</section><LogoFooter brand={brandConfig} index="PRODUCT / CONTEXT" /></>;
}

function ExplainerArtwork({ brandConfig, content }: { brandConfig: BrandConfig; content: PostPayload["content"] }) {
  const steps = content.steps ?? [content.support, "Check the original source", "Compare date, place, and surrounding context"];
  return <><BrandHeader brand={brandConfig} label="Practical guide" /><section className="explainer-layout" data-render-region="content"><div className="explainer-intro"><Eyebrow>{content.eyebrow}</Eyebrow><Headline>{content.headline}</Headline><Body>{content.support}</Body></div><ol>{steps.map((step, index) => <li data-render-region="step" key={`${index}-${step}`}><b>{String(index + 1).padStart(2, "0")}</b><span>{step}</span></li>)}</ol><div className="explainer-action"><Metric value={content.metric} label={content.metricLabel} /><CTA>{content.cta}</CTA></div></section><LogoFooter brand={brandConfig} index="SAVE / VERIFY / SHARE" /></>;
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
  const safeArea = mode === "export" ? `${brandConfig.safeArea}px` : `${brandConfig.safeArea / 10.8}%`;
  const style = {
    background: brandConfig.colors.paper,
    color: brandConfig.colors.ink,
    padding: safeArea,
    "--brand-signal": brandConfig.colors.signal,
    "--brand-muted": brandConfig.colors.muted,
    "--brand-paper": brandConfig.colors.paper,
    "--brand-ink": brandConfig.colors.ink,
    "--brand-accent": brandConfig.colors.accent ?? brandConfig.colors.signal,
    "--brand-signal-bright": `color-mix(in srgb, ${brandConfig.colors.signal} 68%, #ffffff)`,
    "--brand-ink-deep": `color-mix(in srgb, ${brandConfig.colors.ink} 82%, ${brandConfig.colors.signal})`,
    "--brand-wash": `color-mix(in srgb, ${brandConfig.colors.signal} 14%, ${brandConfig.colors.paper})`,
  } as CSSProperties;

  return (
    <article
      ref={ref}
      className={`post-canvas ${mode} ${payload.format} ${resolvedTemplate.rendererKey}${content.image ? " has-media" : ""}`}
      style={style}
      data-render-root
      data-template-version={`${resolvedTemplate.id}@${resolvedTemplate.version}`}
      aria-label={`Rendered ${brandConfig.name} post`}
    >
      {resolvedTemplate.rendererKey === "bloom" ? <BloomArtwork brandConfig={brandConfig} content={content} />
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
