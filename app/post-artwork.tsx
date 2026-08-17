import { forwardRef } from "react";
import { brand, formats, type PostPayload } from "../lib/media";

type PostArtworkProps = { payload: PostPayload; mode?: "preview" | "export" };

export const PostArtwork = forwardRef<HTMLElement, PostArtworkProps>(function PostArtwork(
  { payload, mode = "preview" },
  ref,
) {
  const dimensions = formats[payload.format];
  const { content } = payload;

  return (
    <article
      ref={ref}
      className={`post-canvas ${mode} ${payload.format} ${payload.templateId}`}
      data-render-root
      data-template-version={`${payload.templateId}@1`}
      aria-label="Rendered Blindspot post"
    >
      <header data-render-region="brand-header">
        <span className="post-logo">BLINDSPOT<span>●</span></span>
        <span className="post-format">{dimensions.width} × {dimensions.height}</span>
      </header>
      <div className="post-content" data-render-region="content">
        <p className="post-eyebrow">{content.eyebrow}</p>
        {payload.templateId === "signal" && <span className="signal-number">01</span>}
        <h2 data-render-region="headline">{content.headline}</h2>
        <div className="red-rule" />
        <p className="post-support" data-render-region="support">{content.support}</p>
      </div>
      <footer data-render-region="brand-footer"><span>{brand.tagline}</span><span>{brand.website}</span></footer>
    </article>
  );
});
