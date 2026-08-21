import type { Metadata } from "next";
import { WorkspaceHeader } from "../../workspace-header";
import { TemplateEditorLab } from "./template-editor-lab";
import "@puckeditor/core/puck.css";

export const metadata: Metadata = {
  title: "Template editor lab — NoCanva",
  description: "A constrained visual template editor proof of fit.",
};

export default function TemplateEditorLabPage() {
  return (
    <main className="studio-shell">
      <WorkspaceHeader active="templates" />
      <TemplateEditorLab />
    </main>
  );
}
