"use client";

import { useEffect, useMemo, useState } from "react";
import { Puck, Render, type Config, type Data } from "@puckeditor/core";
import styles from "./template-editor.module.css";

type EditorialPosterProps = {
  eyebrow: string;
  headline: string;
  support: string;
  alignment: "left" | "center";
};

type ProductSplitProps = {
  eyebrow: string;
  headline: string;
  support: string;
  screenshotUrl: string;
  imageSide: "left" | "right";
};

type MetricSignalProps = {
  metric: string;
  label: string;
  headline: string;
  support: string;
};

type WorkflowStepsProps = {
  eyebrow: string;
  headline: string;
  stepOne: string;
  stepTwo: string;
  stepThree: string;
  cta: string;
};

type LabComponents = {
  EditorialPoster: EditorialPosterProps;
  ProductSplit: ProductSplitProps;
  MetricSignal: MetricSignalProps;
  WorkflowSteps: WorkflowStepsProps;
};

const STORAGE_KEY = "nocanva:puck-proof:v1";

function BrandChrome({ children, variant = "light" }: { children: React.ReactNode; variant?: "light" | "dark" }) {
  return (
    <article className={`${styles.artwork} ${variant === "dark" ? styles.artworkDark : ""}`} data-nocanva-proof-artwork>
      <header className={styles.brandHeader}>
        <span className={styles.wordmark}><i>N</i>NoCanva</span>
        <span className={styles.lockedBadge}>Brand locked</span>
      </header>
      {children}
      <footer className={styles.brandFooter}><span>Ideas in. Brand-ready media out.</span><b>nocanva.com</b></footer>
    </article>
  );
}

function PlaceholderScreenshot({ url }: { url: string }) {
  if (url.trim()) {
    // This lab accepts a URL only to prove Puck field editing. Production will use immutable workspace asset IDs.
    // eslint-disable-next-line @next/next/no-img-element
    return <img alt="Product screenshot" className={styles.screenshotImage} src={url} />;
  }
  return <div className={styles.screenshotPlaceholder}><span /><span /><span /><strong>Product screenshot</strong><small>Select this composition and add an image URL.</small></div>;
}

const config: Config<LabComponents> = {
  categories: {
    compositions: {
      title: "Approved compositions",
      components: ["EditorialPoster", "ProductSplit", "MetricSignal", "WorkflowSteps"],
      defaultExpanded: true,
    },
  },
  components: {
    EditorialPoster: {
      label: "Editorial poster",
      fields: {
        eyebrow: { type: "text", label: "Eyebrow" },
        headline: { type: "textarea", label: "Headline" },
        support: { type: "textarea", label: "Supporting copy" },
        alignment: { type: "radio", label: "Alignment", options: [{ label: "Left", value: "left" }, { label: "Centered", value: "center" }] },
      },
      defaultProps: {
        eyebrow: "AGENT-NATIVE MEDIA / 01",
        headline: "Design systems agents can actually use.",
        support: "Structured inputs become reviewable, reproducible launch media without drifting off brand.",
        alignment: "left",
      },
      permissions: { duplicate: false },
      render: ({ eyebrow, headline, support, alignment }) => (
        <BrandChrome>
          <section className={`${styles.editorial} ${alignment === "center" ? styles.centered : ""}`}>
            <p className={styles.eyebrow}>{eyebrow}</p>
            <h1>{headline}</h1>
            <i className={styles.signalRule} />
            <p className={styles.support}>{support}</p>
          </section>
        </BrandChrome>
      ),
    },
    ProductSplit: {
      label: "Product screenshot split",
      fields: {
        eyebrow: { type: "text", label: "Eyebrow" },
        headline: { type: "textarea", label: "Headline" },
        support: { type: "textarea", label: "Supporting copy" },
        screenshotUrl: { type: "text", label: "Screenshot URL" },
        imageSide: { type: "radio", label: "Image position", options: [{ label: "Left", value: "left" }, { label: "Right", value: "right" }] },
      },
      defaultProps: {
        eyebrow: "PRODUCT UPDATE",
        headline: "From release note to launch post.",
        support: "Your agent prepares the message. NoCanva keeps the layout, review, and final pixels trustworthy.",
        screenshotUrl: "",
        imageSide: "right",
      },
      permissions: { duplicate: false },
      render: ({ eyebrow, headline, support, screenshotUrl, imageSide }) => (
        <BrandChrome variant="dark">
          <section className={`${styles.split} ${imageSide === "left" ? styles.splitReverse : ""}`}>
            <div className={styles.splitCopy}><p className={styles.eyebrow}>{eyebrow}</p><h1>{headline}</h1><p className={styles.support}>{support}</p></div>
            <div className={styles.screenshotShell}><PlaceholderScreenshot url={screenshotUrl} /></div>
          </section>
        </BrandChrome>
      ),
    },
    MetricSignal: {
      label: "Metric signal",
      fields: {
        metric: { type: "text", label: "Metric" },
        label: { type: "text", label: "Metric label" },
        headline: { type: "textarea", label: "Headline" },
        support: { type: "textarea", label: "Supporting copy" },
      },
      defaultProps: {
        metric: "2 min",
        label: "to first render",
        headline: "A creative workflow measured in outcomes.",
        support: "Connect an agent, create a governed draft, review the exact output, and export immutable pixels.",
      },
      permissions: { duplicate: false },
      render: ({ metric, label, headline, support }) => (
        <BrandChrome>
          <section className={styles.metricLayout}>
            <div className={styles.metric}><strong>{metric}</strong><span>{label}</span></div>
            <div className={styles.metricCopy}><p className={styles.eyebrow}>PROOF, NOT PROMISES</p><h1>{headline}</h1><p className={styles.support}>{support}</p></div>
          </section>
        </BrandChrome>
      ),
    },
    WorkflowSteps: {
      label: "Workflow steps",
      fields: {
        eyebrow: { type: "text", label: "Eyebrow" },
        headline: { type: "textarea", label: "Headline" },
        stepOne: { type: "text", label: "Step one" },
        stepTwo: { type: "text", label: "Step two" },
        stepThree: { type: "text", label: "Step three" },
        cta: { type: "text", label: "CTA" },
      },
      defaultProps: {
        eyebrow: "THE NOCANVA LOOP",
        headline: "One governed path from evidence to media.",
        stepOne: "Agent creates a constrained draft",
        stepTwo: "Human or agent reviews exact pixels",
        stepThree: "Approval promotes immutable bytes",
        cta: "Connect your agent →",
      },
      permissions: { duplicate: false },
      render: ({ eyebrow, headline, stepOne, stepTwo, stepThree, cta }) => (
        <BrandChrome variant="dark">
          <section className={styles.workflow}>
            <p className={styles.eyebrow}>{eyebrow}</p><h1>{headline}</h1>
            <ol><li><b>01</b><span>{stepOne}</span></li><li><b>02</b><span>{stepTwo}</span></li><li><b>03</b><span>{stepThree}</span></li></ol>
            <strong className={styles.cta}>{cta}</strong>
          </section>
        </BrandChrome>
      ),
    },
  },
};

