"use client";

import { useMemo, useState } from "react";
import { Puck, type Config, type Data } from "@puckeditor/core";
import { compositions, type CompositionId } from "../../../lib/compositions";
import { draftLayoutSchema, type BrandConfig, type DraftLayout, type PostContent, type PostPayload, type RendererKey } from "../../../lib/media";
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
  headlineScale: number;
  headlineAlignment: DraftLayout["headlineAlignment"];
  density: DraftLayout["density"];
  compositionPosition: DraftLayout["compositionPosition"];
  supportPosition: DraftLayout["supportPosition"];
};

type EditorComponents = { Composition: CompositionProps };

const defaultLayout = draftLayoutSchema.parse({});

function propsFromContent(content: PostContent, layout: DraftLayout): CompositionProps {
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
    headlineScale: layout.headlineScale,
    headlineAlignment: layout.headlineAlignment,
    density: layout.density,
    compositionPosition: layout.compositionPosition,
    supportPosition: layout.supportPosition,
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

function layoutFromProps(props: CompositionProps): DraftLayout {
  return draftLayoutSchema.parse({
    headlineScale: props.headlineScale,
    headlineAlignment: props.headlineAlignment,
    density: props.density,
    compositionPosition: props.compositionPosition,
    supportPosition: props.supportPosition,
  });
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
    headlineScale: { type: "radio", label: "Headline size", options: [
      { label: "Small", value: .85 }, { label: "Compact", value: .95 }, { label: "Default", value: 1 }, { label: "Large", value: 1.05 }, { label: "XL", value: 1.1 },
    ] },
    headlineAlignment: { type: "radio", label: "Headline alignment", options: [{ label: "Left", value: "left" }, { label: "Centered", value: "center" }] },
    density: { type: "radio", label: "Section spacing", options: [{ label: "Compact", value: "compact" }, { label: "Comfortable", value: "comfortable" }, { label: "Airy", value: "airy" }] },
    compositionPosition: { type: "radio", label: "Composition position", options: [{ label: "Raise", value: "raised" }, { label: "Balanced", value: "balanced" }, { label: "Lower", value: "lowered" }] },
    supportPosition: { type: "radio", label: "Supporting section", options: [{ label: "Raise", value: "raised" }, { label: "Balanced", value: "balanced" }, { label: "Lower", value: "lowered" }] },
  };
  if (!definition.blocks.includes("Highlight")) delete fields.highlight;
  if (!definition.blocks.includes("Evidence")) { delete fields.evidenceSource; delete fields.evidenceDetail; }
  if (!definition.blocks.includes("Metric")) { delete fields.metric; delete fields.metricLabel; }
  if (compositionId !== "explainer") { delete fields.stepOne; delete fields.stepTwo; delete fields.stepThree; delete fields.stepFour; }
  if (!definition.blocks.includes("CTA")) delete fields.cta;
  if (!["claim", "whats_missing", "explainer"].includes(compositionId)) delete fields.headlineAlignment;
  return fields as NonNullable<Config<EditorComponents>["components"]["Composition"]["fields"]>;
}

export function PuckCompositionEditor({ content, layout = defaultLayout, compositionId, payloadBase, brandConfig, template, disabled, onChange, onPublish }: {
  content: PostContent;
  layout?: DraftLayout;
  compositionId: CompositionId;
  payloadBase: Pick<PostPayload, "brandId" | "templateId" | "format">;
  brandConfig: BrandConfig;
  template: { id: string; version: number; rendererKey: RendererKey };
  disabled: boolean;
  onChange: (value: { content: PostContent; layout: DraftLayout }) => void;
  onPublish: (value: { content: PostContent; layout: DraftLayout }) => void;
}) {
  const [editorKey, setEditorKey] = useState(0);
  const [data, setData] = useState<Data<EditorComponents>>({
    root: { props: {} },
    content: [{ type: "Composition", props: { id: `composition-${compositionId}`, ...propsFromContent(content, layout) } }],
  });
  const config = useMemo<Config<EditorComponents>>(() => ({
    root: { fields: {} },
    components: {
      Composition: {
        label: compositions[compositionId].name,
        fields: fieldsFor(compositionId),
        permissions: { delete: false, duplicate: false, edit: true, insert: false },
        render: (props) => <PostArtwork payload={{ ...payloadBase, compositionId, content: contentFromProps(props, content), layout: layoutFromProps(props) }} brandConfig={brandConfig} template={template} />,
      },
    },
  }), [brandConfig, compositionId, content, payloadBase, template]);

  function update(next: Data<EditorComponents>) {
    setData(next);
    const block = next.content[0];
    if (block?.type === "Composition") onChange({ content: contentFromProps(block.props, content), layout: layoutFromProps(block.props) });
  }

  function resetLayout() {
    const block = data.content[0];
    if (block?.type !== "Composition") return;
    const nextContent = contentFromProps(block.props, content);
    const next: Data<EditorComponents> = { ...data, content: [{ ...block, props: { ...block.props, ...defaultLayout } }] };
    setData(next);
    setEditorKey((current) => current + 1);
    onChange({ content: nextContent, layout: defaultLayout });
  }

  return <div className="puck-draft-editor" aria-disabled={disabled}>
    <div className="puck-layout-toolbar"><div><strong>Guided layout</strong><span>Safe areas, brand type and colors stay locked.</span></div><button disabled={disabled} onClick={resetLayout} type="button">Reset layout</button></div>
    <Puck
      key={editorKey}
      config={config}
      data={data}
      dnd={{ behavior: "static" }}
      headerTitle={`Edit ${compositions[compositionId].name}`}
      headerPath="Blindspot · guided layout"
      height="700px"
      iframe={{ enabled: false }}
      onChange={update}
      onPublish={(next) => {
        const block = next.content[0];
        if (!disabled && block?.type === "Composition") onPublish({ content: contentFromProps(block.props, content), layout: layoutFromProps(block.props) });
      }}
      permissions={{ delete: false, duplicate: false, edit: true, insert: false }}
      ui={{ leftSideBarVisible: false, rightSideBarVisible: true, itemSelector: { index: 0, zone: "root:default-zone" }, previewMode: "edit" }}
      viewports={[{ width: payloadBase.format === "portrait" ? 540 : 500, height: payloadBase.format === "portrait" ? 675 : 500, label: `Instagram ${payloadBase.format}`, icon: "Smartphone" }]}
    />
  </div>;
}
