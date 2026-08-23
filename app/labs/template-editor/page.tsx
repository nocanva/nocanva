import type { Metadata } from "next";
import { WorkspaceHeader } from "../../workspace-header";
import { TemplateEditorLab } from "./template-editor-lab";
import { requireNoCanvaViewer } from "../../../lib/server/request-auth";
import "@puckeditor/core/puck.css";

export const metadata: Metadata = {
  title: "Template editor lab — NoCanva",
  description: "A constrained visual template editor proof of fit.",
};

export default async function TemplateEditorLabPage() {
  await requireNoCanvaViewer("/labs/template-editor");
  return (
    <main className="studio-shell">
      <WorkspaceHeader active="templates" />
      <TemplateEditorLab />
    </main>
  );
}