const initialData: Data<LabComponents> = {
  root: { props: { title: "NoCanva template proof" } },
  content: [{
    type: "ProductSplit",
    props: {
      id: "product-split-proof",
      eyebrow: "PRODUCT UPDATE",
      headline: "From release note to launch post.",
      support: "Your agent prepares the message. NoCanva keeps the layout, review, and final pixels trustworthy.",
      screenshotUrl: "",
      imageSide: "right",
    },
  }],
};

function readSavedData(): Data<LabComponents> {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) as Data<LabComponents> : initialData;
  } catch {
    return initialData;
  }
}

export function TemplateEditorLab() {
  const [loaded, setLoaded] = useState(false);
  const [editorData, setEditorData] = useState<Data<LabComponents>>(initialData);
  const [publishedData, setPublishedData] = useState<Data<LabComponents>>(initialData);
  const [notice, setNotice] = useState("Select the composition on the canvas, then edit its approved fields in the right panel.");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const saved = readSavedData();
      setEditorData(saved);
      setPublishedData(saved);
      setLoaded(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const json = useMemo(() => JSON.stringify(publishedData, null, 2), [publishedData]);

  function publish(data: Data<LabComponents>) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    setPublishedData(data);
    setNotice("Published locally as structured JSON. Production will create an immutable NoCanva template version here.");
  }

  function reset() {
    window.localStorage.removeItem(STORAGE_KEY);
    setEditorData(initialData);
    setPublishedData(initialData);
    setNotice("The local proof was reset.");
  }

  if (!loaded) return <section className={styles.loading}>Loading the constrained editor…</section>;

  return (
    <section className={styles.lab}>
      <header className={styles.intro}>
        <div><p>Experimental · local only</p><h1>Constrained template editor</h1><span>{notice}</span></div>
        <div className={styles.rules}><span><i />Copy and approved options are editable</span><span><i />Brand chrome remains locked</span><span><i />Publish saves JSON, never flattened pixels</span></div>
      </header>

      <div className={styles.editorShell}>
        <Puck
          config={config}
          data={editorData}
          dnd={{ behavior: "static" }}
          headerTitle="NoCanva template lab"
          headerPath="One approved composition per template"
          height="78vh"
          iframe={{ enabled: false }}
          onChange={setEditorData}
          onPublish={publish}
          permissions={{ duplicate: false }}
          viewports={[{ width: 540, height: 675, label: "Instagram portrait", icon: "Smartphone" }]}
        />
      </div>

      <section className={styles.proofGrid}>
        <article><div className={styles.proofHeading}><div><p>Published output</p><h2>The same React component tree</h2></div><button onClick={reset} type="button">Reset local proof</button></div><div className={styles.renderFrame}><Render config={config} data={publishedData} /></div></article>
        <article><div className={styles.proofHeading}><div><p>Portable data</p><h2>What NoCanva would version</h2></div></div><pre>{json}</pre></article>
      </section>
    </section>
  );
}
