import { Check, Circle, FileCheck2, FilePenLine, PackageCheck, ScanSearch } from "lucide-react";

type WorkflowStatus = "draft" | "in_review" | "approved" | "rendered";

const steps = [
  { status: "draft", label: "Edit", description: "Shape the revision", icon: FilePenLine },
  { status: "in_review", label: "Review", description: "Check exact pixels", icon: ScanSearch },
  { status: "approved", label: "Approve", description: "Human decision", icon: FileCheck2 },
  { status: "rendered", label: "Export", description: "Immutable media", icon: PackageCheck },
] as const;

const order: Record<WorkflowStatus, number> = { draft: 0, in_review: 1, approved: 2, rendered: 3 };

export function WorkflowProgress({ status, archived = false }: { status: WorkflowStatus; archived?: boolean }) {
  const current = order[status];
  return (
    <ol className="workflow-progress" aria-label="Revision workflow">
      {steps.map((step, index) => {
        const complete = !archived && index < current;
        const active = !archived && index === current;
        const Icon = complete ? Check : active ? step.icon : Circle;
        return (
          <li className={complete ? "complete" : active ? "active" : "pending"} key={step.status}>
            <span><Icon /></span>
            <div><strong>{step.label}</strong><small>{archived && index === 0 ? "Archived" : step.description}</small></div>
          </li>
        );
      })}
    </ol>
  );
}
