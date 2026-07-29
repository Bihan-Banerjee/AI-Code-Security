// src/components/ScanResultsTable.tsx
import { z } from "zod";
import { BanditItem } from "@/lib/schemas";
import { CheckCircle2 } from "lucide-react";
import CweBadge from "@/components/CweBadge";

type Issue = z.infer<typeof BanditItem>;

function severityClass(severity?: string) {
  switch (severity?.toLowerCase()) {
    case "high":
      return "bg-destructive/15 text-destructive";
    case "medium":
      return "bg-warning/15 text-warning";
    case "low":
      return "bg-success/15 text-success";
    default:
      return "bg-muted text-muted-foreground";
  }
}

export default function ScanResultsTable({ issues }: { issues: Issue[] }) {
  if (!issues || issues.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-success/30 bg-success/10 p-4 text-success">
        <CheckCircle2 className="h-5 w-5" />
        <span className="font-medium">No vulnerabilities found. Your code is secure!</span>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border/60">
      <table className="w-full text-sm">
        <thead className="bg-secondary/40 text-left">
          <tr>
            {["File", "Line", "Severity", "Description", "CWE"].map((h) => (
              <th key={h} className="p-3 font-medium text-muted-foreground">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {issues.map((issue, idx) => (
            <tr key={idx} className="border-t border-border/50 hover:bg-secondary/20">
              <td className="p-3 font-mono text-xs">{issue.filename?.split("\\").pop() || "-"}</td>
              <td className="p-3 font-mono text-xs">{issue.line_number || "-"}</td>
              <td className="p-3">
                <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${severityClass(issue.issue_severity)}`}>
                  {issue.issue_severity || "-"}
                </span>
              </td>
              <td className="p-3 text-foreground/80">{issue.issue_text || "-"}</td>
              <td className="p-3">
                {issue.issue_cwe?.id ? (
                  <CweBadge id={issue.issue_cwe.id} link={issue.issue_cwe.link} />
                ) : (
                  "-"
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
