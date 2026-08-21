import { forwardRef, type CSSProperties } from "react";
import { brand, formats, posterLayoutSchema, templates, type BrandConfig, type PostPayload, type PosterLayout, type RendererKey } from "../lib/media";

type ArtworkTemplate = { id: string; version: number; rendererKey: RendererKey; layout?: PosterLayout };
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
  const layoutMediaPosition = !content.image
    ? "none"
    : resolvedLayout.mediaPosition === "auto"
      ? resolvedLayout.family === "signal" || resolvedLayout.family === "grid" ? "left" : "top"
      : resolvedLayout.mediaPosition;
  const safeArea = mode === "export" ? `${brandConfig.safeArea}px` : `${brandConfig.safeArea / 10.8}%`;
  const style = {
    background: brandConfig.colors.paper,
    color: brandConfig.colors.ink,
    padding: safeArea,
    "--brand-signal": brandConfig.colors.signal,
    "--brand-muted": brandConfig.colors.muted,
    "--brand-paper": brandConfig.colors.paper,
    "--brand-accent": brandConfig.colors.accent ?? brandConfig.colors.signal,
    "--brand-signal-bright": `color-mix(in srgb, ${brandConfig.colors.signal} 68%, #ffffff)`,
    "--brand-ink-deep": `color-mix(in srgb, ${brandConfig.colors.ink} 82%, ${brandConfig.colors.signal})`,
    "--brand-wash": `color-mix(in srgb, ${brandConfig.colors.signal} 14%, ${brandConfig.colors.paper})`,
    "--layout-headline-scale": resolvedLayout.headlineScale,
    "--layout-media-split": `${resolvedLayout.mediaSplit * 100}%`,
  } as CSSProperties;

  return (
    <article
      ref={ref}
      className={`post-canvas ${mode} ${payload.format} ${resolvedTemplate.rendererKey}${content.image ? " has-media" : ""}${resolvedTemplate.rendererKey === "layout" ? ` layout-renderer layout-family-${resolvedLayout.family} layout-media-${layoutMediaPosition} layout-align-${resolvedLayout.alignment} layout-density-${resolvedLayout.density} layout-focal-${resolvedLayout.focalRegion}` : ""}`}
      style={style}
      data-render-root
      data-template-version={`${resolvedTemplate.id}@${resolvedTemplate.version}`}
      aria-label={`Rendered ${brandConfig.name} post`}
    >
      {resolvedTemplate.rendererKey === "layout" ? (
        <LayoutArtwork brandConfig={brandConfig} content={content} dimensions={dimensions} layout={resolvedLayout} />
      ) : resolvedTemplate.rendererKey === "bloom" ? (
        <BloomArtwork brandConfig={brandConfig} content={content} />
      ) : (
        <>
          <header data-render-region="brand-header">
            <span className="post-logo">{brandConfig.name.toUpperCase()}<span>●</span></span>
            <span className="post-format">{dimensions.width} × {dimensions.height}</span>
          </header>
          {content.image && <MediaFrame image={content.image} />}
          <div className="post-content" data-render-region="content">
            <p className="post-eyebrow">{content.eyebrow}</p>
            {resolvedTemplate.rendererKey === "signal" && <span className="signal-number">01</span>}
            <h2 data-render-region="headline">{content.headline}</h2>
            <div className="red-rule" />
            <p className="post-support" data-render-region="support">{content.support}</p>
          </div>
          <footer data-render-region="brand-footer"><span>{brandConfig.tagline}</span><span>{brandConfig.website}</span></footer>
        </>
      )}
    </article>
  );
});
