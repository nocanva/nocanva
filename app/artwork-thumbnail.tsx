"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import type { BrandConfig, PostPayload, PosterLayout, RendererKey } from "../lib/media";
import { PostArtwork } from "./post-artwork";

type ArtworkTemplate = { id: string; version: number; rendererKey: RendererKey; layout?: PosterLayout };

export function ArtworkThumbnail({ payload, brandConfig, template, children }: { payload: PostPayload; brandConfig: BrandConfig; template: ArtworkTemplate; children?: ReactNode }) {
  const frameRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const resize = () => frame.style.setProperty("--draft-preview-scale", String(frame.clientWidth / 1080));
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(frame);
    return () => observer.disconnect();
  }, []);

  return <span className={`draft-card-preview${payload.format === "square" ? " square" : ""}`} ref={frameRef} style={{ "--draft-preview-scale": .4 } as CSSProperties}>
    <PostArtwork payload={payload} brandConfig={brandConfig} template={template} mode="export" />
    {children}
  </span>;
}
