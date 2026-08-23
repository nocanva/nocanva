import type { CSSProperties, ReactNode } from "react";
import type { BrandConfig, PostContent } from "../lib/media";

export function BrandHeader({ brand, label }: { brand: BrandConfig; label?: string }) {
  return <header className="composition-brand-header" data-render-region="brand-header"><strong className="composition-wordmark">{brand.logo?.wordmark ?? brand.name}</strong><span>{label ?? "Field note"}</span></header>;
}

export function LogoFooter({ brand, index }: { brand: BrandConfig; index?: string }) {
  return <footer className="composition-logo-footer" data-render-region="brand-footer"><span>{brand.tagline}</span><span>{index ?? "LOOK CLOSER"}</span><strong>{brand.website}</strong></footer>;
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="composition-eyebrow" data-render-region="eyebrow">{children}</p>;
}

export function Headline({ children }: { children: ReactNode }) {
  return <h2 className="composition-headline" data-layout-zone="headline" data-render-region="headline">{children}</h2>;
}

export function Body({ children }: { children: ReactNode }) {
  return <p className="composition-body" data-render-region="support">{children}</p>;
}

export function Highlight({ children }: { children?: ReactNode }) {
  if (!children) return null;
  return <strong className="composition-highlight" data-render-region="highlight">{children}</strong>;
}

export function CTA({ children }: { children?: ReactNode }) {
  if (!children) return null;
  return <strong className="composition-cta" data-render-region="cta">{children}<span aria-hidden>→</span></strong>;
}

export function Metric({ value, label }: { value?: string; label?: string }) {
  if (!value) return null;
  return <div className="composition-metric" data-render-region="metric"><strong>{value}</strong>{label && <span>{label}</span>}</div>;
}

export function Evidence({ evidence }: { evidence?: PostContent["evidence"] }) {
  if (!evidence) return null;
  return <aside className="composition-evidence" data-render-region="evidence"><span>Source</span><strong>{evidence.source}</strong><p>{evidence.detail}</p></aside>;
}

export function ArtworkImage({ image, role = "image" }: { image: NonNullable<PostContent["image"]>; role?: "image" | "screenshot" | "evidence" }) {
  const imageStyle = {
    objectFit: image.fit,
    objectPosition: `${image.focalPoint.x * 100}% ${image.focalPoint.y * 100}%`,
  } as CSSProperties;
  const stageStyle = { transform: `scale(${image.zoom})`, transformOrigin: `${image.focalPoint.x * 100}% ${image.focalPoint.y * 100}%` } as CSSProperties;
  const frame = image.frame ?? (role === "screenshot" ? "browser" : "none");
  return <figure className={`composition-image ${role} frame-${frame}`} data-layout-zone="media" data-render-region="media">
    {frame === "browser" && <div className="browser-bar" aria-hidden><i /><i /><i /><span>verified source</span></div>}
    {frame === "device" && <div className="device-speaker" aria-hidden />}
    <div className="composition-image-stage" style={stageStyle}>
      {/* The original immutable asset is required here; optimization would make render bytes provider-dependent. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img alt={image.alt} crossOrigin="anonymous" src={`/api/assets/${image.assetId}/content`} style={imageStyle} />
      {(image.blurRegions ?? []).map((region, index) => <span className="asset-blur" key={`blur-${index}`} style={{ left: `${region.x * 100}%`, top: `${region.y * 100}%`, width: `${region.width * 100}%`, height: `${region.height * 100}%`, backdropFilter: `blur(${region.strength}px)` }} />)}
      {(image.highlightRegions ?? []).map((region, index) => <span className="asset-highlight" key={`highlight-${index}`} style={{ left: `${region.x * 100}%`, top: `${region.y * 100}%`, width: `${region.width * 100}%`, height: `${region.height * 100}%` }}>{region.label && <b>{region.label}</b>}</span>)}
    </div>
  </figure>;
}
