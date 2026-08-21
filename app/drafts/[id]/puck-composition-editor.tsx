"use client";

import { useMemo, useState } from "react";
import { Puck, type Config, type Data } from "@puckeditor/core";
import { compositions, type CompositionId } from "../../../lib/compositions";
import type { BrandConfig, PostContent, PostPayload, RendererKey } from "../../../lib/media";
import { PostArtwork } from "../../post-artwork";

type CompositionProps = {
  eyebrow: string;
  headline: string;
  support: string;
  highlight: string;
  evidenceSource: string;
  evidenceDetail: string;
  metric: string;
  metricLabel: string;
  stepOne: string;
  stepTwo: string;
  stepThree: string;
  stepFour: string;
  cta: string;
};

type EditorComponents = { Composition: CompositionProps };

function propsFromContent(content: PostContent): CompositionProps {
  return {
    eyebrow: content.eyebrow,
    headline: content.headline,
    support: content.support,
    highlight: content.highlight ?? "",
    evidenceSource: content.evidence?.source ?? "",
    evidenceDetail: content.evidence?.detail ?? "",
    metric: content.metric ?? "",
    metricLabel: content.metricLabel ?? "",
    stepOne: content.steps?.[0] ?? "",
    stepTwo: content.steps?.[1] ?? "",
    stepThree: content.steps?.[2] ?? "",
    stepFour: content.steps?.[3] ?? "",
    cta: content.cta ?? "",
  };
}

function contentFromProps(props: CompositionProps, previous: PostContent): PostContent {
  const steps = [props.stepOne, props.stepTwo, props.stepThree, props.stepFour].map((step) => step.trim()).filter(Boolean);
  return {
    ...previous,
    eyebrow: props.eyebrow,
    headline: props.headline,
    support: props.support,
    ...(props.highlight.trim() ? { highlight: props.highlight } : { highlight: undefined }),
    ...(props.evidenceSource.trim() && props.evidenceDetail.trim() ? { evidence: { source: props.evidenceSource, detail: props.evidenceDetail } } : { evidence: undefined }),
    ...(props.metric.trim() ? { metric: props.metric } : { metric: undefined }),
    ...(props.metricLabel.trim() ? { metricLabel: props.metricLabel } : { metricLabel: undefined }),
    ...(steps.length >= 3 ? { steps } : { steps: undefined }),
    ...(props.cta.trim() ? { cta: props.cta } : { cta: undefined }),
  };
}

function fieldsFor(compositionId: CompositionId): NonNullable<Config<EditorComponents>["components"]["Composition"]["fields"]> {
  const definition = compositions[compositionId];
  const fields: Partial<NonNullable<Config<EditorComponents>["components"]["Composition"]["fields"]>> = {
    eyebrow: { type: "text", label: "Eyebrow" },
    headline: { type: "textarea", label: "Headline" },
    support: { type: "textarea", label: "Supporting copy" },
    highlight: { type: "text", label: "Highlight" },
    evidenceSource: { type: "text", label: "Evidence source" },
    evidenceDetail: { type: "textarea", label: "Evidence detail" },
    metric: { type: "text", label: "Metric" },
    metricLabel: { type: "text", label: "Metric label" },
    stepOne: { type: "text", label: "Step 1" },
    stepTwo: { type: "text", label: "Step 2" },
    stepThree: { type: "text", label: "Step 3" },
    stepFour: { type: "text", label: "Step 4 (optional)" },
    cta: { type: "text", label: "Call to action" },
  };
  if (!definition.blocks.includes("Highlight")) delete fields.highlight;
  if (!definition.blocks.includes("Evidence")) { delete fields.evidenceSource; delete fields.evidenceDetail; }
  if (!definition.blocks.includes("Metric")) { delete fields.metric; delete fields.metricLabel; }
  if (compositionId !== "explainer") { delete fields.stepOne; delete fields.stepTwo; delete fields.stepThree; delete fields.stepFour; }
  if (!definition.blocks.includes("CTA")) delete fields.cta;
  return fields as NonNullable<Config<EditorComponents>["components"]["Composition"]["fields"]>;
}

export function PuckCompositionEditor({ content, compositionId, payloadBase, brandConfig, template, disabled, onChange, onPublish }: {
  content: PostContent;
  compositionId: CompositionId;
  payloadBase: Pick<PostPayload, "brandId" | "templateId" | "format">;
  brandConfig: BrandConfig;
  template: { id: string; version: number; rendererKey: RendererKey };
  disabled: boolean;
  onChange: (content: PostContent) => void;
  onPublish: (content: PostContent) => void;
}) {
  const [data, setData] = useState<Data<EditorComponents>>({
    root: { props: {} },
    content: [{ type: "Composition", props: { id: `composition-${compositionId}`, ...propsFromContent(content) } }],
  });
  const config = useMemo<Config<EditorComponents>>(() => ({
    root: { fields: {} },
    components: {
      Composition: {
        label: compositions[compositionId].name,
        fields: fieldsFor(compositionId),
        permissions: { delete: false, duplicate: false, edit: true, insert: false },
        render: (props) => <PostArtwork payload={{ ...payloadBase, compositionId, content: contentFromProps(props, content) }} brandConfig={brandConfig} template={template} />,
      },
    },
  }), [brandConfig, compositionId, content, payloadBase, template]);

  function update(next: Data<EditorComponents>) {
    setData(next);
    const block = next.content[0];
    if (block?.type === "Composition") onChange(contentFromProps(block.props, content));
  }

  return <div className="puck-draft-editor" aria-disabled={disabled}>
    <Puck
      config={config}
      data={data}
      dnd={{ behavior: "static" }}
      headerTitle={`Edit ${compositions[compositionId].name}`}
      headerPath="Blindspot · layout locked"
      height="700px"
      iframe={{ enabled: false }}
      onChange={update}
      onPublish={(next) => {
        const block = next.content[0];
        if (!disabled && block?.type === "Composition") onPublish(contentFromProps(block.props, content));
      }}
      permissions={{ delete: false, duplicate: false, edit: true, insert: false }}
      ui={{ leftSideBarVisible: false, rightSideBarVisible: true, itemSelector: { index: 0, zone: "root:default-zone" }, previewMode: "edit" }}
      viewports={[{ width: payloadBase.format === "portrait" ? 540 : 500, height: payloadBase.format === "portrait" ? 675 : 500, label: `Instagram ${payloadBase.format}`, icon: "Smartphone" }]}
    />
  </div>;
}
