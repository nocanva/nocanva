import { forwardRef, type CSSProperties } from "react";
import { brand, formats, templates, type BrandConfig, type PostPayload } from "../lib/media";

type ArtworkTemplate = { id: string; version: number; rendererKey: "statement" | "signal" };
type PostArtworkProps = { payload: PostPayload; mode?: "preview" | "export"; brandConfig?: BrandConfig; template?: ArtworkTemplate };

export const PostArtwork = forwardRef<HTMLElement, PostArtworkProps>(function PostArtwork(
  { payload, mode = "preview", brandConfig = brand, template },
  ref,
) {
  const dimensions = formats[payload.format];
  const { content } = payload;
  const resolvedTemplate: ArtworkTemplate = template ?? {
    id: payload.templateId,
    version: 1,
    rendererKey: payload.templateId === templates.signal.id ? "signal" : "statement",
  };
  const safeArea = mode === "export" ? `${brandConfig.safeArea}px` : `${brandConfig.safeArea / 10.8}%`;
  const style = {
    background: brandConfig.colors.paper,
    color: brandConfig.colors.ink,
    padding: safeArea,
    "--brand-signal": brandConfig.colors.signal,
    "--brand-muted": brandConfig.colors.muted,
  } as CSSProperties;

  return (
    <article
      ref={ref}
      className={`post-canvas ${mode} ${payload.format} ${resolvedTemplate.rendererKey}`}
      style={style}
      data-render-root
      data-template-version={`${resolvedTemplate.id}@${resolvedTemplate.version}`}
      aria-label={`Rendered ${brandConfig.name} post`}
    >
      <header data-render-region="brand-header">
        <span className="post-logo">{brandConfig.name.toUpperCase()}<span>●</span></span>
        <span className="post-format">{dimensions.width} × {dimensions.height}</span>
      </header>
      <div className="post-content" data-render-region="content">
        <p className="post-eyebrow">{content.eyebrow}</p>
        {resolvedTemplate.rendererKey === "signal" && <span className="signal-number">01</span>}
        <h2 data-render-region="headline">{content.headline}</h2>
        <div className="red-rule" />
        <p className="post-support" data-render-region="support">{content.support}</p>
      </div>
      <footer data-render-region="brand-footer"><span>{brandConfig.tagline}</span><span>{brandConfig.website}</span></footer>
    </article>
  );
});
